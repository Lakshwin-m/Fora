// src/pages/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AnimatedStatsCard } from "@/components/ui/card-4";
import { parseFirebaseDate, formatFirebaseDate } from "@/lib/date";
import { AwardBadge } from "@/components/ui/award-badge";
import {
  Clock,
  Calendar,
  Users,
  Send,
  Inbox,
  Loader2,
  Timer,
  Lock,
  Unlock,
  Trash2,
  Plus,
  EyeOff,
  ChevronRight,
  Mail,
  Heart,
  Camera,
  Music,
  MapPin,
  Brain,
  Gift,
  FileText,
  Video,
  Mic,
  File,
  CheckCircle,
} from "lucide-react";
import gsap from "gsap";

// 🔐 IMPORT DECRYPTION HOOK
import { useCapsuleDecryption } from "@/hooks/useCapsuleDecryption";
import { usePlan } from "@/hooks/usePlan";
import AnimatedNumberCountdown from "@/components/ui/countdown-number";

/* ===================== TYPES ===================== */

interface Attachment {
  type?: string;
  url?: string;
}

interface Capsule {
  id: string;
  title?: string;
  titleIv?: string;
  content?: string;
  contentIv?: string;
  unlockDate?: any;
  createdAt?: any;
  triggerType?: string;
  recipientType?: string;
  recipients?: string[];
  recipientNames?: string[];
  visibility?: string;
  status?: string;
  isUnlocked?: boolean;
  attachments?: Attachment[];
  username?: string;
  deliveryDate?: any;
}

interface CapsuleCardProps {
  capsule: Capsule;
  isReceived?: boolean;
  currentTime: Date;
}

/* ===================== ERROR BOUNDARY ===================== */

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#FFF9EC]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ===================== ICON HELPERS ===================== */

const getContentIcon = (capsule: Capsule, content?: string) => {
  const contentText = (content || "").toLowerCase();
  const mediaType = capsule.attachments?.[0]?.type || "text";

  switch (mediaType) {
    case "image":
      return Camera;
    case "video":
      return Video;
    case "audio":
      return Mic;
    case "document":
      return File;
    default:
      if (contentText.includes("love") || contentText.includes("heart")) return Heart;
      if (contentText.includes("travel") || contentText.includes("trip")) return MapPin;
      if (contentText.includes("music") || contentText.includes("song")) return Music;
      if (contentText.includes("memory")) return Brain;
      return FileText;
  }
};

const getTriggerIcon = (triggerType?: string) => {
  switch (triggerType) {
    case "time":
      return Clock;
    case "event":
      return Calendar;
    case "location":
      return MapPin;
    case "milestone":
      return CheckCircle;
    default:
      return Clock;
  }
};

/* ===================== DATE HELPERS ===================== */

