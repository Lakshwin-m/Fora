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
import { IconCheck, IconX, IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "@/contexts/LanguageContext";

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
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-5xl bg-surface/80 backdrop-blur-xl border border-border shadow-card rounded-3xl overflow-hidden flex flex-col md:flex-row relative z-10">
        
        {/* Left Side - Image Placeholder */}
        <div className="md:w-1/2 relative overflow-hidden min-h-[300px] md:min-h-full">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
            style={{ backgroundImage: 'url(/auth-bg.png)' }}
          />
          {/* Gradient overlays to blend into the background */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/90 md:to-surface/80"></div>
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 z-10 pb-16">
            <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight text-foreground tracking-tight drop-shadow-md">
              {t("auth.heroTitle")}<br/>
              <span className="bg-gradient-primary bg-clip-text text-transparent">{t("auth.heroTitleSpan")}</span>
            </h1>
            <p className="mt-4 text-gray-300 text-lg max-w-md drop-shadow-sm font-medium">
              {isLogin
                ? t("auth.heroSubtitleLogin")
                : t("auth.heroSubtitleSignup")}
            </p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-surface/40 backdrop-blur-md">
          <div className="flex flex-col mb-8">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-2 tracking-tight text-foreground">
              {isLogin ? t("auth.welcomeBack") : t("auth.getStarted")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isLogin
                ? t("auth.signinSub")
                : t("auth.signupSub")}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleEmailAuth}>
            {isLogin && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full border border-border bg-input hover:bg-elevated text-foreground font-medium py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                    alt="Google logo"
                    className="w-5 h-5"
                  />
                  {t("auth.googleSignIn")}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface px-4 text-muted-foreground uppercase font-medium tracking-wider">
                      {t("auth.or")}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                {t("auth.emailLabel")}
              </label>
              <input
                type="email"
                id="email"
                placeholder={t("auth.emailPlaceholder")}
                className={`w-full py-3 px-4 bg-input border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth placeholder:text-muted-foreground ${
                  error.toLowerCase().includes("email") ? "border-destructive" : "border-border"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                {isLogin ? t("auth.passwordLabel") : t("auth.createPasswordLabel")}
              </label>
              <input
                type="password"
                id="password"
                placeholder={
                  isLogin ? t("auth.passwordPlaceholder") : t("auth.createPasswordPlaceholder")
                }
                className={`w-full py-3 px-4 bg-input border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth placeholder:text-muted-foreground ${
                  error.toLowerCase().includes("password")
                    ? "border-destructive"
                    : "border-border"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {!isLogin && <PasswordValidation />}
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3.5 rounded-xl transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (!isLogin && !isPasswordValid)}
            >
              {loading
                ? isLogin
                  ? t("auth.signingIn")
                  : t("auth.signingUp")
                : isLogin
                ? t("auth.signinBtn")
                : t("auth.signupBtn")}
            </button>

            <div className="text-center text-xs text-muted-foreground py-2 mt-2">
              {t("auth.agreeText")}{" "}
              <button
                type="button"
                className="text-foreground hover:text-primary underline transition-colors"
                onClick={() => {
                  /* Add terms modal */
                }}
              >
                {t("auth.termsOfService")}
              </button>{" "}
              {t("auth.and")}{" "}
              <button
                type="button"
                className="text-foreground hover:text-primary underline transition-colors"
                onClick={() => {
                  /* Add privacy modal */
                }}
              >
                {t("auth.privacyPolicy")}
              </button>
            </div>

            <div className="text-center text-sm text-muted-foreground mt-2">
              {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setPassword("");
                  if (!isLogin) {
                    setPasswordValidation({
                      minLength: false,
                      hasUppercase: false,
                      hasLowercase: false,
                      hasNumber: false,
                      hasSpecialChar: false,
                    });
                  }
                }}
                className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1"
              >
                {isLogin ? t("auth.signupLink") : t("auth.signinLink")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Product By */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-xs text-muted-foreground font-medium">
          {t("auth.productBy")} <span style={{ fontFamily: '"JetBrains Mono", monospace' }} className="text-foreground/80 font-semibold tracking-tight">./localhost</span>
        </p>
      </div>
    </div>
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
      <IconCheck className="h-4 w-4 text-success flex-shrink-0" />
    ) : (
      <IconX className="h-4 w-4 text-destructive flex-shrink-0" />
    )}
    <span className={`text-xs font-medium ${isValid ? "text-success" : "text-destructive"}`}>
      {text}
    </span>
  </div>
);
