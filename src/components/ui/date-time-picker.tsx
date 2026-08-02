import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

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
  const ITEM_HEIGHT = 64; // Premium height
  const VISIBLE_ITEMS = 5;
  const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 320px
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingRef = React.useRef(false);
  const scrollTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const parentTimeout = React.useRef<NodeJS.Timeout | null>(null);
  
  const buttonsRef = React.useRef<(HTMLButtonElement | null)[]>([]);
  const prevIdxRef = React.useRef<number | null>(null);

  // Drag-to-scroll state
  const isDraggingRef = React.useRef(false);
  const dragStartYRef = React.useRef(0);
  const dragStartScrollTopRef = React.useRef(0);

  const activeClasses = ["font-black", "text-[#5D2A42]", "scale-110", "opacity-100"];
  const inactiveClasses = ["font-bold", "text-[#999]", "scale-90", "opacity-30"];

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
  }, []);

  const isMounted = React.useRef(false);

  React.useLayoutEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const currentIdx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
      if (currentIdx !== selectedIndex) {
        containerRef.current.scrollTo({ 
          top: selectedIndex * ITEM_HEIGHT, 
          behavior: !isMounted.current || Math.abs(currentIdx - selectedIndex) > 10 ? 'auto' : 'smooth' 
        });
      }
    }
    updateHighlight(selectedIndex);
    isMounted.current = true;
  }, [selectedIndex, updateHighlight]);

  const totalItems = items.length * repeat;

  // Strict but dynamic wheel interceptor
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    let accumulatedDelta = 0;
    let targetIdx = 0;
    let wheelTimeout: NodeJS.Timeout | null = null;
    
    const maxIdx = totalItems - 1;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent native scroll
      
      // If this is the start of a new scroll gesture, align our targetIdx to where the scrollbar physically is
      if (!wheelTimeout) {
         targetIdx = Math.round(el.scrollTop / ITEM_HEIGHT);
         accumulatedDelta = 0;
      }
      
      if (wheelTimeout) clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 150);
      
      accumulatedDelta += e.deltaY;
      
      // 60 pixels of trackpad/wheel delta equals 1 item tick
      const threshold = 60; 
      
      if (Math.abs(accumulatedDelta) >= threshold) {
        const ticks = Math.floor(Math.abs(accumulatedDelta) / threshold);
        const direction = Math.sign(accumulatedDelta);
        
        // Remove the processed delta
        accumulatedDelta -= direction * ticks * threshold;
        
        targetIdx += direction * ticks;
        
        // Clamp to prevent scrolling out of bounds
        if (targetIdx < 0) targetIdx = 0;
        if (targetIdx > maxIdx) targetIdx = maxIdx;
        
        // Smoothly zip exactly to the calculated item
        el.scrollTo({ top: targetIdx * ITEM_HEIGHT, behavior: 'smooth' });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [totalItems]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrollingRef.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    const idx = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT);
    updateHighlight(idx);

    if (parentTimeout.current) clearTimeout(parentTimeout.current);
    parentTimeout.current = setTimeout(() => {
      if (idx !== selectedIndex) {
        onIndexChange(idx);
      }
    }, 50);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return; // Let touch devices use native scrolling
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    if (containerRef.current) {
      dragStartScrollTopRef.current = containerRef.current.scrollTop;
      containerRef.current.style.scrollSnapType = 'none';
      containerRef.current.style.scrollBehavior = 'auto';
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    const deltaY = e.clientY - dragStartYRef.current;
    containerRef.current.scrollTop = dragStartScrollTopRef.current - deltaY;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (containerRef.current) {
      containerRef.current.style.scrollSnapType = 'y mandatory';
      containerRef.current.style.scrollBehavior = 'smooth';
      const currentIdx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
      containerRef.current.scrollTo({ top: currentIdx * ITEM_HEIGHT, behavior: 'smooth' });
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

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
              containerRef.current.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
              updateHighlight(i);
              onIndexChange(i);
            }
          }}
          style={{ height: ITEM_HEIGHT }}
          className="w-full shrink-0 snap-center snap-always flex items-center justify-center text-3xl md:text-4xl transition-all duration-300 font-bold text-[#999] scale-90 opacity-30 hover:opacity-70 hover:text-[#5D2A42] will-change-transform"
        >
          {item}
        </button>
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalItems]);

  const padding = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <div 
      ref={containerRef}
      style={{ height: CONTAINER_HEIGHT }}
      className="flex-1 overflow-y-auto snap-y snap-mandatory overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] will-change-scroll relative z-10 cursor-grab active:cursor-grabbing touch-pan-y"
      onScroll={handleScroll}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div style={{ paddingTop: padding, paddingBottom: padding }} className="flex flex-col items-center w-full">
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

  // Massive repeat counts to simulate infinite looping
  const HOUR_REPEAT = 100; // 1200 items
  const MIN_REPEAT = 40; // 2400 items
  const AMPM_REPEAT = 1; // Not infinite

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
          setAmpmIdx(prev => (prev === 0 ? 1 : 0));
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
            <div className="p-6 flex justify-center items-center bg-transparent w-full transition-all duration-500">
              <div className="flex flex-col items-center w-full max-w-[360px] mx-auto">
                <div className="mb-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-2xl font-bold text-[#5D2A42] mb-1">Select a Date</h3>
                  <p className="text-[#5D2A42]/70 text-sm max-w-[280px] mx-auto leading-relaxed">
                    When should this capsule unlock? You can choose any date up to 10 years in the future.
                  </p>
                </div>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={disabledDays}
                  captionLayout="dropdown-buttons"
                  fromYear={today.getFullYear()}
                  toYear={today.getFullYear() + 10}
                  className="bg-transparent w-full flex justify-center"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "w-full flex flex-col items-center",
                    caption: "flex justify-center pt-2 relative items-center w-full mb-2",
                    caption_label: "hidden", 
                    nav: "space-x-1 flex items-center absolute right-0 top-0",
                    nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-[#5D2A42]/10 text-[#5D2A42] rounded-full transition-all flex justify-center items-center",
                    nav_button_previous: "",
                    nav_button_next: "",
                    table: "w-full border-collapse space-y-1 mt-2",
                    head_row: "flex w-full justify-between gap-1",
                    head_cell: "text-[#5D2A42]/50 font-bold uppercase tracking-widest text-[10px] w-9 h-9 flex items-center justify-center rounded-md",
                    row: "flex w-full mt-2 justify-between gap-1",
                    cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-transparent [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 flex items-center justify-center",
                    day: "h-10 w-10 p-0 font-medium rounded-full hover:bg-[#5D2A42]/5 hover:text-[#5D2A42] aria-selected:opacity-100 transition-colors flex items-center justify-center text-[#5D2A42]",
                    day_selected: "bg-[#5D2A42] !text-white hover:bg-[#5D2A42]/90 hover:!text-white focus:bg-[#5D2A42] focus:!text-white rounded-full font-bold shadow-md shadow-[#5D2A42]/20",
                    day_today: "bg-[#5D2A42]/10 text-[#5D2A42] font-bold rounded-full",
                    day_disabled: "opacity-30 text-[#999] hover:bg-transparent hover:text-[#999] cursor-not-allowed",
                    day_outside: "text-[#999] opacity-50 aria-selected:bg-[#5D2A42]/50 aria-selected:text-white aria-selected:opacity-30",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full bg-white flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
               <div className="p-6 border-b border-[#E8E8E8] flex flex-col items-center justify-center gap-1">
                 <div className="flex items-center gap-2 mb-1 text-[#5D2A42]">
                    <Clock className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold text-[#5D2A42]">Set the Time</h3>
                 <p className="text-[10px] uppercase tracking-wider font-bold text-[#999]">Hr : Min : AM/PM</p>
                 <Button 
                   variant="ghost" 
                   onClick={() => setDate(undefined)} 
                   className="mt-4 h-10 px-5 bg-[#5D2A42]/5 text-[#5D2A42] rounded-full hover:bg-[#5D2A42]/10 hover:text-[#5D2A42] text-sm font-semibold transition-all flex items-center gap-2"
                 >
                    <CalendarIcon className="w-4 h-4 opacity-70" />
                    Change Date ({date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                 </Button>
               </div>
               
               <div className="flex-1 relative h-[320px] overflow-hidden select-none bg-white max-w-sm mx-auto w-full mt-6 mb-8">
                 
                 {/* Top Labels */}
                 <div className="absolute top-0 left-0 right-0 h-10 flex px-8 z-30 pointer-events-none">
                    <div className="flex-1 flex justify-center text-[10px] font-bold text-[#999] tracking-widest uppercase">Hour</div>
                    <div className="w-8"></div>
                    <div className="flex-1 flex justify-center text-[10px] font-bold text-[#999] tracking-widest uppercase">Min</div>
                    <div className="w-8"></div>
                    <div className="flex-1 flex justify-center text-[10px] font-bold text-[#999] tracking-widest uppercase">AM/PM</div>
                 </div>

                 <div className="flex h-full relative z-10 px-8 pt-6">
                   <InfiniteScrollColumn 
                     items={hoursList} 
                     selectedIndex={hourIdx} 
                     onIndexChange={setHourIdx} 
                     repeat={HOUR_REPEAT} 
                   />
                   <div className="flex flex-col justify-center items-center h-full text-[#5D2A42]/30 font-black text-4xl pb-1 z-10 pointer-events-none w-8">
                     :
                   </div>
                   <InfiniteScrollColumn 
                     items={minutesList} 
                     selectedIndex={minIdx} 
                     onIndexChange={setMinIdx} 
                     repeat={MIN_REPEAT} 
                   />
                   <div className="w-8" />
                   <InfiniteScrollColumn 
                     items={ampmList} 
                     selectedIndex={ampmIdx} 
                     onIndexChange={setAmpmIdx} 
                     repeat={AMPM_REPEAT} 
                   />
                 </div>
                 
                 {/* Top/Bottom Fade Gradients */}
                 <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white via-white/90 to-transparent pointer-events-none z-20" />
                 <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-20" />
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
