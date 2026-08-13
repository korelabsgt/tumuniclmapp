"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import useUserData from "@/hooks/sesion/useUserData";
import { useFlagsModulosDependencia } from "@/components/solicitudes/lamparas/lib/hooks";

import HorarioSistema from "@/components/admin/sistema/HorarioSistema";
import BroadcastButton from "@/components/push/BroadcastButton";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

import Config from "./buttons/Config";
import ViewSwitcher from "./buttons/ViewSwitcher";
import ModulesView from "./views/ModulesView";
import { NavigationDimShell } from "./modules/navigation-dim";

const DASHBOARD_FADE = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as const,
};

const SKELETON_MIN_MS = 500;

export default function Dashboard() {
  const {
    rol,
    modulos = [],
    userId,
    esjefe,
    dependencia_id,
    permisos = [],
    cargando,
  } = useUserData();

  const { flagsPendientes } = useFlagsModulosDependencia(dependencia_id ?? null);
  const [mostrarHorarioModal, setMostrarHorarioModal] = useState(false);
  const [mostrarContenido, setMostrarContenido] = useState(false);
  const [loadingModule, setLoadingModule] = useState<string | null>(null);
  const inicioCargaRef = useRef(Date.now());

  const datosListos = !cargando && !flagsPendientes;
  const isSuper = rol === "SUPER";

  useEffect(() => {
    if (!datosListos) {
      setMostrarContenido(false);
      return;
    }

    const restante = Math.max(0, SKELETON_MIN_MS - (Date.now() - inicioCargaRef.current));
    const timer = window.setTimeout(() => setMostrarContenido(true), restante);
    return () => window.clearTimeout(timer);
  }, [datosListos]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!mostrarContenido ? (
          <motion.div
            key="dashboard-skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: DASHBOARD_FADE.ease }}
          >
            <DashboardSkeleton />
          </motion.div>
        ) : (
          <motion.section
            key="dashboard-content"
            className="mx-auto w-full px-4 pt-2 md:px-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={DASHBOARD_FADE}
          >
            <NavigationDimShell
              loading={Boolean(loadingModule)}
              className="mx-auto mb-6 grid w-full max-w-6xl grid-cols-1 items-center justify-items-center gap-4 md:grid-cols-12"
            >
              {permisos.includes("CONFIGURACION") && isSuper && (
                <Config onShowHorario={() => setMostrarHorarioModal(true)} />
              )}

              {isSuper && (
                <div className="order-4 md:order-2 md:col-span-2">
                  <BroadcastButton />
                </div>
              )}

              <ViewSwitcher />
            </NavigationDimShell>

            <div className="mx-auto w-full max-w-6xl">
              <ModulesView
                rol={rol}
                modulos={modulos}
                esjefe={esjefe}
                userId={userId}
                dependenciaId={dependencia_id}
                loadingModule={loadingModule}
                setLoadingModule={setLoadingModule}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarHorarioModal && (
          <HorarioSistema onClose={() => setMostrarHorarioModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
