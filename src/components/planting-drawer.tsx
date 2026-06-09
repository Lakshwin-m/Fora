"use client";

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
import { useTranslation } from "@/contexts/LanguageContext";

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
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error(t('garden.toastFillRequired'));
      return;
    }

    if (!clickPosition) {
      toast.error(t('garden.toastInvalidPosition'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/plantFlower`, {
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

      toast.success(t('garden.toastPlantSuccess'), {
        description: t('garden.toastPlantSuccessDesc'),
      });

      onPlantSuccess(newFlower);

      // Reset form
      setTitle("");
      setMessage("");
      setAuthor("");
      setSelectedFlower("yellow-sunflower");
    } catch (error) {
      console.error("Error planting flower:", error);
      toast.error(t('garden.toastPlantFailed'), {
        description: t('garden.toastPlantFailedDesc'),
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
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <img
                src="/sun.png"
                alt="Sun"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="flex-1">
              <SheetTitle>{t('garden.plantingDrawerTitle')}</SheetTitle>
              <SheetDescription>
                {t('garden.plantingDrawerDesc')}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-1">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              {t('garden.fieldTitleReq').replace(' *', '')} <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('garden.titlePlaceholder')}
              required
              maxLength={100}
              className="bg-white"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              {t('garden.fieldMessageReq').replace(' *', '')} <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('garden.messagePlaceholder')}
              required
              rows={4}
              maxLength={500}
              className="bg-white"
            />
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-medium mb-2">
              {t('garden.fieldAuthor')}
            </label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t('garden.authorPlaceholder')}
              maxLength={50}
              className="bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('garden.fieldChooseFlower').replace(' *', '')} <span className="text-red-500">*</span>
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
              className="w-full text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor:
                  isLoading || !title.trim() || !message.trim()
                    ? "#D7F5D3"
                    : "#4CAF50",
              }}
            >
              {isLoading ? t('garden.btnPlanting') : t('garden.btnPlant')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
