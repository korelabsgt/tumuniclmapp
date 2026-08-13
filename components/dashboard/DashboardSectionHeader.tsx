type DashboardSectionHeaderProps = {
  titulo: string;
  colorClass: string;
  dotClass: string;
  lineClass: string;
  className?: string;
};

export default function DashboardSectionHeader({
  titulo,
  colorClass,
  dotClass,
  lineClass,
  className = "",
}: DashboardSectionHeaderProps) {
  return (
    <div className={`mb-4 flex items-center gap-3 ${className}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs ${colorClass}`}
      >
        {titulo}
      </p>
      <div className={`h-0.5 flex-1 -translate-y-px ${lineClass}`} />
    </div>
  );
}
