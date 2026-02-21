import * as React from "react";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerWithPresetsProps {
  value?: Date;
  onSelect: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerWithPresets({
  value,
  onSelect,
  placeholder = "Pick a date",
  className,
}: DatePickerWithPresetsProps) {
  const [open, setOpen] = React.useState(false);

  const presets = [
    {
      label: "Tomorrow",
      getValue: () => startOfDay(addDays(new Date(), 1)),
    },
    {
      label: "In 1 week",
      getValue: () => startOfDay(addWeeks(new Date(), 1)),
    },
    {
      label: "In 2 weeks",
      getValue: () => startOfDay(addWeeks(new Date(), 2)),
    },
    {
      label: "In 1 month",
      getValue: () => startOfDay(addMonths(new Date(), 1)),
    },
    {
      label: "In 3 months",
      getValue: () => startOfDay(addMonths(new Date(), 3)),
    },
    {
      label: "In 6 months",
      getValue: () => startOfDay(addMonths(new Date(), 6)),
    },
    {
      label: "In 1 year",
      getValue: () => startOfDay(addYears(new Date(), 1)),
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal border-[#5D2A42] bg-[#5D2A42] hover:bg-[#4A2032] text-white",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-[#F5F5F0] border-[#5D2A42]"
        align="start"
      >
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col border-r-2 border-[#5D2A42] p-3 space-y-2 min-w-[140px] bg-[#FAFAF8]">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-normal text-[#5D2A42] hover:bg-[#5D2A42] hover:text-white transition-colors"
                onClick={() => {
                  const date = preset.getValue();
                  onSelect(date);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                onSelect(date);
                setOpen(false);
              }
            }}
            disabled={(date) => date < startOfDay(new Date())}
            classNames={{
              caption_label: "text-[#5D2A42] font-semibold",
              head_row: "flex",
              head_cell: "text-[#5D2A42] font-bold w-9 text-center text-sm",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center p-0 relative",
              day: "h-9 w-9 p-0 text-[#333333] hover:bg-[#E8DDD6] rounded transition-colors",
              day_today: "bg-[#D4A574] text-white font-bold",
              day_selected:
                "bg-[#5D2A42] text-white hover:bg-[#4A2032] hover:text-white focus:bg-[#5D2A42] focus:text-white",
              day_outside: "text-[#999999] opacity-70",
              day_disabled: "text-[#CCCCCC] opacity-50",
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
