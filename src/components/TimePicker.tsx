import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value?: string;
  onSelect: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({
  value = "",
  onSelect,
  placeholder = "HH:MM",
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internalTime, setInternalTime] = React.useState<{
    hours: string;
    minutes: string;
    period: "AM" | "PM";
  }>({
    hours: "",
    minutes: "",
    period: "AM",
  });
  const [currentTime, setCurrentTime] = React.useState<Date>(new Date());

  // Refs for scrolling
  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);

  // Get next minute in 24-hour format for default
  const getNextMinute = () => {
    const now = new Date();
    const nextMinute = new Date(now.getTime() + 60000);
    const hour24 = nextMinute.getHours();
    const hour12 = hour24 % 12 || 12;
    const period = hour24 >= 12 ? "PM" : "AM";

    return {
      hours: String(hour12).padStart(2, "0"),
      minutes: String(nextMinute.getMinutes()).padStart(2, "0"),
      period,
      hours24: String(hour24).padStart(2, "0"),
    };
  };

  // Parse value prop on mount
  React.useEffect(() => {
    if (value) {
      const [hour24, minute] = value.split(":");
      const hourNum = parseInt(hour24);
      let hour12 = hourNum % 12;
      if (hour12 === 0) hour12 = 12;
      const period = hourNum >= 12 ? "PM" : "AM";

      setInternalTime({
        hours: String(hour12).padStart(2, "0"),
        minutes: minute || "00",
        period,
      });
    } else {
      // If no value, set to next minute
      const next = getNextMinute();
      setInternalTime({
        hours: next.hours,
        minutes: next.minutes,
        period: next.period,
      });
    }
  }, [value]);

  // Initialize with next minute for the live clock (doesn't affect selection)
  React.useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Update internal time and scroll to appropriate positions when popover opens
  React.useEffect(() => {
    if (open) {
      if (!value) {
        const next = getNextMinute();
        setInternalTime({
          hours: next.hours,
          minutes: next.minutes,
          period: next.period,
        });
      }

      // Scroll to selected/default positions after a small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToTime();
      }, 100);
    }
  }, [open, value]);

  // Scroll to the current/default time
  const scrollToTime = () => {
    if (!hoursRef.current || !minutesRef.current) return;

    const { hours, minutes } = internalTime;

    // Calculate scroll positions
    const hourIndex = parseInt(hours) - 1; // Convert "01" to 0, "12" to 11
    const minuteIndex = parseInt(minutes);

    // Each button is 40px height + 4px gap = 44px total
    const hourScrollPosition = hourIndex * 44;
    const minuteScrollPosition = minuteIndex * 44;

    // Scroll to positions with some offset for better visibility
    hoursRef.current.scrollTop = hourScrollPosition - 80; // Offset to show more context
    minutesRef.current.scrollTop = minuteScrollPosition - 80;
  };

  const handleConfirm = () => {
    const { hours, minutes, period } = internalTime;
    let hour24 = parseInt(hours);
    if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    const time24 = `${String(hour24).padStart(2, "0")}:${minutes}`;
    onSelect(time24);
    setOpen(false);
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );

  const handleHourSelect = (hour: string) => {
    setInternalTime((prev) => ({ ...prev, hours: hour }));
  };

  const handleMinuteSelect = (minute: string) => {
    setInternalTime((prev) => ({ ...prev, minutes: minute }));
  };

  const handlePeriodSelect = (newPeriod: "AM" | "PM") => {
    setInternalTime((prev) => ({ ...prev, period: newPeriod }));
  };

  // Check if a time is in the past
  const isTimePast = (
    hour: string,
    minute: string,
    selectedPeriod: "AM" | "PM"
  ): boolean => {
    let hour24 = parseInt(hour);
    if (selectedPeriod === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (selectedPeriod === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    const selectedTime = new Date();
    selectedTime.setHours(hour24, parseInt(minute), 0, 0);
    return selectedTime <= currentTime;
  };

  // Get live current time for display
  const getLiveTime = () => {
    const now = new Date();
    const hour24 = now.getHours();
    const hour12 = hour24 % 12 || 12;
    const period = hour24 >= 12 ? "PM" : "AM";
    const minutes = now.getMinutes();

    return {
      display: `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )} ${period}`,
      hour12: String(hour12).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      period,
    };
  };

  const liveTime = getLiveTime();
  const displayValue = value
    ? (() => {
        const [hour24, minute] = value.split(":");
        const hourNum = parseInt(hour24);
        let hour12 = hourNum % 12;
        if (hour12 === 0) hour12 = 12;
        const period = hourNum >= 12 ? "PM" : "AM";
        return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
      })()
    : internalTime.hours && internalTime.minutes
    ? `${internalTime.hours}:${internalTime.minutes} ${internalTime.period}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal border-[#5D2A42] bg-[#5D2A42] hover:bg-[#4A2032] text-white",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-[#F5F5F0] border-[#5D2A42]"
        align="start"
      >
        <div className="p-4">
          {/* Live Current Time */}
          <div className="mb-4 p-3 bg-[#E8DDD6] rounded-lg text-center">
            <div className="text-sm text-[#5D2A42] font-medium mb-1">
              Current Time
            </div>
            <div className="text-2xl font-bold text-[#5D2A42]">
              {liveTime.display}
            </div>
          </div>

          <div className="flex gap-8">
            {/* Hours */}
            <div className="space-y-2">
              <div className="text-center text-sm font-semibold text-[#5D2A42]">
                Hours
              </div>
              <div
                ref={hoursRef}
                className="flex flex-col max-h-[280px] overflow-y-auto pr-2 space-y-1"
              >
                {hourOptions.map((hour) => {
                  const isPast = isTimePast(
                    hour,
                    internalTime.minutes || "00",
                    internalTime.period
                  );
                  return (
                    <Button
                      key={hour}
                      type="button"
                      variant={
                        internalTime.hours === hour ? "default" : "ghost"
                      }
                      disabled={isPast}
                      size="sm"
                      className={cn(
                        "h-10 px-3 py-2 text-base font-semibold transition-all w-16 justify-center",
                        internalTime.hours === hour
                          ? "bg-[#5D2A42] text-white hover:bg-[#4A2032]"
                          : isPast
                          ? "text-[#CCCCCC] cursor-not-allowed"
                          : "text-[#5D2A42] hover:bg-[#E8DDD6]"
                      )}
                      onClick={() => handleHourSelect(hour)}
                    >
                      {hour}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div className="flex items-center">
              <div className="text-3xl font-bold text-[#5D2A42]">:</div>
            </div>

            {/* Minutes */}
            <div className="space-y-2">
              <div className="text-center text-sm font-semibold text-[#5D2A42]">
                Minutes
              </div>
              <div
                ref={minutesRef}
                className="flex flex-col max-h-[280px] overflow-y-auto pr-2 space-y-1"
              >
                {minuteOptions.map((minute) => {
                  const isPast = isTimePast(
                    internalTime.hours || "00",
                    minute,
                    internalTime.period
                  );
                  return (
                    <Button
                      key={minute}
                      type="button"
                      variant={
                        internalTime.minutes === minute ? "default" : "ghost"
                      }
                      disabled={isPast}
                      size="sm"
                      className={cn(
                        "h-10 px-3 py-2 text-base font-semibold transition-all w-16 justify-center",
                        internalTime.minutes === minute
                          ? "bg-[#5D2A42] text-white hover:bg-[#4A2032]"
                          : isPast
                          ? "text-[#CCCCCC] cursor-not-allowed"
                          : "text-[#5D2A42] hover:bg-[#E8DDD6]"
                      )}
                      onClick={() => handleMinuteSelect(minute)}
                    >
                      {minute}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* AM/PM */}
            <div className="space-y-2">
              <div className="text-center text-sm font-semibold text-[#5D2A42]">
                Period
              </div>
              <div className="flex flex-col gap-2">
                {["AM", "PM"].map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={internalTime.period === p ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-10 px-3 py-2 text-base font-semibold transition-all w-16 justify-center",
                      internalTime.period === p
                        ? "bg-[#5D2A42] text-white hover:bg-[#4A2032]"
                        : "text-[#5D2A42] hover:bg-[#E8DDD6]"
                    )}
                    onClick={() => handlePeriodSelect(p as "AM" | "PM")}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Time Preview */}
          <div className="mt-4 pt-4 border-t border-[#5D2A42]/20 text-center">
            <div className="text-sm text-[#5D2A42] mb-2">Selected Time</div>
            <div className="text-3xl font-bold text-[#5D2A42]">
              {internalTime.hours || "00"}:{internalTime.minutes || "00"}{" "}
              {internalTime.period}
            </div>
          </div>

          {/* Quick Selection Buttons */}
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-[#5D2A42] border-[#5D2A42] hover:bg-[#E8DDD6]"
              onClick={() => {
                const next = getNextMinute();
                setInternalTime({
                  hours: next.hours,
                  minutes: next.minutes,
                  period: next.period,
                });
                setTimeout(scrollToTime, 0);
              }}
            >
              Next Minute
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-[#5D2A42] border-[#5D2A42] hover:bg-[#E8DDD6]"
              onClick={() => {
                setInternalTime({
                  hours: liveTime.hour12,
                  minutes: liveTime.minutes,
                  period: liveTime.period,
                });
                setTimeout(scrollToTime, 0);
              }}
            >
              Current Time
            </Button>
          </div>

          {/* Confirm Button */}
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full mt-4 bg-[#5D2A42] hover:bg-[#4A2032] text-white"
          >
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
