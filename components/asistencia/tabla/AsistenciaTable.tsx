'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import Mapa from '@/components/ui/modals/Mapa';
import { format, endOfDay, parseISO, eachDayOfInterval } from 'date-fns';
import { AlertTriangle, XCircle, Calendar, Clock } from 'lucide-react';
import { useDependencias } from '@/hooks/dependencias/useDependencias';
import Cargando from '@/components/ui/animations/Cargando';
import { AsistenciaEnriquecida } from '@/hooks/asistencia/useObtenerAsistencias';
import AsistenciaControls from './AsistenciaControls';
import OficinaAccordion from './OficinaAccordion';
import PreviewPermiso from '@/components/permisos/modals/PreviewPermiso';
import PreviewAcuerdo from '@/components/permisos/acuerdos/modals/PreviewAcuerdo';
import { PermisoEmpleado } from '@/components/permisos/types';
import { permisoAplicaEnDia } from '@/components/permisos/utilidades';
import { createClient } from '@/utils/supabase/client';
import { useListaUsuarios } from '@/hooks/usuarios/useListarUsuarios';
import { useHorariosUsuarios } from '@/hooks/asistencia/useHorariosUsuarios';
import { useAsuetos, getAsuetoPorFecha, buildParentByDependenciaId } from '@/hooks/asistencia/useAsuetos';
import { ComisionConFechaYHoraSeparada } from '@/hooks/comisiones/useObtenerComisiones';
import VerComision from '@/components/comisiones/VerComision';
import { esOficinaSinMarcajeAsistencia } from '@/components/asistencia/lib/oficinas-sin-marcaje';
import { esEntradaTardeMarcaje } from '@/components/asistencia/lib/estado-marcaje';
import { AccordionToggleButton } from '@/components/ui/accordion-toggle';

type UsuarioConDependencia = {
  id?: string;
  user_id?: string;
  dependencia_id?: string | null;
  oficina_nombre?: string | null;
  nombre?: string | null;
  puesto_nombre?: string | null;
  oficina_path_orden?: string | null;
};

type Props = {
  registros: AsistenciaEnriquecida[];
  rolActual: string | null; 
  dependenciasPermitidas?: string[];
  loading: boolean;
  setOficinaId: (id: string | null) => void;
  setFechaInicio: (fecha: string | null) => void;
  setFechaFinal: (fecha: string | null) => void;
};

export type RegistrosAgrupados = {
  entrada: AsistenciaEnriquecida | null;
  salida: AsistenciaEnriquecida | null;
  multiple: AsistenciaEnriquecida[];
  nombre: string;
  puesto_nombre: string;
  oficina_nombre: string;
  oficina_path_orden: string;
  userId: string;
  diaString: string;
  esAusencia?: boolean;
  esDiaVacio?: boolean;
};

export type UsuarioAgrupado = {
  nombre: string;
  puesto_nombre: string;
  oficina_path_orden: string;
  userId: string;
  asistencias: RegistrosAgrupados[];
};

