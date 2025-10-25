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
  orderBy,
  Timestamp,
  or,
} from "firebase/firestore";

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
  attachments?: string[];
  createdAt: string;
  isUnlocked?: boolean;
  userId?: string;
  username?: string;
  // Flag to identify if this capsule was received from someone else
  isReceived?: boolean;
}

interface CapsuleContextType {
  capsules: Capsule[];
  receivedCapsules: Capsule[];
  addCapsule: (capsule: Omit<Capsule, "id" | "createdAt" | "status">) => void;
  updateCapsule: (id: string, updates: Partial<Capsule>) => void;
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
  const [capsules, setCapsules] = useState<Capsule[]>([]); // Capsules created by user
  const [receivedCapsules, setReceivedCapsules] = useState<Capsule[]>([]); // Capsules received from friends
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();

  // Convert Firestore document to Capsule
  const convertFirestoreDoc = (
    doc: any,
    isReceived: boolean = false
  ): Capsule => {
    const data = doc.data();

    console.log("Converting doc:", doc.id, {
      title: data.title,
      userId: data.userId,
      recipientType: data.recipientType,
      recipients: data.recipients,
    }); // DEBUG

    // Convert Firestore Timestamp to ISO string
    const deliveryDate =
      data.unlockDate instanceof Timestamp
        ? data.unlockDate.toDate().toISOString()
        : data.unlockDate;

    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();

    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      deliveryDate: deliveryDate,
      recipients: data.recipients || [],
      recipientNames: data.recipientNames || [],
      recipientType: data.recipientType || "self", // Default to "self" for old capsules
      status: data.status || "scheduled",
      triggerType: data.triggerType || "time",
      attachments: data.attachments || [],
      createdAt: createdAt,
      isUnlocked: data.isUnlocked || false,
      userId: data.userId, // Make sure this is included!
      username: data.username,
      isReceived: isReceived,
    };
  };

  // Load capsules from Firestore
  const refreshCapsules = async () => {
    console.log("refreshCapsules called, userId:", currentUserId);

    if (!currentUserId) {
      console.log("No user ID, skipping refresh");
      setCapsules([]);
      setReceivedCapsules([]);
      return;
    }

    try {
      const capsulesRef = collection(db, "capsules");

      // Query 1: Capsules created by the user
      const createdByUserQuery = query(
        capsulesRef,
        where("userId", "==", currentUserId)
      );

      // Query 2: Capsules sent to the user (received from friends or self)
      const receivedByUserQuery = query(
        capsulesRef,
        where("recipients", "array-contains", currentUserId)
      );

      console.log("Executing queries...");
      const [createdSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(createdByUserQuery),
        getDocs(receivedByUserQuery),
      ]);

      console.log("Created capsules:", createdSnapshot.size);
      console.log(
        "All received capsules (before filter):",
        receivedSnapshot.size
      );

      // Process created capsules
      const loadedCapsules: Capsule[] = [];
      createdSnapshot.forEach((doc) => {
        loadedCapsules.push(convertFirestoreDoc(doc, false));
      });

      // Sort by createdAt in memory
      loadedCapsules.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Process received capsules - filter out ones created by current user
      const loadedReceivedCapsules: Capsule[] = [];
      receivedSnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include capsules NOT created by current user
        if (data.userId !== currentUserId) {
          loadedReceivedCapsules.push(convertFirestoreDoc(doc, true));
        }
      });

      // Sort by createdAt in memory
      loadedReceivedCapsules.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log("Loaded created capsules:", loadedCapsules);
      console.log(
        "Loaded received capsules (after filter):",
        loadedReceivedCapsules
      );

      setCapsules(loadedCapsules);
      setReceivedCapsules(loadedReceivedCapsules);
    } catch (error) {
      console.error("Error loading capsules:", error);
      setCapsules([]);
      setReceivedCapsules([]);
    } finally {
      setLoading(false);
    }
  };

  // Load capsules when user auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.uid);

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

  // Refresh when currentUserId changes
  useEffect(() => {
    if (currentUserId) {
      refreshCapsules();
    }
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

  return (
    <CapsuleContext.Provider
      value={{
        capsules,
        receivedCapsules,
        addCapsule,
        updateCapsule,
        refreshCapsules,
        loading,
      }}
    >
      {children}
    </CapsuleContext.Provider>
  );
};
