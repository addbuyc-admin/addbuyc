export function compressImage(file: File): Promise<Blob> {
  const MAX_DIM = 1600;
  const QUALITY = 0.82;
  const MAX_SIZE = 2 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("compression failed")); return; }
          if (blob.size > MAX_SIZE) { reject(new Error("IMAGE_TOO_LARGE")); return; }
          resolve(blob);
        },
        "image/webp",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("load failed"));
    };
    img.src = objectUrl;
  });
}
