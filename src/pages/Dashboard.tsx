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
import { PlanBadge } from "@/components/PlanBadge";
import {
  Clock,
  Calendar,
  Users,
  Send,
  Inbox,
  User,
  Loader2,
  Timer,
  Lock,
  Unlock,
  Trash2,
  Plus,
  MessageCircle,
  Eye,
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
  Image,
  Video,
  Mic,
  File,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import gsap from "gsap";

import { usePlan } from "@/hooks/usePlan";
/* ===================== HELPERS ===================== */

/* ===================== TYPES ===================== */

interface Attachment {
  type?: string;
  url?: string;
}

interface Capsule {
  id: string;
  title?: string;
  content?: string;
  unlockDate: any;
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
  deliveryDate?: any; // For compatibility
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

const getContentIcon = (capsule: Capsule) => {
  const content = (capsule.content || "").toLowerCase();
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
      if (content.includes("love") || content.includes("heart")) return Heart;
      if (content.includes("travel") || content.includes("trip")) return MapPin;
      if (content.includes("music") || content.includes("song")) return Music;
      if (content.includes("memory")) return Brain;
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

  const unlockDate =
    parseFirebaseDate(capsule.unlockDate || capsule.deliveryDate) ??
    new Date(0);
  const isUnlocked =
    unlockDate.getTime() <= currentTime.getTime() || capsule.isUnlocked;
  const isSentToSelf = capsule.recipientType === "self";
  const countdown = getCountdown(
    capsule.unlockDate || capsule.deliveryDate,
    currentTime
  );

  const ContentIcon = getContentIcon(capsule);
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
  const planNames = ["Arki", "Kyklos", "Aion"];
  return (
    <div ref={cardRef} className="group relative">
      <Card
        className="border border-[#E8E8E8] bg-white hover:border-[#FB6376]/30 hover:shadow-lg transition-all duration-300 cursor-pointer h-full overflow-hidden"
        onClick={handleCapsuleClick}
      >
        <CardHeader className="pb-4 pl-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isUnlocked ? "bg-[#FFDCCC]/20" : "bg-[#FB6376]/10"
                }`}
              >
                <ContentIcon
                  className={`w-6 h-6 ${
                    isUnlocked ? "text-[#5D2A42]" : "text-[#FB6376]"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold text-[#1A1A1A] truncate">
                  {capsule.title || "Untitled Capsule"}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {isReceived && capsule.username && (
                    <span className="text-sm text-[#666666] truncate">
                      From {capsule.username}
                    </span>
                  )}
                  {isSentToSelf && !isReceived && (
                    <span className="text-sm text-[#666666]">
                      Personal capsule
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isReceived && (
              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-[#FB6376]/10 hover:text-[#FB6376] text-[#5D2A42]/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Capsule?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "
                      {capsule.title || "this capsule"}" and all its contents.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-3 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-[#FB6376] hover:bg-[#FB6376]/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Status and tags */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant={isUnlocked ? "default" : "secondary"}
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                isUnlocked
                  ? "bg-[#FFDCCC] text-[#5D2A42] hover:bg-[#FFDCCC]"
                  : "bg-[#FB6376] text-white hover:bg-[#FB6376]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isUnlocked ? (
                  <Unlock className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {isUnlocked ? "Unlocked" : "Locked"}
              </div>
            </Badge>

            <Badge
              variant="outline"
              className="border-[#E8E8E8] text-[#666666] text-xs px-3 py-1 rounded-full"
            >
              <TriggerIcon className="w-3 h-3 mr-1.5" />
              {capsule.triggerType || "time"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pl-6 pb-4">
          {/* Content preview */}
          <div className="mb-5">
            <div className="text-sm text-[#666666] leading-relaxed line-clamp-2 min-h-[48px]">
              {isUnlocked ? (
                <span className="flex items-start gap-3">
                  {capsule.content
                    ? capsule.content.slice(0, 100) + "..."
                    : "No content available"}
                </span>
              ) : (
                <span className="flex items-start gap-3 text-[#999999]">
                  <EyeOff className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span>
                    Contents sealed until{" "}
                    {formatFirebaseDate(
                      capsule.unlockDate || capsule.deliveryDate
                    )}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Countdown / Status section */}
          <div
            className={`mb-5 p-4 rounded-xl ${
              isUnlocked
                ? "bg-[#FFDCCC]/10 border border-[#FFDCCC]/30"
                : "bg-[#FB6376]/5 border border-[#FB6376]/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isUnlocked ? (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-[#FFDCCC]/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-[#FB6376]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1A1A1A]">
                        Ready to open
                      </div>
                      <div className="text-xs text-[#666666]">
                        Your capsule is waiting
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-[#FB6376]/10 flex items-center justify-center">
                      <Timer className="w-5 h-5 text-[#FB6376]" />
                    </div>
                    <div>
                      <div className="font-mono text-sm font-semibold text-[#1A1A1A]">
                        {countdown}
                      </div>
                      <div className="text-xs text-[#666666]">
                        Unlocks{" "}
                        {formatFirebaseDate(
                          capsule.unlockDate || capsule.deliveryDate
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </div>
          </div>
        </CardContent>

        <CardFooter className="pl-6 pt-4 border-t border-[#F0F0F0]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {/* Recipient count for sent capsules */}
              {!isReceived && capsule.recipientType === "friends" && (
                <div className="flex items-center text-sm text-[#666666]">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{capsule.recipients?.length || 0} recipients</span>
                </div>
              )}

              {/* Creation date */}
              <div className="text-sm text-[#999999]">
                Created{" "}
                {formatFirebaseDate(
                  capsule.createdAt || new Date().toISOString()
                )}
              </div>
            </div>

            {/* Recipient names for sent capsules */}
            {!isReceived &&
              capsule.recipientType === "friends" &&
              capsule.recipientNames &&
              capsule.recipientNames.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {capsule.recipientNames.slice(0, 3).map((name, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full bg-[#F0F0F0] border-2 border-white flex items-center justify-center text-xs text-[#666666] font-medium"
                        title={name}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {capsule.recipientNames.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-[#FB6376] border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                        +{capsule.recipientNames.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </CardFooter>
      </Card>
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
  const { capsules, receivedCapsules, loading } = useCapsules();
  const [activeTab, setActiveTab] = useState("sent");
  const [currentTime, setCurrentTime] = useState(new Date());
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const planNames = ["Arki", "Kyklos"];
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    cardsRef.current.forEach((card, index) => {
      if (card) {
        gsap.fromTo(
          card,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            delay: index * 0.05,
            ease: "power3.out",
          }
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

  const sent = capsules || [];
  const received = receivedCapsules || [];

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
                <AnimatedStatsCard
                  title="Capsules Created"
                  primaryValue={sent.length}
                />

                <AnimatedStatsCard
                  title="Capsules Received"
                  primaryValue={received.length}
                />

                <AnimatedStatsCard
                  title="Unlocked Capsules"
                  primaryValue={
                    [...sent, ...received].filter((c) => {
                      const d = parseFirebaseDate(
                        c.unlockDate || c.deliveryDate
                      );
                      return d
                        ? d.getTime() <= Date.now() || c.isUnlocked
                        : false;
                    }).length
                  }
                />
              </div>
            </div>
            {!planLoading && plan && (
              <div className="absolute top-4 right-4 z-20 scale-[0.85] origin-top-left">
                <PlanBadge
                  tier={plan.tier}
                  usedCapsules={plan.usedCapsules}
                  capsuleLimit={plan.capsuleLimit}
                />
              </div>
            )}

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
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

              {/* Sent Capsules */}
              <TabsContent value="sent" className="space-y-8">
                {sent.length === 0 ? (
                  <EmptyState type="sent" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {sent.map((capsule, index) => (
                      <div
                        key={capsule.id}
                        ref={(el) => (cardsRef.current[index] = el)}
                      >
                        <CapsuleCard
                          capsule={capsule}
                          currentTime={currentTime}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Received Capsules */}
              <TabsContent value="received" className="space-y-8">
                {received.length === 0 ? (
                  <EmptyState type="received" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {received.map((capsule, index) => (
                      <div
                        key={capsule.id}
                        ref={(el) =>
                          (cardsRef.current[sent.length + index] = el)
                        }
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
