import * as React from "react";
import { motion } from "framer-motion";
import { Plus, User } from "lucide-react";
import { StoryViewer, type Story } from "@/components/ui/story-viewer";
import { cn } from "@/lib/utils";
import { apiGetFriends } from "@/services/friendServices";
import { useTranslation } from "@/contexts/LanguageContext";

interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
}

interface Friend {
  id: string;
  profile: UserProfile;
}

interface FriendWithStories extends Friend {
  stories: Story[];
  timestamp: string;
}

function AddStoryButton() {
  const { t } = useTranslation();
  return (
    <button
      className={cn(
        "relative flex flex-col items-center gap-2 group cursor-pointer"
      )}
      aria-label="Add your story"
    >
      <div className="relative">
        <div className="w-[72px] h-[72px] rounded-full p-1">
          <div
            className={cn(
              "w-full h-full rounded-full flex items-center justify-center",
              "border-2 border-dashed border-muted-foreground/40",
              "bg-muted/30 transition-all duration-200",
              "group-hover:border-muted-foreground/60 group-hover:bg-muted/50"
            )}
          >
            <User className="w-7 h-7 text-muted-foreground/50" />
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#FB6376] flex items-center justify-center shadow-sm"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
        </motion.div>
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
        {t('stories.addStory')}
      </span>
    </button>
  );
}

// Mock story data generator for friends
const generateMockStories = (friendId: string): Story[] => {
  const storyCount = Math.floor(Math.random() * 3) + 1; // 1-3 stories per friend
  const stories: Story[] = [];
  
  const imageUrls = [
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=1200&fit=crop",
  ];

  for (let i = 0; i < storyCount; i++) {
    const randomImage = imageUrls[Math.floor(Math.random() * imageUrls.length)];
    stories.push({
      id: `${friendId}-story-${i}`,
      type: "image",
      src: randomImage,
      duration: 5000,
    });
  }

  return stories;
};

export default function FriendsStories() {
  const { t } = useTranslation();
  const [friends, setFriends] = React.useState<FriendWithStories[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadFriendsWithStories = async () => {
      try {
        const friendsData = await apiGetFriends();
        
        console.log("🔍 Friends data received:", friendsData);
        console.log("🔍 First friend profile:", friendsData[0]?.profile);
        
        // Filter friends and add mock stories (only friends with stories)
        const friendsWithStories: FriendWithStories[] = friendsData
          .filter(() => Math.random() > 0.3) // 70% chance a friend has stories
          .map((friend) => {
            console.log(`📸 Friend ${friend.profile?.name} photoURL:`, friend.profile?.photoURL);
            return {
              ...friend,
              stories: generateMockStories(friend.id),
              timestamp: new Date(
                Date.now() - Math.random() * 12 * 60 * 60 * 1000
              ).toISOString(), // Random time in last 12 hours
            };
          })
          .sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        console.log("✅ Friends with stories:", friendsWithStories);
        setFriends(friendsWithStories);
      } catch (error) {
        console.error("❌ Failed to load friends stories:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFriendsWithStories();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-4 overflow-x-auto py-2 px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse" />
              <div className="w-16 h-3 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return null; // Don't show the section if no friends have stories
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-8">
      <h3 className="text-sm font-semibold mb-3 px-1 text-[#1A1A1A]">
        {t('stories.friendsStories')}
      </h3>
      <div className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-hide [&::-webkit-scrollbar]:hidden md:[&::-webkit-scrollbar]:block md:[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        <AddStoryButton />
        {friends.map((friend) => {
          // Use Google profile photo if available and not empty, otherwise fallback to DiceBear avatar
          const hasValidPhotoURL = friend.profile?.photoURL && friend.profile.photoURL.trim().length > 0;
          const avatarUrl = hasValidPhotoURL
            ? friend.profile.photoURL 
            : `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=${encodeURIComponent(friend.profile?.name || friend.id)}`;
          
          console.log(`🖼️ Rendering story for ${friend.profile?.name}:`, {
            hasPhotoURL: !!friend.profile?.photoURL,
            photoURL: friend.profile?.photoURL,
            hasValidPhotoURL,
            finalAvatarUrl: avatarUrl
          });
          
          return (
            <StoryViewer
              key={friend.id}
              stories={friend.stories}
              username={friend.profile?.name || "Unknown"}
              avatar={avatarUrl}
              timestamp={friend.timestamp}
              onStoryView={(storyId) => {
                console.log("Viewed story:", storyId);
              }}
            onAllStoriesViewed={() => {
              console.log("All stories viewed for:", friend.profile?.name);
            }}
          />
          );
        })}
      </div>
    </div>
  );
}
