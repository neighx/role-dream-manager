import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Role, DailyCheckin, UserProfile, Task, Schedule, DailyLog,
  PetType, MOOD_LABELS, MODE_LABELS, STRESS_LABELS,
} from "@/types";
import { AIMessage } from "../providers/base";

export const TODAY_PLAN_PROMPT_VERSION = process.env.TODAY_PLAN_PROMPT_VERSION ?? "v1";

const PET_DESCRIPTIONS: Record<PetType, string> = {
  cat: "秘書ネコ — やさしく感情に寄り添い、無理させないトーン",
  dog: "秘書犬 — 明るく行動を後押しし、達成を一緒に喜ぶトーン",
  robot: "秘書ロボ — 論理的に整理し、優先順位を明示するトーン",
};

const ENERGY_DESCRIPTIONS: Record<number, string> = {
  10:  "エネルギー10% — 非常に低い。最小限の行動のみ推奨",
  40:  "エネルギー40% — やや低い。短時間・低負荷タスクを推奨",
  70:  "エネルギー70% — 普通。通常の負荷でOK",
  100: "エネルギー100% — 高い。チャレンジングな行動も可",
};

const REGENERATION_INSTRUCTIONS: Record<string, string> = {
  lighter:         "【再生成指示】全タスクをさらに軽く・短くしてください。difficulty=easy、estimated_minutes最大10分。",
  stronger:        "【再生成指示】よりチャレンジングなタスクを出してください。前回より大きな一歩を踏み出す内容に。",
  shorter:         "【再生成指示】全タスクを10分以内に収めてください。estimated_minutesは10以下。",
  focus_money:     "【再生成指示】売上直結タスクを最優先にしてください。予約・営業・請求・商品改善を中心に。",
  focus_recovery:  "【再生成指示】回復を優先してください。夢との接続を切らない最小行動のみ。難易度easy、5分以内。",
  balanced:        "【再生成指示】全Roleを均等に扱い、バランスの取れたプランを出してください。",
};

const OUTPUT_SCHEMA = `{
  "date": "YYYY-MM-DD",
  "overall_message": "今日のメッセージ（100文字以内）",
  "pet_message": "ペットキャラのセリフ（50文字以内、ペットの性格に合わせて）",
  "emotional_summary": "感情状態の要約と方針（80文字以内）",
  "available_time_strategy": "時間の使い方の戦略（50文字以内）",
  "plans": [
    {
      "role_id": "ロールIDをそのまま使用",
      "role_name": "Role名",
      "role_category": "creator|health|work|relationship|learning|selfcare",
      "task_title": "具体的で行動できるタイトル（40文字以内）",
      "task_description": "補足（30文字以内、省略可）",
      "purpose": "このタスクの目的（25文字以内）",
      "related_dream": "関連するDream（引用）",
      "related_long_term_goal": "関連する長期目標",
      "related_monthly_goal": "今月の目標との関連",
      "current_reality_reference": "現在地の参照",
      "gap_target": "埋めるGap（25文字以内）",
      "next_focus_reference": "Next Focusとの関連",
      "today_reason": "なぜ今日やるのか（40文字以内）",
      "emotional_adjustment_reason": "感情状態に合わせた調整理由（40文字以内）",
      "estimated_minutes": 30,
      "difficulty": "easy|normal|hard",
      "importance": "low|medium|high",
      "urgency": "low|medium|high",
      "quadrant": "important_urgent|important_not_urgent|urgent_not_important|not_important_not_urgent",
      "action_size": "attack|normal|small|minimum",
      "schedule_suggestion": {
        "should_schedule": true,
        "suggested_time_label": "朝|昼|夕方|夜",
        "suggested_duration_minutes": 30
      }
    }
  ],
  "not_today": [
    { "title": "今日やらないこと", "reason": "理由" }
  ],
  "reflection_question": "夜の振り返りの問いかけ（40文字以内）"
}`;

export interface TodayPlanPromptInput {
  date: Date;
  profile: UserProfile;
  checkin: DailyCheckin;
  selectedRoles: Role[];
  recentDoneTasks: Task[];
  pendingTasks: Task[];
  weekSchedules: Schedule[];
  recentDailyLogs?: DailyLog[];
  regenerationMode?: string;
  upcomingGoals?: Array<{ id: string; title: string; event_date: string; time_horizon: string; category: string }>;
}

