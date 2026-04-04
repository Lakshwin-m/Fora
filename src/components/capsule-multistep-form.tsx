"use client";

import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
        return title.trim() !== "" && content.trim() !== "";
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
        <div className="flex justify-between relative z-10">
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-[#5D2A42]/10 z-[-1]" />
          <div 
            className="absolute top-5 left-8 h-0.5 bg-[#FB6376] z-[-1] transition-all duration-500 ease-in-out" 
            style={{ width: `calc(${(currentStep / (steps.length - 1)) * 100}% - 2rem)` }} 
          />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={index} className="flex flex-col items-center group relative w-20">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-semibold shadow-sm border-2",
                    isActive
                      ? "bg-[#FB6376] border-[#FB6376] text-white scale-110 shadow-md shadow-[#FB6376]/20"
                      : isCompleted
                      ? "bg-white border-[#FB6376] text-[#FB6376]"
                      : "bg-white border-[#E8E8E8] text-[#999]"
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="mt-3 text-center">
                  <div className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isActive ? "text-[#1A1A1A]" : isCompleted ? "text-[#FB6376]" : "text-[#999]"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-[10px] text-[#999] hidden md:block max-w-[80px] leading-tight">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-xl bg-white rounded-3xl overflow-hidden relative min-h-[500px]">
        {/* Top subtle gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#FB6376] via-[#FCB1A6] to-[#FFDCCC]" />
        
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
                <div className="p-8 md:p-10 h-full flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2 tracking-tight">What's your message?</h2>
                    <p className="text-[#666] text-sm">Write the contents of your time capsule.</p>
                  </div>
                  <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-semibold text-[#1A1A1A]">
                        Capsule Title
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g. Letter to my 30-year-old self"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="h-12 border-[#E8E8E8] bg-white text-base rounded-xl focus-visible:ring-1 focus-visible:ring-[#FB6376] focus-visible:border-[#FB6376] transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2 flex-1 flex flex-col">
                      <Label htmlFor="content" className="text-sm font-semibold text-[#1A1A1A]">
                        The Message
                      </Label>
                      <Textarea
                        id="content"
                        placeholder="Write your message to the future..."
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="flex-1 min-h-[200px] border-[#E8E8E8] bg-white text-base rounded-xl focus-visible:ring-1 focus-visible:ring-[#FB6376] focus-visible:border-[#FB6376] transition-all resize-none shadow-sm leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Trigger Configuration */}
              {currentStep === 1 && (
                <div className="p-8 md:p-10 h-full flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2 tracking-tight">When should it open?</h2>
                    <p className="text-[#666] text-sm">Choose the exact moment this capsule becomes unlocked.</p>
                  </div>
                  
                  <Tabs
                    value={triggerType}
                    onValueChange={(value) => onTriggerTypeChange(value as any)}
                    className="flex flex-col flex-1"
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-[#f8f8f8] p-1.5 rounded-xl border border-[#E8E8E8] mb-8">
                      {triggerOptions.map((option) => (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          className="text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-sm text-[#666] transition-all"
                        >
                          {option.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <div className="flex-1 mt-4 overflow-y-auto no-scrollbar pb-6">
                        <TabsContent value="time" className="mt-0 outline-none">
                          <DateTimePicker 
                            date={deliveryDate} 
                            setDate={onDeliveryDateChange} 
                            time={deliveryTime} 
                            setTime={onDeliveryTimeChange} 
                          />
                        </TabsContent>
                        <TabsContent value="event" className="mt-0 space-y-4 outline-none">
                          <div className="p-5 bg-[#FFF9EC] border border-[#FFDCCC] rounded-2xl">
                            <Label htmlFor="eventTrigger" className="text-[#1A1A1A] font-semibold mb-2 block">
                              Describe the Event
                            </Label>
                            <Input
                              id="eventTrigger"
                              placeholder="e.g., The day I graduate college"
                              className="h-12 border-[#FFDCCC] bg-white focus-visible:ring-[#FB6376] text-black"
                            />
                            <p className="text-xs text-[#666] mt-3 leading-relaxed">
                              Event-based capsules remain locked until you manually mark the event as occurred from your dashboard.
                            </p>
                          </div>
                        </TabsContent>
                        <TabsContent value="connection" className="mt-0 space-y-4">
                          <div className="p-5 bg-[#FB6376]/5 border border-[#FB6376]/20 rounded-2xl">
                            <Label htmlFor="connectionTrigger" className="text-[#1A1A1A] font-semibold mb-2 block">
                              Connection Condition
                            </Label>
                            <Input
                              id="connectionTrigger"
                              placeholder="e.g., We meet again in person"
                              className="h-12 border-[#FB6376]/20 bg-white focus-visible:ring-[#FB6376] text-black"
                            />
                            <p className="text-xs text-[#666] mt-3 leading-relaxed">
                              This capsule will require both you and the tagged connection to mutually confirm the trigger has been met.
                            </p>
                          </div>
                        </TabsContent>
                    </div>
                  </Tabs>
                </div>
              )}

              {/* Step 2: Recipients */}
              {currentStep === 2 && (
                <div className="p-8 md:p-10 h-full flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2 tracking-tight">Who is this for?</h2>
                    <p className="text-[#666] text-sm">Select the recipients who will unlock this capsule.</p>
                  </div>
                  
                  <Tabs
                    value={recipientType}
                    onValueChange={(value) => onRecipientTypeChange(value as any)}
                    className="flex flex-col flex-1"
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-[#f8f8f8] p-1.5 rounded-xl border border-[#E8E8E8] mb-8">
                      <TabsTrigger value="self" className="text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-sm text-[#666] transition-all">
                        Just Me
                      </TabsTrigger>
                      <TabsTrigger value="friends" className="text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-sm text-[#666] transition-all">
                        Connections
                      </TabsTrigger>
                      <TabsTrigger value="public" className="text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-sm text-[#666] transition-all">
                        Public
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-4 overflow-y-auto no-scrollbar pb-6">
                          <TabsContent value="self" className="mt-0 outline-none">
                            <div className="flex flex-col items-center justify-center py-12 px-6 border border-[#E8E8E8] rounded-2xl bg-[#fafafa]">
                              <div className="w-16 h-16 bg-[#FFDCCC]/50 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-[#5D2A42]" />
                              </div>
                              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">A gift to your future self</h3>
                              <p className="text-[#666] text-center max-w-sm text-sm leading-relaxed">
                                This capsule will be stored privately in your vault and only you will be able to unlock it when the time comes.
                              </p>
                            </div>
                          </TabsContent>

                          <TabsContent value="friends" className="mt-0">
                            {loadingFriends ? (
                              <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
                              </div>
                            ) : friends.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 px-6 border border-[#E8E8E8] rounded-2xl bg-[#fafafa]">
                                <div className="w-16 h-16 bg-[#E8E8E8] rounded-full flex items-center justify-center mb-4">
                                  <Users className="w-8 h-8 text-[#999]" />
                                </div>
                                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No Connections Yet</h3>
                                <p className="text-[#666] text-center max-w-sm text-sm">
                                  You need to add connections first before you can send them a capsule.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2">
                                  <Label className="text-[#1A1A1A] font-semibold text-sm">
                                    Select Connections <Badge variant="secondary" className="ml-2 bg-[#FB6376]/10 text-[#FB6376] hover:bg-[#FB6376]/20">{selectedFriends.length} selected</Badge>
                                  </Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllFriends}
                                    className="text-[#FB6376] hover:text-[#e8556a] hover:bg-[#FB6376]/5 text-xs font-semibold h-8"
                                  >
                                    {selectedFriends.length === friends.length ? "Deselect All" : "Select All"}
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {friends.map((friend) => {
                                    const isSelected = selectedFriends.includes(friend.id);
                                    return (
                                      <div
                                        key={friend.id}
                                        className={cn(
                                          "flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 border group",
                                          isSelected 
                                            ? "border-[#FB6376] bg-[#FB6376]/5 shadow-sm" 
                                            : "border-[#E8E8E8] hover:border-[#FB6376]/50 hover:bg-[#fafafa]"
                                        )}
                                        onClick={() => toggleFriendSelection(friend.id)}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleFriendSelection(friend.id)}
                                          className="mr-3 data-[state=checked]:bg-[#FB6376] data-[state=checked]:border-[#FB6376]"
                                        />
                                        <Avatar className="w-10 h-10 border border-[#E8E8E8]">
                                          <AvatarImage src={friend.photoURL} alt={friend.name} />
                                          <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-xs font-semibold">
                                            {getInitials(friend.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="ml-3 flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{friend.name}</p>
                                          <p className="text-xs text-[#999] truncate">{friend.email}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="public" className="mt-0">
                            <div className="flex flex-col items-center justify-center py-8 px-6 border border-[#E8E8E8] rounded-2xl bg-[#fafafa] mb-6">
                              <div className="w-16 h-16 bg-[#5D2A42]/10 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-[#5D2A42]" />
                              </div>
                              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Share with the World</h3>
                              <p className="text-[#666] text-center max-w-sm text-sm leading-relaxed">
                                Public capsules are completely anonymous initially but visible to the entire community on the timeline.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="category" className="text-[#1A1A1A] font-semibold text-sm">
                                Community Category
                              </Label>
                              <Select value={capsuleCategory} onValueChange={onCapsuleCategoryChange}>
                                <SelectTrigger id="category" className="h-12 border-[#E8E8E8] bg-white text-base rounded-xl focus:ring-[#FB6376]">
                                  <SelectValue placeholder="Select a category..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#E8E8E8] shadow-lg">
                                  <SelectItem value="memories" className="rounded-lg h-10">Memories</SelectItem>
                                  <SelectItem value="reflections" className="rounded-lg h-10">Reflections</SelectItem>
                                  <SelectItem value="moments" className="rounded-lg h-10">Moments</SelectItem>
                                  <SelectItem value="stories" className="rounded-lg h-10">Stories</SelectItem>
                                  <SelectItem value="milestones" className="rounded-lg h-10">Milestones</SelectItem>
                                  <SelectItem value="wisdom" className="rounded-lg h-10">Wisdom</SelectItem>
                                  <SelectItem value="other" className="rounded-lg h-10">Other</SelectItem>
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
                <div className="p-8 md:p-10 h-full flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2 tracking-tight">Add Memories</h2>
                    <p className="text-[#666] text-sm">Include photos, videos, or audio to enrich your capsule.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E8E8] hover:border-[#FB6376] hover:bg-[#FB6376]/5 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center min-h-[140px]"
                    >
                       <div className="w-12 h-12 bg-[#FB6376]/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                         <Image className="w-6 h-6 text-[#FB6376]" />
                       </div>
                       <span className="font-semibold text-sm text-[#1A1A1A]">Photos</span>
                    </div>
                    <div 
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E8E8] hover:border-[#FB6376] hover:bg-[#FB6376]/5 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center min-h-[140px]"
                    >
                       <div className="w-12 h-12 bg-[#FB6376]/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                         <Video className="w-6 h-6 text-[#FB6376]" />
                       </div>
                       <span className="font-semibold text-sm text-[#1A1A1A]">Videos</span>
                    </div>
                    <div 
                      onClick={() => audioInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E8E8] hover:border-[#FB6376] hover:bg-[#FB6376]/5 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center min-h-[140px]"
                    >
                       <div className="w-12 h-12 bg-[#FB6376]/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                         <Music className="w-6 h-6 text-[#FB6376]" />
                       </div>
                       <span className="font-semibold text-sm text-[#1A1A1A]">Voice Notes</span>
                    </div>
                  </div>

                  {/* Hidden inputs */}
                  <input type="file" ref={imageInputRef} onChange={(e) => onFileSelect("image", e)} accept="image/*" multiple className="hidden" />
                  <input type="file" ref={videoInputRef} onChange={(e) => onFileSelect("video", e)} accept="video/*" multiple className="hidden" />
                  <input type="file" ref={audioInputRef} onChange={(e) => onFileSelect("audio", e)} accept="audio/*" multiple className="hidden" />

                  {attachments.length > 0 && (
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center justify-between">
                        Uploaded Files <Badge variant="outline" className="text-xs bg-black/5">{attachments.length}</Badge>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {attachments.map((attachment) => (
                          <div key={attachment.id} className="border border-[#E8E8E8] rounded-xl p-3 flex items-center bg-[#fafafa]">
                            <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center mr-3 flex-shrink-0">
                               {getFileIcon(attachment.type)}
                            </div>
                            <span className="flex-1 truncate text-sm font-medium text-[#333]">
                              {attachment.name}
                            </span>
                            {attachment.uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#FB6376] ml-2" />
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 ml-1 hover:bg-black/10 rounded-md text-[#999]"
                                onClick={() => onRemoveAttachment(attachment.id)}
                              >
                                <X className="w-4 h-4" />
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
                <div className="p-8 md:p-10 h-full flex flex-col">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2 tracking-tight">Final Review</h2>
                      <p className="text-[#666] text-sm">Ensure everything is exactly how you want it.</p>
                    </div>
                    <div className="w-16 h-16 bg-[#FFF9EC] rounded-2xl flex items-center justify-center shadow-inner border border-[#FFDCCC]/50">
                      <Gift className="w-8 h-8 text-[#FB6376] animate-pulse" />
                    </div>
                  </div>

                  <div className="bg-[#fafafa] border border-[#E8E8E8] rounded-2xl p-6 flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#E8E8E8]">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#999] block mb-1">Title</span>
                        <span className="text-base font-semibold text-[#1A1A1A]">{title}</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#999] block mb-1">Message Length</span>
                        <span className="text-base font-medium text-[#1A1A1A]">{content.length} characters</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#E8E8E8]">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#999] block mb-1">Trigger Condition</span>
                        <span className="text-base font-medium text-[#1A1A1A] capitalize flex items-center gap-2">
                           <Clock className="w-4 h-4 text-[#FB6376]" />
                           {triggerType}
                        </span>
                      </div>
                      {triggerType === "time" && deliveryDate && (
                        <div>
                          <span className="text-xs uppercase tracking-wider font-semibold text-[#999] block mb-1">Unlock Date</span>
                          <span className="text-base font-medium text-[#1A1A1A]">
                            {deliveryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {deliveryTime}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#999] block mb-1">Recipients</span>
                        <span className="text-base font-medium text-[#1A1A1A] capitalize flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#5D2A42]" />
                          {recipientType === "self" ? "Just Myself" : recipientType === "friends" ? `${selectedFriends.length} Connection(s)` : "Public Community"}
                        </span>
                      </div>
                      <div>
                         <span className="text-xs uppercase tracking-wider font-semibold text-[#999] block mb-1">Memories Attached</span>
                         <span className="text-base font-medium text-[#1A1A1A] flex items-center gap-2">
                            <Image className="w-4 h-4 text-[#FB6376]" />
                            {attachments.length} file(s)
                         </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation */}
          <div className="p-8 border-t border-[#E8E8E8] bg-white flex justify-between items-center z-10">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrev}
              disabled={isSubmitting}
              className="h-12 px-6 rounded-xl border-[#E8E8E8] text-[#1A1A1A] font-semibold hover:bg-[#fafafa]"
            >
              {currentStep === 0 ? "Cancel" : "Go Back"}
            </Button>
            
            <Button
              type="button"
              onClick={currentStep === steps.length - 1 ? onSubmit : handleNext}
              disabled={!isStepValid() || isSubmitting}
              className={cn(
                "h-12 px-8 rounded-xl font-bold transition-all shadow-md",
                currentStep === steps.length - 1
                  ? "bg-[#1A1A1A] hover:bg-[#333] text-white"
                  : "bg-[#FB6376] hover:bg-[#e8556a] text-white"
              )}
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
              ) : currentStep === steps.length - 1 ? (
                <><Lock className="w-5 h-5 mr-2" /> Seal Capsule</>
              ) : (
                <>Next Step <ChevronRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
