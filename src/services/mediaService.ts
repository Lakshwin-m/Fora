import { getStorage, ref, getBlob, deleteObject } from "firebase/storage";

/**
 * Centralized media access layer
 * - No permanent URLs
 * - No Firestore coupling
 * - Encryption-ready
 */

const storage = getStorage();

/* ================= TYPES ================= */

export type MediaType = "image" | "video" | "audio";

export interface MediaAttachment {
  id: string;
  storagePath: string;
  type: MediaType;
  name: string;
  size: number;
  encrypted: true;
  uploadedAt: string;
}

/* ================= INTERNAL CACHE ================= */

/**
 * Prevents duplicate downloads
 * Key: storagePath
 */
const blobCache = new Map<string, Blob>();

/* ================= CORE API ================= */

/**
 * Fetch media blob from Firebase Storage
 * (Called ONLY after capsule is unlocked)
 */
export async function fetchMediaBlob(
  attachment: MediaAttachment,
  isUnlocked: boolean
): Promise<Blob> {
  if (!isUnlocked) {
    throw new Error("Capsule is locked. Media access denied.");
  }await uploadBytes(storageRef, attachment.file, {
  contentType: attachment.file.type,
});


  // Return cached blob if exists
  if (blobCache.has(attachment.storagePath)) {
    return blobCache.get(attachment.storagePath)!;
  }

  const storageRef = ref(storage, attachment.storagePath);
  const blob = await getBlob(storageRef, {
    maxDownloadSizeBytes: 10 * 1024 * 1024,
  }); // 10 MB limit

  blobCache.set(attachment.storagePath, blob);
  return blob;
}

/**
 * Convert Blob → Object URL (temporary)
 */
export function createMediaURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke object URL to prevent memory leaks
 */
export function revokeMediaURL(url: string) {
  URL.revokeObjectURL(url);
}

/* ================= CLEANUP HELPERS ================= */

/**
 * Delete a single attachment from storage
 * Used when capsule creation fails or is cancelled
 */
export async function deleteMedia(attachment: MediaAttachment) {
  const storageRef = ref(storage, attachment.storagePath);
  await deleteObject(storageRef);
  blobCache.delete(attachment.storagePath);
}

/**
 * Delete multiple attachments
 */
export async function deleteAllMedia(attachments: MediaAttachment[]) {
  await Promise.all(attachments.map((a) => deleteMedia(a)));
}

/**
 * Clear in-memory cache (logout, route change, etc.)
 */
export function clearMediaCache() {
  blobCache.clear();
}
