# Guía de implementación: `components/imgs` (subir y eliminar fotografías)

En el módulo de permisos, `VerPermisos.tsx` no monta el uploader directamente: abre el modal `JustificacionPermiso.tsx`, que es quien integra `ImageUploader`. Ese es el patrón de referencia para replicar en otro sistema.

---

## Arquitectura del componente

El módulo vive en `components/imgs/` y consta de tres piezas:

| Archivo | Responsabilidad |
|---|---|
| `ImageUploader.tsx` | UI principal: preview, drag & drop, subida a Storage, eliminación, lupa |
| `ImageEditorModal.tsx` | Recorte, zoom y rotación antes de subir (`react-easy-crop`) |
| `cropImage.ts` | Utilidad pura: aplica recorte/rotación con `<canvas>` y devuelve un `File` |

**Dependencias npm necesarias:**

- `browser-image-compression` — comprime la imagen antes de subirla
- `react-easy-crop` — editor de recorte
- Cliente de Supabase (`@/utils/supabase/client`) para Storage

---

## Modelo de datos (clave para otro sistema)

El componente **no guarda la imagen en tu base de datos**. Solo guarda la **ruta relativa** dentro de un bucket de Supabase Storage.

Ejemplo en permisos:

- **Bucket:** `Permisos_empleados`
- **Columna en DB:** `comprobante_url` → valor como `1730123456789-abc12def.jpg`
- **Preview:** el uploader genera una **signed URL** temporal con `createSignedUrl(path, 3600)`

En otro sistema necesitas:

1. Un bucket de almacenamiento (S3, Supabase, GCS, etc.)
2. Una columna/campo que guarde solo el **path** del archivo
3. Una acción/API que actualice ese campo tras subir o eliminar

---

## API de `ImageUploader`

### Props

```tsx
<ImageUploader
  bucketName="Permisos_empleados"           // nombre del bucket en Supabase Storage
  currentImagePath={imgPath}                  // path guardado en DB, o null si no hay imagen
  onUploadSuccess={async (newPath) => { ... }} // se llama tras subir OK (recibe el nuevo path)
  onDeleteSuccess={async () => { ... }}       // se llama tras borrar OK del Storage
  disabled={false}                            // bloquea acciones mientras el padre guarda
  signedUrlExpiresIn={3600}                   // segundos de validez del preview (default 3600)
  aspect={3 / 4}                              // proporción del recorte
  aspectLabel="Vertical 3:4"                  // etiqueta en el editor
  permitirTodos={true}                        // si true, cualquier usuario autenticado puede subir
  botonesExternos={true}                      // oculta botones internos; el padre los controla con ref
  onEstadoChange={({ uploading, deleting }) => ...} // notifica estados de carga
  previewClassName="max-h-[250px]"            // clase CSS opcional para la preview
/>
```

### Ref imperativa (`ImageUploaderHandle`)

Cuando usas `botonesExternos`, controlas las acciones desde el padre:

```tsx
const uploaderRef = useRef<ImageUploaderHandle>(null);

uploaderRef.current?.openGallery();   // abre selector de archivos
uploaderRef.current?.openCamera();   // abre cámara (móvil)
uploaderRef.current?.deleteImage();   // elimina (pide confirmación con confirm())

// Propiedades de lectura:
uploaderRef.current?.tieneImagen   // boolean
uploaderRef.current?.puedeSubir    // boolean (según rol o permitirTodos)
uploaderRef.current?.uploading
uploaderRef.current?.deleting
uploaderRef.current?.isProcessing
```

---

## Flujo completo de subida

```
Usuario selecciona imagen (galería / cámara / drag & drop)
        ↓
Validación de tipo: solo JPG, PNG, WebP
        ↓
Se abre ImageEditorModal (recorte + zoom + rotación)
        ↓
Usuario pulsa "Aplicar y subir"
        ↓
cropImage.ts genera un File recortado
        ↓
browser-image-compression → JPEG ≤ 0.1 MB, máx 1024px
        ↓
Se genera nombre único: {timestamp}-{random}.jpg
        ↓
supabase.storage.from(bucket).upload(newPath, blob)
        ↓
Si ya había imagen anterior → storage.remove([currentImagePath])
        ↓
onUploadSuccess(newPath)  ← el PADRE persiste el path en la DB
```

