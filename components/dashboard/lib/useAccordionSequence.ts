'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ACCORDION_CONTENT_MS,
  ACCORDION_FADE_MS,
} from '../modules/accordion-motion';

export type AccordionSlotMotion = 'visible' | 'fading' | 'ghost' | 'collapsed';

type AccordionPhase =
  | 'idle'
  | 'hiding'
  | 'expanding'
  | 'collapsing'
  | 'revealing';

export function useAccordionSequence() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<AccordionPhase>('idle');

  const isAnimating = phase !== 'idle';

  const toggle = useCallback(
    (id: string) => {
      if (phase !== 'idle') return;

      if (openId === id) {
        setPhase('collapsing');
        return;
      }

      if (openId === null) {
        setTargetId(id);
        setPhase('hiding');
      }
    },
    [openId, phase],
  );

  useEffect(() => {
    if (phase === 'hiding') {
      const timer = window.setTimeout(() => {
        setOpenId(targetId);
        setPhase('expanding');
      }, ACCORDION_FADE_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'expanding') {
      const timer = window.setTimeout(() => setPhase('idle'), ACCORDION_CONTENT_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'collapsing') {
      const timer = window.setTimeout(() => setPhase('revealing'), ACCORDION_CONTENT_MS);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'revealing') {
      const timer = window.setTimeout(() => {
        setOpenId(null);
        setTargetId(null);
        setPhase('idle');
      }, ACCORDION_FADE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase, targetId]);

  const getSlotMotion = useCallback(
    (id: string): AccordionSlotMotion => {
      switch (phase) {
        case 'idle':
          if (openId === null) return 'visible';
          return openId === id ? 'visible' : 'collapsed';
        case 'hiding':
          return id === targetId ? 'visible' : 'fading';
        case 'expanding':
          return id === openId ? 'visible' : 'collapsed';
        case 'collapsing':
          return id === openId ? 'visible' : 'collapsed';
        case 'revealing':
          return 'visible';
        default:
          return 'visible';
      }
    },
    [openId, phase, targetId],
  );

  const isExpanded = useCallback(
    (id: string) => {
      if (openId !== id) return false;
      return phase === 'expanding' || phase === 'idle';
    },
    [openId, phase],
  );

  const showStandalone = (openId === null && phase === 'idle') || phase === 'revealing';

  const getStandaloneMotion = useCallback((): AccordionSlotMotion => {
    if (showStandalone) return 'visible';
    if (phase === 'hiding') return 'fading';
    return 'collapsed';
  }, [showStandalone, phase]);

  return {
    toggle,
    getSlotMotion,
    getStandaloneMotion,
    isExpanded,
    showStandalone,
    isAnimating,
    openAccordionId: openId,
  };
}
