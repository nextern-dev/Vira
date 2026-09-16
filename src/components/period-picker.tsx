"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateInput } from "@/components/date-input";
import { PRESET_LABELS, resolvePreset, type PresetRange } from "@/lib/dates";

export function PeriodPicker({
  basePath,
  preset,
  from,
  to,
}: {
  basePath: string;
  preset: PresetRange;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState({ preset, from, to });

  const invalid = local.preset === "custom" && local.from > local.to;

  function go(next: { preset: PresetRange; from: string; to: string }) {
    if (next.preset === "custom" && next.from > next.to) return;
    const params = new URLSearchParams({ preset: next.preset });
    if (next.preset === "custom") {
      params.set("from", next.from);
      params.set("to", next.to);
    }
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <div>
        <label className="label" htmlFor="period-preset">
          Period
        </label>
        <select
          id="period-preset"
          className="field w-auto min-w-[160px]"
          value={local.preset}
          onChange={(event) => {
            const nextPreset = event.target.value as PresetRange;
            const range =
              nextPreset === "custom"
                ? { from: local.from, to: local.to }
                : resolvePreset(nextPreset);
            const next = { preset: nextPreset, ...range };
            setLocal(next);
            if (nextPreset !== "custom") go(next);
          }}
        >
          {(Object.keys(PRESET_LABELS) as PresetRange[]).map((option) => (
            <option key={option} value={option}>
              {PRESET_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {local.preset === "custom" ? (
        <>
          <div>
            <label className="label" htmlFor="period-from">
              From
            </label>
                        <DateInput
            id="period-from"
            value={local.from}
            onChange={(v) => setLocal({ ...local, from: v })}
            />
          </div>
          <div>
            <label className="label" htmlFor="period-to">
              To
            </label>
                        <DateInput
            id="period-to"
            value={local.to}
            onChange={(v) => setLocal({ ...local, to: v })}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={pending || invalid}
            onClick={() => go(local)}
          >
            {pending ? "Loading…" : "Apply"}
          </button>
        </>
      ) : null}

      {invalid ? (
        <p className="w-full text-[12.5px] font-medium text-[var(--color-expense)]">
          The start date must be on or before the end date.
        </p>
      ) : null}
    </div>
  );
}
