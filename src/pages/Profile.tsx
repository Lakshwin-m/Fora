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
import { doc, getDoc, updateDoc, setDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, writeBatch } from "firebase/firestore";
import { formatFirebaseDate, parseFirebaseDate } from "@/lib/date";
import { useCapsuleDecryption } from "@/hooks/useCapsuleDecryption";
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
  Unlock,
  Clock,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import CountrySelect from "@/components/CountrySelect";
import AvatarCropModal from "@/components/AvatarCropModal";
import CameraModal from "@/components/CameraModal";
import VerifiedBadge from "@/components/VerifiedBadge";
import countriesData from "@/data/countries.json";
import { apiGetFriends } from "@/services/friendServices";
import { useTranslation } from "@/contexts/LanguageContext";

const getCountryFlag = (countryName: string) => {
  const country = (countriesData as any[]).find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return country ? `https://flagsapi.com/${country.code}/flat/24.png` : null;
};

const renderBioWithMentions = (bioText: string) => {
  if (!bioText) return null;
  const parts = bioText.split(/(@[a-zA-Z0-9_.]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="text-[#5D2A42] font-semibold hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    return part;
  });
};

const ProfileCapsuleCard = ({ capsule, onClick }: { capsule: any; onClick: () => void }) => {
  const { decryptCapsule } = useCapsuleDecryption();
  const [title, setTitle] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsDecrypting(true);
    decryptCapsule(capsule).then((res) => {
      if (mounted) {
        setTitle(res.title);
        setIsDecrypting(false);
      }
    });
    return () => { mounted = false; };
  }, [capsule, decryptCapsule]);

  const unlockDate = parseFirebaseDate(capsule.unlockDate || capsule.deliveryDate) ?? new Date(0);
  const isUnlocked = unlockDate.getTime() <= new Date().getTime() || capsule.isUnlocked;

  return (
    <div 
      onClick={onClick}
      className="group aspect-square relative rounded-2xl border border-[#5D2A42]/10 bg-white p-4 flex flex-col justify-between hover:border-[#FB6376] hover:shadow-md cursor-pointer transition-all duration-300 overflow-hidden"
    >
      {/* Background Pattern / Icon */}
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {isUnlocked ? (
          <Unlock className="w-24 h-24 text-[#5D2A42]" />
        ) : (
          <Lock className="w-24 h-24 text-[#5D2A42]" />
        )}
      </div>

      {/* Header: Status badge */}
      <div className="flex justify-between items-start z-10">
        {isUnlocked ? (
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            UNLOCKED
          </span>
        ) : (
          <span className="bg-[#5D2A42]/5 text-[#5D2A42] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#5D2A42]/10">
            LOCKED
          </span>
        )}
      </div>

      {/* Body: Title */}
      <div className="z-10 mt-2 flex-1 flex flex-col justify-center">
        {isDecrypting ? (
          <div className="flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5D2A42]/50" />
            <span className="text-xs text-[#5D2A42]/40">Decrypting...</span>
          </div>
        ) : (
          <h4 className="font-bold text-sm text-[#5D2A42] line-clamp-3 leading-snug">
            {title || "Untitled Capsule"}
          </h4>
        )}
      </div>

      {/* Footer: Date */}
      <div className="flex items-center gap-1 text-[10px] text-[#5D2A42]/50 font-medium z-10 pt-2 border-t border-[#5D2A42]/5 mt-2">
        <Calendar className="w-3 h-3" />
        <span>{unlockDate.toLocaleDateString()}</span>
      </div>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [capsules, setCapsules] = useState<any[]>([]);

  // Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [userCapsulesCount, setUserCapsulesCount] = useState(0);

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

  useEffect(() => {
    if (activeTab !== "notifications" || !auth.currentUser) return;

    setLoadingNotifs(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setNotificationsList(list);
      setLoadingNotifs(false);
    }, (error) => {
      console.error("Error loading notifications:", error);
      setLoadingNotifs(false);
    });

    return () => unsubscribe();
  }, [activeTab, auth.currentUser]);

  const handleMarkAllRead = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", auth.currentUser.uid),
        where("read", "==", false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true });
      });
      await batch.commit();
      toast({
        title: "All marked as read",
        description: "Your notifications have been updated.",
      });
    } catch (err) {
      console.error("Error marking all read:", err);
      toast({
        title: "Error",
        description: "Failed to update notifications.",
        variant: "destructive",
      });
    }
  };

  const fetchUserProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        toast({
          title: t('common.error'),
          description: t('profile.toastSignInError'),
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
        setFriendsList(friendsData || []);
        actualConnectionsCount = friendsData?.length || 0;
      } catch (err) {
        console.error("Error fetching connections count:", err);
      }

      // Dev Team UIDs (Automatically Verified)
      const DEV_UIDS = ["OEeWgBvvQIgjIPiVZUqCHcXZtDf2"]; // Add dev UIDs here

      // Fetch capsules
      try {
        const capsulesQuery = query(collection(db, "capsules"), where("userId", "==", user.uid));
        const capsulesSnap = await getDocs(capsulesQuery);
        setUserCapsulesCount(capsulesSnap.size);
        const loadedCapsules = capsulesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        loadedCapsules.sort((a: any, b: any) => {
          const timeA = parseFirebaseDate(a.createdAt)?.getTime() || 0;
          const timeB = parseFirebaseDate(b.createdAt)?.getTime() || 0;
          return timeB - timeA;
        });
        setCapsules(loadedCapsules);
      } catch (e) {
        console.error("Error fetching capsules count:", e);
      }

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
        title: t('profile.toastSettingsUpdated'),
        description: t('profile.toastPreferencesSaved'),
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
          title: t('profile.toastFileTooLarge'),
          description: t('profile.toastFileTooLargeDesc'),
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

      toast({ title: t('profile.toastPhotoUpdated') });
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast({
        title: t('profile.toastUploadFailed'),
        description: err.code === "storage/unauthorized"
          ? t('profile.toastPermissionDenied')
          : err.message || t('profile.toastUploadFailedDesc'),
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
    { id: "account", label: t('profile.tabYourAccount'), icon: User },
    { id: "security", label: t('profile.tabSecurity'), icon: Shield },
    { id: "privacy", label: t('profile.tabPrivacy'), icon: Lock },
    { id: "notifications", label: t('profile.tabNotifications'), icon: Bell },
  ];

  return (
    <>
      <div className="min-h-screen bg-[#FFF9EC] font-sans selection:bg-[#FB6376] selection:text-white pb-20 md:pb-0">
        <Navigation />

        <main className="ml-0 md:ml-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Top Header Row with 3 dots */}
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 text-[#5D2A42] hover:bg-[#5D2A42]/5 rounded-full transition-colors"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Info Header */}
            <div className="flex items-center gap-6 md:gap-10 mb-6">
              {/* Avatar */}
              <div className="relative group rounded-full shrink-0">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-transparent bg-white shadow-sm overflow-hidden">
                  <AvatarImage src={profile.photoURL} alt={profile.name} className="object-cover" />
                  <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-2xl font-semibold">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Stats */}
              <div className="flex flex-1 justify-around text-center">
                <div className="flex flex-col items-center">
                  <span className="text-xl sm:text-2xl font-bold text-[#5D2A42]">{userCapsulesCount}</span>
                  <span className="text-xs sm:text-sm text-[#5D2A42]/70 font-medium">Capsules</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowFollowersModal(true)}
                >
                  <span className="text-xl sm:text-2xl font-bold text-[#5D2A42]">{profile.connectionsCount || 0}</span>
                  <span className="text-xs sm:text-sm text-[#5D2A42]/70 font-medium">Followers</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowFollowingModal(true)}
                >
                  <span className="text-xl sm:text-2xl font-bold text-[#5D2A42]">{profile.connectionsCount || 0}</span>
                  <span className="text-xs sm:text-sm text-[#5D2A42]/70 font-medium">Following</span>
                </div>
              </div>
            </div>
            
            {/* Bio section */}
            <div className="mb-8">
              <div className="flex items-center gap-1.5 mb-1">
                <h1 className="text-lg sm:text-xl font-bold text-[#5D2A42]">{profile.name}</h1>
                {profile.isVerified && <VerifiedBadge className="w-4 h-4" />}
              </div>
              <p className="text-[#5D2A42]/60 text-sm font-medium mb-2">
                {profile.username ? `@${profile.username}` : ""}
              </p>
              <p className="text-[#5D2A42]/90 text-sm whitespace-pre-wrap leading-relaxed mb-3">
                {profile.bio ? renderBioWithMentions(profile.bio) : <span className="text-[#5D2A42]/40 italic">{t('profile.noBioYet')}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#5D2A42]/60 text-xs sm:text-sm font-medium mb-4">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    {getCountryFlag(profile.location) ? (
                      <img src={getCountryFlag(profile.location)!} alt={profile.location} className="w-4 h-4 rounded-sm object-cover" />
                    ) : (
                      <Globe className="w-3 h-3 opacity-70" />
                    )}
                    {profile.location}
                  </span>
                )}
                {profile.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 opacity-70" />
                    {t('profile.joined')} {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>

              {/* Edit Profile Button */}
              <Button
                onClick={() => setIsEditProfileModalOpen(true)}
                variant="outline"
                className="w-full border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFF9EC] rounded-xl font-bold h-10 transition-colors shadow-none"
              >
                {t('profile.btnEditProfile') || "Edit Profile"}
              </Button>
            </div>

            {/* General Capsules Header Section */}
            <div className="flex justify-center border-t border-[#5D2A42]/10 mb-6">
              <div className="flex items-center gap-2 px-4 py-3 border-t-2 border-[#5D2A42] -mt-[1px]">
                <Globe className="w-4 h-4 text-[#5D2A42]" />
                <span className="text-sm font-bold text-[#5D2A42] uppercase tracking-wider">General Capsules</span>
              </div>
            </div>

            {/* Capsules Grid / Empty State */}
            {capsules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                 <div className="w-16 h-16 rounded-full bg-[#5D2A42]/5 flex items-center justify-center mb-4">
                   <Camera className="w-8 h-8 text-[#5D2A42]/20" />
                 </div>
                 <h3 className="text-xl font-bold text-[#5D2A42] mb-2">No Capsules Yet</h3>
                 <p className="text-[#5D2A42]/60 max-w-sm">When you create capsules, they will appear here on your profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-12 animate-in fade-in duration-500">
                {capsules.map((capsule) => {
                  const unlockDate = parseFirebaseDate(capsule.unlockDate || capsule.deliveryDate) ?? new Date(0);
                  const isUnlocked = unlockDate.getTime() <= new Date().getTime() || capsule.isUnlocked;
                  return (
                    <ProfileCapsuleCard
                      key={capsule.id}
                      capsule={capsule}
                      onClick={() => {
                        if (isUnlocked) {
                          navigate(`/capsule/${capsule.id}`, { state: { from: "profile" } });
                        } else {
                          toast({
                            title: "Capsule Locked",
                            description: `This capsule will unlock on ${unlockDate.toLocaleDateString()}`,
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 border-none bg-transparent overflow-hidden">
          <div className="flex flex-col md:flex-row bg-white rounded-3xl shadow-sm border border-[#5D2A42]/10 h-full w-full overflow-hidden">
            {/* Navigation Sidebar */}
          <div className="md:w-80 shrink-0 border-r border-[#5D2A42]/10 bg-white flex flex-col">
            <div className="p-6 pb-2">
              <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight mb-6">{t('profile.settingsTitle')}</h2>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5D2A42]/50" />
                <Input
                  placeholder={t('profile.searchSettings')}
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


            {activeTab === "notifications" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">{t('profile.notificationsHeader')}</h2>
                    <p className="text-[#5D2A42]/60 mt-1">{t('profile.notificationsDesc')}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="email-notifications" className="text-[#5D2A42] font-semibold text-sm">
                            {t('profile.emailNotifications')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.emailNotificationsDesc')}
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
                            {t('profile.pushNotifications')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.pushNotificationsDesc')}
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
                            {t('profile.capsuleReminders')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.capsuleRemindersDesc')}
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
                            {t('profile.connectionRequests')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.connectionRequestsDesc')}
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
                            {t('profile.weeklyDigest')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.weeklyDigestDesc')}
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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('profile.btnSaving')}</> : t('profile.saveSettings')}
                      </Button>
                    </div>

                    {/* Recent Notifications List */}
                    <div className="mt-12 pt-8 border-t border-[#5D2A42]/10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-[#5D2A42]">Recent Notifications</h3>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">Your updates, reminders, and activity history.</p>
                        </div>
                        {notificationsList.length > 0 && notificationsList.some(n => !n.read) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFF9EC] rounded-xl text-xs font-semibold px-4 h-8 transition-colors"
                          >
                            Mark all as read
                          </Button>
                        )}
                      </div>

                      {loadingNotifs ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-[#FB6376]" />
                        </div>
                      ) : notificationsList.length === 0 ? (
                        <div className="text-center py-8 bg-[#FFF9EC]/30 rounded-2xl border border-dashed border-[#5D2A42]/10 p-6">
                          <Bell className="w-8 h-8 text-[#5D2A42]/30 mx-auto mb-2" />
                          <p className="text-sm text-[#5D2A42]/60 font-medium">No recent notifications</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {notificationsList.map((notif) => {
                            const Icon = notif.type === "capsule_unlocked" ? Unlock : notif.type === "prior_reminder" ? Clock : Bell;
                            const isUnread = !notif.read;

                            return (
                              <div
                                key={notif.id}
                                className={`flex items-start justify-between p-4 rounded-xl border transition-all duration-200 ${
                                  isUnread
                                    ? "bg-[#FFDCCC]/20 border-[#FB6376]/30 shadow-sm"
                                    : "bg-white border-[#5D2A42]/5"
                                }`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`p-2 rounded-lg mt-0.5 ${
                                    isUnread ? "bg-[#FB6376]/10 text-[#FB6376]" : "bg-[#5D2A42]/5 text-[#5D2A42]/60"
                                  }`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm leading-snug break-words ${isUnread ? "font-semibold text-[#5D2A42]" : "text-[#5D2A42]/80"}`}>
                                      {notif.message}
                                    </p>
                                    <span className="text-xs text-[#5D2A42]/40 mt-1 block font-medium">
                                      {notif.createdAt ? formatFirebaseDate(notif.createdAt) : "Just now"}
                                    </span>
                                  </div>
                                </div>
                                {isUnread && (
                                  <span className="w-2.5 h-2.5 bg-[#FB6376] rounded-full ml-3 mt-2 flex-shrink-0 animate-pulse" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            )}

            {activeTab === "privacy" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">{t('profile.privacyHeader')}</h2>
                    <p className="text-[#5D2A42]/60 mt-1">{t('profile.privacyDesc')}</p>
                  </div>
                  <div className="space-y-4">

                      <div className="p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="mb-4">
                          <Label className="text-[#5D2A42] font-semibold text-sm">{t('profile.profileVisibility')}</Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.profileVisibilityDesc')}
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
                            <span className="flex items-center mb-1"><Globe className="w-4 h-4 mr-2" /> {t('profile.visibilityPublic')}</span>
                            <span className="text-xs opacity-70 font-normal">{t('profile.visibilityPublicDesc')}</span>
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
                            <span className="flex items-center mb-1"><User className="w-4 h-4 mr-2" /> {t('profile.visibilityConnections')}</span>
                            <span className="text-xs opacity-70 font-normal">{t('profile.visibilityConnectionsDesc')}</span>
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
                            <span className="flex items-center mb-1"><Lock className="w-4 h-4 mr-2" /> {t('profile.visibilityPrivate')}</span>
                            <span className="text-xs opacity-70 font-normal">{t('profile.visibilityPrivateDesc')}</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="allow-search" className="text-[#5D2A42] font-semibold text-sm">
                            {t('profile.allowSearch')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.allowSearchDesc')}
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
                            {t('profile.showOnlineStatus')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.showOnlineStatusDesc')}
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
                            {t('profile.capsulePreview')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.capsulePreviewDesc')}
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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('profile.btnSaving')}</> : t('profile.saveSettings')}
                      </Button>
                    </div>
                  </div>
                </div>
            )}

            {activeTab === "security" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">{t('profile.securityHeader')}</h2>
                    <p className="text-[#5D2A42]/60 mt-1">{t('profile.securityDesc')}</p>
                  </div>
                  <div className="space-y-4">

                      <div className="flex items-center justify-between p-4 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-xl">
                        <div className="pr-6">
                          <Label htmlFor="two-factor" className="text-[#5D2A42] font-semibold text-sm">
                            {t('profile.twoFactor')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.twoFactorDesc')}
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
                            {t('profile.loginAlerts')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.loginAlertsDesc')}
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
                            {t('profile.sessionTimeout')}
                          </Label>
                          <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                            {t('profile.sessionTimeoutDesc')}
                          </p>
                        </div>
                        <select
                          id="session-timeout"
                          value={settings.sessionTimeout}
                          onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                          className="h-10 px-3 py-1 rounded-xl bg-white border border-[#5D2A42]/20 text-[#5D2A42] focus:outline-none focus:border-[#FB6376] focus:ring-1 focus:ring-[#FB6376]"
                        >
                          <option value="15">{t('profile.timeout15')}</option>
                          <option value="30">{t('profile.timeout30')}</option>
                          <option value="60">{t('profile.timeout60')}</option>
                          <option value="0">{t('profile.timeoutNever')}</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-10 pt-6 border-t border-[#5D2A42]/10 flex justify-end">
                      <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#5D2A42] hover:bg-[#5D2A42]/90 text-white px-8 py-2 h-11 rounded-xl shadow-none font-medium transition-colors">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('profile.btnSaving')}</> : t('profile.saveSettings')}
                      </Button>
                    </div>
                  </div>
                </div>
            )}

            {activeTab === "account" && (
              <div className="animate-in fade-in duration-300 min-h-[500px]">
                <div className="p-6 md:p-10 max-w-3xl">
                  <div className="mb-8 border-b border-[#5D2A42]/10 pb-6">
                    <h2 className="text-2xl font-bold text-[#5D2A42] tracking-tight">{t('profile.yourAccountHeader')}</h2>
                    <p className="text-[#5D2A42]/60 mt-1">{t('profile.yourAccountDesc')}</p>
                  </div>
                  
                  <div className="space-y-8">
                    {/* CHANGE PASSWORD */}
                    <div className="p-6 bg-[#FFF9EC]/50 border border-[#5D2A42]/5 rounded-2xl space-y-4">
                      <div className="mb-2">
                        <Label className="text-[#5D2A42] font-semibold text-base">{t('profile.changePassword')}</Label>
                        <p className="text-sm text-[#5D2A42]/60 mt-0.5">
                          {t('profile.changePasswordDesc')}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#5D2A42] font-medium">{t('profile.currentPassword')}</Label>
                          <Input type="password" placeholder="••••••••" className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-white h-10 rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#5D2A42] font-medium">{t('profile.newPassword')}</Label>
                            <Input type="password" placeholder="••••••••" className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-white h-10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-[#5D2A42] font-medium">{t('profile.confirmNewPassword')}</Label>
                            <Input type="password" placeholder="••••••••" className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-white h-10 rounded-xl" />
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-white rounded-xl">
                            {t('profile.updatePassword')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* DANGER ZONE */}
                    <div className="pt-4 border-t border-red-500/10">
                      <div className="mb-4">
                        <h3 className="text-red-600 font-semibold text-lg flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2 opacity-80" />
                          {t('profile.dangerZone')}
                        </h3>
                        <p className="text-sm text-red-600/60 mt-1">
                          {t('profile.dangerZoneDesc')}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl gap-4">
                        <div className="pr-6">
                          <Label className="text-red-700 font-semibold text-sm">
                            {t('profile.deleteAccount')}
                          </Label>
                          <p className="text-sm text-red-600/70 mt-0.5">
                            {t('profile.deleteAccountDesc')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="shrink-0 rounded-xl bg-red-500 hover:bg-red-600 shadow-none border border-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('profile.deleteAccount')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Modal */}
      <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-none">
           <DialogHeader>
             <DialogTitle className="text-xl font-bold text-[#5D2A42] text-center border-b border-[#5D2A42]/10 pb-4">Followers</DialogTitle>
           </DialogHeader>
           {friendsList.length === 0 ? (
             <div className="py-6 text-center text-[#5D2A42]/60">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
             </div>
           ) : (
             <div className="max-h-[300px] overflow-y-auto space-y-3">
               {friendsList.map((friend) => (
                 <div 
                   key={friend.id} 
                   className="flex items-center gap-3 p-2 hover:bg-[#FFF9EC]/50 rounded-xl cursor-pointer transition-colors"
                   onClick={() => {
                     setShowFollowersModal(false);
                     if (friend.profile?.uid) {
                       navigate(`/profile/${friend.profile.uid}`);
                     }
                   }}
                 >
                   <Avatar className="w-10 h-10 border border-[#5D2A42]/10 bg-white">
                     <AvatarImage src={friend.profile?.photoURL} alt={friend.profile?.name} className="object-cover" />
                     <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-sm font-semibold">
                       {getInitials(friend.profile?.name || "")}
                     </AvatarFallback>
                   </Avatar>
                   <div className="flex-1">
                     <h4 className="text-sm font-bold text-[#5D2A42]">{friend.profile?.name || "User"}</h4>
                     <p className="text-xs text-[#5D2A42]/60">@{friend.profile?.username || "username"}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-none">
           <DialogHeader>
             <DialogTitle className="text-xl font-bold text-[#5D2A42] text-center border-b border-[#5D2A42]/10 pb-4">Following</DialogTitle>
           </DialogHeader>
           {friendsList.length === 0 ? (
             <div className="py-6 text-center text-[#5D2A42]/60">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
             </div>
           ) : (
             <div className="max-h-[300px] overflow-y-auto space-y-3">
               {friendsList.map((friend) => (
                 <div 
                   key={friend.id} 
                   className="flex items-center gap-3 p-2 hover:bg-[#FFF9EC]/50 rounded-xl cursor-pointer transition-colors"
                   onClick={() => {
                     setShowFollowingModal(false);
                     if (friend.profile?.uid) {
                       navigate(`/profile/${friend.profile.uid}`);
                     }
                   }}
                 >
                   <Avatar className="w-10 h-10 border border-[#5D2A42]/10 bg-white">
                     <AvatarImage src={friend.profile?.photoURL} alt={friend.profile?.name} className="object-cover" />
                     <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-sm font-semibold">
                       {getInitials(friend.profile?.name || "")}
                     </AvatarFallback>
                   </Avatar>
                   <div className="flex-1">
                     <h4 className="text-sm font-bold text-[#5D2A42]">{friend.profile?.name || "User"}</h4>
                     <p className="text-xs text-[#5D2A42]/60">@{friend.profile?.username || "username"}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={isEditProfileModalOpen} onOpenChange={setIsEditProfileModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 border-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#5D2A42] text-center border-b border-[#5D2A42]/10 pb-4">
              Edit Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="relative group rounded-full">
                <Avatar className="w-24 h-24 border-2 border-[#5D2A42]/10 bg-white shadow-sm overflow-hidden">
                  <AvatarImage src={profile.photoURL} alt={profile.name} className="object-cover" />
                  <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-xl font-semibold">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={uploadingPhoto}
                      className="absolute inset-0 m-auto w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-sm disabled:opacity-100 outline-none"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 bg-white border-[#5D2A42]/10 rounded-xl shadow-lg p-1">
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#FB6376] focus:bg-[#FFF9EC] focus:text-[#FB6376] rounded-lg p-2 font-medium outline-none"
                      onClick={() => triggerImageUpload()}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {t('profile.uploadGallery')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#FB6376] focus:bg-[#FFF9EC] focus:text-[#FB6376] rounded-lg p-2 font-medium outline-none"
                      onClick={() => setShowCameraModal(true)}
                    >
                      <Camera className="w-4 h-4" />
                      {t('profile.takePhoto')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="text-xs text-[#5D2A42]/60">Change profile photo</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[#5D2A42] font-semibold text-sm">
                {t('profile.fullName')}
              </Label>
              <Input
                id="edit-name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-username" className="text-[#5D2A42] font-semibold text-sm">
                {t('profile.username')}
              </Label>
              <Input
                id="edit-username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value.replace(/\s+/g, "") })}
                className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-[#5D2A42] font-semibold text-sm">
                {t('profile.emailAddress')}
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location" className="text-[#5D2A42] font-semibold text-sm">
                {t('profile.location')}
              </Label>
              <CountrySelect
                value={profile.location}
                onChange={(val) => setProfile({ ...profile, location: val })}
                placeholder={t('profile.locationPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio" className="text-[#5D2A42] font-semibold text-sm">
                {t('profile.bio')}
              </Label>
              <Textarea
                id="edit-bio"
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder={t('profile.bioPlaceholder')}
                maxLength={500}
                className="border-[#5D2A42]/20 focus:border-[#FB6376] bg-[#FFF9EC]/50 hover:bg-white text-[#5D2A42] rounded-xl min-h-[100px] resize-none"
              />
              <div className="text-right text-xs text-[#5D2A42]/40 font-medium pt-1">
                {(profile.bio || "").length} / 500
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#5D2A42]/10 flex justify-end gap-3">
            <Button
              onClick={() => setIsEditProfileModalOpen(false)}
              disabled={saving}
              variant="ghost"
              className="text-[#5D2A42] hover:bg-[#FFDCCC]/50 px-6 py-2 h-11 rounded-xl shadow-none font-medium transition-colors"
            >
              {t('profile.btnCancel')}
            </Button>
            <Button
              onClick={async () => {
                await handleSaveProfile();
                setIsEditProfileModalOpen(false);
              }}
              disabled={saving}
              className="bg-[#FB6376] hover:bg-[#F04860] text-white px-6 py-2 h-11 rounded-xl shadow-none font-medium transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('profile.btnSaving')}
                </>
              ) : (
                t('profile.btnSaveChanges')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
