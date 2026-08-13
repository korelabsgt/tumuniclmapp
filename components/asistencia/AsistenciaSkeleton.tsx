export default function AsistenciaSkeleton() {
  const pulse = "animate-pulse rounded bg-gray-200 dark:bg-neutral-700";

  return (
    <div className="overflow-hidden rounded-none border-y border-gray-100 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900 lg:rounded-lg lg:border">
      <div className="flex justify-center gap-6 border-b border-gray-100 px-0 pt-4 dark:border-neutral-800 lg:px-8 lg:pt-8">
        <div className={`h-8 w-28 ${pulse}`} />
        <div className={`h-8 w-36 ${pulse}`} />
      </div>

      <div className="space-y-4 px-4 py-4 lg:p-8">
        <div className={`h-12 ${pulse}`} />

        <div className="space-y-2">
          <div className={`mx-auto h-4 w-4/5 max-w-sm ${pulse}`} />
          <div className={`mx-auto h-4 w-3/5 max-w-xs ${pulse}`} />
          <div className={`mx-auto h-4 w-2/5 max-w-[10rem] ${pulse}`} />
        </div>

        <div className="flex justify-center border-y border-gray-100 py-4 dark:border-neutral-800">
          <div className={`h-9 w-56 rounded-full ${pulse}`} />
        </div>

        <div className={`h-16 ${pulse}`} />

        <div className="space-y-3 border-t pt-4 dark:border-neutral-800">
          <div className={`h-4 w-32 ${pulse}`} />
          <div className={`h-3 w-56 max-w-full ${pulse}`} />
          <div className="grid grid-cols-[minmax(0,1fr)_7.75rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
            <div className={`h-4 ${pulse}`} />
            <div className={`h-[2.35rem] ${pulse}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
