import { useEffect, useState } from "react";
import {
  fetchMediaBlob,
  createMediaURL,
  revokeMediaURL,
  MediaAttachment,
} from "@/services/mediaService";
import { Loader2 } from "lucide-react";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getBlob } from "firebase/storage";
import { storage } from "@/firebase";
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
        <img
          src={url}
          alt={attachment.name}
          className={`max-w-full rounded-md ${className ?? ""}`}
          loading="lazy"
          style={{ imageRendering: "auto" }}
        />
      );

    case "video":
      return (
        <video
          src={url}
          controls
          preload="metadata"
          className={`max-w-full rounded-md ${className ?? ""}`}
        />
      );

    case "audio":
      return (
        <audio
          src={url}
          controls
          preload="metadata"
          className={`w-full ${className ?? ""}`}
        />
      );

    default:
      return null;
  }
};

export default MediaRenderer;
