"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getPetMessage } from "@/lib/pet/getPetMessage";
import {
  Mood, EnergyLevel, StressCause, DayMode, PetType,
  MOOD_LABELS, MODE_LABELS, STRESS_LABELS,
} from "@/types";

// ─── Step定義 ──────────────────────────────────────────────
type StepId = "mood" | "energy" | "stress" | "mode";
const STEPS: StepId[] = ["mood", "energy", "stress", "mode"];

const MOOD_OPTIONS: { value: Mood; emoji: string }[] = [
  { value: "good", emoji: "😊" },
  { value: "normal", emoji: "😐" },
  { value: "anxious", emoji: "😟" },
  { value: "rushed", emoji: "😤" },
  { value: "unmotivated", emoji: "😴" },
  { value: "angry", emoji: "😠" },
  { value: "sad", emoji: "😢" },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; color: string }[] = [
  { value: 100, label: "100%", color: "#C8DBC6" },
  { value: 70, label: "70%", color: "#BDD5EA" },
  { value: 40, label: "40%", color: "#D9C9B0" },
  { value: 10, label: "10%", color: "#EDD5CC" },
];

const STRESS_OPTIONS: { value: StressCause; emoji: string }[] = [
  { value: "money", emoji: "💰" },
  { value: "time", emoji: "⏰" },
  { value: "relationship", emoji: "💔" },
  { value: "perfectionism", emoji: "🔮" },
  { value: "body", emoji: "🤒" },
  { value: "future_anxiety", emoji: "😰" },
  { value: "decision_fatigue", emoji: "🌀" },
  { value: "other", emoji: "💭" },
];

const MODE_OPTIONS: { value: DayMode; emoji: string; desc: string; color: string }[] = [
  { value: "attack", emoji: "⚡", desc: "全力で前進する", color: "#BDD5EA" },
  { value: "progress", emoji: "🌱", desc: "着実に進める", color: "#C8DBC6" },
  { value: "maintain", emoji: "🌿", desc: "整えて保つ", color: "#D9C9B0" },
  { value: "protect", emoji: "🛡", desc: "無理せず守る", color: "#EDD5CC" },
  { value: "recover", emoji: "🌙", desc: "休んで回復する", color: "#D8CDE8" },
];

export default function CheckinPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [stress, setStress] = useState<StressCause | null>(null);
  const [mode, setMode] = useState<DayMode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentStep = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

  function canProceed() {
    if (currentStep === "mood") return !!mood;
    if (currentStep === "energy") return !!energy;
    if (currentStep === "stress") return !!stress;
    if (currentStep === "mode") return !!mode;
    return false;
  }

  async function handleFinish() {
    if (!mood || !energy || !stress || !mode) return;
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("users_profile").select("selected_pet").eq("user_id", user.id).single();

    const petType = (profile?.selected_pet || "cat") as PetType;
    const petMessage = getPetMessage({ petType, messageType: "morning", mood, energy, mode });

    await supabase.from("daily_checkins").upsert({
      user_id: user.id,
      mood,
      energy,
      stress_cause: stress,
      mode,
      selected_role_ids: [],
      pet_message: petMessage,
      date: format(new Date(), "yyyy-MM-dd"),
    }, { onConflict: "user_id,date" });

    setIsSaving(false);
    router.push("/today");
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3">
        <button
          onClick={() => step > 0 ? setStep((s) => s - 1) : router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-mist"
        >
          <ChevronLeft className="w-5 h-5 text-charcoal/60" />
        </button>
        <div className="flex-1 mx-4 h-1 bg-mist rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sage rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{step + 1}/{STEPS.length}</span>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 px-5 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* 気分 */}
          {currentStep === "mood" && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="pt-4 space-y-1">
                <h2 className="text-2xl font-medium text-charcoal">今日の気分は？</h2>
                <p className="text-sm text-muted-foreground">正直に教えてください。</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {MOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMood(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      mood === opt.value ? "border-sage bg-sage/8" : "border-transparent bg-white"
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-[10px] text-charcoal text-center leading-tight">
                      {MOOD_LABELS[opt.value]}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* エネルギー */}
          {currentStep === "energy" && (
            <motion.div
              key="energy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="pt-4 space-y-1">
                <h2 className="text-2xl font-medium text-charcoal">今日のエネルギーは？</h2>
                <p className="text-sm text-muted-foreground">体と心のエネルギーを教えてください。</p>
              </div>
              <div className="space-y-3">
                {ENERGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEnergy(opt.value)}
                    className={`w-full flex items-center gap-4 px-5 py-5 rounded-3xl border-2 transition-all ${
                      energy === opt.value ? "border-sage" : "border-transparent bg-white"
                    }`}
                    style={energy === opt.value ? { backgroundColor: opt.color + "40" } : {}}
                  >
                    {/* エネルギーバー */}
                    <div className="w-20 h-2.5 rounded-full bg-mist overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${opt.value}%`,
                          backgroundColor: opt.color.replace("40", ""),
                        }}
                      />
                    </div>
                    <span className="text-base font-medium text-charcoal flex-1 text-left">
                      {opt.label}
                    </span>
                    {energy === opt.value && (
                      <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ストレス原因 */}
          {currentStep === "stress" && (
            <motion.div
              key="stress"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="pt-4 space-y-1">
                <h2 className="text-2xl font-medium text-charcoal">今のストレスの原因は？</h2>
                <p className="text-sm text-muted-foreground">一番近いものを選んでください。</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {STRESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStress(opt.value)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                      stress === opt.value ? "border-sage bg-sage/8" : "border-transparent bg-white"
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-sm text-charcoal">{STRESS_LABELS[opt.value]}</span>
                    {stress === opt.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-sage flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* 今日のモード */}
          {currentStep === "mode" && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="pt-4 space-y-1">
                <h2 className="text-2xl font-medium text-charcoal">今日はどんな日にする？</h2>
                <p className="text-sm text-muted-foreground">今日のモードを選んでください。</p>
              </div>
              <div className="space-y-3">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`w-full flex items-center gap-4 px-5 py-5 rounded-3xl border-2 transition-all ${
                      mode === opt.value ? "border-sage" : "border-transparent bg-white"
                    }`}
                    style={mode === opt.value ? { backgroundColor: opt.color + "50" } : {}}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-charcoal">{MODE_LABELS[opt.value]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    {mode === opt.value && (
                      <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-5 pb-safe pb-8 pt-4">
        <motion.button
          onClick={handleNext}
          disabled={!canProceed() || isSaving}
          whileTap={{ scale: 0.97 }}
          className="w-full py-5 rounded-3xl bg-sage text-white font-medium text-base disabled:opacity-40"
        >
          {step === STEPS.length - 1
            ? isSaving ? "保存中..." : "今日のプランを作る"
            : "次へ"}
        </motion.button>
      </div>
    </div>
  );
}
