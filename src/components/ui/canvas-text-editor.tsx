"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Bold, AlignLeft, AlignCenter, AlignRight, Type, Smile, Palette, Plus, Image, Video, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  width?: number; // width in pixels
  type?: "text" | "image" | "video" | "audio";
  mediaUrl?: string;
  fileName?: string;
}

interface CanvasTextEditorProps {
  value: string; // JSON string of TextBlock[]
  onChange: (val: string) => void;
  title?: string;
  onTitleChange?: (val: string) => void;
  recipientType?: "self" | "friends" | "public";
  recipientNames?: string[];
  creatorName?: string;
  onAddPhoto?: () => void;
  onAddVideo?: () => void;
  onAddAudio?: () => void;
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

export const PremiumAudioPlayer = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const mins = Math.floor(audio.currentTime / 60);
      const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, "0");
      setCurrentTime(`${mins}:${secs}`);
    };

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <div className="bg-[#1A1A1A] text-white px-4 py-3 rounded-full flex items-center gap-3 w-full border border-white/10 shadow-lg select-none pointer-events-auto">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
        {isPlaying ? (
          <span className="text-white text-[10px]">⏸</span>
        ) : (
          <span className="text-white text-xs pl-0.5">▶</span>
        )}
      </button>
      
      {/* Waveform Visualizer */}
      <div className="flex-1 flex items-center justify-center gap-[3px] h-6 px-2">
        {[40, 60, 30, 70, 50, 80, 40, 60, 30, 70, 50, 80, 40, 60, 30, 70, 50].map((h, i) => (
          <div 
            key={i} 
            className={cn(
              "w-[2px] bg-white/30 rounded-full transition-all duration-300", 
              isPlaying ? "animate-pulse" : ""
            )}
            style={{ 
              height: `${h}%`,
              animationDelay: `${i * 0.05}s`
            }} 
          />
        ))}
      </div>

      <span className="text-xs font-mono text-white/70 min-w-[28px] text-right">
        {currentTime}
      </span>
    </div>
  );
};

