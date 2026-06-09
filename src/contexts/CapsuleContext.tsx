// src/contexts/CapsuleContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/* ================= TYPES ================= */

/**
 * Media attachment metadata ONLY
 * ❌ No URLs
 * ❌ No blobs
 * ✅ Firebase Storage paths
 */
export interface Attachment {
  id: string;
  storagePath: string; // e.g. capsules/{capsuleId}/image_1.enc
  type: "image" | "video" | "audio";
  name: string;
  size: number;
  encrypted: true;
  uploadedAt: string;
  altText?: string;
}

export interface Capsule {
  id: string;
  title: string;
  content?: string;

  unlockDate?: any;
  deliveryDate?: string;

  recipients: string[];
  recipientNames?: string[];
  recipientType?: "self" | "friends" | "public";

  triggerType: "time" | "event" | "connection";

  attachments?: Attachment[];

  createdAt?: any;
  sealedAt?: any;

  status?: "scheduled" | "delivered" | "opened";
  isUnlocked?: boolean;

  userId?: string;
  username?: string;
  signature?: string;

  visibility?: "public" | "private";
  isReceived?: boolean;
}

/* ================= CONTEXT TYPE ================= */

interface CapsuleContextType {
  capsules: Capsule[];
  receivedCapsules: Capsule[];

  updateCapsule: (id: string, updates: Partial<Capsule>) => void;
  deleteCapsule: (id: string) => Promise<void>;
  markCapsuleAsOpened: (id: string) => Promise<void>;
  refreshCapsules: () => Promise<void>;

  /** Media-safe helpers */
  capsuleHasMedia: (capsule: Capsule) => boolean;
  getMediaCount: (capsule: Capsule) => number;
  serverNow: () => Date;

  loading: boolean;
}

/* ================= CONTEXT ================= */

const CapsuleContext = createContext<CapsuleContextType | undefined>(undefined);

export const useCapsules = () => {
  const context = useContext(CapsuleContext);
  if (!context) {
    throw new Error("useCapsules must be used within a CapsuleProvider");
  }
  return context;
};

/* ================= DATE HELPERS ================= */

export const toDate = (value: any): Date | null => {
  if (!value) return null;

  try {
    if (value?.toDate) return value.toDate(); // Firestore Timestamp
    const d = new Date(value);
    // Treat invalid or Unix epoch (0) as invalid for forá's logic
    if (isNaN(d.getTime()) || d.getTime() <= 0) return null;
    return d;
  } catch {
    return null;
  }
};

const safeISOString = (date: Date | null): string => {
  if (!date || isNaN(date.getTime()) || date.getTime() <= 0) {
    return new Date().toISOString(); // Default to NOW if missing
  }
  return date.toISOString();
};

/* ================= PROVIDER ================= */

