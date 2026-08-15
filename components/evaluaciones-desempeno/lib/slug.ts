import type { TipoVistaEvaluaciones } from "./zod";

const RESERVADOS = new Set(["jefe", "rrhh", "resultados"]);

export type SeccionRutaEvaluacion = "plantilla" | "resultado-persona";

export type RutaEvaluacionDetalle = {
  slugEvaluacion: string | null;
  seccion: SeccionRutaEvaluacion;
  evaluadoId: string | null;
};

export function slugTitulo(titulo: string): string {
  const slug = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "evaluacion";
}

export function slugEvaluacion(
  nombre: string,
  id: string,
  otras: { id: string; nombre: string }[],
): string {
  const base = slugTitulo(nombre);
  const choque =
    RESERVADOS.has(base) ||
    otras.some((item) => item.id !== id && slugTitulo(item.nombre) === base);
  return choque ? `${base}-${id.slice(0, 8)}` : base;
}

export function itemPorSlug<T extends { id: string; nombre: string }>(
  items: T[],
  slug: string,
): T | undefined {
  const decodificado = decodeURIComponent(slug);
  return (
    items.find((item) => slugEvaluacion(item.nombre, item.id, items) === decodificado) ??
    items.find((item) => slugTitulo(item.nombre) === decodificado)
  );
}

export function rutaBaseEvaluaciones(tipoVista: TipoVistaEvaluaciones): string {
  if (tipoVista === "rrhh") return "/protected/evaluaciones-desempeno/rrhh";
  if (tipoVista === "jefe") return "/protected/evaluaciones-desempeno/jefe";
  return "/protected/evaluaciones-desempeno";
}

export function rutaEvaluacionDesdePath(
  pathname: string,
  tipoVista: TipoVistaEvaluaciones,
): RutaEvaluacionDetalle {
  const base = rutaBaseEvaluaciones(tipoVista);
  if (!pathname.startsWith(`${base}/`)) {
    return { slugEvaluacion: null, seccion: "plantilla", evaluadoId: null };
  }
  const partes = pathname.slice(base.length + 1).split("/").filter(Boolean);
  if (partes.length === 0) {
    return { slugEvaluacion: null, seccion: "plantilla", evaluadoId: null };
  }
  const slugEval = decodeURIComponent(partes[0]!);
  if (tipoVista === "propia" && RESERVADOS.has(slugEval.toLowerCase())) {
    return { slugEvaluacion: null, seccion: "plantilla", evaluadoId: null };
  }
  if (partes[1]?.toLowerCase() !== "resultados" || !partes[2]) {
    return { slugEvaluacion: slugEval, seccion: "plantilla", evaluadoId: null };
  }
  return {
    slugEvaluacion: slugEval,
    seccion: "resultado-persona",
    evaluadoId: decodeURIComponent(partes[2]),
  };
}

export function slugDesdePath(
  pathname: string,
  tipoVista: TipoVistaEvaluaciones,
): string | null {
  return rutaEvaluacionDesdePath(pathname, tipoVista).slugEvaluacion;
}

export function rutaPlantillaEvaluacion(
  baseRuta: string,
  nombre: string,
  id: string,
  plantillas: { id: string; nombre: string }[],
): string {
  return `${baseRuta}/${slugEvaluacion(nombre, id, plantillas)}`;
}

export function rutaResultadoPersona(
  baseRuta: string,
  nombre: string,
  formularioId: string,
  evaluadoId: string,
  plantillas: { id: string; nombre: string }[],
): string {
  return `${rutaPlantillaEvaluacion(baseRuta, nombre, formularioId, plantillas)}/resultados/${evaluadoId}`;
}

export function rutaPlantillaResultadosTab(
  baseRuta: string,
  nombre: string,
  id: string,
  plantillas: { id: string; nombre: string }[],
): string {
  return `${rutaPlantillaEvaluacion(baseRuta, nombre, id, plantillas)}?pestana=resultados`;
}
