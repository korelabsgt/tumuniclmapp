'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const LOOP_FINISH_MS = 720;

export function useLordIconHoverLoop(forceLoop = false) {
  const [looping, setLooping] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setLooping(true);
  }, []);

  const onPointerLeave = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setLooping(false);
      leaveTimerRef.current = null;
    }, LOOP_FINISH_MS);
  }, []);

  useEffect(
    () => () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    },
    [],
  );

  return {
    trigger: forceLoop || looping ? ('loop' as const) : ('hover' as const),
    onPointerEnter,
    onPointerLeave,
  };
}
