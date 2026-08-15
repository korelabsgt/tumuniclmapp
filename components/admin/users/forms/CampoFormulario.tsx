"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODAL_FIELD_CLASS } from "@/components/ui/general-modal";

export const CAMPO_ICON_WRAP_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#0066cc] dark:bg-blue-950/50 dark:text-blue-400";

export const CAMPO_LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-[#0066cc] dark:text-blue-400";

export const CAMPO_MONO_CLASS = `${MODAL_FIELD_CLASS} font-mono tracking-wider`;

export const CAMPO_SUBMIT_BTN_CLASS =
  "h-12 w-full cursor-pointer rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600";

export function CampoFormulario({
  icon: Icon,
  label,
  children,
  className,
  error,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={cn(className)}>
      <div className="flex items-center gap-2 pt-1">
        <span className={CAMPO_ICON_WRAP_CLASS}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
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
