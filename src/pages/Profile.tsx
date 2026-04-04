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
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile as updateAuthProfile, updateEmail } from "firebase/auth";
import {
  Mail,
  Save,
  Camera,
  Shield,
  Key,
  Bell,
  Loader2,
  User,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Settings,
  Edit2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    username: "",
    email: "",
    photoURL: "",
    bio: "",
    location: "",
  });

  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    capsuleReminders: true,
    connectionRequests: true,
    weeklyDigest: false,
    profileVisibility: "public",
    allowSearch: true,
    showOnlineStatus: false,
    capsulePreview: true,
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: "30",
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

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
          username: userData.username || "",
          email: userData.email || user.email || "",
          photoURL: userData.photoURL || user.photoURL || "",
          bio: userData.bio || "",
          location: userData.location || "",
        });

        if (userData.settings) {
          setSettings(userData.settings);
        }
      } else {
        // Set default profile from auth
        setProfile({
          name: user.displayName || "User",
          username:
            user.displayName?.toLowerCase().replace(/\s+/g, "") || "user",
          email: user.email || "",
          photoURL: user.photoURL || "",
          bio: "",
          location: "",
        });

        // Create initial user document
        try {
          await updateDoc(userRef, {
            name: user.displayName || "User",
            username:
              user.displayName?.toLowerCase().replace(/\s+/g, "") || "user",
            email: user.email || "",
            photoURL: user.photoURL || "",
            location: "",
            bio: "",
            createdAt: new Date().toISOString(),
            settings: {
              notifications: true,
              emailNotifications: true,
              capsuleReminders: true,
              connectionRequests: true,
              weeklyDigest: false,
              profileVisibility: "public",
              allowSearch: true,
              showOnlineStatus: false,
              capsulePreview: true,
              twoFactorEnabled: false,
              loginAlerts: true,
              sessionTimeout: "30",
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

  const handleSaveProfile = async () => {
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

      // Update profile data
      await updateDoc(userRef, {
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        location: profile.location,
        updatedAt: new Date().toISOString(),
      });

      // Update auth profile if name changed
      if (profile.name !== user.displayName) {
        await updateAuthProfile(user, {
          displayName: profile.name,
        });
      }

      // Update email if changed
      if (profile.email !== user.email) {
        await updateEmail(user, profile.email);
      }

      toast({
        title: "Profile updated",
        description: "Your details have been successfully saved.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
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
        settings: settings,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFF9EC] font-sans selection:bg-[#FB6376] selection:text-white">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#5D2A42] tracking-tight">
            Account Settings
          </h1>
          <p className="text-[#5D2A42]/70 mt-2">
            Manage your personal profile, security, and preferences.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Navigation Sidebar */}
          <div className="md:w-64 shrink-0">
            <nav className="flex flex-col space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === item.id
                      ? "bg-[#5D2A42] text-white shadow-sm"
                      : "text-[#5D2A42]/70 hover:bg-[#FFDCCC]/50 hover:text-[#5D2A42]"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${
                      activeTab === item.id ? "text-white" : "text-[#5D2A42]/50"
                    }`}
                  />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-[#5D2A42]/10 shadow-sm bg-white overflow-hidden rounded-2xl">
                  <div className="bg-[#FFDCCC]/20 h-24 sm:h-32 border-b border-[#5D2A42]/5"></div>
                  <CardContent className="px-6 sm:px-10 pb-10">
                    <div className="flex flex-col sm:flex-row items-start gap-6 -mt-12 sm:-mt-16 mb-8">
                      <div className="relative group">
                        <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white bg-white shadow-sm rounded-full overflow-hidden">
                          <AvatarImage
                            src={profile.photoURL}
                            alt={profile.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-2xl font-semibold">
                            {getInitials(profile.name)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          onClick={handleImageUpload}
                          className="absolute bottom-0 right-0 sm:bottom-2 sm:right-2 p-2 bg-[#5D2A42] text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FB6376] shadow-sm"
                          aria-label="Upload photo"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="pt-2 sm:pt-16">
                        <h2 className="text-2xl font-bold text-[#5D2A42]">
                          {profile.name || "Your Name"}
                        </h2>
                        <p className="text-[#5D2A42]/60 mt-0.5">
                          @{profile.username || "username"}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-[#5D2A42]">Personal Information</h3>
                      {!isEditing && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="ghost"
                          className="text-[#FB6376] hover:text-[#F04860] hover:bg-[#FFDCCC]/30 gap-2 h-9 px-3"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Profile
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#5D2A42] font-semibold text-sm">
                          Full Name
                        </Label>
                        {isEditing ? (
                          <Input
                            id="name"
                            value={profile.name}
                            onChange={(e) =>
                              setProfile({ ...profile, name: e.target.value })
                            }
                            className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
                          />
                        ) : (
                          <div className="flex items-center h-11 px-3 bg-[#FFF9EC]/30 rounded-xl border border-transparent text-[#5D2A42]">
                            {profile.name || "—"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-[#5D2A42] font-semibold text-sm">
                          Username
                        </Label>
                        {isEditing ? (
                          <Input
                            id="username"
                            value={profile.username}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                username: e.target.value.replace(/\s+/g, ""),
                              })
                            }
                            className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
                          />
                        ) : (
                          <div className="flex items-center h-11 px-3 bg-[#FFF9EC]/30 rounded-xl border border-transparent text-[#5D2A42]">
                            {profile.username ? `@${profile.username}` : "—"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[#5D2A42] font-semibold text-sm">
                          Email Address
                        </Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(e) =>
                              setProfile({ ...profile, email: e.target.value })
                            }
                            className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
                          />
                        ) : (
                          <div className="flex items-center h-11 px-3 bg-[#FFF9EC]/30 rounded-xl border border-transparent text-[#5D2A42]">
                            {profile.email || "—"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-[#5D2A42] font-semibold text-sm">
                          Location
                        </Label>
                        {isEditing ? (
                          <Input
                            id="location"
                            value={profile.location}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                location: e.target.value,
                              })
                            }
                            placeholder="San Francisco, CA"
                            className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
                          />
                        ) : (
                          <div className="flex items-center h-11 px-3 bg-[#FFF9EC]/30 rounded-xl border border-transparent text-[#5D2A42]">
                            {profile.location || "—"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio" className="text-[#5D2A42] font-semibold text-sm">
                          Bio
                        </Label>
                        {isEditing ? (
                          <>
                            <Textarea
                              id="bio"
                              value={profile.bio}
                              onChange={(e) =>
                                setProfile({ ...profile, bio: e.target.value })
                              }
                              placeholder="Tell us a little about yourself..."
                              maxLength={500}
                              className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl min-h-[120px] resize-none"
                            />
                            <div className="text-right text-xs text-[#5D2A42]/40 font-medium">
                              {profile.bio.length} / 500
                            </div>
                          </>
                        ) : (
                          <div className="p-3 bg-[#FFF9EC]/30 rounded-xl border border-transparent text-[#5D2A42] min-h-[100px] whitespace-pre-wrap">
                            {profile.bio || <span className="text-[#5D2A42]/40 italic">No bio added yet.</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-8 pt-6 border-t border-[#5D2A42]/10 flex justify-end gap-3">
                        <Button
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          variant="ghost"
                          className="text-[#5D2A42] hover:bg-[#FFDCCC]/50 px-6 py-2 h-11 rounded-xl shadow-none font-medium transition-colors"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="bg-[#FB6376] hover:bg-[#F04860] text-white px-6 py-2 h-11 rounded-xl shadow-none font-medium transition-colors"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-[#5D2A42]/10 shadow-sm bg-white rounded-2xl">
                  <CardHeader className="border-b border-[#5D2A42]/5 pb-6">
                    <CardTitle className="text-xl text-[#5D2A42]">Global Settings</CardTitle>
                    <CardDescription className="text-[#5D2A42]/60">
                      Manage your preferences, security, and visibility.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-8 space-y-10">
                    
                    {/* NOTIFICATIONS */}
                    <div className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-[#5D2A42] font-semibold text-lg flex items-center">
                          <Bell className="w-5 h-5 mr-2 opacity-80" />
                          Notifications
                        </h3>
                        <p className="text-sm text-[#5D2A42]/60 mt-1">
                          Choose how you want to be notified about your time capsules
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="email-notifications" className="text-[#5D2A42] font-semibold text-sm">
                            Email Notifications
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Receive updates via email about your capsules
                          </p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, emailNotifications: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="push-notifications" className="text-[#5D2A42] font-semibold text-sm">
                            Push Notifications
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Get instant notifications on your devices
                          </p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={settings.notifications}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, notifications: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="capsule-reminders" className="text-[#5D2A42] font-semibold text-sm">
                            Capsule Reminders
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Get reminded before your capsules unlock
                          </p>
                        </div>
                        <Switch
                          id="capsule-reminders"
                          checked={settings.capsuleReminders}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, capsuleReminders: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="connection-requests" className="text-[#5D2A42] font-semibold text-sm">
                            Connection Requests
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Notify when someone wants to connect
                          </p>
                        </div>
                        <Switch
                          id="connection-requests"
                          checked={settings.connectionRequests}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, connectionRequests: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="weekly-digest" className="text-[#5D2A42] font-semibold text-sm">
                            Weekly Digest
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Weekly summary of your time capsule activity
                          </p>
                        </div>
                        <Switch
                          id="weekly-digest"
                          checked={settings.weeklyDigest}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, weeklyDigest: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>
                    </div>

                    {/* PRIVACY */}
                    <div className="space-y-4 pt-4 border-t border-[#5D2A42]/10">
                      <div className="mb-4">
                        <h3 className="text-[#5D2A42] font-semibold text-lg flex items-center">
                          <Eye className="w-5 h-5 mr-2 opacity-80" />
                          Privacy
                        </h3>
                        <p className="text-sm text-[#5D2A42]/60 mt-1">
                          Control who can see your profile and activity
                        </p>
                      </div>

                      <div className="p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="mb-4">
                          <Label className="text-[#5D2A42] font-semibold text-sm">Profile Visibility</Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Who can view your profile information
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button
                            variant={settings.profileVisibility === "public" ? "default" : "outline"}
                            onClick={() => setSettings({ ...settings, profileVisibility: "public" })}
                            className={`flex flex-col h-auto py-3 items-start justify-center text-left rounded-xl ${
                              settings.profileVisibility === "public"
                                ? "bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white shadow-none"
                                : "border-[#5D2A42]/20 text-[#5D2A42] hover:bg-white bg-transparent"
                            }`}
                          >
                            <span className="flex items-center mb-1"><Globe className="w-4 h-4 mr-2" /> Public</span>
                            <span className="text-xs opacity-70 font-normal">Anyone can view your profile</span>
                          </Button>
                          <Button
                            variant={settings.profileVisibility === "connections" ? "default" : "outline"}
                            onClick={() => setSettings({ ...settings, profileVisibility: "connections" })}
                            className={`flex flex-col h-auto py-3 items-start justify-center text-left rounded-xl ${
                              settings.profileVisibility === "connections"
                                ? "bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white shadow-none"
                                : "border-[#5D2A42]/20 text-[#5D2A42] hover:bg-white bg-transparent"
                            }`}
                          >
                            <span className="flex items-center mb-1"><User className="w-4 h-4 mr-2" /> Connections Only</span>
                            <span className="text-xs opacity-70 font-normal">Only your connections can view</span>
                          </Button>
                          <Button
                            variant={settings.profileVisibility === "private" ? "default" : "outline"}
                            onClick={() => setSettings({ ...settings, profileVisibility: "private" })}
                            className={`flex flex-col h-auto py-3 items-start justify-center text-left rounded-xl ${
                              settings.profileVisibility === "private"
                                ? "bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white shadow-none"
                                : "border-[#5D2A42]/20 text-[#5D2A42] hover:bg-white bg-transparent"
                            }`}
                          >
                            <span className="flex items-center mb-1"><Lock className="w-4 h-4 mr-2" /> Private</span>
                            <span className="text-xs opacity-70 font-normal">Only you can view your profile</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="allow-search" className="text-[#5D2A42] font-semibold text-sm">
                            Allow Search
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Let others find you by email or username
                          </p>
                        </div>
                        <Switch
                          id="allow-search"
                          checked={settings.allowSearch}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, allowSearch: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="online-status" className="text-[#5D2A42] font-semibold text-sm">
                            Show Online Status
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Display when you're active on Forá
                          </p>
                        </div>
                        <Switch
                          id="online-status"
                          checked={settings.showOnlineStatus}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, showOnlineStatus: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="capsule-preview" className="text-[#5D2A42] font-semibold text-sm">
                            Capsule Preview
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Show capsule previews to recipients before unlock
                          </p>
                        </div>
                        <Switch
                          id="capsule-preview"
                          checked={settings.capsulePreview}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, capsulePreview: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>
                    </div>

                    {/* SECURITY */}
                    <div className="space-y-4 pt-4 border-t border-[#5D2A42]/10">
                      <div className="mb-4">
                        <h3 className="text-[#5D2A42] font-semibold text-lg flex items-center">
                          <Shield className="w-5 h-5 mr-2 opacity-80" />
                          Security
                        </h3>
                        <p className="text-sm text-[#5D2A42]/60 mt-1">
                          Protect your account with additional security measures
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="two-factor" className="text-[#5D2A42] font-semibold text-sm">
                            Two-Factor Authentication
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Switch
                          id="two-factor"
                          checked={settings.twoFactorEnabled}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, twoFactorEnabled: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="login-alerts" className="text-[#5D2A42] font-semibold text-sm">
                            Login Alerts
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Get notified of new login attempts
                          </p>
                        </div>
                        <Switch
                          id="login-alerts"
                          checked={settings.loginAlerts}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, loginAlerts: checked })
                          }
                          className="data-[state=checked]:bg-[#FB6376]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="session-timeout" className="text-[#5D2A42] font-semibold text-sm">
                            Session Timeout
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            Automatically log out after period of inactivity
                          </p>
                        </div>
                        <select
                          id="session-timeout"
                          value={settings.sessionTimeout}
                          onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                          className="h-10 px-3 py-1 rounded-xl bg-white border border-[#5D2A42]/20 text-[#5D2A42] focus:outline-none focus:border-[#FB6376] focus:ring-1 focus:ring-[#FB6376]"
                        >
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="0">Never</option>
                        </select>
                      </div>
                    </div>

                    {/* CHANGE PASSWORD */}
                    <div className="p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl space-y-4">
                      <div className="mb-2">
                        <Label className="text-[#5D2A42] font-semibold text-base">Change Password</Label>
                        <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                          Update your account password
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#5D2A42] font-medium">Current Password</Label>
                          <Input type="password" placeholder="••••••••" className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-white h-10 rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#5D2A42] font-medium">New Password</Label>
                            <Input type="password" placeholder="••••••••" className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-white h-10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#5D2A42] font-medium">Confirm New Password</Label>
                            <Input type="password" placeholder="••••••••" className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-white h-10 rounded-xl" />
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-white rounded-xl">
                            Update Password
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* DANGER ZONE */}
                    <div className="pt-4 border-t border-red-500/10">
                      <div className="mb-4">
                        <h3 className="text-red-600 font-semibold text-lg flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2 opacity-80" />
                          Danger Zone
                        </h3>
                        <p className="text-sm text-red-600/60 mt-1">
                          Irreversible and destructive actions
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl gap-4">
                        <div className="pr-6">
                          <Label className="text-red-700 font-semibold text-sm">
                            Delete Account
                          </Label>
                          <p className="text-sm text-red-600/70 mt-0.5">
                            Once you delete your account, there is no going back. All your time capsules, connections, and data will be permanently removed.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="shrink-0 rounded-xl bg-red-500 hover:bg-red-600 shadow-none border border-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#5D2A42]/10 flex justify-end">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white px-8 py-2 h-11 rounded-xl shadow-none font-medium transition-colors"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Settings"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