const rangoMes = (mes: number, anio: number) => {
  const start = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(anio, mes + 1, 0).getDate();
  const end = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

export default function AsistenciaTable({ registros, loading, setOficinaId, setFechaInicio, setFechaFinal, rolActual, dependenciasPermitidas }: Props) {
  const { dependencias, loading: loadingDependencias } = useDependencias();
  const { usuarios: todosLosUsuarios } = useListaUsuarios();
  const { horariosMap } = useHorariosUsuarios();

  const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
  const [registrosSeleccionadosParaMapa, setRegistrosSeleccionadosParaMapa] = useState<{ entrada: any | null, salida: any | null, multiple?: any[] }>({ entrada: null, salida: null });
  const [nombreUsuarioModal, setNombreUsuarioModal] = useState<string>('');
  const [permisoPreview, setPermisoPreview] = useState<PermisoEmpleado | null>(null);
  const [acuerdoPreview, setAcuerdoPreview] = useState<PermisoEmpleado | null>(null);
  const [permisosMap, setPermisosMap] = useState<Record<string, PermisoEmpleado[]>>({});
  /** userId → lista de comisiones aprobadas en el rango (objetos completos para el modal) */
  const [comisionesMap, setComisionesMap] = useState<Record<string, ComisionConFechaYHoraSeparada[]>>({});
  const [comisionPreview, setComisionPreview] = useState<ComisionConFechaYHoraSeparada | null>(null);
  const [mapaComisionRegistros, setMapaComisionRegistros] = useState<any>(null);
  const [mapaComisionNombre, setMapaComisionNombre] = useState('');
  
  const ahora = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(() => ahora.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => ahora.getFullYear());
  const [fechaInicialRango, setFechaInicialRango] = useState(
    () => rangoMes(ahora.getMonth(), ahora.getFullYear()).start,
  );
  const [fechaFinalRango, setFechaFinalRango] = useState(
    () => rangoMes(ahora.getMonth(), ahora.getFullYear()).end,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [busquedaPor, setBusquedaPor] = useState<'dependencia' | 'nombre'>(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('asistencia_busqueda_por') as 'dependencia' | 'nombre') || 'dependencia')
      : 'dependencia'
  );

  const { asuetos } = useAsuetos(fechaInicialRango, fechaFinalRango);
  const parentByDependenciaId = useMemo(
    () => buildParentByDependenciaId(dependencias),
    [dependencias],
  );
  const dependenciaPorUsuario = useMemo(() => {
    const map: Record<string, string | null> = {};
    (todosLosUsuarios as UsuarioConDependencia[]).forEach((u) => {
      const id = u.id || u.user_id;
      if (!id) return;
      map[id] = u.dependencia_id ?? null;
    });
    return map;
  }, [todosLosUsuarios]);

  const [nivel2Id, setNivel2Id] = useState<string | null>(null);
  const [nivel3Id, setNivel3Id] = useState<string | null>(null);

  const [oficinasAbiertas, setOficinasAbiertas] = useState<Record<string, boolean>>({});
  
  const [vistaAgrupada, setVistaAgrupada] = useState<'nombre' | 'fecha'>(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('asistencia_vista') as 'nombre' | 'fecha') || 'fecha')
      : 'fecha'
  );

  const [incluirFinesSemana, setIncluirFinesSemana] = useState(false);
  const [ordenDescendente, setOrdenDescendente] = useState(false); 
  const [filtroRapido, setFiltroRapido] = useState<'todos' | 'inasistencia' | 'sin_salida' | 'entrada_tarde'>(() => {
    if (typeof window === 'undefined') return 'todos';
    const guardado = localStorage.getItem('asistencia_filtro');
    if (guardado === 'sin_entrada') return 'todos';
    return (guardado as 'todos' | 'inasistencia' | 'sin_salida' | 'entrada_tarde') || 'todos';
  });

  useEffect(() => {
    aplicarFiltros(fechaInicialRango, fechaFinalRango);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalMapaAbierto ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [modalMapaAbierto]);

  useEffect(() => { localStorage.setItem('asistencia_vista', vistaAgrupada); }, [vistaAgrupada]);
  useEffect(() => { localStorage.setItem('asistencia_filtro', filtroRapido); }, [filtroRapido]);
  useEffect(() => { localStorage.setItem('asistencia_busqueda_por', busquedaPor); }, [busquedaPor]);

  // Cargar permisos del rango actual para todos los usuarios
  useEffect(() => {
    const fetchPermisos = async () => {
      if (!fechaInicialRango || !fechaFinalRango) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('permisos_empleado')
        .select('*')
        .gte('fin', fechaInicialRango)
        .lte('inicio', fechaFinalRango + 'T23:59:59');
      if (!data) return;
      const map: Record<string, PermisoEmpleado[]> = {};
      data.forEach((p: any) => {
        if (!map[p.user_id]) map[p.user_id] = [];
        
        const user = todosLosUsuarios.find((u: any) => (u.id === p.user_id) || (u.user_id === p.user_id)) as any;
        const permisoE: PermisoEmpleado = {
          ...p,
          usuario: user ? {
            id: user.id || user.user_id || p.user_id,
            nombre: user.nombre,
            puesto_nombre: user.puesto_nombre,
            oficina_nombre: user.oficina_nombre,
            dependencia_id: user.dependencia_id || null,
            oficina_path_orden: user.oficina_path_orden || null,
          } : undefined
        };
        
        map[p.user_id].push(permisoE);
      });
      setPermisosMap(map);
    };
    fetchPermisos();
  }, [fechaInicialRango, fechaFinalRango, todosLosUsuarios]);

  // Cargar comisiones del rango para todos los usuarios (con asistentes completos)
  useEffect(() => {
    const fetchComisiones = async () => {
      if (!fechaInicialRango || !fechaFinalRango) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('comisiones')
        .select('id, titulo, fecha_hora, aprobado, comentarios, comision_asistentes(asistente_id, encargado)')
        .eq('aprobado', true)
        .gte('fecha_hora', fechaInicialRango)
        .lte('fecha_hora', fechaFinalRango + 'T23:59:59');
      if (!data) return;
      const map: Record<string, ComisionConFechaYHoraSeparada[]> = {};
      data.forEach((c: any) => {
        const date = new Date(c.fecha_hora);
        const comisionObj: ComisionConFechaYHoraSeparada = {
          id: c.id,
          titulo: c.titulo,
          fecha_hora: c.fecha_hora,
          aprobado: c.aprobado,
          comentarios: c.comentarios || [],
          asistentes: (c.comision_asistentes || []).map((a: any) => ({
            id: a.asistente_id,
            encargado: a.encargado,
            // campos requeridos por Usuario — los nombres se resuelven con todosLosUsuarios
            email: '', nombre: '', activo: true, rol: '', permisos: [], programas_asignados: [],
          })),
          fecha: date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          hora: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        };
        (c.comision_asistentes || []).forEach((a: any) => {
          if (!map[a.asistente_id]) map[a.asistente_id] = [];
          if (!map[a.asistente_id].some(x => x.id === comisionObj.id)) {
            map[a.asistente_id].push(comisionObj);
          }
        });
      });
      setComisionesMap(map);
    };
    fetchComisiones();
  }, [fechaInicialRango, fechaFinalRango]);

  const oficinasNivel2 = useMemo(() => {
    const rootIds = new Set(dependencias.filter(d => d.parent_id === null).map(d => d.id));
    return dependencias
      .filter(d => !d.es_puesto && d.parent_id !== null && rootIds.has(d.parent_id))
      .filter(d => !esOficinaSinMarcajeAsistencia(d.nombre))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [dependencias]);

  const oficinasNivel3 = useMemo(() => {
    if (!nivel2Id) return [];
    return dependencias
      .filter(d => !d.es_puesto && d.parent_id === nivel2Id)
      .filter(d => !esOficinaSinMarcajeAsistencia(d.nombre))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [dependencias, nivel2Id]);

  const registrosFiltrados = useMemo(() => {
    const sinConcejo = registros.filter(
      (registro) => !esOficinaSinMarcajeAsistencia(registro.oficina_nombre),
    );
    if (!searchTerm) return sinConcejo;
    const lowerTerm = searchTerm.toLowerCase();
    if (busquedaPor === 'nombre') {
      return sinConcejo.filter(
        (registro) => registro.nombre?.toLowerCase().includes(lowerTerm) ?? false,
      );
    }
    return sinConcejo.filter(
      (registro) =>
        registro.oficina_nombre?.toLowerCase().includes(lowerTerm) ?? false,
    );
  }, [registros, searchTerm, busquedaPor]);

  const diasIntervalo = useMemo(() => {
    if (!fechaInicialRango || !fechaFinalRango) return [];
    try {
        const dias = eachDayOfInterval({
            start: parseISO(fechaInicialRango),
            end: parseISO(fechaFinalRango)
        });

        if (incluirFinesSemana) {
          return dias;
        }

        return dias.filter(d => {
          const day = d.getDay();
          return day !== 0 && day !== 6; 
        });

    } catch (e) {
        return [];
    }
  }, [fechaInicialRango, fechaFinalRango, incluirFinesSemana]);

  const registrosDiariosBase = useMemo(() => {
    const registrosTemp: Record<string, Record<string, RegistrosAgrupados>> = {};
    
    registrosFiltrados.forEach(registro => {
      const oficinaNombre = registro.oficina_nombre || 'Sin Oficina';
      if (esOficinaSinMarcajeAsistencia(oficinaNombre)) return;
      const diaString = format(new Date(registro.created_at), 'yyyy-MM-dd');
      const userId = registro.user_id;
      const oficinaPath = registro.oficina_path_orden || '0';
      const claveUnica = `${diaString}-${userId}`;

      if (!registrosTemp[oficinaNombre]) registrosTemp[oficinaNombre] = {};

      if (!registrosTemp[oficinaNombre][claveUnica]) {
        registrosTemp[oficinaNombre][claveUnica] = {
          entrada: null,
          salida: null,
          multiple: [],
          nombre: registro.nombre || 'N/A',
          puesto_nombre: registro.puesto_nombre || 'N/A',
          oficina_nombre: oficinaNombre,
          oficina_path_orden: oficinaPath,
          userId: userId,
          diaString: diaString,
        };
      }

      const tipoRegistroStr = registro.tipo_registro as string;

      if (tipoRegistroStr === 'Entrada') {
        registrosTemp[oficinaNombre][claveUnica].entrada = registro;
      } else if (tipoRegistroStr === 'Salida') {
        registrosTemp[oficinaNombre][claveUnica].salida = registro;
      } else {
        registrosTemp[oficinaNombre][claveUnica].multiple.push(registro);
      }
    });
    return registrosTemp;
  }, [registrosFiltrados]);

  const idsDependenciaFiltro = useMemo(() => {
    const filtroId = nivel3Id || nivel2Id;
    if (!filtroId) return null;
    const ids = new Set<string>();
    const agregar = (id: string) => {
      ids.add(id);
      dependencias
        .filter((d) => d.parent_id === id)
        .forEach((d) => agregar(d.id));
    };
    agregar(filtroId);
    return ids;
  }, [nivel2Id, nivel3Id, dependencias]);

  const usuariosMunicipales = useMemo(() => {
    return todosLosUsuarios.filter((u: { oficina_nombre?: string | null; dependencia_id?: string | null; nombre?: string | null }) => {
      if (esOficinaSinMarcajeAsistencia(u.oficina_nombre)) return false;
      
      // Filtrar por las dependencias que el jefe tiene permitidas (si se pasa la prop)
      if (dependenciasPermitidas !== undefined) {
        if (!u.dependencia_id || !dependenciasPermitidas.includes(u.dependencia_id)) {
          return false;
        }
      }

      if (idsDependenciaFiltro) {
        const depId = u.dependencia_id;
        if (depId && idsDependenciaFiltro.has(depId)) return true;
        const nombresSubarbol = [...idsDependenciaFiltro]
          .map((id) => dependencias.find((d) => d.id === id)?.nombre)
          .filter(Boolean);
        return nombresSubarbol.some(
          (nombre) => nombre === u.oficina_nombre,
        );
      }
      return true;
    });
  }, [todosLosUsuarios, idsDependenciaFiltro, dependencias, dependenciasPermitidas]);

  const usuariosPorOficina = useMemo(() => {
    const map: Record<string, { userId: string; nombre: string; puesto: string; path: string }[]> = {};

    usuariosMunicipales.forEach((u: { id?: string; user_id?: string; nombre?: string; puesto_nombre?: string; oficina_nombre?: string | null; oficina_path_orden?: string | null }) => {
      const oficinaNombre = u.oficina_nombre || 'Sin Oficina';
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (busquedaPor === 'nombre') {
          if (!u.nombre?.toLowerCase().includes(term)) return;
        } else if (!oficinaNombre.toLowerCase().includes(term)) {
          return;
        }
      }
      const userId = u.id || u.user_id;
      if (!userId) return;
      if (!map[oficinaNombre]) map[oficinaNombre] = [];
      if (!map[oficinaNombre].some((x) => x.userId === userId)) {
        map[oficinaNombre].push({
          userId,
          nombre: u.nombre || '',
          puesto: u.puesto_nombre || '',
          path: u.oficina_path_orden || '',
        });
      }
    });

    Object.entries(registrosDiariosBase).forEach(([oficinaNombre, registrosMap]) => {
      if (esOficinaSinMarcajeAsistencia(oficinaNombre)) return;
      if (searchTerm && busquedaPor === 'dependencia' && !oficinaNombre.toLowerCase().includes(searchTerm.toLowerCase())) return;
      if (!map[oficinaNombre]) map[oficinaNombre] = [];
      Object.values(registrosMap).forEach((r) => {
        if (searchTerm && busquedaPor === 'nombre' && !r.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return;
        const idx = map[oficinaNombre].findIndex((x) => x.userId === r.userId);
        if (idx >= 0) {
          map[oficinaNombre][idx] = {
            ...map[oficinaNombre][idx],
            nombre: r.nombre,
            puesto: r.puesto_nombre,
            path: r.oficina_path_orden,
          };
        } else {
          map[oficinaNombre].push({
            userId: r.userId,
            nombre: r.nombre,
            puesto: r.puesto_nombre,
            path: r.oficina_path_orden,
          });
        }
      });
    });

    return map;
  }, [usuariosMunicipales, registrosDiariosBase, searchTerm, busquedaPor]);

  const datosCompletosFecha = useMemo(() => {
    const agrupadosPorOficina: Record<string, RegistrosAgrupados[]> = {};
    
    Object.keys(usuariosPorOficina).forEach(oficina => {
      if (esOficinaSinMarcajeAsistencia(oficina)) return;
      agrupadosPorOficina[oficina] = [];
      diasIntervalo.forEach(dia => {
        const diaString = format(dia, 'yyyy-MM-dd');
        const registrosBase = registrosDiariosBase[oficina] || {};
        const registrosDelDia = Object.values(registrosBase)
          .filter(r => r.diaString === diaString)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        if (registrosDelDia.length > 0) {
          // Agregar los que tienen registros
          agrupadosPorOficina[oficina].push(...registrosDelDia);
          // Agregar los que NO tienen registros ese día (de la lista completa)
          const idsConRegistro = new Set(registrosDelDia.map(r => r.userId));
          usuariosPorOficina[oficina].forEach(u => {
            if (!idsConRegistro.has(u.userId)) {
              agrupadosPorOficina[oficina].push({
                diaString, esAusencia: true, nombre: u.nombre,
                puesto_nombre: u.puesto, oficina_nombre: oficina,
                oficina_path_orden: u.path, userId: u.userId,
                entrada: null, salida: null, multiple: []
              });
            }
          });
          // Ordenar por nombre dentro del día
          const startIdx = agrupadosPorOficina[oficina].length - (registrosDelDia.length + (usuariosPorOficina[oficina].length - registrosDelDia.length));
          agrupadosPorOficina[oficina].sort((a, b) => {
            if (a.diaString !== b.diaString) return 0;
            return a.nombre.localeCompare(b.nombre);
          });
        } else {
          // Todos ausentes ese día
          usuariosPorOficina[oficina].forEach(u => {
            agrupadosPorOficina[oficina].push({
              diaString, esAusencia: true, nombre: u.nombre,
              puesto_nombre: u.puesto, oficina_nombre: oficina,
              oficina_path_orden: u.path, userId: u.userId,
              entrada: null, salida: null, multiple: []
            });
          });
          // Si no hay ningún usuario con registros en esta oficina, solo marcamos día vacío
          if (usuariosPorOficina[oficina].length === 0) {
            agrupadosPorOficina[oficina].push({
              diaString, esDiaVacio: true, nombre: '', puesto_nombre: '',
              oficina_nombre: oficina, oficina_path_orden: '',
              userId: `vacio-${diaString}`, entrada: null, salida: null, multiple: []
            });
          }
        }
      });
      agrupadosPorOficina[oficina].sort((a, b) => {
        const compare = a.diaString.localeCompare(b.diaString);
        return ordenDescendente ? -compare : compare;
      });
    });
    return agrupadosPorOficina;
  }, [usuariosPorOficina, registrosDiariosBase, diasIntervalo, ordenDescendente]);

  const datosCompletosUsuario = useMemo(() => {
    const agrupadosPorOficina: Record<string, UsuarioAgrupado[]> = {};
    
    Object.entries(usuariosPorOficina).forEach(([oficinaNombre, usuarios]) => {
      if (esOficinaSinMarcajeAsistencia(oficinaNombre)) return;
      const registrosBase = registrosDiariosBase[oficinaNombre] || {};

      const usuariosDelGrupo: UsuarioAgrupado[] = usuarios.map(datosUsuario => {
        const { userId } = datosUsuario;
        const asistenciasUsuario: RegistrosAgrupados[] = diasIntervalo.map(dia => {
          const diaString = format(dia, 'yyyy-MM-dd');
          const clave = `${diaString}-${userId}`;
          if (registrosBase[clave]) return registrosBase[clave];
          return {
            diaString, esAusencia: true,
            nombre: datosUsuario.nombre,
            puesto_nombre: datosUsuario.puesto,
            oficina_nombre: oficinaNombre,
            oficina_path_orden: datosUsuario.path,
            userId, entrada: null, salida: null, multiple: []
          };
        });
        asistenciasUsuario.sort((a, b) => {
          const compare = a.diaString.localeCompare(b.diaString);
          return ordenDescendente ? -compare : compare;
        });
        return { nombre: datosUsuario.nombre, puesto_nombre: datosUsuario.puesto, oficina_path_orden: datosUsuario.path, userId, asistencias: asistenciasUsuario };
      });

      usuariosDelGrupo.sort((a, b) => a.nombre.localeCompare(b.nombre));
      agrupadosPorOficina[oficinaNombre] = usuariosDelGrupo;
    });
    return agrupadosPorOficina;
  }, [usuariosPorOficina, registrosDiariosBase, diasIntervalo, ordenDescendente]);

  /** Devuelve true si el usuario tiene permiso/asueto/comisión justificando la ausencia ese día */
  const tieneJustificacion = useMemo(() => {
    return (userId: string, diaString: string): boolean => {
      const tieneComision = (comisionesMap[userId] || []).some(c => c.fecha_hora.startsWith(diaString));
      if (tieneComision) return true;
      const tienePermiso = (permisosMap[userId] || []).some(p => permisoAplicaEnDia(p, diaString));
      if (tienePermiso) return true;
      return !!getAsuetoPorFecha(
        asuetos,
        diaString,
        dependenciaPorUsuario[userId],
        parentByDependenciaId,
      );
    };
  }, [comisionesMap, permisosMap, asuetos, dependenciaPorUsuario, parentByDependenciaId]);

  const estadisticas = useMemo(() => {
    let inasistencias = 0;
    let salidasSinMarcaje = 0;
    let entradasTarde = 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const horarioEntradaUsuario = (userId: string) =>
      horariosMap[userId]?.entrada || '08:00:00';

    const contarEnArray = (arr: RegistrosAgrupados[]) => {
        arr.forEach(r => {
            if (r.diaString > todayStr) return;
            if (r.esDiaVacio || r.esAusencia) {
                if (!tieneJustificacion(r.userId, r.diaString)) inasistencias++;
            } else {
                if (
                  r.entrada &&
                  esEntradaTardeMarcaje({
                    marcaEntradaAt: r.entrada.created_at,
                    horarioEntrada: horarioEntradaUsuario(r.userId),
                    diaString: r.diaString,
                    notas: r.entrada.notas,
                  })
                ) {
                  entradasTarde++;
                }
                if (r.entrada && !r.salida) salidasSinMarcaje++;
            }
        });
    };

    if (vistaAgrupada === 'fecha') {
        Object.values(datosCompletosFecha).forEach(grupo => contarEnArray(grupo));
    } else {
        Object.values(datosCompletosUsuario).forEach(usuarios => {
            usuarios.forEach(u => contarEnArray(u.asistencias));
        });
    }

    return { inasistencias, salidasSinMarcaje, entradasTarde };
  }, [datosCompletosFecha, datosCompletosUsuario, vistaAgrupada, tieneJustificacion, horariosMap]);

  const registrosFiltradosFinales = useMemo(() => {
     const todayStr = format(new Date(), 'yyyy-MM-dd');
     const filterFn = (r: RegistrosAgrupados) => {
        if (filtroRapido === 'todos') return true;
        if (filtroRapido === 'inasistencia')
          return (r.esDiaVacio || r.esAusencia) && r.diaString <= todayStr && !tieneJustificacion(r.userId, r.diaString);
        if (filtroRapido === 'sin_salida') return !!r.entrada && !r.salida;
        if (filtroRapido === 'entrada_tarde') {
          const horario = horariosMap[r.userId]?.entrada || '08:00:00';
          return !!r.entrada && esEntradaTardeMarcaje({
            marcaEntradaAt: r.entrada.created_at,
            horarioEntrada: horario,
            diaString: r.diaString,
            notas: r.entrada.notas,
          });
        }
        return true;
     };

     if (vistaAgrupada === 'fecha') {
        const resultado: Record<string, RegistrosAgrupados[]> = {};
        Object.entries(datosCompletosFecha).forEach(([oficina, regs]) => {
           const filtrados = regs.filter(filterFn);
           if (filtrados.length > 0) resultado[oficina] = filtrados;
        });
        return resultado;
     } else {
        const resultado: Record<string, UsuarioAgrupado[]> = {};
        Object.entries(datosCompletosUsuario).forEach(([oficina, usuarios]) => {
           const usuariosFiltrados = usuarios.map(u => ({
              ...u,
              asistencias: u.asistencias.filter(filterFn)
           })).filter(u => u.asistencias.length > 0);
           
           if (usuariosFiltrados.length > 0) resultado[oficina] = usuariosFiltrados;
        });
        return resultado;
     }
  }, [datosCompletosFecha, datosCompletosUsuario, vistaAgrupada, filtroRapido, tieneJustificacion, horariosMap]);

  const oficinasOrdenadas = useMemo(() => {
    return Object.keys(registrosFiltradosFinales).sort((a, b) => {
        let pathA = '';
        let pathB = '';
        
        if (vistaAgrupada === 'fecha') {
             pathA = (registrosFiltradosFinales as Record<string, RegistrosAgrupados[]>)[a].find(r => !r.esDiaVacio)?.oficina_path_orden || '';
             pathB = (registrosFiltradosFinales as Record<string, RegistrosAgrupados[]>)[b].find(r => !r.esDiaVacio)?.oficina_path_orden || '';
        } else {
             pathA = (registrosFiltradosFinales as Record<string, UsuarioAgrupado[]>)[a][0]?.oficina_path_orden || '';
             pathB = (registrosFiltradosFinales as Record<string, UsuarioAgrupado[]>)[b][0]?.oficina_path_orden || '';
        }
        return pathA.localeCompare(pathB, undefined, { numeric: true });
    });
  }, [registrosFiltradosFinales, vistaAgrupada]);

  const handleAbrirModalMapa = (registro: any, nombre?: string) => {
    setRegistrosSeleccionadosParaMapa({
      entrada: registro.entrada,
      salida: registro.salida,
      multiple: registro.multiple?.length > 0 ? registro.multiple : undefined
    });
    setNombreUsuarioModal(nombre || registro.nombre);
    setModalMapaAbierto(true);
  };

  const aplicarFiltros = (
    start: string | null = fechaInicialRango, 
    end: string | null = fechaFinalRango
  ) => {
    setOficinaId(nivel3Id || nivel2Id || null);
    if (start) {
      const [y, m, d] = start.split('-').map(Number);
      setFechaInicio(new Date(y, m - 1, d, 0, 0, 0).toISOString());
    } else setFechaInicio(null);

    if (end) {
      const [y, m, d] = end.split('-').map(Number);
      setFechaFinal(endOfDay(new Date(y, m - 1, d)).toISOString());
    } else setFechaFinal(null);

    setOficinasAbiertas({});
  };

  const handleSeleccionMes = (mes: number, anio: number) => {
    setMesSeleccionado(mes);
    setAnioSeleccionado(anio);
    const { start, end } = rangoMes(mes, anio);
    setFechaInicialRango(start);
    setFechaFinalRango(end);
    aplicarFiltros(start, end);
  };

  const handleAplicarFechaManual = () => {
    aplicarFiltros(fechaInicialRango, fechaFinalRango);
  };

  const toggleOficina = (nombreOficina: string) => {
    setOficinasAbiertas(prev => ({ ...prev, [nombreOficina]: !prev[nombreOficina] }));
  };

  const todosAbiertos = useMemo(
    () =>
      oficinasOrdenadas.length > 0 &&
      oficinasOrdenadas.every((nombre) => oficinasAbiertas[nombre]),
    [oficinasOrdenadas, oficinasAbiertas],
  );

  const toggleTodosAcordeon = () => {
    if (todosAbiertos) {
      setOficinasAbiertas({});
      return;
    }
    const next: Record<string, boolean> = {};
    oficinasOrdenadas.forEach((nombre) => {
      next[nombre] = true;
    });
    setOficinasAbiertas(next);
  };

  useEffect(() => {
    if (oficinasOrdenadas.length === 1) {
      setOficinasAbiertas({ [oficinasOrdenadas[0]]: true });
    }
  }, [oficinasOrdenadas]);

  return (
    <>
      <div className="w-full xl:w-4/5 mx-auto md:px-4">
        <div className="p-2 bg-white dark:bg-neutral-950 rounded-lg shadow-md w-full border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
          
          <AsistenciaControls 
            mesSeleccionado={mesSeleccionado}
            anioSeleccionado={anioSeleccionado}
            onMesChange={handleSeleccionMes}
            nivel2Id={nivel2Id} setNivel2Id={setNivel2Id}
            nivel3Id={nivel3Id} setNivel3Id={setNivel3Id}
            oficinasNivel2={oficinasNivel2} oficinasNivel3={oficinasNivel3}
            handleMostrarOficina={() => aplicarFiltros()}
            fechaInicialRango={fechaInicialRango} setFechaInicialRango={setFechaInicialRango}
            fechaFinalRango={fechaFinalRango} setFechaFinalRango={setFechaFinalRango}
            handleAplicarFechaManual={handleAplicarFechaManual}
            vistaAgrupada={vistaAgrupada} setVistaAgrupada={setVistaAgrupada}
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            busquedaPor={busquedaPor} setBusquedaPor={setBusquedaPor}
            ordenDescendente={ordenDescendente} setOrdenDescendente={setOrdenDescendente}
          />

          <div className="border-t border-gray-200 dark:border-neutral-800 pt-4 mt-4">
            {loading || loadingDependencias ? (
              <Cargando texto="Cargando asistencias..." />
            ) : oficinasOrdenadas.length === 0 && filtroRapido === 'todos' ? (
              <p className="text-center text-gray-500 dark:text-gray-400 text-xs">No hay registros disponibles para el rango seleccionado.</p>
            ) : (
              <div className="w-full">
                
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <Button
                    size="sm"
                    onClick={() => setIncluirFinesSemana(!incluirFinesSemana)}
                    className={`h-7 px-3 text-[10px] rounded-sm border transition-all cursor-pointer ${
                      incluirFinesSemana
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'
                    }`}
                  >
                    <Calendar className="w-3 h-3 mr-1.5" />
                    Incluir fines de semana
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setFiltroRapido(prev => prev === 'inasistencia' ? 'todos' : 'inasistencia')}
                    className={`h-7 px-3 text-[10px] rounded-sm border transition-all cursor-pointer ${
                      filtroRapido === 'inasistencia'
                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                        : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                    }`}
                  >
                    <XCircle className="w-3 h-3 mr-1.5" />
                    Inasistencias: {estadisticas.inasistencias}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setFiltroRapido(prev => prev === 'entrada_tarde' ? 'todos' : 'entrada_tarde')}
                    className={`h-7 px-3 text-[10px] rounded-sm border transition-all cursor-pointer ${
                      filtroRapido === 'entrada_tarde'
                        ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
                        : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30'
                    }`}
                  >
                    <Clock className="w-3 h-3 mr-1.5" />
                    Entrada tarde: {estadisticas.entradasTarde}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setFiltroRapido(prev => prev === 'sin_salida' ? 'todos' : 'sin_salida')}
                    className={`h-7 px-3 text-[10px] rounded-sm border transition-all cursor-pointer ${
                      filtroRapido === 'sin_salida'
                        ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-100 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                    Sin salida: {estadisticas.salidasSinMarcaje}
                  </Button>

                  {oficinasOrdenadas.length > 0 && (
                    <AccordionToggleButton
                      className="ml-auto"
                      expanded={todosAbiertos}
                      onToggle={toggleTodosAcordeon}
                    />
                  )}
                </div>

                <div className="w-full overflow-x-auto rounded-lg border border-gray-100 dark:border-neutral-800">
                  <table className="w-full table-fixed text-xs">
                    <thead className="bg-slate-50 dark:bg-neutral-900 text-left">
                      <tr>
                        <th className="py-3 px-3 text-[10px] xl:text-xs w-[35%] font-semibold text-slate-600 dark:text-slate-300">
                          {vistaAgrupada === 'fecha' ? 'Usuario' : 'Fecha'}
                        </th>
                        <th className="py-3 px-3 text-[10px] xl:text-xs" colSpan={2}>
                          <div className="flex items-center">
                            <span className="w-3/4 font-semibold text-slate-600 dark:text-slate-300">Marcaje</span>
                            <span className="w-1/4 text-center text-indigo-500 dark:text-indigo-400 font-semibold">Justificación</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {oficinasOrdenadas.map((nombreOficina) => (
                        <OficinaAccordion 
                          key={nombreOficina}
                          nombreOficina={nombreOficina}
                          registros={vistaAgrupada === 'fecha' 
                             ? (registrosFiltradosFinales as Record<string, RegistrosAgrupados[]>)[nombreOficina] 
                             : (registrosFiltradosFinales as Record<string, UsuarioAgrupado[]>)[nombreOficina]
                          }
                          vistaAgrupada={vistaAgrupada}
                          estaAbierta={oficinasAbiertas[nombreOficina] || false}
                          onToggle={() => toggleOficina(nombreOficina)}
                          onAbrirModal={handleAbrirModalMapa}
                          permisosMap={permisosMap}
                          comisionesMap={comisionesMap}
                          onVerPermiso={setPermisoPreview}
                          onVerAcuerdo={setAcuerdoPreview}
                          onVerComision={setComisionPreview}
                          asuetos={asuetos}
                          parentByDependenciaId={parentByDependenciaId}
                          dependenciaPorUsuario={dependenciaPorUsuario}
                          usuarios={usuariosMunicipales as typeof todosLosUsuarios}
                          horariosMap={horariosMap}
                        />
                      ))}
                      {oficinasOrdenadas.length === 0 && (
                          <tr>
                              <td colSpan={3} className="py-8 text-center text-gray-400 text-xs italic">
                                  No hay registros que coincidan con el filtro seleccionado.
                              </td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {modalMapaAbierto && (
          <Mapa
            isOpen={modalMapaAbierto}
            onClose={() => setModalMapaAbierto(false)}
            registros={registrosSeleccionadosParaMapa}
            nombreUsuario={nombreUsuarioModal}
          />
        )}
      </AnimatePresence>

      <PreviewPermiso
        isOpen={!!permisoPreview}
        onClose={() => setPermisoPreview(null)}
        permiso={permisoPreview}
      />

      <PreviewAcuerdo
        isOpen={!!acuerdoPreview}
        onClose={() => setAcuerdoPreview(null)}
        acuerdo={acuerdoPreview}
      />

      {/* Modal de detalle de comisión */}
      {comisionPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setComisionPreview(null); }}
        >
          <div className="bg-white dark:bg-neutral-950 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <VerComision
              comision={comisionPreview}
              usuarios={todosLosUsuarios as any}
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
          onClose={() => { setMapaComisionRegistros(null); setMapaComisionNombre(''); }}
          registros={mapaComisionRegistros}
          nombreUsuario={mapaComisionNombre}
          titulo="Comisión"
        />
      )}
    </>
  );
}