**Importante:** la subida al Storage la hace el componente; **persistir el path en tu tabla** es responsabilidad del padre en `onUploadSuccess`.

---

## Flujo completo de eliminación

```
Usuario pulsa Eliminar
        ↓
confirm("¿Estás seguro de eliminar esta imagen?")
        ↓
supabase.storage.from(bucket).remove([currentImagePath])
        ↓
onDeleteSuccess()  ← el PADRE pone null en la columna de la DB
```

El componente borra el archivo del Storage; el padre debe limpiar el campo en la base de datos.

---

## Implementación de referencia: permisos

### 1. Estado en el modal padre (`JustificacionPermiso.tsx`)

```tsx
const BUCKET = "Permisos_empleados";
const uploaderRef = useRef<ImageUploaderHandle>(null);
const [imgPath, setImgPath] = useState<string | null>(permiso?.comprobante_url ?? null);

// Sincronizar cuando cambia el registro
useEffect(() => {
  setImgPath(permiso?.comprobante_url ?? null);
}, [permiso?.id, permiso?.comprobante_url]);
```

### 2. Persistencia en DB (server action)

```tsx
const guardarPath = async (path: string | null) => {
  setGuardando(true);
  try {
    await actualizarComprobantePermiso(permiso.id, path);
    setImgPath(path);
    toast.success(path ? "Comprobante guardado." : "Comprobante eliminado.");
    await onSaved?.(); // refrescar listado
  } finally {
    setGuardando(false);
  }
};
```

La action en servidor hace un `UPDATE` simple:

```ts
await supabase
  .from("permisos_empleado")
  .update({ comprobante_url: path })
  .eq("id", permisoId);
```

### 3. Montaje del uploader con botones externos

```tsx
<ImageUploader
  ref={uploaderRef}
  bucketName={BUCKET}
  currentImagePath={imgPath}
  onUploadSuccess={async (path) => { await guardarPath(path); }}
  onDeleteSuccess={async () => { await guardarPath(null); }}
  disabled={guardando}
  aspect={3 / 4}
  permitirTodos
  botonesExternos
  onEstadoChange={({ uploading, deleting }) => {
    setSubiendo(uploading);
    setEliminando(deleting);
  }}
/>
```

### 4. Botones en el footer del modal (controlados por ref)

```tsx
{tieneImagen ? (
  <button onClick={() => uploaderRef.current?.deleteImage()}>Eliminar</button>
) : (
  <>
    <button onClick={() => uploaderRef.current?.openGallery()}>Galería</button>
    <button onClick={() => uploaderRef.current?.openCamera()}>Cámara</button>
  </>
)}
```

### 5. Cómo se abre desde la lista (`VerPermisos.tsx`)

En la tabla de permisos hay un botón **Justificación** por fila:

- Si `permiso.comprobante_url` existe → icono de ojo (ver/editar comprobante)
- Si no existe → icono de upload (subir comprobante)

Al hacer clic se abre `JustificacionPermiso` pasando el permiso seleccionado.

---

## Dos modos de UI

### Modo A — Botones internos (`botonesExternos={false}`, default)

El componente muestra dentro de su área:

- Zona de arrastrar y soltar
- Botones **Galería** y **Cámara** (si no hay imagen)
- Botón **Eliminar** (si hay imagen)

Usado en: `CrearInventarioModal.tsx` (formulario de creación).

### Modo B — Botones externos (`botonesExternos={true}`)

El uploader solo muestra la preview (o zona vacía con mensaje). Los botones van en el footer del modal padre vía `ref`.

Usado en: `JustificacionPermiso.tsx`, `InventarioImgModal.tsx`.

---

## Permisos de subida

Por defecto solo pueden subir usuarios con rol `SUPER`, `ADMINISTRADOR` o `SECRETARIO`.

Con `permitirTodos={true}` cualquier usuario autenticado puede subir (caso permisos: el empleado sube su propio comprobante).

---

## Otros usos en el proyecto

