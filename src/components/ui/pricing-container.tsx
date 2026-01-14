import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { startPayment } from "@/lib/razorpay";
import { useAuth } from "@/hooks/useAuth"; // Make sure you have this hook
import { useNavigate } from "react-router-dom"; // If using React Router

interface PricingProps {
  title?: string;
  plans: PricingPlan[];
  className?: string;
}

// Counter Component
const Counter = ({ from, to }: { from: number; to: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(from, to, {
      duration: 1,
      onUpdate(value) {
        node.textContent = value.toFixed(0);
      },
    });
    return () => controls.stop();
  }, [from, to]);
  return <span ref={nodeRef} />;
};

// Header Component
const PricingHeader = ({ title }: { title: string }) => (
  <div className="text-center mb-8 sm:mb-12 relative z-10">
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-block"
    >
      <h1
        className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 
                bg-gradient-to-r from-white to-gray-100 px-8 py-4 rounded-xl border-4 border-black
                shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9),_15px_15px_15px_-3px_rgba(0,0,0,0.1)]
                transform transition-transform hover:translate-x-1 hover:translate-y-1 mb-3 relative
                before:absolute before:inset-0 before:bg-white/50 before:rounded-xl before:blur-sm before:-z-10"
      >
        {title}
      </h1>
      <motion.div
        className="h-2 bg-gradient-to-r from-black via-gray-600 to-black rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5 }}
      />
    </motion.div>
  </div>
);

// Toggle Component
const PricingToggle = ({
  isYearly,
  onToggle,
}: {
  isYearly: boolean;
  onToggle: () => void;
}) => (
  <div className="flex justify-center items-center gap-4 mb-8 relative z-10">
    <span
      className={`text-gray-600 font-medium ${!isYearly ? "text-black" : ""}`}
    >
      Monthly
    </span>
    <motion.button
      className="w-16 h-8 flex items-center bg-gray-200 rounded-full p-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]"
      onClick={onToggle}
    >
      <motion.div
        className="w-6 h-6 bg-white rounded-full border-2 border-black"
        animate={{ x: isYearly ? 32 : 0 }}
      />
    </motion.button>
    <span
      className={`text-gray-600 font-medium ${isYearly ? "text-black" : ""}`}
    >
      Yearly
    </span>
    {isYearly && (
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-green-500 font-medium text-sm"
      >
        Save 20%
      </motion.span>
    )}
  </div>
);

