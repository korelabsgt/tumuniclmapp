export default function AsistenciaPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 items-start justify-center px-0 pt-2 pb-6 sm:pt-4 lg:items-center lg:px-6 lg:py-0">
      <div className="w-full max-w-2xl xl:max-w-3xl">{children}</div>
    </div>
  );
}
