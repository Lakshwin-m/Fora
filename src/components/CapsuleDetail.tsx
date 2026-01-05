import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { getAuth } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MediaRenderer from "@/components/MediaRenderer";
import {
  Clock,
  Calendar,
  Users,
  User,
  Lock,
  Unlock,
  ArrowLeft,
  Mail,
  Feather,
  Stamp,
  BookOpen,
  MapPin,
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
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find the capsule in both sent and received capsules
  const capsule = [...capsules, ...receivedCapsules].find((c) => c.id === id);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  // Fetch signature from capsule if it exists
  useEffect(() => {
    if (!capsule) return;

    console.log("Capsule object from context:", capsule);
    console.log("Has signature property?", "signature" in capsule);
    console.log("Signature value:", (capsule as any).signature);

    // Check if signature exists in the capsule object from context
    if ((capsule as any).signature) {
      setSignatureData((capsule as any).signature);
    } else {
      // If not in context, you might need to fetch it separately
      // This depends on how your context loads capsules
      console.warn("Signature not found in capsule context object");

      // Try to extract signature from nested properties
      const capsuleAny = capsule as any;
      const possibleSignature =
        capsuleAny.signatureData ||
        capsuleAny.signature ||
        capsuleAny.sealSignature ||
        capsuleAny.signedData;

      if (possibleSignature) {
        setSignatureData(possibleSignature);
      }
    }
  }, [capsule]);

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
      toast({
        title: "Capsule Unlocked! 🎉",
        description: "You can now view the contents of this time capsule.",
      });
    }
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
  const hasSignature = !!signatureData;
  const hasMedia =
    Array.isArray((capsule as any)?.attachments) &&
    (capsule as any).attachments.length > 0;

  // Paper texture SVG data URL (properly escaped)
  const paperTexture = `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%238B5A2B' fill-opacity='0.05'/%3E%3C/svg%3E`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EBDC] via-[#F0E6D2] to-[#E8DEC9]">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-[#D4B59E]/30 text-[#5D2A42] border border-[#5D2A42]/30 backdrop-blur-sm bg-white/70 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#5D2A42]">
                {capsule.title}
              </h1>
              <p className="text-[#5D2A42]/70 flex items-center text-sm">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {new Date(capsule.deliveryDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {isUnlocked && (
            <Badge className="bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] text-white border-none px-3 py-1.5 shadow-sm">
              <Unlock className="w-3.5 h-3.5 mr-1.5" />
              Unlocked
            </Badge>
          )}
        </div>

        {/* Locked State */}
        {!isUnlocked && timeRemaining && (
          <div className="text-center py-12">
            <div className="relative">
              <div className="absolute inset-0 blur-sm opacity-60">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-gradient-to-br from-[#F5EBDC] to-[#E8DEC9] p-12 rounded-2xl border-2 border-[#8B5A2B]/20">
                    {/* Simulated paper lines */}
                    <div className="space-y-8">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className="h-px bg-gradient-to-r from-transparent via-[#8B5A2B]/10 to-transparent"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border-2 border-[#8B5A2B]/20 max-w-2xl mx-auto">
                  <div className="relative">
                    <Lock className="w-20 h-20 text-[#8B5A2B] mx-auto mb-8 drop-shadow-lg" />
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#D4B59E] rounded-full animate-pulse shadow-lg"></div>
                  </div>
                  <h3 className="text-3xl font-bold text-[#5D2A42] mb-4">
                    Capsule Sealed
                  </h3>
                  <p className="text-[#5D2A42]/80 mb-8 text-lg">
                    This time capsule will unlock in:
                  </p>
                  <div className="bg-gradient-to-br from-[#D4B59E] to-[#8B5A2B] rounded-2xl p-8 border-2 border-[#8B5A2B]/30 shadow-inner mb-8">
                    <div className="text-4xl font-serif font-bold text-white tracking-tight">
                      {formatTimeRemaining(timeRemaining)}
                    </div>
                  </div>
                  <p className="text-[#5D2A42]/70 text-sm">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Unlocks on {new Date(capsule.deliveryDate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unlocked State - Old Paper Letter */}
        {isUnlocked && (
          <div className="space-y-8">
            {/* Vintage Paper Container */}
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                {/* Paper Shadow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[#8B5A2B]/20 to-transparent blur-xl rounded-3xl"></div>

                {/* Main Paper */}
                <div className="relative bg-gradient-to-br from-[#F5EBDC] via-[#F0E6D2] to-[#E8DEC9] rounded-2xl p-8 md:p-12 shadow-2xl border-2 border-[#8B5A2B]/30 overflow-hidden">
                  {/* Paper Texture Overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: `url("${paperTexture}")` }}
                  ></div>

                  {/* Decorative Corners */}
                  <div className="absolute top-0 left-0 w-16 h-16">
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#8B5A2B]/40 rounded-tl-lg"></div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16">
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#8B5A2B]/40 rounded-tr-lg"></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-16 h-16">
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#8B5A2B]/40 rounded-bl-lg"></div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-16 h-16">
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#8B5A2B]/40 rounded-br-lg"></div>
                  </div>

                  {/* Paper Writing Lines */}
                  <div className="absolute inset-0 pointer-events-none pt-20 pb-32 px-8 md:px-12">
                    <div className="h-full flex flex-col justify-between">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className="h-px bg-gradient-to-r from-transparent via-[#8B5A2B]/15 to-transparent"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Letter Content */}
                  <div className="relative z-10 font-serif">
                    {/* Letter Header */}
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center justify-center px-6 py-2 bg-gradient-to-r from-[#D4B59E]/40 to-[#8B5A2B]/20 rounded-full mb-6 border border-[#8B5A2B]/20">
                        <Feather className="w-4 h-4 text-[#8B5A2B] mr-2" />
                        <span className="text-sm font-medium text-[#5D2A42]/80 tracking-wide">
                          TIME CAPSULE LETTER
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-[#5D2A42] tracking-wider">
                        {capsule.title.toUpperCase()}
                      </h2>
                      <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-[#5D2A42]/70">
                        <div className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1.5" />
                          <span>Digital Archive</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          <span>
                            {new Date(
                              capsule.createdAt || new Date()
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Date and Address Block */}
                    <div className="mb-12">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[#5D2A42]/70 text-sm">
                            Date Written:
                          </p>
                          <p className="text-lg font-semibold text-[#5D2A42]">
                            {new Date(
                              capsule.createdAt || new Date()
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#5D2A42]/70 text-sm">To:</p>
                          <p className="text-lg font-semibold text-[#5D2A42]">
                            {isReceived
                              ? `${currentUser?.displayName || "Dear Friend"}`
                              : "My Future Self"}
                          </p>
                          <p className="text-sm text-[#5D2A42]/60">
                            Present Day
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Salutation */}
                    <div className="mb-8 ml-4">
                      <p className="text-xl text-[#5D2A42]">
                        {isReceived
                          ? `Dear ${
                              currentUser?.displayName?.split(" ")[0] ||
                              "Friend"
                            },`
                          : "Dear Future Me,"}
                      </p>
                    </div>

                    {/* Letter Body */}
                    <div className="space-y-8 mb-12">
                      {capsule.content
                        .split(/\n\s*\n/)
                        .filter((para) => para.trim())
                        .map((paragraph, index) => (
                          <div key={index} className="relative">
                            <p className="text-[#5D2A42] leading-relaxed text-lg tracking-wide pl-4">
                              {paragraph}
                            </p>
                          </div>
                        ))}
                    </div>
                    {/* Attached Media */}
                    {hasMedia && (
                      <div className="mt-16 mb-12">
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold text-[#5D2A42] flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-[#8B5A2B]" />
                            Attached Memories
                          </h3>
                          <p className="text-sm text-[#5D2A42]/60 mt-1">
                            Media preserved with this capsule
                          </p>
                        </div>

                        <div className="space-y-6">
                          {(capsule as any).attachments.map(
                            (attachment: any) => (
                              <div
                                key={attachment.id}
                                className="p-4 bg-white/60 rounded-xl border border-[#8B5A2B]/20 shadow-inner"
                              >
                                <MediaRenderer
                                  attachment={attachment}
                                  isUnlocked={isUnlocked}
                                  className="max-w-full"
                                />

                                <div className="mt-2 text-xs text-[#5D2A42]/60 flex items-center">
                                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                                  {attachment.name}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Closing Section */}
                    <div className="mt-16">
                      <div className="mb-8">
                        <p className="text-xl text-[#5D2A42] mb-2">
                          {isReceived ? "With warm regards," : "Sincerely,"}
                        </p>

                        {/* Signature Display */}
                        <div className="mt-8">
                          <p className="text-[#5D2A42]/70 text-sm mb-2">
                            Original Signature:
                          </p>
                          <div className="relative">
                            {/* Signature Canvas Display */}
                            {hasSignature && signatureData ? (
                              <div className="bg-white/80 rounded-lg p-4 border border-[#8B5A2B]/20 shadow-inner">
                                <img
                                  src={signatureData}
                                  alt="Signature"
                                  className="max-w-xs h-auto"
                                  style={{
                                    filter: "sepia(0.3) contrast(1.1)",
                                    maxHeight: "120px",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Failed to load signature image"
                                    );
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="italic text-[#5D2A42]/50 text-sm p-4 bg-white/50 rounded-lg border border-[#8B5A2B]/20">
                                No signature was provided for this capsule
                              </div>
                            )}

                            {/* Signature Line */}
                            <div className="w-64 h-px bg-gradient-to-r from-[#8B5A2B] to-transparent mt-4"></div>
                          </div>
                        </div>

                        {/* Sender Info */}
                        <div className="mt-6">
                          <p className="text-lg font-semibold text-[#5D2A42]">
                            {isReceived
                              ? capsule.username || "A friend from your past"
                              : "Your past self"}
                          </p>
                          <p className="text-sm text-[#5D2A42]/60">
                            {capsule.createdAt
                              ? new Date(capsule.createdAt).getFullYear()
                              : "The Past"}
                          </p>
                        </div>
                      </div>

                      {/* Decorative Seal */}
                      <div className="absolute bottom-8 right-8">
                        <div className="relative group">
                          <div className="w-20 h-20 bg-gradient-to-br from-[#8B5A2B] to-[#5D2A42] rounded-full flex items-center justify-center shadow-xl border-4 border-[#F5EBDC] transform group-hover:scale-110 transition-transform duration-300">
                            <Stamp className="w-10 h-10 text-[#F5EBDC]" />
                          </div>
                          <div className="absolute inset-0 animate-ping opacity-10">
                            <div className="w-full h-full bg-[#8B5A2B] rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Travel Note */}
                    <div className="mt-20 pt-6 border-t border-[#8B5A2B]/20">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-[#8B5A2B]/60" />
                        <div>
                          <p className="text-sm text-[#8B5A2B]/70 italic">
                            This letter traveled through time for{" "}
                            {(() => {
                              const created = new Date(
                                capsule.createdAt || new Date()
                              );
                              const delivered = new Date();
                              const diffYears =
                                delivered.getFullYear() - created.getFullYear();
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
                            to reach you today.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapsuleDetail;
