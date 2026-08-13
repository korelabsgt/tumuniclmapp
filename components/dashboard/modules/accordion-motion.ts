export const ACCORDION_EASE = [0.4, 0, 0.2, 1] as const;

export const ACCORDION_FADE_MS = 400;
export const ACCORDION_MOVE_MS = 400;
export const ACCORDION_CONTENT_MS = 400;

export const accordionSlotTransition = {
  opacity: { duration: ACCORDION_FADE_MS / 1000, ease: ACCORDION_EASE },
  layout: { duration: ACCORDION_MOVE_MS / 1000, ease: ACCORDION_EASE },
};

export const accordionPanelTransition =
  `grid-template-rows ${ACCORDION_CONTENT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
