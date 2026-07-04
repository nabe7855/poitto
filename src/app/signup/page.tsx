"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconUserPlus, IconMailCheck } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthCard, authInputCls, authButtonCls } from "@/components/auth/auth-card";

export default function SignUpPage() {
  const { signUp, confirm, resend, signIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(email.trim(), password, orgName.trim());
      setStep("confirm");
    } catch (err) {
      setError(toJa(err));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await confirm(email.trim(), code.trim());
      // 認証後、そのままログインしてホームへ
      await signIn(email.trim(), password);
      router.push("/");
    } catch (err) {
      setError(toJa(err));
      setBusy(false);
    }
  }

  if (step === "confirm") {
    return (
      <AuthCard
        title="メール認証"
        subtitle={`${email} に届いた6桁のコードを入力してください`}
      >
        <form onSubmit={onConfirm} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              確認コード
            </label>
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={`${authInputCls} tracking-widest`}
            />
          </div>
          {error && <p className="text-sm text-coral">{error}</p>}
          <button type="submit" disabled={busy} className={authButtonCls}>
            <IconMailCheck size={18} stroke={2} />
            {busy ? "認証中…" : "認証して始める"}
          </button>
          <button
            type="button"
            onClick={() => resend(email.trim()).catch(() => {})}
            className="w-full text-center text-xs text-ink/50 hover:text-coral"
          >
            コードを再送する
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="新規登録"
      subtitle="メールアドレスで、すぐに始められます"
      footer={
        <>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/signin" className="font-medium text-coral hover:underline">
            ログイン
          </Link>
        </>
      }
    >
      <form onSubmit={onSignUp} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/70">
            団体名・組織名
          </label>
          <input
            type="text"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="例：NPO法人とちぎユース"
            className={authInputCls}
          />
        </div>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputCls}
          />
          <p className="mt-1 text-[11px] text-ink/45">
            8文字以上・大文字・小文字・数字・記号を含めてください
          </p>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={busy} className={authButtonCls}>
          <IconUserPlus size={18} stroke={2} />
          {busy ? "登録中…" : "登録して確認コードを受け取る"}
        </button>
      </form>
    </AuthCard>
  );
}

function toJa(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "UsernameExistsException")
    return "このメールアドレスは既に登録されています。ログインしてください。";
  if (name === "InvalidPasswordException")
    return "パスワードが条件を満たしていません（8文字以上・大文字小文字数字記号）。";
  if (name === "CodeMismatchException")
    return "確認コードが正しくありません。";
  if (name === "ExpiredCodeException")
    return "確認コードの有効期限が切れています。再送してください。";
  if (name === "InvalidParameterException")
    return "入力内容を確認してください（メール形式・パスワード条件など）。";
  // [DEBUG] 原因特定のため生のエラーを表示（後で戻す）
  const msg = (err as { message?: string })?.message ?? "";
  return `処理に失敗しました：${name || "?"} / ${msg}`;
}
