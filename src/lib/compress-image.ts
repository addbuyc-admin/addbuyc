const AVATAR_MAX_DIM = 512;
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
const AVATAR_QUALITIES = [0.85, 0.75, 0.65, 0.55];

export function compressAvatar(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    let useWebP = true;

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
        if (idx >= AVATAR_QUALITIES.length) { reject(new Error("AVATAR_TOO_LARGE")); return; }
        const mimeType = useWebP ? "image/webp" : "image/jpeg";
        canvas.toBlob((result) => {
          if (!result) {
            if (useWebP) { useWebP = false; tryQuality(idx); }
            else { reject(new Error("compression failed")); }
            return;
          }
          if (result.size <= AVATAR_MAX_SIZE) { resolve(result); }
          else { tryQuality(idx + 1); }
        }, mimeType, AVATAR_QUALITIES[idx]);
      }
      tryQuality(0);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("load failed")); };
    img.src = objectUrl;
  });
}

export type CompressResult = {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
};

function isHeicLike(file: File): boolean {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
}

// iPad (platform=MacIntel + touch) / iPhone / iPod の判定
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// base64 DataURL → Blob 変換（toBlob が null を返す iOS 向け fallback）
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const sep = dataUrl.indexOf(",");
    if (sep === -1) return null;
    const header = dataUrl.slice(0, sep);
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(dataUrl.slice(sep + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

// FileReader + DataURL 読み込み（iOS Safari/Chrome で ObjectURL より安定）
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") { resolve(reader.result); }
      else { reject(new Error("FileReader: result is not a string")); }
    };
    reader.onerror = () => {
      reject(new Error("FileReader error: " + (reader.error?.message ?? "unknown")));
    };
    reader.readAsDataURL(file);
  });
}

export function compressImage(file: File): Promise<CompressResult> {
  const MAX_SIZE = 2 * 1024 * 1024;
  // 800px を末尾に追加して極端に大きい画像にも対応
  const DIM_STEPS = [1920, 1600, 1400, 1200, 1024, 800];
  const QUALITY_STEPS = [0.85, 0.78, 0.70, 0.62, 0.55];
  // iOS では canvas.toBlob の WebP 出力が不安定なため JPEG を優先
  const preferJpeg =
    isIOS() || file.type === "image/jpeg" || file.type === "image/jpg";

  return new Promise((resolve, reject) => {
    if (isHeicLike(file)) {
      reject(new Error("HEIC_NOT_SUPPORTED"));
      return;
    }

    readAsDataUrl(file)
      .then((dataUrl) => {
        const img = new Image();
        let webpFailed = preferJpeg;

        img.onload = () => {
          if (img.width === 0 || img.height === 0) {
            reject(new Error("image has zero dimensions: " + img.width + "x" + img.height));
            return;
          }

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
            if (!ctx) {
              reject(new Error("canvas.getContext('2d') returned null"));
              return;
            }
            try {
              ctx.drawImage(img, 0, 0, w, h);
            } catch (e) {
              reject(new Error("drawImage failed: " + String(e)));
              return;
            }

            function tryQuality(qIdx: number) {
              if (qIdx >= QUALITY_STEPS.length) {
                // canvas メモリを解放してから次の寸法へ
                canvas.width = 0;
                canvas.height = 0;
                tryDim(dimIdx + 1);
                return;
              }
              const mimeType = webpFailed ? "image/jpeg" : "image/webp";
              const quality = QUALITY_STEPS[qIdx];

              // toBlob / toDataURL 共通の結果ハンドラ
              function processBlob(blob: Blob | null, isDataUrlFallback = false) {
                if (!blob) {
                  if (!webpFailed) {
                    // WebP が null → JPEG にフォールバック
                    webpFailed = true;
                    tryQuality(qIdx);
                    return;
                  }
                  if (!isDataUrlFallback) {
                    // JPEG の toBlob が null → toDataURL で再挑戦（iOS 対応）
                    try {
                      const du = canvas.toDataURL(mimeType, quality);
                      if (du && du.startsWith("data:image/")) {
                        const fb = dataUrlToBlob(du);
                        processBlob(fb, true);
                        return;
                      }
                    } catch { /* fall through */ }
                  }
                  // 全フォールバック失敗 → 次の寸法で再試行
                  canvas.width = 0;
                  canvas.height = 0;
                  tryDim(dimIdx + 1);
                  return;
                }

                if (blob.size <= MAX_SIZE) {
                  const blobMime =
                    blob.type === "image/jpeg" || blob.type === "image/jpg"
                      ? ("image/jpeg" as const)
                      : ("image/webp" as const);
                  resolve({ blob, contentType: blobMime, extension: blobMime === "image/jpeg" ? "jpg" : "webp" });
                } else {
                  tryQuality(qIdx + 1);
                }
              }

              try {
                canvas.toBlob(processBlob, mimeType, quality);
              } catch {
                // toBlob 自体が例外を投げた場合（API 未対応など）→ toDataURL で代替
                try {
                  const du = canvas.toDataURL(mimeType, quality);
                  if (du && du.startsWith("data:image/")) {
                    processBlob(dataUrlToBlob(du), true);
                  } else {
                    canvas.width = 0;
                    canvas.height = 0;
                    tryDim(dimIdx + 1);
                  }
                } catch {
                  canvas.width = 0;
                  canvas.height = 0;
                  tryDim(dimIdx + 1);
                }
              }
            }

            tryQuality(0);
          }

          tryDim(0);
        };

        img.onerror = (event) => {
          reject(new Error(
            "img.onerror: type=" + file.type +
            " event=" + (event instanceof ErrorEvent ? event.message : String(event))
          ));
        };

        img.src = dataUrl;
      })
      .catch((e: unknown) => {
        reject(new Error("FileReader failed: " + String(e)));
      });
  });
}
