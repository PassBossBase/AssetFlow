"use client";

import { useEffect, useMemo, useState } from "react";

type TextTypeProps = {
  text: readonly string[];
  className?: string;
  typingDelay?: number;
  holdDuration?: number;
  transitionDuration?: number;
  deletingDelay?: number;
};

function getTypingDelay(previousCharacter: string | undefined, typingDelay: number) {
  if (previousCharacter === undefined) return typingDelay;
  if ("。！？.!?".includes(previousCharacter)) return Math.max(typingDelay * 4, 260);
  if ("，、；：,;:".includes(previousCharacter)) return Math.max(typingDelay * 2, 145);
  return typingDelay;
}

export function TextType({ text, className, typingDelay = 66, holdDuration = 2400, transitionDuration = 120, deletingDelay = 31 }: TextTypeProps) {
  const messages = useMemo(() => text.filter(Boolean), [text]);
  const [displayedText, setDisplayedText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  const currentMessage = messages[messageIndex] ?? "";

  useEffect(() => {
    if (messages.length === 0) return undefined;

    if (prefersReducedMotion) return undefined;

    const delay = isDeleting
      ? displayedText.length === 0 ? transitionDuration : deletingDelay
      : displayedText.length === currentMessage.length ? holdDuration : getTypingDelay(displayedText.at(-1), typingDelay);

    const timer = window.setTimeout(() => {
      if (isDeleting) {
        if (displayedText.length === 0) {
          setIsDeleting(false);
          setMessageIndex((currentIndex) => (currentIndex + 1) % messages.length);
        } else {
          setDisplayedText((currentText) => currentText.slice(0, -1));
        }
        return;
      }

      if (displayedText.length < currentMessage.length) {
        setDisplayedText((currentText) => currentText + currentMessage[currentText.length]);
      } else {
        setIsDeleting(true);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [currentMessage, deletingDelay, displayedText, holdDuration, isDeleting, messages, prefersReducedMotion, transitionDuration, typingDelay]);

  if (prefersReducedMotion) {
    return (
      <span className={className} aria-hidden="true">
        {messages.map((message, index) => (
          <span key={message}>
            {message}
            {index < messages.length - 1 ? <br /> : null}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {displayedText}
      <span className="text-type-caret ml-1 inline-block text-cyan-100" aria-hidden="true">|</span>
    </span>
  );
}
