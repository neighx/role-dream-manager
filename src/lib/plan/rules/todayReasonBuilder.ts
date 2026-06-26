import { DayMode, EnergyLevel, StressCause, Mood } from "@/types";

interface BuildTodayReasonOptions {
  mode: DayMode;
  energy: EnergyLevel;
  stressCause: StressCause;
  mood: Mood;
  dream?: string;
  monthlyGoal?: string;
  gapAddressed?: string;
}

export function buildTodayReason(opts: BuildTodayReasonOptions): string {
  const { mode, energy, stressCause, mood, dream, monthlyGoal, gapAddressed } = opts;

  // 回復日・エネルギー最低
  if (mode === "recover" || energy === 10) {
    const dreamRef = dream ? `「${dream}」` : "夢";
    return `今日は回復日。完成させなくていい。${dreamRef}との線を切らないことだけが目的だよ。`;
  }

  // 守る日・エネルギー低
  if (mode === "protect" && energy <= 40) {
    return `今日は守る日。大きく動かなくていい。夢にほんの少しだけ触れることが、明日につながる。`;
  }

  // ストレス別
  switch (stressCause) {
    case "perfectionism":
      return `今日は30点で出す日。完璧じゃなくていい。「始めて動かし続けること」が夢を進める唯一の方法。`;

    case "money":
      return `お金の不安があるとき、一番いいのは売上につながる1アクション。これがそれ。今日のうちにやっておこう。`;

    case "time":
      return `時間がないからこそ、これだけ。1つだけ前に進めれば今日は十分。${gapAddressed ? `「${gapAddressed}」を埋める一歩。` : ""}`;

    case "relationship":
      return `人間関係のストレスがある日は、自分のペースで小さく行動するのが一番。夢との接続を切らないためのものだよ。`;

    case "body":
      return `体調が優れない日は、まずこれだけ。無理しなくていい。夢との線を切らない最小行動として。`;

    case "future_anxiety":
      return `将来が不安なとき、一番の薬は「今日も少し動いた」という事実。${monthlyGoal ? `今月の目標「${monthlyGoal}」への一歩。` : "小さく動き続けよう。"}`;

    case "decision_fatigue":
      return `決断疲れの日は選択肢を減らすのが正解。これだけやれば今日は十分。それ以外は明日でいい。`;
  }

  // 攻める日・エネルギー高
  if (mode === "attack" && energy >= 70) {
    const targetRef = monthlyGoal ? `今月の目標「${monthlyGoal}」` : "夢";
    return `今日は攻められる日。${targetRef}に向けて、${gapAddressed ? `「${gapAddressed}」を埋めるために` : ""}今が動き時。`;
  }

  // 進める日
  if (mode === "progress") {
    return `着実に進める日。${gapAddressed ? `「${gapAddressed}」に向けて、` : ""}今日もコツコツ積み上げよう。`;
  }

  // 整える日
  if (mode === "maintain") {
    return `今日は整える日。${monthlyGoal ? `「${monthlyGoal}」` : "夢"}に向けた環境を整えることも立派な前進だよ。`;
  }

  // デフォルト
  const ref = dream ? `「${dream}」` : "夢";
  return `${ref}に近づくために、${monthlyGoal ? `今月の「${monthlyGoal}」の` : ""}一歩として。`;
}
