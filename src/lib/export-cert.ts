import JSZip from "jszip";
import { jsPDF } from "jspdf";
import pkg from "file-saver";
import { getTemplateImage, drawCertificate, sanitizeFilename } from "./render-cert";
import type { LoadedTemplate } from "./template-loader";
import type { ParsedData } from "./data-loader";
import type { Placeholder } from "./cert-types";

const { saveAs } = pkg;

export interface GeneratedCert {
  filename: string;
  dataUrl: string;
  width: number;
  height: number;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function downloadSingle(cert: GeneratedCert) {
  saveAs(dataUrlToBlob(cert.dataUrl), `${cert.filename}.png`);
}

export async function downloadZip(certs: GeneratedCert[]) {
  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (const c of certs) {
    let name = c.filename;
    const n = seen.get(name) ?? 0;
    if (n > 0) name = `${name}_${n + 1}`;
    seen.set(c.filename, n + 1);
    zip.file(`${name}.png`, dataUrlToBlob(c.dataUrl));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, "certificates.zip");
}

export function downloadCombinedPdf(certs: GeneratedCert[]) {
  if (!certs.length) return;
  const first = certs[0];
  const orientation = first.width >= first.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [first.width, first.height] });
  certs.forEach((c, i) => {
    if (i > 0) {
      pdf.addPage([c.width, c.height], c.width >= c.height ? "landscape" : "portrait");
    }
    pdf.addImage(c.dataUrl, "PNG", 0, 0, c.width, c.height);
  });
  pdf.save("certificates.pdf");
}

export async function generateZipOnTheFly(
  template: LoadedTemplate,
  data: ParsedData,
  placeholders: Placeholder[],
  mapping: Record<string, string>,
  filenameColumn: string,
  onProgress: (current: number, total: number) => void
) {
  const zip = new JSZip();
  const seen = new Map<string, number>();
  const img = await getTemplateImage(template.dataUrl);
  const canvas = document.createElement("canvas");
  const total = data.rows.length;

  for (let i = 0; i < total; i++) {
    const row = data.rows[i];
    const values: Record<string, string> = {};
    for (const p of placeholders) {
      const col = mapping[p.id];
      values[p.id] = col ? row[col] ?? "" : p.sample;
    }
    drawCertificate(canvas, img, placeholders, values);

    const rawFilename = sanitizeFilename(row[filenameColumn] ?? "", `certificate_${i + 1}`);
    let filename = rawFilename;
    const n = seen.get(filename) ?? 0;
    if (n > 0) filename = `${filename}_${n + 1}`;
    seen.set(rawFilename, n + 1);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      zip.file(`${filename}.png`, blob);
    }

    onProgress(i + 1, total);
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, "certificates.zip");
}

export async function generatePdfOnTheFly(
  template: LoadedTemplate,
  data: ParsedData,
  placeholders: Placeholder[],
  mapping: Record<string, string>,
  onProgress: (current: number, total: number) => void
) {
  const total = data.rows.length;
  if (!total) return;

  const img = await getTemplateImage(template.dataUrl);
  const canvas = document.createElement("canvas");

  // Draw the first one to determine layout dimensions
  const firstRow = data.rows[0];
  const firstValues: Record<string, string> = {};
  for (const p of placeholders) {
    const col = mapping[p.id];
    firstValues[p.id] = col ? firstRow[col] ?? "" : p.sample;
  }
  drawCertificate(canvas, img, placeholders, firstValues);

  const width = canvas.width;
  const height = canvas.height;
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [width, height] });

  for (let i = 0; i < total; i++) {
    const row = data.rows[i];
    const values: Record<string, string> = {};
    for (const p of placeholders) {
      const col = mapping[p.id];
      values[p.id] = col ? row[col] ?? "" : p.sample;
    }
    drawCertificate(canvas, img, placeholders, values);

    if (i > 0) {
      pdf.addPage([width, height], orientation);
    }

    pdf.addImage(canvas, "JPEG", 0, 0, width, height, undefined, "FAST");

    onProgress(i + 1, total);
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  pdf.save("certificates.pdf");
}