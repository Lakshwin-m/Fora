"use client";

import * as React from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedStatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  primaryValue: number;
}

const AnimatedStatsCard = React.forwardRef<
  HTMLDivElement,
  AnimatedStatsCardProps
>(({ title, primaryValue, className, ...props }, ref) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-100px" });

  const spring = useSpring(0, {
    damping: 50,
    stiffness: 200,
    mass: 1,
  });

  const displayValue = useTransform(spring, (current) => current.toFixed(0));

  React.useEffect(() => {
    if (isInView) {
      spring.set(primaryValue);
    }
  }, [isInView, primaryValue, spring]);

  return (
    <div
      ref={ref || cardRef}
      className={cn("flex flex-col items-center justify-center", className)}
      {...props}
    >
      <motion.h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#1A1A1A]">
        {displayValue}
      </motion.h1>
      <p className="text-sm text-[#666666] mt-2">{title}</p>
    </div>
  );
});

AnimatedStatsCard.displayName = "AnimatedStatsCard";

export { AnimatedStatsCard };
