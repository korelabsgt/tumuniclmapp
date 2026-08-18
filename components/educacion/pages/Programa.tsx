"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, Pencil } from "lucide-react";
import EstadisticasNiveles from "../charts/Niveles";
import EstadisticasLugares from "../charts/Lugares";
import FormPrograma from "../forms/Programa";
import { useProgramaData } from "@/hooks/educacion/useProgramaData";
import { AnimatePresence } from "framer-motion";
import Maestros from "../charts/Maestros";
import FormMaestro from "../forms/Maestro";
import useUserData from "@/hooks/sesion/useUserData";

interface MaestroAlumnos {
  id: number;
  nombre: string;
  ctd_alumnos: number;
}

export default function Programa() {
  const router = useRouter();
  const params = useParams();
  const programaId = params.id as string;

  const { permisos, rol, cargando: cargandoUsuario } = useUserData();
  const {
    programa,
    nivelesDelPrograma,
    alumnosDelPrograma,
    maestrosDelPrograma,
    loading,
    fetchData,
  } = useProgramaData(programaId);
  const [isFormNivelOpen, setIsFormNivelOpen] = useState(false);
  const [isFormMaestroOpen, setIsFormMaestroOpen] = useState(false);
  const [maestroAEditar, setMaestroAEditar] = useState<MaestroAlumnos | null>(
    null,
  );

  useEffect(() => {
    if (isFormNivelOpen || isFormMaestroOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isFormNivelOpen, isFormMaestroOpen]);

  const handleCloseAndRefresh = () => {
    setIsFormNivelOpen(false);
    fetchData();
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const nivelId = data.activePayload[0].payload.id;
      router.push(
        `/sigem/educacion/programa/${programaId}/nivel/${nivelId}`,
      );
    }
  };

  const handleOpenEditMaestro = (maestro: MaestroAlumnos) => {
    setMaestroAEditar(maestro);
    setIsFormMaestroOpen(true);
  };

  const handleCloseMaestroForm = () => {
    setIsFormMaestroOpen(false);
    setMaestroAEditar(null);
  };

  const handleSaveMaestroForm = () => {
    setIsFormMaestroOpen(false);
    setMaestroAEditar(null);
    fetchData();
  };

  if (loading || cargandoUsuario) {
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-300">
        Cargando Programa...
      </div>
    );
  }

  if (!programa) {
    return (
      <div className="mx-auto w-full lg:w-4/5 max-w-7xl p-4 lg:p-6 text-center text-red-600 dark:text-red-400 font-bold">
        Error: No se encontró el programa con el ID '{programaId}'.
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full lg:w-4/5 max-w-7xl p-4 lg:p-6">
        <header className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row lg:justify-between items-start lg:items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="link"
              className="w-full md:w-auto gap-2 p-0 text-blue-600 dark:text-blue-400 justify-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="flex flex-col sm:flex-row justify-end gap-2 w-full md:w-auto">
              {(permisos.includes("CREAR") || permisos.includes("TODO")) && (
                <>
                  <Button
                    onClick={() => setIsFormMaestroOpen(true)}
                    className="w-full sm:w-auto gap-2 whitespace-nowrap bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/40"
                    variant="outline"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Crear/Asignar Maestro
                  </Button>
                  <Button
                    onClick={() => setIsFormNivelOpen(true)}
                    className="w-full sm:w-auto gap-2 whitespace-nowrap"
                  >
                    Nuevo Nivel
                  </Button>
                </>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100">
              {programa.nombre}
            </h1>
            <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-1">
              {programa.descripcion ||
                "Este programa no tiene una descripción."}
            </p>
          </div>
        </header>

        <main className="space-y-4">
          {nivelesDelPrograma && alumnosDelPrograma ? (
            <EstadisticasNiveles
              niveles={nivelesDelPrograma}
              alumnos={alumnosDelPrograma}
              onBarClick={handleBarClick}
            />
          ) : (
            <div className="border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 shadow-sm overflow-x-hidden p-4">
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                No hay datos para mostrar.
              </div>
            </div>
          )}

          {maestrosDelPrograma && (
            <Maestros
              onEdit={handleOpenEditMaestro}
              maestros={maestrosDelPrograma}
              rol={rol}
            />
          )}
          {alumnosDelPrograma ? (
            <EstadisticasLugares alumnos={alumnosDelPrograma} />
          ) : (
            <div className="border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 shadow-sm overflow-x-hidden p-4">
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                No hay datos de alumnos para mostrar.
              </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isFormNivelOpen && (
          <FormPrograma
            isOpen={isFormNivelOpen}
            onClose={() => setIsFormNivelOpen(false)}
            onSave={handleCloseAndRefresh}
            programaAEditar={null}
            programaPadreId={programa.id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormMaestroOpen && (
          <FormMaestro
            isOpen={isFormMaestroOpen}
            onClose={handleCloseMaestroForm}
            onSave={handleSaveMaestroForm}
            maestroAEditar={maestroAEditar}
            nivelId={Number(programaId)} // O el ID del nivel específico si estás dentro de uno
          />
        )}
      </AnimatePresence>
    </>
  );
}
