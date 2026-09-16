import type { ReactNode } from "react";

/**
 * A single stroke-based icon set. Every glyph shares a 24x24 grid, round caps
 * and `currentColor` so icons inherit type colour and optical weight.
 */
const GLYPHS = {
  /* ---------------------------- categories ---------------------------- */
  tag: (
    <>
      <path d="M4 12.6V5.5a1.5 1.5 0 0 1 1.5-1.5h7.1a2 2 0 0 1 1.4.6l6 6a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1-.6-1.4Z" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </>
  ),
  cart: (
    <>
      <path d="M2.5 4h2.2l2.3 10.2a1.8 1.8 0 0 0 1.8 1.4h7.6a1.8 1.8 0 0 0 1.75-1.36L19.8 7.5H6" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="16.5" cy="19.5" r="1.4" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.4 12 4l8.5 6.4" />
      <path d="M5.5 9.8V19a1 1 0 0 0 1 1h3.2v-4.6h4.6V20h3.2a1 1 0 0 0 1-1V9.8" />
    </>
  ),
  transit: (
    <>
      <rect x="5.5" y="3.5" width="13" height="12.5" rx="3.5" />
      <path d="M5.5 10.5h13M9.5 20l-1.6 1.8M14.5 20l1.6 1.8M9 16.5h6" />
      <circle cx="9" cy="13.2" r="1" />
      <circle cx="15" cy="13.2" r="1" />
    </>
  ),
  restaurant: (
    <>
      <path d="M6.5 3v6.2a2.2 2.2 0 0 0 4.4 0V3M8.7 11.4V21" />
      <path d="M17.5 3c-1.4 1.1-2.1 2.7-2.1 4.6s.7 3 1.9 3.2V21" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 7.5h12v5.8A4.2 4.2 0 0 1 11.8 17.5H8.2A4.2 4.2 0 0 1 4 13.3Z" />
      <path d="M16 9h1.8a2.6 2.6 0 0 1 0 5.2H16M3.5 21h13" />
    </>
  ),
  bolt: (
    <>
      <path d="M13.2 3 5.8 13.2h5.3L10.6 21l7.6-10.4h-5.4Z" />
    </>
  ),
  health: (
    <>
      <path d="M12 20.2S4.8 16 4.8 10.6A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.2 2.6c0 5.4-7.2 9.6-7.2 9.6Z" />
    </>
  ),
  media: (
    <>
      <rect x="3" y="4.8" width="18" height="12.4" rx="2" />
      <path d="M9 21h6M12 17.2V21" />
    </>
  ),
  travel: (
    <>
      <path d="M10.4 4.2a1.6 1.6 0 0 1 3.2 0v4.9l7.1 4.1v2.1l-7.1-2.1v3.9l2.1 1.9v1.6L12 19.4l-3.7 1.2v-1.6l2.1-1.9v-3.9L3.3 15.3v-2.1l7.1-4.1Z" />
    </>
  ),
  education: (
    <>
      <path d="M2.8 9 12 4.6 21.2 9 12 13.4Z" />
      <path d="M6.6 11.2v4.6c0 1.5 2.4 2.6 5.4 2.6s5.4-1.1 5.4-2.6v-4.6M21.2 9v5.4" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="7.6" width="18" height="4.2" rx="1" />
      <path d="M4.8 11.8V19a1.4 1.4 0 0 0 1.4 1.4h11.6A1.4 1.4 0 0 0 19.2 19v-7.2M12 7.6v12.8" />
      <path d="M12 7.6H8.9a2.2 2.2 0 1 1 1.7-3.6c.9 1 1.4 2.3 1.4 3.6Zm0 0h3.1a2.2 2.2 0 1 0-1.7-3.6c-.9 1-1.4 2.3-1.4 3.6Z" />
    </>
  ),
  apparel: (
    <>
      <path d="M9 3 4 5.8l1.9 3.6 1.8-1V21h8.6V8.4l1.8 1L20 5.8 15 3a3 3 0 0 1-6 0Z" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2.8" y="7" width="18.4" height="13" rx="2.2" />
      <path d="M9 7V5.2A1.8 1.8 0 0 1 10.8 3.4h2.4A1.8 1.8 0 0 1 15 5.2V7M2.8 12.4h18.4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21Z" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5.8" width="18" height="13.4" rx="2.4" />
      <path d="M3 10.2h18" />
      <circle cx="16.8" cy="14.6" r="1.15" />
    </>
  ),
  phone: (
    <>
      <rect x="6.4" y="2.4" width="11.2" height="19.2" rx="3" />
      <path d="M10.4 18.6h3.2" />
    </>
  ),
  pet: (
    <>
      <path d="M8.2 14.4c1-1.5 2.3-2.3 3.8-2.3s2.8.8 3.8 2.3c.8 1.2 1.6 2 1.6 3.2a2.6 2.6 0 0 1-2.6 2.6c-1 0-1.8-.4-2.8-.4s-1.8.4-2.8.4A2.6 2.6 0 0 1 6.6 17.6c0-1.2.8-2 1.6-3.2Z" />
      <circle cx="6.2" cy="9.4" r="1.9" />
      <circle cx="17.8" cy="9.4" r="1.9" />
      <circle cx="10.2" cy="5.6" r="1.8" />
      <circle cx="13.8" cy="5.6" r="1.8" />
    </>
  ),
  fitness: (
    <>
      <path d="M4 9.2v5.6M7.2 6.6v10.8M16.8 6.6v10.8M20 9.2v5.6M7.2 12h9.6" />
    </>
  ),
  tools: (
    <>
      <path d="M14.6 3.6a5 5 0 0 0 6.1 6.1L10.4 20a2.6 2.6 0 0 1-3.7-3.7Z" />
      <path d="M6.5 17.4h.01" />
    </>
  ),
  fuel: (
    <>
      <rect x="4" y="3.4" width="9.6" height="17.2" rx="2.2" />
      <path d="M4 20.6h9.6M6.6 8.4h4.4M13.6 8.6h2.6a1.8 1.8 0 0 1 1.8 1.8v6.2a1.6 1.6 0 0 0 3.2 0V9.2l-2.4-2.4" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.6 12 4.4l9 5.2M5 9.6V18M9.3 9.6V18M14.7 9.6V18M19 9.6V18M3 20.6h18" />
    </>
  ),

  /* ------------------------------ product ----------------------------- */
  dashboard: (
    <>
      <rect x="3.2" y="3.2" width="7.4" height="8.6" rx="1.8" />
      <rect x="13.4" y="3.2" width="7.4" height="5.4" rx="1.8" />
      <rect x="13.4" y="10.6" width="7.4" height="10.2" rx="1.8" />
      <rect x="3.2" y="13.8" width="7.4" height="7" rx="1.8" />
    </>
  ),
  transactions: (
    <>
      <path d="M4 7.6h13M13.6 4.2 17 7.6l-3.4 3.4M20 16.4H7M10.4 13 7 16.4l3.4 3.4" />
    </>
  ),
  budgets: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="0.6" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20.2V11M9.3 20.2V4.6M14.7 20.2v-6.6M20 20.2V8.2" />
    </>
  ),
  categories: (
    <>
      <rect x="3.4" y="3.4" width="7.6" height="7.6" rx="2" />
      <rect x="13" y="3.4" width="7.6" height="7.6" rx="2" />
      <rect x="3.4" y="13" width="7.6" height="7.6" rx="2" />
      <rect x="13" y="13" width="7.6" height="7.6" rx="2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.1 14.6a1.5 1.5 0 0 0 .3 1.65l.05.06a1.85 1.85 0 1 1-2.62 2.62l-.05-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.91 1.37v.16a1.85 1.85 0 1 1-3.7 0v-.09a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06A1.85 1.85 0 1 1 5.2 16.4l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.91H4a1.85 1.85 0 1 1 0-3.7h.09a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06A1.85 1.85 0 1 1 7.72 4.77l.06.06a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .91-1.37V3.7a1.85 1.85 0 1 1 3.7 0v.09a1.5 1.5 0 0 0 .91 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.85 1.85 0 1 1 2.62 2.62l-.06.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.91h.16a1.85 1.85 0 1 1 0 3.7h-.09a1.5 1.5 0 0 0-1.37.91Z" />
    </>
  ),

  /* ------------------------------ actions ----------------------------- */
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20.2 15.2A8.4 8.4 0 0 1 8.8 3.8 8.4 8.4 0 1 0 20.2 15.2Z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2.2" />
      <path d="M8.5 21h7M12 17v4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.2a8.8 8.8 0 0 0 0 17.6h1.2a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1h1.8A3.6 3.6 0 0 0 21 11 8.2 8.2 0 0 0 12 3.2Z" />
      <circle cx="7.6" cy="10" r=".7" />
      <circle cx="10" cy="6.8" r=".7" />
      <circle cx="14.1" cy="6.6" r=".7" />
      <circle cx="16.7" cy="9.8" r=".7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="M15.6 15.6 20.5 20.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 16.4V20h3.6L18.9 8.7a1.6 1.6 0 0 0 0-2.3l-1.3-1.3a1.6 1.6 0 0 0-2.3 0Z" />
      <path d="M14.6 5.9 18.1 9.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.6 6.8h14.8M9.6 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.6" />
      <path d="M6.6 6.8 7.5 19a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.2M10.4 10.6v6M13.6 10.6v6" />
    </>
  ),
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  arrowRight: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  arrowUp: <path d="M12 19.5v-15M5.5 11 12 4.5 18.5 11" />,
  arrowDown: <path d="M12 4.5v15M18.5 13 12 19.5 5.5 13" />,
  check: <path d="M4.8 12.6 9.6 17.4 19.2 6.6" />,
  filter: <path d="M3.6 5.4h16.8l-6.6 7.8v6.2l-3.6 1.6v-7.8Z" />,
  calendar: (
    <>
      <rect x="3.4" y="5" width="17.2" height="15.6" rx="2.4" />
      <path d="M3.4 9.8h17.2M8.4 3.4v3.2M15.6 3.4v3.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.2V12l3.2 1.9" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M6.4 6.6h11.2M4 20.4h16" />
      <path d="M6.4 6.6 3.2 13.2h6.4ZM17.6 6.6l-3.2 6.6h6.4Z" />
    </>
  ),
  trendUp: (
    <>
      <path d="M3.6 16.6 9.4 10.8l3.6 3.6 7.4-7.4" />
      <path d="M15.4 7h5v5" />
    </>
  ),
  chartBar: (
    <>
      <path d="M3.6 20.4h16.8" />
      <rect x="5" y="11" width="3.6" height="6.6" rx="1.2" />
      <rect x="10.2" y="6.6" width="3.6" height="11" rx="1.2" />
      <rect x="15.4" y="13.6" width="3.6" height="4" rx="1.2" />
    </>
  ),
  chartPie: (
    <>
      <path d="M12 3.6a8.4 8.4 0 1 0 8.4 8.4H12Z" />
      <path d="M14.6 3.9A8.4 8.4 0 0 1 20.1 9.4h-5.5Z" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.4 13.4h4.4l1.4 2.6h5.6l1.4-2.6h4.4" />
      <path d="M5.6 4.6h12.8l2.2 8.8v4a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2v-4Z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 2.8 20h18.4Z" />
      <path d="M12 10v4.2M12 17.4h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11v5.4M12 7.8h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 5 6v5.6c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V6Z" />
      <path d="M9.2 12.2 11.3 14.3 15 10.6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.4" />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.8" />
      <path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9.6 20.4H6.2a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2h3.4" />
      <path d="M15.4 16.4 19.8 12l-4.4-4.4M19.8 12H9.4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.6 13.9 9l5.4 1.9-5.4 1.9L12 18.2l-1.9-5.4L4.7 10.9 10.1 9Z" />
      <path d="M18.6 16.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" />
    </>
  ),
} as const;

export type IconName = keyof typeof GLYPHS;

export function Icon({
  name,
  className = "h-4 w-4",
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const glyph: ReactNode = GLYPHS[name] ?? GLYPHS.tag;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
