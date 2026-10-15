"use server";

import { obtenerCitacionPendienteActual } from "@/components/admin/users/forms/citacionActions";
import { obtenerActividadPendienteConfirmacion } from "@/components/tareas/actions";
import { obtenerMensajePendientePermiso } from "@/components/permisos/lib/mensajes";
import { obtenerSolicitudPendienteJefe } from "@/components/solicitudes/jefes/lib/actions";
import { obtenerMensajePendienteActividadConcejo } from "@/components/concejo/agenda/tareas/lib/notificaciones";

export async function obtenerBloqueosPendientesGlobales() {
  const [citacionRes, actividadRes, mensajeRes, solicitudRes, mensajeConcejoRes] = await Promise.all([
    obtenerCitacionPendienteActual(),
    obtenerActividadPendienteConfirmacion(),
    obtenerMensajePendientePermiso(),
    obtenerSolicitudPendienteJefe(),
    obtenerMensajePendienteActividadConcejo(),
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
    mensajeActividadConcejo:
      mensajeConcejoRes.success && mensajeConcejoRes.data ? mensajeConcejoRes.data : null,
  };
}
