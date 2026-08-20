'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import imageCompression from 'browser-image-compression';
import ImageEditorModal from './ImageEditorModal';
import { Loader2, Upload, Camera, Trash2 } from 'lucide-react';
import useUserData from '@/hooks/sesion/useUserData';

export interface ImageUploaderHandle {
  openGallery: () => void;
  openCamera: () => void;
  deleteImage: () => Promise<void>;
  isProcessing: boolean;
  uploading: boolean;
  deleting: boolean;
  tieneImagen: boolean;
  puedeSubir: boolean;
}

interface ImageUploaderProps {
  bucketName: string;
  folderPath?: string; // Ej: 'portadas' o 'logos/municipio_1'
  currentImagePath: string | null;
  onUploadSuccess: (newPath: string) => void | Promise<void>;
  onDeleteSuccess: () => void | Promise<void>;
  disabled?: boolean;
  signedUrlExpiresIn?: number;
  /** Aspect ratio for the crop editor (default: 3/4 portrait) */
  aspect?: number;
  aspectLabel?: string;
  /** Si es true, ignora el chequeo de rol y permite subir a cualquier autenticado */
  permitirTodos?: boolean;
  /** Oculta botones internos; usar ref para controlarlos desde el padre */
  botonesExternos?: boolean;
  onEstadoChange?: (estado: { uploading: boolean; deleting: boolean }) => void;
  /** Clase CSS adicional para la vista previa de la imagen (ej. max-h-[250px]) */
  previewClassName?: string;
  /** Límite de tamaño máximo en MB para la compresión (default: 0.2 MB) */
  maxSizeMB?: number;
  /** Máxima anchura o altura en píxeles (default: 1920) */
  maxWidthOrHeight?: number;
  /** Si es true, fuerza la conversión de la imagen a WebP sin importar su tipo original */
  forceWebp?: boolean;
}

