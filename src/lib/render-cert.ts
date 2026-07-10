import type { Placeholder } from "./cert-types";

let templateImg: HTMLImageElement | null = null;
let templateSrc = "";

export async function getTemplateImage(dataUrl: string): Promise<HTMLImageElement> {
  if (templateImg && templateSrc === dataUrl) return templateImg;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load template image."));
    img.src = dataUrl;
  });
  templateImg = img;
  templateSrc = dataUrl;
  return img;
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  basePx: number,
  family: string,
  weight: string,
  style: string,
) {
  let px = basePx;
  ctx.font = `${style} ${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && px > 6) {
    px -= 1;
    ctx.font = `${style} ${weight} ${px}px ${family}`;
  }
  return px;
}

/** Draw the template + all placeholder values onto the canvas at natural size. */
export function drawCertificate(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  placeholders: Placeholder[],
  values: Record<string, string>,
) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  for (const p of placeholders) {
    const text = values[p.id] ?? p.sample ?? "";
    if (!text) continue;
    const boxX = p.xRel * W;
    const boxY = p.yRel * H;
    const boxW = p.wRel * W;
    const basePx = p.fontRel * H;
    const weight = p.bold ? "700" : "400";
    const fontStyle = p.italic ? "italic" : "normal";
    const px = fitFont(ctx, text, boxW, basePx, p.fontFamily, weight, fontStyle);
    ctx.font = `${fontStyle} ${weight} ${px}px ${p.fontFamily}`;
    ctx.fillStyle = p.color;
    ctx.textBaseline = "middle";
    ctx.textAlign = p.align;
    let tx = boxX;
    if (p.align === "center") tx = boxX + boxW / 2;
    else if (p.align === "right") tx = boxX + boxW;
    const ty = boxY + basePx / 2;
    ctx.fillText(text, tx, ty);
  }
}

export function sanitizeFilename(name: string, fallback: string): string {
  const clean = (name || "").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_");
  return clean || fallback;
}