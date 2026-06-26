import { PetType, PetMessageType, DayMode, EnergyLevel, Mood } from "@/types";

interface GetPetMessageOptions {
  petType: PetType;
  messageType: PetMessageType;
  mood?: Mood;
  energy?: EnergyLevel;
  mode?: DayMode;
  roleName?: string;
  taskTitle?: string;
}

const CAT_MESSAGES: Record<PetMessageType, string[]> = {
  morning: [
    "おはよう。今日はどの自分を育てる？",
    "今日は少し重そうだね。でも夢との線は切れていないよ。",
    "無理に攻めなくていい日もあるよ。整えるのも前進だよ。",
    "ゆっくりでいい。今日できた分だけで十分だよ。",
    "一歩でもいい。夢への接続を切らないことが大事だよ。",
  ],
  task_complete: [
    "やったね。今日も夢に近づいたよ。",
    "ちゃんと進めたね。今日はそれだけで十分。",
    "えらい。続けていることが一番大事だよ。",
    "少しずつ積み重なっているよ。",
  ],
  plan_generated: [
    "今日のプランを整えたよ。無理なく進もう。",
    "今日は8小節だけで十分。続いていることが大事だよ。",
    "今日の自分に合わせたプランだよ。ゆっくりね。",
  ],
  behind_schedule: [
    "今日はまだ途中だよ。夢との線は切れていないから大丈夫。",
    "明日、もう一度小さく始めよう。",
    "整える日も前進だよ。自分を責めなくていい。",
  ],
  weekly_review: [
    "今週もよく頑張ったね。放置されたRoleも、夢は消えていないよ。",
    "少しずつ積み上がっている。来週も一緒に進もう。",
  ],
  comment_received: [
    "誰かが見ていてくれているよ。",
    "コメントが届いたよ。見てみよう。",
  ],
};

const DOG_MESSAGES: Record<PetMessageType, string[]> = {
  morning: [
    "よし、今日は攻められる日！まずは一番大事なことからいこう！",
    "おはよう！今日のプランを確認しよう！",
    "今日もやるぞ！夢に向かって一歩踏み出そう！",
    "コツコツが夢に勝つ！今日もいこう！",
  ],
  task_complete: [
    "いいね！1つ完了した！夢にちゃんと近づいてる！",
    "やった！すごい！このまま続けよう！",
    "完了！最高！次もいこう！",
    "えらい！達成した！夢が近づいてるよ！",
  ],
  plan_generated: [
    "今日のプランができた！一番大事なタスクからいこう！",
    "締切が近いタスクがあるよ。先に片付けよう！",
    "今日も頑張るぞ！まずはこれからいこう！",
  ],
  behind_schedule: [
    "まだ間に合う！今すぐ取り掛かろう！",
    "ここが踏ん張りどき！後悔しないようにいこう！",
    "大丈夫、今からでも夢は止まらない！",
  ],
  weekly_review: [
    "今週もよく頑張った！来週はもっといけるぞ！",
    "振り返りは次へのエネルギー！来週も全力いこう！",
  ],
  comment_received: [
    "コメントが来たよ！チェックしよう！",
    "仲間が応援してくれてるよ！",
  ],
};

const ROBOT_MESSAGES: Record<PetMessageType, string[]> = {
  morning: [
    "今日の優先順位を整理しました。",
    "重要・緊急のタスクから処理しましょう。",
    "エネルギー状態を確認しました。最適なプランを提示します。",
    "今日のモードに合わせてタスクを最適化しました。",
  ],
  task_complete: [
    "タスク完了を記録しました。進捗率が上昇しました。",
    "完了。次の優先タスクに移ります。",
    "データを更新しました。累計達成数が増加しています。",
  ],
  plan_generated: [
    "今日のプランを生成しました。優先順位順に確認してください。",
    "今のエネルギーなら、15分タスクが最適です。",
    "重要度・緊急度をスコアリングしてプランを最適化しました。",
  ],
  behind_schedule: [
    "予定より遅れています。タスクを再スケジュールします。",
    "未完了タスクが残っています。優先順位を見直しましょう。",
    "今日は最小行動に絞ることを推奨します。",
  ],
  weekly_review: [
    "今週のデータを分析しました。レポートを確認してください。",
    "放置されたRoleがあります。来週のプランに組み込みます。",
  ],
  comment_received: [
    "共有メンバーからコメントが届きました。",
    "新しいコメントがあります。確認してください。",
  ],
};

const ALL_MESSAGES: Record<PetType, Record<PetMessageType, string[]>> = {
  cat: CAT_MESSAGES,
  dog: DOG_MESSAGES,
  robot: ROBOT_MESSAGES,
};

export function getPetMessage(options: GetPetMessageOptions): string {
  const { petType, messageType, mode, energy, mood, roleName, taskTitle } = options;

  const messages = ALL_MESSAGES[petType][messageType];

  // モード・エネルギーに応じて選択ロジックを調整（MVP: シンプルランダム）
  let index = Math.floor(Math.random() * messages.length);

  // 回復日・エネルギー低の場合は最初のメッセージ（一番やさしい）を選択
  if ((mode === "recover" || energy === 10) && messageType === "morning") {
    index = petType === "cat" ? 1 : petType === "dog" ? 3 : 3;
  }

  let message = messages[Math.min(index, messages.length - 1)];

  // プレースホルダー置換
  if (roleName) message = message.replace("{roleName}", roleName);
  if (taskTitle) message = message.replace("{taskTitle}", taskTitle);

  return message;
}

export function getMorningMessage(
  petType: PetType,
  mode?: DayMode,
  energy?: EnergyLevel
): string {
  return getPetMessage({ petType, messageType: "morning", mode, energy });
}
