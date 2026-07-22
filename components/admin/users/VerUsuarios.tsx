'use client';

import { useState, useMemo, useEffect } from 'react';
import UsersTable from '@/components/admin/users/UsersTable';
import { motion, AnimatePresence } from 'framer-motion';
import AsistenciaTable from '@/components/asistencia/tabla/AsistenciaTable';
import ListaCitaciones from '@/components/admin/users/ListaCitaciones';
import ListaFaltas from '@/components/admin/users/ListaFaltas';
import useUserData from '@/hooks/sesion/useUserData';
import { useObtenerAsistencias } from '@/hooks/asistencia/useObtenerAsistencias';
import { useListaUsuarios } from '@/hooks/usuarios/useListarUsuarios';
import Cargando from '@/components/ui/animations/Cargando';

type Vistas = 'usuarios' | 'asistencia' | 'citaciones' | 'faltas';

const normalizarVista = (saved: string | null): Vistas => {
  if (saved === 'atencion') return 'citaciones';
  if (saved === 'usuarios' || saved === 'asistencia' || saved === 'citaciones' || saved === 'faltas') {
    return saved;
  }
  return 'usuarios';
};

export default function VerUsuarios() {
  const { rol: rolActual, cargando: cargandoUsuario } = useUserData();

  const [vistaActiva, setVistaActiva] = useState<Vistas>(() => {
    if (typeof window !== 'undefined') {
      return normalizarVista(localStorage.getItem('admin_tab'));
    }
    return 'usuarios';
  });

  useEffect(() => {
    localStorage.setItem('admin_tab', vistaActiva);
  }, [vistaActiva]);

  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFinal, setFechaFinal] = useState<string | null>(null);
  const [oficinaId, setOficinaId] = useState<string | null>(null);

  const { asistencias, loading: cargandoAsistencias } = useObtenerAsistencias(
    oficinaId,
    fechaInicio,
    fechaFinal,
  );
  const { usuarios, loading: cargandoUsuarios } = useListaUsuarios();

  const usuariosFiltrados = useMemo(() => {
    if (rolActual === 'SUPER') {
      return usuarios;
    }
    return usuarios.filter((u) => u.rol !== 'SUPER');
  }, [usuarios, rolActual]);

  const asistenciasFiltradas = useMemo(() => {
    if (rolActual === 'SUPER') {
      return asistencias;
    }
    const idsSuper = usuarios.filter((u) => u.rol === 'SUPER').map((u) => u.id);
    return asistencias.filter((a) => !idsSuper.includes(a.user_id));
  }, [asistencias, usuarios, rolActual]);

  if (cargandoUsuario || cargandoUsuarios) {
    return <Cargando texto="Cargando..." />;
  }

  const tabClass = (activa: boolean, color: string) =>
    `flex-1 px-2 sm:px-4 py-2 rounded-md transition-all duration-200 ${
      activa
        ? `${color} shadow text-xs sm:text-sm font-bold`
        : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 text-[10px] sm:text-xs font-semibold'
    }`;

  return (
    <div>
      <div className="flex flex-col gap-4 w-full mx-auto md:flex-row md:justify-between md:px-4">
        <div className="flex flex-col gap-4 w-full mx-auto md:flex-row md:justify-center md:px-4">
          <div className="flex rounded-lg border p-1 bg-gray-100 dark:bg-gray-800 h-14 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setVistaActiva('usuarios')}
              className={tabClass(vistaActiva === 'usuarios', 'bg-blue-100 text-blue-600')}
            >
              Usuarios
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('asistencia')}
              className={tabClass(vistaActiva === 'asistencia', 'bg-green-100 text-green-800')}
            >
              Asistencia
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('citaciones')}
              className={tabClass(vistaActiva === 'citaciones', 'bg-purple-100 text-purple-800')}
            >
              Citaciones
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('faltas')}
              className={tabClass(vistaActiva === 'faltas', 'bg-orange-100 text-orange-800')}
            >
              Faltas
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {vistaActiva === 'usuarios' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <UsersTable usuarios={usuariosFiltrados} rolActual={rolActual} />
          </motion.div>
        )}
        {vistaActiva === 'asistencia' && (
          <motion.div
            key="asistencia"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AsistenciaTable
              registros={asistenciasFiltradas}
              rolActual={rolActual}
              loading={cargandoAsistencias}
              setOficinaId={setOficinaId}
              setFechaInicio={setFechaInicio}
              setFechaFinal={setFechaFinal}
            />
          </motion.div>
        )}
        {vistaActiva === 'citaciones' && (
          <motion.div
            key="citaciones"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ListaCitaciones usuarios={usuariosFiltrados} rolActual={rolActual} />
          </motion.div>
        )}
        {vistaActiva === 'faltas' && (
          <motion.div
            key="faltas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ListaFaltas usuarios={usuariosFiltrados} rolActual={rolActual} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
