import { useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import {
  BOUQUET_FLOWERS,
  GREENERY_VARIANTS,
  type SavedBouquet,
  saveToGallery,
} from "@/lib/bouquet-data";
import {
  FlowerImage,
  GreeneryImage,
  arrangeBouquet,
} from "@/components/bouquet-renderer";

const MIN_FLOWERS = 6;
const MAX_FLOWERS = 10;

export default function DigiBouquetPicker() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMono = searchParams.get("mode") === "mono";

  // Step management
  const [step, setStep] = useState<"pick" | "customize">("pick");

  // Selection state: { orchid: 2, tulip: 1, ... }
  const [selected, setSelected] = useState<Record<string, number>>({});

  // Customization state
  const [arrangementSeed, setArrangementSeed] = useState(
    Math.floor(Math.random() * 10000)
  );
  const [greeneryIndex, setGreeneryIndex] = useState(0);

  const totalSelected = useMemo(
    () => Object.values(selected).reduce((a, b) => a + b, 0),
    [selected]
  );

  const canProceed = totalSelected >= MIN_FLOWERS && totalSelected <= MAX_FLOWERS;

  // Handlers
  const handleFlowerClick = useCallback(
    (flowerId: string) => {
      if (totalSelected >= MAX_FLOWERS && !selected[flowerId]) return;
      setSelected((prev) => ({
        ...prev,
        [flowerId]: (prev[flowerId] || 0) + 1,
      }));
    },
    [totalSelected, selected]
  );

  const handleTagClick = useCallback((flowerId: string) => {
    setSelected((prev) => {
      const newCount = (prev[flowerId] || 0) - 1;
      if (newCount <= 0) {
        const { [flowerId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [flowerId]: newCount };
    });
  }, []);

  const handleNext = () => {
    if (canProceed) setStep("customize");
  };

  const handleBack = () => {
    setStep("pick");
  };

  const handleNewArrangement = () => {
    setArrangementSeed(Math.floor(Math.random() * 10000));
  };

  const handleChangeGreenery = () => {
    setGreeneryIndex((i) => (i + 1) % GREENERY_VARIANTS.length);
  };

  const handleSaveToGarden = () => {
    const bouquet: SavedBouquet = {
      id: crypto.randomUUID(),
      flowers: { ...selected },
      greenery: GREENERY_VARIANTS[greeneryIndex].id,
      arrangement: arrangementSeed,
      mode: isMono ? "mono" : "color",
      date: new Date().toISOString(),
    };
    saveToGallery(bouquet);
    navigate("/digibouquet/gallery");
  };

  // Arrangement positions
  const positions = useMemo(
    () => arrangeBouquet(selected, arrangementSeed),
    [selected, arrangementSeed]
  );

  const currentGreenery = GREENERY_VARIANTS[greeneryIndex];

  // ─── STEP 1: FLOWER PICKER ─────────────────────
  if (step === "pick") {
    return (
      <div className="min-h-screen flex">
        <Navigation />
        <div
          className="flex-1 flex flex-col"
          style={{ backgroundColor: "#f5f0e1" }}
        >
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-4">
            <h1
              className="text-4xl md:text-5xl mb-2"
              style={{ fontFamily: "'Pinyon Script', cursive", color: "#1a1a1a" }}
            >
              Digibouquet
            </h1>
            <p
              className="text-xs tracking-[0.25em] uppercase"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: totalSelected < MIN_FLOWERS ? "#1a1a1a" : "#27ae60",
                opacity: 0.8,
              }}
            >
              pick {MIN_FLOWERS} to {MAX_FLOWERS} blooms
              {totalSelected > 0 && (
                <span className="ml-2 font-bold">({totalSelected} selected)</span>
              )}
            </p>
            {isMono && (
              <span
                className="inline-block mt-2 text-[10px] tracking-[0.2em] uppercase px-3 py-1 border"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  borderColor: "#1a1a1a",
                  color: "#1a1a1a",
                }}
              >
                B&W Mode
              </span>
            )}
          </div>

          {/* Flower Grid */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 pb-48">
            <div className="max-w-4xl mx-auto">
              {/* Top row: first 9 */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                {BOUQUET_FLOWERS.slice(0, 9).map((flower) => {
                  const count = selected[flower.id] || 0;
                  const isDisabled =
                    totalSelected >= MAX_FLOWERS && count === 0;
                  return (
                    <button
                      key={flower.id}
                      onClick={() => handleFlowerClick(flower.id)}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 group
                        ${count > 0
                          ? "border-[#1a1a1a] bg-white/80 shadow-md scale-[1.02]"
                          : "border-transparent bg-white/40 hover:bg-white/70 hover:border-[#1a1a1a]/20"
                        }
                        ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"}
                      `}
                    >
                      {/* Count badge */}
                      {count > 0 && (
                        <div
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10 animate-in zoom-in duration-200"
                          style={{ backgroundColor: "#e74c3c" }}
                        >
                          {count}
                        </div>
                      )}
                      <FlowerImage
                        flower={flower}
                        size={72}
                        mono={isMono}
                        className="transition-transform duration-300 group-hover:rotate-6"
                      />
                      <span
                        className="text-[10px] tracking-[0.15em] uppercase mt-2 text-center"
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          color: "#1a1a1a",
                        }}
                      >
                        {flower.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Bottom row: last 4, centered */}
              <div className="flex justify-center gap-4">
                {BOUQUET_FLOWERS.slice(9).map((flower) => {
                  const count = selected[flower.id] || 0;
                  const isDisabled =
                    totalSelected >= MAX_FLOWERS && count === 0;
                  return (
                    <button
                      key={flower.id}
                      onClick={() => handleFlowerClick(flower.id)}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 group w-[calc(25%-12px)] max-w-[160px]
                        ${count > 0
                          ? "border-[#1a1a1a] bg-white/80 shadow-md scale-[1.02]"
                          : "border-transparent bg-white/40 hover:bg-white/70 hover:border-[#1a1a1a]/20"
                        }
                        ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"}
                      `}
                    >
                      {count > 0 && (
                        <div
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10 animate-in zoom-in duration-200"
                          style={{ backgroundColor: "#e74c3c" }}
                        >
                          {count}
                        </div>
                      )}
                      <FlowerImage
                        flower={flower}
                        size={72}
                        mono={isMono}
                        className="transition-transform duration-300 group-hover:rotate-6"
                      />
                      <span
                        className="text-[10px] tracking-[0.15em] uppercase mt-2 text-center"
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          color: "#1a1a1a",
                        }}
                      >
                        {flower.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom bar: tags + next */}
          <div
            className="fixed bottom-0 left-0 right-0 md:left-[88px] border-t shadow-2xl z-30"
            style={{ backgroundColor: "#f5f0e1", borderColor: "#1a1a1a20" }}
          >
            {/* Selected tags */}
            {Object.keys(selected).length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
                <span
                  className="text-[9px] tracking-[0.15em] uppercase opacity-50 self-center mr-1"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Click to deselect:
                </span>
                {Object.entries(selected).map(([id, count]) => {
                  const flower = BOUQUET_FLOWERS.find((f) => f.id === id);
                  if (!flower) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTagClick(id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] tracking-[0.1em] uppercase border transition-all duration-200 hover:bg-red-50 hover:border-red-300 hover:scale-105 active:scale-95"
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        color: "#1a1a1a",
                        borderColor: "#1a1a1a40",
                      }}
                    >
                      {flower.name} ×{count}
                      <span className="text-red-400 ml-1 text-xs">✕</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Next button */}
            <div className="flex justify-between items-center px-4 py-3">
              <button
                onClick={() => navigate("/digibouquet")}
                className="text-[10px] tracking-[0.15em] uppercase opacity-60 hover:opacity-100 transition-opacity"
                style={{ fontFamily: "'Space Mono', monospace", color: "#1a1a1a" }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`px-10 py-3 text-xs tracking-[0.25em] uppercase transition-all duration-300
                  ${canProceed
                    ? "text-white hover:scale-105 hover:shadow-lg active:scale-95"
                    : "text-white/60 cursor-not-allowed"
                  }
                `}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  backgroundColor: canProceed ? "#1a1a1a" : "#1a1a1a60",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2: BOUQUET CUSTOMIZER ─────────────────
  return (
    <div className="min-h-screen flex">
      <Navigation />
      <div
        className="flex-1 flex flex-col items-center"
        style={{ backgroundColor: "#f5f0e1" }}
      >
        {/* Header */}
        <div className="text-center pt-8 pb-4">
          <h2
            className="text-xs tracking-[0.3em] uppercase mb-1"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#1a1a1a",
              opacity: 0.6,
            }}
          >
            Customize Your Bouquet
          </h2>
          <h1
            className="text-4xl md:text-5xl"
            style={{ fontFamily: "'Pinyon Script', cursive", color: "#1a1a1a" }}
          >
            Digibouquet
          </h1>
        </div>

        {/* Bouquet display */}
        <div className="flex-1 flex items-center justify-center w-full px-4 pb-32">
          <div
            className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-xl border"
            style={{
              backgroundColor: isMono ? "#e8e8e8" : "#faf5eb",
              borderColor: "#1a1a1a15",
            }}
          >
            {/* Greenery background */}
            <div className="absolute inset-0 flex items-end justify-center">
              <GreeneryImage
                imageSrc={currentGreenery.image}
                mono={isMono}
              />
            </div>

            {/* Flowers */}
            {positions.map((pos, i) => (
              <div
                key={`${pos.flower.id}-${i}`}
                className="absolute transition-all duration-700 ease-out"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: `translate(-50%, -50%) scale(${pos.scale})`,
                  zIndex: pos.zIndex,
                }}
              >
                <FlowerImage
                  flower={pos.flower}
                  size={60}
                  mono={isMono}
                  rotation={pos.rotation}
                />
              </div>
            ))}

            {/* Wrapper/ribbon at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16"
              style={{
                background: isMono
                  ? "linear-gradient(to top, #bbb, transparent)"
                  : "linear-gradient(to top, #d4a574, transparent)",
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div
          className="fixed bottom-0 left-0 right-0 md:left-[88px] border-t shadow-2xl z-30"
          style={{ backgroundColor: "#f5f0e1", borderColor: "#1a1a1a20" }}
        >
          <div className="flex flex-wrap justify-center gap-3 px-4 py-4 max-w-2xl mx-auto">
            <button
              onClick={handleBack}
              className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase border-2 transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: "#1a1a1a",
                borderColor: "#1a1a1a",
                backgroundColor: "transparent",
              }}
            >
              ← Back
            </button>

            <button
              onClick={handleNewArrangement}
              className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase border-2 transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: "#1a1a1a",
                borderColor: "#1a1a1a",
                backgroundColor: "transparent",
              }}
            >
              Try a New Arrangement
            </button>

            <button
              onClick={handleChangeGreenery}
              className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase border-2 transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                color: "#1a1a1a",
                borderColor: "#1a1a1a",
                backgroundColor: "transparent",
              }}
            >
              Change Greenery
            </button>

            <button
              onClick={handleSaveToGarden}
              className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              style={{
                fontFamily: "'Space Mono', monospace",
                backgroundColor: "#1a1a1a",
              }}
            >
              Save to Garden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
