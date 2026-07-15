'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, ArrowUpDown, Eye, EyeOff, FileCheck, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PermisoEmpleado } from '@/components/permisos/types';
import { getGoogleMapsApiKey, useGoogleMapsLibrary } from '@/hooks/mapa/useGoogleMapsLibrary';

interface Registro {
  created_at: string;
  tipo_registro: string | null;
  ubicacion: { lat: number; lng: number } | null;
  notas?: string | null;
}

interface MapaModalProps {
  isOpen: boolean;
  onClose: () => void;
  registros: { entrada: Registro | null, salida: Registro | null, multiple?: Registro[] };
  nombreUsuario: string;
  titulo?: string;
  permiso?: PermisoEmpleado | null;
  onVerPermiso?: (permiso: PermisoEmpleado) => void;
}

type SortOrder = 'asc' | 'desc';

const MARKER_COLORS = [
  '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
  '#DB2777', '#0891B2', '#EA580C', '#4F46E5', '#65A30D',
];

function getMarkerColor(index: number): string {
  return MARKER_COLORS[index % MARKER_COLORS.length];
}

const MAX_MAP_ZOOM = 15;
const MAP_BOUNDS_PADDING = 100;
const MIN_BOUNDS_DELTA = 0.003;

function applyMapView(map: google.maps.Map, registros: Registro[]) {
  if (registros.length === 1) {
    const { lat, lng } = registros[0].ubicacion!;
    map.setCenter({ lat, lng });
    map.setZoom(MAX_MAP_ZOOM);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  registros.forEach((registro) => {
    const { lat, lng } = registro.ubicacion!;
    bounds.extend({ lat, lng });
  });

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const center = bounds.getCenter();
  const latSpan = Math.abs(ne.lat() - sw.lat());
  const lngSpan = Math.abs(ne.lng() - sw.lng());

  if (latSpan < MIN_BOUNDS_DELTA) {
    bounds.extend({ lat: center.lat() + MIN_BOUNDS_DELTA / 2, lng: center.lng() });
    bounds.extend({ lat: center.lat() - MIN_BOUNDS_DELTA / 2, lng: center.lng() });
  }
  if (lngSpan < MIN_BOUNDS_DELTA) {
    bounds.extend({ lat: center.lat(), lng: center.lng() + MIN_BOUNDS_DELTA / 2 });
    bounds.extend({ lat: center.lat(), lng: center.lng() - MIN_BOUNDS_DELTA / 2 });
  }

  map.fitBounds(bounds, MAP_BOUNDS_PADDING);
  google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
    const zoom = map.getZoom();
    if (zoom !== undefined && zoom > MAX_MAP_ZOOM) {
      map.setZoom(MAX_MAP_ZOOM);
    }
  });
}

