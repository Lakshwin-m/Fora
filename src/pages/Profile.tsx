import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { updateProfile as updateAuthProfile, updateEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  Calendar,
  Search,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import CountrySelect from "@/components/CountrySelect";
import AvatarCropModal from "@/components/AvatarCropModal";
import CameraModal from "@/components/CameraModal";
import VerifiedBadge from "@/components/VerifiedBadge";
import countriesData from "@/data/countries.json";
import { apiGetFriends } from "@/services/friendServices";

const getCountryFlag = (countryName: string) => {
  const country = (countriesData as any[]).find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return country ? `https://flagsapi.com/${country.code}/flat/24.png` : null;
};

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);

  // Photo upload state
  const [showCropModal, setShowCropModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    username: "",
    email: "",
    photoURL: "",
    bio: "",
    location: "",
    isVerified: false,
    createdAt: null as string | null,
    connectionsCount: 0,
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

      let actualConnectionsCount = 0;
      try {
        const friendsData = await apiGetFriends();
        actualConnectionsCount = friendsData?.length || 0;
      } catch (err) {
        console.error("Error fetching connections count:", err);
      }

      // Dev Team UIDs (Automatically Verified)
      const DEV_UIDS = ["OEeWgBvvQIgjIPiVZUqCHcXZtDf2"]; // Add dev UIDs here

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setProfile({
          name: userData.name || user.displayName || "User",
          username: userData.username || "",
          email: userData.email || user.email || "",
          photoURL: userData.photoURL || user.photoURL || "",
          bio: userData.bio || "",
          location: userData.location || "",
          isVerified: userData.isVerified || DEV_UIDS.includes(user.uid),
          createdAt: userData.createdAt || null,
          connectionsCount: actualConnectionsCount,
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
          isVerified: DEV_UIDS.includes(user.uid),
          createdAt: new Date().toISOString(),
          connectionsCount: actualConnectionsCount,
        });

        // Create initial user document
        try {
          await setDoc(userRef, {
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
          }, { merge: true });
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

      // Clean the data
      const cleanName = profile.name.trim();
      const cleanBio = profile.bio.trim();
      const cleanLocation = profile.location.trim();
      const cleanUsername = profile.username.trim();

      // Ensure we don't send an empty username if the rules require one
      const dataToUpdate: any = {
        name: cleanName,
        bio: cleanBio,
        location: cleanLocation,
        updatedAt: new Date().toISOString(),
      };

      if (cleanUsername) {
        dataToUpdate.username = cleanUsername;
      }

      console.log("Attempting Firestore update with:", dataToUpdate);

      // Using updateDoc is often safer for existing documents with strict rules
      // than setDoc(..., {merge: true}), especially for specific field permissions.
      try {
        await updateDoc(userRef, dataToUpdate);
      } catch (updateError: any) {
        console.warn("updateDoc failed, trying setDoc as fallback:", updateError);
        // If updateDoc fails (e.g. because document doesn't exist yet), use setDoc
        if (updateError.code === "not-found") {
          await setDoc(userRef, dataToUpdate, { merge: true });
        } else {
          // Re-throw if it's a permission error, so it's caught by the main handler
          throw updateError;
        }
      }

      // 2. Update Auth Profile (Display Name)
      if (cleanName && cleanName !== user.displayName) {
        try {
          await updateAuthProfile(user, {
            displayName: cleanName,
          });
        } catch (authError) {
          console.error("Error updating Auth Profile Name:", authError);
        }
      }

      // 3. Update Email
      if (profile.email && profile.email !== user.email) {
        try {
          await updateEmail(user, profile.email);
        } catch (emailError: any) {
          console.error("Error updating Auth Email:", emailError);
          toast({
            title: "Email update failed",
            description: emailError.code === "auth/requires-recent-login" 
              ? "Re-authentication required to change email."
              : emailError.message,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Profile updated",
        description: "Your details have been successfully saved.",
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error("Global Profile Update Error:", error);
      toast({
        title: "Update Failed",
        description: error.code === "permission-denied" 
          ? "Permission Denied: You may not have authority to update this profile or some fields are restricted."
          : (error.message || "Failed to update profile."),
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

      await setDoc(userRef, {
        settings: settings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

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

  const triggerImageUpload = (capture?: "environment" | "user") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) {
      input.capture = capture;
    }
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 10MB.",
          variant: "destructive",
        });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setCropImageSrc(objectUrl);
      setShowCropModal(true);
    };
    input.click();
  };

  const handleCroppedUpload = async (blob: Blob) => {
    const user = auth.currentUser;
    if (!user) return;

    setUploadingPhoto(true);
    setShowCropModal(false);

    try {
      // 1. Upload to Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(storage, `avatars/${user.uid}/${timestamp}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });

      // 2. Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // 3. Save to Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { photoURL: downloadURL }, { merge: true });

      // 4. Update Firebase Auth profile (works for Google + email users)
      await updateAuthProfile(user, { photoURL: downloadURL });

      // 5. Update local state instantly
      setProfile((prev) => ({ ...prev, photoURL: downloadURL }));

      toast({ title: "Photo updated!" });
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast({
        title: "Upload failed",
        description: err.code === "storage/unauthorized"
          ? "Permission denied. Check your Firebase Storage rules."
          : err.message || "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
        setCropImageSrc(null);
      }
    }
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

  const settingsMenu = [
    { id: "profile", label: "Public Profile", icon: User },
    { id: "account", label: "Your account" },
    { id: "security", label: "Security and account access" },
    { id: "privacy", label: "Privacy and safety" },
    { id: "notifications", label: "Notifications" },
  ];

  return (
    <>
    <div className="min-h-screen bg-[#FFF9EC] font-sans selection:bg-[#FB6376] selection:text-white">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row bg-white rounded-3xl shadow-sm border border-[#5D2A42]/10 overflow-hidden min-h-[75vh]">
          {/* Navigation Sidebar */}
          <div className="md:w-80 shrink-0 border-r border-[#5D2A42]/10 bg-white flex flex-col">
            <div className="p-6 pb-2">
              <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight mb-6">Settings</h2>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5D2A42]/50" />
                <Input
                  placeholder="Search Settings"
                  className="pl-10 border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/30 text-[#5D2A42] rounded-full h-10 shadow-sm text-sm"
                />
              </div>
            </div>
            
            <nav className="flex flex-col flex-1 pb-6 overflow-y-auto">
              {settingsMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-6 py-4 transition-all duration-200 border-r-4 ${
                    activeTab === item.id
                      ? "bg-[#FFDCCC]/30 border-[#FB6376] text-[#5D2A42]"
                      : "border-transparent text-[#5D2A42]/70 hover:bg-[#FFDCCC]/10 hover:text-[#5D2A42]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className="w-5 h-5 opacity-70" />}
                    <span className={`text-[15px] ${activeTab === item.id ? "font-bold" : "font-medium"}`}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${activeTab === item.id ? "text-[#FB6376]" : "text-[#5D2A42]/30"}`} />
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white relative">
            {activeTab === "profile" && (
              <div className="animate-in fade-in duration-300">
                <div className="bg-white overflow-hidden pb-6">
                  {/* Banner */}
                  <div className="bg-[#5D2A42] h-32 sm:h-48 border-b border-[#5D2A42]/5 relative"></div>
                  
                  <CardContent className="px-4 sm:px-8">
                    {/* Top Row: Avatar & Edit Button */}
                    <div className="flex justify-between items-start -mt-12 sm:-mt-16 mb-4">
                      <div className="relative group rounded-full">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={uploadingPhoto}
                              className="absolute inset-0 m-auto w-10 h-10 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-sm disabled:opacity-100 outline-none"
                              aria-label="Upload photo"
                            >
                              {uploadingPhoto ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Camera className="w-5 h-5" />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-48 bg-white border-[#5D2A42]/10 rounded-xl shadow-lg p-1">
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#FB6376] focus:bg-[#FFF9EC] focus:text-[#FB6376] rounded-lg p-2 font-medium outline-none"
                              onClick={() => triggerImageUpload()}
                            >
                              <ImageIcon className="w-4 h-4" />
                              Upload from Gallery
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#FB6376] focus:bg-[#FFF9EC] focus:text-[#FB6376] rounded-lg p-2 font-medium outline-none"
                              onClick={() => setShowCameraModal(true)}
                            >
                              <Camera className="w-4 h-4" />
                              Take a Photo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="pt-14 sm:pt-20">
                        {!isEditing && (
                          <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFF9EC] rounded-full font-bold px-6 h-9 transition-colors"
                          >
                            Edit profile
                          </Button>
                        )}
                      </div>
                    </div>

                    {!isEditing ? (
                      // Read-Only Presentation (X / Instagram style)
                      <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-4">
                          <div className="flex items-center gap-1.5">
                            <h2 className="text-2xl font-extrabold text-[#5D2A42] tracking-tight">
                              {profile.name || "Your Name"}
                            </h2>
                            {profile.isVerified && <VerifiedBadge className="w-5 h-5" />}
                          </div>
                          <p className="text-[#5D2A42]/60 mt-0.5 font-medium">
                            {profile.username ? `@${profile.username}` : ""}
                          </p>
                        </div>

                        <div className="mb-4">
                          <p className="text-[#5D2A42]/90 whitespace-pre-wrap leading-relaxed">
                            {profile.bio || <span className="text-[#5D2A42]/40 italic">No bio added yet.</span>}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#5D2A42]/60 text-sm mb-4 font-medium">
                          {profile.location && (
                            <span className="flex items-center gap-1.5">
                              {getCountryFlag(profile.location) ? (
                                <img
                                  src={getCountryFlag(profile.location)!}
                                  alt={profile.location}
                                  className="w-5 h-5 rounded-sm object-cover"
                                />
                              ) : (
                                <Globe className="w-4 h-4 opacity-70" />
                              )}
                              {profile.location}
                            </span>
                          )}
                          {profile.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 opacity-70" />
                              Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-sm mt-2">
                          <div 
                            onClick={() => navigate("/connections")}
                            className="flex items-center gap-1.5 hover:underline cursor-pointer"
                          >
                            <span className="font-bold text-[#5D2A42]">{profile.connectionsCount || 0}</span>
                            <span className="text-[#5D2A42]/60">Following</span>
                          </div>
                          <div 
                            onClick={() => navigate("/connections")}
                            className="flex items-center gap-1.5 hover:underline cursor-pointer"
                          >
                            <span className="font-bold text-[#5D2A42]">{profile.connectionsCount || 0}</span>
                            <span className="text-[#5D2A42]/60">Followers</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Edit Mode Form
                      <div className="animate-in slide-in-from-bottom-2 duration-300 mt-6 border-t border-[#5D2A42]/10 pt-6">
                        <h3 className="text-xl font-bold text-[#5D2A42] mb-6">Edit Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#5D2A42] font-semibold text-sm">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) =>
                            setProfile({ ...profile, name: e.target.value })
                          }
                          className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-[#5D2A42] font-semibold text-sm">
                          Username
                        </Label>
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
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[#5D2A42] font-semibold text-sm">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={(e) =>
                            setProfile({ ...profile, email: e.target.value })
                          }
                          className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-[#5D2A42] font-semibold text-sm">
                          Location
                        </Label>
                        <CountrySelect
                          value={profile.location}
                          onChange={(val) =>
                            setProfile({ ...profile, location: val })
                          }
                          placeholder="Select your country…"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio" className="text-[#5D2A42] font-semibold text-sm">
                          Bio
                        </Label>
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
                        <div className="text-right text-xs text-[#5D2A42]/40 font-medium pt-1">
                          {profile.bio.length} / 500
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">Notifications</h2>
                    <p className="text-[#5D2A42]/60 mt-1">Manage how you receive alerts and updates.</p>
                  </div>
                  <div className="space-y-4">
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
                    
                    <div className="mt-10 pt-6 border-t border-[#5D2A42]/10 flex justify-end">
                      <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white px-8 py-2 h-11 rounded-xl shadow-none font-medium transition-colors">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Settings"}
                      </Button>
                    </div>
                  </div>
                </div>
            )}

            {activeTab === "privacy" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">Privacy and safety</h2>
                    <p className="text-[#5D2A42]/60 mt-1">Control who can see your profile and activity.</p>
                  </div>
                  <div className="space-y-4">

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
                    
                    <div className="mt-10 pt-6 border-t border-[#5D2A42]/10 flex justify-end">
                      <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white px-8 py-2 h-11 rounded-xl shadow-none font-medium transition-colors">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Settings"}
                      </Button>
                    </div>
                  </div>
                </div>
            )}

            {activeTab === "security" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">Security and access</h2>
                    <p className="text-[#5D2A42]/60 mt-1">Protect your account with additional security measures.</p>
                  </div>
                  <div className="space-y-4">

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
                    
                    <div className="mt-10 pt-6 border-t border-[#5D2A42]/10 flex justify-end">
                      <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white px-8 py-2 h-11 rounded-xl shadow-none font-medium transition-colors">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Settings"}
                      </Button>
                    </div>
                  </div>
                </div>
            )}

            {activeTab === "account" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">Your Account</h2>
                    <p className="text-[#5D2A42]/60 mt-1">See information about your account, change your password, or learn about account deactivation options.</p>
                  </div>
                  
                  <div className="space-y-8">
                    {/* CHANGE PASSWORD */}
                    <div className="p-6 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-2xl space-y-4">
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
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      <CameraModal 
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(imgSrc) => {
          setShowCameraModal(false);
          setCropImageSrc(imgSrc);
          setShowCropModal(true);
        }}
      />

      {/* Avatar Crop Modal */}
      {showCropModal && cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onSave={handleCroppedUpload}
          onClose={() => {
            setShowCropModal(false);
            if (cropImageSrc) {
              URL.revokeObjectURL(cropImageSrc);
              setCropImageSrc(null);
            }
          }}
        />
      )}
    </>
  );
};

export default Profile;
