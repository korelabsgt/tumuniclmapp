'use client';

import { useEffect, useState, Fragment } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useRouter } from 'next/navigation';
import TablaModulos from './TablaModulos';
import CrearModuloForm from './CrearModuloForm';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';

type Modulo = {
  id: string;
  nombre: string;
};

export default function VerModulos() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const router = useRouter();

  const fetchModulos = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('modulos').select('id, nombre');
    if (error) {
      console.error('Error al cargar módulos:', error);
      return;
    }
    const modulosFiltrados = data?.filter(modulo => modulo.nombre !== 'AFILIACION') || [];
    setModulos(modulosFiltrados);
  };

  useEffect(() => {
    fetchModulos();
  }, []);

  const handleModuloCreado = (nuevoModulo: Modulo) => {
    if (nuevoModulo.nombre !== 'AFILIACION') {
      setModulos((prev) => [...prev, nuevoModulo]);
    }
    setMostrarCrear(false);
  };

  const handleModuloActualizado = async (_: Modulo) => {
    await fetchModulos();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => router.push('/sigem/admin')}
          className="text-blue-600 text-base underline"
        >
          Volver
        </Button>
        <h2 className="text-xl font-semibold text-ce mx-7">Listado de Módulos</h2>
        <Button onClick={() => setMostrarCrear(true)}>Nuevo Módulo</Button>
      </div>

      <TablaModulos modulos={modulos} onModuloActualizado={handleModuloActualizado} />

      {/* Modal Crear */}
      <Transition show={mostrarCrear} as={Fragment}>
        <Dialog onClose={() => setMostrarCrear(false)} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
                <DialogTitle className="text-lg font-bold mb-4">Nuevo Módulo</DialogTitle>
                <CrearModuloForm
                  onClose={() => setMostrarCrear(false)}
                  onModuloCreado={handleModuloCreado}
                />
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}