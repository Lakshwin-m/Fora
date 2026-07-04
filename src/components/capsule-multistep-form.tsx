"use client";

import { toast } from "sonner";
import { useState, useRef } from "react";
import { RichTextEditor, getPlainTextLength } from "@/components/ui/rich-text-editor";
import { motion, AnimatePresence } from "framer-motion";
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
import { format } from "date-fns";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

const steps = [
  { id: "basic", title: "Message", description: "Write your capsule", icon: MessageSquare },
  { id: "trigger", title: "Delivery", description: "When to unlock", icon: Clock },
  { id: "recipients", title: "Recipients", description: "Who receives it", icon: Users },
  { id: "attachments", title: "Memories", description: "Add photos & videos", icon: Image },
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

  const handleNext = () => {
    if (currentStep === 1) {
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
      label: "Selected Date",
      description: "Unlock on a specific date and time",
    },
    {
      id: "event",
      label: "Auto Reminders",
      description: "Set automatic reminders to unlock",
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
          case 1:  return "st";
          case 2:  return "nd";
          case 3:  return "rd";
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
        return title.trim() !== "" && getPlainTextLength(content) > 0;
      case 1:
        if (triggerType === "time") {
          return deliveryDate !== undefined && deliveryTime !== "";
        }
        return true;
      case 2:
        if (recipientType === "friends") {
          return selectedFriends.length > 0;
        }
        if (recipientType === "public") {
          return capsuleCategory.trim() !== "";
        }
        return true;
      case 3:
        return true; // Attachments are optional
      case 4:
        return true; // Review always valid
      default:
        return false;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-16">
      {/* Modern Stepper Indicator */}
      <div className="mb-12">
        <Stepper
          value={currentStep + 1}
          onValueChange={(val) => {
            if (val - 1 < currentStep) {
              // Allow going back to completed steps
              const diff = currentStep - (val - 1);
              for (let i = 0; i < diff; i++) onPrevStep();
            }
          }}
        >
          <StepperNav className="gap-3.5">
            {steps.map((step, index) => (
              <StepperItem
                key={index}
                step={index + 1}
                className="relative flex-1 items-start"
              >
                <StepperTrigger
                  className="flex flex-col items-start justify-center gap-3 grow w-full"
                  disabled={index > currentStep}
                >
                  <StepperIndicator
                    className={cn(
                      "rounded-full h-[3px] w-full transition-all duration-500 ease-out",
                      index < currentStep
                        ? "bg-[#5D2A42]" // Completed: Premium Plum
                        : index === currentStep
                        ? "bg-[#FB6376]" // Active: Forá Coral (no glow)
                        : "bg-[#E8E8E8]" // Upcoming: Clean light gray
                    )}
                  />
                  <div className="flex flex-col items-start gap-0.5">
                    <StepperTitle
                      className={cn(
                        "text-start font-bold text-sm tracking-wide transition-colors duration-300",
                        index === currentStep
                          ? "text-[#5D2A42]" // Active text
                          : index < currentStep
                          ? "text-[#1A1A1A]" // Completed text
                          : "text-[#999]"    // Upcoming text
                      )}
                    >
                      <span className="opacity-40 font-semibold mr-1.5">{index + 1}.</span>
                      {step.title}
                    </StepperTitle>
                    <span
                      className={cn(
                        "text-xs font-medium hidden md:block leading-tight transition-colors duration-300",
                        index === currentStep
                          ? "text-[#FB6376]" // Active description accent
                          : index < currentStep
                          ? "text-[#999]"
                          : "text-[#CCC]"
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

      {/* Form Card */}
      <Card className="border border-[#EAEAEA] shadow-sm bg-white rounded-[2rem] relative min-h-[500px]">
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
              {/* Step 0: Basic Information */}
              {currentStep === 0 && (
                <div className="p-10 md:p-14 h-full flex flex-col gap-10">
                  <div>
                    <h2 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">What's your message?</h2>
                    <p className="text-[#666] text-base font-medium">Write the contents of your time capsule.</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-8">
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="title" className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                        Capsule Title
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g. Letter to my 30-year-old self"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="h-12 border-[#E8E8E8] bg-white text-[#1A1A1A] placeholder:text-[#999] text-base rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#FB6376] transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex justify-between items-end">
                        <Label htmlFor="content" className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                          The Message
                        </Label>
                        <span className="text-xs font-bold text-[#FB6376]">{getPlainTextLength(content)} chars</span>
                      </div>
                      <RichTextEditor
                        value={content}
                        onChange={onContentChange}
                        placeholder="Write your message to the future..."
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Trigger Configuration */}
              {currentStep === 1 && (
                <div className="p-10 md:p-14 h-full flex flex-col gap-10">
                  <div>
                    <h2 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">When should it open?</h2>
                    <p className="text-[#666] text-base font-medium">Choose the exact moment this capsule becomes unlocked.</p>
                  </div>
                  
                  <Tabs
                    value={triggerType}
                    onValueChange={(value) => onTriggerTypeChange(value as any)}
                    className="flex flex-col flex-1 gap-6"
                  >
                    <TabsList className="grid w-full h-auto grid-cols-2 bg-[#FFF9EC] p-2 rounded-2xl border border-[#FFDCCC]">
                      {triggerOptions.map((option) => (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          className="text-base font-bold rounded-xl data-[state=active]:bg-[#FB6376] data-[state=active]:text-white data-[state=active]:shadow-none text-[#5D2A42] transition-all h-12"
                        >
                          {option.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <div className="flex-1 mt-2 overflow-y-auto no-scrollbar pb-6">
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
                              Occasion Preset
                            </Label>
                            <div className="grid grid-cols-5 gap-4 w-full px-2">
                              {[
                                { id: "birthday", name: "Birthday", emoji: "🎂", description: "Yearly at 9:00 AM" },
                                { id: "anniversary", name: "Anniversary", emoji: "💍", description: "Yearly at 9:00 AM" },
                                { id: "christmas", name: "Christmas", emoji: "🎄", description: "Every Dec 25 at 9:00 AM" },
                                { id: "newyear", name: "New Year", emoji: "🎆", description: "Every Jan 1 at 12:00 AM" },
                                { id: "custom", name: "Custom", emoji: "📅", description: "Define from scratch" },
                              ].map((preset) => {
                                const isSelected = reminderPreset === preset.id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => onReminderPresetChange(preset.id)}
                                    className={cn(
                                      "w-full h-32 flex flex-col items-center justify-between p-4 rounded-3xl border transition-all text-center focus:outline-none",
                                      isSelected
                                        ? "border-[#FB6376] bg-[#FFF9EC] shadow-sm scale-[1.02]"
                                        : "border-[#E8E8E8] bg-white hover:border-[#FB6376] hover:bg-[#FFF9EC]/40"
                                    )}
                                  >
                                    <span className="text-2xl mb-1">{preset.emoji}</span>
                                    <div className="flex flex-col">
                                      <span className={cn("text-xs font-extrabold", isSelected ? "text-[#5D2A42]" : "text-[#1A1A1A]")}>
                                        {preset.name}
                                      </span>
                                      <span className="text-[10px] text-[#999] font-medium leading-tight mt-0.5">
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
                            <div className="p-6 border border-[#FFDCCC] rounded-3xl bg-[#FFF9EC] space-y-4">
                              <div className="flex flex-col gap-1">
                                <h4 className="text-lg font-bold text-[#5D2A42] flex items-center gap-2">
                                  <span>📅</span> {
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
                                    className="rounded-2xl border border-[#EAEAEA] p-3 bg-white shadow-sm"
                                  />
                                )}
                                
                                {recurrencePattern === "monthly" && (
                                  <div className="grid grid-cols-7 gap-2 max-w-xs p-3 border border-[#EAEAEA] rounded-2xl bg-white shadow-sm">
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
                                              ? "bg-[#FB6376] text-white shadow-sm scale-105"
                                              : "text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#FB6376] bg-white border border-[#EAEAEA]"
                                          )}
                                        >
                                          {day}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {recurrencePattern === "weekly" && (
                                  <div className="flex flex-wrap gap-2 justify-center max-w-sm p-3 border border-[#EAEAEA] rounded-2xl bg-white shadow-sm">
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
                                              ? "bg-[#FB6376] border-[#FB6376] text-white shadow-sm"
                                              : "bg-white border-[#EAEAEA] text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#FB6376]"
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
                          <div className="p-6 border border-[#FFDCCC] rounded-3xl bg-[#FFF9EC] space-y-6">
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
                                  <SelectTrigger className="h-12 border-[#E8E8E8] bg-white text-base font-semibold text-[#1A1A1A] rounded-xl focus:ring-0 focus:border-[#FB6376] w-full">
                                    <SelectValue placeholder="No Recurrence" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-[#E8E8E8] shadow-sm">
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
                                  className="h-12 border-[#E8E8E8] bg-white rounded-xl text-[#1A1A1A] font-semibold"
                                />
                              </div>
                            </div>

                            {/* Summary Sentence Card */}
                            <div className="p-5 bg-[#5D2A42] text-[#FFF9EC] rounded-[1.5rem] flex items-center gap-4">
                              <span className="text-2xl">✨</span>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider font-extrabold opacity-60">Delivery Schedule Summary</p>
                                <p className="text-sm font-bold mt-0.5">{getSummarySentence()}</p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                    </div>
                  </Tabs>
                </div>
              )}

              {/* Step 2: Recipients */}
              {currentStep === 2 && (
                <div className="p-10 md:p-14 h-full flex flex-col gap-10">
                  <div>
                    <h2 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">Who is this for?</h2>
                    <p className="text-[#666] text-base font-medium">Select the recipients who will unlock this capsule.</p>
                  </div>
                  
                  <Tabs
                    value={recipientType}
                    onValueChange={(value) => onRecipientTypeChange(value as any)}
                    className="flex flex-col flex-1 gap-6"
                  >
                    <TabsList className="grid w-full h-auto grid-cols-3 bg-[#FFF9EC] p-2 rounded-2xl border border-[#FFDCCC]">
                      <TabsTrigger value="self" className="text-base font-bold rounded-xl data-[state=active]:bg-[#FB6376] data-[state=active]:text-white data-[state=active]:shadow-none text-[#5D2A42] transition-all h-12">
                        Just Me
                      </TabsTrigger>
                      <TabsTrigger value="friends" className="text-base font-bold rounded-xl data-[state=active]:bg-[#FB6376] data-[state=active]:text-white data-[state=active]:shadow-none text-[#5D2A42] transition-all h-12">
                        Connections
                      </TabsTrigger>
                      <TabsTrigger value="public" className="text-base font-bold rounded-xl data-[state=active]:bg-[#FB6376] data-[state=active]:text-white data-[state=active]:shadow-none text-[#5D2A42] transition-all h-12">
                        Public
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-2 overflow-y-auto no-scrollbar pb-6">
                          <TabsContent value="self" className="mt-0 outline-none">
                            <div className="flex flex-col py-10 px-8 border border-[#E8E8E8] rounded-3xl bg-[#FFF9EC]">
                              <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">A gift to your future self</h3>
                              <p className="text-[#1A1A1A] font-medium text-base leading-relaxed">
                                This capsule will be stored privately in your vault and only you will be able to unlock it when the time comes.
                              </p>
                            </div>
                          </TabsContent>

                          <TabsContent value="friends" className="mt-0">
                            {loadingFriends ? (
                              <div className="flex items-center justify-center py-16">
                                <span className="text-[#FB6376] font-bold">Loading...</span>
                              </div>
                            ) : friends.length === 0 ? (
                              <div className="flex flex-col py-10 px-8 border border-[#E8E8E8] rounded-3xl bg-[#FFF9EC]">
                                <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">No Connections Yet</h3>
                                <p className="text-[#1A1A1A] font-medium text-base leading-relaxed">
                                  You need to add connections first before you can send them a capsule.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2">
                                  <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                                    Select Connections <Badge variant="secondary" className="ml-2 bg-[#FB6376] text-white hover:bg-[#e8556a]">{selectedFriends.length} selected</Badge>
                                  </Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllFriends}
                                    className="text-[#FB6376] hover:text-[#e8556a] hover:bg-[#FFF9EC] text-xs font-bold h-8 uppercase tracking-wider"
                                  >
                                    {selectedFriends.length === friends.length ? "Deselect All" : "Select All"}
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
                                          "flex items-center p-4 rounded-2xl transition-all duration-200 border",
                                          !hasKey 
                                            ? "opacity-60 cursor-not-allowed bg-gray-50 border-[#E8E8E8]" 
                                            : isSelected 
                                              ? "border-[#FB6376] bg-[#FFF9EC] cursor-pointer" 
                                              : "border-[#E8E8E8] bg-white hover:border-[#FB6376] hover:bg-[#FFF9EC] cursor-pointer"
                                        )}
                                        onClick={() => hasKey && toggleFriendSelection(friend.id)}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          disabled={!hasKey}
                                          onCheckedChange={() => hasKey && toggleFriendSelection(friend.id)}
                                          className="mr-4 w-5 h-5 data-[state=checked]:bg-[#FB6376] data-[state=checked]:border-[#FB6376]"
                                        />
                                        <Avatar className="w-12 h-12 border border-[#E8E8E8]">
                                          <AvatarImage src={friend.photoURL} alt={friend.name} />
                                          <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-sm font-bold">
                                            {getInitials(friend.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="ml-4 flex-1 min-w-0">
                                          <p className="text-base font-bold text-[#1A1A1A] truncate">{friend.name}</p>
                                          <p className={cn("text-sm font-medium truncate", !hasKey ? "text-[#FB6376]" : "text-[#999]")}>
                                            {!hasKey ? "Needs to log in to V2 encryption" : friend.email}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="public" className="mt-0">
                            <div className="flex flex-col py-10 px-8 border border-[#E8E8E8] rounded-3xl bg-[#FFF9EC] mb-8">
                              <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">Share with the World</h3>
                              <p className="text-[#1A1A1A] font-medium text-base leading-relaxed">
                                Public capsules are completely anonymous initially but visible to the entire community on the timeline.
                              </p>
                            </div>

                            <div className="flex flex-col gap-3">
                              <Label htmlFor="category" className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                                Community Category
                              </Label>
                              <Select value={capsuleCategory} onValueChange={onCapsuleCategoryChange}>
                                <SelectTrigger id="category" className="h-14 border-[#E8E8E8] bg-white text-base font-medium rounded-2xl focus:ring-0 focus:border-[#5D2A42]">
                                  <SelectValue placeholder="Select a category..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-[#E8E8E8] shadow-sm">
                                  <SelectItem value="memories" className="rounded-xl h-12 font-medium">Memories</SelectItem>
                                  <SelectItem value="reflections" className="rounded-xl h-12 font-medium">Reflections</SelectItem>
                                  <SelectItem value="moments" className="rounded-xl h-12 font-medium">Moments</SelectItem>
                                  <SelectItem value="stories" className="rounded-xl h-12 font-medium">Stories</SelectItem>
                                  <SelectItem value="milestones" className="rounded-xl h-12 font-medium">Milestones</SelectItem>
                                  <SelectItem value="wisdom" className="rounded-xl h-12 font-medium">Wisdom</SelectItem>
                                  <SelectItem value="other" className="rounded-xl h-12 font-medium">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TabsContent>
                    </div>
                  </Tabs>
                </div>
              )}

              {/* Step 3: Attachments */}
              {currentStep === 3 && (
                <div className="p-10 md:p-14 h-full flex flex-col gap-10">
                  <div>
                    <h2 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">Curate Your Memories</h2>
                    <p className="text-[#666] text-lg font-medium">Upload the moments that make this capsule special.</p>
                  </div>
                  
                  {attachments.length === 0 ? (
                    /* Premium Bento Box Empty State */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                      <div 
                        onClick={() => imageInputRef.current?.click()}
                        className="md:row-span-2 bg-[#F8F8F8] hover:bg-[#F0F0F0] border border-[#E8E8E8] rounded-[32px] p-8 flex flex-col justify-between cursor-pointer transition-all group"
                      >
                         <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-[#E8E8E8] group-hover:scale-110 transition-transform">
                           <span className="font-bold text-[#1A1A1A] uppercase text-xs tracking-widest">IMG</span>
                         </div>
                         <div>
                           <h3 className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight mb-1">Photos</h3>
                           <p className="text-[#666] font-medium">Add high-quality images</p>
                         </div>
                      </div>
                      <div 
                        onClick={() => videoInputRef.current?.click()}
                        className="bg-[#FFF9EC] hover:bg-[#FDEED2] border border-[#FBE0B5] rounded-[32px] p-8 flex flex-col justify-between cursor-pointer transition-all group"
                      >
                         <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#FBE0B5] group-hover:scale-110 transition-transform">
                           <span className="font-bold text-[#5D2A42] uppercase text-[10px] tracking-widest">MP4</span>
                         </div>
                         <h3 className="text-2xl font-extrabold text-[#5D2A42] tracking-tight">Videos</h3>
                      </div>
                      <div 
                        onClick={() => audioInputRef.current?.click()}
                        className="bg-[#1A1A1A] hover:bg-[#333333] border border-[#1A1A1A] rounded-[32px] p-8 flex flex-col justify-between cursor-pointer transition-all group"
                      >
                         <div className="w-12 h-12 rounded-full bg-[#333] flex items-center justify-center group-hover:scale-110 transition-transform">
                           <span className="font-bold text-white uppercase text-[10px] tracking-widest">WAV</span>
                         </div>
                         <h3 className="text-2xl font-extrabold text-white tracking-tight">Audio Notes</h3>
                      </div>
                    </div>
                  ) : (
                    /* Populated Gallery State */
                    <div className="flex flex-col gap-8">
                      {/* Add More Toolbar */}
                      <div className="flex items-center gap-2 p-2 bg-[#F8F8F8] border border-[#E8E8E8] rounded-full w-max mx-auto md:mx-0">
                        <button 
                          onClick={() => imageInputRef.current?.click()}
                          className="px-6 py-3 bg-white rounded-full font-bold text-sm text-[#1A1A1A] shadow-sm hover:shadow-md transition-all border border-[#E8E8E8]"
                        >
                          + Photo
                        </button>
                        <button 
                          onClick={() => videoInputRef.current?.click()}
                          className="px-6 py-3 bg-[#FFF9EC] rounded-full font-bold text-sm text-[#5D2A42] shadow-sm hover:shadow-md transition-all border border-[#FBE0B5]"
                        >
                          + Video
                        </button>
                        <button 
                          onClick={() => audioInputRef.current?.click()}
                          className="px-6 py-3 bg-[#1A1A1A] rounded-full font-bold text-sm text-white shadow-sm hover:shadow-md transition-all"
                        >
                          + Audio
                        </button>
                      </div>

                      {/* Masonry-style Grid */}
                      <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
                        {attachments.map((attachment) => {
                          const url = URL.createObjectURL(attachment.file);
                          return (
                            <div key={attachment.id} className="break-inside-avoid relative group rounded-3xl overflow-hidden border border-[#E8E8E8] bg-white shadow-sm hover:shadow-xl transition-all duration-300">
                              {/* Hover Overlay & Delete Button */}
                              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
                              <button
                                type="button"
                                onClick={() => onRemoveAttachment(attachment.id)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full text-[#1A1A1A] font-bold text-lg opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:bg-[#FB6376] hover:text-white transition-all shadow-sm"
                              >
                                ✕
                              </button>

                              {/* Media Content */}
                              {attachment.type === 'image' && (
                                <img src={url} alt={attachment.name} className="w-full h-auto object-cover min-h-[150px]" />
                              )}
                              
                              {attachment.type === 'video' && (
                                <div className="w-full bg-black relative">
                                  <video src={url} controls className="w-full h-auto object-cover max-h-[400px]" />
                                </div>
                              )}
                              
                              {attachment.type === 'audio' && (
                                <div className="w-full aspect-square bg-[#F8F8F8] flex flex-col items-center justify-center p-6 border-b border-[#E8E8E8]">
                                  <div className="w-16 h-16 rounded-full bg-white border border-[#E8E8E8] shadow-sm flex items-center justify-center mb-6">
                                    <span className="font-extrabold text-[#1A1A1A] tracking-widest">AUDIO</span>
                                  </div>
                                  <audio src={url} controls className="w-full" />
                                </div>
                              )}

                              {/* Meta Bar */}
                              <div className="p-4 bg-white flex flex-col gap-2 border-t border-[#E8E8E8]/50">
                                <input
                                  type="text"
                                  placeholder="Add an optional caption (alt-text)"
                                  className="w-full px-3 py-2 text-sm bg-[#F8F8F8] border border-[#E8E8E8] rounded-md focus:outline-none focus:border-[#FB6376] focus:bg-white transition-all text-[#1A1A1A]"
                                  value={attachment.altText || ''}
                                  onChange={(e) => {
                                    const newAttachments = [...attachments];
                                    const index = newAttachments.findIndex(a => a.id === attachment.id);
                                    if (index !== -1) {
                                      newAttachments[index] = { ...newAttachments[index], altText: e.target.value };
                                      onAttachmentsChange(newAttachments);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hidden inputs */}
                  <input type="file" ref={imageInputRef} onChange={(e) => onFileSelect("image", e)} accept="image/*" multiple className="hidden" />
                  <input type="file" ref={videoInputRef} onChange={(e) => onFileSelect("video", e)} accept="video/*" multiple className="hidden" />
                  <input type="file" ref={audioInputRef} onChange={(e) => onFileSelect("audio", e)} accept="audio/*" multiple className="hidden" />
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div className="p-10 md:p-14 h-full flex flex-col gap-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">Final Review</h2>
                      <p className="text-[#666] text-base font-medium">Ensure everything is exactly how you want it.</p>
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
                      {showPreview ? "Hide Preview" : "Preview Letter"}
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
                        className="bg-[#FFF9EC] border border-[#FFDCCC] rounded-3xl p-8 flex-1 flex flex-col justify-between shadow-sm"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-[#E8E8E8]">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Title</span>
                            <span className="text-xl font-bold text-[#1A1A1A]">{title}</span>
                          </div>
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Message Length</span>
                            <span className="text-xl font-bold text-[#1A1A1A]">{getPlainTextLength(content)} chars</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-[#E8E8E8]">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Trigger Condition</span>
                            <span className="text-xl font-bold text-[#1A1A1A] capitalize">
                               {triggerType}
                            </span>
                          </div>
                          {triggerType === "time" && deliveryDate && (
                            <div>
                              <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Unlock Date</span>
                              <span className="text-xl font-bold text-[#1A1A1A]">
                                {deliveryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {deliveryTime}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-[#E8E8E8]">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Recipients</span>
                            <span className="text-xl font-bold text-[#1A1A1A] capitalize">
                              {recipientType === "self" ? "Just Myself" : recipientType === "friends" ? `${selectedFriends.length} Connection(s)` : "Public Community"}
                            </span>
                          </div>
                          <div>
                             <span className="text-xs uppercase tracking-wider font-bold text-[#5D2A42] block mb-2">Memories Attached</span>
                             <span className="text-xl font-bold text-[#1A1A1A]">
                                {attachments.length} file(s)
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
                                  <FileText className="w-3 h-3 mr-1.5 inline" /> LETTER PREVIEW
                                </span>
                                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-4 text-[#5D2A42]">
                                  {title || "Untitled Capsule"}
                                </h1>
                                <div className="flex items-center justify-center gap-4 text-xs text-[#5D2A42]/70">
                                  <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                                </div>
                              </div>

                              <hr className="border-[#5D2A42]/10 my-6" />

                              {/* Meta */}
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] text-[#5D2A42]/50 block mb-0.5">Date Written:</span>
                                  <span className="font-semibold text-sm">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-[#5D2A42]/50 block mb-0.5">To:</span>
                                  <span className="font-semibold text-sm">
                                    {recipientType === "self" 
                                      ? "My Future Self" 
                                      : recipientType === "friends" 
                                        ? selectedFriends.map(id => friends.find(f => f.id === id)?.name || "Friend").join(", ")
                                        : "The World"}
                                  </span>
                                </div>
                              </div>

                              {/* Body */}
                              <div className="pt-6 pb-4 space-y-4 text-base md:text-lg leading-[2rem] tracking-wide relative">
                                <p>Dear {recipientType === "self" 
                                  ? "Future Me," 
                                  : recipientType === "friends" 
                                    ? selectedFriends.map(id => friends.find(f => f.id === id)?.name || "Friend").join(", ") + ","
                                    : "World,"}</p>
                                <div
                                  className="prose prose-base max-w-none text-[#5D2A42] prose-p:my-2 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6 prose-li:my-0.5 prose-img:rounded-xl prose-img:max-w-full prose-img:my-3 prose-strong:text-inherit prose-em:text-inherit"
                                  dangerouslySetInnerHTML={{ 
                                    __html: content ? (() => { 
                                      const txt = document.createElement("textarea"); 
                                      txt.innerHTML = content; 
                                      return txt.value; 
                                    })() : "<p><em>Your message will appear here...</em></p>" 
                                  }}
                                />
                                <p className="mt-6 text-lg">Sincerely,</p>
                              </div>

                              {/* Signature area placeholder */}
                              <div className="pt-4">
                                <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/60 border-dashed p-4 min-h-[80px] max-w-xs flex items-center justify-center shadow-sm">
                                  <span className="font-sans text-lg text-[#5D2A42]/60 uppercase tracking-widest text-center px-4">
                                    Signature Placeholder
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
          <div className="p-8 border-t border-[#EAEAEA] bg-white flex justify-between items-center z-10">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrev}
              disabled={isSubmitting}
              className="h-14 px-8 rounded-2xl border-[#EAEAEA] bg-white text-[#1A1A1A] font-bold hover:bg-[#FFF9EC] hover:text-[#5D2A42] hover:border-[#FFDCCC] transition-all uppercase tracking-wider text-sm"
            >
              {currentStep === 0 ? "Cancel" : "Go Back"}
            </Button>
            
            <Button
              type="button"
              onClick={currentStep === steps.length - 1 ? onSubmit : handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="h-14 px-10 rounded-2xl bg-[#FB6376] hover:bg-[#e8556a] text-white font-bold transition-all uppercase tracking-wider text-sm"
            >
              {isSubmitting ? (
                "Processing..."
              ) : currentStep === steps.length - 1 ? (
                "Seal Capsule"
              ) : (
                "Next Step"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
