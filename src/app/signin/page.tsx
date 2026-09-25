"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconLogin2 } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthCard, authInputCls, authButtonCls } from "@/components/auth/auth-card";

import { ROUTES } from "@/lib/routes";
export default function SignInPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.push(ROUTES.home);
    } catch (err) {
      // 原因調査のため、実際のエラーは開発者ツールにも残す
      console.error("[signin]", err);
      // 画面が古い（更新前の部品を読み込めない）場合は、最新に読み直して解決する
      if (isStaleBundle(err)) {
        setError("画面を最新の状態に更新しています…");
        window.location.reload();
        return;
      }
      setError(toJa(err));
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="ログイン"
      subtitle="入れるだけで、証憑がかたづく。"
      footer={
        <>
          アカウントをお持ちでない方は{" "}
          <Link href={ROUTES.signup} className="font-medium text-coral hover:underline">
            新規登録
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/70">
            メールアドレス
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/70">
            パスワード
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputCls}
          />
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={busy} className={authButtonCls}>
          <IconLogin2 size={18} stroke={2} />
          {busy ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </AuthCard>
  );
}

/** 更新前の古い画面が、新しい部品を読み込めずに失敗したか */
function isStaleBundle(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const msg = (err as { message?: string })?.message ?? "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk|dynamically imported module|Importing a module script failed/i.test(msg)
  );
}

function toJa(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  const msg = (err as { message?: string })?.message ?? "";
  if (name === "UserNotConfirmedException")
    return "メール認証が未完了です。登録時のコードで認証してください。";
  if (name === "NotAuthorizedException") {
    if (/attempts exceeded/i.test(msg))
      return "ログインの試行回数が上限に達しました。15分ほど待ってから再度お試しください。";
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (name === "UserNotFoundException")
    return "このメールアドレスは登録されていません。";
  if (name === "PasswordResetRequiredException")
    return "パスワードの再設定が必要です。管理者にお問い合わせください。";
  if (name === "LimitExceededException" || name === "TooManyRequestsException")
    return "短時間に操作が集中しました。少し待ってから再度お試しください。";
  if (name === "NetworkError" || /Failed to fetch|Network ?Error|Load failed/i.test(msg))
    return "通信に失敗しました。インターネット接続や、セキュリティソフト・社内ネットワークの設定で通信が止められていないかご確認ください。";
  // 想定外: 原因を特定できるようエラーコードを添える
  return `ログインに失敗しました。時間をおいて再度お試しください。（エラーコード: ${name || "unknown"}）`;
}
