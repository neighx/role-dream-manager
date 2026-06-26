/**
 * クライアントサイド画像最適化
 * - 最大幅 1600px にリサイズ
 * - WebP に変換（未対応ブラウザは JPEG フォールバック）
 * - サムネイル（400px）も同時生成
 */

export interface OptimizedImage {
  original: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  mimeType: "image/webp" | "image/jpeg";
}

const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;
const QUALITY = 0.85;

function supportsWebP(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function resizeCanvas(img: HTMLImageElement, maxW: number): HTMLCanvasElement {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxW) {
    h = Math.round(h * (maxW / w));
    w = maxW;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob failed"));
      },
      mimeType,
      quality
    );
  });
}

export async function optimizeImage(file: File): Promise<OptimizedImage> {
  const mimeType: "image/webp" | "image/jpeg" = supportsWebP() ? "image/webp" : "image/jpeg";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const mainCanvas = resizeCanvas(img, MAX_WIDTH);
        const thumbCanvas = resizeCanvas(img, THUMB_WIDTH);

        const [original, thumbnail] = await Promise.all([
          canvasToBlob(mainCanvas, mimeType, QUALITY),
          canvasToBlob(thumbCanvas, mimeType, QUALITY),
        ]);

        resolve({
          original,
          thumbnail,
          width: mainCanvas.width,
          height: mainCanvas.height,
          mimeType,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    img.src = objectUrl;
  });
}
