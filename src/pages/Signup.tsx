"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IconBrandGoogleFilled,
  IconCheck,
  IconX,
  IconAlertCircle,
} from "@tabler/icons-react";

export function SignupLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showUsernameStep, setShowUsernameStep] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
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

  const createUserProfile = async (
    user: any,
    displayName: string,
    photoURL: string | null = null
  ) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: displayName,
          firstName: firstName || "",
          lastName: lastName || "",
          email: user.email,
          photoURL: photoURL || "",
          bio: "",
          location: "",
          joinDate: new Date().toISOString(),
          stats: {
            totalCapsules: 0,
            connections: 0,
            opened: 0,
          },
        });
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Additional validation for signup
    if (!isLogin && !isPasswordValid) {
      setError("Please meet all password requirements");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        setTempUser(userCredential.user);
        setShowUsernameStep(true);
      }
    } catch (error: any) {
      let errorMessage = "An error occurred during authentication";

      // Handle specific Firebase auth errors
      switch (error.code) {
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password. Please try again.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email address.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists.";
          break;
        case "auth/weak-password":
          errorMessage =
            "Password is too weak. Please use a stronger password.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many attempts. Please try again later.";
          break;
        default:
          errorMessage = error.message || "Authentication failed";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    try {
      const displayName =
        firstName && lastName ? `${firstName} ${lastName}` : username;

      await updateProfile(tempUser, {
        displayName: displayName,
      });

      await createUserProfile(tempUser, displayName);
      navigate("/dashboard");
    } catch (error: any) {
      setError(error.message || "Failed to create profile");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await createUserProfile(user, user.displayName || "User", user.photoURL);
      navigate("/dashboard");
    } catch (error: any) {
      let errorMessage = "Google sign-in failed";

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in was cancelled";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked. Please allow popups for this site.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Password validation component - ALL RED INITIALLY
  const PasswordValidation = () => (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Password must contain:
      </p>
      <div className="grid grid-cols-1 gap-2">
        <ValidationItem
          isValid={passwordValidation.minLength}
          text="At least 8 characters"
        />
        <ValidationItem
          isValid={passwordValidation.hasUppercase}
          text="One uppercase letter"
        />
        <ValidationItem
          isValid={passwordValidation.hasLowercase}
          text="One lowercase letter"
        />
        <ValidationItem
          isValid={passwordValidation.hasNumber}
          text="One number"
        />
        <ValidationItem
          isValid={passwordValidation.hasSpecialChar}
          text="One special character"
        />
      </div>
    </div>
  );

  if (showUsernameStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1ed] px-4">
        <div className="mx-auto w-full max-w-md py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
              Choose Your Username
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              This will be displayed on your profile
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleUsernameSubmit}>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <LabelInputContainer>
                <Input
                  id="firstname"
                  placeholder="First name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 text-sm"
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Input
                  id="lastname"
                  placeholder="Last name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 text-sm"
                />
              </LabelInputContainer>
            </div>

            <LabelInputContainer>
              <Input
                id="username"
                placeholder="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="h-12 text-sm"
              />
            </LabelInputContainer>

            <button
              className={`relative flex h-12 w-full items-center justify-center rounded-lg bg-[#d4a59a] font-medium text-white text-sm transition-all ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#c89485]"
              }`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating profile..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f1ed] px-4">
      <div className="mx-auto w-full max-w-md py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {isLogin
              ? "There you are shall we make more moments worth saving?"
              : "Join our community to create and share time capsules"}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailAuth}>
          {isLogin && (
            <>
              <button
                className={`relative flex h-12 w-full items-center justify-center space-x-2 rounded-lg border border-neutral-300 bg-white font-medium text-neutral-700 text-sm transition-all ${
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-neutral-50"
                }`}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google logo"
                  className="w-5 h-5"
                />
                <span>Continue with Google</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#f5f1ed] px-4 text-neutral-500 uppercase">
                    OR
                  </span>
                </div>
              </div>
            </>
          )}

          {!isLogin && (
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <LabelInputContainer>
                <Input
                  id="firstname"
                  placeholder="First name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={!isLogin}
                  className="h-12 text-sm"
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Input
                  id="lastname"
                  placeholder="Last name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={!isLogin}
                  className="h-12 text-sm"
                />
              </LabelInputContainer>
            </div>
          )}

          <LabelInputContainer>
            <Input
              id="email"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`h-12 text-sm ${
                error.includes("email")
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            />
          </LabelInputContainer>

          <LabelInputContainer>
            <Input
              id="password"
              placeholder={
                !isLogin ? "Password (min. 8 characters)" : "Password"
              }
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`h-12 text-sm ${
                error.includes("password") || error.includes("Password")
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            />
            {!isLogin && <PasswordValidation />}
          </LabelInputContainer>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            className={`relative flex h-12 w-full items-center justify-center rounded-lg bg-[#5b2941] font-medium text-white text-sm transition-all ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#5b2940]"
            } ${
              !isLogin && !isPasswordValid
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            type="submit"
            disabled={loading || (!isLogin && !isPasswordValid)}
          >
            {loading
              ? isLogin
                ? "Logging in..."
                : "Creating account..."
              : `${isLogin ? "Sign In" : "Create Account"}`}
          </button>

          <div className="text-center text-xs text-neutral-600 dark:text-neutral-300 py-2">
            By continuing, you agree to our{" "}
            <button
              type="button"
              className="underline hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="underline hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Privacy Policy
            </button>
          </div>

          <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
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
              className="font-semibold text-[#c89485] hover:text-[#b58475] underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col", className)}>{children}</div>
  );
};

const ValidationItem = ({
  isValid,
  text,
  className = "",
}: {
  isValid: boolean;
  text: string;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-2", className)}>
    {isValid ? (
      <IconCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
    ) : (
      <IconX className="h-4 w-4 text-red-500 flex-shrink-0" />
    )}
    <span
      className={`text-sm ${
        isValid
          ? "text-green-600 dark:text-green-400"
          : "text-red-500 dark:text-red-400"
      }`}
    >
      {text}
    </span>
  </div>
);
