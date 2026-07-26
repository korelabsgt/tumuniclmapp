"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Search,
  User,
  Briefcase,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import PermisosNav from "./PermisosNav";
import Cargando from "@/components/ui/animations/Cargando";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useListaUsuarios } from "@/hooks/usuarios/useListarUsuarios";
import {
  useLecturasNotificaciones,
  usePerfilPermisos,
  useInvalidarPermisos,
} from "./lib/hooks-queries";
import { PERMISO_MENSAJE_REFRESH } from "@/components/push/Listener";
import type { TipoVistaLecturas } from "./lib/mensajes";
import { eliminarMensajePermiso } from "./lib/mensajes";
import {
  esTipoAcuerdo,
  type LecturaNotificacion,
  type LecturasPorOficina,
  type UsuarioConJerarquia,
} from "./types";

type FiltroLectura = "pendiente" | "leido";

const SALIDA_ELIMINAR_MS = 300;

interface Props {
  tipoVista: TipoVistaLecturas;
}

function formatearFechaHora(iso: string) {
  return format(parseISO(iso), "eee dd/MM/yy, h:mm a", { locale: es });
}

function codigoPermiso(id: string) {
  return `${id.substring(0, 3)}-${id.substring(3, 6)}`.toUpperCase();
}

export default function VerLecturasNotificaciones({ tipoVista }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroLectura, setFiltroLectura] = useState<FiltroLectura>("pendiente");
  const [oficinasAbiertas, setOficinasAbiertas] = useState<
    Record<string, boolean>
  >({});
  const [todosAbiertos, setTodosAbiertos] = useState(true);
  const [ocultosIds, setOcultosIds] = useState<Set<string>>(new Set());

  const { data: perfilUsuario } = usePerfilPermisos();
  const { data: lecturasRaw, isLoading } = useLecturasNotificaciones(tipoVista);
  const invalidarPermisos = useInvalidarPermisos();
  const { usuarios: usuariosHook } = useListaUsuarios();

  const usuariosAdaptados = useMemo(
    () => usuariosHook as unknown as UsuarioConJerarquia[],
    [usuariosHook],
  );

  const usuarioMap = useMemo(() => {
    const map = new Map<string, UsuarioConJerarquia>();
    usuariosAdaptados.forEach((u) => map.set(u.id, u));
    return map;
  }, [usuariosAdaptados]);

  const lecturasFiltradas = useMemo(() => {
    const lista = lecturasRaw ?? [];
    const termino = searchTerm.toLowerCase().trim();

    return lista.filter((lectura) => {
      const destinatario = usuarioMap.get(lectura.user_id);
      const empleadoPermiso = lectura.permiso_empleado_user_id
        ? usuarioMap.get(lectura.permiso_empleado_user_id)
        : null;
      const codigo = codigoPermiso(lectura.permiso_id).toLowerCase();

      const matchEstado =
        (filtroLectura === "pendiente" && !lectura.leido_at) ||
        (filtroLectura === "leido" && !!lectura.leido_at);

      if (!matchEstado) return false;
      if (!termino) return true;

      return (
        destinatario?.nombre?.toLowerCase().includes(termino) ||
        destinatario?.oficina_nombre?.toLowerCase().includes(termino) ||
        empleadoPermiso?.nombre?.toLowerCase().includes(termino) ||
        lectura.titulo.toLowerCase().includes(termino) ||
        lectura.mensaje.toLowerCase().includes(termino) ||
        (lectura.permiso_tipo?.toLowerCase().includes(termino) ?? false) ||
        codigo.includes(termino)
      );
    });
  }, [lecturasRaw, searchTerm, filtroLectura, usuarioMap]);

  const lecturasVisibles = useMemo(
    () => lecturasFiltradas.filter((l) => !ocultosIds.has(l.id)),
    [lecturasFiltradas, ocultosIds],
  );

  const datosAgrupados = useMemo(() => {
    const grupos: Record<string, LecturasPorOficina> = {};

    if (tipoVista === "gestion_jefe" && perfilUsuario?.oficinasACargo) {
      perfilUsuario.oficinasACargo.forEach((oficina) => {
        grupos[oficina.nombre] = {
          oficina_nombre: oficina.nombre,
          path_orden: "0",
          lecturas: [],
        };
      });
    }

    lecturasVisibles.forEach((lectura) => {
      const destinatario = usuarioMap.get(lectura.user_id);
      const nombreOficina =
        destinatario?.oficina_nombre || "Sin Oficina Asignada";
      const pathOrden = destinatario?.oficina_path_orden || "9999";

      if (!grupos[nombreOficina]) {
        grupos[nombreOficina] = {
          oficina_nombre: nombreOficina,
          path_orden: pathOrden,
          lecturas: [],
        };
      }
      grupos[nombreOficina].lecturas.push(lectura);
    });

    return Object.values(grupos)
      .filter((g) => g.lecturas.length > 0)
      .sort((a, b) =>
        a.path_orden.localeCompare(b.path_orden, undefined, { numeric: true }),
      );
  }, [lecturasVisibles, tipoVista, perfilUsuario, usuarioMap]);

  const estadisticas = useMemo(() => {
    const lista = lecturasRaw ?? [];
    return {
      pendientes: lista.filter((l) => !l.leido_at).length,
      leidos: lista.filter((l) => !!l.leido_at).length,
    };
  }, [lecturasRaw]);

  const oficinasAgrupadasKey = useMemo(
    () =>
      datosAgrupados
        .map((g) => g.oficina_nombre)
        .sort()
        .join("|"),
    [datosAgrupados],
  );

  useEffect(() => {
    if (!oficinasAgrupadasKey) return;
    const iniciales: Record<string, boolean> = {};
    datosAgrupados.forEach((g) => {
      iniciales[g.oficina_nombre] = todosAbiertos;
    });
    setOficinasAbiertas(iniciales);
  }, [oficinasAgrupadasKey, todosAbiertos]);

  useEffect(() => {
    const onRefresh = () => {
      void invalidarPermisos();
    };
    window.addEventListener(PERMISO_MENSAJE_REFRESH, onRefresh);
    return () => window.removeEventListener(PERMISO_MENSAJE_REFRESH, onRefresh);
  }, [invalidarPermisos]);

  const toggleOficina = (nombre: string) => {
    setOficinasAbiertas((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const toggleTodos = () => {
    const nuevo = !todosAbiertos;
    setTodosAbiertos(nuevo);
    const actualizado: Record<string, boolean> = {};
    datosAgrupados.forEach((g) => {
      actualizado[g.oficina_nombre] = nuevo;
    });
    setOficinasAbiertas(actualizado);
  };

  const navTipoVista =
    tipoVista === "mis_lecturas"
      ? "mis"
      : tipoVista === "gestion_jefe"
        ? "jefe"
        : "rrhh";

  const puedeEliminarMensajes = ["RRHH", "SECRETARIO", "SUPER"].includes(
    perfilUsuario?.rol || "",
  );

  const handleEliminarMensaje = async (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "¿Eliminar notificación?",
      text: "Se borrará este mensaje del sistema.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    setOcultosIds((prev) => new Set(prev).add(id));

    const res = await eliminarMensajePermiso(id);
    if (res.success) {
      toast.success("Mensaje eliminado.");
      window.setTimeout(() => {
        setOcultosIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        void invalidarPermisos();
      }, SALIDA_ELIMINAR_MS);
    } else {
      setOcultosIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error(res.error || "No se pudo eliminar.");
    }
  };

  return (
    <div className="w-full lg:w-[95%] mx-auto md:px-4 pb-10 transition-all">
      <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-md w-full border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
        <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4 p-1 sm:p-2">
          <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
            <PermisosNav tipoVista={navTipoVista} />
            <div className="flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-neutral-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setFiltroLectura("pendiente")}
                className={cn(
                  "px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all cursor-pointer",
                  filtroLectura === "pendiente"
                    ? "bg-white dark:bg-neutral-700 text-yellow-600 dark:text-yellow-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                Pendientes ({estadisticas.pendientes})
              </button>
              <button
                type="button"
                onClick={() => setFiltroLectura("leido")}
                className={cn(
                  "px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all cursor-pointer",
                  filtroLectura === "leido"
                    ? "bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                Leídas ({estadisticas.leidos})
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3 bg-gray-50/50 dark:bg-neutral-900/30 p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-neutral-800/50 w-full">
            <div className="flex items-center gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 sm:h-10 pl-10 pr-3 text-xs sm:text-sm border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={toggleTodos}
                className="shrink-0 h-9 sm:h-10 px-2.5 sm:px-3 text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-700 gap-1"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">
                  {todosAbiertos ? "Ocultar Todos" : "Ver Todos"}
                </span>
                <span className="sm:hidden">
                  {todosAbiertos ? "Ocultar" : "Ver"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-neutral-800 pt-3 sm:pt-4">
          {isLoading ? (
            <Cargando texto="Cargando lecturas..." />
          ) : datosAgrupados.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 text-xs py-8">
              {filtroLectura === "pendiente"
                ? "No hay notificaciones pendientes."
                : "No hay notificaciones leídas."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {datosAgrupados.map((grupo) => {
                const estaAbierta = oficinasAbiertas[grupo.oficina_nombre] ?? false;
                return (
                  <div
                    key={grupo.oficina_nombre}
                    className="border border-gray-100 dark:border-neutral-800 rounded-lg overflow-hidden"
                  >
                    <div
                      onClick={() => toggleOficina(grupo.oficina_nombre)}
                      className="bg-slate-50 dark:bg-neutral-800/50 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors py-3 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between"
                    >
                      <span>
                        {grupo.oficina_nombre}{" "}
                        <span className="text-gray-400 text-xs ml-1 font-normal">
                          ({grupo.lecturas.length})
                        </span>
                      </span>
                      <motion.div
                        initial={false}
                        animate={{ rotate: estaAbierta ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </motion.div>
                    </div>
                    <AnimatePresence initial={false}>
                      {estaAbierta && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-neutral-900"
                        >
                          <div className="p-3 flex flex-col gap-4">
                            {Object.values(
                              grupo.lecturas.reduce(
                                (acc, lectura) => {
                                  const uid = lectura.user_id;
                                  if (!acc[uid]) {
                                    acc[uid] = {
                                      usuario: usuarioMap.get(uid),
                                      lecturas: [] as LecturaNotificacion[],
                                    };
                                  }
                                  acc[uid].lecturas.push(lectura);
                                  return acc;
                                },
                                {} as Record<
                                  string,
                                  {
                                    usuario: UsuarioConJerarquia | undefined;
                                    lecturas: LecturaNotificacion[];
                                  }
                                >,
                              ),
                            ).map((usuarioGrupo) => (
                              <div
                                key={usuarioGrupo.usuario?.id ?? Math.random()}
                                className="flex flex-col gap-2"
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between px-2 py-1 bg-slate-100/50 dark:bg-neutral-800/50 rounded-md border border-slate-200 dark:border-neutral-700">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                      <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs lg:text-base font-bold text-slate-800 dark:text-gray-200">
                                        {usuarioGrupo.usuario?.nombre ||
                                          "Usuario"}
                                      </span>
                                      <span className="text-[10px] lg:text-xs text-slate-500 dark:text-gray-500 flex items-center gap-1">
                                        <Briefcase className="w-2.5 h-2.5 lg:w-4 lg:h-4" />
                                        {usuarioGrupo.usuario?.puesto_nombre ||
                                          "Sin puesto"}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="mt-1 md:mt-0 text-[10px] lg:text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {usuarioGrupo.lecturas.length} notificación
                                    {usuarioGrupo.lecturas.length !== 1
                                      ? "es"
                                      : ""}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-neutral-800 ml-3">
                                  <AnimatePresence mode="popLayout">
                                    {usuarioGrupo.lecturas.map((lectura) => (
                                      <motion.div
                                        key={lectura.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        <TarjetaLectura
                                          lectura={lectura}
                                          empleadoPermiso={
                                            lectura.permiso_empleado_user_id
                                              ? usuarioMap.get(
                                                  lectura.permiso_empleado_user_id,
                                                )
                                              : undefined
                                          }
                                          puedeEliminar={puedeEliminarMensajes}
                                          onEliminar={handleEliminarMensaje}
                                        />
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TarjetaLectura({
  lectura,
  empleadoPermiso,
  puedeEliminar,
  onEliminar,
}: {
  lectura: LecturaNotificacion;
  empleadoPermiso: UsuarioConJerarquia | undefined;
  puedeEliminar: boolean;
  onEliminar: (e: React.MouseEvent, id: string) => void;
}) {
  const esAcuerdo = lectura.permiso_tipo
    ? esTipoAcuerdo(lectura.permiso_tipo)
    : false;

  return (
    <div className="flex flex-col gap-2 bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bell className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs lg:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
            {lectura.titulo}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lectura.leido_at ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] lg:text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              Leída
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] lg:text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
              <Clock className="w-3 h-3" />
              Pendiente
            </span>
          )}
          {puedeEliminar && (
            <button
              type="button"
              onClick={(e) => onEliminar(e, lectura.id)}
              className="flex items-center justify-center p-1.5 text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors border-2 border-red-600 dark:border-red-400 cursor-pointer"
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] lg:text-sm text-slate-600 dark:text-slate-400">
        {lectura.mensaje}
      </p>

      <div className="bg-slate-50 dark:bg-neutral-800/50 p-2 rounded text-[10px] lg:text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 shrink">
            <span className="font-bold text-slate-500">Código:</span>{" "}
            {codigoPermiso(lectura.permiso_id)}
          </p>
          {empleadoPermiso && (
            <p className="min-w-0 text-right">
              <span className="font-bold text-slate-500">Empleado:</span>{" "}
              {empleadoPermiso.nombre}
            </p>
          )}
        </div>
        {lectura.permiso_tipo && (
          <p className="min-w-0">
            <span className="font-bold text-slate-500">
              {esAcuerdo ? "Tipo de acuerdo:" : "Tipo de permiso:"}
            </span>{" "}
            {lectura.permiso_tipo}
          </p>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 text-[9px] lg:text-xs text-slate-500 dark:text-slate-400">
        <p className="min-w-0">
          <span className="font-bold">Enviada:</span>{" "}
          {formatearFechaHora(lectura.created_at)}
        </p>
        {lectura.leido_at && (
          <p className="min-w-0 text-right">
            <span className="font-bold">Leída:</span>{" "}
            {formatearFechaHora(lectura.leido_at)}
          </p>
        )}
      </div>
    </div>
  );
}
