import React, { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageSrc: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } // Try to get the front camera
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Please allow camera access in your browser settings to take a photo.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image string
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
    stopCamera();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white border-[#5D2A42]/10 rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-[#5D2A42]/10">
          <DialogTitle className="text-xl font-bold text-[#5D2A42] flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#FB6376]" />
            Take a Photo
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 flex flex-col items-center justify-center min-h-[300px] bg-black/5 relative">
          {error ? (
            <div className="text-center text-[#5D2A42]/70 max-w-xs">
              <p>{error}</p>
              <Button 
                onClick={startCamera} 
                variant="outline" 
                className="mt-4 border-[#5D2A42]/20"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-[320px] aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {!isReady && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/50">
                    <Loader2 className="w-8 h-8 animate-spin text-[#FB6376] mb-2" />
                    <p className="text-sm font-medium">Starting camera...</p>
                  </div>
                )}
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover transform ${isReady ? "scale-x-[-1]" : ""} transition-opacity duration-300 ${isReady ? "opacity-100" : "opacity-0"}`} 
                />
              </div>
              
              <div className="mt-6 flex justify-center w-full">
                <Button 
                  onClick={handleCapture}
                  disabled={!isReady}
                  className="w-16 h-16 rounded-full bg-[#FB6376] hover:bg-[#e8556a] text-white shadow-lg shadow-[#FB6376]/30 transition-transform active:scale-95 border-4 border-white flex items-center justify-center p-0"
                  aria-label="Take photo"
                >
                  <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraModal;
