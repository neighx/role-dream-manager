"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { DeadlineType } from "./DeadlineStep";

interface AIGoalPlanResult {
  simple_title: string;
  easy_category: string;
  easy_category_display?: string;
  simple_goal: string;
  steps: { title: string; easy_description: string }[];
  today_tasks: { title: string; easy_reason: string; estimated_minutes: number }[];
  pet_message: string;
}

interface AIGoalPlanStepProps {
  goalText: string;
  deadlineType: DeadlineType | null;
  deadlineDate: string | null;
  petType: string | null;
  onResult: (result: AIGoalPlanResult) => void;
}

export function AIGoalPlanStep({ goalText, deadlineType, deadlineDate, petType, onResult }: AIGoalPlanStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AIGoalPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goalText || goalText === "まだ決まっていない") {
      // ゴール未設定の場合はスキップ
      const dummy: AIGoalPlanResult = {
        simple_title: "やりたいことを見つける",
        easy_category: "じぶんを大切に",
        simple_goal: "自分のやりたいことを整理する",
        steps: [
          { title: "気になることをメモする", easy_description: "思いつくことを書いてみる" },
          { title: "一番気になるものを選ぶ", easy_description: "優先順位を考える" },
        ],
        today_tasks: [
          { title: "やりたいこと候補を3つ書く", easy_reason: "自分を知るため", estimated_minutes: 10 },
        ],
        pet_message: "まずは自分が何をしたいか、ゆっくり考えてみよう！",
      };
      setResult(dummy);
      onResult(dummy);
      setIsLoading(false);
      return;
    }

    async function generate() {
      try {
        const res = await fetch("/api/ai/classify-goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal_text: goalText,
            deadline_type: deadlineType || "undecided",
            deadline_date: deadlineDate,
            pet_type: petType || "cat",
            save_to_db: true,
          }),
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json() as AIGoalPlanResult;
        setResult(data);
        onResult(data);
      } catch (e) {
        console.error(e);
        setError("手順の作成に失敗しました。もう一度お試しください。");
      } finally {
        setIsLoading(false);
      }
    }

    generate();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pt-4"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-medium text-charcoal leading-tight">
          AIが手順を
          <br />
          作っています…
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-sage border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                「{goalText.slice(0, 20)}{goalText.length > 20 ? "…" : ""}」をもとに
                <br />
                手順を考えています
              </p>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-3 bg-mist rounded-full w-3/4 mb-2" />
                <div className="h-2.5 bg-mist rounded-full w-1/2" />
              </div>
            ))}
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 rounded-2xl p-5 text-center"
          >
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}

        {result && !isLoading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* カテゴリバッジ */}
            <div className="bg-sage/10 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-sm text-sage font-medium">
                これは「{result.easy_category_display || result.easy_category}」に入れておきました
              </span>
            </div>

            {/* 必要な手順 */}
            <div className="bg-white rounded-3xl p-5 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                {result.simple_title || goalText.slice(0, 20)}までに必要なこと
              </p>
              {result.steps.slice(0, 6).map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-mist flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm text-charcoal font-medium">{step.title}</p>
                    {step.easy_description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{step.easy_description}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* まず今日やること */}
            <div className="bg-sage/5 rounded-3xl p-5 space-y-3">
              <p className="text-xs font-medium text-charcoal">まず今日やること</p>
              {result.today_tasks.map((task, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-charcoal">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground">{task.easy_reason} · {task.estimated_minutes}分</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ペットメッセージ */}
            {result.pet_message && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl px-4 py-3"
              >
                <p className="text-sm text-charcoal">
                  <span className="mr-1.5">{petType === "dog" ? "🐶" : petType === "robot" ? "🤖" : "🐱"}</span>
                  {result.pet_message}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
