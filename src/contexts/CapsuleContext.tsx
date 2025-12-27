import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export interface Attachment {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  name: string;
  size: number;
  uploadedAt: string;
}

export interface Capsule {
  id: string;
  title: string;
  content: string;
  deliveryDate: string;
  recipients: string[];
  recipientNames?: string[];
  recipientType?: "self" | "friends";
  status: "scheduled" | "delivered" | "opened";
  triggerType: "time" | "event" | "connection";
  attachments?: Attachment[];
  createdAt: string;
  isUnlocked?: boolean;
  userId?: string;
  username?: string;
  isReceived?: boolean;
}

interface CapsuleContextType {
  capsules: Capsule[];
  receivedCapsules: Capsule[];
  addCapsule: (capsule: Omit<Capsule, "id" | "createdAt" | "status">) => void;
  updateCapsule: (id: string, updates: Partial<Capsule>) => void;
  deleteCapsule: (id: string) => Promise<void>;
  markCapsuleAsOpened: (id: string) => Promise<void>;
  refreshCapsules: () => Promise<void>;
  loading: boolean;
}

const CapsuleContext = createContext<CapsuleContextType | undefined>(undefined);

export const useCapsules = () => {
  const context = useContext(CapsuleContext);
  if (!context) {
    throw new Error("useCapsules must be used within a CapsuleProvider");
  }
  return context;
};

