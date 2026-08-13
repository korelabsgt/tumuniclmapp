"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export const APP_MODAL_Z_CLASS = "z-[240]";

export const APP_MODAL_OVERLAY_CLASS =
  "fixed inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-black/70 dark:backdrop-blur-sm";

type ModalPortalProps = {
  open: boolean;
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
};

export function ModalPortal({
  open,
  onClose,
  className,
  children,
}: ModalPortalProps) {
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
    <div
      className={cn(APP_MODAL_Z_CLASS, APP_MODAL_OVERLAY_CLASS, className)}
      onClick={
        onClose
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}
