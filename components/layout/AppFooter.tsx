import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";

const APP_VERSION = "1.7.0";

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <CintilloInstitucional />
      <footer className="shrink-0 border-t border-zinc-200 bg-zinc-50 transition-colors dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-7xl px-4 pb-5 pt-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2.5 text-left">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Desarrollado por
                </p>
                <span className="inline-flex shrink-0 items-center rounded-md border border-[#0066cc]/30 bg-[#0066cc]/10 px-2 py-0.5 text-[10px] font-black tracking-[0.18em] text-[#0066cc] dark:border-blue-400/35 dark:bg-blue-400/10 dark:text-blue-400">
                  DMTI
                </span>
              </div>
              <p className="text-sm font-bold leading-snug text-foreground/90 sm:text-[15px]">
                Departamento Municipal de Tecnologías de la Información
              </p>
              <p className="text-xs text-muted-foreground">
                Liderado por{" "}
                <a
                  href="https://www.oscar27jimenez.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0066cc] transition-opacity hover:opacity-80 hover:underline dark:text-blue-400"
                >
                  Ing. Oscar Jiménez
                </a>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2.5 text-center sm:items-end sm:text-right">
              <p className="text-sm font-bold leading-snug text-foreground/90 sm:text-[15px]">
                © {year} Municipalidad de Concepción Las Minas
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  SIGEM -CLM-
                </span>
                <span className="inline-flex items-center rounded-full border border-[#0066cc]/25 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#0066cc] shadow-sm dark:border-blue-400/30 dark:bg-zinc-800/80 dark:text-blue-400">
                  v{APP_VERSION}
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
