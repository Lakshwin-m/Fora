import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  Timestamp,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { getAuth } from "firebase/auth";

export interface PublicCapsule {
  id: string;
  title?: string;
  content?: string;
  createdBy: string;
  creatorName: string;
  creatorPhoto?: string;
  createdAt: Timestamp;
  category?: string;
  reshareCount: number;
  isReshare: boolean;
  originalCapsuleId?: string;
  visibility: "public" | "private";
  likeCount?: number;
  likedBy?: string[];
  
  // v2 fields
  version?: string;
  encryptedTitle?: string;
  titleIV?: string;
  encryptedContent?: string;
  contentIV?: string;
  encryptedKeys?: Record<string, string>;
  
  // unencrypted metadata
  attachments?: any[];
  signature?: string;
  triggerType?: string;
  recipientType?: string;
  recipients?: string[];
  unlockDate?: string | Timestamp;
  status?: string;
  isUnlocked?: boolean;
}

export interface CapsuleWithLineage extends PublicCapsule {
  originalCapsule?: PublicCapsule;
  resharedFrom?: PublicCapsule;
}

const CAPSULES_COLLECTION = "capsules";
const USERS_COLLECTION = "users";
const PAGE_SIZE = 12;

/**
 * Get public capsules with filtering and pagination
 */
export const getPublicCapsules = async (
  category?: string,
  sortBy: "newest" | "mostReshared" = "newest",
  lastCapsule?: any
): Promise<PublicCapsule[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where("visibility", "==", "public"),
    ];

    // Order by the primary sort field only (to avoid composite index requirement)
    if (sortBy === "newest") {
      constraints.push(orderBy("createdAt", "desc"));
    } else {
      constraints.push(orderBy("reshareCount", "desc"));
    }

    if (lastCapsule) {
      constraints.push(startAfter(lastCapsule));
    }

    constraints.push(limit(PAGE_SIZE));

    const q = query(collection(db, CAPSULES_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const capsules: PublicCapsule[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();

        // Use creatorName from document if available, otherwise fetch from users collection
        let creatorName = data.creatorName || "Anonymous";
        let creatorPhoto = data.creatorPhoto;

        if (!data.creatorName && data.createdBy) {
          try {
            const creatorDoc = await getDoc(
              doc(db, USERS_COLLECTION, data.createdBy)
            );
            const creatorData = creatorDoc.data();
            creatorName = creatorData?.name || "Anonymous";
            creatorPhoto = creatorData?.photoURL;
          } catch (err) {
            console.warn(
              `Could not fetch creator info for ${data.createdBy}:`,
              err
            );
          }
        }

        return {
          id: docSnapshot.id,
          ...data,
          creatorName,
          creatorPhoto,
          createdAt: data.createdAt,
          reshareCount: data.reshareCount || 0,
          isReshare: data.isReshare || false,
          visibility: data.visibility || "private",
        } as PublicCapsule;
      })
    );

    // Filter by category in application (if specified)
    const filtered =
      category && category !== "all"
        ? capsules.filter((c) => c.category === category)
        : capsules;

    return filtered;
  } catch (error) {
    console.error("Error fetching public capsules:", error);
    return [];
  }
};

/**
 * Get a single capsule with its lineage (if reshared)
 */
