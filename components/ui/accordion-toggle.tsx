'use client';

import { ChevronsUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

type Props = {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function AccordionToggleButton({ expanded, onToggle, className }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? 'Contraer todo' : 'Expandir todo'}
      className={`h-8 w-8 shrink-0 cursor-pointer p-0 bg-white hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700/50 ${className ?? ''}`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronsUpDown className="h-4 w-4" />
      </motion.div>
    </Button>
  );
}
