'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Pencil, UserPlus, GraduationCap, ChevronDown } from 'lucide-react';
import type { Alumno, Maestro } from '@/components/educacion/lib/esquemas';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.css';

import { useNivelData } from '@/hooks/educacion/useNivelData';
import { useTodosAlumnos } from '@/hooks/educacion/useEducacionData';
import useUserData from '@/hooks/sesion/useUserData';
import { createClient } from '@/utils/supabase/client';

import { Button } from '@/components/ui/button';
import FormAlumno from '../../forms/Alumno';
import AsignarMaestro from '../../forms/AsignarMaestro';
import FormPrograma from '../../forms/Programa';

import Lista from './Lista';
import Estadistica from './Estadistica';
import Asistencia from './Asistencia';
import HistorialAsistencia from './HistorialAsistencia';
import OpcionesAlumno from './modals/OpcionesAlumno';
import AlumnoCard from '../../forms/AlumnoCard';

export default function Nivel() {
  const router = useRouter();
  const params = useParams();
  const nivelId = params.nivelId as string;
  const { permisos, cargando: cargandoUsuario } = useUserData();
  const { nivel, alumnosDelNivel, maestros, loading, fetchData } = useNivelData(nivelId);
  const { data: todosLosAlumnos = [] } = useTodosAlumnos();

  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [alumnoParaEditar, setAlumnoParaEditar] = useState<Alumno | null>(null);
  const [isFormAlumnoOpen, setIsFormAlumnoOpen] = useState(false);
  const [isAsignarMaestroOpen, setIsAsignarMaestroOpen] = useState(false);
  const [isFormNivelOpen, setIsFormNivelOpen] = useState(false);
  const [accionesAbiertas, setAccionesAbiertas] = useState<Alumno | null>(null);
  const [tabActiva, setTabActiva] = useState<'lista' | 'asistencia' | 'historial'>('lista');

  useEffect(() => {
    const isModalOpen = isFormAlumnoOpen || alumnoSeleccionado || isAsignarMaestroOpen || isFormNivelOpen || accionesAbiertas;
    if (isModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isFormAlumnoOpen, alumnoSeleccionado, isAsignarMaestroOpen, isFormNivelOpen, accionesAbiertas]);

  const handleOpenFormAlumno = () => {
    setAlumnoParaEditar(null);
    setIsFormAlumnoOpen(true);
  };

  const handleOpenEditarAlumno = (alumno: Alumno) => {
    setAlumnoParaEditar(alumno);
    setIsFormAlumnoOpen(true);
    setAccionesAbiertas(null);
  };

  const handleCancelFormAlumno = () => {
    setIsFormAlumnoOpen(false);
    setAlumnoParaEditar(null);
  };

  const handleSaveAndCloseFormAlumno = () => {
    setIsFormAlumnoOpen(false);
    setAlumnoParaEditar(null);
    fetchData();
  };

  const handleDesinscribir = async (alumno: Alumno) => {
    if (!nivel) {
      toast.error('Error: No se pudo obtener la información del nivel.');
      return;
    }

    // Nota: SweetAlert2 por defecto es claro. Para dark mode nativo en swal se requiere configuración global de CSS, 
    // pero aquí mantenemos la funcionalidad base.
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasignar a "${alumno.nombre_completo}" de este nivel?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desasignar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const supabase = createClient();
        const { error } = await supabase
          .from('alumnos_inscripciones')
          .delete()
          .match({ alumno_id: alumno.id, programa_id: nivel.id });

        if (error) {
          toast.error('No se pudo quitar la inscripción.');
        } else {
          toast.success(`"${alumno.nombre_completo}" ha sido desasignado de este nivel.`);
          fetchData();
        }
      }
      setAccionesAbiertas(null);
    });
  };

  const maestroAsignado: Maestro | null = useMemo(() => {
    if (!nivel || !nivel.maestro_id || !maestros || maestros.length === 0) return null;
    return maestros.find(m => m.id === nivel.maestro_id) || null;
  }, [nivel, maestros]);

  if (loading || cargandoUsuario || !nivel) {
    // Texto de carga ajustado para dark mode
    return <div className="text-center py-10 text-gray-600 dark:text-gray-300">Cargando Nivel...</div>;
  }

  return (
    <>
      <div className="mx-auto w-full lg:w-4/5 max-w-7xl p-4 lg:p-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex-shrink-0">
            <Button
              variant="link"
              // Botón Volver: azul oscuro en light, azul claro en dark
              className="gap-2 text-blue-600 dark:text-blue-400 justify-start p-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
          <div className='w-full sm:w-auto flex flex-col items-end'>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  // Botón Principal del Dropdown:
                  // Light: bg-blue-50 text-blue-700
                  // Dark: bg-blue-900/20 text-blue-300 border-blue-800
                  className="w-full sm:w-auto gap-2 whitespace-nowrap bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/40"
                  variant="link"
                >
                  <h3 className="text-xl">
                    {nivel.nombre}
                  </h3>
                  <ChevronDown className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </Button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  // Menú desplegable: Fondo blanco en light, gris oscuro (neutral-800) en dark
                  className="mt-2 rounded-md bg-white dark:bg-neutral-800 p-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-neutral-700 focus:outline-none z-50 min-w-[200px]"
                  sideOffset={5}
                  align="center"
                >
                  <div className="w-full px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-normal">
                    {nivel.descripcion || 'Sin descripción'}
                  </div>

                  <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-neutral-700 my-1" />

                  {(permisos.includes('EDITAR') || permisos.includes('TODO')) && (
                    <DropdownMenu.Item asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex justify-start gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => setIsFormNivelOpen(true)}
                      >
                        <Pencil className="h-4 w-4" /> Editar Nivel
                      </Button>
                    </DropdownMenu.Item>
                  )}
                  {(permisos.includes('EDITAR') || permisos.includes('TODO')) && (
                    <DropdownMenu.Item asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex justify-start gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={handleOpenFormAlumno}
                      >
                        <UserPlus className="h-4 w-4" /> Inscribir Alumno
                      </Button>
                    </DropdownMenu.Item>
                  )}
                  {(permisos.includes('EDITAR') || permisos.includes('TODO')) && (
                    <DropdownMenu.Item asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex justify-start gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => setIsAsignarMaestroOpen(true)}
                      >
                        <GraduationCap className="h-4 w-4" /> Asignar Maestro
                      </Button>
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <div className="flex flex-col gap-3">
        </div>

        <div className="flex justify-center sm:justify-start border-b border-gray-200 dark:border-neutral-700 mt-4 overflow-x-auto md:overflow-x-visible select-none no-scrollbar">
          <button
            onClick={() => setTabActiva('lista')}
            className={`pb-1 px-1 text-xs sm:text-sm md:text-base font-semibold transition-colors border-b-2 leading-tight flex items-center justify-center text-center w-24 sm:w-auto ${tabActiva === 'lista' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Lista de Alumnos
          </button>
          <button
            onClick={() => setTabActiva('asistencia')}
            className={`pb-1 px-1 text-xs sm:text-sm md:text-base font-semibold transition-colors border-b-2 leading-tight flex items-center justify-center text-center w-24 sm:w-auto ${tabActiva === 'asistencia' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Toma de Asistencia
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`pb-1 px-1 text-xs sm:text-sm md:text-base font-semibold transition-colors border-b-2 leading-tight flex items-center justify-center text-center w-24 sm:w-auto ${tabActiva === 'historial' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Historial de Asistencia
          </button>
        </div>

        <div className="flex flex-col gap-6 mt-4 min-h-[400px]">
          {tabActiva === 'lista' && (
            <>
              <Lista
                alumnosDelNivel={alumnosDelNivel}
                maestroAsignado={maestroAsignado}
                setAccionesAbiertas={setAccionesAbiertas}
              />
              <Estadistica alumnosDelNivel={alumnosDelNivel} />
            </>
          )}
          {tabActiva === 'asistencia' && (
            <Asistencia nivelId={nivelId} alumnosDelNivel={alumnosDelNivel} />
          )}
          {tabActiva === 'historial' && (
            <HistorialAsistencia nivelId={nivelId} alumnosDelNivel={alumnosDelNivel} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {accionesAbiertas && (
          <OpcionesAlumno
            alumno={accionesAbiertas}
            onClose={() => setAccionesAbiertas(null)}
            onView={() => setAlumnoSeleccionado(accionesAbiertas)}
            onEdit={(permisos.includes('EDITAR') || permisos.includes('TODO')) ? handleOpenEditarAlumno : undefined}
            onDesinscribir={(permisos.includes('EDITAR') || permisos.includes('TODO')) ? () => handleDesinscribir(accionesAbiertas) : undefined}
            permisos={permisos}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {alumnoSeleccionado && (
          <AlumnoCard
            isOpen={!!alumnoSeleccionado}
            onClose={() => setAlumnoSeleccionado(null)}
            alumno={alumnoSeleccionado}
            key={alumnoSeleccionado.id}
          />
        )}
      </AnimatePresence>
      <FormAlumno
        isOpen={isFormAlumnoOpen}
        onClose={handleCancelFormAlumno}
        onSave={handleSaveAndCloseFormAlumno}
        nivelId={nivel?.id}
        todosLosAlumnos={todosLosAlumnos}
        alumnosInscritos={alumnosDelNivel}
        alumnoAEditar={alumnoParaEditar}
      />
      <AsignarMaestro
        isOpen={isAsignarMaestroOpen}
        onClose={() => setIsAsignarMaestroOpen(false)}
        onSave={() => { setIsAsignarMaestroOpen(false); fetchData(); }}
        nivelId={nivel?.id}
      />
      <AnimatePresence>
        {isFormNivelOpen && (
          <FormPrograma
            isOpen={isFormNivelOpen}
            onClose={() => setIsFormNivelOpen(false)}
            onSave={() => {
              setIsFormNivelOpen(false);
              fetchData();
            }}
            programaAEditar={nivel}
          />
        )}
      </AnimatePresence>
    </>
  );
}