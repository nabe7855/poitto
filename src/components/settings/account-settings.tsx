"use client";

import { useState } from "react";
import {
  IconBuildingCommunity,
  IconMail,
  IconLock,
  IconLogout,
  IconCheck,
  IconPencil,
} from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/auth-context";

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20";

export function AccountSettings() {
  const { realMode, status, email, orgName, updateOrgName, changePassword, signOut } =
    useAuth();

  if (!realMode || status !== "authed") {
    return (
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
        <h2 className="text-sm font-bold text-ink">アカウント</h2>
        <p className="mt-2 text-sm text-ink/50">
          団体名・パスワードの変更は、ログイン機能が有効なとき（本番）に表示されます。
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      <div className="border-b border-black/[0.06] px-5 py-3">
        <h2 className="text-sm font-bold text-ink">アカウント</h2>
      </div>

      <OrgNameRow orgName={orgName} onSave={updateOrgName} />
      <EmailRow email={email} />
      <PasswordRow onSave={changePassword} />

      <button
        type="button"
        onClick={() => signOut()}
        className="flex w-full items-center gap-2 px-5 py-4 text-sm font-medium text-coral transition-colors hover:bg-coral-50/50"
      >
        <IconLogout size={18} stroke={1.75} />
        ログアウト
      </button>
    </section>
  );
}

/** 団体名（その場で編集） */
function OrgNameRow({
  orgName,
  onSave,
}: {
  orgName: string | null;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(orgName ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(value.trim());
      setEditing(false);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      setError("保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row icon={<IconBuildingCommunity size={18} stroke={1.75} />} label="団体名">
      {editing ? (
        <div className="mt-2 space-y-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
          />
          {error && <p className="text-xs text-coral">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-coral px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(orgName ?? "");
              }}
              className="rounded-full border border-black/10 px-4 py-1.5 text-xs font-medium text-ink/60"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink">{orgName ?? "—"}</span>
          <EditButton onClick={() => setEditing(true)} done={done} />
        </div>
      )}
    </Row>
  );
}

/** メールアドレス（現状は表示のみ） */
function EmailRow({ email }: { email: string | null }) {
  return (
    <Row icon={<IconMail size={18} stroke={1.75} />} label="メールアドレス">
      <div className="flex items-center justify-between">
        <span className="truncate text-sm text-ink">{email ?? "—"}</span>
      </div>
      <p className="mt-1 text-[11px] text-ink/40">
        ※ メールアドレスの変更は現在準備中です。
      </p>
    </Row>
  );
}

/** パスワード変更 */
function PasswordRow({
  onSave,
}: {
  onSave: (oldPw: string, newPw: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(oldPw, newPw);
      setEditing(false);
      setOldPw("");
      setNewPw("");
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      if (name === "NotAuthorizedException")
        setError("現在のパスワードが正しくありません。");
      else if (name === "InvalidPasswordException")
        setError("新しいパスワードが条件を満たしていません（8文字以上・大文字小文字数字記号）。");
      else setError("変更に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row icon={<IconLock size={18} stroke={1.75} />} label="パスワード">
      {editing ? (
        <div className="mt-2 space-y-2">
          <input
            type="password"
            placeholder="現在のパスワード"
            autoComplete="current-password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className={inputCls}
          />
          <input
            type="password"
            placeholder="新しいパスワード（8文字以上・大小英数字記号）"
            autoComplete="new-password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className={inputCls}
          />
          {error && <p className="text-xs text-coral">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || !oldPw || !newPw}
              className="rounded-full bg-coral px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "変更中…" : "変更する"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-full border border-black/10 px-4 py-1.5 text-xs font-medium text-ink/60"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink/50">••••••••</span>
          <EditButton onClick={() => setEditing(true)} done={done} label="変更" />
        </div>
      )}
    </Row>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-black/[0.05] px-5 py-4 last:border-0">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-ink/55">
        <span className="text-ink/40">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function EditButton({
  onClick,
  done,
  label = "編集",
}: {
  onClick: () => void;
  done?: boolean;
  label?: string;
}) {
  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-mint">
        <IconCheck size={14} stroke={2.5} />
        保存しました
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-coral hover:bg-coral-50"
    >
      <IconPencil size={13} stroke={2} />
      {label}
    </button>
  );
}
