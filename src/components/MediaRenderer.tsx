import { useEffect, useState } from "react";
import {
  fetchMediaBlob,
  createMediaURL,
  revokeMediaURL,
  MediaAttachment,
} from "@/services/mediaService";
import { Loader2, Play, Pause } from "lucide-react";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getBlob } from "firebase/storage";
import { storage } from "@/firebase";
import { AudioVisualizer } from "./AudioVisualizer";
interface MediaRendererProps {
  attachment: MediaAttachment;
  isUnlocked: boolean;
  className?: string;
}
const getMimeType = (type: "image" | "video" | "audio") => {
  switch (type) {
    case "image":
      return "image/*";
    case "video":
      return "video/mp4";
    case "audio":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
};

const auth = getAuth();
const MediaRenderer = ({
  attachment,
  isUnlocked,
  className,
}: MediaRendererProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked || !auth.currentUser) return;

    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        const storageRef = ref(storage, attachment.storagePath);
        const blob = await getBlob(storageRef);

        const typedBlob = new Blob([blob], {
          type:
            attachment.type === "image"
              ? "image/jpeg"
              : attachment.type === "video"
              ? "video/mp4"
              : "audio/mpeg",
        });

        objectUrl = URL.createObjectURL(typedBlob);

        if (active) setUrl(objectUrl);
      } catch (err) {
        console.error("Media load failed:", err);
      }
    };

    load();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.storagePath, isUnlocked]);

  /* ================= LOCKED STATE ================= */

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        🔒 Media will unlock later
      </div>
    );
  }

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  /* ================= ERROR ================= */

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!url) return null;

  /* ================= RENDER ================= */

  switch (attachment.type) {
    case "image":
      return (
        <div className={`break-inside-avoid rounded-2xl overflow-hidden border border-[#5D2A42]/20 shadow-sm bg-white/50 backdrop-blur-sm mb-4 ${className ?? ""}`}>
          <img
            src={url}
            alt={attachment.altText || attachment.name}
            className="w-full h-auto object-cover"
            loading="lazy"
            style={{ imageRendering: "auto" }}
          />
          {attachment.altText && attachment.altText.trim() !== '' && (
            <div className="p-3 bg-white/80 border-t border-[#5D2A42]/10">
              <span className="font-semibold text-xs text-[#5D2A42] block">
                {attachment.altText}
              </span>
            </div>
          )}
        </div>
      );

    case "video":
      return (
        <div className={`break-inside-avoid rounded-2xl overflow-hidden border border-[#5D2A42]/20 shadow-sm bg-white/50 backdrop-blur-sm mb-4 ${className ?? ""}`}>
          <div className="relative w-full bg-black group cursor-pointer" onClick={(e) => {
            const video = e.currentTarget.querySelector('video');
            const playIcon = e.currentTarget.querySelector('.play-icon');
            if (video) {
              if (video.paused) { video.play(); playIcon?.classList.add('hidden'); }
              else { video.pause(); playIcon?.classList.remove('hidden'); }
            }
          }}>
            <video
              src={url}
              preload="metadata"
              className="w-full h-auto object-cover max-h-[400px]"
              onEnded={(e) => {
                const playIcon = e.currentTarget.parentElement?.querySelector('.play-icon');
                playIcon?.classList.remove('hidden');
              }}
            />
            <div className="play-icon absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                <Play className="w-5 h-5 text-white ml-1 fill-white" />
              </div>
            </div>
          </div>
          {attachment.altText && attachment.altText.trim() !== '' && (
            <div className="p-3 bg-white/80 border-t border-[#5D2A42]/10">
              <span className="font-semibold text-xs text-[#5D2A42] block">
                {attachment.altText}
              </span>
            </div>
          )}
        </div>
      );

    case "audio":
      return (
        <div className={`break-inside-avoid rounded-2xl overflow-hidden border border-[#5D2A42]/20 shadow-sm bg-white/50 backdrop-blur-sm mb-4 ${className ?? ""}`}>
          <AudioVisualizer url={url} />
          {attachment.altText && attachment.altText.trim() !== '' && (
            <div className="p-3 bg-white/80 border-t border-[#5D2A42]/10">
              <span className="font-semibold text-xs text-[#5D2A42] block">
                {attachment.altText}
              </span>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
};

export default MediaRenderer;
