'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { accordionPanelTransition } from './accordion-motion';
import { MODULE_ICON_STRIP_CLASS } from './module-icon-strip';

interface ModuleAccordionProps {
  id: string;
  titulo: string;
  descripcion: string;
  iconKey: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export default function ModuleAccordion({
  id,
  titulo,
  descripcion,
  iconKey,
  children,
  isOpen,
  onToggle,
  disabled = false,
}: ModuleAccordionProps) {
  const buttonId = `module-accordion-${id}`;

  if (!children || (Array.isArray(children) && children.length === 0)) return null;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:shadow-none">
      <button
        id={buttonId}
        type="button"
        onClick={() => onToggle(id)}
        disabled={disabled}
        className={`flex w-full items-stretch text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 ${isOpen ? 'border-b border-gray-200 dark:border-zinc-700/80' : ''}`}
      >
        <div
          className={`flex w-[4.25rem] shrink-0 items-center justify-center self-stretch px-3 ${MODULE_ICON_STRIP_CLASS} ${isOpen ? 'rounded-tl-2xl' : 'rounded-l-2xl'}`}
        >
          <AnimatedIcon
            iconKey={iconKey}
            className="h-full w-full"
            trigger="loop-on-hover"
            target={`#${buttonId}`}
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-4 py-5 pr-4 pl-4">
          <div className="min-w-0 text-left">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{titulo}</h3>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{descripcion}</p>
          </div>

          {isOpen ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </div>
      </button>

      <div
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: accordionPanelTransition,
        }}
      >
        <div className="min-h-0 overflow-visible">
          <div className="flex flex-col gap-3 bg-zinc-50 px-3 py-2 dark:bg-zinc-900/40">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
