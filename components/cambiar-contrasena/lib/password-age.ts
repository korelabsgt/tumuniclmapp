import type { User } from "@supabase/supabase-js";

export const PASSWORD_MAX_AGE_DAYS = 90;
export const HORA_REVISION_GT = 9;
export const TZ_GUATEMALA = "America/Guatemala";

const MS_DIA = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

type PartesGT = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function partesGuatemala(fecha = new Date()): PartesGT {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_GUATEMALA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) => {
    const raw = parts.find((p) => p.type === tipo)?.value;
    return Number(raw);
  };

  return {
    year: valor("year"),
    month: valor("month"),
    day: valor("day"),
    hour: valor("hour"),
    minute: valor("minute"),
  };
}

function epochGuatemala(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  return Date.parse(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00-06:00`,
  );
}

export function passwordChangedAtIso(user: User): string {
  const raw = user.app_metadata?.password_changed_at;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return user.created_at;
}

export function passwordEstaVencida(user: User, ahora = Date.now()): boolean {
  const iso = passwordChangedAtIso(user);
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) {
    return true;
  }
  return ahora - stamp >= PASSWORD_MAX_AGE_DAYS * MS_DIA;
}

export function yaEsHoraDeRevisar(fecha = new Date()): boolean {
  return partesGuatemala(fecha).hour >= HORA_REVISION_GT;
}

export function msHastaLas9HoyGT(fecha = new Date()): number {
  const p = partesGuatemala(fecha);
  const target = epochGuatemala(p.year, p.month, p.day, HORA_REVISION_GT, 0);
  return Math.max(0, target - fecha.getTime());
}

export function msHastaVencimiento(user: User, ahora = Date.now()): number {
  const stamp = Date.parse(passwordChangedAtIso(user));
  if (Number.isNaN(stamp)) {
    return 0;
  }
  return Math.max(0, stamp + PASSWORD_MAX_AGE_DAYS * MS_DIA - ahora);
}

export function timeoutAcotado(ms: number): number {
  return Math.min(Math.max(0, ms), MAX_TIMEOUT_MS);
}
