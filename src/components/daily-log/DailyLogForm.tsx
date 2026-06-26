"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ChevronDown, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DailyLog, MoodType, Role, ROLE_CATEGORY_COLORS } from "@/types";

// ─── 定数 ──────────────────────────────────────────────────────

const ROLE_EMOJI: Record<string, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

const MOODS: { value: MoodType; emoji: string; label: string }[] = [
  { value: "great", emoji: "🌟", label: "最高" },
  { value: "good",  emoji: "😊", label: "良い"  },
  { value: "okay",  emoji: "😐", label: "普通"  },
  { value: "tired", emoji: "😴", label: "疲れ"  },
  { value: "rough", emoji: "😔", label: "辛い"  },
];

export const MOOD_EMOJI: Record<MoodType, string> = {
  great: "🌟", good: "😊", okay: "😐", tired: "😴", rough: "😔",
};

const WEATHER_OPTIONS = [
  { emoji: "☀️", label: "晴れ" },
  { emoji: "🌤️", label: "晴れ曇り" },
  { emoji: "☁️", label: "曇り" },
  { emoji: "🌧️", label: "雨" },
  { emoji: "⛈️", label: "雷雨" },
  { emoji: "❄️", label: "雪" },
];

const PET_MESSAGES: Record<string, Record<string, string>> = {
  cat:   { saved: "今日もちゃんと戻ってこれたね。1行だけでも、夢との線は切れてないよ。" },
  dog:   { saved: "いいね！今日の記録が明日の作戦になるよ！" },
  robot: { saved: "記録を保存しました。明日のToday Planに反映します。" },
};

// ─── サブコンポーネント ────────────────────────────────────────

