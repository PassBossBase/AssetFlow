"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const DEFAULT_COLORS = ["#c084fc", "#f472b6", "#38bdf8"];
const GRADIENT_POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const GRADIENT_KEYS = ["--gradient-one", "--gradient-two", "--gradient-three", "--gradient-four", "--gradient-five", "--gradient-six", "--gradient-seven"] as const;
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

type GlowVariables = Record<`--${string}`, string | number>;
type BorderGlowStyle = CSSProperties & GlowVariables;

export type BorderGlowProps = Readonly<{
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}>;

function parseHsl(value: string) {
  const match = value.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) {
    return { h: 190, s: 90, l: 72 };
  }

  return { h: Number.parseFloat(match[1]), s: Number.parseFloat(match[2]), l: Number.parseFloat(match[3]) };
}

function buildGlowVars(glowColor: string, intensity: number): GlowVariables {
  const { h, s, l } = parseHsl(glowColor);
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  const vars: GlowVariables = {};

  opacities.forEach((opacity, index) => {
    vars[`--glow-color${keys[index]}`] = `hsl(${h}deg ${s}% ${l}% / ${Math.min(opacity * intensity, 100)}%)`;
  });

  return vars;
}

function buildGradientVars(colors: string[]): GlowVariables {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const vars: GlowVariables = {};

  GRADIENT_KEYS.forEach((key, index) => {
    const color = palette[Math.min(COLOR_MAP[index], palette.length - 1)];
    vars[key] = `radial-gradient(at ${GRADIENT_POSITIONS[index]}, ${color} 0px, transparent 50%)`;
  });

  vars["--gradient-base"] = `linear-gradient(${palette[0]} 0 100%)`;
  return vars;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number) {
  return value ** 3;
}

export function BorderGlow({
  children,
  className = "",
  edgeSensitivity = 30,
  glowColor = "190 90 72",
  backgroundColor = "#0d1424",
  borderRadius = 24,
  glowRadius = 34,
  glowIntensity = 0.8,
  coneSpread = 28,
  animated = false,
  colors = DEFAULT_COLORS,
  fillOpacity = 0.35,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const getCenter = useCallback((element: HTMLDivElement) => {
    const { width, height } = element.getBoundingClientRect();
    return [width / 2, height / 2] as const;
  }, []);

  const getEdgeProximity = useCallback((element: HTMLDivElement, x: number, y: number) => {
    const [centerX, centerY] = getCenter(element);
    const distanceX = x - centerX;
    const distanceY = y - centerY;
    const ratioX = distanceX === 0 ? Number.POSITIVE_INFINITY : centerX / Math.abs(distanceX);
    const ratioY = distanceY === 0 ? Number.POSITIVE_INFINITY : centerY / Math.abs(distanceY);
    return Math.min(Math.max(1 / Math.min(ratioX, ratioY), 0), 1);
  }, [getCenter]);

  const getCursorAngle = useCallback((element: HTMLDivElement, x: number, y: number) => {
    const [centerX, centerY] = getCenter(element);
    const radians = Math.atan2(y - centerY, x - centerX);
    const degrees = radians * (180 / Math.PI) + 90;
    return degrees < 0 ? degrees + 360 : degrees;
  }, [getCenter]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty("--edge-proximity", `${(getEdgeProximity(card, x, y) * 100).toFixed(3)}`);
    card.style.setProperty("--cursor-angle", `${getCursorAngle(card, x, y).toFixed(3)}deg`);
  }, [getCursorAngle, getEdgeProximity]);

  useEffect(() => {
    if (!animated || !cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const card = cardRef.current;
    const timeoutIds = new Set<number>();
    const frameIds = new Set<number>();
    const angleStart = 110;
    const angleEnd = 465;

    function animateValue({
      start = 0,
      end = 100,
      duration,
      delay = 0,
      ease,
      onUpdate,
      onEnd,
    }: {
      start?: number;
      end?: number;
      duration: number;
      delay?: number;
      ease: (value: number) => number;
      onUpdate: (value: number) => void;
      onEnd?: () => void;
    }) {
      const startedAt = performance.now() + delay;
      const tick = () => {
        const progress = Math.min((performance.now() - startedAt) / duration, 1);
        onUpdate(start + (end - start) * ease(Math.max(progress, 0)));
        if (progress < 1) {
          frameIds.add(window.requestAnimationFrame(tick));
        } else {
          onEnd?.();
        }
      };

      timeoutIds.add(window.setTimeout(() => frameIds.add(window.requestAnimationFrame(tick)), delay));
    }

    card.classList.add("sweep-active");
    card.style.setProperty("--cursor-angle", `${angleStart}deg`);
    animateValue({ duration: 500, ease: easeOutCubic, onUpdate: (value) => card.style.setProperty("--edge-proximity", `${value}`) });
    animateValue({
      duration: 1500,
      ease: easeInCubic,
      end: 50,
      onUpdate: (value) => card.style.setProperty("--cursor-angle", `${((angleEnd - angleStart) * (value / 100)) + angleStart}deg`),
    });
    animateValue({
      delay: 1500,
      duration: 2250,
      ease: easeOutCubic,
      start: 50,
      end: 100,
      onUpdate: (value) => card.style.setProperty("--cursor-angle", `${((angleEnd - angleStart) * (value / 100)) + angleStart}deg`),
    });
    animateValue({
      delay: 2500,
      duration: 1500,
      ease: easeInCubic,
      start: 100,
      end: 0,
      onUpdate: (value) => card.style.setProperty("--edge-proximity", `${value}`),
      onEnd: () => card.classList.remove("sweep-active"),
    });

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      frameIds.forEach((id) => window.cancelAnimationFrame(id));
      card.classList.remove("sweep-active");
    };
  }, [animated]);

  const style: BorderGlowStyle = {
    "--card-bg": backgroundColor,
    "--edge-sensitivity": edgeSensitivity,
    "--border-radius": `${borderRadius}px`,
    "--glow-padding": `${glowRadius}px`,
    "--cone-spread": coneSpread,
    "--fill-opacity": fillOpacity,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
  };

  return (
    <div ref={cardRef} onPointerMove={handlePointerMove} className={`border-glow-card ${className}`} style={style}>
      <span className="edge-light" aria-hidden="true" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
