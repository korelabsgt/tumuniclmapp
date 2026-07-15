function normalizarNombreOficina(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function esOficinaSinMarcajeAsistencia(
  oficinaNombre: string | null | undefined,
): boolean {
  if (!oficinaNombre) return false;
  const n = normalizarNombreOficina(oficinaNombre);
  return (
    n.includes("concejo municipal") ||
    n.includes("consejo municipal") ||
    n.includes("alcaldia municipal")
  );
}
