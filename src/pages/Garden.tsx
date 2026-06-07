import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flower } from "@/types/flower";
import { FLOWER_METADATA } from "@/lib/flower-data";

import CloudsAnimation from "@/components/clouds-animation";
import { MusicPlayer } from "@/components/music-player";
import { DirtPlot } from "@/components/dirt-plot";
import { PlantingDrawer } from "@/components/planting-drawer";
import { FlowerDetailModal } from "@/components/flower-detail-modal";
import { InfoModal } from "@/components/info-modal";
import Navigation from "@/components/Navigation";

/* ── Injected Styles ─────────────────────────────────────── */
const STYLE_ID = "garden-overhaul-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes garden-water-splash {
      0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      50%  { transform: translate(-50%, -50%) scale(1.8); opacity: 0.5; }
      100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    }
    @keyframes garden-water-drop {
      0%   { transform: translateY(-20px) scale(1); opacity: 1; }
      70%  { transform: translateY(8px) scale(0.8); opacity: 0.8; }
      100% { transform: translateY(12px) scale(0); opacity: 0; }
    }
    @keyframes garden-grow-pulse {
      0%   { transform: translate(-50%, -50%) scale(var(--grow-from)); }
      40%  { transform: translate(-50%, -50%) scale(calc(var(--grow-to) * 1.15)); }
      100% { transform: translate(-50%, -50%) scale(var(--grow-to)); }
    }
    @keyframes garden-sparkle {
      0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
      50%      { opacity: 1; transform: scale(1) rotate(180deg); }
    }
    .garden-water-btn {
      animation: garden-water-drop 1.2s ease-in-out infinite;
    }
    .garden-splash {
      animation: garden-water-splash 0.8s ease-out forwards;
      pointer-events: none;
    }
    .garden-sparkle-icon {
      animation: garden-sparkle 2s ease-in-out infinite;
    }
    .garden-drag-active { cursor: grabbing !important; }
  `;
  document.head.appendChild(s);
}

/* ── Types ──────────────────────────────────────────────── */
type UserState = "normal" | "viewing" | "planting";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/* ── Growth Helpers ────────────────────────────────────── */
const GROWTH_SCALES = [0.3, 0.55, 0.8, 1.0];
const GROWTH_OPACITY = [0.55, 0.7, 0.88, 1.0];
const GROWTH_LABELS = ["Seed", "Sprout", "Growing", "Full Bloom"];
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const WORLD_PADDING = 800;
const MIN_WORLD_WIDTH = 3000;

function loadGrowthData(): Record<string, number> {
  try {
    const raw = localStorage.getItem("garden-growth");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function loadCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem("garden-cooldowns");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/* ── Component ─────────────────────────────────────────── */
export default function GardenPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // State machine
  const [userState, setUserState] = useState<UserState>("normal");

  // Scroll state
  const [offset, setOffset] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [preZoomOffset, setPreZoomOffset] = useState(0);

  // Touch/drag scroll
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, offset: 0 });
  const hasDraggedRef = useRef(false);

  // Flower state
  const [allFlowers, setAllFlowers] = useState<Flower[]>([]);
  const [selectedFlower, setSelectedFlower] = useState<Flower | null>(null);
  const [plantingPosition, setPlantingPosition] = useState<{ x: number; y: number } | null>(null);
  const [newlyPlantedFlowerId, setNewlyPlantedFlowerId] = useState<string | null>(null);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sun animation
  const [sunImage, setSunImage] = useState("/sun.png");

  // Growth / watering
  const [growthLevels, setGrowthLevels] = useState<Record<string, number>>(loadGrowthData);
  const [waterCooldowns, setWaterCooldowns] = useState<Record<string, number>>(loadCooldowns);
  const [hoveredFlower, setHoveredFlower] = useState<string | null>(null);
  const [splashFlower, setSplashFlower] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // World width for infinite scroll
  const worldWidth = useMemo(() => {
    if (allFlowers.length === 0) return MIN_WORLD_WIDTH;
    const maxX = Math.max(...allFlowers.map((f) => f.x));
    return Math.max(maxX + WORLD_PADDING, MIN_WORLD_WIDTH);
  }, [allFlowers]);

  // ─────────────────────────────────────────────
  // Effects

  useEffect(() => {
    if (userState !== "normal") setScrollSpeed(0);
  }, [userState]);

  useEffect(() => {
    if (userState !== "normal" || scrollSpeed === 0) return;

    let raf: number;
    const loop = () => {
      setOffset((prev) => prev + scrollSpeed);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scrollSpeed, userState]);

  // Load flowers
  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE}/getFlowers`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setAllFlowers(data || []))
      .catch(() => setError("Failed to load garden"))
      .finally(() => setIsLoading(false));
  }, []);

  // Handle deep link
  useEffect(() => {
    if (isLoading) return;

    const parts = location.pathname.split("/");
    if (parts[1] === "flower" && parts[2]) {
      const flower = allFlowers.find((f) => f.slug === parts[2]);
      if (flower) handleFlowerClick(flower);
    }
  }, [isLoading, location.pathname]);

  // ─────────────────────────────────────────────
  // Infinite scroll: compute visible flowers with wrapping

  const visibleFlowers = useMemo(() => {
    if (userState !== "normal") return allFlowers;

    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    const buffer = 400;

    return allFlowers.filter((f) => {
      // Modular wrap: ((x + offset) % worldWidth + worldWidth) % worldWidth
      const screenX = ((f.x + offset) % worldWidth + worldWidth) % worldWidth;
      return screenX > -buffer && screenX < width + buffer;
    });
  }, [offset, allFlowers, userState, worldWidth]);

  // Get screen X for a flower (with infinite wrap)
  const getScreenX = useCallback(
    (flower: Flower) => {
      if (userState !== "normal") return flower.x + offset;
      return ((flower.x + offset) % worldWidth + worldWidth) % worldWidth;
    },
    [offset, userState, worldWidth]
  );

  // ─────────────────────────────────────────────
  // Touch / Drag scroll handlers

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (userState !== "normal") return;
      setIsDragging(true);
      hasDraggedRef.current = false;
      setScrollSpeed(0);
      dragStartRef.current = { x: e.clientX, offset };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [userState, offset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || userState !== "normal") return;
      const deltaX = e.clientX - dragStartRef.current.x;
      // Only count as drag if moved more than 5px
      if (Math.abs(deltaX) > 5) hasDraggedRef.current = true;
      setOffset(dragStartRef.current.offset + deltaX);
    },
    [isDragging, userState]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ─────────────────────────────────────────────
  // Handlers

  const handleFlowerClick = useCallback(
    (flower: Flower) => {
      setPreZoomOffset(offset);
      setSelectedFlower(flower);
      setUserState("viewing");
      navigate(`/flower/${flower.slug}`);
    },
    [offset]
  );

  const handleExitViewing = useCallback(() => {
    setOffset(preZoomOffset);
    setSelectedFlower(null);
    setUserState("normal");
    navigate("/garden");
  }, [preZoomOffset]);

  const handlePlantButton = useCallback(() => {
    if (userState !== "normal") return;

    setPreZoomOffset(offset);

    // Generate a random planting position in the current viewport area
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const gardenH = vh * 0.65;
    const wrappedOffset = ((offset % worldWidth) + worldWidth) % worldWidth;
    const x = Math.random() * vw * 0.6 + vw * 0.2 - wrappedOffset;
    const y = gardenH * 0.3 + Math.random() * gardenH * 0.4;

    setPlantingPosition({ x, y });
    setUserState("planting");
  }, [userState, offset, worldWidth]);

  const handleExitPlanting = useCallback(() => {
    setOffset(preZoomOffset);
    setPlantingPosition(null);
    setUserState("normal");
  }, [preZoomOffset]);

  const handlePlantSuccess = useCallback(
    (flower: Flower) => {
      setAllFlowers((prev) => [...prev, flower]);
      setNewlyPlantedFlowerId(flower.id);

      // New flowers start at seed stage (0)
      const newLevels = { ...growthLevels, [flower.id]: 0 };
      setGrowthLevels(newLevels);
      localStorage.setItem("garden-growth", JSON.stringify(newLevels));

      setTimeout(() => setNewlyPlantedFlowerId(null), 12500);

      handleExitPlanting();
    },
    [handleExitPlanting, growthLevels]
  );

  // ─────────────────────────────────────────────
  // Watering

  const handleWater = useCallback(
    (flowerId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      const now = Date.now();
      const lastWatered = waterCooldowns[flowerId] || 0;

      if (now - lastWatered < COOLDOWN_MS) {
        const minsLeft = Math.ceil((COOLDOWN_MS - (now - lastWatered)) / 60000);
        return; // silently block — could add a toast here
      }

      const currentLevel = growthLevels[flowerId] ?? 3;
      if (currentLevel >= 3) return;

      // Play splash
      setSplashFlower(flowerId);
      setTimeout(() => setSplashFlower(null), 900);

      // Grow
      const newLevels = { ...growthLevels, [flowerId]: currentLevel + 1 };
      const newCooldowns = { ...waterCooldowns, [flowerId]: now };

      setGrowthLevels(newLevels);
      setWaterCooldowns(newCooldowns);
      localStorage.setItem("garden-growth", JSON.stringify(newLevels));
      localStorage.setItem("garden-cooldowns", JSON.stringify(newCooldowns));
    },
    [growthLevels, waterCooldowns]
  );

  const canWater = useCallback(
    (flowerId: string) => {
      const level = growthLevels[flowerId] ?? 3;
      if (level >= 3) return false;
      const lastWatered = waterCooldowns[flowerId] || 0;
      return Date.now() - lastWatered >= COOLDOWN_MS;
    },
    [growthLevels, waterCooldowns]
  );

  // Sun blink
  const blinkSun = () => {
    setSunImage("/sun_blink.png");
    setTimeout(() => setSunImage("/sun.png"), 200);
  };

  // ─────────────────────────────────────────────
  // Render

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-blue-50">
        <img
          src="/special_flower.png"
          alt="Loading"
          className="w-[150px] h-[150px] animate-spin"
        />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 overflow-hidden ${isDragging ? "garden-drag-active" : ""}`}>
      {/* Background */}
      <Navigation />
      <img
        src="/background.png"
        alt="Garden"
        className="absolute inset-0 w-full h-full object-cover object-top"
        draggable={false}
      />

      <CloudsAnimation gardenOffset={offset} />

      {/* Sun */}
      <div
        className="absolute top-8 left-16 z-10 cursor-pointer"
        onMouseEnter={blinkSun}
        onClick={blinkSun}
      >
        <img src={sunImage} alt="Sun" width={200} draggable={false} />
      </div>

      <MusicPlayer />

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 px-4 py-2 rounded z-30">
          {error}
        </div>
      )}

      {/* Scroll edge zones (hover to auto-scroll) */}
      {userState === "normal" && !isDragging && (
        <>
          <div
            className="absolute left-0 top-0 w-16 h-full z-20"
            onMouseEnter={() => setScrollSpeed(4)}
            onMouseLeave={() => setScrollSpeed(0)}
          />
          <div
            className="absolute right-0 top-0 w-16 h-full z-20"
            onMouseEnter={() => setScrollSpeed(-4)}
            onMouseLeave={() => setScrollSpeed(0)}
          />
        </>
      )}

      {/* Garden */}
      <div
        className="absolute bottom-0 w-full h-[65vh]"
        style={{ cursor: userState === "normal" ? (isDragging ? "grabbing" : "grab") : undefined }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="relative h-full"
        >
          {plantingPosition && userState === "planting" && (
            <DirtPlot
              x={plantingPosition.x + preZoomOffset}
              y={plantingPosition.y}
              visible
            />
          )}

          {visibleFlowers.map((flower) => {
            const isSelected = selectedFlower?.id === flower.id;
            const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
            const vh = typeof window !== "undefined" ? window.innerHeight : 800;
            const screenX = getScreenX(flower);

            const growthLevel = growthLevels[flower.id] ?? 3;
            const growthScale = GROWTH_SCALES[growthLevel];
            const growthOpacity = GROWTH_OPACITY[growthLevel];
            const isMaxed = growthLevel >= 3;
            const isHovered = hoveredFlower === flower.id && userState === "normal";
            const isSplashing = splashFlower === flower.id;

            const style =
              userState === "viewing" && isSelected
                ? {
                    left: vw / 2,
                    top: vh * 0.15,
                    transform: "translate(-50%, -50%) scale(3)",
                    zIndex: 50,
                  }
                : {
                    left: screenX,
                    top: flower.y,
                    transform: `translate(-50%, -50%) scale(${growthScale})`,
                    opacity: growthOpacity,
                    zIndex: 10,
                  };

            return (
              <div
                key={flower.id}
                className="absolute transition-all duration-700"
                style={style}
                onMouseEnter={() => userState === "normal" && setHoveredFlower(flower.id)}
                onMouseLeave={() => setHoveredFlower(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging) handleFlowerClick(flower);
                }}
              >
                {/* Water button */}
                {isHovered && !isMaxed && canWater(flower.id) && (
                  <button
                    className="garden-water-btn absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-blue-400/90 hover:bg-blue-500 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border-2 border-white/40"
                    onClick={(e) => handleWater(flower.id, e)}
                    title="Water this flower"
                  >
                    💧
                  </button>
                )}

                {/* Max bloom sparkle */}
                {isHovered && isMaxed && (
                  <div className="garden-sparkle-icon absolute -top-8 left-1/2 -translate-x-1/2 z-50 text-xl pointer-events-none">
                    ✨
                  </div>
                )}

                {/* Splash effect */}
                {isSplashing && (
                  <div
                    className="garden-splash absolute left-1/2 bottom-0 w-20 h-20 rounded-full bg-blue-300/40 z-40"
                  />
                )}

                {/* Growth stage indicator (only for non-maxed flowers on hover) */}
                {isHovered && !isMaxed && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 pointer-events-none">
                    {[0, 1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          lvl <= growthLevel
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <img
                  src={FLOWER_METADATA[flower.flower].image}
                  alt={flower.title}
                  width={
                    flower.flower === "blue-forget-me-not" ||
                    flower.flower === "white-rose"
                      ? 115
                      : 100
                  }
                  draggable={false}
                  className={`relative z-[1] transition-all duration-700 ease-in-out
                    ${
                      userState === "normal"
                        ? "animate-sway hover:scale-110 flower-hover-glow"
                        : ""
                    }
                    ${
                      newlyPlantedFlowerId === flower.id
                        ? "animate-new-flower"
                        : isSelected && userState === "viewing"
                        ? "animate-viewing-flower"
                        : ""
                    }
                  `}
                  style={{
                    animationDelay:
                      userState === "normal"
                        ? `${(flower.x % 20) * 0.1}s`
                        : "0s",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <PlantingDrawer
        isOpen={userState === "planting"}
        onClose={handleExitPlanting}
        clickPosition={plantingPosition}
        currentOffset={offset}
        onPlantSuccess={handlePlantSuccess}
      />

      <FlowerDetailModal
        flower={selectedFlower}
        isOpen={userState === "viewing"}
        onClose={handleExitViewing}
        growthLevel={selectedFlower ? (growthLevels[selectedFlower.id] ?? 3) : 3}
        canWater={selectedFlower ? canWater(selectedFlower.id) : false}
        onWater={selectedFlower ? () => handleWater(selectedFlower.id) : undefined}
      />

      <InfoModal />

      {/* Floating Plant Button */}
      {userState === "normal" && (
        <button
          onClick={handlePlantButton}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 px-6 py-3.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-200"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4V16M4 10H16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Plant a Flower
        </button>
      )}
    </div>
  );
}
