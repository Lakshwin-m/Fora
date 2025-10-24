// Onboarding.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { updateProfile } from "firebase/auth";

const Onboarding = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleOnboarding = async (e) => {
    e.preventDefault();
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: username,
      });
      // Redirect to dashboard after onboarding
      navigate("/dashboard");
    }
  };

  return (
    <form onSubmit={handleOnboarding}>
      <input
        type="text"
        placeholder="Your Name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <button type="submit">Finish Setup</button>
    </form>
  );
};

export default Onboarding;
