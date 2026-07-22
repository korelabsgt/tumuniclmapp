'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, X } from 'lucide-react';

type EmpleadoOption = {
  id: string;
  nombre: string | null;
  oficina_nombre?: string | null;
  puesto_nombre?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  empleados: EmpleadoOption[];
  onSelect: (id: string) => void;
  titulo?: string;
};

export default function SelectorEmpleadoModal({
  open,
  onClose,
  empleados,
  onSelect,
  titulo = 'Seleccionar empleado',
}: Props) {
  const [busqueda, setBusqueda] = useState('');

  const termino = busqueda.trim();
  const busquedaActiva = termino.length >= 3;

  const empleadosFiltrados = useMemo(() => {
    if (!busquedaActiva) return [];
    const terminoLower = termino.toLowerCase();
    return [...empleados]
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
      .filter((e) => {
        const nombre = (e.nombre || '').toLowerCase();
        const oficina = (e.oficina_nombre || '').toLowerCase();
        return nombre.includes(terminoLower) || oficina.includes(terminoLower);
      });
  }, [empleados, termino, busquedaActiva]);

  const handleClose = () => {
    setBusqueda('');
    onClose();
  };

  const handleSelect = (id: string) => {
    setBusqueda('');
    onSelect(id);
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 dark:bg-black/70 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-xl border dark:border-neutral-800 overflow-hidden flex flex-col">
            <div className="relative px-5 py-4 border-b border-slate-200 dark:border-neutral-800 pr-12">
              <h3 className="text-base font-bold text-slate-800 dark:text-gray-100">{titulo}</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Elige el empleado para registrar el nuevo registro.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-3 right-3 p-2 rounded-lg text-[#1a95d3] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-neutral-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escribe el nombre para buscar"
                  className="pl-9 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 text-sm h-10"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[min(50vh,360px)] overflow-y-auto p-2 flex-1">
              {!busquedaActiva ? (
                <p className="text-center text-sm text-slate-500 dark:text-gray-400 py-8">
                  Escribe el nombre para buscar.
                </p>
              ) : empleadosFiltrados.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-gray-400 py-8">
                  No se encontraron empleados.
                </p>
              ) : (
                empleadosFiltrados.map((empleado) => (
                  <button
                    key={empleado.id}
                    type="button"
                    onClick={() => handleSelect(empleado.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <User size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">
                        {empleado.nombre || 'Sin nombre'}
                      </p>
                      {(empleado.oficina_nombre || empleado.puesto_nombre) && (
                        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                          {[empleado.oficina_nombre, empleado.puesto_nombre]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-neutral-800 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-w-[8rem] h-9 text-sm bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Transition>
  );
}
