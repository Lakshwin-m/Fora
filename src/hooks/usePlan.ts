import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

export type Plan = {
  tier: "free" | "starter" | "pro";
  capsuleLimit: number | null;
  usedCapsules: number;
};

export const usePlan = () => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        console.log("🔥 usePlan: loading plan");

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          console.warn("⚠️ usePlan: no user");
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/getMyProfile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const profile = await res.json();
        console.log("📦 usePlan: profile", profile);

        const planFromDb = profile?.plan;

        if (!planFromDb) {
          console.warn("⚠️ usePlan: no plan in profile");
          setPlan(null);
        } else {
          setPlan({
            tier: planFromDb.tier,
            capsuleLimit: planFromDb.capsuleLimit,
            usedCapsules: planFromDb.usedCapsules,
          });
        }
      } catch (err) {
        console.error("❌ usePlan failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, []);

  return { plan, loading };
};
