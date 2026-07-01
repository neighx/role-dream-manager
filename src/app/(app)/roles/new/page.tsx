"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RoleCategory, ROLE_CATEGORY_COLORS } from "@/types";

const ROLES: { category: RoleCategory; emoji: string; description: string }[] = [
  { category: "creator", emoji: "🎵", description: "クリエイター" },
  { category: "health", emoji: "🌿", description: "健康・スポーツ" },
  { category: "work", emoji: "💼", description: "仕事・ビジネス" },
  { category: "relationship", emoji: "💛", description: "恋愛・人間関係" },
  { category: "learning", emoji: "🌍", description: "学び・未来" },
  { category: "selfcare", emoji: "🕯", description: "自分のケア" },
];

export default function NewRolePage() {
  const router = useRouter();
  const supabase = createClient();
  const [category, setCategory] = useState<RoleCategory | null>(null);
  const [title, setTitle] = useState("");
  const [dream, setDream] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [createdRoleId, setCreatedRoleId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  async function handleSave() {
    if (!category) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("roles").insert({
      user_id: user.id,
      category,
      title: title || ROLE_CATEGORY_COLORS[category].label,
      dream: dream || null,
    }).select().single();

    setIsSaving(false);
    if (data) {
      setCreatedRoleId(data.id);
      setShowGoalModal(true);
    }
  }

  async function handleSaveGoal() {
    if (!createdRoleId) return;
    if (!goalTitle.trim() || !goalDate) {
      router.push(`/roles/${createdRoleId}`);
      return;
    }
    setIsSavingGoal(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("goals").insert({
        user_id: user.id,
        role_id: createdRoleId,
        title: goalTitle.trim(),
        category: "other",
        event_date: goalDate,
        time_horizon: "3year",
      });
    }
    setIsSavingGoal(false);
    router.push(`/roles/${createdRoleId}`);
  }

  return (
    <>
    <div className="min-h-screen bg-ivory px-5 pt-safe pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-charcoal" />
        </button>
        <h1 className="text-xl font-medium text-charcoal">新しいRole</h1>
      </div>

      <div className="space-y-5">
        {/* カテゴリ選択 */}
        <div>
          <p className="text-sm font-medium text-charcoal mb-3">カテゴリを選んでください</p>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLES.map((role) => {
              const isSelected = category === role.category;
              const colors = ROLE_CATEGORY_COLORS[role.category];
              return (
                <button
                  key={role.category}
                  onClick={() => setCategory(role.category)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    isSelected ? "border-sage" : "border-transparent bg-white"
                  }`}
                  style={isSelected ? { backgroundColor: colors.bg + "40" } : {}}
                >
                  <span className="text-xl">{role.emoji}</span>
                  <span className="text-sm font-medium text-charcoal flex-1">{role.description}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sage flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* タイトル */}
        <div className="bg-white rounded-3xl p-5">
          <label className="text-sm font-medium text-charcoal block mb-2">
            Role名（任意）
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={category ? ROLE_CATEGORY_COLORS[category].label : "例：DJとして"}
            className="w-full text-sm text-charcoal placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Dream */}
        <div className="bg-white rounded-3xl p-5">
          <label className="text-sm font-medium text-charcoal block mb-2">
            Dream（任意）
          </label>
          <textarea
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder="例：海外にも届く作品を作る"
            rows={3}
            className="w-full text-sm text-charcoal placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* 保存ボタン */}
        <motion.button
          onClick={handleSave}
          disabled={!category || isSaving}
          whileTap={{ scale: 0.97 }}
          className="w-full py-5 rounded-3xl bg-sage text-white font-medium text-base disabled:opacity-40"
        >
          {isSaving ? "作成中..." : "Roleを作成する"}
        </motion.button>
      </div>
    </div>

      {/* ⑥ Role作成後ゴールカスケードモーダル */}
      <AnimatePresence>
        {showGoalModal && createdRoleId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="bg-ivory w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-5"
            >
              <div className="text-center space-y-2">
                <p className="text-3xl">🎯</p>
                <h2 className="text-base font-medium text-charcoal">3年後のゴールを設定しますか？</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  夢への逆算をここから始めましょう。<br />後からでも追加できます。
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">3年後のゴール</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="例：武道館でワンマンライブ"
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-4 py-3 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">目標日（約3年後）</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={e => setGoalDate(e.target.value)}
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-4 py-3 focus:outline-none"
                />
              </div>

              <motion.button
                onClick={handleSaveGoal}
                disabled={!goalTitle.trim() || !goalDate || isSavingGoal}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40"
              >
                {isSavingGoal ? "保存中..." : "ゴールを設定する"}
              </motion.button>

              <button
                onClick={() => router.push(`/roles/${createdRoleId}`)}
                className="w-full text-center text-sm text-muted-foreground"
              >
                スキップして後で設定する
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
