"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";

import { cn } from "@/lib/utils";

export const toast = ToastPrimitive.createToastManager();

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((currentToast) => {
    const isDestructive = currentToast.type === "error";

    return (
      <ToastPrimitive.Root
        key={currentToast.id}
        toast={currentToast}
        swipeDirection="up"
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.3),0_12px_34px_rgb(2_6_23_/_0.32)] after:pointer-events-none after:absolute after:inset-x-4 after:top-0 after:h-px motion-safe:transition-[opacity,transform] motion-safe:duration-200 data-[ending-style]:pointer-events-none data-[ending-style]:-translate-y-3 data-[ending-style]:opacity-0",
          isDestructive
            ? "border-red-300/55 bg-destructive text-destructive-foreground after:bg-red-100/50"
            : "border-cyan-100/60 bg-[rgb(56_217_245)] text-[rgb(6_20_27)] after:bg-white/55",
        )}
      >
        <ToastPrimitive.Content className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title className={cn("text-sm font-semibold tracking-[-0.015em]", isDestructive ? "text-destructive-foreground" : "text-[rgb(6_20_27)]")} />
            {currentToast.description ? (
              <ToastPrimitive.Description className={cn("mt-1 text-xs leading-5", isDestructive ? "text-destructive-foreground/80" : "text-[rgb(6_20_27)]/75")} />
            ) : null}
          </div>
          <ToastPrimitive.Close
            aria-label="Close notification"
            className={cn(
              "-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-lg leading-none transition-colors focus-visible:outline-none focus-visible:ring-2",
              isDestructive
                ? "text-destructive-foreground/75 hover:bg-black/10 hover:text-destructive-foreground focus-visible:ring-red-100"
                : "text-[rgb(6_20_27)]/70 hover:bg-black/10 hover:text-[rgb(6_20_27)] focus-visible:ring-cyan-50",
            )}
          >
            <span aria-hidden="true">×</span>
          </ToastPrimitive.Close>
        </ToastPrimitive.Content>
      </ToastPrimitive.Root>
    );
  });
}

export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toast} timeout={4000} limit={4}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          aria-label="Notifications"
          className="fixed left-1/2 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 flex-col gap-3 sm:top-5"
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}