export const getCapsuleDetail = async (
  capsuleId: string
): Promise<CapsuleWithLineage | null> => {
  try {
    const capsuleDoc = await getDoc(doc(db, CAPSULES_COLLECTION, capsuleId));

    if (!capsuleDoc.exists()) {
      return null;
    }

    const data = capsuleDoc.data();

    // Fetch creator info
    const creatorDoc = await getDoc(doc(db, USERS_COLLECTION, data.createdBy));
    const creatorData = creatorDoc.data();

    const capsule: CapsuleWithLineage = {
      ...data,
      id: capsuleDoc.id,
      title: data.title,
      content: data.content,
      createdBy: data.createdBy,
      creatorName: creatorData?.name || "Anonymous",
      creatorPhoto: creatorData?.photoURL,
      createdAt: data.createdAt,
      category: data.category,
      reshareCount: data.reshareCount || 0,
      isReshare: data.isReshare || false,
      originalCapsuleId: data.originalCapsuleId,
      visibility: data.visibility || "private",
      likeCount: data.likeCount || 0,
      likedBy: data.likedBy || [],
    } as CapsuleWithLineage;

    // If this is a reshare, fetch the original
    if (data.isReshare && data.originalCapsuleId) {
      const originalDoc = await getDoc(
        doc(db, CAPSULES_COLLECTION, data.originalCapsuleId)
      );
      if (originalDoc.exists()) {
        const originalData = originalDoc.data();
        const originalCreatorDoc = await getDoc(
          doc(db, USERS_COLLECTION, originalData.createdBy)
        );
        const originalCreatorData = originalCreatorDoc.data();

        capsule.originalCapsule = {
          ...originalData,
          id: originalDoc.id,
          title: originalData.title,
          content: originalData.content,
          createdBy: originalData.createdBy,
          creatorName: originalCreatorData?.name || "Anonymous",
          creatorPhoto: originalCreatorData?.photoURL,
          createdAt: originalData.createdAt,
          category: originalData.category,
          reshareCount: originalData.reshareCount || 0,
          isReshare: false,
          visibility: originalData.visibility || "private",
          likeCount: originalData.likeCount || 0,
          likedBy: originalData.likedBy || [],
        } as PublicCapsule;
      }
    }

    return capsule;
  } catch (error) {
    console.error("Error fetching capsule detail:", error);
    return null;
  }
};

/**
 * Get all public capsules by a specific user
 */
export const getUserPublicCapsules = async (
  userId: string,
  lastCapsule?: any
): Promise<PublicCapsule[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where("createdBy", "==", userId),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
    ];

    if (lastCapsule) {
      constraints.push(startAfter(lastCapsule));
    }

    constraints.push(limit(PAGE_SIZE));

    const q = query(collection(db, CAPSULES_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const capsules: PublicCapsule[] = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        creatorName: data.creatorName || "Anonymous",
        createdAt: data.createdAt,
        reshareCount: data.reshareCount || 0,
        isReshare: data.isReshare || false,
        visibility: "public",
      } as PublicCapsule;
    });

    return capsules;
  } catch (error) {
    console.error("Error fetching user capsules:", error);
    return [];
  }
};

/**
 * Get capsule categories for filtering
 */
