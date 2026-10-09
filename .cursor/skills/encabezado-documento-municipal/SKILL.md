---
name: encabezado-documento-municipal
description: >-
  Implementa el encabezado institucional de documentos PDF/imagen de la
  Municipalidad de Concepción Las Minas (logo, título centrado, teléfonos,
  cintillo). Usar al crear informes, fichas, vouchers o exportaciones con
  membrete municipal, oficio Guatemala o html-to-image/jspdf.
---

# Encabezado de documento municipal

Patrón canónico para **documentos exportables** (no para el chrome del modal). Referencia: `components/admin/dependencias/GeneradorFicha.tsx` (`EncabezadoFichaInstitucional`).

## Layout

```
[ Logo izquierda ]  [ Bloque centrado: título + contacto + cintillo ]
```

- Logo: `/images/logo-muni.png`, `crossOrigin="anonymous"`, altura ~110px en ficha oficio (`LOGO_ALTO_PX = 110`)
- Título centrado: **Municipalidad de Concepción Las Minas**, color `#0066cc`, peso 800, ~20px
- Subtítulo centrado: `Departamento de Chiquimula, Guatemala C.A. | TEL: 7943-5619 - CEL: 4790-2524`, color `#2563eb`, ~11px, `font-weight: 700`
- Cintillo: solo en el **documento**, con `CintilloInstitucional` (`animated={false}`, `className="mt-2 h-[5px] w-[88%] rounded-full"`). **No** poner cintillo en el header del modal de vista previa.

## Componente React (plantilla)

```tsx
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";

const LOGO_ALTO_PX = 110;

function EncabezadoFichaInstitucional() {
  return (
    <div className="mb-3 flex items-center gap-3">
      <img
        src="/images/logo-muni.png"
        alt="Logo Municipalidad"
        crossOrigin="anonymous"
        style={{
          height: LOGO_ALTO_PX,
          width: "auto",
          maxHeight: LOGO_ALTO_PX,
          objectFit: "contain",
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <p style={{ color: "#0066cc", fontSize: 20, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
          Municipalidad de Concepción Las Minas
        </p>
        <p style={{ color: "#2563eb", fontSize: 11, fontWeight: 700, lineHeight: 1.3, margin: "6px 0 0 0", maxWidth: "100%" }}>
          Departamento de Chiquimula, Guatemala C.A. | TEL: 7943-5619 - CEL: 4790-2524
        </p>
        <CintilloInstitucional animated={false} className="mt-2 h-[5px] w-[88%] rounded-full" />
      </div>
    </div>
  );
}
```

## Variante con correlativo (informes legacy)

Tres columnas: logo ~30%, bloque centrado ~55%, número correlativo derecha. Ver `InformeEntregaCupones.tsx`. Cintillo puede ser segmentos `bg-[#204184]` → `#c2dafb` si el documento no usa el componente React.

## PDF nativo (jsPDF)

Usar `components/combustible/entregaCupon/lib/encabezadoMunicipalPdf.ts`:

- `cargarLogoMunicipal()` — logo desde origin
- `dibujarCintilloAzul(doc, x, y, width)` — 4 segmentos azules
- `dibujarEncabezadoMunicipalPdf(doc, logo, opts)` — bloque completo

## Tamaño oficio Guatemala

- Papel: **8.5 × 13 in** (`OFICIO_IN = [8.5, 13]`)
- Canvas HTML a 96 dpi: **816 × 1248 px** (`OFICIO_PX`)

## Captura para PDF/JPG (html-to-image)

Evitar capturar el nodo escalado en pantalla (sale pixelado).

1. Clonar el nodo del documento a un host fuera de vista (`left: -10000px`), tamaño fijo 816×1248, `transform: none`
2. `toJpeg` con `quality: 1`, `pixelRatio: 3`, `skipAutoScale: true`, `width`/`height` oficio
3. `jsPDF` con `format: [8.5, 13]` y `addImage` a página completa
4. Eliminar el host al terminar

## Tablas bajo el encabezado

- `table-fixed` + `<colgroup>` 22% / 78%
- Valores largos (puesto, ubicación): `break-words`, `[overflow-wrap:anywhere]`; no desbordar horizontalmente
- Encabezados de sección: fondo `#0066cc`, texto blanco

## Checklist

- [ ] Cintillo solo en el documento exportado, no en UI del modal
- [ ] Título y teléfonos centrados en el bloque derecho
- [ ] Logo legible (no menor a ~72px en oficio)
- [ ] Exportación desde nodo a tamaño real, no desde preview escalada
- [ ] Formato oficio Guatemala 8.5×13
