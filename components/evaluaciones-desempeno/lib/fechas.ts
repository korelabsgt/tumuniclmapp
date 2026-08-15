export function fechaDiaDeDb(value: unknown): string {
  if (!value) return "";
  return String(value).split("T")[0] ?? "";
}

export function fechaCalendarioAGuardar(fecha: string): string {
  return `${fecha}T12:00:00-06:00`;
}

export function hoyCalendarioGT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formularioEnVigencia(
  fechaInicio: string,
  fechaFin: string,
): boolean {
  const hoy = hoyCalendarioGT();
  return fechaInicio <= hoy && hoy <= fechaFin;
}

export function formatearFechaCalendario(fecha: string): string {
  const dia = fechaDiaDeDb(fecha);
  if (!dia) return "—";
  const [y, m, d] = dia.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

function partesCalendario(fecha: string): { y: number; m: number; d: number } | null {
  const dia = fechaDiaDeDb(fecha);
  if (!dia) return null;
  const [y, m, d] = dia.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function diaSemanaCortoGT(date: Date): string {
  const raw = new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    weekday: "short",
  })
    .format(date)
    .replace(/\./g, "")
    .toLowerCase();

  if (raw.startsWith("lun")) return "Lun";
  if (raw.startsWith("mar")) return "Mar";
  if (raw.startsWith("mi")) return "Mié";
  if (raw.startsWith("jue")) return "Jue";
  if (raw.startsWith("vie")) return "Vie";
  if (raw.startsWith("sáb") || raw.startsWith("sab")) return "Sáb";
  return "Dom";
}

function formatearPartesCortas(
  partes: { y: number; m: number; d: number },
  diaSemana: string,
): string {
  const dia = String(partes.d).padStart(2, "0");
  const mes = MESES_CORTOS[partes.m - 1] ?? "—";
  const anio = String(partes.y).slice(-2);
  return `${diaSemana} ${dia}/${mes}/${anio}`;
}

export function formatearFechaCorta(fecha: string): string {
  const partes = partesCalendario(fecha);
  if (!partes) return "—";
  const date = new Date(partes.y, partes.m - 1, partes.d);
  return formatearPartesCortas(partes, DIAS_CORTOS[date.getDay()] ?? "—");
}

export function formatearRangoVigencia(inicio: string, fin: string): string {
  return `${formatearFechaCorta(inicio)} a ${formatearFechaCorta(fin)}`;
}

export function formatearFechaInstante(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-GT", {
    timeZone: "America/Guatemala",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatearFechaInstanteCorta(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const partes = partesCalendario(iso);
  if (!partes) return "—";
  return formatearPartesCortas(partes, diaSemanaCortoGT(date));
}

export function formatearFechaHoraInstante(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const partes = partesCalendario(iso);
  if (!partes) return "—";

  const dia = String(partes.d).padStart(2, "0");
  const mes = String(partes.m).padStart(2, "0");
  const anio = String(partes.y).slice(-2);
  const diaSemana = diaSemanaCortoGT(date);

  const horaPartes = new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hora =
    horaPartes.find((parte) => parte.type === "hour")?.value.padStart(2, "0") ??
    "00";
  const minuto =
    horaPartes.find((parte) => parte.type === "minute")?.value ?? "00";
  const meridiano = horaPartes.find((parte) => parte.type === "dayPeriod")?.value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const periodo =
    meridiano === "a.m." || meridiano === "a. m." || meridiano === "am"
      ? "a. m."
      : "p. m.";

  return `${diaSemana} ${dia}/${mes}/${anio}. ${hora}:${minuto} ${periodo}`;
}

export function claveDiaDeInstante(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function mesAnioDeInstante(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, parte) => {
      if (parte.type !== "literal") acc[parte.type] = parte.value;
      return acc;
    }, {});
  const y = partes.year;
  const m = partes.month;
  if (!y || !m) return null;
  return `${y}-${m}`;
}

export function anioActualGuatemala(): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, parte) => {
      if (parte.type !== "literal") acc[parte.type] = parte.value;
      return acc;
    }, {});
  return Number(partes.year) || new Date().getFullYear();
}

export type FiltroPeriodoTerminadas = {
  anio: number;
  mes: number | null;
};

export function filtroPeriodoTerminadasInicial(): FiltroPeriodoTerminadas {
  return { anio: anioActualGuatemala(), mes: null };
}

export function etiquetaFiltroPeriodo(filtro: FiltroPeriodoTerminadas): string {
  if (filtro.mes == null) return String(filtro.anio);
  return etiquetaMesAnio(
    `${filtro.anio}-${String(filtro.mes).padStart(2, "0")}`,
  );
}

export function fechaCalendarioCoincidePeriodo(
  fechaDia: string | null | undefined,
  filtro: FiltroPeriodoTerminadas,
): boolean {
  const dia = fechaDiaDeDb(fechaDia);
  if (!dia) return false;
  const [y, m] = dia.split("-").map(Number);
  if (!y || !m) return false;
  if (y !== filtro.anio) return false;
  if (filtro.mes != null && m !== filtro.mes) return false;
  return true;
}

export function resultadoCoincidePeriodo(
  fecha: string | null | undefined,
  filtro: FiltroPeriodoTerminadas,
): boolean {
  const clave = mesAnioDeInstante(fecha);
  if (!clave) return false;
  const [y, m] = clave.split("-").map(Number);
  if (y !== filtro.anio) return false;
  if (filtro.mes != null && m !== filtro.mes) return false;
  return true;
}

export function mesAnioActualGuatemala(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, parte) => {
      if (parte.type !== "literal") acc[parte.type] = parte.value;
      return acc;
    }, {});
  const y = partes.year;
  const m = partes.month;
  if (!y || !m) return "";
  return `${y}-${m}`;
}

export function etiquetaMesAnio(clave: string): string {
  const [y, m] = clave.split("-").map(Number);
  if (!y || !m) return clave;
  const etiqueta = new Date(y, m - 1, 1).toLocaleDateString("es-GT", {
    month: "long",
    year: "numeric",
  });
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
}
