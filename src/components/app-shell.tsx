"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { TransactionDialog, type CategoryOption } from "@/components/transaction-dialog";
import { CommandPalette } from "@/components/command-palette";
import { apiFetch } from "@/lib/client";
import { QuickModeToggle } from "@/components/appearance-provider";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/budgets", label: "Budgets", icon: "budgets" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/categories", label: "Categories", icon: "categories" },
];

export function AppShell({
  user,
  categories,
  children,
}: {
  user: { name: string; email: string };
  categories: CategoryOption[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const result = await apiFetch("/api/auth/logout", { method: "POST", body: "{}" });
    if (!result.ok) {
      setSigningOut(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  const initials =
    user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "V";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col px-3 py-4 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" aria-label="Vira home">
            <Logo tone="light" />
          </Link>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
            className="rounded-md p-1 text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-ink)] lg:hidden"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="btn-primary w-full"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
            New transaction
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true }),
              );
            }}
            className="flex items-center justify-between rounded-lg border border-[var(--color-sidebar-line)] bg-[var(--color-sidebar-surface)]/60 px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-sidebar-muted)] transition-colors hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-ink)]"
          >
            <span className="flex items-center gap-1.5">
              <Icon name="search" className="h-3.5 w-3.5" />
              Quick search
            </span>
            <kbd className="rounded border border-[var(--color-sidebar-line)] bg-[var(--color-sidebar-surface)] px-1.5 py-0.5 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-0.5" aria-label="Main">
          <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-sidebar-faint)]">
            Menu
          </p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`nav-item ${isActive(item.href) ? "nav-item-active" : ""}`}
            >
              <Icon
                name={item.icon}
                className="h-[17px] w-[17px] shrink-0"
                strokeWidth={isActive(item.href) ? 1.9 : 1.6}
              />
              {item.label}
            </Link>
          ))}

          <p className="px-2.5 pb-1.5 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-sidebar-faint)]">
            Account
          </p>
          <Link
            href="/settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            className={`nav-item ${isActive("/settings") ? "nav-item-active" : ""}`}
          >
            <Icon name="settings" className="h-[17px] w-[17px] shrink-0" />
            Settings
          </Link>
        </nav>

        <div className="mt-4 border-t border-[var(--color-sidebar-line)] pt-3">
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-sidebar-active)] text-[12px] font-semibold text-[var(--color-sidebar-ink)]">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--color-sidebar-ink)]">{user.name}</p>
              <p className="truncate text-[11px] text-[var(--color-sidebar-muted)]">{user.email}</p>
            </div>
            <QuickModeToggle />
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="nav-item mt-1 w-full disabled:opacity-50"
          >
            <Icon name="logout" className="h-[17px] w-[17px] shrink-0" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fade fixed inset-0 z-40 bg-[var(--color-overlay)] lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] px-3 py-2.5 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <Logo />
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="btn-primary btn-sm ml-auto"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
            Add
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        categories={categories}
      />
      <CommandPalette onOpenNewTransaction={() => setDialogOpen(true)} />
    </div>
  );
}
