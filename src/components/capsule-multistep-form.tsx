"use client";

import { toast } from "sonner";
import { useState, useRef } from "react";
import { CanvasTextEditor } from "@/components/ui/canvas-text-editor";
import { motion, AnimatePresence } from "framer-motion";

const getPlainTextLength = (val: string) => {
  if (!val) return 0;
  try {
    const blocks = JSON.parse(val);
    if (Array.isArray(blocks)) {
      return blocks.reduce((acc, b) => acc + (b.text?.length || 0), 0);
    }
  } catch (e) {
    // fallback for html
  }
  return val.replace(/<[^>]*>?/gm, '').length;
};
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Image,
  Video,
  Music,
  File,
  X,
  Clock,
  Calendar,
  Users,
  Lock,
  MessageSquare,
  Gift,
  Eye,
  FileText,
  MapPin,
  Play,
  Pause,
  PartyPopper,
  Cake,
  Star,
  Heart,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperNav,
} from "@/components/ui/stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioVisualizer } from "./AudioVisualizer";
import { useTranslation } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

const steps = [
  { id: "trigger", title: "Delivery", description: "When to unlock", icon: Clock },
  { id: "recipients", title: "Recipients", description: "Who receives it", icon: Users },
  { id: "basic", title: "Message", description: "Write your capsule", icon: MessageSquare },
  { id: "review", title: "Review", description: "Check details", icon: Check },
];

interface Friend {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  hasPublicKey?: boolean;
}

interface Attachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  uploading?: boolean;
  progress?: number;
  altText?: string;
}

interface CapsuleMultistepFormProps {
  title: string;
  content: string;
  triggerType: "time" | "event" | "connection";
  deliveryDate: Date | undefined;
  deliveryTime: string;
  recipientType: "self" | "friends" | "public";
  selectedFriends: string[];
  capsuleCategory: string;
  attachments: Attachment[];
  friends: Friend[];
  username: string;
  recurrencePattern: "none" | "minutely" | "daily" | "weekly" | "monthly" | "yearly";
  onRecurrencePatternChange: (value: "none" | "minutely" | "daily" | "weekly" | "monthly" | "yearly") => void;
  priorReminderEnabled: boolean;
  onPriorReminderEnabledChange: (value: boolean) => void;
  priorReminderDays: number;
  onPriorReminderDaysChange: (value: number) => void;


  reminderFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  onReminderFrequencyChange?: (value: "daily" | "weekly" | "monthly" | "yearly") => void;
  reminderTime: string;
  onReminderTimeChange: (value: string) => void;
  reminderDayOfWeek: string;
  onReminderDayOfWeekChange: (value: string) => void;
  reminderDayOfMonth: number | null;
  onReminderDayOfMonthChange: (value: number | null) => void;
  reminderYearlyDate: Date | null;
  onReminderYearlyDateChange: (value: Date | null) => void;
  reminderPreset: string;
  onReminderPresetChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onTriggerTypeChange: (value: "time" | "event" | "connection") => void;
  onDeliveryDateChange: (date: Date | undefined) => void;
  onDeliveryTimeChange: (time: string) => void;
  onRecipientTypeChange: (value: "self" | "friends" | "public") => void;
  onSelectedFriendsChange: (friends: string[]) => void;
  onCapsuleCategoryChange: (value: string) => void;
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onFileSelect: (
    type: "image" | "video" | "audio",
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onRemoveAttachment: (id: string) => void;

  onNextStep: () => void;
  onPrevStep: () => void;
  onSubmit: () => void;
  onCancel: () => void;

  currentStep: number;
  isSubmitting: boolean;
  loadingFriends: boolean;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
    transition: {
      x: { type: "spring" as const, stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
};

export const CapsuleMultistepForm = ({
  title,
  content,
  triggerType,
  deliveryDate,
  deliveryTime,
  recipientType,
  selectedFriends = [],
  capsuleCategory,
  attachments = [],
  friends = [],
  username,
  recurrencePattern,
  onRecurrencePatternChange,
  priorReminderEnabled,
  onPriorReminderEnabledChange,
  priorReminderDays,
  onPriorReminderDaysChange,

  reminderFrequency,
  onReminderFrequencyChange,
  reminderTime,
  onReminderTimeChange,
  reminderDayOfWeek,
  onReminderDayOfWeekChange,
  reminderDayOfMonth,
  onReminderDayOfMonthChange,
  reminderYearlyDate,
  onReminderYearlyDateChange,
  reminderPreset,
  onReminderPresetChange,


  onTitleChange,
  onContentChange,
  onTriggerTypeChange,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onRecipientTypeChange,
  onSelectedFriendsChange,
  onCapsuleCategoryChange,
  onFileSelect,
  onRemoveAttachment,
  onAttachmentsChange,

  onNextStep,
  onPrevStep,
  onSubmit,
  onCancel,

  currentStep,
  isSubmitting,
  loadingFriends,
}: CapsuleMultistepFormProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [direction, setDirection] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const { t } = useTranslation();

  const translatedSteps = [
    { id: "trigger", title: t("create.stepDeliveryTitle") || "Delivery", description: t("create.stepDeliveryDesc") || "When to unlock", icon: Clock },
    { id: "recipients", title: t("create.stepRecipientsTitle") || "Recipients", description: t("create.stepRecipientsDesc") || "Who receives it", icon: Users },
    { id: "basic", title: t("create.stepMessageTitle") || "Message", description: t("create.stepMessageDesc") || "Write your capsule", icon: MessageSquare },
    { id: "review", title: t("create.stepReviewTitle") || "Review", description: t("create.stepReviewDesc") || "Check details", icon: Check },
  ];

  const handleNext = () => {
    if (currentStep === 0) {
      if (triggerType === "time" && deliveryDate && deliveryTime) {
        toast.success("Delivery Time Confirmed", {
          description: `Capsule will unlock on ${deliveryDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${deliveryTime}.`
        });
      }
    }
    setDirection(1);
    onNextStep();
  };

  const handlePrev = () => {
    setDirection(-1);
    onPrevStep();
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelectedFriends = selectedFriends.includes(friendId)
      ? selectedFriends.filter((id) => id !== friendId)
      : [...selectedFriends, friendId];
    onSelectedFriendsChange(newSelectedFriends);
  };

  const selectAllFriends = () => {
    const validFriends = friends.filter((f) => f.hasPublicKey !== false).map((f) => f.id);
    if (selectedFriends.length === validFriends.length && validFriends.length > 0) {
      onSelectedFriendsChange([]);
    } else {
      onSelectedFriendsChange(validFriends);
    }
  };

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

  const getInitials = (name?: string) => {
    if (!name || typeof name !== "string") return "?";
    return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const triggerOptions = [
    {
      id: "time",
      label: t("create.triggerOptionTime"),
      description: t("create.triggerOptionTimeDesc"),
    },
    {
      id: "event",
      label: t("create.triggerOptionEvent"),
      description: t("create.triggerOptionEventDesc"),
    },
  ];

  const getSummarySentence = () => {
    if (recurrencePattern === "none") {
      return "This capsule will unlock once on the selected date and time.";
    }
    const timeStr = reminderTime ? ` at ${reminderTime}` : "";
    if (recurrencePattern === "daily") {
      return `Unlocks daily${timeStr}.`;
    }
    if (recurrencePattern === "weekly") {
      return `Unlocks weekly on ${reminderDayOfWeek || "selected day"}${timeStr}.`;
    }
    if (recurrencePattern === "monthly") {
      const daySuffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1: return "st";
          case 2: return "nd";
          case 3: return "rd";
          default: return "th";
        }
      };
      return `Unlocks monthly on the ${reminderDayOfMonth ? `${reminderDayOfMonth}${daySuffix(reminderDayOfMonth)}` : "selected day"}${timeStr}.`;
    }
    if (recurrencePattern === "yearly") {
      const dateStr = reminderYearlyDate
        ? format(reminderYearlyDate, "MMMM d")
        : "selected date";
      return `Unlocks yearly on ${dateStr}${timeStr}.`;
    }
    return "";
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        if (triggerType === "time") {
          return deliveryDate !== undefined && deliveryTime !== "";
        }
        return true;
      case 1:
        if (recipientType === "friends") {
          return selectedFriends.length > 0;
        }
        return true;
      case 2:
        return title.trim() !== "" && getPlainTextLength(content) > 0;
      case 3:
        return true; // Review always valid
      default:
        return false;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-16 pt-8 md:pt-16 px-4 md:px-8 overflow-x-hidden">
      {/* Horizontal Stepper Indicator */}
      <div className="mb-12">
        <Stepper
          value={currentStep + 1}
          orientation="horizontal"
          onValueChange={(val) => {
            if (val - 1 < currentStep) {
              const diff = currentStep - (val - 1);
              for (let i = 0; i < diff; i++) onPrevStep();
            }
          }}
        >
          <StepperNav className="gap-2 md:gap-6 flex-row items-center w-full justify-between">
            {translatedSteps.map((step, index) => (
              <StepperItem
                key={index}
                step={index + 1}
                className="relative flex-1"
              >
                {index < translatedSteps.length - 1 && (
                  <div 
                    className={cn(
                      "absolute top-[27px] left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px] transition-colors duration-700 z-0",
                      index < currentStep ? "bg-[#5D2A42]/30" : "bg-[#5D2A42]/10"
                    )}
                  />
                )}
                <StepperTrigger
                  className="flex flex-col items-center justify-center gap-3 w-full group rounded-2xl hover:bg-black/5 p-2 transition-colors"
                  disabled={index > currentStep}
                >
                    <StepperIndicator
                      className={cn(
                        "w-10 h-10 flex items-center justify-center transition-all duration-700 ease-out shrink-0 rounded-2xl border !text-sm",
                        index < currentStep
                          ? "!bg-[#5D2A42] !border-[#5D2A42] !text-white shadow-md"
                          : index === currentStep
                            ? "!bg-white !border-[#5D2A42] !text-[#5D2A42] shadow-[0_4px_20px_rgba(93,42,66,0.08)]"
                            : "!bg-[#5D2A42]/5 !border-[#5D2A42]/10 !text-[#5D2A42]/40"
                      )}
                    >
                      {index < currentStep ? (
                        <Check className="w-5 h-5" strokeWidth={2.5} />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </StepperIndicator>
                    
                  <div className="flex flex-col items-center gap-1 text-center mt-1">
                    <StepperTitle
                      className={cn(
                        "font-semibold text-[10px] md:text-xs tracking-wide uppercase transition-all duration-500",
                        index === currentStep
                          ? "text-[#5D2A42]"
                          : index < currentStep
                            ? "text-[#5D2A42]/80"
                            : "text-[#5D2A42]/30"
                      )}
                    >
                      {step.title}
                    </StepperTitle>
                    <span
                      className={cn(
                        "text-[9px] md:text-[11px] font-medium leading-tight hidden md:block transition-all duration-500",
                        index === currentStep
                          ? "text-[#5D2A42]/60"
                          : index < currentStep
                            ? "text-[#5D2A42]/40"
                            : "text-[#5D2A42]/20"
                      )}
                    >
                      {step.description}
                    </span>
                  </div>
                </StepperTrigger>
              </StepperItem>
            ))}
          </StepperNav>
        </Stepper>
      </div>

      {/* Form Area */}
      <div className="relative min-h-[500px] overflow-x-hidden">
        <div className="flex flex-col h-full relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              {/* Step 2: Basic Information & Memories */}
              {currentStep === 2 && (
                <div className="h-full flex flex-col gap-10 lg:pt-4">
                  <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-[#5D2A42] tracking-tighter mb-4">{t('create.msgTitleHeading')}</h2>
                    <p className="text-[#666] text-lg font-medium">{t('create.msgTitleSub')}</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-6">
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex justify-between items-end">
                        <Label htmlFor="content" className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                          {t('create.messageLabel')}
                        </Label>
                        <span className="text-xs font-bold text-[#FB6376]">{getPlainTextLength(content)} {t('create.chars')}</span>
                      </div>
                      <CanvasTextEditor
                        value={content}
                        onChange={onContentChange}
                        title={title}
                        onTitleChange={onTitleChange}
                        recipientType={recipientType}
                        recipientNames={selectedFriends.map(id => friends.find(f => f.id === id)?.name || "Friend")}
                        creatorName={username}
                        onAddPhoto={() => imageInputRef.current?.click()}
                        onAddVideo={() => videoInputRef.current?.click()}
                        onAddAudio={() => audioInputRef.current?.click()}
                      />
                    </div>

                    {/* Attachments Section (Visual Grid) */}
                    {attachments.length > 0 && (
                      <div className="flex flex-col gap-4 mt-4 border-t border-[#E8E8E8] pt-6">
                        <div>
                          <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                            {t('create.memoriesHeading') || "Memories"}
                          </Label>
                        </div>
                        <div className="columns-1 sm:columns-2 gap-4 space-y-4 mt-4">
                          {attachments.map((attachment) => {
                            const url = URL.createObjectURL(attachment.file);
                            return (
                              <div key={attachment.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden border border-[#E8E8E8] bg-white shadow-sm hover:shadow-md transition-all">
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
                                <button
                                  type="button"
                                  onClick={() => onRemoveAttachment(attachment.id)}
                                  className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full text-[#1A1A1A] font-bold text-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:bg-[#FB6376] hover:text-white transition-all shadow-sm"
                                >
                                  ✕
                                </button>
                                {attachment.type === 'image' && (
                                  <img src={url} alt={attachment.name} className="w-full h-auto object-cover min-h-[100px]" />
                                )}
                                {attachment.type === 'video' && (
                                  <div className="w-full bg-black relative">
                                    <video src={url} controls className="w-full h-auto object-cover max-h-[300px]" />
                                  </div>
                                )}
                                {attachment.type === 'audio' && (
                                  <div className="w-full aspect-square bg-[#F8F8F8] flex flex-col items-center justify-center p-4 border-b border-[#E8E8E8]">
                                    <span className="font-extrabold text-[#1A1A1A] tracking-widest text-xs mb-2">AUDIO</span>
                                    <audio src={url} controls className="w-full max-h-8" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                    {/* Hidden inputs */}
                    <input type="file" ref={imageInputRef} onChange={(e) => onFileSelect("image", e)} accept="image/*" multiple className="hidden" />
                    <input type="file" ref={videoInputRef} onChange={(e) => onFileSelect("video", e)} accept="video/*" multiple className="hidden" />
                    <input type="file" ref={audioInputRef} onChange={(e) => onFileSelect("audio", e)} accept="audio/*" multiple className="hidden" />
                  </div>
              )}

              {/* Step 0: Trigger Configuration */}
              {currentStep === 0 && (
                <div className="h-full flex flex-col gap-10 lg:pt-4">
                  <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-[#5D2A42] tracking-tighter mb-4">{t('create.deliveryHeading')}</h2>
                    <p className="text-[#666] text-lg font-medium">{t('create.deliverySub')}</p>
                  </div>

                  <Tabs
                    value={triggerType}
                    onValueChange={(value) => onTriggerTypeChange(value as any)}
                    className="flex flex-col flex-1 gap-8"
                  >
                    <TabsList className="grid w-full h-auto grid-cols-1 md:grid-cols-2 gap-6 bg-transparent p-0 max-w-2xl mx-auto">
                      {triggerOptions.map((option) => (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          className="flex flex-col items-start justify-center h-auto min-h-[110px] p-6 text-left rounded-3xl border border-[#5D2A42]/10 bg-white/60 backdrop-blur-sm data-[state=active]:border-[#5D2A42] data-[state=active]:bg-white data-[state=active]:shadow-[0_4px_20px_rgba(93,42,66,0.06)] text-[#5D2A42]/80 transition-all hover:border-[#5D2A42]/30"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-[#5D2A42]/5 border border-[#5D2A42]/10 text-[#5D2A42]">
                              {option.id === 'time' ? <Clock className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                            </div>
                            <span className="font-semibold text-lg text-[#5D2A42] tracking-wide">{option.label}</span>
                          </div>
                          <div className="text-xs md:text-sm font-medium text-[#5D2A42]/60 leading-relaxed">{option.description}</div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <div className="flex-1 mt-2 overflow-y-auto overflow-x-hidden no-scrollbar pb-6">
                      <TabsContent value="time" className="mt-0 outline-none">
                        <DateTimePicker
                          date={deliveryDate}
                          setDate={onDeliveryDateChange}
                          time={deliveryTime}
                          setTime={onDeliveryTimeChange}
                        />
                      </TabsContent>
                      <TabsContent value="event" className="mt-0 space-y-6 outline-none">
                        {/* Section 1: Predefined Presets */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                            {t('create.reminderScheduleLabel') || "Occasion Preset"}
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                              { id: "birthday", name: "Birthday", icon: <Cake className="w-5 h-5" />, description: "Yearly at 9:00 AM" },
                              { id: "anniversary", name: "Anniversary", icon: <Heart className="w-5 h-5" />, description: "Yearly at 9:00 AM" },
                              { id: "christmas", name: "Christmas", icon: <Gift className="w-5 h-5" />, description: "Every Dec 25 at 9:00 AM" },
                              { id: "newyear", name: "New Year", icon: <PartyPopper className="w-5 h-5" />, description: "Every Jan 1 at 12:00 AM" },
                              { id: "custom", name: "Custom", icon: <Calendar className="w-5 h-5" />, description: "Define from scratch" },
                            ].map((preset) => {
                              const isSelected = reminderPreset === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => onReminderPresetChange(preset.id)}
                                  className={cn(
                                    "flex flex-col items-center justify-between p-4 rounded-3xl border transition-all text-center h-32 focus:outline-none",
                                    isSelected
                                      ? "border-[#5D2A42] bg-white shadow-[0_4px_20px_rgba(93,42,66,0.06)] scale-[1.02]"
                                      : "border-[#5D2A42]/10 bg-white/60 hover:border-[#5D2A42]/30 hover:bg-white"
                                  )}
                                >
                                  <span className={cn("mb-1 p-2 rounded-xl border", isSelected ? "bg-[#5D2A42]/5 border-[#5D2A42]/10 text-[#5D2A42]" : "bg-transparent border-transparent text-[#5D2A42]/60")}>{preset.icon}</span>
                                  <div className="flex flex-col">
                                    <span className={cn("text-xs font-semibold tracking-wide", isSelected ? "text-[#5D2A42]" : "text-[#5D2A42]/80")}>
                                      {preset.name}
                                    </span>
                                    <span className="text-[10px] text-[#5D2A42]/50 font-medium leading-tight mt-0.5">
                                      {preset.description}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section 2: Date Selector */}
                        {recurrencePattern !== "none" && recurrencePattern !== "minutely" && (
                          <div className="p-6 border border-[#5D2A42]/10 rounded-3xl bg-[#5D2A42]/5 space-y-4">
                            <div className="flex flex-col gap-1">
                              <h4 className="text-lg font-bold text-[#5D2A42] flex items-center gap-2">
                                <Calendar className="w-5 h-5" /> {
                                  recurrencePattern === "yearly" ? "Select Month & Day" :
                                    recurrencePattern === "monthly" ? "Select Day of Month" :
                                      recurrencePattern === "weekly" ? "Select Day of Week" :
                                        "Select Date"
                                }
                              </h4>
                              <p className="text-sm text-[#5D2A42]/70 font-medium">
                                {
                                  recurrencePattern === "yearly" ? "Pick the recurring annual date (e.g. Birthday, Anniversary)." :
                                    recurrencePattern === "monthly" ? "Pick which day of the month the reminder should trigger." :
                                      recurrencePattern === "weekly" ? "Pick which day of the week the reminder should trigger." :
                                        "Select the start date."
                                }
                              </p>
                            </div>

                            <div className="flex justify-center w-full">
                              {recurrencePattern === "yearly" && (
                                <CalendarUI
                                  mode="single"
                                  selected={reminderYearlyDate || undefined}
                                  onSelect={(date) => onReminderYearlyDateChange(date || null)}
                                  className="rounded-2xl border border-[#5D2A42]/10 p-3 bg-white shadow-sm"
                                />
                              )}

                              {recurrencePattern === "monthly" && (
                                <div className="grid grid-cols-7 gap-2 max-w-xs p-3 border border-[#5D2A42]/10 rounded-2xl bg-white shadow-sm">
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                    const isSelected = reminderDayOfMonth === day;
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => onReminderDayOfMonthChange(day)}
                                        className={cn(
                                          "w-8 h-8 rounded-full font-bold transition-all text-xs flex items-center justify-center",
                                          isSelected
                                            ? "bg-[#5D2A42] text-white shadow-sm scale-105"
                                            : "text-[#5D2A42] hover:bg-[#5D2A42]/10 bg-white border border-[#5D2A42]/10"
                                        )}
                                      >
                                        {day}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {recurrencePattern === "weekly" && (
                                <div className="flex flex-wrap gap-2 justify-center max-w-sm p-3 border border-[#5D2A42]/10 rounded-2xl bg-white shadow-sm">
                                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                                    const isSelected = reminderDayOfWeek?.toLowerCase() === day.toLowerCase();
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => onReminderDayOfWeekChange(day)}
                                        className={cn(
                                          "px-3 py-1.5 rounded-xl font-bold transition-all text-xs border",
                                          isSelected
                                            ? "bg-[#5D2A42] border-[#5D2A42] text-white shadow-sm"
                                            : "bg-white border-[#5D2A42]/10 text-[#5D2A42] hover:bg-[#5D2A42]/10"
                                        )}
                                      >
                                        {day.slice(0, 3)}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Section 3: Scheduling Details */}
                        <div className="p-6 border border-[#5D2A42]/10 rounded-3xl bg-[#5D2A42]/5 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Recurrence Frequency */}
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                                Recurrence Frequency
                              </Label>
                              <Select
                                value={recurrencePattern}
                                onValueChange={(val: any) => onRecurrencePatternChange(val)}
                              >
                                <SelectTrigger className="h-12 border-[#5D2A42]/10 bg-white text-base font-semibold text-[#5D2A42] rounded-xl focus:ring-0 focus:border-[#5D2A42]/30 w-full">
                                  <SelectValue placeholder="No Recurrence" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#5D2A42]/10 shadow-sm text-[#5D2A42]">
                                  <SelectItem value="daily">Every Day</SelectItem>
                                  <SelectItem value="weekly">Every Week</SelectItem>
                                  <SelectItem value="monthly">Every Month</SelectItem>
                                  <SelectItem value="yearly">Every Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Reminder Time */}
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                                Reminder Time
                              </Label>
                              <Input
                                type="time"
                                value={reminderTime}
                                onChange={(e) => onReminderTimeChange(e.target.value)}
                                className="h-12 border-[#5D2A42]/10 bg-white rounded-xl text-[#5D2A42] font-semibold"
                              />

                            </div>
                          </div>

                          {/* Summary Sentence Card */}
                          <div className="p-5 bg-[#5D2A42]/5 border border-[#5D2A42]/10 text-[#5D2A42] rounded-[1.5rem] flex items-center gap-4">
                            <Clock className="w-6 h-6 opacity-60" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">Delivery Schedule Summary</p>
                              <p className="text-sm font-semibold mt-0.5">{getSummarySentence()}</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              )}

              {/* Step 1: Recipients */}
              {currentStep === 1 && (
                <div className="h-full flex flex-col gap-10 lg:pt-4">
                  <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-[#5D2A42] tracking-tighter mb-4">{t('create.recipientsHeading')}</h2>
                    <p className="text-[#666] text-lg font-medium">{t('create.recipientsSub')}</p>
                  </div>

                  <Tabs
                    value={recipientType}
                    onValueChange={(value) => onRecipientTypeChange(value as any)}
                    className="flex flex-col flex-1 gap-8"
                  >
                    <TabsList className="grid w-full h-auto grid-cols-1 md:grid-cols-2 gap-6 bg-transparent p-0 max-w-2xl mx-auto">
                      <TabsTrigger value="self" className="flex flex-col items-center justify-center h-auto min-h-[140px] p-6 rounded-[2rem] border border-[#E8E8E8] bg-white data-[state=active]:border-[#5D2A42] data-[state=active]:bg-[#5D2A42]/5 data-[state=active]:text-[#5D2A42] text-[#1A1A1A] transition-all hover:border-[#5D2A42]/30 group outline-none focus:ring-0">
                        <div className="w-14 h-14 rounded-full bg-[#FAFAFA] group-data-[state=active]:bg-white flex items-center justify-center mb-4 transition-colors border border-transparent group-data-[state=active]:border-[#5D2A42]/10">
                          <User className="w-6 h-6 text-[#1A1A1A]/30 group-data-[state=active]:text-[#5D2A42]" strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-bold">{t('create.recTypeSelf')}</span>
                      </TabsTrigger>
                      <TabsTrigger value="friends" className="flex flex-col items-center justify-center h-auto min-h-[140px] p-6 rounded-[2rem] border border-[#E8E8E8] bg-white data-[state=active]:border-[#5D2A42] data-[state=active]:bg-[#5D2A42]/5 data-[state=active]:text-[#5D2A42] text-[#1A1A1A] transition-all hover:border-[#5D2A42]/30 group outline-none focus:ring-0">
                        <div className="w-14 h-14 rounded-full bg-[#FAFAFA] group-data-[state=active]:bg-white flex items-center justify-center mb-4 transition-colors border border-transparent group-data-[state=active]:border-[#5D2A42]/10">
                          <Users className="w-6 h-6 text-[#1A1A1A]/30 group-data-[state=active]:text-[#5D2A42]" strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-bold">{t('create.recTypeFriends')}</span>
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-2 overflow-y-auto no-scrollbar pb-6">
                      <TabsContent value="self" className="mt-0 outline-none">
                        <div className="flex flex-col py-8 px-8 border border-[#E8E8E8] rounded-[2rem] bg-white">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#5D2A42]/5 border border-[#5D2A42]/10 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-[#5D2A42]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#5D2A42]">{t('create.giftTitleSelf')}</h3>
                          </div>
                          <p className="text-[#666] font-medium text-base leading-relaxed">
                            {t('create.giftDescSelf')}
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="friends" className="mt-0">
                        {loadingFriends ? (
                          <div className="flex items-center justify-center py-16">
                            <span className="text-[#FB6376] font-bold">{t('create.loadingFriends')}</span>
                          </div>
                        ) : friends.length === 0 ? (
                          <div className="flex flex-col py-10 px-8 border border-[#E8E8E8] rounded-[2rem] bg-[#FAFAFA]">
                            <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">{t('create.noFriendsTitle')}</h3>
                            <p className="text-[#666] font-medium text-base leading-relaxed">
                              {t('create.noFriendsDesc')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2">
                              <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                                {t('create.selectConnectionsLabel')} <Badge variant="secondary" className="ml-2 bg-[#5D2A42]/10 text-[#5D2A42] hover:bg-[#5D2A42]/20">{selectedFriends.length} {t('create.selectedCount')}</Badge>
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllFriends}
                                className="text-[#5D2A42] hover:text-[#5D2A42] hover:bg-[#5D2A42]/5 text-xs font-bold h-8 uppercase tracking-wider"
                              >
                                {selectedFriends.length === friends.length ? t('create.deselectAll') : t('create.selectAll')}
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {friends.map((friend) => {
                                const isSelected = selectedFriends.includes(friend.id);
                                const hasKey = friend.hasPublicKey !== false;
                                return (
                                  <div
                                    key={friend.id}
                                    className={cn(
                                      "flex items-center p-4 rounded-[1.5rem] transition-all duration-300 border",
                                      !hasKey
                                        ? "opacity-50 cursor-not-allowed bg-gray-50 border-[#E8E8E8]"
                                        : isSelected
                                          ? "border-[#5D2A42]/30 bg-[#5D2A42]/5 cursor-pointer"
                                          : "bg-white hover:border-[#5D2A42]/20 hover:bg-[#FAFAFA] cursor-pointer border-[#E8E8E8]"
                                    )}
                                    onClick={() => hasKey && toggleFriendSelection(friend.id)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={!hasKey}
                                      onCheckedChange={() => hasKey && toggleFriendSelection(friend.id)}
                                      className="mr-4 w-5 h-5 border-[#E8E8E8] data-[state=checked]:bg-[#5D2A42] data-[state=checked]:border-[#5D2A42] data-[state=checked]:text-white transition-colors"
                                    />
                                    <Avatar className="w-12 h-12 border border-[#E8E8E8]">
                                      <AvatarImage src={friend.photoURL} alt={friend.name} />
                                      <AvatarFallback className="bg-[#5D2A42]/10 text-[#5D2A42] text-sm font-bold">
                                        {getInitials(friend.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 flex-1 min-w-0">
                                      <p className="text-base font-bold text-[#1A1A1A] truncate">{friend.name}</p>
                                      <p className={cn("text-sm font-medium truncate", !hasKey ? "text-[#FB6376]" : "text-[#999]")}>
                                        {!hasKey ? t('create.friendsErrorV2') : friend.email}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </TabsContent>


                    </div>
                  </Tabs>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <div className="h-full flex flex-col gap-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#FFF9EC] p-6 rounded-3xl border border-[#FFDCCC]">
                    <div>
                      <h2 className="text-3xl font-black text-[#5D2A42] tracking-tighter mb-2">{t('create.reviewHeading')}</h2>
                      <p className="text-[#666] text-base font-medium">{t('create.reviewSub')}</p>
                    </div>
                    <Button
                      type="button"
                      variant={showPreview ? "default" : "outline"}
                      onClick={() => setShowPreview(!showPreview)}
                      className={cn(
                        "rounded-2xl h-12 px-5 font-bold uppercase tracking-wider text-xs transition-all flex-shrink-0",
                        showPreview
                          ? "bg-[#FB6376] hover:bg-[#e8556a] text-white"
                          : "border-[#EAEAEA] text-[#5D2A42] hover:bg-[#FFF9EC] hover:border-[#FFDCCC]"
                      )}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showPreview ? t('create.hidePreview') : t('create.previewLetter')}
                    </Button>
                  </div>

                  <AnimatePresence mode="wait">
                    {!showPreview ? (
                      <motion.div
                        key="summary"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white border-2 border-[#F5F5F5] rounded-[2rem] p-8 md:p-10 flex-1 flex flex-col justify-between shadow-lg shadow-black/[0.03]"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-[#E8E8E8]">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">{t('create.summaryTitle')}</span>
                            <span className="text-xl font-bold text-[#1A1A1A]">{title}</span>
                          </div>
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">{t('create.summaryMsgLen')}</span>
                            <span className="text-xl font-bold text-[#1A1A1A]">{getPlainTextLength(content)} {t('create.chars')}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-[#E8E8E8]">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">{t('create.summaryTrigger')}</span>
                            <span className="text-xl font-bold text-[#1A1A1A] capitalize">
                              {triggerType === "time" ? t('create.triggerOptionTime') : t('create.triggerOptionEvent')}
                            </span>
                          </div>
                          {triggerType === "time" && deliveryDate && (
                            <div>
                              <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">{t('create.summaryUnlockDate')}</span>
                              <span className="text-xl font-bold text-[#1A1A1A]">
                                {deliveryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {deliveryTime}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-[#E8E8E8]">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">{t('create.summaryRecipients')}</span>
                            <span className="text-xl font-bold text-[#1A1A1A] capitalize">
                              {recipientType === "self" ? t('create.recTypeSelfLabel') : recipientType === "friends" ? `${selectedFriends.length} ${t('create.stepRecipientsTitle')}` : t('create.recTypePublicLabel')}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">{t('create.summaryMemories')}</span>
                            <span className="text-xl font-bold text-[#1A1A1A]">
                              {attachments.length} {t('create.filesCount')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Auto Reminder Schedule</span>
                            <span className="text-xl font-bold text-[#1A1A1A] capitalize">
                              {reminderPreset === "custom"
                                ? `${recurrencePattern} Schedule`
                                : `${reminderPreset} Preset (${recurrencePattern})`}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Next Occurrence</span>
                            <span className="text-xl font-bold text-[#1A1A1A]">
                              {getSummarySentence()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="flex-1"
                      >
                        {/* Letter Preview on Canvas */}
                        <div className="w-full relative rounded-2xl overflow-hidden shadow-xl bg-[#EBE4D5]">
                          <div
                            className="w-full relative min-h-[500px] p-8 md:p-12"
                            style={{
                              backgroundImage: "url('/canvas-background-BYlUkw-J.png')",
                              backgroundSize: "cover",
                              backgroundRepeat: "repeat-y",
                              backgroundPosition: "top center",
                            }}
                          >
                            <div className="max-w-xl mx-auto space-y-6 relative z-10 font-serif text-[#5D2A42]">
                              {/* Header */}
                              <div className="text-center mb-8 pt-2">
                                <span className="inline-flex items-center border border-[#5D2A42]/30 text-[#5D2A42] bg-[#EBE4D5]/60 mb-4 px-3 py-1 rounded-full uppercase text-[10px] tracking-widest font-bold backdrop-blur-sm shadow-sm">
                                  <FileText className="w-3 h-3 mr-1.5 inline" /> {t('create.letterPreviewBadge')}
                                </span>
                                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-4 text-[#5D2A42]">
                                  {title || t('create.letterPreviewUntitled')}
                                </h1>
                                <div className="flex items-center justify-center gap-4 text-xs text-[#5D2A42]/70">
                                  <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                                </div>
                              </div>

                              <hr className="border-[#5D2A42]/10 my-6" />

                              {/* Meta */}
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] text-[#5D2A42]/50 block mb-0.5">{t('create.letterPreviewDateWritten')}</span>
                                  <span className="font-semibold text-sm">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-[#5D2A42]/50 block mb-0.5">{t('create.letterPreviewToLabel')}</span>
                                  <span className="font-semibold text-sm">
                                    {recipientType === "self"
                                      ? t('create.letterPreviewMyFutureSelf')
                                      : recipientType === "friends"
                                        ? selectedFriends.map(id => friends.find(f => f.id === id)?.name || "Friend").join(", ")
                                        : t('create.letterPreviewTheWorld')}
                                  </span>
                                </div>
                              </div>

                              {/* Body */}
                              <div className="pt-6 pb-4 space-y-4 text-base md:text-lg leading-[2rem] tracking-wide relative">
                                <p>{recipientType === "self"
                                  ? t('create.letterPreviewDearSelf')
                                  : recipientType === "friends"
                                    ? selectedFriends.map(id => friends.find(f => f.id === id)?.name || "Friend").join(", ") + ","
                                    : t('create.letterPreviewDearWorld')}</p>
                                <div className="min-h-[400px] relative w-full mt-4">
                                  {(() => {
                                    if (!content) return <p className="p-4"><em>{t('create.letterPreviewPlaceholder')}</em></p>;
                                    try {
                                      // Try to extract JSON array if it's accidentally wrapped in HTML
                                      const match = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
                                      const jsonString = match ? match[0] : content;
                                      const sanitized = jsonString.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                                      let blocks = JSON.parse(sanitized);
                                      while (typeof blocks === "string") {
                                        blocks = JSON.parse(blocks.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
                                      }
                                      if (Array.isArray(blocks)) {
                                        return blocks.map(block => (
                                          <div
                                            key={block.id}
                                            className="absolute"
                                            style={{
                                              top: `${block.y}%`,
                                              left: `${block.x}%`,
                                              fontFamily: block.fontFamily,
                                              fontSize: `${block.fontSize}px`,
                                              color: block.color,
                                              fontWeight: block.fontWeight,
                                              textAlign: block.textAlign,
                                              whiteSpace: "pre-wrap",
                                              lineHeight: "normal",
                                            }}
                                          >
                                            {block.text}
                                          </div>
                                        ));
                                      }
                                    } catch (e) {
                                      // Fallback for HTML content
                                      return (
                                        <div
                                          className="p-4 prose prose-base max-w-none text-[#5D2A42] prose-p:my-2 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6 prose-li:my-0.5 prose-img:rounded-xl prose-img:max-w-full prose-img:my-3 prose-strong:text-inherit prose-em:text-inherit"
                                          dangerouslySetInnerHTML={{
                                            __html: (() => {
                                              const txt = document.createElement("textarea");
                                              txt.innerHTML = content;
                                              return txt.value;
                                            })()
                                          }}
                                        />
                                      );
                                    }
                                  })()}
                                </div>
                                <p className="mt-6 text-lg">Sincerely,</p>
                              </div>

                              {/* Signature area placeholder */}
                              <div className="pt-4">
                                <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/60 border-dashed p-4 min-h-[80px] max-w-xs flex items-center justify-center shadow-sm">
                                  <span className="font-sans text-lg text-[#5D2A42]/60 uppercase tracking-widest text-center px-4">
                                    {t('create.signaturePlaceholder')}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-4">
                                <p className="text-lg text-[#5D2A42]">{username}</p>
                              </div>

                              {/* Attached Media in Preview */}
                              {attachments.length > 0 && (
                                <div className="py-6 mt-4 border-t border-[#5D2A42]/10">

                                  <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                                    {attachments.map((attachment) => {
                                      const url = URL.createObjectURL(attachment.file);
                                      return (
                                        <div key={attachment.id} className="break-inside-avoid rounded-2xl overflow-hidden border border-[#5D2A42]/20 shadow-sm bg-white/50 backdrop-blur-sm">
                                          {attachment.type === 'image' && (
                                            <img src={url} alt={attachment.altText || attachment.name} className="w-full h-auto object-cover" />
                                          )}
                                          {attachment.type === 'video' && (
                                            <div className="relative w-full bg-black group cursor-pointer" onClick={(e) => {
                                              const video = e.currentTarget.querySelector('video');
                                              const playIcon = e.currentTarget.querySelector('.play-icon');
                                              if (video) {
                                                if (video.paused) { video.play(); playIcon?.classList.add('hidden'); }
                                                else { video.pause(); playIcon?.classList.remove('hidden'); }
                                              }
                                            }}>
                                              <video src={url} className="w-full h-auto object-cover max-h-[400px]" onEnded={(e) => {
                                                const playIcon = e.currentTarget.parentElement?.querySelector('.play-icon');
                                                playIcon?.classList.remove('hidden');
                                              }} />
                                              <div className="play-icon absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all">
                                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                                                  <Play className="w-5 h-5 text-white ml-1 fill-white" />
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          {attachment.type === 'audio' && (
                                            <AudioVisualizer url={url} />
                                          )}
                                          {attachment.altText && attachment.altText.trim() !== '' && (
                                            <div className="p-3 bg-white/80 border-t border-[#5D2A42]/10">
                                              <span className="font-semibold text-xs text-[#5D2A42] block">
                                                {attachment.altText}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 flex justify-between items-center z-10">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrev}
              disabled={isSubmitting}
              className="h-14 px-8 rounded-2xl border-2 border-[#E8E8E8] bg-white text-[#1A1A1A] font-bold hover:bg-[#F8F8F8] hover:border-[#CCC] transition-all uppercase tracking-wider text-sm shadow-sm hover:shadow-md"
            >
              {currentStep === 0 ? t('common.cancel') : t('common.goBack')}
            </Button>

            <Button
              type="button"
              onClick={currentStep === translatedSteps.length - 1 ? onSubmit : handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="h-14 px-10 rounded-2xl bg-[#FB6376] hover:bg-[#e8556a] text-white font-bold transition-all uppercase tracking-wider text-sm shadow-[0_8px_20px_-8px_rgba(251,99,118,0.5)] hover:shadow-[0_8px_25px_-5px_rgba(251,99,118,0.6)] hover:-translate-y-0.5"
            >
              {isSubmitting ? (
                t('common.processing')
              ) : currentStep === translatedSteps.length - 1 ? (
                t('create.sealCapsule')
              ) : (
                t('common.nextStep')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