function buildMarkerIcon(color: string, isActive: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isActive ? 12 : 9,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: isActive ? '#1e293b' : '#ffffff',
    strokeWeight: isActive ? 3 : 2,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildInfoWindowContent(titulo: string, hora: string): string {
  return `<div style="padding:4px 2px;font-family:system-ui,sans-serif;line-height:1.45;min-width:100px">
    <strong style="color:#0f172a;font-size:13px;display:block">${escapeHtml(titulo)}</strong>
    <span style="color:#64748b;font-size:12px">${escapeHtml(hora)}</span>
  </div>`;
}

export default function Mapa({ isOpen, onClose, registros, nombreUsuario, titulo, permiso, onVerPermiso }: MapaModalProps) {
  const [rawRegistros, setRawRegistros] = useState<Registro[]>([]);
  const [registroActivo, setRegistroActivo] = useState<Registro | null>(null);
  const [mapaVisible, setMapaVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersByRegistroRef = useRef<globalThis.Map<Registro, google.maps.Marker>>(new globalThis.Map());

  useEffect(() => {
    if (isOpen) {
      let nuevosRegistros: Registro[] = [];
      if (registros.multiple && registros.multiple.length > 0) {
        nuevosRegistros = [...registros.multiple];
      } else {
        if (registros.entrada) nuevosRegistros.push(registros.entrada);
        if (registros.salida) nuevosRegistros.push(registros.salida);
      }

      setRawRegistros(nuevosRegistros);
      setMapaVisible(true);
      setSortOrder('asc');
    }
  }, [isOpen, registros]);

  const listaRegistros = useMemo(() => {
    const sorted = [...rawRegistros];
    if (sortOrder === 'asc') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [rawRegistros, sortOrder]);

  const registrosConUbicacion = useMemo(
    () => listaRegistros.filter((r) => r.ubicacion !== null),
    [listaRegistros],
  );

  const googleMapsApiKey = getGoogleMapsApiKey();
  const shouldLoadGoogleMaps = isOpen && mapaVisible && registrosConUbicacion.length > 0;
  const {
    data: googleMapsLibrary,
    isError: googleMapsLoadError,
  } = useGoogleMapsLibrary(shouldLoadGoogleMaps);

  const mapaError = useMemo(() => {
    if (!shouldLoadGoogleMaps) return null;
    if (!googleMapsApiKey) {
      return 'Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (o NEXT_PUBLIC_Maps_API_KEY).';
    }
    if (googleMapsLoadError) return 'No se pudo cargar Google Maps.';
    return null;
  }, [shouldLoadGoogleMaps, googleMapsApiKey, googleMapsLoadError]);

  const ubicacionesKey = useMemo(
    () => registrosConUbicacion
      .map((r) => `${r.created_at}-${r.ubicacion?.lat}-${r.ubicacion?.lng}`)
      .join('|'),
    [registrosConUbicacion],
  );

  const colorPorRegistro = useMemo(() => {
    const colores = new globalThis.Map<Registro, string>();
    rawRegistros.forEach((registro, index) => {
      colores.set(registro, getMarkerColor(index));
    });
    return colores;
  }, [rawRegistros]);

  useEffect(() => {
    if (isOpen && listaRegistros.length > 0) {
      setRegistroActivo(listaRegistros[0]);
    } else if (isOpen) {
      setRegistroActivo(null);
    }
  }, [isOpen, listaRegistros]);

  const formatTimeWithAMPM = useCallback((dateString: string | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${format(date, 'hh:mm', { locale: es })} ${format(date, 'a', { locale: es }).replace(/\./g, '').toUpperCase()}`;
  }, []);

  const getTituloRegistro = useCallback((registro: Registro) => {
    const esTipoEstandar = ['Entrada', 'Salida'].includes(registro.tipo_registro || '');
    return esTipoEstandar ? (registro.tipo_registro ?? '') : (registro.notas || 'Marca sin nota');
  }, []);

  const invalidateMapSize = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    google.maps.event.trigger(map, 'resize');
  }, []);

  const highlightMarker = useCallback((registro: Registro | null) => {
    markersByRegistroRef.current.forEach((marker, reg) => {
      const color = colorPorRegistro.get(reg) ?? '#2563EB';
      const isActive = reg === registro;
      marker.setIcon(buildMarkerIcon(color, isActive));
      marker.setZIndex(isActive ? 1000 : 1);
    });
  }, [colorPorRegistro]);

  useEffect(() => {
    if (!shouldLoadGoogleMaps || !googleMapsLibrary || !mapContainerRef.current) return;

    let resizeTimers: ReturnType<typeof setTimeout>[] = [];

    if (mapInstanceRef.current) {
      markersByRegistroRef.current.forEach((marker) => marker.setMap(null));
      markersByRegistroRef.current.clear();
      infoWindowRef.current?.close();
      mapInstanceRef.current = null;
    }

    const center = registrosConUbicacion[0].ubicacion!;
    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: MAX_MAP_ZOOM,
      mapTypeControl: true,
      mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      gestureHandling: 'greedy',
    });

    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    registrosConUbicacion.forEach((registro) => {
      const { lat, lng } = registro.ubicacion!;
      const color = colorPorRegistro.get(registro) ?? '#2563EB';
      const tituloMarcador = getTituloRegistro(registro);
      const hora = formatTimeWithAMPM(registro.created_at);

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: buildMarkerIcon(color, false),
      });

      marker.addListener('click', () => {
        setRegistroActivo(registro);
        infoWindow.setContent(buildInfoWindowContent(tituloMarcador, hora));
        infoWindow.open({ map, anchor: marker });
      });

      markersByRegistroRef.current.set(registro, marker);
    });

    applyMapView(map, registrosConUbicacion);

    mapInstanceRef.current = map;

    requestAnimationFrame(invalidateMapSize);
    resizeTimers = [150, 400, 800].map((ms) => setTimeout(invalidateMapSize, ms));

    return () => {
      resizeTimers.forEach(clearTimeout);
      markersByRegistroRef.current.forEach((marker) => marker.setMap(null));
      markersByRegistroRef.current.clear();
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [
    shouldLoadGoogleMaps,
    googleMapsLibrary,
    ubicacionesKey,
    registrosConUbicacion,
    colorPorRegistro,
    getTituloRegistro,
    formatTimeWithAMPM,
    invalidateMapSize,
  ]);

  useEffect(() => {
    if (!mapInstanceRef.current || !registroActivo?.ubicacion) return;
    highlightMarker(registroActivo);
    mapInstanceRef.current.panTo({ lat: registroActivo.ubicacion.lat, lng: registroActivo.ubicacion.lng });
  }, [registroActivo, highlightMarker, ubicacionesKey]);

  useEffect(() => {
    if (!mapaVisible || !mapInstanceRef.current) return;
    const timer = setTimeout(invalidateMapSize, 150);
    return () => clearTimeout(timer);
  }, [mapaVisible, invalidateMapSize]);

  useEffect(() => {
    if (!isOpen) {
      markersByRegistroRef.current.forEach((marker) => marker.setMap(null));
      markersByRegistroRef.current.clear();
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      mapInstanceRef.current = null;
    }
  }, [isOpen]);

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const fechaRegistro = rawRegistros.length > 0 ? rawRegistros[0].created_at : null;
  const fechaFormateada = fechaRegistro ? format(new Date(fechaRegistro), 'PPPP', { locale: es }) : '';

  if (!isOpen) return null;

  const hayUbicaciones = registrosConUbicacion.length > 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border-none shadow-2xl dark:shadow-black/50 w-full h-full max-w-none flex flex-col md:flex-row overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onAnimationComplete={invalidateMapSize}
          >
            <div className={`
              w-full md:w-80 bg-slate-50 dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col
              ${mapaVisible ? 'h-2/5' : 'h-full'}
              md:h-full
            `}>
              <div className="p-4 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
                <div className="overflow-hidden">
                  <span className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                    {titulo || 'Asistencia'}
                  </span>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate text-sm md:text-base" title={nombreUsuario}>
                    {nombreUsuario}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fechaFormateada}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0 cursor-pointer">
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-2 bg-gray-100 dark:bg-neutral-950/50 border-b border-gray-200 dark:border-neutral-800 grid grid-cols-2 gap-2">
                 <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="w-full text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 p-2 rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-gray-200 dark:border-neutral-700"
                  >
                    <ArrowUpDown size={14} />
                    {sortOrder === 'asc' ? 'Recientes' : 'Antiguos'}
                  </button>

                 <button
                    type="button"
                    onClick={() => setMapaVisible(p => !p)}
                    className="w-full text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-2 rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-blue-100 dark:border-blue-900/30 md:hidden"
                  >
                    {mapaVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    {mapaVisible ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                  </button>
              </div>

              {permiso && (
                <div className="p-2 border-b border-gray-200 dark:border-neutral-800 bg-indigo-50/50 dark:bg-indigo-900/10">
                  <button
                    onClick={() => onVerPermiso?.(permiso)}
                    className="w-full p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
                        <FileCheck size={16} />
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Permiso del día</span>
                        <span className="block text-sm font-semibold text-indigo-900 dark:text-indigo-200 capitalize">
                          {permiso.tipo.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      VER DETALLE
                    </div>
                  </button>
                </div>
              )}

              <div className="flex-grow overflow-y-auto p-2 space-y-2 scrollbar-thin dark:scrollbar-track-neutral-900 dark:scrollbar-thumb-neutral-700">
                {listaRegistros.map((registro, index) => {
                   const esTipoEstandar = ['Entrada', 'Salida'].includes(registro.tipo_registro || '');
                   const tituloPrincipal = getTituloRegistro(registro);
                   const color = colorPorRegistro.get(registro) ?? getMarkerColor(index);

                   return (
                    <button
                        key={index}
                        onClick={() => setRegistroActivo(registro)}
                        className={`w-full text-left p-3 rounded-lg transition-all border ${
                        registroActivo === registro
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                            : 'bg-white dark:bg-neutral-900/50 border-transparent hover:bg-gray-100 dark:hover:bg-neutral-800'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              {registro.ubicacion && (
                                <span
                                  className="mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-neutral-900"
                                  style={{ backgroundColor: color }}
                                />
                              )}
                              <span className={`font-semibold text-sm line-clamp-2 ${registroActivo === registro ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                  {tituloPrincipal}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                {formatTimeWithAMPM(registro.created_at)}
                            </span>
                        </div>

                        {esTipoEstandar && registro.notas && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-2 line-clamp-3 pl-5">
                                {registro.notas}
                            </p>
                        )}

                        <div className="flex justify-between items-end mt-2 pl-5">
                            {registro.ubicacion ? (
                                <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                    <MapPin size={12} />
                                    <span>Ubicación registrada</span>
                                </div>
                            ) : <span className="text-[11px] text-gray-300 dark:text-neutral-600 italic">Sin ubicación</span>}
                        </div>
                    </button>
                   );
                })}
                {listaRegistros.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">No hay registros para mostrar.</p>
                )}
              </div>

              {registroActivo?.ubicacion && (
                <div className="hidden md:block p-3 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${registroActivo.ubicacion.lat},${registroActivo.ubicacion.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium px-4 py-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    Abrir en App
                  </a>
                </div>
              )}
            </div>

            <div className={`
              flex-grow flex flex-col relative bg-gray-50 dark:bg-neutral-950
              ${mapaVisible ? 'h-3/5' : 'hidden'}
              md:flex md:h-full
            `}>
              {hayUbicaciones ? (
                <div className="flex-grow relative min-h-0 h-full">
                  <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

                  {mapaError && (
                    <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-gray-50/95 dark:bg-neutral-950/95 p-6 text-center">
                      <MapPin size={40} className="text-gray-300 dark:text-neutral-600 mb-3" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{mapaError}</p>
                    </div>
                  )}

                  {registroActivo?.ubicacion && (
                    <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center justify-center p-1 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 dark:border-neutral-700/50">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${registroActivo.ubicacion.lat},${registroActivo.ubicacion.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-700/80 transition-all"
                        title="Ver ubicación exacta en la aplicación de mapas"
                      >
                        <ExternalLink size={14} />
                        Abrir en App
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-950">
                  <MapPin size={48} className="text-gray-300 dark:text-neutral-700 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Sin ubicación</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Ningún registro tiene datos de geolocalización.</p>
                </div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
