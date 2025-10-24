import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  Timestamp,
  increment,
  writeBatch,
  or,
  and,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase"; // Your Firebase config

// Types
export interface FriendRequest {
  id?: string;
  requesterId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  bio?: string;
  connections: number;
}

export interface FriendWithProfile extends FriendRequest {
  profile: UserProfile;
}

// Collection references
const FRIENDS_COLLECTION = "friends";
const USERS_COLLECTION = "users";

/**
 * Generate a consistent document ID for a friendship pair
 * This prevents duplicate friendships by ensuring the same ID regardless of who initiates
 */
const getFriendshipId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("_");
};

/**
 * Check if a friendship or pending request already exists between two users
 */
export const checkExistingFriendship = async (
  userId1: string,
  userId2: string
): Promise<FriendRequest | null> => {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);

    // Check both directions
    const q = query(
      friendsRef,
      or(
        and(
          where("requesterId", "==", userId1),
          where("receiverId", "==", userId2)
        ),
        and(
          where("requesterId", "==", userId2),
          where("receiverId", "==", userId1)
        )
      )
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        ...data,
      } as FriendRequest;
    }

    return null;
  } catch (error) {
    console.error("Error checking existing friendship:", error);
    throw error;
  }
};

/**
 * Send a friend request from requesterId to receiverId
 */
export const sendFriendRequest = async (
  requesterId: string,
  receiverId: string
): Promise<{ success: boolean; message: string; requestId?: string }> => {
  try {
    // Validation
    if (!requesterId || !receiverId) {
      return { success: false, message: "Invalid user IDs" };
    }

    if (requesterId === receiverId) {
      return {
        success: false,
        message: "Cannot send friend request to yourself",
      };
    }

    // Check if receiver exists
    const receiverDoc = await getDoc(doc(db, USERS_COLLECTION, receiverId));
    if (!receiverDoc.exists()) {
      return { success: false, message: "User not found" };
    }

    // Check for existing friendship or pending request
    const existing = await checkExistingFriendship(requesterId, receiverId);

    if (existing) {
      if (existing.status === "accepted") {
        return { success: false, message: "Already friends with this user" };
      }
      if (existing.status === "pending") {
        return { success: false, message: "Friend request already pending" };
      }
      if (existing.status === "rejected") {
        // Allow resending after rejection
        const friendRef = doc(db, FRIENDS_COLLECTION, existing.id!);
        await updateDoc(friendRef, {
          requesterId,
          receiverId,
          status: "pending",
          updatedAt: Timestamp.now(),
        });
        return {
          success: true,
          message: "Friend request resent",
          requestId: existing.id,
        };
      }
    }

    // Create new friend request
    const friendRequest: Omit<FriendRequest, "id"> = {
      requesterId,
      receiverId,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, FRIENDS_COLLECTION),
      friendRequest
    );

    return {
      success: true,
      message: "Friend request sent successfully",
      requestId: docRef.id,
    };
  } catch (error) {
    console.error("Error sending friend request:", error);
    return { success: false, message: "Failed to send friend request" };
  }
};

/**
 * Accept a friend request
 * Updates both users' connection counts
 */
