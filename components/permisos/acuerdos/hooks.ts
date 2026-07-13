import { useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import Swal from "sweetalert2";
import {
  AcuerdoEmpleado,
  AcuerdosPorOficina,
  EstadoAcuerdo,
  esTipoAcuerdo,
} from "@/components/permisos/acuerdos/types";
import {
  obtenerPermisosPorFecha,
  obtenerPermisosPorRango,
  obtenerTodosPendientes,
  eliminarPermiso,
  obtenerPerfilUsuario,
  type PerfilUsuario,
} from "@/components/permisos/acciones";
import { UsuarioConJerarquia } from "@/components/permisos/types";
import { useListaUsuarios } from "@/hooks/usuarios/useListarUsuarios";
import { parseDiasAcuerdo } from "@/components/permisos/acuerdos/dias-acuerdo";

export type TipoVistaAcuerdos =
  | "mis_acuerdos"
  | "gestion_jefe"
  | "gestion_rrhh";

export const useAcuerdos = (tipoVista: TipoVistaAcuerdos) => {
  const [registrosRaw, setRegistrosRaw] = useState<AcuerdoEmpleado[]>([]);
  const [loadingAcuerdos, setLoadingAcuerdos] = useState(true);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario | null>(
    null,
  );
  const [conteosPendientes, setConteosPendientes] = useState<{
    pendientes: number;
    avalados: number;
  }>({ pendientes: 0, avalados: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [oficinasAbiertas, setOficinasAbiertas] = useState<
    Record<string, boolean>
  >({});
  const [todosAbiertos, setTodosAbiertos] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoAcuerdo>(
    "todos",
  );

  const [modoFiltro, setModoFiltro] = useState<
    "dia" | "semana" | "rango" | "pendientes"
  >("semana");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [fechaInicio, setFechaInicio] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [fechaFin, setFechaFin] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  const [modalAbierto, setModalAbierto] = useState(false);
  const [acuerdoParaEditar, setAcuerdoParaEditar] =
    useState<AcuerdoEmpleado | null>(null);

  const { usuarios: usuariosHook } = useListaUsuarios();

  const usuariosAdaptados = useMemo(() => {
    return usuariosHook as unknown as UsuarioConJerarquia[];
  }, [usuariosHook]);

  const actualizarConteosPendientes = useCallback(
    async (perfilActual?: PerfilUsuario | null) => {
      try {
        const perfil = perfilActual || perfilUsuario;
        if (!perfil) return;
        const todos = await obtenerTodosPendientes();

        let acuerdosFiltrados = todos
          .filter((a) => esTipoAcuerdo(a.tipo))
          .map((acuerdo) => {
          const usuarioEncontrado = usuariosAdaptados.find(
            (u) => u.id === acuerdo.user_id,
          );
          return { ...acuerdo, usuario: usuarioEncontrado };
        });

        const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(
          perfil.rol || "",
        );
        const idsOficinasJefe = perfil.oficinasACargo.map((o) => o.id);
        const nombresOficinasJefe = perfil.oficinasACargo.map((o) =>
          o.nombre.toLowerCase().trim(),
        );

        if (tipoVista === "gestion_jefe") {
          if (idsOficinasJefe.length > 0) {
            acuerdosFiltrados = acuerdosFiltrados.filter((a) => {
              const depId = a.usuario?.dependencia_id;
              const depNombre = a.usuario?.oficina_nombre
                ?.toLowerCase()
                .trim();
              return (
                (depId && idsOficinasJefe.includes(depId)) ||
                (depNombre && nombresOficinasJefe.includes(depNombre))
              );
            });
          } else {
            acuerdosFiltrados = [];
          }
        } else if (tipoVista === "gestion_rrhh") {
          if (!esRRHH) acuerdosFiltrados = [];
        } else if (tipoVista === "mis_acuerdos") {
          acuerdosFiltrados = [];
        }

        let pend = 0;
        let aval = 0;
        acuerdosFiltrados.forEach((r) => {
          if (r.estado === "pendiente") pend++;
          if (r.estado === "aprobado_jefe") aval++;
        });
        setConteosPendientes({ pendientes: pend, avalados: aval });
      } catch {
        // silently fail
      }
    },
    [perfilUsuario, tipoVista, usuariosAdaptados],
  );

  const cargarDatos = useCallback(async () => {
    try {
      let data: AcuerdoEmpleado[];
      if (modoFiltro === "pendientes") {
        data = (await obtenerTodosPendientes()).filter((a) =>
          esTipoAcuerdo(a.tipo),
        );
      } else if (modoFiltro === "rango" || modoFiltro === "semana") {
        data = (await obtenerPermisosPorRango(fechaInicio, fechaFin)).filter(
          (a) => esTipoAcuerdo(a.tipo),
        );
      } else {
        data = (await obtenerPermisosPorFecha(fechaSeleccionada)).filter((a) =>
          esTipoAcuerdo(a.tipo),
        );
      }
      setRegistrosRaw(data);
      await actualizarConteosPendientes();
    } catch (error) {
      console.error(error);
    }
  }, [
    fechaSeleccionada,
    fechaInicio,
    fechaFin,
    modoFiltro,
    actualizarConteosPendientes,
  ]);

  useEffect(() => {
    const init = async () => {
      setLoadingAcuerdos(true);
      try {
        let data: AcuerdoEmpleado[];
        if (modoFiltro === "pendientes") {
          data = (await obtenerTodosPendientes()).filter((a) =>
            esTipoAcuerdo(a.tipo),
          );
        } else if (modoFiltro === "rango" || modoFiltro === "semana") {
          data = (await obtenerPermisosPorRango(fechaInicio, fechaFin)).filter(
            (a) => esTipoAcuerdo(a.tipo),
          );
        } else {
          data = (await obtenerPermisosPorFecha(fechaSeleccionada)).filter(
            (a) => esTipoAcuerdo(a.tipo),
          );
        }
        const perfil = await obtenerPerfilUsuario();
        setRegistrosRaw(data);
        setPerfilUsuario(perfil);
        await actualizarConteosPendientes(perfil);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingAcuerdos(false);
      }
    };
    init();
  }, [fechaSeleccionada, fechaInicio, fechaFin, modoFiltro]);

  useEffect(() => {
    if (perfilUsuario && usuariosAdaptados.length > 0) {
      actualizarConteosPendientes();
    }
  }, [perfilUsuario, usuariosAdaptados, actualizarConteosPendientes]);

  const registrosEnriquecidos = useMemo(() => {
    if (!usuariosAdaptados.length) return [];
    return registrosRaw.map((acuerdo) => {
      const usuarioEncontrado = usuariosAdaptados.find(
        (u) => u.id === acuerdo.user_id,
      );
      const diasParsed = parseDiasAcuerdo(acuerdo.dias);
      return {
        ...acuerdo,
        dias: diasParsed ?? acuerdo.dias,
        usuario: usuarioEncontrado,
      };
    });
  }, [registrosRaw, usuariosAdaptados]);

  const { acuerdosVisibles, usuariosParaModal } = useMemo(() => {
    if (!perfilUsuario) return { acuerdosVisibles: [], usuariosParaModal: [] };

    let acuerdosFiltrados = [...registrosEnriquecidos].filter((a) =>
      esTipoAcuerdo(a.tipo),
    );
    let usuariosFiltrados = [...usuariosAdaptados];

    const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(
      perfilUsuario.rol || "",
    );
    const idsOficinasJefe = perfilUsuario.oficinasACargo.map((o) => o.id);
    const nombresOficinasJefe = perfilUsuario.oficinasACargo.map((o) =>
      o.nombre.toLowerCase().trim(),
    );

    switch (tipoVista) {
      case "mis_acuerdos":
        acuerdosFiltrados = acuerdosFiltrados.filter(
          (a) => a.user_id === perfilUsuario.id,
        );
        usuariosFiltrados = usuariosFiltrados.filter(
          (u) => u.id === perfilUsuario.id,
        );
        break;

      case "gestion_jefe":
        if (idsOficinasJefe.length > 0) {
          acuerdosFiltrados = acuerdosFiltrados.filter((a) => {
            const depId = a.usuario?.dependencia_id;
            const depNombre = a.usuario?.oficina_nombre?.toLowerCase().trim();
            return (
              (depId && idsOficinasJefe.includes(depId)) ||
              (depNombre && nombresOficinasJefe.includes(depNombre))
            );
          });
        } else {
          acuerdosFiltrados = [];
          usuariosFiltrados = [];
        }
        break;

      case "gestion_rrhh":
        if (!esRRHH) {
          acuerdosFiltrados = [];
          usuariosFiltrados = [];
        } else {
          acuerdosFiltrados = acuerdosFiltrados.filter(
            (a) =>
              a.estado === "pendiente" ||
              a.estado === "aprobado_jefe" ||
              a.estado === "aprobado" ||
              a.estado === "rechazado_rrhh",
          );
        }
        break;
    }

    return { acuerdosVisibles: acuerdosFiltrados, usuariosParaModal: usuariosFiltrados };
  }, [registrosEnriquecidos, usuariosAdaptados, perfilUsuario, tipoVista]);

  const registrosFinales = useMemo(() => {
    return acuerdosVisibles.filter((r) => {
      const nombreEmpleado = r.usuario?.nombre?.toLowerCase() || "";
      const nombreOficina = r.usuario?.oficina_nombre?.toLowerCase() || "";
      const codigoBase = r.id.substring(0, 6).toLowerCase();
      const codigoFormateado = `${codigoBase.substring(0, 3)}-${codigoBase.substring(3, 6)}`;
      const termino = searchTerm.toLowerCase();

      const matchBusqueda =
        nombreEmpleado.includes(termino) ||
        nombreOficina.includes(termino) ||
        codigoBase.includes(termino) ||
        codigoFormateado.includes(termino);

      const matchEstado =
        filtroEstado === "todos" || r.estado === filtroEstado;

      return matchBusqueda && matchEstado;
    });
  }, [acuerdosVisibles, searchTerm, filtroEstado]);

  function getPrioridad(estado: string) {
    if (estado === "pendiente") return 1;
    if (estado === "aprobado_jefe") return 2;
    return 3;
  }

  const registrosOrdenados = useMemo(() => {
    const lista = [...registrosFinales];
    return lista.sort((a, b) => {
      const scoreA = getPrioridad(a.estado);
      const scoreB = getPrioridad(b.estado);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return 0;
    });
  }, [registrosFinales]);

  const datosAgrupadosInterno = useMemo(() => {
    const grupos: Record<string, AcuerdosPorOficina> = {};

    if (tipoVista === "gestion_jefe" && perfilUsuario?.oficinasACargo) {
      perfilUsuario.oficinasACargo.forEach((oficina) => {
        grupos[oficina.nombre] = {
          oficina_nombre: oficina.nombre,
          path_orden: "0",
          acuerdos: [],
        };
      });
    }

    registrosOrdenados.forEach((r) => {
      const nombreOficina = r.usuario?.oficina_nombre || "Sin Oficina Asignada";
      const pathOrden = r.usuario?.oficina_path_orden || "9999";

      if (!grupos[nombreOficina]) {
        grupos[nombreOficina] = {
          oficina_nombre: nombreOficina,
          path_orden: pathOrden,
          acuerdos: [],
        };
      }
      grupos[nombreOficina].acuerdos.push(r);
    });

    return Object.values(grupos).sort((a, b) =>
      a.path_orden.localeCompare(b.path_orden, undefined, { numeric: true }),
    );
  }, [registrosOrdenados, tipoVista, perfilUsuario]);

  useEffect(() => {
    if (todosAbiertos) {
      const nuevoEstado: Record<string, boolean> = {};
      datosAgrupadosInterno.forEach((g) => {
        nuevoEstado[g.oficina_nombre] = true;
      });
      setOficinasAbiertas(nuevoEstado);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrosRaw, todosAbiertos]);

  const estadisticas = useMemo(() => {
    let pendientes = 0;
    let aprobados = 0;
    let rechazados = 0;
    let avalados = 0;

    acuerdosVisibles.forEach((r) => {
      if (r.estado === "pendiente") pendientes++;
      if (r.estado === "aprobado_jefe") avalados++;
      if (r.estado === "aprobado") aprobados++;
      if (r.estado.includes("rechazado")) rechazados++;
    });
    return { pendientes, aprobados, rechazados, avalados };
  }, [acuerdosVisibles]);

  const toggleOficina = (nombre: string) => {
    setOficinasAbiertas((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const toggleTodos = () => {
    const nuevoEstado = !todosAbiertos;
    setTodosAbiertos(nuevoEstado);
    const estado: Record<string, boolean> = {};
    datosAgrupadosInterno.forEach((g) => {
      estado[g.oficina_nombre] = nuevoEstado;
    });
    setOficinasAbiertas(estado);
  };

  const handleNuevoAcuerdo = () => {
    setAcuerdoParaEditar(null);
    setModalAbierto(true);
  };

  const handleClickFila = (acuerdo: AcuerdoEmpleado) => {
    setAcuerdoParaEditar(acuerdo);
    setModalAbierto(true);
  };

  const handleEliminarAcuerdo = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      background: document.documentElement.classList.contains("dark")
        ? "#171717"
        : "#fff",
      color: document.documentElement.classList.contains("dark")
        ? "#e5e5e5"
        : "#000",
    });

    if (result.isConfirmed) {
      try {
        await eliminarPermiso(id);
        await cargarDatos();
        Swal.fire({
          title: "¡Eliminado!",
          text: "El acuerdo ha sido eliminado correctamente.",
          icon: "success",
          background: document.documentElement.classList.contains("dark")
            ? "#171717"
            : "#fff",
          color: document.documentElement.classList.contains("dark")
            ? "#e5e5e5"
            : "#000",
        });
      } catch {
        Swal.fire({
          title: "Error",
          text: "No se pudo eliminar el acuerdo.",
          icon: "error",
        });
      }
    }
  };

  return {
    state: {
      loadingAcuerdos,
      searchTerm,
      filtroEstado,
      fechaSeleccionada,
      modoFiltro,
      fechaInicio,
      fechaFin,
      modalAbierto,
      acuerdoParaEditar,
      perfilUsuario,
      oficinasAbiertas,
      todosAbiertos,
      datosAgrupados: datosAgrupadosInterno,
      estadisticas,
      conteosPendientes,
      usuariosParaModal,
    },
    actions: {
      setSearchTerm,
      setFiltroEstado,
      setFechaSeleccionada,
      setModoFiltro,
      setFechaInicio,
      setFechaFin,
      setModalAbierto,
      toggleOficina,
      toggleTodos,
      cargarDatos,
      handleNuevoAcuerdo,
      handleClickFila,
      handleEliminarAcuerdo,
    },
  };
};
