"use client";
export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { BirthdayStep } from "@/components/onboarding/steps/BirthdayStep";
import { GenderStep } from "@/components/onboarding/steps/GenderStep";
import { GoalSelectionStep } from "@/components/onboarding/steps/GoalSelectionStep";
import { DeadlineStep, DeadlineType } from "@/components/onboarding/steps/DeadlineStep";
import { AIGoalPlanStep } from "@/components/onboarding/steps/AIGoalPlanStep";
import { PetSelectionStep } from "@/components/onboarding/steps/PetSelectionStep";
import { PetType } from "@/types";

// ─── ステップ定義 ──────────────────────────────────────────────
// 0: 誕生日
// 1: 性別
// 2: やりたいこと
// 3: いつまでに
// 4: AI手順生成
// 5: ペット選択
// 6: 完了
const TOTAL_STEPS = 7;

interface AIGoalPlanResult {
  simple_title: string;
  easy_category: string;
  easy_category_display?: string;
  simple_goal: string;
  steps: { title: string; easy_description: string }[];
  today_tasks: { title: string; easy_reason: string; estimated_minutes: number }[];
  pet_message: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // フォームデータ
  const [birthday, setBirthday] = useState<string | null>(null);
  const [gender, setGender] = useState<"female" | "male" | "other" | "unanswered" | null>(null);
  const [goalText, setGoalText] = useState("");
  const [deadlineType, setDeadlineType] = useState<DeadlineType | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIGoalPlanResult | null>(null);
  const [selectedPet, setSelectedPet] = useState<PetType | null>(null);

  function canProceed(): boolean {
    switch (currentStep) {
      case 0: return !!birthday;
      case 1: return !!gender;
      case 2: return !!goalText;
      case 3: return !!deadlineType;
      case 4: return !!aiResult;
      case 5: return !!selectedPet;
      case 6: return true;
      default: return false;
    }
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  function handleSkip() {
    if (currentStep === 2) { setGoalText("まだ決まっていない"); setCurrentStep((s) => s + 1); return; }
    if (currentStep === 3) { setDeadlineType("undecided"); setCurrentStep((s) => s + 1); return; }
    handleNext();
  }

  async function handleFinish() {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      await supabase.from("users_profile").upsert({
        user_id: user.id,
        birthday,
        gender,
        selected_pet: selectedPet,
        display_mode: "simple",
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      router.push("/home");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  const petType = selectedPet;
  const isAIPlanStep = currentStep === 4;

  const ctaLabel =
    currentStep === 4 ? (aiResult ? "次へ" : "生成中...") :
    currentStep === 6 ? (isSaving ? "保存中..." : "はじめる！") :
    "次へ";

  const showSkip = currentStep === 2 || currentStep === 3;
  const hideBack = currentStep === 0;

  return (
    <OnboardingLayout
      step={currentStep + 1}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      onSkip={handleSkip}
      ctaLabel={ctaLabel}
      onCTA={handleNext}
      ctaDisabled={!canProceed() || isSaving}
      hideBack={hideBack}
      showSkip={showSkip}
    >
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <BirthdayStep key="birthday" value={birthday} onChange={setBirthday} />
        )}
        {currentStep === 1 && (
          <GenderStep key="gender" value={gender} onChange={setGender} />
        )}
        {currentStep === 2 && (
          <GoalSelectionStep key="goal" value={goalText} onChange={setGoalText} />
        )}
        {currentStep === 3 && (
          <DeadlineStep
            key="deadline"
            deadlineType={deadlineType}
            deadlineDate={deadlineDate}
            onChangeType={setDeadlineType}
            onChangeDate={setDeadlineDate}
          />
        )}
        {currentStep === 4 && (
          <AIGoalPlanStep
            key="aiplan"
            goalText={goalText}
            deadlineType={deadlineType}
            deadlineDate={deadlineDate}
            petType={petType}
            onResult={setAiResult}
          />
        )}
        {currentStep === 5 && (
          <PetSelectionStep
            key="pet"
            value={selectedPet}
            onChange={setSelectedPet}
          />
        )}
        {currentStep === 6 && (
          <SimpleFinishStep
            key="finish"
            aiResult={aiResult}
            petType={selectedPet}
          />
        )}
      </AnimatePresence>
    </OnboardingLayout>
  );
}

// ─── 完了ステップ ──────────────────────────────────────────────
function SimpleFinishStep({
  aiResult,
  petType,
}: {
  aiResult: AIGoalPlanResult | null;
  petType: PetType | null;
}) {
  const petEmoji = petType === "dog" ? "🐶" : petType === "robot" ? "🤖" : "🐱";

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-sage/20 text-4xl">
          {petEmoji}
        </div>
        <h2 className="text-2xl font-medium text-charcoal">
          今日の小さな一歩を
          <br />
          作りました
        </h2>
        <p className="text-sm text-muted-foreground">
          このアプリは、やりたいことを入れると<br />
          AIが今日やることに分けてくれます。
        </p>
      </div>

      {aiResult && aiResult.today_tasks.length > 0 && (
        <div className="bg-white rounded-3xl p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">まず今日やること</p>
          {aiResult.today_tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-sage shrink-0" />
              <p className="text-sm text-charcoal">{task.title}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-sage/10 rounded-3xl p-5">
        <p className="text-sm text-charcoal leading-relaxed">
          大きな目標も、1日ずつ小さく進められます。
          <br />
          あとから、夢やRoleを詳しく整えることもできます。
        </p>
      </div>
    </div>
  );
}
