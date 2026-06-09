// src/pages/CreateCapsule.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { format } from "date-fns";
import { CapsuleMultistepForm } from "@/components/capsule-multistep-form";
import SealCapsuleModal from "@/components/SealCapsuleModal";
import { Toaster } from "sonner";
import {
  generateContentKey,
  encryptText,
  wrapContentKeyForRecipients,
} from "@/utils/cryptoUtils";
import { getRecipientPublicKeys } from "@/encryption/keyManager";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface LocalAttachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  size?: number;
  altText?: string;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

const CreateCapsule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { refreshCapsules } = useCapsules();
  const { privateKey } = useAuth();
  const auth = getAuth();
  const storage = getStorage();

  const [plan, setPlan] = useState<{
    tier: "free" | "starter" | "pro";
    capsuleLimit: number | null;
    usedCapsules: number;
  } | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [triggerType, setTriggerType] = useState<"time" | "event" | "connection">("time");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [deliveryTime, setDeliveryTime] = useState("");
  const [recipientType, setRecipientType] = useState<"self" | "friends" | "public">("self");
  const [capsuleCategory, setCapsuleCategory] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [currentStep, setCurrentStep] = useState(0); // ✅ starts at 0, not NaN
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);

  const getAuthHeaders = async () => {
    if (!auth.currentUser) throw new Error("No authenticated user");
    const token = await auth.currentUser.getIdToken(true);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate("/login"); return; }
      setCurrentUser(user);
      try {
        const headers = await getAuthHeaders();
        const profileRes = await fetch(`${API_BASE}/getMyProfile`, { headers });
        const profile = await profileRes.json();
        setUsername(profile?.name || user.displayName || profile?.username || user.email || "Anonymous");
        setPlan(profile?.plan || null);

        setFriendsLoading(true);
        const friendsRes = await fetch(`${API_BASE}/getFriends`, { headers });
        const friendsData = await friendsRes.json();
        setFriends(
          (friendsData || []).map((f: any) => ({
            id: f.profile?.uid || f.id,
            name: f.profile?.name || f.profile?.email?.split("@")[0] || "Unknown",
            email: f.profile?.email || "",
            photoURL: f.profile?.photoURL,
            hasPublicKey: !!f.profile?.publicKey,
          }))
        );
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Failed to load profile or friends", variant: "destructive" });
      } finally {
        setFriendsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (location.state?.reshareFrom) {
      setTitle(location.state.reshareFrom.title || "");
      setContent(location.state.reshareFrom.content || "");
    }
  }, [location.state]);

  const handleFileSelect = (
    type: "image" | "video" | "audio",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;
    setAttachments((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        id: `${type}-${crypto.randomUUID()}`,
        file, type, name: file.name, size: file.size,
      })),
    ]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const uploadAttachment = async (capsuleId: string, attachment: LocalAttachment) => {
    const storagePath = `capsules/${capsuleId}/${attachment.id}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, attachment.file, { contentType: attachment.file.type });
    return {
      id: attachment.id, storagePath, type: attachment.type,
      name: attachment.name, size: attachment.size,
      altText: attachment.altText || "",
      encrypted: false, uploadedAt: new Date().toISOString(),
    };
  };

  const uploadAllAttachments = async (capsuleId: string) =>
    Promise.all(attachments.map((a) => uploadAttachment(capsuleId, a)));

  const validateForm = () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Missing information", description: "Title and content are required", variant: "destructive" });
      return false;
    }
    if (recipientType === "friends" && selectedFriends.length === 0) {
      toast({ title: "Select recipients", description: "Choose at least one friend", variant: "destructive" });
      return false;
    }
    if (triggerType === "time" && recipientType !== "public" && (!deliveryDate || !deliveryTime)) {
      toast({ title: "Missing unlock time", description: "Select date and time", variant: "destructive" });
      return false;
    }
    return true;
  };

  const hasReachedLimit =
    plan && plan.capsuleLimit !== null && plan.usedCapsules >= plan.capsuleLimit;

  const handleFormSubmit = () => {
    if (hasReachedLimit) {
      toast({ title: "Capsule limit reached", description: "Upgrade your plan to create more capsules", variant: "destructive" });
      return;
    }
    if (validateForm()) setShowSealModal(true);
  };

  const handleFinalSubmission = async (signature?: string) => {
    if (!currentUser || !validateForm()) return;

    // Close the modal and navigate to dashboard IMMEDIATELY
    setShowSealModal(false);
    navigate("/dashboard");

    // Capture all form values needed for background work
    const capturedTitle = title;
    const capturedContent = content;
    const capturedTriggerType = triggerType;
    const capturedRecipientType = recipientType;
    const capturedDeliveryDate = deliveryDate;
    const capturedDeliveryTime = deliveryTime;
    const capturedSelectedFriends = [...selectedFriends];
    const capturedAttachments = [...attachments];
    const capturedCategory = capsuleCategory;
    const capturedSignature = signature;
    const capturedUserId = currentUser.uid;
    const capturedReshare = !!location.state?.reshareFrom;
    const capturedOriginalId = location.state?.reshareFrom?.capsuleId || null;

    // Fire-and-forget: do all backend work in the background
    (async () => {
      try {
        const capsuleId = crypto.randomUUID();
        const headers = await getAuthHeaders();
        // ── 1. All recipients including creator ──
        const allRecipientIds = [
          capturedUserId,
          ...(capturedRecipientType === "friends" ? capturedSelectedFriends : []),
        ];

        // ── 2. Fetch each recipient's public key from Firestore ──
        const publicKeys = await getRecipientPublicKeys(allRecipientIds);

        // ── 3. Generate one fresh AES-256-GCM content key for this capsule ──
        const contentKey = await generateContentKey();

        // ── 4. Encrypt title and content ──
        const encryptedTitle   = await encryptText(capturedTitle,   contentKey);
        const encryptedContent = await encryptText(capturedContent, contentKey);

        // ── 5. RSA-wrap content key for every recipient ──
        const encryptedKeys = await wrapContentKeyForRecipients(contentKey, publicKeys);

        // ── 6. Upload attachments (plain — file encryption is a follow-up) ──
        const uploadedAttachments =
          capturedAttachments.length > 0 ? await uploadAllAttachments(capsuleId) : [];

        let signatureUrl: string | null = null;
        if (capturedSignature) {
          try {
            const response = await fetch(capturedSignature);
            const blob = await response.blob();
            const signaturePath = `capsules/${capsuleId}/signature.png`;
            const signatureRef = ref(storage, signaturePath);
            await uploadBytes(signatureRef, blob, { contentType: "image/png" });
            signatureUrl = await getDownloadURL(signatureRef);
          } catch (error) {
            console.error("Failed to upload signature:", error);
            signatureUrl = capturedSignature;
          }
        }

        const unlockDate =
          capturedRecipientType === "public"
            ? new Date().toISOString()
            : new Date(`${format(capturedDeliveryDate!, "yyyy-MM-dd")}T${capturedDeliveryTime}:00`).toISOString();

        const res = await fetch(`${API_BASE}/createCapsule`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: capsuleId,
            // v2 encrypted fields
            encryptedTitle:   encryptedTitle.ciphertext,
            titleIV:          encryptedTitle.iv,
            encryptedContent: encryptedContent.ciphertext,
            contentIV:        encryptedContent.iv,
            encryptedKeys,
            version:          "v2",
            // unencrypted metadata
            attachments:      uploadedAttachments,
            category:         capturedCategory,
            triggerType:      capturedTriggerType,
            recipientType:    capturedRecipientType,
            recipients:       allRecipientIds,
            unlockDate,
            createdAt:        null,
            isUnlocked:       capturedRecipientType === "public",
            status:           "scheduled",
            signature:        signatureUrl,
            userId:           capturedUserId,
            isReshare:        capturedReshare,
            originalCapsuleId: capturedOriginalId,
          }),
        });

        if (!res.ok) throw new Error((await res.text()) || "Failed to create capsule");

        // Refresh capsules in the background so the new one appears on dashboard
        await refreshCapsules();
        
        // Dispatch the custom global alert event
        window.dispatchEvent(
          new CustomEvent("capsule-created", {
            detail: {
              title: "Capsule Sealed 🔒",
              description: "Your capsule has been created and encrypted successfully!",
            },
          })
        );
      } catch (err) {
        console.error("Background capsule creation failed:", err);
        toast({
          title: "Failed to create capsule",
          description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-[#1A1A1A] hover:bg-[#1A1A1A]/5 hover:text-[#1A1A1A]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('create.headerBack')}
          </Button>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">
            {t('create.headerTitle').includes('Forá') ? (
              <>
                {t('create.headerTitle').split('Forá')[0]}
                <span className="text-[#FB6376]">Forá</span>
                {t('create.headerTitle').split('Forá')[1]}
              </>
            ) : t('create.headerTitle').includes('ஃபோரா') ? (
              <>
                {t('create.headerTitle').split('ஃபோரா')[0]}
                <span className="text-[#FB6376]">ஃபோரா</span>
                {t('create.headerTitle').split('ஃபோரா')[1]}
              </>
            ) : t('create.headerTitle').includes('फ़ोरा') ? (
              <>
                {t('create.headerTitle').split('फ़ोरा')[0]}
                <span className="text-[#FB6376]">फ़ोरा</span>
                {t('create.headerTitle').split('फ़ोरा')[1]}
              </>
            ) : (
              t('create.headerTitle')
            )}
          </h1>
        </div>


        {/*
          ✅ KEY FIX: pass currentStep and onStepChange so the form
          knows which step it's on and can render the correct content.
          Without this, the form has no step state and shows "NaN of 6".
        */}
        <CapsuleMultistepForm
          currentStep={currentStep}
          title={title}
          content={content}
          triggerType={triggerType}
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          recipientType={recipientType}
          selectedFriends={selectedFriends}
          friends={friends}
          loadingFriends={friendsLoading}
          capsuleCategory={capsuleCategory}
          attachments={attachments}
          username={username}
          onTitleChange={setTitle}
          onContentChange={setContent}
          onTriggerTypeChange={setTriggerType}
          onDeliveryDateChange={setDeliveryDate}
          onDeliveryTimeChange={setDeliveryTime}
          onRecipientTypeChange={setRecipientType}
          onSelectedFriendsChange={setSelectedFriends}
          onCapsuleCategoryChange={setCapsuleCategory}
          onAttachmentsChange={setAttachments}
          onFileSelect={handleFileSelect}
          onRemoveAttachment={removeAttachment}
          onNextStep={() => setCurrentStep((s) => Math.min(5, s + 1))}
          onPrevStep={() => setCurrentStep((s) => Math.max(0, s - 1))}
          onCancel={() => navigate("/")}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      <SealCapsuleModal
        isOpen={showSealModal}
        onClose={() => setShowSealModal(false)}
        onSealComplete={handleFinalSubmission}
        capsuleTitle={title}
        capsuleId="draft"
      />
    </div>
  );
};

export default CreateCapsule;