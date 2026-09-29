import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cargarLogoMunicipal, dibujarEncabezadoMunicipalPdf } from "@/components/combustible/entregaCupon/lib/encabezadoMunicipalPdf";
import { PermisoEmpleado } from "./types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface EmpleadoReportePdf {
  nombre: string;
  oficina?: string;
  permisos: PermisoEmpleado[];
}

export async function generarPdfReporteEmpleado(
  emp: EmpleadoReportePdf,
  modoTipoPermiso: "permisos" | "igss" | "acuerdos" = "permisos"
) {
  // Formato Oficio Vertical: Legal (215.9 mm x 355.6 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "legal", // Oficio vertical
  });

  let startY = 12;

  const etiquetaCategoria =
    modoTipoPermiso === "igss"
      ? "IGSS"
      : modoTipoPermiso === "acuerdos"
        ? "ACUERDOS"
        : "GENERALES";

  // Cargar e imprimir encabezado institucional si está disponible
  try {
    const logo = await cargarLogoMunicipal();
    const tituloDoc = `REPORTE DE PERMISOS DE EMPLEADO (${etiquetaCategoria})`;
    const lineasSubtitulo = [
      `Empleado: ${emp.nombre}`,
      `Dependencia/Oficina: ${emp.oficina || "General"}`,
      `Total Registros: ${emp.permisos.length}`,
      `Fecha de impresión: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    ];

    startY = dibujarEncabezadoMunicipalPdf(doc, logo, {
      tituloDocumento: tituloDoc,
      lineas: lineasSubtitulo,
    }) + 4;
  } catch {
    // Respaldo en caso de no cargar el logo
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text("Municipalidad de Concepción Las Minas", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text("Chiquimula, Guatemala", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`REPORTE DE PERMISOS DE EMPLEADO (${etiquetaCategoria})`, 14, 28);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Empleado: ${emp.nombre}`, 14, 34);
    doc.text(`Dependencia/Oficina: ${emp.oficina || "General"}`, 14, 39);
    doc.text(`Total Registros: ${emp.permisos.length} | Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 44);

    startY = 48;
  }

  // Filas para la tabla
  const tableRows = emp.permisos.map((p, idx) => {
    const fechaIni = p.inicio ? format(parseISO(p.inicio), "dd/MM/yyyy", { locale: es }) : "-";
    const fechaFin = p.fin ? format(parseISO(p.fin), "dd/MM/yyyy", { locale: es }) : "-";
    const rangoFechas = fechaIni === fechaFin ? fechaIni : `${fechaIni} al ${fechaFin}`;

    let estadoLegible = "Pendiente";
    if (p.estado === "aprobado") estadoLegible = "Aprobado RRHH";
    else if (p.estado === "aprobado_jefe") estadoLegible = "Pendiente RRHH";
    else if (p.estado?.includes("rechazado")) estadoLegible = "Rechazado";

    let remuneradoTexto = "—";
    if (p.remunerado !== null && p.remunerado !== undefined) {
      remuneradoTexto = p.remunerado ? "Sí" : "No";
    }

    return [
      (idx + 1).toString(),
      rangoFechas,
      p.tipo || "Permiso",
      p.descripcion || "Sin detalle",
      remuneradoTexto,
      estadoLegible,
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: [["No.", "Fecha / Rango", "Tipo de Permiso", "Detalle / Motivo", "Remunerado", "Estado"]],
    body: tableRows,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: "middle",
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 58, 138], // Azul Institucional
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 35, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 40, fontStyle: "bold" },
      3: { cellWidth: "auto" },
      4: { cellWidth: 28, halign: "center" },
      5: { cellWidth: 28, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 15 },
  });

  // Abrir ventana/iframe para imprimir directamente con la vista previa nativa del navegador
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = blobUrl;

  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Error al disparar impresión:", err);
      window.open(blobUrl, "_blank");
    }
  };
}