// Background Effects Component
const BackgroundEffects = () => (
  <>
    <div className="absolute inset-0">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-black/5 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(#00000008 1px, transparent 1px), linear-gradient(90deg, #00000008 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    />
  </>
);

// Pricing Card Component
const PricingCard = ({
  plan,
  isYearly,
  index,
  isProcessing,
  onGetStarted,
}: {
  plan: PricingPlan;
  isYearly: boolean;
  index: number;
  isProcessing: boolean;
  onGetStarted: () => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150 };
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [7, -7]),
    springConfig
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-7, 7]),
    springConfig
  );

  const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const previousPrice = !isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const isFree =
    plan.name.toLowerCase().includes("free") ||
    plan.name.toLowerCase().includes("arki");

  return (
    <motion.div
      ref={cardRef}
      key={plan.name}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2 }}
      style={{
        rotateX,
        rotateY,
        perspective: 1000,
      }}
      onMouseMove={(e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        mouseX.set((e.clientX - centerX) / rect.width);
        mouseY.set((e.clientY - centerY) / rect.height);
      }}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
      className={`relative w-full bg-white rounded-xl p-6 border-3 border-black
                shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]
                hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)]
                transition-all duration-200`}
    >
      {/* Price Badge */}
      <motion.div
        className={cn(
          `absolute -top-4 -right-4 w-16 h-16 
                    rounded-full flex items-center justify-center border-2 border-black
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]`,
          plan.accent
        )}
        animate={{
          rotate: [0, 10, 0, -10, 0],
          scale: [1, 1.1, 0.9, 1.1, 1],
          y: [0, -5, 5, -3, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: [0.76, 0, 0.24, 1],
        }}
      >
        <div className="text-center text-white">
          {isFree ? (
            <div className="text-lg font-black">FREE</div>
          ) : (
            <>
              <div className="text-lg font-black">
                ₹
                <Counter from={previousPrice} to={currentPrice} />
              </div>
              <div className="text-[10px] font-bold">
                /{isYearly ? "yr" : "mo"}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Plan Name and Subtitle */}
      <div className="mb-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-black tracking-tight leading-none">
            {plan.name}
          </h3>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-600 italic tracking-wide">
              {plan.subtitle}
            </h3>
            {plan.isPopular && (
              <motion.span
                className={cn(
                  `inline-block px-3 py-1 text-white
                   font-black rounded-md text-xs border-2 border-black
                   shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]`,
                  plan.accent
                )}
                animate={{
                  y: [0, -3, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                POPULAR
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="space-y-2 mb-4">
        {plan.features.map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{
              x: 5,
              scale: 1.02,
              transition: { type: "spring", stiffness: 400 },
            }}
            className={`flex items-center gap-2 p-2 bg-gray-50 rounded-md border-2 border-black
                            shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]`}
          >
            <motion.span
              whileHover={{ scale: 1.2, rotate: 360 }}
              className={cn(
                `w-5 h-5 rounded-md flex items-center justify-center
                                text-white font-bold text-xs border border-black
                                shadow-[1px_1px_0px_0px_rgba(0,0,0,0.9)]`,
                plan.accent
              )}
            >
              ✓
            </motion.span>
            <span className="text-black font-bold text-sm">{feature}</span>
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button
        className={cn(
          `w-full py-3 rounded-lg text-white font-black text-sm
           border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]
           disabled:opacity-50 disabled:cursor-not-allowed
           hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]
           hover:translate-x-[2px] hover:translate-y-[2px]
           transition-all duration-200`,
          isFree ? "bg-gray-400" : plan.accent
        )}
        onClick={onGetStarted}
        disabled={isFree || isProcessing}
        whileHover={!isFree && !isProcessing ? { scale: 1.02 } : {}}
        whileTap={!isFree && !isProcessing ? { scale: 0.98 } : {}}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            PROCESSING...
          </span>
        ) : isFree ? (
          "CURRENT PLAN"
        ) : (
          "GET STARTED →"
        )}
      </motion.button>
    </motion.div>
  );
};

// Main Container Component
export const PricingContainer = ({
  title = "Pricing Plans",
  plans,
  className = "",
}: PricingProps) => {
  const [isYearly, setIsYearly] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // If you're using authentication, uncomment these:
  // const { user } = useAuth();
  // const navigate = useNavigate();

  const handleGetStarted = async (plan: PricingPlan) => {
    // Check if free plan
    if (
      plan.name.toLowerCase().includes("free") ||
      plan.name.toLowerCase().includes("arki")
    ) {
      return;
    }

    // Uncomment if you want to check authentication
    // if (!user) {
    //   navigate("/login?redirect=/pricing");
    //   return;
    // }

    // Determine plan tier based on plan name
    let planTier: "starter" | "pro";
    if (
      plan.name.toLowerCase().includes("starter") ||
      plan.name.toLowerCase().includes("kyklos")
    ) {
      planTier = "starter";
    } else if (
      plan.name.toLowerCase().includes("pro") ||
      plan.name.toLowerCase().includes("aion")
    ) {
      planTier = "pro";
    } else {
      console.error("Unknown plan type:", plan.name);
      return;
    }

    const planKey = `${planTier}-${isYearly ? "yearly" : "monthly"}`;
    setProcessingPlan(planKey);

    try {
      await startPayment({
        planTier,
        billingCycle: isYearly ? "yearly" : "monthly",
      });
    } catch (error) {
      console.error("Payment failed:", error);
      // Error handling is already done in startPayment function
    } finally {
      setProcessingPlan(null);
    }
  };

  const isPlanProcessing = (plan: PricingPlan) => {
    let planTier: string;
    if (
      plan.name.toLowerCase().includes("starter") ||
      plan.name.toLowerCase().includes("kyklos")
    ) {
      planTier = "starter";
    } else if (
      plan.name.toLowerCase().includes("pro") ||
      plan.name.toLowerCase().includes("aion")
    ) {
      planTier = "pro";
    } else {
      return false;
    }

    return processingPlan === `${planTier}-${isYearly ? "yearly" : "monthly"}`;
  };

  return (
    <div
      className={`min-h-screen bg-[#FFF9EC] p-4 sm:p-6 lg:p-8 relative overflow-hidden rounded-[12px] ${className}`}
    >
      <PricingHeader title={title} />
      <PricingToggle
        isYearly={isYearly}
        onToggle={() => setIsYearly(!isYearly)}
      />
      <BackgroundEffects />

      <div className="w-[100%] max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            isYearly={isYearly}
            index={index}
            isProcessing={isPlanProcessing(plan)}
            onGetStarted={() => handleGetStarted(plan)}
          />
        ))}
      </div>

      {/* Optional: Add a note at the bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-12 text-gray-600 text-sm relative z-10"
      >
        <p>All plans include our secure time capsule encryption</p>
        <p className="mt-2">
          Questions?{" "}
          <a href="mailto:support@fora.com" className="underline font-semibold">
            Contact us
          </a>
        </p>
      </motion.div>
    </div>
  );
};
