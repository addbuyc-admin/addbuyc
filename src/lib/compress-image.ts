const AVATAR_MAX_DIM = 512;
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
const AVATAR_QUALITIES = [0.85, 0.75, 0.65, 0.55];

export function compressAvatar(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(AVATAR_MAX_DIM / img.width, AVATAR_MAX_DIM / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);

      function tryQuality(idx: number) {
        if (idx >= AVATAR_QUALITIES.length) {
          reject(new Error("AVATAR_TOO_LARGE"));
          return;
        }
        canvas.toBlob(
          (result) => {
            if (!result) { reject(new Error("compression failed")); return; }
            if (result.size <= AVATAR_MAX_SIZE) { resolve(result); }
            else { tryQuality(idx + 1); }
          },
          "image/webp",
          AVATAR_QUALITIES[idx],
        );
      }
      tryQuality(0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("load failed"));
    };
    img.src = objectUrl;
  });
}

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
