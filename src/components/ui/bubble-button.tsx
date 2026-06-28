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
                "group relative inline-flex cursor-default items-center gap-3 overflow-hidden rounded-full border border-[#5D2A42]/10 bg-white/60 backdrop-blur-sm px-4 py-2 shadow-sm transition-all hover:border-[#5D2A42]/20 hover:bg-white/80",
                className
              )}
            >
              {/* Progress Bar Fill - Thin elegant line at the bottom instead of full background muddying */}
              {limit !== null && limit > 0 && (
                <div
                  className="absolute bottom-0 left-0 z-0 h-[2px] bg-[#5D2A42]/40 transition-all duration-700 ease-out"
                  style={{ width: `${usagePercentage}%` }}
                />
              )}

              {/* Icon */}
              {icon && (
                <div className="z-10 flex items-center justify-center text-[#5D2A42] bg-[#5D2A42]/5 p-1.5 rounded-full border border-[#5D2A42]/10">
                  {React.cloneElement(icon as React.ReactElement, { className: "w-3 h-3" })}
                </div>
              )}

              {/* Text Content */}
              <div className="z-10 flex items-center gap-2.5 pb-[1px]">
                <span className="text-[#5D2A42] font-semibold text-[10px] md:text-xs tracking-widest uppercase">
                  {planName}
                </span>
                <span className="text-[#5D2A42]/20 font-light">|</span>
                <span className="text-[#5D2A42]/80 font-medium text-[11px] md:text-xs tracking-wide">
                  {limit === null || limit <= 0
                    ? "Unlimited"
                    : `${Math.max(0, limit - usage)} Left`}
                </span>
              </div>
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
