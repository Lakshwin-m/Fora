import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import cors from "cors";

admin.initializeApp();
const db = admin.firestore();

// Limit instances (cost + safety)
setGlobalOptions({ maxInstances: 10 });

/* ============================================================
   CORS CONFIG (FOR BROWSER CALLS)
   ============================================================ */

const corsHandler = cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173", // Vite default
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

/* ============================================================
   AUTH HELPER
   ============================================================ */

async function verifyAuth(req: any) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new HttpsError("unauthenticated", "Missing token");
  }

  const token = header.split("Bearer ")[1];
  return admin.auth().verifyIdToken(token);
}

/* ============================================================
   EXISTING BACKEND LOGIC (UNCHANGED)
   ============================================================ */

/**
 * Scheduled unlock (every minute)
 */
export const checkAndUnlockCapsules = onSchedule(
  "every 1 minutes",
  async () => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("capsules")
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("unlockDate", "<=", now)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isUnlocked: true,
        status: "unlocked",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }
);

/**
 * Callable manual unlock
 */
export const checkCapsuleUnlockStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required");
  }

  const now = admin.firestore.Timestamp.now();

  const snapshot = await db
    .collection("capsules")
    .where("userId", "==", request.auth.uid)
    .where("isUnlocked", "==", false)
    .where("status", "==", "scheduled")
    .where("triggerType", "==", "time")
    .where("unlockDate", "<=", now)
    .get();

  if (snapshot.empty) return { count: 0 };

  const batch = db.batch();
  snapshot.forEach((doc) => {
    batch.update(doc.ref, {
      isUnlocked: true,
      status: "unlocked",
      unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { count: snapshot.size };
});

/**
 * Firestore trigger (optional, may fail first time)
 */
export const scheduleCapsuleUnlock = onDocumentCreated(
  "capsules/{capsuleId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.triggerType !== "time") return;

    await db.collection("scheduledUnlocks").doc(event.params.capsuleId).set({
      capsuleId: event.params.capsuleId,
      unlockDate: data.unlockDate,
      userId: data.userId,
      recipients: data.recipients,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });
  }
);

/* ============================================================
   HTTP APIs (WITH CORS)
   ============================================================ */

/**
 * Create capsule
 */
export const createCapsule = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const ref = db.collection("capsules").doc();

      const {
        title,
        content,
        triggerType,
        unlockDate,
        recipientType,
        recipients,
        attachments,
        category,
        signature,
      } = req.body;

      await ref.set({
        id: ref.id,
        title,
        content,
        triggerType,
        unlockDate,
        recipientType,
        recipients,
        attachments: attachments || [], // 🔥 THIS IS THE KEY LINE
        category: category || "",
        signature: signature || null,

        userId: user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "scheduled",
        isUnlocked: false,
      });

      res.json({ id: ref.id });
    } catch (e: any) {
      console.error(e);
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Get my capsules
 */
export const getMyCapsules = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);

      const snap = await db
        .collection("capsules")
        .where("userId", "==", user.uid)
        .orderBy("createdAt", "desc")
        .get();

      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Get received capsules
 */
export const getReceivedCapsules = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);

      const snap = await db
        .collection("capsules")
        .where("recipients", "array-contains", user.uid)
        .get();

      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Open capsule
 */
export const openCapsule = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { capsuleId } = req.body;

      const ref = db.collection("capsules").doc(capsuleId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const data = snap.data();
      if (data?.userId !== user.uid && !data?.recipients?.includes(user.uid)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.update({ status: "opened" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Delete capsule
 */
export const deleteCapsule = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { capsuleId } = req.body;

      const ref = db.collection("capsules").doc(capsuleId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      if (snap.data()?.userId !== user.uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Manual unlock (admin/debug)
 */
export const unlockDueCapsules = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("capsules")
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("unlockDate", "<=", now)
      .limit(100)
      .get();

    if (snapshot.empty) {
      res.json({ unlockedCount: 0 });
      return;
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isUnlocked: true,
        status: "unlocked",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    res.json({ unlockedCount: snapshot.size });
  });
});

export const getMyProfile = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const token = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(token);

      const userSnap = await db.collection("users").doc(decoded.uid).get();
      const userData = userSnap.exists ? userSnap.data() : {};

      res.json({
        uid: decoded.uid,
        username: userData?.username || userData?.name || decoded.email,
      });
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "Invalid token" });
    }
  });
});
export const migrateUsers = onRequest(async (req, res) => {
  try {
    const snap = await db.collection("users").get();

    let migrated = 0;

    for (const doc of snap.docs) {
      const data = doc.data();

      if (!data.uid || doc.id === data.uid) continue;

      await db.collection("users").doc(data.uid).set(data);
      await db.collection("users").doc(doc.id).delete();

      migrated++;
    }

    console.log(`✅ Migrated ${migrated} users`);
    res.json({ migrated });
  } catch (err: any) {
    console.error("❌ Migration failed", err);
    res.status(500).json({ error: err.message });
  }
});

