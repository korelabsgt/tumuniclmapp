import jsPDF from 'jspdf';

export interface LogoMunicipal {
  dataUrl: string;
  w: number;
  h: number;
}

const MARGIN = 14;

export const cargarLogoMunicipal = (): Promise<LogoMunicipal> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar el logo'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error('No se pudo cargar el logo municipal'));
    img.src = `${window.location.origin}/images/logo-muni.png`;
  });

export const dibujarCintilloAzul = (doc: jsPDF, x: number, y: number, width: number) => {
  const barH = 1.2;
  const r = 0.35;
  const segW = width / 4;
  const barColors: [number, number, number][] = [
    [30, 58, 138],
    [37, 99, 235],
    [96, 165, 250],
    [191, 219, 254],
  ];

  barColors.forEach(([cr, cg, cb], i) => {
    doc.setFillColor(cr, cg, cb);
    const sx = x + i * segW;
    const sw = i === barColors.length - 1 ? width - segW * i : segW;

    if (i === 0) {
      doc.roundedRect(sx, y, sw, barH, r, r, 'F');
      doc.rect(sx + r * 0.85, y, sw - r * 0.85 + 0.05, barH, 'F');
    } else if (i === barColors.length - 1) {
      doc.roundedRect(sx, y, sw, barH, r, r, 'F');
      doc.rect(sx, y, sw - r * 0.85, barH, 'F');
    } else {
      doc.rect(sx, y, sw + 0.05, barH, 'F');
    }
  });

  return y + barH;
};

const TITULO_MUNICIPAL = 'Municipalidad de Concepción Las Minas';
const TITULO_FONT_SIZE = 12;

/** jsPDF subestima el ancho con tildes (ej. ó); calibramos con canvas. */
const medirAnchoTituloMunicipal = (doc: jsPDF): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(TITULO_FONT_SIZE);

  const refAscii = 'Municipalidad de';
  const refJs = doc.getTextWidth(refAscii);

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx && refJs > 0) {
      ctx.font = `bold ${TITULO_FONT_SIZE}pt Helvetica, Arial, sans-serif`;
      const refCanvas = ctx.measureText(refAscii).width;
      const fullCanvas = ctx.measureText(TITULO_MUNICIPAL).width;
      if (refCanvas > 0) {
        return refJs * (fullCanvas / refCanvas);
      }
    }
  }

  return doc.getTextWidth(TITULO_MUNICIPAL);
};

export function dibujarEncabezadoMunicipalPdf(
  doc: jsPDF,
  logo: LogoMunicipal,
  opts: {
    tituloDocumento: string;
    lineas: string[];
  }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const startY = 12;
  const logoColW = 42;
  const logoColX = MARGIN;
  const textColX = MARGIN + logoColW + 4;
  const textColW = pageWidth - MARGIN - textColX;

  const logoMaxH = 30;
  const logoMaxW = logoColW - 4;
  const aspect = logo.w / logo.h;
  let logoH = logoMaxH;
  let logoW = logoH * aspect;
  if (logoW > logoMaxW) {
    logoW = logoMaxW;
    logoH = logoW / aspect;
  }
  const logoY = startY;
  doc.addImage(logo.dataUrl, 'PNG', logoColX, logoY, logoW, logoH);

  let textY = startY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(TITULO_FONT_SIZE);
  doc.setTextColor(30, 58, 138);
  doc.text(TITULO_MUNICIPAL, textColX, textY, { align: 'left', maxWidth: textColW });

  textY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text('Chiquimula, Guatemala', textColX, textY, { align: 'left' });

  textY += 4;
  const barW = medirAnchoTituloMunicipal(doc);
  textY = dibujarCintilloAzul(doc, textColX, textY, barW) + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(opts.tituloDocumento, MARGIN, textY, { align: 'left' });

  textY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  opts.lineas.forEach((linea) => {
    doc.text(linea, MARGIN, textY);
    textY += 5;
  });

  const headerBottom = Math.max(logoY + logoH, textY) + 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, headerBottom, pageWidth - MARGIN, headerBottom);

  return headerBottom + 6;
}
