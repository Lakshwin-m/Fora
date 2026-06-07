// src/contexts/AuthContext.tsx
// Holds the user's in-memory private CryptoKey alongside the Firebase user.
// Key generation / loading fires silently on every login.
// privateKey is NEVER written to any storage — React state only.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/firebase";
import {
  userHasKeys,
  initUserKeys,
  loadPrivateKey,
} from "@/encryption/keyManager";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface AuthContextType {
  /** Firebase user — null while loading or signed out */
  user: User | null;
  /** In-memory RSA private key — null until keys are loaded */
  privateKey: CryptoKey | null;
  /** True while Firebase auth state resolves or keys are loading */
  loading: boolean;
}

// ─────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  privateKey: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

// ─────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]             = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // ── Signed out ──
      if (!firebaseUser) {
        setUser(null);
        setPrivateKey(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // ── Load or generate keys silently ──
      try {
        const hasKeys = await userHasKeys(firebaseUser.uid);

        if (!hasKeys) {
          // New user (or existing user without keys yet) — init silently
          const key = await initUserKeys(firebaseUser.uid);
          setPrivateKey(key);
        } else {
          // Returning user — re-derive and load from Firestore
          const key = await loadPrivateKey(firebaseUser.uid);
          setPrivateKey(key);
        }
      } catch (err) {
        // Key errors must NOT block the user from using the app.
        // Capsule decryption will fail gracefully with fallback UI text.
        console.error("[AuthContext] Key setup failed:", err);
        setPrivateKey(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, privateKey, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
