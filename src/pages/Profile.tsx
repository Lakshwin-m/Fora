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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Edit,
  Save,
  Camera,
  Clock,
  Users,
  Zap,
  FileText,
  Shield,
  Globe,
  Bell,
  Link,
  Key,
  Trash2,
  Loader2,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    photoURL: "",
    bio: "",
    joinDate: "",
    location: "",
    website: "",
    socialLinks: {
      twitter: "",
      instagram: "",
      linkedin: "",
    },
    privacySettings: {
      profileVisible: true,
      emailVisible: false,
      activityVisible: true,
    },
  });

  const [stats, setStats] = useState({
    capsulesCreated: 0,
    capsulesReceived: 0,
    capsulesOpened: 0,
    connectionsCount: 0,
  });

  const [recentCapsules, setRecentCapsules] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoadingCapsules, setIsLoadingCapsules] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "capsules" && !recentCapsules.length) {
      fetchRecentCapsules();
    }
    if (activeTab === "connections" && !connections.length) {
      fetchConnections();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to view your profile",
          variant: "destructive",
        });
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
          joinDate:
            userData.joinDate ||
            user.metadata.creationTime ||
            new Date().toISOString(),
          location: userData.location || "",
          website: userData.website || "",
          socialLinks: userData.socialLinks || {
            twitter: "",
            instagram: "",
            linkedin: "",
          },
          privacySettings: userData.privacySettings || {
            profileVisible: true,
            emailVisible: false,
            activityVisible: true,
          },
        });

        // Fetch stats
        await fetchUserStats(user.uid);
      } else {
        setProfile({
          name: user.displayName || "User",
          email: user.email || "",
          photoURL: user.photoURL || "",
          bio: "",
          joinDate: user.metadata.creationTime || new Date().toISOString(),
          location: "",
          website: "",
          socialLinks: {
            twitter: "",
            instagram: "",
            linkedin: "",
          },
          privacySettings: {
            profileVisible: true,
            emailVisible: false,
            activityVisible: true,
          },
        });

        // Create initial user document
        try {
          await updateDoc(userRef, {
            name: user.displayName || "User",
            email: user.email || "",
            photoURL: user.photoURL || "",
            joinDate: user.metadata.creationTime || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            privacySettings: {
              profileVisible: true,
              emailVisible: false,
              activityVisible: true,
            },
          });
        } catch (error) {
          console.log("User document will be created on first update");
        }
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

  const fetchUserStats = async (userId: string) => {
    try {
      // Fetch capsules created by user
      const capsulesQuery = query(
        collection(db, "capsules"),
        where("userId", "==", userId),
        where("status", "!=", "deleted")
      );
      const capsulesSnap = await getDocs(capsulesQuery);

      // Fetch connections
      const connectionsQuery = query(
        collection(db, "connections"),
        where("userId", "==", userId),
        where("status", "==", "connected")
      );
      const connectionsSnap = await getDocs(connectionsQuery);

      // Calculate opened capsules
      const openedCapsules = capsulesSnap.docs.filter(
        (doc) => doc.data().status === "opened"
      ).length;

      // Calculate received capsules (capsules where user is a recipient)
      const receivedQuery = query(
        collection(db, "capsules"),
        where("recipients", "array-contains", userId),
        where("status", "!=", "deleted")
      );
      const receivedSnap = await getDocs(receivedQuery);

      setStats({
        capsulesCreated: capsulesSnap.size,
        capsulesReceived: receivedSnap.size,
        capsulesOpened: openedCapsules,
        connectionsCount: connectionsSnap.size,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentCapsules = async () => {
    try {
      setIsLoadingCapsules(true);
      const user = auth.currentUser;
      if (!user) return;

      const capsulesQuery = query(
        collection(db, "capsules"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const capsulesSnap = await getDocs(capsulesQuery);
      const capsulesData = capsulesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecentCapsules(capsulesData);
    } catch (error) {
      console.error("Error fetching capsules:", error);
      toast({
        title: "Error",
        description: "Failed to load capsules",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCapsules(false);
    }
  };

  const fetchConnections = async () => {
    try {
      setIsLoadingConnections(true);
      const user = auth.currentUser;
      if (!user) return;

      const connectionsQuery = query(
        collection(db, "connections"),
        where("userId", "==", user.uid),
        where("status", "==", "connected"),
        orderBy("connectedAt", "desc"),
        limit(10)
      );

      const connectionsSnap = await getDocs(connectionsQuery);
      const connectionsData = connectionsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setConnections(connectionsData);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;

      if (!user) {
        toast({
          title: "Error",
          description: "No user logged in.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        socialLinks: profile.socialLinks,
        privacySettings: profile.privacySettings,
        updatedAt: new Date().toISOString(),
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
      fetchUserProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = () => {
    // Implement image upload functionality
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        // Here you would upload to Firebase Storage
        toast({
          title: "Coming Soon",
          description: "Image upload functionality will be available soon.",
        });
      }
    };
    input.click();
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatJoinDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Unknown date";
    }
  };

  const getCapsuleStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      active: { color: "bg-green-500", label: "Active" },
      scheduled: { color: "bg-blue-500", label: "Scheduled" },
      opened: { color: "bg-purple-500", label: "Opened" },
      expired: { color: "bg-gray-500", label: "Expired" },
      deleted: { color: "bg-red-500", label: "Deleted" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-500",
      label: status,
    };
    return (
      <Badge className={`${config.color} text-white text-xs`}>
        {config.label}
      </Badge>
    );
  };

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
        {/* Header Section */}
        <Card className="border-border bg-card/80 backdrop-blur-sm mb-8 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20"></div>
          <CardContent className="relative px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center -mt-16 space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage
                    src={profile.photoURL}
                    alt={profile.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-semibold">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  onClick={handleImageUpload}
                  className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-gradient-accent hover:shadow-lg transition-all hover:scale-110"
                  variant="default"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) =>
                            setProfile({ ...profile, name: e.target.value })
                          }
                          className="border-border bg-input"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="location"
                          className="text-sm font-medium"
                        >
                          Location
                        </Label>
                        <Input
                          id="location"
                          value={profile.location}
                          onChange={(e) =>
                            setProfile({ ...profile, location: e.target.value })
                          }
                          className="border-border bg-input"
                          placeholder="City, Country"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-medium">
                        Website
                      </Label>
                      <Input
                        id="website"
                        value={profile.website}
                        onChange={(e) =>
                          setProfile({ ...profile, website: e.target.value })
                        }
                        className="border-border bg-input"
                        placeholder="https://yourwebsite.com"
                        type="url"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm font-medium">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) =>
                          setProfile({ ...profile, bio: e.target.value })
                        }
                        className="border-border bg-input min-h-24"
                        placeholder="Tell your story..."
                        maxLength={500}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {profile.bio.length}/500
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Social Links
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Twitter</Label>
                          <Input
                            value={profile.socialLinks.twitter}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                socialLinks: {
                                  ...profile.socialLinks,
                                  twitter: e.target.value,
                                },
                              })
                            }
                            placeholder="@username"
                            className="border-border bg-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Instagram</Label>
                          <Input
                            value={profile.socialLinks.instagram}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                socialLinks: {
                                  ...profile.socialLinks,
                                  instagram: e.target.value,
                                },
                              })
                            }
                            placeholder="@username"
                            className="border-border bg-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">LinkedIn</Label>
                          <Input
                            value={profile.socialLinks.linkedin}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                socialLinks: {
                                  ...profile.socialLinks,
                                  linkedin: e.target.value,
                                },
                              })
                            }
                            placeholder="linkedin.com/in/username"
                            className="border-border bg-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                          {profile.name}
                        </h1>
                        <div className="flex items-center flex-wrap gap-3 mb-4">
                          {profile.location && (
                            <Badge
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" />
                              {profile.location}
                            </Badge>
                          )}
                          {profile.website && (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              <a
                                href={profile.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                Website
                              </a>
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        Joined {formatJoinDate(profile.joinDate)}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-lg mb-6">
                      {profile.bio ||
                        "No bio yet. Click Edit Profile to add one!"}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">{profile.email}</span>
                        {!profile.privacySettings.emailVisible && (
                          <Badge
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            Private
                          </Badge>
                        )}
                      </div>

                      {/* Social Links */}
                      {(profile.socialLinks.twitter ||
                        profile.socialLinks.instagram ||
                        profile.socialLinks.linkedin) && (
                        <div className="flex items-center space-x-4 pt-2">
                          {profile.socialLinks.twitter && (
                            <a
                              href={`https://twitter.com/${profile.socialLinks.twitter.replace(
                                "@",
                                ""
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-blue-500 transition-colors"
                            >
                              Twitter
                            </a>
                          )}
                          {profile.socialLinks.instagram && (
                            <a
                              href={`https://instagram.com/${profile.socialLinks.instagram.replace(
                                "@",
                                ""
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-pink-500 transition-colors"
                            >
                              Instagram
                            </a>
                          )}
                          {profile.socialLinks.linkedin && (
                            <a
                              href={profile.socialLinks.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-blue-700 transition-colors"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-primary hover:shadow-lg transition-all"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        fetchUserProfile();
                      }}
                      className="border-border"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-accent hover:shadow-lg transition-all"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("settings")}
                      className="border-border"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Privacy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="capsules">Capsules</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {stats.capsulesCreated}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Received</p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {stats.capsulesReceived}
                      </p>
                    </div>
                    <div className="p-3 bg-secondary/10 rounded-full">
                      <Clock className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Opened</p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {stats.capsulesOpened}
                      </p>
                    </div>
                    <div className="p-3 bg-accent/10 rounded-full">
                      <Zap className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Connections
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {stats.connectionsCount}
                      </p>
                    </div>
                    <div className="p-3 bg-success/10 rounded-full">
                      <Users className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="border-border bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Recent Capsules</CardTitle>
                    <CardDescription>
                      Your most recent time capsules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCapsules ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : recentCapsules.length > 0 ? (
                      <div className="space-y-4">
                        {recentCapsules.map((capsule) => (
                          <div
                            key={capsule.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-foreground">
                                  {capsule.title || "Untitled Capsule"}
                                </h4>
                                {getCapsuleStatusBadge(capsule.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {capsule.description || "No description"}
                              </p>
                              {capsule.openDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Opens:{" "}
                                  {new Date(
                                    capsule.openDate
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No capsules yet</p>
                        <Button className="mt-4">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Capsule
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="border-border bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start bg-gradient-primary hover:shadow-lg">
                      <Plus className="w-4 h-4 mr-3" />
                      Create New Capsule
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border"
                    >
                      <Users className="w-4 h-4 mr-3" />
                      Find Connections
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border"
                    >
                      <Link className="w-4 h-4 mr-3" />
                      Share Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border"
                    >
                      <FileText className="w-4 h-4 mr-3" />
                      View Archive
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Capsules Tab */}
          <TabsContent value="capsules">
            <Card className="border-border bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Your Time Capsules</CardTitle>
                    <CardDescription>
                      Manage all your time capsules
                    </CardDescription>
                  </div>
                  <Button className="bg-gradient-accent">
                    <Plus className="w-4 h-4 mr-2" />
                    New Capsule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCapsules ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : recentCapsules.length > 0 ? (
                  <div className="space-y-4">
                    {recentCapsules.map((capsule) => (
                      <Card key={capsule.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">
                                  {capsule.title || "Untitled Capsule"}
                                </h4>
                                {getCapsuleStatusBadge(capsule.status)}
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">
                                {capsule.description ||
                                  "No description provided"}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  Created:{" "}
                                  {capsule.createdAt
                                    ? new Date(
                                        capsule.createdAt
                                      ).toLocaleDateString()
                                    : "Unknown"}
                                </span>
                                {capsule.openDate && (
                                  <span>
                                    Opens:{" "}
                                    {new Date(
                                      capsule.openDate
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                {capsule.recipientsCount > 0 && (
                                  <span>
                                    {capsule.recipientsCount} recipients
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      No Capsules Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Start preserving memories by creating your first time
                      capsule
                    </p>
                    <Button size="lg" className="bg-gradient-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Capsule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections">
            <Card className="border-border bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Connections</CardTitle>
                    <CardDescription>
                      People you're connected with
                    </CardDescription>
                  </div>
                  <Button variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Find New Connections
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingConnections ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : connections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connections.map((connection) => (
                      <Card key={connection.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage src={connection.photoURL} />
                              <AvatarFallback>
                                {getInitials(connection.name || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold">
                                {connection.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Connected{" "}
                                {connection.connectedAt
                                  ? new Date(
                                      connection.connectedAt
                                    ).toLocaleDateString()
                                  : "recently"}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Users className="w-12 h-12 text-secondary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      No Connections Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Connect with friends to share time capsules
                    </p>
                    <Button size="lg" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Discover People
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-border bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Privacy Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Privacy Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium">Profile Visibility</h4>
                        <p className="text-sm text-muted-foreground">
                          Allow others to find your profile
                        </p>
                      </div>
                      <Button
                        variant={
                          profile.privacySettings.profileVisible
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            privacySettings: {
                              ...profile.privacySettings,
                              profileVisible:
                                !profile.privacySettings.profileVisible,
                            },
                          })
                        }
                      >
                        {profile.privacySettings.profileVisible ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hidden
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium">Email Visibility</h4>
                        <p className="text-sm text-muted-foreground">
                          Show your email on your profile
                        </p>
                      </div>
                      <Button
                        variant={
                          profile.privacySettings.emailVisible
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            privacySettings: {
                              ...profile.privacySettings,
                              emailVisible:
                                !profile.privacySettings.emailVisible,
                            },
                          })
                        }
                      >
                        {profile.privacySettings.emailVisible
                          ? "Public"
                          : "Private"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium">Activity Visibility</h4>
                        <p className="text-sm text-muted-foreground">
                          Show your recent activity to others
                        </p>
                      </div>
                      <Button
                        variant={
                          profile.privacySettings.activityVisible
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            privacySettings: {
                              ...profile.privacySettings,
                              activityVisible:
                                !profile.privacySettings.activityVisible,
                            },
                          })
                        }
                      >
                        {profile.privacySettings.activityVisible
                          ? "Visible"
                          : "Hidden"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Account Actions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Account Actions
                  </h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border"
                    >
                      <Bell className="w-4 h-4 mr-3" />
                      Notification Preferences
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border"
                    >
                      <Key className="w-4 h-4 mr-3" />
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-destructive border text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-3" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
