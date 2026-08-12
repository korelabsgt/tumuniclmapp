'use client';

import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO,
  isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, CalendarDays, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Mapa from '@/components/ui/modals/Mapa'; 
import ListaAsistencias from './ListaAsistencias';
import PreviewPermiso from '@/components/permisos/modals/PreviewPermiso';
import { RegistrosAgrupadosPorUsuario, RegistrosAgrupadosDiarios, AsistenciaDiaria, AsistenciaEnriquecida } from './types';
import { PermisoEmpleado } from '@/components/permisos/types';
import { AnimatePresence } from 'framer-motion';
import useAsistenciasOficina, { usePermisosOficinaRango } from '@/hooks/asistencia/useAsistenciasOficina';

interface AsistenciasOficinasProps {
  oficinaId?: string;
}

export default function AsistenciasOficinas({ oficinaId }: AsistenciasOficinasProps) {
  const [vista, setVista] = useState<'nombre' | 'fecha'>('nombre');
  const [fechaInicio, setFechaInicio] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [busqueda, setBusqueda] = useState('');

  const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
  const [datosModal, setDatosModal] = useState<{ 
    registros: { entrada: any | null, salida: any | null, multiple?: any[] }, 
    titulo: string 
  } | null>(null);
  const [permisoPreview, setPermisoPreview] = useState<PermisoEmpleado | null>(null);

  const { registros: todosLosRegistros, loading } = useAsistenciasOficina(oficinaId || null, fechaInicio, fechaFin);

  const userIds = useMemo(
    () => [...new Set((todosLosRegistros || []).map((r: { user_id: string }) => r.user_id))],
    [todosLosRegistros],
  );

  const { data: permisosMapRaw = {} } = usePermisosOficinaRango(
    userIds,
    fechaInicio,
    fechaFin,
  );
  const permisosMap = permisosMapRaw as Record<string, PermisoEmpleado[]>;

  const diasDelRango = useMemo(() => {
    const start = parseISO(fechaInicio);
    const end = parseISO(fechaFin);
    if (!isValid(start) || !isValid(end) || start > end) return [];
    return eachDayOfInterval({ start, end });
  }, [fechaInicio, fechaFin]);

  const registrosProcesados = useMemo(() => {
    if (!todosLosRegistros) return { porUsuario: [], porFecha: [] };

    const usuariosUnicosMap = new Map();
    todosLosRegistros.forEach((r: any) => {
      if (!usuariosUnicosMap.has(r.user_id)) {
        usuariosUnicosMap.set(r.user_id, {
          userId: r.user_id,
          nombre: r.nombre,
          puesto_nombre: r.puesto_nombre,
          oficina_nombre: r.oficina_nombre,
          oficina_path_orden: r.oficina_path_orden
        });
      }
    });

    const usuariosUnicos = Array.from(usuariosUnicosMap.values());
    const filtrados = usuariosUnicos.filter((u: any) => 
      u.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const dataPorUsuario: RegistrosAgrupadosPorUsuario[] = filtrados.map((usuario: any) => {
      const asistenciasUsuario: AsistenciaDiaria[] = diasDelRango.map(dia => {
        const diaStr = format(dia, 'yyyy-MM-dd');
        
        const registrosDia = todosLosRegistros.filter((r: any) => 
          r.user_id === usuario.userId && 
          isSameDay(parseISO(r.created_at), dia)
        );

        let entrada: AsistenciaEnriquecida | null = null;
        let salida: AsistenciaEnriquecida | null = null;
        const multiple: AsistenciaEnriquecida[] = [];

        registrosDia.forEach((r: any) => {
            if (r.tipo_registro === 'Entrada') {
                if (!entrada || new Date(r.created_at) < new Date(entrada.created_at)) entrada = r;
            } else if (r.tipo_registro === 'Salida') {
                if (!salida || new Date(r.created_at) > new Date(salida.created_at)) salida = r;
            } else {
                multiple.push(r);
            }
        });

        return { diaString: diaStr, entrada, salida, multiple };
      });

      return { ...usuario, asistencias: asistenciasUsuario };
    });

    const dataPorFecha: RegistrosAgrupadosDiarios[] = [];
    diasDelRango.forEach(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      filtrados.forEach((usuario: any) => {
        const registrosDia = todosLosRegistros.filter((r: any) => 
          r.user_id === usuario.userId && 
          isSameDay(parseISO(r.created_at), dia)
        );

        if (registrosDia.length > 0) {
            let entrada: AsistenciaEnriquecida | null = null;
            let salida: AsistenciaEnriquecida | null = null;
            const multiple: AsistenciaEnriquecida[] = [];

            registrosDia.forEach((r: any) => {
                if (r.tipo_registro === 'Entrada') {
                    if (!entrada || new Date(r.created_at) < new Date(entrada.created_at)) entrada = r;
                } else if (r.tipo_registro === 'Salida') {
                    if (!salida || new Date(r.created_at) > new Date(salida.created_at)) salida = r;
                } else {
                    multiple.push(r);
                }
            });

            dataPorFecha.push({
                diaString: diaStr,
                userId: usuario.userId,
                nombre: usuario.nombre,
                puesto_nombre: usuario.puesto_nombre,
                oficina_nombre: usuario.oficina_nombre,
                oficina_path_orden: usuario.oficina_path_orden,
                entrada,
                salida,
                multiple
            });
        }
      });
    });

    return { porUsuario: dataPorUsuario, porFecha: dataPorFecha };
  }, [todosLosRegistros, diasDelRango, busqueda]);

  const handleAbrirModal = (asistencia: { entrada: any, salida: any, multiple?: any[] }, nombreUsuario: string) => {
    setDatosModal({ registros: asistencia, titulo: nombreUsuario });
    setModalMapaAbierto(true);
  };

  return (
    <div className="w-full space-y-4">
      
      {/* Controles */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-end xl:items-center bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm">
        
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-md">
          <Button
            variant={vista === 'nombre' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVista('nombre')}
            className={`text-xs ${vista === 'nombre' ? 'bg-white text-blue-600 shadow-sm dark:bg-neutral-700 dark:text-blue-400' : 'text-gray-500'}`}
          >
            <Users className="w-3 h-3 mr-2" /> Por Nombre
          </Button>
          <Button
            variant={vista === 'fecha' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVista('fecha')}
            className={`text-xs ${vista === 'fecha' ? 'bg-white text-blue-600 shadow-sm dark:bg-neutral-700 dark:text-blue-400' : 'text-gray-500'}`}
          >
            <CalendarDays className="w-3 h-3 mr-2" /> Por Fecha
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Buscar empleado..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8 h-9 text-xs"
                />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="h-9 text-xs w-full sm:w-auto"
                />
                <span className="text-gray-400">-</span>
                <Input 
                    type="date" 
                    value={fechaFin} 
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="h-9 text-xs w-full sm:w-auto"
                />
            </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
        {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse text-sm">
              Cargando registros...
            </div>
        ) : (
            <ListaAsistencias 
                vista={vista}
                registrosPorUsuario={registrosProcesados.porUsuario}
                registrosPorFecha={registrosProcesados.porFecha}
                onAbrirModal={handleAbrirModal}
                permisosMap={permisosMap}
                onVerPermiso={setPermisoPreview}
            />
        )}
      </div>

      {/* Modal Mapa */}
      <AnimatePresence>
        {modalMapaAbierto && datosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
             <Mapa 
                isOpen={modalMapaAbierto} 
                onClose={() => setModalMapaAbierto(false)} 
                registros={datosModal.registros} 
                nombreUsuario={datosModal.titulo} 
                titulo="Detalle de Asistencia"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview Permiso */}
      <PreviewPermiso
        isOpen={!!permisoPreview}
        onClose={() => setPermisoPreview(null)}
        permiso={permisoPreview}
      />
    </div>
  );
}