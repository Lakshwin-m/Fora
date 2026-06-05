"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smile,
  Image as ImageIcon,
  Palette,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Color Palette ───────────────────────────────────────────────────
const TEXT_COLORS = [
  { label: "Default",  value: "" },
  { label: "Black",    value: "#1A1A1A" },
  { label: "Dark Grey", value: "#555555" },
  { label: "Grey",     value: "#999999" },
  { label: "Coral",    value: "#FB6376" },
  { label: "Rose",     value: "#E8556A" },
  { label: "Plum",     value: "#5D2A42" },
  { label: "Burgundy", value: "#800020" },
  { label: "Red",      value: "#DC2626" },
  { label: "Orange",   value: "#EA580C" },
  { label: "Amber",    value: "#D97706" },
  { label: "Yellow",   value: "#CA8A04" },
  { label: "Lime",     value: "#65A30D" },
  { label: "Green",    value: "#16A34A" },
  { label: "Teal",     value: "#0D9488" },
  { label: "Cyan",     value: "#0891B2" },
  { label: "Blue",     value: "#2563EB" },
  { label: "Indigo",   value: "#4F46E5" },
  { label: "Violet",   value: "#7C3AED" },
  { label: "Purple",   value: "#9333EA" },
  { label: "Pink",     value: "#DB2777" },
  { label: "Fuchsia",  value: "#C026D3" },
];

// ── Emoji Data ──────────────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
      "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
      "🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢",
      "🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏",
      "😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷",
      "🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌",
      "🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉",
      "👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛",
      "🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💪",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️",
      "🫀","❤️‍🔥","❤️‍🩹","💌","💋","💍","💎","🌹","🥀","🌺",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "⏰","⌛","📷","📸","📹","🎥","📽️","🎬","📺","📻",
      "🎵","🎶","🎤","🎧","🎹","🥁","🎸","🎺","🎻","🪕",
      "📱","💻","🖥️","📀","💿","📦","📬","📮","✉️","📝",
      "📒","📕","📗","📘","📙","📚","🔖","🏷️","💰","🎁",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌞","🌝","🌛","🌜","⭐","🌟","✨","🌈","☀️","⛅",
      "☁️","🌧️","⛈️","🌩️","🌨️","❄️","🔥","💧","🌊","🌸",
      "🌻","🌼","🌷","🌱","🌲","🌳","🍀","🍁","🍂","🍃",
    ],
  },
  {
    label: "Food",
    emojis: [
      "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒",
      "🍑","🥭","🍍","🥥","🥝","🍔","🍕","🌮","🍣","🍩",
      "🍪","🎂","🍰","🧁","🍫","🍬","🍭","🍮","🍯","☕",
    ],
  },
];

// ── Giphy fetch (free public beta key) ──────────────────────────────
const GIPHY_API_KEY = "dc6zaTOxFJmzC"; // Giphy public beta key
const GIPHY_LIMIT = 20;

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_width: { url: string; width: string; height: string };
    fixed_width_still: { url: string };
    original: { url: string };
  };
}

