"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ProjectType } from "@/types";

export interface ProjectFormData {
  title: string;
  project_type: ProjectType;
  target_date: string;
  goal: string;
  success_metric: string;
  budget: string;
  revenue_goal: string;
  current_state: string;
  missing_info: string;
  priority_focus: string;
}

interface Props {
  onSubmit: (data: ProjectFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TYPE_OPTIONS: { value: ProjectType; label: string; emoji: string }[] = [
  { value: "event", label: "イベント", emoji: "🎪" },
  { value: "release", label: "リリース", emoji: "🎵" },
  { value: "health", label: "健康・身体", emoji: "🌿" },
  { value: "learning", label: "学習・スキル", emoji: "🌍" },
  { value: "business", label: "ビジネス", emoji: "💼" },
  { value: "custom", label: "その他", emoji: "✦" },
];

export function ProjectForm({ onSubmit, onCancel, isLoading }: Props) {
  const [form, setForm] = useState<ProjectFormData>({
    title: "",
    project_type: "event",
    target_date: "",
    goal: "",
    success_metric: "",
    budget: "",
    revenue_goal: "",
    current_state: "",
    missing_info: "",
    priority_focus: "",
  });
  const [showOptional, setShowOptional] = useState(false);

  function set(key: keyof ProjectFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">プロジェクト名 *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="例：7月30日にイベントを開催する"
          className="w-full px-3 py-3 rounded-2xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">種類</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("project_type", opt.value)}
              className={`py-2 px-2 rounded-xl text-xs border transition-all ${
                form.project_type === opt.value
                  ? "bg-sage text-white border-sage"
                  : "bg-white text-charcoal border-border"
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">締切・開催日 *</label>
        <input
          type="date"
          value={form.target_date}
          onChange={(e) => set("target_date", e.target.value)}
          className="w-full px-3 py-3 rounded-2xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-1 text-xs text-sage"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform ${showOptional ? "rotate-180" : ""}`}
        />
        {showOptional ? "詳細を閉じる" : "詳細を入力する（任意）"}
      </button>

      {showOptional && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {[
            {
              key: "goal" as const,
              label: "目的・なぜやるか",
              placeholder: "例：クリエイターとして動員と実績を作る",
            },
            {
              key: "success_metric" as const,
              label: "成功条件",
              placeholder: "例：30人集客、赤字にしない",
            },
            {
              key: "current_state" as const,
              label: "現在決まっていること",
              placeholder: "例：会場候補は2つある",
            },
            {
              key: "missing_info" as const,
              label: "まだ決まっていないこと",
              placeholder: "例：出演者、フライヤー、告知方法",
            },
            {
              key: "priority_focus" as const,
              label: "特に優先したいこと",
              placeholder: "例：集客よりも質を重視したい",
            },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <textarea
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">予算（円）</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="30000"
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                売上目標（円）
              </label>
              <input
                type="number"
                value={form.revenue_goal}
                onChange={(e) => set("revenue_goal", e.target.value)}
                placeholder="60000"
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none"
              />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-border text-sm text-muted-foreground"
        >
          キャンセル
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.title || !form.target_date || isLoading}
          className="flex-1 py-3 rounded-2xl bg-sage text-white text-sm font-medium disabled:opacity-40"
        >
          {isLoading ? "作成中..." : "AIで分解する"}
        </button>
      </div>
    </div>
  );
}
