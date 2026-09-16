import { formatMoney } from "@/lib/money";

type Slice = { name: string; color: string; totalCents: number; share: number };

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  size = 180,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.totalCents, 0);
  const gap = slices.length > 1 ? 2 : 0;

  const arcs = slices.map((slice, index) => {
    const offset = slices
      .slice(0, index)
      .reduce((sum, item) => sum + (total > 0 ? (item.totalCents / total) * circumference : 0), 0);
    const fraction = total > 0 ? slice.totalCents / total : 0;
    const length = fraction * circumference;
    const visible = Math.max(length - gap, 0.5);
    return {
      key: `${slice.name}-${index}`,
      color: slice.color,
      dash: `${visible} ${circumference - visible}`,
      offset: -offset,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${centerLabel}: ${centerValue}`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-line-soft)"
        strokeWidth={stroke}
      />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            className="category-chart-segment"
            strokeDasharray={arc.dash}
            strokeDashoffset={arc.offset}
            strokeLinecap="butt"
          />
        ))}
      </g>
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        fill="var(--color-muted)"
        style={{ fontSize: 10.5, letterSpacing: "0.08em", fontWeight: 600 }}
      >
        {centerLabel.toUpperCase()}
      </text>
      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        fill="var(--color-ink)"
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {centerValue}
      </text>
    </svg>
  );
}

export function GroupedBars({
  points,
  currency,
}: {
  points: Array<{ label: string; incomeCents: number; expenseCents: number }>;
  currency: string;
}) {
  if (points.length === 0) return null;
  const max = Math.max(
    1,
    ...points.map((point) => Math.max(point.incomeCents, point.expenseCents)),
  );

  return (
    <div className="w-full">
      <div className="relative">
        {/* Gridlines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44">
          {[0, 25, 50, 75, 100].map((line) => (
            <div
              key={line}
              className="absolute inset-x-0 border-t border-dashed border-[var(--color-line)]"
              style={{ top: `${line}%` }}
            />
          ))}
        </div>

        <div className="relative flex h-52 items-end gap-1.5 overflow-x-auto">
          {points.map((point, index) => (
            <div
              key={`${point.label}-${index}`}
              className="group flex min-w-[34px] flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-44 w-full items-end justify-center gap-1">
                <div
                  className="w-[40%] max-w-[14px] rounded-t-[3px] bg-[var(--color-income)] opacity-90 transition-opacity group-hover:opacity-100"
                  style={{
                    height: `${Math.max((point.incomeCents / max) * 100, point.incomeCents > 0 ? 2 : 0)}%`,
                  }}
                  title={`Income ${formatMoney(point.incomeCents, currency)}`}
                />
                <div
                  className="w-[40%] max-w-[14px] rounded-t-[3px] bg-[var(--color-expense)] opacity-90 transition-opacity group-hover:opacity-100"
                  style={{
                    height: `${Math.max((point.expenseCents / max) * 100, point.expenseCents > 0 ? 2 : 0)}%`,
                  }}
                  title={`Expenses ${formatMoney(point.expenseCents, currency)}`}
                />
              </div>
              <span className="text-[11px] font-medium text-[var(--color-muted)]">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-line)] pt-3 text-[12px] text-[var(--color-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-[2px] bg-[var(--color-income)]" /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-[2px] bg-[var(--color-expense)]" /> Expenses
        </span>
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  color = "var(--color-expense)",
  height = 60,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  if (values.length < 2) {
    return <div className="h-[60px] rounded-md bg-[var(--color-line-soft)]" />;
  }
  const width = 240;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 8) - 4;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-[60px] w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vira-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill="url(#vira-spark)"
        stroke="none"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
