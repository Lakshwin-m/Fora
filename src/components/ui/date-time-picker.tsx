import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  time: string | null;
  setTime: (time: string | null) => void;
  className?: string;
}

function InfiniteScrollColumn({
  items,
  selectedIndex,
  onIndexChange,
  repeat = 100,
}: {
  items: string[];
  selectedIndex: number;
  onIndexChange: (idx: number) => void;
  repeat?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingRef = React.useRef(false);
  const scrollTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const parentTimeout = React.useRef<NodeJS.Timeout | null>(null);
  
  const buttonsRef = React.useRef<(HTMLButtonElement | null)[]>([]);
  const prevIdxRef = React.useRef<number | null>(null);

  const activeClasses = ["font-bold", "text-[#FB6376]", "scale-110"];
  const inactiveClasses = ["font-medium", "text-[#999]", "hover:text-[#5D2A42]", "scale-90", "opacity-60", "hover:opacity-100"];

  const updateHighlight = React.useCallback((idx: number) => {
    if (prevIdxRef.current === idx) return;
    
    if (prevIdxRef.current !== null) {
      const prevBtn = buttonsRef.current[prevIdxRef.current];
      if (prevBtn) {
        prevBtn.classList.remove(...activeClasses);
        prevBtn.classList.add(...inactiveClasses);
      }
    }
    
    const newBtn = buttonsRef.current[idx];
    if (newBtn) {
      newBtn.classList.remove(...inactiveClasses);
      newBtn.classList.add(...activeClasses);
    }
    
    prevIdxRef.current = idx;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMounted = React.useRef(false);

  React.useLayoutEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const currentIdx = Math.round(containerRef.current.scrollTop / 48);
      if (currentIdx !== selectedIndex) {
        containerRef.current.scrollTo({ 
          top: selectedIndex * 48, 
          behavior: !isMounted.current || Math.abs(currentIdx - selectedIndex) > 10 ? 'auto' : 'smooth' 
        });
      }
    }
    updateHighlight(selectedIndex);
    isMounted.current = true;
  }, [selectedIndex, updateHighlight]);

  const totalItems = items.length * repeat;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isAnimating = false;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating) return;

      const direction = Math.sign(e.deltaY);
      if (direction === 0) return;

      isAnimating = true;
      const targetIndex = selectedIndex + direction;

      if (targetIndex >= 0 && targetIndex < totalItems) {
        onIndexChange(targetIndex);
        container.scrollTo({
          top: targetIndex * 48,
          behavior: "smooth",
        });
      }

      setTimeout(() => {
        isAnimating = false;
      }, 200);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [selectedIndex, totalItems, onIndexChange]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrollingRef.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    const idx = Math.round(e.currentTarget.scrollTop / 48);
    
    // Instant DOM highlight update (bypassing React re-renders)
    updateHighlight(idx);

    // Debounce parent notification
    if (parentTimeout.current) clearTimeout(parentTimeout.current);
    parentTimeout.current = setTimeout(() => {
      if (idx !== selectedIndex) {
        onIndexChange(idx);
      }
    }, 100);
  };

  // Memoize the huge array of buttons so React NEVER diffs them on state changes
  const buttonsList = React.useMemo(() => {
    return Array.from({ length: totalItems }).map((_, i) => {
      const item = items[i % items.length];
      return (
        <button
          key={i}
          type="button"
          ref={el => { buttonsRef.current[i] = el; }}
          onClick={() => {
            if (containerRef.current) {
              isScrollingRef.current = true;
              containerRef.current.scrollTo({ top: i * 48, behavior: 'smooth' });
              updateHighlight(i);
              onIndexChange(i);
            }
          }}
          className="h-[48px] w-full shrink-0 snap-center flex items-center justify-center text-xl transition-all duration-200 font-medium text-[#999] hover:text-[#5D2A42] scale-90 opacity-60 hover:opacity-100 will-change-transform"
        >
          {item}
        </button>
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalItems]); // Exclude selectedIndex to guarantee no re-renders

  return (
    <div 
      ref={containerRef}
      className="flex-1 h-[240px] overflow-y-auto snap-y snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] will-change-scroll"
      onScroll={handleScroll}
    >
      <div style={{ paddingTop: 96, paddingBottom: 96 }} className="flex flex-col items-center w-full">
        {buttonsList}
      </div>
    </div>
  );
}

export function DateTimePicker({
  date,
  setDate,
  time,
  setTime,
  className,
}: DateTimePickerProps) {
  const [now] = React.useState(new Date());
  
  const initialParse = () => {
    if (time) {
      const [h, m] = time.split(":");
      let hh = parseInt(h);
      if (isNaN(hh)) hh = 12;
      const ampm = hh >= 12 ? "PM" : "AM";
      const hr12 = (hh % 12 || 12).toString().padStart(2, "0");
      return { hr12, minute: m || "00", ampm };
    } else {
      let hh = now.getHours();
      let mm = now.getMinutes();
      const ampm = hh >= 12 ? "PM" : "AM";
      const hr12 = (hh % 12 || 12).toString().padStart(2, "0");
      const minStr = mm.toString().padStart(2, "0");
      return {
        hr12,
        minute: minStr,
        ampm
      };
    }
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const ampmList = ["AM", "PM"];

  const HOUR_REPEAT = 100;
  const MIN_REPEAT = 40;
  const AMPM_REPEAT = 100;

  const init = initialParse();
  
  const startHourAbs = Math.floor(HOUR_REPEAT / 2) * hoursList.length; 
  const startHourIndex = startHourAbs + hoursList.indexOf(init.hr12);

  const startMinAbs = Math.floor(MIN_REPEAT / 2) * minutesList.length; 
  const startMinIndex = startMinAbs + minutesList.indexOf(init.minute);

  const startAmpmAbs = Math.floor(AMPM_REPEAT / 2) * ampmList.length; 
  const startAmpmIndex = startAmpmAbs + ampmList.indexOf(init.ampm);

  const [hourIdx, setHourIdx] = React.useState(startHourIndex);
  const [minIdx, setMinIdx] = React.useState(startMinIndex);
  const [ampmIdx, setAmpmIdx] = React.useState(startAmpmIndex);

  const prevHourIdx = React.useRef(startHourIndex);

  React.useEffect(() => {
    const oldIdx = prevHourIdx.current;
    const newIdx = hourIdx;
    
    if (oldIdx !== newIdx) {
      const oldFlip = Math.floor((oldIdx + 1) / 12);
      const newFlip = Math.floor((newIdx + 1) / 12);
      const flipDiff = newFlip - oldFlip;
      
      if (flipDiff !== 0) {
        if (Math.abs(flipDiff) % 2 === 1) {
          setAmpmIdx(prev => prev + Math.sign(flipDiff));
        }
      }
      prevHourIdx.current = newIdx;
    }
  }, [hourIdx]);

  React.useEffect(() => {
    if (!date) return;
    
    const hrStr = hoursList[hourIdx % hoursList.length];
    const minStr = minutesList[minIdx % minutesList.length];
    const apStr = ampmList[ampmIdx % ampmList.length];

    let hh = parseInt(hrStr);
    if (apStr === "PM" && hh !== 12) hh += 12;
    if (apStr === "AM" && hh === 12) hh = 0;
    const hhStr = hh.toString().padStart(2, "0");
    
    // Debounce updating the parent state to prevent massive re-renders
    const tId = setTimeout(() => {
      setTime(`${hhStr}:${minStr}`);
    }, 50);
    return () => clearTimeout(tId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourIdx, minIdx, ampmIdx, setTime, date]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  
  const disabledDays = [
    { before: today },
    { after: maxDate }
  ];

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="p-0 border-[#E8E8E8] shadow-sm bg-white rounded-[2rem] overflow-hidden">
        <CardContent className="p-0 flex flex-col md:flex-row min-h-[380px]">
          {/* Calendar Section */}
          {!date ? (
            <div className="p-6 flex justify-center items-center bg-[#FFF9EC] w-full transition-all duration-500">
              <div className="flex flex-col items-center w-full">
                <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">Select a Date</h3>
                  <p className="text-[#5D2A42]/70 text-sm max-w-[280px] mx-auto leading-relaxed">
                    When should this capsule unlock? You can choose any date up to 10 years in the future.
                  </p>
                </div>
                <Calendar
                  selected={date}
                  onSelect={setDate}
                  disabled={disabledDays}
                  className="p-3 bg-white rounded-2xl border border-[#E8E8E8] shadow-sm"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-bold text-[#5D2A42]",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-[#FFF9EC] text-[#5D2A42] rounded-full transition-all flex justify-center items-center",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-[#5D2A42]/50 font-bold uppercase tracking-widest text-[10px] w-9 rounded-md",
                    row: "flex w-full mt-2",
                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-transparent [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-medium rounded-full hover:bg-[#FFF9EC] hover:text-[#5D2A42] aria-selected:opacity-100 transition-colors",
                    day_selected: "bg-[#FB6376] text-white hover:bg-[#FB6376] hover:text-white focus:bg-[#FB6376] focus:text-white rounded-full font-bold",
                    day_today: "bg-[#FFF9EC] text-[#5D2A42] font-bold rounded-full",
                    day_disabled: "opacity-30 text-[#999] hover:bg-transparent hover:text-[#999] cursor-not-allowed",
                    day_outside: "text-[#999] opacity-50 aria-selected:bg-[#FB6376]/50 aria-selected:text-white aria-selected:opacity-30",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full bg-white flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
               <div className="p-6 border-b border-[#E8E8E8] flex flex-col items-center justify-center gap-1">
                 <div className="flex items-center gap-2 mb-1 text-[#FB6376]">
                    <Clock className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold text-[#5D2A42]">Set the Time</h3>
                 <p className="text-[10px] uppercase tracking-wider font-bold text-[#999]">Hr : Min : AM/PM</p>
                 <Button 
                   variant="outline" 
                   onClick={() => setDate(undefined)} 
                   className="mt-4 h-11 px-6 text-[#5D2A42] border-2 border-[#E8E8E8] rounded-xl hover:border-[#FB6376] hover:bg-[#FFF9EC] hover:text-[#FB6376] text-sm font-bold shadow-none transition-colors"
                 >
                    Change Date ({date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                 </Button>
               </div>
               
               <div className="flex-1 relative h-[240px] overflow-hidden select-none bg-white max-w-sm mx-auto w-full mt-6 mb-6">
                 {/* Center Highlight Band */}
                 <div className="absolute top-[96px] left-4 right-4 h-[48px] bg-[#FFF9EC] border border-[#FFDCCC] rounded-xl pointer-events-none z-0" />
                 
                 <div className="flex h-full relative z-10 px-8">
                   <InfiniteScrollColumn 
                     items={hoursList} 
                     selectedIndex={hourIdx} 
                     onIndexChange={setHourIdx} 
                     repeat={HOUR_REPEAT} 
                   />
                   <div className="flex flex-col justify-center items-center h-full text-[#5D2A42]/30 font-black text-2xl pb-1 z-10 pointer-events-none w-6">
                     :
                   </div>
                   <InfiniteScrollColumn 
                     items={minutesList} 
                     selectedIndex={minIdx} 
                     onIndexChange={setMinIdx} 
                     repeat={MIN_REPEAT} 
                   />
                   <div className="w-6" />
                   <InfiniteScrollColumn 
                     items={ampmList} 
                     selectedIndex={ampmIdx} 
                     onIndexChange={setAmpmIdx} 
                     repeat={AMPM_REPEAT} 
                   />
                 </div>
                 
                 {/* Top/Bottom Fade Gradients */}
                 <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-20" />
                 <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20" />
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
