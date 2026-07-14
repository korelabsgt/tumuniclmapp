import { format, parseISO, eachDayOfInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";

export const HORA_ENTRADA_DEFECTO = "08:00";
export const HORA_SALIDA_DEFECTO = "16:00";
export const PASO_MINUTOS_HORARIO = 5;

export function redondearHorarioACincoMinutos(hora: string): string {
  const [hStr, mStr] = hora.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hora;
  const totalMin = h * 60 + m;
  const redondeado = Math.round(totalMin / PASO_MINUTOS_HORARIO) * PASO_MINUTOS_HORARIO;
  const nh = Math.floor(redondeado / 60) % 24;
  const nm = redondeado % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function opcionesHoras24(): string[] {
  return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
}

export function opcionesMinutosCinco(): string[] {
  return Array.from({ length: 60 / PASO_MINUTOS_HORARIO }, (_, i) =>
    String(i * PASO_MINUTOS_HORARIO).padStart(2, "0"),
  );
}

export function descomponerHorario(hora: string): {
  horas: string;
  minutos: string;
} {
  const redondeado = redondearHorarioACincoMinutos(hora);
  const [horas, minutos] = redondeado.split(":");
  return { horas, minutos };
}

export function componerHorario(horas: string, minutos: string): string {
  return redondearHorarioACincoMinutos(`${horas}:${minutos}`);
}

export type DiaHorarioAcuerdo = {
  fecha: string;
  entrada: string;
  salida: string;
};

export type SemanaAcuerdoRegistro = {
  dias: DiaHorarioAcuerdo[];
  asignadoPor: string;
};

export type DiasAcuerdoRecurrente = {
  modo: "recurrente";
  diasSemana: number[];
  fechas: string[];
  entrada: string;
  salida: string;
};

export type DiasAcuerdoTodos = {
  modo: "todos";
  entrada: string;
  salida: string;
};

export type DiasAcuerdoSemanal = {
  modo: "semanal";
  cupoSemanal: number;
  semanas: Record<string, SemanaAcuerdoRegistro | string[]>;
};

export type DiasAcuerdoJson =
  | number[]
  | DiasAcuerdoRecurrente
  | DiasAcuerdoSemanal
  | DiasAcuerdoTodos;

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

function normalizarHorario(valor: unknown, defecto: string): string {
  if (typeof valor !== "string" || !valor.trim()) return defecto;
  const limpio = valor.trim();
  if (/^\d{2}:\d{2}$/.test(limpio)) return redondearHorarioACincoMinutos(limpio);
  return defecto;
}

export function normalizarSemanaRegistro(
  raw: SemanaAcuerdoRegistro | string[] | unknown,
): SemanaAcuerdoRegistro | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    if (raw.every((x) => typeof x === "string")) {
      return {
        dias: (raw as string[]).map((fecha) => ({
          fecha,
          entrada: HORA_ENTRADA_DEFECTO,
          salida: HORA_SALIDA_DEFECTO,
        })),
        asignadoPor: "—",
      };
    }
    return null;
  }

  if (typeof raw === "object" && raw !== null && "dias" in raw) {
    const registro = raw as SemanaAcuerdoRegistro;
    const dias = Array.isArray(registro.dias)
      ? registro.dias
          .filter((d) => d && typeof d.fecha === "string")
          .map((d) => ({
            fecha: d.fecha.substring(0, 10),
            entrada: normalizarHorario(d.entrada, HORA_ENTRADA_DEFECTO),
            salida: normalizarHorario(d.salida, HORA_SALIDA_DEFECTO),
          }))
      : [];
    return {
      dias,
      asignadoPor:
        typeof registro.asignadoPor === "string" && registro.asignadoPor.trim()
          ? registro.asignadoPor.trim()
          : "—",
    };
  }

  return null;
}