export const CanvasTextEditor = ({
  value,
  onChange,
  title,
  onTitleChange,
  recipientType = "self",
  recipientNames = [],
  creatorName,
  onAddPhoto,
  onAddVideo,
  onAddAudio
}: CanvasTextEditorProps) => {
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isScaling, setIsScaling] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize from value
  useEffect(() => {
    if (value) {
      try {
        const sanitized = value.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        let parsed = JSON.parse(sanitized);
        while (typeof parsed === "string") {
          parsed = JSON.parse(parsed.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
        }
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
      y: 35,
      fontFamily: "'Patrick Hand', cursive",
      fontSize: 24,
      color: "#5D2A42",
      fontWeight: "normal",
      textAlign: "left",
      width: 250,
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

  const handleScaleStart = (blockId: string, handleType: string, startEvent: React.PointerEvent) => {
    startEvent.stopPropagation();
    startEvent.preventDefault();
    setIsScaling(true);

    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const startFontSize = block.fontSize;
    const startWidth = block.width || 250;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const isMedia = block.type && block.type !== "text";
      if (handleType === "r" || isMedia) {
        const multiplier = (handleType === "l" || handleType === "tl" || handleType === "bl") ? -1 : 1;
        const newWidth = Math.max(100, Math.min(800, Math.round(startWidth + deltaX * multiplier)));
        updateBlock(blockId, { width: newWidth });
      } else if (handleType === "l") {
        const newWidth = Math.max(100, Math.min(800, Math.round(startWidth - deltaX)));
        updateBlock(blockId, { width: newWidth });
      } else {
        let factor = 0;
        if (handleType === "br") {
          factor = deltaX;
        } else if (handleType === "bl") {
          factor = -deltaX;
        } else if (handleType === "tl") {
          factor = -deltaX - deltaY;
        } else if (handleType === "tr") {
          factor = deltaX - deltaY;
        } else {
          factor = deltaY;
        }

        const newFontSize = Math.max(12, Math.min(120, Math.round(startFontSize + factor * 0.25)));
        updateBlock(blockId, { fontSize: newFontSize });
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      setIsScaling(false);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Action Toolbar: Clean, Premium, No gradients/glow */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={addBlock}
          variant="outline"
          className="border-[#EAEAEA] bg-white text-[#1A1A1A] hover:bg-gray-100 rounded-xl shadow-sm text-sm font-semibold h-11 px-4 flex items-center gap-2 transition-colors border-solid"
        >
          <Plus className="w-4 h-4 text-[#5D2A42]" />
          Text
        </Button>

        {onAddPhoto && (
          <Button
            type="button"
            onClick={onAddPhoto}
            variant="outline"
            className="border-[#EAEAEA] bg-white text-[#1A1A1A] hover:bg-gray-100 rounded-xl shadow-sm text-sm font-semibold h-11 px-4 flex items-center gap-2 transition-colors border-solid"
          >
            <Image className="w-4 h-4 text-[#5D2A42]" />
            Photo
          </Button>
        )}

        {onAddVideo && (
          <Button
            type="button"
            onClick={onAddVideo}
            variant="outline"
            className="border-[#EAEAEA] bg-white text-[#1A1A1A] hover:bg-gray-100 rounded-xl shadow-sm text-sm font-semibold h-11 px-4 flex items-center gap-2 transition-colors border-solid"
          >
            <Video className="w-4 h-4 text-[#5D2A42]" />
            Video
          </Button>
        )}

        {onAddAudio && (
          <Button
            type="button"
            onClick={onAddAudio}
            variant="outline"
            className="border-[#EAEAEA] bg-white text-[#1A1A1A] hover:bg-gray-100 rounded-xl shadow-sm text-sm font-semibold h-11 px-4 flex items-center gap-2 transition-colors border-solid"
          >
            <Mic className="w-4 h-4 text-[#5D2A42]" />
            Audio
          </Button>
        )}
      </div>
      {selectedId ? (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white text-[#1A1A1A] border border-[#E8E8E8] rounded-xl shadow-sm z-10 sticky top-0">
          {(() => {
            const selectedBlock = blocks.find(b => b.id === selectedId);
            const isMedia = selectedBlock && selectedBlock.type && selectedBlock.type !== "text";
            
            if (isMedia) {
              return (
                <div className="flex items-center gap-2 w-full py-1">
                  <span className="text-xs font-extrabold text-[#5D2A42] uppercase tracking-wider pl-2">
                    Selected {selectedBlock.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteBlock(selectedId)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg ml-auto flex items-center gap-1.5 text-sm font-semibold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete {selectedBlock.type === "image" ? "Photo" : selectedBlock.type === "video" ? "Video" : "Audio"}
                  </button>
                </div>
              );
            }

            return (
              <>
                <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
                  <select
                    className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-[#1A1A1A] font-semibold"
                    value={blocks.find(b => b.id === selectedId)?.fontFamily}
                    onChange={(e) => updateBlock(selectedId, { fontFamily: e.target.value })}
                    style={{ fontFamily: blocks.find(b => b.id === selectedId)?.fontFamily }}
                  >
                    {FONTS.map(f => (
                      <option key={f.value} value={f.value} className="text-black bg-white" style={{ fontFamily: f.value }}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
                  <select
                    className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-[#1A1A1A] font-semibold"
                    value={blocks.find(b => b.id === selectedId)?.fontSize}
                    onChange={(e) => updateBlock(selectedId, { fontSize: Number(e.target.value) })}
                  >
                    {SIZES.map(s => (
                      <option key={s} value={s} className="text-black bg-white">
                        {s}px
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      const b = blocks.find(b => b.id === selectedId);
                      updateBlock(selectedId, { fontWeight: b?.fontWeight === "bold" ? "normal" : "bold" });
                    }}
                    className={cn("p-1.5 rounded-lg text-[#5D2A42] hover:bg-gray-100", blocks.find(b => b.id === selectedId)?.fontWeight === "bold" ? "bg-gray-200" : "")}
                  >
                    <Bold className="w-4 h-4 text-[#5D2A42]" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
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
                      type="button"
                      key={align}
                      onClick={() => updateBlock(selectedId, { textAlign: align })}
                      className={cn("p-1.5 rounded-lg text-[#5D2A42] hover:bg-gray-100", blocks.find(b => b.id === selectedId)?.textAlign === align ? "bg-gray-200" : "")}
                    >
                      {align === "left" ? <AlignLeft className="w-4 h-4 text-[#5D2A42]" /> : align === "center" ? <AlignCenter className="w-4 h-4 text-[#5D2A42]" /> : <AlignRight className="w-4 h-4 text-[#5D2A42]" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 border-r border-[#E8E8E8] pr-2">
                  {COLORS.map(c => (
                    <button
                      type="button"
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
                  type="button"
                  onClick={() => deleteBlock(selectedId)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* The Canvas (Letter Background) */}
      <div
        ref={containerRef}
        className="w-full relative min-h-[1000px] border border-[#E8E8E8] rounded-xl overflow-hidden shadow-inner bg-[#EBE4D5] p-8 md:p-16 flex flex-col"
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
        {/* Static Letter Header Elements */}
        <div className="max-w-xl mx-auto space-y-4 pointer-events-none select-none font-serif text-[#5D2A42] w-full mb-4">
          <div className="text-center mb-4 pt-2">
            {onTitleChange ? (
              <input
                type="text"
                className="text-3xl md:text-5xl font-bold uppercase tracking-widest text-[#5D2A42] bg-transparent border-none outline-none text-center w-full focus:ring-0 focus:border-none select-text pointer-events-auto cursor-text font-serif p-0"
                value={title || ""}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="UNTITLED LETTER"
              />
            ) : (
              <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-widest text-[#5D2A42] m-0">
                {title || "Untitled"}
              </h1>
            )}
            <div className="flex items-center justify-center space-x-6 text-sm text-[#5D2A42]/80 mt-3">
              <div className="flex items-center">
                <span>📅</span> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start pt-2">
            <div>
              <span className="text-xs text-[#5D2A42]/60 block mb-1">Date Written:</span>
              <span className="font-semibold text-lg">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#5D2A42]/60 block mb-1">To:</span>
              <span className="font-semibold text-lg">
                {recipientType === "self"
                  ? "My Future Self"
                  : recipientType === "friends"
                    ? (recipientNames.length > 0 ? recipientNames.join(', ') : "My Connections")
                    : "The World"}
              </span>
              <div className="text-xs text-[#5D2A42]/60 mt-1">Present Day</div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-lg md:text-xl leading-[2.5rem] tracking-wide m-0">
              Dear {recipientType === "self" ? "Future Me" : (recipientNames.length > 0 ? recipientNames.join(", ") : "Friend")},
            </p>
          </div>
        </div>

        {!blocks.length && (
          <div className="absolute inset-0 flex items-center justify-center text-[#5D2A42]/50 font-serif pointer-events-none text-xl z-20">
            Click "Add Text" to start writing your letter
          </div>
        )}

        {blocks.map(block => (
          <motion.div
            key={`${block.id}-${block.x}-${block.y}`}
            id={`block-${block.id}`}
            drag={!isScaling && editingBlockId !== block.id}
            dragMomentum={false}
            dragConstraints={containerRef}
            onDragEnd={(e, info) => handleDragEnd(block.id, e, info)}
            initial={{ top: `${block.y}%`, left: `${block.x}%` }}
            className={cn(
              "absolute p-2 cursor-move outline-none group min-w-[150px] z-30",
              selectedId === block.id && editingBlockId !== block.id
                ? "bg-transparent select-none"
                : selectedId === block.id
                  ? "ring-1 ring-[#FB6376] rounded-md bg-white/10"
                  : "hover:ring-1 hover:ring-dashed hover:ring-black/10 rounded-md"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(block.id);
              if (editingBlockId !== block.id) {
                setEditingBlockId(null);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingBlockId(block.id);
              setSelectedId(block.id);
            }}
            style={{
              top: `${block.y}%`,
              left: `${block.x}%`,
              width: block.width ? `${block.width}px` : "auto",
              fontFamily: block.fontFamily,
              fontSize: `${block.fontSize}px`,
              color: block.color,
              fontWeight: block.fontWeight,
              textAlign: block.textAlign,
            }}
          >
            {(!block.type || block.type === "text") ? (
              editingBlockId === block.id ? (
                <textarea
                  ref={(el) => { if (el) el.focus(); }}
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  onBlur={() => setEditingBlockId(null)}
                  className="bg-transparent border-none outline-none resize-none overflow-hidden w-full h-full text-inherit leading-normal block text-black font-serif"
                  style={{ textAlign: block.textAlign, minHeight: `${block.fontSize * 1.5}px` }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  rows={1}
                />
              ) : (
                <div 
                  className="w-full h-full leading-normal select-none pointer-events-none whitespace-pre-wrap break-words"
                  style={{ textAlign: block.textAlign }}
                >
                  {block.text}
                </div>
              )
            ) : block.type === "image" ? (
              <img 
                src={block.mediaUrl} 
                alt={block.fileName || "Image"} 
                className="w-full h-auto rounded-xl object-cover border border-[#EAEAEA] shadow-sm select-none pointer-events-none" 
              />
            ) : block.type === "video" ? (
              <div className="w-full h-auto rounded-xl overflow-hidden border border-[#EAEAEA] bg-black">
                <video 
                  src={block.mediaUrl} 
                  controls={selectedId === block.id} 
                  className="w-full h-auto object-cover pointer-events-auto" 
                />
              </div>
            ) : (
              <div className="w-full">
                <PremiumAudioPlayer src={block.mediaUrl || ""} />
              </div>
            )}

            {/* Blue Photoshop-style selection bounds */}
            {selectedId === block.id && editingBlockId !== block.id && (
              <>
                {/* Blue Border Frame */}
                <div className="absolute -inset-0.5 border border-[#3b82f6] pointer-events-none" />

                {/* Corner & Side Handles */}
                <div
                  className="absolute w-2.5 h-2.5 bg-white border border-[#3b82f6] rounded-full top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize z-50 pointer-events-auto shadow-sm"
                  onPointerDown={(e) => handleScaleStart(block.id, "tl", e)}
                />
                <div
                  className="absolute w-2.5 h-2.5 bg-white border border-[#3b82f6] rounded-full top-0 left-full -translate-x-1/2 -translate-y-1/2 cursor-nesw-resize z-50 pointer-events-auto shadow-sm"
                  onPointerDown={(e) => handleScaleStart(block.id, "tr", e)}
                />
                <div
                  className="absolute w-2.5 h-2.5 bg-white border border-[#3b82f6] rounded-full top-full left-0 -translate-x-1/2 -translate-y-1/2 cursor-nesw-resize z-50 pointer-events-auto shadow-sm"
                  onPointerDown={(e) => handleScaleStart(block.id, "bl", e)}
                />
                <div
                  className="absolute w-2.5 h-2.5 bg-white border border-[#3b82f6] rounded-full top-full left-full -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize z-50 pointer-events-auto shadow-sm"
                  onPointerDown={(e) => handleScaleStart(block.id, "br", e)}
                />
                <div
                  className="absolute w-2.5 h-2.5 bg-white border border-[#3b82f6] rounded-full top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize z-50 pointer-events-auto shadow-sm"
                  onPointerDown={(e) => handleScaleStart(block.id, "l", e)}
                />
                <div
                  className="absolute w-2.5 h-2.5 bg-white border border-[#3b82f6] rounded-full top-1/2 left-full -translate-x-1/2 -translate-y-1/2 cursor-ew-resize z-50 pointer-events-auto shadow-sm"
                  onPointerDown={(e) => handleScaleStart(block.id, "r", e)}
                />
              </>
            )}
          </motion.div>
        ))}

        {/* Static Letter Footer Elements */}
        <div className="max-w-xl mx-auto pt-8 pb-8 space-y-6 pointer-events-none select-none font-serif text-[#5D2A42] w-full mt-auto">
          <p className="text-xl">Sincerely,</p>
          <div className="bg-white/40 backdrop-blur-md rounded-xl border border-white/60 border-dashed p-6 min-h-[140px] max-w-sm flex items-center justify-center shadow-sm">
            <span className="font-signature text-xl opacity-70 italic">{creatorName || "Your Signature"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
