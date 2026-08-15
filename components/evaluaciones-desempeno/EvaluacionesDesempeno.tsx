"use client";

import Cargando from "@/components/ui/animations/Cargando";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  Copy,
  Plus,
  Search,
  User,
  UserCog,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EvalEstadoVacio } from "./EvalEstadoVacio";
import { EvalTabBar, type EvalTabId } from "./EvalTabBar";
import { FiltroPeriodoTerminadas } from "./FiltroPeriodoTerminadas";
import { FormularioEvaluacion } from "./FormularioEvaluacion";
import { ListaPendientesEvaluacion } from "./ListaPendientesEvaluacion";
import {
  DetalleResultadoEvaluacion,
  ListaResultadosEvaluacion,
  ordenarResultadosPorFecha,
} from "./ResultadosEvaluacion";
import { DuplicarEvaluacionModal } from "./forms/DuplicarEvaluacionModal";
import { EvaluacionFormModal } from "./forms/EvaluacionFormModal";
import { VerEditarEvaluacion } from "./forms/VerEditarEvaluacion";
import {
  fechaCalendarioCoincidePeriodo,
  filtroPeriodoTerminadasInicial,
  formatearFechaCorta,
  formatearFechaInstanteCorta,
} from "./lib/fechas";
import {
  useEvaluacionesPlantilla,
  useEvaluacionPorId,
  useEvaluacionPorSlug,
  usePendientesEvaluacion,
  usePerfilEvaluaciones,
  useResultadosEvaluacion,
} from "./lib/hooks";
import { resultadoConEnfoque } from "./lib/resultado-enfoque";
import {
  itemPorSlug,
  rutaBaseEvaluaciones,
  rutaEvaluacionDesdePath,
  rutaPlantillaEvaluacion,
  rutaPlantillaResultadosTab,
  rutaResultadoPersona,
  slugEvaluacion,
} from "./lib/slug";
import {
  EVAL_CARD_CLASS,
  EVAL_CINTILLO_CLASS,
  EVAL_CINTILLO_WRAP,
  EVAL_DUPLICAR_ICON_BTN,
  EVAL_EMPTY,
  EVAL_ENTRAR_BTN,
  EVAL_OUTLINE_BTN,
  EVAL_PANEL,
  EVAL_SEARCH_FIELD,
  EVAL_SEARCH_WRAP,
  EVAL_STATUS_ACTIVE,
  EVAL_STATUS_INACTIVE,
  EVAL_TABLE,
  EVAL_TABLE_PILL,
  EVAL_TABLE_WRAP,
  EVAL_TD_DATE,
  EVAL_TD_NAME,
  EVAL_TD_NUM,
  EVAL_TD_PILL,
  EVAL_TH,
  EVAL_TH_CENTER,
  EVAL_THEAD_ROW,
  EVAL_TOOLBAR,
  EVAL_TR,
  EVAL_VOLVER_LINK,
} from "./lib/ui";
import {
  tipoEvaluacionSchema,
  type EvaluacionPlantilla,
  type PendienteEvaluacion,
  type ResultadoPersona,
  type TipoVistaEvaluaciones,
} from "./lib/zod";

type Pestana = EvalTabId;
type AmbitoPropia = "mio" | "al_jefe";

const TITULOS: Record<TipoVistaEvaluaciones, { titulo: string; sub: string }> =
  {
    propia: {
      titulo: "Evaluaciones de desempeño",
      sub: "Gestión propia",
    },
    jefe: {
      titulo: "Evaluaciones de desempeño del equipo",
      sub: "Gestión jefe de área",
    },
    rrhh: {
      titulo: "Evaluaciones de desempeño",
      sub: "Recursos humanos",
    },
  };

type Props = {
  tipoVista: TipoVistaEvaluaciones;
};

