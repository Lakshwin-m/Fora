const fs = require('fs');
const path = 'c:\\Users\\Lakshwin\\localhost\\Fora_V3_STABLE\\Fora\\src\\pages\\Garden.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const goodPart = lines.slice(0, 625);

const correctEnding = `                  >
                    💧
                  </button>
                )}

                {/* Max bloom sparkle */}
                {isHovered && isMaxed && (
                  <div className="garden-sparkle-icon absolute -top-8 left-1/2 -translate-x-1/2 z-50 text-xl pointer-events-none">
                    ✨
                  </div>
                )}

                {/* Splash effect */}
                {isSplashing && (
                  <div
                    className="garden-splash absolute left-1/2 bottom-0 w-20 h-20 rounded-full bg-blue-300/40 z-40"
                  />
                )}

                {/* Growth stage indicator (only for non-maxed flowers on hover) */}
                {isHovered && !isMaxed && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 pointer-events-none">
                    {[0, 1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={\`w-1.5 h-1.5 rounded-full transition-colors \${lvl <= growthLevel
                          ? "bg-green-500"
                          : "bg-gray-300"
                          }\`}
                      />
                    ))}
                  </div>
                )}

                <img
                  src={FLOWER_METADATA[flower.flower].image}
                  alt={flower.title}
                  width={
                    flower.flower === "blue-forget-me-not" ||
                      flower.flower === "white-rose"
                      ? 115
                      : 100
                  }
                  draggable={false}
                  className={\`relative z-[1] transition-all duration-700 ease-in-out
                    \${userState === "normal"
                      ? "animate-sway hover:scale-110 flower-hover-glow"
                      : ""
                    }
                    \${newlyPlantedFlowerId === flower.id
                      ? "animate-new-flower"
                      : isSelected && userState === "viewing"
                        ? "animate-viewing-flower"
                        : ""
                    }
                  \`}
                  style={{
                    animationDelay:
                      userState === "normal"
                        ? \`\${(flower.x % 20) * 0.1}s\`
                        : "0s",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* End Background Layer */}
      </div>

      {/* Overlay UI (Navigation arrows, Music Player, etc. - These stay outside the scaled world so they don't stretch) */}
      {userState === "normal" && (
        <>
          {currentZone > 0 && (
            <button
              onClick={() => setCurrentZone((p) => Math.max(0, p - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/50 hover:bg-white/80 rounded-full shadow-lg backdrop-blur transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {currentZone < maxZone && (
            <button
              onClick={() => setCurrentZone((p) => Math.min(maxZone, p + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/50 hover:bg-white/80 rounded-full shadow-lg backdrop-blur transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </>
      )}

      <MusicPlayer />

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 px-4 py-2 rounded z-30">
          {error}
        </div>
      )}

      <PlantingDrawer
        isOpen={userState === "planting"}
        onClose={handleExitPlanting}
        clickPosition={plantingPosition}
        currentOffset={0}
        onPlantSuccess={handlePlantSuccess}
      />

      <FlowerDetailModal
        flower={selectedFlower}
        isOpen={userState === "viewing"}
        onClose={handleExitViewing}
        growthLevel={selectedFlower ? (growthLevels[selectedFlower.id] ?? 3) : 3}
        canWater={selectedFlower ? canWater(selectedFlower.id) : false}
        onWater={selectedFlower ? () => handleWater(selectedFlower.id) : undefined}
      />

      <InfoModal />
    </div>
  );
}

export default Garden;
`;

const finalContent = goodPart.join('\n') + '\n' + correctEnding;
fs.writeFileSync(path, finalContent);
console.log("File fixed!");
