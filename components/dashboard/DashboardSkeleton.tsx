export default function DashboardSkeleton() {
  return (
    <section className="mx-auto w-full animate-pulse px-4 pt-2 md:px-8">
      <div className="mx-auto mb-6 grid w-full max-w-lg grid-cols-3 justify-items-center gap-2.5 sm:flex sm:w-auto sm:gap-3">
        <div className="flex h-[3.25rem] overflow-hidden rounded-xl border border-orange-200/80 dark:border-orange-900/40">
          <div className="w-[4.25rem] shrink-0 bg-orange-100/80 dark:bg-orange-950/30" />
          <div className="flex items-center bg-orange-50/60 px-3 dark:bg-orange-950/15">
            <div className="h-3 w-14 rounded-md bg-orange-200/70 dark:bg-orange-900/40" />
          </div>
        </div>
        <div className="flex h-[3.25rem] overflow-hidden rounded-xl border border-green-200/80 dark:border-green-900/40">
          <div className="w-[4.25rem] shrink-0 bg-green-100/80 dark:bg-green-950/30" />
          <div className="flex items-center bg-green-50/60 px-3 dark:bg-green-950/15">
            <div className="h-3 w-16 rounded-md bg-green-200/70 dark:bg-green-900/40" />
          </div>
        </div>
        <div className="flex h-[3.25rem] overflow-hidden rounded-xl border border-purple-200/80 dark:border-purple-900/40">
          <div className="w-[4.25rem] shrink-0 bg-purple-100/80 dark:bg-purple-950/30" />
          <div className="flex items-center bg-purple-50/60 px-3 dark:bg-purple-950/15">
            <div className="h-3 w-16 rounded-md bg-purple-200/70 dark:bg-purple-900/40" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-10 md:grid-cols-2 md:gap-y-0">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-blue-600/70 dark:bg-blue-500/70" />
              <div className="h-3 w-40 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80" />
              <div className="h-0.5 flex-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`gestion-${index}`}
                  className="h-20 rounded-2xl border border-zinc-200/80 bg-white/70 dark:border-zinc-700/80 dark:bg-zinc-800/70"
                />
              ))}
            </div>
          </div>

          <div className="md:pt-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-blue-400/70 dark:bg-blue-400/70" />
              <div className="h-3 w-36 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80" />
              <div className="h-0.5 flex-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`politicas-${index}`}
                  className="h-20 rounded-2xl border border-zinc-200/80 bg-white/70 dark:border-zinc-700/80 dark:bg-zinc-800/70"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
