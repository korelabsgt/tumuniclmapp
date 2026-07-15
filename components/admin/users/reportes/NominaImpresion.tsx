import React, { forwardRef, useMemo } from "react";

const FILAS_PAGINA_1 = 22;
const FILAS_PAGINA_X = 24;
const ALTO_CELDA = "h-6 max-h-6 overflow-hidden p-0";
const CELDA_INTERNA =
  "box-border h-6 max-h-6 min-w-0 w-full px-1 flex items-center leading-none overflow-hidden";

interface Props {
  datos: any[];
  anio: string;
  nombreMes: string;
  numeroInforme: string;
  fechaHoyTexto: string;
  itemsPorPagina: number;
  firmas: { coordinator: string };
  formatQ: (val: number) => string;
  totales: {
    salarios: number;
    honorarios: number;
    dietas: number;
    bonis: number;
    gastosRep: number;
    devengado: number;
    liquido: number;
    descuentos: number;
  };
  columnasOcultas?: string[];
  oficinasOcultas?: string[];
  empleadosOcultos?: string[];
  onOcultarColumna?: (col: string) => void;
  onOcultarOficina?: (oficina: string) => void;
  onOcultarEmpleado?: (id: string) => void;
}

const NominaImpresion = forwardRef<HTMLDivElement, Props>(
  (
    {
      datos,
      anio,
      nombreMes,
      numeroInforme,
      fechaHoyTexto,
      firmas,
      formatQ,
      totales,
      columnasOcultas = [],
      oficinasOcultas = [],
      empleadosOcultos = [],
      onOcultarColumna,
      onOcultarOficina,
      onOcultarEmpleado,
    },
    ref,
  ) => {
    const paginasProcesadas = useMemo(() => {
      const datosFiltrados = datos.filter(
        (f) =>
          !oficinasOcultas.includes(f.dependencia_nombre) &&
          !empleadosOcultos.includes(f.id),
      );

      const datosOrdenados = [...datosFiltrados].sort((a, b) => {
        const nameA = a.dependencia_nombre.toUpperCase();
        const nameB = b.dependencia_nombre.toUpperCase();
        if (nameA.includes("ALCALDÍA MUNICIPAL")) return -1;
        if (nameB.includes("ALCALDÍA MUNICIPAL")) return 1;
        return 0;
      });

      const paginas: any[][] = [];
      let paginaActual: any[] = [];
      let espaciosUsados = 0;

      datosOrdenados.forEach((fila, index) => {
        const prevFila = index > 0 ? datosOrdenados[index - 1] : null;
        const esPrimeroDePagina = paginaActual.length === 0;
        const cambiaDependencia =
          !prevFila || prevFila.dependencia_nombre !== fila.dependencia_nombre;

        let costoFila = 1;
        if (esPrimeroDePagina || cambiaDependencia) costoFila += 1;

        const limiteActual =
          paginas.length === 0 ? FILAS_PAGINA_1 : FILAS_PAGINA_X;

        if (espaciosUsados + costoFila > limiteActual) {
          paginas.push(paginaActual);
          paginaActual = [];
          espaciosUsados = 0;
          costoFila = 2;
        }

        paginaActual.push(fila);
        espaciosUsados += costoFila;
      });

      if (paginaActual.length > 0) paginas.push(paginaActual);
      return paginas;
    }, [datos, oficinasOcultas, empleadosOcultos]);

    const visible = (col: string) => !columnasOcultas.includes(col);
    const handleHideCol = (col: string) => () =>
      onOcultarColumna && onOcultarColumna(col);

    const handleHideOficina = (oficina: string) => () =>
      onOcultarOficina && onOcultarOficina(oficina);

    const handleHideEmpleado = (id: string) => () =>
      onOcultarEmpleado && onOcultarEmpleado(id);

    const colSpanTable = [
      visible("no"),
      visible("nombre"),
      visible("cargo"),
      visible("renglon"),
      visible("dietas"),
      visible("salario"),
      visible("honorarios"),
      visible("bonif"),
      visible("gastos_rep"),
      visible("total_dev"),
      visible("igss"),
      visible("plan"),
      visible("isr"),
      visible("total_desc"),
      visible("liquido"),
    ].filter(Boolean).length;

    const thClass =
      "border border-gray-400 h-6 px-0.5 text-center uppercase align-middle cursor-pointer hover:bg-red-100 hover:text-red-900 transition-colors";

    const getDependenciaCorta = (dep: string) => {
      if (!dep) return "";
      const parts = dep.split(">");
      return parts[parts.length - 1].trim();
    };

    const celdaTexto = (
      contenido: React.ReactNode,
      className = "",
      alineacion: "left" | "center" | "right" = "left",
    ) => (
      <td className={`border border-gray-300 ${ALTO_CELDA} ${className}`}>
        <div className={`${CELDA_INTERNA}`}>
          <span
            className={`block w-full truncate ${
              alineacion === "center"
                ? "text-center"
                : alineacion === "right"
                  ? "text-right"
                  : "text-left"
            }`}
          >
            {contenido}
          </span>
        </div>
      </td>
    );

    const celdaMonto = (
      valor: number,
      className = "",
      conQ = true,
    ) =>
      celdaTexto(
        valor > 0 ? (conQ ? `Q ${formatQ(valor)}` : formatQ(valor)) : "---",
        className,
        valor > 0 ? "right" : "center",
      );

    return (
      <div ref={ref} className="flex flex-col gap-8">
        {paginasProcesadas.map((datosPagina, indexPagina) => {
          const esPrimeraPagina = indexPagina === 0;
          const indiceInicial = paginasProcesadas
            .slice(0, indexPagina)
            .reduce((acc, curr) => acc + curr.length, 0);

          return (
            <div
              key={indexPagina}
              className="bg-white shadow-lg relative text-black flex flex-col overflow-hidden"
              style={{ width: "1248px", height: "816px", padding: "40px" }}
            >
              <div className="flex-1 min-h-0 overflow-hidden">
                {esPrimeraPagina ? (
                  <div className="flex justify-between items-center mb-2 border-b-2 border-[#0066CC] pb-2">
                    <div className="w-1/3 text-left text-xs text-gray-500 font-bold uppercase">
                      Municipalidad de Concepción Las Minas
                      <br />
                      <span className="font-normal normal-case">
                        Departamento de Chiquimula, Guatemala C.A.
                      </span>
                      <br />
                      <span className="font-normal normal-case text-[10px]">
                        Departamento Municipal de Recursos Humanos
                      </span>
                      <br />
                      <span className="font-normal normal-case text-[10px]">
                        Encargado(a) de actualización de datos:{" "}
                        <span className="font-bold">
                          {firmas.coordinator || "No asignado"}
                        </span>
                      </span>
                    </div>
                    <div className="w-1/3 text-center">
                      <h1 className="text-sm font-bold uppercase text-black leading-tight">
                        REMUNERACIONES DE EMPLEADOS Y SERVIDORES PÚBLICOS
                      </h1>
                      <p className="text-[10px] text-gray-600 mt-1">
                        MES:{" "}
                        <span className="font-bold">
                          {nombreMes} {anio}
                        </span>{" "}
                        | INFORME No. N4-{numeroInforme}
                      </p>
                    </div>
                    <div className="w-1/3 flex justify-end">
                      <img
                        src="/images/logo-muni.png"
                        alt="Logo"
                        className="h-28 object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 border-b border-gray-300 pb-1 flex justify-between items-end">
                    <span className="text-[9px] text-gray-400 uppercase">
                      Nómina General - {nombreMes} {anio} (Continuación)
                    </span>
                    <span className="text-[9px] text-gray-400">
                      Hoja {indexPagina + 1} de {paginasProcesadas.length}
                    </span>
                  </div>
                )}

                <table className="w-full border-collapse text-[8px] font-sans text-black border border-gray-300 table-fixed">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      {visible("no") && (
                        <th
                          className={`w-6 ${thClass}`}
                          onClick={handleHideCol("no")}
                          title="Ocultar columna No."
                        >
                          No.
                        </th>
                      )}
                      {visible("nombre") && (
                        <th
                          className={`text-left w-40 ${thClass}`}
                          onClick={handleHideCol("nombre")}
                          title="Ocultar columna Nombre"
                        >
                          Nombre Completo
                        </th>
                      )}
                      {visible("cargo") && (
                        <th
                          className={`text-left w-44 ${thClass}`}
                          onClick={handleHideCol("cargo")}
                          title="Ocultar columna Cargo"
                        >
                          Cargo
                        </th>
                      )}
                      {visible("renglon") && (
                        <th
                          className={`w-8 ${thClass}`}
                          onClick={handleHideCol("renglon")}
                          title="Ocultar columna Reng."
                        >
                          Reng.
                        </th>
                      )}
                      {visible("dietas") && (
                        <th
                          className={`w-16 ${thClass}`}
                          onClick={handleHideCol("dietas")}
                          title="Ocultar columna Dietas"
                        >
                          Dietas
                        </th>
                      )}
                      {visible("salario") && (
                        <th
                          className={`w-16 ${thClass}`}
                          onClick={handleHideCol("salario")}
                          title="Ocultar columna Salario"
                        >
                          Salario
                        </th>
                      )}
                      {visible("honorarios") && (
                        <th
                          className={`w-16 ${thClass}`}
                          onClick={handleHideCol("honorarios")}
                          title="Ocultar columna Honorarios"
                        >
                          Honorarios
                        </th>
                      )}
                      {visible("bonif") && (
                        <th
                          className={`w-16 ${thClass}`}
                          onClick={handleHideCol("bonif")}
                          title="Ocultar columna Bonif."
                        >
                          Bonif.
                        </th>
                      )}
                      {visible("gastos_rep") && (
                        <th
                          className={`w-16 ${thClass}`}
                          onClick={handleHideCol("gastos_rep")}
                          title="Ocultar columna Gastos Rep."
                        >
                          Gastos Rep.
                        </th>
                      )}
                      {visible("total_dev") && (
                        <th
                          className={`w-16 bg-gray-200 ${thClass}`}
                          onClick={handleHideCol("total_dev")}
                          title="Ocultar columna Total Dev."
                        >
                          Total Dev.
                        </th>
                      )}
                      {visible("igss") && (
                        <th
                          className={`w-11 text-red-700 ${thClass}`}
                          onClick={handleHideCol("igss")}
                          title="Ocultar columna IGSS"
                        >
                          IGSS
                        </th>
                      )}
                      {visible("plan") && (
                        <th
                          className={`w-11 text-red-700 ${thClass}`}
                          onClick={handleHideCol("plan")}
                          title="Ocultar columna Plan"
                        >
                          Plan
                        </th>
                      )}
                      {visible("isr") && (
                        <th
                          className={`w-11 text-red-700 ${thClass}`}
                          onClick={handleHideCol("isr")}
                          title="Ocultar columna ISR"
                        >
                          ISR
                        </th>
                      )}
                      {visible("total_desc") && (
                        <th
                          className={`w-14 text-red-700 bg-red-50 ${thClass}`}
                          onClick={handleHideCol("total_desc")}
                          title="Ocultar columna Total Desc."
                        >
                          Total Desc.
                        </th>
                      )}
                      {visible("liquido") && (
                        <th
                          className={`w-16 font-bold bg-green-50 ${thClass}`}
                          onClick={handleHideCol("liquido")}
                          title="Ocultar columna Líquido"
                        >
                          Líquido
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {datosPagina.map((fila: any, idx: number) => {
                      const prevFila = idx > 0 ? datosPagina[idx - 1] : null;
                      const mostrarEncabezado =
                        !prevFila ||
                        prevFila.dependencia_nombre !== fila.dependencia_nombre;
                      return (
                        <React.Fragment key={fila.id}>
                          {mostrarEncabezado && (
                            <tr
                              className="bg-gray-200 border border-gray-400 break-inside-avoid cursor-pointer hover:bg-red-200 transition-colors group"
                              onClick={handleHideOficina(
                                fila.dependencia_nombre,
                              )}
                              title="Clic para ocultar toda esta oficina"
                            >
                              <td
                                colSpan={colSpanTable}
                                className={`border border-gray-300 ${ALTO_CELDA}`}
                              >
                                <div
                                  className={`${CELDA_INTERNA} px-2 font-bold text-[8px] uppercase text-gray-800`}
                                >
                                  <span className="truncate block w-full">
                                    <span className="text-blue-600">
                                      Dependencia:
                                    </span>{" "}
                                    {getDependenciaCorta(
                                      fila.dependencia_nombre,
                                    )}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr
                            className="hover:bg-red-50 cursor-pointer transition-colors"
                            onClick={handleHideEmpleado(fila.id)}
                            title="Clic para ocultar empleado"
                          >
                            {visible("no") &&
                              celdaTexto(
                                indiceInicial + idx + 1,
                                "",
                                "center",
                              )}
                            {visible("nombre") &&
                              celdaTexto(
                                fila.nombre,
                                "font-semibold",
                              )}
                            {visible("cargo") && celdaTexto(fila.puesto)}
                            {visible("renglon") &&
                              celdaTexto(fila.renglon, "", "center")}
                            {visible("dietas") &&
                              celdaMonto(fila.dietaFinal)}
                            {visible("salario") &&
                              celdaMonto(fila.salarioFinal)}
                            {visible("honorarios") &&
                              celdaMonto(fila.honorarioFinal)}
                            {visible("bonif") && celdaMonto(fila.bonifFinal)}
                            {visible("gastos_rep") &&
                              celdaMonto(fila.gastosRepFinal)}
                            {visible("total_dev") &&
                              celdaMonto(
                                fila.totalDevengado,
                                "font-bold bg-gray-100",
                              )}
                            {visible("igss") &&
                              celdaMonto(fila.igss, "text-red-800", false)}
                            {visible("plan") &&
                              celdaMonto(fila.plan, "text-red-800", false)}
                            {visible("isr") &&
                              celdaMonto(fila.isr, "text-red-800", false)}
                            {visible("total_desc") &&
                              celdaMonto(
                                fila.totalDescuentos,
                                "font-semibold text-red-800 bg-red-50",
                              )}
                            {visible("liquido") &&
                              celdaMonto(
                                fila.liquido,
                                "font-bold text-green-800 bg-green-50",
                              )}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 mt-2 pt-1 border-t border-gray-200 text-center text-[8px] text-gray-400">
                Generado el {fechaHoyTexto} | Página {indexPagina + 1} de{" "}
                {paginasProcesadas.length}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

NominaImpresion.displayName = "NominaImpresion";
export default NominaImpresion;
