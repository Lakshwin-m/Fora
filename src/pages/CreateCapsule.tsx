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
import { getOrCreateKey, encryptText } from "@/utils/cryptoUtils";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface LocalAttachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  size?: number;
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
  const { refreshCapsules } = useCapsules();
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
        setUsername(profile?.username || profile?.name || user.email || "Anonymous");
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
    setIsSubmitting(true);
    try {
      const capsuleId = crypto.randomUUID();
      const headers = await getAuthHeaders();
      const key = await getOrCreateKey();
      const encryptedTitle = await encryptText(key, title);
      const encryptedContent = await encryptText(key, content);

      const uploadedAttachments =
        attachments.length > 0 ? await uploadAllAttachments(capsuleId) : [];

      let signatureUrl: string | null = null;
      if (signature) {
        try {
          // Convert base64 data URL to blob
          const response = await fetch(signature);
          const blob = await response.blob();
          
          // Upload to Firebase Storage
          const signaturePath = `capsules/${capsuleId}/signature.png`;
          const signatureRef = ref(storage, signaturePath);
          await uploadBytes(signatureRef, blob, { contentType: "image/png" });
          
          signatureUrl = await getDownloadURL(signatureRef);
        } catch (error) {
          console.error("Failed to upload signature:", error);
          // Fallback to storing base64 if upload fails
          signatureUrl = signature; 
        }
      }

      const unlockDate =
        recipientType === "public"
          ? new Date().toISOString()
          : new Date(`${format(deliveryDate!, "yyyy-MM-dd")}T${deliveryTime}:00`).toISOString();

      const res = await fetch(`${API_BASE}/createCapsule`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: capsuleId,
          title: encryptedTitle.ciphertext,
          titleIv: encryptedTitle.iv,
          content: encryptedContent.ciphertext,
          contentIv: encryptedContent.iv,
          attachments: uploadedAttachments,
          category: capsuleCategory,
          triggerType,
          recipientType,
          recipients:
            recipientType === "self" ? [currentUser.uid]
            : recipientType === "friends" ? selectedFriends
            : [],
          unlockDate,
          createdAt: null,
          isUnlocked: recipientType === "public",
          status: "scheduled",
          signature: signatureUrl,
          userId: currentUser.uid,
          isReshare: !!location.state?.reshareFrom,
          originalCapsuleId: location.state?.reshareFrom?.capsuleId || null,
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || "Failed to create capsule");

      await refreshCapsules();
      toast({ title: "Capsule sealed 🔒", description: "Your capsule has been created and encrypted" });
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create capsule",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowSealModal(false);
    }
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
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">
            Create a <span className="text-[#FB6376]">Forá</span> Capsule
          </h1>
        </div>

        {plan && (
          <div className="mb-6 rounded-xl border bg-white p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize">{plan.tier} plan</p>
              <p className="text-sm text-muted-foreground">
                {plan.capsuleLimit === null
                  ? "Unlimited capsules"
                  : `${plan.usedCapsules} / ${plan.capsuleLimit} capsules used`}
              </p>
            </div>
            {hasReachedLimit && (
              <span className="text-sm font-medium text-red-600">Limit reached</span>
            )}
          </div>
        )}

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