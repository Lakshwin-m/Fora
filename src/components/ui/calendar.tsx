"use client";

import * as React from "react";
import { Calendar as MultiDatePicker } from "react-multi-date-picker";
import { cn } from "@/lib/utils";

// Note: We are using react-multi-date-picker to provide the grid-based month/year 
// selection requested by the user, while maintaining the component's API 
// for compatibility with the rest of the application.

export function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  ...props
}: any) {
  const handleChange = (date: any) => {
    if (onSelect) {
      // Convert MultiDatePicker's DateObject to standard JS Date
      const d = date ? (date.toDate ? date.toDate() : new Date(date)) : undefined;
      onSelect(d);
    }
  };

  return (
    <div className={cn("inline-block", className)}>
      <MultiDatePicker
        value={selected}
        onChange={handleChange}
        mapDays={({ date }) => {
          let isDateDisabled = false;
          // Handle the 'disabled' prop from react-day-picker format (e.g. { before: Date })
          if (disabled?.before && date.toDate() < new Date(disabled.before.setHours(0,0,0,0))) {
            isDateDisabled = true;
          }
          if (isDateDisabled) return { disabled: true };
          return {};
        }}
        showOtherDays={false}
        shadow={false}
        weekDays={["S", "M", "T", "W", "T", "F", "S"]}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";
