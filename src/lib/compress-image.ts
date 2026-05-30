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
  const MAX_SIZE = 2 * 1024 * 1024;
  const DIM_STEPS = [1920, 1600, 1280, 1024];
  const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      function tryDim(dimIdx: number) {
        if (dimIdx >= DIM_STEPS.length) {
          reject(new Error("IMAGE_TOO_LARGE"));
          return;
        }

        const maxDim = DIM_STEPS[dimIdx];
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas unavailable")); return; }
        ctx.drawImage(img, 0, 0, w, h);

        function tryQuality(qIdx: number) {
          if (qIdx >= QUALITY_STEPS.length) {
            tryDim(dimIdx + 1);
            return;
          }
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error("compression failed")); return; }
              if (blob.size <= MAX_SIZE) {
                resolve(blob);
              } else {
                tryQuality(qIdx + 1);
              }
            },
            "image/webp",
            QUALITY_STEPS[qIdx],
          );
        }

        tryQuality(0);
      }

      tryDim(0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("load failed"));
    };
    img.src = objectUrl;
  });
}
