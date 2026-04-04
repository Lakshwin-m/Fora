import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  time: string | null;
  setTime: (time: string | null) => void;
  className?: string;
}

export function DateTimePicker({
  date,
  setDate,
  time,
  setTime,
  className,
}: DateTimePickerProps) {
  const now = new Date();
  
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
      const ampm = hh >= 12 ? "PM" : "AM";
      const hr12 = (hh % 12 || 12).toString().padStart(2, "0");
      return {
        hr12,
        minute: now.getMinutes().toString().padStart(2, "0"),
        ampm
      };
    }
  };

  const init = initialParse();
  const [hr12, setHr12] = React.useState<string>(init.hr12);
  const [minute, setMinute] = React.useState<string>(init.minute);
  const [ampm, setAmpm] = React.useState<string>(init.ampm);

  React.useEffect(() => {
    let hh = parseInt(hr12);
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    const hhStr = hh.toString().padStart(2, "0");
    setTime(`${hhStr}:${minute}`);
  }, [hr12, minute, ampm, setTime]);

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const ampmList = ["AM", "PM"];

  const disabledDays = { before: new Date() };

  // Refs for auto-scrolling
  const hourRef = React.useRef<HTMLButtonElement>(null);
  const minuteRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (hourRef.current) hourRef.current.scrollIntoView({ block: "center" });
    if (minuteRef.current) minuteRef.current.scrollIntoView({ block: "center" });
  }, []); // Run once on mount

  return (
    <Card className={cn("gap-0 p-0 border-[#E8E8E8] shadow-sm bg-white text-[#1A1A1A] overflow-hidden group/dtpicker", className)}>
      <CardContent className="relative p-0 flex flex-col md:flex-row">
        <div className="p-4 md:p-6 flex-1 flex justify-center items-center bg-[#fafafa]">
          <Calendar
            selected={date}
            onSelect={setDate}
            disabled={disabledDays}
            className="p-0"
          />
        </div>
        
        {/* Time Picker Section */}
        <div className="md:w-64 border-t md:border-t-0 md:border-l border-[#E8E8E8] bg-white flex flex-col">
           <div className="p-4 border-b border-[#E8E8E8] bg-[#f8f8f8]">
             <h3 className="text-sm font-semibold text-center text-[#1A1A1A]">Select exact time</h3>
             <div className="text-xs text-center text-[#666] mt-1">Hr : Min : AM/PM</div>
           </div>
           
           <div className="flex h-48 md:h-[280px] overflow-hidden">
             {/* Hours Column */}
             <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[#E8E8E8] py-2 snap-y snap-mandatory bg-white">
                <div className="space-y-1 px-1">
                  {hoursList.map((h) => (
                    <Button
                      key={`h-${h}`}
                      ref={hr12 === h ? hourRef : null}
                      type="button"
                      variant="ghost"
                      onClick={() => setHr12(h)}
                      className={cn(
                        "w-full h-10 scroll-m-2 snap-start flex items-center justify-center font-medium text-sm transition-all rounded-md px-0",
                        hr12 === h 
                          ? "bg-[#FB6376] text-white hover:bg-[#e8556a]" 
                          : "text-[#666] hover:bg-[#FB6376]/10 hover:text-[#FB6376]"
                      )}
                    >
                      {h}
                    </Button>
                  ))}
                </div>
             </div>

             {/* Minutes Column */}
             <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[#E8E8E8] py-2 snap-y snap-mandatory bg-white">
                <div className="space-y-1 px-1">
                  {minutesList.map((m) => (
                    <Button
                      key={`m-${m}`}
                      ref={minute === m ? minuteRef : null}
                      type="button"
                      variant="ghost"
                      onClick={() => setMinute(m)}
                      className={cn(
                        "w-full h-10 scroll-m-2 snap-start flex items-center justify-center font-medium text-sm transition-all rounded-md px-0",
                        minute === m 
                          ? "bg-[#FB6376] text-white hover:bg-[#e8556a]" 
                          : "text-[#666] hover:bg-[#FB6376]/10 hover:text-[#FB6376]"
                      )}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
             </div>

             {/* AM/PM Column */}
             <div className="flex-1 overflow-y-auto no-scrollbar py-2 snap-y snap-mandatory bg-white">
                <div className="space-y-1 px-1">
                  {ampmList.map((ap) => (
                    <Button
                      key={`ap-${ap}`}
                      type="button"
                      variant="ghost"
                      onClick={() => setAmpm(ap)}
                      className={cn(
                        "w-full h-10 scroll-m-2 snap-start flex items-center justify-center font-medium text-sm transition-all rounded-md px-0",
                        ampm === ap 
                          ? "bg-[#FB6376] text-white hover:bg-[#e8556a]" 
                          : "text-[#666] hover:bg-[#FB6376]/10 hover:text-[#FB6376]"
                      )}
                    >
                      {ap}
                    </Button>
                  ))}
                </div>
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
