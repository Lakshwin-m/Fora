import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { format } from "date-fns";
import { CapsuleMultistepForm } from "@/components/capsule-multistep-form";
import SealCapsuleModal from "@/components/SealCapsuleModal";
import { getFriends, FriendWithProfile } from "@/services/friendServices";
import { Toaster } from "sonner";

interface Attachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  url?: string;
  uploading?: boolean;
  progress?: number;
}

const CreateCapsule = () => {
  const navigate = useNavigate();
  const { addCapsule } = useCapsules();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [triggerType, setTriggerType] = useState<
    "time" | "event" | "connection"
  >("time");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [recipientType, setRecipientType] = useState<
    "self" | "friends" | "public"
  >("self");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [capsuleCategory, setCapsuleCategory] = useState<string>("");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");
  const [showSealModal, setShowSealModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0); // Changed to 0-index for 6 steps

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // Get current user and their username
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(
              userData.name || userData.username || user.email || "Anonymous"
            );
          } else {
            setUsername(user.email || "Anonymous");
          }
        } catch (error) {
          console.error("Error fetching username:", error);
          setUsername(user.email || "Anonymous");
        }
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [auth, db, navigate]);

  // Load friends
  useEffect(() => {
    if (currentUser) {
      loadFriends();
    }
  }, [currentUser]);

  const loadFriends = async (): Promise<void> => {
    if (!currentUser) return;
    setLoadingFriends(true);
    try {
      const friendsList = await getFriends(currentUser.uid);
      setFriends(friendsList);
    } catch (error) {
      console.error("Error loading friends:", error);
      toast({
        title: "Error",
        description: "Failed to load friends list",
        variant: "destructive",
      });
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleFileSelect = (
    type: "image" | "video" | "audio",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type,
      name: file.name,
      uploading: false,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const uploadFileToStorage = async (
    attachment: Attachment
  ): Promise<string> => {
    if (!currentUser) throw new Error("User not authenticated");
    const fileExtension = attachment.file.name.split(".").pop();
    const fileName = `capsules/${currentUser.uid}/${attachment.id}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    setAttachments((prev) =>
      prev.map((item) =>
        item.id === attachment.id
          ? { ...item, uploading: true, progress: 0 }
          : item
      )
    );

    try {
      const snapshot = await uploadBytes(storageRef, attachment.file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachment.id
            ? { ...item, url: downloadURL, uploading: false, progress: 100 }
            : item
        )
      );
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachment.id ? { ...item, uploading: false } : item
        )
      );
      throw error;
    }
  };

  const uploadAllAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];
    const uploadPromises = attachments.map((attachment) =>
      uploadFileToStorage(attachment)
    );
    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error("Error uploading attachments:", error);
      throw error;
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const selectAllFriends = () => {
    if (selectedFriends.length === formattedFriends.length) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(formattedFriends.map((f) => f.id));
    }
  };

  const nextStep = () => {
    if (currentStep < 5) {
      // 5 is the last step (0-indexed)
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and content.",
        variant: "destructive",
      });
      return false;
    }

    if (recipientType === "friends" && selectedFriends.length === 0) {
      toast({
        title: "No recipients selected",
        description:
          "Please select at least one friend to receive this capsule.",
        variant: "destructive",
      });
      return false;
    }

    if (recipientType === "public" && !capsuleCategory.trim()) {
      toast({
        title: "Category required",
        description: "Please specify a category for your public capsule.",
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
        title: "Missing delivery time",
        description:
          "Please specify both date and time for time-based capsules.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFormSubmit = () => {
    if (!validateForm()) {
      return;
    }
    setShowSealModal(true);
  };

  const handleFinalSubmission = async (signatureData?: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a capsule.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        toast({
          title: "Uploading attachments...",
          description: `Uploading ${attachments.length} file(s) to your capsule.`,
        });
        attachmentUrls = await uploadAllAttachments();
      }

      let unlockTimestamp: Date;
      if (recipientType === "public") {
        unlockTimestamp = new Date();
      } else if (triggerType === "time") {
        const dateTimeString = `${format(
          deliveryDate!,
          "yyyy-MM-dd"
        )}T${deliveryTime}:00`;
        const unlockDate = new Date(dateTimeString);
        if (unlockDate <= new Date()) {
          toast({
            title: "Invalid date",
            description: "Please select a date and time in the future.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        unlockTimestamp = unlockDate;
      } else {
        unlockTimestamp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const recipientsList =
        recipientType === "self"
          ? [currentUser.uid]
          : recipientType === "public"
          ? []
          : selectedFriends;

      const recipientNames =
        recipientType === "self"
          ? ["Myself"]
          : recipientType === "public"
          ? ["Public"]
          : formattedFriends
              .filter((f) => selectedFriends.includes(f.id))
              .map((f) => f.name);

      const capsuleData = {
        title: title.trim(),
        content: content.trim(),
        triggerType: triggerType,
        unlockDate: unlockTimestamp,
        recipients: recipientsList,
        recipientNames: recipientNames,
        recipientType: recipientType,
        attachments: attachmentUrls,
        userId: currentUser.uid,
        username: username,
        createdBy: currentUser.uid,
        creatorName: username,
        createdAt: serverTimestamp(),
        status: recipientType === "public" ? "published" : "scheduled",
        isUnlocked: recipientType === "public" ? true : false,
        visibility: recipientType === "public" ? "public" : "private",
        ...(recipientType === "public" && { category: capsuleCategory }),
        reshareCount: 0,
        isReshare: false,
        signature: signatureData || null,
        sealedAt: serverTimestamp(),
        ...(triggerType === "event" && {
          eventDescription:
            (document.getElementById("eventTrigger") as HTMLInputElement)
              ?.value || "",
        }),
        ...(triggerType === "connection" && {
          connectionCondition:
            (document.getElementById("connectionTrigger") as HTMLInputElement)
              ?.value || "",
        }),
      };

      const docRef = await addDoc(collection(db, "capsules"), capsuleData);
      addCapsule({
        id: docRef.id,
        title: title.trim(),
        content: content.trim(),
        deliveryDate: unlockTimestamp.toISOString(),
        recipients: recipientsList,
        triggerType: triggerType,
        attachments: attachmentUrls,
        signature: signatureData || null,
        isSealed: true,
      });

      toast({
        title: "Capsule created and sealed! 🎉",
        description:
          recipientType === "self"
            ? `Your sealed time capsule will unlock on ${unlockTimestamp.toLocaleString()}`
            : recipientType === "public"
            ? `Your public capsule is now live in the Community Archive!`
            : `Sealed capsule will be sent to ${selectedFriends.length} friend${
                selectedFriends.length > 1 ? "s" : ""
              } on ${unlockTimestamp.toLocaleString()}`,
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Error creating capsule:", error);
      toast({
        title: "Error",
        description: "Failed to create capsule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowSealModal(false);
    }
  };

  // Format friends for the form
  const formattedFriends = friends
    .filter((friend) => friend.profile)
    .map((friend) => {
      const friendId =
        friend.requesterId === currentUser?.uid
          ? friend.receiverId
          : friend.requesterId;
      const profile = friend.profile!;
      return {
        id: friendId,
        name: profile.name || "Unknown User",
        email: profile.email || "No email",
        photoURL: profile.photoURL || "",
      };
    })
    .filter((friend) => friend.name !== "Unknown User");

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FFF9EC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-[#FFDCCC]/50 text-[#5D2A42] border border-[#5D2A42]/20"
            >
              <ArrowLeft className="w-4 h-4 mr-3" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#5D2A42]">
                Create a <span className="text-[#FB6376]">Forá</span> Capsule
              </h1>
              <p className="text-[#5D2A42]/60 pt-1">
                Craft a message for the future as{" "}
                <span className="font-bold text-[#5D2A42]">{username}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Multistep Form */}
        <CapsuleMultistepForm
          // Form data
          title={title}
          content={content}
          triggerType={triggerType}
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          recipientType={recipientType}
          selectedFriends={selectedFriends}
          capsuleCategory={capsuleCategory}
          attachments={attachments}
          friends={formattedFriends}
          username={username}
          // Handlers
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
          // Navigation
          onNextStep={nextStep}
          onPrevStep={prevStep}
          onSubmit={handleFormSubmit}
          onCancel={() => navigate("/dashboard")}
          // State
          currentStep={currentStep}
          isSubmitting={isSubmitting}
          loadingFriends={loadingFriends}
        />
      </div>

      {/* Seal Capsule Modal */}
      <SealCapsuleModal
        isOpen={showSealModal}
        onClose={() => setShowSealModal(false)}
        onSealComplete={(signatureData: string) => {
          handleFinalSubmission(signatureData);
        }}
        capsuleTitle={title}
        capsuleId={`draft-${Date.now()}`}
      />
    </div>
  );
};

export default CreateCapsule;
