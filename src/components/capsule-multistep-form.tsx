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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DatePickerWithPresets } from "@/components/DatePickerWithPresets";
import { TimePicker } from "@/components/TimePicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const steps = [
  { id: "basic", title: "Basic Info" },
  { id: "trigger", title: "Trigger" },
  { id: "recipients", title: "Recipients" },
  { id: "attachments", title: "Attachments" },
  { id: "review", title: "Review" },
  { id: "seal", title: "Seal" },
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
  // Form data
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

  // Handlers
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

  // Navigation
  onNextStep: () => void;
  onPrevStep: () => void;
  onSubmit: () => void;
  onCancel: () => void;

  // State
  currentStep: number;
  isSubmitting: boolean;
  loadingFriends: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
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
  onAttachmentsChange,
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

    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const triggerOptions = [
    {
      id: "time",
      label: "Time-based",
      description: "Unlock on a specific date and time",
    },
    {
      id: "event",
      label: "Event-based",
      description: "Unlock after a specific event occurs",
    },
    {
      id: "connection",
      label: "Connection-based",
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
      case 5:
        return true; // Seal always valid
      default:
        return false;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      {/* Progress indicator - matches your design */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center"
              whileHover={{ scale: 1.1 }}
            >
              <motion.div
                className={cn(
                  "w-4 h-4 rounded-full cursor-pointer transition-colors duration-300",
                  index < currentStep
                    ? "bg-[#FB6376]"
                    : index === currentStep
                    ? "bg-[#FB6376] ring-4 ring-[#FB6376]/20"
                    : "bg-[#5D2A42]/20"
                )}
                onClick={() => {
                  if (index <= currentStep) {
                    // Logic to go to specific step would go here
                  }
                }}
                whileTap={{ scale: 0.95 }}
              />
              <motion.span
                className={cn(
                  "text-sm mt-1.5 hidden sm:block",
                  index === currentStep
                    ? "text-black font-medium"
                    : "text-gray-500"
                )}
              >
                {step.title}
              </motion.span>
            </motion.div>
          ))}
        </div>
        <div className="w-full bg-[#5D2A42]/20 h-1.5 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-[#FB6376]"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border border-[#5D2A42]/20 shadow-lg rounded-3xl overflow-hidden">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
              >
                {/* Step 1: Basic Information */}
                {currentStep === 0 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-white">
                        Tell us about your capsule
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Let&apos;s start with some basic information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label htmlFor="title" className="text-white">
                          Capsule Title
                        </Label>
                        <Input
                          id="title"
                          placeholder="What's this capsule about?"
                          value={title}
                          onChange={(e) => onTitleChange(e.target.value)}
                          className="transition-all duration-300 focus:ring-2 focus:ring-[#FB6376]/20 focus:border-[#FB6376] border-[#5D2A42]/20"
                        />
                      </motion.div>
                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label htmlFor="content" className="text-white">
                          Message Content
                        </Label>
                        <Textarea
                          id="content"
                          placeholder="Write your message to the future..."
                          value={content}
                          onChange={(e) => onContentChange(e.target.value)}
                          className="min-h-32 transition-all duration-300 focus:ring-2 focus:ring-[#FB6376]/20 focus:border-[#FB6376] border-[#5D2A42]/20"
                        />
                      </motion.div>
                    </CardContent>
                  </>
                )}

                {/* Step 2: Trigger Configuration */}
                {currentStep === 1 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-white">
                        Unlock Trigger
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Choose when this capsule should be unlocked
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs
                        value={triggerType}
                        onValueChange={(value) =>
                          onTriggerTypeChange(value as any)
                        }
                      >
                        <TabsList className="grid w-full grid-cols-3 bg-[#FFDCCC]/30 border border-[#5D2A42]/20 p-1">
                          {triggerOptions.map((option) => (
                            <TabsTrigger
                              key={option.id}
                              value={option.id}
                              className="text-sm data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-white"
                            >
                              {option.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <TabsContent value="time" className="space-y-4 mt-6">
                          <p className="text-sm text-white/70">
                            Your capsule will unlock automatically on the
                            specified date and time.
                          </p>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-white font-medium">
                                Delivery Date
                              </Label>
                              <DatePickerWithPresets
                                value={deliveryDate}
                                onSelect={onDeliveryDateChange}
                                placeholder="Pick a date"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-white font-medium">
                                Delivery Time
                              </Label>
                              <TimePicker
                                value={deliveryTime}
                                onSelect={onDeliveryTimeChange}
                                placeholder="HH:MM"
                              />
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="event" className="space-y-4 mt-6">
                          <p className="text-sm text-white/70">
                            Your capsule will unlock when a specific event
                            occurs.
                          </p>
                          <div className="space-y-2">
                            <Label
                              htmlFor="eventTrigger"
                              className="text-white font-medium"
                            >
                              Event Description
                            </Label>
                            <Input
                              id="eventTrigger"
                              placeholder="e.g., My 30th birthday, Sarah's graduation"
                              className="border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-white"
                            />
                          </div>
                        </TabsContent>
                        <TabsContent
                          value="connection"
                          className="space-y-4 mt-6"
                        >
                          <p className="text-sm text-white/70">
                            Your capsule will unlock when tagged connections
                            confirm.
                          </p>
                          <div className="space-y-2">
                            <Label
                              htmlFor="connectionTrigger"
                              className="text-white font-medium"
                            >
                              Trigger Condition
                            </Label>
                            <Input
                              id="connectionTrigger"
                              placeholder="e.g., We meet again in person"
                              className="border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-white"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </>
                )}

                {/* Step 3: Recipients */}
                {currentStep === 2 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-white">Recipients</CardTitle>
                      <CardDescription className="text-white/70">
                        Choose who will receive this capsule
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Tabs
                        value={recipientType}
                        onValueChange={(value) =>
                          onRecipientTypeChange(value as any)
                        }
                      >
                        <TabsList className="grid w-full grid-cols-3 bg-[#FFDCCC]/30 border border-[#5D2A42]/20 p-1">
                          <TabsTrigger
                            value="self"
                            className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-white"
                          >
                            Myself
                          </TabsTrigger>
                          <TabsTrigger
                            value="friends"
                            className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-white"
                          >
                            Friends
                          </TabsTrigger>
                          <TabsTrigger
                            value="public"
                            className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-white"
                          >
                            Public
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="self" className="mt-6">
                          <div className="text-center p-8 border-2 border-dashed border-[#5D2A42]/30 rounded-lg bg-[#FFDCCC]/20">
                            <h3 className="font-semibold text-white mb-2">
                              Send to Yourself
                            </h3>
                            <p className="text-sm text-white/70">
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
                              <h3 className="font-semibold text-white mb-2">
                                No Friends Yet
                              </h3>
                              <p className="text-sm text-white/70 mb-4">
                                Add friends from the Connections page to send
                                them capsules
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <Label className="text-white font-medium">
                                  Select Friends ({selectedFriends.length}{" "}
                                  selected)
                                </Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllFriends}
                                  className="border-[#5D2A42]/20 text-white hover:bg-[#FFDCCC]"
                                >
                                  {selectedFriends.length === friends.length
                                    ? "Deselect All"
                                    : "Select All"}
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                                {friends.map((friend) => {
                                  const isSelected = selectedFriends.includes(
                                    friend.id
                                  );
                                  return (
                                    <Card
                                      key={friend.id}
                                      className={`border-2 cursor-pointer transition-all ${
                                        isSelected
                                          ? "border-[#FB6376] bg-[#FFDCCC]/30"
                                          : "border-[#5D2A42]/20 hover:border-[#FB6376]/50"
                                      }`}
                                      onClick={() =>
                                        toggleFriendSelection(friend.id)
                                      }
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-center space-x-3">
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() =>
                                                toggleFriendSelection(friend.id)
                                              }
                                              className="mt-0.5 data-[state=checked]:bg-[#FB6376] data-[state=checked]:border-[#FB6376]"
                                            />
                                          </div>
                                          <Avatar className="w-10 h-10">
                                            <AvatarImage
                                              src={friend.photoURL}
                                              alt={friend.name}
                                            />
                                            <AvatarFallback className="bg-[#FB6376] text-white">
                                              {getInitials(friend.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-white truncate">
                                              {friend.name}
                                            </h4>
                                            <p className="text-xs text-white/60 truncate">
                                              {friend.email}
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
                            <h3 className="font-semibold text-white mb-2">
                              Share with Community
                            </h3>
                            <p className="text-sm text-white/70">
                              Make this capsule public and share it with the
                              entire community.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label
                                htmlFor="category"
                                className="text-white font-medium block mb-2"
                              >
                                Category *
                              </Label>
                              <Select
                                value={capsuleCategory}
                                onValueChange={onCapsuleCategoryChange}
                              >
                                <SelectTrigger
                                  id="category"
                                  className="border-[#5D2A42]/20 bg-white text-white"
                                >
                                  <SelectValue placeholder="Select a category..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-[#5D2A42]/20">
                                  <SelectItem value="memories">
                                    Memories
                                  </SelectItem>
                                  <SelectItem value="reflections">
                                    Reflections
                                  </SelectItem>
                                  <SelectItem value="moments">
                                    Moments
                                  </SelectItem>
                                  <SelectItem value="stories">
                                    Stories
                                  </SelectItem>
                                  <SelectItem value="milestones">
                                    Milestones
                                  </SelectItem>
                                  <SelectItem value="wisdom">Wisdom</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </>
                )}

                {/* Step 4: Attachments */}
                {currentStep === 3 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-white">Attachments</CardTitle>
                      <CardDescription className="text-white/70">
                        Add files to your capsule (Optional)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-white font-medium">
                          Add files to your capsule
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageInputRef.current?.click()}
                            className="border-[#5D2A42]/20 text-white hover:bg-[#FFDCCC]"
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Add Images
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => videoInputRef.current?.click()}
                            className="border-[#5D2A42]/20 text-white hover:bg-[#FFDCCC]"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Add Videos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => audioInputRef.current?.click()}
                            className="border-[#5D2A42]/20 text-white hover:bg-[#FFDCCC]"
                          >
                            <Music className="w-4 h-4 mr-2" />
                            Add Audio
                          </Button>
                        </div>

                        {/* Hidden file inputs */}
                        <input
                          type="file"
                          ref={imageInputRef}
                          onChange={(e) => onFileSelect("image", e)}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />
                        <input
                          type="file"
                          ref={videoInputRef}
                          onChange={(e) => onFileSelect("video", e)}
                          accept="video/*"
                          multiple
                          className="hidden"
                        />
                        <input
                          type="file"
                          ref={audioInputRef}
                          onChange={(e) => onFileSelect("audio", e)}
                          accept="audio/*"
                          multiple
                          className="hidden"
                        />

                        {attachments.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-white/70">
                              {attachments.length} file(s) selected
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {attachments.map((attachment) => (
                                <Badge
                                  key={attachment.id}
                                  variant="secondary"
                                  className="pr-1 bg-[#FCB1A6]/30 text-white border-[#5D2A42]/20"
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
                                          onRemoveAttachment(attachment.id)
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
                  </>
                )}

                {/* Step 5: Review */}
                {currentStep === 4 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-white">Review</CardTitle>
                      <CardDescription className="text-white/70">
                        Review your capsule details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-[#FFDCCC]/30 rounded-lg border border-[#5D2A42]/20">
                        <h4 className="font-semibold text-white mb-3">
                          Capsule Summary
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white/70">Title:</span>
                            <span className="text-white font-medium">
                              {title}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">
                              Content Length:
                            </span>
                            <span className="text-white font-medium">
                              {content.length} characters
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Trigger:</span>
                            <span className="text-white font-medium capitalize">
                              {triggerType}
                            </span>
                          </div>
                          {triggerType === "time" && deliveryDate && (
                            <div className="flex justify-between">
                              <span className="text-white/70">
                                Unlock Date:
                              </span>
                              <span className="text-white font-medium">
                                {deliveryDate.toLocaleDateString()} at{" "}
                                {deliveryTime}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-white/70">Recipient:</span>
                            <span className="text-white font-medium capitalize">
                              {recipientType === "self"
                                ? "Yourself"
                                : recipientType === "friends"
                                ? `${selectedFriends.length} friend(s)`
                                : "Public"}
                            </span>
                          </div>
                          {recipientType === "public" && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Category:</span>
                              <span className="text-white font-medium capitalize">
                                {capsuleCategory}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-white/70">Attachments:</span>
                            <span className="text-white font-medium">
                              {attachments.length} file(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* Step 6: Seal */}
                {currentStep === 5 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-white">Seal Capsule</CardTitle>
                      <CardDescription className="text-white/70">
                        Ready to seal your time capsule
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-[#FB6376]/5 border border-[#FB6376]/20 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">
                          Ready to Seal
                        </h4>
                        <p className="text-sm text-white/70 mb-3">
                          Once sealed, this capsule cannot be modified. It will
                          remain locked until the trigger conditions are met.
                        </p>
                        <ul className="text-xs text-white/70 space-y-1">
                          <li>
                            • Capsule will be encrypted and stored securely
                          </li>
                          <li>• Only recipients can unlock it</li>
                          <li>• You can track delivery status</li>
                          <li>• Public capsules are visible to everyone</li>
                        </ul>
                      </div>
                    </CardContent>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <CardFooter className="flex justify-between pt-6 pb-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 0 ? onCancel : onPrevStep}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 transition-all duration-300 rounded-2xl border-[#5D2A42]/20 text-white hover:bg-[#FFDCCC]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {currentStep === 0 ? "Cancel" : "Back"}
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="button"
                  onClick={
                    currentStep === steps.length - 1 ? onSubmit : onNextStep
                  }
                  disabled={!isStepValid() || isSubmitting}
                  className={cn(
                    "flex items-center gap-1 transition-all duration-300 rounded-2xl",
                    currentStep === steps.length - 1
                      ? "bg-gradient-to-r from-[#FB6376] to-[#FCB1A6] hover:from-[#FB6376]/90 hover:to-[#FCB1A6]/90 text-white"
                      : "bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {currentStep === steps.length - 1
                        ? "Seal Capsule"
                        : "Next"}
                      {currentStep === steps.length - 1 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </div>
        </Card>
      </motion.div>

      {/* Step indicator */}
      <motion.div
        className="mt-4 text-center text-sm text-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Step {currentStep + 1} of {steps.length}:{" "}
        {steps[currentStep]?.title ?? ""}
      </motion.div>
    </div>
  );
};
