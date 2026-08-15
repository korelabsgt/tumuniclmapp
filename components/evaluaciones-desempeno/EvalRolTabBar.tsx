"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  EVAL_ROL_TAB_BTN,
  EVAL_ROL_TAB_EMPLEADO,
  EVAL_ROL_TAB_INDICATOR,
  EVAL_ROL_TAB_INDICATOR_EMPLEADO,
  EVAL_ROL_TAB_INDICATOR_JEFE,
  EVAL_ROL_TAB_JEFE,
  EVAL_ROL_TABS_WRAP,
} from "./lib/ui";
import { ETIQUETAS_DIRIGIDO_A, type DirigidoAAspecto } from "./lib/zod";

const TABS: DirigidoAAspecto[] = ["empleado", "jefe"];

type Props = {
  active: DirigidoAAspecto;
  onChange: (rol: DirigidoAAspecto) => void;
};

export function EvalRolTabBar({ active, onChange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<DirigidoAAspecto, HTMLButtonElement>());
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
  }, [updateIndicator]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => updateIndicator());
    observer.observe(bar);
    for (const tab of tabRefs.current.values()) {
      observer.observe(tab);
    }
    return () => observer.disconnect();
  }, [updateIndicator, active]);

  return (
    <div ref={barRef} className={EVAL_ROL_TABS_WRAP}>
      {TABS.map((rol) => {
        const activa = active === rol;
        const estilosRol =
          rol === "empleado" ? EVAL_ROL_TAB_EMPLEADO : EVAL_ROL_TAB_JEFE;
        return (
          <button
            key={rol}
            ref={(el) => {
              if (el) tabRefs.current.set(rol, el);
              else tabRefs.current.delete(rol);
            }}
            type="button"
            onClick={() => onChange(rol)}
            className={cn(
              EVAL_ROL_TAB_BTN,
              activa ? estilosRol.activa : estilosRol.inactiva,
            )}
          >
            {ETIQUETAS_DIRIGIDO_A[rol]}
          </button>
        );
      })}
      <span
        aria-hidden
        className={cn(
          EVAL_ROL_TAB_INDICATOR,
          active === "empleado"
            ? EVAL_ROL_TAB_INDICATOR_EMPLEADO
            : EVAL_ROL_TAB_INDICATOR_JEFE,
        )}
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
    </div>
  );
}
