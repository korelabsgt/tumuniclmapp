import type { User } from "@supabase/supabase-js";

export const PASSWORD_MAX_AGE_DAYS = 90;

const MS_DIA = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

export function passwordChangedAtIso(user: User): string | null {
  const raw = user.app_metadata?.password_changed_at;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return null;
}

export function passwordEstaVencida(user: User, ahora = Date.now()): boolean {
  const iso = passwordChangedAtIso(user);
  if (!iso) {
    return true;
  }
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) {
    return true;
  }
  return ahora - stamp >= PASSWORD_MAX_AGE_DAYS * MS_DIA;
}

export function msHastaVencimiento(user: User, ahora = Date.now()): number {
  const iso = passwordChangedAtIso(user);
  if (!iso) {
    return 0;
  }
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) {
    return 0;
  }
  return Math.max(0, stamp + PASSWORD_MAX_AGE_DAYS * MS_DIA - ahora);
}

export function timeoutAcotado(ms: number): number {
  return Math.min(Math.max(0, ms), MAX_TIMEOUT_MS);
}

const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export function formatearUltimoCambioContrasena(iso: string | null): string {
  if (!iso) {
    return "Nunca se ha actualizado";
  }

  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return "Nunca se ha actualizado";
  }

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guatemala",
    weekday: "short",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(fecha);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  const weekdayEn = valor("weekday").replace(/\./g, "");
  const mapa: Record<string, (typeof DIAS_CORTO)[number]> = {
    Sun: "Dom",
    Mon: "Lun",
    Tue: "Mar",
    Wed: "Mié",
    Thu: "Jue",
    Fri: "Vie",
    Sat: "Sáb",
  };
  const dia = mapa[weekdayEn] ?? "Lun";
  const hora = valor("hour").padStart(2, "0");
  const minuto = valor("minute").padStart(2, "0");
  const periodRaw = valor("dayPeriod").toLowerCase();
  const periodo = periodRaw.includes("p") ? "p.m." : "a.m.";

  return `${dia} ${valor("day")}/${valor("month")}/${valor("year")}, ${hora}:${minuto} ${periodo}`;
}
