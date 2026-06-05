// src/pages/CapsuleDetailPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle,
  Archive,
  MapPin,
  Calendar,
  Clock,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCapsuleDetail,
  CapsuleWithLineage,
  likeCapsule,
  unlikeCapsule,
  subscribeToLikeUpdates,
} from "@/services/communityServices";
import CommentSection from "@/components/CommentSection";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getAuth } from "firebase/auth";

// 🔐 IMPORT DECRYPTION HOOK
import { useCapsuleDecryption } from "@/hooks/useCapsuleDecryption";
import { getPlainTextLength } from "@/components/ui/rich-text-editor";

const CapsuleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const auth = getAuth();

  const [capsule, setCapsule] = useState<CapsuleWithLineage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResharing, setIsResharing] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  
  // Animation state: 0 = closed, 1 = open, 2 = letter revealed
  const [interactionStep, setInteractionStep] = useState(0);

  // 🔐 USE DECRYPTION HOOK
  const { 
    title: decryptedTitle, 
    content: rawDecryptedContent, 
    isDecrypting 
  } = useCapsuleDecryption(capsule);

  const decodeHTML = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const decryptedContent = rawDecryptedContent ? decodeHTML(rawDecryptedContent) : "";

  // 🔐 DECRYPT ORIGINAL CAPSULE (for reshares)
  const {
    title: originalDecryptedTitle,
    content: rawOriginalContent,
    isDecrypting: isDecryptingOriginal,
  } = useCapsuleDecryption(capsule?.originalCapsule || null);

  const originalDecryptedContent = rawOriginalContent ? decodeHTML(rawOriginalContent) : "";

  useEffect(() => {
    const loadCapsule = async () => {
      if (!id) return;

      try {
        console.log("📦 Loading capsule:", id);
        const data = await getCapsuleDetail(id);
        
        if (!data) {
          console.error("❌ Capsule not found");
          setLoading(false);
          return;
        }

        setCapsule(data);
        setLikeCount(data?.likeCount || 0);

        if (auth.currentUser) {
          const hasUserLiked = data?.likedBy?.includes(auth.currentUser.uid);
          setHasLiked(hasUserLiked || false);
        }

        setLoading(false);

        const unsubscribe = subscribeToLikeUpdates(id, (count) => setLikeCount(count));
        return unsubscribe;
      } catch (err) {
        console.error("❌ Error loading capsule:", err);
        setLoading(false);
      }
    };

    loadCapsule();
  }, [id, auth]);

  const handleReshare = async () => {
    if (!capsule || !user) return;
    setIsResharing(true);
    try {
      navigate("/create", {
        state: {
          reshareFrom: {
            capsuleId: capsule.id,
            title: decryptedTitle,
            content: decryptedContent,
            creatorName: capsule.creatorName,
          },
        },
      });
    } catch (error) {
      console.error("Error resharing:", error);
    } finally {
      setIsResharing(false);
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser) {
      alert("Please log in to like capsules");
      return;
    }
    if (!id) return;
    setIsLiking(true);
    try {
      if (hasLiked) {
        await unlikeCapsule(id, auth.currentUser.uid);
        setHasLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await likeCapsule(id, auth.currentUser.uid);
        setHasLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      alert("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  if (loading || isDecrypting) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
          <p className="text-[#5D2A42]/60">
            {loading ? "Loading capsule..." : "Decrypting content..."}
          </p>
        </div>
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/community")}
            className="mb-4 text-[#5D2A42]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Archive
          </Button>
          <div className="text-center py-16">
            <Archive className="w-16 h-16 mx-auto mb-4 text-[#5D2A42]/30" />
            <h3 className="text-lg font-semibold text-[#5D2A42]">
              Capsule not found
            </h3>
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
          onClick={() => navigate(-1)}
          className="mb-8 text-[#5D2A42] hover:bg-[#FFDCCC]/30 relative z-50 rounded-full bg-white/50 backdrop-blur-md shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

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
                    {decryptedTitle || "Untitled Capsule"}
                  </h3>
                </div>
              </div>
              <div className="absolute bottom-[-50px] left-0 right-0 text-center text-[#5D2A42]/60 animate-bounce text-sm font-medium">
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
                   {decryptedTitle || "Untitled Capsule"}
                 </h3>
                 <div className="text-[11px] text-[#1A1A1A]/80 line-clamp-3 leading-snug w-full px-1">
                   {decryptedContent ? (() => { const tmp = document.createElement("div"); tmp.innerHTML = decryptedContent; return tmp.textContent || tmp.innerText || "..."; })() : "..."}
                 </div>
              </div>
              <div className="absolute bottom-[-50px] left-0 right-0 text-center text-[#5D2A42]/60 animate-bounce text-sm font-medium">
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
              className="w-full max-w-3xl mx-auto flex flex-col items-center"
            >
              <div className="w-full relative rounded-xl overflow-hidden shadow-2xl bg-[#EBE4D5]">
                {/* The Paper background */}
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
                     {/* Header */}
                     <div className="text-center mb-10 pt-4">
                       <Badge variant="outline" className="border-[#5D2A42]/30 text-[#5D2A42] bg-[#EBE4D5]/60 mb-6 px-4 py-1.5 uppercase text-xs tracking-widest backdrop-blur-sm shadow-sm">
                         <FileText className="w-3 h-3 mr-2 inline" /> TIME CAPSULE LETTER
                       </Badge>
                       <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-widest mb-6 text-[#5D2A42]">
                         {decryptedTitle}
                       </h1>
                       <div className="flex items-center justify-center space-x-6 text-sm text-[#5D2A42]/80">
                         <div className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> Digital Archive</div>
                         <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {format(capsule.createdAt.toDate(), "dd MMM yyyy, hh:mm a")}</div>
                       </div>
                     </div>

                     <hr className="border-[#5D2A42]/10 my-8 shadow-sm" />

                     {/* Meta Dates/To */}
                     <div className="flex justify-between items-start pt-2">
                       <div>
                         <span className="text-xs text-[#5D2A42]/60 block mb-1">Date Written:</span>
                         <span className="font-semibold text-lg">{format(capsule.createdAt.toDate(), "MMMM do, yyyy")}</span>
                       </div>
                       <div className="text-right">
                         <span className="text-xs text-[#5D2A42]/60 block mb-1">To:</span>
                         <span className="font-semibold text-lg">{capsule.recipientType === "self" ? "My Future Self" : capsule.recipients?.join(", ") || "Unknown"}</span>
                         <div className="text-xs text-[#5D2A42]/60 mt-1">Present Day</div>
                       </div>
                     </div>

                     {/* Body Context - adjusting line-height for visual alignment with canvas */}
                     <div className="pt-8 pb-4 space-y-6 text-lg md:text-xl leading-[2.5rem] tracking-wide relative">
                       <p>Dear {capsule.recipientType === "self" ? "Future Me," : "Friend,"}</p>
                       <div
                         className="prose prose-lg max-w-none text-[#5D2A42] leading-[2.5rem] tracking-wide prose-p:my-3 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6 prose-li:my-1 prose-img:rounded-xl prose-img:max-w-full prose-img:my-4 prose-strong:text-inherit prose-em:text-inherit"
                         dangerouslySetInnerHTML={{ __html: decryptedContent || "" }}
                       />
                       <p className="mt-8">Sincerely,</p>
                     </div>

                     {/* Signature block */}
                     <div className="pt-8">
                       <span className="text-xs text-[#5D2A42]/60 block mb-3">Original Signature:</span>
                       <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/60 p-6 min-h-[140px] max-w-sm flex items-center justify-center shadow-sm">
                         {(capsule as any).signature ? (
                           <img 
                             src={(capsule as any).signature} 
                             className="max-h-[100px] object-contain opacity-90 mix-blend-multiply" 
                             alt="Signature" 
                           />
                         ) : (
                           <span className="font-signature text-4xl opacity-70 italic">{capsule.creatorName}</span>
                         )}
                       </div>
                     </div>

                     <div className="pt-10">
                       <h3 className="font-bold text-xl">{capsule.creatorName}</h3>
                       <p className="text-[#5D2A42]/60 text-sm">{format(capsule.createdAt.toDate(), "yyyy")}</p>
                     </div>

                     <hr className="border-[#5D2A42]/10 my-10" />

                     <div className="flex items-center justify-center text-sm italic text-[#5D2A42]/60 pb-8 tracking-wide">
                       <Clock className="w-4 h-4 mr-2" />
                       a short time to reach you today.
                     </div>
                  </div>
                </div>

                {/* Sub-Actions (Likes/Comments) underneath the letter */}
                <div className="bg-[#FFF9EC] p-8 md:p-10 border-t border-[#E8E8E8] rounded-b-xl space-y-8">
                  {/* Original capsule handling */}
                  {capsule.isReshare && capsule.originalCapsule && (
                    <div className="mb-6 p-4 bg-[#FFDCCC]/20 border border-[#FFDCCC]/50 rounded-xl relative">
                      <div className="absolute -top-3 left-4 bg-[#FFF9EC] px-2 text-xs font-semibold text-[#FB6376] uppercase tracking-wider">
                        Reshared Memory
                      </div>
                      {isDecryptingOriginal ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-[#FB6376]" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={capsule.originalCapsule.creatorPhoto} />
                              <AvatarFallback className="bg-[#FB6376] text-white text-xs">{getInitials(capsule.originalCapsule.creatorName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-[#5D2A42] text-sm">{capsule.originalCapsule.creatorName}</h4>
                              <p className="text-xs text-[#5D2A42]/60">{format(capsule.originalCapsule.createdAt.toDate(), "MMM dd, yyyy")}</p>
                            </div>
                          </div>
                          <h3 className="font-semibold text-[#5D2A42] line-clamp-1">{originalDecryptedTitle || "Untitled"}</h3>
                          <p className="text-sm text-[#5D2A42]/70 line-clamp-2">{originalDecryptedContent || "No context"}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-6">
                      <button
                        onClick={handleLike}
                        disabled={isLiking}
                        className="flex items-center space-x-2 text-[#5D2A42]/70 hover:text-[#FB6376] transition-colors disabled:opacity-50"
                      >
                        <Heart className={`w-6 h-6 ${hasLiked ? "fill-current text-[#FB6376]" : ""}`} />
                        <span className="font-medium text-lg">{likeCount}</span>
                      </button>
                      <div className="flex items-center space-x-2 text-[#5D2A42]/70">
                        <MessageCircle className="w-6 h-6" />
                        <span className="font-medium">Discuss</span>
                      </div>
                      {capsule.reshareCount > 0 && (
                        <div className="text-sm font-medium text-[#5D2A42]/60 bg-[#5D2A42]/5 px-3 py-1 rounded-full">
                          {capsule.reshareCount} reshares
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleReshare}
                      disabled={isResharing}
                      size="lg"
                      className="bg-[#FB6376] hover:bg-[#F04860] text-white shadow-md rounded-full px-8 h-12"
                    >
                      {isResharing ? (
                        <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Resharing</>
                      ) : (
                        <><Share2 className="w-5 h-5 mr-2" />Reshare Experience</>
                      )}
                    </Button>
                  </div>
                  
                  <div className="pt-6 border-t border-[#E8E8E8]">
                    <CommentSection capsuleId={id!} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CapsuleDetailPage;