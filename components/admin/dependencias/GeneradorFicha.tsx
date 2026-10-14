"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileImage, FileText as FilePdf, Loader2 } from "lucide-react";
import { useInfoUsuario } from "@/hooks/usuarios/useInfoUsuario";
import useUserData from "@/hooks/sesion/useUserData";
import Cargando from "@/components/ui/animations/Cargando";
import {
  useFirmante,
  useNacimientoUsuario,
} from "@/components/admin/dependencias/hook";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";

const OFICIO_IN: [number, number] = [8.5, 13];
const OFICIO_PX = { width: 816, height: 1248 };
const LOGO_ALTO_PX = 110;

type RenglonConfig = {
  salarioLabel: string;
  bonoLabel?: string;
  tieneBono: boolean;
};

const renglonConfig: Record<string, RenglonConfig> = {
  "011": {
    salarioLabel: "Salario Base (011)",
    bonoLabel: "Bonificación (015)",
    tieneBono: true,
  },
  "061": { salarioLabel: "Dietas (061)", tieneBono: false },
  "022": {
    salarioLabel: "Salario Base (022)",
    bonoLabel: "Bonificación (027)",
    tieneBono: true,
  },
  "029": { salarioLabel: "Honorarios (029)", tieneBono: false },
  "031": {
    salarioLabel: "Jornal (031)",
    bonoLabel: "Bonificación (033)",
    tieneBono: true,
  },
  "035": { salarioLabel: "Retribución a destajo (035)", tieneBono: false },
  "036": { salarioLabel: "Retribución por servicios (036)", tieneBono: false },
};

