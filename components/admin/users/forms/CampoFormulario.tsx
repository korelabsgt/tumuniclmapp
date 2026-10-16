"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODAL_FIELD_CLASS } from "@/components/ui/general-modal";

export const CAMPO_ICON_WRAP_CLASS =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#0066cc] sm:h-6 sm:w-6 dark:bg-blue-950/50 dark:text-blue-400";

export const CAMPO_LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc] sm:text-[10px] sm:tracking-[0.12em] dark:text-blue-400";

export const CAMPO_INPUT_CLASS = "h-11 text-sm sm:h-9";

export const CAMPO_MONO_CLASS = `${MODAL_FIELD_CLASS} ${CAMPO_INPUT_CLASS} font-mono tracking-wider`;

export const CAMPO_SUBMIT_BTN_CLASS =
  "h-11 w-full cursor-pointer rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600";

export function CampoFormulario({
  icon: Icon,
  label,
  children,
  className,
  error,
}: {
  icon: LucideIcon;
  label: ReactNode;
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={cn(className)}>
      <div className="mb-1 flex items-center gap-2 sm:mb-1.5 sm:gap-2.5">
        <span className={CAMPO_ICON_WRAP_CLASS}>
          <Icon className="h-3.5 w-3.5 sm:h-3 sm:w-3" strokeWidth={2.25} />
        </span>
        <span className={CAMPO_LABEL_CLASS}>{label}</span>
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
