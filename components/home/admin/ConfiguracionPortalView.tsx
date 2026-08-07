'use client';

import React, { useState, useRef, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Type, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import ImageUploader, { type ImageUploaderHandle } from '@/components/imgs/ImageUploader';
import { guardarConfiguracionPortal, getConfiguracionPortal, type ConfiguracionPortal } from '@/components/home/lib/actions';

interface Props {
  configuracionInicial: ConfiguracionPortal | null;
}

export function ConfiguracionPortalView({ configuracionInicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [eslogan, setEslogan] = useState(configuracionInicial?.eslogan ?? '');
  const [portadaPath, setPortadaPath] = useState(configuracionInicial?.portada_url ?? '');
  const [logoPath, setLogoPath] = useState(configuracionInicial?.logo_url ?? '');
  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const portadaRef = useRef<ImageUploaderHandle>(null);
  const logoRef = useRef<ImageUploaderHandle>(null);

  // Recargar la config por si cambió
  useEffect(() => {
    getConfiguracionPortal().then(cfg => {
      setEslogan(cfg?.eslogan ?? '');
      setPortadaPath(cfg?.portada_url ?? '');
      setLogoPath(cfg?.logo_url ?? '');
    });
  }, []);

  const estaSubiendo = subiendoPortada || subiendoLogo;
  const estaOcupado = isPending || estaSubiendo;

  function handleGuardar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('eslogan', eslogan);
      fd.append('portada_url', portadaPath);
      fd.append('logo_url', logoPath);

      const result = await guardarConfiguracionPortal(fd);
      if (result.success) {
        toast.success('¡Configuración guardada exitosamente!');
        router.refresh(); // Refrescar para que el header/hero público vean los cambios
      } else {
        toast.error(`Error al guardar: ${result.error}`);
      }
    });
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">

        {/* Columna Izquierda: Eslogan + Portada */}
        <div className="px-6 py-6 space-y-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-neutral-700">
          
          {/* Eslogan */}
          <section className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Type className="w-4 h-4 text-[#02245b]" />
              Eslogan de Portada
            </label>
            <textarea
              value={eslogan}
              onChange={(e) => setEslogan(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Ej: ¡Hoy! Concepción Avanza"
              disabled={estaOcupado}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#02245b] resize-none transition-colors text-sm"
            />
            <p className="text-xs text-gray-400 text-right">{eslogan.length}/200</p>
          </section>

          {/* Imagen de Portada */}
          <section className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <ImageIcon className="w-4 h-4 text-[#02245b]" />
              Imagen de Portada
              <span className="text-xs font-normal text-gray-400">(16:9 recomendado)</span>
            </label>
            <ImageUploader
              ref={portadaRef}
              bucketName="home_imagenes"
              folderPath="portadas"
              currentImagePath={portadaPath || null}
              permitirTodos={true}
              aspect={16 / 9}
              aspectLabel="Panorámica 16:9"
              maxSizeMB={0.5}
              previewClassName="max-h-[220px] rounded-lg w-full object-cover"
              onUploadSuccess={(path) => {
                setPortadaPath(path);
                toast.success('Imagen de portada lista ✓');
              }}
              onDeleteSuccess={() => setPortadaPath('')}
              onEstadoChange={(estado) => setSubiendoPortada(estado.uploading || estado.deleting)}
            />
          </section>
        </div>

        {/* Columna Derecha: Logo */}
        <div className="px-6 py-6 space-y-6">
          <section className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <ImageIcon className="w-4 h-4 text-[#02245b]" />
              Logo Municipal
              <span className="text-xs font-normal text-gray-400">(16:9 recomendado)</span>
            </label>
            <ImageUploader
              ref={logoRef}
              bucketName="home_imagenes"
              folderPath="logos"
              currentImagePath={logoPath || null}
              permitirTodos={true}
              aspect={16 / 9}
              aspectLabel="Panorámica 16:9"
              maxSizeMB={0.5}
              onUploadSuccess={(path) => {
                setLogoPath(path);
                toast.success('Logo listo ✓');
              }}
              onDeleteSuccess={() => setLogoPath('')}
              onEstadoChange={(estado) => setSubiendoLogo(estado.uploading || estado.deleting)}
            />
          </section>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 shrink-0 flex items-center justify-end bg-gray-50 dark:bg-neutral-900/80 rounded-b-2xl">
        <button
          onClick={handleGuardar}
          disabled={estaOcupado}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#02245b] hover:bg-blue-900 disabled:bg-blue-400 text-white font-semibold transition-colors text-sm"
        >
          {isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : <><Save className="w-4 h-4" /> Guardar cambios</>
          }
        </button>
      </div>
    </div>
  );
}
