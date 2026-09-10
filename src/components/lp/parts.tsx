import Link from "next/link";

/* =========================================================================
   LPの「まだ決まっていない値」はここに集約。確定したら書き換える。
   ========================================================================= */
export const LP_CONFIG = {
  /** TODO: 運営団体の正式名称に差し替え（登記名 or 対外表記） */
  orgName: "NPO法人とちぎユース",
  /** TODO: 問い合わせ先メールに差し替え */
  contactEmail: "",
  /** CTAのリンク先 */
  ctaPrimary: { href: "/signup", label: "アカウントをつくる" },
  ctaSecondary: { href: "/post", label: "デモをさわってみる" },
  /** TODO: 料金が決まったら pricing セクションを書き換え */
  pricingReady: false,
} as const;

/* ---------------------------------------------------------------- レイアウト */

export function Section({
  id,
  children,
  tone = "base",
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  /** base=オフホワイト / white=白 / ink=濃色 */
  tone?: "base" | "white" | "ink";
  className?: string;
}) {
  const bg =
    tone === "white"
      ? "bg-white"
      : tone === "ink"
        ? "bg-[#2c2c2a] text-white"
        : "bg-[#faf8f5]";
  return (
    <section
      id={id}
      className={`scroll-mt-16 px-5 py-20 md:px-8 md:py-28 ${bg} ${className}`}
    >
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

/** セクション番号＋ラベル（編集記事っぽい見出しの上飾り） */
export function Eyebrow({
  no,
  children,
  invert = false,
}: {
  no: string;
  children: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <p
      className={`mb-4 flex items-center gap-2.5 text-xs font-bold tracking-[0.14em] ${
        invert ? "text-white/55" : "text-black/40"
      }`}
    >
      <span className="font-mono text-coral">{no}</span>
      <span className={`h-px w-6 ${invert ? "bg-white/25" : "bg-black/15"}`} />
      {children}
    </p>
  );
}

export function H2({
  children,
  invert = false,
}: {
  children: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <h2
      className={`text-[1.65rem] font-bold leading-[1.45] tracking-[-0.01em] md:text-[2.15rem] ${
        invert ? "text-white" : "text-ink"
      }`}
    >
      {children}
    </h2>
  );
}

export function Lead({
  children,
  invert = false,
}: {
  children: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <p
      className={`mt-5 max-w-2xl text-[0.95rem] leading-[2] md:text-base ${
        invert ? "text-white/70" : "text-black/65"
      }`}
    >
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------------- CTA */

export function PrimaryCta({
  href = LP_CONFIG.ctaPrimary.href,
  children = LP_CONFIG.ctaPrimary.label,
  className = "",
}: {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-coral px-7 py-3.5 text-[0.95rem] font-bold text-white transition-colors hover:bg-coral-600 ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({
  href = LP_CONFIG.ctaSecondary.href,
  children = LP_CONFIG.ctaSecondary.label,
  invert = false,
  className = "",
}: {
  href?: string;
  children?: React.ReactNode;
  invert?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-[0.95rem] font-bold transition-colors ${
        invert
          ? "border-white/25 text-white hover:bg-white/10"
          : "border-black/15 text-ink hover:bg-black/[0.04]"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------- 小さな部品 */

/** 紙片っぽいカード（ほんの少し傾ける） */
export function Paper({
  children,
  tilt = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** deg */
  tilt?: number;
  className?: string;
}) {
  return (
    <div
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      className={`rounded-[14px] border border-black/[0.07] bg-white p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** ファイル名を見せるチップ */
export function FileChip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "coral";
}) {
  return (
    <code
      className={`inline-block break-all rounded-lg border px-3 py-2 font-mono text-[0.8rem] leading-relaxed md:text-sm ${
        tone === "coral"
          ? "border-coral/25 bg-coral-50 text-ink"
          : "border-black/10 bg-black/[0.03] text-black/55"
      }`}
    >
      {children}
    </code>
  );
}
