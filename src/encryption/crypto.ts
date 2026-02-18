// src/encryption/crypto.ts

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function encryptText(
  key: CryptoKey,
  plaintext: string
) {
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

export async function decryptText(
  key: CryptoKey,
  encryptedData: string,
  ivBase64: string
) {
  const encryptedBytes = Uint8Array.from(
    atob(encryptedData),
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
