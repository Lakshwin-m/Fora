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
  UserPlus,
  UserCheck,
  ChevronLeft,
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { apiGetFriends, apiSendFriendRequest } from "@/services/friendServices";
import { useTranslation } from "@/contexts/LanguageContext";

const UserProfile = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
    <div className="min-h-screen bg-[#FFF9EC] font-sans selection:bg-[#FB6376] selection:text-white pb-20">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 text-[#5D2A42]/60 hover:text-[#5D2A42] hover:bg-[#FFDCCC]/30 rounded-full pl-2 pr-4"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          {t('userProfile.back')}
        </Button>

        <div className="bg-white rounded-3xl shadow-sm border border-[#5D2A42]/10 overflow-hidden">
          {/* Banner */}
          <div className="bg-[#5D2A42] h-40 sm:h-56 relative"></div>
          
          <div className="px-6 sm:px-10 pb-10">
            {/* Top Row: Avatar & Actions */}
            <div className="flex justify-between items-start -mt-16 sm:-mt-20 mb-6">
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white bg-white shadow-sm rounded-full overflow-hidden">
                <AvatarImage
                  src={targetUser?.photoURL}
                  alt={targetUser?.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-3xl font-semibold">
                  {getInitials(targetUser?.name || "User")}
                </AvatarFallback>
              </Avatar>

              <div className="pt-20">
                {!isFriend && !hasSentRequest && (
                  <Button
                    onClick={handleConnect}
                    disabled={actionLoading}
                    className="bg-[#FB6376] hover:bg-[#F04860] text-white rounded-full font-bold px-8 h-10 transition-colors shadow-sm shadow-[#FB6376]/20"
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
                    className="bg-[#5D2A42]/10 text-[#5D2A42]/60 rounded-full font-bold px-8 h-10 border border-[#5D2A42]/10 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {t('userProfile.requested')}
                  </Button>
                )}
                {isFriend && (
                  <Button
                    variant="outline"
                    className="border-[#5D2A42]/20 text-[#5D2A42] rounded-full font-bold px-8 h-10 hover:bg-[#FFF9EC]"
                  >
                    {t('userProfile.following')}
                  </Button>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-[#5D2A42] tracking-tight">
                  {targetUser?.name || "User"}
                </h1>
                {targetUser?.isVerified && <VerifiedBadge className="w-6 h-6" />}
              </div>
              <p className="text-[#5D2A42]/60 text-lg font-medium">
                {targetUser?.username ? `@${targetUser.username}` : ""}
              </p>
            </div>

            {canSeeFullProfile ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {targetUser?.bio && (
                  <div className="mb-8">
                    <p className="text-[#5D2A42]/90 text-lg leading-relaxed whitespace-pre-wrap">
                      {targetUser.bio}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[#5D2A42]/60 font-medium mb-8">
                  {targetUser?.location && (
                    <span className="flex items-center gap-2">
                      <Globe className="w-5 h-5 opacity-70" />
                      {targetUser.location}
                    </span>
                  )}
                  {targetUser?.createdAt && (
                    <span className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 opacity-70" />
                      {t('userProfile.joined')} {new Date(targetUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-8 border-t border-[#5D2A42]/10 pt-8">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[#5D2A42]">
                      {targetUser?.connections || 0}
                    </span>
                    <span className="text-sm font-semibold text-[#5D2A42]/50 uppercase tracking-wider">
                      {t('userProfile.statsFollowing')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[#5D2A42]">
                      {targetUser?.connections || 0}
                    </span>
                    <span className="text-sm font-semibold text-[#5D2A42]/50 uppercase tracking-wider">
                      {t('userProfile.statsFollowers')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12 py-16 px-6 bg-[#FFF9EC]/50 rounded-3xl border border-[#5D2A42]/5 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-[#5D2A42]/40" />
                </div>
                <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">
                  {t('userProfile.protectedTitle')}
                </h3>
                <p className="text-[#5D2A42]/60 max-w-sm text-lg">
                  {visibility === "private" 
                    ? t('userProfile.protectedPrivate')
                    : t('userProfile.protectedConnections')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
