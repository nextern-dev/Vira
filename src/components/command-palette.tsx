"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { useAppearance } from "@/components/appearance-provider";
import {
  APPEARANCE_MODES,
  COLOR_THEMES,
  COLOR_THEME_META,
  type AppearanceMode,
  type ColorTheme,
} from "@/lib/appearance";

type CommandItem = {
  id: string;
  category: "Navigation" | "Actions" | "Appearance" | "Theme Palette";
  title: string;
  subtitle?: string;
  icon: IconName;
  shortcut?: string;
  action: () => void;
};

export function CommandPalette({
  onOpenNewTransaction,
}: {
  onOpenNewTransaction?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { appearance, setAppearance } = useAppearance();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcut listeners (Cmd+K / Ctrl+K and "N" when not typing)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      } else if (!isInput && !open && (event.key === "n" || event.key === "N")) {
        event.preventDefault();
        onOpenNewTransaction?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenNewTransaction]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      {
        id: "nav-dash",
        category: "Navigation",
        title: "Go to Dashboard",
        subtitle: "Overview of balance and trends",
        icon: "dashboard",
        action: () => {
          router.push("/dashboard");
          setOpen(false);
        },
      },
      {
        id: "nav-txs",
        category: "Navigation",
        title: "Go to Transactions",
        subtitle: "Search and manage all records",
        icon: "transactions",
        action: () => {
          router.push("/transactions");
          setOpen(false);
        },
      },
      {
        id: "nav-budgets",
        category: "Navigation",
        title: "Go to Budgets",
        subtitle: "Track monthly and custom spending limits",
        icon: "budgets",
        action: () => {
          router.push("/budgets");
          setOpen(false);
        },
      },
      {
        id: "nav-analytics",
        category: "Navigation",
        title: "Go to Analytics",
        subtitle: "Category breakdowns and series",
        icon: "analytics",
        action: () => {
          router.push("/analytics");
          setOpen(false);
        },
      },
      {
        id: "nav-cats",
        category: "Navigation",
        title: "Go to Categories",
        subtitle: "Customise your expense & income tags",
        icon: "categories",
        action: () => {
          router.push("/categories");
          setOpen(false);
        },
      },
      {
        id: "nav-settings",
        category: "Navigation",
        title: "Go to Settings",
        subtitle: "Account, security and appearance",
        icon: "settings",
        action: () => {
          router.push("/settings");
          setOpen(false);
        },
      },
    ];

    const actions: CommandItem[] = [
      {
        id: "act-new-tx",
        category: "Actions",
        title: "New Transaction",
        subtitle: "Log income or expense",
        icon: "plus",
        shortcut: "N",
        action: () => {
          setOpen(false);
          onOpenNewTransaction?.();
        },
      },
    ];

    const modes: CommandItem[] = APPEARANCE_MODES.map((mode: AppearanceMode) => ({
      id: `mode-${mode}`,
      category: "Appearance",
      title: `Switch to ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`,
      icon: mode === "dark" ? "moon" : mode === "light" ? "sun" : "monitor",
      action: () => {
        setAppearance({ ...appearance, mode });
        setOpen(false);
      },
    }));

    const palettes: CommandItem[] = COLOR_THEMES.map((theme: ColorTheme) => ({
      id: `theme-${theme}`,
      category: "Theme Palette",
      title: `${COLOR_THEME_META[theme].label} Palette`,
      subtitle: COLOR_THEME_META[theme].description,
      icon: "palette",
      action: () => {
        setAppearance({ ...appearance, theme });
        setOpen(false);
      },
    }));

    return [...actions, ...nav, ...modes, ...palettes];
  }, [router, onOpenNewTransaction, appearance, setAppearance]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle?.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fade fixed inset-0 z-[100] flex items-start justify-center bg-[var(--color-overlay)] p-4 pt-[12vh] backdrop-blur-sm sm:p-6 sm:pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="rise w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-lg)]">
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3.5">
          <Icon name="search" className="h-5 w-5 text-[var(--color-muted)]" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-[15px] font-medium text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none"
            placeholder="Type a command or search sections…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <kbd className="hidden rounded-md border border-[var(--color-line)] bg-[var(--color-line-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)] sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2"
          tabIndex={-1}
        >
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13.5px] text-[var(--color-muted)]">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                    isSelected
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                      : "text-[var(--color-ink)] hover:bg-[var(--color-line-soft)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        isSelected
                          ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]"
                      }`}
                    >
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold">
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="truncate text-[11.5px] text-[var(--color-muted)]">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      {item.category}
                    </span>
                    {item.shortcut ? (
                      <kbd className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--color-muted)]">
                        {item.shortcut}
                      </kbd>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-line-soft)]/50 px-4 py-2.5 text-[11.5px] text-[var(--color-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1 font-mono">
                ↑
              </kbd>
              <kbd className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1 font-mono">
                ↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 font-mono">
                ↵
              </kbd>{" "}
              Select
            </span>
          </div>
          <span>Quick actions &amp; shortcuts</span>
        </div>
      </div>
    </div>
  );
}