const TableRow = ({
  label,
  value,
  isTotal = false,
  isHeader = false,
}: {
  label: string;
  value?: ReactNode;
  isTotal?: boolean;
  isHeader?: boolean;
}) => {
  if (isHeader) {
    return (
      <tr>
        <td
          colSpan={2}
          className="bg-[#0066cc] text-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-center border border-[#0066cc]"
        >
          {label}
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-gray-300 ${isTotal ? "bg-emerald-50" : "bg-white"}`}>
      <td className="w-[22%] max-w-[22%] border-r border-gray-300 bg-gray-50 px-2 py-1.5 align-top">
        <span
          className={`block break-words font-bold uppercase leading-tight ${isTotal ? "text-[10px] text-emerald-800" : "text-[10px] text-[#334155]"}`}
        >
          {label}
        </span>
      </td>
      <td className="min-w-0 w-[78%] px-2 py-1.5 align-top">
        <span
          className={`block break-words leading-snug [overflow-wrap:anywhere] ${isTotal ? "text-[11px] font-bold text-emerald-700" : "text-[11px] font-medium text-[#0f172a]"}`}
        >
          {value || "--"}
        </span>
      </td>
    </tr>
  );
};

function EncabezadoFichaInstitucional() {
  return (
    <div className="mb-3 flex items-center gap-3">
      <img
        src="/images/logo-muni.png"
        alt="Logo Municipalidad"
        crossOrigin="anonymous"
        style={{
          height: LOGO_ALTO_PX,
          width: "auto",
          maxHeight: LOGO_ALTO_PX,
          objectFit: "contain",
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <p
          style={{
            color: "#0066cc",
            fontSize: 20,
            fontWeight: 800,
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Municipalidad de Concepción Las Minas
        </p>
        <p
          style={{
            color: "#2563eb",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.3,
            margin: "6px 0 0 0",
            maxWidth: "100%",
          }}
        >
          Departamento de Chiquimula, Guatemala C.A. | TEL: 7943-5619 - CEL: 4790-2524
        </p>
        <CintilloInstitucional
          animated={false}
          className="mt-2 h-[5px] w-[88%] rounded-full"
        />
      </div>
    </div>
  );
}

function VistaFichaAjustada({ children }: { children: ReactNode }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.55);

  useLayoutEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const actualizar = () => {
      const disponibleW = el.clientWidth;
      const disponibleH = el.clientHeight;
      if (disponibleW <= 0 || disponibleH <= 0) return;
      const siguiente = Math.min(
        disponibleW / OFICIO_PX.width,
        disponibleH / OFICIO_PX.height,
        1,
      );
      setEscala(siguiente);
    };
    actualizar();
    const observer = new ResizeObserver(actualizar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={contenedorRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        style={{
          width: OFICIO_PX.width * escala,
          height: OFICIO_PX.height * escala,
        }}
      >
        <div
          style={{
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            width: OFICIO_PX.width,
            height: OFICIO_PX.height,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const calcularEdad = (fechaString: string | null | undefined): string => {
  if (!fechaString) return "--";
  const hoy = new Date();
  const nacimiento = new Date(fechaString);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return `${edad} años`;
};

const formatearFecha = (fechaString: string | null | undefined): string => {
  if (!fechaString) return "--";
  const fecha = new Date(fechaString);
  const formatStr = new Intl.DateTimeFormat("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
  const cleaned = formatStr.replace(/[,\.]/g, "").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const esperarImagenes = async (element: HTMLElement) => {
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
};

interface GeneradorFichaProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function GeneradorFicha({
  isOpen,
  onClose,
  userId,
}: GeneradorFichaProps) {
  const { usuario: datos, cargando } = useInfoUsuario(userId);
  const { rol } = useUserData();
  const firmante = useFirmante();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tituloPersonalizado, setTituloPersonalizado] = useState<string>("");
  const [descargaKey, setDescargaKey] = useState(0);

  useEffect(() => {
    const tituloGuardado = localStorage.getItem("tituloFirmanteFicha");
    if (tituloGuardado) {
      setTituloPersonalizado(tituloGuardado);
    }
  }, []);

  const { nacimiento } = useNacimientoUsuario(userId);

  const ROLES_PERMITIDOS = ["SUPER", "RRHH", "SECRETARIO", "DAFIM"];
  const mostrarFinanciera = ROLES_PERMITIDOS.includes(rol);

  if (!isOpen) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return "--";
    return `Q ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renglon = datos?.renglon;
  const salarioBase = datos?.salario || 0;
  const bonificacion = datos?.bonificacion || 0;
  const totalDevengado = salarioBase + bonificacion;

  const configActual = renglon ? renglonConfig[renglon] : null;
  const tieneBono = configActual?.tieneBono || false;
  const salarioLabel = configActual?.salarioLabel || "Salario";
  const bonoLabel = configActual?.bonoLabel || "Bonificación";

  const pathItems = datos?.puesto_path_jerarquico
    ? datos.puesto_path_jerarquico
        .split(" > ")
        .filter((i) => !i.includes("SIN DIRECC"))
        .slice(1)
    : [];

  const ubicacionTexto = pathItems.length > 0 ? pathItems.join(" / ") : "--";

  const fechaNacimiento = formatearFecha(nacimiento);
  const edad = calcularEdad(nacimiento);

  const capturarFicha = async () => {
    const original = printRef.current;
    if (!original) {
      throw new Error("Elemento no encontrado");
    }

    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: `${OFICIO_PX.width}px`,
      height: `${OFICIO_PX.height}px`,
      pointerEvents: "none",
      zIndex: "-1",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    });
    const nodo = original.cloneNode(true) as HTMLElement;
    Object.assign(nodo.style, {
      transform: "none",
      margin: "0",
      width: `${OFICIO_PX.width}px`,
      height: `${OFICIO_PX.height}px`,
      backgroundColor: "#ffffff",
    });
    nodo.querySelectorAll("img").forEach((img) => {
      img.style.height = `${LOGO_ALTO_PX}px`;
      img.style.maxHeight = `${LOGO_ALTO_PX}px`;
      img.style.width = "auto";
      img.style.objectFit = "contain";
    });
    host.appendChild(nodo);
    document.body.appendChild(host);
    await esperarImagenes(nodo);
    await new Promise((r) => setTimeout(r, 80));

    try {
      return await toJpeg(nodo, {
        quality: 1,
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        skipAutoScale: true,
        width: OFICIO_PX.width,
        height: OFICIO_PX.height,
        style: {
          transform: "none",
          margin: "0",
          width: `${OFICIO_PX.width}px`,
          height: `${OFICIO_PX.height}px`,
        },
      });
    } finally {
      host.remove();
    }
  };

  const nombreArchivoBase = `Ficha_${datos?.nombre?.replace(/\s+/g, "_") || "Empleado"}`;

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await capturarFicha();
      const link = document.createElement("a");
      link.download = `${nombreArchivoBase}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating image", err);
      toast.error("No se pudo generar la imagen.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    try {
      const imgData = await capturarFicha();
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: OFICIO_IN,
      });
      pdf.addImage(imgData, "JPEG", 0, 0, OFICIO_IN[0], OFICIO_IN[1]);
      pdf.save(`${nombreArchivoBase}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isBusy = isGenerating || cargando || firmante.loading;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex h-[100dvh] w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
          <div className="z-10 flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] dark:border-zinc-700 sm:gap-3 sm:px-5 sm:py-3">
            <input
              type="text"
              placeholder="Título del firmante (ej. Lic., Ing.)"
              value={tituloPersonalizado}
              onChange={(e) => {
                setTituloPersonalizado(e.target.value);
                localStorage.setItem("tituloFirmanteFicha", e.target.value);
              }}
              className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
            <Select
              key={descargaKey}
              onValueChange={(formato) => {
                setDescargaKey((n) => n + 1);
                if (formato === "pdf") void handleDownloadPDF();
                if (formato === "jpg") void handleDownloadImage();
              }}
              disabled={isBusy}
            >
              <SelectTrigger className="h-10 w-[8.75rem] shrink-0 cursor-pointer rounded-xl border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SelectValue placeholder="Descargar" />
                )}
              </SelectTrigger>
              <SelectContent className="z-[300] dark:border-zinc-700 dark:bg-zinc-800">
                <SelectItem value="pdf" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FilePdf className="h-4 w-4" /> PDF
                  </span>
                </SelectItem>
                <SelectItem value="jpg" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" /> JPG
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-zinc-100/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-zinc-900/50 sm:p-5">
            {cargando ? (
              <div className="flex h-full items-center justify-center">
                <Cargando texto="Generando vista previa..." />
              </div>
            ) : (
              <VistaFichaAjustada>
                <div
                  ref={printRef}
                  className="relative flex flex-col overflow-hidden bg-white"
                  style={{
                    width: OFICIO_PX.width,
                    height: OFICIO_PX.height,
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                  }}
                >
                  <div className="flex h-full flex-1 flex-col px-10 py-6">
                    <EncabezadoFichaInstitucional />
                    <div className="mb-4 border-b border-zinc-200 pb-3 text-center">
                      <p
                        data-ficha-nombre="true"
                        style={{
                          color: "#0f172a",
                          fontSize: 18,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          lineHeight: 1.2,
                          margin: 0,
                        }}
                      >
                        {datos?.nombre || "____________________"}
                      </p>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="border border-gray-300 overflow-hidden mb-6">
                        <table className="w-full table-fixed border-collapse">
                          <colgroup>
                            <col style={{ width: "22%" }} />
                            <col style={{ width: "78%" }} />
                          </colgroup>
                          <thead>
                            <TableRow label="Información Personal" isHeader />
                          </thead>
                          <tbody>
                            <TableRow label="Teléfono" value={datos?.telefono} />
                            <TableRow
                              label="Fecha de Nacimiento"
                              value={fechaNacimiento}
                            />
                            <TableRow label="Edad" value={edad} />
                            <TableRow label="DPI" value={datos?.dpi} />
                            <TableRow label="NIT" value={datos?.nit} />
                            <TableRow label="Afiliación IGSS" value={datos?.igss} />
                            <TableRow label="No. Cuenta" value={datos?.cuenta_no} />
                            <TableRow label="Domicilio" value={datos?.domicilio} />
                            <TableRow label="Vecindad" value={datos?.vecindad} />
                            <TableRow
                              label="Género"
                              value={
                                datos?.genero ? (
                                  <span
                                    className={`font-bold ${datos.genero === "F" ? "text-pink-500" : "text-blue-500"}`}
                                  >
                                    {datos.genero}
                                  </span>
                                ) : null
                              }
                            />
                            <TableRow
                              label="Estado Civil"
                              value={datos?.estado_civil}
                            />
                            <TableRow label="Profesión" value={datos?.profesion} />
                            <TableRow
                              label="Fecha de antigüedad"
                              value={formatearFecha(datos?.fecha_antiguedad)}
                            />
                            <TableRow label="Dirección" value={datos?.direccion} />
                          </tbody>

                          <thead>
                            <TableRow
                              label="Información Contractual"
                              isHeader
                            />
                          </thead>
                          <tbody>
                            <TableRow label="Puesto" value={datos?.puesto_nombre} />
                            <TableRow
                              label="Fecha de Inicio"
                              value={formatearFecha(datos?.fecha_ini)}
                            />
                            {datos?.fecha_fin && (
                              <TableRow
                                label="Fecha de Fin"
                                value={formatearFecha(datos?.fecha_fin)}
                              />
                            )}
                            <TableRow
                              label="Ubicación Organizacional"
                              value={ubicacionTexto}
                            />
                            <TableRow label="Renglón" value={renglon} />

                            {mostrarFinanciera ? (
                              <>
                                <TableRow
                                  label={salarioLabel}
                                  value={formatCurrency(salarioBase)}
                                />
                                {tieneBono && (
                                  <TableRow
                                    label={bonoLabel}
                                    value={formatCurrency(bonificacion)}
                                  />
                                )}
                                <TableRow
                                  label="Total Devengado"
                                  value={formatCurrency(totalDevengado)}
                                  isTotal={true}
                                />
                              </>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-auto mb-2 flex flex-col items-center justify-center">
                      <div className="w-64 border-b border-[#0f172a] mb-2"></div>
                      <p
                        className="uppercase text-center"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {firmante.loading
                          ? "Validando..."
                          : firmante.nombre
                            ? `${tituloPersonalizado ? tituloPersonalizado + " " : ""}${firmante.nombre}`.trim()
                            : "Firma Autorizada"}
                      </p>
                      <p
                        className="uppercase text-center"
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        {!firmante.loading &&
                          (firmante.cargo || "ADMINISTRACIÓN MUNICIPAL")}
                      </p>
                    </div>
                  </div>
                </div>
              </VistaFichaAjustada>
            )}
          </div>
      </motion.div>
    </AnimatePresence>
  );
}
