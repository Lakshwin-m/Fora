import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showUsernameStep, setShowUsernameStep] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const navigate = useNavigate();

  const createUserProfile = async (user, displayName, photoURL = null) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: displayName,
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
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
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
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    try {
      await updateProfile(tempUser, {
        displayName: username,
      });

      await createUserProfile(tempUser, username);
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await createUserProfile(user, user.displayName || "User", user.photoURL);

      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  if (showUsernameStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Choose Your Username</CardTitle>
            <CardDescription>
              This will be displayed on your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isLogin ? "Login to Forá" : "Sign up for Forá"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>

          <div className="my-4 text-center text-gray-500">OR</div>

          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="Google logo"
              className="w-5 h-5 mr-2"
            />
            Continue with Google
          </Button>

          <p className="mt-4 text-center text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-500 cursor-pointer font-semibold"
            >
              {isLogin ? "Sign Up" : "Login"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
