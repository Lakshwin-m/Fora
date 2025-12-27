import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { getFCMToken, onForegroundMessage } from "@/notifications";
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
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { capsules, receivedCapsules, loading } = useCapsules();
  const [activeTab, setActiveTab] = useState("sent");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update sidebar expanded state when window resizes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth >= 768) {
        const isNearLeftEdge = e.clientX < 80;
        setSidebarExpanded(isNearLeftEdge);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const getCountdown = (deliveryDate: string) => {
    const now = currentTime.getTime();
    const target = new Date(deliveryDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return "Unlocked";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-[#FB6376]/10 text-[#5D2A42] border-[#FB6376]/30 font-medium";
      case "delivered":
        return "bg-[#FCB1A6]/20 text-[#5D2A42] border-[#FCB1A6]/40 font-medium";
      case "opened":
        return "bg-[#FFDCCC]/30 text-[#5D2A42] border-[#FFDCCC]/50 font-medium";
      default:
        return "bg-[#5D2A42]/10 text-[#5D2A42] border-[#5D2A42]/20";
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return "Unlocked";
    } else if (diffDays === 0) {
      return "Unlocks today";
    } else if (diffDays === 1) {
      return "Unlocks tomorrow";
    } else if (diffDays < 30) {
      return `Unlocks in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const CapsuleCard = ({ capsule, isReceived = false }) => {
    const { deleteCapsule } = useCapsules();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const TriggerIcon = getTriggerIcon(capsule.triggerType);

    // Check unlock status
    const deliveryTime = new Date(capsule.deliveryDate).getTime();
    const currentTimeMs = currentTime.getTime();
    const isUnlocked = deliveryTime <= currentTimeMs || capsule.isUnlocked;

    // Determine if this is a self-capsule
    const isSentToSelf =
      capsule.recipientType === "self" ||
      (!isReceived && capsule.recipients?.length === 1);

    // CRITICAL: For self-capsules, NEVER show content until unlocked
    // For friend-capsules in sent tab: show content (you're the sender)
    // For received capsules: hide until unlocked
    let canView = false;

    if (isUnlocked) {
      // If unlocked, always show content
      canView = true;
    } else if (isSentToSelf) {
      // Self-capsule and NOT unlocked = hide content
      canView = false;
    } else if (isReceived) {
      // Received from friend and NOT unlocked = hide content
      canView = false;
    } else {
      // Sent to friends and NOT unlocked = show content (you're the sender)
      canView = true;
    }

    const countdown = getCountdown(capsule.deliveryDate);

    const handleCapsuleClick = () => {
      // Don't navigate if dialog is open
      if (isDialogOpen) return;
      // Navigate to the capsule detail page
      navigate(`/capsule/${capsule.id}`);
    };

    const handleDelete = async () => {
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
      }
    };

    return (
      <Card className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200 overflow-hidden group">
        <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
          <div className="flex items-start justify-between mb-3">
            <div
              className="flex items-center space-x-3 flex-1 cursor-pointer hover:opacity-80"
              onClick={(e) => {
                if (!isDialogOpen) {
                  handleCapsuleClick();
                }
              }}
            >
              <div
                className={`w-10 h-10 ${
                  isUnlocked ? "bg-[#FCB1A6]" : "bg-[#FB6376]"
                } rounded-xl flex items-center justify-center shadow-sm`}
              >
                {isUnlocked ? (
                  <Unlock className="w-5 h-5 text-[#5D2A42]" />
                ) : (
                  <Lock className="w-5 h-5 text-[#5D2A42]" />
                )}
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">
                  {capsule.title}
                </CardTitle>
                {isReceived && capsule.username && (
                  <p className="text-xs text-[#5D2A42]/60 flex items-center mt-1">
                    <User className="w-3 h-3 mr-1" />
                    From {capsule.username}
                  </p>
                )}
                {isSentToSelf && !isReceived && (
                  <p className="text-xs text-[#5D2A42]/60 flex items-center mt-1">
                    <User className="w-3 h-3 mr-1" />
                    To my future self
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${getStatusColor(
                isUnlocked ? "delivered" : "scheduled"
              )} text-xs px-2 py-1`}
            >
              {isUnlocked ? "unlocked" : "scheduled"}
            </Badge>
            {!isReceived && (
              <AlertDialog
                open={isDialogOpen}
                onOpenChange={(newOpen) => {
                  if (!newOpen) {
                    setIsDialogOpen(false);
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-[#FB6376] text-[#5D2A42]/60 opacity-70 hover:opacity-100 transition-all"
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDialogOpen(true);
                    }}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  onClick={(e) => e.stopPropagation()}
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onEscapeKeyDown={(e) => e.preventDefault()}
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Capsule?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{capsule.title}" and all its
                      contents. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDialogOpen(false);
                      }}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDelete();
                        setIsDialogOpen(false);
                      }}
                      className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
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
                    </Button>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <CardDescription className="line-clamp-2 text-[#5D2A42]/70 text-sm leading-relaxed">
            {canView ? (
              capsule.content
            ) : (
              <span className="text-[#5D2A42]/50 italic flex items-center gap-1.5">
                🔒 {isSentToSelf ? "Message to your future self" : "Locked"} -
                Opens {new Date(capsule.deliveryDate).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent
          className="pt-4 bg-white cursor-pointer hover:opacity-80"
          onClick={(e) => {
            if (!isDialogOpen) {
              handleCapsuleClick();
            }
          }}
        >
          {/* Countdown Timer */}
          {!isUnlocked && (
            <div className="mb-4 p-3 bg-[#FFDCCC] rounded-lg border border-[#FB6376]/20">
              <div className="flex items-center justify-center space-x-2">
                <Timer className="w-4 h-4 text-[#FB6376] animate-pulse" />
                <span className="text-sm font-mono font-bold text-[#5D2A42]">
                  {countdown}
                </span>
              </div>
              <p className="text-xs text-center text-[#5D2A42]/60 mt-2">
                Click to view countdown details
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-[#5D2A42]/60">
                <TriggerIcon className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">
                  {capsule.triggerType}
                </span>
              </div>
              {!isReceived && capsule.recipientType === "friends" && (
                <div className="flex items-center text-[#5D2A42]/60">
                  <Users className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium">
                    {capsule.recipients?.length || 0} recipient
                    {capsule.recipients?.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {!isReceived && capsule.recipientType === "self" && (
                <div className="flex items-center text-[#5D2A42]/60">
                  <User className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium">To myself</span>
                </div>
              )}
            </div>
            <span className="text-xs text-[#5D2A42]/50 font-medium">
              {formatDate(capsule.deliveryDate)}
            </span>
          </div>

          {/* Show recipient names for sent capsules */}
          {!isReceived &&
            capsule.recipientType === "friends" &&
            capsule.recipientNames &&
            capsule.recipientNames.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-[#5D2A42]/10">
                {capsule.recipientNames.slice(0, 3).map((name, idx) => (
                  <Badge
                    key={idx}
                    className="text-xs bg-[#FCB1A6]/30 text-[#5D2A42] border-[#5D2A42]/20 hover:bg-[#FCB1A6]/50"
                  >
                    {name}
                  </Badge>
                ))}
                {capsule.recipientNames.length > 3 && (
                  <Badge className="text-xs bg-[#FB6376]/20 text-[#5D2A42] border-[#FB6376]/30">
                    +{capsule.recipientNames.length - 3} more
                  </Badge>
                )}
              </div>
            )}

          {/* Click to view hint */}
          <div className="mt-3 pt-3 border-t border-[#5D2A42]/10">
            <p className="text-xs text-[#5D2A42]/40 text-center">
              Click to {isUnlocked ? "view" : "see countdown"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: "sent" | "received" }) => (
    <Card className="border-[#5D2A42]/20 bg-[#FFF9EC]">
      <CardContent className="p-16 text-center">
        {type === "sent" ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-[#FFDCCC] rounded-2xl flex items-center justify-center">
              <Send className="w-10 h-10 text-[#5D2A42]/40" />
            </div>
            <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">
              No Capsules Yet
            </h3>
            <p className="text-[#5D2A42]/60 mb-8 max-w-md mx-auto leading-relaxed">
              Create your first time capsule to send messages to your future
              self or share with friends.
            </p>
            <Button
              onClick={() => navigate("/create")}
              className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Capsule
            </Button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-[#FCB1A6]/30 rounded-2xl flex items-center justify-center">
              <Inbox className="w-10 h-10 text-[#5D2A42]/40" />
            </div>
            <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">
              No Received Capsules
            </h3>
            <p className="text-[#5D2A42]/60 max-w-md mx-auto leading-relaxed">
              When friends send you time capsules, they'll appear here. Connect
              with friends to start exchanging memories!
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />

      {/* Main Content Area - Dynamic margin based on sidebar state */}
      <main
        className={`flex-1 min-h-screen bg-[#FFF9EC] transition-all duration-300 ml-0 ${
          sidebarExpanded ? "md:ml-80" : "md:ml-20"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-bold text-[#5D2A42] mb-2">
                My Capsules
              </h1>
              <p className="text-[#5D2A42]/60 text-lg">
                Manage your time capsules and view messages from friends
              </p>
            </div>
            <Button
              onClick={() => navigate("/create")}
              className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white shadow-lg hover:shadow-xl transition-all px-6 py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Capsule
            </Button>
          </div>

          {/* Capsules Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full md:w-fit grid-cols-2 mb-8 bg-white border border-[#5D2A42]/20 p-1 shadow-sm">
              <TabsTrigger
                value="sent"
                className="space-x-2 data-[state=active]:bg-[#FB6376] data-[state=active]:text-white"
              >
                <Send className="w-4 h-4" />
                <span>Sent ({capsules.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="received"
                className="space-x-2 data-[state=active]:bg-[#FCB1A6] data-[state=active]:text-[#5D2A42]"
              >
                <Inbox className="w-4 h-4" />
                <span>Received ({receivedCapsules.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Sent Capsules */}
            <TabsContent value="sent" className="space-y-6">
              {capsules.length === 0 ? (
                <EmptyState type="sent" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {capsules.map((capsule) => (
                    <CapsuleCard
                      key={capsule.id}
                      capsule={capsule}
                      isReceived={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Received Capsules */}
            <TabsContent value="received" className="space-y-6">
              {receivedCapsules.length === 0 ? (
                <EmptyState type="received" />
              ) : (
                <>
                  <p className="text-sm text-[#5D2A42]/60 mb-6 font-medium">
                    You have {receivedCapsules.length} capsule
                    {receivedCapsules.length !== 1 ? "s" : ""} from friends
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {receivedCapsules.map((capsule) => (
                      <CapsuleCard
                        key={capsule.id}
                        capsule={capsule}
                        isReceived={true}
                      />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
