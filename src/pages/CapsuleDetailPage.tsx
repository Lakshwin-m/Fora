// src/pages/CapsuleDetailPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle,
  Archive,
} from "lucide-react";
import {
  getCapsuleDetail,
  CapsuleWithLineage,
  likeCapsule,
  unlikeCapsule,
  subscribeToLikeUpdates,
} from "@/services/communityServices";
import CommentSection from "@/components/CommentSection";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getAuth } from "firebase/auth";

// 🔐 IMPORT DECRYPTION HOOK
import { useCapsuleDecryption } from "@/hooks/useCapsuleDecryption";

const CapsuleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const auth = getAuth();

  const [capsule, setCapsule] = useState<CapsuleWithLineage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResharing, setIsResharing] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 🔐 USE DECRYPTION HOOK
  const { 
    title: decryptedTitle, 
    content: decryptedContent, 
    isDecrypting 
  } = useCapsuleDecryption(capsule);

  // 🔐 DECRYPT ORIGINAL CAPSULE (for reshares)
  const {
    title: originalDecryptedTitle,
    content: originalDecryptedContent,
    isDecrypting: isDecryptingOriginal,
  } = useCapsuleDecryption(capsule?.originalCapsule || null);

  useEffect(() => {
    const loadCapsule = async () => {
      if (!id) return;

      try {
        console.log("📦 Loading capsule:", id);
        const data = await getCapsuleDetail(id);
        
        if (!data) {
          console.error("❌ Capsule not found");
          setLoading(false);
          return;
        }

        console.log("✅ Capsule loaded:", {
          id: data.id,
          hasTitle: !!data.title,
          hasTitleIv: !!data.titleIv,
          hasContent: !!data.content,
          hasContentIv: !!data.contentIv,
        });

        setCapsule(data);
        setLikeCount(data?.likeCount || 0);

        // Check likes
        if (auth.currentUser) {
          const hasUserLiked = data?.likedBy?.includes(auth.currentUser.uid);
          setHasLiked(hasUserLiked || false);
        }

        setLoading(false);

        // Subscribe to like updates
        const unsubscribe = subscribeToLikeUpdates(id, (count) => setLikeCount(count));
        return unsubscribe;
      } catch (err) {
        console.error("❌ Error loading capsule:", err);
        setLoading(false);
      }
    };

    loadCapsule();
  }, [id, auth]);

  const handleReshare = async () => {
    if (!capsule || !user) return;

    setIsResharing(true);
    try {
      navigate("/create", {
        state: {
          reshareFrom: {
            capsuleId: capsule.id,
            title: decryptedTitle,
            content: decryptedContent,
            creatorName: capsule.creatorName,
          },
        },
      });
    } catch (error) {
      console.error("Error resharing:", error);
    } finally {
      setIsResharing(false);
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser) {
      alert("Please log in to like capsules");
      return;
    }

    if (!id) return;

    setIsLiking(true);
    try {
      if (hasLiked) {
        await unlikeCapsule(id, auth.currentUser.uid);
        setHasLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await likeCapsule(id, auth.currentUser.uid);
        setHasLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      alert("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  if (loading || isDecrypting) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
          <p className="text-[#5D2A42]/60">
            {loading ? "Loading capsule..." : "Decrypting content..."}
          </p>
        </div>
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/community")}
            className="mb-4 text-[#5D2A42]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Archive
          </Button>
          <div className="text-center py-16">
            <Archive className="w-16 h-16 mx-auto mb-4 text-[#5D2A42]/30" />
            <h3 className="text-lg font-semibold text-[#5D2A42]">
              Capsule not found
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/community")}
          className="mb-6 text-[#5D2A42] hover:bg-[#FFDCCC]/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Archive
        </Button>

        <Card className="border-[#5D2A42]/20 bg-white mb-8">
          <CardHeader className="pb-4 bg-[#FFDCCC]/10 border-b border-[#5D2A42]/10">
            {capsule.isReshare && (
              <div className="mb-4 p-3 bg-[#FB6376]/10 border border-[#FB6376]/20 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-[#5D2A42]">
                  <Share2 className="w-4 h-4 text-[#FB6376]" />
                  <span>
                    Reshared from a capsule by{" "}
                    <span className="font-medium">
                      {capsule.originalCapsule?.creatorName}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* 🔐 USE DECRYPTED TITLE */}
            <CardTitle className="text-3xl text-[#5D2A42]">
              {decryptedTitle || "Untitled Capsule"}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="flex items-start justify-between border-b border-[#5D2A42]/10 pb-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage
                    src={capsule.creatorPhoto}
                    alt={capsule.creatorName}
                  />
                  <AvatarFallback className="bg-[#FB6376] text-white text-lg">
                    {getInitials(capsule.creatorName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-[#5D2A42]">
                    {capsule.creatorName}
                  </h3>
                  <p className="text-sm text-[#5D2A42]/60">
                    {format(capsule.createdAt.toDate(), "EEEE, MMMM dd, yyyy")}
                  </p>
                </div>
              </div>

              {capsule.category && (
                <Badge
                  variant="outline"
                  className="border-[#5D2A42]/20 text-[#5D2A42]"
                >
                  {capsule.category}
                </Badge>
              )}
            </div>

            {/* 🔐 USE DECRYPTED CONTENT */}
            <div className="prose prose-sm max-w-none">
              <p className="text-[#5D2A42] text-base leading-relaxed whitespace-pre-wrap">
                {decryptedContent || "No content available"}
              </p>
            </div>

            {/* Likes and interactions */}
            <div className="flex items-center justify-between pt-6 border-t border-[#5D2A42]/10">
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex items-center space-x-2 text-[#5D2A42]/60 hover:text-[#FB6376] transition-colors disabled:opacity-50"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      hasLiked ? "fill-current text-[#FB6376]" : ""
                    }`}
                  />
                  <span className="text-sm">{likeCount} Likes</span>
                </button>
                <div className="flex items-center space-x-2 text-[#5D2A42]/60">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">Comments</span>
                </div>
                {capsule.reshareCount > 0 && (
                  <div className="text-sm text-[#5D2A42]/60">
                    <span>{capsule.reshareCount} reshares</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleReshare}
                disabled={isResharing}
                className="bg-[#FB6376] hover:bg-[#F04860] text-white"
              >
                {isResharing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Reshare as Capsule
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 🔁 Original capsule with decrypted values */}
        {capsule.isReshare && capsule.originalCapsule && (
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-[#5D2A42]">
              Original Capsule
            </h3>

            {isDecryptingOriginal ? (
              <Card className="border-[#5D2A42]/20 bg-white/50">
                <CardContent className="p-6 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FB6376]" />
                  <span className="ml-2 text-[#5D2A42]/60">Decrypting...</span>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[#5D2A42]/20 bg-white/50 hover:bg-white transition-colors cursor-pointer">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={capsule.originalCapsule.creatorPhoto}
                        alt={capsule.originalCapsule.creatorName}
                      />
                      <AvatarFallback className="bg-[#FB6376] text-white">
                        {getInitials(capsule.originalCapsule.creatorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#5D2A42] text-sm truncate">
                        {capsule.originalCapsule.creatorName}
                      </h4>
                      <p className="text-xs text-[#5D2A42]/60">
                        {format(
                          capsule.originalCapsule.createdAt.toDate(),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 🔐 Use decrypted original title */}
                  <h3 className="font-semibold text-[#5D2A42] line-clamp-2">
                    {originalDecryptedTitle || "Untitled"}
                  </h3>

                  {/* 🔐 Use decrypted original content */}
                  <p className="text-sm text-[#5D2A42]/70 line-clamp-3">
                    {originalDecryptedContent || "No content available"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Comments */}
        <Card className="border-[#5D2A42]/20 bg-white">
          <CardContent className="pt-6">
            <CommentSection capsuleId={id!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CapsuleDetailPage;