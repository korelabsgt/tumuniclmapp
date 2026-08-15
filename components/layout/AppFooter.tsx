import { CHROME_BG_CLASS } from "@/components/layout/chrome";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";

const APP_VERSION = "1.7.0";

const BADGE_CLASS =
  "inline-flex shrink-0 items-center rounded-md border border-[#0066cc]/30 bg-[#0066cc]/10 px-1.5 py-px text-[9px] font-black tracking-[0.14em] text-[#0066cc] dark:border-blue-400/35 dark:bg-blue-400/10 dark:text-blue-400 sm:px-2 sm:py-0.5 sm:text-[10px] sm:tracking-[0.18em]";

function PoweredByLink() {
  return (
    <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs">
      Powered by{" "}
      <a
        href="https://www.oscar27jimenez.com"
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-[#0066cc] transition-opacity hover:opacity-80 hover:underline dark:text-blue-400"
      >
        Ing. Oscar Jiménez
      </a>
    </p>
  );
}

function SigemVersion() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.2em]">
        SIGEM -CLM-
      </span>
      <span className={BADGE_CLASS}>v{APP_VERSION}</span>
    </div>
  );
}

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <CintilloInstitucional className="!h-1 sm:!h-2" />
      <footer
        className={`shrink-0 border-t border-gray-200 transition-colors dark:border-zinc-700 ${CHROME_BG_CLASS}`}
      >
        <div className="w-full px-3 pb-3 pt-2.5 sm:px-6 sm:py-6">
          <div className="flex flex-col items-center gap-1.5 text-center sm:hidden">
            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Desarrollado por
              </span>
              <span className={BADGE_CLASS}>DMTI</span>
            </div>

            <p className="text-[10px] font-bold leading-snug text-foreground/90">
              Departamento Municipal de Tecnologías de la Información
            </p>

            <p className="text-[10px] font-bold leading-snug text-foreground/90">
              © {year} Municipalidad de Concepción Las Minas
            </p>

            <div className="flex w-full items-center justify-between gap-2 pt-0.5">
              <p className="min-w-0 text-left text-[10px] leading-snug text-muted-foreground">
                Powered by{" "}
                <a
                  href="https://www.oscar27jimenez.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0066cc] transition-opacity hover:opacity-80 hover:underline dark:text-blue-400"
                >
                  Ing. Oscar Jiménez
                </a>
              </p>
              <SigemVersion />
            </div>
          </div>

          <div className="hidden items-end justify-between gap-6 sm:flex">
            <div className="flex min-w-0 flex-col items-start gap-2.5 text-left">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Desarrollado por
                </span>
                <span className={BADGE_CLASS}>DMTI</span>
              </div>
              <p className="text-[15px] font-bold leading-snug text-foreground/90">
                Departamento Municipal de Tecnologías de la Información
              </p>
              <PoweredByLink />
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2.5 text-right">
              <p className="text-[15px] font-bold leading-snug text-foreground/90">
                © {year} Municipalidad de Concepción Las Minas
              </p>
              <SigemVersion />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