export function obtenerSemanaRegistro(
  dias: DiasAcuerdoSemanal,
  semanaKey: string,
): SemanaAcuerdoRegistro | null {
  return normalizarSemanaRegistro(dias.semanas[semanaKey]);
}

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
    if (o.modo === "todos") {
      const t = value as DiasAcuerdoTodos;
      return {
        modo: "todos",
        entrada: normalizarHorario(t.entrada, HORA_ENTRADA_DEFECTO),
        salida: normalizarHorario(t.salida, HORA_SALIDA_DEFECTO),
      };
    }
    if (o.modo === "recurrente") {
      const r = value as DiasAcuerdoRecurrente;
      const diasSemana = Array.isArray(r.diasSemana)
        ? r.diasSemana.filter((d) => typeof d === "number")
        : [];
      return {
        modo: "recurrente",
        diasSemana,
        fechas: Array.isArray(r.fechas) ? r.fechas : [],
        entrada: normalizarHorario(r.entrada, HORA_ENTRADA_DEFECTO),
        salida: normalizarHorario(r.salida, HORA_SALIDA_DEFECTO),
      };
    }
    if (o.modo === "semanal") {
      const s = value as DiasAcuerdoSemanal;
      return {
        modo: "semanal",
        cupoSemanal: Math.min(5, Math.max(1, Number(s.cupoSemanal) || 2)),
        semanas: s.semanas ?? {},
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
  if (dias.modo === "todos") return "todos";
  return "todos";
}

export function construirDiasTodos(horario?: {
  entrada?: string;
  salida?: string;
}): DiasAcuerdoTodos {
  return {
    modo: "todos",
    entrada: normalizarHorario(horario?.entrada, HORA_ENTRADA_DEFECTO),
    salida: normalizarHorario(horario?.salida, HORA_SALIDA_DEFECTO),
  };
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
  horario?: { entrada?: string; salida?: string },
): DiasAcuerdoRecurrente {
  const diasLaborales = [...diasSemana]
    .filter((d) => (DIAS_LABORALES as readonly number[]).includes(d))
    .sort((a, b) => a - b);
  return {
    modo: "recurrente",
    diasSemana: diasLaborales,
    fechas: generarFechasRecurrentes(inicio, fin, diasLaborales),
    entrada: normalizarHorario(horario?.entrada, HORA_ENTRADA_DEFECTO),
    salida: normalizarHorario(horario?.salida, HORA_SALIDA_DEFECTO),
  };
}

export function construirDiasSemanal(cupoSemanal: number): DiasAcuerdoSemanal {
  return {
    modo: "semanal",
    cupoSemanal,
    semanas: {},
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
  dias: DiaHorarioAcuerdo[];
  anteriores: DiaHorarioAcuerdo[];
  cupoSemanal: number;
  hoy?: string;
}): void {
  const hoy = params.hoy ?? fechaHoyLocal();
  const fechas = params.dias.map((d) => d.fecha);
  const anteriores = params.anteriores.map((d) => d.fecha);
  const ordenar = (arr: string[]) => [...arr].sort();
  const anterioresPasadas = anteriores.filter((f) => esFechaPasada(f, hoy));
  const fechasPasadas = fechas.filter((f) => esFechaPasada(f, hoy));

  if (
    JSON.stringify(ordenar(fechasPasadas)) !==
    JSON.stringify(ordenar(anterioresPasadas))
  ) {
    throw new Error("No puede modificar días que ya pasaron");
  }

  if (fechas.some((f) => esFechaPasada(f, hoy) && !anteriores.includes(f))) {
    throw new Error("No puede elegir días que ya pasaron");
  }

  if (fechas.length > params.cupoSemanal) {
    throw new Error(`Solo puede elegir ${params.cupoSemanal} días por semana`);
  }

  for (const dia of params.dias) {
    if (dia.entrada >= dia.salida) {
      throw new Error("La hora de entrada debe ser anterior a la de salida");
    }
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
    const fechas: string[] = [];
    for (const raw of Object.values(dias.semanas)) {
      const registro = normalizarSemanaRegistro(raw);
      if (registro) fechas.push(...registro.dias.map((d) => d.fecha));
    }
    return [...new Set(fechas)];
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

  if (dias.modo === "todos") {
    return esDiaLaboral(diaString);
  }

  if (dias.modo === "semanal") {
    const semanaKey = getSemanaKey(diaString);
    const registro = obtenerSemanaRegistro(dias, semanaKey);
    if (!registro?.dias.length) return false;
    return registro.dias.some((d) => d.fecha === diaString);
  }

  return false;
}

export function actualizarSemanaAcuerdo(
  dias: DiasAcuerdoSemanal,
  semanaKey: string,
  nuevosDias: DiaHorarioAcuerdo[],
  asignadoPor: string,
): DiasAcuerdoSemanal {
  const ordenados = [...nuevosDias].sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );

  const semanasNormalizadas: Record<string, SemanaAcuerdoRegistro> = {};
  for (const [key, raw] of Object.entries(dias.semanas)) {
    const registro = normalizarSemanaRegistro(raw);
    if (registro) semanasNormalizadas[key] = registro;
  }

  return {
    ...dias,
    semanas: {
      ...semanasNormalizadas,
      [semanaKey]: {
        dias: ordenados,
        asignadoPor: asignadoPor.trim() || "—",
      },
    },
  };
}

const ETIQUETAS_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function formatearFechaCorta(fecha: string): string {
  const d = parseISO(fecha.substring(0, 10));
  return format(d, "d MMM", { locale: es });
}

export function formatearHorario12h(hora24: string): string {
  const [hStr, mStr] = hora24.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${period}`;
}

export function formatearDiasAcuerdo(dias: DiasAcuerdoJson | unknown | null): string {
  const parsed = parseDiasAcuerdo(dias);
  if (!parsed) return "Lun–Vie del rango";

  if (!Array.isArray(parsed) && parsed.modo === "todos") {
    const horario = `${formatearHorario12h(parsed.entrada)} – ${formatearHorario12h(parsed.salida)}`;
    return `Lun–Vie del rango · ${horario}`;
  }

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
    const horario = `${formatearHorario12h(parsed.entrada)} – ${formatearHorario12h(parsed.salida)}`;
    return `Fijos cada semana: ${nombres} · ${horario} (${parsed.fechas.length} fechas)`;
  }

  if (parsed.modo === "semanal") {
    const programadas = Object.keys(parsed.semanas).length;
    return `${parsed.cupoSemanal} día${parsed.cupoSemanal > 1 ? "s" : ""} laboral${parsed.cupoSemanal > 1 ? "es" : ""}/semana · ${programadas} sem. asignadas`;
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
