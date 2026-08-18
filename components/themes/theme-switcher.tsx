"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";

function IconMoonSolid({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
      />
    </svg>
  );
}

function IconSunSolid({ className }: { className?: string }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="3.6" />
      {rays.map((deg) => (
        <rect
          key={deg}
          x="11.25"
          y="2.1"
          width="1.5"
          height="2.8"
          rx="0.75"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  );
}
const ThemeSwitcher = ({ className }: { className?: string }) => {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 sm:w-10 sm:h-10" />;
  }

  const isDark = resolvedTheme === "dark";
  const iconClass = "w-6 h-6 sm:w-[1.75rem] sm:h-[1.75rem] text-yellow-500";

  return (
    <AnimatedThemeToggler
      duration={750}
      theme={isDark ? "dark" : "light"}
      onThemeChange={setTheme}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          className="flex items-center justify-center"
          initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
          animate={{
            opacity: 1,
            rotate: hovered ? (isDark ? 12 : -8) : 0,
            scale: hovered ? 1.08 : 1,
            y: hovered ? -1 : 0,
          }}
          exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {isDark ? (
            <IconSunSolid className={iconClass} />
          ) : (
            <IconMoonSolid className={iconClass} />
          )}
        </motion.span>
      </AnimatePresence>
    </AnimatedThemeToggler>
  );
};

export { ThemeSwitcher };
