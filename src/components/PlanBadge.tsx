"use client";

import { Crown, Sparkles, User, Database, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

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
  const { t } = useTranslation();
  const isUnlimited = capsuleLimit === null;
  const usagePercentage = !isUnlimited ? Math.min((usedCapsules / capsuleLimit!) * 100, 100) : 0;
  
  const PLAN_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    free: { icon: User, color: "#999999", label: "Arki" },
    starter: { icon: Sparkles, color: "#FB6376", label: "Kyklos" },
    pro: { icon: Crown, color: "#FFDCCC", label: "Aion" },
  };

  const config = PLAN_CONFIG[tier.toLowerCase()] ?? PLAN_CONFIG.free;
  const PlanIcon = config.icon;

  return (
    <div
      className={cn(
        "relative flex items-center bg-[#0D0D0D] border border-[#1A1A1A] rounded-full h-12 pl-1 pr-6 gap-3 group cursor-default transition-all duration-300 hover:border-[#FB6376]/40 shadow-sm",
        className
      )}
    >
      {/* Icon Circle */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#252525] border border-[#333] shrink-0">
        <PlanIcon 
          className="w-4 h-4 transition-transform duration-500 group-hover:rotate-[360deg]" 
          style={{ color: config.color }} 
        />
      </div>

      {/* Label & Tier */}
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.1em] leading-none mb-1">
          {tier} {t('planBadge.active')}
        </span>
        <span className="text-sm font-bold text-white leading-none">
          {config.label}
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-[#333] mx-1" />

      {/* Usage HUD */}
      <div className="flex flex-col min-w-[60px]">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            {t('planBadge.storage')}
          </span>
          <span className="text-[10px] font-mono font-bold text-[#FB6376]">
            {isUnlimited ? "∞" : `${usedCapsules}/${capsuleLimit}`}
          </span>
        </div>
        
        {!isUnlimited ? (
          <div className="h-1 w-full bg-[#252525] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FB6376] transition-all duration-1000 ease-in-out"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        ) : (
          <div className="h-1 w-full bg-[#252525] rounded-full overflow-hidden flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 bg-[#FFDCCC]/20 h-full rounded-full" />
            ))}
          </div>
        )}
      </div>

      {/* Action Indicator */}
      <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-[#FB6376] transition-colors" />

      {/* Subtle Glow (Border only) - Wait, user said NO glows. So I'll remove any glow effects. */}
    </div>
  );
}
