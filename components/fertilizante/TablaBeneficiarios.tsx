'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ImageIcon, Eye, LayoutGrid, List, Trash2, Pencil, MessageCircle, ChevronDown, Ban, X } from 'lucide-react';
import useUserData from '@/hooks/sesion/useUserData';
import Swal from 'sweetalert2';
import type { Route } from 'next';
import type { TablaBeneficiariosProps, Beneficiario } from './types';
import GestionBeneficiarioImgModal from './GestionBeneficiarioImgModal';
import {
  cargarEncargadosFolios,
  resolverAsignacionEncargado,
  type EncargadoFolio,
} from './actions';


const claveGrupoEncargado = (asignacion: EncargadoFolio | null, beneficiarioId: string): string =>
  asignacion
    ? `${asignacion.id}|${asignacion.lugar}|${asignacion.folio_ini}|${asignacion.folio_fin}`
    : `__sin_encargado__${beneficiarioId}`;

type FilaTablaEncargado = {
  beneficiario: Beneficiario;
  nombreEncargado: string | null;
  mostrarCeldaEncargado: boolean;
  rowspanEncargado: number;
};

const calcularFilasConEncargado = (
  beneficiarios: Beneficiario[],
  encargados: EncargadoFolio[],
): FilaTablaEncargado[] => {
  const filas = beneficiarios.map((beneficiario) => {
    const asignacion = resolverAsignacionEncargado(encargados, beneficiario.lugar, beneficiario.codigo);
    return {
      beneficiario,
      asignacion,
      grupoKey: claveGrupoEncargado(asignacion, beneficiario.id),
      nombreEncargado: asignacion?.encargado_nombre ?? null,
    };
  });

  return filas.map((fila, index) => {
    const esInicioGrupo = index === 0 || filas[index - 1].grupoKey !== fila.grupoKey;
    if (!esInicioGrupo) {
      return {
        beneficiario: fila.beneficiario,
        nombreEncargado: fila.nombreEncargado,
        mostrarCeldaEncargado: false,
        rowspanEncargado: 1,
      };
    }

    let rowspan = 1;
    for (let j = index + 1; j < filas.length; j++) {
      if (filas[j].grupoKey === fila.grupoKey) rowspan++;
      else break;
    }

    return {
      beneficiario: fila.beneficiario,
      nombreEncargado: fila.nombreEncargado,
      mostrarCeldaEncargado: true,
      rowspanEncargado: rowspan,
    };
  });
};

