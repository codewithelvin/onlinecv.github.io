/**
 * Canvas-based crop → downscale → JPEG-compress helper (spec FR-15). Everything
 * runs in the browser; output is a small base64 data URL (~tens of KB) stored
 * in IndexedDB. No upload server.
 */

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (e) => reject(e));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

function toRadian(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotatedSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rad = toRadian(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Approximate byte size of a base64 data URL payload. */
function dataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Math.floor((payload.length * 3) / 4);
}

/**
 * Produce a square, downscaled, JPEG-compressed data URL from a source image
 * and a crop area (in source pixels) with optional rotation. Quality is stepped
 * down until the output is under `targetBytes`.
 */
export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: PixelArea,
  rotation = 0,
  outSize = 400,
  targetBytes = 60 * 1024,
): Promise<string> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const bBox = rotatedSize(image.width, image.height, rotation);
  canvas.width = bBox.width;
  canvas.height = bBox.height;

  ctx.translate(bBox.width / 2, bBox.height / 2);
  ctx.rotate(toRadian(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  // Draw the cropped region into the square output canvas, scaled to outSize.
  const out = document.createElement('canvas');
  out.width = outSize;
  out.height = outSize;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('Canvas 2D context unavailable');
  outCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outSize,
    outSize,
  );

  let quality = 0.85;
  let dataUrl = out.toDataURL('image/jpeg', quality);
  while (dataUrlBytes(dataUrl) > targetBytes && quality > 0.4) {
    quality -= 0.1;
    dataUrl = out.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}
