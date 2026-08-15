import Swal from "sweetalert2";

export function esTemaOscuroEval(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function opcionesSwalEval() {
  const oscuro = esTemaOscuroEval();
  return {
    background: oscuro ? "#27272a" : "#fafafa",
    color: oscuro ? "#fafafa" : "#18181b",
    backdrop: oscuro ? "rgba(0,0,0,0.65)" : "rgba(24,24,27,0.25)",
    customClass: {
      popup: "!rounded-3xl !border !border-zinc-200 dark:!border-zinc-700",
      title: "!text-lg !font-bold !text-[#0066cc] dark:!text-blue-400",
      htmlContainer: "!m-0 !mt-2 !text-sm !leading-relaxed",
      actions: "!mt-5",
      confirmButton:
        "!rounded-xl !px-5 !py-2.5 !text-sm !font-semibold !text-zinc-900 dark:!text-white !shadow-none",
      cancelButton:
        "!rounded-xl !px-5 !py-2.5 !text-sm !font-semibold !text-zinc-800 dark:!text-zinc-100 !shadow-none",
    },
    confirmButtonColor: oscuro ? "#52525b" : "#e4e4e7",
    cancelButtonColor: oscuro ? "#3f3f46" : "#e4e4e7",
  } as const;
}

export async function swalExitoEvaluacion(
  titulo: string,
  mensaje: string,
): Promise<void> {
  await Swal.fire({
    ...opcionesSwalEval(),
    title: titulo,
    text: mensaje,
    icon: "success",
    confirmButtonText: "Entendido",
  });
}
