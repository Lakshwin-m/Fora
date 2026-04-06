// src/hooks/useCapsuleDecryption.ts
import { useState, useEffect } from "react";
import { getOrCreateKey, decryptText } from "@/utils/cryptoUtils";

interface EncryptedCapsule {
  title?: string;
  titleIv?: string | null;
  content?: string;
  contentIv?: string | null;
  [key: string]: any;
}

interface DecryptedContent {
  title: string;
  content: string;
  isDecrypting: boolean;
  error: string | null;
}

/**
 * Checks whether a string looks like a valid base64-encoded IV.
 * Old capsules stored plain text titles with titleIv: null or undefined.
 * New capsules store ciphertext with a real base64 IV string.
 */
function isEncrypted(value?: string | null, iv?: string | null): boolean {
  if (!iv || iv === "null" || iv === "undefined") return false;
  if (!value || value.length === 0) return false;
  // A valid AES-GCM 12-byte IV base64-encoded is always 16 chars
  // Ciphertext is always longer than the original text when base64-encoded
  // Simple heuristic: if IV looks like valid base64 and is ~16 chars, it's encrypted
  try {
    const decoded = atob(iv);
    return decoded.length === 12; // AES-GCM IV is always 12 bytes
  } catch {
    return false;
  }
}

export function useCapsuleDecryption(capsule: EncryptedCapsule | null): DecryptedContent {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!capsule) {
      setTitle("");
      setContent("");
      setIsDecrypting(false);
      return;
    }

    const decrypt = async () => {
      const titleEncrypted = isEncrypted(capsule.title, capsule.titleIv);
      const contentEncrypted = isEncrypted(capsule.content, capsule.contentIv);

      // ── OLD CAPSULE: no encryption IVs → use plain text directly ──
      if (!titleEncrypted && !contentEncrypted) {
        setTitle(capsule.title || "Untitled Capsule");
        setContent(capsule.content || "");
        setIsDecrypting(false);
        return;
      }

      // ── NEW CAPSULE: has real IVs → decrypt ──
      setIsDecrypting(true);
      try {
        const key = await getOrCreateKey();

        // Decrypt title
        if (titleEncrypted) {
          try {
            const decrypted = await decryptText(key, capsule.title!, capsule.titleIv!);
            setTitle(decrypted);
          } catch {
            // Key mismatch — encrypted on a different device/browser
            setTitle("Encrypted Capsule 🔐");
          }
        } else {
          setTitle(capsule.title || "Untitled Capsule");
        }

        // Decrypt content
        if (contentEncrypted) {
          try {
            const decrypted = await decryptText(key, capsule.content!, capsule.contentIv!);
            setContent(decrypted);
          } catch {
            // Key mismatch — encrypted on a different device/browser
            setContent("This capsule was encrypted with a different key.");
          }
        } else {
          setContent(capsule.content || "");
        }
      } catch (err) {
        console.error("❌ Decryption error:", err);
        setError("Failed to decrypt capsule content");
        // Fallback so UI doesn't break
        setTitle(capsule.title || "Untitled Capsule");
        setContent(capsule.content || "");
      } finally {
        setIsDecrypting(false);
      }
    };

    decrypt();
  }, [capsule?.id, capsule?.title, capsule?.titleIv, capsule?.content, capsule?.contentIv]);

  return { title, content, isDecrypting, error };
}