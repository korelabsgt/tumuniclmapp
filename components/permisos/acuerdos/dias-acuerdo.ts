import { format, parseISO, eachDayOfInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";

export type HistorialSemana = {
  semana: string;
  fechas: string[];
  guardadoAt: string;
};

export type DiasAcuerdoRecurrente = {
  modo: "recurrente";
  diasSemana: number[];
  fechas: string[];
};

export type DiasAcuerdoSemanal = {
  modo: "semanal";
  cupoSemanal: number;
  semanas: Record<string, string[]>;
  historial: HistorialSemana[];
};

export type DiasAcuerdoJson =
  | number[]
  | DiasAcuerdoRecurrente
  | DiasAcuerdoSemanal;

export type ModalidadAcuerdo = "todos" | "recurrente" | "semanal";

export const DIAS_LABORALES = [1, 2, 3, 4, 5] as const;

export function esDiaLaboral(fecha: string | Date): boolean {
  const d =
    typeof fecha === "string"
      ? new Date(`${fecha.substring(0, 10)}T12:00:00`)
      : fecha;
  const dia = d.getDay();
  return dia >= 1 && dia <= 5;
}

export const DIAS_SEMANA_LABORALES = [
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mié" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
] as const;

export function parseDiasAcuerdo(raw: unknown): DiasAcuerdoJson | null {
  if (raw == null) return null;

  let value: unknown = raw;
  for (let i = 0; i < 3; i++) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || trimmed === "null") return null;
      try {
        value = JSON.parse(trimmed) as unknown;
        continue;
      } catch {
        return null;
      }
    }
    break;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((n) => typeof n === "number")) return value as number[];
    return null;
  }
  if (typeof value === "object" && value !== null && "modo" in value) {
    const o = value as { modo: string };
    if (o.modo === "recurrente") return value as DiasAcuerdoRecurrente;
    if (o.modo === "semanal") {
      const s = value as DiasAcuerdoSemanal;
      return {
        modo: "semanal",
        cupoSemanal: Math.min(5, Math.max(1, Number(s.cupoSemanal) || 2)),
        semanas: s.semanas ?? {},
        historial: s.historial ?? [],
      };
    }
  }
  return null;
}

export function getModalidadAcuerdo(dias: DiasAcuerdoJson | null): ModalidadAcuerdo {
  if (!dias) return "todos";
  if (Array.isArray(dias)) return "recurrente";
  if (dias.modo === "recurrente") return "recurrente";
  if (dias.modo === "semanal") return "semanal";
  return "todos";
}

export function generarFechasRecurrentes(
  inicio: string,
  fin: string,
  diasSemana: number[],
): string[] {
  if (diasSemana.length === 0) return [];
  const start = parseISO(inicio.substring(0, 10));
  const end = parseISO(fin.substring(0, 10));
  const fechas: string[] = [];
  for (const day of eachDayOfInterval({ start, end })) {
    const diaSemana = day.getDay();
    if (!esDiaLaboral(day)) continue;
    if (diasSemana.includes(diaSemana)) {
      fechas.push(format(day, "yyyy-MM-dd"));
    }
  }
  return fechas;
}

export function construirDiasRecurrente(
  inicio: string,
  fin: string,
  diasSemana: number[],
): DiasAcuerdoRecurrente {
  const diasLaborales = [...diasSemana]
    .filter((d) => (DIAS_LABORALES as readonly number[]).includes(d))
    .sort((a, b) => a - b);
  return {
    modo: "recurrente",
    diasSemana: diasLaborales,
    fechas: generarFechasRecurrentes(inicio, fin, diasLaborales),
  };
}

export function construirDiasSemanal(cupoSemanal: number): DiasAcuerdoSemanal {
  return {
    modo: "semanal",
    cupoSemanal,
    semanas: {},
    historial: [],
  };
}