const getCountdown = (unlockDate: any, now: Date) => {
  const date = parseFirebaseDate(unlockDate);
  if (!date) return "Invalid date";
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return "Ready to open";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/* ===================== CAPSULE CARD ===================== */

const CapsuleCard: React.FC<CapsuleCardProps> = ({
  capsule,
  isReceived,
  currentTime,
}) => {
  const navigate = useNavigate();
  const { deleteCapsule } = useCapsules();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 🔐 DECRYPT CAPSULE CONTENT
  const { title, content, isDecrypting } = useCapsuleDecryption(capsule);

  const unlockDate =
    parseFirebaseDate(capsule.unlockDate || capsule.deliveryDate) ?? new Date(0);
  const isUnlocked =
    unlockDate.getTime() <= currentTime.getTime() || capsule.isUnlocked;
  const isSentToSelf = capsule.recipientType === "self";
  const countdown = getCountdown(capsule.unlockDate || capsule.deliveryDate, currentTime);

  // Use decrypted content for icon selection
  const ContentIcon = getContentIcon(capsule, content);
  const TriggerIcon = getTriggerIcon(capsule.triggerType);

  const handleCapsuleClick = () => {
    if (isDialogOpen) return;

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        scale: 0.97,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          navigate(`/capsule/${capsule.id}`);
        },
      });
    } else {
      navigate(`/capsule/${capsule.id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteCapsule(capsule.id);
      toast({
        title: "Capsule deleted",
        description: "The capsule has been permanently removed.",
      });
    } catch (error) {
      console.error("Error deleting capsule:", error);
      toast({
        title: "Error",
        description: "Failed to delete capsule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div ref={cardRef} className="group relative w-full h-[320px] max-w-sm mx-auto flex flex-col items-center justify-center p-2">
      <div 
        className="relative w-full h-full transition-transform duration-300 group-hover:-translate-y-2 cursor-pointer flex items-center justify-center"
        onClick={handleCapsuleClick}
      >
        {isUnlocked ? (
          // UNLOCKED STATE (OPEN ENVELOPE)
          <>
            <img 
              src="/open_envelope-eMfrWOgA.png" 
              alt="Opened Envelope" 
              className="absolute inset-0 w-full h-full object-contain drop-shadow-sm pointer-events-none"
            />
            {/* The letter area inside the open envelope. */}
            <div className="absolute top-[32%] left-[22%] right-[22%] h-[35%] flex flex-col items-center justify-start z-10 text-center text-[#1A1A1A] overflow-hidden pt-2">
               {isDecrypting ? (
                 <Loader2 className="w-5 h-5 animate-spin text-[#FB6376] mt-4" />
               ) : (
                 <>
                   <h3 className="font-bold text-[13px] sm:text-[15px] leading-tight w-full font-serif mb-1 line-clamp-2 text-[#5D2A42]">
                     {title || "Untitled Capsule"}
                   </h3>
                   <div className="text-[10px] sm:text-[11px] text-[#1A1A1A]/80 line-clamp-3 leading-snug w-full px-1">
                     {content || "No message inside."}
                   </div>
                 </>
               )}
            </div>
            {/* Status Indicator */}
            <div className="absolute bottom-[20%] left-0 right-0 flex justify-center z-10">
              <Badge variant="outline" className="bg-[#FFF9EC]/90 backdrop-blur-md border-[#E8E8E8] text-[#5D2A42] text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                Opened {formatFirebaseDate(capsule.unlockDate || capsule.deliveryDate)}
              </Badge>
            </div>
          </>
        ) : (
          // LOCKED STATE (CLOSED ENVELOPE)
          <>
            <img 
              src="/letter_cover-4fCnauP6.png" 
              alt="Sealed Envelope" 
              className="absolute inset-0 w-full h-full object-contain drop-shadow-sm pointer-events-none"
            />
            {/* Center text on closed envelope */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-12 pt-4">
              <div className="rotate-[0deg] flex flex-col items-center max-w-[85%] mt-4">
                <span className="text-[12px] md:text-[14px] text-[#5D2A42]/90 font-serif italic mb-1 tracking-tight">
                  open when...
                </span>
                <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A]/80 text-balance font-serif tracking-tight leading-snug line-clamp-3">
                  {isDecrypting ? (
                     <Loader2 className="w-5 h-5 animate-spin text-[#5D2A42]" />
                   ) : (
                     title || "you are down"
                   )}
                </h3>
              </div>
            </div>
            {/* Countdown Meta */}
            <div className="absolute bottom-[22%] left-0 right-0 flex justify-center z-10">
               <Badge className="bg-[#1A1A1A]/80 hover:bg-[#1A1A1A] text-white text-[10px] px-3 py-1 rounded-full border-none shadow-sm flex items-center gap-1.5 backdrop-blur-md">
                 <Lock className="w-3 h-3" />
                 <span className="font-medium tracking-wide">{countdown}</span>
               </Badge>
            </div>
          </>
        )}

        {/* Delete Action (only if not received) */}
        {!isReceived && (
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 sm:top-6 sm:right-6 h-8 w-8 rounded-full bg-white/95 border border-[#E8E8E8] text-[#FB6376] opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:bg-[#FB6376] hover:text-white z-50 hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Capsule?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{title || "this capsule"}" and all its contents.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3 justify-end mt-4">
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-[#FB6376] text-white hover:bg-[#FB6376]/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

/* ===================== EMPTY STATE ===================== */

const EmptyState = ({ type }: { type: "sent" | "received" }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const icons = containerRef.current.querySelectorAll(".float-icon");
      icons.forEach((icon, i) => {
        gsap.to(icon, {
          y: -8,
          duration: 2,
          delay: i * 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });
    }
  }, []);

  return (
    <div className="py-24 px-8 text-center">
      <div ref={containerRef} className="relative mb-10">
        <div className="w-28 h-28 mx-auto mb-8 bg-[#FFF9EC] rounded-2xl flex items-center justify-center border border-[#FFDCCC]">
          {type === "sent" ? (
            <Send className="w-14 h-14 text-[#FB6376] float-icon" />
          ) : (
            <Mail className="w-14 h-14 text-[#5D2A42] float-icon" />
          )}
        </div>
      </div>

      <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">
        {type === "sent" ? "No Capsules Created" : "No Capsules Received"}
      </h3>

      <p className="text-[#666666] mb-10 max-w-md mx-auto text-lg leading-relaxed">
        {type === "sent"
          ? "Create your first time capsule to preserve precious moments for the future."
          : "When someone sends you a time capsule, it will appear here."}
      </p>

      {type === "sent" && (
        <Button
          onClick={() => navigate("/create")}
          className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white px-8 py-6 text-base h-auto"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-3" />
          Create Your First Capsule
        </Button>
      )}
    </div>
  );
};

/* ===================== DASHBOARD ===================== */

const Dashboard = () => {
  const { plan, loading: planLoading } = usePlan();
  const navigate = useNavigate();
  const { capsules, receivedCapsules, loading, serverNow } = useCapsules();
  const [activeTab, setActiveTab] = useState("sent");
  const [currentTime, setCurrentTime] = useState(serverNow());
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(serverNow()), 1000);
    return () => clearInterval(timer);
  }, [serverNow]);

  useEffect(() => {
    cardsRef.current.forEach((card, index) => {
      if (card) {
        gsap.fromTo(
          card,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, delay: index * 0.05, ease: "power3.out" }
        );
      }
    });
  }, [capsules, receivedCapsules, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FFF9EC]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-[#FB6376] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#5D2A42] text-lg">Loading your capsules...</p>
        </div>
      </div>
    );
  }

  const sortCapsules = (caps: Capsule[]) => {
    return [...caps].sort((a, b) => {
      const aUnlockDate = parseFirebaseDate(a.unlockDate || a.deliveryDate) ?? new Date(0);
      const bUnlockDate = parseFirebaseDate(b.unlockDate || b.deliveryDate) ?? new Date(0);
      
      const aIsUnlocked = a.isUnlocked || aUnlockDate.getTime() <= currentTime.getTime();
      const bIsUnlocked = b.isUnlocked || bUnlockDate.getTime() <= currentTime.getTime();
      
      if (aIsUnlocked !== bIsUnlocked) {
        // Locked (false) comes first, unlocked (true) comes after
        return aIsUnlocked ? 1 : -1;
      }
      
      if (aIsUnlocked) {
        // Both unlocked: most recent unlock date first (descending)
        return bUnlockDate.getTime() - aUnlockDate.getTime();
      }
      
      // Both locked: closest to open first (ascending)
      return aUnlockDate.getTime() - bUnlockDate.getTime();
    });
  };

  const sent = sortCapsules(capsules || []);
  const received = sortCapsules(receivedCapsules || []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />

        <main className="ml-0 md:ml-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="mb-12">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">
                    <span className="text-[#FB6376]">Forá</span> Time Capsules
                  </h1>
                  <p className="text-[#666666] text-md">
                    Preserve memories, share moments, connect across time
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-8">
                <AnimatedStatsCard title="Capsules Created" primaryValue={sent.length} />
                <AnimatedStatsCard title="Capsules Received" primaryValue={received.length} />
                <AnimatedStatsCard
                  title="Unlocked Capsules"
                  primaryValue={
                    [...sent, ...received].filter((c) => {
                      const d = parseFirebaseDate(c.unlockDate || c.deliveryDate);
                      return d ? d.getTime() <= Date.now() || c.isUnlocked : false;
                    }).length
                  }
                />
              </div>
            </div>

            {/* Next Unlock Countdown Section */}
            {(() => {
              const allCapsules = [...sent, ...received];
              const nextCapsule = allCapsules
                .filter(c => {
                  const d = parseFirebaseDate(c.unlockDate || c.deliveryDate);
                  return d ? d.getTime() > currentTime.getTime() && !c.isUnlocked : false;
                })
                .sort((a, b) => {
                  const da = parseFirebaseDate(a.unlockDate || a.deliveryDate)?.getTime() || 0;
                  const db = parseFirebaseDate(b.unlockDate || b.deliveryDate)?.getTime() || 0;
                  return da - db;
                })[0];

              if (!nextCapsule) return null;
              const unlockDate = parseFirebaseDate(nextCapsule.unlockDate || nextCapsule.deliveryDate);

              return (
                <div className="mb-12 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md border border-[#E8E8E8] rounded-3xl p-8 shadow-sm">
                  <Badge
                    variant="outline"
                    className="rounded-[14px] border border-[#FB6376]/20 bg-[#FFDCCC]/10 text-base text-[#5D2A42] font-medium px-4 py-1.5 mb-6"
                  >
                    <Timer className="w-5 h-5 fill-[#FB6376]/20 stroke-[1.5px] text-[#FB6376] mr-2" />
                    Next memory unlocking in
                  </Badge>
                  
                  {unlockDate && (
                    <AnimatedNumberCountdown 
                      endDate={unlockDate} 
                      className="scale-90 md:scale-110" 
                    />
                  )}
                  
                  
                </div>
              );
            })()}

            {!planLoading && plan && (
              <div className="absolute top-6 right-8 z-30">
                <AwardBadge
                  type={plan.tier as "free" | "starter" | "pro"}
                  usedCapsules={plan.usedCapsules}
                  capsuleLimit={plan.capsuleLimit}
                />
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full sm:w-auto mb-10 bg-white border border-[#E8E8E8] p-1.5 rounded-xl">
                <TabsTrigger
                  value="sent"
                  className="flex-1 sm:flex-none data-[state=active]:bg-[#FB6376] data-[state=active]:text-white px-8 py-3 rounded-lg"
                >
                  <Send className="w-4 h-4 mr-3" />
                  Sent ({sent.length})
                </TabsTrigger>
                <TabsTrigger
                  value="received"
                  className="flex-1 sm:flex-none data-[state=active]:bg-[#FCB1A6] data-[state=active]:text-[#1A1A1A] px-8 py-3 rounded-lg"
                >
                  <Inbox className="w-4 h-4 mr-3" />
                  Received ({received.length})
                </TabsTrigger>
              </TabsList>

              {/* Sent */}
              <TabsContent value="sent" className="space-y-8">
                {sent.length === 0 ? (
                  <EmptyState type="sent" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {sent.map((capsule, index) => (
                      <div key={capsule.id} ref={(el) => (cardsRef.current[index] = el)}>
                        <CapsuleCard capsule={capsule} currentTime={currentTime} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Received */}
              <TabsContent value="received" className="space-y-8">
                {received.length === 0 ? (
                  <EmptyState type="received" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {received.map((capsule, index) => (
                      <div
                        key={capsule.id}
                        ref={(el) => (cardsRef.current[sent.length + index] = el)}
                      >
                        <CapsuleCard
                          capsule={capsule}
                          isReceived={true}
                          currentTime={currentTime}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;