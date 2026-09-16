"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { normalizeLatinDigits } from "@/lib/money";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseIso(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return isValidDay(y, m, d) ? { y, m, d } : null;
}

function todayIso(): string {
  const now = new Date();
  return toIso(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

/**
 * A date field with a fully Latin-digit calendar. The native
 * <input type="date"> renders its popup in the OS locale (e.g. Persian
 * numerals) regardless of the `lang` attribute, so Vira renders its own
 * popover instead. Typing also auto-formats and accepts Persian/Arabic digits.
 */
export function DateInput({
  id,
  value,
  onChange,
  required = false,
  min,
  max,
  className = "field tnum",
}: {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState(value);
  const parsedValue = parseIso(value);
  const anchor = parsedValue ?? parseIso(todayIso())!;
  const [view, setView] = useState({ y: anchor.y, m: anchor.m });
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the raw text and the calendar month in sync with external value changes.
  useEffect(() => {
    setRaw(value);
    const parsed = parseIso(value);
    if (parsed) setView({ y: parsed.y, m: parsed.m });
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(iso: string) {
    onChange(iso);
    setRaw(iso);
    const parsed = parseIso(iso);
    if (parsed) setView({ y: parsed.y, m: parsed.m });
  }

  function handleText(nextRaw: string) {
    const digits = normalizeLatinDigits(nextRaw).replace(/[^0-9]/g, "").slice(0, 8);
    const formatted =
      digits.length > 6
        ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
        : digits.length > 4
          ? `${digits.slice(0, 4)}-${digits.slice(4)}`
          : digits;
    setRaw(formatted);
    if (formatted.length === 10) {
      const parsed = parseIso(formatted);
      if (parsed) commit(formatted);
    } else if (value && formatted.length === 0) {
      onChange("");
    }
  }

  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);

  const firstWeekday = new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toIso(view.y, view.m, i + 1)),
  ];
  const today = todayIso();

  function shiftMonth(delta: number) {
    const month = new Date(Date.UTC(view.y, view.m - 1 + delta, 1));
    setView({ y: month.getUTCFullYear(), m: month.getUTCMonth() + 1 });
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="YYYY-MM-DD"
          className={`${className} pr-9`}
          value={raw}
          onChange={(event) => handleText(event.target.value)}
          onFocus={() => {
            const anchorParsed = parseIso(raw) ?? parseIso(value) ?? parseIso(todayIso())!;
            setView({ y: anchorParsed.y, m: anchorParsed.m });
          }}
          required={required}
          dir="ltr"
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => setOpen((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <Icon name="calendar" className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="theme-popover rise absolute right-0 z-50 mt-1.5 w-[264px] rounded-xl border border-[var(--color-line)] p-3 text-[var(--color-ink)]">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
            >
              <Icon name="chevronLeft" className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="text-[13.5px] font-semibold">
              {MONTHS[view.m - 1]} {view.y}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
            >
              <Icon name="chevronRight" className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label="Choose a date">
            {WEEKDAYS.map((weekday) => (
              <span
                key={weekday}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]"
              >
                {weekday}
              </span>
            ))}
            {cells.map((iso, index) => {
              if (iso === null) return <span key={`blank-${index}`} />;
              const selected = iso === value;
              const isToday = iso === today;
              const disabled = !inRange(iso);
              const day = Number(iso.slice(8));
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => {
                    commit(iso);
                    setOpen(false);
                  }}
                  aria-label={iso + (selected ? ", selected" : "")}
                  className={`tnum h-8 rounded-md text-[12.5px] font-medium transition-colors ${
                    selected
                      ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] font-semibold"
                      : isToday
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold"
                        : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-[var(--color-line)] pt-2 text-[12px]">
            <button
              type="button"
              className="font-semibold text-[var(--color-brand)] hover:underline"
              onClick={() => {
                commit(todayIso());
                setOpen(false);
              }}
            >
              Today
            </button>
            {!required ? (
              <button
                type="button"
                className="font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                onClick={() => {
                  onChange("");
                  setRaw("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Keeps native validation integrated with surrounding forms. */}
      {required ? (
        <input type="hidden" value={value} required aria-hidden="true" />
      ) : null}
    </div>
  );
}
