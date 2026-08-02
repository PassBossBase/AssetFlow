"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/components/language-provider";
import type { Project } from "@/lib/convex";

type ProjectOption = Pick<Project, "_id" | "name">;

type ProjectTargetSelectProps = {
  disabled: boolean;
  onProjectChange: (projectId: Project["_id"]) => void;
  projects: ProjectOption[];
  selectedProjectId: Project["_id"] | null;
};

export function ProjectTargetSelect({
  disabled,
  onProjectChange,
  projects,
  selectedProjectId,
}: ProjectTargetSelectProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const selectedIndex = Math.max(
    0,
    projects.findIndex((project) => project._id === selectedProjectId),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedProject = projects.find(
    (project) => project._id === selectedProjectId,
  );

  function handleListboxKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (projects.length === 0) return;

    let nextIndex = activeIndex;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        nextIndex = Math.min(activeIndex + 1, projects.length - 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        nextIndex = Math.max(activeIndex - 1, 0);
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = projects.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        optionRefs.current[activeIndex]?.click();
        return;
      case "Escape":
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      default:
        return;
    }

    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  }

  function openOptions(index = selectedIndex) {
    setButtonRect(buttonRef.current?.getBoundingClientRect() ?? null);
    setActiveIndex(index);
    setIsOpen(true);
  }

  function handleToggle() {
    if (!isOpen) {
      openOptions();
      return;
    }
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      optionRefs.current[activeIndex]?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => setIsOpen(false);
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      close();
    };
    const closeOnOutsideWheel = (event: WheelEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) close();
    };
    const closeOnFocusLeave = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      )
        close();
    };
    const syncPosition = () => {
      setButtonRect(buttonRef.current?.getBoundingClientRect() ?? null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("scroll", syncPosition, { capture: true });
    window.addEventListener("resize", syncPosition);
    window.addEventListener("wheel", closeOnOutsideWheel, {
      capture: true,
      passive: true,
    });
    document.addEventListener("focusin", closeOnFocusLeave);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("scroll", syncPosition, { capture: true });
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("wheel", closeOnOutsideWheel, {
        capture: true,
      });
      document.removeEventListener("focusin", closeOnFocusLeave);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        id="project-upload-target"
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-lg border border-white/[0.14] bg-[#0a1627] px-4 text-left text-base text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-primary/45 hover:bg-[#0d1c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        aria-controls={isOpen ? "project-upload-target-options" : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openOptions(selectedIndex);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openOptions(projects.length - 1);
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      >
        <span className="truncate">
          {selectedProject?.name ?? t("selectProject")}
        </span>
        {isOpen ? (
          <ChevronUp className="size-4 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>
      {isOpen && buttonRect
        ? createPortal(
            <div
              ref={dropdownRef}
              id="project-upload-target-options"
              role="listbox"
              aria-label={t("selectProject")}
              style={{
                position: "fixed",
                top: buttonRect.bottom + 8,
                left: buttonRect.left,
                width: buttonRect.width,
              }}
              className="z-[100] max-h-56 overflow-y-auto rounded-lg border border-white/[0.14] bg-[#0d1b2e] p-1.5 shadow-[0_20px_42px_rgba(0,0,0,0.38)]"
              onKeyDown={handleListboxKeyDown}
            >
              {projects.map((project, index) => {
                const isSelected = project._id === selectedProjectId;
                return (
                  <button
                    key={project._id}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-selected={isSelected}
                    className={`flex w-full items-center rounded-md px-3.5 py-3 text-left text-base transition-colors ${isSelected ? "bg-[#224b82] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-100 hover:bg-[#173553] hover:text-white"}`}
                    onClick={() => {
                      onProjectChange(project._id);
                      setIsOpen(false);
                      buttonRef.current?.focus();
                    }}
                    onFocus={() => setActiveIndex(index)}
                  >
                    <span className="truncate">{project.name}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
