import * as React from "react";

import { cn } from "@/lib/utils";

type GlassPanelVariant = "subtle" | "card" | "emphasis";

type GlassPanelProps = React.ComponentProps<"div"> & {
  variant?: GlassPanelVariant;
};

function GlassPanel({ className, variant = "card", ...props }: GlassPanelProps) {
  return <div className={cn("glass-panel", `glass-panel--${variant}`, className)} {...props} />;
}

export { GlassPanel, type GlassPanelVariant };
