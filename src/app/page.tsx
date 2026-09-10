import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconCalendarMonth,
  IconCamera,
  IconFileZip,
  IconHistory,
  IconMicrophone,
  IconSearch,
  IconTag,
  IconCopyCheck,
  IconLock,
} from "@tabler/icons-react";
import { LpImage } from "@/components/lp/lp-image";
import {
  CTA,
  Eyebrow,
  FileChip,
  H2,
  LP_CONFIG,
  Lead,
  Paper,
  PrimaryCta,
  SecondaryCta,
  Section,
} from "@/components/lp/parts";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: {
    absolute: "ポイっと（POITTO）｜入れるだけで、証憑がかたづく。",
  },
  description:
    "請求書や領収書をポイっと入れるだけ。取引年月日・取引先・税込金額を読み取って、名前をそろえて、月ごとに保存します。電子帳簿保存法の検索要件に沿った形で貯まる、小さな事務局のための証憑ファイリング。",
  openGraph: {
    title: "ポイっと｜入れるだけで、証憑がかたづく。",
    description:
      "請求書も領収書も、投函するだけ。名前がそろって、月ごとの棚に収まります。",
    images: ["/lp/ogp.png"],
  },
};

/* ========================================================================= */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-ink">
      <SiteHeader />
      <main>
        <Hero />
        <Pain />
        <BeforeAfter />
        <Steps />
        <Naming />
        <Features />
        <Compliance />
        <Mobile />
        <ForWhom />
        <Story />
        <Security />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ header */