export function buildTodayPlanMessages(input: TodayPlanPromptInput): AIMessage[] {
  const {
    date, profile, checkin, selectedRoles,
    recentDoneTasks, pendingTasks, weekSchedules, recentDailyLogs, regenerationMode, upcomingGoals,
  } = input;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    date, profile, checkin, selectedRoles,
    recentDoneTasks, pendingTasks, weekSchedules, recentDailyLogs, regenerationMode, upcomingGoals,
  });

  return [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ];
}

function buildSystemPrompt(): string {
  return `You are the AI planner for "Role Dream Manager", a Japanese life-role dream management app.

Your mission: Generate a personalized Today's Role Plan that helps the user take meaningful steps toward their dream in each chosen Role, calibrated precisely to their current emotional state and available time.

CRITICAL RULES:
1. Every task must be SPECIFIC and ACTIONABLE
   - BAD: "音楽を作る" / "英語を勉強する" / "発信する"
   - GOOD: "Logicを開いて、今月完成予定の曲のAメロを8小節だけ作る"
   - GOOD: "海外アーティストに自己紹介できるよう、'I'm a producer from Tokyo.'を声に出して3回録音する"
2. Every task must explicitly connect to a GAP between current reality and dream goal
3. Calibrate task difficulty/duration to today's energy level AND mode
4. Maximum 3 tasks total; ONLY 1 task if energy=10 or mode=recover
5. Include at least 1 "important_not_urgent" task (the dream-building work that matters most)
6. For the pet_message, match the pet character's personality strictly
7. Output ONLY valid JSON — no markdown code fences, no explanations, no other text

All string values in the JSON must be written in Japanese (日本語).

Output schema:
${OUTPUT_SCHEMA}`;
}

const MOOD_LABEL_MAP: Record<string, string> = {
  great: "最高", good: "良い", okay: "普通", tired: "疲れた", rough: "辛い",
};

