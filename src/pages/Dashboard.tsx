import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CapsuleCard from "@/components/CapsuleCard";
import Navigation from "@/components/Navigation";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";

import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { capsules, refreshCapsules, loading } = useCapsules();
  const [username, setUsername] = useState("");
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsername(user.displayName || "User");
      }
    });

    return () => unsubscribe();
  }, []);

  // Capsule unlock checker
  // Capsule unlock checker
  useEffect(() => {
    const checkAndUnlockCapsules = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user, skipping unlock check"); // DEBUG
        return;
      }

      console.log("Checking for capsules to unlock..."); // DEBUG

      try {
        const capsulesRef = collection(db, "capsules");
        const q = query(
          capsulesRef,
          where("userId", "==", user.uid),
          where("isUnlocked", "==", false),
          where("status", "==", "scheduled")
        );

        const snapshot = await getDocs(q);
        console.log("Found", snapshot.size, "scheduled capsules"); // DEBUG

        const now = new Date();
        let unlockedCount = 0;
        const unlockedTitles: string[] = [];

        for (const docSnapshot of snapshot.docs) {
          const capsule = docSnapshot.data();
          console.log("Checking capsule:", capsule.title, capsule.unlockDate); // DEBUG

          // Handle Firestore Timestamp
          const unlockDate =
            capsule.unlockDate instanceof Timestamp
              ? capsule.unlockDate.toDate()
              : new Date(capsule.unlockDate);

          console.log(
            "Unlock date:",
            unlockDate,
            "Now:",
            now,
            "Should unlock:",
            unlockDate <= now
          ); // DEBUG

          if (unlockDate <= now) {
            console.log("Unlocking capsule:", docSnapshot.id); // DEBUG

            await updateDoc(doc(db, "capsules", docSnapshot.id), {
              isUnlocked: true,
              status: "delivered",
              unlockedAt: serverTimestamp(),
            });

            console.log("Capsule unlocked successfully"); // DEBUG
            unlockedCount++;
            unlockedTitles.push(capsule.title);
          }
        }

        console.log("Unlocked", unlockedCount, "capsules"); // DEBUG

        if (unlockedCount > 0) {
          toast({
            title: "🎉 Time Capsule Unlocked!",
            description:
              unlockedCount === 1
                ? `"${unlockedTitles[0]}" is now available to view.`
                : `${unlockedCount} capsules are now available to view.`,
          });

          // Wait a bit for Firestore to propagate
          console.log("Waiting before refresh..."); // DEBUG
          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log("Calling refreshCapsules..."); // DEBUG
          await refreshCapsules();
          console.log("Refresh complete"); // DEBUG
        }
      } catch (error) {
        console.error("Error checking capsules:", error);
      }
    };

    // Check immediately on mount
    checkAndUnlockCapsules();

    // Check every minute
    const interval = setInterval(checkAndUnlockCapsules, 60000);

    return () => clearInterval(interval);
  }, [db, refreshCapsules]);
  const stats = [
    {
      label: "Total Capsules",
      value: capsules.length.toString(),
      icon: Clock,
      color: "text-primary",
    },
    {
      label: "Scheduled",
      value: capsules.filter((c) => c.status === "scheduled").length.toString(),
      icon: Calendar,
      color: "text-warning",
    },
    {
      label: "Delivered",
      value: capsules.filter((c) => c.status === "delivered").length.toString(),
      icon: Zap,
      color: "text-accent",
    },
    {
      label: "Opened",
      value: capsules.filter((c) => c.status === "opened").length.toString(),
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  const filterCapsules = (status?: string) => {
    let filtered = capsules;

    if (status) {
      filtered = filtered.filter((capsule) => capsule.status === status);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (capsule) =>
          capsule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          capsule.recipients.some((recipient) =>
            recipient.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    return filtered;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your capsules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back{username && `, ${username}`}! 👋
          </h1>
          <p className="text-muted-foreground">
            Manage your time capsules and create new memories for the future
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-border bg-card/80 backdrop-blur-sm hover-glow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search capsules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80 border-border bg-input"
              />
            </div>
            <Button variant="outline" size="sm" className="border-border">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          <Link to="/create">
            <Button className="bg-gradient-accent hover-glow shadow-accent">
              <Plus className="w-4 h-4 mr-2" />
              Create Capsule
            </Button>
          </Link>
        </div>

        {/* Capsules Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full md:w-fit grid-cols-4 mb-6 bg-muted/20">
            <TabsTrigger value="all">All Capsules</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="opened">Opened</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCapsules().map((capsule) => (
                <CapsuleCard key={capsule.id} {...capsule} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCapsules("scheduled").map((capsule) => (
                <CapsuleCard key={capsule.id} {...capsule} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="delivered" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCapsules("delivered").map((capsule) => (
                <CapsuleCard key={capsule.id} {...capsule} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="opened" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCapsules("opened").map((capsule) => (
                <CapsuleCard key={capsule.id} {...capsule} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {filterCapsules().length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No capsules found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first time capsule to get started"}
            </p>
            <Link to="/create">
              <Button className="bg-gradient-primary hover-glow">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Capsule
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
