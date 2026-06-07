// src/hooks/useCapsuleDecryption.ts
// Returns async helpers for decrypting v2 capsule text.
// Designed to be called on-demand (not as an effect) so the caller
// controls when decryption fires (e.g. only after unlock gate).

import { useAuth } from "@/contexts/AuthContext";
import { unwrapContentKey, decryptText } from "@/utils/cryptoUtils";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface DecryptedCapsuleContent {
  title: string;
  content: string;
}

// ─────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────

export function useCapsuleDecryption() {
  const { user, privateKey } = useAuth();

  /**
   * Decrypts a v2 capsule's title and content.
   *
   * - If the capsule is v1 (no `version` field): returns plain text fields directly.
   * - If `privateKey` is not loaded yet: returns locked fallback text.
   * - If the user has no key entry in `encryptedKeys`: returns locked fallback.
   * - If decryption throws (wrong key, corrupt data): returns locked fallback.
   */
  async function decryptCapsule(capsule: any): Promise<DecryptedCapsuleContent> {
    // ── v1 fallback: old plain-text capsules ──
    if (!capsule.version || capsule.version !== "v2") {
      return {
        title:   capsule.title   || "Untitled Capsule",
        content: capsule.content || "",
      };
    }

    // ── v2 path ──
    if (!privateKey || !user) {
      return {
        title:   "Encrypted Capsule 🔐",
        content: "Your encryption key is not loaded yet. Try refreshing.",
      };
    }

    try {
      // 1. Find this user's wrapped content key entry
      const myWrappedKey = capsule.encryptedKeys?.[user.uid];
      if (!myWrappedKey) {
        return {
          title:   "Encrypted Capsule 🔐",
          content: "You don't have access to this capsule's encryption key.",
        };
      }

      // 2. RSA-unwrap content key using this user's private key
      const contentKey = await unwrapContentKey(myWrappedKey, privateKey);

      // 3. Decrypt title and content
      const title   = await decryptText(
        capsule.encryptedTitle,
        capsule.titleIV,
        contentKey
      );
      const content = await decryptText(
        capsule.encryptedContent,
        capsule.contentIV,
        contentKey
      );

      return { title, content };
    } catch {
      return {
        title:   "Encrypted Capsule 🔐",
        content: "This capsule could not be decrypted. The key may be invalid.",
      };
    }
  }

  return { decryptCapsule };
}