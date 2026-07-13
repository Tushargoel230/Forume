/** Client-side photo processing for the optional CV photo.
    Resizes to a small portrait thumbnail and compresses to a base64 JPEG
    data URL small enough to store inline in the profile / localStorage. */

type Options = { maxDim?: number; quality?: number; maxBytes?: number };

/** Rough byte size of a base64 data URL (payload only). */
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = url;
  });
}

export async function fileToResizedDataUrl(
  file: File,
  { maxDim = 320, quality = 0.82, maxBytes = 100_000 }: Options = {},
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG or PNG).");
  }

  const img = await loadImage(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process the image on this device.");
  ctx.drawImage(img, 0, 0, w, h);

  // step quality down until the encoded image fits under the byte cap
  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrlBytes(dataUrl) > maxBytes && q > 0.5) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}