async function searchGiphy(query: string): Promise<GiphyGif[]> {
  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${GIPHY_LIMIT}&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${GIPHY_LIMIT}&rating=g`;
  const res = await fetch(endpoint);
  const json = await res.json();
  return json.data || [];
}

// ── Toolbar Button ──────────────────────────────────────────────────
interface ToolbarBtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarBtn = ({ onClick, active, disabled, title, children }: ToolbarBtnProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150",
      active
        ? "bg-[#FB6376] text-white shadow-sm"
        : "text-[#5D2A42]/70 hover:bg-[#5D2A42]/10",
      disabled && "opacity-40 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

// ── Emoji Picker ────────────────────────────────────────────────────
const EmojiPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 w-[320px] bg-white border border-[#E8E8E8] rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex border-b border-[#E8E8E8] overflow-x-auto hide-scrollbar">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setActiveCategory(i)}
            className={cn(
              "px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors",
              i === activeCategory
                ? "text-[#FB6376] border-b-2 border-[#FB6376]"
                : "text-[#999] hover:text-[#5D2A42]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-3 max-h-[200px] overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-[#FFF9EC] rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── GIF Picker ──────────────────────────────────────────────────────
const GifPicker = ({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Load trending on mount
  useEffect(() => {
    setLoading(true);
    searchGiphy("").then((data) => {
      setGifs(data);
      setLoading(false);
    });
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchGiphy(value);
      setGifs(data);
      setLoading(false);
    }, 400);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-[380px] bg-white border border-[#E8E8E8] rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      {/* Search */}
      <div className="p-3 border-b border-[#E8E8E8]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E8E8E8] bg-[#FFF9EC] text-sm text-[#1A1A1A] placeholder:text-[#999] focus:outline-none focus:border-[#FB6376] transition-colors"
          />
        </div>
        <p className="text-[10px] text-[#999] mt-1.5 text-right font-medium">Powered by GIPHY</p>
      </div>
      {/* Grid */}
      <div className="max-h-[280px] overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#FB6376]" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#999]">
            No GIFs found. Try a different search.
          </div>
        ) : (
          <div className="columns-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif.images.fixed_width.url)}
                className="w-full mb-2 rounded-xl overflow-hidden hover:ring-2 hover:ring-[#FB6376] transition-all break-inside-avoid"
              >
                <img
                  src={gif.images.fixed_width.url}
                  alt={gif.title}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Color Picker ────────────────────────────────────────────────────
const ColorPicker = ({ editor, onClose }: { editor: Editor; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const currentColor = editor.getAttributes("textStyle").color || "";

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 w-[220px] bg-white border border-[#E8E8E8] rounded-2xl shadow-xl z-50 overflow-hidden p-3"
    >
      <p className="text-[10px] font-bold text-[#5D2A42] uppercase tracking-wider mb-2">Text Color</p>
      <div className="grid grid-cols-7 gap-1.5">
        {TEXT_COLORS.map((color) => (
          <button
            key={color.label}
            type="button"
            title={color.label}
            onClick={() => {
              if (color.value === "") {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().setColor(color.value).run();
              }
              onClose();
            }}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
              (currentColor === color.value || (!currentColor && color.value === ""))
                ? "border-[#FB6376] ring-2 ring-[#FB6376]/30"
                : "border-[#E8E8E8] hover:border-[#999]"
            )}
            style={{
              backgroundColor: color.value || "#1A1A1A",
              ...(color.value === "" ? {
                background: "conic-gradient(#DC2626, #D97706, #16A34A, #2563EB, #7C3AED, #DB2777, #DC2626)",
              } : {}),
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ── Toolbar ─────────────────────────────────────────────────────────
const EditorToolbar = ({ editor }: { editor: Editor }) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showColor, setShowColor] = useState(false);

  const closeAll = () => { setShowEmoji(false); setShowGif(false); setShowColor(false); };

  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    closeAll();
  };

  const insertGif = (url: string) => {
    editor.chain().focus().setImage({ src: url, alt: "GIF" }).run();
    closeAll();
  };

  const currentColor = editor.getAttributes("textStyle").color || "#1A1A1A";

  return (
    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[#E8E8E8] bg-[#FAFAFA] flex-wrap">
      {/* Text formatting */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon className="w-4 h-4" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[#E8E8E8] mx-1" />

      {/* Text Color */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { closeAll(); setShowColor(!showColor); }}
          title="Text Color"
          className={cn(
            "w-8 h-8 rounded-lg flex flex-col items-center justify-center transition-all duration-150 gap-0.5",
            showColor
              ? "bg-[#FB6376] text-white shadow-sm"
              : "text-[#5D2A42]/70 hover:bg-[#5D2A42]/10"
          )}
        >
          <span className="text-[11px] font-black leading-none">A</span>
          <span
            className="w-4 h-1 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        </button>
        {showColor && <ColorPicker editor={editor} onClose={() => setShowColor(false)} />}
      </div>

      <div className="w-px h-5 bg-[#E8E8E8] mx-1" />

      {/* Lists */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[#E8E8E8] mx-1" />

      {/* Alignment */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarBtn>

      <div className="w-px h-5 bg-[#E8E8E8] mx-1" />

      {/* Emoji */}
      <div className="relative">
        <ToolbarBtn
          onClick={() => { closeAll(); setShowEmoji(!showEmoji); }}
          active={showEmoji}
          title="Emoji"
        >
          <Smile className="w-4 h-4" />
        </ToolbarBtn>
        {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
      </div>

      {/* GIF */}
      <div className="relative">
        <ToolbarBtn
          onClick={() => { closeAll(); setShowGif(!showGif); }}
          active={showGif}
          title="Insert GIF"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarBtn>
        {showGif && <GifPicker onSelect={insertGif} onClose={() => setShowGif(false)} />}
      </div>
    </div>
  );
};

// ── Main Editor ─────────────────────────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Write your message to the future...",
  className,
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      Color,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-xl max-w-full my-3",
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-5 py-4 text-[#1A1A1A] text-base leading-relaxed focus:outline-none prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-img:rounded-xl prose-img:max-w-full",
      },
    },
  });

  // Sync external value changes (e.g. prefills from reshare)
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "border border-[#E8E8E8] bg-white rounded-xl overflow-hidden shadow-sm transition-all focus-within:border-[#FB6376]",
        className
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

// Helper to strip HTML tags for validation (checking empty content)
export function getPlainTextLength(html: string): number {
  if (!html) return 0;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim().length;
}
