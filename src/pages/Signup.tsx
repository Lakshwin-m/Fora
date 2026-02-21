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
import { SunIcon as Sunburst } from "lucide-react";
import { IconCheck, IconX, IconAlertCircle } from "@tabler/icons-react";

export function SignUpLoginForm() {
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
      <p className="text-sm font-medium text-gray-700">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-5xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Side */}
          <div className="md:w-1/2 bg-red- p-8 md:p-12 relative overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

            {/* Gradient stripes */}
            <div className="absolute inset-0 flex">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-full w-16 opacity-20"
                  style={{
                    background: `linear-gradient(90deg, 
                      rgba(255,255,255,0) 0%, 
                      rgba(0,0,0,0.8) 50%, 
                      rgba(255,255,255,0.2) 100%)`,
                    marginRight: i < 5 ? "0.5rem" : "0",
                  }}
                ></div>
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-medium leading-tight text-white">
                Welcome to Time Capsule
              </h1>
              <p className="mt-4 text-gray-300">
                Just one more step to complete your profile and start creating
                memories
              </p>
            </div>
          </div>

          {/* Right Side - Username Form */}
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col">
            <div className="flex flex-col mb-8">
              <div className="text-orange-500 mb-4">
                <Sunburst className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-medium mb-2 tracking-tight">
                Complete Your Profile
              </h2>
              <p className="text-gray-600">
                Choose how you'll appear to others
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              className="flex flex-col gap-4"
              onSubmit={handleUsernameSubmit}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstname"
                    className="block text-sm mb-2 text-gray-700"
                  >
                    First name
                  </label>
                  <input
                    type="text"
                    id="firstname"
                    placeholder="First name"
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastname"
                    className="block text-sm mb-2 text-gray-700"
                  >
                    Last name
                  </label>
                  <input
                    type="text"
                    id="lastname"
                    placeholder="Last name"
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm mb-2 text-gray-700"
                >
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Choose a username"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Creating profile..." : "Complete Sign Up"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-5xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-1/2 relative overflow-hidden">
          {/* Content */}
          <div className="relative z-10 p-8 md:p-12 h-full flex flex-col justify-center bg-red-500">
            <h1 className="text-2xl md:text-3xl font-medium leading-tight text-white">
              Messages for the moments
              <br />
              that matter most.
            </h1>
            <p className="mt-4 text-gray-300">
              {isLogin
                ? "There you are. Shall we make more moments worth saving?"
                : "Join our community to create and share memories that last forever"}
            </p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col">
          <div className="flex flex-col mb-8">
            <h2 className="text-3xl font-medium mb-2 tracking-tight">
              {isLogin ? "Welcome Back" : "Get Started"}
            </h2>
            <p className="text-gray-600">
              {isLogin
                ? "Sign in to continue your journey"
                : "Create an account to start your journey"}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleEmailAuth}>
            {isLogin && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                    alt="Google logo"
                    className="w-5 h-5"
                  />
                  Continue with Google
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-4 text-gray-500 uppercase">
                      OR
                    </span>
                  </div>
                </div>
              </>
            )}

            {!isLogin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstname"
                    className="block text-sm mb-2 text-gray-700"
                  >
                    First name *
                  </label>
                  <input
                    type="text"
                    id="firstname"
                    placeholder="First name"
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastname"
                    className="block text-sm mb-2 text-gray-700"
                  >
                    Last name *
                  </label>
                  <input
                    type="text"
                    id="lastname"
                    placeholder="Last name"
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm mb-2 text-gray-700"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                className={`w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  error.includes("email") ? "border-red-500" : "border-gray-300"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm mb-2 text-gray-700"
              >
                {isLogin ? "Password *" : "Create Password *"}
              </label>
              <input
                type="password"
                id="password"
                placeholder={
                  isLogin ? "Your password" : "At least 8 characters"
                }
                className={`w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  error.includes("password") || error.includes("Password")
                    ? "border-red-500"
                    : "border-gray-300"
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
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-orange-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (!isLogin && !isPasswordValid)}
            >
              {loading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </button>

            <div className="text-center text-xs text-gray-600 py-2">
              By continuing, you agree to our{" "}
              <button
                type="button"
                className="underline hover:text-gray-800"
                onClick={() => {
                  /* Add terms modal */
                }}
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                className="underline hover:text-gray-800"
                onClick={() => {
                  /* Add privacy modal */
                }}
              >
                Privacy Policy
              </button>
            </div>

            <div className="text-center text-sm text-gray-600">
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
                className="font-semibold text-orange-500 hover:text-orange-600 underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </form>
        </div>
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
      <IconCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
    ) : (
      <IconX className="h-4 w-4 text-red-500 flex-shrink-0" />
    )}
    <span className={`text-sm ${isValid ? "text-green-600" : "text-red-500"}`}>
      {text}
    </span>
  </div>
);
