"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  EVAL_TAB_ACTIVE,
  EVAL_TAB_BAR,
  EVAL_TAB_BTN,
  EVAL_TAB_COUNT,
  EVAL_TAB_COUNT_ACTIVE,
  EVAL_TAB_COUNT_INACTIVE,
  EVAL_TAB_INDICATOR,
  EVAL_TAB_INACTIVE,
} from "./lib/ui";

export type EvalTabId =
  | "pendientes"
  | "borradores"
  | "terminadas"
  | "resultados"
  | "evaluaciones"
  | "plantilla"
  | "mio"
  | "al_jefe"
  | "autoevaluacion"
  | "eval_empleados"
  | "eval_comparar";

type TabItem = {
  id: EvalTabId;
  label: string;
  icon: ReactNode;
  count?: number;
};

type Props = {
  tabs: TabItem[];
  active: EvalTabId;
  onChange: (id: EvalTabId) => void;
  className?: string;
};

export function EvalTabBar({ tabs, active, onChange, className }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<EvalTabId, HTMLButtonElement>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const bar = barRef.current;
    const tab = tabRefs.current.get(active);
    if (!bar || !tab) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setIndicator({
      left: tabRect.left - barRect.left,
      width: tabRect.width,
    });
  }, [active]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, tabs]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => updateIndicator());
    observer.observe(bar);
    for (const tab of tabRefs.current.values()) {
      observer.observe(tab);
    }
    return () => observer.disconnect();
  }, [updateIndicator, tabs, active]);

  return (
    <div ref={barRef} className={cn(EVAL_TAB_BAR, className)}>
      {tabs.map((tab) => {
        const activa = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              EVAL_TAB_BTN,
              activa ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  EVAL_TAB_COUNT,
                  activa ? EVAL_TAB_COUNT_ACTIVE : EVAL_TAB_COUNT_INACTIVE,
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
      <span
        aria-hidden
        className={EVAL_TAB_INDICATOR}
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
    </div>
  );
}
