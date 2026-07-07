// src/components/CapsuleDetail.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { getAuth } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
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
  Loader2,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 🔐 IMPORT DECRYPTION HOOK
import { useCapsuleDecryption } from "@/hooks/useCapsuleDecryption";
import { parseFirebaseDate, formatFirebaseDate } from "@/lib/date";
import { WaxSeal } from "@/components/WaxSeal";

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
  const { capsules, receivedCapsules, markCapsuleAsOpened, serverNow } = useCapsules();
  const [currentTime, setCurrentTime] = useState(serverNow());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [interactionStep, setInteractionStep] = useState(0);
  const [showOpeningSequence, setShowOpeningSequence] = useState(false);
  const [isHoveringLockedLetter, setIsHoveringLockedLetter] = useState(false);
  // Find the capsule in both sent and received capsules
  const capsule = [...capsules, ...receivedCapsules].find((c) => c.id === id);

  // 🔐 DECRYPT CAPSULE CONTENT
  const { decryptCapsule } = useCapsuleDecryption();
  const [decryptedTitle,   setDecryptedTitle]   = useState<string>("");
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [isDecrypting,     setIsDecrypting]     = useState(false);

  // Run decryption whenever the capsule changes
  useEffect(() => {
    if (!capsule) {
      setDecryptedTitle("");
      setDecryptedContent("");
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    decryptCapsule(capsule).then(({ title, content }) => {
      if (!cancelled) {
        setDecryptedTitle(title);
        setDecryptedContent(content);
        setIsDecrypting(false);
      }
    });

    return () => { cancelled = true; };
  }, [
    capsule?.id,
    capsule?.version,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (capsule as any)?.encryptedTitle,
    (capsule as any)?.encryptedContent,
  ]);

  const decodeHTML = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const content = decryptedContent ? decodeHTML(decryptedContent) : "";
  const title   = decryptedTitle   ? decodeHTML(decryptedTitle)   : "";

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
    if ((capsule as any).signature) {
      setSignatureData((capsule as any).signature);
    } else {
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
      setCurrentTime(serverNow());
    }, 1000);
    return () => clearInterval(timer);
  }, [serverNow]);

  // Calculate unlock status and time remaining
  useEffect(() => {
    if (!capsule) return;
    const unlockDate = parseFirebaseDate(capsule.deliveryDate || capsule.unlockDate);
    if (!unlockDate) return;

    const deliveryTime = unlockDate.getTime();
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
      years, months: months % 12, days: days % 30,
      hours: hours % 24, minutes: minutes % 60, seconds: seconds % 60, totalMs: diff,
    });
  };

  const formatTimeRemaining = (time: TimeRemaining): string => {
    if (time.years > 0) return `${time.years}y ${time.months}m ${time.days}d ${time.hours}h`;
    else if (time.months > 0) return `${time.months}m ${time.days}d ${time.hours}h ${time.minutes}m`;
    else if (time.days > 0) return `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`;
    else return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };

  const formatLargestRemainingUnit = (time: TimeRemaining): string => {
  if (time.years > 0) {
    return `${time.years} ${time.years === 1 ? "Year" : "Years"} Left`;
  }
  if (time.months > 0) {
    return `${time.months} ${time.months === 1 ? "Month" : "Months"} Left`;
  }
  if (time.days > 0) {
    return `${time.days} ${time.days === 1 ? "Day" : "Days"} Left`;
  }
  if (time.hours > 0) {
    return `${time.hours} ${time.hours === 1 ? "Hour" : "Hours"} Left`;
  }
  if (time.minutes > 0) {
    return time.minutes === 1
      ? "1 Minute Left"
      : `${time.minutes} minutes Left`;
  }
  return `${time.seconds} seconds Left`;
};

  if (!capsule) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#5D2A42] mb-4">Capsule Not Found</h1>
            <Button onClick={() => navigate("/dashboard")} className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isReceived = receivedCapsules.some((c) => c.id === capsule.id);
  const hasSignature = !!signatureData;
  const hasMedia = Array.isArray((capsule as any)?.attachments) && (capsule as any).attachments.length > 0;

  // 🔐 Show loading state while decrypting
  if (isDecrypting) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#8B5A2B]" />
            <p className="text-xl text-[#5D2A42] font-semibold">Decrypting your capsule...</p>
            <p className="text-sm text-[#5D2A42]/60">Unlocking memories from the past</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard")}
          className="mb-8 text-[#5D2A42] hover:bg-[#FFDCCC]/30 relative z-50 rounded-full bg-white/50 backdrop-blur-md shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Locked State: Original robust countdown */}
        {!isUnlocked && timeRemaining && (
  <div className="text-center py-12">
    <div className="mx-auto max-w-2xl">
      <div
        className="relative overflow-hidden rounded-[36px] border border-[#8B5A2B]/15 bg-[#FFF9EC] p-8 shadow-[0_30px_80px_rgba(141,90,43,0.18)] transition-all duration-300 hover:-translate-y-1"
        onMouseEnter={() => setIsHoveringLockedLetter(true)}
        onMouseLeave={() => setIsHoveringLockedLetter(false)}
      >
        <div className="absolute inset-x-8 top-8 h-24 rounded-b-[40px] bg-[#F4E0C5]/60 blur-xl" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-[#F6E0C1] via-[#FFFFFF] to-[#D9B58E] opacity-80 blur-xl" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[#8B5A2B]/20 bg-[#FFF5E8] shadow-[0_18px_45px_rgba(141,90,43,0.18)]">
              <Lock className="h-12 w-12 text-[#8B5A2B]" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl font-semibold tracking-tight text-[#5D2A42]">
              Capsule Sealed
            </h3>
            <p className="text-base text-[#5D2A42]/80">
              Hover the letter to reveal remaining wait time.
            </p>
          </div>

          <div className="grid w-full gap-4 rounded-[28px] border border-[#8B5A2B]/10 bg-white/90 p-6 text-left shadow-inner">
            <div className="flex items-center justify-between text-sm text-[#5D2A42]/70">
              <span className="font-medium">Unlock date</span>
              <span>{formatFirebaseDate(capsule.deliveryDate || capsule.unlockDate, "PPP p")}</span>
            </div>
            <div className="rounded-[24px] border border-[#8B5A2B]/10 bg-[#FFF4E7] p-5 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8B5A2B]/70">
                Sealed letter
              </p>
              <p className="mt-3 text-xl font-semibold text-[#5D2A42]">
                Hover to reveal
              </p>
            </div>
          </div>
        </div>

        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#5D2A42]/10 transition-opacity duration-300 ${
            isHoveringLockedLetter ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="mx-auto w-[88%] rounded-[30px] border border-[#8B5A2B]/15 bg-white/90 p-6 shadow-[0_30px_60px_rgba(93,42,66,0.18)] backdrop-blur-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-[#8B5A2B]/60">
              Time until unlock
            </p>
            <p className="mt-3 text-2xl font-semibold text-[#5D2A42]">
              {formatLargestRemainingUnit(timeRemaining)}
            </p>
            <p className="mt-2 text-sm text-[#5D2A42]/70">
              Countdown updates live while hovered.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

        {/* Unlocked State: Interactive Animation */}
        {isUnlocked && (
          <AnimatePresence mode="wait">
            {interactionStep === 0 && (
              <motion.div 
                key="closed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="relative max-w-sm mx-auto aspect-square cursor-pointer hover:-translate-y-2 transition-transform duration-300 mt-12"
                onClick={() => {
                  setInteractionStep(1);
                  if (isReceived && capsule.status !== "opened") {
                    markCapsuleAsOpened(capsule.id);
                  }
                }}
              >
                <img src="/letter_cover-4fCnauP6.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xl" alt="Sealed Envelope" />
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-12 pt-4">
                  <div className="rotate-[0deg] flex flex-col items-center max-w-[85%] mt-4">
                    <span className="text-[14px] text-[#5D2A42]/90 font-serif italic mb-1 tracking-tight">open when...</span>
                    <h3 className="text-xl font-bold text-[#1A1A1A]/80 font-serif tracking-tight leading-snug line-clamp-3 mb-4">
                      {title || "Untitled Capsule"}
                    </h3>
                    <WaxSeal name={capsule.creatorName || capsule.username || "Forá"} className="w-14 h-14 text-[8px] pointer-events-none" />
                  </div>
                </div>
                <div className="absolute bottom-[-50px] left-0 right-0 text-center text-[#5D2A42]/60 animate-pulse text-sm font-medium">
                  Click to open envelope
                </div>
              </motion.div>
            )}

                           {interactionStep === 1 && (
              <motion.div 
                key="open"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="relative max-w-sm mx-auto aspect-square cursor-pointer hover:-translate-y-2 transition-transform duration-300 mt-12"
                onClick={() => setInteractionStep(2)}
              >
                {/* Envelope with open flap */}
                <img 
                  src="/open_envelope-eMfrWOgA.png" 
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xl" 
                  alt="Open Envelope" 
                />
                
                {/* Wax Seal fading faster on the spot */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.05, ease: "easeInOut" }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  <WaxSeal 
                    name={capsule.creatorName || capsule.username || "Forá"} 
                    className="w-14 h-14 text-[8px]" 
                  />
                </motion.div>

                {/* Letter paper popping up from inside the envelope (trapezium: wide top, narrow bottom) */}
                <motion.div 
                  initial={{ y: 30, scale: 0.85, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
                  className="absolute z-10 text-center text-[#5D2A42] rounded-lg bg-[#EBE4D5] shadow-md border border-[#D5CBB5] p-6 flex flex-col items-center justify-start"
                  style={{ 
                    left: "10%",
                    top: "40%",
                    transform: "translate(-50%, -50%)",
                    width: "80%",
                    height: "105px",
                    backgroundImage: "url('/canvas-background-BYlUkw-J.png')", 
                    backgroundSize: "cover",
                    clipPath: "polygon(0% 0%, 100% 0%, 67% 100%, 33% 100%)"
                  }}
                >
                  {/* Title only - no content preview */}
                  <h3 className="font-bold text-[16px] leading-tight w-full font-serif text-[#5D2A42] line-clamp-2">
                    {title || "Untitled Capsule"}
                  </h3>
                </motion.div>

                {/* Help Text */}
                <div className="absolute bottom-[-50px] left-0 right-0 text-center text-[#5D2A42]/60 animate-pulse text-sm font-medium">
                  Click to pull out letter
                </div>
              </motion.div>
            )}
            {interactionStep === 2 && (
              <motion.div 
                key="letter"
                initial={{ opacity: 0, y: 150 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 22, stiffness: 90 }}
                className="w-full max-w-3xl mx-auto flex flex-col items-center pb-20 mt-12"
              >
                <div className="w-full relative rounded-xl overflow-hidden shadow-2xl bg-[#EBE4D5]">
                  <div 
                    className="w-full relative min-h-[800px] p-8 md:p-16"
                    style={{
                      backgroundImage: "url('/canvas-background-BYlUkw-J.png')",
                      backgroundSize: "cover",
                      backgroundRepeat: "repeat-y",
                      backgroundPosition: "top center"
                    }}
                  >
                    <div className="max-w-xl mx-auto space-y-8 relative z-10 font-serif text-[#5D2A42]">
                       <div className="text-center mb-10 pt-4">
                         <Badge variant="outline" className="border-[#5D2A42]/30 text-[#5D2A42] bg-[#EBE4D5]/60 mb-6 px-4 py-1.5 uppercase text-xs tracking-widest backdrop-blur-sm shadow-sm">
                           <FileText className="w-3 h-3 mr-2 inline" /> TIME CAPSULE LETTER
                         </Badge>
                         <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-widest mb-6 text-[#5D2A42]">
                           {title || "Untitled"}
                         </h1>
                         <div className="flex items-center justify-center space-x-6 text-sm text-[#5D2A42]/80">
                           <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {formatFirebaseDate(capsule.createdAt || new Date())}</div>
                         </div>
                       </div>

                       <hr className="border-[#5D2A42]/10 my-8 shadow-sm" />

                       <div className="flex justify-between items-start pt-2">
                         <div>
                           <span className="text-xs text-[#5D2A42]/60 block mb-1">Date Written:</span>
                           <span className="font-semibold text-lg">{formatFirebaseDate(capsule.createdAt || new Date(), "MMMM do, yyyy")}</span>
                         </div>
                         <div className="text-right">
                           <span className="text-xs text-[#5D2A42]/60 block mb-1">To:</span>
                           <span className="font-semibold text-lg">
                             {capsule.recipientType === "self" 
                                ? "My Future Self" 
                                : capsule.recipientType === "friends" 
                                  ? (capsule.recipientNames && capsule.recipientNames.length > 0 ? capsule.recipientNames.join(', ') : "My Connections")
                                  : capsule.recipientType === "public"
                                    ? "The World"
                                    : "My Future Self"}
                           </span>
                           <div className="text-xs text-[#5D2A42]/60 mt-1">Present Day</div>
                         </div>
                       </div>

                        {/* 📖 DIARY LEAF WRAPPER WITH MARGINAL HOLES */}
  <div 
    className="relative pt-8 pb-4 pl-16 pr-4 text-lg md:text-xl tracking-wide font-serif text-[#5D2A42]"
    style={{
      lineHeight: "2.5rem", 
      backgroundImage: "linear-gradient(to bottom, transparent 0px, transparent 14px, #1A1A1A 14px, #1A1A1A 26px, transparent 26px, transparent 40px)",
      // 👇 Limits width to 12px so it forms squares, not stretched lines
      backgroundSize: "12px 2.5rem",
      backgroundPosition: "16px 0",
      backgroundRepeat: "repeat-y"
    }}
  >
    {/* A vertical binding wire line right next to the holes for a realistic look */}
    <div className="absolute left-[36px] top-0 bottom-0 w-[1px] bg-[#5D2A42]/15" />

    <p className="mb-4">Dear {isReceived ? (currentUser?.displayName?.split(" ")[0] || "Friend") : "Future Me"},</p>
    
    {/<[a-z][\s\S]*>/i.test(content) ? (
      <div
        className="prose prose-lg max-w-none text-[#5D2A42] tracking-wide prose-p:my-0 prose-p:leading-[2.5rem] prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6 prose-li:leading-[2.5rem] prose-strong:text-inherit prose-em:text-inherit"
        style={{ lineHeight: "2.5rem" }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    ) : (
      <div className="whitespace-pre-wrap">
        {(content || "")
          .split(/\n\s*\n/)
          .filter((p: string) => p.trim())
          .map((para: string, i: number) => (
            <p key={i} className="mb-0 leading-[2.5rem]">
              {para}
            </p>
          ))}
      </div>
    )}
    
    <p className="mt-8 mb-0 leading-[2.5rem]">Sincerely,</p>
  </div>

                       <div className="pt-6">
                         <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/60 p-6 min-h-[140px] max-w-sm flex items-center justify-center shadow-sm">
                           {hasSignature && signatureData ? (
                             <img src={signatureData} className="max-h-[100px] object-contain opacity-90 mix-blend-multiply" alt="Signature" />
                           ) : (
                             <span className="font-signature text-xl opacity-70 italic">{capsule.creatorName || capsule.username}</span>
                           )}
                         </div>
                       </div>

                       <div className="pt-6">
                         <p className="font-bold text-xl text-[#5D2A42]">{capsule.creatorName || capsule.username || "Your past self"}</p>
                       </div>

                       {hasMedia && (
                          <div className="mt-12 mb-8 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 p-6 shadow-sm">
                            <div className="space-y-4">
                              {(capsule as any).attachments.map((attachment: any) => (
                                <MediaRenderer key={attachment.id} attachment={attachment} isUnlocked={isUnlocked} className="w-full rounded-lg" />
                              ))}
                            </div>
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default CapsuleDetail;