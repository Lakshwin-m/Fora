import { FlowerType, FlowerMetadata } from "@/types/flower";

export const FLOWER_METADATA: Record<FlowerType, FlowerMetadata> = {
  "red-tulip": {
    name: "Red Tulip",
    description: "Chosen to express love and passion.",
    tags: ["Passionate", "Bold", "Romantic"],
    image: "/tulip.png",
  },
  "white-rose": {
    name: "White Rose",
    description: "A symbol of purity and remembrance.",
    tags: ["Pure", "Serene", "Timeless"],
    image: "/rose.png",
  },
  "yellow-sunflower": {
    name: "Sunflower",
    description: "Represents warmth, joy, and loyalty.",
    tags: ["Radiant", "Cheerful", "Loyal"],
    image: "/sunflower.png",
  },
  "pink-carnation": {
    name: "Carnation",
    description: "Given to show admiration and gratitude.",
    tags: ["Sweet", "Grateful", "Gentle"],
    image: "/carnation.png",
  },
  "blue-forget-me-not": {
    name: "Forget-Me-Not",
    description: "A promise of lasting memory and connection.",
    tags: ["Dreamy", "Eternal", "Remembered"],
    image: "/fmn.png",
  },
  "orange-lily": {
    name: "Orange Lily",
    description: "A symbol of confidence, pride, and wealth.",
    tags: ["Vibrant", "Confident", "Energetic"],
    image: "/lily.png",
  },

  lavender: {
    name: "Lavender",
    description: "Planted for calm, healing, and quiet peace.",
    tags: ["Peaceful", "Healing", "Soft"],
    image: "/lavender.png",
  },

  lotus: {
    name: "Lotus",
    description: "Represents strength, resilience, and rising above.",
    tags: ["Resilient", "Grounded", "Hopeful"],
    image: "/lotus.png",
  },

  "cherry-blossom": {
    name: "Cherry Blossom",
    description: "A reminder of beauty that is gentle and fleeting.",
    tags: ["Gentle", "Fragile", "Tender"],
    image: "/cherry_blossom.png",
  },

  "red-poppy": {
    name: "Poppy",
    description: "Planted in silence to honor loss and remembrance.",
    tags: ["Memory", "Respectful", "Still"],
    image: "/poppy.png",
  },

  "white-daisy": {
    name: "Daisy",
    description: "Symbolizes innocence, simplicity, and fresh beginnings.",
    tags: ["Pure", "Light", "Fresh"],
    image: "/daisy.png",
  },

  "blue-iris": {
    name: "Iris",
    description: "Represents trust, hope, and unspoken messages.",
    tags: ["Faith", "Connection", "Hopeful"],
    image: "/iris.png",
  },

  camellia: {
    name: "Camellia",
    description: "Given to express admiration without words.",
    tags: ["Graceful", "Reserved", "Elegant"],
    image: "/camellia.png",
  },

  anemone: {
    name: "Anemone",
    description: "A symbol of acceptance and letting go.",
    tags: ["Release", "Quiet", "Open"],
    image: "/anemone.png",
  },
};

// Helper to generate URL-friendly slug from title with UUID suffix
export function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .slice(0, 50); // Truncate to max 50 characters

  // Append short UUID to ensure uniqueness while keeping slugs pretty
  const uniqueId = crypto.randomUUID().split("-")[0]; // First 8 chars of UUID
  return `${baseSlug}-${uniqueId}`;
}
