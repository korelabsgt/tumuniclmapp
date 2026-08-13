'use client';

import { motion } from 'framer-motion';
import { accordionSlotTransition, ACCORDION_MOVE_MS } from './accordion-motion';
import type { AccordionSlotMotion } from '../lib/useAccordionSequence';

interface AnimatedAccordionSlotProps {
  motionState: AccordionSlotMotion;
  children: React.ReactNode;
}

export default function AnimatedAccordionSlot({
  motionState,
  children,
}: AnimatedAccordionSlotProps) {
  const isVisible = motionState === 'visible';
  const isFading = motionState === 'fading';
  const heightCollapsed = motionState === 'collapsed' || isFading;
  const opacity = isVisible ? 1 : 0;

  return (
    <motion.div
      initial={false}
      animate={{ opacity }}
      transition={{
        opacity: accordionSlotTransition.opacity,
      }}
      className={`mb-4 grid ease-[cubic-bezier(0.4,0,0.2,1)] last:mb-0 ${heightCollapsed ? 'overflow-hidden !mb-0' : 'overflow-visible'}`}
      style={{
        gridTemplateRows: heightCollapsed ? '0fr' : '1fr',
        pointerEvents: isVisible ? 'auto' : 'none',
        transitionProperty: 'grid-template-rows, margin',
        transitionDuration: `${ACCORDION_MOVE_MS}ms`,
      }}
      aria-hidden={!isVisible && !isFading}
    >
      <div className={`min-h-0 ${heightCollapsed ? 'overflow-hidden' : 'overflow-visible'}`}>
        {children}
      </div>
    </motion.div>
  );
}
