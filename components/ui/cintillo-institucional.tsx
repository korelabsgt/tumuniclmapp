"use client";

const SEGMENTOS = [
  { color: "bg-blue-800", delay: "0ms" },
  { color: "bg-blue-600", delay: "350ms" },
  { color: "bg-blue-400", delay: "700ms" },
  { color: "bg-blue-200", delay: "1050ms" },
] as const;

type CintilloInstitucionalProps = {
  className?: string;
  animated?: boolean;
};

export function CintilloInstitucional({
  className = "",
  animated = true,
}: CintilloInstitucionalProps) {
  return (
    <div
      className={`flex h-1.5 w-full shrink-0 sm:h-2 ${className}`}
      aria-hidden
    >
      {SEGMENTOS.map((segmento) => (
        <div
          key={segmento.color}
          className={`flex-1 ${segmento.color} ${
            animated ? "animate-cintillo-pulse" : ""
          }`}
          style={animated ? { animationDelay: segmento.delay } : undefined}
        />
      ))}
    </div>
  );
}
