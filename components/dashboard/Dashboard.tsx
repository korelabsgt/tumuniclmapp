"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import useUserData from "@/hooks/sesion/useUserData";

import HorarioSistema from "@/components/admin/sistema/HorarioSistema";
import BroadcastButton from "@/components/push/BroadcastButton";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

import Config from "./buttons/Config";
import ViewSwitcher from "./buttons/ViewSwitcher";
import ModulesView from "./views/ModulesView";

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

  const [mostrarHorarioModal, setMostrarHorarioModal] = useState(false);

  const isSuper = rol === "SUPER";

  if (cargando) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="w-full mx-auto px-4 md:px-8 pt-2">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {permisos.includes("CONFIGURACION") && isSuper && (
          <Config onShowHorario={() => setMostrarHorarioModal(true)} />
        )}

        {isSuper && (
          <div className="md:col-span-2 order-4 md:order-2">
            <BroadcastButton />
          </div>
        )}

        <ViewSwitcher />
      </div>

      <motion.div
        key="modulos"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <ModulesView
          rol={rol}
          modulos={modulos}
          esjefe={esjefe}
          userId={userId}
          dependenciaId={dependencia_id}
        />
      </motion.div>

      <AnimatePresence>
        {mostrarHorarioModal && (
          <HorarioSistema onClose={() => setMostrarHorarioModal(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
