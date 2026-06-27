"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Bold, AlignLeft, AlignCenter, AlignRight, Type, Smile, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { cn } from "@/lib/utils";

export interface TextBlock {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight: string;
  textAlign: "left" | "center" | "right";
}

interface CanvasTextEditorProps {
  value: string; // JSON string of TextBlock[]
  onChange: (val: string) => void;
}

const FONTS = [
  { name: "Nunito", value: "Nunito, sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Patrick Hand", value: "'Patrick Hand', cursive" },
  { name: "Geist", value: "Geist, sans-serif" },
  { name: "Geist Mono", value: "'Geist Mono', monospace" },
  { name: "Indie Flower", value: "'Indie Flower', cursive" },
  { name: "Instrument Serif", value: "'Instrument Serif', serif" },
  { name: "La Belle Aurore", value: "'La Belle Aurore', cursive" },
  { name: "Roboto", value: "Roboto, sans-serif" },
  { name: "Space Mono", value: "'Space Mono', monospace" },
];

const COLORS = ["#1A1A1A", "#5D2A42", "#FB6376", "#2563EB", "#16A34A", "#D97706", "#ffffff"];
const SIZES = [14, 16, 18, 20, 24, 32, 48];

export const CanvasTextEditor = ({ value, onChange }: CanvasTextEditorProps) => {
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize from value
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        }
      } catch (e) {
        // Fallback for old HTML content or empty
      }
    }
  }, [value]);

  const updateValue = (newBlocks: TextBlock[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  };

  const addBlock = () => {
    const newBlock: TextBlock = {
      id: crypto.randomUUID(),
      text: "Double click to edit",
      x: 10,
      y: 10,
      fontFamily: "'Patrick Hand', cursive",
      fontSize: 24,
      color: "#5D2A42",
      fontWeight: "normal",
      textAlign: "left",
    };
    updateValue([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<TextBlock>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    updateValue(newBlocks);
  };

  const deleteBlock = (id: string) => {
    updateValue(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDragEnd = (id: string, event: any, info: any) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const el = document.getElementById(`block-${id}`);
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    
    let percentX = ((elRect.left - rect.left) / rect.width) * 100;
    let percentY = ((elRect.top - rect.top) / rect.height) * 100;

    percentX = Math.max(0, Math.min(percentX, 90));
    percentY = Math.max(0, Math.min(percentY, 95));

    updateBlock(id, { x: percentX, y: percentY });
  };

  return (
    <div className="flex flex-col gap-4">
      {selectedId ? (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-[#E8E8E8] rounded-xl shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
            <select
              className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer"
              value={blocks.find(b => b.id === selectedId)?.fontFamily}
              onChange={(e) => updateBlock(selectedId, { fontFamily: e.target.value })}
              style={{ fontFamily: blocks.find(b => b.id === selectedId)?.fontFamily }}
            >
              {FONTS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
            <select
              className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer"
              value={blocks.find(b => b.id === selectedId)?.fontSize}
              onChange={(e) => updateBlock(selectedId, { fontSize: Number(e.target.value) })}
            >
              {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
            <button
              onClick={() => {
                const b = blocks.find(b => b.id === selectedId);
                updateBlock(selectedId, { fontWeight: b?.fontWeight === "bold" ? "normal" : "bold" });
              }}
              className={cn("p-1.5 rounded-lg", blocks.find(b => b.id === selectedId)?.fontWeight === "bold" ? "bg-[#E8E8E8]" : "hover:bg-gray-50")}
            >
              <Bold className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 rounded-lg hover:bg-gray-50"
              >
                <Smile className="w-4 h-4 text-[#5D2A42]" />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                  <div className="relative">
                    <EmojiPicker 
                      theme={Theme.LIGHT} 
                      emojiStyle={EmojiStyle.NATIVE}
                      onEmojiClick={(emojiData) => {
                        const block = blocks.find(b => b.id === selectedId);
                        if (block) {
                          updateBlock(selectedId, { text: block.text + emojiData.emoji });
                        }
                        setShowEmojiPicker(false);
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
            {(["left", "center", "right"] as const).map(align => (
              <button
                key={align}
                onClick={() => updateBlock(selectedId, { textAlign: align })}
                className={cn("p-1.5 rounded-lg", blocks.find(b => b.id === selectedId)?.textAlign === align ? "bg-[#E8E8E8]" : "hover:bg-gray-50")}
              >
                {align === "left" ? <AlignLeft className="w-4 h-4" /> : align === "center" ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => updateBlock(selectedId, { color: c })}
                className={cn("w-6 h-6 rounded-full border border-[#E8E8E8]", blocks.find(b => b.id === selectedId)?.color === c ? "ring-2 ring-black" : "hover:scale-110")}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="w-6 h-6 rounded-full border border-[#E8E8E8] cursor-pointer hover:scale-110 flex items-center justify-center bg-gradient-to-tr from-red-400 via-green-400 to-blue-400">
              <Palette className="w-3 h-3 text-white mix-blend-difference" />
              <input
                type="color"
                className="opacity-0 w-0 h-0 absolute"
                value={blocks.find(b => b.id === selectedId)?.color || "#000000"}
                onChange={(e) => updateBlock(selectedId, { color: e.target.value })}
              />
            </label>
          </div>

          <button
            onClick={() => deleteBlock(selectedId)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg ml-auto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="h-[52px] bg-white border border-dashed border-[#E8E8E8] rounded-xl flex items-center justify-center text-[#999] text-sm">
          Select a text block to format it
        </div>
      )}

      {/* The Canvas (Letter Background) */}
      <div 
        ref={containerRef}
        className="w-full relative min-h-[800px] border border-[#E8E8E8] rounded-xl overflow-hidden shadow-inner bg-[#EBE4D5]"
        style={{
          backgroundImage: "url('/canvas-background-BYlUkw-J.png')",
          backgroundSize: "cover",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "top center"
        }}
        onClick={(e) => {
          if (e.target === containerRef.current) {
            setSelectedId(null);
          }
        }}
      >
        {!blocks.length && (
          <div className="absolute inset-0 flex items-center justify-center text-[#5D2A42]/50 font-serif pointer-events-none text-xl">
            Click "Add Text" to start writing your letter
          </div>
        )}

        {blocks.map(block => (
          <motion.div
            key={block.id}
            id={`block-${block.id}`}
            drag
            dragMomentum={false}
            dragConstraints={containerRef}
            onDragEnd={(e, info) => handleDragEnd(block.id, e, info)}
            initial={{ top: `${block.y}%`, left: `${block.x}%` }}
            className={cn(
              "absolute p-2 cursor-move outline-none group min-w-[150px]",
              selectedId === block.id ? "ring-2 ring-dashed ring-[#FB6376] rounded-md bg-white/20 backdrop-blur-sm" : "hover:ring-1 hover:ring-dashed hover:ring-black/20 rounded-md"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(block.id);
            }}
            style={{
              fontFamily: block.fontFamily,
              fontSize: `${block.fontSize}px`,
              color: block.color,
              fontWeight: block.fontWeight,
              textAlign: block.textAlign,
            }}
          >
            <textarea
              value={block.text}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              className="bg-transparent border-none outline-none resize-none overflow-hidden w-full h-full text-inherit leading-normal block"
              style={{ textAlign: block.textAlign, minHeight: `${block.fontSize * 1.5}px` }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
                target.style.width = "auto";
                target.style.width = `${Math.max(150, target.scrollWidth)}px`;
              }}
              rows={1}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={addBlock} variant="outline" className="border-[#FB6376] text-[#FB6376] hover:bg-[#FB6376] hover:text-white rounded-xl shadow-sm text-base h-12 px-6">
          <Type className="w-5 h-5 mr-2" /> Add Text
        </Button>
      </div>
    </div>
  );
};
