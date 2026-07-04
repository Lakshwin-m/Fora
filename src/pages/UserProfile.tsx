import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Loader2,
  Globe,
  Calendar,
  Lock,
  Unlock,
  Camera,
  UserPlus,
  UserCheck,
  ChevronLeft,
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { parseFirebaseDate } from "@/lib/date";
import { useCapsuleDecryption } from "@/hooks/useCapsuleDecryption";
import { apiGetFriends, apiSendFriendRequest } from "@/services/friendServices";
import { useTranslation } from "@/contexts/LanguageContext";

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

const UserProfile = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [targetCapsulesCount, setTargetCapsulesCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [capsules, setCapsules] = useState<any[]>([]);

  useEffect(() => {
    if (uid === auth.currentUser?.uid) {
      navigate("/profile");
      return;
    }
    fetchData();
  }, [uid]);

  const fetchData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      // 1. Fetch Target User Profile
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast({
          title: t('common.error'),
          description: t('userProfile.toastUserNotFound'),
          variant: "destructive",
        });
        navigate("/connections");
        return;
      }

      const userData = userSnap.data();
      setTargetUser(userData);

      // 2. Check Friendship Status
      const friendsData = await apiGetFriends();
      const connected = friendsData.some((f: any) => f.profile?.uid === uid);
      setIsFriend(connected);

      // 3. Fetch target user's capsules
      try {
        const { query, collection, where, getDocs } = await import("firebase/firestore");
        const capsulesQuery = query(collection(db, "capsules"), where("userId", "==", uid));
        const capsulesSnap = await getDocs(capsulesQuery);
        setTargetCapsulesCount(capsulesSnap.size);
        
        const loadedCapsules = capsulesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter capsules based on visibility
        const visibleCapsules = loadedCapsules.filter((capsule: any) => {
          if (capsule.visibility === "public") return true;
          if (capsule.visibility === "connections" && connected) return true;
          if (capsule.recipients?.includes(auth.currentUser?.uid || "")) return true;
          return false;
        });

        // Sort in memory by createdAt descending
        visibleCapsules.sort((a: any, b: any) => {
          const timeA = parseFirebaseDate(a.createdAt)?.getTime() || 0;
          const timeB = parseFirebaseDate(b.createdAt)?.getTime() || 0;
          return timeB - timeA;
        });

        setCapsules(visibleCapsules);
      } catch (e) {
        console.error("Error fetching target user capsules:", e);
      }

      // Note: In a real app, we'd also check pending requests sent by the current user.
      // For now, we'll assume people can try sending a request if not friends.
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: t('common.error'),
        description: t('userProfile.toastLoadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!uid) return;
    setActionLoading(true);
    try {
      await apiSendFriendRequest(uid);
      setHasSentRequest(true);
      toast({ title: t('userProfile.toastRequestSent') });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('userProfile.toastRequestFailed'),
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
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

  const visibility = targetUser?.settings?.profileVisibility || "public";
  const canSeeFullProfile = 
    visibility === "public" || 
    (visibility === "connections" && isFriend);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#FFF9EC] font-sans selection:bg-[#FB6376] selection:text-white pb-20 md:pb-0">
      <Navigation />

      <main className="ml-0 md:ml-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Top Header Row with Back button */}
          <div className="flex justify-between items-center mb-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="p-2 text-[#5D2A42] hover:bg-[#5D2A42]/5 rounded-full transition-colors pl-2 pr-4"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              {t('userProfile.back')}
            </Button>
          </div>

          {/* Profile Info Header */}
          <div className="flex items-center gap-6 md:gap-10 mb-6">
            {/* Avatar */}
            <div className="relative group rounded-full shrink-0">
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-transparent bg-white shadow-sm overflow-hidden">
                <AvatarImage src={targetUser?.photoURL} alt={targetUser?.name} className="object-cover" />
                <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-2xl font-semibold">
                  {getInitials(targetUser?.name)}
                </AvatarFallback>
              </Avatar>

            </div>

            {/* Stats */}
            <div className="flex flex-1 justify-around text-center">
              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-bold text-[#5D2A42]">{targetCapsulesCount}</span>
                <span className="text-xs sm:text-sm text-[#5D2A42]/70 font-medium">Capsules</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-bold text-[#5D2A42]">{targetUser?.connectionsCount || 0}</span>
                <span className="text-xs sm:text-sm text-[#5D2A42]/70 font-medium">Followers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-bold text-[#5D2A42]">{targetUser?.connectionsCount || 0}</span>
                <span className="text-xs sm:text-sm text-[#5D2A42]/70 font-medium">Following</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mb-6 w-full">
            {!isFriend && !hasSentRequest && (
              <Button
                onClick={handleConnect}
                disabled={actionLoading}
                className="w-full bg-[#FB6376] hover:bg-[#F04860] text-white rounded-xl font-bold h-10 transition-colors shadow-none"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {t('userProfile.follow')}
              </Button>
            )}
            {hasSentRequest && (
              <Button
                disabled
                className="w-full bg-[#5D2A42]/10 text-[#5D2A42]/60 rounded-xl font-bold h-10 border border-[#5D2A42]/10 transition-colors shadow-none"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {t('userProfile.requested')}
              </Button>
            )}
            {isFriend && (
              <Button
                variant="outline"
                className="w-full border-[#5D2A42]/20 text-[#5D2A42] rounded-xl font-bold h-10 hover:bg-[#FFF9EC] shadow-none"
              >
                {t('userProfile.following')}
              </Button>
            )}
          </div>
          
          {/* Bio section */}
          <div className="mb-8">
            <div className="flex items-center gap-1.5 mb-1">
              <h1 className="text-lg sm:text-xl font-bold text-[#5D2A42]">{targetUser?.name}</h1>
              {targetUser?.isVerified && <VerifiedBadge className="w-4 h-4" />}
            </div>
            <p className="text-[#5D2A42]/60 text-sm font-medium mb-2">
              {targetUser?.username ? `@${targetUser.username}` : ""}
            </p>
            
            {canSeeFullProfile ? (
              <>
                <p className="text-[#5D2A42]/90 text-sm whitespace-pre-wrap leading-relaxed mb-3">
                  {targetUser?.bio ? renderBioWithMentions(targetUser.bio) : ""}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#5D2A42]/60 text-xs sm:text-sm font-medium">
                  {targetUser?.location && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 opacity-70" />
                      {targetUser.location}
                    </span>
                  )}
                  {targetUser?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 opacity-70" />
                      {t('profile.joined')} {new Date(targetUser.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-8 py-10 px-6 bg-[#FFF9EC]/50 rounded-2xl border border-[#5D2A42]/5 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-[#5D2A42]/40" />
                </div>
                <h3 className="text-xl font-bold text-[#5D2A42] mb-2">
                  {t('userProfile.protectedTitle')}
                </h3>
                <p className="text-[#5D2A42]/60 max-w-sm text-sm">
                  {visibility === "private" 
                    ? t('userProfile.protectedPrivate')
                    : t('userProfile.protectedConnections')}
                </p>
              </div>
            )}
          </div>

          <hr className="border-[#5D2A42]/10 mb-8" />

          {/* General Capsules Section */}
          {canSeeFullProfile && (
            <>
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
                   <p className="text-[#5D2A42]/60 max-w-sm">This user hasn't created any capsules yet.</p>
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
                            navigate(`/capsule/${capsule.id}`, { state: { from: "user-profile", userId: uid } });
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
