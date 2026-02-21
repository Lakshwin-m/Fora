// src/utils/cryptoUtils.ts

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_NAME = "fora_master_key";

/**
 * Get or create the master encryption key
 * Stores key in localStorage for persistence
 */
export async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_NAME);

  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));

    return crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // Export and store
  const raw = await crypto.subtle.exportKey("raw", key);
  const encoded = btoa(String.fromCharCode(...new Uint8Array(raw)));
  localStorage.setItem(KEY_NAME, encoded);

  return key;
}

/**
 * Encrypt text using AES-GCM
 */
export async function encryptText(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt text using AES-GCM
 */
export async function decryptText(
  key: CryptoKey,
  ciphertext: string,
  ivBase64: string
): Promise<string> {
  const encryptedBytes = Uint8Array.from(
    atob(ciphertext),
    c => c.charCodeAt(0)
  );

  const iv = Uint8Array.from(
    atob(ivBase64),
    c => c.charCodeAt(0)
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBytes
  );

  return decoder.decode(decrypted);
}

/**
 * Export key as base64 string
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/**
 * Import key from base64 string
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}