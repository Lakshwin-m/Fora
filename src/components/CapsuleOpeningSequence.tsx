import React, { useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import gsap from "gsap";
import { WaxSeal } from "./WaxSeal";

interface CapsuleOpeningSequenceProps {
  capsuleTitle: string;
  decryptedContent: React.ReactNode;
  creatorName: string;
  onComplete: () => void;
}

export const CapsuleOpeningSequence: React.FC<CapsuleOpeningSequenceProps> = ({
  capsuleTitle,
  decryptedContent,
  creatorName,
  onComplete,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const envelopeContainerRef = useRef<HTMLDivElement>(null);
  const backPlateRef = useRef<HTMLDivElement>(null);
  const leftFlapRef = useRef<HTMLDivElement>(null);
  const rightFlapRef = useRef<HTMLDivElement>(null);
  const bottomFlapRef = useRef<HTMLDivElement>(null);
  const topFlapRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const letterContentRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // 🛠️ GSAP Context for proper React cleanup
    const ctx = gsap.context(() => {
      // 1. Initial State configuration
      gsap.set(envelopeContainerRef.current, {
        y: -50,
        opacity: 0,
      });

      gsap.set(sealRef.current, {
        xPercent: -50,
        yPercent: -50,
        scale: 1,
        opacity: 1,
      });

      gsap.set(topFlapRef.current, {
        rotateX: 0,
      });

      gsap.set(letterRef.current, {
        left: "50%",
        top: "50%",
        xPercent: -50,
        yPercent: -50,
        scale: 0.45,
        y: 20,
        opacity: 1,
      });

      gsap.set(letterContentRef.current, {
        opacity: 0,
      });

      gsap.set([buttonRef.current, closeButtonRef.current], {
        opacity: 0,
        y: 15,
      });

      // 🎬 Animation Timeline Choreography
      const tl = gsap.timeline({
        delay: 0.4, // Short delay to allow overlay mounting fade-in
        onComplete: onComplete, // Add this line to call onComplete when the timeline finishes
      });

      // Step 1: The Presentation (envelope drops in and fades in)
      tl.to(envelopeContainerRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power2.out",
      });

      // Step 2: Breaking the Seal (wax seal pulses, then shatters/fades out)
      /*tl.to(sealRef.current, {
        scale: 1.15,
        duration: 0.4,
        ease: "power2.inOut",
      })
      .to(sealRef.current, {
        scale: 0.95,
        duration: 0.2,
        ease: "power2.inOut",
      })
      .to(sealRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.35,
        ease: "back.in(1.7)",
      }, "+=0.1");
*/
      // Stage 3: Flap Opens (Top Triangle Rotates) - MODIFIED to include seal animation
    tl.to(topFlapRef.current, {
        rotateX: 180,
        duration: 0.65,
        ease: "power2.inOut",
        onComplete: () => {
            gsap.set(topFlapRef.current, { zIndex: 10 }); // Keep z-index adjustment
        }
    }, ">"); // Start after Stage 1 completes

    // NEW: Seal "peeling off" with the flap
    tl.to(sealRef.current, {
        rotateX: 180,       // Rotate with the flap
        y: -50,             // Move up as it peels off (adjust this value for visual effect)
        opacity: 0,         // Fade out as it peels away
        scale: 0.5,         // Shrink slightly as it peels away (adjust this value for visual effect)
        duration: 0.65,     // Same duration as the flap opening
        ease: "power2.inOut",
    }, "<"); // Start this animation *simultaneously* with the topFlapRef animation

      // Stage 4: The Reveal (Letter Slides Up) - MODIFIED with "popping out" and initial color
    tl.fromTo(letterRef.current, {
        y: 20,              // Starting position inside envelope
        scale: 0.45,        // Initial scale as per summary's expansion scale
        backgroundColor: "#FFFFFF", // Set the initial paper color. Use your desired hex code.
    }, {
        y: -180,            // Slides upward out of envelope
        scale: 1.05,        // "Popping out" effect: scale slightly larger than its final size initially
        duration: 0.8,
        ease: "power2.out",
    }, ">-0.2"); // Start slightly before the flap finishes opening for a smoother transition

      // Step 5: Full Screen Expansion (envelope components fade out, letter centers & scales up)
      tl.to([
        backPlateRef.current,
        leftFlapRef.current,
        rightFlapRef.current,
        bottomFlapRef.current,
        topFlapRef.current
      ], {
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
      })
      .to(letterRef.current, {
        scale: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.inOut",
      }, "<") // Start parallel execution
      .to(letterContentRef.current, {
        opacity: 1,
        duration: 0.6,
        ease: "power1.out",
      }, "-=0.3"); // Fade content in towards the end of expansion

      // Step 6: User Hand-off (action buttons fade in)
      tl.to([buttonRef.current, closeButtonRef.current], {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.15,
        ease: "power2.out",
      });

      tl.play();

    }, overlayRef);

    // 🧹 Clean up GSAP context to prevent memory leaks and strict-mode bugs
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden backdrop-blur-md bg-[#FFF9EC]/90 p-4"
    >
      {/* Centered Animation Wrapper */}
      <div
        ref={envelopeContainerRef}
        className="relative w-[320px] h-[220px] sm:w-[420px] sm:h-[285px] [perspective:1200px] flex items-center justify-center"
      >
        {/* ENVELOPE BASE / BACK PLATE (Z-index: 0) */}
        <div
          ref={backPlateRef}
          className="absolute inset-0 bg-[#FFF9EC] rounded-2xl border border-[#E8E8E8] shadow-lg z-0"
        />

        {/* TOP FLAP (Z-index: 40 Closed, 10 Open) */}
        <div
          ref={topFlapRef}
          className="absolute top-0 left-0 w-full h-[55%] bg-[#FCB1A6] origin-top z-40"
          style={{
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
        />

        {/* THE LETTER CARD: Animates out of the envelope and scales to center (Z-index: 20) */}
        <div
          ref={letterRef}
          className="absolute left-1/2 top-1/2 w-[90vw] max-w-xl h-[70vh] max-h-[500px] bg-white rounded-2xl border border-[#E8E8E8] z-20 flex flex-col p-6 sm:p-8 relative shadow-2xl"
          style={{
            transformOrigin: "center center",
          }}
        >
          {/* Top-Right "X" Close Button (Step 6) */}
          <button
            ref={closeButtonRef}
            onClick={onComplete}
            aria-label="Close overlay"
            className="absolute top-4 right-4 p-2 rounded-full border border-[#E8E8E8] text-[#5D2A42] hover:scale-105 active:scale-95 transition-transform bg-[#FFF9EC] z-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Letter Scrollable Content Container (Step 5) */}
          <div
            ref={letterContentRef}
            className="flex flex-col h-full w-full relative"
          >
            {/* Header / Motif */}
            <div className="flex flex-col items-center pt-2">
              <div className="w-10 h-10 rounded-full bg-[#FFDCCC] flex items-center justify-center text-[#FB6376]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-[#5D2A42] tracking-wide text-center mt-3">
                {capsuleTitle || "Unsealed Capsule"}
              </h2>
              <div className="w-16 h-[2px] bg-[#FCB1A6] mt-3" />
            </div>

            {/* Decrypted content area */}
            <div className="flex-1 overflow-y-auto my-6 pr-1 text-[#1A1A1A] font-sans text-base leading-relaxed scrollbar-thin scrollbar-thumb-[#E8E8E8] scrollbar-track-transparent">
              {decryptedContent}
            </div>

            {/* Decorative Wax Seal stamped on the expanded letter page */}
            <div className="absolute right-4 bottom-16 opacity-75 transform rotate-6 pointer-events-none hidden sm:block">
              <WaxSeal name={creatorName} className="w-12 h-12 text-[7px]" />
            </div>

            {/* Footer / Continue button (Step 6) */}
            <div className="pt-2 border-t border-[#E8E8E8] z-10">
              <button
                ref={buttonRef}
                onClick={onComplete}
                className="w-full py-3 bg-[#FB6376] text-white font-semibold font-heading rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform text-center cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        {/* LEFT FLAP (Z-index: 30) */}
        <div
          ref={leftFlapRef}
          className="absolute inset-0 w-1/2 h-full bg-[#FFDCCC] z-30"
          style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
        />

        {/* RIGHT FLAP (Z-index: 30) */}
        <div
          ref={rightFlapRef}
          className="absolute inset-0 left-1/2 w-1/2 h-full bg-[#FFDCCC] z-30"
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 50%)" }}
        />

        {/* BOTTOM FLAP (Z-index: 35) */}
        <div
          ref={bottomFlapRef}
          className="absolute bottom-0 left-0 w-full h-[60%] bg-[#FCB1A6] z-[35]"
          style={{ clipPath: "polygon(0 100%, 100% 100%, 50% 0)" }}
        />

        {/* WAX SEAL (Z-index: 50, centered at the flap tip) */}
        <div
          ref={sealRef}
          className="absolute left-1/2 top-[55%] z-50 pointer-events-none select-none"
        >
          <WaxSeal name={creatorName} className="w-16 h-16 text-[9px]" />
        </div>
      </div>
    </div>
  );
};

export default CapsuleOpeningSequence;