export const sendFriendRequest = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { receiverId } = req.body;

      if (!receiverId || receiverId === user.uid) {
        res.status(400).json({ error: "Invalid receiver" });
        return;
      }

      const friendshipId = [user.uid, receiverId].sort().join("_");
      const ref = db.collection("friends").doc(friendshipId);

      const existing = await ref.get();
      if (existing.exists) {
        res.status(400).json({ error: "Already requested or friends" });
        return;
      }

      await ref.set({
        requesterId: user.uid,
        participants: [user.uid, receiverId],
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(401).json({ error: e.message });
    }
  });
});

export const getFriends = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const user = await verifyAuth(req);

      const snap = await db
        .collection("friends")
        .where("status", "==", "accepted")
        .where("participants", "array-contains", user.uid)
        .get();

      const friends = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();

          const friendId = data.participants.find(
            (id: string) => id !== user.uid
          );

          if (!friendId) return null;

          const userSnap = await db.collection("users").doc(friendId).get();

          return {
            id: doc.id,
            profile: userSnap.exists
              ? { uid: friendId, ...userSnap.data() }
              : null,
          };
        })
      );

      res.json(friends.filter(Boolean));
    } catch (err: any) {
      console.error("[getFriends ERROR]", err);
      res.status(401).json({ error: err.message });
    }
  });
});
export const backfillFriendParticipants = onRequest(async (req, res) => {
  const snap = await db.collection("friends").get();
  let fixed = 0;

  for (const doc of snap.docs) {
    const d = doc.data();

    if (!d.requesterId || !d.receiverId) continue;
    if (Array.isArray(d.participants)) continue;

    await doc.ref.update({
      participants: [d.requesterId, d.receiverId],
    });

    fixed++;
  }

  res.json({ fixed });
});

export const acceptFriendRequest = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { friendshipId } = req.body;

      const ref = db.collection("friends").doc(friendshipId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const data = snap.data();
      if (!data?.participants.includes(user.uid)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.update({ status: "accepted" });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(401).json({ error: "Unauthorized" });
    }
  });
});
export const getPendingRequests = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const user = await verifyAuth(req);

      const snapshot = await db
        .collection("friends")
        .where("receiverId", "==", user.uid)
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .get();

      const pending = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();

          const senderId = data.requesterId;
          const senderSnap = await db.collection("users").doc(senderId).get();

          return {
            id: doc.id,
            senderId,
            profile: senderSnap.exists
              ? {
                  uid: senderId,
                  ...senderSnap.data(),
                }
              : null,
          };
        })
      );

      res.json(pending);
    } catch (err: any) {
      console.error("getPendingRequests failed:", err);
      res.status(401).json({ error: err.message });
    }
  });
});

export const rejectFriendRequest = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { friendshipId } = req.body;

      const ref = db.collection("friends").doc(friendshipId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      if (snap.data()?.receiverId !== user.uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.update({ status: "rejected" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});
export const searchUsers = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { query } = req.body;

      const snap = await db
        .collection("users")
        .where("email", ">=", query)
        .where("email", "<=", query + "\uf8ff")
        .limit(10)
        .get();

      res.json(
        snap.docs.map((d) => d.data()).filter((u) => u.uid !== user.uid)
      );
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});
export const notifyFriendRequest = onDocumentCreated(
  "friends/{id}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.status !== "pending") return;

    await db.collection("notifications").add({
      userId: data.receiverId,
      type: "friend_request",
      message: "You have a new friend request",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  }
);
export const getNotifications = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const user = await verifyAuth(req);

    const snap = await db
      .collection("notifications")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    res.json(snap.docs.map((d) => d.data()));
  });
});
