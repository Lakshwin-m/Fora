import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface UsageBadgeProps {
  /** The icon to display next to the plan name. */
  icon?: React.ReactNode;
  /** The name of the current plan (e.g., "Free", "Pro"). */
  planName: string;
  /** The current usage count. */
  usage: number;
  /** The total limit for the plan. */
  limit: number | null;
  /** The content to show inside the hover tooltip. */
  tooltipContent: React.ReactNode;
  /** Optional additional class names for custom styling. */
  className?: string;
}

const UsageBadge = React.forwardRef<HTMLDivElement, UsageBadgeProps>(
  ({ icon, planName, usage, limit, tooltipContent, className }, ref) => {
    // Calculate the percentage of usage for the progress bar
    const usagePercentage = limit && limit > 0 ? Math.min((usage / limit) * 100, 100) : 0;

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              className={cn(
                "group relative inline-flex cursor-default items-center gap-2.5 overflow-hidden rounded-full border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-semibold text-[#5D2A42] shadow-none transition-all hover:border-[#FB6376]/30",
                className
              )}
            >
              {/* Icon */}
              {icon && <div className="z-10 flex items-center justify-center text-[#FB6376]">{icon}</div>}

              {/* Text Content */}
              <div className="z-10 flex items-center gap-1.5">
                <span>{planName}</span>
                <span className="opacity-30 font-normal">•</span>
                <span className="opacity-70 font-medium">
                  {limit === null || limit <= 0
                    ? "Unlimited"
                    : `${Math.max(0, limit - usage)} capsules left`}
                </span>
              </div>
              
              {/* Progress Bar Fill - Flat Fora-themed Coral Pink tint, no gradients, no glows */}
              {limit !== null && limit > 0 && (
                <div
                  className="absolute inset-y-0 left-0 z-0 h-full bg-[#FB6376]/10 transition-all duration-500 ease-out"
                  style={{ width: `${usagePercentage}%` }}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-center border border-[#E8E8E8] bg-white text-[#5D2A42] shadow-none rounded-xl px-3 py-2">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

UsageBadge.displayName = "UsageBadge";

export { UsageBadge };
