'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Trash2, Pencil, Loader2, BookOpen, Tag, FileText, Image as ImageIcon, BarChart2, Sparkles, ChevronDown, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import {
  getPoliticas, eliminarPolitica, crearPolitica, eliminarPublicacion, getPublicaciones, actualizarPublicacion,
  type Publicacion, type Politica,
} from '@/components/home/lib/actions';
import { PublicacionEditorModal } from '@/components/home/modals/PublicacionEditorModal';
import Swal from 'sweetalert2';

interface Props {
  publicacionesIniciales: Publicacion[];
  politicasIniciales: Politica[];
}

type Tab = 'publicaciones' | 'politicas';

export function GestorPublicacionesView({ publicacionesIniciales, politicasIniciales }: Props) {
  const [tab, setTab] = useState<Tab>('publicaciones');
  const [isPending, startTransition] = useTransition();

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>(publicacionesIniciales);
  const [politicas, setPoliticas] = useState<Politica[]>(politicasIniciales);

  useEffect(() => {
    getPublicaciones().then(setPublicaciones);
    getPoliticas().then(setPoliticas);
  }, []);

  const [editorOpen, setEditorOpen] = useState(false);
  const [publicacionEdit, setPublicacionEdit] = useState<Publicacion | null>(null);

  const añosVistos = Array.from(new Set(publicaciones.map(p => p.año))).sort((a, b) => b - a);
  const multipleAños = añosVistos.length > 1;
  const [añoAbierto, setAñoAbierto] = useState<number | null>(() => {
    const años = Array.from(new Set(publicacionesIniciales.map(p => p.año))).sort((a, b) => b - a);
    return años.length > 1 ? años[0] : null;
  });

  const [nuevaPolitica, setNuevaPolitica] = useState('');
  const [agregandoPolitica, setAgregandoPolitica] = useState(false);
  const [menuOrdenInfo, setMenuOrdenInfo] = useState<{ id: string, rect: DOMRect } | null>(null);

  async function handleMoverOrden(pub: Publicacion, direccion: 'up' | 'down' | 'top' | 'bottom') {
    const pubsDelAño = publicaciones.filter(p => p.año === pub.año).sort((a, b) => a.orden - b.orden);
    const index = pubsDelAño.findIndex(p => p.id === pub.id);
    
    if (direccion === 'up' && index > 0) {
      ejecutarDesplazamiento(pubsDelAño, index, index - 1);
    } else if (direccion === 'down' && index < pubsDelAño.length - 1) {
      ejecutarDesplazamiento(pubsDelAño, index, index + 1);
    } else if (direccion === 'top' && index > 0) {
      ejecutarDesplazamiento(pubsDelAño, index, 0);
    } else if (direccion === 'bottom' && index < pubsDelAño.length - 1) {
      ejecutarDesplazamiento(pubsDelAño, index, pubsDelAño.length - 1);
    }
  }

  function ejecutarDesplazamiento(pubsDelAño: Publicacion[], fromIndex: number, toIndex: number) {
    const item = pubsDelAño[fromIndex];
    const newPubs = [...pubsDelAño];
    newPubs.splice(fromIndex, 1);
    newPubs.splice(toIndex, 0, item);

    const originalOrders = pubsDelAño.map(p => p.orden);
    
    const updates = newPubs.map((p, i) => ({
      id: p.id,
      newOrden: originalOrders[i]
    })).filter(u => {
      const oldPub = pubsDelAño.find(p => p.id === u.id);
      return oldPub && oldPub.orden !== u.newOrden;
    });

    if (updates.length === 0) return;

    startTransition(async () => {
      // Optimistic update
      setPublicaciones(prev => prev.map(p => {
        const update = updates.find(u => u.id === p.id);
        return update ? { ...p, orden: update.newOrden } : p;
      }));

      // To avoid unique constraints, first set all changing ones to negative
      for (const u of updates) {
        await actualizarPublicacion(u.id, { orden: -u.newOrden - 10000 });
      }
      
      // Then set to final values
      for (const u of updates) {
        await actualizarPublicacion(u.id, { orden: u.newOrden });
      }

      const actualizadas = await getPublicaciones();
      setPublicaciones(actualizadas);
      toast.success('Orden actualizado');
    });
  }

  async function handleEliminarPublicacion(pub: Publicacion) {
    const result = await Swal.fire({
      title: '¿Eliminar publicación?',
      text: `Se borrará "${pub.nombre}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    startTransition(async () => {
      const response = await eliminarPublicacion(pub.id);
      if (response.success) {
        setPublicaciones(prev => prev.filter(p => p.id !== pub.id));
        toast.success('Publicación eliminada');
      } else {
        toast.error(`Error: ${response.error}`);
      }
    });
  }

  async function handleAgregarPolitica() {
    if (!nuevaPolitica.trim()) { toast.error('Escribe un nombre'); return; }
    setAgregandoPolitica(true);
    const result = await crearPolitica(nuevaPolitica.trim());
    if (result.success) {
      const nuevas = await getPoliticas();
      setPoliticas(nuevas);
      setNuevaPolitica('');
      toast.success('Política agregada ✓');
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setAgregandoPolitica(false);
  }

  function handleEliminarPolitica(pol: Politica) {
    if (!confirm(`¿Eliminar la política "${pol.nombre}"? Las publicaciones asociadas perderán su categoría.`)) return;
    startTransition(async () => {
      const result = await eliminarPolitica(pol.id);
      if (result.success) {
        setPoliticas(prev => prev.filter(p => p.id !== pol.id));
        toast.success('Política eliminada');
      } else {
        toast.error(`Error: ${result.error}`);
      }
    });
  }

  const estaOcupado = isPending || agregandoPolitica;

  return (
    <div className="flex flex-col h-full">

      {/* ── Tabs ── */}
      {!editorOpen && (
        <div className="flex gap-1 bg-white dark:bg-neutral-800 rounded-2xl p-1.5 shadow-sm border border-gray-200 dark:border-neutral-700 self-start mb-7">
          {([
            { key: 'publicaciones', label: 'Publicaciones', icon: BookOpen },
            { key: 'politicas', label: 'Catálogo de Políticas', icon: Tag },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                tab === key
                  ? 'bg-gradient-to-br from-[#02245b] to-blue-700 text-white shadow-md shadow-blue-900/30'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Contenido ── */}
      <div className="flex-1 flex flex-col">

        {/* ── Lista de Publicaciones ── */}
        {!editorOpen && tab === 'publicaciones' && (
          <div className="space-y-4">
            {/* Header de sección */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Total registradas</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {publicaciones.length}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">publicación(es)</span>
                </p>
              </div>
              <button
                onClick={() => { setPublicacionEdit(null); setEditorOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#02245b] to-blue-700 hover:from-[#031e4f] hover:to-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4" />
                Nueva Publicación
              </button>
            </div>

            {publicaciones.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-700">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-400 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Aún no hay publicaciones</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">¡Crea la primera para comenzar!</p>
              </div>
            ) : (
              multipleAños ? (
                <div className="space-y-4">
                  {añosVistos.map(año => (
                    <div key={año} className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                      <button
                        onClick={() => setAñoAbierto(añoAbierto === año ? null : año)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">Año {año}</span>
                          <span className="text-xs font-medium text-gray-500 bg-gray-200 dark:bg-neutral-700 px-2 py-0.5 rounded-full">
                            {publicaciones.filter(p => p.año === año).length} publicación(es)
                          </span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-1000 ${añoAbierto === año ? 'rotate-180' : ''}`} />
                      </button>
                      <div 
                        className={`grid transition-[grid-template-rows,opacity] duration-1000 ease-in-out ${
                          añoAbierto === año ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-900/20">
                            <div className="space-y-2">
                              {publicaciones.filter(p => p.año === año).map((pub) => {
                                const imgCount = pub.imagenes?.filter(i => i !== '__HIDDEN__').length ?? 0;
                                const docCount = pub.documentos?.filter((d: any) => d.nombre !== '__HIDDEN__').length ?? 0;
                                const hasGrafica = pub.grafica_data && pub.grafica_data.some((d: any) => d.concepto !== '__HIDDEN__');

                                return (
                                  <div
                                    key={pub.id}
                                    className="group flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-700 gap-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="relative shrink-0">
                                        <button 
                                          onClick={(e) => {
                                            if (menuOrdenInfo?.id === pub.id) setMenuOrdenInfo(null);
                                            else setMenuOrdenInfo({ id: pub.id, rect: e.currentTarget.getBoundingClientRect() });
                                          }}
                                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#02245b] to-blue-700 hover:from-[#031e4f] hover:to-blue-800 text-white text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                          title="Cambiar orden"
                                        >
                                          {pub.orden}
                                        </button>

                                        {menuOrdenInfo?.id === pub.id && (
                                          <>
                                            <div className="fixed inset-0 z-40" onClick={() => setMenuOrdenInfo(null)} />
                                            <div 
                                              className="fixed z-50 w-32 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 py-1.5 animate-in fade-in zoom-in-95 duration-200"
                                              style={{
                                                top: menuOrdenInfo.rect.bottom + 8,
                                                left: menuOrdenInfo.rect.left
                                              }}
                                            >
                                              <button 
                                                onClick={() => { handleMoverOrden(pub, 'top'); setMenuOrdenInfo(null); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                              >
                                                <ChevronsUp className="w-4 h-4 text-emerald-600" /> Inicio
                                              </button>
                                              <button 
                                                onClick={() => { handleMoverOrden(pub, 'up'); setMenuOrdenInfo(null); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                              >
                                                <ArrowUp className="w-4 h-4 text-emerald-500" /> Subir
                                              </button>
                                              <button 
                                                onClick={() => { handleMoverOrden(pub, 'down'); setMenuOrdenInfo(null); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                              >
                                                <ArrowDown className="w-4 h-4 text-red-500" /> Bajar
                                              </button>
                                              <button 
                                                onClick={() => { handleMoverOrden(pub, 'bottom'); setMenuOrdenInfo(null); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                              >
                                                <ChevronsDown className="w-4 h-4 text-red-600" /> Final
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#02245b] dark:group-hover:text-blue-300 transition-colors">{pub.nombre}</p>
                                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                          <span className="text-[11px] font-medium bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-gray-400 rounded-md px-2 py-0.5">{pub.año}</span>
                                          {pub.politicas?.nombre && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-800">
                                              {pub.politicas.nombre}
                                            </span>
                                          )}
                                          {imgCount > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md px-2 py-0.5 border border-purple-100 dark:border-purple-800">
                                              <ImageIcon className="w-3 h-3" />{imgCount}
                                            </span>
                                          )}
                                          {docCount > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md px-2 py-0.5 border border-amber-100 dark:border-amber-800">
                                              <FileText className="w-3 h-3" />{docCount}
                                            </span>
                                          )}
                                          {hasGrafica && (
                                            <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md px-2 py-0.5 border border-emerald-100 dark:border-emerald-800">
                                              <BarChart2 className="w-3 h-3" />Gráfica
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() => { setPublicacionEdit(pub); setEditorOpen(true); }}
                                        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all text-xs font-semibold shadow-none"
                                        title="Editar"
                                      >
                                        <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                        <span className="hidden sm:inline">Editar</span>
                                      </button>
                                      <button
                                        onClick={() => handleEliminarPublicacion(pub)}
                                        disabled={estaOcupado}
                                        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800/50 transition-all text-xs font-semibold shadow-none disabled:opacity-50"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                        <span className="hidden sm:inline">Eliminar</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {publicaciones.map((pub) => {
                    const imgCount = pub.imagenes?.filter(i => i !== '__HIDDEN__').length ?? 0;
                    const docCount = pub.documentos?.filter((d: any) => d.nombre !== '__HIDDEN__').length ?? 0;
                    const hasGrafica = pub.grafica_data && pub.grafica_data.some((d: any) => d.concepto !== '__HIDDEN__');

                    return (
                      <div
                        key={pub.id}
                        className="group flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-700 gap-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative shrink-0">
                            <button 
                              onClick={(e) => {
                                if (menuOrdenInfo?.id === pub.id) setMenuOrdenInfo(null);
                                else setMenuOrdenInfo({ id: pub.id, rect: e.currentTarget.getBoundingClientRect() });
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#02245b] to-blue-700 hover:from-[#031e4f] hover:to-blue-800 text-white text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              title="Cambiar orden"
                            >
                              {pub.orden}
                            </button>

                            {menuOrdenInfo?.id === pub.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOrdenInfo(null)} />
                                <div 
                                  className="fixed z-50 w-32 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 py-1.5 animate-in fade-in zoom-in-95 duration-200"
                                  style={{
                                    top: menuOrdenInfo.rect.bottom + 8,
                                    left: menuOrdenInfo.rect.left
                                  }}
                                >
                                  <button 
                                    onClick={() => { handleMoverOrden(pub, 'top'); setMenuOrdenInfo(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    <ChevronsUp className="w-4 h-4 text-emerald-600" /> Inicio
                                  </button>
                                  <button 
                                    onClick={() => { handleMoverOrden(pub, 'up'); setMenuOrdenInfo(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    <ArrowUp className="w-4 h-4 text-emerald-500" /> Subir
                                  </button>
                                  <button 
                                    onClick={() => { handleMoverOrden(pub, 'down'); setMenuOrdenInfo(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    <ArrowDown className="w-4 h-4 text-red-500" /> Bajar
                                  </button>
                                  <button 
                                    onClick={() => { handleMoverOrden(pub, 'bottom'); setMenuOrdenInfo(null); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    <ChevronsDown className="w-4 h-4 text-red-600" /> Final
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#02245b] dark:group-hover:text-blue-300 transition-colors">{pub.nombre}</p>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[11px] font-medium bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-gray-400 rounded-md px-2 py-0.5">{pub.año}</span>
                              {pub.politicas?.nombre && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-800">
                                  {pub.politicas.nombre}
                                </span>
                              )}
                              {imgCount > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md px-2 py-0.5 border border-purple-100 dark:border-purple-800">
                                  <ImageIcon className="w-3 h-3" />{imgCount}
                                </span>
                              )}
                              {docCount > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md px-2 py-0.5 border border-amber-100 dark:border-amber-800">
                                  <FileText className="w-3 h-3" />{docCount}
                                </span>
                              )}
                              {hasGrafica && (
                                <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md px-2 py-0.5 border border-emerald-100 dark:border-emerald-800">
                                  <BarChart2 className="w-3 h-3" />Gráfica
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => { setPublicacionEdit(pub); setEditorOpen(true); }}
                            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all text-xs font-semibold shadow-none"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                          <button
                            onClick={() => handleEliminarPublicacion(pub)}
                            disabled={estaOcupado}
                            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800/50 transition-all text-xs font-semibold shadow-none disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* ── Catálogo de Políticas ── */}
        {!editorOpen && tab === 'politicas' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevaPolitica}
                onChange={e => setNuevaPolitica(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAgregarPolitica()}
                placeholder="Ej: Infraestructura, Salud, Educación..."
                disabled={estaOcupado}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
              />
              <button
                onClick={handleAgregarPolitica}
                disabled={estaOcupado}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#02245b] to-blue-700 hover:from-[#031e4f] hover:to-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-900/30"
              >
                {agregandoPolitica ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Agregar
              </button>
            </div>

            {politicas.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-700">
                <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Aún no hay políticas en el catálogo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {politicas.map(pol => (
                  <div key={pol.id} className="group flex items-center justify-between p-3.5 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{pol.nombre}</span>
                    </div>
                    <button
                      onClick={() => handleEliminarPolitica(pol)}
                      disabled={estaOcupado}
                      className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 transition-all text-xs font-semibold shadow-sm disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {editorOpen && (
          <div className="flex-1 flex flex-col min-h-0">
            <PublicacionEditorModal
              open={editorOpen}
              onClose={() => setEditorOpen(false)}
              onGuardado={() => {
                setEditorOpen(false);
                getPublicaciones().then(setPublicaciones);
              }}
              publicacion={publicacionEdit}
              politicas={politicas}
              publicaciones={publicaciones}
            />
          </div>
        )}
      </div>
    </div>
  );
}