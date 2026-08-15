import { idsSubordinados, obtenerJefeId } from "./jerarquia";
import type {
  DependenciaNodo,
  TipoEvaluacion,
  TipoVistaEvaluaciones,
} from "./zod";

type UsuarioOrg = {
  user_id: string;
  dependencia_id: string | null;
  activo: boolean;
};

export function resolverTipoEvaluacion(params: {
  tipoVista: TipoVistaEvaluaciones;
  evaluadorId: string;
  evaluadoId: string;
  dependenciaId: string | null;
  oficinasACargo: { id: string }[];
  deps: DependenciaNodo[];
  usuarios: UsuarioOrg[];
}): TipoEvaluacion | null {
  const {
    evaluadorId,
    evaluadoId,
    dependenciaId,
    oficinasACargo,
    deps,
    usuarios,
  } = params;

  if (evaluadoId === evaluadorId) return "auto";

  const jefeId = obtenerJefeId(evaluadorId, dependenciaId, deps);
  if (jefeId === evaluadoId) return "subordinado_a_jefe";

  const subIds = idsSubordinados(
    evaluadorId,
    oficinasACargo.map((o) => o.id),
    deps,
    usuarios.filter((u) => u.activo),
  );
  if (subIds.includes(evaluadoId)) return "jefe_a_subordinado";

  return null;
}
