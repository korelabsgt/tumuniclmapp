import { format, parseISO } from "date-fns";
import { PermisoEmpleado, esTipoAcuerdo } from "../types";
import { permisoAplicaEnDia } from "../utilidades";
import {
  parseDiasAcuerdo,
  getModalidadAcuerdo,
  obtenerSemanaRegistro,
  getSemanaKey,
  HORA_ENTRADA_DEFECTO,
  HORA_SALIDA_DEFECTO,
  formatearHorario12h,
  esDiaLaboral,
} from "../acuerdos/dias-acuerdo";

export type HorarioAsistenciaDia = {
  entrada: string | null;
  salida: string | null;
  diaCompleto: boolean;
};

export type HorarioEmpleadoRef = {
  entrada?: string | null;
  salida?: string | null;
};

function normalizarHora24(
  hora: string | null | undefined,
  defecto: string,
): string {
  if (!hora?.trim()) return defecto;
  const partes = hora.trim().split(":");
  const h = partes[0]?.padStart(2, "0") ?? defecto.slice(0, 2);
  const m = partes[1]?.padStart(2, "0") ?? "00";
  return `${h}:${m}`;
}

function minutosDesdeMedianoche(hora24: string): number {
  const [h, m] = hora24.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutosAHora24(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function resolverHorarioAcuerdo(
  record: PermisoEmpleado,
  diaString: string,
  horarioEmpleado: HorarioEmpleadoRef,
): HorarioAsistenciaDia {
  const dias = parseDiasAcuerdo(record.dias);
  const modalidad = getModalidadAcuerdo(dias);

  if (
    modalidad === "semanal" &&
    dias &&
    !Array.isArray(dias) &&
    dias.modo === "semanal"
  ) {
    const semanaKey = getSemanaKey(diaString);
    const registro = obtenerSemanaRegistro(dias, semanaKey);
    const dia = registro?.dias.find((d) => d.fecha === diaString);
    if (dia) {
      const entrada = normalizarHora24(dia.entrada, HORA_ENTRADA_DEFECTO);
      const salida = normalizarHora24(dia.salida, HORA_SALIDA_DEFECTO);
      const entNorm = normalizarHora24(
        horarioEmpleado.entrada,
        HORA_ENTRADA_DEFECTO,
      );
      const salNorm = normalizarHora24(
        horarioEmpleado.salida,
        HORA_SALIDA_DEFECTO,
      );
      const diaCompleto =
        minutosDesdeMedianoche(entrada) <= minutosDesdeMedianoche(entNorm) &&
        minutosDesdeMedianoche(salida) >= minutosDesdeMedianoche(salNorm);
      return { entrada, salida, diaCompleto };
    }
  }

  if (
    modalidad === "recurrente" &&
    dias &&
    !Array.isArray(dias) &&
    dias.modo === "recurrente" &&
    dias.fechas.includes(diaString)
  ) {
    const entrada = normalizarHora24(dias.entrada, HORA_ENTRADA_DEFECTO);
    const salida = normalizarHora24(dias.salida, HORA_SALIDA_DEFECTO);
    const entNorm = normalizarHora24(
      horarioEmpleado.entrada,
      HORA_ENTRADA_DEFECTO,
    );
    const salNorm = normalizarHora24(
      horarioEmpleado.salida,
      HORA_SALIDA_DEFECTO,
    );
    const diaCompleto =
      minutosDesdeMedianoche(entrada) <= minutosDesdeMedianoche(entNorm) &&
      minutosDesdeMedianoche(salida) >= minutosDesdeMedianoche(salNorm);
    return { entrada, salida, diaCompleto };
  }

  if (
    modalidad === "todos" &&
    dias &&
    !Array.isArray(dias) &&
    dias.modo === "todos" &&
    esDiaLaboral(diaString)
  ) {
    const entrada = normalizarHora24(dias.entrada, HORA_ENTRADA_DEFECTO);
    const salida = normalizarHora24(dias.salida, HORA_SALIDA_DEFECTO);
    const entNorm = normalizarHora24(
      horarioEmpleado.entrada,
      HORA_ENTRADA_DEFECTO,
    );
    const salNorm = normalizarHora24(
      horarioEmpleado.salida,
      HORA_SALIDA_DEFECTO,
    );
    const diaCompleto =
      minutosDesdeMedianoche(entrada) <= minutosDesdeMedianoche(entNorm) &&
      minutosDesdeMedianoche(salida) >= minutosDesdeMedianoche(salNorm);
    return { entrada, salida, diaCompleto };
  }

  return { entrada: null, salida: null, diaCompleto: true };
}

function resolverHorarioPermiso(
  record: PermisoEmpleado,
  diaString: string,
  horarioEmpleado: HorarioEmpleadoRef,
): HorarioAsistenciaDia {
  const entNorm = normalizarHora24(horarioEmpleado.entrada, HORA_ENTRADA_DEFECTO);
  const salNorm = normalizarHora24(horarioEmpleado.salida, HORA_SALIDA_DEFECTO);
  const entMin = minutosDesdeMedianoche(entNorm);
  const salMin = minutosDesdeMedianoche(salNorm);

  const inicioDia = record.inicio.substring(0, 10);
  const finDia = record.fin.substring(0, 10);

  if (inicioDia !== finDia && diaString > inicioDia && diaString < finDia) {
    return { entrada: null, salida: null, diaCompleto: true };
  }

  const inicioDate = parseISO(record.inicio);
  const finDate = parseISO(record.fin);

  let permisoInicioMin: number;
  let permisoFinMin: number;

  if (inicioDia === diaString) {
    permisoInicioMin = minutosDesdeMedianoche(format(inicioDate, "HH:mm"));
  } else {
    permisoInicioMin = 0;
  }

  if (finDia === diaString) {
    permisoFinMin = minutosDesdeMedianoche(format(finDate, "HH:mm"));
  } else {
    permisoFinMin = 24 * 60;
  }

  if (permisoInicioMin <= entMin && permisoFinMin >= salMin) {
    return { entrada: null, salida: null, diaCompleto: true };
  }

  if (inicioDia !== finDia && diaString === inicioDia) {
    if (permisoInicioMin <= entMin) {
      return { entrada: null, salida: null, diaCompleto: true };
    }
    if (permisoInicioMin >= salMin) {
      return { entrada: null, salida: null, diaCompleto: true };
    }
    return {
      entrada: entNorm,
      salida: minutosAHora24(permisoInicioMin),
      diaCompleto: false,
    };
  }

  if (inicioDia !== finDia && diaString === finDia) {
    if (permisoFinMin >= salMin) {
      return { entrada: null, salida: null, diaCompleto: true };
    }
    if (permisoFinMin <= entMin) {
      return { entrada: null, salida: null, diaCompleto: true };
    }
    return {
      entrada: minutosAHora24(permisoFinMin),
      salida: salNorm,
      diaCompleto: false,
    };
  }

  const ausenciaAlInicio = permisoInicioMin <= entMin;
  const ausenciaAlFinal = permisoFinMin >= salMin;
  const ausenciaEnMedio =
    permisoInicioMin > entMin && permisoFinMin < salMin;

  let entradaEsp = entNorm;
  let salidaEsp = salNorm;

  if (ausenciaAlInicio && !ausenciaAlFinal) {
    entradaEsp = minutosAHora24(permisoFinMin);
  } else if (!ausenciaAlInicio && ausenciaAlFinal) {
    salidaEsp = minutosAHora24(permisoInicioMin);
  } else if (ausenciaEnMedio) {
    entradaEsp = entNorm;
    salidaEsp = salNorm;
  }

  return {
    entrada: entradaEsp,
    salida: salidaEsp,
    diaCompleto: false,
  };
}

export function obtenerHorarioAsistenciaEnFecha(
  record: PermisoEmpleado | null | undefined,
  diaString: string,
  horarioEmpleado?: HorarioEmpleadoRef,
): HorarioAsistenciaDia | null {
  if (!record || !permisoAplicaEnDia(record, diaString)) return null;

  const horario = horarioEmpleado ?? {};
  if (esTipoAcuerdo(record.tipo)) {
    return resolverHorarioAcuerdo(record, diaString, horario);
  }
  return resolverHorarioPermiso(record, diaString, horario);
}

export function formatearHorarioAsistencia12h(
  hora24: string | null | undefined,
): string | null {
  if (!hora24) return null;
  return formatearHorario12h(hora24);
}

export function tieneHorarioAsignadoVisible(
  horario: HorarioAsistenciaDia | null,
): horario is HorarioAsistenciaDia {
  return !!horario && !horario.diaCompleto && !!(horario.entrada || horario.salida);
}
