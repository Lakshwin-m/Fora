import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Archive, Heart } from "lucide-react";
import {
  getPublicCapsules,
  getCapsuleCategories,
  PublicCapsule,
  likeCapsule,
  unlikeCapsule,
  hasUserLikedCapsule,
  getUserLikedCapsules,
  subscribeToLikeUpdates,
} from "@/services/communityServices";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getAuth } from "firebase/auth";
import { useTranslation } from "@/contexts/LanguageContext";

const ExploreCapsulesPage = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { t } = useTranslation();
  const [capsules, setCapsules] = useState<PublicCapsule[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "mostReshared">("newest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCapsule, setLastCapsule] = useState<any>(null);
  const [likedCapsules, setLikedCapsules] = useState<Set<string>>(new Set());
  const unsubscribesRef = useRef<{ [key: string]: () => void }>({});

  // Load categories and user's liked capsules on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const cats = await getCapsuleCategories();
      setCategories(cats);

      // Load user's liked capsules
      if (auth.currentUser) {
        const userLikes = await getUserLikedCapsules(auth.currentUser.uid);
        setLikedCapsules(new Set(userLikes));
      }
    };
    loadInitialData();
  }, []);

  // Load capsules when category or sort changes
  useEffect(() => {
    const loadCapsules = async () => {
      setLoading(true);
      try {
        const data = await getPublicCapsules(
          selectedCategory === "all" ? undefined : selectedCategory,
          sortBy
        );
        console.log("Loaded public capsules:", data);
        setCapsules(data);
        setLastCapsule(data.length > 0 ? data[data.length - 1] : null);
        setHasMore(data.length === 12);

        // Set up real-time listeners for like counts
        data.forEach((capsule) => {
          // Unsubscribe from any existing listener for this capsule
          if (unsubscribesRef.current[capsule.id]) {
            unsubscribesRef.current[capsule.id]();
          }

          // Subscribe to real-time like updates
          const unsubscribe = subscribeToLikeUpdates(
            capsule.id,
            (likeCount) => {
              setCapsules((prev) =>
                prev.map((c) => (c.id === capsule.id ? { ...c, likeCount } : c))
              );
            }
          );

          unsubscribesRef.current[capsule.id] = unsubscribe;
        });
      } catch (error) {
        console.error("Error loading capsules:", error);
        setCapsules([]);
      } finally {
        setLoading(false);
      }
    };
    loadCapsules();

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      Object.values(unsubscribesRef.current).forEach((unsubscribe) => {
        unsubscribe();
      });
      unsubscribesRef.current = {};
    };
  }, [selectedCategory, sortBy]);

  const handleLoadMore = async () => {
    if (!hasMore || !lastCapsule) return;

    setLoadingMore(true);
    const newCapsules = await getPublicCapsules(
      selectedCategory === "all" ? undefined : selectedCategory,
      sortBy,
      lastCapsule
    );

    if (newCapsules.length > 0) {
      setCapsules((prev) => [...prev, ...newCapsules]);
      setLastCapsule(newCapsules[newCapsules.length - 1]);
      setHasMore(newCapsules.length === 12);

      // Set up real-time listeners for newly loaded capsules
      newCapsules.forEach((capsule) => {
        if (!unsubscribesRef.current[capsule.id]) {
          const unsubscribe = subscribeToLikeUpdates(
            capsule.id,
            (likeCount) => {
              setCapsules((prev) =>
                prev.map((c) => (c.id === capsule.id ? { ...c, likeCount } : c))
              );
            }
          );

          unsubscribesRef.current[capsule.id] = unsubscribe;
        }
      });
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

  const handleLike = async (e: React.MouseEvent, capsuleId: string) => {
    e.stopPropagation();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert(t('explore.loginToLike'));
      return;
    }

    const isLiked = likedCapsules.has(capsuleId);

    try {
      if (isLiked) {
        // Unlike
        await unlikeCapsule(capsuleId, currentUser.uid);
        setLikedCapsules((prev) => {
          const newSet = new Set(prev);
          newSet.delete(capsuleId);
          return newSet;
        });
        // Update capsule like count
        setCapsules((prev) =>
          prev.map((c) =>
            c.id === capsuleId ? { ...c, likeCount: (c.likeCount || 1) - 1 } : c
          )
        );
      } else {
        // Like
        await likeCapsule(capsuleId, currentUser.uid);
        setLikedCapsules((prev) => new Set(prev).add(capsuleId));
        // Update capsule like count
        setCapsules((prev) =>
          prev.map((c) =>
            c.id === capsuleId ? { ...c, likeCount: (c.likeCount || 0) + 1 } : c
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      alert(t('explore.likeFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Archive className="w-6 h-6 text-[#5D2A42]" />
            <h1 className="text-3xl font-bold text-[#5D2A42]">{t('explore.title')}</h1>
          </div>
          <p className="text-[#5D2A42]/70">
            {t('explore.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="text-sm font-medium text-[#5D2A42] block mb-2">
              {t('explore.categoryLabel')}
            </label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="border-[#5D2A42]/20 bg-white text-[#5D2A42]">
                <SelectValue placeholder={t('explore.allCategories')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#5D2A42]/20">
                <SelectItem value="all">{t('explore.allCategories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-[#5D2A42] block mb-2">
              {t('explore.sortByLabel')}
            </label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="border-[#5D2A42]/20 bg-white text-[#5D2A42]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#5D2A42]/20">
                <SelectItem value="newest">{t('explore.sortNewest')}</SelectItem>
                <SelectItem value="mostReshared">{t('explore.sortMostReshared')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
          </div>
        ) : capsules.length === 0 ? (
          <div className="text-center py-16">
            <Archive className="w-16 h-16 mx-auto mb-4 text-[#5D2A42]/30" />
            <h3 className="text-lg font-semibold text-[#5D2A42] mb-2">
              {t('explore.noCapsules')}
            </h3>
            <p className="text-[#5D2A42]/70 mb-6">
              {t('explore.noCapsulesDesc')}
            </p>
            <Button
              onClick={() => navigate("/create")}
              className="bg-[#FB6376] hover:bg-[#F04860] text-white"
            >
              {t('explore.createCapsule')}
            </Button>
          </div>
        ) : (
          <>
            {/* Capsules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {capsules.map((capsule) => (
                <Card
                  key={capsule.id}
                  className="border-[#5D2A42]/20 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white hover:border-[#FB6376]/30 group"
                  onClick={() => navigate(`/community/capsule/${capsule.id}`)}
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Creator info + Like button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={capsule.creatorPhoto}
                            alt={capsule.creatorName}
                          />
                          <AvatarFallback className="bg-[#FB6376] text-white">
                            {getInitials(capsule.creatorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#5D2A42] text-sm truncate">
                            {capsule.creatorName}
                          </h4>
                          <p className="text-xs text-[#5D2A42]/60">
                            {format(capsule.createdAt.toDate(), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <button
                          onClick={(e) => handleLike(e, capsule.id)}
                          className="p-2 hover:bg-[#FFDCCC] rounded-lg transition-colors"
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              likedCapsules.has(capsule.id)
                                ? "fill-[#FB6376] text-[#FB6376]"
                                : "text-[#5D2A42]/40"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-[#5D2A42]/60 font-medium">
                          {capsule.likeCount || 0}
                        </span>
                      </div>
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
                      {capsule.category && (
                        <Badge
                          variant="outline"
                          className="border-[#5D2A42]/20 text-[#5D2A42]"
                        >
                          {capsule.category}
                        </Badge>
                      )}
                      <div className="text-xs text-[#5D2A42]/60">
                        {capsule.isReshare && <span>{t('explore.reshared')} • </span>}
                        {capsule.reshareCount > 0 && (
                          <span>{capsule.reshareCount} {t('capsuleDetail.resharesPlural')}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('explore.loading')}
                    </>
                  ) : (
                    t('explore.loadMore')
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

export default ExploreCapsulesPage;
