"use client";

import React, { useState } from "react";
import useUserData from "@/hooks/sesion/useUserData";
import useAsistenciasJefe from "@/hooks/asistencia/useAsistenciasJefe";
import AsistenciaTable from "../tabla/AsistenciaTable";
import Cargando from "@/components/ui/animations/Cargando";

export default function VerAsistenciaOficinas() {
  const { userId, rol, cargando: cargandoUsuario } = useUserData();

  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFinal, setFechaFinal] = useState<string | null>(null);
  const [oficinaId, setOficinaId] = useState<string | null>(null);

  const { registros, dependenciasPermitidas, loading } = useAsistenciasJefe(
    userId,
    fechaInicio,
    fechaFinal,
    oficinaId,
  );

  if (cargandoUsuario) {
    return <Cargando texto="Cargando sesión..." />;
  }

  return (
    <div className="w-full">
      <AsistenciaTable
        registros={registros as any}
        dependenciasPermitidas={dependenciasPermitidas}
        rolActual={rol}
        loading={loading}
        setOficinaId={setOficinaId}
        setFechaInicio={setFechaInicio}
        setFechaFinal={setFechaFinal}
      />
    </div>
  );
}
