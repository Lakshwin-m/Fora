import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  className?: string;
}

const VerifiedBadge = ({ className = "w-5 h-5" }: VerifiedBadgeProps) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      title="Verified Developer"
    >
      <BadgeCheck className="w-full h-full text-[#FB6376] fill-[#FFDCCC]/20 drop-shadow-sm" />
    </div>
  );
};

export default VerifiedBadge;
