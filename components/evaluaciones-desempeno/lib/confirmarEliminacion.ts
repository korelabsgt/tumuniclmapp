import Swal from "sweetalert2";
import { opcionesSwalEval } from "./swal-eval";

const ESPERA_MS = 5000;

function esTemaOscuro(): boolean {
  return document.documentElement.classList.contains("dark");
}

function escHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function habilitarConfirmar(btn: HTMLButtonElement) {
  btn.disabled = false;
  btn.style.opacity = "1";
  btn.style.cursor = "pointer";
}

export async function confirmarEliminarEvaluacion(
  mensaje: string,
): Promise<boolean> {
  const oscuro = esTemaOscuro();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const tema = opcionesSwalEval();

  const result = await Swal.fire({
    ...tema,
    title: "¿Eliminar evaluación?",
    html: `<p id="swal-eval-msg" style="margin:0;font-size:1em;line-height:1.5;">${escHtml(mensaje)}</p>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: "#dc2626",
    customClass: {
      ...tema.customClass,
      htmlContainer: "!m-0 !mt-3",
      actions: "!mt-4",
      confirmButton:
        "!rounded-xl !px-5 !py-2.5 !text-sm !font-semibold !text-white !shadow-none",
    },
    didOpen: () => {
      const btn = Swal.getConfirmButton();
      const actions = Swal.getActions();
      const texto = Swal.getPopup()?.querySelector("#swal-eval-msg");
      if (!btn || !actions || !texto) return;

      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";

      const anchoTexto = Math.ceil(texto.getBoundingClientRect().width);
      const trackColor = oscuro ? "#3f3f46" : "#e4e4e7";

      const barra = document.createElement("div");
      barra.style.cssText = [
        `width:${anchoTexto}px`,
        "max-width:100%",
        "height:4px",
        `background:${trackColor}`,
        "border-radius:999px",
        "overflow:hidden",
        "margin:16px auto 0",
      ].join(";");

      const relleno = document.createElement("div");
      relleno.style.cssText =
        "width:100%;height:100%;background:#dc2626;border-radius:999px;";
      barra.appendChild(relleno);
      actions.parentElement?.insertBefore(barra, actions);

      requestAnimationFrame(() => {
        relleno.style.transition = `width ${ESPERA_MS}ms linear`;
        relleno.style.width = "0%";
      });

      timeoutId = setTimeout(() => {
        habilitarConfirmar(btn);
      }, ESPERA_MS);
    },
    willClose: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  });

  return result.isConfirmed;
}