export function EvaluacionesDesempeno({ tipoVista }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const baseRuta = rutaBaseEvaluaciones(tipoVista);
  const rutaEvaluacion = rutaEvaluacionDesdePath(pathname, tipoVista);
  const slug = rutaEvaluacion.slugEvaluacion;
  const formularioLegacy = params.get("formulario");
  const evaluadoParam = params.get("evaluado");
  const editarLegacy = params.get("editar");

  const [pestana, setPestana] = useState<Pestana>(
    tipoVista === "rrhh" ? "evaluaciones" : "pendientes",
  );
  const [ambitoPropia, setAmbitoPropia] = useState<AmbitoPropia>("mio");
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [duplicarEvaluacion, setDuplicarEvaluacion] =
    useState<EvaluacionPlantilla | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState(
    filtroPeriodoTerminadasInicial,
  );

  const { data: perfil, isLoading: loadingPerfil } = usePerfilEvaluaciones();
  const { data: pendientes = [], isLoading: loadingPend } =
    usePendientesEvaluacion(tipoVista);
  const { data: resultados = [], isLoading: loadingRes } =
    useResultadosEvaluacion(tipoVista);
  const { data: plantillas = [], isLoading: loadingPlantillas } =
    useEvaluacionesPlantilla(tipoVista === "rrhh");
  const { data: evaluacionPorSlug, isLoading: loadingSlug } =
    useEvaluacionPorSlug(
      tipoVista === "rrhh" ? slug : null,
      tipoVista === "rrhh",
    );
  const { data: evaluacionPorId, isLoading: loadingEditarId } =
    useEvaluacionPorId(tipoVista === "rrhh" && !slug ? editarLegacy : null);
  const evaluacionEditar = evaluacionPorSlug ?? evaluacionPorId ?? null;
  const loadingEditar = slug ? loadingSlug : loadingEditarId;

  const resultadosEvaluacionActiva = useMemo(
    () =>
      evaluacionEditar
        ? resultados.filter((r) => r.formulario_id === evaluacionEditar.id)
        : [],
    [resultados, evaluacionEditar],
  );

  const resultadoPersonaEvaluacion = useMemo(() => {
    if (!rutaEvaluacion.evaluadoId || !evaluacionEditar) return null;
    return (
      resultadosEvaluacionActiva.find(
        (r) => r.evaluado_id === rutaEvaluacion.evaluadoId,
      ) ?? null
    );
  }, [rutaEvaluacion.evaluadoId, evaluacionEditar, resultadosEvaluacionActiva]);

  const verResultados = params.get("resultados") === "1";
  const enfoqueParsed = tipoEvaluacionSchema.safeParse(params.get("enfoque"));
  const enfoqueResultado = enfoqueParsed.success ? enfoqueParsed.data : null;

  const formulariosPendientes = useMemo(() => {
    const vistos = new Map<string, { id: string; nombre: string }>();
    for (const pendiente of pendientes) {
      if (!vistos.has(pendiente.formulario_id)) {
        vistos.set(pendiente.formulario_id, {
          id: pendiente.formulario_id,
          nombre: pendiente.formulario_nombre,
        });
      }
    }
    return [...vistos.values()];
  }, [pendientes]);

  const pendienteMatch = useMemo(() => {
    if (tipoVista === "rrhh" || !slug) return undefined;
    const form = itemPorSlug(formulariosPendientes, slug);
    if (!form) return undefined;
    if (evaluadoParam) {
      return (
        pendientes.find(
          (p) => p.formulario_id === form.id && p.evaluado_id === evaluadoParam,
        ) ?? pendientes.find((p) => p.formulario_id === form.id)
      );
    }
    return pendientes.find((p) => p.formulario_id === form.id);
  }, [tipoVista, slug, formulariosPendientes, pendientes, evaluadoParam]);

  const formulariosResultados = useMemo(() => {
    const vistos = new Map<string, { id: string; nombre: string }>();
    for (const resultado of resultados) {
      if (!vistos.has(resultado.formulario_id)) {
        vistos.set(resultado.formulario_id, {
          id: resultado.formulario_id,
          nombre: resultado.formulario_nombre,
        });
      }
    }
    return [...vistos.values()];
  }, [resultados]);

  const resultadoMatch = useMemo(() => {
    if (tipoVista === "rrhh" || !slug || !verResultados) return undefined;
    const form = itemPorSlug(formulariosResultados, slug);
    if (!form) return undefined;
    const evaluado = evaluadoParam ?? perfil?.id;
    if (!evaluado) return undefined;
    return resultados.find(
      (r) => r.formulario_id === form.id && r.evaluado_id === evaluado,
    );
  }, [
    tipoVista,
    slug,
    verResultados,
    formulariosResultados,
    resultados,
    evaluadoParam,
    perfil?.id,
  ]);

  const resultadoVista = useMemo(() => {
    if (!resultadoMatch) return undefined;
    if (!enfoqueResultado || !perfil?.id) return resultadoMatch;
    return resultadoConEnfoque(resultadoMatch, enfoqueResultado, perfil.id);
  }, [resultadoMatch, enfoqueResultado, perfil?.id]);

  const formularioId = verResultados
    ? null
    : (pendienteMatch?.formulario_id ??
      (tipoVista !== "rrhh" && !slug ? formularioLegacy : null));
  const evaluadoId = verResultados
    ? null
    : (pendienteMatch?.evaluado_id ?? evaluadoParam);

  const irALista = () => {
    router.push(baseRuta);
  };

  const irAtrasEvaluacion = () => {
    if (!evaluacionEditar) {
      irALista();
      return;
    }
    if (rutaEvaluacion.seccion === "resultado-persona") {
      router.push(
        rutaPlantillaResultadosTab(
          baseRuta,
          evaluacionEditar.nombre,
          evaluacionEditar.id,
          plantillas,
        ),
      );
      return;
    }
    irALista();
  };

  const irAPlantilla = (nombre: string, id: string) => {
    router.push(`${baseRuta}/${slugEvaluacion(nombre, id, plantillas)}`);
  };

  const irAPendiente = (
    nombre: string,
    formulario: string,
    evaluado: string,
  ) => {
    router.push(
      `${baseRuta}/${slugEvaluacion(nombre, formulario, formulariosPendientes)}?evaluado=${evaluado}`,
    );
  };

  const irAResultado = (
    resultado: ResultadoPersona,
    enfoque?: PendienteEvaluacion["tipo_evaluacion"],
  ) => {
    if (tipoVista === "rrhh") {
      router.push(
        rutaResultadoPersona(
          baseRuta,
          resultado.formulario_nombre,
          resultado.formulario_id,
          resultado.evaluado_id,
          plantillas,
        ),
      );
      return;
    }
    const enfoqueQuery = enfoque ? `&enfoque=${enfoque}` : "";
    router.push(
      `${baseRuta}/${slugEvaluacion(resultado.formulario_nombre, resultado.formulario_id, formulariosResultados)}?resultados=1&evaluado=${resultado.evaluado_id}${enfoqueQuery}`,
    );
  };

  const irAResultadoPendiente = (pendiente: PendienteEvaluacion) => {
    router.push(
      `${baseRuta}/${slugEvaluacion(pendiente.formulario_nombre, pendiente.formulario_id, formulariosResultados)}?resultados=1&evaluado=${pendiente.evaluado_id}&enfoque=${pendiente.tipo_evaluacion}`,
    );
  };

  useEffect(() => {
    if (tipoVista !== "rrhh" || slug || !evaluacionPorId) return;
    router.replace(
      `${baseRuta}/${slugEvaluacion(evaluacionPorId.nombre, evaluacionPorId.id, plantillas)}`,
    );
  }, [tipoVista, slug, evaluacionPorId, baseRuta, plantillas, router]);

  useEffect(() => {
    if (tipoVista === "rrhh" || slug || !formularioLegacy || !evaluadoParam)
      return;
    const pendiente = pendientes.find(
      (p) => p.formulario_id === formularioLegacy,
    );
    if (!pendiente) return;
    router.replace(
      `${baseRuta}/${slugEvaluacion(pendiente.formulario_nombre, pendiente.formulario_id, formulariosPendientes)}?evaluado=${evaluadoParam}`,
    );
  }, [
    tipoVista,
    slug,
    formularioLegacy,
    evaluadoParam,
    pendientes,
    formulariosPendientes,
    baseRuta,
    router,
  ]);

  const pendientesPorIniciar = useMemo(
    () => pendientes.filter((p) => !p.evaluacion_id),
    [pendientes],
  );
  const borradores = useMemo(
    () => pendientes.filter((p) => p.es_borrador),
    [pendientes],
  );
  const terminadas = useMemo(
    () => ordenarResultadosPorFecha(resultados),
    [resultados],
  );

  const filtroAmbitoPendiente = useMemo(() => {
    if (tipoVista !== "propia") {
      return () => true;
    }
    return (p: PendienteEvaluacion) =>
      ambitoPropia === "mio"
        ? p.tipo_evaluacion === "auto"
        : p.tipo_evaluacion !== "auto";
  }, [tipoVista, ambitoPropia]);

  const filtroAmbitoResultado = useMemo(() => {
    if (tipoVista !== "propia" || !perfil?.id) {
      return () => true;
    }
    return (r: ResultadoPersona) =>
      ambitoPropia === "mio"
        ? r.evaluado_id === perfil.id
        : r.evaluado_id !== perfil.id;
  }, [tipoVista, ambitoPropia, perfil?.id]);

  const filtroPeriodoPendiente = useMemo(() => {
    if (tipoVista !== "propia") {
      return () => true;
    }
    return (p: PendienteEvaluacion) =>
      fechaCalendarioCoincidePeriodo(p.formulario_fecha_inicio, filtroPeriodo);
  }, [tipoVista, filtroPeriodo]);

  const listaPropiaVista = useMemo(
    () =>
      pendientes.filter(filtroAmbitoPendiente).filter(filtroPeriodoPendiente),
    [pendientes, filtroAmbitoPendiente, filtroPeriodoPendiente],
  );

  const asignacionesVista = useMemo(
    () => listaPropiaVista.filter((p) => !p.es_borrador),
    [listaPropiaVista],
  );
  const pendientesPorIniciarVista = useMemo(
    () =>
      asignacionesVista.filter((p) => !p.esta_completada && !p.evaluacion_id),
    [asignacionesVista],
  );
  const borradoresVista = useMemo(
    () =>
      borradores.filter(filtroAmbitoPendiente).filter(filtroPeriodoPendiente),
    [borradores, filtroAmbitoPendiente, filtroPeriodoPendiente],
  );
  const terminadasVista = useMemo(
    () => terminadas.filter(filtroAmbitoResultado),
    [terminadas, filtroAmbitoResultado],
  );

  const conteoAmbitoPropia = useMemo(() => {
    const enPeriodo = pendientes.filter((p) =>
      fechaCalendarioCoincidePeriodo(p.formulario_fecha_inicio, filtroPeriodo),
    );
    return {
      mio: enPeriodo.filter((p) => p.tipo_evaluacion === "auto").length,
      al_jefe: enPeriodo.filter((p) => p.tipo_evaluacion !== "auto").length,
    };
  }, [pendientes, filtroPeriodo]);

  const pestanasAmbitoPropia = useMemo(() => {
    if (tipoVista !== "propia") return [];
    return [
      {
        id: "mio" as const,
        label: "Autoevaluaciones",
        icon: <User className="h-4 w-4 shrink-0" />,
        count: conteoAmbitoPropia.mio,
      },
      {
        id: "al_jefe" as const,
        label: perfil?.esJefe ? "Al personal" : "Al jefe",
        icon: <UserCog className="h-4 w-4 shrink-0" />,
        count: conteoAmbitoPropia.al_jefe,
      },
    ];
  }, [tipoVista, conteoAmbitoPropia, perfil?.esJefe]);

  const resultadosPropios = useMemo(
    () => resultados.filter((r) => r.evaluado_id === perfil?.id),
    [resultados, perfil?.id],
  );
  const resultadosEquipo = useMemo(
    () => resultados.filter((r) => r.evaluado_id !== perfil?.id),
    [resultados, perfil?.id],
  );

  const plantillasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return plantillas;
    return plantillas.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [plantillas, busqueda]);

  const enDetalle = Boolean(
    slug || editarLegacy || (formularioId && evaluadoId) || resultadoMatch,
  );

  const enEvaluacionRrhh = Boolean(
    tipoVista === "rrhh" && evaluacionEditar && slug,
  );

  const enDetallePersonaRrhh =
    tipoVista === "rrhh" && rutaEvaluacion.seccion === "resultado-persona";
  const viendoResultado = Boolean(resultadoVista);
  const anchoContenedorFoco =
    enDetallePersonaRrhh || viendoResultado
      ? "mx-auto w-full max-w-6xl"
      : "mx-auto w-full max-w-3xl";

  const llenando = Boolean(formularioId && evaluadoId);
  const enVistaFoco = llenando || viendoResultado || enDetallePersonaRrhh;

  const pestanas = useMemo(() => {
    const items: {
      id: EvalTabId;
      label: string;
      icon: ReactNode;
      count: number;
    }[] = [];

    if (tipoVista === "propia") {
      return items;
    }

    if (asignacionesVista.length > 0) {
      items.push({
        id: "pendientes",
        label: "Pendientes",
        icon: <ClipboardList className="h-4 w-4 shrink-0" />,
        count: pendientesPorIniciarVista.length,
      });
    }

    if (borradoresVista.length > 0) {
      items.push({
        id: "borradores",
        label: "En curso",
        icon: <ClipboardPen className="h-4 w-4 shrink-0" />,
        count: borradoresVista.length,
      });
    }

    if (terminadasVista.length > 0) {
      items.push({
        id: "terminadas",
        label: "Terminadas",
        icon: <ClipboardCheck className="h-4 w-4 shrink-0" />,
        count: terminadasVista.length,
      });
    }

    if (tipoVista === "rrhh") {
      items.push({
        id: "evaluaciones",
        label: "Evaluaciones",
        icon: <ClipboardList className="h-4 w-4 shrink-0" />,
        count: plantillas.length,
      });
    }

    if (tipoVista === "jefe" && resultados.length > 0) {
      items.push({
        id: "resultados",
        label: "Resultados",
        icon: <BarChart3 className="h-4 w-4 shrink-0" />,
        count: resultados.length,
      });
    }

    return items;
  }, [
    tipoVista,
    asignacionesVista.length,
    pendientesPorIniciarVista.length,
    borradoresVista.length,
    terminadasVista.length,
    plantillas.length,
    resultados.length,
  ]);

  const datosListos =
    tipoVista === "rrhh"
      ? !loadingPlantillas && !loadingRes
      : !loadingPend && !loadingRes;

  const pestanaVista = useMemo(() => {
    if (pestanas.length === 0) return null;
    if (pestanas.length === 1) return pestanas[0]!.id;
    if (pestanas.some((tab) => tab.id === pestana)) return pestana;
    return pestanas[0]!.id;
  }, [pestanas, pestana]);

  useEffect(() => {
    if (!pestanaVista || pestanas.some((tab) => tab.id === pestana)) return;
    setPestana(pestanas[0]!.id);
  }, [pestanas, pestana, pestanaVista, ambitoPropia]);

  useEffect(() => {
    if (pestanaVista === "terminadas") {
      setFiltroPeriodo(filtroPeriodoTerminadasInicial());
    }
  }, [pestanaVista]);

  const mostrarFiltroMes =
    tipoVista === "propia" ||
    (pestanaVista === "terminadas" && tipoVista !== "rrhh");

  const filtroPeriodoBtn = mostrarFiltroMes ? (
    <FiltroPeriodoTerminadas
      value={filtroPeriodo}
      onChange={setFiltroPeriodo}
    />
  ) : null;

  if (loadingPerfil) return <Cargando texto="Cargando evaluaciones..." />;

  if (tipoVista === "jefe" && !perfil?.esJefe) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Esta vista es solo para jefes de área.
      </p>
    );
  }

  if (
    tipoVista === "rrhh" &&
    !["RRHH", "SECRETARIO", "SUPER"].includes(perfil?.rol ?? "")
  ) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Esta vista es solo para recursos humanos.
      </p>
    );
  }

  const meta = TITULOS[tipoVista];

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col px-3 pt-2 md:px-6">
      {enDetalle ? (
        <div className={enVistaFoco ? anchoContenedorFoco : undefined}>
          <button
            type="button"
            onClick={enEvaluacionRrhh ? irAtrasEvaluacion : irALista}
            className={EVAL_VOLVER_LINK}
          >
            <ChevronsLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            Volver
          </button>
        </div>
      ) : null}
      <div
        className={`${EVAL_CARD_CLASS} px-5 pt-6 sm:px-8 sm:pt-8${enVistaFoco ? ` ${anchoContenedorFoco} pb-4 sm:pb-5` : " py-6 sm:py-8"}`}
      >
        {!enVistaFoco ? (
          enEvaluacionRrhh && evaluacionEditar ? (
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-2xl">
                {evaluacionEditar.nombre}
              </h1>
              <div className={`${EVAL_CINTILLO_WRAP} mb-0 mt-4`}>
                <CintilloInstitucional className={EVAL_CINTILLO_CLASS} />
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {meta.sub}
              </p>
              <h1 className="text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-2xl">
                {meta.titulo}
              </h1>
              <div className={`${EVAL_CINTILLO_WRAP} mb-0 mt-4`}>
                <CintilloInstitucional className={EVAL_CINTILLO_CLASS} />
              </div>
            </div>
          )
        ) : null}

        {formularioId && evaluadoId ? (
          <FormularioEvaluacion
            tipoVista={tipoVista}
            formularioId={formularioId}
            evaluadoId={evaluadoId}
            onVolver={irALista}
          />
        ) : viendoResultado && resultadoVista ? (
          <DetalleResultadoEvaluacion
            resultado={resultadoVista}
            tipoVista={tipoVista}
            perfilId={perfil?.id ?? null}
          />
        ) : tipoVista !== "rrhh" && slug && verResultados && loadingRes ? (
          <Cargando texto="Cargando resultado..." />
        ) : tipoVista !== "rrhh" && slug && verResultados ? (
          <p className={EVAL_EMPTY}>No se encontró el resultado.</p>
        ) : tipoVista !== "rrhh" && slug && loadingPend ? (
          <Cargando texto="Cargando evaluación..." />
        ) : tipoVista !== "rrhh" && slug ? (
          <p className={EVAL_EMPTY}>No se encontró la evaluación.</p>
        ) : evaluacionEditar &&
          rutaEvaluacion.seccion === "resultado-persona" ? (
          loadingRes ? (
            <Cargando texto="Cargando resultado..." />
          ) : resultadoPersonaEvaluacion ? (
            <DetalleResultadoEvaluacion
              resultado={resultadoPersonaEvaluacion}
              incrustado
              tipoVista={tipoVista}
              perfilId={perfil?.id ?? null}
            />
          ) : (
            <p className={EVAL_EMPTY}>No se encontró el resultado.</p>
          )
        ) : evaluacionEditar ? (
          <VerEditarEvaluacion
            key={evaluacionEditar.id}
            evaluacion={evaluacionEditar}
            onVolver={irALista}
            onNombreActualizado={(id, nombre) =>
              router.replace(
                rutaPlantillaEvaluacion(baseRuta, nombre, id, plantillas),
              )
            }
            resultados={resultadosEvaluacionActiva}
            loadingResultados={loadingRes}
            onSeleccionarResultado={(resultado) =>
              router.push(
                rutaResultadoPersona(
                  baseRuta,
                  evaluacionEditar.nombre,
                  evaluacionEditar.id,
                  resultado.evaluado_id,
                  plantillas,
                ),
              )
            }
          />
        ) : (slug || editarLegacy) && loadingEditar ? (
          <Cargando texto="Cargando evaluación..." />
        ) : slug || editarLegacy ? (
          <p className={EVAL_EMPTY}>No se encontró la evaluación.</p>
        ) : (
          <>
            {!datosListos ? (
              <Cargando texto="Cargando evaluaciones..." />
            ) : pestanas.length === 0 &&
              !(tipoVista === "propia" && listaPropiaVista.length > 0) ? (
              <EvalEstadoVacio
                icon={<ClipboardCheck className="h-7 w-7" strokeWidth={2} />}
                titulo="No hay evaluaciones por mostrar"
                descripcion="Cuando tengas evaluaciones pendientes o resultados disponibles, aparecerán aquí."
              />
            ) : (
              <>
                {tipoVista === "propia" && pestanasAmbitoPropia.length > 0 ? (
                  <div className="mb-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div aria-hidden />
                    <EvalTabBar
                      tabs={pestanasAmbitoPropia}
                      active={ambitoPropia}
                      onChange={(id) => {
                        setAmbitoPropia(id as AmbitoPropia);
                        setFiltroPeriodo(filtroPeriodoTerminadasInicial());
                      }}
                      className="justify-center"
                    />
                    <div className="flex justify-end">{filtroPeriodoBtn}</div>
                  </div>
                ) : null}

                {pestanas.length > 1 && tipoVista !== "propia" ? (
                  <div className="mb-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div aria-hidden />
                    <EvalTabBar
                      tabs={pestanas}
                      active={pestanaVista!}
                      onChange={setPestana}
                      className="justify-center"
                    />
                    <div className="flex justify-end">{filtroPeriodoBtn}</div>
                  </div>
                ) : tipoVista !== "propia" && mostrarFiltroMes ? (
                  <div className="mb-0 flex justify-end pb-2">
                    {filtroPeriodoBtn}
                  </div>
                ) : null}

                <div
                  className={
                    pestanas.length > 1 || pestanasAmbitoPropia.length > 0
                      ? "mt-5"
                      : undefined
                  }
                >
                  {tipoVista === "propia" ? (
                    listaPropiaVista.length > 0 ? (
                      <ListaPendientesEvaluacion
                        pendientes={listaPropiaVista}
                        abrirMasNuevaPorDefecto
                        onSeleccionar={(p) =>
                          irAPendiente(
                            p.formulario_nombre,
                            p.formulario_id,
                            p.evaluado_id,
                          )
                        }
                        onVerCompletada={irAResultadoPendiente}
                      />
                    ) : (
                      <p className={EVAL_EMPTY}>
                        {ambitoPropia === "mio"
                          ? "No tienes autoevaluaciones en este período."
                          : perfil?.esJefe
                            ? "No tienes evaluaciones al personal en este período."
                            : "No tienes evaluaciones al jefe en este período."}
                      </p>
                    )
                  ) : null}
                  {tipoVista !== "propia" && pestanaVista === "pendientes" ? (
                    asignacionesVista.length > 0 ? (
                      <ListaPendientesEvaluacion
                        pendientes={asignacionesVista}
                        abrirMasNuevaPorDefecto={false}
                        onSeleccionar={(p) =>
                          irAPendiente(
                            p.formulario_nombre,
                            p.formulario_id,
                            p.evaluado_id,
                          )
                        }
                      />
                    ) : null
                  ) : null}

                  {tipoVista !== "propia" && pestanaVista === "borradores" ? (
                    borradoresVista.length > 0 ? (
                      <ListaPendientesEvaluacion
                        pendientes={borradoresVista}
                        etiquetaConteo="borradores"
                        abrirMasNuevaPorDefecto={false}
                        onSeleccionar={(p) =>
                          irAPendiente(
                            p.formulario_nombre,
                            p.formulario_id,
                            p.evaluado_id,
                          )
                        }
                      />
                    ) : null
                  ) : null}

                  {tipoVista !== "propia" && pestanaVista === "terminadas" ? (
                    <div className="flex flex-col gap-6">
                      {loadingRes ? (
                        <Cargando texto="Cargando evaluaciones terminadas..." />
                      ) : (
                        <ListaResultadosEvaluacion
                          resultados={terminadasVista.filter((r) =>
                            busqueda.trim()
                              ? r.evaluado_nombre
                                  .toLowerCase()
                                  .includes(busqueda.trim().toLowerCase()) ||
                                r.formulario_nombre
                                  .toLowerCase()
                                  .includes(busqueda.trim().toLowerCase())
                              : true,
                          )}
                          mostrarFecha
                          periodoFiltro={filtroPeriodo}
                          onSeleccionar={irAResultado}
                        />
                      )}
                    </div>
                  ) : null}

                  {pestanaVista === "resultados" && tipoVista === "jefe" ? (
                    <div className="flex flex-col gap-6">
                      <div className={EVAL_SEARCH_WRAP}>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Nombre, evaluación..."
                          className={EVAL_SEARCH_FIELD}
                        />
                      </div>
                      {loadingRes ? (
                        <Cargando texto="Cargando resultados..." />
                      ) : (
                        <>
                          <ListaResultadosEvaluacion
                            titulo="Mis resultados"
                            resultados={resultadosPropios.filter((r) =>
                              busqueda.trim()
                                ? r.evaluado_nombre
                                    .toLowerCase()
                                    .includes(busqueda.trim().toLowerCase()) ||
                                  r.formulario_nombre
                                    .toLowerCase()
                                    .includes(busqueda.trim().toLowerCase())
                                : true,
                            )}
                            onSeleccionar={irAResultado}
                          />
                          <ListaResultadosEvaluacion
                            titulo="Equipo"
                            resultados={resultadosEquipo.filter((r) =>
                              busqueda.trim()
                                ? r.evaluado_nombre
                                    .toLowerCase()
                                    .includes(busqueda.trim().toLowerCase()) ||
                                  r.formulario_nombre
                                    .toLowerCase()
                                    .includes(busqueda.trim().toLowerCase())
                                : true,
                            )}
                            onSeleccionar={irAResultado}
                          />
                        </>
                      )}
                    </div>
                  ) : null}

                  {pestanaVista === "evaluaciones" && tipoVista === "rrhh" ? (
                    <div className={EVAL_PANEL}>
                      <div className={EVAL_TOOLBAR}>
                        <div className={EVAL_SEARCH_WRAP}>
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Nombre..."
                            className={EVAL_SEARCH_FIELD}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCrearAbierto(true)}
                          className={EVAL_OUTLINE_BTN}
                        >
                          <Plus className="h-4 w-4" />
                          Nueva evaluación
                        </button>
                      </div>
                      {loadingPlantillas ? (
                        <div className={EVAL_EMPTY}>
                          <Cargando texto="Cargando evaluaciones..." />
                        </div>
                      ) : plantillasFiltradas.length === 0 ? (
                        <p className={EVAL_EMPTY}>
                          No hay evaluaciones. Crea una y agrega los desempeños
                          a evaluar.
                        </p>
                      ) : (
                        <div className={EVAL_TABLE_WRAP}>
                          <table className={EVAL_TABLE}>
                            <colgroup>
                              <col className="w-12" />
                              <col className="w-[36%]" />
                              <col className="w-[12%]" />
                              <col className="w-[12%]" />
                              <col className="w-[12%]" />
                              <col className="w-[9%]" />
                              <col className="w-[14%]" />
                            </colgroup>
                            <thead>
                              <tr className={EVAL_THEAD_ROW}>
                                <th className={EVAL_TH}>No.</th>
                                <th className={EVAL_TH}>Evaluación</th>
                                <th className={EVAL_TH}>Inicio</th>
                                <th className={EVAL_TH}>Fin</th>
                                <th className={EVAL_TH}>Creada</th>
                                <th className={EVAL_TH_CENTER}>Estado</th>
                                <th className={EVAL_TH_CENTER}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plantillasFiltradas.map((p, index) => (
                                <tr
                                  key={p.id}
                                  onClick={() => irAPlantilla(p.nombre, p.id)}
                                  className={EVAL_TR}
                                >
                                  <td className={EVAL_TD_NUM}>{index + 1}</td>
                                  <td className={EVAL_TD_NAME}>{p.nombre}</td>
                                  <td className={EVAL_TD_DATE}>
                                    {formatearFechaCorta(p.fecha_inicio)}
                                  </td>
                                  <td className={EVAL_TD_DATE}>
                                    {formatearFechaCorta(p.fecha_fin)}
                                  </td>
                                  <td className={EVAL_TD_DATE}>
                                    {formatearFechaInstanteCorta(
                                      p.fecha_creacion,
                                    )}
                                  </td>
                                  <td className={EVAL_TD_PILL}>
                                    <span
                                      className={`${EVAL_TABLE_PILL} ${
                                        p.activo
                                          ? EVAL_STATUS_ACTIVE
                                          : EVAL_STATUS_INACTIVE
                                      }`}
                                    >
                                      {p.activo ? "Activa" : "Inactiva"}
                                    </span>
                                  </td>
                                  <td className={EVAL_TD_PILL}>
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        className={EVAL_DUPLICAR_ICON_BTN}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDuplicarEvaluacion(p);
                                        }}
                                        aria-label="Duplicar evaluación"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          irAPlantilla(p.nombre, p.id);
                                        }}
                                        className={`${EVAL_TABLE_PILL} ${EVAL_ENTRAR_BTN} pointer-events-auto cursor-pointer`}
                                      >
                                        Entrar
                                        <ChevronsRight
                                          className="h-3.5 w-3.5"
                                          strokeWidth={2.5}
                                        />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <EvaluacionFormModal
        open={crearAbierto}
        onClose={() => setCrearAbierto(false)}
        onExito={(id, nombre) => irAPlantilla(nombre, id)}
      />
      <DuplicarEvaluacionModal
        open={Boolean(duplicarEvaluacion)}
        evaluacion={duplicarEvaluacion}
        onClose={() => setDuplicarEvaluacion(null)}
        onExito={(id, nombre) => irAPlantilla(nombre, id)}
      />
    </div>
  );
}

export default EvaluacionesDesempeno;
