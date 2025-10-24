import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Edit,
  Save,
  Camera,
  Award,
  TrendingUp,
  Users,
  Zap,
  Loader2,
} from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    photoURL: "",
    bio: "",
    joinDate: "",
    location: "",
  });
  const [stats, setStats] = useState({
    totalCapsules: 0,
    connections: 0,
    opened: 0,
  });

  const recentActivity = [
    {
      action: "Created capsule",
      title: "Birthday Wishes for Sarah",
      date: "2024-01-08",
      type: "create",
    },
    {
      action: "Opened capsule",
      title: "New Year Resolutions 2023",
      date: "2024-01-01",
      type: "open",
    },
    {
      action: "Connected with",
      title: "Jessica Park",
      date: "2023-12-28",
      type: "connect",
    },
    {
      action: "Capsule delivered",
      title: "College Graduation Memory",
      date: "2023-12-25",
      type: "deliver",
    },
  ];

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        console.error("No user logged in");
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setProfile({
          name: userData.name || user.displayName || "User",
          email: user.email || "",
          photoURL: userData.photoURL || user.photoURL || "",
          bio: userData.bio || "",
          joinDate: userData.joinDate || new Date().toISOString(),
          location: userData.location || "",
        });

        setStats({
          totalCapsules: userData.stats?.totalCapsules || 0,
          connections: userData.stats?.connections || 0,
          opened: userData.stats?.opened || 0,
        });
      } else {
        setProfile({
          name: user.displayName || "User",
          email: user.email || "",
          photoURL: user.photoURL || "",
          bio: "",
          joinDate: user.metadata.creationTime || new Date().toISOString(),
          location: "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        toast({
          title: "Error",
          description: "No user logged in.",
          variant: "destructive",
        });
        return;
      }

      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
      });

      if (profile.name !== user.displayName) {
        await updateAuthProfile(user, {
          displayName: profile.name,
        });
      }

      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = () => {
    toast({
      title: "Image upload",
      description:
        "Profile picture upload functionality would be implemented here.",
    });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "create":
        return "📝";
      case "open":
        return "🔓";
      case "connect":
        return "🤝";
      case "deliver":
        return "📦";
      default:
        return "⭐";
    }
  };

  const successRate =
    stats.totalCapsules > 0
      ? Math.round((stats.opened / stats.totalCapsules) * 100)
      : 0;

  const statsDisplay = [
    {
      label: "Total Capsules",
      value: stats.totalCapsules.toString(),
      icon: Clock,
      color: "text-primary",
      description: "Time capsules created",
    },
    {
      label: "Connections",
      value: stats.connections.toString(),
      icon: Users,
      color: "text-secondary",
      description: "Active connections",
    },
    {
      label: "Opened",
      value: stats.opened.toString(),
      icon: Zap,
      color: "text-accent",
      description: "Capsules unlocked",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      color: "text-success",
      description: "Delivery success",
    },
  ];

  const achievements = [
    {
      title: "First Timer",
      description: "Created your first time capsule",
      icon: "🚀",
      earned: stats.totalCapsules >= 1,
    },
    {
      title: "Social Butterfly",
      description: "Connected with 10+ people",
      icon: "🦋",
      earned: stats.connections >= 10,
    },
    {
      title: "Time Master",
      description: "Created 25 time capsules",
      icon: "⏰",
      earned: stats.totalCapsules >= 25,
    },
    {
      title: "Future Self",
      description: "Opened a capsule from 1+ year ago",
      icon: "🔮",
      earned: stats.opened >= 1,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-border bg-card/80 backdrop-blur-sm mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.photoURL} alt={profile.name} />
                  <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  onClick={handleImageUpload}
                  className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-gradient-accent hover-glow"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) =>
                          setProfile({ ...profile, name: e.target.value })
                        }
                        className="border-border bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) =>
                          setProfile({ ...profile, bio: e.target.value })
                        }
                        className="border-border bg-input min-h-20"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) =>
                          setProfile({ ...profile, location: e.target.value })
                        }
                        className="border-border bg-input"
                        placeholder="e.g., San Francisco, CA"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      {profile.name}
                    </h1>
                    <p className="text-muted-foreground mb-4">
                      {profile.bio ||
                        "No bio yet. Click Edit Profile to add one!"}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{profile.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Joined{" "}
                          {new Date(profile.joinDate).toLocaleDateString()}
                        </span>
                      </div>
                      {profile.location && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                {isEditing ? (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-primary hover-glow"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        fetchUserProfile();
                      }}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-accent hover-glow"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsDisplay.map((stat, index) => (
                <Card
                  key={index}
                  className="border-border bg-card/80 backdrop-blur-sm hover-glow"
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stat.description}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest time capsule interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-4 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-smooth"
                    >
                      <div className="text-2xl">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{activity.action}</span>{" "}
                          "{activity.title}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-border bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-accent" />
                  <span>Achievements</span>
                </CardTitle>
                <CardDescription>Your time capsule milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-lg transition-smooth ${
                        achievement.earned
                          ? "bg-success/10 border border-success/20"
                          : "bg-muted/10"
                      }`}
                    >
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">
                            {achievement.title}
                          </h4>
                          {achievement.earned && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-success/20 text-success"
                            >
                              Earned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-gradient-primary hover-glow">
                  <Clock className="w-4 h-4 mr-3" />
                  Create New Capsule
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-border"
                >
                  <Users className="w-4 h-4 mr-3" />
                  Invite Friends
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-border"
                >
                  <Mail className="w-4 h-4 mr-3" />
                  Export Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
