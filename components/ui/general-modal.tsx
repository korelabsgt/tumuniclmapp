"use client";

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const MODAL_FIELD_CLASS =
  "h-12 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus-visible:ring-blue-400";

export const MODAL_TEXTAREA_CLASS =
  "min-h-[88px] rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus-visible:ring-blue-400";

export const MODAL_LABEL_CLASS =
  "text-sm font-semibold text-zinc-800 dark:text-white";

export const MODAL_PRIMARY_BTN_CLASS =
  "h-12 cursor-pointer rounded-xl bg-[#0066cc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#005bb5] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-400 dark:hover:bg-blue-500";

export const MODAL_SECONDARY_BTN_CLASS =
  "h-12 cursor-pointer rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  compactHeader?: boolean;
  fillBody?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onBack?: () => void;
  backLabel?: string;
};

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  compactHeader = false,
  fillBody = false,
  panelClassName,
  bodyClassName,
  footerClassName,
  onBack,
  backLabel = "Volver",
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 sm:bg-zinc-700/20 sm:backdrop-blur-sm sm:dark:bg-zinc-900/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-800 sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-xl dark:sm:border-zinc-700 dark:sm:shadow-black/50",
          fillBody && "sm:max-h-[92vh]",
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={cn(
            "shrink-0 px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-6",
            compactHeader && "px-4 pb-1.5 pt-3 sm:pt-4",
            compactHeader && onBack && "px-3 pb-1 pt-2 sm:pt-3",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-1 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white sm:text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {backLabel}
                </button>
              ) : null}
              <div className="min-w-0">
                <h2
                  className={cn(
                    "text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-2xl",
                    compactHeader && "text-sm font-semibold leading-snug line-clamp-2 sm:text-base",
                  )}
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p
                    className={cn(
                      "mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground",
                      compactHeader && "mt-0.5 text-[9px] normal-case tracking-normal",
                    )}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-4",
            fillBody && "flex flex-col overflow-hidden px-0 py-0",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              "shrink-0 border-t border-zinc-200 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-zinc-700 sm:pb-5",
              footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ModalLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-2 block", MODAL_LABEL_CLASS, className)}
    >
      {children}
    </label>
  );
}

export function ModalHint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
      {children}
    </p>
  );
}

export function ModalInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        MODAL_FIELD_CLASS,
        "w-full outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function ModalTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        MODAL_TEXTAREA_CLASS,
        "w-full outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function ModalSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={cn(
        MODAL_FIELD_CLASS,
        "w-full cursor-pointer outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export function ModalCancel({
  children = "Cancelar",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(MODAL_SECONDARY_BTN_CLASS, "w-full sm:w-auto", className)}
    >
      {children}
    </button>
  );
}

export function ModalSubmit({
  children = "Guardar",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      {...props}
      className={cn(MODAL_PRIMARY_BTN_CLASS, "w-full sm:w-auto", className)}
    >
      {children}
    </button>
  );
}

export function ModalConfirmDelete({
  open,
  mensaje,
  onConfirm,
  onCancel,
  loading = false,
}: {
  open: boolean;
  mensaje: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/40">
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        {mensaje}
      </p>
      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={cn(MODAL_SECONDARY_BTN_CLASS, "w-full sm:w-auto")}
        >
          No
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="h-12 w-full cursor-pointer rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 sm:w-auto"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
