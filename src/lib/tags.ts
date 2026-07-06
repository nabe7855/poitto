import type { DocumentRecord } from "./types";

/** よく使う勘定科目のプリセット（自由入力も可）。 */
export const ACCOUNT_PRESETS = [
  "消耗品費",
  "旅費交通費",
  "会議費",
  "交際費",
  "通信費",
  "水道光熱費",
  "地代家賃",
  "荷造運賃",
  "支払手数料",
  "新聞図書費",
  "諸会費",
  "租税公課",
  "印刷製本費",
  "広告宣伝費",
  "外注費",
  "福利厚生費",
  "雑費",
];

/** 取引先名からの簡易な勘定科目サジェスト（ローカル判定・API不要）。あくまで候補。 */
const ACCOUNT_RULES: [RegExp, string][] = [
  [/急便|運輸|運送|配送|宅配|ヤマト|佐川|日通|西濃/, "荷造運賃"],
  [/タクシー|鉄道|JR|航空|ANA|JAL|交通|バス|新幹線|高速|ガソリン|ＥＴＣ|ETC/, "旅費交通費"],
  [/カフェ|珈琲|喫茶|レストラン|飲食|弁当|ケータリング|茶菓/, "会議費"],
  [/電気|ガス|水道|光熱|電力/, "水道光熱費"],
  [/携帯|通信|インターネット|プロバイダ|ＮＴＴ|NTT|ドコモ|au|ソフトバンク|SIM/, "通信費"],
  [/文具|事務用品|消耗品|ホームセンター|カウネット|アスクル| askul/i, "消耗品費"],
  [/家賃|賃料|不動産|管理費/, "地代家賃"],
  [/印刷|製本|コピー/, "印刷製本費"],
  [/書籍|新聞|図書|出版/, "新聞図書費"],
  [/手数料|振込|銀行/, "支払手数料"],
];

/** 取引先などから勘定科目の候補を返す（無ければ null）。 */
export function suggestAccount(doc: {
  partnerName?: string | null;
}): string | null {
  const s = doc.partnerName ?? "";
  if (!s) return null;
  for (const [re, acc] of ACCOUNT_RULES) if (re.test(s)) return acc;
  return null;
}

/** これまで使われた部門（事業）名の一覧を重複なく返す（サジェスト用）。 */
export function departmentOptions(docs: DocumentRecord[]): string[] {
  const set = new Set<string>();
  for (const d of docs) {
    const v = d.department?.trim();
    if (v) set.add(v);
  }
  return [...set].sort();
}