export function fechaHoyLocal(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function esFechaPasada(fecha: string, hoy?: string): boolean {
  const ref = (hoy ?? fechaHoyLocal()).substring(0, 10);
  return fecha.substring(0, 10) < ref;
}

export function validarSeleccionSemanaAcuerdo(params: {
  fechas: string[];
  anteriores: string[];
  cupoSemanal: number;
  hoy?: string;
}): void {
  const hoy = params.hoy ?? fechaHoyLocal();
  const ordenar = (arr: string[]) => [...arr].sort();
  const anterioresPasadas = params.anteriores.filter((f) =>
    esFechaPasada(f, hoy),
  );
  const fechasPasadas = params.fechas.filter((f) => esFechaPasada(f, hoy));

  if (
    JSON.stringify(ordenar(fechasPasadas)) !==
    JSON.stringify(ordenar(anterioresPasadas))
  ) {
    throw new Error("No puede modificar días que ya pasaron");
  }

  if (
    params.fechas.some((f) => esFechaPasada(f, hoy) && !params.anteriores.includes(f))
  ) {
    throw new Error("No puede elegir días que ya pasaron");
  }

  if (params.fechas.length > params.cupoSemanal) {
    throw new Error(`Solo puede elegir ${params.cupoSemanal} días por semana`);
  }
}

export function getSemanaKey(fecha: string): string {
  return format(parseISO(fecha.substring(0, 10)), "yyyy-'W'II");
}

export function obtenerFechasDeSemana(
  inicioVigencia: string,
  finVigencia: string,
  semanaKey: string,
): string[] {
  const start = parseISO(inicioVigencia.substring(0, 10));
  const end = parseISO(finVigencia.substring(0, 10));
  const fechas: string[] = [];
  let current = start;
  while (current <= end) {
    const fechaStr = format(current, "yyyy-MM-dd");
    const key = getSemanaKey(fechaStr);
    if (key === semanaKey && esDiaLaboral(fechaStr)) {
      fechas.push(fechaStr);
    }
    current = addDays(current, 1);
  }
  return fechas;
}

export function obtenerTodasFechasActivas(
  dias: DiasAcuerdoJson | null,
): string[] {
  if (!dias) return [];
  if (Array.isArray(dias)) return [];
  if (dias.modo === "recurrente") return [...dias.fechas];
  if (dias.modo === "semanal") {
    return [...new Set(Object.values(dias.semanas).flat())];
  }
  return [];
}

export function acuerdoAplicaEnFecha(
  dias: DiasAcuerdoJson | null,
  inicio: string,
  fin: string,
  diaString: string,
): boolean {
  const inicioDia = inicio.substring(0, 10);
  const finDia = fin.substring(0, 10);
  if (diaString < inicioDia || diaString > finDia) return false;

  if (!dias) return esDiaLaboral(diaString);

  if (Array.isArray(dias)) {
    if (dias.length === 0) return esDiaLaboral(diaString);
    const diaSemana = new Date(`${diaString}T12:00:00`).getDay();
    return esDiaLaboral(diaString) && dias.includes(diaSemana);
  }

  if (dias.modo === "recurrente") {
    return dias.fechas.includes(diaString);
  }

  if (dias.modo === "semanal") {
    const semanaKey = getSemanaKey(diaString);
    const fechasSemana = dias.semanas[semanaKey];
    if (!fechasSemana?.length) return false;
    return fechasSemana.includes(diaString);
  }

  return false;
}

export function actualizarSemanaAcuerdo(
  dias: DiasAcuerdoSemanal,
  semanaKey: string,
  nuevasFechas: string[],
): DiasAcuerdoSemanal {
  const anteriores = dias.semanas[semanaKey] ?? [];
  const ordenadas = [...nuevasFechas].sort();
  const historial = [...dias.historial];

  const cambio =
    anteriores.length > 0 &&
    (anteriores.length !== ordenadas.length ||
      anteriores.some((f, i) => f !== [...anteriores].sort()[i]) ||
      JSON.stringify([...anteriores].sort()) !== JSON.stringify(ordenadas));

  if (cambio) {
    historial.push({
      semana: semanaKey,
      fechas: [...anteriores].sort(),
      guardadoAt: new Date().toISOString(),
    });
  }

  return {
    ...dias,
    semanas: { ...dias.semanas, [semanaKey]: ordenadas },
    historial,
  };
}

const ETIQUETAS_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function formatearFechaCorta(fecha: string): string {
  const d = parseISO(fecha.substring(0, 10));
  return format(d, "d MMM", { locale: es });
}

export function formatearDiasAcuerdo(dias: DiasAcuerdoJson | unknown | null): string {
  const parsed = parseDiasAcuerdo(dias);
  if (!parsed) return "Lun–Vie del rango";

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return "Lun–Vie del rango";
    return parsed
      .sort((a, b) => a - b)
      .map((d) => ETIQUETAS_DIA[d])
      .join(", ");
  }

  if (parsed.modo === "recurrente") {
    const nombres = parsed.diasSemana
      .sort((a, b) => a - b)
      .map((d) => ETIQUETAS_DIA[d])
      .join(", ");
    return `Fijos cada semana: ${nombres} (${parsed.fechas.length} fechas)`;
  }

  if (parsed.modo === "semanal") {
    const programadas = Object.keys(parsed.semanas).length;
    return `${parsed.cupoSemanal} día${parsed.cupoSemanal > 1 ? "s" : ""} laboral${parsed.cupoSemanal > 1 ? "es" : ""}/semana · ${programadas} sem. activas`;
  }

  return "—";
}

export function listarSemanasEnRango(
  inicio: string,
  fin: string,
): string[] {
  const start = parseISO(inicio.substring(0, 10));
  const end = parseISO(fin.substring(0, 10));
  const semanas = new Set<string>();
  let current = start;
  while (current <= end) {
    semanas.add(getSemanaKey(format(current, "yyyy-MM-dd")));
    current = addDays(current, 7);
  }
  semanas.add(getSemanaKey(format(end, "yyyy-MM-dd")));
  return [...semanas].sort();
}
