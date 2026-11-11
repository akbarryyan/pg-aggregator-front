"use client";

import { useState } from "react";
import { CalendarRangeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  /** YYYY-MM-DD, empty string = no bound. */
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** Accessible label / tooltip text. */
  label?: string;
};

/**
 * Icon button that opens a small popover with a From / To date picker. It
 * matches the neighbouring round icon buttons and shows a dot while a range is
 * active. Changes apply immediately; "Clear range" resets both bounds and
 * "Done" closes the popover.
 */
export default function DateRangeButton({
  from,
  to,
  onChange,
  label = "Filter by date range",
}: Props) {
  const [open, setOpen] = useState(false);
  const active = from !== "" || to !== "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          title={label}
          className={`relative size-9 rounded-full shadow-none hover:bg-[#f4f7fb] ${
            active
              ? "border-[#ff5e16] bg-[#fff3ec] text-[#ff5e16]"
              : "border-[#e8eef4] bg-white text-[#3d4b5c]"
          }`}
        >
          <CalendarRangeIcon />
          {active && (
            <span
              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white bg-[#ff5e16]"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-72 gap-3 border border-[#e8eef4] bg-white p-3 shadow-lg"
      >
        <p className="text-[12.5px] font-semibold text-[#1f2a37]">{label}</p>
        <DatePicker
          label="From"
          value={from}
          max={to || undefined}
          placeholder="Start date"
          triggerClassName="max-sm:h-10"
          onChange={(value) => onChange({ from: value, to })}
        />
        <DatePicker
          label="To"
          value={to}
          min={from || undefined}
          placeholder="End date"
          triggerClassName="max-sm:h-10"
          onChange={(value) => onChange({ from, to: value })}
        />
        <div className="flex items-center justify-between gap-2 border-t border-[#eef2f6] pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!active}
            className="h-9 px-3 text-[12.5px] text-[#6b7c93] max-sm:h-10"
            onClick={() => onChange({ from: "", to: "" })}
          >
            Clear range
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-[12.5px] font-semibold text-[#ff5e16] hover:bg-[#fff3ec] hover:text-[#ef5510] max-sm:h-10"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
