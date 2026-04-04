import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

export default function DigiBouquetLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      <Navigation />
      <div
        className="flex-1 flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: "#f5f0e1" }}
      >
        {/* Decorative floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: `${40 + i * 20}px`,
                height: `${40 + i * 20}px`,
                backgroundColor: [
                  "#f8b4c8",
                  "#fdd835",
                  "#a8d8ea",
                  "#e85d75",
                  "#6db37e",
                  "#d4a0c7",
                ][i],
                left: `${10 + i * 15}%`,
                top: `${15 + ((i * 37) % 60)}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto">
          {/* Logo */}
          <h1
            className="text-7xl md:text-8xl mb-4 leading-tight"
            style={{
              fontFamily: "'Pinyon Script', cursive",
              color: "#1a1a1a",
            }}
          >
            Digibouquet
          </h1>

          {/* Tagline */}
          <p
            className="text-sm md:text-base tracking-[0.3em] uppercase mb-12"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#1a1a1a",
              opacity: 0.7,
            }}
          >
            beautiful flowers delivered digitally
          </p>

          {/* Decorative line */}
          <div className="w-24 h-px bg-black/20 mx-auto mb-12" />

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={() => navigate("/digibouquet/picker")}
              className="w-64 py-3.5 px-8 text-white text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                backgroundColor: "#1a1a1a",
              }}
            >
              Build a Bouquet
            </button>

            <button
              onClick={() => navigate("/digibouquet/picker?mode=mono")}
              className="w-64 py-3.5 px-8 text-xs tracking-[0.25em] uppercase border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: "#1a1a1a",
                borderColor: "#1a1a1a",
                backgroundColor: "transparent",
              }}
            >
              Build in B&W
            </button>

            <button
              onClick={() => navigate("/digibouquet/gallery")}
              className="w-64 py-3.5 px-8 text-xs tracking-[0.25em] uppercase border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: "#1a1a1a",
                borderColor: "#1a1a1a",
                backgroundColor: "transparent",
              }}
            >
              View Garden
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-6 text-xs tracking-[0.15em] uppercase opacity-40"
          style={{
            fontFamily: "'Space Mono', monospace",
            color: "#1a1a1a",
          }}
        >
          made with love · forá
        </div>
      </div>
    </div>
  );
}
