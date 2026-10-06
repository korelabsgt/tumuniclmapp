import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  cargarLogoMunicipal,
  dibujarEncabezadoMunicipalPdf,
  dibujarCintilloAzul,
} from "@/components/combustible/entregaCupon/lib/encabezadoMunicipalPdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatearFechaTarjeta } from "@/components/permisos/lib/fechas";
import { DiaReporteItem } from "./modals/ModalReporteDiasAcuerdo";

export interface AcuerdoReportePdfData {
  codigo: string;
  categoriaLabel: string;
  empleadoNombre: string;
  puesto: string;
  oficina: string;
  rangoFechas: string;
  horario: string | null;
  dias: DiaReporteItem[];
}

export async function generarPdfReporteDiasAcuerdo(data: AcuerdoReportePdfData) {
  // Formato Oficio 9: 21.49 cm x 31.5 cm (214.9 mm x 315 mm / 8.46" x 12.4")
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [214.9, 315], // Medida exacta Oficio 9
  });

  const MARGIN = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  let startY = 4;

  // Función para dibujar una línea de metadatos con etiquetas en normal y valores en negrita
  const dibujarLineaMetadato = (
    docPdf: jsPDF,
    x: number,
    y: number,
    segmentos: { label: string; valor: string; separador?: string }[],
  ) => {
    let curX = x;
    docPdf.setFontSize(8.5);

    segmentos.forEach((seg, idx) => {
      // Dibujar etiqueta normal
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(71, 85, 105);
      docPdf.text(seg.label, curX, y);
      curX += docPdf.getTextWidth(seg.label);

      // Dibujar valor en negrita
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(15, 23, 42);
      docPdf.text(seg.valor, curX, y);
      curX += docPdf.getTextWidth(seg.valor);

      // Separador si existe
      if (seg.separador) {
        docPdf.setFont("helvetica", "normal");
        docPdf.setTextColor(148, 163, 184);
        docPdf.text(seg.separador, curX, y);
        curX += docPdf.getTextWidth(seg.separador);
      }
    });
  };

  const puestoDependencia =
    data.puesto && data.oficina
      ? `${data.puesto} | ${data.oficina}`
      : data.puesto || data.oficina || "General";

  const fechaImpresion = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

  const metadatosFilas = [
    [{ label: "Empleado: ", valor: data.empleadoNombre }],
    [{ label: "Puesto / Dependencia: ", valor: puestoDependencia }],
    [
      { label: "Tipo de Acuerdo: ", valor: data.categoriaLabel, separador: "  |  " },
      { label: "Período: ", valor: data.rangoFechas },
    ],
    [
      { label: "Horario Asignado: ", valor: data.horario || "Regular", separador: "  |  " },
      { label: "Total de días utilizados: ", valor: `${data.dias.length}` },
    ],
    [{ label: "Fecha de impresión: ", valor: fechaImpresion }],
  ];

  let textY = 0;

  // Cargar e imprimir encabezado institucional si está disponible
  try {
    const logo = await cargarLogoMunicipal();
    const logoMaxH = 20;
    const logoColW = 35;
    const logoMaxW = logoColW - 2;
    const aspect = logo.w / logo.h;
    let logoH = logoMaxH;
    let logoW = logoH * aspect;
    if (logoW > logoMaxW) {
      logoW = logoMaxW;
      logoH = logoW / aspect;
    }
    const logoY = startY;
    doc.addImage(logo.dataUrl, "PNG", MARGIN, logoY, logoW, logoH);

    const textColX = MARGIN + logoColW + 4;
    const textColW = pageWidth - MARGIN - textColX;

    let subY = startY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(30, 58, 138);
    const titleWidth = doc.getTextWidth("Municipalidad de Concepción Las Minas");
    doc.text("Municipalidad de Concepción Las Minas", textColX, subY, {
      align: "left",
      maxWidth: textColW,
    });

    subY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(37, 99, 235);
    doc.text("Chiquimula, Guatemala", textColX, subY, { align: "left" });

    subY += 3;
    dibujarCintilloAzul(doc, textColX, subY, titleWidth);

    textY = Math.max(startY + logoH + 3.5, subY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`REPORTE DE DÍAS DE ACUERDO - CÓD: ${data.codigo}`, MARGIN, textY, {
      align: "left",
    });

    textY += 4.8;
    metadatosFilas.forEach((fila) => {
      dibujarLineaMetadato(doc, MARGIN, textY, fila);
      textY += 3.8;
    });

    const headerBottom = textY + 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, headerBottom, pageWidth - MARGIN, headerBottom);

    startY = headerBottom + 3;
  } catch {
    // Respaldo en caso de no cargar el logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text("Municipalidad de Concepción Las Minas", MARGIN, 5);
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text("Chiquimula, Guatemala", MARGIN, 8.5);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`REPORTE DE DÍAS DE ACUERDO - CÓD: ${data.codigo}`, MARGIN, 13.5);

    textY = 17.5;
    metadatosFilas.forEach((fila) => {
      dibujarLineaMetadato(doc, MARGIN, textY, fila);
      textY += 3.6;
    });

    startY = textY + 2.5;
  }

  // Filas para la tabla
  const tableRows = data.dias.map((item, idx) => {
    const fechaAsignacion = item.asignadoEl
      ? ` - ${formatearFechaTarjeta(item.asignadoEl)}`
      : "";
    const asignadoTexto = `${item.asignadoPor}${fechaAsignacion}`;

    return [
      String(idx + 1).padStart(2, "0"),
      formatearFechaTarjeta(item.fecha),
      asignadoTexto,
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: [["No.", "Fecha / Día", "Asignado Por"]],
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
      0: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 55, halign: "center", fontStyle: "bold" },
      2: { cellWidth: "auto", halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 15 },
  });

  // Abrir ventana/iframe para imprimir directamente con vista previa nativa
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
