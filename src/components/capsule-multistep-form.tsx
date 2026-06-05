"use client";

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
}

interface Attachment {
  id: string;
  file: File;
  type: "image" | "video" | "audio";
  name: string;
  uploading?: boolean;
  progress?: number;
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
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    scale: 0.98,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
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
    if (selectedFriends.length === friends.length) {
      onSelectedFriendsChange([]);
    } else {
      onSelectedFriendsChange(friends.map((f) => f.id));
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
      label: "Specific Event",
      description: "Unlock after a specific event occurs",
    },
    {
      id: "connection",
      label: "A Connection",
      description: "Unlock when tagged connection confirms",
    },
  ];

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
                      "rounded-full h-1 w-full transition-all duration-500 ease-out",
                      index < currentStep
                        ? "bg-[#FB6376]"
                        : index === currentStep
                        ? "bg-[#FB6376] shadow-[0_0_12px_rgba(251,99,118,0.35)]"
                        : "bg-[#5D2A42]/20"
                    )}
                  />
                  <div className="flex flex-col items-start gap-0.5">
                    <StepperTitle
                      className={cn(
                        "text-start font-semibold text-sm transition-colors duration-300",
                        index === currentStep
                          ? "text-[#1A1A1A]"
                          : index < currentStep
                          ? "text-[#FB6376]"
                          : "text-[#999]"
                      )}
                    >
                      <span className="opacity-50 mr-1.5">{index + 1}.</span>
                      {step.title}
                    </StepperTitle>
                    <span
                      className={cn(
                        "text-[11px] hidden md:block leading-tight transition-colors duration-300",
                        index === currentStep
                          ? "text-[#555]"
                          : "text-[#999]"
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
      <Card className="border border-[#EAEAEA] shadow-sm bg-white rounded-[2rem] overflow-hidden relative min-h-[500px]">
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
                    <TabsList className="grid w-full h-auto grid-cols-3 bg-[#FFF9EC] p-2 rounded-2xl border border-[#FFDCCC]">
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
                        <TabsContent value="event" className="mt-0 space-y-4 outline-none">
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="eventTrigger" className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                              Describe the Event
                            </Label>
                            <Input
                              id="eventTrigger"
                              placeholder="e.g., The day I graduate college"
                              className="h-14 border-[#E8E8E8] bg-[#FFF9EC] hover:bg-white text-[#1A1A1A] placeholder:text-[#999] rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#5D2A42] transition-all px-5"
                            />
                            <p className="text-xs font-medium text-[#FB6376] mt-2">
                              Event-based capsules remain locked until you manually mark the event as occurred.
                            </p>
                          </div>
                        </TabsContent>
                        <TabsContent value="connection" className="mt-0 space-y-4 outline-none">
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="connectionTrigger" className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                              Connection Condition
                            </Label>
                            <Input
                              id="connectionTrigger"
                              placeholder="e.g., We meet again in person"
                              className="h-14 border-[#E8E8E8] bg-[#FFF9EC] hover:bg-white text-[#1A1A1A] placeholder:text-[#999] rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#5D2A42] transition-all px-5"
                            />
                            <p className="text-xs font-medium text-[#FB6376] mt-2">
                              Requires both you and the tagged connection to mutually confirm the trigger.
                            </p>
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
                                    return (
                                      <div
                                        key={friend.id}
                                        className={cn(
                                          "flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-200 border",
                                          isSelected 
                                            ? "border-[#FB6376] bg-[#FFF9EC]" 
                                            : "border-[#E8E8E8] bg-white hover:border-[#FB6376] hover:bg-[#FFF9EC]"
                                        )}
                                        onClick={() => toggleFriendSelection(friend.id)}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleFriendSelection(friend.id)}
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
                                          <p className="text-sm font-medium text-[#999] truncate">{friend.email}</p>
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
                    <h2 className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight mb-2">Add Memories</h2>
                    <p className="text-[#666] text-base font-medium">Include photos, videos, or audio to enrich your capsule.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E8E8] hover:border-[#FB6376] bg-white hover:bg-[#FFF9EC] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center min-h-[160px]"
                    >
                       <span className="font-extrabold text-lg text-[#5D2A42] uppercase tracking-wider mb-2">Photos</span>
                       <span className="text-sm font-medium text-[#999]">Browse files</span>
                    </div>
                    <div 
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E8E8] hover:border-[#FB6376] bg-white hover:bg-[#FFF9EC] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center min-h-[160px]"
                    >
                       <span className="font-extrabold text-lg text-[#5D2A42] uppercase tracking-wider mb-2">Videos</span>
                       <span className="text-sm font-medium text-[#999]">Browse files</span>
                    </div>
                    <div 
                      onClick={() => audioInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E8E8] hover:border-[#FB6376] bg-white hover:bg-[#FFF9EC] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center min-h-[160px]"
                    >
                       <span className="font-extrabold text-lg text-[#5D2A42] uppercase tracking-wider mb-2">Voice Notes</span>
                       <span className="text-sm font-medium text-[#999]">Browse files</span>
                    </div>
                  </div>

                  {/* Hidden inputs */}
                  <input type="file" ref={imageInputRef} onChange={(e) => onFileSelect("image", e)} accept="image/*" multiple className="hidden" />
                  <input type="file" ref={videoInputRef} onChange={(e) => onFileSelect("video", e)} accept="video/*" multiple className="hidden" />
                  <input type="file" ref={audioInputRef} onChange={(e) => onFileSelect("audio", e)} accept="audio/*" multiple className="hidden" />

                  {attachments.length > 0 && (
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-xs font-bold text-[#5D2A42] uppercase tracking-wider">
                          Uploaded Files
                        </Label>
                        <Badge variant="secondary" className="bg-[#FB6376] text-white hover:bg-[#e8556a]">{attachments.length} items</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {attachments.map((attachment) => (
                          <div key={attachment.id} className="border border-[#E8E8E8] rounded-2xl p-4 flex items-center bg-[#FFF9EC] shadow-sm">
                            <span className="flex-1 truncate text-base font-bold text-[#1A1A1A]">
                              {attachment.name}
                            </span>
                            {attachment.uploading ? (
                              <span className="text-[#FB6376] font-bold text-xs ml-3 uppercase tracking-wider">Uploading</span>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 ml-2 hover:bg-white hover:text-[#FB6376] rounded-xl text-[#999] transition-colors"
                                onClick={() => onRemoveAttachment(attachment.id)}
                              >
                                X
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
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
                                  <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> Digital Archive</div>
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
                                    {recipientType === "self" ? "My Future Self" : recipientType === "friends" ? `${selectedFriends.length} Connection(s)` : "The World"}
                                  </span>
                                </div>
                              </div>

                              {/* Body */}
                              <div className="pt-6 pb-4 space-y-4 text-base md:text-lg leading-[2rem] tracking-wide relative">
                                <p>Dear {recipientType === "self" ? "Future Me," : "Friend,"}</p>
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
                                <p className="mt-6">Sincerely,</p>
                              </div>

                              {/* Signature area placeholder */}
                              <div className="pt-6">
                                <span className="text-[10px] text-[#5D2A42]/50 block mb-2">Original Signature:</span>
                                <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/60 border-dashed p-4 min-h-[80px] max-w-xs flex items-center justify-center shadow-sm">
                                  <span className="font-sans text-xs text-[#5D2A42]/60 uppercase tracking-widest text-center px-4">
                                    You will draw your signature upon sealing
                                  </span>
                                </div>
                              </div>

                              <div className="pt-6">
                                <h3 className="font-bold text-lg">{username}</h3>
                                <p className="text-[#5D2A42]/50 text-xs">{new Date().getFullYear()}</p>
                              </div>

                              <hr className="border-[#5D2A42]/10 my-6" />

                              <div className="flex items-center justify-center text-xs italic text-[#5D2A42]/50 pb-4 tracking-wide">
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                a short time to reach you today.
                              </div>
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