| Módulo | Archivo | Bucket |
|---|---|---|
| Permisos | `components/permisos/modals/JustificacionPermiso.tsx` | `Permisos_empleados` |
| Inventario | `components/inventario/modals/InventarioImgModal.tsx` | `inventario-imgs` |
| Inventario (crear) | `components/inventario/modals/CrearInventarioModal.tsx` | `inventario-imgs` |
| Inventario (baja/traslado) | `BajaModal.tsx`, `TrasladoModal.tsx`, `DetalleInventarioModal.tsx` | `inventario-imgs` |
| Fertilizante | `components/fertilizante/GestionBeneficiarioImgModal.tsx` | según módulo |

---

## Checklist para implementarlo en otro sistema

1. **Copiar** `components/imgs/` (los 3 archivos) y las dependencias npm.
2. **Crear un bucket** en tu storage con políticas RLS/permisos de lectura/escritura.
3. **Agregar columna** en tu entidad (ej. `imagen_url`, `comprobante_url`) tipo `text nullable`.
4. **Crear server action / endpoint** que haga `UPDATE entidad SET campo = path WHERE id = ?`.
5. **Montar `ImageUploader`** en un modal o formulario:
   - `currentImagePath` ← valor de la DB
   - `onUploadSuccess` → guardar nuevo path en DB
   - `onDeleteSuccess` → poner `null` en DB
6. **Sincronizar estado local** con `useState` + `useEffect` cuando cambie el registro.
7. **Refrescar listado** en `onSaved` / invalidar query tras guardar.
8. **Opcional:** usar `botonesExternos` si quieres botones en el footer del modal como en permisos.

---

## Plantilla mínima para copiar

### Tipos

```ts
interface RegistroConImagen {
  id: string;
  imagen_url: string | null;
}
```

### Server action

```ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function actualizarImagenRegistro(
  registroId: string,
  path: string | null,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("mi_tabla")
    .update({ imagen_url: path })
    .eq("id", registroId);

  if (error) {
    throw new Error(`Error al actualizar imagen: ${error.message}`);
  }

  revalidatePath("/ruta-del-modulo");
  return { path };
}
```

### Modal padre

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ImageUploader, { ImageUploaderHandle } from "@/components/imgs/ImageUploader";
import { actualizarImagenRegistro } from "./acciones";
import { toast } from "react-toastify";

const BUCKET = "mi-bucket";

export default function ModalImagen({ registro, isOpen, onClose, onSaved }) {
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  const [imgPath, setImgPath] = useState<string | null>(registro?.imagen_url ?? null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setImgPath(registro?.imagen_url ?? null);
  }, [registro?.id, registro?.imagen_url]);

  if (!isOpen || !registro) return null;

  const guardarPath = async (path: string | null) => {
    setGuardando(true);
    try {
      await actualizarImagenRegistro(registro.id, path);
      setImgPath(path);
      toast.success(path ? "Imagen guardada." : "Imagen eliminada.");
      await onSaved?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar.";
      toast.error(message);
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <ImageUploader
        ref={uploaderRef}
        bucketName={BUCKET}
        currentImagePath={imgPath}
        onUploadSuccess={guardarPath}
        onDeleteSuccess={() => guardarPath(null)}
        disabled={guardando}
        permitirTodos
        botonesExternos
      />

      {imgPath ? (
        <button type="button" onClick={() => uploaderRef.current?.deleteImage()}>
          Eliminar
        </button>
      ) : (
        <>
          <button type="button" onClick={() => uploaderRef.current?.openGallery()}>
            Galería
          </button>
          <button type="button" onClick={() => uploaderRef.current?.openCamera()}>
            Cámara
          </button>
        </>
      )}

      <button type="button" onClick={onClose}>Cerrar</button>
    </div>
  );
}
```

---

## Resumen de responsabilidades

| Capa | Hace |
|---|---|
| `ImageUploader` | Selección, recorte, compresión, upload/delete en Storage, preview con signed URL |
| Modal padre | Estado local `imgPath`, UI del modal, botones externos, toasts |
| Server action | Persistir o limpiar el path en la base de datos |
| Vista lista (`VerPermisos`) | Botón que abre el modal; indicador visual si ya hay imagen |
