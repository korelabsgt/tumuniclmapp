import type { DependenciaNodo } from "./zod";

export function mapaDependencias(
  deps: DependenciaNodo[],
): Map<string, DependenciaNodo> {
  return new Map(deps.map((d) => [d.id, d]));
}

export function idsDescendientes(
  rootIds: string[],
  deps: DependenciaNodo[],
): Set<string> {
  const set = new Set(rootIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of deps) {
      if (d.parent_id && set.has(d.parent_id) && !set.has(d.id)) {
        set.add(d.id);
        changed = true;
      }
    }
  }
  return set;
}

export function obtenerJefeId(
  userId: string,
  userDepId: string | null,
  deps: DependenciaNodo[],
): string | null {
  if (!userDepId) return null;
  const map = mapaDependencias(deps);
  let current: string | null = userDepId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const dep = map.get(current);
    if (!dep) break;
    if (dep.jefe_id && dep.jefe_id !== userId) return dep.jefe_id;
    current = dep.parent_id;
  }
  return null;
}

export function ubicacionLaboralUsuario(
  dependenciaId: string | null,
  deps: DependenciaNodo[],
): { puesto: string | null; dependencia: string | null } {
  if (!dependenciaId) return { puesto: null, dependencia: null };
  const map = mapaDependencias(deps);
  const nodo = map.get(dependenciaId);
  if (!nodo) return { puesto: null, dependencia: null };

  if (nodo.es_puesto) {
    const parent = nodo.parent_id ? map.get(nodo.parent_id) : undefined;
    return {
      puesto: nodo.nombre,
      dependencia: parent?.nombre ?? null,
    };
  }

  return {
    puesto: null,
    dependencia: nodo.nombre,
  };
}

export function esJefeDeDependencia(
  userId: string,
  dependenciaNombre: string | null,
  deps: DependenciaNodo[],
): boolean {
  if (!dependenciaNombre) return false;
  const nombre = dependenciaNombre.trim();
  return deps.some(
    (d) => !d.es_puesto && d.nombre.trim() === nombre && d.jefe_id === userId,
  );
}

export function esJefeUsuario(
  userId: string,
  deps: DependenciaNodo[],
): boolean {
  return deps.some((d) => d.jefe_id === userId);
}

export function idsSubordinados(
  jefeUserId: string,
  oficinasACargoIds: string[],
  deps: DependenciaNodo[],
  usuarios: { user_id: string; dependencia_id: string | null }[],
): string[] {
  const alcance = idsDescendientes(oficinasACargoIds, deps);
  return usuarios
    .filter(
      (u) =>
        u.user_id !== jefeUserId &&
        u.dependencia_id !== null &&
        alcance.has(u.dependencia_id),
    )
    .map((u) => u.user_id);
}