function MinuteInput({
  emoji, label, presets, value, onChange,
}: {
  emoji: string; label: string; presets: number[];
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1.5">{emoji} {label}</p>
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-medium border transition-all"
            style={{
              backgroundColor: value === p ? "#C8DBC6" : "transparent",
              borderColor: value === p ? "#9DBF98" : "#E0DDD8",
              color: value === p ? "#444" : "#999",
            }}
          >
            {p === 0 ? "0" : `${p}分`}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  title, open, onToggle,
}: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2"
    >
      <span className="text-[12px] font-medium text-charcoal">{title}</span>
      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

// ─── メインフォーム ────────────────────────────────────────────

interface DailyLogFormProps {
  date: string;
  initialLog?: DailyLog | null;
  roles: Role[];
  petType?: "cat" | "dog" | "robot";
  onSaved?: (log: DailyLog) => void;
}

export function DailyLogForm({ date, initialLog, roles, petType = "cat", onSaved }: DailyLogFormProps) {
  const supabase = createClient();

  // ─ フォーム値
  const [moodAfter, setMoodAfter] = useState<MoodType | null>(initialLog?.mood_after ?? null);
  const [diary, setDiary] = useState(initialLog?.one_line_diary ?? "");
  const [rolesGrown, setRolesGrown] = useState<string[]>(initialLog?.roles_grown ?? []);
  const [exerciseMin, setExerciseMin] = useState(initialLog?.exercise_minutes ?? 0);
  const [englishMin, setEnglishMin]   = useState(initialLog?.english_minutes  ?? 0);
  const [creatorMin, setCreatorMin]   = useState(initialLog?.creator_minutes  ?? 0);
  const [workMin, setWorkMin]         = useState(initialLog?.work_minutes      ?? 0);
  const [studyMin, setStudyMin]       = useState(initialLog?.study_minutes     ?? 0);
  const [sleepHours, setSleepHours]   = useState<number | null>(initialLog?.sleep_hours ?? null);
  const [weather, setWeather]         = useState(initialLog?.weather   ?? "");
  const [temperature, setTemperature] = useState<number | null>(initialLog?.temperature ?? null);
  const [location, setLocation]       = useState(initialLog?.location   ?? "");
  const [photoUrl, setPhotoUrl]       = useState(initialLog?.photo_url  ?? "");
  const [tomorrowNote, setTomorrowNote] = useState(initialLog?.tomorrow_note ?? "");

  // ─ UI
  const [showMinutes, setShowMinutes]     = useState(false);
  const [showSleep, setShowSleep]         = useState(false);
  const [showWeather, setShowWeather]     = useState(false);
  const [showPhoto, setShowPhoto]         = useState(false);
  const [showTomorrow, setShowTomorrow]   = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [savedMessage, setSavedMessage]   = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Role トグル ──────────────────────────────────────────────

  function toggleRole(roleId: string) {
    setRolesGrown((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  // ─── 写真アップロード ──────────────────────────────────────────

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // canvas でリサイズ
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((res) => {
        const i = new Image(); i.onload = () => res(i); i.src = url;
      });
      const maxW = 1200;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.85)
      );
      const path = `${user.id}/${date}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("daily-log-photos").upload(path, blob, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("daily-log-photos").getPublicUrl(path);
        setPhotoUrl(publicUrl);
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ─── 保存 ────────────────────────────────────────────────────

  async function save() {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        date,
        mood_after: moodAfter,
        one_line_diary: diary.trim() || null,
        roles_grown: rolesGrown.length > 0 ? rolesGrown : null,
        exercise_minutes: exerciseMin,
        english_minutes: englishMin,
        creator_minutes: creatorMin,
        work_minutes: workMin,
        study_minutes: studyMin,
        sleep_hours: sleepHours,
        weather: weather || null,
        temperature,
        location: location.trim() || null,
        photo_url: photoUrl || null,
        tomorrow_note: tomorrowNote.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data } = await supabase.from("daily_logs")
        .upsert(payload, { onConflict: "user_id,date" })
        .select().single();

      if (data) {
        onSaved?.(data as DailyLog);
        setSavedMessage(PET_MESSAGES[petType]?.saved ?? "記録しました");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (savedMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 text-center shadow-sm"
      >
        <p className="text-3xl mb-3">
          {petType === "cat" ? "🐱" : petType === "dog" ? "🐶" : "🤖"}
        </p>
        <p className="text-sm text-charcoal leading-relaxed">{savedMessage}</p>
        <button
          onClick={() => setSavedMessage("")}
          className="mt-4 text-[11px] text-sage"
        >
          続けて編集する
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 気分 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-[12px] font-medium text-charcoal mb-3">今日の終わりの気分は？</p>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMoodAfter((prev) => prev === m.value ? null : m.value)}
              className="flex-1 py-2.5 rounded-xl text-center transition-all border"
              style={{
                backgroundColor: moodAfter === m.value ? "#C8DBC6" : "transparent",
                borderColor: moodAfter === m.value ? "#9DBF98" : "#E0DDD8",
              }}
            >
              <p className="text-xl leading-none">{m.emoji}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{m.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 1行日記 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-[12px] font-medium text-charcoal mb-2">
          1行だけ残しましょう
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">何もできなかった日も、戻ってこれたらOK</span>
        </p>
        <textarea
          value={diary}
          onChange={(e) => setDiary(e.target.value)}
          placeholder="今日の小さな記録…"
          rows={2}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
        />
      </div>

      {/* 今日育てたRole */}
      {roles.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[12px] font-medium text-charcoal mb-2">今日育てたRoleを選ぼう</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((role) => {
              const colors = ROLE_CATEGORY_COLORS[role.category];
              const isSelected = rolesGrown.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: isSelected ? colors.bg : "#F5F3EF",
                    color: isSelected ? colors.text : "#999",
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.border : "transparent",
                  }}
                >
                  {ROLE_EMOJI[role.category]} {role.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 活動時間の記録 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader title="⏱ 活動時間の記録" open={showMinutes} onToggle={() => setShowMinutes((v) => !v)} />
        </div>
        <AnimatePresence>
          {showMinutes && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4 border-t border-mist">
                <div className="pt-3 space-y-4">
                  <MinuteInput emoji="🌍" label="英語" presets={[0, 5, 15, 30, 60]}
                    value={englishMin} onChange={setEnglishMin} />
                  <MinuteInput emoji="🌿" label="運動" presets={[0, 5, 10, 20, 30]}
                    value={exerciseMin} onChange={setExerciseMin} />
                  <MinuteInput emoji="🎵" label="制作・創作" presets={[0, 5, 15, 30, 60]}
                    value={creatorMin} onChange={setCreatorMin} />
                  <MinuteInput emoji="💼" label="仕事・ビジネス" presets={[0, 15, 30, 60, 120]}
                    value={workMin} onChange={setWorkMin} />
                  <MinuteInput emoji="📚" label="勉強" presets={[0, 5, 15, 30, 60]}
                    value={studyMin} onChange={setStudyMin} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 睡眠 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader title="😴 昨夜の睡眠" open={showSleep} onToggle={() => setShowSleep((v) => !v)} />
        </div>
        <AnimatePresence>
          {showSleep && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 border-t border-mist pt-3">
                <div className="flex gap-1.5">
                  {[5, 6, 7, 8, 9].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSleepHours((prev) => prev === h ? null : h)}
                      className="flex-1 py-2 rounded-xl text-[10px] font-medium border transition-all"
                      style={{
                        backgroundColor: sleepHours === h ? "#C8DBC6" : "transparent",
                        borderColor: sleepHours === h ? "#9DBF98" : "#E0DDD8",
                        color: sleepHours === h ? "#444" : "#999",
                      }}
                    >
                      {h}時間
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 天気 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader title="🌤 今日の天気・場所" open={showWeather} onToggle={() => setShowWeather((v) => !v)} />
        </div>
        <AnimatePresence>
          {showWeather && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 border-t border-mist pt-3 space-y-3">
                <div className="flex gap-1.5">
                  {WEATHER_OPTIONS.map((w) => (
                    <button
                      key={w.emoji}
                      type="button"
                      onClick={() => setWeather((prev) => prev === w.emoji ? "" : w.emoji)}
                      className="flex-1 py-2 rounded-xl text-xl border transition-all"
                      style={{
                        backgroundColor: weather === w.emoji ? "#E8F4E8" : "transparent",
                        borderColor: weather === w.emoji ? "#9DBF98" : "#E0DDD8",
                      }}
                    >
                      {w.emoji}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={temperature ?? ""}
                    onChange={(e) => setTemperature(e.target.value ? Number(e.target.value) : null)}
                    placeholder="気温 (℃)"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-border focus:outline-none"
                  />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="場所 (東京など)"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-border focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 今日の写真 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader title="📷 今日の写真" open={showPhoto} onToggle={() => setShowPhoto((v) => !v)} />
        </div>
        <AnimatePresence>
          {showPhoto && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 border-t border-mist pt-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                {photoUrl ? (
                  <div className="space-y-2">
                    <img src={photoUrl} alt="今日の写真" className="w-full rounded-xl object-cover max-h-48" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl("")}
                      className="text-[11px] text-muted-foreground"
                    >
                      削除
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full py-6 rounded-xl border-2 border-dashed border-border flex flex-col items-center gap-2 text-muted-foreground disabled:opacity-50"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-[11px]">{uploadingPhoto ? "アップロード中…" : "写真を選ぶ"}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 明日へのメモ */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader title="🌅 明日に残すメモ" open={showTomorrow} onToggle={() => setShowTomorrow((v) => !v)} />
        </div>
        <AnimatePresence>
          {showTomorrow && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 border-t border-mist pt-3">
                <textarea
                  value={tomorrowNote}
                  onChange={(e) => setTomorrowNote(e.target.value)}
                  placeholder="明日やりたいこと・気になること…"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 保存ボタン */}
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className="w-full py-3 rounded-2xl bg-sage text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "保存中…" : "今日を記録する"}
      </button>
      <p className="text-[10px] text-center text-muted-foreground">
        小さな記録が、明日のプランを良くします
      </p>
    </div>
  );
}
