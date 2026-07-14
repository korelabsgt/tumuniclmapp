import { esTipoAcuerdo, type PermisoEmpleado } from "@/components/permisos/types";
import type { PerfilUsuario } from "@/components/permisos/acciones";
import type { UsuarioConJerarquia } from "@/components/permisos/types";

type VistaConteos =
  | "mis_permisos"
  | "mis_acuerdos"
  | "gestion_jefe"
  | "gestion_rrhh";

export function calcularConteosPendientes(
  todos: PermisoEmpleado[],
  perfil: PerfilUsuario,
  tipoVista: VistaConteos,
  usuariosAdaptados: UsuarioConJerarquia[],
  soloAcuerdos: boolean,
) {
  let filtrados = todos
    .filter((p) =>
      soloAcuerdos ? esTipoAcuerdo(p.tipo) : !esTipoAcuerdo(p.tipo),
    )
    .map((permiso) => {
      const usuarioEncontrado = usuariosAdaptados.find(
        (u) => u.id === permiso.user_id,
      );
      return { ...permiso, usuario: usuarioEncontrado };
    });

  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(perfil.rol || "");
  const idsOficinasJefe = perfil.oficinasACargo.map((o) => o.id);
  const nombresOficinasJefe = perfil.oficinasACargo.map((o) =>
    o.nombre.toLowerCase().trim(),
  );

  if (tipoVista === "gestion_jefe") {
    if (idsOficinasJefe.length > 0) {
      filtrados = filtrados.filter((p) => {
        const depId = p.usuario?.dependencia_id;
        const depNombre = p.usuario?.oficina_nombre?.toLowerCase().trim();
        return (
          (depId && idsOficinasJefe.includes(depId)) ||
          (depNombre && nombresOficinasJefe.includes(depNombre))
        );
      });
    } else {
      filtrados = [];
    }
  } else if (tipoVista === "gestion_rrhh") {
    if (!esRRHH) filtrados = [];
  } else if (tipoVista === "mis_permisos" || tipoVista === "mis_acuerdos") {
    filtrados = [];
  }

  let pendientes = 0;
  let avalados = 0;
  filtrados.forEach((r) => {
    if (r.estado === "pendiente") pendientes++;
    if (r.estado === "aprobado_jefe") avalados++;
  });
  return { pendientes, avalados };
}
