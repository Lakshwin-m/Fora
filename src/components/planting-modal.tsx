import { useState } from "react";
import { Flower, FlowerType } from "@/types/flower";
import { FlowerSelector } from "./flower-selector";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
const API_BASE = import.meta.env.VITE_API_BASE_URL;
interface PlantingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clickPosition: { x: number; y: number } | null;
  currentOffset: number;
  onPlantSuccess: (flower: Flower) => void;
}

export function PlantingDrawer({
  isOpen,
  onClose,
  clickPosition,
  currentOffset,
  onPlantSuccess,
}: PlantingDrawerProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedFlower, setSelectedFlower] =
    useState<FlowerType>("yellow-sunflower");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!clickPosition) {
      toast.error("Invalid planting position");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/getFlowers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          author: author.trim() || null,
          x: clickPosition.x,
          y: clickPosition.y,
          flower: selectedFlower,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to plant flower");
      }

      const newFlower = await response.json();

      toast.success("Flower planted!", {
        description: "Your message has been added to the garden.",
      });

      onPlantSuccess(newFlower);

      // Reset form
      setTitle("");
      setMessage("");
      setAuthor("");
      setSelectedFlower("yellow-sunflower");
    } catch (error) {
      console.error("Error planting flower:", error);
      toast.error("Failed to plant flower", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setMessage("");
    setAuthor("");
    setSelectedFlower("yellow-sunflower");
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-[500px] sm:w-[650px] p-8 py-6 bg-yellow-50 overflow-y-auto"
      >
        <SheetHeader>
          <div className="flex flex-col gap-2 mb-2">
            <SheetTitle className="text-[#FB6376] text-2xl font-bold">Plant a Flower</SheetTitle>
            <SheetDescription className="text-gray-600">
              Share a positive message with the world. Spread peace and love.
            </SheetDescription>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-1">
          <div>
            <label htmlFor="title" className="block text-sm font-bold text-[#FB6376] mb-2">
              Title <span className="text-[#FB6376]">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your message a title"
              required
              maxLength={100}
              className="bg-white text-gray-900 placeholder:text-gray-400 border-[#FB6376]/20 focus-visible:ring-[#FB6376]"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-bold text-[#FB6376] mb-2">
              Message <span className="text-[#FB6376]">*</span>
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your positive thoughts..."
              required
              rows={4}
              maxLength={500}
              className="bg-white text-gray-900 placeholder:text-gray-400 border-[#FB6376]/20 focus-visible:ring-[#FB6376]"
            />
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-bold text-[#FB6376] mb-2">
              Your Name
            </label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Anonymous"
              maxLength={50}
              className="bg-white text-gray-900 placeholder:text-gray-400 border-[#FB6376]/20 focus-visible:ring-[#FB6376]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#FB6376] mb-2">
              Choose a Flower <span className="text-[#FB6376]">*</span>
            </label>
            <FlowerSelector
              selectedFlower={selectedFlower}
              onFlowerChange={setSelectedFlower}
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading || !title.trim() || !message.trim()}
              className="w-full text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor:
                  isLoading || !title.trim() || !message.trim()
                    ? "#fca5b0"
                    : "#FB6376",
              }}
            >
              {isLoading ? "Planting..." : "Plant Flower"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
