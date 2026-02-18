// src/hooks/useCapsuleDecryption.ts
import { useState, useEffect } from "react";
import { getOrCreateKey, decryptText } from "@/utils/cryptoUtils";

interface EncryptedCapsule {
  title?: string;
  titleIv?: string;
  content?: string;
  contentIv?: string;
  [key: string]: any;
}

interface DecryptedContent {
  title: string;
  content: string;
  isDecrypting: boolean;
  error: string | null;
}

/**
 * Custom hook to decrypt capsule title and content
 * Handles both encrypted and non-encrypted capsules
 * @param capsule - The capsule data (encrypted or plain)
 * @returns Decrypted title and content with loading state
 */
export function useCapsuleDecryption(capsule: EncryptedCapsule | null): DecryptedContent {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!capsule) {
      setIsDecrypting(false);
      setTitle("");
      setContent("");
      return;
    }

    const decrypt = async () => {
      try {
        // Check if this capsule has encryption IVs
        const hasEncryption = capsule.titleIv || capsule.contentIv;

        if (!hasEncryption) {
          // This is an old capsule or not encrypted - use plain text
          console.log("📝 Capsule is not encrypted, using plain text");
          setTitle(capsule.title || "Untitled Capsule");
          setContent(capsule.content || "");
          setIsDecrypting(false);
          return;
        }

        // This capsule is encrypted - decrypt it
        setIsDecrypting(true);
        console.log("🔐 Starting decryption...", {
          hasTitle: !!capsule.title,
          hasTitleIv: !!capsule.titleIv,
          hasContent: !!capsule.content,
          hasContentIv: !!capsule.contentIv,
        });

        const key = await getOrCreateKey();
        console.log("✅ Encryption key obtained");

        // Decrypt title
        if (capsule.title && capsule.titleIv) {
          try {
            console.log("🔓 Decrypting title...");
            const decryptedTitle = await decryptText(key, capsule.title, capsule.titleIv);
            setTitle(decryptedTitle);
            console.log("✅ Title decrypted successfully");
          } catch (err) {
            console.error("❌ Failed to decrypt title:", err);
            // If decryption fails, assume it's plain text
            setTitle(capsule.title);
          }
        } else {
          setTitle(capsule.title || "Untitled Capsule");
        }

        // Decrypt content
        if (capsule.content && capsule.contentIv) {
          try {
            console.log("🔓 Decrypting content...");
            const decryptedContent = await decryptText(key, capsule.content, capsule.contentIv);
            setContent(decryptedContent);
            console.log("✅ Content decrypted successfully");
          } catch (err) {
            console.error("❌ Failed to decrypt content:", err);
            // If decryption fails, assume it's plain text
            setContent(capsule.content);
          }
        } else {
          setContent(capsule.content || "");
        }

        console.log("✅ Decryption complete");
      } catch (err) {
        console.error("❌ Decryption error:", err);
        setError("Failed to decrypt capsule content");
        // Fallback to raw values
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