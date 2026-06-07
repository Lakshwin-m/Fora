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
                "group relative inline-flex cursor-default items-center gap-3 overflow-hidden rounded-full border border-[#E8E8E8] bg-white px-5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-[#D0D0D0] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
                className
              )}
            >
              {/* Progress Bar Fill - Thin elegant line at the bottom instead of full background muddying */}
              {limit !== null && limit > 0 && (
                <div
                  className="absolute bottom-0 left-0 z-0 h-[3px] bg-[#FB6376] transition-all duration-700 ease-out"
                  style={{ width: `${usagePercentage}%` }}
                />
              )}

              {/* Icon */}
              {icon && (
                <div className="z-10 flex items-center justify-center text-[#1A1A1A] bg-[#F8F8F8] p-1.5 rounded-full border border-[#E8E8E8]">
                  {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
                </div>
              )}

              {/* Text Content */}
              <div className="z-10 flex items-center gap-2.5 pb-[1px]">
                <span className="text-[#1A1A1A] font-extrabold text-[13px] tracking-wide uppercase">
                  {planName}
                </span>
                <span className="text-[#E8E8E8] font-light">|</span>
                <span className="text-[#666] font-bold text-[13px] tracking-tight">
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
