'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Log {
  id: string;
  fecha: string;
  accion: string;
  descripcion: string;
  usuario: string;
  modulo: {
    nombre: string;
  } | null;
}

interface Modulo {
  id: string;
  nombre: string;
}

export default function Logs() {
  const supabase = createClient();
  const hoy = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().split('T')[0]; // UTC-6
  const [logs, setLogs] = useState<Log[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [filtro, setFiltro] = useState({
    modulo: '',
    usuario: '',
    fecha: hoy,
  });

const [paginaActual, setPaginaActual] = useState(1);
const [elementosPorPagina, setElementosPorPagina] = useState(20);


const totalPaginas = Math.ceil(logs.length / elementosPorPagina);
const logsPaginados = logs.slice(
  (paginaActual - 1) * elementosPorPagina,
  paginaActual * elementosPorPagina
);

  const router = useRouter();

  const formatearFecha = (iso?: string | null) => {
    if (!iso || iso === 'null') return '—';
    const fechaUTC = new Date(iso);
    fechaUTC.setUTCHours(fechaUTC.getUTCHours() - 6);

    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dia = dias[fechaUTC.getUTCDay()];
    const horas = fechaUTC.getUTCHours().toString().padStart(2, '0');
    const minutos = fechaUTC.getUTCMinutes().toString().padStart(2, '0');
    const segundos = fechaUTC.getUTCSeconds().toString().padStart(2, '0');
    const diaNum = fechaUTC.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaUTC.getUTCMonth() + 1).toString().padStart(2, '0');
    const anio = fechaUTC.getUTCFullYear();

    return `${dia} ${horas}:${minutos}:${segundos}\n${diaNum}/${mes}/${anio}`;
  };

  const cambiarDia = (dias: number) => {
    const fechaBase = filtro.fecha || hoy;
    const nuevaFecha = new Date(fechaBase);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    const limite = ahora.toISOString().split('T')[0];
    const nuevaISO = nuevaFecha.toISOString().split('T')[0];

    if (nuevaISO <= limite) {
      setFiltro({ ...filtro, fecha: nuevaISO });
    }
  };

  const obtenerFiltros = async () => {
    const { data: modData } = await supabase
      .from('modulos')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    const { data: userData } = await supabase
      .from('vista_logs')
      .select('usuario_email');

    const usuariosUnicos = Array.from(
      new Set(userData?.map((l) => l.usuario_email).filter(Boolean))
    );

    setModulos(modData ?? []);
    setUsuarios(usuariosUnicos as string[]);
  };

  const obtenerLogs = async () => {
    let query = supabase
      .from('vista_logs')
      .select(`
        id,
        fecha,
        accion,
        descripcion,
        usuario_email,
        modulo:modulo_id (
          nombre
        )
      `)
      .order('fecha', { ascending: false });

    if (filtro.modulo) query = query.eq('modulo_id', filtro.modulo);
    if (filtro.usuario) query = query.ilike('usuario_email', `%${filtro.usuario}%`);
    if (filtro.fecha) {
      const inicioGuatemala = new Date(`${filtro.fecha}T00:00:00`);
      const finGuatemala = new Date(`${filtro.fecha}T23:59:59`);
      inicioGuatemala.setHours(inicioGuatemala.getHours() + 6);
      finGuatemala.setHours(finGuatemala.getHours() + 6);

      query = query
        .gte('fecha', inicioGuatemala.toISOString())
        .lte('fecha', finGuatemala.toISOString());
    }

    const { data } = await query;

    setLogs(
      (data ?? []).map((log: any): Log => ({
        id: log.id,
        fecha: log.fecha,
        accion: log.accion,
        descripcion: log.descripcion,
        usuario: log.usuario_email ?? 'Desconocido',
        modulo: log.modulo && 'nombre' in log.modulo
          ? { nombre: log.modulo.nombre }
          : null,
      }))
    );
  };

  useEffect(() => {
    obtenerFiltros();
    obtenerLogs();
  }, []);

  useEffect(() => {
    obtenerLogs();
  }, [filtro]);
useEffect(() => {
  setPaginaActual(1);
}, [filtro]);

return (
  <div className="p-4">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
      <Button
        variant="ghost"
        onClick={() => router.push("/sigem")}
        className="text-blue-600 text-base underline w-full md:w-auto"
      >
        Volver
      </Button>
      <h1 className="text-2xl font-bold text-center w-full md:w-auto">Registro de Actividades</h1>
    </div>

    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
      <select
        className="border p-2 rounded w-full md:w-auto"
        value={filtro.modulo}
        onChange={(e) => setFiltro({ ...filtro, modulo: e.target.value })}
      >
        <option value="">Todos los módulos</option>
        {modulos.map((modulo) => (
          <option key={modulo.id} value={modulo.id}>
            {modulo.nombre}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded w-full md:w-auto"
        value={filtro.usuario}
        onChange={(e) => setFiltro({ ...filtro, usuario: e.target.value })}
      >
        <option value="">Todos los usuarios</option>
        {usuarios.map((usuario) => (
          <option key={usuario} value={usuario}>
            {usuario}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={() => cambiarDia(-1)}
          className="px-2 text-lg border rounded hover:bg-gray-100"
        >
          &lt;
        </button>
        <input
          type="date"
          className="border p-2 rounded w-full md:w-auto"
          value={filtro.fecha}
          max={hoy}
          onChange={(e) => setFiltro({ ...filtro, fecha: e.target.value })}
        />
        <button
          onClick={() => cambiarDia(1)}
          className="px-2 text-lg border rounded hover:bg-gray-100"
        >
          &gt;
        </button>
      </div>
    </div>

    <div className="w-full overflow-x-auto max-w-full border-[2.5px] border-gray-400">
      <table className="w-full min-w-[1000px] border-collapse text-xs border-[2.5px] border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Usuario</th>
            <th className="p-2 border">Acción</th>
            <th className="p-2 border">Módulo</th>
            <th className="p-2 border">Fecha</th>
            <th className="p-2 border">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {logsPaginados.map((log) => {
            const fecha = new Date(log.fecha);
            const hora = fecha.getHours();
            const dia = fecha.getDay();
            const esHorarioLaboral = hora >= 8 && hora < 17 && dia >= 1 && dia <= 5;
            const colorFila = esHorarioLaboral ? 'bg-green-100' : 'bg-yellow-100';

            return (
              <tr key={log.id} className={colorFila}>
                <td className="p-2 border">{log.usuario}</td>
                <td className="p-2 border">{log.accion}</td>
                <td className="p-2 border">{log.modulo?.nombre ?? '—'}</td>
                <td className="p-2 border whitespace-pre-line">
                  {formatearFecha(log.fecha)}
                </td>
                <td
                  className="p-2 border whitespace-pre-line break-words"
                  dangerouslySetInnerHTML={{ __html: log.descripcion }}
                ></td>
              </tr>
            );
          })}
        </tbody>
         </table>

    {logs.length === 0 && (
      <p className="mt-4 text-gray-500">
        No hay registros para los filtros seleccionados.
      </p>
    )}
  </div>

  {/* Selector de cantidad por página */}
  <div className="flex justify-center mt-6 mb-2 items-center gap-2 text-sm">
    <span className="font-semibold">Ver por:</span>
<select
  value={elementosPorPagina}
  onChange={(e) => {
    const nuevaCantidad = parseInt(e.target.value);
    setElementosPorPagina(nuevaCantidad);
    setPaginaActual(1);
  }}
  className="border border-gray-300 rounded px-2 py-1"
>
  <option value={20}>20</option>
  <option value={50}>50</option>
  <option value={100}>100</option>
</select>

  </div>

  {/* Paginación afuera del scroll */}
  {logs.length > elementosPorPagina && (
    <div className="flex justify-center mt-2 mb-6 gap-2 flex-wrap">
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          className={`px-3 py-1 rounded border ${
            num === paginaActual
              ? 'bg-blue-600 text-white'
              : 'bg-white text-blue-600 hover:bg-blue-100'
          }`}
          onClick={() => setPaginaActual(num)}
        >
          {num}
        </button>
      ))}
    </div>
  )}
</div>

);

}
