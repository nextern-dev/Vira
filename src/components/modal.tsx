"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Track the latest close handler inside an effect (rather than assigning
  // during render) so the mount effect below never re-fires on parent renders.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Steal focus into the dialog only when it first opens — moving it again
    // on every parent re-render used to break typing into the form.
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button, [tabindex]",
    );
    focusable?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fade fixed inset-0 z-[60] flex items-end justify-center bg-[var(--color-overlay)] p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`rise max-h-[92vh] w-full ${width} overflow-y-auto rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-lg)] sm:rounded-xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16.5px] font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-[13px] text-[var(--color-muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 rounded-md p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
          >
            <Icon name="close" className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-expense-soft)] px-3 py-2.5 text-[13px] text-[var(--color-expense)]"
    >
      <Icon name="alert" className="mt-px h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-[12.5px] font-medium text-[var(--color-expense)]">{message}</p>
  );
}
