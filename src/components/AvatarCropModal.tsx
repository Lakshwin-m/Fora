import { useState, useRef, useEffect, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────── */
interface AvatarCropModalProps {
  imageSrc: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

/* ── Constants ──────────────────────────────────────────────── */
const CANVAS_SIZE = 300;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.1;
const OUTPUT_SIZE = 512; // Final cropped image size

/* ── Inject Styles ──────────────────────────────────────────── */
const STYLE_ID = "avatar-crop-modal-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .acm-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      animation: acm-fade-in 0.2s ease-out;
    }

    @keyframes acm-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes acm-slide-up {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .acm-modal {
      background: #fff;
      border-radius: 24px;
      padding: 28px;
      width: 380px;
      max-width: 92vw;
      box-shadow: 0 24px 80px rgba(0,0,0,0.25);
      animation: acm-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: "Inter", sans-serif;
    }

    .acm-title {
      font-family: "Outfit", sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
    }

    .acm-subtitle {
      font-size: 13px;
      color: #999;
      margin-bottom: 20px;
    }

    .acm-canvas-wrap {
      position: relative;
      width: ${CANVAS_SIZE}px;
      height: ${CANVAS_SIZE}px;
      margin: 0 auto 16px;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 0 0 4px #FB6376, 0 8px 30px rgba(251,99,118,0.15);
      cursor: grab;
      user-select: none;
      touch-action: none;
    }

    .acm-canvas-wrap:active {
      cursor: grabbing;
    }

    .acm-canvas-wrap canvas {
      display: block;
    }

    .acm-zoom-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding: 0 8px;
    }

    .acm-zoom-label {
      font-size: 12px;
      font-weight: 600;
      color: #999;
      white-space: nowrap;
      min-width: 36px;
    }

    .acm-zoom-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 4px;
      background: #E8E8E8;
      outline: none;
    }

    .acm-zoom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FB6376;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(251,99,118,0.3);
      border: 2px solid #fff;
    }

    .acm-zoom-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FB6376;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(251,99,118,0.3);
      border: 2px solid #fff;
    }

    .acm-actions {
      display: flex;
      gap: 10px;
    }

    .acm-btn {
      flex: 1;
      height: 44px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      font-family: "Inter", sans-serif;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .acm-btn-cancel {
      background: #F5F5F5;
      color: #666;
    }

    .acm-btn-cancel:hover {
      background: #EDEDED;
    }

    .acm-btn-save {
      background: #FB6376;
      color: #fff;
      box-shadow: 0 4px 14px rgba(251, 99, 118, 0.25);
    }

    .acm-btn-save:hover {
      background: #e8556a;
      box-shadow: 0 6px 18px rgba(251, 99, 118, 0.35);
    }

    .acm-btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .acm-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: acm-spin 0.6s linear infinite;
    }

    @keyframes acm-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

/* ── Component ──────────────────────────────────────────────── */
const AvatarCropModal = ({ imageSrc, onSave, onClose }: AvatarCropModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Load image ── */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);

      // Auto-scale so the image fills the circle
      const minDim = Math.min(img.width, img.height);
      const initialScale = CANVAS_SIZE / minDim;
      setScale(Math.max(initialScale, 1));

      // Center the image
      const scaledW = img.width * Math.max(initialScale, 1);
      const scaledH = img.height * Math.max(initialScale, 1);
      setOffset({
        x: (CANVAS_SIZE - scaledW) / 2,
        y: (CANVAS_SIZE - scaledH) / 2,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  /* ── Draw canvas ── */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw checkerboard bg
    ctx.fillStyle = "#F0F0F0";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, offset.x, offset.y, w, h);
  }, [scale, offset]);

  useEffect(() => {
    if (imgLoaded) drawCanvas();
  }, [imgLoaded, drawCanvas]);

  /* ── Mouse / Touch handlers ── */
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  };

  /* ── Save crop ── */
  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    setSaving(true);

    // Create offscreen canvas at output resolution
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Scale factor from preview to output
    const ratio = OUTPUT_SIZE / CANVAS_SIZE;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the image at the same relative position, but at output resolution
    const w = img.width * scale * ratio;
    const h = img.height * scale * ratio;
    const x = offset.x * ratio;
    const y = offset.y * ratio;
    ctx.drawImage(img, x, y, w, h);

    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
        }
        setSaving(false);
      },
      "image/jpeg",
      0.92
    );
  };

  /* ── Close on backdrop ── */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="acm-overlay" onClick={handleBackdropClick}>
      <div className="acm-modal">
        <div className="acm-title">Adjust Photo</div>
        <div className="acm-subtitle">
          Drag to reposition • Scroll to zoom
        </div>

        {/* Canvas preview */}
        <div
          className="acm-canvas-wrap"
          ref={wrapRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
          />
        </div>

        {/* Zoom slider */}
        <div className="acm-zoom-row">
          <span className="acm-zoom-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#999" strokeWidth="1.5"/>
              <path d="M6 4V8M4 6H8" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            type="range"
            className="acm-zoom-slider"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
          <span className="acm-zoom-label" style={{ textAlign: "right" }}>
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Action buttons */}
        <div className="acm-actions">
          <button className="acm-btn acm-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="acm-btn acm-btn-save"
            onClick={handleSave}
            disabled={saving || !imgLoaded}
          >
            {saving ? (
              <>
                <div className="acm-spinner" />
                Saving…
              </>
            ) : (
              "Use Photo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
