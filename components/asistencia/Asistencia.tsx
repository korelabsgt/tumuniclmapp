"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import useUserData from "@/hooks/sesion/useUserData";
import { es } from "date-fns/locale";
import {
  format,
  isSameDay,
  getDay,
  getMonth,
  getYear,
  set,
  addMinutes,
  isBefore,
  isAfter,
  isToday,
  parseISO,
} from "date-fns";
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  MapPin,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Calendario from "./Calendario";
import Mapa from "../ui/modals/Mapa";
import PreviewPermiso from "@/components/permisos/modals/PreviewPermiso";
import VerComision from "@/components/comisiones/VerComision";
import { PermisoEmpleado } from "@/components/permisos/types";
import Cargando from "@/components/ui/animations/Cargando";
import Swal, { SweetAlertOptions } from "sweetalert2";

import { useMarcarAsistencia } from "@/hooks/asistencia/useMarcarAsistencia";
import useFechaHora from "@/hooks/utility/useFechaHora";
import { useAsistenciaUsuario } from "@/hooks/asistencia/useAsistenciaUsuario";
import { usePermisosUsuario } from "@/hooks/asistencia/usePermisosUsuario";
import { obtenerJustificacionParaDia } from "@/components/permisos/justificaciones";
import {
  obtenerHorarioAsistenciaEnFecha,
  formatearHorarioAsistencia12h,
  tieneHorarioAsignadoVisible,
} from "@/components/permisos/utilidades";
import { esTipoAcuerdo } from "@/components/permisos/types";
import PreviewAcuerdo from "@/components/permisos/acuerdos/modals/PreviewAcuerdo";
import { useObtenerUbicacion } from "@/hooks/ubicacion/useObtenerUbicacion";
import {
  getCategoriaIcon,
  getCategoriaJustificacionClass,
  getCategoriaLabel,
  getCategoriaPermiso,
  getCategoriaTextClass,
  COMISION_TEXT_CLASS,
  COMISION_BADGE_CLASS,
} from "@/components/permisos/categorias";
import {
  getCategoriaAcuerdo,
  getCategoriaAcuerdoIcon,
  getCategoriaAcuerdoLabel,
  getCategoriaAcuerdoJustificacionClass,
  getCategoriaAcuerdoTextClass,
} from "@/components/permisos/acuerdos/categorias";
import {
  useObtenerComisiones,
  type ComisionConFechaYHoraSeparada,
} from "@/hooks/comisiones/useObtenerComisiones";
import {
  resolverEstadoMarcaje,
  getEstadoMarcajeMeta,
  esEntradaTardeMarcaje,
  ENTRADA_TARDE_TIME_CLASS,
  MARCaje_FILA_CLASS,
  MARCaje_ETIQUETA_CLASS,
  MARCaje_HORA_CLASS,
  MINUTOS_INICIO_ENTRADA_TARDE,
} from "@/components/asistencia/lib/estado-marcaje";

const JUSTIFICACION_BADGE_CLASS =
  "w-full min-h-[2.35rem] py-2 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 text-center text-[11px] sm:text-xs leading-snug border shadow-sm";
const JUSTIFICACION_ICON_CLASS = "w-4 h-4 flex-shrink-0";

