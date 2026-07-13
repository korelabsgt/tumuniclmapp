import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { PermisoEmpleado, PermisosPorOficina, UsuarioConJerarquia, EstadoPermiso, esTipoAcuerdo } from '@/components/permisos/types';
import { obtenerPermisosPorFecha, obtenerPermisosPorRango, obtenerTodosPendientes, eliminarPermiso, obtenerPerfilUsuario, PerfilUsuario } from '@/components/permisos/acciones';
import { useListaUsuarios } from '@/hooks/usuarios/useListarUsuarios';

export type TipoVistaPermisos = 'mis_permisos' | 'gestion_jefe' | 'gestion_rrhh';

export const usePermisos = (tipoVista: TipoVistaPermisos) => {
  const [registrosRaw, setRegistrosRaw] = useState<PermisoEmpleado[]>([]);
  const [loadingPermisos, setLoadingPermisos] = useState(true);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario | null>(null);
  const [conteosPendientes, setConteosPendientes] = useState<{ pendientes: number; avalados: number }>({ pendientes: 0, avalados: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [oficinasAbiertas, setOficinasAbiertas] = useState<Record<string, boolean>>({});
  const [todosAbiertos, setTodosAbiertos] = useState(true);
  
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoPermiso>('todos');
  
  // Modos de filtro: 'dia' | 'semana' | 'rango' | 'pendientes'
  const [modoFiltro, setModoFiltro] = useState<'dia' | 'semana' | 'rango' | 'pendientes'>('semana');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [fechaInicio, setFechaInicio] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [permisoParaEditar, setPermisoParaEditar] = useState<PermisoEmpleado | null>(null);

  const { usuarios: usuariosHook } = useListaUsuarios();

  const usuariosAdaptados = useMemo(() => {
    return (usuariosHook as unknown) as UsuarioConJerarquia[];
  }, [usuariosHook]);

  const cargarDatos = useCallback(async () => {
    try {
      let data: PermisoEmpleado[];
      if (modoFiltro === 'pendientes') {
        data = await obtenerTodosPendientes();
      } else if (modoFiltro === 'rango' || modoFiltro === 'semana') {
        data = await obtenerPermisosPorRango(fechaInicio, fechaFin);
      } else {
        data = await obtenerPermisosPorFecha(fechaSeleccionada);
      }
      setRegistrosRaw(data);
      // Actualizar conteos de pendientes globales
      await actualizarConteosPendientes();
    } catch (error) {
      console.error(error);
    }
  }, [fechaSeleccionada, fechaInicio, fechaFin, modoFiltro]);

  const actualizarConteosPendientes = useCallback(async (perfilActual?: PerfilUsuario | null) => {
    try {
      const perfil = perfilActual || perfilUsuario;
      if (!perfil) return;
      const todos = await obtenerTodosPendientes();

      let permisosFiltrados = todos.map(permiso => {
         const usuarioEncontrado = usuariosAdaptados.find(u => u.id === permiso.user_id);
         return { ...permiso, usuario: usuarioEncontrado };
      }).filter(p => !esTipoAcuerdo(p.tipo));

      const esRRHH = ['RRHH', 'SUPER', 'SECRETARIO'].includes(perfil.rol || '');
      const idsOficinasJefe = perfil.oficinasACargo.map(o => o.id);
      const nombresOficinasJefe = perfil.oficinasACargo.map(o => o.nombre.toLowerCase().trim());

      if (tipoVista === 'gestion_jefe') {
         if (idsOficinasJefe.length > 0) {
            permisosFiltrados = permisosFiltrados.filter(p => {
               const depId = p.usuario?.dependencia_id;
               const depNombre = p.usuario?.oficina_nombre?.toLowerCase().trim();
               return (depId && idsOficinasJefe.includes(depId)) || 
                      (depNombre && nombresOficinasJefe.includes(depNombre));
            });
         } else {
            permisosFiltrados = [];
         }
      } else if (tipoVista === 'gestion_rrhh') {
         if (!esRRHH) permisosFiltrados = [];
      } else if (tipoVista === 'mis_permisos') {
         permisosFiltrados = [];
      }

      let pend = 0;
      let aval = 0;
      permisosFiltrados.forEach(r => {
        if (r.estado === 'pendiente') pend++;
        if (r.estado === 'aprobado_jefe') aval++;
      });
      setConteosPendientes({ pendientes: pend, avalados: aval });
    } catch (e) {
      // silently fail
    }
  }, [perfilUsuario, tipoVista, usuariosAdaptados]);

  useEffect(() => {
    const init = async () => {
      setLoadingPermisos(true);
      try {
        let data: PermisoEmpleado[];
        if (modoFiltro === 'pendientes') {
          data = await obtenerTodosPendientes();
        } else if (modoFiltro === 'rango' || modoFiltro === 'semana') {
          data = await obtenerPermisosPorRango(fechaInicio, fechaFin);
        } else {
          data = await obtenerPermisosPorFecha(fechaSeleccionada);
        }
        const perfil = await obtenerPerfilUsuario();
        setRegistrosRaw(data);
        setPerfilUsuario(perfil);
        // Intentar cargar conteos, aunque es posible que usuariosAdaptados aún no esté listo
        await actualizarConteosPendientes(perfil);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingPermisos(false);
      }
    };
    init();
  }, [fechaSeleccionada, fechaInicio, fechaFin, modoFiltro]);

  // Asegurarnos de que los conteos se calculen una vez que tenemos la lista de usuarios
  useEffect(() => {
    if (perfilUsuario && usuariosAdaptados.length > 0) {
      actualizarConteosPendientes();
    }
  }, [perfilUsuario, usuariosAdaptados, actualizarConteosPendientes]);

  // Auto-abrir todos los acordeones cuando cambian los datos
  useEffect(() => {
    if (todosAbiertos) {
      const nuevoEstado: Record<string, boolean> = {};
      datosAgrupadosInterno.forEach(g => {
        nuevoEstado[g.oficina_nombre] = true;
      });
      setOficinasAbiertas(nuevoEstado);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrosRaw, todosAbiertos]);

  const toggleOficina = (nombre: string) => {
    setOficinasAbiertas(prev => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const toggleTodos = () => {
    const nuevoEstado = !todosAbiertos;
    setTodosAbiertos(nuevoEstado);
    const estado: Record<string, boolean> = {};
    datosAgrupadosInterno.forEach(g => {
      estado[g.oficina_nombre] = nuevoEstado;
    });
    setOficinasAbiertas(estado);
  };

  const handleNuevoPermiso = () => {
    setPermisoParaEditar(null);
    setModalAbierto(true);
  };

  const handleClickFila = (permiso: PermisoEmpleado) => {
    setPermisoParaEditar(permiso);
    setModalAbierto(true);
  };

  const handleEliminarPermiso = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
       background: document.documentElement.classList.contains('dark') ? '#171717' : '#fff',
       color: document.documentElement.classList.contains('dark') ? '#e5e5e5' : '#000',
    });

    if (result.isConfirmed) {
      try {
        await eliminarPermiso(id);
        await cargarDatos();
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El permiso ha sido eliminado correctamente.',
          icon: 'success',
           background: document.documentElement.classList.contains('dark') ? '#171717' : '#fff',
           color: document.documentElement.classList.contains('dark') ? '#e5e5e5' : '#000',
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'No se pudo eliminar el permiso.', icon: 'error' });
      }
    }
  };

  const registrosEnriquecidos = useMemo(() => {
    if (!usuariosAdaptados.length) return [];
    return registrosRaw.map(permiso => {
      const usuarioEncontrado = usuariosAdaptados.find(u => u.id === permiso.user_id);
      return { ...permiso, usuario: usuarioEncontrado };
    });
  }, [registrosRaw, usuariosAdaptados]);

  const { permisosVisibles, usuariosParaModal } = useMemo(() => {
    if (!perfilUsuario) return { permisosVisibles: [], usuariosParaModal: [] };

    let permisosFiltrados = [...registrosEnriquecidos];
    let usuariosFiltrados = [...usuariosAdaptados];
    
    const esRRHH = ['RRHH', 'SUPER', 'SECRETARIO'].includes(perfilUsuario.rol || '');
    const idsOficinasJefe = perfilUsuario.oficinasACargo.map(o => o.id);
    const nombresOficinasJefe = perfilUsuario.oficinasACargo.map(o => o.nombre.toLowerCase().trim());

    switch (tipoVista) {
        case 'mis_permisos':
            permisosFiltrados = permisosFiltrados.filter(p => p.user_id === perfilUsuario.id);
            usuariosFiltrados = usuariosFiltrados.filter(u => u.id === perfilUsuario.id);
            break;

        case 'gestion_jefe':
            if (idsOficinasJefe.length > 0) {
              permisosFiltrados = permisosFiltrados.filter(p => {
                 const depId = p.usuario?.dependencia_id;
                 const depNombre = p.usuario?.oficina_nombre?.toLowerCase().trim();
                 return (depId && idsOficinasJefe.includes(depId)) || 
                        (depNombre && nombresOficinasJefe.includes(depNombre));
              });
              
              usuariosFiltrados = usuariosFiltrados.filter(u => {
                  const depId = u.dependencia_id;
                  const depNombre = u.oficina_nombre?.toLowerCase().trim();
                  return (depId && idsOficinasJefe.includes(depId)) || 
                         (depNombre && nombresOficinasJefe.includes(depNombre));
              });
            } else {
              permisosFiltrados = [];
            }
            break;

        case 'gestion_rrhh':
            if (!esRRHH) {
                permisosFiltrados = []; 
                usuariosFiltrados = [];
            } else {
                // CORRECCIÓN: RRHH ahora ve también los 'pendiente'
                permisosFiltrados = permisosFiltrados.filter(p => 
                    p.estado === 'pendiente' || 
                    p.estado === 'aprobado_jefe' || 
                    p.estado === 'aprobado' || 
                    p.estado === 'rechazado_rrhh'
                );
            }
            break;
    }

    return { permisosVisibles: permisosFiltrados, usuariosParaModal: usuariosFiltrados };
  }, [registrosEnriquecidos, usuariosAdaptados, perfilUsuario, tipoVista]);

  const registrosFinales = useMemo(() => {
    return permisosVisibles.filter(r => {
      if (esTipoAcuerdo(r.tipo)) return false;

      const nombreEmpleado = r.usuario?.nombre?.toLowerCase() || '';
      const nombreOficina = r.usuario?.oficina_nombre?.toLowerCase() || '';
      const codigoBase = r.id.substring(0, 6).toLowerCase();
      const codigoFormateado = `${codigoBase.substring(0, 3)}-${codigoBase.substring(3, 6)}`;
      const termino = searchTerm.toLowerCase();
      
      const matchBusqueda = 
        nombreEmpleado.includes(termino) || 
        nombreOficina.includes(termino) ||
        codigoBase.includes(termino) ||
        codigoFormateado.includes(termino);
      
      const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      
      return matchBusqueda && matchEstado;
    });
  }, [permisosVisibles, searchTerm, filtroEstado]);

  const registrosOrdenados = useMemo(() => {
      const lista = [...registrosFinales];
      
      return lista.sort((a, b) => {
          // Lógica de Prioridad: 
          // 1. Pendientes (necesitan Jefe o RRHH actuando de jefe)
          // 2. Aprobado Jefe (necesitan RRHH)
          const scoreA = getPrioridad(a.estado);
          const scoreB = getPrioridad(b.estado);

          if (scoreA !== scoreB) return scoreA - scoreB; // Menor score = más arriba
          return 0;
      });
  }, [registrosFinales]);

  function getPrioridad(estado: string) {
      if (estado === 'pendiente') return 1;
      if (estado === 'aprobado_jefe') return 2;
      return 3; // aprobados y rechazados al final
  }

  // Necesitamos que datosAgrupados esté disponible antes del effect de auto-abrir
  const datosAgrupadosInterno = useMemo(() => {
    const grupos: Record<string, PermisosPorOficina> = {};

    if (tipoVista === 'gestion_jefe' && perfilUsuario?.oficinasACargo) {
        perfilUsuario.oficinasACargo.forEach(oficina => {
            grupos[oficina.nombre] = {
                oficina_nombre: oficina.nombre,
                path_orden: '0', 
                permisos: []
            };
        });
    }

    registrosOrdenados.forEach(r => {
      const nombreOficina = r.usuario?.oficina_nombre || 'Sin Oficina Asignada';
      const pathOrden = r.usuario?.oficina_path_orden || '9999';
      
      if (!grupos[nombreOficina]) {
        grupos[nombreOficina] = { 
            oficina_nombre: nombreOficina, 
            path_orden: pathOrden, 
            permisos: [] 
        };
      }
      grupos[nombreOficina].permisos.push(r);
    });

    return Object.values(grupos).sort((a, b) => a.path_orden.localeCompare(b.path_orden, undefined, { numeric: true }));
  }, [registrosOrdenados, tipoVista, perfilUsuario]);

  const estadisticas = useMemo(() => {
    let pendientes = 0; let aprobados = 0; let rechazados = 0; let avalados = 0;
    
    permisosVisibles.forEach(r => {
      // Pendientes: Lo que falta que apruebe el jefe (o RRHH como jefe)
      if (r.estado === 'pendiente') pendientes++;
      // Avalados: Lo que ya aprobó el jefe, falta RRHH
      if (r.estado === 'aprobado_jefe') avalados++;
      // Finalizados
      if (r.estado === 'aprobado') aprobados++;
      // Rechazados
      if (r.estado.includes('rechazado')) rechazados++;
    });
    return { pendientes, aprobados, rechazados, avalados };
  }, [permisosVisibles]);

  return {
    state: {
      loadingPermisos, searchTerm, filtroEstado, fechaSeleccionada, modoFiltro,
      fechaInicio, fechaFin,
      modalAbierto, permisoParaEditar, perfilUsuario, oficinasAbiertas, todosAbiertos,
      datosAgrupados: datosAgrupadosInterno, estadisticas, conteosPendientes, usuariosParaModal,
    },
    actions: {
      setSearchTerm, setFiltroEstado, setFechaSeleccionada, setModoFiltro,
      setFechaInicio, setFechaFin,
      setModalAbierto, toggleOficina, toggleTodos, cargarDatos, handleNuevoPermiso,
      handleClickFila, handleEliminarPermiso,
    }
  };
};