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

  // Find the capsule in both sent and received capsules
  const capsule = [...capsules, ...receivedCapsules].find((c) => c.id === id);

  // 🔐 DECRYPT CAPSULE CONTENT
  const { title: decryptedTitle, content: rawContent, isDecrypting } = useCapsuleDecryption(capsule);

  const decodeHTML = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const content = rawContent ? decodeHTML(rawContent) : "";
  const title = decryptedTitle ? decodeHTML(decryptedTitle) : "";

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
            <div className="relative">
              <div className="relative z-10">
                <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-12 shadow-2xl max-w-2xl mx-auto">
                  <div className="relative">
                    <Lock className="w-20 h-20 text-[#8B5A2B] mx-auto mb-8 drop-shadow-lg" />
                  </div>
                  <h3 className="text-3xl font-bold text-[#5D2A42] mb-4">Capsule Sealed</h3>
                  <p className="text-[#5D2A42]/80 mb-8 text-lg">This time capsule will unlock in:</p>
                  <div className="bg-gradient-to-br from-[#D4B59E] to-[#8B5A2B] rounded-2xl p-8 shadow-inner mb-8">
                    <div className="text-4xl font-serif font-bold text-white tracking-tight">
                      {formatTimeRemaining(timeRemaining)}
                    </div>
                  </div>
                  <p className="text-[#5D2A42]/70 text-sm">
                    Unlocks on {formatFirebaseDate(capsule.deliveryDate || capsule.unlockDate, "PPP p")}
                  </p>
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
                onClick={() => setInteractionStep(1)}
              >
                <img src="/letter_cover-4fCnauP6.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xl" alt="Sealed Envelope" />
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-12 pt-4">
                  <div className="rotate-[0deg] flex flex-col items-center max-w-[85%] mt-4">
                    <span className="text-[14px] text-[#5D2A42]/90 font-serif italic mb-1 tracking-tight">open when...</span>
                    <h3 className="text-xl font-bold text-[#1A1A1A]/80 font-serif tracking-tight leading-snug line-clamp-3">
                      {title || "Untitled Capsule"}
                    </h3>
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
                <img src="/open_envelope-eMfrWOgA.png" className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-xl" alt="Open Envelope" />
                <div className="absolute top-[32%] left-[22%] right-[22%] h-[35%] flex flex-col items-center justify-start z-10 text-center text-[#1A1A1A] overflow-hidden pt-2">
                   <h3 className="font-bold text-[15px] leading-tight w-full font-serif mb-1 line-clamp-2 text-[#5D2A42]">
                     {title || "Untitled Capsule"}
                   </h3>
                    <div className="text-[11px] text-[#1A1A1A]/80 line-clamp-3 leading-snug w-full px-1">
                      {content ? (() => { const tmp = document.createElement("div"); tmp.innerHTML = content; return tmp.textContent || tmp.innerText || "..."; })() : "..."}
                    </div>
                </div>
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

                        <div className="pt-8 pb-4 space-y-6 text-lg md:text-xl leading-[2.5rem] tracking-wide relative">
                          <p>Dear {isReceived ? (currentUser?.displayName?.split(" ")[0] || "Friend") : "Future Me"},</p>
                          {/<[a-z][\s\S]*>/i.test(content) ? (
                            <div
                              className="prose prose-lg max-w-none text-[#5D2A42] leading-[2.5rem] tracking-wide prose-p:my-3 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6 prose-li:my-1 prose-img:rounded-xl prose-img:max-w-full prose-img:my-4 prose-strong:text-inherit prose-em:text-inherit"
                              dangerouslySetInnerHTML={{ __html: content }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap">{(content || "").split(/\n\s*\n/).filter((p: string) => p.trim()).map((para: string, i: number) => <p key={i} className="mb-4">{para}</p>)}</div>
                          )}
                          <p className="mt-8 text-xl">Sincerely,</p>
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