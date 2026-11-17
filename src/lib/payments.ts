// 支払い管理（請求書の支払い忘れ防止）のロジック。
// 日付はすべて利用者のローカル日付で扱う（"YYYY-MM-DD"）。
import type {
  DocType,
  DocumentRecord,
  PaymentMethod,
  PaymentStatus,
} from "./types";

/** 画面上の支払状況（保存値＋書類の種類・引落日から決まる） */
export type EffectivePayment =
  | "unpaid" // 未払い
  | "paid" // 支払済み
  | "auto_paid" // 口座振替・カードで引落日を過ぎた（支払済みとみなす）
  | "not_applicable" // 支払いの対象外（見積書・納品書など）
  | "unknown"; // 未確認（支払い管理の導入前からある請求書）

/** 支払い画面での分類 */
export type PaymentBucket = "overdue" | "soon" | "later" | "nodate" | "auto";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: "振込",
  debit: "口座振替",
  card: "カード",
  cash: "現金",
};

export const BUCKET_META: Record<
  PaymentBucket,
  { label: string; hint: string }
> = {
  overdue: { label: "期限切れ", hint: "支払期日を過ぎています" },
  soon: { label: "7日以内", hint: "まもなく支払期日です" },
  later: { label: "それ以降", hint: "" },
  nodate: { label: "期日未設定", hint: "請求書から期日を読み取れませんでした" },
  auto: { label: "口座振替・カード払い", hint: "引落日に自動で支払われます" },
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 今日（ローカル日付） */
export function todayIso(now = new Date()): string {
  return toIso(now);
}

/** 期日まであと何日か（過ぎていれば負） */
export function daysUntil(iso: string, now = new Date()): number | null {
  const d = parseIso(iso);
  if (!d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** "11/30（月）" */
export function formatDueShort(iso: string | null | undefined): string {
  if (!iso) return "未設定";
  const d = parseIso(iso);
  if (!d) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

/** "あと3日" / "今日まで" / "3日超過" */
export function dueRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "期日未設定";
  const n = daysUntil(iso, now);
  if (n == null) return "";
  if (n > 0) return `あと${n}日`;
  if (n === 0) return "今日まで";
  return `${-n}日超過`;
}

/** 今月末・来月末（期日のクイック設定用） */
export function endOfMonthIso(now = new Date(), addMonths = 0): string {
  return toIso(new Date(now.getFullYear(), now.getMonth() + addMonths + 1, 0));
}

export function isAutoMethod(m: PaymentMethod | null | undefined): boolean {
  return m === "debit" || m === "card";
}

/** 支払い管理の対象か（請求書、または明示的に未払いにしたもの）。抽出中・エラーは対象外 */
export function isPayable(d: DocumentRecord): boolean {
  if (d.status === "extracting" || d.status === "error") return false;
  return d.documentType === "invoice" || d.paymentStatus === "unpaid";
}

/** 画面上の支払状況 */
export function effectivePayment(
  d: DocumentRecord,
  now = new Date(),
): EffectivePayment {
  if (d.paymentStatus === "paid") return "paid";
  if (d.paymentStatus === "not_applicable") return "not_applicable";
  if (d.paymentStatus === "unpaid") {
    const n = d.dueDate ? daysUntil(d.dueDate, now) : null;
    if (isAutoMethod(d.paymentMethod) && n != null && n < 0) return "auto_paid";
    return "unpaid";
  }
  // 未設定（支払い管理の導入前からある証憑）
  if (d.documentType === "invoice") return "unknown";
  if (d.documentType === "receipt") return "paid";
  return "not_applicable";
}

/** 未払いの請求書の分類（未払いでなければ null） */
export function bucketOf(
  d: DocumentRecord,
  now = new Date(),
): PaymentBucket | null {
  if (!isPayable(d) || effectivePayment(d, now) !== "unpaid") return null;
  if (isAutoMethod(d.paymentMethod)) return "auto";
  if (!d.dueDate) return "nodate";
  const n = daysUntil(d.dueDate, now);
  if (n == null) return "nodate";
  if (n < 0) return "overdue";
  if (n <= 7) return "soon";
  return "later";
}

/** 書類の種類から決まる初期の支払状況（請求書=未払い、領収書=支払済み） */
export function defaultPaymentFor(
  type: DocType | null,
  transactionDate: string | null,
): Pick<DocumentRecord, "paymentStatus" | "paidAt"> {
  if (type === "invoice") return { paymentStatus: "unpaid", paidAt: null };
  if (type === "receipt") return { paymentStatus: "paid", paidAt: transactionDate };
  return { paymentStatus: "not_applicable", paidAt: null };
}

export interface PaymentSummary {
  overdue: DocumentRecord[];
  soon: DocumentRecord[];
  /** 未払い（引落予定を含む） */
  unpaid: DocumentRecord[];
  unpaidTotal: number;
  /** 未確認（導入前の請求書） */
  unknown: DocumentRecord[];
  /** 気づかせるべき件数（期限切れ＋7日以内） */
  alertCount: number;
}

const byDue = (a: DocumentRecord, b: DocumentRecord) =>
  (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1;

export function paymentSummary(
  docs: DocumentRecord[],
  now = new Date(),
): PaymentSummary {
  const overdue: DocumentRecord[] = [];
  const soon: DocumentRecord[] = [];
  const unpaid: DocumentRecord[] = [];
  const unknown: DocumentRecord[] = [];
  for (const d of docs) {
    if (!isPayable(d)) continue;
    const eff = effectivePayment(d, now);
    if (eff === "unknown") unknown.push(d);
    if (eff !== "unpaid") continue;
    unpaid.push(d);
    const b = bucketOf(d, now);
    if (b === "overdue") overdue.push(d);
    if (b === "soon") soon.push(d);
  }
  overdue.sort(byDue);
  soon.sort(byDue);
  return {
    overdue,
    soon,
    unpaid,
    unpaidTotal: unpaid.reduce((s, d) => s + (d.amountInclTax ?? 0), 0),
    unknown,
    alertCount: overdue.length + soon.length,
  };
}

// ── カレンダー登録 ──

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDayIso(iso: string): string {
  const d = parseIso(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + 1);
  return toIso(d);
}

function eventTitle(d: DocumentRecord): string {
  const amount = d.amountInclTax != null ? ` ${d.amountInclTax.toLocaleString("ja-JP")}円` : "";
  return `【支払期日】${d.partnerName ?? "請求書"}${amount}`;
}

/** Googleカレンダーの登録画面URL（終日予定） */
export function googleCalendarUrl(d: DocumentRecord): string | null {
  if (!d.dueDate) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(d),
    dates: `${compactDate(d.dueDate)}/${compactDate(nextDayIso(d.dueDate))}`,
    details: "ポイっとに保存した請求書の支払期日です。支払ったら、ポイっとで「支払い済み」にしてください。",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** iPhone・Outlook向けの .ics（前日9時に通知） */
export function icsFor(d: DocumentRecord, now = new Date()): string | null {
  if (!d.dueDate) return null;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//POITTO//payments//JA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:poitto-pay-${d.id}@poitto`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(d.dueDate)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDayIso(d.dueDate))}`,
    `SUMMARY:${icsText(eventTitle(d))}`,
    `DESCRIPTION:${icsText("ポイっとに保存した請求書の支払期日です。支払ったら、ポイっとで「支払い済み」にしてください。")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText("明日が支払期日です")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export type { PaymentStatus };
