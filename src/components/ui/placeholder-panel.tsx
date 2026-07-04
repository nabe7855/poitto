import Image from "next/image";

/** フェーズ2で中身を実装する画面の骨格プレースホルダ */
export function PlaceholderPanel({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white px-6 py-16 text-center">
      <Image
        src="/brand/mark/poitto_mark_256.png"
        alt=""
        width={72}
        height={93}
        className="mb-5 h-16 w-auto opacity-90"
      />
      <p className="text-base font-bold text-ink">{title}</p>
      {note && <p className="mt-2 max-w-sm text-sm text-ink/55">{note}</p>}
      <span className="mt-4 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber">
        フェーズ2で実装予定
      </span>
    </div>
  );
}
