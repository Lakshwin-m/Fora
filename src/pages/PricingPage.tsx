import Navigation from "@/components/Navigation";
import { PricingContainer } from "@/components/ui/pricing-container";

// Types
interface PricingPlan {
  name: string;
  subtitle: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular?: boolean;
  accent: string;
  rotation?: number;
}
const DEMO_PLANS: PricingPlan[] = [
  {
    name: "Arki (Free)",
    subtitle: "(are-key · beginning)",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "5 Lifetime Time Capsules",
      "Text & Image Memories",
      "Fixed Delivery Dates",
      "Standard Sealing Ritual",
      "Access Forever",
    ],
    isPopular: false,
    accent: "bg-rose-500",
    rotation: -2,
  },
  {
    name: "Kyklos (Starter)",
    subtitle: "(kee-klos · cycle)",
    monthlyPrice: 99,
    yearlyPrice: 999,
    features: [
      "5 Capsules Every Month",
      "Unused Capsules Roll Over",
      "Text & Image Memories",
      "Edit Before Sealing",
      "Priority Reminders",
    ],
    isPopular: true,
    accent: "bg-blue-500",
    rotation: 1,
  },
  {
    name: "Aion (Pro)",
    subtitle: "(eye-on · forever)",
    monthlyPrice: 199,
    yearlyPrice: 1999,
    features: [
      "Unlimited Capsules",
      "Voice & Video Memories",
      "Multiple Messages per Capsule",
      "Long-Term Delivery (5–20 Years)",
      "Custom Sealing & Signatures",
      "Priority Delivery Reliability",
    ],
    isPopular: false,
    accent: "bg-violet-500",
    rotation: 2,
  },
];
export function PricingDemo() {
  return (
    <>
      <Navigation />
      <PricingContainer title="Choose Your Perfect Plan" plans={DEMO_PLANS} />
    </>
  );
}
