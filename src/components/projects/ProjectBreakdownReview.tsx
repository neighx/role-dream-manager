"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Calendar, Clock, HelpCircle, Sparkles, ChevronDown } from "lucide-react";
import { AIProjectBreakdown, AIProjectTask } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface Props {
  breakdown: AIProjectBreakdown;
  onSaveAll: (selected: AIProjectTask[]) => void;
  onSaveTodayOnly: (task: AIProjectBreakdown["today_first_action"]) => void;
  isSaving?: boolean;
}

const IMPORTANCE_COLORS: Record<string, string> = {
  high: "#F5CCC8",
  medium: "#BDD5EA",
  low: "#E8E6E0",
};
const IMPORTANCE_LABELS: Record<string, string> = {
  high: "重要",
  medium: "普通",
  low: "低",
};

export function ProjectBreakdownReview({
  breakdown,
  onSaveAll,
  onSaveTodayOnly,
  isSaving,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(breakdown.tasks.map((_, i) => i))
  );
  const [showQuestions, setShowQuestions] = useState(true);

  function toggle(i: number) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return s;
    });
  }

  const selectedTasks = breakdown.tasks.filter((_, i) => selected.has(i));

  return (
    <div className="space-y-5">
      {/* サマリー */}
      <div className="bg-sage/10 rounded-2xl p-4 border border-sage/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-sage" />
          <span className="text-sm font-medium text-sage">AIが道筋を作りました</span>
        </div>
        <p className="text-sm text-charcoal leading-relaxed">{breakdown.summary}</p>
      </div>

      {/* 今日の最初の一歩 */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <p className="text-xs font-medium text-amber-700 mb-1">今日の最初の一歩</p>
        <p className="text-sm font-medium text-charcoal">{breakdown.today_first_action.title}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {breakdown.today_first_action.estimated_minutes}分
          </span>
          <span className="text-xs text-amber-600">{breakdown.today_first_action.reason}</span>
        </div>
        <button
          onClick={() => onSaveTodayOnly(breakdown.today_first_action)}
          disabled={isSaving}
          className="mt-3 w-full py-2 rounded-xl bg-amber-500 text-white text-xs font-medium disabled:opacity-40"
        >
          今日の分だけ保存
        </button>
      </div>

      {/* 不足情報への質問 */}
      {breakdown.missing_info_questions.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <button
            onClick={() => setShowQuestions(!showQuestions)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-700">
                まだ決まっていないことがあります
              </span>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-blue-500 transition-transform ${
                showQuestions ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {showQuestions && (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 space-y-1"
              >
                {breakdown.missing_info_questions.map((q, i) => (
                  <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                    <span className="shrink-0">•</span>
                    {q}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* タスク一覧 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-charcoal">
            タスク一覧（{selected.size}/{breakdown.tasks.length}件選択）
          </p>
          <button
            onClick={() =>
              setSelected(
                selected.size === breakdown.tasks.length
                  ? new Set()
                  : new Set(breakdown.tasks.map((_, i) => i))
              )
            }
            className="text-xs text-sage"
          >
            {selected.size === breakdown.tasks.length ? "すべて解除" : "すべて選択"}
          </button>
        </div>
        <div className="space-y-2">
          {breakdown.tasks.map((task, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(i)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selected.has(i)
                  ? "bg-white border-sage/40 shadow-sm"
                  : "bg-mist border-border opacity-60"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    selected.has(i) ? "bg-sage border-sage" : "border-border"
                  }`}
                >
                  {selected.has(i) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.due_date), "M/d", { locale: ja })}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {task.estimated_minutes}分
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          IMPORTANCE_COLORS[task.importance] ?? "#E8E6E0",
                      }}
                    >
                      {IMPORTANCE_LABELS[task.importance] ?? task.importance}
                    </span>
                  </div>
                  {task.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{task.reason}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSaveAll(selectedTasks)}
        disabled={selected.size === 0 || isSaving}
        className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40"
      >
        {isSaving ? "保存中..." : `選択した${selected.size}件を保存`}
      </button>
    </div>
  );
}
