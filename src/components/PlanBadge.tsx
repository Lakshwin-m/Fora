"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanBadgeProps {
  tier: string;
  usedCapsules: number;
  capsuleLimit: number | null;
  className?: string;
}

export function PlanBadge({
  tier,
  usedCapsules,
  capsuleLimit,
  className,
}: PlanBadgeProps) {
  const usageText =
    capsuleLimit === null
      ? "Unlimited capsules"
      : `${usedCapsules} / ${capsuleLimit} capsules`;
  const PLAN_DISPLAY_NAMES: Record<string, string> = {
    free: "Arki",
    starter: "Kyklos",
    pro: "Aion",
  };
  const displayName = PLAN_DISPLAY_NAMES[tier.toLowerCase()] ?? tier;

  return (
    <div
      className={cn(
        "flex items-center gap-6 rounded-lg border bg-card px-6 py-4",
        className
      )}
    >
      {/* Content */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{displayName}</span>
          <span className="text-1xl font-normal">({tier})</span>
        </div>

        <div className="text-sm text-muted-foreground">{usageText}</div>
      </div>
    </div>
  );
}
