import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { format } from "date-fns";
import { CapsuleMultistepForm } from "@/components/capsule-multistep-form";
import SealCapsuleModal from "@/components/SealCapsuleModal";
import { Toaster } from "sonner";
import { getOrCreateKey, encryptText } from "@/utils/cryptoUtils";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/* ================= TYPES ================= */

interface LocalAttachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  size: number;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

/* ================= COMPONENT ================= */

const CreateCapsule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshCapsules } = useCapsules();
  const auth = getAuth();
  const storage = getStorage();
  
  /* ---------- PLAN ---------- */
  const [plan, setPlan] = useState<{
    tier: "free" | "starter" | "pro";
    capsuleLimit: number | null;
    usedCapsules: number;
  } | null>(null);

  /* ---------- USER ---------- */
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");

  /* ---------- FRIENDS ---------- */
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  /* ---------- FORM ---------- */
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [triggerType, setTriggerType] = useState<"time" | "event" | "connection">("time");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [deliveryTime, setDeliveryTime] = useState("");
  const [recipientType, setRecipientType] = useState<"self" | "friends" | "public">("self");
  const [capsuleCategory, setCapsuleCategory] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);

  /* ================= HELPERS ================= */

  const getAuthHeaders = async () => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }
    const token = await auth.currentUser.getIdToken(true);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  /* ================= AUTH + FRIENDS ================= */

  const location = useLocation();
  const { refreshCapsules } = useCapsules();

  const auth = getAuth();
  const storage = getStorage();

  /* ---------- PLAN ---------- */
  const [plan, setPlan] = useState<{
    tier: "free" | "starter" | "pro";
    capsuleLimit: number | null;
    usedCapsules: number;
  } | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState("");

  /* ---------- FRIENDS ---------- */
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  /* ---------- FORM ---------- */
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [triggerType, setTriggerType] =
    useState<"time" | "event" | "connection">("time");

  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [deliveryTime, setDeliveryTime] = useState("");

  const [recipientType, setRecipientType] =
    useState<"self" | "friends" | "public">("self");

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [capsuleCategory, setCapsuleCategory] = useState("");

  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);

  /* ================= HELPERS ================= */

  const getAuthHeaders = async () => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }
    const token = await auth.currentUser.getIdToken(true);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  /* ================= AUTH + FRIENDS ================= */

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      try {
        const headers = await getAuthHeaders();

        // Load profile
        const profileRes = await fetch(`${API_BASE}/getMyProfile`, { headers });
        const profile = await profileRes.json();
        setUsername(profile?.username || profile?.name || user.email || "Anonymous");
        setPlan(profile?.plan || null);

        // Load friends
        setFriendsLoading(true);
        const friendsRes = await fetch(`${API_BASE}/getFriends`, { headers });
        const friendsData = await friendsRes.json();
        const normalizedFriends = (friendsData || []).map((f: any) => ({
          id: f.profile?.uid || f.id,
          name: f.profile?.name || f.profile?.email?.split("@")[0] || "Unknown",
          email: f.profile?.email || "",
          photoURL: f.profile?.photoURL,
        }));

        setFriends(normalizedFriends || []);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Failed to load profile or friends",
          variant: "destructive",
        });
      } finally {
        setFriendsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* ================= FILE HANDLING ================= */

  const handleFileSelect = (
    type: "image" | "video" | "audio",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    const mapped: LocalAttachment[] = Array.from(files).map((file) => ({
      id: `${type}-${crypto.randomUUID()}`,
      file,
      type,
      name: file.name,
      size: file.size,
    }));

    setAttachments((prev) => [...prev, ...mapped]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  /* ================= FIREBASE UPLOAD ================= */

  const uploadAttachment = async (capsuleId: string, attachment: LocalAttachment) => {
    const storagePath = `capsules/${capsuleId}/${attachment.id}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, attachment.file, {
      contentType: attachment.file.type,
    });

    return {
      id: attachment.id,
      storagePath,
      type: attachment.type,
      name: attachment.name,
      size: attachment.size,
      encrypted: false,
      uploadedAt: new Date().toISOString(),
    };
  };

  const uploadAllAttachments = async (capsuleId: string) =>
    Promise.all(attachments.map((a) => uploadAttachment(capsuleId, a)));

  /* ================= VALIDATION ================= */

  const validateForm = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Title and content are required",
        variant: "destructive",
      });
      return false;
    }

    if (recipientType === "friends" && selectedFriends.length === 0) {
      toast({
        title: "Select recipients",
        description: "Choose at least one friend",
        variant: "destructive",
      });
      return false;
    }

    if (
      triggerType === "time" &&
      recipientType !== "public" &&
      (!deliveryDate || !deliveryTime)
    ) {
      toast({
        title: "Missing unlock time",
        description: "Select date and time",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  /* ================= RESHARE HANDLING ================= */

  useEffect(() => {
    if (location.state?.reshareFrom) {
      const { title: reshareTitle, content: reshareContent } = location.state.reshareFrom;
      setTitle(reshareTitle || "");
      setContent(reshareContent || "");
    }
  }, [location.state]);

  /* ================= FILE UPLOAD ================= */

  /* (upload helpers and validation defined above) */

  const hasReachedLimit = plan && plan.capsuleLimit !== null && plan.usedCapsules >= plan.capsuleLimit;

  const handleFormSubmit = () => {
    if (hasReachedLimit) {
      toast({
        title: "Capsule limit reached",
        description: "Upgrade your plan to create more capsules",
        variant: "destructive",
      });
      return;
    }

    if (validateForm()) setShowSealModal(true);
  };

  /* ================= FINAL SUBMIT ================= */

  const handleFinalSubmission = async (signature?: string) => {
    if (!currentUser) return;
    if (!currentUser || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const headers = await getAuthHeaders();
      const capsuleId = crypto.randomUUID();

      const uploadedAttachments =
        attachments.length > 0 ? await uploadAllAttachments(capsuleId) : [];

      let unlockDate: Date;
      if (recipientType === "public") {
        unlockDate = new Date();
      } else {
        const dateTime = `${format(
          deliveryDate!,
          "yyyy-MM-dd"
        )}T${deliveryTime}:00`;
        unlockDate = new Date(dateTime);
      }
      const res = await fetch(`${API_BASE}/createCapsule`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: capsuleId,
          title,
          content,
          triggerType,
          unlockDate,
          recipientType,
          recipients:
            recipientType === "self"
              ? [currentUser.uid]
              : recipientType === "friends"
              ? selectedFriends
              : [],
          attachments: uploadedAttachments,
          category: capsuleCategory,
          signature,
        }),
      });

      if (!res.ok) throw new Error("Create capsule failed");

      await refreshCapsules();
      toast({ title: "Capsule sealed 🔒" });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to create capsule",
      console.log("🔐 Starting capsule creation with encryption...");

      const capsuleId = crypto.randomUUID();
      const headers = await getAuthHeaders();

      // 🔐 Get or create encryption key
      console.log("🔑 Getting encryption key...");
      const key = await getOrCreateKey();
      console.log("✅ Key obtained");

      // 🔐 Encrypt content
      console.log("🔐 Encrypting title...");
      const encryptedTitle = await encryptText(key, title);
      console.log("✅ Title encrypted:", {
        ciphertext: encryptedTitle.ciphertext.substring(0, 20) + "...",
        iv: encryptedTitle.iv,
      });

      console.log("🔐 Encrypting content...");
      const encryptedContent = await encryptText(key, content);
      console.log("✅ Content encrypted:", {
        ciphertext: encryptedContent.ciphertext.substring(0, 20) + "...",
        iv: encryptedContent.iv,
      });

      // Upload attachments
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        console.log("📎 Uploading attachments...");
        uploadedAttachments = await uploadAllAttachments(capsuleId);
        console.log("✅ Attachments uploaded");
      }

      // Calculate unlock date
      let unlockDate: string;
      if (recipientType === "public") {
        unlockDate = new Date().toISOString();
      } else {
        unlockDate = new Date(
          `${format(deliveryDate!, "yyyy-MM-dd")}T${deliveryTime}:00`
        ).toISOString();
      }

      // 🔐 CREATE PAYLOAD WITH ENCRYPTED DATA
      const payload = {
        id: capsuleId,

        // 🔐 ENCRYPTED FIELDS
        title: encryptedTitle.ciphertext,
        titleIv: encryptedTitle.iv,
        content: encryptedContent.ciphertext,
        contentIv: encryptedContent.iv,

        attachments: uploadedAttachments,
        category: capsuleCategory,

        triggerType,
        recipientType,
        recipients:
          recipientType === "self"
            ? [currentUser.uid]
            : recipientType === "friends"
            ? selectedFriends
            : [],

        unlockDate,

        // Firebase fields
        createdAt: null,
        isUnlocked: recipientType === "public",
        status: "scheduled",

        signature: signature || null,
        userId: currentUser.uid,

        // Reshare fields
        isReshare: !!location.state?.reshareFrom,
        originalCapsuleId: location.state?.reshareFrom?.capsuleId || null,
      };

      console.log("📤 Sending capsule to backend...", {
        id: payload.id,
        hasTitle: !!payload.title,
        hasTitleIv: !!payload.titleIv,
        hasContent: !!payload.content,
        hasContentIv: !!payload.contentIv,
        recipientType: payload.recipientType,
        unlockDate: payload.unlockDate,
      });

      const res = await fetch(`${API_BASE}/createCapsule`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Backend error:", text);
        throw new Error(text || "Failed to create capsule");
      }

      const result = await res.json();
      console.log("✅ Capsule created successfully:", result);

      await refreshCapsules();

      toast({
        title: "Capsule sealed 🔒",
        description: "Your capsule has been created and encrypted",
      });

      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Error creating capsule:", err);
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

  /* ================= RENDER ================= */

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const nextStep = () => setCurrentStep((p) => p + 1);
  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 0));

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
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

        <CapsuleMultistepForm
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
          onNextStep={() => setCurrentStep((s) => s + 1)}
          onPrevStep={() => setCurrentStep((s) => Math.max(0, s - 1))}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          isBlocked={hasReachedLimit}
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