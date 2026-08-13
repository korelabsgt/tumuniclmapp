"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const TAB_EASE = [0.22, 1, 0.36, 1] as const;

type AnimatedTabContentProps = {
  activeKey: string;
  children: React.ReactNode;
};

export function AnimatedTabContent({
  activeKey,
  children,
}: AnimatedTabContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const update = () => {
      setHeight(node.getBoundingClientRect().height);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeKey]);

  return (
    <motion.div
      animate={{ height: height ?? "auto" }}
      initial={false}
      transition={{ duration: 0.38, ease: TAB_EASE }}
      className="overflow-hidden"
    >
      <div ref={contentRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: TAB_EASE }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