const NAV = [
  { href: "#pain", label: "こんな困りごと" },
  { href: "#steps", label: "使い方" },
  { href: "#features", label: "できること" },
  { href: "#compliance", label: "電帳法" },
  { href: "#faq", label: "よくある質問" },
];

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#faf8f5]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-5 md:px-8">
        <Link href={ROUTES.lp} className="shrink-0">
          <Image
            src="/brand/logo/poitto_logo_horizontal.png"
            alt="ポイっと"
            width={420}
            height={120}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden flex-1 items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[0.82rem] font-bold text-black/55 transition-colors hover:text-coral"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <Link
            href={CTA.secondary.href}
            className="hidden text-[0.82rem] font-bold text-black/55 transition-colors hover:text-coral sm:block"
          >
            {CTA.secondary.label}
          </Link>
          <Link
            href={CTA.primary.href}
            className="rounded-full bg-coral px-4 py-2 text-[0.82rem] font-bold text-white transition-colors hover:bg-coral-600"
          >
            {CTA.headerLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-bold text-black/55">
            電子取引データの保存に追われている、小さな事務局へ
          </p>
          <h1 className="text-[2.1rem] font-bold leading-[1.35] tracking-[-0.02em] md:text-[3.1rem]">
            入れるだけで、
            <br />
            証憑が
            <span
              className="whitespace-nowrap"
              style={{
                backgroundImage:
                  "linear-gradient(transparent 66%, rgba(232,84,43,0.22) 66%)",
              }}
            >
              かたづく
            </span>
            。
          </h1>
          <p className="mt-7 max-w-xl text-[0.95rem] leading-[2] text-black/65 md:text-base">
            メールで届いた請求書のPDFも、財布に入ったままのレシートも。
            ポイっと入れておけば、名前がそろって、月ごとの棚に収まります。
            あとから「あの支払い」を、日付でも金額でも取引先でも探せる状態で。
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PrimaryCta>
              {CTA.primary.label}
              <IconArrowRight size={18} stroke={2} />
            </PrimaryCta>
            <SecondaryCta />
          </div>
          <p className="mt-5 text-xs leading-relaxed text-black/40">
            ブラウザだけで使えます／スマホのホーム画面にも置けます／インストール不要
          </p>
        </div>

        <div className="md:col-span-5">
          <LpImage
            src="/lp/hero.png"
            alt="投函ポストに書類がすべり込んでいくイラスト"
            ratio="16 / 9"
            priority
            note="コーラル色の投函ポストに、書類が1枚すべり込んでいく絵"
          />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- pain */

const PAINS = [
  {
    title: "「請求書_最新(2).pdf」問題",
    body: "届いたままの名前では、半年後の自分が見つけられません。ルール通りに打ち直すと1件1分。月80件なら、それだけで1時間半が消えます。",
  },
  {
    title: "どのフォルダに入れたっけ問題",
    body: "年度で分ける人、月で分ける人、事業名で分ける人。人によって分け方が違うので、探すときは結局ぜんぶ開けることになります。",
  },
  {
    title: "年度末にまとめて問題",
    body: "12か月分の紙とPDFを前に、まとめて片づけようとする日。だいたい、思い出せない支払いが何件か残ります。",
  },
  {
    title: "「これ、何の支払い？」問題",
    body: "領収書に書いてあるのは、店名と金額だけ。誰と、何のために使ったのかは、そのとき記録しておかないと戻ってきません。",
  },
];

function Pain() {
  return (
    <Section id="pain" tone="white">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Eyebrow no="01">こんな困りごと</Eyebrow>
          <H2>
            2024年から、
            <br />
            メールのPDFも
            <br />
            「捨てられない書類」に
            <br />
            なりました。
          </H2>
          <Lead>
            電子取引データは、電子のまま保存することが必要になりました。
            とはいえ事務局にいるのは、経理専任ではない私たちです。起きることは、
            だいたいこの4つに集約されます。
          </Lead>
          <div className="mt-9">
            <LpImage
              src="/lp/pain.png"
              alt="レシートや請求書が散らばった事務机のイラスト"
              ratio="4 / 3"
              note="紙が散らばった小さな事務机の俯瞰"
            />
          </div>
        </div>

        <ul className="space-y-4 md:col-span-7">
          {PAINS.map((p) => (
            <li key={p.title}>
              <Paper className="flex gap-4">
                <span className="mt-2 h-4 w-1 shrink-0 rounded-full bg-coral/45" />
                <div>
                  <h3 className="text-[0.98rem] font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-[1.95] text-black/60">
                    {p.body}
                  </p>
                </div>
              </Paper>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ before/after */

const BEFORE = [
  "メールを開いて、PDFをダウンロードする",
  "中身を見て、日付・取引先・税込金額を確かめる",
  "決めたルール通りに、ファイル名を打ち直す",
  "保存先の年月フォルダを探す（なければ作る）",
  "ファイルを移動する",
  "Excelの索引に1行足す",
  "月末に、件数と合計が合っているか確かめる",
];

function BeforeAfter() {
  return (
    <Section>
      <Eyebrow no="02">やることの数</Eyebrow>
      <H2>7手順を、1手順にします。</H2>

      <div className="mt-12 grid gap-6 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          <p className="mb-4 text-xs font-bold tracking-wider text-black/40">
            これまで — 1件あたり7手順
          </p>
          <ol className="space-y-2.5">
            {BEFORE.map((b, i) => (
              <li
                key={b}
                className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white/70 px-4 py-3 text-sm text-black/55"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-black/[0.05] font-mono text-[0.7rem] text-black/45">
                  {i + 1}
                </span>
                {b}
              </li>
            ))}
          </ol>
        </div>

        <div className="md:col-span-5">
          <p className="mb-4 text-xs font-bold tracking-wider text-coral">
            ポイっと — 1手順
          </p>
          <div className="rounded-[18px] border-2 border-coral/25 bg-coral-50/60 p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-coral font-mono text-xs font-bold text-white">
                1
              </span>
              <span className="text-[1.05rem] font-bold">ポイっと入れる</span>
            </div>
            <p className="mt-5 text-sm leading-[1.95] text-black/60">
              あとは、読み取りに自信がなかったものだけ確認します。
              全部を自動にはしません。人が見るべきところだけ、色をつけて残します。
            </p>
            <div className="mt-6 border-t border-coral/15 pt-5">
              <p className="text-xs leading-relaxed text-black/45">
                月80件を手作業でやると、名前の打ち直しだけで約1時間半。
                ポイっとでは、確認が必要になるものは、そのうちの一部だけです。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------- steps */

const STEPS = [
  {
    no: "1",
    title: "ポイっと入れる",
    body: "ドラッグ＆ドロップでも、スマホでの撮影でも。何十件まとめて放り込んでも、詰まらないように順番に処理していきます。同じファイルを2回入れたときは、その場で止めます。",
    shot: "/lp/shot-post.png",
    shotNote: "実画面：投函ボックス（/post）",
  },
  {
    no: "2",
    title: "AIが読み取る",
    body: "取引年月日・取引先・税込金額・書類の種類・インボイスの登録番号を読み取ります。自信のない項目にはアンバー色の印がついて、確認待ちに回ります。",
    shot: "/lp/shot-review.png",
    shotNote: "実画面：確認キュー（/review）",
  },
  {
    no: "3",
    title: "名前がそろって、しまわれる",
    body: "決めた命名ルールにリネームして、月ごとのフォルダへ。あとは月別ビューで、その月の件数と合計金額がひと目で分かります。",
    shot: "/lp/shot-months.png",
    shotNote: "実画面：月別ビュー（/months）",
  },
];

function Steps() {
  return (
    <Section id="steps" tone="white">
      <Eyebrow no="03">使い方</Eyebrow>
      <H2>やることは、入れる。それだけ。</H2>

      <div className="mt-14 space-y-16 md:space-y-20">
        {STEPS.map((s, i) => (
          <div
            key={s.no}
            className="grid items-center gap-8 md:grid-cols-12 md:gap-12"
          >
            <div
              className={`md:col-span-5 ${i % 2 === 1 ? "md:order-2" : ""}`}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[2.4rem] font-bold leading-none text-coral/25">
                  {s.no}
                </span>
                <h3 className="text-xl font-bold">{s.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-[2] text-black/60">{s.body}</p>
            </div>
            <div className={`md:col-span-7 ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <div className="rounded-[18px] border border-black/[0.07] bg-[#faf8f5] p-2.5">
                <LpImage
                  src={s.shot}
                  alt={s.title}
                  ratio="16 / 10"
                  note={s.shotNote}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ naming */

const NAME_PARTS = [
  { label: "取引年月日", value: "260630" },
  { label: "取引先名", value: "佐川急便株式会社" },
  { label: "税込金額", value: "71610" },
  { label: "書類の種類", value: "請求書" },
];

function Naming() {
  return (
    <Section>
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Eyebrow no="04">命名</Eyebrow>
          <H2>
            「請求書_最新(2).pdf」が、
            <br />
            こうなります。
          </H2>
          <Lead>
            ファイル名の中に、取引年月日・取引先・税込金額・書類の種類を入れます。
            万が一このアプリの外にファイルを出しても、名前だけで中身が分かり、
            探せる状態になります。
          </Lead>
        </div>

        <div className="md:col-span-7">
          <div className="rounded-[18px] border border-black/[0.07] bg-white p-6 md:p-8">
            <p className="text-xs font-bold tracking-wider text-black/40">
              届いたときの名前
            </p>
            <div className="mt-3">
              <FileChip>請求書_最新(2).pdf</FileChip>
            </div>

            <div className="my-6 flex items-center gap-3 text-black/25">
              <span className="h-px flex-1 bg-black/[0.08]" />
              <IconArrowRight size={18} stroke={1.75} className="rotate-90" />
              <span className="h-px flex-1 bg-black/[0.08]" />
            </div>

            <p className="text-xs font-bold tracking-wider text-coral">
              保存されるときの名前
            </p>
            <div className="mt-3">
              <FileChip tone="coral">
                260630_佐川急便株式会社_71610_請求書.pdf
              </FileChip>
            </div>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {NAME_PARTS.map((p) => (
                <li
                  key={p.label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.02] px-3 py-2"
                >
                  <span className="text-xs text-black/45">{p.label}</span>
                  <span className="font-mono text-xs text-ink">{p.value}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-black/[0.06] pt-5 text-xs leading-relaxed text-black/45">
              保存先は
              <code className="mx-1 font-mono text-black/60">
                保存済み/2026年06月/
              </code>
              。命名ルールは設定画面で確認できます。
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- features */

const FEATURES = [
  {
    icon: IconCalendarMonth,
    title: "月ごとの棚",
    body: "月を選ぶと、その月の件数と合計金額。カレンダー表示で、どの日に何が入っているかも見えます。",
  },
  {
    icon: IconSearch,
    title: "3つの条件で探す",
    body: "取引年月日（範囲）・税込金額（範囲）・取引先（部分一致）。組み合わせて絞り込めます。",
  },
  {
    icon: IconMicrophone,
    title: "声でメモを残す",
    body: "「◯◯さんと打合せ、△△事業の材料費」と話すだけ。AIが文章を整えて、証憑にくっつけて保存します。",
  },
  {
    icon: IconTag,
    title: "部門・科目タグ",
    body: "事業（助成金）ごと、勘定科目ごとに仕分け。取引先名から科目の候補も出します。",
  },
  {
    icon: IconFileZip,
    title: "CSVとZIPで持ち出す",
    body: "検索結果を会計ソフト取込用のCSVで。月ごとの証憑は、まとめてZIPでダウンロードできます。",
  },
  {
    icon: IconCopyCheck,
    title: "二重投函を止める",
    body: "同じファイルをもう一度入れたときは、その場で気づけるようにしています。",
  },
  {
    icon: IconHistory,
    title: "ゴミ箱と操作履歴",
    body: "消してもすぐには消えません。いつ・誰が・何を直したかの履歴も残ります。",
  },
  {
    icon: IconLock,
    title: "原本はそのまま",
    body: "読み取りはコピーに対して行います。原本のファイルには手を加えず保管します。",
  },
];

function Features() {
  return (
    <Section id="features" tone="white">
      <Eyebrow no="05">できること</Eyebrow>
      <H2>事務局が実際にやる動きだけ、そろえました。</H2>
      <Lead>
        機能はあまり多くありません。入れる、直す、探す、渡す。
        使わない機能を増やすより、毎月かならず通る道を確実にすることを選びました。
      </Lead>

      <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-4">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-coral-50 text-coral">
              <f.icon size={19} stroke={1.75} />
            </span>
            <div>
              <h3 className="text-[0.98rem] font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-[1.95] text-black/60">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- compliance */

const SEARCH_REQ = [
  { title: "取引年月日", body: "範囲を指定して絞り込めます" },
  { title: "取引金額", body: "下限・上限を指定して絞り込めます" },
  { title: "取引先", body: "一部の文字だけでも探せます" },
];

function Compliance() {
  return (
    <Section id="compliance">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <Eyebrow no="06">電子帳簿保存法</Eyebrow>
          <H2>
            「検索要件」に答えられる形で、
            <br />
            自然に貯まっていきます。
          </H2>
          <Lead>
            電子取引データは、3つの項目で検索できることが求められます。
            ポイっとは、その3つを読み取って索引にし、ファイル名にも入れます。
            あとから体制を整え直す必要がないように、貯まる時点でその形にしておく、
            という考え方です。
          </Lead>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {SEARCH_REQ.map((s) => (
              <Paper key={s.title} className="border-mint/25 bg-mint-50/50">
                <p className="text-sm font-bold text-ink">{s.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-black/55">
                  {s.body}
                </p>
              </Paper>
            ))}
          </div>

          <ul className="mt-8 space-y-3 text-sm leading-[1.95] text-black/65">
            <li className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
              訂正・削除の履歴が残ります（削除はゴミ箱方式、操作は履歴に記録）。
            </li>
            <li className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
              索引はCSVで書き出せます。保存した証憑は月ごとにZIPで取り出せます。
            </li>
            <li className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
              原本のファイルは改変せず保管し、画面上でそのまま確認できます。
            </li>
          </ul>

          <p className="mt-9 rounded-xl border border-black/[0.07] bg-white p-5 text-xs leading-[1.9] text-black/50">
            電子帳簿保存法で求められる対応は、事業者の規模や保存方法によって変わります。
            自団体の運用として問題がないかは、顧問の税理士・会計事務所にご確認ください。
            ポイっとは、決めた運用を毎月続けやすくするための道具です。
          </p>
        </div>

        <div className="md:col-span-5">
          <LpImage
            src="/lp/search.png"
            alt="3段の引き出しから書類が見えているイラスト"
            ratio="4 / 3"
            note="3段の引き出し。ひとつからミント色の光が漏れている絵"
          />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ mobile */

const MOBILE = [
  {
    title: "もらったその場で撮る",
    body: "財布に貯めないので、月末に「これ何だっけ」が起きません。",
  },
  {
    title: "ホーム画面に置ける",
    body: "アプリのように開けます（インストールは不要です）。",
  },
  {
    title: "電波が弱くても開く",
    body: "外出先でも画面は立ち上がります。",
  },
];

function Mobile() {
  return (
    <Section tone="white">
      <div className="grid items-center gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <LpImage
            src="/lp/mobile.png"
            alt="テーブルの上のレシートをスマホで撮影しているイラスト"
            ratio="3 / 2"
            note="レシートをスマホで真上から撮っている手元"
          />
        </div>
        <div className="md:col-span-7">
          <Eyebrow no="07">スマホ</Eyebrow>
          <H2>レシートは、もらったその場で。</H2>
          <Lead>
            スマホのカメラボタンから撮って、そのまま投函できます。
            移動中の電車の中でも、コンビニを出たところでも、1枚15秒です。
          </Lead>
          <ul className="mt-8 space-y-4">
            {MOBILE.map((m) => (
              <li key={m.title} className="flex gap-4">
                <IconCamera
                  size={18}
                  stroke={1.75}
                  className="mt-1 shrink-0 text-coral"
                />
                <div>
                  <p className="text-[0.95rem] font-bold">{m.title}</p>
                  <p className="mt-1 text-sm leading-[1.9] text-black/60">
                    {m.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- for whom */

const AUDIENCES = [
  {
    title: "NPO・一般社団",
    body: "助成金ごとに事業を分けて記録できます。実績報告のときは、その事業の証憑だけをまとめて取り出せます。",
    tag: "事業別に分ける",
  },
  {
    title: "小さな事業所・個人事業",
    body: "経理の担当者がいなくても、たまっていく書類がひとりでに形になります。確定申告前の週末が短くなります。",
    tag: "ひとり経理",
  },
  {
    title: "複数人で事務を回すチーム",
    body: "誰が入れても、名前のつけ方と置き場所がそろいます。担当が変わっても、探し方は変わりません。",
    tag: "引き継げる",
  },
];

function ForWhom() {
  return (
    <Section>
      <Eyebrow no="08">向いている団体</Eyebrow>
      <H2>経理が本業ではない人の、ためのものです。</H2>

      <div className="mt-11 grid gap-5 md:grid-cols-3">
        {AUDIENCES.map((a, i) => (
          <Paper key={a.title} tilt={i === 1 ? 0 : i === 0 ? -0.5 : 0.5}>
            <span className="inline-block rounded-full bg-mint-50 px-2.5 py-1 text-[0.7rem] font-bold text-mint">
              {a.tag}
            </span>
            <h3 className="mt-3.5 text-[1.05rem] font-bold">{a.title}</h3>
            <p className="mt-2.5 text-sm leading-[1.95] text-black/60">
              {a.body}
            </p>
          </Paper>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------- story */

function Story() {
  return (
    <Section tone="white">
      <div className="grid items-center gap-12 md:grid-cols-12">
        <div className="md:col-span-6">
          <Eyebrow no="09">つくった理由</Eyebrow>
          <H2>私たちも、同じ机の前で困っていました。</H2>
          <div className="mt-6 space-y-5 text-[0.95rem] leading-[2.1] text-black/65">
            <p>
              ポイっとは、栃木のNPOの事務局から生まれました。
              助成金の実績報告のたびに、事業ごとに証憑を集め直し、ファイル名を打ち直し、
              「これ何の支払いだっけ」と首をかしげる。
              その作業が毎年やってくることが、どうしても納得できませんでした。
            </p>
            <p>
              だからポイっとには、事務局が実際に通る道しか入っていません。
              入れる、直す、探す、渡す。
              使わない機能を増やすより、この4つが毎月ちゃんと終わることを大事にしています。
            </p>
            <p className="text-sm text-black/50">
              — {LP_CONFIG.orgName}
            </p>
          </div>
        </div>
        <div className="md:col-span-6">
          <LpImage
            src="/lp/story.png"
            alt="小さなNPO事務所の風景のイラスト"
            ratio="3 / 2"
            note="小さなNPO事務所の昼下がり（実写の事務所写真に差し替え推奨）"
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- security */

const SECURITY = [
  { title: "国内のサーバーで保管", body: "東京リージョンで運用しています。" },
  {
    title: "団体ごとにデータを分ける",
    body: "他の団体のデータは、仕組みとして見えないようにしています。",
  },
  { title: "通信は暗号化", body: "やり取りはすべて暗号化した通信で行います。" },
  {
    title: "原本は改変しない",
    body: "アップロードされたファイルそのものを、そのまま保管します。",
  },
];

function Security() {
  return (
    <Section>
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-8">
          <Eyebrow no="10">安心のために</Eyebrow>
          <H2>預かるのは、団体のお金の記録です。</H2>
          <div className="mt-9 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {SECURITY.map((s) => (
              <div key={s.title}>
                <h3 className="text-[0.95rem] font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-[1.9] text-black/60">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-4">
          <LpImage
            src="/lp/secure.png"
            alt="リボンで結ばれた書類の束のイラスト"
            ratio="1 / 1"
            note="ミント色のリボンで結ばれた書類の束と、鍵付きの引き出し"
          />
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- pricing */

function Pricing() {
  return (
    <Section tone="white">
      <Eyebrow no="11">料金</Eyebrow>
      <H2>料金は準備中です。</H2>
      <Lead>
        {/* TODO: 料金が決まったらこのセクションをプラン表に差し替える */}
        いまはデモとしてお使いいただけます。
        価格が決まりしだい、このページでお知らせします。
        「うちの団体だと月に何件くらいか」といった相談も歓迎です。
      </Lead>
      <div className="mt-8 flex flex-wrap gap-3">
        <PrimaryCta />
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------------- faq */

const FAQ = [
  {
    q: "紙でもらった領収書はどうすればいいですか？",
    a: "スマホで撮って投函できます。ただし、紙の原本をスキャンして保存する場合（スキャナ保存制度）には別の要件があります。紙原本の廃棄可否については、顧問の税理士・会計事務所にご確認ください。",
  },
  {
    q: "読み取りが間違っていたら？",
    a: "確認画面でその場で直せます。もともと、自信のない項目は自動保存せず確認待ちに回る仕組みです。直した内容は操作履歴に残ります。",
  },
  {
    q: "どんなファイルを入れられますか？",
    a: "PDFと画像（JPEG・PNGなど）です。メールに添付されてきたPDFも、スマホで撮った写真も、同じように扱えます。",
  },
  {
    q: "まとめて何十件も入れて大丈夫ですか？",
    a: "大丈夫です。順番に処理していくキュー方式なので、一度にたくさん入れても詰まりません。処理中のものは一覧で状況が見えます。",
  },
  {
    q: "会計ソフトに取り込めますか？",
    a: "取込用のCSVを書き出せます。取引日・取引先・税込金額・書類の種類・部門・科目などの列が入ります。",
  },
  {
    q: "インボイスの登録番号は読み取れますか？",
    a: "読み取り対象に含めています。記載がない書類の場合は空欄になります。",
  },
  {
    q: "何人まで使えますか？",
    a: "団体単位でお使いいただけます。同じ団体のメンバーが入れた証憑は、共通の棚に貯まります。",
  },
  {
    q: "パソコンが得意ではないのですが。",
    a: "画面はドラッグ＆ドロップと、確認して押すだけです。むしろ、ファイル名を手で打ってきた方ほど、やることが減ります。",
  },
];

function Faq() {
  return (
    <Section id="faq">
      <Eyebrow no="12">よくある質問</Eyebrow>
      <H2>もう少しだけ、気になること。</H2>

      <div className="mt-10 divide-y divide-black/[0.07] border-y border-black/[0.07]">
        {FAQ.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[0.95rem] font-bold marker:hidden">
              {f.q}
              <span className="shrink-0 text-lg text-coral transition-transform group-open:rotate-45">
                ＋
              </span>
            </summary>
            <p className="pb-6 text-sm leading-[2] text-black/60">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- final cta */

function FinalCta() {
  return (
    <Section tone="ink">
      <div className="grid items-center gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <Eyebrow no="13" invert>
            はじめる
          </Eyebrow>
          <H2 invert>
            机の上の「あとでやる」を、
            <br />
            今日で終わりにしませんか。
          </H2>
          <Lead invert>
            まずは手元にある請求書を1枚、入れてみてください。
            名前がそろって棚に収まるところまで、1分もかかりません。
          </Lead>
          <div className="mt-9 flex flex-wrap gap-3">
            <PrimaryCta>
              {CTA.primary.label}
              <IconArrowRight size={18} stroke={2} />
            </PrimaryCta>
            {CTA.realMode ? <SecondaryCta invert /> : null}
          </div>
        </div>
        <div className="md:col-span-5">
          <LpImage
            src="/lp/shelf.png"
            alt="12か月分のファイルがきれいに収まった棚のイラスト"
            ratio="16 / 9"
            note="12マスの棚にファイルが1冊ずつ収まっている絵"
          />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ footer */

function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.07] bg-[#faf8f5] px-5 py-12 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <Image
            src="/brand/logo/poitto_logo_horizontal.png"
            alt="ポイっと"
            width={420}
            height={120}
            className="h-7 w-auto"
          />
          <p className="mt-3 text-sm text-black/50">
            入れるだけで、証憑がかたづく。
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-black/55">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-coral">
              {n.label}
            </a>
          ))}
          <Link href={CTA.primary.href} className="hover:text-coral">
            {CTA.primary.label}
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-10 w-full max-w-5xl border-t border-black/[0.06] pt-6 text-xs text-black/35">
        {/* TODO: 正式名称・所在地・問い合わせ先・規約リンクを追記 */}
        © {new Date().getFullYear()} {LP_CONFIG.orgName}
      </div>
    </footer>
  );
}
