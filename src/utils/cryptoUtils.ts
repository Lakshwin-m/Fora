// src/utils/cryptoUtils.ts
// Web Crypto API — AES-GCM 256 + RSA-OAEP 2048
// Zero external dependencies.

// ─────────────────────────────────────────────────────────
// ENCODING HELPERS
// ─────────────────────────────────────────────────────────

export function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─────────────────────────────────────────────────────────
// MASTER KEY DERIVATION (PBKDF2)
// ─────────────────────────────────────────────────────────

/**
 * Derives a 256-bit AES-GCM key from uid + serverPepper via PBKDF2.
 * 310,000 iterations of SHA-256. Non-extractable.
 * Called once per login — result held in memory only.
 */
export async function deriveMasterKey(
  keyMaterial: string,  // uid + serverPepper (from Cloud Function)
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyMaterial),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,       // non-extractable master key
    ["encrypt", "decrypt"]
  );
}

// ─────────────────────────────────────────────────────────
// RSA KEY PAIR
// ─────────────────────────────────────────────────────────

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return bufferToBase64(exported);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    base64ToBuffer(base64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

// ─────────────────────────────────────────────────────────
// PRIVATE KEY ENCRYPTION / DECRYPTION
// ─────────────────────────────────────────────────────────

/**
 * AES-GCM encrypts the exported private key bytes.
 * The encrypted blob + iv are safe to store in Firestore.
 */
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  masterKey: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const privateKeyBytes = await crypto.subtle.exportKey("pkcs8", privateKey);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    privateKeyBytes
  );

  return {
    encrypted: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts the stored private key blob and re-imports it.
 * Returns a non-extractable CryptoKey — never leaves memory raw.
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  ivBase64: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const privateKeyBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(ivBase64) },
    masterKey,
    base64ToBuffer(encryptedBase64)
  );

  return crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,       // non-extractable
    ["decrypt"]
  );
}

// ─────────────────────────────────────────────────────────
// CAPSULE TEXT ENCRYPTION
// ─────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string with the capsule's content key.
 * A fresh random 12-byte IV is generated for every call.
 */
export async function encryptText(
  plaintext: string,
  contentKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    contentKey,
    encoded
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts a ciphertext string with the capsule's content key.
 */
export async function decryptText(
  ciphertextBase64: string,
  ivBase64: string,
  contentKey: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(ivBase64) },
    contentKey,
    base64ToBuffer(ciphertextBase64)
  );

  return new TextDecoder().decode(decrypted);
}

// ─────────────────────────────────────────────────────────
// CONTENT KEY — PER-CAPSULE AES KEY
// ─────────────────────────────────────────────────────────

/**
 * Generates a fresh random 256-bit AES-GCM key for one capsule.
 * Extractable so it can be RSA-wrapped for each recipient.
 */
export async function generateContentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,   // extractable — needed for RSA wrapping
    ["encrypt", "decrypt"]
  );
}

/**
 * RSA-OAEP encrypts the raw content key bytes once per recipient.
 * Returns { userId: base64_wrapped_key }
 */
export async function wrapContentKeyForRecipients(
  contentKey: CryptoKey,
  recipientPublicKeys: Record<string, string>  // { userId: base64PublicKey }
): Promise<Record<string, string>> {
  const rawContentKey = await crypto.subtle.exportKey("raw", contentKey);
  const encryptedKeys: Record<string, string> = {};

  for (const [userId, publicKeyBase64] of Object.entries(recipientPublicKeys)) {
    const publicKey = await importPublicKey(publicKeyBase64);
    const wrapped = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      rawContentKey
    );
    encryptedKeys[userId] = bufferToBase64(wrapped);
  }

  return encryptedKeys;
}

/**
 * RSA-OAEP decrypts this user's wrapped content key.
 * Returns a non-extractable AES-GCM key ready for decryptText.
 */
export async function unwrapContentKey(
  wrappedKeyBase64: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const rawContentKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBuffer(wrappedKeyBase64)
  );

  return crypto.subtle.importKey(
    "raw",
    rawContentKey,
    { name: "AES-GCM" },
    false,       // non-extractable after unwrap
    ["encrypt", "decrypt"]
  );
}