import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { getAuth } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  Users,
  User,
  Lock,
  Unlock,
  ArrowLeft,
  Mail,
  Share2,
  Feather,
  Paperclip,
  Stamp,
  BookOpen,
} from "lucide-react";

interface TimeRemaining {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

interface CapsuleDetailProps {}

const CapsuleDetail: React.FC<CapsuleDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { capsules, receivedCapsules, markCapsuleAsOpened } = useCapsules();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAsLetter, setShowAsLetter] = useState(true);

  // Find the capsule in both sent and received capsules
  const capsule = [...capsules, ...receivedCapsules].find((c) => c.id === id);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate unlock status and time remaining
  useEffect(() => {
    if (!capsule) return;

    const deliveryTime = new Date(capsule.deliveryDate).getTime();
    const currentTimeMs = currentTime.getTime();
    const unlocked = deliveryTime <= currentTimeMs || capsule.isUnlocked;

    setIsUnlocked(unlocked);

    if (!unlocked) {
      const diff = deliveryTime - currentTimeMs;
      calculateTimeRemaining(diff);
    }
  }, [capsule, currentTime]);

  const calculateTimeRemaining = (diff: number) => {
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    setTimeRemaining({
      years,
      months: months % 12,
      days: days % 30,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
      totalMs: diff,
    });
  };

  const formatTimeRemaining = (time: TimeRemaining): string => {
    if (time.years > 0) {
      return `${time.years}y ${time.months}m ${time.days}d ${time.hours}h`;
    } else if (time.months > 0) {
      return `${time.months}m ${time.days}d ${time.hours}h ${time.minutes}m`;
    } else if (time.days > 0) {
      return `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`;
    } else {
      return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "time":
        return Clock;
      case "event":
        return Calendar;
      case "connection":
        return Users;
      default:
        return Clock;
    }
  };

  const handleUnlock = () => {
    if (capsule && !capsule.isUnlocked) {
      markCapsuleAsOpened(capsule.id);
      setIsUnlocked(true);
      setShowAsLetter(true);
      toast({
        title: "Capsule Unlocked! 🎉",
        description: "You can now view the contents of this time capsule.",
      });
    }
  };

  const handleShare = async () => {
    if (!capsule) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: capsule.title,
          text: capsule.content.substring(0, 100) + "...",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Capsule link has been copied to clipboard.",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const toggleLetterView = () => {
    setShowAsLetter(!showAsLetter);
  };

  if (!capsule) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#5D2A42] mb-4">
              Capsule Not Found
            </h1>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const TriggerIcon = getTriggerIcon(capsule.triggerType);
  const isReceived = receivedCapsules.some((c) => c.id === capsule.id);
  const isSentToSelf = capsule.recipientType === "self";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9EC] via-[#FFF5E1] to-[#FFF0D4]">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-[#FFDCCC]/50 text-[#5D2A42] border border-[#5D2A42]/20 backdrop-blur-sm bg-white/70"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#5D2A42]">
                Time Capsule
              </h1>
              <p className="text-[#5D2A42]/60">
                {isUnlocked
                  ? "Unlocked and ready to view"
                  : "Locked - Coming soon"}
              </p>
            </div>
          </div>

          {isUnlocked && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleLetterView}
                variant="outline"
                className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC] backdrop-blur-sm bg-white/70"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {showAsLetter ? "Simple View" : "Letter View"}
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC] backdrop-blur-sm bg-white/70"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          )}
        </div>

        {/* Main Capsule Card */}
        <Card className="border-[#5D2A42]/15 bg-gradient-to-br from-white/90 to-[#FFF9EC]/90 hover:shadow-xl transition-all duration-300 overflow-hidden backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-[#FFDCCC]/30 to-[#FCB1A6]/20 border-b border-[#5D2A42]/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 ${
                    isUnlocked ? "bg-[#FCB1A6]" : "bg-[#FB6376]"
                  } rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm`}
                >
                  {isUnlocked ? (
                    <Unlock className="w-6 h-6 text-[#5D2A42]" />
                  ) : (
                    <Lock className="w-6 h-6 text-[#5D2A42]" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-[#5D2A42]">
                    {capsule.title}
                  </CardTitle>
                  {isReceived && capsule.username && (
                    <p className="text-sm text-[#5D2A42]/70 flex items-center mt-1">
                      <User className="w-4 h-4 mr-1" />
                      From {capsule.username}
                    </p>
                  )}
                  {isSentToSelf && !isReceived && (
                    <p className="text-sm text-[#5D2A42]/70 flex items-center mt-1">
                      <User className="w-4 h-4 mr-1" />
                      To my future self
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={`${
                  isUnlocked
                    ? "bg-[#FCB1A6]/30 text-[#5D2A42] border-[#FCB1A6]/50 backdrop-blur-sm"
                    : "bg-[#FB6376]/15 text-[#5D2A42] border-[#FB6376]/30 backdrop-blur-sm"
                } font-medium px-3 py-1 shadow-sm`}
              >
                {isUnlocked ? "unlocked" : "locked"}
              </Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm text-[#5D2A42]/70">
              <div className="flex items-center backdrop-blur-sm bg-white/50 px-3 py-1.5 rounded-full">
                <TriggerIcon className="w-4 h-4 mr-1.5" />
                <span className="font-medium capitalize">
                  {capsule.triggerType} Trigger
                </span>
              </div>
              <div className="flex items-center backdrop-blur-sm bg-white/50 px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4 mr-1.5" />
                <span className="font-medium">
                  Delivers:{" "}
                  {new Date(capsule.deliveryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8 bg-gradient-to-b from-white/95 to-[#FFF9EC]/95">
            {/* Locked State */}
            {!isUnlocked && timeRemaining && (
              <div className="text-center py-12">
                <div className="relative mb-8">
                  <div className="blur-md opacity-40">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-[#5D2A42] mb-2">
                        {capsule.title}
                      </h3>
                      <p className="text-[#5D2A42]/60 line-clamp-3">
                        {capsule.content}
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-[#5D2A42]/10 max-w-md">
                      <div className="relative">
                        <Lock className="w-20 h-20 text-[#FB6376] mx-auto mb-6 drop-shadow-lg" />
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-[#FFDCCC] rounded-full animate-pulse"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-[#5D2A42] mb-2">
                        Capsule Sealed
                      </h3>
                      <p className="text-[#5D2A42]/70 mb-6">
                        This time capsule will unlock in:
                      </p>
                      <div className="bg-gradient-to-r from-[#FFDCCC] to-[#FCB1A6] rounded-2xl p-6 border border-[#FB6376]/20 shadow-inner mb-6">
                        <div className="text-3xl font-mono font-bold text-[#5D2A42] tracking-tight">
                          {formatTimeRemaining(timeRemaining)}
                        </div>
                      </div>
                      <p className="text-sm text-[#5D2A42]/60 mt-4">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Unlocks on{" "}
                        {new Date(capsule.deliveryDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manual unlock button for edge cases */}
                {currentUser && capsule.userId === currentUser.uid && (
                  <Button
                    onClick={handleUnlock}
                    variant="outline"
                    className="border-[#FB6376] text-[#FB6376] hover:bg-[#FB6376] hover:text-white shadow-md backdrop-blur-sm bg-white/80"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock Now (Creator)
                  </Button>
                )}
              </div>
            )}

            {/* Unlocked State - Letter View */}
            {isUnlocked && showAsLetter && (
              <div className="space-y-6">
                {/* Modern Letter Container */}
                <div className="max-w-3xl mx-auto">
                  {/* Decorative letter header with seal */}
                  <div className="text-center mb-10 relative">
                    <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FCB1A6] to-[#FB6376] rounded-full flex items-center justify-center shadow-xl border-2 border-white/50"></div>
                    </div>
                    <div className="pt-8">
                      <div className="inline-flex items-center justify-center px-6 py-2 bg-gradient-to-r from-[#FFDCCC]/50 to-[#FCB1A6]/50 rounded-full mb-4">
                        <Feather className="w-5 h-5 text-[#5D2A42] mr-2" />
                        <span className="text-sm font-medium text-[#5D2A42]/80">
                          Personal Letter
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5D2A42] to-[#7A3A5E] bg-clip-text text-transparent">
                        {capsule.title}
                      </h2>
                      <p className="text-[#5D2A42]/70 mt-2">
                        A message from the past, delivered to your present
                      </p>
                    </div>
                  </div>

                  {/* Letter Paper with Modern Design */}
                  <div className="bg-gradient-to-br from-white via-white to-[#FFFCF5] rounded-2xl p-8 md:p-12 shadow-xl border border-[#5D2A42]/10 relative overflow-hidden">
                    {/* Subtle paper texture and decorative elements */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Grid lines for writing paper effect */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5D2A42]/5 to-transparent"></div>
                      <div className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-[#5D2A42]/3 to-transparent"></div>
                      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#5D2A42]/3 to-transparent"></div>
                      <div className="absolute inset-x-0 top-3/4 h-px bg-gradient-to-r from-transparent via-[#5D2A42]/3 to-transparent"></div>

                      {/* Corner decorations */}
                      <div className="absolute top-6 left-6 w-16 h-16 border-t border-l border-[#5D2A42]/10 rounded-tl-lg"></div>
                      <div className="absolute top-6 right-6 w-16 h-16 border-t border-r border-[#5D2A42]/10 rounded-tr-lg"></div>
                      <div className="absolute bottom-6 left-6 w-16 h-16 border-b border-l border-[#5D2A42]/10 rounded-bl-lg"></div>
                      <div className="absolute bottom-6 right-6 w-16 h-16 border-b border-r border-[#5D2A42]/10 rounded-br-lg"></div>
                    </div>

                    {/* Letter Content Container */}
                    <div className="relative z-10">
                      {/* Date Stamp */}
                      <div className="flex justify-between items-center mb-10 pb-4 border-b border-[#5D2A42]/10">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#5D2A42]" />
                          </div>
                          <div>
                            <p className="text-sm text-[#5D2A42]/60">
                              Date Written
                            </p>
                            <p className="font-semibold text-[#5D2A42]">
                              {new Date(
                                capsule.createdAt || new Date()
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-[#5D2A42]/60">
                            Date Opened
                          </p>
                          <p className="font-semibold text-[#5D2A42]">
                            {new Date().toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Greeting with decorative underline */}
                      <div className="mb-8">
                        <div className="relative">
                          <p className="text-2xl font-light text-[#5D2A42] mb-2">
                            {isReceived
                              ? `Dear ${currentUser?.displayName || "Friend"},`
                              : "Dear Future Me,"}
                          </p>
                          <div className="w-24 h-0.5 bg-gradient-to-r from-[#FCB1A6] to-transparent"></div>
                        </div>
                      </div>

                      {/* Letter Content with better typography */}
                      <div className="space-y-6 mb-10">
                        {capsule.content
                          .split(/\n\s*\n/)
                          .map((paragraph, index) => (
                            <div key={index} className="relative">
                              {index === 0 && (
                                <span className="absolute -left-6 top-0 text-2xl font-serif text-[#5D2A42]/30">
                                  ¶
                                </span>
                              )}
                              <p className="text-[#5D2A42] leading-relaxed text-lg font-light tracking-wide pl-4">
                                {paragraph || (
                                  <span className="h-4 block"></span>
                                )}
                              </p>
                            </div>
                          ))}
                      </div>

                      {/* Closing Signature with wax seal effect */}
                      <div className="mt-12 pt-8 border-t border-[#5D2A42]/10 relative">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xl font-light text-[#5D2A42] mb-1">
                              {isReceived ? "With warm regards," : "Sincerely,"}
                            </p>
                            <div className="flex items-center space-x-2">
                              <div className="w-0.5 h-6 bg-gradient-to-b from-[#FCB1A6] to-transparent"></div>
                              <p className="text-lg font-semibold text-[#5D2A42]">
                                {isReceived
                                  ? capsule.username ||
                                    "A friend from your past"
                                  : "Your past self"}
                              </p>
                            </div>
                          </div>

                          {/* Wax Seal Decoration */}
                          <div className="relative group">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#FB6376] to-[#5D2A42] rounded-full flex items-center justify-center shadow-lg border-4 border-white transform group-hover:scale-110 transition-transform duration-300">
                              <Stamp className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute inset-0 animate-ping opacity-20">
                              <div className="w-full h-full bg-[#FB6376] rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time Travel Note */}
                      <div className="mt-10 p-4 bg-gradient-to-r from-[#FFDCCC]/20 to-[#FCB1A6]/10 rounded-xl border border-[#5D2A42]/10">
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-[#5D2A42]/70" />
                          <div>
                            <p className="text-sm text-[#5D2A42]/70">
                              This letter traveled through time for{" "}
                              {(() => {
                                const created = new Date(
                                  capsule.createdAt || new Date()
                                );
                                const delivered = new Date();
                                const diffYears =
                                  delivered.getFullYear() -
                                  created.getFullYear();
                                const diffMonths =
                                  delivered.getMonth() - created.getMonth();
                                const totalMonths = diffYears * 12 + diffMonths;

                                if (totalMonths >= 12) {
                                  const years = Math.floor(totalMonths / 12);
                                  const months = totalMonths % 12;
                                  return months > 0
                                    ? `${years} year${
                                        years > 1 ? "s" : ""
                                      } and ${months} month${
                                        months > 1 ? "s" : ""
                                      }`
                                    : `${years} year${years > 1 ? "s" : ""}`;
                                }
                                return `${totalMonths} month${
                                  totalMonths > 1 ? "s" : ""
                                }`;
                              })()}{" "}
                              to reach you.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Toggle Button */}
                <div className="text-center pt-6">
                  <Button
                    onClick={toggleLetterView}
                    variant="outline"
                    className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC] backdrop-blur-sm bg-white/80"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Switch to Simple View
                  </Button>
                </div>
              </div>
            )}

            {/* Unlocked State - Simple View */}
            {isUnlocked && !showAsLetter && (
              <div className="space-y-8">
                {/* Content Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#5D2A42]/10 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-[#5D2A42]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#5D2A42]">
                        Message Content
                      </h3>
                      <p className="text-sm text-[#5D2A42]/60">
                        From your past to your present
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-b from-[#FFF9EC] to-white rounded-xl p-6 border border-[#5D2A42]/10">
                    <p className="text-[#5D2A42] leading-relaxed whitespace-pre-wrap text-lg">
                      {capsule.content}
                    </p>
                  </div>
                </div>

                {/* Metadata Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-white/90 to-[#FFDCCC]/20 rounded-2xl p-6 border border-[#5D2A42]/10 shadow-lg">
                    <h3 className="text-lg font-semibold text-[#5D2A42] mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Timeline
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                        <span className="text-[#5D2A42]/70">Created</span>
                        <span className="font-medium text-[#5D2A42]">
                          {capsule.createdAt
                            ? new Date(capsule.createdAt).toLocaleDateString()
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                        <span className="text-[#5D2A42]/70">Unlocked</span>
                        <span className="font-medium text-[#5D2A42]">
                          {new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white/90 to-[#FCB1A6]/20 rounded-2xl p-6 border border-[#5D2A42]/10 shadow-lg">
                    <h3 className="text-lg font-semibold text-[#5D2A42] mb-4 flex items-center">
                      Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                        <span className="text-[#5D2A42]/70">Trigger Type</span>
                        <Badge className="bg-gradient-to-r from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] border-none capitalize">
                          {capsule.triggerType}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                        <span className="text-[#5D2A42]/70">Status</span>
                        <Badge className="bg-gradient-to-r from-[#FCB1A6] to-[#FB6376] text-white border-none">
                          Unlocked
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Toggle Button */}
                <div className="text-center pt-4">
                  <Button
                    onClick={toggleLetterView}
                    variant="outline"
                    className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC] backdrop-blur-sm bg-white/80"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Switch to Letter View
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CapsuleDetail;
