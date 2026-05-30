"use client";

type ImageGridProps = {
  urls: string[];
  onClickImage?: (url: string) => void;
};

function GridCell({ url, onClick }: { url: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="block cursor-zoom-in overflow-hidden"
      onClick={onClick}
      aria-label="画像を拡大表示"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="aspect-square w-full object-cover" />
    </button>
  );
}

export function ImageGrid({ urls, onClickImage }: ImageGridProps) {
  if (urls.length === 0) return null;

  const click = (url: string) => onClickImage?.(url);

  if (urls.length === 1) {
    return (
      <button
        type="button"
        className="block w-full cursor-zoom-in"
        onClick={() => click(urls[0])}
        aria-label="画像を拡大表示"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="max-h-[400px] w-full object-cover" />
      </button>
    );
  }

  // 2 or 4: 2-column grid
  if (urls.length === 2 || urls.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {urls.map((url, i) => (
          <GridCell key={i} url={url} onClick={() => click(url)} />
        ))}
      </div>
    );
  }

  // 3 or 5: first image full width + remainder in 2-column grid
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className="block w-full cursor-zoom-in overflow-hidden"
        onClick={() => click(urls[0])}
        aria-label="画像を拡大表示"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="max-h-[300px] w-full object-cover" />
      </button>
      <div className="grid grid-cols-2 gap-0.5">
        {urls.slice(1).map((url, i) => (
          <GridCell key={i} url={url} onClick={() => click(url)} />
        ))}
      </div>
    </div>
  );
}
