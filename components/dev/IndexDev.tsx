'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, AlertTriangle, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MensajeDev } from './zod';
import MensajeDevModal from './modals/MensajeDevModal';
import { getNivelConfig } from './nivelConfig';
import { MensajeFormateado } from './mensajeFormato';
import { useMensajesDev, useInvalidarMensajesDev } from './lib/hooks';

const ITEMS_PER_PAGE = 5;

function formatFecha(fechaStr: string) {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleString('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFechaCreado(fechaStr: string) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  const diaSemana = d
    .toLocaleDateString('es-GT', { timeZone: 'America/Guatemala', weekday: 'short' })
    .replace('.', '');
  const fecha = d.toLocaleDateString('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const hora = d.toLocaleTimeString('en-US', {
    timeZone: 'America/Guatemala',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dia = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  return `${dia} ${fecha}, ${hora}`;
}

export default function IndexDev() {
  const { data: mensajes = [], isLoading: loading } = useMensajesDev();
  const invalidarMensajes = useInvalidarMensajesDev();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MensajeDev | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(mensajes.length / ITEMS_PER_PAGE));
  const mensajesPaginados = mensajes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const cargarMensajes = invalidarMensajes;

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const handleEditar = (mensaje: MensajeDev) => {
    setEditando(mensaje);
    setModalOpen(true);
  };

  const handleNuevo = () => {
    setEditando(null);
    setModalOpen(true);
  };

  return (
    <div className="w-full mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Mensajes del Sistema
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestione avisos y notificaciones que se mostrarán en el sistema.
          </p>
        </div>
        <Button
          onClick={handleNuevo}
          className="gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo mensaje
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin mr-3" />
          <span className="text-sm">Cargando mensajes...</span>
        </div>
      ) : mensajes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"
        >
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300 font-semibold">Sin mensajes configurados</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Crea el primer aviso del sistema.
            </p>
          </div>
          <Button onClick={handleNuevo} variant="outline" className="gap-2 mt-2">
            <Plus className="w-4 h-4" /> Crear mensaje
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {mensajesPaginados.map((m, i) => {
              const cfg = getNivelConfig(m.estado);
              const Icon = cfg.icon;

              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`relative flex items-start gap-4 p-5 pr-14 rounded-2xl border transition-all ${cfg.bg} ${cfg.border}`}
                >
                  <button
                    type="button"
                    onClick={() => handleEditar(m)}
                    className="absolute top-4 right-4 flex items-center justify-center p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 transition-opacity hover:opacity-80"
                    aria-label="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <div className={`flex-1 min-w-0 ${cfg.text}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Icon className={`w-6 h-6 flex-shrink-0 ${cfg.accent}`} />
                      <h3 className="font-bold truncate">
                        {m.titulo}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <MensajeFormateado
                      texto={m.mensaje}
                      className="text-sm opacity-90 line-clamp-2 mb-2 block [&_strong]:font-bold [&_em]:italic"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 opacity-70">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Inicio: {formatFecha(m.fecha_inicio)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Fin: {formatFecha(m.fecha_fin)}
                        </span>
                      </div>
                      <p className="font-bold text-right ml-auto">
                        Creado por {m.creador_nombre ?? 'Sin registrar'}, fecha: {formatFechaCreado(m.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {mensajes.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Página {currentPage} de {totalPages} ({mensajes.length} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <MensajeDevModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={cargarMensajes}
        mensajeEditar={editando}
      />
    </div>
  );
}