import React, { forwardRef, useState, useMemo, useEffect } from "react";

const FILAS_PAGINA_1 = 22;
const FILAS_PAGINA_X = 24;
const ALTO_CELDA = "h-6 max-h-6 overflow-hidden p-0";
const CELDA_INTERNA =
  "h-6 min-w-0 w-full px-1 flex items-center leading-none overflow-hidden";

interface Props {
  datos: any[];
  anio: string;
  nombreMes: string;
  numeroInforme: string;
  fechaHoyTexto: string;
  firmas: { coordinator: string };
}

const DirectorioEmpleados = forwardRef<HTMLDivElement, Props>(
  ({ datos, anio, nombreMes, numeroInforme, fechaHoyTexto, firmas }, ref) => {
    const [correos, setCorreos] = useState<Record<string, string>>({});
    const [telefonos, setTelefonos] = useState<Record<string, string>>({});

    useEffect(() => {
      const guardadosCorreos = localStorage.getItem("directorio_correos");
      const guardadosTelefonos = localStorage.getItem("directorio_telefonos");
      if (guardadosCorreos) {
        try {
          setCorreos(JSON.parse(guardadosCorreos));
        } catch (e) {}
      }
      if (guardadosTelefonos) {
        try {
          setTelefonos(JSON.parse(guardadosTelefonos));
        } catch (e) {}
      }
    }, []);

    const handleCorreoChange = (id: string, value: string) => {
      setCorreos((prev) => {
        const nuevos = { ...prev, [id]: value };
        localStorage.setItem("directorio_correos", JSON.stringify(nuevos));
        return nuevos;
      });
    };

    const handleTelefonoChange = (id: string, value: string) => {
      setTelefonos((prev) => {
        const nuevos = { ...prev, [id]: value };
        localStorage.setItem("directorio_telefonos", JSON.stringify(nuevos));
        return nuevos;
      });
    };

    const handleRestablecer = () => {
      setCorreos({});
      setTelefonos({});
      localStorage.removeItem("directorio_correos");
      localStorage.removeItem("directorio_telefonos");
    };

    const getDependenciaCorta = (dep: string) => {
      if (!dep) return "";
      const parts = dep.split(">");
      return parts[parts.length - 1].trim();
    };

    const paginasProcesadas = useMemo(() => {
      const permitidos = ["011", "022", "031", "061"];
      const filtrados = datos.filter((f) => {
        const r = (f.renglon || "").toLowerCase();
        return permitidos.some((p) => r.includes(p));
      });

      const datosOrdenados = [...filtrados].sort((a, b) => {
        const nameA = (a.dependencia_nombre || "").toUpperCase();
        const nameB = (b.dependencia_nombre || "").toUpperCase();
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
    }, [datos]);

    const thClass =
      "border border-gray-400 h-6 px-1 text-center uppercase align-middle bg-gray-100 text-gray-700";

    if (paginasProcesadas.length === 0) {
      return (
        <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
          No hay empleados para mostrar en el directorio.
        </div>
      );
    }

    return (
      <>
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleRestablecer}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-xs font-bold hover:bg-red-200 transition-colors shadow-sm"
          >
            Restablecer Todo
          </button>
        </div>
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
                            Licda. {firmas.coordinator || "No asignado"}
                          </span>
                        </span>
                      </div>
                      <div className="w-1/3 text-center">
                        <h1 className="text-sm font-bold uppercase text-black leading-tight">
                          DIRECTORIO DE EMPLEADOS
                        </h1>
                        <p className="text-[10px] text-gray-600 mt-1">
                          MES:{" "}
                          <span className="font-bold">
                            {nombreMes} {anio}
                          </span>{" "}
                          | INFORME No. N3-{numeroInforme}
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
                        Directorio de Empleados - {nombreMes} {anio}{" "}
                        (Continuación)
                      </span>
                      <span className="text-[9px] text-gray-400">
                        Hoja {indexPagina + 1} de {paginasProcesadas.length}
                      </span>
                    </div>
                  )}

                  <table className="w-full border-collapse text-[9px] font-sans text-black border border-gray-300 table-fixed">
                    <thead>
                      <tr>
                        <th className={`w-8 ${thClass}`}>No.</th>
                        <th className={`w-64 text-left ${thClass}`}>Nombre</th>
                        <th className={`w-56 text-left ${thClass}`}>Cargo</th>
                        <th className={`w-24 ${thClass}`}>Sede</th>
                        <th className={`w-20 ${thClass}`}>Teléfono</th>
                        <th className={`w-12 ${thClass}`}>Ext.</th>
                        <th className={`w-24 ${thClass}`}>
                          Cel. Institucional
                        </th>
                        <th className={`w-48 ${thClass}`}>
                          Correo Electrónico
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosPagina.map((fila: any, idx: number) => {
                        const prevFila = idx > 0 ? datosPagina[idx - 1] : null;
                        const mostrarEncabezado =
                          !prevFila ||
                          prevFila.dependencia_nombre !==
                            fila.dependencia_nombre;

                        return (
                          <React.Fragment key={fila.id}>
                            {mostrarEncabezado && (
                              <tr className="bg-gray-200 border border-gray-400 break-inside-avoid">
                                <td
                                  colSpan={8}
                                  className={`border border-gray-300 ${ALTO_CELDA}`}
                                >
                                  <div
                                    className={`${CELDA_INTERNA} px-2 font-bold text-[8px] uppercase text-gray-800`}
                                  >
                                    <span className="truncate block w-full">
                                      <span className="text-blue-600">
                                        DEPENDENCIA:
                                      </span>{" "}
                                      {getDependenciaCorta(
                                        fila.dependencia_nombre,
                                      )}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td
                                className={`border border-gray-300 text-center ${ALTO_CELDA}`}
                              >
                                <div
                                  className={`${CELDA_INTERNA} justify-center`}
                                >
                                  {indiceInicial + idx + 1}
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 font-semibold ${ALTO_CELDA}`}
                              >
                                <div className={CELDA_INTERNA}>
                                  <span className="truncate block w-full">
                                    {fila.nombre}
                                  </span>
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 ${ALTO_CELDA}`}
                              >
                                <div className={CELDA_INTERNA}>
                                  <span className="truncate block w-full">
                                    {fila.puesto}
                                  </span>
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 text-center ${ALTO_CELDA}`}
                              >
                                <div
                                  className={`${CELDA_INTERNA} justify-center`}
                                >
                                  Municipalidad
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 ${ALTO_CELDA}`}
                              >
                                <div className={CELDA_INTERNA}>
                                  <input
                                    type="text"
                                    placeholder="79435619"
                                    value={telefonos[fila.id] ?? "79435619"}
                                    onChange={(e) =>
                                      handleTelefonoChange(
                                        fila.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-full text-[9px] text-center border-none outline-none bg-transparent placeholder-black placeholder-opacity-100"
                                  />
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 text-center ${ALTO_CELDA}`}
                              >
                                <div
                                  className={`${CELDA_INTERNA} justify-center`}
                                >
                                  NO
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 text-center ${ALTO_CELDA}`}
                              >
                                <div
                                  className={`${CELDA_INTERNA} justify-center`}
                                >
                                  NO
                                </div>
                              </td>
                              <td
                                className={`border border-gray-300 ${ALTO_CELDA}`}
                              >
                                <div className={CELDA_INTERNA}>
                                  <input
                                    type="email"
                                    placeholder="NO"
                                    value={correos[fila.id] || ""}
                                    onChange={(e) =>
                                      handleCorreoChange(
                                        fila.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-full text-[9px] border-none outline-none bg-transparent placeholder-black placeholder-opacity-100"
                                  />
                                </div>
                              </td>
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
      </>
    );
  },
);

DirectorioEmpleados.displayName = "DirectorioEmpleados";
export default DirectorioEmpleados;