export const CapsuleProvider = ({ children }: { children: ReactNode }) => {
  const auth = getAuth();

  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [receivedCapsules, setReceivedCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0);

  /* ---------- AUTH HELPERS ---------- */

  const fetchServerTime = async () => {
    try {
      const start = Date.now();
      const res = await fetch(`${API_BASE}/getServerTime`);
      if (!res.ok) return; // Endpoint not deployed yet — silently use system time
      const data = await res.json();
      const end = Date.now();
      
      // Calculate network latency and server clock offset
      const latency = (end - start) / 2;
      const offset = data.serverTimeMs + latency - end;
      
      setTimeOffset(offset);
    } catch {
      // Server time unavailable — silently falls back to system time (offset = 0)
    }
  };

  const serverNow = () => new Date(Date.now() + timeOffset);

  const getAuthHeaders = async () => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }

    const token = await auth.currentUser.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  /* ================= NORMALIZER ================= */

  const normalizeCapsule = (c: Capsule): Capsule => {
    const unlockSource =
      c.unlockDate ?? c.deliveryDate ?? c.sealedAt ?? c.createdAt ?? null;

    const unlockDateObj = toDate(unlockSource);
    const createdAtObj = toDate(c.createdAt);

    // Fallback order: Unlock Date -> Created At -> Now
    const finalDate = unlockDateObj ?? createdAtObj ?? new Date();

    return {
      ...c,
      attachments: Array.isArray(c.attachments)
        ? c.attachments.filter(
            (a) =>
              a.storagePath &&
              a.size > 0 &&
              ["image", "video", "audio"].includes(a.type)
          )
        : [],
      deliveryDate: safeISOString(unlockDateObj ?? finalDate),
      createdAt: safeISOString(createdAtObj ?? finalDate),
      isUnlocked: c.isUnlocked ?? finalDate.getTime() <= Date.now(),
    };
  };

  /* ================= FETCH CAPSULES ================= */

  const refreshCapsules = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      const [mineRes, receivedRes] = await Promise.all([
        fetch(`${API_BASE}/getMyCapsules`, { headers }),
        fetch(`${API_BASE}/getReceivedCapsules`, { headers }),
      ]);

      if (!mineRes.ok || !receivedRes.ok) {
        throw new Error("Capsule fetch failed");
      }

      const mineRaw = await mineRes.json();
      const receivedRaw = await receivedRes.json();

      // Debug: log raw capsule data to identify orphan/phantom capsules
      console.log("[CapsuleContext] Raw capsules from API:", mineRaw?.map((c: any) => ({
        id: c.id,
        title: c.title?.substring(0, 30),
        hasContent: !!c.content,
        unlockDate: c.unlockDate,
        createdAt: c.createdAt,
      })));

      // Filter out broken/phantom capsules that have no title at all
      const validMine = Array.isArray(mineRaw)
        ? mineRaw.filter((c: any) => c.title || c.content || c.encryptedTitle || c.encryptedContent)
        : [];
      const validReceived = Array.isArray(receivedRaw)
        ? receivedRaw.filter((c: any) => c.title || c.content || c.encryptedTitle || c.encryptedContent)
        : [];

      const mine = validMine.map(normalizeCapsule);
      const mineIds = new Set(mine.map((c) => c.id));

      const received = validReceived
            .filter((c: any) => !mineIds.has(c.id))
            .map((c: any) => ({
              ...normalizeCapsule(c),
              isReceived: true,
            }));

      setCapsules(mine);
      setReceivedCapsules(received);
    } catch (err) {
      console.error("refreshCapsules failed:", err);
      setCapsules([]);
      setReceivedCapsules([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= MUTATIONS ================= */

  const updateCapsule = (id: string, updates: Partial<Capsule>) => {
    setCapsules((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    setReceivedCapsules((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const markCapsuleAsOpened = async (id: string) => {
    try {
      const headers = await getAuthHeaders();

      await fetch(`${API_BASE}/openCapsule`, {
        method: "POST",
        headers,
        body: JSON.stringify({ capsuleId: id }),
      });

      updateCapsule(id, { status: "opened", isUnlocked: true });
    } catch (error) {
      console.error("markCapsuleAsOpened failed:", error);
    }
  };

  const deleteCapsule = async (id: string) => {
    try {
      const headers = await getAuthHeaders();

      const res = await fetch(`${API_BASE}/deleteCapsule`, {
        method: "POST",
        headers,
        body: JSON.stringify({ capsuleId: id }),
      });

      // 404 = capsule already gone from DB, treat as success
      if (!res.ok && res.status !== 404) {
        const errorData = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(errorData.error || "Failed to delete capsule");
      }

      // Always remove from local state
      setCapsules((prev) => prev.filter((c) => c.id !== id));
      setReceivedCapsules((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("deleteCapsule failed:", error);
      throw error;
    }
  };

  /* ================= MEDIA HELPERS ================= */

  const capsuleHasMedia = (capsule: Capsule): boolean =>
    Array.isArray(capsule.attachments) && capsule.attachments.length > 0;

  const getMediaCount = (capsule: Capsule): number =>
    capsule.attachments?.length ?? 0;

  /* ================= AUTH SYNC ================= */

  useEffect(() => {
    fetchServerTime(); // Get server time offset on mount
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await refreshCapsules();
      } else {
        setCapsules([]);
        setReceivedCapsules([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* ================= PROVIDER ================= */

  return (
    <CapsuleContext.Provider
      value={{
        capsules,
        receivedCapsules,

        updateCapsule,
        deleteCapsule,
        markCapsuleAsOpened,
        refreshCapsules,

        capsuleHasMedia,
        getMediaCount,
        serverNow,

        loading,
      }}
    >
      {children}
    </CapsuleContext.Provider>
  );
};
