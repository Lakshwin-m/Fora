// src/components/SealCapsuleModal.tsx
// ---------------------------------------------------------
// SealCapsuleModal.tsx – Modal for sealing time capsules
// with signature capture, animation, and sound effects
// ---------------------------------------------------------
import React, { useState, useRef, useEffect } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { X, RotateCcw, CheckCircle2, Lock } from "lucide-react";

// Animation and sound assets
import timeTravelAnimation from "@/assets/time animation.json";

interface SealCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSealComplete: (signatureData: string) => void;
  capsuleTitle?: string;
  capsuleId?: string;
}

const SealCapsuleModal: React.FC<SealCapsuleModalProps> = ({
  isOpen,
  onClose,
  onSealComplete,
  capsuleTitle = "Your Time Capsule",
  capsuleId = "temp-id",
}) => {
  // Signature state
  const signatureCanvasRef = useRef<ReactSignatureCanvas>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);

  // Sealing process state
  const [isSealing, setIsSealing] = useState(false);
  const [isSealed, setIsSealed] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Animation ref
  const animationRef = useRef<any>(null);

  // Audio ref for tick sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Create audio element for tick sound - use a simple beep if no audio file
        audioRef.current = new Audio(
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ" // Base64 encoded beep sound
        );
        audioRef.current.volume = 0.3;
        audioRef.current.preload = "auto";
      } catch (error) {
        console.warn("Could not load tick sound:", error);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSealing) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSealing, onClose]);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  // Handle signature drawing
  const handleSignatureEnd = () => {
    if (!signatureCanvasRef.current) return;

    const isEmpty = signatureCanvasRef.current.isEmpty();
    setIsSignatureEmpty(isEmpty);

    if (!isEmpty) {
      const signatureData = signatureCanvasRef.current.toDataURL("image/png");
      setSignature(signatureData);
    }
  };

  // Clear signature
  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
      setSignature(null);
      setIsSignatureEmpty(true);
    }
  };

  // Mock backend API call to seal capsule
  const mockSealCapsule = async (
    capsuleId: string,
    signatureData: string
  ): Promise<boolean> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(
      "Capsule sealed with signature:",
      signatureData.slice(0, 50) + "..."
    );
    return true;
  };

  // Play tick sound
  const playTickSound = async () => {
    if (!audioRef.current) {
      // Fallback: Create a simple beep using Web Audio API
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.1;

        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      } catch (error) {
        console.warn("Could not play sound:", error);
      }
      return;
    }

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (error) {
      console.warn("Could not play tick sound:", error);
    }
  };

  // Handle animation completion
  const handleAnimationComplete = async () => {
    setAnimationComplete(true);

    // Play tick sound at the end of animation
    await playTickSound();

    // Wait a brief moment for sound to play
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mark as sealed and hide animation
    setIsSealed(true);
    setShowAnimation(false);

    // Notify parent component after a brief delay
    setTimeout(() => {
      if (signature) {
        onSealComplete(signature);
      }
      toast({
        title: "Capsule Sealed! 🎉",
        description: `"${capsuleTitle}" is now locked until its unlock date`,
      });
    }, 500);
  };

  // Handle sealing process
  const handleSealCapsule = async () => {
    if (!signature || isSignatureEmpty) {
      toast({
        title: "Signature required",
        description: "Please draw your signature before sealing",
        variant: "destructive",
      });
      return;
    }

    // Step 1: Start sealing process
    setIsSealing(true);

    try {
      // Step 2: Call backend to seal capsule (instant)
      const success = await mockSealCapsule(capsuleId, signature);

      if (!success) {
        throw new Error("Failed to seal capsule");
      }

      // Step 3: Show animation after backend success
      setShowAnimation(true);
      setAnimationComplete(false);
    } catch (error) {
      console.error("Error sealing capsule:", error);
      toast({
        title: "Sealing failed",
        description: "Please try again",
        variant: "destructive",
      });
      setIsSealing(false);
      setShowAnimation(false);
    }
  };

  // Reset modal state
  const resetModal = () => {
    clearSignature();
    setIsSealing(false);
    setIsSealed(false);
    setShowAnimation(false);
    setAnimationComplete(false);
  };

  // Handle modal close
  const handleClose = () => {
    if (isSealing || showAnimation) return; // Prevent closing during sealing process

    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen animation overlay */}
      {showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl h-96">
            <Lottie
              lottieRef={animationRef}
              animationData={timeTravelAnimation}
              loop={false}
              autoplay={true}
              className="w-full h-full"
              onComplete={handleAnimationComplete}
              onLoopComplete={handleAnimationComplete}
            />
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <p className="text-white/80 text-lg font-medium animate-pulse">
                {animationComplete
                  ? "Sealing complete!"
                  : "Sealing your memories for the future..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main modal */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <Card className="w-full max-w-2xl border-2 border-[#5D2A42]/20 bg-[#FFF9EC] shadow-2xl">
          <CardHeader className="border-b border-[#5D2A42]/10 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FB6376] to-[#FCB1A6] rounded-xl flex items-center justify-center shadow-lg">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-[#5D2A42]">
                    {isSealed ? "Capsule Sealed!" : "Seal Your Capsule"}
                  </CardTitle>
                  <CardDescription className="text-[#5D2A42]/70">
                    {isSealed
                      ? "Your memories are now locked for the future"
                      : `Sign to seal "${capsuleTitle}" until its unlock date`}
                  </CardDescription>
                </div>
              </div>

              {!isSealing && !isSealed && !showAnimation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-[#5D2A42] hover:bg-[#FFDCCC]"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {isSealed ? (
              // Sealed state
              <div className="text-center py-12 space-y-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl animate-scale-up">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-[#5D2A42] rounded-full flex items-center justify-center animate-bounce">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-[#5D2A42]">
                    Successfully Sealed! 🔒
                  </h3>
                  <p className="text-[#5D2A42]/70 max-w-md mx-auto">
                    Your time capsule is now locked and cannot be modified. It
                    will automatically unlock on its scheduled date.
                  </p>
                </div>

                {/* Signature preview */}
                {signature && (
                  <div className="mt-6 p-4 bg-white/50 rounded-lg border border-[#5D2A42]/20">
                    <p className="text-sm text-[#5D2A42]/60 mb-2">
                      Your Signature:
                    </p>
                    <div className="flex justify-center">
                      <img
                        src={signature}
                        alt="Signature"
                        className="h-16 object-contain bg-white p-2 rounded border"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-6">
                  <Button
                    onClick={handleClose}
                    className="bg-gradient-to-r from-[#FB6376] to-[#FCB1A6] text-white px-8 py-6 text-lg hover:shadow-xl transition-all"
                  >
                    View Sealed Capsule
                  </Button>
                </div>
              </div>
            ) : (
              // Signing state
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-[#FFDCCC]/30 to-[#FCB1A6]/30 rounded-lg border border-[#FB6376]/30">
                  <p className="text-sm text-[#5D2A42]">
                    <span className="font-semibold">Important:</span> Once
                    sealed, this capsule cannot be edited or deleted until its
                    unlock date. Your signature confirms this is your final
                    version.
                  </p>
                </div>

                {/* Signature canvas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#5D2A42]">
                      Draw your signature below:
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      disabled={isSignatureEmpty || isSealing || showAnimation}
                      className="text-[#5D2A42] hover:text-[#FB6376]"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-[#5D2A42]/30 rounded-lg overflow-hidden bg-white">
                    <ReactSignatureCanvas
                      ref={signatureCanvasRef}
                      penColor="#5D2A42"
                      canvasProps={{
                        width: 700,
                        height: 200,
                        className: "w-full h-50 touch-none bg-white",
                      }}
                      onEnd={handleSignatureEnd}
                      backgroundColor="white"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <p className="text-[#5D2A42]/60">
                      {isSignatureEmpty
                        ? "Draw your signature in the box above"
                        : '✓ Signature captured. Click "Seal Capsule" to continue.'}
                    </p>
                    <div
                      className={`px-3 py-1 rounded-full ${
                        isSignatureEmpty
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isSignatureEmpty
                        ? "Signature required"
                        : "Ready to seal"}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-[#5D2A42]/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSealing || showAnimation}
                    className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearSignature}
                      disabled={isSignatureEmpty || isSealing || showAnimation}
                      className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                    >
                      Clear & Restart
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSealCapsule}
                      disabled={isSignatureEmpty || isSealing || showAnimation}
                      className="relative overflow-hidden bg-gradient-to-r from-[#FB6376] to-[#FCB1A6] text-white px-8 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSealing ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-[#FB6376] to-[#FCB1A6] animate-shimmer"></div>
                          <span className="relative flex items-center">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                            Sealing...
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 mr-3" />
                          Seal Capsule
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes scale-up {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-scale-up {
          animation: scale-up 0.5s ease-out forwards;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        /* Signature canvas touch improvements */
        .touch-none {
          touch-action: none;
        }
      `}</style>
    </>
  );
};

export default SealCapsuleModal;
