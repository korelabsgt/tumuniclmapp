'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { registrarLog } from '@/utils/registrarLog';
import { TODOS_LOS_MODULOS } from '../constants';
import { useLordIconHoverLoop } from '../lib/useLordIconHoverLoop';
import { MODULE_ICON_STRIP_CLASS } from './module-icon-strip';
import { NAVIGATION_DIM_CLASS } from './navigation-dim';
import { ACCORDION_FADE_MS } from './accordion-motion';

interface ModuleCardProps {
  modulo: typeof TODOS_LOS_MODULOS[0];
  loadingModule: string | null;
  setLoadingModule: (id: string) => void;
  navigationDelay?: number;
}

export default function ModuleCard({
  modulo,
  loadingModule,
  setLoadingModule,
  navigationDelay = 0,
}: ModuleCardProps) {
  const router = useRouter();
  const isLoadingThisModule = loadingModule === modulo.id;
  const isDummy = modulo.ruta === '#';
  const { trigger, onPointerEnter, onPointerLeave } = useLordIconHoverLoop(
    isLoadingThisModule,
  );

  const irA = (nombreModulo: string, ruta: string) => {
    if (ruta === '#') return;
    setLoadingModule(nombreModulo);
    const delay = navigationDelay > 0 ? navigationDelay : 1000;
    if (nombreModulo && ruta) {
      registrarLog({
        accion: 'INGRESO_MODULO',
        descripcion: `Accedió al módulo de ${nombreModulo.toLowerCase()}`,
        nombreModulo,
      });
      setTimeout(() => {
        router.push(ruta);
      }, delay);
    }
  };

  return (
    <motion.div
      className={`w-full py-1 transition-[opacity,filter] ease-[cubic-bezier(0.4,0,0.2,1)] ${isLoadingThisModule ? 'relative z-10' : ''} ${loadingModule && !isLoadingThisModule ? NAVIGATION_DIM_CLASS : ''}`}
      style={{ transitionDuration: `${ACCORDION_FADE_MS}ms` }}
      animate={
        isLoadingThisModule
          ? { scale: [1, 1.025, 1, 1.015, 1] }
          : { scale: 1 }
      }
      transition={
        isLoadingThisModule
          ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      style={{ transformOrigin: 'center center' }}
    >
      <button
        type="button"
        className={`group relative flex w-full items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition-colors dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:shadow-none hover:border-gray-300 dark:hover:border-zinc-500/50 ${isDummy ? 'cursor-default' : 'cursor-pointer'}`}
        onClick={loadingModule ? undefined : () => irA(modulo.id, modulo.ruta)}
        onMouseEnter={onPointerEnter}
        onMouseLeave={onPointerLeave}
      >
        <div
          className={`flex w-[4.25rem] shrink-0 items-center justify-center self-stretch rounded-l-2xl px-3 ${MODULE_ICON_STRIP_CLASS}`}
        >
          <AnimatedIcon
            iconKey={modulo.iconoKey}
            className="h-full w-full"
            trigger={trigger}
            {...modulo.colorProps}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center py-4 pr-4 pl-3 text-left">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            {modulo.titulo}
          </h2>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {modulo.descripcion}
          </p>
        </div>
      </button>
    </motion.div>
  );
}