function buildUserPrompt(input: TodayPlanPromptInput): string {
  const {
    date, profile, checkin, selectedRoles,
    recentDoneTasks, pendingTasks, weekSchedules, recentDailyLogs, regenerationMode, upcomingGoals,
  } = input;

  const petType = (profile.selected_pet || "cat") as PetType;
  const energyDesc = ENERGY_DESCRIPTIONS[checkin.energy] || `エネルギー${checkin.energy}%`;

  const lines: string[] = [];

  lines.push(`## 今日の状況`);
  lines.push(`日付: ${format(date, "yyyy年M月d日（E）", { locale: ja })}`);
  lines.push(`気分: ${MOOD_LABELS[checkin.mood]}`);
  lines.push(`エネルギー: ${energyDesc}`);
  lines.push(`今日のモード: ${MODE_LABELS[checkin.mode]}`);
  lines.push(`ストレス原因: ${STRESS_LABELS[checkin.stress_cause]}`);
  lines.push(`秘書ペット: ${PET_DESCRIPTIONS[petType]}`);
  if (profile.name) lines.push(`ユーザー名: ${profile.name}`);
  if (profile.life_vision) lines.push(`Life Vision: ${profile.life_vision}`);
  lines.push(``);

  // ─── 選択されたRole ───────────────────────────────────────
  lines.push(`## 選択されたRole（${selectedRoles.length}件）`);
  selectedRoles.forEach((role, i) => {
    lines.push(``);
    lines.push(`### Role ${i + 1}: ${role.title}（${role.category}）`);
    lines.push(`role_id: ${role.id}`);
    if (role.dream)            lines.push(`Dream: ${role.dream}`);
    if (role.current_reality)  lines.push(`Current Reality: ${role.current_reality}`);
    if (role.gap)              lines.push(`Gap: ${role.gap}`);
    if (role.next_focus)       lines.push(`Next Focus: ${role.next_focus}`);
    if (role.three_year_goal)  lines.push(`3年目標: ${role.three_year_goal}`);
    if (role.one_year_goal)    lines.push(`1年目標: ${role.one_year_goal}`);
    if (role.three_month_goal) lines.push(`3ヶ月目標: ${role.three_month_goal}`);
    if (role.monthly_goal)     lines.push(`今月の目標: ${role.monthly_goal}`);
    if (role.weekly_goal)      lines.push(`今週の目標: ${role.weekly_goal}`);
    if (role.values.length)    lines.push(`大切にしたい価値: ${role.values.join("、")}`);
    lines.push(`進捗: ${role.progress}%`);

    // Role関連の直近タスク
    const roleDone = recentDoneTasks.filter((t) => t.role_id === role.id).slice(0, 3);
    const rolePending = pendingTasks.filter((t) => t.role_id === role.id).slice(0, 3);
    if (roleDone.length > 0) {
      lines.push(`最近の完了タスク: ${roleDone.map((t) => t.title).join(" / ")}`);
    }
    if (rolePending.length > 0) {
      lines.push(`未完了タスク: ${rolePending.map((t) => t.title).join(" / ")}`);
    }
  });

  // ─── 今週のスケジュール ────────────────────────────────────
  lines.push(``);
  lines.push(`## 今週のスケジュール`);
  if (weekSchedules.length === 0) {
    lines.push(`今週はスケジュールなし`);
  } else {
    weekSchedules.slice(0, 8).forEach((s) => {
      const dt = new Date(s.start_time);
      lines.push(`- ${format(dt, "M/d（E）", { locale: ja })} ${s.title}`);
    });
  }

  // ─── 直近7日間のDaily Log ──────────────────────────────────
  if (recentDailyLogs && recentDailyLogs.length > 0) {
    lines.push(``);
    lines.push(`## 直近7日間の1mm日記`);
    recentDailyLogs.forEach((log) => {
      const parts: string[] = [`- ${log.date}`];
      if (log.mood_after) parts.push(`気分:${MOOD_LABEL_MAP[log.mood_after] ?? log.mood_after}`);
      const mins: string[] = [];
      if (log.english_minutes > 0)  mins.push(`英語${log.english_minutes}分`);
      if (log.exercise_minutes > 0) mins.push(`運動${log.exercise_minutes}分`);
      if (log.creator_minutes > 0)  mins.push(`制作${log.creator_minutes}分`);
      if (log.work_minutes > 0)     mins.push(`仕事${log.work_minutes}分`);
      if (log.study_minutes > 0)    mins.push(`勉強${log.study_minutes}分`);
      if (mins.length) parts.push(mins.join("/"));
      if (log.sleep_hours) parts.push(`睡眠${log.sleep_hours}h`);
      if (log.one_line_diary) parts.push(`「${log.one_line_diary}」`);
      lines.push(parts.join(" "));
    });
  }


  // ─── 直近のゴール ──────────────────────────────────────────────
  if (upcomingGoals && upcomingGoals.length > 0) {
    const horizonLabel = (h: string) =>
      h === "3year" ? "3年ゴール" : h === "1year" ? "1年ゴール" :
      h === "3month" ? "3ヶ月ゴール" : h === "monthly" ? "今月ゴール" : "イベント";
    lines.push(``);
    lines.push(`## 直近のゴール（今日のアクションに反映）`);
    upcomingGoals.forEach((g) => {
      const daysLeft = Math.ceil((new Date(g.event_date + "T00:00:00").getTime() - date.getTime()) / 86400000);
      lines.push(`- 「${g.title}」: あと${daysLeft}日（${horizonLabel(g.time_horizon)}）`);
    });
  }

  // ─── 生成指示 ─────────────────────────────────────────────
  lines.push(``);
  lines.push(`## 生成指示`);
  lines.push(`上記の情報をすべて考慮して、今日のRole Planを生成してください。`);
  lines.push(`- モード「${MODE_LABELS[checkin.mode]}」とエネルギー${checkin.energy}%に合わせた行動の強さにすること`);
  lines.push(`- 各タスクはRoleのDream・Gap・目標に必ず結びつけること`);
  lines.push(`- 一般的なTODO（音楽を作る、勉強する、運動する）は絶対に出さないこと`);
  lines.push(`- 最大3件（回復日・エネルギー10%は1件のみ）`);
  lines.push(`- important_not_urgent（夢に効く本命行動）を最低1件含めること`);

  if (regenerationMode && REGENERATION_INSTRUCTIONS[regenerationMode]) {
    lines.push(``);
    lines.push(REGENERATION_INSTRUCTIONS[regenerationMode]);
  }

  lines.push(``);
  lines.push(`JSONのみを出力してください。前置きも後書きもコードブロックも不要です。`);

  return lines.join("\n");
}
