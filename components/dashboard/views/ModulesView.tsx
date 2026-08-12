"use client";

import { useMemo, useState } from "react";
import { TODOS_LOS_MODULOS } from "../constants";
import ModuleCard from "../modules/ModuleCard";
import ModuleAccordion from "../modules/ModuleAccordion";
import { useFlagsModulosDependencia } from "@/components/solicitudes/lamparas/lib/hooks";

interface ModulesViewProps {
  rol: string;
  modulos: string[];
  esjefe: boolean;
  userId?: string | null;
  dependenciaId?: string | null;
}

export default function ModulesView({
  rol,
  modulos = [],
  esjefe,
  userId,
  dependenciaId,
}: ModulesViewProps) {
  const [loadingModule, setLoadingModule] = useState<string | null>(null);
  const flags = useFlagsModulosDependencia(dependenciaId ?? null);
  const esAtencionVecino = flags.esAtencionVecino;
  const esElectricista = flags.esElectricista;
  const esDirectorSP = flags.esDirectorSP && esjefe;

  const modulosDisponibles = useMemo(
    () =>
      TODOS_LOS_MODULOS.filter((m) => {
        if (m.id === "DEV") {
          return ["SUPER", "RRHH", "SECRETARIO"].includes(rol);
        }
        if (rol === "SUPER") return true;
        if (
          [
            "ACTIVIDADES",
            "PERMISOS",
            "SOLICITUDCOMBUSTIBLE",
            "MIS_BIENES",
          ].includes(m.id)
        )
          return true;
        if (
          [
            "ASISTENCIA",
            "COMISIONES_JEFE",
            "PERMISOS_JEFE",
            "ACTIVIDADES_JEFE",
            "INVENTARIO_JEFE",
          ].includes(m.id)
        )
          return esjefe;
        if (m.id === "SOLICITUDES_JEFE") {
          return (
            esjefe ||
            esAtencionVecino ||
            ["SECRETARIO", "SUPER", "RECEPCION"].includes(rol)
          );
        }
        if (
          [
            "COMISIONES_RRHH",
            "PERMISOS_GESTION",
            "ACTIVIDADES_GESTION",
            "RRHH",
            "ORGANOS_RRHH",
          ].includes(m.id)
        ) {
          return (
            ["RRHH", "SECRETARIO"].includes(rol) || modulos.includes("RRHH")
          );
        }
        if (m.subgrupo === "Concejo Municipal") {
          return (
            ["CONCEJAL", "ALCALDE", "SECRETARIO"].includes(rol) ||
            modulos.includes("CONCEJO") ||
            modulos.includes(m.permiso)
          );
        }
        if (m.subgrupo === "Gestión de Recursos Municipales") {
          if (
            m.id === "GESTION_COMBUSTIBLE" ||
            m.id === "CONTRATOS_COMBUSTIBLE"
          ) {
            return (
              ["SUPER", "SECRETARIO", "SEC-TECNICO"].includes(rol) ||
              modulos.includes(m.permiso)
            );
          }
          if (m.id === "INVENTARIO_GENERAL") {
            return (
              ["SUPER", "SECRETARIO", "DAFIM"].includes(rol) ||
              modulos.includes(m.permiso)
            );
          }
          return (
            ["SUPER", "SECRETARIO", "SEC-TECNICO", "DAFIM"].includes(rol) ||
            modulos.includes(m.permiso)
          );
        }
        if (m.id === "SOLICITUDES_LAMARAS") {
          return (
            ["SECRETARIO", "SUPER", "RECEPCION"].includes(rol) ||
            esAtencionVecino ||
            esElectricista ||
            esDirectorSP
          );
        }
        if (m.id === "SOLICITUDES_MOBILIARIO") {
          return (
            ["SECRETARIO", "SUPER", "RECEPCION"].includes(rol) ||
            esAtencionVecino
          );
        }
        if (m.id === "RECEPCION_DOCS") {
          return (
            ["SECRETARIO", "SUPER", "RECEPCION"].includes(rol) ||
            esAtencionVecino
          );
        }
        return modulos.includes(m.permiso);
      }),
    [rol, modulos, esjefe, esAtencionVecino, esElectricista, esDirectorSP],
  );

  const modulosPoliticas = useMemo(
    () =>
      modulosDisponibles.filter((m) => m.categoria === "Políticas Públicas"),
    [modulosDisponibles],
  );
  const modulosGestion = useMemo(
    () =>
      modulosDisponibles.filter(
        (m) => m.categoria === "Gestión Administrativa",
      ),
    [modulosDisponibles],
  );

  const showConcejoAccordion = useMemo(
    () =>
      ["CONCEJAL", "ALCALDE", "SECRETARIO"].includes(rol) ||
      modulos.includes("CONCEJO"),
    [rol, modulos],
  );
  const showRRHHAccordion = useMemo(
    () => ["RRHH", "SECRETARIO"].includes(rol) || modulos.includes("RRHH"),
    [rol, modulos],
  );
  const showRecursosMunicipalesAccordion = useMemo(
    () =>
      ["SUPER", "SECRETARIO", "SEC-TECNICO", "DAFIM"].includes(rol) ||
      modulos.includes("COMBUSTIBLE") ||
      modulos.includes("CONTRATOS") ||
      modulos.includes("INVENTARIO"),
    [rol, modulos],
  );
  const showRecepcionAccordion = useMemo(
    () =>
      ["SECRETARIO", "SUPER", "RECEPCION"].includes(rol) ||
      esAtencionVecino ||
      esElectricista ||
      esDirectorSP,
    [rol, esAtencionVecino, esElectricista, esDirectorSP],
  );

  const MODULOS_NAVEGACION_DELAY_MS = 1500;
  const MODULOS_CON_DELAY = new Set([
    "SOLICITUDCOMBUSTIBLE",
    "GESTION_COMBUSTIBLE",
    "CONTRATOS_COMBUSTIBLE",
    "SOLICITUDES_LAMARAS",
    "SOLICITUDES_MOBILIARIO",
    "SOLICITUDES_JEFE",
    "RECEPCION_DOCS",
  ]);

  const RECEPCION_MODULE_ORDER: Record<string, number> = {
    SOLICITUDES_LAMARAS: 0,
    SOLICITUDES_MOBILIARIO: 1,
    SOLICITUDES_JEFE: 2,
  };

  const getNavigationDelay = (modulo: (typeof TODOS_LOS_MODULOS)[number]) =>
    MODULOS_CON_DELAY.has(modulo.id) || modulo.subgrupo === "Recepción"
      ? MODULOS_NAVEGACION_DELAY_MS
      : 0;

  const renderModuleCard = (modulo: (typeof TODOS_LOS_MODULOS)[number]) => (
    <ModuleCard
      key={modulo.id}
      modulo={modulo}
      loadingModule={loadingModule}
      setLoadingModule={setLoadingModule}
      navigationDelay={getNavigationDelay(modulo)}
    />
  );

  const tienePoliticas = modulosPoliticas.length > 0;
  const tieneGestion = modulosGestion.length > 0;

  return (
    <div className="w-full lg:max-w-[100%] xl:max-w-[90%] mx-auto">
      <div
        className={`${tienePoliticas && tieneGestion ? "grid grid-cols-1 md:grid-cols-2 gap-x-8 items-start" : "max-w-3xl mx-auto flex flex-col justify-center"}`}
      >
        {tieneGestion && (
          <div className={`space-y-4 mb-4 ${!tienePoliticas ? "w-full" : ""}`}>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-gray-100 mb-4 text-center md:text-left">
              Gestión Administrativa
            </h2>

            <ModuleAccordion
              titulo="Gestión Propia"
              descripcion="Gestión de actividades y permisos personales."
              iconKey="fmdwwfgs"
            >
              {modulosGestion
                .filter(
                  (m) =>
                    m.subgrupo === "Gestión Propia" ||
                    ["ACTIVIDADES", "PERMISOS"].includes(m.id),
                )
                .map(renderModuleCard)}
            </ModuleAccordion>

            {esjefe && (
              <ModuleAccordion
                titulo="Gestión Jefe de Área"
                descripcion="Gestión y supervisión de equipos."
                iconKey="unfvchvi"
              >
                {modulosGestion
                  .filter((m) => m.subgrupo === "Gestión Jefe de Área")
                  .map(renderModuleCard)}
              </ModuleAccordion>
            )}

            {showConcejoAccordion ? (
              <ModuleAccordion
                titulo="Concejo Municipal"
                descripcion="Gestión de actas y sesiones."
                iconKey="qaeqyqcc"
              >
                {modulosGestion
                  .filter((m) => m.subgrupo === "Concejo Municipal")
                  .map(renderModuleCard)}
              </ModuleAccordion>
            ) : (
              modulosGestion
                .filter((m) => m.subgrupo === "Concejo Municipal")
                .map(renderModuleCard)
            )}

            {showRRHHAccordion ? (
              <ModuleAccordion
                titulo="Recursos Humanos"
                descripcion="Administración de personal y permisos."
                iconKey="zyuyqigo"
              >
                {modulosGestion
                  .filter((m) => m.subgrupo === "Recursos Humanos")
                  .map(renderModuleCard)}
              </ModuleAccordion>
            ) : (
              modulosGestion
                .filter((m) => m.subgrupo === "Recursos Humanos")
                .map(renderModuleCard)
            )}

            {showRecursosMunicipalesAccordion && (
              <ModuleAccordion
                titulo="Gestión de Recursos Municipales"
                descripcion="Administre los recursos físicos, materiales y contratos municipales"
                iconKey="bikvuqcq"
              >
                {modulosGestion
                  .filter(
                    (m) => m.subgrupo === "Gestión de Recursos Municipales",
                  )
                  .map(renderModuleCard)}
              </ModuleAccordion>
            )}

            {showRecepcionAccordion && (
              <ModuleAccordion
                titulo="Recepción"
                descripcion="Gestione la recepción y despacho de documentos."
                iconKey="dicxqsya"
              >
                {modulosGestion
                  .filter(
                    (m) =>
                      m.subgrupo === "Recepción" || m.id === "SOLICITUDES_JEFE",
                  )
                  .sort(
                    (a, b) =>
                      (RECEPCION_MODULE_ORDER[a.id] ?? 99) -
                      (RECEPCION_MODULE_ORDER[b.id] ?? 99),
                  )
                  .map(renderModuleCard)}
              </ModuleAccordion>
            )}

            <div className="space-y-4 pt-2">
              {modulosGestion
                .filter(
                  (m) =>
                    !m.subgrupo && !["ACTIVIDADES", "PERMISOS"].includes(m.id),
                )
                .map(renderModuleCard)}
            </div>
          </div>
        )}

        {tienePoliticas && (
          <div className={`space-y-4 pb-2 sm:pb-0 ${!tieneGestion ? "w-full" : ""}`}>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-gray-100 mb-4 text-center md:text-left">
              Políticas Públicas
            </h2>
            <div className="space-y-4">
              {modulosPoliticas.map(renderModuleCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
