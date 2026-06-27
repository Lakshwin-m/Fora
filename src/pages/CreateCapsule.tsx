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
  const { refreshCapsules, serverNow } = useCapsules();
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
  const [recurrencePattern, setRecurrencePattern] = useState<"none" | "minutely" | "daily" | "weekly" | "monthly" | "yearly">("none");
  const [priorReminderEnabled, setPriorReminderEnabled] = useState(false);
  const [priorReminderDays, setPriorReminderDays] = useState(7); // default 7 days
  const [reminderTime, setReminderTime] = useState("");
  const [reminderDayOfWeek, setReminderDayOfWeek] = useState("");
  const [reminderDayOfMonth, setReminderDayOfMonth] = useState<number | null>(null);
  const [reminderYearlyDate, setReminderYearlyDate] = useState<Date | null>(null);
  const [reminderPreset, setReminderPreset] = useState<string>("custom");

  const handleReminderPresetChange = (preset: string) => {
    setReminderPreset(preset);
    if (preset === "birthday") {
      setRecurrencePattern("yearly");
      setReminderTime("09:00");
      setReminderYearlyDate(null); // User must pick date
    } else if (preset === "anniversary") {
      setRecurrencePattern("yearly");
      setReminderTime("09:00");
      setReminderYearlyDate(null); // User must pick date
    } else if (preset === "christmas") {
      setRecurrencePattern("yearly");
      setReminderTime("09:00");
      setReminderYearlyDate(new Date(new Date().getFullYear(), 11, 25));
    } else if (preset === "newyear") {
      setRecurrencePattern("yearly");
      setReminderTime("00:00");
      setReminderYearlyDate(new Date(new Date().getFullYear(), 0, 1));
    } else if (preset === "custom") {
      setRecurrencePattern("none");
      setReminderTime("");
      setReminderDayOfWeek("");
      setReminderDayOfMonth(null);
      setReminderYearlyDate(null);
    }
  };

  const updateRecurrencePattern = (pattern: typeof recurrencePattern) => {
    setRecurrencePattern(pattern);
    setReminderPreset("custom");
  };

  const updateReminderTime = (time: string) => {
    setReminderTime(time);
    setReminderPreset("custom");
  };

  const updateReminderDayOfWeek = (day: string) => {
    setReminderDayOfWeek(day);
    setReminderPreset("custom");
  };

  const updateReminderDayOfMonth = (day: number | null) => {
    setReminderDayOfMonth(day);
    setReminderPreset("custom");
  };

  const updateReminderYearlyDate = (date: Date | null) => {
    setReminderYearlyDate(date);
    setReminderPreset("custom");
  };

  const getAuthHeaders = async () => {
    if (!auth.currentUser) throw new Error("No authenticated user");
    const token = await auth.currentUser.getIdToken();
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

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const typeParam = queryParams.get("type");
    if (typeParam === "reminder") {
      setTriggerType("event");
    } else if (typeParam === "capsule") {
      setTriggerType("time");
    }
  }, [location.search]);

  const handleFileSelect = (
    type: "image" | "video" | "audio",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: any[] = [];
    const newBlocks: any[] = [];

    let currentBlocks: any[] = [];
    try {
      if (content) {
        const sanitized = content.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        let parsed = JSON.parse(sanitized);
        while (typeof parsed === "string") {
          parsed = JSON.parse(parsed.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
        }
        if (Array.isArray(parsed)) currentBlocks = parsed;
      }
    } catch (e) {}

    Array.from(files).forEach((file) => {
      const blockId = crypto.randomUUID();
      newAttachments.push({
        id: blockId,
        file,
        type,
        name: file.name,
        size: file.size,
      });

      newBlocks.push({
        id: blockId,
        type,
        mediaUrl: URL.createObjectURL(file),
        fileName: file.name,
        x: 10,
        y: 35,
        width: type === "audio" ? 300 : 400,
      });
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    setContent(JSON.stringify([...currentBlocks, ...newBlocks]));
    event.target.value = "";
  };

  useEffect(() => {
    if (!content) return;
    try {
      const sanitized = content.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      let parsed = JSON.parse(sanitized);
      while (typeof parsed === "string") {
        parsed = JSON.parse(parsed.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
      }
      if (Array.isArray(parsed)) {
        const activeIds = new Set(parsed.map((b: any) => b.id));
        setAttachments((prev) => prev.filter((att) => activeIds.has(att.id)));
      }
    } catch (e) {}
  }, [content]);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    try {
      const sanitized = content.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      let parsed = JSON.parse(sanitized);
      while (typeof parsed === "string") {
        parsed = JSON.parse(parsed.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
      }
      if (Array.isArray(parsed)) {
        const remainingBlocks = parsed.filter((b: any) => b.id !== id);
        setContent(JSON.stringify(remainingBlocks));
      }
    } catch (e) {}
  };

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
    if (triggerType === "event") {
      if (recurrencePattern !== "none" && recurrencePattern !== "minutely" && !reminderTime) {
        toast({ title: "Missing reminder time", description: "Please choose a time for the reminder", variant: "destructive" });
        return false;
      }
      if (recurrencePattern === "weekly" && !reminderDayOfWeek) {
        toast({ title: "Missing day of week", description: "Please choose a day of the week for the reminder", variant: "destructive" });
        return false;
      }
      if (recurrencePattern === "monthly" && !reminderDayOfMonth) {
        toast({ title: "Missing day of month", description: "Please choose a day of the month for the reminder", variant: "destructive" });
        return false;
      }
      if (recurrencePattern === "yearly" && !reminderYearlyDate) {
        toast({ title: "Missing yearly date", description: "Please choose a month and day for the yearly reminder", variant: "destructive" });
        return false;
      }
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
    const capturedRecurrencePattern = recurrencePattern;
    const capturedPriorReminderEnabled = priorReminderEnabled;
    const capturedPriorReminderDays = priorReminderDays;


    const capturedReminderTime = reminderTime;
    const capturedReminderDayOfWeek = reminderDayOfWeek;
    const capturedReminderDayOfMonth = reminderDayOfMonth;
    const capturedReminderYearlyDate = reminderYearlyDate;
    const capturedReminderPreset = reminderPreset;
    
    let nextUnlockAt: string | null = null;
    let visibleFrom: string | null = null;
    if (capturedTriggerType === "event" && capturedReminderTime) {
      const now = serverNow();
      const next = serverNow();
      const [hours, minutes] = capturedReminderTime.split(":").map(Number);
      next.setHours(hours, minutes, 0, 0);

      if (capturedRecurrencePattern === "daily") {
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
      } else if (capturedRecurrencePattern === "weekly" && capturedReminderDayOfWeek) {
        const daysMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const targetDay = daysMap[capturedReminderDayOfWeek.toLowerCase()] ?? 1;
        const currentDay = now.getDay();
        let daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && next <= now) {
          daysToAdd = 7;
        }
        next.setDate(next.getDate() + daysToAdd);
      } else if (capturedRecurrencePattern === "monthly" && capturedReminderDayOfMonth) {
        next.setDate(capturedReminderDayOfMonth);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(capturedReminderDayOfMonth);
        }
      } else if (capturedRecurrencePattern === "yearly" && capturedReminderYearlyDate) {
        const targetMonth = capturedReminderYearlyDate.getMonth();
        const targetDate = capturedReminderYearlyDate.getDate();
        next.setMonth(targetMonth);
        next.setDate(targetDate);
        if (next <= now) {
          next.setFullYear(next.getFullYear() + 1);
          next.setMonth(targetMonth);
          next.setDate(targetDate);
        }
      }

      nextUnlockAt = next.toISOString();
      const visible = new Date(next);
      visible.setHours(visible.getHours() - 1);
      visibleFrom = visible.toISOString();
    }

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

        // ── 4. Upload attachments (plain) ──
        const uploadedAttachments =
          capturedAttachments.length > 0 ? await uploadAllAttachments(capsuleId) : [];

        // Update local mediaUrl in blocks to public downloadURLs
        let finalContentString = capturedContent;
        try {
          const sanitized = capturedContent.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
          let parsed = JSON.parse(sanitized);
          while (typeof parsed === "string") {
            parsed = JSON.parse(parsed.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
          }
          if (Array.isArray(parsed)) {
            const mapped = parsed.map((block: any) => {
              if (block.mediaUrl && (block.type === "image" || block.type === "video" || block.type === "audio")) {
                const match = uploadedAttachments.find(att => att.id === block.id);
                if (match) {
                  return { ...block, mediaUrl: match.url };
                }
              }
              return block;
            });
            finalContentString = JSON.stringify(mapped);
          }
        } catch (e) {
          console.error("Failed to map uploaded attachment URLs in content blocks:", e);
        }

        // ── 5. Encrypt title and content ──
        let plainTextMessage = finalContentString;
        try {
          const sanitized = finalContentString.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
          let parsed = JSON.parse(sanitized);
          while (typeof parsed === "string") {
            parsed = JSON.parse(parsed.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
          }
          if (Array.isArray(parsed)) {
            plainTextMessage = parsed.map((b: any) => b.text || "").join("\n");
          }
        } catch (e) {}

        const encryptedTitle   = await encryptText(capturedTitle,   contentKey);
        const encryptedContent = await encryptText(finalContentString, contentKey);

        // ── 6. RSA-wrap content key for every recipient ──
        const encryptedKeys = await wrapContentKeyForRecipients(contentKey, publicKeys);

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
          capturedTriggerType === "event"
            ? nextUnlockAt
            : capturedRecipientType === "public"
              ? serverNow().toISOString()
              : new Date(`${format(capturedDeliveryDate!, "yyyy-MM-dd")}T${capturedDeliveryTime}:00`).toISOString();

        const res = await fetch(`${API_BASE}/createCapsule`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: capsuleId,
            // Moderation only — plaintext, never stored server-side
            plaintextTitle:   capturedTitle.replace(/<[^>]*>/g, "").trim().slice(0, 200),
            plaintextPreview: plainTextMessage.replace(/<[^>]*>/g, "").trim().slice(0, 1000),
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
            autoRecurYearly:   capturedTriggerType === "event" && capturedRecurrencePattern === "yearly",
            recurrencePattern: capturedTriggerType === "event" ? capturedRecurrencePattern : "none",
            priorReminderEnabled: capturedPriorReminderEnabled,
            priorReminderDays: capturedPriorReminderDays,
            reminderConfig: capturedTriggerType === "event" ? {
              frequency: capturedRecurrencePattern,
              time: capturedReminderTime,
              dayOfWeek: capturedReminderDayOfWeek,
              dayOfMonth: capturedReminderDayOfMonth,
              yearlyDate: capturedReminderYearlyDate,
            } : null,
            reminderPreset: capturedTriggerType === "event" ? capturedReminderPreset : null,
            isReminderCapsule: capturedTriggerType === "event",
            nextUnlockAt,
            visibleFrom,
          }),
        });

        if (!res.ok) {
          // Surface moderation rejection message to user
          const errorBody = await res.json().catch(() => ({}));
          const errorMessage = errorBody?.error || "Failed to create capsule";
          throw new Error(errorMessage);
        }

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
          recurrencePattern={recurrencePattern as any}
          onRecurrencePatternChange={updateRecurrencePattern as any}
          priorReminderEnabled={priorReminderEnabled}
          onPriorReminderEnabledChange={setPriorReminderEnabled}
          priorReminderDays={priorReminderDays}
          onPriorReminderDaysChange={setPriorReminderDays}
          reminderTime={reminderTime}
          onReminderTimeChange={updateReminderTime}
          reminderDayOfWeek={reminderDayOfWeek}
          onReminderDayOfWeekChange={updateReminderDayOfWeek}
          reminderDayOfMonth={reminderDayOfMonth}
          onReminderDayOfMonthChange={updateReminderDayOfMonth}
          reminderYearlyDate={reminderYearlyDate}
          onReminderYearlyDateChange={updateReminderYearlyDate}
          reminderPreset={reminderPreset}
          onReminderPresetChange={handleReminderPresetChange}
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