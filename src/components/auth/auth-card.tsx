import Image from "next/image";

/** ログイン/登録画面の共通カード（ロゴ＋中央寄せ） */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-background-soft px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/brand/logo/poitto_logo_horizontal.png"
            alt="ポイッと POITTO"
            width={160}
            height={38}
            priority
            className="h-9 w-auto"
          />
          <h1 className="mt-6 text-lg font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          {children}
        </div>
        {footer && (
          <div className="mt-4 text-center text-sm text-ink/60">{footer}</div>
        )}
      </div>
    </div>
  );
}

export const authInputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20";

export const authButtonCls =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50";
