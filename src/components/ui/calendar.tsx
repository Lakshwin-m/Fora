"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// We render a premium shadcn Select instead of the native HTML select.
function CustomDropdown({ value, onChange, children, ...props }: DropdownProps) {
  const options = React.Children.toArray(children) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[];
  const selected = options.find((child) => child.props.value === value);
  const handleChange = (newVal: string) => {
    if (onChange) {
      onChange({ target: { value: newVal } } as any);
    }
  };

  return (
    <Select value={value?.toString()} onValueChange={handleChange}>
      <SelectTrigger className="h-8 border-none bg-transparent hover:bg-accent/50 focus:ring-0 font-bold text-[#5D2A42] w-fit gap-1 pr-2 shadow-none focus-visible:ring-0">
        <SelectValue>{selected?.props?.children}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-[250px] min-w-[120px] rounded-xl border-[#E8E8E8] shadow-lg bg-white overflow-y-auto z-50">
        {options.map((option, id) => (
          <SelectItem key={id} value={option.props.value?.toString() ?? ""} className="rounded-lg cursor-pointer focus:bg-[#5D2A42]/10 focus:text-[#5D2A42] font-semibold text-[#5D2A42] transition-colors my-1 py-2 pl-8 pr-4">
            {option.props.children}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex justify-center gap-1",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-all flex justify-center items-center"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        vhidden: "hidden",
        dropdown_month: "hidden", // We hide the native select since we use components.Dropdown
        dropdown_year: "hidden", 
        ...classNames,
      }}
      components={{
        Dropdown: CustomDropdown,
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
