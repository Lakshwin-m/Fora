export type FlowerType =
  | "red-tulip"
  | "white-rose"
  | "yellow-sunflower"
  | "pink-carnation"
  | "blue-forget-me-not"
  | "orange-lily"
  | "lavender"
  | "lotus"
  | "cherry-blossom"
  | "red-poppy"
  | "white-daisy"
  | "blue-iris"
  | "camellia"
  | "anemone";

export interface Flower {
  id: string;
  title: string;
  slug: string;
  message: string;
  author: string | null;
  flower: FlowerType;
  x: number;
  y: number;
  created_at: string;
  growthLevel?: number; // 0=seed, 1=sprout, 2=growing, 3=full bloom
}

export interface FlowerMetadata {
  name: string;
  description: string;
  tags: string[];
  image: string;
}
