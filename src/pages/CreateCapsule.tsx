import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  Users,
  Image,
  Video,
  Mic,
  X,
  Plus,
  Send,
  ArrowLeft,
  Loader2,
  User,
  UserPlus,
  Package,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  File,
  Calendar,
  Music,
  Archive,
  Lock,
} from "lucide-react";
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
import { Calendar as CalendarIcon } from "lucide-react";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { DatePickerWithPresets } from "@/components/DatePickerWithPresets";
import { TimePicker } from "@/components/TimePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFriends, FriendWithProfile } from "@/services/friendServices";
import SealCapsuleModal from "@/components/SealCapsuleModal";

interface StepProgress {
  1: boolean;
  2: boolean;
  3: boolean;
}

// Define attachment types
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

  // Recipient management
  const [recipientType, setRecipientType] = useState<
    "self" | "friends" | "public"
  >("self");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [capsuleCategory, setCapsuleCategory] = useState<string>("");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);

  // File attachments management
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");

  // Step management
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepProgress, setStepProgress] = useState<StepProgress>({
    1: false,
    2: false,
    3: false,
  });

  // Seal modal state
  const [showSealModal, setShowSealModal] = useState(false);
  const [isCapsuleSealed, setIsCapsuleSealed] = useState(false);
  const [capsuleDraft, setCapsuleDraft] = useState<any>(null);

  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // Get current user and their username
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);

        // Fetch username from Firestore users collection
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
        // Redirect to login if not authenticated
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  // Load friends when switching to friends tab
  useEffect(() => {
    if (recipientType === "friends" && currentUser && friends.length === 0) {
      loadFriends();
    }
  }, [recipientType, currentUser]);

  // Update step progress when form fields are filled
  useEffect(() => {
    const basicInfoComplete = title.trim() !== "" && content.trim() !== "";
    const triggerComplete =
      triggerType === "time"
        ? deliveryDate !== undefined && deliveryTime !== ""
        : true;
    const recipientsComplete =
      recipientType === "self" ||
      recipientType === "public" ||
      (recipientType === "friends" && selectedFriends.length > 0);

    setStepProgress({
      1: basicInfoComplete,
      2: triggerComplete,
      3: recipientsComplete,
    });
  }, [
    title,
    content,
    triggerType,
    deliveryDate,
    deliveryTime,
    recipientType,
    selectedFriends,
  ]);

  const loadFriends = async (): Promise<void> => {
    if (!currentUser) return;

    setLoadingFriends(true);
    try {
      const friendsList = await getFriends(currentUser.uid);
      setFriends(friendsList);

      if (friendsList.length === 0) {
        toast({
          title: "No friends yet",
          description:
            "Add friends from the Connections page to send them capsules.",
        });
      }
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

  const toggleFriendSelection = (friendId: string): void => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const selectAllFriends = (): void => {
    if (selectedFriends.length === friends.length) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(
        friends.map((f) =>
          f.requesterId === currentUser.uid ? f.receiverId : f.requesterId
        )
      );
    }
  };

  // Handle file selection
  const handleFileSelect = (
    type: "image" | "video" | "audio",
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
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

    // Reset the input
    event.target.value = "";
  };

  // Upload a single file to Firebase Storage
  const uploadFileToStorage = async (
    attachment: Attachment
  ): Promise<string> => {
    if (!currentUser) throw new Error("User not authenticated");

    const fileExtension = attachment.file.name.split(".").pop();
    const fileName = `capsules/${currentUser.uid}/${attachment.id}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    // Update attachment to show uploading state
    setAttachments((prev) =>
      prev.map((item) =>
        item.id === attachment.id
          ? { ...item, uploading: true, progress: 0 }
          : item
      )
    );

    try {
      // Upload file
      const snapshot = await uploadBytes(storageRef, attachment.file);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update attachment with URL
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

  // Upload all attachments
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

  // Remove attachment
  const removeAttachment = (id: string): void => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  // Get file type display name
  const getFileTypeName = (type: string) => {
    switch (type) {
      case "image":
        return "Image";
      case "video":
        return "Video";
      case "audio":
        return "Audio";
      default:
        return "File";
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const nextStep = (): void => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validate form before showing seal modal
  const validateForm = (): boolean => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and content.",
        variant: "destructive",
      });
      return false;
    }

    // Validate recipients based on type
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

    // Validate time-based trigger has required fields (skip for public)
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

  // Save capsule draft data
  const saveCapsuleDraft = (): void => {
    const draft = {
      title: title.trim(),
      content: content.trim(),
      triggerType: triggerType,
      deliveryDate: deliveryDate,
      deliveryTime: deliveryTime,
      recipientType: recipientType,
      selectedFriends: selectedFriends,
      capsuleCategory: capsuleCategory,
      attachments: attachments,
    };

    setCapsuleDraft(draft);
    console.log("Capsule draft saved:", draft);
  };

  // Handle final submission after sealing
  const handleFinalSubmission = async (
    signatureData?: string
  ): Promise<void> => {
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
      // Upload all attachments first
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        toast({
          title: "Uploading attachments...",
          description: `Uploading ${attachments.length} file(s) to your capsule.`,
        });
        attachmentUrls = await uploadAllAttachments();
      }

      // Calculate unlock timestamp
      let unlockTimestamp: Date;

      if (recipientType === "public") {
        // Public capsules are immediately available
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

      // Determine recipients array
      const recipientsList =
        recipientType === "self"
          ? [currentUser.uid]
          : recipientType === "public"
          ? []
          : selectedFriends;

      // Get recipient names for display
      const recipientNames =
        recipientType === "self"
          ? ["Myself"]
          : recipientType === "public"
          ? ["Public"]
          : friends
              .filter((f) => {
                const friendId =
                  f.requesterId === currentUser.uid
                    ? f.receiverId
                    : f.requesterId;
                return selectedFriends.includes(friendId);
              })
              .map((f) => f.profile.name);

      // Create capsule document in Firestore
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
        signature: signatureData || null, // Store the signature if provided
        sealedAt: serverTimestamp(), // Timestamp when capsule was sealed
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

      console.log("Creating capsule with recipientType:", recipientType);

      // Add to Firestore
      const docRef = await addDoc(collection(db, "capsules"), capsuleData);

      // Also add to local context
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

      // Navigate to dashboard after a short delay
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
    }
  };

  const triggerOptions = [
    {
      id: "time",
      label: "Time-based",
      description: "Unlock on a specific date and time",
      icon: Clock,
    },
    {
      id: "event",
      label: "Event-based",
      description: "Unlock after a specific event occurs",
      icon: Calendar,
    },
    {
      id: "connection",
      label: "Connection-based",
      description: "Unlock when tagged connection confirms",
      icon: Users,
    },
  ];

  // Show loading while checking auth
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FFF9EC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
      </div>
    );
  }

  // Helper function to get week days
  function getWeekDays(date: Date): Date[] {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  const StepIndicator = (): JSX.Element => (
    <div className="flex items-center justify-center mb-12">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          {/* Step circle */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              currentStep >= step
                ? stepProgress[step as keyof StepProgress]
                  ? "bg-[#FCB1A6] border-[#FCB1A6] text-[#5D2A42]"
                  : "bg-[#FB6376] border-[#FB6376] text-white"
                : "bg-white border-[#5D2A42]/30 text-[#5D2A42]/30"
            }`}
          >
            {stepProgress[step as keyof StepProgress] ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <span className="font-bold text-sm">{step}</span>
            )}
          </div>

          {/* Step label */}
          <div className="ml-3 mr-8">
            <div
              className={`text-sm font-medium ${
                currentStep >= step ? "text-[#5D2A42]" : "text-[#5D2A42]/40"
              }`}
            >
              {step === 1 && "Basic Info"}
              {step === 2 && "Trigger"}
              {step === 3 && "Recipients"}
            </div>
          </div>

          {/* Connector line */}
          {step < 3 && (
            <div
              className={`w-16 h-0.5 mx-4 ${
                currentStep > step ? "bg-[#FB6376]" : "bg-[#5D2A42]/20"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-[#FFDCCC]/50 text-[#5D2A42] border border-[#5D2A42]/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#5D2A42]">
                Create Time Capsule
              </h1>
              <p className="text-[#5D2A42]/60">
                Craft a message for the future as {username}
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={(e) => handleFileSelect("image", e)}
          accept="image/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileSelect("video", e)}
          accept="video/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={audioInputRef}
          onChange={(e) => handleFileSelect("audio", e)}
          accept="audio/*"
          multiple
          className="hidden"
        />

        {/* Steps 1 and 2 */}
        {currentStep < 3 ? (
          <div>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <Card className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
                  <CardTitle className="flex items-center space-x-3 text-[#5D2A42]">
                    <div className="w-10 h-10 bg-[#FB6376] rounded-xl flex items-center justify-center shadow-sm">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        Basic Information
                      </div>
                      <CardDescription className="text-[#5D2A42]/70">
                        Give your capsule a title and content
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 bg-white">
                  <div className="space-y-3">
                    <Label
                      htmlFor="title"
                      className="text-[#5D2A42] font-medium"
                    >
                      Capsule Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="What's this capsule about?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-[#5D2A42]"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="content"
                      className="text-[#5D2A42] font-medium"
                    >
                      Message Content
                    </Label>
                    <Textarea
                      id="content"
                      placeholder="Write your message to the future..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-32 border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-[#5D2A42]"
                      required
                    />
                  </div>

                  {/* Attachments */}
                  <div className="space-y-3">
                    <Label className="text-[#5D2A42] font-medium">
                      Attachments (Optional)
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => imageInputRef.current?.click()}
                        className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                      >
                        <Image className="w-4 h-4 mr-2" />
                        Add Images
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => videoInputRef.current?.click()}
                        className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Add Videos
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => audioInputRef.current?.click()}
                        className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Add Audio
                      </Button>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-[#5D2A42]/70">
                          {attachments.length} file(s) selected
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((attachment) => (
                            <Badge
                              key={attachment.id}
                              variant="secondary"
                              className="pr-1 bg-[#FCB1A6]/30 text-[#5D2A42] border-[#5D2A42]/20"
                            >
                              <div className="flex items-center space-x-1">
                                {getFileIcon(attachment.type)}
                                <span className="max-w-32 truncate text-xs">
                                  {attachment.name}
                                </span>
                                {attachment.uploading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-[#FB6376]/20"
                                    onClick={() =>
                                      removeAttachment(attachment.id)
                                    }
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Trigger Configuration */}
            {currentStep === 2 && (
              <Card className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
                  <CardTitle className="flex items-center space-x-3 text-[#5D2A42]">
                    <div className="w-10 h-10 bg-[#FB6376] rounded-xl flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        Unlock Trigger
                      </div>
                      <CardDescription className="text-[#5D2A42]/70">
                        Choose when this capsule should be unlocked
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 bg-white">
                  <Tabs
                    value={triggerType}
                    onValueChange={(value) => setTriggerType(value as any)}
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-[#FFDCCC]/30 border border-[#5D2A42]/20 p-1">
                      {triggerOptions.map((option) => (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          className="text-sm data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-[#5D2A42]"
                        >
                          <option.icon className="w-4 h-4 mr-2" />
                          {option.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsContent value="time" className="space-y-4 mt-6">
                      <p className="text-sm text-[#5D2A42]/70">
                        Your capsule will unlock automatically on the specified
                        date and time.
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[#5D2A42] font-medium">
                            Delivery Date
                          </Label>
                          <DatePickerWithPresets
                            value={deliveryDate}
                            onSelect={setDeliveryDate}
                            placeholder="Pick a date"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#5D2A42] font-medium">
                            Delivery Time
                          </Label>
                          <TimePicker
                            value={deliveryTime}
                            onSelect={setDeliveryTime}
                            placeholder="HH:MM"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="event" className="space-y-4 mt-6">
                      <p className="text-sm text-[#5D2A42]/70">
                        Your capsule will unlock when a specific event occurs.
                      </p>
                      <div className="space-y-2">
                        <Label
                          htmlFor="eventTrigger"
                          className="text-[#5D2A42] font-medium"
                        >
                          Event Description
                        </Label>
                        <Input
                          id="eventTrigger"
                          placeholder="e.g., My 30th birthday, Sarah's graduation"
                          className="border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-[#5D2A42]"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="connection" className="space-y-4 mt-6">
                      <p className="text-sm text-[#5D2A42]/70">
                        Your capsule will unlock when tagged connections
                        confirm.
                      </p>
                      <div className="space-y-2">
                        <Label
                          htmlFor="connectionTrigger"
                          className="text-[#5D2A42] font-medium"
                        >
                          Trigger Condition
                        </Label>
                        <Input
                          id="connectionTrigger"
                          placeholder="e.g., We meet again in person"
                          className="border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-[#5D2A42]"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons for Steps 1 and 2 */}
            <div className="flex justify-between items-center pt-8 border-t border-[#5D2A42]/10">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!stepProgress[currentStep as keyof StepProgress]}
                  className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 3: Recipients */
          <div>
            <Card className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
                <CardTitle className="flex items-center space-x-3 text-[#5D2A42]">
                  <div className="w-10 h-10 bg-[#FB6376] rounded-xl flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Recipients</div>
                    <CardDescription className="text-[#5D2A42]/70">
                      Choose who will receive this capsule
                    </CardDescription>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 bg-white">
                <Tabs
                  value={recipientType}
                  onValueChange={(value) => setRecipientType(value as any)}
                >
                  <TabsList className="grid w-full grid-cols-3 bg-[#FFDCCC]/30 border border-[#5D2A42]/20 p-1">
                    <TabsTrigger
                      value="self"
                      className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-[#5D2A42]"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Myself
                    </TabsTrigger>
                    <TabsTrigger
                      value="friends"
                      className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-[#5D2A42]"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Friends
                    </TabsTrigger>
                    <TabsTrigger
                      value="public"
                      className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-[#5D2A42]"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Public
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="self" className="mt-6">
                    <div className="text-center p-8 border-2 border-dashed border-[#5D2A42]/30 rounded-lg bg-[#FFDCCC]/20">
                      <User className="w-12 h-12 mx-auto mb-3 text-[#5D2A42]/50" />
                      <h3 className="font-semibold text-[#5D2A42] mb-2">
                        Send to Yourself
                      </h3>
                      <p className="text-sm text-[#5D2A42]/70">
                        This capsule will be delivered to your own inbox.
                        Perfect for future self-reflections and personal
                        messages.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="friends" className="mt-6 space-y-4">
                    {loadingFriends ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[#FB6376]" />
                      </div>
                    ) : friends.length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-[#5D2A42]/30 rounded-lg bg-[#FFDCCC]/20">
                        <Users className="w-12 h-12 mx-auto mb-3 text-[#5D2A42]/50" />
                        <h3 className="font-semibold text-[#5D2A42] mb-2">
                          No Friends Yet
                        </h3>
                        <p className="text-sm text-[#5D2A42]/70 mb-4">
                          Add friends from the Connections page to send them
                          capsules
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/connections")}
                          className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friends
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <Label className="text-[#5D2A42] font-medium">
                            Select Friends ({selectedFriends.length} selected)
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllFriends}
                            className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                          >
                            {selectedFriends.length === friends.length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                          {friends
                            .filter((friend) => friend.profile)
                            .map((friend) => {
                              const friendId =
                                friend.requesterId === currentUser.uid
                                  ? friend.receiverId
                                  : friend.requesterId;
                              const isSelected =
                                selectedFriends.includes(friendId);

                              return (
                                <Card
                                  key={friend.id}
                                  className={`border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-[#FB6376] bg-[#FFDCCC]/30"
                                      : "border-[#5D2A42]/20 hover:border-[#FB6376]/50"
                                  }`}
                                >
                                  <CardContent
                                    className="p-4"
                                    onClick={() =>
                                      toggleFriendSelection(friendId)
                                    }
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() =>
                                            toggleFriendSelection(friendId)
                                          }
                                          className="mt-0.5 data-[state=checked]:bg-[#FB6376] data-[state=checked]:border-[#FB6376]"
                                        />
                                      </div>
                                      <Avatar className="w-10 h-10">
                                        <AvatarImage
                                          src={friend.profile.photoURL}
                                          alt={friend.profile.name}
                                        />
                                        <AvatarFallback className="bg-[#FB6376] text-white">
                                          {getInitials(friend.profile.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-[#5D2A42] truncate">
                                          {friend.profile.name}
                                        </h4>
                                        <p className="text-xs text-[#5D2A42]/60 truncate">
                                          {friend.profile.email}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="public" className="mt-6 space-y-4">
                    <div className="text-center p-8 border-2 border-dashed border-[#5D2A42]/30 rounded-lg bg-[#FFDCCC]/20 mb-6">
                      <Archive className="w-12 h-12 mx-auto mb-3 text-[#5D2A42]/50" />
                      <h3 className="font-semibold text-[#5D2A42] mb-2">
                        Share with Community
                      </h3>
                      <p className="text-sm text-[#5D2A42]/70">
                        Make this capsule public and share it with the entire
                        community. Anyone can view and reshare your memories.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="category"
                          className="text-[#5D2A42] font-medium block mb-2"
                        >
                          Category *
                        </Label>
                        <Select
                          value={capsuleCategory}
                          onValueChange={setCapsuleCategory}
                        >
                          <SelectTrigger
                            id="category"
                            className="border-[#5D2A42]/20 bg-white text-[#5D2A42]"
                          >
                            <SelectValue placeholder="Select a category..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#5D2A42]/20">
                            <SelectItem value="memories">Memories</SelectItem>
                            <SelectItem value="reflections">
                              Reflections
                            </SelectItem>
                            <SelectItem value="moments">Moments</SelectItem>
                            <SelectItem value="stories">Stories</SelectItem>
                            <SelectItem value="milestones">
                              Milestones
                            </SelectItem>
                            <SelectItem value="wisdom">Wisdom</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[#5D2A42]/60 mt-1">
                          Choose a category to help others discover your capsule
                        </p>
                      </div>

                      <div className="p-4 bg-[#FB6376]/5 border border-[#FB6376]/20 rounded-lg">
                        <p className="text-sm text-[#5D2A42] font-medium mb-2">
                          ✨ Public Capsule Benefits
                        </p>
                        <ul className="text-xs text-[#5D2A42]/70 space-y-1">
                          <li>• Be discovered by the entire community</li>
                          <li>• Allow others to reshare your memories</li>
                          <li>• Create meaningful connections</li>
                          <li>• Build your archive presence</li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Submit Button for Step 3 */}
            <div className="flex justify-between items-center pt-8 border-t border-[#5D2A42]/10">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    // First validate all form data
                    if (!validateForm()) {
                      return;
                    }

                    // Save draft data
                    saveCapsuleDraft();

                    // Show sealing modal
                    setShowSealModal(true);
                  }}
                  className="bg-gradient-to-r from-[#FB6376] to-[#FCB1A6] hover:from-[#FB6376]/90 hover:to-[#FCB1A6]/90 text-white shadow-lg hover:shadow-xl transition-all px-8"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Create & Seal Capsule
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seal Capsule Modal */}
      <SealCapsuleModal
        isOpen={showSealModal}
        onClose={() => setShowSealModal(false)}
        onSealComplete={(signatureData: string) => {
          // Handle the final submission after sealing
          handleFinalSubmission(signatureData);
          setIsCapsuleSealed(true);
        }}
        capsuleTitle={title}
        capsuleId={`draft-${Date.now()}`}
      />
    </div>
  );
};

export default CreateCapsule;
