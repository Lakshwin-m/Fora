import { useState, useEffect } from "react";

import { Info, X } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export function InfoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Info Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-white/80 rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 transition-all"
        aria-label="App Information"
      >
        <Info className="w-6 h-6 text-gray-700" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50 animate-modal-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className="bg-blue-50 rounded-2xl shadow-2xl w-[90%] max-w-4xl px-8 py-12 pointer-events-auto animate-modal-slide-from-bottom-right relative"
              style={{
                transformOrigin: "bottom right",
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Content */}
              <div className="flex gap-8 items-center">
                {/* Flower Image */}
                <div className="flex-shrink-0 overflow-hidden">
                  <img
                    src="/special_flower.png"
                    alt="Special Flower"
                    width={400}
                    height={400}
                    className="w-[300px] h-[300px] object-contain scale-110"
                    style={{ outline: "none", border: "none" }}
                  />
                </div>

                {/* Description */}
                <div className="flex-1 space-y-4">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {t('garden.tutorialTitle')}
                  </h2>

                  <p className="text-gray-700 leading-relaxed">
                    {t('garden.tutorialDesc')}
                  </p>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('garden.tutorialHowTo')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>{t('garden.tutorialStep1')}</li>
                      <li>{t('garden.tutorialStep2')}</li>
                      <li>{t('garden.tutorialStep3')}</li>
                      <li>{t('garden.tutorialStep4')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
