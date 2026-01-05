import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/* ================= TYPES ================= */

interface LocalAttachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  size: number;
}

/* ================= COMPONENT ================= */

const CreateCapsule = () => {
  const navigate = useNavigate();
  const { refreshCapsules } = useCapsules();
  const auth = getAuth();
  const storage = getStorage();

  /* ---------- USER ---------- */
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");

  /* ---------- FORM ---------- */
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [triggerType, setTriggerType] = useState<
    "time" | "event" | "connection"
  >("time");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [deliveryTime, setDeliveryTime] = useState("");
  const [recipientType, setRecipientType] = useState<
    "self" | "friends" | "public"
  >("self");
  const [capsuleCategory, setCapsuleCategory] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);

  /* ================= HELPERS ================= */

  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  /* ================= AUTH ================= */

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/getMyProfile`, { headers });
        const data = await res.json();
        setUsername(data?.username || user.email || "Anonymous");
      } catch {
        setUsername(user.email || "Anonymous");
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

  const uploadAttachment = async (
    capsuleId: string,
    attachment: LocalAttachment
  ) => {
    // 🔐 PLACEHOLDER FOR FUTURE ENCRYPTION
    // const encryptedBlob = await encryptFile(attachment.file, capsuleKey);

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

  const uploadAllAttachments = async (capsuleId: string) => {
    return Promise.all(attachments.map((a) => uploadAttachment(capsuleId, a)));
  };

  /* ================= VALIDATION ================= */

  const validateForm = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing info",
        description: "Title and content are required",
        variant: "destructive",
      });
      return false;
    }

    if (recipientType === "friends" && selectedFriends.length === 0) {
      toast({
        title: "Select friends",
        description: "Choose at least one friend",
        variant: "destructive",
      });
      return false;
    }

    if (
      recipientType !== "public" &&
      triggerType === "time" &&
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

  const handleFormSubmit = () => {
    if (validateForm()) setShowSealModal(true);
  };

  /* ================= FINAL SUBMIT ================= */

  const handleFinalSubmission = async (signature?: string) => {
    if (!currentUser) return;

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
  /* ================= STEPS ================= */

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

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

        <CapsuleMultistepForm
          title={title}
          content={content}
          triggerType={triggerType}
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          recipientType={recipientType}
          selectedFriends={selectedFriends}
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
          onNextStep={nextStep}
          onPrevStep={prevStep}
          currentStep={currentStep}
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
