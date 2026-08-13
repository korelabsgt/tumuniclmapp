'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getNivelConfig } from './nivelConfig';
import { MensajeFormateado } from './mensajeFormato';
import { useMensajesActivosDev } from './lib/hooks';

function esDashboardInicio(pathname: string) {
  return pathname === '/protected/admin' || pathname === '/protected/user';
}

export default function DevBanner() {
  const pathname = usePathname();
  const enDashboard = esDashboardInicio(pathname);
  const { data: mensajes = [] } = useMensajesActivosDev(enDashboard);

  if (!enDashboard || mensajes.length === 0) return null;

  return (
    <div id="app-dev-banner" className="w-full shrink-0 space-y-0">
      <AnimatePresence>
        {mensajes.map((m) => {
          const cfg = getNivelConfig(m.estado);
          const Icon = cfg.icon;

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, height: 0, borderColor: cfg.borderGlow[0] }}
              animate={{
                opacity: 1,
                height: 'auto',
                borderColor: cfg.borderGlow,
              }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                opacity: { duration: 0.25 },
                height: { duration: 0.25 },
                borderColor: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
              }}
              className={`${cfg.bg} border-2`}
            >
              <div className="w-full flex items-start gap-3 px-4 py-2.5">
                <div className={`flex-1 min-w-0 text-sm ${cfg.text}`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`hidden sm:block w-7 h-7 flex-shrink-0 ${cfg.accent}`} />
                      <span className="text-base sm:text-lg font-bold leading-snug">{m.titulo}</span>
                    </div>
                    <MensajeFormateado
                      texto={m.mensaje}
                      className="opacity-80 text-xs sm:text-sm [&_strong]:font-bold [&_em]:italic"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
