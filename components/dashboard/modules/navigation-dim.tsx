import { cn } from "@/lib/utils";
import { ACCORDION_FADE_MS } from "./accordion-motion";

export const NAVIGATION_DIM_CLASS =
  "pointer-events-none opacity-45 dark:opacity-80 dark:brightness-[0.68] dark:saturate-[0.55]";

export function NavigationDimShell({
  loading,
  active = false,
  className,
  children,
}: {
  loading: boolean;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const dimmed = loading && !active;

  return (
    <div
      className={cn(
        "transition-[opacity,filter] ease-[cubic-bezier(0.4,0,0.2,1)]",
        dimmed && NAVIGATION_DIM_CLASS,
        className,
      )}
      style={{ transitionDuration: `${ACCORDION_FADE_MS}ms` }}
    >
      {children}
    </div>
  );
}
