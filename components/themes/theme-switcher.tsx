"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <AnimatedThemeToggler
      theme={isDark ? "dark" : "light"}
      onThemeChange={setTheme}
      className={cn(
        "h-12 w-12 flex items-center justify-center rounded-md transition-colors duration-200 cursor-pointer",
        isDark ? "hover:bg-gray-800" : "hover:bg-sky-100",
        "[&_svg]:size-6",
        isDark ? "[&_svg]:text-blue-400" : "[&_svg]:text-yellow-500"
      )}
    />
  );
};

export { ThemeSwitcher };
