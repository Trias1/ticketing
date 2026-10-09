"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

// Popover sederhana: tutup saat klik di luar atau Esc.
export default function Popover({
  trigger,
  children,
  align = "left",
  width = 260,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  // Simpan callback terbaru di ref: handler klik-di-luar didaftarkan sekali saat popover dibuka.
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const setOpen = (v: boolean) => {
    setInnerOpen(v);
    onOpenChangeRef.current?.(v);
  };
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div
          className={clsx(
            "absolute z-50 mt-1 overflow-hidden rounded-lg border border-tk-border bg-tk-surface text-sm shadow-lg dark:border-tk-dark-border dark:bg-tk-dark-surface",
            align === "right" ? "right-0" : "left-0"
          )}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
