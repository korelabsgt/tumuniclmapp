"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { TODOS_LOS_MODULOS } from "../constants";
import ModuleCard from "../modules/ModuleCard";
import ModuleAccordion from "../modules/ModuleAccordion";
import AnimatedAccordionSlot from "../modules/AnimatedAccordionSlot";
import DashboardSectionHeader from "../DashboardSectionHeader";
import { NavigationDimShell } from "../modules/navigation-dim";
import { useAccordionSequence } from "../lib/useAccordionSequence";
import { useFlagsModulosDependencia } from "@/components/solicitudes/lamparas/lib/hooks";

interface ModulesViewProps {
  rol: string;
  modulos: string[];
  esjefe: boolean;
  userId?: string | null;
  dependenciaId?: string | null;
  loadingModule: string | null;
  setLoadingModule: (id: string | null) => void;
}

export default function ModulesView({
  rol,
  modulos = [],
  esjefe,
  userId,
  dependenciaId,
  loadingModule,
  setLoadingModule,
}: ModulesViewProps) {
  const {
    toggle: handleAccordionToggle,
    getSlotMotion,
    isExpanded: isAccordionExpanded,
    getStandaloneMotion,
    isAnimating,
    openAccordionId,
  } = useAccordionSequence();
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

  const MODULOS_NAVEGACION_DELAY_MS = 1000;

  const RECEPCION_MODULE_ORDER: Record<string, number> = {
    SOLICITUDES_LAMARAS: 0,
    SOLICITUDES_MOBILIARIO: 1,
    SOLICITUDES_JEFE: 2,
  };

  const getNavigationDelay = (modulo: (typeof TODOS_LOS_MODULOS)[number]) =>
    modulo.ruta === "#" ? 0 : MODULOS_NAVEGACION_DELAY_MS;

  const navegando = Boolean(loadingModule);
  const gestionTieneActivo = Boolean(
    loadingModule && modulosGestion.some((m) => m.id === loadingModule),
  );
  const politicasTieneActivo = Boolean(
    loadingModule && modulosPoliticas.some((m) => m.id === loadingModule),
  );

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

  const gestionAccordionsRef = useRef<HTMLDivElement>(null);
  const gestionBaselineRef = useRef(0);
  const [gestionAccordionsMinHeight, setGestionAccordionsMinHeight] = useState(0);

  useLayoutEffect(() => {
    if (!isAnimating) return;
    const el = gestionAccordionsRef.current;
    if (!el) return;
    const next = Math.ceil(el.getBoundingClientRect().height);
    gestionBaselineRef.current = Math.max(gestionBaselineRef.current, next);
    setGestionAccordionsMinHeight(gestionBaselineRef.current);
  }, [isAnimating]);

  useLayoutEffect(() => {
    const el = gestionAccordionsRef.current;
    if (!el || openAccordionId !== null || isAnimating) return;

    const measure = () => {
      const next = Math.ceil(el.getBoundingClientRect().height);
      gestionBaselineRef.current = next;
      setGestionAccordionsMinHeight(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    openAccordionId,
    isAnimating,
    tieneGestion,
    modulosGestion.length,
    esjefe,
    showConcejoAccordion,
    showRRHHAccordion,
    showRecursosMunicipalesAccordion,
    showRecepcionAccordion,
  ]);

  return (
    <div className="mx-auto w-full lg:max-w-[100%] xl:max-w-[90%]">
      <div
        className={`${tienePoliticas && tieneGestion ? "grid grid-cols-1 items-start gap-x-8 gap-y-10 md:grid-cols-2 md:gap-y-0" : "mx-auto flex max-w-3xl flex-col justify-center"}`}
      >
        {tieneGestion && (
          <LayoutGroup>
          <NavigationDimShell loading={navegando} active={gestionTieneActivo}>
          <div
            className={`flex flex-col overflow-x-hidden ${!tienePoliticas ? "w-full" : ""}`}
          >
            <div className="mb-4">
              <DashboardSectionHeader
                titulo="Gestión Administrativa"
                colorClass="text-blue-600"
                dotClass="bg-blue-600"
                lineClass="bg-blue-600/55 dark:bg-blue-500/60"
              />
            </div>

            <div
              ref={gestionAccordionsRef}
              className="flex flex-col"
              style={
                isAnimating && gestionAccordionsMinHeight > 0
                  ? { minHeight: gestionAccordionsMinHeight }
                  : undefined
              }
            >

            <AnimatedAccordionSlot motionState={getSlotMotion("gestion-propia")}>
              <ModuleAccordion
                id="gestion-propia"
                isOpen={isAccordionExpanded("gestion-propia")}
                onToggle={handleAccordionToggle}
                disabled={isAnimating}
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
            </AnimatedAccordionSlot>

            {esjefe && (
              <AnimatedAccordionSlot motionState={getSlotMotion("gestion-jefe")}>
                <ModuleAccordion
                  id="gestion-jefe"
                  isOpen={isAccordionExpanded("gestion-jefe")}
                  onToggle={handleAccordionToggle}
                  disabled={isAnimating}
                  titulo="Gestión Jefe de Área"
                  descripcion="Gestión y supervisión de equipos."
                  iconKey="unfvchvi"
                >
                  {modulosGestion
                    .filter((m) => m.subgrupo === "Gestión Jefe de Área")
                    .map(renderModuleCard)}
                </ModuleAccordion>
              </AnimatedAccordionSlot>
            )}

            {showConcejoAccordion ? (
              <AnimatedAccordionSlot motionState={getSlotMotion("concejo")}>
                <ModuleAccordion
                  id="concejo"
                  isOpen={isAccordionExpanded("concejo")}
                  onToggle={handleAccordionToggle}
                  disabled={isAnimating}
                  titulo="Concejo Municipal"
                  descripcion="Gestión de actas y sesiones."
                  iconKey="qaeqyqcc"
                >
                  {modulosGestion
                    .filter((m) => m.subgrupo === "Concejo Municipal")
                    .map(renderModuleCard)}
                </ModuleAccordion>
              </AnimatedAccordionSlot>
            ) : (
              <AnimatedAccordionSlot
                motionState={getStandaloneMotion()}
              >
                <div className="flex flex-col gap-4">
                  {modulosGestion
                    .filter((m) => m.subgrupo === "Concejo Municipal")
                    .map(renderModuleCard)}
                </div>
              </AnimatedAccordionSlot>
            )}

            {showRRHHAccordion ? (
              <AnimatedAccordionSlot motionState={getSlotMotion("rrhh")}>
                <ModuleAccordion
                  id="rrhh"
                  isOpen={isAccordionExpanded("rrhh")}
                  onToggle={handleAccordionToggle}
                  disabled={isAnimating}
                  titulo="Recursos Humanos"
                  descripcion="Administración de personal y permisos."
                  iconKey="zyuyqigo"
                >
                  {modulosGestion
                    .filter((m) => m.subgrupo === "Recursos Humanos")
                    .map(renderModuleCard)}
                </ModuleAccordion>
              </AnimatedAccordionSlot>
            ) : (
              <AnimatedAccordionSlot
                motionState={getStandaloneMotion()}
              >
                <div className="flex flex-col gap-4">
                  {modulosGestion
                    .filter((m) => m.subgrupo === "Recursos Humanos")
                    .map(renderModuleCard)}
                </div>
              </AnimatedAccordionSlot>
            )}

            {showRecursosMunicipalesAccordion && (
              <AnimatedAccordionSlot
                motionState={getSlotMotion("recursos-municipales")}
              >
                <ModuleAccordion
                  id="recursos-municipales"
                  isOpen={isAccordionExpanded("recursos-municipales")}
                  onToggle={handleAccordionToggle}
                  disabled={isAnimating}
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
              </AnimatedAccordionSlot>
            )}

            <AnimatedAccordionSlot
              motionState={
                showRecepcionAccordion
                  ? getSlotMotion("recepcion")
                  : "collapsed"
              }
            >
              <ModuleAccordion
                id="recepcion"
                isOpen={isAccordionExpanded("recepcion")}
                onToggle={handleAccordionToggle}
                disabled={isAnimating}
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
            </AnimatedAccordionSlot>

            <AnimatedAccordionSlot
              motionState={getStandaloneMotion()}
            >
              <div className="flex flex-col gap-4 pt-2">
                {modulosGestion
                  .filter(
                    (m) =>
                      !m.subgrupo &&
                      !["ACTIVIDADES", "PERMISOS", "DEV"].includes(m.id),
                  )
                  .map(renderModuleCard)}
              </div>
            </AnimatedAccordionSlot>
            </div>
          </div>
          </NavigationDimShell>
          </LayoutGroup>
        )}

        {tienePoliticas && (
          <NavigationDimShell loading={navegando} active={politicasTieneActivo}>
          <div className={`space-y-5 pb-10 ${!tieneGestion ? "w-full" : "md:pt-1"}`}>
            <DashboardSectionHeader
              titulo="Políticas Públicas"
              colorClass="text-blue-400"
              dotClass="bg-blue-400"
              lineClass="bg-blue-400/60 dark:bg-blue-400/60"
            />
            <div className="space-y-4">
              {modulosPoliticas.map(renderModuleCard)}
            </div>
          </div>
          </NavigationDimShell>
        )}
      </div>
    </div>
  );
}
