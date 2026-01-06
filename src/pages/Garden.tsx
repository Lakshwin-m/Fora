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

type UserState = "normal" | "viewing" | "planting";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function GardenPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // ─────────────────────────────────────────────
  // State machine
  const [userState, setUserState] = useState<UserState>("normal");

  // Scroll state
  const [offset, setOffset] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [preZoomOffset, setPreZoomOffset] = useState(0);

  // Flower state
  const [allFlowers, setAllFlowers] = useState<Flower[]>([]);
  const [selectedFlower, setSelectedFlower] = useState<Flower | null>(null);
  const [plantingPosition, setPlantingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [newlyPlantedFlowerId, setNewlyPlantedFlowerId] = useState<
    string | null
  >(null);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sun animation
  const [sunImage, setSunImage] = useState("/sun.png");
  const sunHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sunBlinkIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  // Derived state

  const visibleFlowers = useMemo(() => {
    if (userState !== "normal") return allFlowers;

    const width = window.innerWidth;
    const buffer = 300;

    return allFlowers.filter((f) => {
      const x = f.x + offset;
      return x > -buffer && x < width + buffer;
    });
  }, [offset, allFlowers, userState]);

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
    navigate("/");
  }, [preZoomOffset]);

  const handleGrassClick = useCallback(
    (e: React.MouseEvent) => {
      if (userState !== "normal") return;

      setPreZoomOffset(offset);

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - offset;
      const y = e.clientY - rect.top;

      setPlantingPosition({ x, y });
      setUserState("planting");
    },
    [userState, offset]
  );

  const handleExitPlanting = useCallback(() => {
    setOffset(preZoomOffset);
    setPlantingPosition(null);
    setUserState("normal");
  }, [preZoomOffset]);

  const handlePlantSuccess = useCallback(
    (flower: Flower) => {
      setAllFlowers((prev) => [...prev, flower]);
      setNewlyPlantedFlowerId(flower.id);

      setTimeout(() => setNewlyPlantedFlowerId(null), 12500);

      handleExitPlanting();
    },
    [handleExitPlanting]
  );

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
    <div className="fixed inset-0 overflow-hidden">
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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Garden */}
      <div className="absolute bottom-0 w-full h-[65vh]">
        <div
          className="relative h-full cursor-shovel"
          onClick={handleGrassClick}
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
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            const style =
              userState === "viewing" && isSelected
                ? {
                    left: vw / 2,
                    top: vh * 0.15,
                    transform: "translate(-50%, -50%) scale(3)",
                    zIndex: 50,
                  }
                : {
                    left: flower.x + offset,
                    top: flower.y,
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                  };

            return (
              <div
                key={flower.id}
                className="absolute transition-all duration-700"
                style={style}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlowerClick(flower);
                }}
              >
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
      />

      <InfoModal />
    </div>
  );
}
