'use client';

import { useState, Fragment } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useRouter } from 'next/navigation';
import TablaRoles from './TablaRoles';
import CrearRolForm from './CrearRolForm';
import { Button } from '@/components/ui/button';
import { useRolesAdmin } from './hooks';

type Rol = {
  id: string;
  nombre: string;
};

export default function VerRoles() {
  const { roles, refetch: fetchRoles } = useRolesAdmin();
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const router = useRouter();

  const handleRolCreado = (_nuevoRol: Rol) => {
    void fetchRoles();
    setMostrarCrear(false);
  };

const handleRolActualizado = async (_rol: Rol) => {
  await fetchRoles();
};


  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4">
      <div className="flex justify-between items-center">
                <Button
          variant="ghost"
          onClick={() => router.push('/protected/admin')}
          className="text-blue-600 text-base underline"
        >
          Volver
        </Button>
        <h2 className="text-xl font-semibold">Listado de Roles</h2>
        <Button onClick={() => setMostrarCrear(true)}>Nuevo Rol</Button>
      </div>

<TablaRoles roles={roles} onRolActualizado={handleRolActualizado} />

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
                <DialogTitle className="text-lg font-bold mb-4">Nuevo Rol</DialogTitle>
                <CrearRolForm
                  onClose={() => setMostrarCrear(false)}
                  onRolCreado={handleRolCreado}
                />
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}