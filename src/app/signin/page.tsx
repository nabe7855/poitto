"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconLogin2 } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthCard, authInputCls, authButtonCls } from "@/components/auth/auth-card";

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
      router.push("/");
    } catch (err) {
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
          <Link href="/signup" className="font-medium text-coral hover:underline">
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

function toJa(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "UserNotConfirmedException")
    return "メール認証が未完了です。登録時のコードで認証してください。";
  if (name === "NotAuthorizedException")
    return "メールアドレスまたはパスワードが正しくありません。";
  if (name === "UserNotFoundException")
    return "このメールアドレスは登録されていません。";
  return "ログインに失敗しました。時間をおいて再度お試しください。";
}
