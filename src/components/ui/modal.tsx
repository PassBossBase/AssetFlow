"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  closeLabel: string;
  children: ReactNode;
  contentClassName?: string;
  keepMounted?: boolean;
};

export function Modal({ open, onClose, ariaLabel, closeLabel, children, contentClassName, keepMounted = false }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open && !keepMounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4 py-6 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "pointer-events-none invisible opacity-0"}`}
      role={open ? "dialog" : undefined}
      aria-modal={open || undefined}
      aria-label={open ? ariaLabel : undefined}
      aria-hidden={!open}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className={`relative max-h-[calc(100dvh-3rem)] w-full overflow-y-auto ${contentClassName ?? "max-w-xl"}`}>
        <Button type="button" variant="ghost" size="sm" className="absolute right-4 top-4 z-10 size-9 rounded-full p-0 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground" onClick={onClose} aria-label={closeLabel}>
          <X className="size-4" aria-hidden="true" />
        </Button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