export const acceptFriendRequest = async (
  requestId: string,
  currentUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const friendRef = doc(db, FRIENDS_COLLECTION, requestId);
    const friendDoc = await getDoc(friendRef);

    if (!friendDoc.exists()) {
      return { success: false, message: "Friend request not found" };
    }

    const friendData = friendDoc.data() as FriendRequest;

    // Verify the current user is the receiver
    if (friendData.receiverId !== currentUserId) {
      return { success: false, message: "Unauthorized to accept this request" };
    }

    if (friendData.status !== "pending") {
      return { success: false, message: "Request is not pending" };
    }

    // Use batch write for atomic updates
    const batch = writeBatch(db);

    // Update friend request status
    batch.update(friendRef, {
      status: "accepted",
      updatedAt: Timestamp.now(),
    });

    // Increment connections count for both users
    const requesterRef = doc(db, USERS_COLLECTION, friendData.requesterId);
    const receiverRef = doc(db, USERS_COLLECTION, friendData.receiverId);

    batch.update(requesterRef, {
      connections: increment(1),
      "stats.totalFriends": increment(1),
    });

    batch.update(receiverRef, {
      connections: increment(1),
      "stats.totalFriends": increment(1),
    });

    await batch.commit();

    return { success: true, message: "Friend request accepted" };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return { success: false, message: "Failed to accept friend request" };
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (
  requestId: string,
  currentUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const friendRef = doc(db, FRIENDS_COLLECTION, requestId);
    const friendDoc = await getDoc(friendRef);

    if (!friendDoc.exists()) {
      return { success: false, message: "Friend request not found" };
    }

    const friendData = friendDoc.data() as FriendRequest;

    // Verify the current user is the receiver
    if (friendData.receiverId !== currentUserId) {
      return { success: false, message: "Unauthorized to reject this request" };
    }

    if (friendData.status !== "pending") {
      return { success: false, message: "Request is not pending" };
    }

    // Update status to rejected
    await updateDoc(friendRef, {
      status: "rejected",
      updatedAt: Timestamp.now(),
    });

    return { success: true, message: "Friend request rejected" };
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return { success: false, message: "Failed to reject friend request" };
  }
};

/**
 * Remove a friend (unfriend)
 * Decrements both users' connection counts
 */
export const removeFriend = async (
  friendshipId: string,
  currentUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const friendRef = doc(db, FRIENDS_COLLECTION, friendshipId);
    const friendDoc = await getDoc(friendRef);

    if (!friendDoc.exists()) {
      return { success: false, message: "Friendship not found" };
    }

    const friendData = friendDoc.data() as FriendRequest;

    // Verify the current user is part of this friendship
    if (
      friendData.requesterId !== currentUserId &&
      friendData.receiverId !== currentUserId
    ) {
      return {
        success: false,
        message: "Unauthorized to remove this friendship",
      };
    }

    if (friendData.status !== "accepted") {
      return { success: false, message: "Not currently friends" };
    }

    // Use batch write for atomic updates
    const batch = writeBatch(db);

    // Delete the friendship document
    batch.delete(friendRef);

    // Decrement connections count for both users
    const requesterRef = doc(db, USERS_COLLECTION, friendData.requesterId);
    const receiverRef = doc(db, USERS_COLLECTION, friendData.receiverId);

    batch.update(requesterRef, {
      connections: increment(-1),
      "stats.totalFriends": increment(-1),
    });

    batch.update(receiverRef, {
      connections: increment(-1),
      "stats.totalFriends": increment(-1),
    });

    await batch.commit();

    return { success: true, message: "Friend removed successfully" };
  } catch (error) {
    console.error("Error removing friend:", error);
    return { success: false, message: "Failed to remove friend" };
  }
};

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequest = async (
  requestId: string,
  currentUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const friendRef = doc(db, FRIENDS_COLLECTION, requestId);
    const friendDoc = await getDoc(friendRef);

    if (!friendDoc.exists()) {
      return { success: false, message: "Friend request not found" };
    }

    const friendData = friendDoc.data() as FriendRequest;

    // Verify the current user is the requester
    if (friendData.requesterId !== currentUserId) {
      return { success: false, message: "Unauthorized to cancel this request" };
    }

    if (friendData.status !== "pending") {
      return { success: false, message: "Request is not pending" };
    }

    await deleteDoc(friendRef);

    return { success: true, message: "Friend request cancelled" };
  } catch (error) {
    console.error("Error cancelling friend request:", error);
    return { success: false, message: "Failed to cancel friend request" };
  }
};

/**
 * Get all accepted friends for a user with their profiles
 */
