'use client';

import React, { useState, useRef, useTransition, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  X, Save, Loader2, Image as ImageIcon, FileText,
  BarChart2, Plus, Trash2, ChevronDown, ArrowLeft, Upload
} from 'lucide-react';
import ImageUploader, { type ImageUploaderHandle } from '@/components/imgs/ImageUploader';
import {
  crearPublicacion, actualizarPublicacion,
  type Publicacion, type Politica, type GraficaFila, type DocumentoItem,
} from '@/components/home/lib/actions';
import { createClient } from '@/utils/supabase/client';
import Swal from 'sweetalert2';

interface Props {
  open: boolean;
  onClose: () => void;
  onGuardado: () => void;
  publicacion?: Publicacion | null;
  politicas: Politica[];
  publicaciones: Publicacion[];
}

type Seccion = 'imagenes' | 'documentos' | 'grafica';

const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: 10 }, (_, i) => AÑO_ACTUAL - i);
const BUCKET = 'home_imagenes';
const BUCKET_PDF = 'home_pdf';

const formatNumberWithCommas = (val: string | number) => {
  if (val === '' || val === null || val === undefined) return '';
  const str = val.toString().replace(/,/g, '');
  if (isNaN(Number(str))) return str;
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const handleNumberChange = (val: string) => {
  return val.replace(/[^0-9.]/g, '');
};

export function PublicacionEditorModal({ open, onClose, onGuardado, publicacion, politicas, publicaciones }: Props) {
  const [isPending, startTransition] = useTransition();

  // ─── Campos base ───────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [año, setAño] = useState(AÑO_ACTUAL);
  const [orden, setOrden] = useState<number | ''>(0);
  const [politicaId, setPoliticaId] = useState<string>('');
  const [publicationCode, setPublicationCode] = useState<string>('');

  // ─── Secciones activas ──────────────────────────────────────────────────────
  const [secciones, setSecciones] = useState<Set<Seccion>>(new Set());

  // ─── Imágenes ───────────────────────────────────────────────────────────────
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const imgRef = useRef<ImageUploaderHandle>(null);

  // ─── Documentos (PDF) ───────────────────────────────────────────────────────
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const [nombrePdf, setNombrePdf] = useState('');
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ─── Gráfica ────────────────────────────────────────────────────────────────
  const [filas, setFilas] = useState<any[]>([{ concepto: '', presupuestado: '', ejecutado: '' }]);

  // ─── Hidratación al editar ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setNombre(publicacion?.nombre ?? '');
      setDescripcion(publicacion?.descripcion ?? '');
      setAño(publicacion?.año ?? AÑO_ACTUAL);
      setOrden(publicacion?.orden ?? 0);
      setPoliticaId(publicacion?.politica_id ?? '');
      setPublicationCode(publicacion?.id ?? crypto.randomUUID());
    }
  }, [open, publicacion]);

  // Recalcular orden si cambia el año (solo al crear una nueva)
  useEffect(() => {
    if (open && !publicacion) {
      const pubsDelAño = publicaciones.filter(p => p.año === año);
      setOrden(pubsDelAño.length > 0 ? Math.max(...pubsDelAño.map(p => p.orden)) + 1 : 0);
    }
  }, [año, open, publicacion, publicaciones]);

  // Hidratación de complementos al editar
  useEffect(() => {
    if (publicacion) {
      if (publicacion.imagenes) {
        setImagenes(publicacion.imagenes.filter(img => img !== '__HIDDEN__'));
        if (!publicacion.imagenes.includes('__HIDDEN__')) setSecciones(prev => new Set([...prev, 'imagenes']));
      }
      if (publicacion.documentos) {
        // @ts-ignore
        setDocumentos(publicacion.documentos.filter(doc => doc.nombre !== '__HIDDEN__'));
        // @ts-ignore
        if (!publicacion.documentos.some(doc => doc.nombre === '__HIDDEN__')) setSecciones(prev => new Set([...prev, 'documentos']));
      }
      if (publicacion.grafica_data) {
        // @ts-ignore
        const filteredFilas = publicacion.grafica_data.filter(d => d.concepto !== '__HIDDEN__');
        setFilas(filteredFilas.length > 0 ? filteredFilas : [{ concepto: '', presupuestado: 0, ejecutado: 0 }]);
        // @ts-ignore
        if (!publicacion.grafica_data.some(d => d.concepto === '__HIDDEN__')) setSecciones(prev => new Set([...prev, 'grafica']));
      }
    }
  }, [publicacion]);

  if (!open) return null;

  const toggleSeccion = (s: Seccion) => {
    setSecciones(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  // ─── Subir PDF a Supabase ───────────────────────────────────────────────────
  async function subirPdf(file: File) {
    if (!nombrePdf.trim()) { toast.error('Escribe un nombre para el PDF'); return; }
    setSubiendoPdf(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `documentos/publicaciones/publicacion-${publicationCode}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET_PDF).upload(path, file, { upsert: true });
      if (error) { 
        console.error("Error Supabase:", error);
        toast.error(`Error al subir PDF: ${error.message}`); 
        return; 
      }
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PDF}/${path}`;
      setDocumentos(prev => [...prev, { nombre: nombrePdf.trim() || file.name.replace('.pdf', ''), url }]);
      setNombrePdf('');
      setArchivoPendiente(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      toast.success('PDF agregado ✓');
    } finally {
      setSubiendoPdf(false);
    }
  }

  // ─── Eliminar archivos y secciones ─────────────────────────────────────────
  const eliminarSeccion = async (type: Seccion) => {
    const result = await Swal.fire({
      title: '¿Eliminar sección?',
      text: "Se borrarán todos los datos y archivos de esta sección permanentemente del servidor.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const supabase = createClient();
      if (type === 'imagenes') {
        const paths = imagenes.filter(i => i !== '__HIDDEN__').map(url => {
          const parts = url.split(`/${BUCKET}/`);
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean) as string[];
        if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
        setImagenes([]);
      } else if (type === 'documentos') {
        const paths = documentos.filter(d => d.nombre !== '__HIDDEN__').map(d => {
          const parts = d.url.split(`/${BUCKET_PDF}/`);
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean) as string[];
        if (paths.length > 0) await supabase.storage.from(BUCKET_PDF).remove(paths);
        setDocumentos([]);
      } else if (type === 'grafica') {
        setFilas([{ concepto: '', presupuestado: 0, ejecutado: 0 }]);
      }
      
      setSecciones(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
      toast.success(`Sección eliminada`);
    }
  };

  const eliminarPdf = async (index: number) => {
    const doc = documentos[index];
    if (doc.nombre === '__HIDDEN__') return;
    const result = await Swal.fire({
      title: '¿Eliminar PDF?',
      text: "El archivo se borrará permanentemente del servidor.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
      const parts = doc.url.split(`/${BUCKET_PDF}/`);
      if (parts.length > 1) {
        const supabase = createClient();
        await supabase.storage.from(BUCKET_PDF).remove([parts[1]]);
      }
      setDocumentos(prev => prev.filter((_, j) => j !== index));
      toast.success('PDF eliminado');
    }
  };

  const eliminarImagen = async (index: number) => {
    const url = imagenes[index];
    if (url === '__HIDDEN__') return;
    const result = await Swal.fire({
      title: '¿Eliminar Imagen?',
      text: "El archivo se borrará permanentemente del servidor.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
      const parts = url.split(`/${BUCKET}/`);
      if (parts.length > 1) {
        const supabase = createClient();
        await supabase.storage.from(BUCKET).remove([parts[1]]);
      }
      setImagenes(prev => prev.filter((_, j) => j !== index));
      toast.success('Imagen eliminada');
    }
  };

  // ─── Guardar publicación ────────────────────────────────────────────────────
  function handleGuardar() {
    if (!nombre.trim()) { toast.error('El título es obligatorio'); return; }
    if (!descripcion.trim()) { toast.error('La descripción es obligatoria'); return; }

    const ordenNum = Number(orden) || 0;
    if (publicaciones.some(p => p.orden === ordenNum && p.año === año && p.id !== publicacion?.id)) {
      toast.error(`El número ${ordenNum} ya está en uso en el año ${año}`);
      return;
    }

    startTransition(async () => {
      const payload = {
        id: publicationCode,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        año,
        orden: ordenNum,
        politica_id: politicaId || null,
        imagenes: imagenes.length > 0 ? (secciones.has('imagenes') ? imagenes : [...imagenes, '__HIDDEN__']) : null,
        documentos: documentos.length > 0 ? (secciones.has('documentos') ? documentos : [...documentos, { nombre: '__HIDDEN__', url: '' }]) : null,
        grafica_data: filas.some(f => f.concepto.trim()) 
          ? (secciones.has('grafica') 
              ? filas.filter(f => f.concepto.trim()).map(f => ({ ...f, presupuestado: Number(f.presupuestado) || 0, ejecutado: Number(f.ejecutado) || 0 }))
              : [...filas.filter(f => f.concepto.trim()).map(f => ({ ...f, presupuestado: Number(f.presupuestado) || 0, ejecutado: Number(f.ejecutado) || 0 })), { concepto: '__HIDDEN__', presupuestado: 0, ejecutado: 0 }]
            )
          : null,
      };

      const result = publicacion?.id
        ? await actualizarPublicacion(publicacion.id, payload)
        : await crearPublicacion(payload);

      if (result.success) {
        toast.success(publicacion?.id ? 'Publicación actualizada ✓' : 'Publicación creada ✓');
        onGuardado();
        onClose();
      } else {
        toast.error(`Error: ${result.error}`);
      }
    });
  }

  const estaOcupado = isPending || subiendoImg || subiendoPdf;

  return (
    <div className="w-full h-full bg-white dark:bg-neutral-900 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-200">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                {publicacion?.id ? 'Editar Publicación' : 'Nueva Publicación'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Los cambios se reflejan en la página pública</p>
            </div>
          </div>
          
          <button onClick={onClose} disabled={estaOcupado} className="flex items-center gap-2 px-3 py-2 -mr-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 text-sm font-medium">
            <ArrowLeft className="w-5 h-5" /> Volver
          </button>
        </div>

        {/* ── Cuerpo con scroll ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Datos Base */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Datos principales</h3>

            {/* Nombre */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                maxLength={200}
                placeholder="Ej: Avance de Obras de Infraestructura 2025"
                disabled={estaOcupado}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripción *</label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Escribe el contenido de la publicación..."
                disabled={estaOcupado}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>

            {/* Año, Orden y Política en grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Año *</label>
                <div className="relative">
                  <select
                    value={año}
                    onChange={e => setAño(Number(e.target.value))}
                    disabled={estaOcupado}
                    className="w-full appearance-none px-4 py-3 pr-8 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Orden</label>
                <input
                  type="number"
                  min={0}
                  value={orden}
                  onChange={e => setOrden(e.target.value === '' ? '' : Number(e.target.value))}
                  onFocus={e => e.target.select()}
                  disabled={estaOcupado}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Política</label>
                <div className="relative">
                  <select
                    value={politicaId}
                    onChange={e => setPoliticaId(e.target.value)}
                    disabled={estaOcupado}
                    className="w-full appearance-none px-4 py-3 pr-8 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">— Ninguna —</option>
                    {politicas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Botones de Complemento */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contenido adicional</h3>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'imagenes', icon: ImageIcon, label: 'Imágenes', color: 'blue' },
                { key: 'documentos', icon: FileText, label: 'Documentos PDF', color: 'amber' },
                { key: 'grafica', icon: BarChart2, label: 'Gráfica', color: 'emerald' },
              ] as const).map(({ key, icon: Icon, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSeccion(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    secciones.has(key)
                      ? `bg-${color}-50 dark:bg-${color}-900/30 border-${color}-300 dark:border-${color}-700 text-${color}-700 dark:text-${color}-300`
                      : 'bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {secciones.has(key) && <span className="ml-1 w-2 h-2 rounded-full bg-current opacity-70" />}
                </button>
              ))}
            </div>
          </section>

          {/* ─── Sección Imágenes ──────────────────────────────────────────────── */}
          {secciones.has('imagenes') && (
            <section className="relative space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <button type="button" onClick={() => eliminarSeccion('imagenes')} className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-white/50 hover:bg-red-50 dark:bg-neutral-800/50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800" title="Eliminar sección completa">
                <Trash2 className="w-4 h-4" />
              </button>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                <ImageIcon className="w-4 h-4" /> Imágenes
              </h4>

              {/* Imágenes ya cargadas */}
              {imagenes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagenes.map((url, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${url}`} alt={`img-${i}`} className="w-20 h-20 object-cover rounded-lg border border-blue-200 dark:border-blue-700" />
                      <button onClick={() => eliminarImagen(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <ImageUploader
                ref={imgRef}
                bucketName={BUCKET}
                folderPath={`publicaciones/publicacion-${publicationCode}`}
                currentImagePath={null}
                permitirTodos={false}
                onUploadSuccess={(path) => {
                  setImagenes(prev => [...prev, path]);
                  toast.success('Imagen agregada ✓');
                }}
                onDeleteSuccess={() => {}}
                onEstadoChange={(e) => setSubiendoImg(e.uploading || e.deleting)}
              />
            </section>
          )}

          {/* ─── Sección Documentos ───────────────────────────────────────────── */}
          {secciones.has('documentos') && (
            <section className="relative space-y-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <button type="button" onClick={() => eliminarSeccion('documentos')} className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-white/50 hover:bg-red-50 dark:bg-neutral-800/50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800" title="Eliminar sección completa">
                <Trash2 className="w-4 h-4" />
              </button>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <FileText className="w-4 h-4" /> Documentos PDF
              </h4>

              {documentos.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-amber-800/70 dark:text-amber-400/70 uppercase tracking-wider">Archivos Adjuntos:</p>
                  <ul className="space-y-2">
                    {documentos.map((doc, i) => (
                      <li key={i} className="flex items-center justify-between p-3 bg-amber-500/10 dark:bg-amber-900/30 rounded-xl border border-amber-300 dark:border-amber-700/50 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm shrink-0">
                            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{doc.nombre}</span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                              ✓ Cargado
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => eliminarPdf(i)} 
                          className="p-2 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors shrink-0"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!archivoPendiente ? (
                <div>
                  <p className="text-xs font-semibold text-amber-800/70 dark:text-amber-400/70 uppercase tracking-wider mb-2">Agregar nuevo PDF:</p>
                  <label className="flex justify-center items-center gap-2 w-full px-5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-400">
                    <Plus className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Seleccionar archivo PDF</span>
                    <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { 
                      const f = e.target.files?.[0]; 
                      if (f) {
                        setArchivoPendiente(f);
                        if (!nombrePdf) setNombrePdf(f.name.replace('.pdf', ''));
                      }
                    }} />
                  </label>
                </div>
              ) : (
                <div className="bg-amber-100/50 dark:bg-amber-900/30 p-4 rounded-xl border border-amber-300 dark:border-amber-700 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">{archivoPendiente.name}</span>
                    </span>
                    <button type="button" onClick={() => { setArchivoPendiente(null); setNombrePdf(''); }} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nombrePdf}
                      onChange={e => setNombrePdf(e.target.value)}
                      placeholder="Título del documento..."
                      className="flex-1 px-3 py-2.5 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm shadow-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => subirPdf(archivoPendiente)} 
                      disabled={subiendoPdf}
                      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${subiendoPdf ? 'bg-amber-200 text-amber-600' : 'bg-amber-500 hover:bg-amber-600 hover:-translate-y-0.5 text-white'}`}
                    >
                      {subiendoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {subiendoPdf ? 'Subiendo...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ─── Sección Gráfica ──────────────────────────────────────────────── */}
          {secciones.has('grafica') && (
            <section className="relative space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <button type="button" onClick={() => eliminarSeccion('grafica')} className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-white/50 hover:bg-red-50 dark:bg-neutral-800/50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800" title="Eliminar sección completa">
                <Trash2 className="w-4 h-4" />
              </button>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <BarChart2 className="w-4 h-4" /> Datos de Gráfica
              </h4>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 px-1">
                  <span>Concepto</span>
                  <span>Presupuestado (Q)</span>
                  <span>Ejecutado (Q)</span>
                </div>
                {filas.map((fila, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="text"
                      value={fila.concepto}
                      onChange={e => setFilas(prev => prev.map((f, j) => j === i ? { ...f, concepto: e.target.value } : f))}
                      placeholder="Ej: Puente Valle Arriba"
                      className="px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                    />
                    <input
                      type="text"
                      value={formatNumberWithCommas(fila.presupuestado)}
                      onChange={e => setFilas(prev => prev.map((f, j) => j === i ? { ...f, presupuestado: handleNumberChange(e.target.value) } : f))}
                      onFocus={e => e.target.select()}
                      className="px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                    />
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formatNumberWithCommas(fila.ejecutado)}
                        onChange={e => setFilas(prev => prev.map((f, j) => j === i ? { ...f, ejecutado: handleNumberChange(e.target.value) } : f))}
                        onFocus={e => e.target.select()}
                        className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                      />
                      {filas.length > 1 && (
                        <button onClick={() => setFilas(prev => prev.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setFilas(prev => [...prev, { concepto: '', presupuestado: '', ejecutado: '' }])}
                className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar fila
              </button>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 shrink-0 flex items-center justify-end gap-3 bg-gray-50 dark:bg-neutral-900/80">
          <button onClick={handleGuardar} disabled={estaOcupado} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold transition-colors text-sm">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </div>
  );
}
