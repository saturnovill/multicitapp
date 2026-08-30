import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type PdfWriter = { doc: PDFDocument; page: PDFPage; font: PDFFont; bold: PDFFont; y: number };

export async function createTextPdf(title: string, lines: { text: string; bold?: boolean; size?: number }[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const writer: PdfWriter = { doc, page: doc.addPage([612, 792]), font, bold, y: 748 };
  drawLine(writer, title, true, 18);
  writer.y -= 8;
  for (const line of lines) drawWrapped(writer, sanitize(line.text), line.bold, line.size ?? 10);
  return doc.save();
}

function sanitize(value: string) {
  return value.replaceAll("•", "-").replaceAll("×", "x").replaceAll("—", "-");
}

function drawWrapped(writer: PdfWriter, text: string, isBold = false, size = 10) {
  const font = isBold ? writer.bold : writer.font;
  const words = text.split(/\s+/);
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > 520 && line) {
      drawLine(writer, line, isBold, size);
      line = word;
    } else line = next;
  }
  drawLine(writer, line || " ", isBold, size);
}

function drawLine(writer: PdfWriter, text: string, isBold: boolean, size: number) {
  if (writer.y < 44) { writer.page = writer.doc.addPage([612, 792]); writer.y = 748; }
  writer.page.drawText(text, { x: 46, y: writer.y, size, font: isBold ? writer.bold : writer.font, color: rgb(0.12, 0.1, 0.16) });
  writer.y -= size + 6;
}
