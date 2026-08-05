import { format, parseISO, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

function limpiarMes(fecha: Date, patron: string): string {
  return format(fecha, patron, { locale: es }).replace(/\./g, "");
}

function diaSemanaCorto(fecha: Date): string {
  const diaRaw = format(fecha, "EEE", { locale: es }).replace(".", "");
  return `${diaRaw.charAt(0).toUpperCase()}${diaRaw.slice(1)}`;
}

export function formatearRangoSemanaFiltro(
  inicioISO: string,
  finISO: string,
): string {
  const inicio = parseISO(inicioISO.substring(0, 10));
  const fin = parseISO(finISO.substring(0, 10));
  const diaInicio = format(inicio, "d", { locale: es });
  const diaFin = format(fin, "d", { locale: es });
  return `${diaSemanaCorto(inicio)} ${diaInicio} - ${diaSemanaCorto(fin)} ${diaFin}`;
}

export function formatearRangoSemana(inicioISO: string, finISO: string): string {
  const inicio = parseISO(inicioISO.substring(0, 10));
  const fin = parseISO(finISO.substring(0, 10));
  const year = format(inicio, "yyyy");

  if (isSameMonth(inicio, fin)) {
    const diaInicio = format(inicio, "d", { locale: es });
    const diaFin = format(fin, "d", { locale: es });
    const mes = limpiarMes(fin, "MMM");
    return `${diaInicio} - ${diaFin} ${mes} · ${year}`;
  }

  const inicioStr = limpiarMes(inicio, "d MMM");
  const finStr = limpiarMes(fin, "d MMM");
  return `${inicioStr} - ${finStr} · ${year}`;
}

export function getRangoMes(yyyyMM: string): { inicio: string; fin: string } {
  const [year, month] = yyyyMM.split("-").map(Number);
  return {
    inicio: format(new Date(year, month - 1, 1), "yyyy-MM-dd"),
    fin: format(new Date(year, month, 0), "yyyy-MM-dd"),
  };
}

export function getSemanasDelMes(yyyyMM: string) {
  const [year, month] = yyyyMM.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const semanas: { inicio: string; fin: string; label: string }[] = [];
  let current = start;

  while (current <= end) {
    let weekEnd = new Date(current);
    while (weekEnd.getDay() !== 0 && weekEnd < end) {
      weekEnd.setDate(weekEnd.getDate() + 1);
    }

    const inicio = format(current, "yyyy-MM-dd");
    const fin = format(weekEnd, "yyyy-MM-dd");

    semanas.push({
      inicio,
      fin,
      label: formatearRangoSemanaFiltro(inicio, fin),
    });

    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
  }

  return semanas;
}

export function formatearFechaTarjeta(date: Date): string {
  const diaRaw = format(date, "EEE", { locale: es }).replace(".", "");
  const dia = `${diaRaw.charAt(0).toUpperCase()}${diaRaw.slice(1)}`;
  const numeros = format(date, "dd/MM/yy");
  return `${dia} ${numeros}`;
}

export function formatearFechaTarjetaDesdeISO(iso: string): string {
  const d = iso.includes("T")
    ? parseISO(iso)
    : new Date(`${iso.substring(0, 10)}T12:00:00`);
  return formatearFechaTarjeta(d);
}

export function formatearFechaFiltro(fecha: string): string {
  return formatearFechaTarjeta(new Date(`${fecha.substring(0, 10)}T12:00:00`));
}

export function formatearRangoTarjeta(
  inicio: Date,
  fin: Date,
  mismoDia: boolean,
): string {
  if (mismoDia) return formatearFechaTarjeta(inicio);
  return `Del ${formatearFechaTarjeta(inicio)} al ${formatearFechaTarjeta(fin)}`;
}
