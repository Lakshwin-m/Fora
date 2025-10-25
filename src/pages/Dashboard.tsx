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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import {
  Clock,
  Calendar,
  Users,
  Package,
  Plus,
  Send,
  Inbox,
  User,
  Loader2,
  Timer,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { capsules, receivedCapsules, loading } = useCapsules();
  const [activeTab, setActiveTab] = useState("sent");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Debug logs
  console.log("Dashboard - Sent capsules:", capsules);
  console.log("Dashboard - Received capsules:", receivedCapsules);

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const CapsuleCard = ({ capsule, isReceived = false }) => {
    const TriggerIcon = getTriggerIcon(capsule.triggerType);

    // Check unlock status
    const deliveryTime = new Date(capsule.deliveryDate).getTime();
    const currentTimeMs = currentTime.getTime();
    const isUnlocked = deliveryTime <= currentTimeMs || capsule.isUnlocked;

    // Determine if this is a self-capsule
    // Method 1: Check recipientType field
    // Method 2: Check if it's in sent tab AND recipients length is 1 (fallback for old capsules)
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

    // Debug log - detailed
    const shouldDebug =
      capsule.title.toLowerCase().includes("my") ||
      capsule.title.toLowerCase().includes("mine") ||
      capsule.title.toLowerCase().includes("self");

    if (shouldDebug) {
      console.log(`🔍 DETAILED DEBUG for "${capsule.title}":`, {
        recipientType: capsule.recipientType,
        recipients: capsule.recipients,
        recipientsLength: capsule.recipients?.length,
        isSentToSelf,
        isReceived,
        deliveryDate: new Date(capsule.deliveryDate).toLocaleString(),
        currentTime: currentTime.toLocaleString(),
        deliveryTime,
        currentTimeMs,
        timeDiff: deliveryTime - currentTimeMs,
        isUnlocked,
        canView,
        contentPreview: capsule.content?.substring(0, 20),
        LOGIC: {
          step1_isUnlocked: isUnlocked,
          step2_isSentToSelf: isSentToSelf,
          step3_isReceived: isReceived,
          finalDecision: canView ? "SHOW CONTENT" : "HIDE CONTENT",
        },
      });
    }

    const countdown = getCountdown(capsule.deliveryDate);

    return (
      <Card
        className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden group"
        onClick={() => navigate(`/capsule/${capsule.id}`)}
      >
        <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 ${
                  isUnlocked ? "bg-[#FCB1A6]" : "bg-[#FB6376]"
                } rounded-xl flex items-center justify-center shadow-sm`}
              >
                <Package className="w-5 h-5 text-[#5D2A42]" />
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
            <Badge
              variant="outline"
              className={`${getStatusColor(
                isUnlocked ? "delivered" : "scheduled"
              )} text-xs px-2 py-1`}
            >
              {isUnlocked ? "unlocked" : "scheduled"}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 text-[#5D2A42]/70 text-sm leading-relaxed">
            {(() => {
              if (shouldDebug) {
                console.log(
                  `🎨 RENDERING "${capsule.title}": canView=${canView}, content="${capsule.content}"`
                );
              }
              return canView ? (
                capsule.content
              ) : (
                <span className="text-[#5D2A42]/50 italic flex items-center gap-1.5">
                  🔒 {isSentToSelf ? "Message to your future self" : "Locked"} -
                  Opens {new Date(capsule.deliveryDate).toLocaleDateString()}
                </span>
              );
            })()}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 bg-white">
          {/* Countdown Timer */}
          {!isUnlocked && (
            <div className="mb-4 p-3 bg-[#FFDCCC] rounded-lg border border-[#FB6376]/20">
              <div className="flex items-center justify-center space-x-2">
                <Timer className="w-4 h-4 text-[#FB6376] animate-pulse" />
                <span className="text-sm font-mono font-bold text-[#5D2A42]">
                  {countdown}
                </span>
              </div>
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
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <Card className="border-[#5D2A42]/20 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-[#5D2A42]/70">
                Total Sent
              </CardTitle>
              <div className="w-10 h-10 bg-[#FB6376]/10 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-[#FB6376]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#5D2A42]">
                {capsules.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#5D2A42]/20 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-[#5D2A42]/70">
                Received
              </CardTitle>
              <div className="w-10 h-10 bg-[#FCB1A6]/20 rounded-lg flex items-center justify-center">
                <Inbox className="w-5 h-5 text-[#5D2A42]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#5D2A42]">
                {receivedCapsules.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#5D2A42]/20 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-[#5D2A42]/70">
                Scheduled
              </CardTitle>
              <div className="w-10 h-10 bg-[#FFDCCC] rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#5D2A42]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#5D2A42]">
                {
                  [...capsules, ...receivedCapsules].filter(
                    (c) =>
                      new Date(c.deliveryDate) > new Date() && !c.isUnlocked
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#5D2A42]/20 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-[#5D2A42]/70">
                Unlocked
              </CardTitle>
              <div className="w-10 h-10 bg-[#FCB1A6]/30 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-[#5D2A42]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#5D2A42]">
                {
                  [...capsules, ...receivedCapsules].filter(
                    (c) =>
                      new Date(c.deliveryDate) <= new Date() || c.isUnlocked
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Capsules Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            {console.log(
              "Rendering received tab, count:",
              receivedCapsules.length
            )}
            {receivedCapsules.length === 0 ? (
              <EmptyState type="received" />
            ) : (
              <>
                <p className="text-sm text-[#5D2A42]/60 mb-6 font-medium">
                  You have {receivedCapsules.length} capsule
                  {receivedCapsules.length !== 1 ? "s" : ""} from friends
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {receivedCapsules.map((capsule) => {
                    console.log(
                      "Rendering received capsule:",
                      capsule.id,
                      capsule.title
                    );
                    return (
                      <CapsuleCard
                        key={capsule.id}
                        capsule={capsule}
                        isReceived={true}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
