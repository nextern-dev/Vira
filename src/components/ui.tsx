import type { ReactNode } from "react";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icons";
import { normalizeCategoryIcon } from "@/lib/icons";

export function Logo({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/vira-mark.svg"
        width={28}
        height={28}
        alt=""
        aria-hidden="true"
        className="h-7 w-7 shrink-0"
        priority
      />
      <span
        className={`text-[17px] font-semibold tracking-[-0.03em] ${
          tone === "light"
            ? "text-[var(--color-sidebar-ink)]"
            : "text-[var(--color-ink)]"
        }`}
      >
        Vira
      </span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold text-[var(--color-ink)]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[13.5px] text-[var(--color-ink-soft)]">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 text-center ${
        compact ? "py-9" : "py-14"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3.5 text-[14.5px] font-semibold text-[var(--color-ink)]">{title}</p>
      <p className="mx-auto mt-1 max-w-[19rem] text-[13px] leading-relaxed text-[var(--color-muted)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

type Tone = "neutral" | "income" | "expense" | "brand";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-[var(--color-ink)]",
  income: "text-[var(--color-income)]",
  expense: "text-[var(--color-expense)]",
  brand: "text-[var(--color-brand)]",
};

const TONE_CHIP: Record<Tone, string> = {
  neutral: "border-[var(--color-line)] bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]",
  income: "border-[var(--color-line)] bg-[var(--color-income-soft)] text-[var(--color-income)]",
  expense: "border-[var(--color-line)] bg-[var(--color-expense-soft)] text-[var(--color-expense)]",
  brand: "border-[var(--color-line)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: IconName;
  delta?: { direction: "up" | "down"; text: string; good?: boolean } | null;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="kicker">{label}</p>
        {icon ? (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${TONE_CHIP[tone]}`}
          >
            <Icon name={icon} className="h-[15px] w-[15px]" />
          </span>
        ) : null}
      </div>

      <p
        className={`tnum mt-2.5 text-[24px] font-semibold leading-none tracking-[-0.03em] ${TONE_TEXT[tone]}`}
      >
        {value}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        {delta ? (
          <span
            className={`badge ${
              delta.good
                ? "bg-[var(--color-income-soft)] text-[var(--color-income)]"
                : "bg-[var(--color-expense-soft)] text-[var(--color-expense)]"
            }`}
          >
            <Icon
              name={delta.direction === "up" ? "arrowUp" : "arrowDown"}
              className="h-3 w-3"
              strokeWidth={2.2}
            />
            {delta.text}
          </span>
        ) : null}
        {hint ? (
          <p className="truncate text-[12px] text-[var(--color-muted)]">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function Progress({
  percent,
  tone = "brand",
  size = "md",
}: {
  percent: number;
  tone?: "brand" | "warning" | "over";
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const colors: Record<string, string> = {
    brand: "bg-[var(--color-brand)]",
    warning: "bg-[var(--color-warning)]",
    over: "bg-[var(--color-expense)]",
  };
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-[var(--color-line)] ${
        size === "sm" ? "h-1.5" : "h-2"
      }`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${colors[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function TypePill({ type }: { type: "income" | "expense" }) {
  const income = type === "income";
  return (
    <span
      className={`badge border ${
        income
          ? "border-[var(--color-line)] bg-[var(--color-income-soft)] text-[var(--color-income)]"
          : "border-[var(--color-line)] bg-[var(--color-expense-soft)] text-[var(--color-expense)]"
      }`}
    >
      {income ? "Income" : "Expense"}
    </span>
  );
}

/** Category avatar: tinted tile + stroke icon, never an emoji. */
export function CategoryDot({
  color,
  icon,
  size = 32,
}: {
  color: string | null;
  icon: string | null;
  size?: number;
}) {
  const resolved = color ?? "var(--color-muted)";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg border"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${resolved} 13%, var(--color-surface))`,
        borderColor: `color-mix(in srgb, ${resolved} 28%, var(--color-surface))`,
        color: `color-mix(in srgb, ${resolved} 72%, var(--color-ink))`,
      }}
    >
      <Icon
        name={normalizeCategoryIcon(icon)}
        className=""
        strokeWidth={1.7}
      />
    </span>
  );
}