export function TablaBeneficiarios({
  data,
  isLoading,
  permisos,
  onDataChange,
  viewMode,
  setViewMode,
}: TablaBeneficiariosProps) {
  const router = useRouter();

  const { rol } = useUserData();
  const tienePermisoEspecial = ['SUPER', 'ADMIN', 'SECRETARIO', 'DAFIM'].includes(rol);
  const [modalBeneficiario, setModalBeneficiario] = useState<Beneficiario | null>(null);
  const [verBeneficiario, setVerBeneficiario] = useState<Beneficiario | null>(null);
  const [mostrarRegistros, setMostrarRegistros] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [expandedFooter, setExpandedFooter] = useState<Record<string, boolean>>({});
  const [encargadosFolios, setEncargadosFolios] = useState<EncargadoFolio[]>([]);

  useEffect(() => {
    cargarEncargadosFolios().then(setEncargadosFolios);
  }, [data]);

  const filasConEncargado = useMemo(
    () => calcularFilasConEncargado(data, encargadosFolios),
    [data, encargadosFolios],
  );

  const hayAlgunaEdicion = useMemo(
    () => data.some((b) => b.editado_por && b.editado_por.toString().trim() !== ''),
    [data],
  );

  const mostrarColumnaEdicion = mostrarRegistros && hayAlgunaEdicion;

  const anchoMinimoTabla = useMemo(() => {
    const colsFijas = 1215;
    const foto = 115;
    const acciones = tienePermisoEspecial ? 180 : 0;
    const colRegistrado = mostrarRegistros ? 200 : 0;
    const colEdicion = mostrarColumnaEdicion ? 200 : 0;
    return colsFijas + colRegistrado + colEdicion + acciones + foto;
  }, [mostrarRegistros, mostrarColumnaEdicion, tienePermisoEspecial]);

  const totalColumnasTabla = useMemo(
    () =>
      12 +
      (mostrarRegistros ? 1 : 0) +
      (mostrarColumnaEdicion ? 1 : 0) +
      (tienePermisoEspecial ? 1 : 0),
    [mostrarRegistros, mostrarColumnaEdicion, tienePermisoEspecial],
  );

  const renderFilaEncargado = (nombre: string | null, key: string) => (
    <tr key={key}>
      <td
        colSpan={totalColumnasTabla}
        className="px-3 py-1.5 text-left md:text-center text-xs bg-gray-50 dark:bg-neutral-800/70 border-l-[2.5px] border-r-[2.5px] border-b-[2.5px] border-gray-400 dark:border-neutral-600"
      >
        <span className="font-bold text-gray-800 dark:text-gray-200">Enc.</span>{' '}
        <span className="font-normal text-gray-700 dark:text-gray-300">
          {nombre?.trim() || (
            <span className="italic text-gray-400 dark:text-neutral-500">
              sin encargado asignado
            </span>
          )}
        </span>
      </td>
    </tr>
  );

  useEffect(() => {
    const fetchThumbnails = async () => {
      const paths = data.map(b => b.img_url).filter(Boolean) as string[];
      if (paths.length === 0) return;

      const pathsToFetch = paths.filter(p => !thumbnails[p]);
      if (pathsToFetch.length === 0) return;

      const supabase = createClient();
      const results = await Promise.all(
        pathsToFetch.map(path =>
          supabase.storage
            .from('Fertilizante2026')
            .createSignedUrl(path, 3600)
        )
      );

      setThumbnails(prev => {
        const updated = { ...prev };
        results.forEach((result, index) => {
          if (!result.error && result.data?.signedUrl) {
            updated[pathsToFetch[index]] = result.data.signedUrl;
          }
        });
        return updated;
      });
    };

    fetchThumbnails();
  }, [data]);

  const irAEditar = (id: string) => {
    router.push(`/sigem/fertilizante/beneficiarios/editar?id=${id}` as Route);
  };

  const mostrar = (valor: string | number | null | undefined) =>
    valor !== undefined && valor !== null && valor.toString().trim() !== ''
      ? valor
      : '—';

  const formatearFecha = (iso?: string | null) => {
    if (!iso || iso === 'null') return '—';
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    const [a, m, d] = partes;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${a}`;
  };
  const calcularEdad = (fechaNacimiento?: string | null) => {
    if (!fechaNacimiento || fechaNacimiento === 'null') return '—';
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) return '—';
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad.toString();
  };

  const formatearTimestamp = (ts?: string | null) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const anio = d.getFullYear();
    let hora = d.getHours();
    const ampm = hora >= 12 ? 'PM' : 'AM';
    hora = hora % 12;
    hora = hora ? hora : 12;
    const min = d.getMinutes().toString().padStart(2, '0');
    const horaStr = hora.toString().padStart(2, '0');
    return `${dia}/${mes}/${anio} a las ${horaStr}:${min} ${ampm}`;
  };

  const puedeEditar = permisos.includes('EDITAR') || permisos.includes('TODO');

  const handleEliminar = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-2xl dark:bg-neutral-900 dark:text-gray-200',
        title: 'text-xl font-bold',
        confirmButton: 'rounded-lg px-4 py-2 font-semibold',
        cancelButton: 'rounded-lg px-4 py-2 font-semibold'
      }
    });

    if (result.isConfirmed) {
      const supabase = createClient();
      const { error } = await supabase
        .from('beneficiarios_fertilizante')
        .delete()
        .eq('id', id);

      if (error) {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el registro',
          icon: 'error',
          customClass: {
            popup: 'rounded-2xl dark:bg-neutral-900 dark:text-gray-200'
          }
        });
      } else {
        Swal.fire({
          title: 'Eliminado',
          text: 'El registro ha sido eliminado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-2xl dark:bg-neutral-900 dark:text-gray-200'
          }
        });
        onDataChange?.();
      }
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="text-gray-600 font-semibold text-sm animate-pulse mb-4">Cargando...</div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 animate-pulse flex flex-col p-3 gap-3">
                <div className="flex flex-row items-center gap-4">
                  <div className="w-[115px] h-[115px] ml-2 bg-gray-200 dark:bg-neutral-800 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 grid grid-cols-4 gap-6 pr-2">
                    <div className="h-10 bg-gray-200 dark:bg-neutral-800 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 dark:bg-neutral-800 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 dark:bg-neutral-800 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 dark:bg-neutral-800 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            data.map((b, index) => (
              <div
                key={`${b.id}-${index}`}
                onClick={() => setExpandedFooter(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
                className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 flex flex-col p-3 hover:shadow-md transition-shadow gap-3 relative overflow-hidden group cursor-pointer"
              >
                {/* Decorative border line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${b.estado === 'Entregado' ? 'bg-green-500' :
                  b.estado === 'Anulado' ? 'bg-red-500' :
                    b.estado === 'Extraviado' ? 'bg-amber-500' :
                      'bg-blue-500'
                  }`} />

                {/* Mobile-only header: Nombre + DPI/F.Nacim/Sexo/Telefono */}
                <div className="lg:hidden flex flex-col gap-2 px-1 pb-3 border-b border-gray-100 dark:border-neutral-800">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Nombre Completo</span>
                    <span className="font-bold text-blue-600 dark:text-blue-500 text-[15px] block leading-[1.2] break-words" title={b.nombre_completo || ''}>{mostrar(b.nombre_completo)}</span>
                  </div>
                  <div className="flex flex-row justify-between items-start gap-2 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">DPI</span>
                      <span className="text-gray-600 dark:text-gray-300 text-[11px] font-mono block leading-tight">{mostrar(b.dpi)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">F. Nacimiento</span>
                      <span className="text-gray-600 dark:text-gray-300 text-[11px] block leading-tight">
                        {formatearFecha(b.fecha_nacimiento)} <span className="font-semibold">({calcularEdad(b.fecha_nacimiento)})</span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Sexo</span>
                      {b.sexo?.trim().toUpperCase().startsWith('M') ? (
                        <span className="font-black text-xl leading-none" style={{ color: '#3b82f6' }}>M</span>
                      ) : b.sexo?.trim().toUpperCase().startsWith('F') ? (
                        <span className="font-black text-xl leading-none" style={{ color: '#ec4899' }}>F</span>
                      ) : (
                        <span className="font-black text-xl leading-none text-gray-500">-</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Teléfono</span>
                      {b.telefono && b.telefono.trim() !== '' && b.telefono.toUpperCase() !== 'N/A' ? (
                        <a
                          href={`https://wa.me/${b.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold border bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle size={12} />
                          {b.telefono}
                        </a>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-[11px]">{mostrar(b.telefono)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content: Image & Data Row */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Top row (mobile): Foto 40% | Folio/Cant/Estado 30% | Lugar/Fecha 30% */}
                  <div className="flex flex-row items-stretch gap-3 lg:contents">
                    {/* Image */}
                    <div
                      className={`w-[35%] aspect-[3/4] lg:w-[115px] lg:h-auto lg:aspect-[3/4] ml-2 bg-gray-100 dark:bg-neutral-800 relative flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700 shadow-sm ${b.estado === 'Anulado' || (!b.img_url && !tienePermisoEspecial) ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (b.estado === 'Anulado') return;
                        if (!b.img_url && !tienePermisoEspecial) return;
                        setModalBeneficiario(b);
                      }}
                      title={b.estado === 'Anulado' ? 'Folio anulado' : 'Ver imagen'}
                    >
                      {b.estado === 'Anulado' ? (
                        <div className="flex flex-col items-center justify-center text-red-500 dark:text-red-400 gap-1">
                          <Ban size={32} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Anulado</span>
                        </div>
                      ) : b.img_url ? (
                        thumbnails[b.img_url] ? (
                          <img src={thumbnails[b.img_url]} alt={b.nombre_completo || 'Foto'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-neutral-700" />
                        )
                      ) : (
                        <ImageIcon size={24} className="text-gray-400 opacity-60" />
                      )}
                    </div>

                    {/* Folio, Quantity & State */}
                    <div className="flex flex-col items-center justify-center w-[25%] lg:w-[85px] flex-shrink-0 gap-2">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider leading-none mb-2">No. Folio</span>
                        <span className="font-black text-red-600 dark:text-red-500 text-[20px] tracking-tight block leading-none w-full text-center">{mostrar(b.codigo)}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg px-2 py-1 border border-blue-100 dark:border-blue-900/50 shadow-sm w-full">
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">Cant.</span>
                        <span className="font-black text-[18px] leading-none mt-0.5">{mostrar(b.cantidad)}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border text-center w-full truncate ${b.estado === 'Entregado' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                        b.estado === 'Anulado' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                          b.estado === 'Extraviado' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' :
                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700'
                        }`}>
                        {mostrar(b.estado)}
                      </span>
                    </div>

                    {/* Location & Date */}
                    <div className="flex flex-col justify-center gap-4 flex-1 lg:flex-none lg:w-[160px] min-w-0">
                      <div className="min-w-0">
                        <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Lugar de Entrega</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200 text-[13px] block leading-tight break-words [overflow-wrap:anywhere] lg:[overflow-wrap:normal] lg:truncate" title={b.lugar || ''}>{mostrar(b.lugar)}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">F. Entrega</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[11px] block leading-tight">{formatearFecha(b.fecha)}</span>
                      </div>
                    </div>
                  </div>
                  {/* End top row mobile */}

                  <div className="w-px h-24 bg-gray-100 dark:bg-neutral-800 hidden lg:block flex-shrink-0" />

                  {/* Name, DPI & Birth */}
                  <div className="hidden lg:flex flex-col justify-center gap-3 w-full lg:flex-1 lg:min-w-[180px] pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-neutral-800">
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Nombre Completo</span>
                      <span className="font-bold text-blue-600 dark:text-blue-500 text-[15px] block leading-[1.2] break-words line-clamp-2" title={b.nombre_completo || ''}>{mostrar(b.nombre_completo)}</span>
                    </div>
                    <div className="flex flex-row gap-4 lg:contents">
                      <div className="flex-1 lg:flex-none">
                        <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">DPI</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[12px] font-mono block leading-tight">{mostrar(b.dpi)}</span>
                      </div>
                      <div className="flex-1 lg:flex-none">
                        <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">F. Nacimiento</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[12px] block leading-tight">
                          {formatearFecha(b.fecha_nacimiento)} <span className="font-semibold text-gray-600 dark:text-gray-300">({calcularEdad(b.fecha_nacimiento)} años)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-px h-24 bg-gray-100 dark:bg-neutral-800 hidden lg:block flex-shrink-0" />

                  {/* Teléfono & Sexo */}
                  <div className="hidden lg:flex flex-col justify-center gap-4 w-full lg:w-[115px] flex-shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-neutral-800">
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Teléfono</span>
                      {b.telefono && b.telefono.trim() !== '' && b.telefono.toUpperCase() !== 'N/A' ? (
                        <a
                          href={`https://wa.me/${b.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] font-bold border bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all shadow-sm"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle size={14} className="text-green-600 dark:text-green-400" />
                          {b.telefono}
                        </a>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-[12px] leading-tight">{mostrar(b.telefono)}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1">Sexo</span>
                      {b.sexo?.trim().toUpperCase().startsWith('M') ? (
                        <span className="font-black text-2xl leading-none" style={{ color: '#3b82f6' }}>M</span>
                      ) : b.sexo?.trim().toUpperCase().startsWith('F') ? (
                        <span className="font-black text-2xl leading-none" style={{ color: '#ec4899' }}>F</span>
                      ) : (
                        <span className="font-black text-2xl leading-none text-gray-500">-</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* End Main Content */}

                {/* Footer: Audit info + Actions (collapsible) */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${expandedFooter[b.id] ? 'grid-rows-[1fr] opacity-100 mt-0' : 'grid-rows-[0fr] opacity-0 -mt-3'}`}
                >
                  <div className="overflow-hidden">
                    <div className="w-full h-px bg-gray-100 dark:bg-neutral-800 mb-2" />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-2 lg:gap-4 px-2 pb-1 cursor-default"
                    >
                      {/* Audit Info */}
                      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:gap-6 text-[11px] flex-1 min-w-0">
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-700 dark:text-gray-200">
                            <span className="font-bold">Creado por:</span>{' '}
                            <span className="font-normal">{b.creado_por || '—'}</span>
                          </span>
                          <span className="text-[10px] italic text-gray-400 dark:text-gray-500">{formatearTimestamp(b.created_at)}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-blue-600 dark:text-blue-400">
                            <span className="font-bold">Última edición:</span>{' '}
                            <span className="font-normal">{b.editado_por || '—'}</span>
                          </span>
                          <span className="text-[10px] italic text-gray-400 dark:text-gray-500">{formatearTimestamp(b.updated_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-transparent hover:bg-transparent border-0 shadow-none text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-bold h-8 px-2 rounded-none text-[11px]"
                          onClick={() => setVerBeneficiario(b)}
                        >
                          Ver
                        </Button>
                        {tienePermisoEspecial && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-transparent hover:bg-transparent border-0 shadow-none text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-bold h-8 px-2 rounded-none text-[11px]"
                              onClick={() => irAEditar(b.id)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-transparent hover:bg-transparent border-0 shadow-none text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline font-bold h-8 px-2 rounded-none text-[11px]"
                              onClick={() => handleEliminar(b.id)}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto max-w-full flex justify-start md:justify-center">

          <table
            className="w-full border-collapse text-xs border-[2.5px] border-gray-400 dark:border-neutral-600 table-fixed"
            style={{ minWidth: `${anchoMinimoTabla}px` }}
          >

            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '50px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '350px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '50px' }} />
              <col style={{ width: '50px' }} />
              {mostrarRegistros && <col style={{ width: '200px' }} />}
              {mostrarColumnaEdicion && <col style={{ width: '200px' }} />}
              {tienePermisoEspecial && (
                <col style={{ width: '180px' }} />
              )}
              <col style={{ width: '115px' }} />
            </colgroup>

            <thead>
              <tr className="text-left text-[13px] font-semibold bg-gray-200 dark:bg-neutral-800 dark:text-gray-200">
                <th colSpan={5} className="p-2 border-b-[2.5px] border-r-[2.5px] border-gray-400 dark:border-neutral-600 text-center uppercase tracking-wider">Datos de entrega</th>
                <th colSpan={6} className="p-2 border-b-[2.5px] border-r-[2.5px] border-gray-400 dark:border-neutral-600 text-center uppercase tracking-wider text-blue-800 dark:text-blue-400">Datos del beneficiario</th>
                <th
                  colSpan={(mostrarRegistros ? 1 : 0) + (mostrarColumnaEdicion ? 1 : 0) + (tienePermisoEspecial ? 1 : 0) + 1}
                  className="p-2 border-b-[2.5px] border-gray-400 dark:border-neutral-600 text-center uppercase tracking-wider text-green-800 dark:text-green-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-neutral-700 select-none transition-colors"
                  onClick={() => setMostrarRegistros(!mostrarRegistros)}
                  title="Clic para mostrar/ocultar detalles de registro y foto"
                >
                  Registros {mostrarRegistros ? '[-]' : '[+]'}
                </th>
              </tr>
              <tr className="bg-gray-100 dark:bg-neutral-900/80 text-left border-b-[2.5px] border-gray-400 dark:border-neutral-600 font-bold dark:text-gray-300">
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">Folio</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">Lugar</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">F. Entrega</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700 text-center">Ctd.</th>
                <th className="p-2 border-r-[2.5px] border-gray-400 dark:border-neutral-600 text-center">Estado</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">Nombre</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">DPI</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">Teléfono</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">F. Nacimiento</th>
                <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700 text-center">Edad</th>
                <th className="p-2 border-r-[2.5px] border-gray-400 dark:border-neutral-600 text-center">Sexo</th>
                {mostrarRegistros && <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">Registrado por:</th>}
                {mostrarColumnaEdicion && <th className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">Última Edición por:</th>}
                {tienePermisoEspecial && (
                  <th className={`p-2 border-[1.5px] border-gray-300 dark:border-neutral-700 ${mostrarRegistros ? '' : 'border-l-[2.5px] border-l-gray-400 dark:border-l-neutral-600'} text-center`}>Acciones</th>
                )}
                <th className={`p-2 border-[1.5px] border-gray-300 dark:border-neutral-700 ${!tienePermisoEspecial && !mostrarRegistros ? 'border-l-[2.5px] border-l-gray-400 dark:border-l-neutral-600' : ''} text-center`}>Foto</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-gray-50 dark:bg-neutral-800/40 border-[1.5px] border-gray-300 dark:border-neutral-700">
                    {Array.from({ length: 12 + (mostrarRegistros ? 1 : 0) + (mostrarColumnaEdicion ? 1 : 0) + (tienePermisoEspecial ? 1 : 0) }).map((_, j) => (
                      <td key={j} className="p-2 border-[1.5px] border-gray-300 dark:border-neutral-700">
                        <div className="h-4 bg-gray-400 dark:bg-neutral-600 rounded w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
                : filasConEncargado.map(({ beneficiario: b, nombreEncargado, mostrarCeldaEncargado }, index) => (
                  <Fragment key={`${b.id}-${index}`}>
                    {mostrarCeldaEncargado &&
                      renderFilaEncargado(nombreEncargado, `enc-${b.id}-${index}`)}
                    <tr className="hover:bg-green-50 dark:hover:bg-neutral-800 bg-white dark:bg-neutral-900 border-[2.5px] border-gray-300 dark:border-neutral-700 dark:text-gray-300">
                    <td className="pl-2 border-[1.5px] text-center border-gray-300 dark:border-neutral-700">{mostrar(b.codigo)}</td>
                    <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">{mostrar(b.lugar)}</td>
                    <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">{formatearFecha(b.fecha)}</td>
                    <td className="pl-2 border-r-[1.5px] border-r-gray-400 dark:border-r-neutral-600 text-center">{mostrar(b.cantidad)}</td>
                    <td className="pl-2 border-r-[2.5px] text-center border-gray-400 dark:border-neutral-600">{mostrar(b.estado)}</td>
                    <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">{mostrar(b.nombre_completo)}</td>
                    <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">{mostrar(b.dpi)}</td>
                    <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">
                      {b.telefono && b.telefono.trim() !== '' && b.telefono.toUpperCase() !== 'N/A' ? (
                        <a
                          href={`https://wa.me/${b.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-inherit no-underline hover:underline"
                          title="Enviar WhatsApp"
                        >
                          {b.telefono}
                        </a>
                      ) : (
                        mostrar(b.telefono)
                      )}
                    </td>
                    <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">{formatearFecha(b.fecha_nacimiento)}</td>
                    <td className="pl-2 border-[1.5px] text-center border-gray-300 dark:border-neutral-700">{calcularEdad(b.fecha_nacimiento)}</td>
                    <td className="pl-2 border-r-[2.5px] text-center border-gray-400 dark:border-neutral-600">{mostrar(b.sexo)}</td>
                    {mostrarRegistros && (
                      <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 text-[11px]">{mostrar(b.creado_por)}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">{formatearTimestamp(b.created_at)}</span>
                        </div>
                      </td>
                    )}
                    {mostrarColumnaEdicion && (
                      <td className="pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700">
                        {b.editado_por ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-blue-700 dark:text-blue-400 text-[11px]">{b.editado_por}</span>
                            <span className="text-[10px] text-blue-500 dark:text-blue-500 italic">{formatearTimestamp(b.updated_at)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-neutral-600 text-[10px]">—</span>
                        )}
                      </td>
                    )}
                    {tienePermisoEspecial && (
                      <td className={`pl-2 border-[1.5px] border-gray-300 dark:border-neutral-700 ${mostrarRegistros ? '' : 'border-l-[2.5px] border-l-gray-400 dark:border-l-neutral-600'} text-center`}>
                        <div className="flex flex-wrap gap-1 justify-center items-center py-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVerBeneficiario(b)}
                            className="h-7 px-2 text-[11px] font-bold border-0 shadow-none bg-transparent hover:bg-transparent text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline rounded-none"
                          >
                            Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => irAEditar(b.id)}
                            className="h-7 px-2 text-[11px] font-bold border-0 shadow-none bg-transparent hover:bg-transparent text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline rounded-none"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(b.id)}
                            className="h-7 px-2 text-[11px] font-bold border-0 shadow-none bg-transparent hover:bg-transparent text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline rounded-none"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    )}
                    {/* Columna de imagen */}
                    <td className={`px-1 border-[1.5px] border-gray-300 dark:border-neutral-700 ${!tienePermisoEspecial && !mostrarRegistros ? 'border-l-[2.5px] border-l-gray-400 dark:border-l-neutral-600' : ''} text-center`}>
                      {b.estado === 'Anulado' ? (
                        <div className="flex flex-col justify-center items-center p-1 text-red-500 dark:text-red-400">
                          <Ban size={16} />
                          <span className="text-[9px] font-bold uppercase mt-0.5">Anulado</span>
                        </div>
                      ) : b.img_url ? (
                        <div className="flex justify-center p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModalBeneficiario(b)}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 h-7 px-2"
                            title="Ver imagen"
                          >
                            <Eye size={16} className="mr-1" />
                            <span className="text-[10px]">Ver Foto</span>
                          </Button>
                        </div>
                      ) : tienePermisoEspecial ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModalBeneficiario(b)}
                          className="text-gray-400 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 h-7 px-2"
                          title="Cargar imagen"
                        >
                          <ImageIcon size={14} className="mr-1" />
                          <span className="text-[10px]">Subir</span>
                        </Button>
                      ) : (
                        <span className="text-gray-300 dark:text-neutral-600 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de gestión de imagen */}
      {modalBeneficiario && (
        <GestionBeneficiarioImgModal
          beneficiario={modalBeneficiario}
          onClose={() => setModalBeneficiario(null)}
          onSaved={() => onDataChange?.()}
        />
      )}

      {/* Modal Ver Beneficiario (formato vertical estilo teléfono) */}
      {verBeneficiario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-x-hidden overflow-y-auto overscroll-contain"
          onClick={() => setVerBeneficiario(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden relative min-h-0 mx-auto max-h-[min(88svh,calc(100svh-2rem))] lg:max-h-[62dvh] lg:h-[62dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative border line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${verBeneficiario.estado === 'Entregado' ? 'bg-green-500' :
              verBeneficiario.estado === 'Anulado' ? 'bg-red-500' :
                verBeneficiario.estado === 'Extraviado' ? 'bg-amber-500' :
                  'bg-blue-500'
              }`} />

            <button
              onClick={() => setVerBeneficiario(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              title="Cerrar"
            >
              <X size={16} />
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] touch-pan-y">
              <div className="p-4 sm:p-7 pt-10 sm:pt-12 flex flex-col gap-5 sm:gap-8 pb-6 sm:pb-9">
                {/* Nombre + datos rápidos */}
                <div className="flex flex-col gap-3 sm:gap-5 px-0.5 pb-4 sm:pb-6 border-b border-gray-100 dark:border-neutral-800">
                  {verBeneficiario.estado !== 'Anulado' && verBeneficiario.estado !== 'Informe' && (
                    <div>
                      <span className="text-[10px] lg:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5 sm:mb-2">Nombre Completo</span>
                      <span className="font-bold text-blue-600 dark:text-blue-500 text-[16px] lg:text-[20px] block leading-[1.38] break-words">{mostrar(verBeneficiario.nombre_completo)}</span>
                    </div>
                  )}
                  <div className="flex flex-row justify-between items-start gap-x-3 gap-y-4 lg:gap-x-4 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-[10px] lg:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5">DPI</span>
                      <span className="text-gray-700 dark:text-gray-200 text-[12px] lg:text-[14px] font-mono block leading-snug break-all">{mostrar(verBeneficiario.dpi)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] lg:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5">F. Nacim.</span>
                      <span className="text-gray-700 dark:text-gray-200 text-[12px] lg:text-[14px] block leading-snug">
                        {formatearFecha(verBeneficiario.fecha_nacimiento)} <span className="font-semibold">({calcularEdad(verBeneficiario.fecha_nacimiento)})</span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] lg:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5">Sexo</span>
                      {verBeneficiario.sexo?.trim().toUpperCase().startsWith('M') ? (
                        <span className="font-black text-xl lg:text-2xl leading-none" style={{ color: '#3b82f6' }}>M</span>
                      ) : verBeneficiario.sexo?.trim().toUpperCase().startsWith('F') ? (
                        <span className="font-black text-xl lg:text-2xl leading-none" style={{ color: '#ec4899' }}>F</span>
                      ) : (
                        <span className="font-black text-xl lg:text-2xl leading-none text-gray-500">-</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] lg:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5">Teléfono</span>
                      {verBeneficiario.telefono && verBeneficiario.telefono.trim() !== '' && verBeneficiario.telefono.toUpperCase() !== 'N/A' ? (
                        <a
                          href={`https://wa.me/${verBeneficiario.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1.5 lg:px-2.5 lg:py-1.5 rounded text-[11px] lg:text-[13px] font-bold border bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50"
                        >
                          <MessageCircle size={14} />
                          {verBeneficiario.telefono}
                        </a>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-[12px] lg:text-[13px]">{mostrar(verBeneficiario.telefono)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Foto + Folio + Lugar — debajo de lg: 3 columnas; lg+: apilado ancho */}
                <div className="flex flex-row items-stretch gap-4 lg:gap-6 min-w-0">
                  {verBeneficiario.estado === 'Anulado' || verBeneficiario.estado === 'Informe' ? (
                    <div className="w-[34%] lg:w-[260px] flex-shrink-0 max-lg:aspect-[3/4] lg:aspect-auto lg:min-h-[200px] flex flex-col items-center justify-center rounded-lg p-4 lg:p-5 bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 overflow-y-auto min-w-0 gap-1">
                      <span className="text-[10px] lg:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-2.5 text-center">Descripción</span>
                      <span className="font-bold text-blue-600 dark:text-blue-500 text-[14px] lg:text-[15px] text-center leading-relaxed break-words lg:line-clamp-none max-lg:line-clamp-[12]">
                        {mostrar(verBeneficiario.nombre_completo)}
                      </span>
                    </div>
                  ) : (
                    <div className="w-[34%] lg:w-[260px] flex-shrink-0 aspect-[3/4] bg-gray-100 dark:bg-neutral-800 relative flex items-center justify-center rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700 shadow-sm min-w-0">
                      {verBeneficiario.img_url && thumbnails[verBeneficiario.img_url] ? (
                        <img src={thumbnails[verBeneficiario.img_url]} alt={verBeneficiario.nombre_completo || 'Foto'} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={52} className="text-gray-400 opacity-70" />
                      )}
                    </div>
                  )}

                  {/* Compacto: hasta pantallas medianas */}
                  <div className="flex flex-row flex-1 min-w-0 min-h-0 gap-4 lg:hidden items-stretch overflow-hidden">
                    <div className="flex flex-col items-center justify-center min-w-[7.25rem] w-[44%] max-w-[12.5rem] flex-shrink-0 gap-3.5 py-2">
                      <div className="flex flex-col items-center justify-center w-full min-w-0 gap-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider leading-tight mb-0 text-center">No. Folio</span>
                        <span className="font-black text-red-600 dark:text-red-500 text-[22px] tracking-tight leading-tight w-full text-center whitespace-nowrap tabular-nums [overflow-wrap:normal]">{mostrar(verBeneficiario.codigo)}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg px-1.5 py-2 border border-blue-100 dark:border-blue-900/50 w-full gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Cant.</span>
                        <span className="font-black text-[20px] leading-tight mt-0">{mostrar(verBeneficiario.cantidad)}</span>
                      </div>
                      <span className={`px-1.5 py-1.5 rounded text-[9px] uppercase font-bold border text-center w-full truncate leading-snug ${verBeneficiario.estado === 'Entregado' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                        verBeneficiario.estado === 'Anulado' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                          verBeneficiario.estado === 'Extraviado' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' :
                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700'
                        }`}>
                        {mostrar(verBeneficiario.estado)}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center gap-4 flex-1 min-w-0 min-h-0 py-2 overflow-hidden">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5">Lugar de Entrega</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-[14px] block leading-relaxed break-words [overflow-wrap:anywhere] line-clamp-5">{mostrar(verBeneficiario.lugar)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-1.5">F. Entrega</span>
                        <span className="text-gray-800 dark:text-gray-200 text-[13px] font-semibold block leading-snug">{formatearFecha(verBeneficiario.fecha)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Escritorio ancho: bloque apilado */}
                  <div className="hidden lg:flex flex-col justify-start gap-7 flex-1 min-w-0 py-1">
                    <div>
                      <span className="text-[13px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-2">No. Folio</span>
                      <span className="font-black text-red-600 dark:text-red-500 text-[44px] tracking-tight block leading-tight break-all">{mostrar(verBeneficiario.codigo)}</span>
                    </div>
                    <div>
                      <span className="text-[13px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-2">Cantidad</span>
                      <span className="font-black text-blue-700 dark:text-blue-400 text-[32px] block leading-tight">{mostrar(verBeneficiario.cantidad)}</span>
                    </div>
                    <div>
                      <span className="text-[13px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-2">Estado</span>
                      <span className={`inline-block px-3 py-1.5 rounded text-[14px] uppercase font-bold border ${verBeneficiario.estado === 'Entregado' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                        verBeneficiario.estado === 'Anulado' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                          verBeneficiario.estado === 'Extraviado' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' :
                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700'
                        }`}>
                        {mostrar(verBeneficiario.estado)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[13px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-2">Lugar de Entrega</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-[22px] block leading-snug break-words [overflow-wrap:anywhere]">{mostrar(verBeneficiario.lugar)}</span>
                    </div>
                    <div>
                      <span className="text-[13px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block mb-2">F. Entrega</span>
                      <span className="text-gray-800 dark:text-gray-200 text-[20px] font-semibold block leading-snug">{formatearFecha(verBeneficiario.fecha)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}