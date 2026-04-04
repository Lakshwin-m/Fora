import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import {
  loadGallery,
  BOUQUET_FLOWERS,
  GREENERY_VARIANTS,
  type SavedBouquet,
} from "@/lib/bouquet-data";
import {
  FlowerImage,
  GreeneryImage,
  arrangeBouquet,
} from "@/components/bouquet-renderer";

function MiniFlowerBouquet({ bouquet }: { bouquet: SavedBouquet }) {
  const positions = useMemo(
    () => arrangeBouquet(bouquet.flowers, bouquet.arrangement),
    [bouquet]
  );
  const isMono = bouquet.mode === "mono";

  return (
    <div
      className="relative w-full aspect-square rounded-2xl overflow-hidden"
      style={{
        backgroundColor: isMono ? "#e8e8e8" : "#faf5eb",
      }}
    >
    <div className="absolute inset-0 flex items-end justify-center">
        <GreeneryImage
          imageSrc={GREENERY_VARIANTS.find(g => g.id === bouquet.greenery)?.image || GREENERY_VARIANTS[0].image}
          mono={isMono}
        />
      </div>
      {positions.map((pos, i) => (
        <div
          key={`${pos.flower.id}-${i}`}
          className="absolute"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) scale(${pos.scale * 0.65})`,
            zIndex: pos.zIndex,
          }}
        >
          <FlowerImage
            flower={pos.flower}
            size={40}
            mono={isMono}
            rotation={pos.rotation}
          />
        </div>
      ))}
      {/* Wrapper at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8"
        style={{
          background: isMono
            ? "linear-gradient(to top, #bbb, transparent)"
            : "linear-gradient(to top, #d4a574, transparent)",
        }}
      />
    </div>
  );
}

export default function DigiBouquetGallery() {
  const navigate = useNavigate();
  const gallery = useMemo(() => loadGallery(), []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFlowerSummary = (flowers: Record<string, number>) => {
    const total = Object.values(flowers).reduce((a, b) => a + b, 0);
    const types = Object.keys(flowers).length;
    return `${total} blooms · ${types} types`;
  };

  return (
    <div className="min-h-screen flex">
      <Navigation />
      <div
        className="flex-1 flex flex-col"
        style={{ backgroundColor: "#f5f0e1" }}
      >
        {/* Header */}
        <div className="text-center pt-8 pb-2 px-4">
          <h1
            className="text-4xl md:text-5xl mb-2"
            style={{ fontFamily: "'Pinyon Script', cursive", color: "#1a1a1a" }}
          >
            Our Garden
          </h1>
          <p
            className="text-xs tracking-[0.2em] uppercase opacity-60 mb-4"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#1a1a1a",
            }}
          >
            A collection of digital bouquets
          </p>
          <div className="w-16 h-px bg-black/20 mx-auto mb-6" />
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 px-4 md:px-8 lg:px-16 pb-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {gallery.length === 0 ? (
              <div className="text-center py-20">
                <p
                  className="text-sm tracking-[0.15em] uppercase opacity-50"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  No bouquets yet. Create your first!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {gallery.map((bouquet) => (
                  <div
                    key={bouquet.id}
                    className="group rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-pointer"
                    style={{
                      borderColor: "#1a1a1a10",
                      backgroundColor: "#ffffff60",
                    }}
                  >
                    <MiniFlowerBouquet bouquet={bouquet} />
                    <div className="px-3 py-2.5 text-center">
                      <p
                        className="text-[10px] tracking-[0.15em] uppercase opacity-60"
                        style={{ fontFamily: "'Space Mono', monospace", color: "#1a1a1a" }}
                      >
                        {formatDate(bouquet.date)}
                      </p>
                      <p
                        className="text-[9px] tracking-[0.1em] uppercase opacity-40 mt-0.5"
                        style={{ fontFamily: "'Space Mono', monospace", color: "#1a1a1a" }}
                      >
                        {getFlowerSummary(bouquet.flowers)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div
          className="sticky bottom-0 border-t py-4 px-4 flex justify-center gap-4"
          style={{
            backgroundColor: "#f5f0e1",
            borderColor: "#1a1a1a20",
          }}
        >
          <button
            onClick={() => navigate("/digibouquet")}
            className="px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase border-2 transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#1a1a1a",
              borderColor: "#1a1a1a",
              backgroundColor: "transparent",
            }}
          >
            ← Home
          </button>
          <button
            onClick={() => navigate("/digibouquet/picker")}
            className="px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
            style={{
              fontFamily: "'Space Mono', monospace",
              backgroundColor: "#1a1a1a",
            }}
          >
            Create Bouquet
          </button>
        </div>
      </div>
    </div>
  );
}
