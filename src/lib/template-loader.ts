export interface LoadedTemplate {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

/** Load an image file into a data URL + natural dimensions. */
function loadImageFile(file: File): Promise<LoadedTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () =>
        resolve({ name: file.name, dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not read image."));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

/** Render the first page of a PDF to a high-res PNG data URL. */
async function loadPdfFile(file: File): Promise<LoadedTemplate> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const scale = 2.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
  return { name: file.name, dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

export async function loadTemplate(file: File): Promise<LoadedTemplate> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return loadPdfFile(file);
  }
  return loadImageFile(file);
}