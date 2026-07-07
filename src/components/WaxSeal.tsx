import React from "react";

interface WaxSealProps {
  name: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const WaxSeal: React.FC<WaxSealProps> = ({
  name,
  className = "",
  onClick,
  style,
}) => {
  // Get the first name or initials to fit elegantly in the circular stamp area
  const rawName = name || "Forá";
  const displayName = rawName.split(" ")[0].substring(0, 8);

  return (
    <div
      onClick={onClick}
      className={`w-16 h-16 rounded-full bg-[#FB6376] flex items-center justify-center border-4 border-double border-[#FFF9EC]/30 shadow-lg text-white font-serif text-[10px] font-extrabold select-none uppercase tracking-wider cursor-pointer active:scale-95 transition-transform ${className}`}
      style={{
        boxShadow: "inset 0 0 8px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.2)",
        borderRadius: "53% 47% 49% 51% / 46% 54% 46% 54%", // Organic wax seal stamp shape
        ...style,
      }}
    >
      {/* Inner ring border detailing */}
      <div className="border border-white/20 rounded-full w-full h-full flex items-center justify-center p-1">
        <span className="truncate max-w-full text-white text-[8px] sm:text-[9px] font-black tracking-widest text-center px-1">
          {displayName}
        </span>
      </div>
    </div>
  );
};

export default WaxSeal;
