import { RoleCategory, EnergyLevel } from "@/types";

export interface TaskTemplate {
  title: string;
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  importance: 1 | 2 | 3 | 4 | 5;
  urgency: 1 | 2 | 3 | 4 | 5;
  taskType: string;
}

export interface GapTaskTemplate {
  gapKeyword: string;
  gapAddressed: string;
  longTermConnectionTemplate: string;
  tasks: TaskTemplate[];
}

export const GAP_TASK_TEMPLATES: Record<RoleCategory, GapTaskTemplate[]> = {
  creator: [
    {
      gapKeyword: "作品数",
      gapAddressed: "作品数不足",
      longTermConnectionTemplate: "{one_year_goal} のためにリリース数を積み上げる",
      tasks: [
        { title: "8小節だけ作る", estimatedMinutes: 30, difficulty: 2, importance: 4, urgency: 2, taskType: "create" },
        { title: "アプリを開いて触ってみる", estimatedMinutes: 10, difficulty: 1, importance: 3, urgency: 1, taskType: "open_only" },
        { title: "ラフで1曲形にする", estimatedMinutes: 60, difficulty: 4, importance: 5, urgency: 3, taskType: "create" },
        { title: "サビのメロディだけ作る", estimatedMinutes: 20, difficulty: 2, importance: 4, urgency: 2, taskType: "create_light" },
      ],
    },
    {
      gapKeyword: "SNS",
      gapAddressed: "SNS発信不足",
      longTermConnectionTemplate: "ファンとの接点を作り {one_year_goal} につなげる",
      tasks: [
        { title: "SNSに1投稿する", estimatedMinutes: 15, difficulty: 2, importance: 4, urgency: 3, taskType: "publish" },
        { title: "投稿の文章のラフを書く", estimatedMinutes: 10, difficulty: 1, importance: 3, urgency: 2, taskType: "draft" },
        { title: "Reels用に30秒切り抜く", estimatedMinutes: 20, difficulty: 3, importance: 4, urgency: 3, taskType: "create" },
        { title: "フィード1枚分の写真を選ぶ", estimatedMinutes: 10, difficulty: 1, importance: 3, urgency: 2, taskType: "organize" },
      ],
    },
    {
      gapKeyword: "ライブ",
      gapAddressed: "ライブ導線不足",
      longTermConnectionTemplate: "{three_year_goal} への表現の場を作る",
      tasks: [
        { title: "ライブ会場に1件問い合わせる", estimatedMinutes: 15, difficulty: 3, importance: 5, urgency: 4, taskType: "sales" },
        { title: "セットリストの草案を書く", estimatedMinutes: 20, difficulty: 2, importance: 4, urgency: 2, taskType: "plan" },
        { title: "過去のライブ動画を1本見直す", estimatedMinutes: 15, difficulty: 1, importance: 3, urgency: 1, taskType: "check" },
      ],
    },
    {
      gapKeyword: "発信",
      gapAddressed: "発信習慣の不足",
      longTermConnectionTemplate: "ファン化の導線を作り {one_year_goal} につなげる",
      tasks: [
        { title: "制作の裏側を1つシェアする", estimatedMinutes: 10, difficulty: 2, importance: 4, urgency: 3, taskType: "publish" },
        { title: "今日の作業ログを1行書く", estimatedMinutes: 5, difficulty: 1, importance: 3, urgency: 1, taskType: "minimum" },
      ],
    },
  ],
  health: [
    {
      gapKeyword: "運動",
      gapAddressed: "運動習慣の不足",
      longTermConnectionTemplate: "{one_year_goal} のために体を整える",
      tasks: [
        { title: "10分だけ歩く", estimatedMinutes: 10, difficulty: 1, importance: 4, urgency: 2, taskType: "minimum" },
        { title: "30分ジョギング", estimatedMinutes: 30, difficulty: 3, importance: 4, urgency: 2, taskType: "create" },
        { title: "ストレッチだけする", estimatedMinutes: 5, difficulty: 1, importance: 3, urgency: 1, taskType: "minimum" },
      ],
    },
    {
      gapKeyword: "睡眠",
      gapAddressed: "睡眠リズムの乱れ",
      longTermConnectionTemplate: "体調を整えて {one_year_goal} のパフォーマンスを上げる",
      tasks: [
        { title: "22時にスマホを置く", estimatedMinutes: 5, difficulty: 1, importance: 4, urgency: 3, taskType: "minimum" },
        { title: "今夜の就寝時間を決める", estimatedMinutes: 2, difficulty: 1, importance: 4, urgency: 3, taskType: "decide" },
      ],
    },
    {
      gapKeyword: "食事",
      gapAddressed: "食事の質の低下",
      longTermConnectionTemplate: "体から整えて {dream} を支える土台を作る",
      tasks: [
        { title: "野菜を1品追加して食べる", estimatedMinutes: 15, difficulty: 1, importance: 3, urgency: 2, taskType: "minimum" },
        { title: "水を1杯飲む", estimatedMinutes: 1, difficulty: 1, importance: 3, urgency: 1, taskType: "minimum" },
      ],
    },
  ],
  work: [
    {
      gapKeyword: "売上",
      gapAddressed: "売上の停滞",
      longTermConnectionTemplate: "{one_year_goal} の収益目標に近づく",
      tasks: [
        { title: "営業DM1通送る", estimatedMinutes: 15, difficulty: 3, importance: 5, urgency: 4, taskType: "sales" },
        { title: "請求書を確認する", estimatedMinutes: 10, difficulty: 2, importance: 5, urgency: 5, taskType: "check" },
        { title: "予約導線を1つ改善する", estimatedMinutes: 20, difficulty: 3, importance: 5, urgency: 3, taskType: "organize" },
      ],
    },
    {
      gapKeyword: "習慣",
      gapAddressed: "業務習慣の乱れ",
      longTermConnectionTemplate: "{one_year_goal} を達成するための土台を作る",
      tasks: [
        { title: "今日のタスクを3つ書く", estimatedMinutes: 5, difficulty: 1, importance: 4, urgency: 3, taskType: "plan" },
        { title: "メールを5通処理する", estimatedMinutes: 15, difficulty: 2, importance: 3, urgency: 4, taskType: "reply" },
      ],
    },
  ],
  relationship: [
    {
      gapKeyword: "連絡",
      gapAddressed: "連絡・つながり不足",
      longTermConnectionTemplate: "{dream} のためにつながりを育てる",
      tasks: [
        { title: "大切な人に一言連絡する", estimatedMinutes: 5, difficulty: 1, importance: 4, urgency: 3, taskType: "minimum" },
        { title: "ありがとうを1つ伝える", estimatedMinutes: 3, difficulty: 1, importance: 4, urgency: 2, taskType: "minimum" },
      ],
    },
    {
      gapKeyword: "時間",
      gapAddressed: "一緒に過ごす時間不足",
      longTermConnectionTemplate: "{one_year_goal} のために会う時間を作る",
      tasks: [
        { title: "次に会う日程を1つ決める", estimatedMinutes: 5, difficulty: 1, importance: 5, urgency: 4, taskType: "decide" },
        { title: "好きなことを共有する", estimatedMinutes: 5, difficulty: 1, importance: 3, urgency: 1, taskType: "minimum" },
      ],
    },
  ],
  learning: [
    {
      gapKeyword: "英語",
      gapAddressed: "英語学習の停滞",
      longTermConnectionTemplate: "{one_year_goal} のために英語力を積む",
      tasks: [
        { title: "英語15分する", estimatedMinutes: 15, difficulty: 2, importance: 4, urgency: 2, taskType: "create" },
        { title: "英単語5つ覚える", estimatedMinutes: 5, difficulty: 1, importance: 3, urgency: 1, taskType: "minimum" },
        { title: "英語のPodcastを聴く", estimatedMinutes: 10, difficulty: 1, importance: 3, urgency: 1, taskType: "minimum" },
      ],
    },
    {
      gapKeyword: "勉強",
      gapAddressed: "学習量の不足",
      longTermConnectionTemplate: "{three_year_goal} に向けて知識を積む",
      tasks: [
        { title: "教材を1ページ読む", estimatedMinutes: 10, difficulty: 1, importance: 4, urgency: 2, taskType: "minimum" },
        { title: "30分集中して勉強する", estimatedMinutes: 30, difficulty: 3, importance: 4, urgency: 2, taskType: "create" },
      ],
    },
  ],
  selfcare: [
    {
      gapKeyword: "感情",
      gapAddressed: "感情の乱れ",
      longTermConnectionTemplate: "{dream} のために自分の土台を整える",
      tasks: [
        { title: "今の気分を一言日記に書く", estimatedMinutes: 5, difficulty: 1, importance: 4, urgency: 3, taskType: "minimum" },
        { title: "深呼吸を3回する", estimatedMinutes: 2, difficulty: 1, importance: 4, urgency: 3, taskType: "rest" },
        { title: "好きな音楽を5分聴く", estimatedMinutes: 5, difficulty: 1, importance: 3, urgency: 1, taskType: "rest" },
      ],
    },
    {
      gapKeyword: "生活",
      gapAddressed: "生活リズムの乱れ",
      longTermConnectionTemplate: "安定した基盤を作って {dream} を支える",
      tasks: [
        { title: "部屋を3分片付ける", estimatedMinutes: 3, difficulty: 1, importance: 3, urgency: 2, taskType: "environment" },
        { title: "今夜の予定を1つ決める", estimatedMinutes: 2, difficulty: 1, importance: 3, urgency: 2, taskType: "plan" },
      ],
    },
  ],
};

// Gapテキストからテンプレートを検索
export function findGapTemplates(
  category: RoleCategory,
  gapText: string
): GapTaskTemplate[] {
  const templates = GAP_TASK_TEMPLATES[category];
  if (!gapText) return [templates[0]]; // デフォルト：最初のテンプレート

  const matched = templates.filter((t) =>
    gapText.includes(t.gapKeyword)
  );

  return matched.length > 0 ? matched : [templates[0]];
}

// エネルギーに合わせてタスク分を選択
export function selectTask(
  template: GapTaskTemplate,
  maxMinutes: number,
  maxDifficulty: number
): TaskTemplate {
  const suitable = template.tasks
    .filter((t) => t.estimatedMinutes <= maxMinutes && t.difficulty <= maxDifficulty)
    .sort((a, b) => b.difficulty - a.difficulty); // 難易度高い順

  return suitable[0] || template.tasks[template.tasks.length - 1];
}
