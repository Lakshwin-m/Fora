import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Archive, Share2, Heart } from "lucide-react";
import {
  getUserPublicCapsules,
  PublicCapsule,
} from "@/services/communityServices";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { format } from "date-fns";
import { useTranslation } from "@/contexts/LanguageContext";

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

const UserCapsulesPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [capsules, setCapsules] = useState<PublicCapsule[]>([]);
  const [originals, setOriginals] = useState<PublicCapsule[]>([]);
  const [reshares, setReshares] = useState<PublicCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCapsule, setLastCapsule] = useState<any>(null);
  const [likedCapsules, setLikedCapsules] = useState<Set<string>>(new Set());

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) return;
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setUserProfile({
            uid: userId,
            ...userDoc.data(),
          } as UserProfile);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };
    loadUserProfile();
  }, [userId]);

  // Load capsules
  useEffect(() => {
    const loadCapsules = async () => {
      if (!userId) return;
      setLoading(true);
      const data = await getUserPublicCapsules(userId);
      setCapsules(data);

      // Separate originals and reshares
      const originals = data.filter((c) => !c.isReshare);
      const reshares = data.filter((c) => c.isReshare);
      setOriginals(originals);
      setReshares(reshares);

      setLastCapsule(data.length > 0 ? data[data.length - 1] : null);
      setHasMore(data.length === 12);
      setLoading(false);
    };
    loadCapsules();
  }, [userId]);

  const handleLoadMore = async () => {
    if (!hasMore || !lastCapsule || !userId) return;

    setLoadingMore(true);
    const newCapsules = await getUserPublicCapsules(userId, lastCapsule);

    if (newCapsules.length > 0) {
      setCapsules((prev) => [...prev, ...newCapsules]);

      // Update originals and reshares
      const allCapsules = [...capsules, ...newCapsules];
      setOriginals(allCapsules.filter((c) => !c.isReshare));
      setReshares(allCapsules.filter((c) => c.isReshare));

      setLastCapsule(newCapsules[newCapsules.length - 1]);
      setHasMore(newCapsules.length === 12);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleLike = (e: React.MouseEvent, capsuleId: string) => {
    e.stopPropagation();
    setLikedCapsules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(capsuleId)) {
        newSet.delete(capsuleId);
      } else {
        newSet.add(capsuleId);
      }
      return newSet;
    });
    // TODO: Persist like to Firestore
  };

  const CapsuleCard = ({
    capsule,
    isReshare,
  }: {
    capsule: PublicCapsule;
    isReshare?: boolean;
  }) => (
    <Card
      className="border-[#5D2A42]/20 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white hover:border-[#FB6376]/30 group"
      onClick={() => navigate(`/community/capsule/${capsule.id}`)}
    >
      <CardContent className="p-6 space-y-4">
        {/* Show reshare indicator + Like button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-[#FB6376]">
            {isReshare && (
              <>
                <Share2 className="w-3 h-3" />
                <span>{t('userCapsules.reshared')}</span>
              </>
            )}
          </div>
          <button
            onClick={(e) => handleLike(e, capsule.id)}
            className="p-1 hover:bg-[#FFDCCC] rounded-lg transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                likedCapsules.has(capsule.id)
                  ? "fill-[#FB6376] text-[#FB6376]"
                  : "text-[#5D2A42]/40"
              }`}
            />
          </button>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-[#5D2A42] line-clamp-2 group-hover:text-[#FB6376] transition-colors">
            {capsule.title}
          </h3>
        </div>

        {/* Content preview */}
        <p className="text-sm text-[#5D2A42]/70 line-clamp-3">
          {capsule.content}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between pt-2 border-t border-[#5D2A42]/10">
          <div className="text-xs text-[#5D2A42]/60">
            {format(capsule.createdAt.toDate(), "MMM dd, yyyy")}
          </div>
          {capsule.category && (
            <Badge
              variant="outline"
              className="border-[#5D2A42]/20 text-[#5D2A42] text-xs"
            >
              {capsule.category}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/community")}
          className="mb-6 text-[#5D2A42] hover:bg-[#FFDCCC]/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('userCapsules.backToArchive')}
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
          </div>
        ) : !userProfile ? (
          <div className="text-center py-16">
            <Archive className="w-16 h-16 mx-auto mb-4 text-[#5D2A42]/30" />
            <h3 className="text-lg font-semibold text-[#5D2A42]">
              {t('userCapsules.userNotFound')}
            </h3>
          </div>
        ) : capsules.length === 0 ? (
          <div>
            {/* User header */}
            <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-[#5D2A42]/10">
              <Avatar className="w-20 h-20">
                <AvatarImage
                  src={userProfile.photoURL}
                  alt={userProfile.name}
                />
                <AvatarFallback className="bg-[#FB6376] text-white text-2xl">
                  {getInitials(userProfile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-[#5D2A42]">
                  {userProfile.name}
                </h1>
                {userProfile.bio && (
                  <p className="text-[#5D2A42]/70 mt-1">{userProfile.bio}</p>
                )}
              </div>
            </div>

            {/* Empty state */}
            <div className="text-center py-16">
              <Archive className="w-16 h-16 mx-auto mb-4 text-[#5D2A42]/30" />
              <h3 className="text-lg font-semibold text-[#5D2A42]">
                {t('userCapsules.noPublicCapsules')}
              </h3>
              <p className="text-[#5D2A42]/70">
                {t('userCapsules.noPublicCapsulesDesc')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* User header */}
            <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-[#5D2A42]/10">
              <Avatar className="w-20 h-20">
                <AvatarImage
                  src={userProfile.photoURL}
                  alt={userProfile.name}
                />
                <AvatarFallback className="bg-[#FB6376] text-white text-2xl">
                  {getInitials(userProfile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-[#5D2A42]">
                  {userProfile.name}
                </h1>
                {userProfile.bio && (
                  <p className="text-[#5D2A42]/70 mt-1">{userProfile.bio}</p>
                )}
                <p className="text-sm text-[#5D2A42]/60 mt-2">
                  {capsules.length} {capsules.length !== 1 ? t('userCapsules.capsulePlural') : t('userCapsules.capsuleSingle')}
                </p>
              </div>
            </div>

            {/* Original Capsules Section */}
            {originals.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#5D2A42] mb-6">
                  {t('userCapsules.originalCapsules')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {originals.map((capsule) => (
                    <CapsuleCard
                      key={capsule.id}
                      capsule={capsule}
                      isReshare={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reshared Capsules Section */}
            {reshares.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-[#5D2A42] mb-6 flex items-center space-x-2">
                  <Share2 className="w-5 h-5" />
                  <span>{t('userCapsules.resharedCapsules')}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reshares.map((capsule) => (
                    <CapsuleCard
                      key={capsule.id}
                      capsule={capsule}
                      isReshare={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Load More button */}
            {hasMore && (
              <div className="flex justify-center pt-12">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('userCapsules.loading')}
                    </>
                  ) : (
                    t('userCapsules.loadMore')
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserCapsulesPage;
