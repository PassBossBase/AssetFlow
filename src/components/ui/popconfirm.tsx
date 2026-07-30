"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";

type PopConfirmProps = {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
  title: string;
  trigger: ReactNode;
  triggerClassName?: string;
};

export function PopConfirm({ cancelLabel, confirmLabel, description, disabled = false, onConfirm, title, trigger, triggerClassName }: PopConfirmProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Popover
      ariaLabel={title}
      disabled={disabled || isConfirming}
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={trigger}
      triggerClassName={triggerClassName}
      content={(
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="bg-white/[0.06] hover:bg-white/[0.11]" onClick={() => setIsOpen(false)} disabled={isConfirming}>
              {cancelLabel}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => void handleConfirm()} disabled={isConfirming}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    />
  );
}