const ImageUploader = forwardRef<ImageUploaderHandle, ImageUploaderProps>(function ImageUploader({
  bucketName,
  folderPath = '',
  currentImagePath,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
  signedUrlExpiresIn = 3600,
  aspect = 3 / 4,
  aspectLabel = 'Vertical 3:4',
  permitirTodos = false,
  botonesExternos = false,
  onEstadoChange,
  previewClassName,
  maxSizeMB = 0.2,
  maxWidthOrHeight = 1920,
  forceWebp = false,
}, ref) {
  const supabase = createClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const { rol } = useUserData();
  const tienePermisoSubir = permitirTodos || rol === 'SUPER' || rol === 'ADMINISTRADOR' || rol === 'SECRETARIO';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [magnifier, setMagnifier] = useState<{ show: boolean; clientX: number; clientY: number; bgX: number; bgY: number }>({ show: false, clientX: 0, clientY: 0, bgX: 0, bgY: 0 });
  const MAGNIFIER_SIZE = 250;
  const ZOOM_LEVEL = 2.5;

  const updateMagnifier = (clientX: number, clientY: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const bgX = (x / rect.width) * 100;
    const bgY = (y / rect.height) * 100;
    setMagnifier({ show: true, clientX, clientY, bgX, bgY });
  };

  // Generar URL pública para el preview (en lugar de signedUrl porque la carpeta es pública)
  useEffect(() => {
    if (!currentImagePath) {
      setPreviewUrl(null);
      return;
    }

    setLoadingPreview(true);
    // Armar la URL pública directa
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${currentImagePath}`;
    setPreviewUrl(publicUrl);
    setLoadingPreview(false);
  }, [currentImagePath, bucketName]);

  const [fileQueue, setFileQueue] = useState<File[]>([]);

  const handleFilesSelected = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    
    if (validFiles.length > 10) {
      alert('Se limitó la selección a 10 imágenes máximo por lote.');
      validFiles.splice(10);
    }
    
    if (validFiles.length > 0) {
      const [first, ...rest] = validFiles;
      setEditingFile(first);
      setFileQueue(rest);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFilesSelected(e.target.files);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tienePermisoSubir || isProcessing || currentImagePath) return;
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tienePermisoSubir || isProcessing || currentImagePath) return;
    // Necesario para permitir el drop
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragging(false);
    
    if (!tienePermisoSubir || isProcessing || currentImagePath) return;
    if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
  };

  const buildUniqueName = (ext: string) => {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}-${rand}.${ext}`;
    
    if (folderPath) {
      // Remover slashes iniciales/finales para evitar dobles slashes
      const cleanFolder = folderPath.replace(/^\/+|\/+$/g, '');
      return `${cleanFolder}/${fileName}`;
    }
    return fileName;
  };

  const uploadEditedFile = async (editedFile: File) => {
    setUploading(true);
    setEditingFile(null);
    try {
      const outputType = forceWebp ? 'image/webp' :
                         (editedFile.type === 'image/png' ? 'image/png' : 
                         editedFile.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
      
      let ext = forceWebp ? 'webp' : outputType.split('/')[1];
      if (ext === 'jpeg') ext = 'jpg';

      const compressed = await imageCompression(editedFile, {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        fileType: outputType,
      });

      const newPath = buildUniqueName(ext);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(newPath, compressed, { upsert: false, contentType: outputType });

      if (uploadError) throw uploadError;

      // 4. Borrar anterior si existe
      if (currentImagePath) {
        await supabase.storage.from(bucketName).remove([currentImagePath]);
      }

      // 5. Callback
      await onUploadSuccess(newPath);

      // 6. Procesar la siguiente en la cola
      if (fileQueue.length > 0) {
        const [next, ...rest] = fileQueue;
        setFileQueue(rest);
        setTimeout(() => setEditingFile(next), 100);
      }
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      alert('Error al subir la imagen: ' + (err?.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImagePath) return;
    const confirmar = confirm('¿Estás seguro de eliminar esta imagen?');
    if (!confirmar) return;

    setDeleting(true);
    try {
      await supabase.storage.from(bucketName).remove([currentImagePath]);
      await onDeleteSuccess();
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar: ' + (err?.message || ''));
    } finally {
      setDeleting(false);
    }
  };

  const isProcessing = uploading || deleting || disabled;

  useEffect(() => {
    onEstadoChange?.({ uploading, deleting });
  }, [uploading, deleting, onEstadoChange]);

  useImperativeHandle(ref, () => ({
    openGallery: () => fileInputRef.current?.click(),
    openCamera: () => cameraInputRef.current?.click(),
    deleteImage: handleDelete,
    isProcessing,
    uploading,
    deleting,
    tieneImagen: !!currentImagePath,
    puedeSubir: tienePermisoSubir,
  }), [isProcessing, uploading, deleting, currentImagePath, tienePermisoSubir]);

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div 
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={
          botonesExternos
            ? `flex flex-col items-center transition-colors ${
                currentImagePath
                  ? 'w-full'
                  : isDragging
                    ? 'border-2 border-dashed border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20 rounded-xl py-10 px-4'
                    : 'border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-xl py-10 px-4'
              }`
            : `border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-3 transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800/50'
              }`
        }
      >
        {/* Preview o placeholder */}
        {currentImagePath ? (
          loadingPreview ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : previewUrl ? (
            <div className={botonesExternos ? 'w-full' : 'w-full flex justify-center'}>
              <div 
                className={`relative ${botonesExternos ? 'w-full cursor-zoom-in' : 'inline-block cursor-zoom-in'}`}
                onMouseMove={(e) => updateMagnifier(e.clientX, e.clientY)}
                onMouseLeave={() => setMagnifier(m => ({ ...m, show: false }))}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  if (!touch) return;
                  updateMagnifier(touch.clientX, touch.clientY);
                }}
                onTouchEnd={() => setMagnifier(m => ({ ...m, show: false }))}
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Vista previa"
                  className={
                    botonesExternos
                      ? 'w-full max-h-[calc(95vh-11rem)] object-contain select-none block'
                      : `${previewClassName || 'max-h-[460px]'} object-contain rounded-lg shadow-md select-none`
                  }
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500 italic">
              No se pudo cargar la vista previa.
            </p>
          )
        ) : null}

        {!currentImagePath && !uploading && !botonesExternos && (
          <div className="text-center pointer-events-none">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Arrastra una imagen o selecciona una opción
            </p>
          </div>
        )}

        {!botonesExternos && (
        <div className="flex gap-2 flex-wrap justify-center">
          {tienePermisoSubir && (
            <>
              {!currentImagePath && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Galería
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Camera size={14} />
                    Cámara
                  </button>
                </>
              )}

              {currentImagePath && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Eliminar
                </button>
              )}
            </>
          )}
        </div>
        )}

        {!currentImagePath && !uploading && !botonesExternos && (
          <p className="text-[10px] text-gray-400">JPG · PNG · WEBP</p>
        )}
        {!currentImagePath && !uploading && botonesExternos && (
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
            Selecciona una imagen desde el pie del modal
          </p>
        )}
      </div>

      {/* Image Editor Modal */}
      {editingFile && (
        <ImageEditorModal
          file={editingFile}
          aspect={aspect}
          aspectLabel={aspectLabel}
          onApply={uploadEditedFile}
          onCancel={() => {
            setEditingFile(null);
            setFileQueue([]);
          }}
        />
      )}

      {magnifier.show && previewUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed rounded-full border-4 border-white shadow-2xl pointer-events-none z-[9999]"
          style={{
            width: MAGNIFIER_SIZE,
            height: MAGNIFIER_SIZE,
            left: magnifier.clientX - MAGNIFIER_SIZE / 2,
            top: magnifier.clientY - MAGNIFIER_SIZE / 2,
            backgroundImage: `url(${previewUrl})`,
            backgroundSize: `${(imgRef.current?.width || 300) * ZOOM_LEVEL}px ${(imgRef.current?.height || 400) * ZOOM_LEVEL}px`,
            backgroundPosition: `${magnifier.bgX}% ${magnifier.bgY}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />,
        document.body
      )}
    </>
  );
});

export default ImageUploader;
