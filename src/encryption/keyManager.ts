// src/encryption/keyManager.ts
// Manages RSA key pair lifecycle per user.
// Private key is NEVER written to localStorage or any persistent store.
// Private key lives in memory only (React state in AuthContext).

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import {
  deriveMasterKey,
  generateRSAKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  exportPublicKey,
  bufferToBase64,
  base64ToBuffer,
} from "../utils/cryptoUtils";

// ─────────────────────────────────────────────────────────
// CLOUD FUNCTION: fetch key material
// ─────────────────────────────────────────────────────────

async function fetchKeyMaterial(): Promise<string> {
  const functions = getFunctions();
  const getKeyMaterial = httpsCallable<object, { keyMaterial: string }>(
    functions,
    "getKeyMaterial"
  );
  const result = await getKeyMaterial({});
  return result.data.keyMaterial;
}

// ─────────────────────────────────────────────────────────
// CHECK IF USER ALREADY HAS KEYS
// ─────────────────────────────────────────────────────────

export async function userHasKeys(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() && !!snap.data()?.publicKey;
}

// ─────────────────────────────────────────────────────────
// INIT KEYS — first login or new account
// ─────────────────────────────────────────────────────────

/**
 * Generates a new RSA key pair for this user.
 * Encrypts the private key with a PBKDF2-derived master key.
 * Writes { publicKey, encryptedPrivateKey, privateKeyIV, salt } to Firestore.
 * Returns the in-memory private CryptoKey for this session.
 */
export async function initUserKeys(userId: string): Promise<CryptoKey> {
  // 1. Generate per-user random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bufferToBase64(salt.buffer);

  // 2. Save salt first (needed to re-derive later)
  await updateDoc(doc(db, "users", userId), {
    salt: saltBase64,
  });

  // 3. Fetch key material from Cloud Function + derive master key
  const keyMaterial = await fetchKeyMaterial();
  const masterKey = await deriveMasterKey(keyMaterial, salt.buffer);

  // 4. Generate RSA-OAEP key pair
  const keyPair = await generateRSAKeyPair();

  // 5. Encrypt private key with master key (AES-GCM)
  const encPriv = await encryptPrivateKey(keyPair.privateKey, masterKey);

  // 6. Export public key (safe to store in Firestore — not secret)
  const pubKey = await exportPublicKey(keyPair.publicKey);

  // 7. Write all key data to Firestore — private key never stored raw
  await updateDoc(doc(db, "users", userId), {
    publicKey:           pubKey,
    encryptedPrivateKey: encPriv.encrypted,
    privateKeyIV:        encPriv.iv,
    keysGeneratedAt:     serverTimestamp(),
  });

  // 8. Return private key for this session (memory only — not stored anywhere)
  return keyPair.privateKey;
}

// ─────────────────────────────────────────────────────────
// LOAD KEYS — every subsequent login
// ─────────────────────────────────────────────────────────

/**
 * Re-derives the master key and decrypts the stored private key.
 * Returns the in-memory private CryptoKey for this session.
 * Throws if keys have not been initialised or master key is wrong.
 */
export async function loadPrivateKey(userId: string): Promise<CryptoKey> {
  // 1. Fetch user doc
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) throw new Error("User document not found");

  const data = snap.data();
  const { salt, encryptedPrivateKey, privateKeyIV } = data;

  if (!salt || !encryptedPrivateKey || !privateKeyIV) {
    throw new Error("Keys not initialised for this user");
  }

  // 2. Fetch key material from Cloud Function + re-derive master key
  const keyMaterial = await fetchKeyMaterial();
  const masterKey = await deriveMasterKey(keyMaterial, base64ToBuffer(salt));

  // 3. Decrypt private key — throws if anything is wrong (wrong pepper, corrupt data)
  return decryptPrivateKey(encryptedPrivateKey, privateKeyIV, masterKey);
}

// ─────────────────────────────────────────────────────────
// FETCH RECIPIENT PUBLIC KEYS (for sharing)
// ─────────────────────────────────────────────────────────

/**
 * Batch-fetches public keys from Firestore for a list of user IDs.
 * Returns only users who have keys initialised.
 * Missing users are silently skipped — caller handles the gap.
 */
export async function getRecipientPublicKeys(
  userIds: string[]
): Promise<Record<string, string>> {
  const publicKeys: Record<string, string> = {};

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && snap.data()?.publicKey) {
          publicKeys[uid] = snap.data()!.publicKey as string;
        }
      } catch {
        // Skip users whose key fetch fails — non-fatal
        console.warn(`[keyManager] Could not fetch public key for uid=${uid}`);
      }
    })
  );

  return publicKeys;
}
