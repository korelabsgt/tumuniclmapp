---
name: diseno-ux-ui
description: >-
  Aplica el diseño UX/UI institucional de SIGEM (zinc, acento #0066cc, modales
  ModalShell, toastify). Usar al crear o editar UI, formularios, modales,
  notificaciones, cards, botones o estilos visuales en este repositorio.
---

# Diseño UX/UI

Referencia principal: `components/login/Form.tsx`. UI limpia con superficies zinc y acento `#0066cc` (`dark:text-blue-400`). Sin bordes gruesos celestes, sin magic card ni bordes animados.

## Color de acento

- Títulos y acentos: `text-[#0066cc] dark:text-blue-400`
- Focus: `focus-visible:ring-1 focus-visible:ring-[#0066cc]` / `dark:focus-visible:ring-blue-400`
- Cintillo: `CintilloInstitucional` en login, modales y vistas principales de módulo
- Prohibido como base: `#1a95d3`, `border-2 border-celeste-trifinio`, gradientes radiales animados

## Tema y fondos

- Claro: página blanca; cards `zinc-50`, layout `zinc-100`
- Oscuro: página `zinc-900`; cards `zinc-800`
- Evitar negro/blanco puros fuera de inputs puntuales

## Cards

```
rounded-3xl border border-zinc-200 bg-zinc-50 shadow-xl
dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-black/50
```

- Ítems lista: `rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50`
- Vacíos: paleta zinc, `text-muted-foreground`

## Campos

```
h-12 rounded-xl border border-zinc-300 bg-white px-4 text-sm
focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-0
dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus-visible:ring-blue-400
```

- Labels: `text-sm font-semibold text-zinc-800 dark:text-white`
- Textareas: `min-h-[88px]`, `rounded-xl`
- Tabs activas: zinc + ring sutil; sin `border-2` celeste

## Botones

Primario:

```
h-12 rounded-xl bg-zinc-200 px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-300
dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600
```

Secundario:

```
h-12 rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50
dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800
```

Destructivo: borde rojo fino; siempre `cursor-pointer`; deshabilitado `cursor-not-allowed disabled:opacity-50`.

Reutilizar `MODAL_*_CLASS` de `components/ui/general-modal.tsx` o tokens del módulo (`lib/ui.ts`).

## Pestañas

- Pills `rounded-xl`
- Activa: `bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white`
- Inactiva: `text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80`

## Modales (`components/ui/general-modal.tsx`)

- `ModalShell`, `ModalInput`, `ModalLabel`, `ModalTextarea`, `ModalSelect`, `ModalSubmit`, `ModalCancel`, `ModalFooter`, `ModalConfirmDelete`
- Portal `createPortal`, `z-[200]`, bloquear scroll del `body`
- Escritorio: centrado `max-w-2xl`, `sm:p-4`
- Teléfono: `100dvh`, panel zinc borde a borde
- Overlay escritorio: `bg-zinc-700/20 backdrop-blur-sm`; teléfono: zinc sólido sin blur
- Panel: `rounded-3xl`, borde zinc, `shadow-xl`; sin borde animado
- Header: título acento, `CintilloInstitucional` bajo el título, cierre X zinc
- Footer: `ModalCancel` + `ModalSubmit`; primario zinc
- Feedback: `toast` + `modalActionMessage`; destructivas: `ModalConfirmDelete`

### Prohibido en modales

- `Dialog` shadcn u otros modales ad hoc para formularios del sistema
- SweetAlert con `ModalShell`
- Magic card, `border-2` celeste, `ToastContainer` duplicado

## Toastify

- Contenedor único: `ObsToastContainer` en layout (`position="top-center"`, `autoClose={3000}`, `theme="colored"`)
- Uso: `import { toast } from "react-toastify"` → `toast.success` / `error` / `warn`
- API: `modalActionMessage` desde `modal-toast.ts`
- Estilo en `globals.css` (`--toastify-*`); fondo sólido, sin sombra
- SweetAlert solo legacy fuera de `ModalShell`
