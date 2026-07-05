"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconMicrophone,
  IconPlayerStopFilled,
  IconSparkles,
  IconLoader2,
} from "@tabler/icons-react";

// Web Speech API の最小型（ブラウザ標準型が無い環境向け）
type RecognitionAlternative = { transcript: string };
type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal: boolean };
type RecognitionEvent = {
  results: ArrayLike<RecognitionResult>;
  resultIndex: number;
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * 音声入力できるメモ欄。
 * 対応ブラウザ（Chrome/Edge/Android等）ではマイクで口述筆記、
 * 非対応（iOS Safari等）ではテキスト入力にフォールバック。
 */
export function VoiceMemoField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    // 対応判定はマウント後（window参照のためSSR不可）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = value ? value.trimEnd() + " " : "";

    rec.onresult = (e: RecognitionEvent) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0]?.transcript ?? "";
      }
      onChange(baseRef.current + text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function formatWithAI() {
    if (!value.trim() || formatting) return;
    setFormatting(true);
    try {
      const res = await fetch("/api/format-memo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (res.ok) {
        const json = (await res.json()) as { memo?: string };
        if (json.memo) onChange(json.memo);
      }
    } catch {
      /* 失敗時は元のまま */
    } finally {
      setFormatting(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-ink/70">
          メモ<span className="ml-1 text-ink/40">任意</span>
        </label>
        <div className="flex items-center gap-1.5">
          {value.trim() && (
            <button
              type="button"
              onClick={formatWithAI}
              disabled={formatting}
              className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-medium text-mint transition-colors hover:bg-mint-50/70 disabled:opacity-50"
            >
              {formatting ? (
                <>
                  <IconLoader2 size={12} className="animate-spin" />
                  整形中…
                </>
              ) : (
                <>
                  <IconSparkles size={12} />
                  AIで整形
                </>
              )}
            </button>
          )}
          {supported && (
            <button
              type="button"
              onClick={toggle}
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                listening
                  ? "bg-coral text-white"
                  : "bg-coral-50 text-coral hover:bg-coral-50/70",
              ].join(" ")}
            >
              {listening ? (
                <>
                  <IconPlayerStopFilled size={12} />
                  停止
                </>
              ) : (
                <>
                  <IconMicrophone size={12} />
                  音声で入力
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={
          placeholder ??
          "例：6/28 A社との打合せ後、担当2名分の会議用茶菓を購入。目的・相手・場所など"
        }
        className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20"
      />
      {listening && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-coral">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />
          聞き取り中… 話し終えたら「停止」を押してください
        </p>
      )}
      {!supported && (
        <p className="mt-1 text-[11px] text-ink/40">
          ※ このブラウザは音声入力に未対応です。テキストでご入力ください。
        </p>
      )}
    </div>
  );
}
