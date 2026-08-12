export default function DashboardSkeleton() {
  return (
    <section className="w-full mx-auto animate-pulse px-4 pt-2 md:px-8">
      <div className="mx-auto mb-6 w-full max-w-6xl">
        <div className="mx-auto mb-6 flex justify-center">
          <div className="w-fit overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-700/70">
            <div className="flex h-11 divide-x divide-zinc-200/80 dark:divide-zinc-700/70 sm:h-12">
              <div className="w-28 bg-green-50/60 dark:bg-green-950/15 sm:w-36" />
              <div className="w-28 bg-purple-50/60 dark:bg-purple-950/15 sm:w-36" />
              <div className="w-24 bg-sky-50/60 dark:bg-sky-950/15 sm:w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto mb-8 h-7 w-56 rounded-md bg-zinc-200 dark:bg-zinc-800" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-44 rounded-2xl border border-zinc-200/80 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
