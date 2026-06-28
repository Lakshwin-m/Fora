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

  const words = title.split(' ');

  return (
    <div
      ref={ref || cardRef}
      className={cn("flex items-center gap-3 md:gap-4", className)}
      {...props}
    >
      <motion.h1 className="text-5xl md:text-[4rem] font-light tracking-tighter text-[#5D2A42] leading-none">
        {displayValue}
      </motion.h1>
      <div className="flex flex-col text-[10px] md:text-[11px] text-[#5D2A42]/60 font-medium tracking-[0.2em] uppercase leading-[1.2]">
        {words.map((word, idx) => (
          <span key={idx}>{word}</span>
        ))}
      </div>
    </div>
  );
});

AnimatedStatsCard.displayName = "AnimatedStatsCard";

export { AnimatedStatsCard };