const formatScheduleTime = (timeString: string | null | undefined) => {
  if (!timeString) return "--";
  try {
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, "0")}:${minutes} ${period}`;
  } catch (e) {
    return timeString;
  }
};

const formatScheduleDays = (days: number[] | null | undefined): string => {
  if (!days || days.length === 0) return "Horario no asignado";
  if (
    days.length === 5 &&
    days[0] === 1 &&
    days[1] === 2 &&
    days[2] === 3 &&
    days[3] === 4 &&
    days[4] === 5
  ) {
    return "Lunes a Viernes";
  }
  if (
    days.length === 6 &&
    days[0] === 1 &&
    days[1] === 2 &&
    days[2] === 3 &&
    days[3] === 4 &&
    days[4] === 5 &&
    days[5] === 6
  ) {
    return "Lunes a Sábado";
  }
  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return days
    .sort((a, b) => a - b)
    .map((d) => dayNames[d] || "?")
    .join(", ");
};

interface AsistenciaProps {
  onFinalizar?: () => void;
}

export default function Asistencia({ onFinalizar }: AsistenciaProps) {
  const {
    userId,
    nombre,
    cargando: cargandoUsuario,
    horario_nombre,
    horario_dias,
    horario_entrada,
    horario_salida,
  } = useUserData();

  const {
    asistencias: todosLosRegistros,
    loading: cargandoRegistros,
  } = useAsistenciaUsuario(userId, null, null);
  const { permisos: permisosEmpleado, loading: cargandoPermisos } = usePermisosUsuario(userId);
  const marcarAsistenciaMutation = useMarcarAsistencia();
  const marcandoAsistencia = marcarAsistenciaMutation.isPending;
  const fechaHoraGt = useFechaHora();
  const { comisiones: comisionesEmpleado, loading: cargandoComisiones } = useObtenerComisiones(
    getMonth(fechaHoraGt),
    getYear(fechaHoraGt),
    cargandoUsuario ? null : userId || null,
  );

  const {
    ubicacion,
    cargando: cargandoGeo,
    obtenerUbicacion,
    error: errorGeo,
  } = useObtenerUbicacion();

  const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
  const [registrosSeleccionadosParaMapa, setRegistrosSeleccionadosParaMapa] =
    useState<{ entrada: any | null; salida: any | null; multiple?: any[] }>({
      entrada: null,
      salida: null,
    });
  const [activeTab, setActiveTab] = useState<"controlResumen" | "semanal">(
    "controlResumen",
  );
  const [tipoRegistroPendiente, setTipoRegistroPendiente] = useState<
    "Entrada" | "Salida" | "Marca" | null
  >(null);
  const [permisoSeleccionadoParaMapa, setPermisoSeleccionadoParaMapa] = useState<PermisoEmpleado | null>(null);
  const [permisoParaPreview, setPermisoParaPreview] = useState<PermisoEmpleado | null>(null);
  const [acuerdoParaPreview, setAcuerdoParaPreview] = useState<PermisoEmpleado | null>(null);
  const [comisionPreview, setComisionPreview] = useState<ComisionConFechaYHoraSeparada | null>(null);
  const [mapaComisionRegistros, setMapaComisionRegistros] = useState<any>(null);
  const [mapaComisionNombre, setMapaComisionNombre] = useState("");
  const [notasPendientes, setNotasPendientes] = useState("");

  const justificacionHoy = useMemo(() => {
    if (!permisosEmpleado) return null;
    const hoyStr = format(fechaHoraGt, 'yyyy-MM-dd');
    return obtenerJustificacionParaDia(permisosEmpleado, hoyStr);
  }, [permisosEmpleado, fechaHoraGt]);

  const permisoHoy = justificacionHoy && !esTipoAcuerdo(justificacionHoy.tipo) ? justificacionHoy : null;
  const acuerdoHoy = justificacionHoy && esTipoAcuerdo(justificacionHoy.tipo) ? justificacionHoy : null;
  const justificacionVigente = justificacionHoy;

  const hoyStr = format(fechaHoraGt, "yyyy-MM-dd");
  const horarioAsignadoHoy = useMemo(() => {
    if (!justificacionVigente) return null;
    return obtenerHorarioAsistenciaEnFecha(justificacionVigente, hoyStr, {
      entrada: horario_entrada,
      salida: horario_salida,
    });
  }, [justificacionVigente, hoyStr, horario_entrada, horario_salida]);

  const comisionHoy = useMemo((): ComisionConFechaYHoraSeparada | null => {
    if (!comisionesEmpleado || comisionesEmpleado.length === 0) return null;
    const hoyStr = format(fechaHoraGt, 'yyyy-MM-dd');
    return comisionesEmpleado.find(c => c.aprobado && c.fecha_hora.startsWith(hoyStr)) || null;
  }, [comisionesEmpleado, fechaHoraGt]);

  const {
    estaFueraDeHorario,
    scheduleEntrada,
    scheduleSalida,
    scheduleSalidaTarde,
    horarioFormateado,
    esHorarioMultiple,
    esDiaLaboral,
    puedeMarcarEntrada,
    puedeMarcarSalida,
  } = useMemo(() => {
    const horaEntradaStr = horario_entrada || "08:00:00";
    const horaSalidaStr = horario_salida || "16:00:00";
    const diasLaborales = horario_dias || [1, 2, 3, 4, 5];

    const [hE, mE, sE] = horaEntradaStr.split(":").map(Number);
    const [hS, mS, sS] = horaSalidaStr.split(":").map(Number);

    let scheduleEntrada = set(fechaHoraGt, {
      hours: hE,
      minutes: mE,
      seconds: sE || 0,
      milliseconds: 0,
    });

    let scheduleSalida = set(fechaHoraGt, {
      hours: hS,
      minutes: mS,
      seconds: sS || 0,
      milliseconds: 0,
    });

    if (tieneHorarioAsignadoVisible(horarioAsignadoHoy)) {
      if (horarioAsignadoHoy.entrada) {
        const [h, m] = horarioAsignadoHoy.entrada.split(":").map(Number);
        scheduleEntrada = set(fechaHoraGt, {
          hours: h,
          minutes: m,
          seconds: 0,
          milliseconds: 0,
        });
      }
      if (horarioAsignadoHoy.salida) {
        const [h, m] = horarioAsignadoHoy.salida.split(":").map(Number);
        scheduleSalida = set(fechaHoraGt, {
          hours: h,
          minutes: m,
          seconds: 0,
          milliseconds: 0,
        });
      }
    } else if (justificacionVigente && !esTipoAcuerdo(justificacionVigente.tipo)) {
      const horarioPermiso = obtenerHorarioAsistenciaEnFecha(
        justificacionVigente,
        hoyStr,
        { entrada: horario_entrada, salida: horario_salida },
      );
      if (horarioPermiso && !horarioPermiso.diaCompleto && horarioPermiso.salida) {
        const [h, m] = horarioPermiso.salida.split(":").map(Number);
        scheduleSalida = set(fechaHoraGt, {
          hours: h,
          minutes: m,
          seconds: 0,
          milliseconds: 0,
        });
      }
    }

    const scheduleSalidaTarde = addMinutes(scheduleSalida, 15);

    const puedeMarcarEntrada = isAfter(
      fechaHoraGt,
      addMinutes(scheduleEntrada, -60),
    );
    const puedeMarcarSalida = justificacionVigente 
      ? fechaHoraGt.getTime() >= scheduleSalida.getTime()
      : isAfter(fechaHoraGt, addMinutes(scheduleSalida, -60));

    const diaDeLaSemana = getDay(fechaHoraGt);
    const esDiaLaboral = diasLaborales.includes(diaDeLaSemana);

    const estaFueraDeHorario =
      !esDiaLaboral ||
      isBefore(fechaHoraGt, scheduleEntrada) ||
      isAfter(fechaHoraGt, scheduleSalida);

    const horarioFormateado = {
      nombre: horario_nombre || "Normal",
      dias: formatScheduleDays(horario_dias),
      entrada: tieneHorarioAsignadoVisible(horarioAsignadoHoy) && horarioAsignadoHoy.entrada
        ? (formatearHorarioAsistencia12h(horarioAsignadoHoy.entrada) ?? formatScheduleTime(horario_entrada))
        : formatScheduleTime(horario_entrada),
      salida: tieneHorarioAsignadoVisible(horarioAsignadoHoy) && horarioAsignadoHoy.salida
        ? (formatearHorarioAsistencia12h(horarioAsignadoHoy.salida) ?? format(scheduleSalida, "hh:mm aa", { locale: es }))
        : format(scheduleSalida, "hh:mm aa", { locale: es }),
    };

    const esHorarioMultiple =
      horario_nombre?.trim().toLowerCase() === "multiple";

    return {
      estaFueraDeHorario,
      scheduleEntrada,
      scheduleSalida,
      scheduleSalidaTarde,
      horarioFormateado,
      esHorarioMultiple,
      esDiaLaboral,
      puedeMarcarEntrada,
      puedeMarcarSalida,
    };
  }, [
    fechaHoraGt,
    horario_entrada,
    horario_salida,
    horario_dias,
    horario_nombre,
    justificacionVigente,
    horarioAsignadoHoy,
    hoyStr,
  ]);

  // Determina si la comisión de hoy "toca" la hora de entrada o salida
  const { comisionTocaEntrada, comisionTocaSalida } = useMemo(() => {
    if (!comisionHoy)
      return { comisionTocaEntrada: false, comisionTocaSalida: false };
    const comisionDate = parseISO(comisionHoy.fecha_hora.replace(' ', 'T'));
    const comisionMin = comisionDate.getHours() * 60 + comisionDate.getMinutes();
    const entradaMin = scheduleEntrada.getHours() * 60 + scheduleEntrada.getMinutes();
    const salidaMin = scheduleSalida.getHours() * 60 + scheduleSalida.getMinutes();
    return {
      comisionTocaEntrada: comisionMin <= entradaMin,
      comisionTocaSalida: comisionMin >= salidaMin,
    };
  }, [comisionHoy, scheduleEntrada, scheduleSalida]);

  const registroEntradaHoy = useMemo(() => {
    if (!todosLosRegistros) return null;
    return todosLosRegistros.find(
      (r: any) =>
        isSameDay(parseISO(r.created_at), fechaHoraGt) &&
        r.tipo_registro === "Entrada",
    );
  }, [todosLosRegistros, fechaHoraGt]);

  const registroSalidaHoy = useMemo(() => {
    if (!todosLosRegistros) return null;
    return todosLosRegistros.find(
      (r: any) =>
        isSameDay(parseISO(r.created_at), fechaHoraGt) &&
        r.tipo_registro === "Salida",
    );
  }, [todosLosRegistros, fechaHoraGt]);

  const registrosHoyMultiple = useMemo(() => {
    if (!todosLosRegistros) return [];
    return todosLosRegistros.filter((r: any) =>
      isSameDay(parseISO(r.created_at), fechaHoraGt),
    );
  }, [todosLosRegistros, fechaHoraGt]);



  useEffect(() => {
    if (modalMapaAbierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modalMapaAbierto]);

  useEffect(() => {
    if (ubicacion && tipoRegistroPendiente) {
      handleMarcarAsistencia(tipoRegistroPendiente, ubicacion, notasPendientes);
      setTipoRegistroPendiente(null);
      setNotasPendientes("");
    } else if (errorGeo && tipoRegistroPendiente) {
      Swal.fire("Error de Ubicación", errorGeo, "error");
      setTipoRegistroPendiente(null);
      setNotasPendientes("");
    }
  }, [ubicacion, errorGeo, tipoRegistroPendiente]);

  const handleIniciarMarcado = async (tipo: "Entrada" | "Salida" | "Marca") => {
    let swalConfig: SweetAlertOptions = {
      input: "textarea",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: `Sí, realizar marca`,
      cancelButtonText: "Cancelar",
    };

    if (tipo === "Marca") {
      swalConfig = {
        ...swalConfig,
        title: "Realizar Marca",
        text: "Por favor especifique el detalle de esta marca.",
        icon: "info",
        inputPlaceholder:
          "Por favor escriba el tipo de Marca que está realizando...",
        confirmButtonText: "Confirmar Marca",
        inputValidator: (value) => {
          if (!value)
            return "¡Debe especificar el tipo de marca que está realizando!";
        },
      };
    } else if (tipo === "Salida") {
      swalConfig.confirmButtonText = "Sí, marcar Salida";
      const esSalidaTemprana = isBefore(fechaHoraGt, scheduleSalida);
      const esSalidaTarde = isAfter(fechaHoraGt, scheduleSalidaTarde);
      if (esSalidaTemprana || esSalidaTarde) {
        const motivo = esSalidaTemprana ? "antes" : "después";
        swalConfig = {
          ...swalConfig,
          title: esSalidaTemprana
            ? "Justificación de Salida Temprana"
            : "Justificación de Salida Tarde",
          text: `Está marcando su salida ${motivo} del horario asignado (${format(scheduleSalida, "h:mm a", { locale: es })}). Por favor, ingrese una justificación obligatoria.`,
          icon: "warning",
          inputPlaceholder: "Escriba su justificación aquí (requerido)...",
          inputValidator: (value) => {
            if (!value) return "¡Necesita justificación!";
          },
        };
      } else {
        swalConfig = {
          ...swalConfig,
          title: "Confirmar Salida",
          text: "¿Desea agregar nota opcional?",
          icon: "question",
          inputPlaceholder: "Notas opcionales...",
        };
      }
    } else {
      swalConfig.confirmButtonText = "Sí, marcar Entrada";
      const limiteEntradaTarde = addMinutes(scheduleEntrada, MINUTOS_INICIO_ENTRADA_TARDE);
      const esEntradaTarde = !isBefore(fechaHoraGt, limiteEntradaTarde);
      if (esEntradaTarde) {
        swalConfig = {
          ...swalConfig,
          title: "Justificación de Entrada Tarde",
          text: `Está marcando entrada tarde (a partir de ${format(limiteEntradaTarde, "h:mm a", { locale: es })}). Justificación obligatoria.`,
          icon: "warning",
          inputPlaceholder: "Escriba su justificación aquí (requerido)...",
          inputValidator: (value) => {
            if (!value) return "¡Necesita justificación!";
          },
        };
      } else {
        swalConfig = {
          ...swalConfig,
          title: "Confirmar Entrada",
          text: "¿Desea agregar nota opcional?",
          icon: "question",
          inputPlaceholder: "Notas opcionales...",
        };
      }
    }

    const { value: notaIngresada, isConfirmed } = await Swal.fire(swalConfig);

    if (isConfirmed) {
      let notasFinales = notaIngresada || "";
      if (tipo !== "Marca") {
        if (tipo === "Salida" && isBefore(fechaHoraGt, scheduleSalida))
          notasFinales = `Salida Temprano: ${notasFinales}`;
        else if (tipo === "Salida" && isAfter(fechaHoraGt, scheduleSalidaTarde))
          notasFinales = `Salida Tarde: ${notasFinales}`;
        else if (
          tipo === "Entrada" &&
          !isBefore(
            fechaHoraGt,
            addMinutes(scheduleEntrada, MINUTOS_INICIO_ENTRADA_TARDE),
          )
        )
          notasFinales = `Entrada Tarde: ${notasFinales}`;
      }
      setNotasPendientes(notasFinales);
      setTipoRegistroPendiente(tipo);

      obtenerUbicacion();
    }
  };

  const handleMarcarAsistencia = async (
    tipo: string,
    ubicacionActual: { lat: number; lng: number },
    notasDeMarcado: string,
  ) => {
    if (!userId) {
      Swal.fire("Error", "No se encontró el ID de usuario.", "error");
      return;
    }

    const nuevoRegistro = await marcarAsistenciaMutation.mutateAsync({
      userId,
      tipo,
      ubicacion: ubicacionActual,
      notas: notasDeMarcado,
    });

    if (nuevoRegistro) {
      await Swal.fire(
        `¡${tipo === "Marca" ? "Marca" : tipo} Exitosa!`,
        `Registrado correctamente.`,
        "success",
      );
      if (onFinalizar) {
        onFinalizar();
      }
    }
  };

  const handleAbrirMapa = (registro: any) => {
    if (!registro?.ubicacion) return;
    const fechaRegistro = new Date(registro.created_at);
    const registrosDeEseDia = todosLosRegistros.filter((r: any) =>
      isSameDay(new Date(r.created_at), fechaRegistro),
    );
    
    // Buscar permiso para este día
    const diaString = format(fechaRegistro, 'yyyy-MM-dd');
    const permiso = obtenerJustificacionParaDia(permisosEmpleado, diaString);

    setPermisoSeleccionadoParaMapa(permiso);
    setRegistrosSeleccionadosParaMapa({
      entrada:
        registrosDeEseDia.find((r) => r.tipo_registro === "Entrada") || null,
      salida:
        registrosDeEseDia.find((r) => r.tipo_registro === "Salida") || null,
      multiple: esHorarioMultiple ? registrosDeEseDia : undefined,
    });
    setModalMapaAbierto(true);
  };

  const handleAbrirMapaHoy = () => {
    setPermisoSeleccionadoParaMapa(permisoHoy);
    setRegistrosSeleccionadosParaMapa({
      entrada: null,
      salida: null,
      multiple: registrosHoyMultiple,
    });
    setModalMapaAbierto(true);
  };

  const entradaMarcada = !!registroEntradaHoy;
  const salidaMarcada = !!registroSalidaHoy;
  const hayRegistrosHoy = registrosHoyMultiple.length > 0;

  if (cargandoUsuario || cargandoRegistros)
    return <Cargando texto="Asistencia..." />;

  const renderBotonMarcado = () => {
    if (!esHorarioMultiple && !esDiaLaboral) {
      return (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 rounded-md text-center transition-colors">
          <p className="text-yellow-700 dark:text-yellow-500 font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Hoy no es un día laboral asignado.
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-600 mt-1">
            Solo puede marcar asistencia los días: {horarioFormateado.dias}
          </p>
        </div>
      );
    }

    if (esHorarioMultiple) {
      return (
        <Button
          onClick={() => handleIniciarMarcado("Marca")}
          disabled={marcandoAsistencia || cargandoGeo}
          className="w-full py-6 text-base bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center gap-2 border-0 text-white"
        >
          {cargandoGeo && <MapPin className="animate-bounce h-4 w-4" />}
          {cargandoGeo
            ? "Obteniendo ubicación..."
            : marcandoAsistencia
              ? "Registrando..."
              : "Marcar"}
        </Button>
      );
    }

    if (!entradaMarcada) {
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          <Button
            onClick={() => handleIniciarMarcado("Entrada")}
            disabled={marcandoAsistencia || cargandoGeo || !puedeMarcarEntrada}
            className={`w-full py-6 text-base flex items-center justify-center gap-2 border-0 text-white transition-all ${
              puedeMarcarEntrada
                ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                : "bg-gray-300 dark:bg-neutral-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {cargandoGeo && <MapPin className="animate-bounce h-4 w-4" />}
            {cargandoGeo
              ? "Obteniendo ubicación..."
              : marcandoAsistencia
                ? "Marcando..."
                : "Marcar Entrada"}
          </Button>
          {!puedeMarcarEntrada && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Podrá marcar a su hora de entrada: {horarioFormateado.entrada}
            </p>
          )}
        </div>
      );
    } else if (!salidaMarcada) {
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          <Button
            onClick={() => handleIniciarMarcado("Salida")}
            disabled={marcandoAsistencia || cargandoGeo || !puedeMarcarSalida}
            className={`w-full py-6 text-base flex items-center justify-center gap-2 border-0 text-white transition-all ${
              puedeMarcarSalida
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                : "bg-gray-300 dark:bg-neutral-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {cargandoGeo && <MapPin className="animate-bounce h-4 w-4" />}
            {cargandoGeo
              ? "Obteniendo ubicación..."
              : marcandoAsistencia
                ? "Marcando..."
                : "Marcar Salida"}
          </Button>
          {!puedeMarcarSalida && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Podrá marcar a su hora de salida: {horarioFormateado.salida}
            </p>
          )}
        </div>
      );
    } else {
      return (
        <p className="text-center text-gray-500 dark:text-gray-400 font-semibold p-4 bg-gray-100 dark:bg-neutral-800 rounded-md">
          Jornada completada por hoy
        </p>
      );
    }
  };

  const horarioEntradaHoyStr = format(scheduleEntrada, "HH:mm:ss");

  const getEntradaTextClass = () => {
    if (registroEntradaHoy) {
      if (
        esEntradaTardeMarcaje({
          marcaEntradaAt: registroEntradaHoy.created_at,
          horarioEntrada: horarioEntradaHoyStr,
          diaString: format(fechaHoraGt, "yyyy-MM-dd"),
          notas: registroEntradaHoy.notas,
        })
      ) {
        return ENTRADA_TARDE_TIME_CLASS;
      }
      return "font-normal text-gray-800 dark:text-gray-200";
    }
    if (permisoHoy) return getCategoriaTextClass(getCategoriaPermiso(permisoHoy));
    if (acuerdoHoy) return getCategoriaAcuerdoTextClass(getCategoriaAcuerdo(acuerdoHoy));
    if (comisionHoy && comisionTocaEntrada) return COMISION_TEXT_CLASS;
    return "text-red-400";
  };

  const getSalidaTextClass = () => {
    if (registroSalidaHoy) {
      return "font-normal text-gray-800 dark:text-gray-200";
    }
    if (permisoHoy) return getCategoriaTextClass(getCategoriaPermiso(permisoHoy));
    if (acuerdoHoy) return getCategoriaAcuerdoTextClass(getCategoriaAcuerdo(acuerdoHoy));
    if (comisionHoy && comisionTocaSalida) return COMISION_TEXT_CLASS;
    return "text-red-400";
  };

  const renderComisionHoyBtn = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (comisionHoy) setComisionPreview(comisionHoy);
      }}
      title={comisionHoy?.titulo}
      className={`${JUSTIFICACION_BADGE_CLASS} cursor-pointer transition-colors hover:opacity-80 ${COMISION_BADGE_CLASS}`}
    >
      <Briefcase className={JUSTIFICACION_ICON_CLASS} />
      Comisión
    </button>
  );

  const renderAcuerdoHoyBtn = (acuerdo: PermisoEmpleado) => {
    const categoria = getCategoriaAcuerdo(acuerdo);
    const Icono = getCategoriaAcuerdoIcon(categoria);

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAcuerdoParaPreview(acuerdo);
        }}
        className={`${JUSTIFICACION_BADGE_CLASS} transition-colors cursor-pointer ${getCategoriaAcuerdoJustificacionClass(categoria)}`}
      >
        <Icono className={JUSTIFICACION_ICON_CLASS} />
        {getCategoriaAcuerdoLabel(categoria)}
      </button>
    );
  };

  const renderEstadoMarcajeHoyBtn = () => {
    const hoyStr = format(fechaHoraGt, "yyyy-MM-dd");
    const estado = resolverEstadoMarcaje({
      fechaStr: hoyStr,
      tieneEntrada: !!registroEntradaHoy,
      tieneSalida: !!registroSalidaHoy,
      notasEntrada: registroEntradaHoy?.notas,
      notasSalida: registroSalidaHoy?.notas,
      marcaEntradaAt: registroEntradaHoy?.created_at,
      horarioEntrada: horarioEntradaHoyStr,
    });

    if (!estado) return null;

    const meta = getEstadoMarcajeMeta(estado);
    const Icono = meta.icon;

    return (
      <div className={`${JUSTIFICACION_BADGE_CLASS} ${meta.className} cursor-default transition-colors`}>
        <Icono className={JUSTIFICACION_ICON_CLASS} />
        {meta.label}
      </div>
    );
  };

  const renderJustificacionHoyBtn = () => {
    if (permisoHoy) return renderPermisoHoyBtn(permisoHoy);
    if (acuerdoHoy) return renderAcuerdoHoyBtn(acuerdoHoy);
    if (comisionHoy) return renderComisionHoyBtn();
    return renderEstadoMarcajeHoyBtn();
  };

  const renderPermisoHoyBtn = (permiso: PermisoEmpleado) => {
    const categoria = getCategoriaPermiso(permiso);
    const Icono = getCategoriaIcon(categoria);

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setPermisoParaPreview(permiso);
        }}
        className={`${JUSTIFICACION_BADGE_CLASS} transition-colors cursor-pointer ${getCategoriaJustificacionClass(categoria)}`}
      >
        <Icono className={JUSTIFICACION_ICON_CLASS} />
        {getCategoriaLabel(categoria)}
      </button>
    );
  };

  return (
    <>
      <div className="w-full xl:max-w-3xl mx-auto">
        <div className="border-b dark:border-neutral-800 flex mb-4 flex-wrap justify-center transition-colors">
          <button
            onClick={() => setActiveTab("controlResumen")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs lg:text-sm transition-colors ${
              activeTab === "controlResumen"
                ? "border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Clock className="h-4 w-4" /> Asistencia
          </button>
          <button
            onClick={() => setActiveTab("semanal")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs lg:text-sm transition-colors ${
              activeTab === "semanal"
                ? "border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <CalendarCheck className="h-4 w-4" /> Registro Semanal
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "controlResumen" ? (
            <motion.div
              key="controlResumen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-8 w-full">
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-lg shadow-md space-y-4 border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
                  <div className="text-center bg-slate-100 dark:bg-neutral-800 p-3 rounded-md transition-colors">
                    <p className="font-semibold text-xs lg:text-sm text-gray-800 dark:text-gray-100">
                      {nombre || "Usuario no identificado"}
                    </p>
                  </div>

                  {!esHorarioMultiple && (
                    <div className="text-center text-xs font-semibold text-blue-600 dark:text-blue-400 flex flex-col lg:flex-row justify-center lg:gap-4 transition-colors">
                      <p className="pb-2">
                        Horario: {horarioFormateado.nombre}
                      </p>
                      <p className="flex items-center justify-center gap-1 pb-2">
                        <Clock className="h-3 w-3" />
                        {horarioFormateado.entrada} a {horarioFormateado.salida}
                      </p>
                      <p className="flex items-center justify-center gap-1 pb-2">
                        <CalendarDays className="h-3 w-3" />
                        {horarioFormateado.dias}
                      </p>
                    </div>
                  )}

                  <div className="text-center border-y dark:border-neutral-800 py-4 transition-colors">
                    <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-300">
                      <span className="capitalize">
                        {format(fechaHoraGt, "EEEE, dd/MM/yyyy", {
                          locale: es,
                        })}
                      </span>
                      <span
                        className={`font-mono font-bold ml-2 ${estaFueraDeHorario && !esHorarioMultiple ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
                      >
                        {format(fechaHoraGt, "hh:mm:ss aa", { locale: es })}
                      </span>
                    </p>
                  </div>
                  <div className="flex justify-center w-full">
                    <div className="w-full">{renderBotonMarcado()}</div>
                  </div>

                  <div className="mt-6 border-t dark:border-neutral-800 pt-4 transition-colors">
                    <h4 className="text-xs lg:text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
                      Registros de hoy:
                    </h4>
                    {hayRegistrosHoy ? (
                      <>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Haga clic para ver detalles de ubicación.
                        </p>
                        <div className="flex items-center gap-1">
                          {/* Columna 3/4: Asistencia de Hoy (Estilo Calendario) */}
                          <div 
                            onClick={handleAbrirMapaHoy}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            {(esHorarioMultiple || registrosHoyMultiple.length > 2) ? (
                              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex justify-center items-center text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[11px] md:text-sm">
                                Ver Asistencia ({registrosHoyMultiple.length})
                              </div>
                            ) : (
                              <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center justify-left">
                                <span className={MARCaje_FILA_CLASS}>
                                  <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
                                  {registroEntradaHoy 
                                    ? (
                                      <span className={getEntradaTextClass()}>
                                        {format(new Date(registroEntradaHoy.created_at), 'hh:mm aa', { locale: es })}
                                      </span>
                                    )
                                    : (
                                      <span className={`${getEntradaTextClass()} font-normal`}>--:--</span>
                                    )}
                                </span>
                                <span className="text-gray-300 dark:text-neutral-700">|</span>
                                <span className={MARCaje_FILA_CLASS}>
                                  <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
                                  {registroSalidaHoy 
                                    ? (
                                      <span className={getSalidaTextClass()}>
                                        {format(new Date(registroSalidaHoy.created_at), 'hh:mm aa', { locale: es })}
                                      </span>
                                    )
                                    : (
                                      <span className={`${getSalidaTextClass()} font-normal`}>--:--</span>
                                    )}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="w-[38%] sm:w-[32%] min-w-[6.75rem] flex-shrink-0 cursor-pointer">
                            {renderJustificacionHoyBtn()}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-md border border-gray-100 dark:border-neutral-800 text-center">
                          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                            {justificacionVigente 
                              ? "Aún no ha marcado asistencia, pero tiene una justificación vigente."
                              : "No ha marcado asistencia el día de hoy."}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 min-w-0 flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center justify-left px-2">
                             <span className={MARCaje_FILA_CLASS}>
                               <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
                               <span className={`${getEntradaTextClass()} font-normal`}>--:--</span>
                             </span>
                             <span className="text-gray-300 dark:text-neutral-700">|</span>
                             <span className={MARCaje_FILA_CLASS}>
                               <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
                               <span className={`${getSalidaTextClass()} font-normal`}>--:--</span>
                             </span>
                          </div>
                          <div className="w-[38%] sm:w-[32%] min-w-[6.75rem] flex-shrink-0 cursor-pointer">
                            {renderJustificacionHoyBtn()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="semanal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Calendario
                todosLosRegistros={todosLosRegistros}
                onAbrirMapa={handleAbrirMapa}
                fechaHoraGt={fechaHoraGt}
                permisosEmpleado={permisosEmpleado}
                comisionesEmpleado={comisionesEmpleado}
                horarioDias={horario_dias}
                horarioEntrada={horario_entrada}
                horarioSalida={horario_salida}
                cargandoJustificaciones={cargandoPermisos || cargandoComisiones}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modalMapaAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Mapa
              isOpen={modalMapaAbierto}
              onClose={() => setModalMapaAbierto(false)}
              registros={registrosSeleccionadosParaMapa}
              nombreUsuario={nombre}
              titulo="Asistencia"
              permiso={permisoSeleccionadoParaMapa}
              onVerPermiso={setPermisoParaPreview}
            />
          </div>
        )}
      </AnimatePresence>

      <PreviewPermiso
        isOpen={!!permisoParaPreview}
        onClose={() => setPermisoParaPreview(null)}
        permiso={permisoParaPreview}
      />

      <PreviewAcuerdo
        isOpen={!!acuerdoParaPreview}
        onClose={() => setAcuerdoParaPreview(null)}
        acuerdo={acuerdoParaPreview}
      />

      {comisionPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setComisionPreview(null); }}
        >
          <div className="bg-white dark:bg-neutral-950 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <VerComision
              comision={comisionPreview}
              usuarios={(comisionPreview.asistentes || []) as any}
              onClose={() => setComisionPreview(null)}
              onAbrirMapa={(registros, nombre) => {
                setMapaComisionRegistros(registros);
                setMapaComisionNombre(nombre);
              }}
              onEdit={() => {}}
              onDelete={() => {}}
              onAprobar={() => {}}
            />
          </div>
        </div>
      )}

      {mapaComisionRegistros && (
        <Mapa
          isOpen={!!mapaComisionRegistros}
          onClose={() => { setMapaComisionRegistros(null); setMapaComisionNombre(""); }}
          registros={mapaComisionRegistros}
          nombreUsuario={mapaComisionNombre}
          titulo="Comisión"
        />
      )}
    </>
  );
}
