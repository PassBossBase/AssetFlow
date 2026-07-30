"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type PopupPosition = {
  left: number;
  top: number;
  isBelow: boolean;
};

type PopoverProps = {
  ariaLabel: string;
  content: ReactNode;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  popupClassName?: string;
  popupHeight?: number;
  popupWidth?: number;
  trigger: ReactNode;
  triggerClassName?: string;
};

export function Popover({
  ariaLabel,
  content,
  disabled = false,
  onOpenChange,
  open,
  popupClassName = "",
  popupHeight = 176,
  popupWidth = 288,
  trigger,
  triggerClassName = "",
}: PopoverProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopupPosition | null>(null);

  const updatePosition = useCallback(() => {
    const triggerRect = containerRef.current?.getBoundingClientRect();
    if (triggerRect === undefined) return;

    const viewportPadding = 16;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const isBelow = triggerRect.top < popupHeight + viewportPadding && spaceBelow >= popupHeight + viewportPadding;
    const left = Math.min(window.innerWidth - popupWidth - viewportPadding, Math.max(viewportPadding, triggerRect.right - popupWidth));

    setPosition({
      left,
      top: isBelow ? triggerRect.bottom + 12 : triggerRect.top - 12,
      isBelow,
    });
  }, [popupHeight, popupWidth]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [onOpenChange, open, updatePosition]);

  return (
    <span ref={containerRef} className="relative inline-flex" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <span
        className={`inline-flex ${triggerClassName}`}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onOpenChange(true);
        }}
      >
        {trigger}
      </span>
      {open && position !== null ? createPortal(
        <div
          ref={popupRef}
          className={`fixed z-[90] w-72 rounded-xl border border-white/[0.14] bg-[#0c1625] p-4 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] ${position.isBelow ? "" : "-translate-y-full"} ${popupClassName}`}
          style={{ left: position.left, top: position.top }}
          role="dialog"
          aria-label={ariaLabel}
        >
          {content}
        </div>,
        document.body,
      ) : null}
    </span>
  );
}
