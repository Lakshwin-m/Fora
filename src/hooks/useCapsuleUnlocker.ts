import { useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { useCapsules } from "@/contexts/CapsuleContext";

export const useCapsuleUnlocker = () => {
  const auth = getAuth();
  const db = getFirestore();
  const { serverNow } = useCapsules();

  useEffect(() => {
    const checkAndUnlockCapsules = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const capsulesRef = collection(db, "capsules");
        const q = query(
          capsulesRef,
          where("userId", "==", user.uid),
          where("isUnlocked", "==", false),
          where("status", "==", "scheduled")
        );

        const snapshot = await getDocs(q);
        const now = serverNow();
        let unlockedCount = 0;

        for (const docSnapshot of snapshot.docs) {
          const capsule = docSnapshot.data();

          // Handle Firestore Timestamp
          const unlockDate =
            capsule.unlockDate instanceof Timestamp
              ? capsule.unlockDate.toDate()
              : new Date(capsule.unlockDate);

          if (unlockDate <= now) {
            await updateDoc(doc(db, "capsules", docSnapshot.id), {
              isUnlocked: true,
              status: "unlocked",
              unlockedAt: serverTimestamp(),
            });
            unlockedCount++;
          }
        }

        if (unlockedCount > 0) {
          toast({
            title: "Capsules Unlocked! 🎉",
            description: `${unlockedCount} time capsule${
              unlockedCount > 1 ? "s" : ""
            } ${unlockedCount > 1 ? "are" : "is"} now available.`,
          });
        }
      } catch (error) {
        console.error("Error checking capsules:", error);
      }
    };

    // Check immediately on mount
    checkAndUnlockCapsules();

    // Check every minute
    const interval = setInterval(checkAndUnlockCapsules, 60000);

    return () => clearInterval(interval);
  }, [auth, db]);
};
