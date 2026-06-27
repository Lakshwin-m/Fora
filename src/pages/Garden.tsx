import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flower } from "@/types/flower";
import { FLOWER_METADATA } from "@/lib/flower-data";


import { MusicPlayer } from "@/components/music-player";
import { DirtPlot } from "@/components/dirt-plot";
import { PlantingDrawer } from "@/components/planting-drawer";
import { FlowerDetailModal } from "@/components/flower-detail-modal";
import { InfoModal } from "@/components/info-modal";
import Navigation from "@/components/Navigation";
import { useTranslation } from "@/contexts/LanguageContext";

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
    @keyframes garden-cloud-drift {
      0% { left: -20%; }
      100% { left: 110%; }
    }
    .garden-cloud {
      animation: garden-cloud-drift linear infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ── Types ──────────────────────────────────────────────── */
type UserState = "normal" | "viewing" | "planting";
type ActiveTool = "shovel" | "seeds" | "watercan" | null;

interface DugHole {
  id: string;
  x: number;
  y: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const GROWTH_DELAY_MS = 5000; // 5 seconds before flower appears
const ZONE_WIDTH = 1200;
const VIRTUAL_WIDTH = 1920;
const VIRTUAL_HEIGHT = 1080;

/* ── plantedAt helpers (enforce 5s delay even on refresh) ── */
function loadPlantedAt(): Record<string, number> {
  try {
    const raw = localStorage.getItem("garden-plantedAt");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePlantedAt(data: Record<string, number>) {
  localStorage.setItem("garden-plantedAt", JSON.stringify(data));
}

/* ── Growth Helpers ────────────────────────────────────── */
const GROWTH_SCALES = [0.3, 0.55, 0.8, 1.0];
const GROWTH_OPACITY = [0.55, 0.7, 0.88, 1.0];

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

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
  const { t } = useTranslation();

  // State machine
  const [userState, setUserState] = useState<UserState>("normal");
  const [currentZone, setCurrentZone] = useState(0);

  // Mobile drag state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, dragOffset: 0 });
  const hasDraggedRef = useRef(false);

  // Reset drag when switching zones
  useEffect(() => setDragOffset(0), [currentZone]);

  // Flower state
  const [allFlowers, setAllFlowers] = useState<Flower[]>([]);
  const [selectedFlower, setSelectedFlower] = useState<Flower | null>(null);
  const [plantingPosition, setPlantingPosition] = useState<{ x: number; y: number } | null>(null);
  const [newlyPlantedFlowerId, setNewlyPlantedFlowerId] = useState<string | null>(null);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Growth / watering
  const [growthLevels, setGrowthLevels] = useState<Record<string, number>>(loadGrowthData);
  const [waterCooldowns, setWaterCooldowns] = useState<Record<string, number>>(loadCooldowns);
  const [hoveredFlower, setHoveredFlower] = useState<string | null>(null);
  const [splashFlower, setSplashFlower] = useState<string | null>(null);

  // Scaled coordinate space
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const scaleX = window.innerWidth / VIRTUAL_WIDTH;
        const scaleY = window.innerHeight / VIRTUAL_HEIGHT;
        setScale(Math.max(scaleX, scaleY)); // COVER behavior
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Farm tools
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [dugHoles, setDugHoles] = useState<DugHole[]>([]);
  const [hiddenFlowerIds, setHiddenFlowerIds] = useState<Set<string>>(new Set());
  const [plantedAtMap, setPlantedAtMap] = useState<Record<string, number>>(loadPlantedAt);

  // ─────────────────────────────────────────────
  // Zone calculation
  const maxZone = useMemo(() => {
    if (allFlowers.length === 0) return 0;
    const maxX = Math.max(...allFlowers.map((f) => f.x));
    return Math.floor(maxX / ZONE_WIDTH) + 1;
  }, [allFlowers]);

  // ─────────────────────────────────────────────
  // Effects

  // Load flowers (with 5-second reveal delay for recently planted)
  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE}/getFlowers`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Flower[]) => {
        const flowers = data || [];
        setAllFlowers(flowers);

        // Check plantedAt — hide flowers that haven't aged 5s yet
        const pAt = loadPlantedAt();
        const now = Date.now();
        const newHidden = new Set<string>();

        for (const f of flowers) {
          const ts = pAt[f.id];
          if (ts && now - ts < GROWTH_DELAY_MS) {
            newHidden.add(f.id);
            // Reveal after remaining time
            const remaining = GROWTH_DELAY_MS - (now - ts);
            setTimeout(() => {
              setHiddenFlowerIds((prev) => {
                const next = new Set(prev);
                next.delete(f.id);
                return next;
              });
            }, remaining);
          } else if (ts) {
            // Expired — clean it from storage
            delete pAt[f.id];
          }
        }
        setHiddenFlowerIds(newHidden);
        savePlantedAt(pAt);
      })
      .catch(() => setError("Failed to load garden"))
      .finally(() => setIsLoading(false));
  }, []);

  // Escape / right-click to deselect tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTool(null);
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (activeTool) {
        e.preventDefault();
        setActiveTool(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    const handleMouseMove = (e: MouseEvent) => {
      const cursorEl = document.getElementById("custom-tool-cursor");
      if (cursorEl) {
        cursorEl.style.left = `${e.clientX}px`;
        cursorEl.style.top = `${e.clientY}px`;
      }
    };
    if (activeTool === "watercan") {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [activeTool]);

  // Handle deep link
  useEffect(() => {
    if (isLoading) return;

    const parts = location.pathname.split("/");
    if (parts[1] === "flower" && parts[2]) {
      const flower = allFlowers.find((f) => f.slug === parts[2]);
      if (flower) handleFlowerClick(flower);
    }
  }, [isLoading, location.pathname, allFlowers]);

  // ─────────────────────────────────────────────
  // Touch / Drag scroll handlers (for devices < ZONE_WIDTH)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (userState !== "normal" || typeof window === "undefined") return;

      const visibleWidth = window.innerWidth / scale;
      if (visibleWidth >= VIRTUAL_WIDTH) return;

      setIsDragging(true);
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX, dragOffset };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [userState, dragOffset, scale]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || userState !== "normal" || typeof window === "undefined") return;
      const deltaX = (e.clientX - dragStartRef.current.x) / scale;
      if (Math.abs(deltaX * scale) > 5) hasDraggedRef.current = true;

      const dragMultiplier = 30; // Fast responsive drag
      const visibleWidth = window.innerWidth / scale;
      const maxDrag = Math.max(0, VIRTUAL_WIDTH - visibleWidth);

      const newOffset = Math.max(0, Math.min(dragStartRef.current.dragOffset - (deltaX * dragMultiplier), maxDrag));
      setDragOffset(newOffset);
    },
    [isDragging, userState, scale]
  );

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  // ─────────────────────────────────────────────
  // Handlers

  const handleFlowerClick = useCallback(
    (flower: Flower) => {
      setSelectedFlower(flower);
      setUserState("viewing");
      navigate(`/flower/${flower.slug}`);
    },
    [navigate]
  );

  const handleExitViewing = useCallback(() => {
    setSelectedFlower(null);
    setUserState("normal");
    navigate("/garden");
  }, [navigate]);

  // ── Tool equip handlers ──
  const handleShovelClick = useCallback(() => {
    setActiveTool((prev) => (prev === "shovel" ? null : "shovel"));
  }, []);

  const handleSeedBagClick = useCallback(() => {
    setActiveTool((prev) => (prev === "seeds" ? null : "seeds"));
  }, []);

  // ── Shovel: dig a hole on ground click ──
  const handleGardenGroundClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (userState !== "normal" || hasDraggedRef.current) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;

      // dragOffset is inherently included in rect.left, but we must add currentZone
      const absoluteX = clickX + currentZone * ZONE_WIDTH;

      if (activeTool === "shovel") {
        const id = `hole-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setDugHoles((prev) => [...prev, { id, x: absoluteX, y: clickY }]);
        return;
      }

      if (activeTool === "seeds") {
        // Check if clicking near an existing dug hole
        const threshold = 60; // px radius
        const matchedHole = dugHoles.find((h) => {
          const dx = absoluteX - h.x;
          const dy = clickY - h.y;
          return Math.sqrt(dx * dx + dy * dy) < threshold;
        });

        if (matchedHole) {
          setPlantingPosition({ x: matchedHole.x, y: matchedHole.y });
          setUserState("planting");
          // Remove the used hole
          setDugHoles((prev) => prev.filter((h) => h.id !== matchedHole.id));
        }
        return;
      }
    },
    [userState, activeTool, dugHoles, currentZone, scale]
  );

  const handleExitPlanting = useCallback(() => {
    setPlantingPosition(null);
    setUserState("normal");
    setActiveTool(null);
  }, []);

  const handlePlantSuccess = useCallback(
    (flower: Flower) => {
      // Save plantedAt timestamp
      const newPAt = { ...plantedAtMap, [flower.id]: Date.now() };
      setPlantedAtMap(newPAt);
      savePlantedAt(newPAt);

      // Hide the flower for 5 seconds
      setHiddenFlowerIds((prev) => new Set(prev).add(flower.id));

      // Add flower to state (but hidden)
      setAllFlowers((prev) => [...prev, flower]);

      // New flowers start at seed stage (0)
      const newLevels = { ...growthLevels, [flower.id]: 0 };
      setGrowthLevels(newLevels);
      localStorage.setItem("garden-growth", JSON.stringify(newLevels));

      // Reveal after 5 seconds
      setTimeout(() => {
        setHiddenFlowerIds((prev) => {
          const next = new Set(prev);
          next.delete(flower.id);
          return next;
        });
        setNewlyPlantedFlowerId(flower.id);
        setTimeout(() => setNewlyPlantedFlowerId(null), 12500);

        // Clean up plantedAt entry
        setPlantedAtMap((prev) => {
          const updated = { ...prev };
          delete updated[flower.id];
          savePlantedAt(updated);
          return updated;
        });
      }, GROWTH_DELAY_MS);

      handleExitPlanting();
    },
    [handleExitPlanting, growthLevels, plantedAtMap]
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
      return level < 3;
    },
    [growthLevels]
  );

  // Seed bag hover swap
  const [seedHovered, setSeedHovered] = useState(false);
  const seedImage = activeTool === "seeds" ? "/seedout.png" : seedHovered ? "/seedout.png" : "/seed.png";

  // Shovel hover swap
  const [shovelHovered, setShovelHovered] = useState(false);
  const shovelImage = activeTool === "shovel" ? "/shovelout.png" : shovelHovered ? "/shovelout.png" : "/shovel.png";

  // Watercan hover swap
  const [watercanHovered, setWatercanHovered] = useState(false);
  const watercanImage = activeTool === "watercan" ? "/watercanout.png" : watercanHovered ? "/watercanout.png" : "/watercan.png";

  // ─────────────────────────────────────────────
  // Render

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-blue-50">
        <img
          src="/special_flower.png"
          alt={t('garden.loading')}
          className="w-[150px] h-[150px] animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-sky-200 select-none">
      <Navigation />


      {/* Active tool indicator */}
      {activeTool && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/70 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 pointer-events-none">
          <img src={activeTool === "shovel" ? "/shovel.png" : activeTool === "watercan" ? "/watercan.png" : "/seed.png"} alt="" className="w-5 h-5 object-contain" />
          {activeTool === "shovel" ? "Click on the ground to dig" : activeTool === "watercan" ? "Click on a thirsty plant to water it" : "Click on a dug hole to plant"}
        </div>
      )}

      {/* Custom Tool Cursor */}
      {activeTool === "watercan" && (
        <div
          id="custom-tool-cursor"
          className={`fixed pointer-events-none z-[100] transition-transform duration-100 ${splashFlower ? "-rotate-12 scale-110" : "rotate-0 scale-100"}`}
          style={{ width: "96px", height: "96px", transformOrigin: "bottom right", marginLeft: "-48px", marginTop: "-48px" }}
        >
          <img src={splashFlower ? "/watercanw.png" : "/watercan.png"} alt="Cursor" className="w-full h-full object-contain drop-shadow-xl" />
        </div>
      )}

      {/* Scaled Virtual World */}
      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: VIRTUAL_WIDTH,
          height: VIRTUAL_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`
        }}
      >
        {/* Background Layer (translates with drag on mobile, but NOT with zones) */}
        <div
          className="absolute inset-0 transition-transform duration-700 pointer-events-none"
          style={{ transform: `translateX(-${dragOffset}px)` }}
        >
          <img
            src="/bgn.png"
            alt="Garden"
            className="absolute inset-0 w-[1920px] h-[1080px] object-cover"
            style={{ objectPosition: "center 60%" }}
            draggable={false}
          />

          {/* Custom Clouds using cloud.png */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img src="/cloud.png" className="absolute top-[8%] w-[250px] opacity-80 garden-cloud" style={{ animationDuration: '45s', animationDelay: '0s' }} alt="cloud" />
            <img src="/cloud.png" className="absolute top-[22%] w-[180px] opacity-60 garden-cloud" style={{ animationDuration: '65s', animationDelay: '-20s' }} alt="cloud" />
            <img src="/cloud.png" className="absolute top-[5%] w-[350px] opacity-90 garden-cloud" style={{ animationDuration: '85s', animationDelay: '-40s' }} alt="cloud" />
            <img src="/cloud.png" className="absolute top-[15%] w-[200px] opacity-70 garden-cloud" style={{ animationDuration: '55s', animationDelay: '-10s' }} alt="cloud" />
          </div>

          {/* Seed Bag */}
          <div
            className={`absolute z-[5] cursor-pointer transition-transform duration-150 pointer-events-auto ${activeTool === "seeds" ? "scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" : ""}`}
            style={{ left: "75%", top: "31%", width: "10%", height: "24%" }}
            onMouseEnter={() => setSeedHovered(true)}
            onMouseLeave={() => setSeedHovered(false)}
            onClick={handleSeedBagClick}
          >
            <img src={seedImage} alt="Seed Bag" className="w-full h-full object-contain" draggable={false} />
          </div>

          {/* Shovel */}
          <div
            className={`absolute z-[5] cursor-pointer transition-transform duration-150 pointer-events-auto ${activeTool === "shovel" ? "scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" : ""}`}
            style={{ left: "55%", top: "16%", width: "9%", height: "40%" }}
            onMouseEnter={() => setShovelHovered(true)}
            onMouseLeave={() => setShovelHovered(false)}
            onClick={handleShovelClick}
          >
            <img src={shovelImage} alt="Shovel" className="w-full h-full object-contain" draggable={false} />
          </div>

          {/* Watercan */}
          <div
            className={`absolute z-[5] cursor-pointer transition-transform duration-150 pointer-events-auto ${activeTool === "watercan" ? "scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" : ""}`}
            style={{ left: "48%", top: "24%", width: "8%", height: "25%" }}
            onMouseEnter={() => setWatercanHovered(true)}
            onMouseLeave={() => setWatercanHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTool(prev => prev === "watercan" ? null : "watercan");
            }}
          >
            <img src={watercanImage} alt="Watering Can" className="w-full h-full object-contain" draggable={false} />
          </div>

          {/* Garden Layer (flowers & holes) - Translates with zones */}
          <div
            className={`absolute bottom-[8%] w-full h-[50%] pointer-events-auto ${isDragging ? "garden-drag-active" : ""}`}
            style={{
              cursor: activeTool === "shovel"
                ? "url(/shovel-cursor.png) 8 24, crosshair"
                : activeTool === "seeds"
                  ? "crosshair"
                  : activeTool === "watercan"
                    ? "none"
                    : typeof window !== "undefined" && window.innerWidth / scale < VIRTUAL_WIDTH
                      ? (isDragging ? "grabbing" : "grab")
                      : undefined,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleGardenGroundClick}
          >
            <div
              className="relative w-full h-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentZone * ZONE_WIDTH}px)` }}
            >
              {/* Dug holes */}
              {dugHoles.map((hole) => (
                <DirtPlot
                  key={hole.id}
                  x={hole.x}
                  y={hole.y}
                  visible
                />
              ))}

              {plantingPosition && userState === "planting" && (
                <DirtPlot
                  x={plantingPosition.x}
                  y={plantingPosition.y}
                  visible
                />
              )}

              {allFlowers.filter((f) => !hiddenFlowerIds.has(f.id)).map((flower) => {
                const isSelected = selectedFlower?.id === flower.id;
                const screenX = flower.x;

                const growthLevel = growthLevels[flower.id] ?? 3;
                const growthScale = GROWTH_SCALES[growthLevel];
                const growthOpacity = GROWTH_OPACITY[growthLevel];
                const isMaxed = growthLevel >= 3;
                const isHovered = hoveredFlower === flower.id && userState === "normal";
                const isSplashing = splashFlower === flower.id;

                const style =
                  userState === "viewing" && isSelected
                    ? {
                      left: VIRTUAL_WIDTH / 2,
                      top: VIRTUAL_HEIGHT * 0.15,
                      transform: "translate(-50%, -50%) scale(3)",
                      zIndex: 50,
                    }
                    : {
                      left: screenX,
                      top: flower.y,
                      transform: `translate(-50%, -50%) scale(${growthScale})`,
                      opacity: growthOpacity,
                      zIndex: 10,
                      cursor: activeTool === "watercan"
                        ? "none"
                        : activeTool === "shovel" ? "url(/shovel-cursor.png) 8 24, crosshair"
                          : activeTool === "seeds" ? "crosshair"
                            : "pointer"
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
                      if (activeTool === "watercan") {
                        if (canWater(flower.id)) {
                          handleWater(flower.id, e);
                        }
                      } else if (!activeTool) {
                        handleFlowerClick(flower);
                      }
                    }}
                  >

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
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${lvl <= growthLevel
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
                        ${userState === "normal"
                          ? "animate-sway hover:scale-110 flower-hover-glow"
                          : ""
                        }
                        ${newlyPlantedFlowerId === flower.id
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
        </div>
      </div>

      {/* Overlay UI (Navigation arrows, Music Player, etc. - These stay outside the scaled world so they don't stretch) */}
      {userState === "normal" && (
        <>
          {currentZone > 0 && (
            <button
              onClick={() => setCurrentZone((p) => Math.max(0, p - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/50 hover:bg-white/80 rounded-full shadow-lg backdrop-blur transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {currentZone < maxZone && (
            <button
              onClick={() => setCurrentZone((p) => Math.min(maxZone, p + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/50 hover:bg-white/80 rounded-full shadow-lg backdrop-blur transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </>
      )}

      <MusicPlayer />

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 px-4 py-2 rounded z-30">
          {error}
        </div>
      )}


      <PlantingDrawer
        isOpen={userState === "planting"}
        onClose={handleExitPlanting}
        clickPosition={plantingPosition}
        currentOffset={0}
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

    </div>
  );
}
