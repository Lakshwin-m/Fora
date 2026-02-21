// src/encryption/keyManager.ts

const KEY_NAME = "fora_master_key";

export async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_NAME);

  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));

    return crypto.subtle.importKey(
      "raw",
      raw,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const raw = await crypto.subtle.exportKey("raw", key);
  const encoded = btoa(String.fromCharCode(...new Uint8Array(raw)));

  localStorage.setItem(KEY_NAME, encoded);

  return key;
}
