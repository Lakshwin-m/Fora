import React from "react";
import { BouquetFlower, BOUQUET_FLOWERS } from "@/lib/bouquet-data";

// ─── Flower Image Component ──────────────────────────

interface FlowerImageProps {
  flower: BouquetFlower;
  size?: number;
  mono?: boolean;
  rotation?: number;
  className?: string;
}

export const FlowerImage: React.FC<FlowerImageProps> = ({
  flower,
  size = 80,
  mono = false,
  rotation = 0,
  className = "",
}) => {
  const src = mono ? flower.monoImage : flower.image;

  return (
    <img
      src={src}
      alt={flower.name}
      width={size}
      height={size}
      draggable={false}
      className={`object-contain ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${rotation}deg)`,
        filter: mono ? "grayscale(100%) contrast(1.1)" : "none",
      }}
    />
  );
};

// ─── Seeded Random ───────────────────────────────────

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Greenery Image Component ────────────────────────

interface GreeneryImageProps {
  imageSrc: string;
  mono?: boolean;
  className?: string;
}

export const GreeneryImage: React.FC<GreeneryImageProps> = ({
  imageSrc,
  mono = false,
  className = "",
}) => {
  return (
    <img
      src={imageSrc}
      alt="Greenery"
      draggable={false}
      className={`w-full h-auto object-contain ${className}`}
      style={{
        filter: mono ? "grayscale(100%) contrast(1.1)" : "none",
      }}
    />
  );
};

// ─── Bouquet Arrangement ─────────────────────────────

export interface FlowerPosition {
  flower: BouquetFlower;
  x: number;   // percentage 0-100
  y: number;   // percentage 0-100
  rotation: number;
  scale: number;
  zIndex: number;
}

export function arrangeBouquet(
  selectedFlowers: Record<string, number>,
  seed: number
): FlowerPosition[] {
  const rand = seededRandom(seed);
  const positions: FlowerPosition[] = [];

  // Expand selections: { rose: 2, tulip: 1 } → [rose, rose, tulip]
  const expanded: BouquetFlower[] = [];
  for (const [id, count] of Object.entries(selectedFlowers)) {
    const flower = BOUQUET_FLOWERS.find(f => f.id === id);
    if (flower) {
      for (let i = 0; i < count; i++) {
        expanded.push(flower);
      }
    }
  }

  // Arrange in a natural dome/cluster
  const total = expanded.length;
  const cx = 50;
  const cy = 45;

  expanded.forEach((flower, i) => {
    // Golden angle distribution for natural look
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = i * goldenAngle + rand() * 0.5;
    const dist = (Math.sqrt((i + 0.5) / total)) * 28 + rand() * 5;

    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist * 0.65 - (1 - Math.sqrt((i + 0.5) / total)) * 10;
    const rotation = (rand() - 0.5) * 40;
    const scale = 0.8 + rand() * 0.4;

    positions.push({
      flower,
      x: Math.max(15, Math.min(85, x)),
      y: Math.max(10, Math.min(75, y)),
      rotation,
      scale,
      zIndex: Math.round(y),
    });
  });

  // Sort by y for proper layering
  positions.sort((a, b) => a.zIndex - b.zIndex);

  return positions;
}
