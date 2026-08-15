import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  titulo: string;
  descripcion?: string;
};

export function EvalEstadoVacio({ icon, titulo, descripcion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0066cc]/10 text-[#0066cc] dark:bg-blue-400/15 dark:text-blue-400">
        {icon}
      </div>
      <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">{titulo}</p>
      {descripcion ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {descripcion}
        </p>
      ) : null}
    </div>
  );
}
