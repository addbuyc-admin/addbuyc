"use client";

type ThumbnailProps = {
  src: string;
  onRemove: () => void;
  saving: boolean;
};

function Thumbnail({ src, onRemove, saving }: ThumbnailProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="aspect-square w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        disabled={saving}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white transition hover:bg-red-600/90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="この画像を削除"
      >
        ✕
      </button>
    </div>
  );
}

export type ImageEditorProps = {
  title?: string;
  existingUrls: string[];
  newPreviews: string[];
  maxImages?: number;
  saving: boolean;
  error?: string | null;
  onRemoveExisting: (index: number) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveNew: (index: number) => void;
  onSave?: () => void;
  onCancel?: () => void;
};

export function ImageEditor({
  title,
  existingUrls,
  newPreviews,
  maxImages = 5,
  saving,
  error,
  onRemoveExisting,
  onAddFiles,
  onRemoveNew,
  onSave,
  onCancel,
}: ImageEditorProps) {
  const total = existingUrls.length + newPreviews.length;
  const remaining = maxImages - total;

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-semibold text-zinc-700">{title}</p>}
      {total > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {existingUrls.map((url, i) => (
            <Thumbnail key={`e-${i}`} src={url} onRemove={() => onRemoveExisting(i)} saving={saving} />
          ))}
          {newPreviews.map((src, i) => (
            <Thumbnail key={`n-${i}`} src={src} onRemove={() => onRemoveNew(i)} saving={saving} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">画像なし</p>
      )}
      {remaining > 0 && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={onAddFiles}
            disabled={saving}
          />
          + 画像を追加
          <span className="font-normal text-zinc-400">（残り{remaining}枚）</span>
        </label>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {(onSave ?? onCancel) && (
        <div className="flex items-center gap-3">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "保存中…" : "保存する"}
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              キャンセル
            </button>
          )}
        </div>
      )}
    </div>
  );
}
