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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile as updateAuthProfile, updateEmail } from "firebase/auth";
import {
  Mail,
  MapPin,
  Edit,
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
  Smartphone,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

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
    twoFactorEnabled: false,
    profileVisibility: "public",
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
              twoFactorEnabled: false,
              profileVisibility: "public",
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
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
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
        title: "Settings updated!",
        description: "Your settings have been saved.",
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Profile Summary */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
              <p className="text-gray-600 mt-2">
                Manage your personal information and account settings
              </p>
            </div>
            {!isEditing && activeTab === "profile" && (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
          <Separator />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:w-1/3">
            <Card className="border-2 border-amber-100 bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 h-32"></div>
              <CardContent className="pt-0 px-6 pb-6 relative">
                <div className="flex flex-col items-center -mt-16 mb-6">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                      <AvatarImage
                        src={profile.photoURL}
                        alt={profile.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-2xl font-bold">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      onClick={handleImageUpload}
                      className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg transition-all"
                      variant="default"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-center mt-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {profile.name}
                    </h2>
                    <p className="text-gray-600">@{profile.username}</p>
                    {profile.location && (
                      <div className="flex items-center justify-center mt-2 text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {profile.location}
                      </div>
                    )}
                  </div>

                  {profile.bio && (
                    <div className="mt-4 text-center">
                      <p className="text-gray-700 italic">"{profile.bio}"</p>
                    </div>
                  )}

                  <div className="mt-6 w-full space-y-3">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-amber-600 mr-3" />
                        <span className="text-gray-700">Email</span>
                      </div>
                      <span className="text-gray-800 font-medium">
                        {profile.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-amber-600 mr-3" />
                        <span className="text-gray-700">Status</span>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center">
                        <Globe className="w-5 h-5 text-amber-600 mr-3" />
                        <span className="text-gray-700">Profile</span>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        {settings.profileVisibility === "public"
                          ? "Public"
                          : "Private"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="lg:w-2/3">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="w-full bg-white p-1 rounded-xl border border-amber-100">
                <TabsTrigger
                  value="profile"
                  className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab Content */}
              <TabsContent value="profile" className="space-y-6">
                <Card className="border-2 border-amber-100 bg-white rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl text-gray-800">
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      {isEditing
                        ? "Edit your profile details below"
                        : "View your profile information"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label
                              htmlFor="name"
                              className="text-sm font-medium text-gray-700"
                            >
                              Full Name *
                            </Label>
                            <Input
                              id="name"
                              value={profile.name}
                              onChange={(e) =>
                                setProfile({ ...profile, name: e.target.value })
                              }
                              className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                              required
                            />
                          </div>

                          <div className="space-y-3">
                            <Label
                              htmlFor="username"
                              className="text-sm font-medium text-gray-700"
                            >
                              Username *
                            </Label>
                            <Input
                              id="username"
                              value={profile.username}
                              onChange={(e) =>
                                setProfile({
                                  ...profile,
                                  username: e.target.value,
                                })
                              }
                              className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="email"
                            className="text-sm font-medium text-gray-700"
                          >
                            Email Address *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(e) =>
                              setProfile({ ...profile, email: e.target.value })
                            }
                            className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                            required
                          />
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="location"
                            className="text-sm font-medium text-gray-700"
                          >
                            Location
                          </Label>
                          <Input
                            id="location"
                            value={profile.location}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                location: e.target.value,
                              })
                            }
                            className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                            placeholder="Enter your city or country"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label
                            htmlFor="bio"
                            className="text-sm font-medium text-gray-700"
                          >
                            Bio
                          </Label>
                          <Textarea
                            id="bio"
                            value={profile.bio}
                            onChange={(e) =>
                              setProfile({ ...profile, bio: e.target.value })
                            }
                            className="border-amber-200 focus:border-amber-500 focus:ring-amber-500 min-h-32"
                            placeholder="Tell us about yourself..."
                            maxLength={500}
                          />
                          <div className="text-xs text-gray-500 text-right">
                            {profile.bio.length}/500 characters
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveProfile}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6"
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
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-2">
                                Full Name
                              </h3>
                              <p className="text-lg font-semibold text-gray-800">
                                {profile.name}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-2">
                                Email Address
                              </h3>
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                <p className="text-lg font-semibold text-gray-800">
                                  {profile.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-2">
                                Username
                              </h3>
                              <p className="text-lg font-semibold text-gray-800">
                                @{profile.username}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-2">
                                Location
                              </h3>
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                <p className="text-lg font-semibold text-gray-800">
                                  {profile.location || "Not specified"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-500">
                            Bio
                          </h3>
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {profile.bio ||
                                "No bio added yet. Add a bio to tell others about yourself."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab Content */}
              <TabsContent value="settings">
                <div className="space-y-6">
                  {/* Notification Settings */}
                  <Card className="border-2 border-amber-100 bg-white rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl text-gray-800 flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-amber-600" />
                        Notification Settings
                      </CardTitle>
                      <CardDescription>
                        Manage how you receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                        <div className="space-y-1">
                          <Label
                            htmlFor="push-notifications"
                            className="font-medium text-gray-700"
                          >
                            Push Notifications
                          </Label>
                          <p className="text-sm text-gray-600">
                            Receive push notifications for important updates
                          </p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={settings.notifications}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, notifications: checked })
                          }
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                        <div className="space-y-1">
                          <Label
                            htmlFor="email-notifications"
                            className="font-medium text-gray-700"
                          >
                            Email Notifications
                          </Label>
                          <p className="text-sm text-gray-600">
                            Receive email updates and newsletters
                          </p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              emailNotifications: checked,
                            })
                          }
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Settings */}
                  <Card className="border-2 border-amber-100 bg-white rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl text-gray-800 flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-amber-600" />
                        Security Settings
                      </CardTitle>
                      <CardDescription>
                        Manage your account security preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                        <div className="space-y-1">
                          <Label
                            htmlFor="two-factor"
                            className="font-medium text-gray-700"
                          >
                            Two-Factor Authentication
                          </Label>
                          <p className="text-sm text-gray-600">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Switch
                          id="two-factor"
                          checked={settings.twoFactorEnabled}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              twoFactorEnabled: checked,
                            })
                          }
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>

                      <div className="p-4 bg-amber-50 rounded-xl">
                        <div className="space-y-1 mb-4">
                          <Label className="font-medium text-gray-700">
                            Profile Visibility
                          </Label>
                          <p className="text-sm text-gray-600">
                            Control who can see your profile
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant={
                              settings.profileVisibility === "public"
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              setSettings({
                                ...settings,
                                profileVisibility: "public",
                              })
                            }
                            className={
                              settings.profileVisibility === "public"
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                : "border-amber-300 text-gray-700"
                            }
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Public
                          </Button>
                          <Button
                            variant={
                              settings.profileVisibility === "private"
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              setSettings({
                                ...settings,
                                profileVisibility: "private",
                              })
                            }
                            className={
                              settings.profileVisibility === "private"
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                : "border-amber-300 text-gray-700"
                            }
                          >
                            <EyeOff className="w-4 h-4 mr-2" />
                            Private
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full justify-center border-amber-300 text-amber-700 hover:bg-amber-50 py-6 rounded-xl"
                      >
                        <Key className="w-5 h-5 mr-3" />
                        Change Password
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Save Settings Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Saving Settings...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-3" />
                          Save All Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
