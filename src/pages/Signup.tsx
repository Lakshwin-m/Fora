"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useTranslation } from "@/contexts/LanguageContext";
import AuthSectionOne from "@/components/ui/auth-section-1";

export function SignUpLoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Password validation states - ALL FALSE INITIALLY
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Validate password
  useEffect(() => {
    if (password && !isLogin) {
      setPasswordValidation({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      });
    } else if (!password && !isLogin) {
      // Reset to all false when password is empty
      setPasswordValidation({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    }
  }, [password, isLogin]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Pre-flight validation — defense-in-depth before Firebase Auth
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      setError(t("auth.errInvalidEmail"));
      setLoading(false);
      return;
    }

    if (password.length > 128) {
      setError(t("auth.errGeneric"));
      setLoading(false);
      return;
    }

    // Additional validation for signup
    if (!isLogin && !isPasswordValid) {
      setError(t("auth.errorPasswordReqs"));
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists() || !snap.data().onboardingCompleted) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;
        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            email: user.email || "",
            username: "",
            onboardingCompleted: false,
          },
          { merge: true }
        );
        navigate("/onboarding");
      }
    } catch (error: any) {
      let errorMessage = t("auth.errGeneric");

      // Handle specific Firebase auth errors
      switch (error.code) {
        case "auth/invalid-credential":
          errorMessage = t("auth.errInvalidCred");
          break;
        case "auth/user-not-found":
          errorMessage = t("auth.errUserNotFound");
          break;
        case "auth/wrong-password":
          errorMessage = t("auth.errWrongPassword");
          break;
        case "auth/email-already-in-use":
          errorMessage = t("auth.errEmailInUse");
          break;
        case "auth/weak-password":
          errorMessage = t("auth.errWeakPassword");
          break;
        case "auth/invalid-email":
          errorMessage = t("auth.errInvalidEmail");
          break;
        case "auth/network-request-failed":
          errorMessage = t("auth.errNetwork");
          break;
        case "auth/too-many-requests":
          errorMessage = t("auth.errTooManyReqs");
          break;
        default:
          errorMessage = error.message || t("auth.errGeneric");
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email || "",
            username: "",
            onboardingCompleted: false,
          },
          { merge: true }
        );
      }

      if (!snap.exists() || !snap.data().onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      let errorMessage = "Google sign-in failed";

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = t("auth.errPopupClosed");
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = t("auth.errPopupBlocked");
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = t("auth.errNetwork");
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const PasswordValidation = () => (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium text-black/60 dark:text-white/60 uppercase tracking-wider">
        {t("auth.pwMustContain")}
      </p>
      <div className="grid grid-cols-1 gap-2">
        <ValidationItem
          isValid={passwordValidation.minLength}
          text={t("auth.reqMinLength")}
        />
        <ValidationItem
          isValid={passwordValidation.hasUppercase}
          text={t("auth.reqUppercase")}
        />
        <ValidationItem
          isValid={passwordValidation.hasLowercase}
          text={t("auth.reqLowercase")}
        />
        <ValidationItem
          isValid={passwordValidation.hasNumber}
          text={t("auth.reqNumber")}
        />
        <ValidationItem
          isValid={passwordValidation.hasSpecialChar}
          text={t("auth.reqSpecial")}
        />
      </div>
    </div>
  );

  const termsText = (
    <>
      {t("auth.agreeText")}{" "}
      <a href="#" className="font-medium text-black/45 underline underline-offset-2 dark:text-white/45">
        {t("auth.termsOfService")}
      </a>{" "}
      {t("auth.and")}{" "}
      <a href="#" className="font-medium text-black/45 underline underline-offset-2 dark:text-white/45">
        {t("auth.privacyPolicy")}
      </a>
    </>
  );

  return (
    <AuthSectionOne
      isLogin={isLogin}
      setIsLogin={setIsLogin}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onSubmit={handleEmailAuth}
      onGoogleSignIn={handleGoogleSignIn}
      loading={loading}
      error={error}
      isPasswordValid={isPasswordValid}
      PasswordValidation={PasswordValidation}
      termsText={termsText}
    />
  );
}

const ValidationItem = ({
  isValid,
  text,
  className = "",
}: {
  isValid: boolean;
  text: string;
  className?: string;
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {isValid ? (
      <IconCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
    ) : (
      <IconX className="h-4 w-4 text-red-500 flex-shrink-0" />
    )}
    <span className={`text-xs font-medium ${isValid ? "text-green-500" : "text-red-500"}`}>
      {text}
    </span>
  </div>
);