export const getFriends = async (
  userId: string
): Promise<FriendWithProfile[]> => {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);

    const q = query(
      friendsRef,
      or(
        and(
          where("requesterId", "==", userId),
          where("status", "==", "accepted")
        ),
        and(
          where("receiverId", "==", userId),
          where("status", "==", "accepted")
        )
      )
    );

    const snapshot = await getDocs(q);

    const friendsWithProfiles: FriendWithProfile[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const friendData = docSnapshot.data() as FriendRequest;

        // Determine which user is the friend
        const friendId =
          friendData.requesterId === userId
            ? friendData.receiverId
            : friendData.requesterId;

        // Fetch friend's profile
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, friendId));
        const profile = userDoc.data() as UserProfile;

        return {
          id: docSnapshot.id,
          ...friendData,
          profile,
        };
      })
    );

    return friendsWithProfiles;
  } catch (error) {
    console.error("Error fetching friends:", error);
    return [];
  }
};

/**
 * Get pending friend requests received by the user
 */
export const getReceivedFriendRequests = async (
  userId: string
): Promise<FriendWithProfile[]> => {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);

    const q = query(
      friendsRef,
      where("receiverId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const requestsWithProfiles: FriendWithProfile[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const requestData = docSnapshot.data() as FriendRequest;

        // Fetch requester's profile
        const userDoc = await getDoc(
          doc(db, USERS_COLLECTION, requestData.requesterId)
        );
        const profile = userDoc.data() as UserProfile;

        return {
          id: docSnapshot.id,
          ...requestData,
          profile,
        };
      })
    );

    return requestsWithProfiles;
  } catch (error) {
    console.error("Error fetching received friend requests:", error);
    return [];
  }
};

/**
 * Get pending friend requests sent by the user
 */
export const getSentFriendRequests = async (
  userId: string
): Promise<FriendWithProfile[]> => {
  try {
    const friendsRef = collection(db, FRIENDS_COLLECTION);

    const q = query(
      friendsRef,
      where("requesterId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const requestsWithProfiles: FriendWithProfile[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const requestData = docSnapshot.data() as FriendRequest;

        // Fetch receiver's profile
        const userDoc = await getDoc(
          doc(db, USERS_COLLECTION, requestData.receiverId)
        );
        const profile = userDoc.data() as UserProfile;

        return {
          id: docSnapshot.id,
          ...requestData,
          profile,
        };
      })
    );

    return requestsWithProfiles;
  } catch (error) {
    console.error("Error fetching sent friend requests:", error);
    return [];
  }
};

/**
 * Search for users by name or email (excluding current user and existing friends)
 */
export const searchUsers = async (
  searchTerm: string,
  currentUserId: string,
  limitCount: number = 10
): Promise<UserProfile[]> => {
  try {
    if (!searchTerm.trim()) {
      return [];
    }

    const usersRef = collection(db, USERS_COLLECTION);

    // Note: For production, consider using Algolia or similar for better search
    // This is a basic implementation using Firestore queries
    const q = query(
      usersRef,
      where("email", ">=", searchTerm.toLowerCase()),
      where("email", "<=", searchTerm.toLowerCase() + "\uf8ff"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    // Filter out current user
    const users = snapshot.docs
      .map((doc) => doc.data() as UserProfile)
      .filter((user) => user.uid !== currentUserId);

    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

/**
 * Get friendship status between two users
 */
export const getFriendshipStatus = async (
  userId1: string,
  userId2: string
): Promise<{
  status: "none" | "pending_sent" | "pending_received" | "friends";
  friendshipId?: string;
}> => {
  try {
    const friendship = await checkExistingFriendship(userId1, userId2);

    if (!friendship) {
      return { status: "none" };
    }

    if (friendship.status === "accepted") {
      return { status: "friends", friendshipId: friendship.id };
    }

    if (friendship.status === "pending") {
      if (friendship.requesterId === userId1) {
        return { status: "pending_sent", friendshipId: friendship.id };
      } else {
        return { status: "pending_received", friendshipId: friendship.id };
      }
    }

    return { status: "none" };
  } catch (error) {
    console.error("Error getting friendship status:", error);
    return { status: "none" };
  }
};
