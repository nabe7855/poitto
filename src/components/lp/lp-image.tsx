"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * LP用の画像スロット。
 * `public/lp/` に指定のファイルを置くと、そのまま表示される（next/imageで最適化）。
 * まだ置かれていない（404）ときは、ファイル名入りのプレースホルダ枠を出す。
 * → 画像が揃うまでレイアウトを確認でき、揃った瞬間に差し替わる。
 */
export function LpImage({
  src,
  alt,
  ratio,
  note,
  className = "",
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority = false,
}: {
  /** 例: "/lp/hero.png" */
  src: string;
  alt: string;
  /** CSSのaspect-ratio値。例: "16 / 9" */
  ratio: string;
  /** プレースホルダに出す補足（何の絵か） */
  note?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileName = src.split("/").pop();

  // SSRされた<img>は、ハイドレーション前に読み込みが終わることがある。
  // その場合 onError が拾えないので、マウント時に読み込み結果を見る。
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div
        style={{ aspectRatio: ratio }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-[16px] border-2 border-dashed border-black/15 bg-white/60 p-6 text-center ${className}`}
      >
        <span className="font-mono text-xs text-black/45">{fileName}</span>
        {note ? (
          <span className="max-w-[22rem] text-xs leading-relaxed text-black/35">
            {note}
          </span>
        ) : null}
        <span className="mt-1 text-[10px] text-black/25">
          public/lp/ に置くと表示されます
        </span>
      </div>
    );
  }

  return (
    <div
      style={{ aspectRatio: ratio }}
      className={`relative overflow-hidden rounded-[16px] ${className}`}
    >
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </div>
  );
}
