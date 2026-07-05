"use client";

import { useMemo } from "react";
import type { DocumentRecord } from "@/lib/types";
import { formatAmount } from "@/lib/format";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function lastDay(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function firstWeekday(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).getDay();
}

/** 月別カレンダー。日ごとに件数・合計を表示し、日タップでその日を選択。 */
export function MonthCalendar({
  ym,
  documents,
  selectedDay,
  onSelectDay,
}: {
  ym: string;
  documents: DocumentRecord[];
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  // 日付ごとに集計
  const byDay = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const d of documents) {
      if (!d.transactionDate) continue;
      const cur = map.get(d.transactionDate) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += d.amountInclTax ?? 0;
      map.set(d.transactionDate, cur);
    }
    return map;
  }, [documents]);

  const total = lastDay(ym);
  const lead = firstWeekday(ym);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStr(day: number): string {
    const [y, m] = ym.split("-");
    return `${y}-${m}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-3 md:p-4">
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-ink/40">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={i === 0 ? "text-coral/70" : i === 6 ? "text-mint/70" : ""}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const ds = dateStr(day);
          const agg = byDay.get(ds);
          const selected = selectedDay === ds;
          return (
            <button
              key={ds}
              type="button"
              onClick={() => onSelectDay(selected ? null : ds)}
              className={[
                "flex min-h-[52px] flex-col rounded-lg border p-1 text-left transition-colors md:min-h-[64px]",
                selected
                  ? "border-coral bg-coral-50"
                  : agg
                    ? "border-black/[0.06] bg-background-soft hover:bg-black/[0.02]"
                    : "border-transparent hover:bg-black/[0.02]",
              ].join(" ")}
            >
              <span className="text-[11px] font-medium text-ink/60">{day}</span>
              {agg && (
                <span className="mt-auto">
                  <span className="inline-flex items-center rounded bg-coral px-1 text-[10px] font-bold text-white">
                    {agg.count}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-ink/55">
                    {formatAmount(agg.total)}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
