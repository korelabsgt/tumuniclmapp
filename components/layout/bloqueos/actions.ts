"use server";

import { obtenerCitacionPendienteActual } from "@/components/admin/users/forms/citacionActions";
import { obtenerActividadPendienteConfirmacion } from "@/components/tareas/actions";
import { obtenerMensajePendientePermiso } from "@/components/permisos/lib/mensajes";
import { obtenerSolicitudPendienteJefe } from "@/components/solicitudes/jefes/lib/actions";

export async function obtenerBloqueosPendientesGlobales() {
  const [citacionRes, actividadRes, mensajeRes, solicitudRes] = await Promise.all([
    obtenerCitacionPendienteActual(),
    obtenerActividadPendienteConfirmacion(),
    obtenerMensajePendientePermiso(),
    obtenerSolicitudPendienteJefe(),
  ]);

  return {
    citacion:
      citacionRes.success && citacionRes.data ? citacionRes.data : null,
    actividad:
      actividadRes.success && actividadRes.data ? actividadRes.data : null,
    mensajePermiso:
      mensajeRes.success && mensajeRes.data ? mensajeRes.data : null,
    solicitudJefe:
      solicitudRes.success && solicitudRes.data ? solicitudRes.data : null,
  };
}