export const getCapsuleCategories = async (): Promise<string[]> => {
  try {
    const q = query(
      collection(db, CAPSULES_COLLECTION),
      where("visibility", "==", "public")
    );
    const snapshot = await getDocs(q);

    const categories = new Set<string>();
    snapshot.docs.forEach((doc) => {
      if (doc.data().category) {
        categories.add(doc.data().category);
      }
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

/**
 * Like a capsule
 */
export const likeCapsule = async (
  capsuleId: string,
  userId: string
): Promise<void> => {
  try {
    const capsuleRef = doc(db, CAPSULES_COLLECTION, capsuleId);

    // Add user ID to likes array and increment likeCount
    await updateDoc(capsuleRef, {
      likedBy: arrayUnion(userId),
      likeCount: increment(1),
    });
  } catch (error) {
    console.error("Error liking capsule:", error);
    throw error;
  }
};

/**
 * Unlike a capsule
 */
export const unlikeCapsule = async (
  capsuleId: string,
  userId: string
): Promise<void> => {
  try {
    const capsuleRef = doc(db, CAPSULES_COLLECTION, capsuleId);

    // Remove user ID from likes array and decrement likeCount
    await updateDoc(capsuleRef, {
      likedBy: arrayRemove(userId),
      likeCount: increment(-1),
    });
  } catch (error) {
    console.error("Error unliking capsule:", error);
    throw error;
  }
};

/**
 * Check if current user liked a capsule
 */
export const hasUserLikedCapsule = async (
  capsuleId: string,
  userId: string
): Promise<boolean> => {
  try {
    const capsuleDoc = await getDoc(doc(db, CAPSULES_COLLECTION, capsuleId));

    if (!capsuleDoc.exists()) {
      return false;
    }

    const data = capsuleDoc.data();
    const likedBy = data.likedBy || [];
    return likedBy.includes(userId);
  } catch (error) {
    console.error("Error checking like status:", error);
    return false;
  }
};

/**
 * Get all capsule IDs that a user has liked
 */
export const getUserLikedCapsules = async (
  userId: string
): Promise<string[]> => {
  try {
    const q = query(
      collection(db, CAPSULES_COLLECTION),
      where("likedBy", "array-contains", userId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error("Error fetching user's liked capsules:", error);
    return [];
  }
};

/**
 * Subscribe to real-time updates for a capsule's like count
 */
export const subscribeToLikeUpdates = (
  capsuleId: string,
  callback: (likeCount: number) => void
): (() => void) => {
  try {
    const capsuleRef = doc(db, CAPSULES_COLLECTION, capsuleId);
    const unsubscribe = onSnapshot(capsuleRef, (snapshot) => {
      if (snapshot.exists()) {
        const likeCount = snapshot.data().likeCount || 0;
        callback(likeCount);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to like updates:", error);
    return () => {};
  }
};

// Comment interfaces and functions
export interface Comment {
  id: string;
  capsuleId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  timestamp: Timestamp;
  replies: Comment[];
  replyCount: number;
}

const COMMENTS_COLLECTION = "comments";

/**
 * Add a comment to a capsule
 */
export const addComment = async (
  capsuleId: string,
  userId: string,
  userName: string,
  userPhoto: string | undefined,
  content: string,
  parentCommentId?: string
): Promise<string> => {
  try {
    const commentData = {
      capsuleId,
      userId,
      userName,
      userPhoto,
      content,
      timestamp: serverTimestamp(),
      parentCommentId: parentCommentId || null,
      replies: [],
      replyCount: 0,
    };

    const docRef = await addDoc(
      collection(db, COMMENTS_COLLECTION),
      commentData
    );

    // Increment comment count on capsule
    await updateDoc(doc(db, CAPSULES_COLLECTION, capsuleId), {
      commentCount: increment(1),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

/**
 * Get all comments for a capsule
 */
export const getComments = async (capsuleId: string): Promise<Comment[]> => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("capsuleId", "==", capsuleId),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    const comments: Comment[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Only include top-level comments (no parentCommentId or parentCommentId is null)
      if (!data.parentCommentId) {
        const replies = await getReplies(doc.id);
        comments.push({
          id: doc.id,
          capsuleId: data.capsuleId,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          content: data.content,
          timestamp: data.timestamp,
          replies,
          replyCount: data.replyCount || 0,
        });
      }
    }

    return comments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
};

/**
 * Get replies to a specific comment
 */
export const getReplies = async (
  parentCommentId: string
): Promise<Comment[]> => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("parentCommentId", "==", parentCommentId),
      orderBy("timestamp", "asc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        capsuleId: data.capsuleId,
        userId: data.userId,
        userName: data.userName,
        userPhoto: data.userPhoto,
        content: data.content,
        timestamp: data.timestamp,
        replies: [],
        replyCount: 0,
      };
    });
  } catch (error) {
    console.error("Error fetching replies:", error);
    return [];
  }
};

/**
 * Subscribe to real-time comment updates
 */
export const subscribeToComments = (
  capsuleId: string,
  callback: (comments: Comment[]) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("capsuleId", "==", capsuleId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
                const comments: Comment[] = [];

        for (const doc of snapshot.docs) {
          const data = doc.data();
                    // Only include top-level comments (no parentCommentId or parentCommentId is null)
          if (!data.parentCommentId) {
            const replies = await getReplies(doc.id);
            comments.push({
              id: doc.id,
              capsuleId: data.capsuleId,
              userId: data.userId,
              userName: data.userName,
              userPhoto: data.userPhoto,
              content: data.content,
              timestamp: data.timestamp,
              replies,
              replyCount: data.replyCount || 0,
            });
          }
        }

                callback(comments);
      },
      (error) => {
        console.error("Error in subscribeToComments:", error);
        // Call callback with empty array on error to stop loading
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up comment subscription:", error);
    return () => {};
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (
  commentId: string,
  capsuleId: string
): Promise<void> => {
  try {
    // Delete the comment
    await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));

    // Decrement comment count on capsule
    await updateDoc(doc(db, CAPSULES_COLLECTION, capsuleId), {
      commentCount: increment(-1),
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};
