"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface BirthdayStepProps {
  value: string | null;
  onChange: (value: string) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 80 }, (_, i) => currentYear - 15 - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function BirthdayStep({ value, onChange }: BirthdayStepProps) {
  const [year, setYear] = useState(value ? parseInt(value.split("-")[0]) : 1995);
  const [month, setMonth] = useState(value ? parseInt(value.split("-")[1]) : 1);
  const [day, setDay] = useState(value ? parseInt(value.split("-")[2]) : 1);

  const days = Array.from(
    { length: getDaysInMonth(year, month) },
    (_, i) => i + 1
  );

  useEffect(() => {
    const maxDay = getDaysInMonth(year, month);
    const safeDay = Math.min(day, maxDay);
    setDay(safeDay);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    onChange(dateStr);
  }, [year, month, day]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* タイトル */}
      <div className="space-y-2 pt-4">
        <h2 className="text-2xl font-medium text-charcoal leading-tight">
          ようこそ！
          <br />
          まずは誕生日を
          <br />
          教えてください
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          あなたに合った進め方を整えるために使います。
        </p>
      </div>

      {/* イラスト */}
      <div className="flex justify-center py-4">
        <div className="w-32 h-32 rounded-full bg-blush flex items-center justify-center">
          <span className="text-6xl">🎂</span>
        </div>
      </div>

      {/* ピッカー */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex gap-4 justify-center">
          {/* 年 */}
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block text-center mb-2">年</label>
            <div className="h-40 overflow-y-auto scrollbar-hide snap-y snap-mandatory">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`w-full py-2 text-center snap-center text-sm transition-all ${
                    y === year
                      ? "text-charcoal font-medium text-base"
                      : "text-muted-foreground"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* 月 */}
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block text-center mb-2">月</label>
            <div className="h-40 overflow-y-auto scrollbar-hide snap-y snap-mandatory">
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`w-full py-2 text-center snap-center text-sm transition-all ${
                    m === month
                      ? "text-charcoal font-medium text-base"
                      : "text-muted-foreground"
                  }`}
                >
                  {m}月
                </button>
              ))}
            </div>
          </div>

          {/* 日 */}
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block text-center mb-2">日</label>
            <div className="h-40 overflow-y-auto scrollbar-hide snap-y snap-mandatory">
              {days.map((d) => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`w-full py-2 text-center snap-center text-sm transition-all ${
                    d === day
                      ? "text-charcoal font-medium text-base"
                      : "text-muted-foreground"
                  }`}
                >
                  {d}日
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 選択中表示 */}
        <div className="mt-4 pt-4 border-t border-mist text-center">
          <span className="text-sm font-medium text-charcoal">
            {year}年 {month}月 {day}日
          </span>
        </div>
      </div>
    </motion.div>
  );
}