export const CapsuleProvider = ({ children }: { children: ReactNode }) => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [receivedCapsules, setReceivedCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();

  const convertFirestoreDoc = (
    doc: any,
    isReceived: boolean = false
  ): Capsule => {
    const data = doc.data();

    const deliveryDate =
      data.unlockDate instanceof Timestamp
        ? data.unlockDate.toDate().toISOString()
        : data.unlockDate;

    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();

    let processedAttachments: Attachment[] = [];

    if (data.attachments && Array.isArray(data.attachments)) {
      if (typeof data.attachments[0] === "string") {
        const getFileTypeFromUrl = (
          url: string
        ): "image" | "video" | "audio" => {
          if (!url) return "image";
          const extension = url.split(".").pop()?.toLowerCase();

          if (
            ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(
              extension || ""
            )
          ) {
            return "image";
          } else if (
            ["mp4", "mov", "avi", "webm", "mkv"].includes(extension || "")
          ) {
            return "video";
          } else if (["mp3", "wav", "ogg", "m4a"].includes(extension || "")) {
            return "audio";
          }

          return "image";
        };

        processedAttachments = data.attachments.map(
          (url: string, index: number) => ({
            id: `legacy-${index}`,
            url: url,
            type: getFileTypeFromUrl(url),
            name: `Attachment ${index + 1}`,
            size: 0,
            uploadedAt: createdAt,
          })
        );
      } else {
        const getFileTypeFromUrl = (
          url: string
        ): "image" | "video" | "audio" => {
          if (!url) return "image";
          const extension = url.split(".").pop()?.toLowerCase();

          if (
            ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(
              extension || ""
            )
          ) {
            return "image";
          } else if (
            ["mp4", "mov", "avi", "webm", "mkv"].includes(extension || "")
          ) {
            return "video";
          } else if (["mp3", "wav", "ogg", "m4a"].includes(extension || "")) {
            return "audio";
          }

          return "image";
        };

        processedAttachments = data.attachments.map((att: any) => ({
          id: att.id || `att-${Date.now()}-${Math.random()}`,
          url: att.url,
          type: att.type || getFileTypeFromUrl(att.url),
          name: att.name || `Attachment`,
          size: att.size || 0,
          uploadedAt: att.uploadedAt || createdAt,
        }));
      }
    }

    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      deliveryDate: deliveryDate,
      recipients: data.recipients || [],
      recipientNames: data.recipientNames || [],
      recipientType: data.recipientType || "self",
      status: data.status || "scheduled",
      triggerType: data.triggerType || "time",
      attachments: processedAttachments,
      createdAt: createdAt,
      isUnlocked: data.isUnlocked || false,
      userId: data.userId,
      username: data.username,
      isReceived: isReceived,
    };
  };

  const markCapsuleAsOpened = async (id: string) => {
    try {
      const capsuleRef = doc(db, "capsules", id);
      await updateDoc(capsuleRef, {
        isUnlocked: true,
        status: "opened",
      });
      // Update local state
      updateCapsule(id, { isUnlocked: true, status: "opened" });
    } catch (error) {
      console.error("Error marking capsule as opened:", error);
    }
  };

  const refreshCapsules = async () => {
    if (!currentUserId) {
      setCapsules([]);
      setReceivedCapsules([]);
      return;
    }

    try {
      const capsulesRef = collection(db, "capsules");

      const createdByUserQuery = query(
        capsulesRef,
        where("userId", "==", currentUserId)
      );

      const receivedByUserQuery = query(
        capsulesRef,
        where("recipients", "array-contains", currentUserId)
      );

      const [createdSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(createdByUserQuery),
        getDocs(receivedByUserQuery),
      ]);

      const loadedCapsules: Capsule[] = [];
      createdSnapshot.forEach((doc) => {
        loadedCapsules.push(convertFirestoreDoc(doc, false));
      });

      loadedCapsules.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const loadedReceivedCapsules: Capsule[] = [];
      receivedSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId !== currentUserId) {
          loadedReceivedCapsules.push(convertFirestoreDoc(doc, true));
        }
      });

      loadedReceivedCapsules.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Check for capsules that should be automatically unlocked
      const currentTime = new Date().getTime();
      const capsulesToUpdate: string[] = [];

      [...loadedCapsules, ...loadedReceivedCapsules].forEach((capsule) => {
        const deliveryTime = new Date(capsule.deliveryDate).getTime();
        if (deliveryTime <= currentTime && !capsule.isUnlocked) {
          capsulesToUpdate.push(capsule.id);
        }
      });

      // Update capsules that have reached their unlock time
      if (capsulesToUpdate.length > 0) {
        const updatePromises = capsulesToUpdate.map((id) =>
          updateDoc(doc(db, "capsules", id), {
            isUnlocked: true,
            status: "delivered",
          })
        );
        await Promise.all(updatePromises);

        // Update local state
        capsulesToUpdate.forEach((id) => {
          updateCapsule(id, { isUnlocked: true, status: "delivered" });
        });
      }

      setCapsules(loadedCapsules);
      setReceivedCapsules(loadedReceivedCapsules);
    } catch (error) {
      setCapsules([]);
      setReceivedCapsules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setLoading(true);
        await refreshCapsules();
      } else {
        setCurrentUserId(null);
        setCapsules([]);
        setReceivedCapsules([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      refreshCapsules();
    }
  }, [currentUserId]);

  // Periodic refresh to check for capsules that should unlock
  useEffect(() => {
    if (!currentUserId) return;

    const interval = setInterval(() => {
      refreshCapsules();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentUserId]);

  const addCapsule = (
    capsuleData: Omit<Capsule, "id" | "createdAt" | "status">
  ) => {
    const newCapsule: Capsule = {
      ...capsuleData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "scheduled",
    };
    setCapsules((prev) => [newCapsule, ...prev]);
  };

  const updateCapsule = (id: string, updates: Partial<Capsule>) => {
    setCapsules((prev) =>
      prev.map((capsule) =>
        capsule.id === id ? { ...capsule, ...updates } : capsule
      )
    );
    setReceivedCapsules((prev) =>
      prev.map((capsule) =>
        capsule.id === id ? { ...capsule, ...updates } : capsule
      )
    );
  };

  const deleteCapsule = async (id: string) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "capsules", id));

      // Delete from local state
      setCapsules((prev) => prev.filter((capsule) => capsule.id !== id));
      setReceivedCapsules((prev) =>
        prev.filter((capsule) => capsule.id !== id)
      );
    } catch (error) {
      console.error("Error deleting capsule:", error);
      throw error;
    }
  };

  return (
    <CapsuleContext.Provider
      value={{
        capsules,
        receivedCapsules,
        addCapsule,
        updateCapsule,
        deleteCapsule,
        markCapsuleAsOpened,
        refreshCapsules,
        loading,
      }}
    >
      {children}
    </CapsuleContext.Provider>
  );
};
