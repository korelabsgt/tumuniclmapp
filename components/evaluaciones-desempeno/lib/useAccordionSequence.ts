"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACCORDION_CONTENT_MS,
  ACCORDION_FADE_MS,
} from "./accordion-motion";

export type AccordionSlotMotion = "visible" | "fading" | "ghost" | "collapsed";

type AccordionPhase =
  | "idle"
  | "hiding"
  | "expanding"
  | "collapsing"
  | "revealing";

export function useAccordionSequence() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<AccordionPhase>("idle");

  const isAnimating = phase !== "idle";

  const toggle = useCallback(
    (id: string) => {
      if (phase !== "idle") return;

      if (openId === id) {
        setPhase("collapsing");
        return;
      }

      setTargetId(id);
      setPhase("hiding");
    },
    [openId, phase],
  );

  const openAccordion = useCallback(
    (id: string) => {
      if (phase !== "idle") return;
      if (openId === id) return;
      setTargetId(id);
      setPhase("hiding");
    },
    [openId, phase],
  );

  const closeAccordion = useCallback(() => {
    if (phase !== "idle" || openId === null) return;
    setPhase("collapsing");
  }, [openId, phase]);

  const resetAccordion = useCallback(() => {
    setOpenId(null);
    setTargetId(null);
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (phase === "hiding") {
      const timer = window.setTimeout(() => {
        setOpenId(targetId);
        setPhase("expanding");
      }, ACCORDION_FADE_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === "expanding") {
      const timer = window.setTimeout(() => setPhase("idle"), ACCORDION_CONTENT_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === "collapsing") {
      const timer = window.setTimeout(() => setPhase("revealing"), ACCORDION_CONTENT_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === "revealing") {
      const timer = window.setTimeout(() => {
        setOpenId(null);
        setTargetId(null);
        setPhase("idle");
      }, ACCORDION_FADE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase, targetId]);

  const getSlotMotion = useCallback(
    (id: string): AccordionSlotMotion => {
      switch (phase) {
        case "idle":
          if (openId === null) return "visible";
          return openId === id ? "visible" : "collapsed";
        case "hiding":
          return id === targetId ? "visible" : "fading";
        case "expanding":
          return id === openId ? "visible" : "collapsed";
        case "collapsing":
          return id === openId ? "visible" : "collapsed";
        case "revealing":
          return "visible";
        default:
          return "visible";
      }
    },
    [openId, phase, targetId],
  );

  const isExpanded = useCallback(
    (id: string) => {
      if (openId !== id) return false;
      return phase === "expanding" || phase === "idle";
    },
    [openId, phase],
  );

  return {
    toggle,
    openAccordion,
    closeAccordion,
    resetAccordion,
    getSlotMotion,
    isExpanded,
    isAnimating,
    openAccordionId: openId,
  };
}
