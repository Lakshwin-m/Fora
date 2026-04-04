// DigiBouquet flower data definitions

export interface BouquetFlower {
  id: string;
  name: string;
  image: string;       // Path to color image in public/digibouquet/flowers/
  monoImage: string;   // Path to mono image (grayscale via CSS filter)
  size: number;        // Base size multiplier
}

export const BOUQUET_FLOWERS: BouquetFlower[] = [
  { id: "orchid",         name: "Orchid",         image: "/digibouquet/flowers/1.png",  monoImage: "/digibouquet/flowers/1.png",  size: 1.1 },
  { id: "tulip",          name: "Tulip",          image: "/digibouquet/flowers/2.png",  monoImage: "/digibouquet/flowers/2.png",  size: 1.0 },
  { id: "dahlia",         name: "Dahlia",         image: "/digibouquet/flowers/3.png",  monoImage: "/digibouquet/flowers/3.png",  size: 1.2 },
  { id: "anemone",        name: "Anemone",        image: "/digibouquet/flowers/4.png",  monoImage: "/digibouquet/flowers/4.png",  size: 1.0 },
  { id: "peony",          name: "Peony",          image: "/digibouquet/flowers/5.png",  monoImage: "/digibouquet/flowers/5.png",  size: 1.3 },
  { id: "zinnia",         name: "Zinnia",         image: "/digibouquet/flowers/6.png",  monoImage: "/digibouquet/flowers/6.png",  size: 1.0 },
  { id: "rose",           name: "Rose",           image: "/digibouquet/flowers/7.png",  monoImage: "/digibouquet/flowers/7.png",  size: 1.1 },
  { id: "sunflower",      name: "Sunflower",      image: "/digibouquet/flowers/8.png",  monoImage: "/digibouquet/flowers/8.png",  size: 1.4 },
  { id: "lily",           name: "Lily",           image: "/digibouquet/flowers/9.png",  monoImage: "/digibouquet/flowers/9.png",  size: 1.2 },
  { id: "daisy",          name: "Daisy",          image: "/digibouquet/flowers/10.png", monoImage: "/digibouquet/flowers/10.png", size: 0.9 },
  { id: "chrysanthemum",  name: "Chrysanthemum",  image: "/digibouquet/flowers/11.png", monoImage: "/digibouquet/flowers/11.png", size: 1.3 },
  { id: "carnation",      name: "Carnation",      image: "/digibouquet/flowers/12.png", monoImage: "/digibouquet/flowers/12.png", size: 1.0 },
  { id: "marigold",       name: "Marigold",       image: "/digibouquet/flowers/13.png", monoImage: "/digibouquet/flowers/13.png", size: 1.1 },
];

export interface GreeneryVariantData {
  id: string;
  name: string;
  image: string;
}

export const GREENERY_VARIANTS: GreeneryVariantData[] = [
  { id: "eucalyptus", name: "Eucalyptus", image: "/digibouquet/greenery/g1.png" },
  { id: "fern",       name: "Fern",       image: "/digibouquet/greenery/g2.png" },
  { id: "ivy",        name: "Ivy",        image: "/digibouquet/greenery/g3.png" },
  { id: "wildgrass",  name: "Wild Grass", image: "/digibouquet/greenery/g4.png" },
];

export type GreeneryVariant = string;

// Saved bouquet in the gallery
export interface SavedBouquet {
  id: string;
  flowers: Record<string, number>; // { orchid: 2, tulip: 1, ... }
  greenery: GreeneryVariant;
  arrangement: number; // seed for reproducible positions
  mode: "color" | "mono";
  date: string; // ISO date
}

// LocalStorage key
export const GALLERY_STORAGE_KEY = "digibouquet-gallery";

export function loadGallery(): SavedBouquet[] {
  try {
    const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return getSeededGallery();
}

export function saveToGallery(bouquet: SavedBouquet): void {
  const gallery = loadGallery();
  gallery.unshift(bouquet);
  localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
}

function getSeededGallery(): SavedBouquet[] {
  const seeds: SavedBouquet[] = [
    {
      id: "seed-1",
      flowers: { rose: 3, peony: 2, daisy: 2 },
      greenery: "eucalyptus",
      arrangement: 42,
      mode: "color",
      date: "2026-02-20T10:00:00Z",
    },
    {
      id: "seed-2",
      flowers: { sunflower: 2, marigold: 2, dahlia: 2, zinnia: 1 },
      greenery: "fern",
      arrangement: 77,
      mode: "color",
      date: "2026-02-18T14:30:00Z",
    },
    {
      id: "seed-3",
      flowers: { orchid: 2, lily: 2, anemone: 2 },
      greenery: "ivy",
      arrangement: 13,
      mode: "mono",
      date: "2026-02-15T09:15:00Z",
    },
  ];
  localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(seeds));
  return seeds;
}
