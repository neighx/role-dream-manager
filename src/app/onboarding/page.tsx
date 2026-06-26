"use client";
export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { BirthdayStep } from "@/components/onboarding/steps/BirthdayStep";
import { GenderStep } from "@/components/onboarding/steps/GenderStep";
import { RoleSelectionStep } from "@/components/onboarding/steps/RoleSelectionStep";
import { RolePriorityStep } from "@/components/onboarding/steps/RolePriorityStep";
import { RoleDreamStep } from "@/components/onboarding/steps/RoleDreamStep";
import { VisionPhotoStep } from "@/components/onboarding/steps/VisionPhotoStep";
import { PetSelectionStep } from "@/components/onboarding/steps/PetSelectionStep";
import { OnboardingSummaryStep } from "@/components/onboarding/steps/OnboardingSummaryStep";
import { OnboardingFormData, RoleCategory } from "@/types";

const ROLE_NAMES: Record<RoleCategory, string> = {
  creator: "クリエイター",
  health: "健康・スポーツ",
  work: "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning: "学び・未来",
  selfcare: "自分のケア",
};

const DEFAULT_DREAM = {
  dream: "",
  threeYearGoal: "",
  oneYearGoal: "",
  currentReality: "",
  gap: "",
};

function makeDefaultFormData(): OnboardingFormData {
  return {
    birthday: null,
    gender: null,
    selectedRoles: [],
    roleValues: {} as Record<RoleCategory, string[]>,
    roleDreams: {} as OnboardingFormData["roleDreams"],
    visionPhotos: {} as Record<RoleCategory, File | null>,
    selectedPet: null,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<OnboardingFormData>(makeDefaultFormData());
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // ─── ステップ定義 ──────────────────────────────────────────
  // step 0: 誕生日
  // step 1: 性別
  // step 2: Role選択
  // step 3..5: 各RoleのPriority（selectedRoles.length分）
  // step 3+N..5+N: 各RoleのDream（selectedRoles.length分）
  // step 3+2N..5+2N: 各RoleのVisionPhoto
  // step 3+3N: ペット選択
  // step 3+3N+1: サマリー

  const roleCount = formData.selectedRoles.length;
  const FIXED_STEPS = 3; // 誕生日・性別・Role選択
  const PER_ROLE_PHASES = 3; // Priority・Dream・VisionPhoto
  const TOTAL_STEPS = FIXED_STEPS + roleCount * PER_ROLE_PHASES + 2; // +ペット+サマリー

  function getStepType(): {
    type: "birthday" | "gender" | "roleSelect" | "priority" | "dream" | "vision" | "pet" | "summary";
    roleIndex?: number;
  } {
    if (currentStep === 0) return { type: "birthday" };
    if (currentStep === 1) return { type: "gender" };
    if (currentStep === 2) return { type: "roleSelect" };

    const afterFixed = currentStep - FIXED_STEPS;

    // Priority phase
    if (afterFixed < roleCount) {
      return { type: "priority", roleIndex: afterFixed };
    }
    // Dream phase
    if (afterFixed < roleCount * 2) {
      return { type: "dream", roleIndex: afterFixed - roleCount };
    }
    // Vision phase
    if (afterFixed < roleCount * 3) {
      return { type: "vision", roleIndex: afterFixed - roleCount * 2 };
    }
    // Pet
    if (afterFixed === roleCount * 3) return { type: "pet" };
    // Summary
    return { type: "summary" };
  }

  const stepInfo = getStepType();

  function canProceed(): boolean {
    const { type, roleIndex } = stepInfo;
    switch (type) {
      case "birthday":
        return !!formData.birthday;
      case "gender":
        return !!formData.gender;
      case "roleSelect":
        return formData.selectedRoles.length > 0;
      case "priority":
        return (formData.roleValues[formData.selectedRoles[roleIndex!]] || []).length === 3;
      case "dream":
        return true; // 未入力OK
      case "vision":
        return true; // 未設定OK
      case "pet":
        return !!formData.selectedPet;
      case "summary":
        return true;
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

  async function handleFinish() {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // プロフィール更新
      await supabase.from("users_profile").upsert({
        user_id: user.id,
        birthday: formData.birthday,
        gender: formData.gender,
        selected_pet: formData.selectedPet,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      // Roleを一括保存
      for (let i = 0; i < formData.selectedRoles.length; i++) {
        const cat = formData.selectedRoles[i];
        const dreams = formData.roleDreams[cat] || DEFAULT_DREAM;
        const values = formData.roleValues[cat] || [];

        const { data: role } = await supabase.from("roles").insert({
          user_id: user.id,
          category: cat,
          title: ROLE_NAMES[cat],
          values,
          dream: dreams.dream || null,
          current_reality: dreams.currentReality || null,
          gap: dreams.gap || null,
          three_year_goal: dreams.threeYearGoal || null,
          one_year_goal: dreams.oneYearGoal || null,
          display_order: i,
        }).select().single();

        // Vision Photo upload
        const photo = formData.visionPhotos[cat];
        if (role && photo) {
          const ext = photo.name.split(".").pop();
          const path = `${user.id}/roles/${role.id}/vision.${ext}`;
          const { data: uploaded } = await supabase.storage
            .from("vision-photos")
            .upload(path, photo, { upsert: true });

          if (uploaded) {
            const { data: { publicUrl } } = supabase.storage
              .from("vision-photos")
              .getPublicUrl(path);

            await supabase.from("roles").update({
              vision_photo_url: publicUrl,
            }).eq("id", role.id);
          }
        }
      }

      router.push("/home");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSkip() {
    // ペット以外はスキップ可
    if (stepInfo.type !== "pet") handleNext();
  }

  // ─── レンダリング ──────────────────────────────────────────
  const currentRole = stepInfo.roleIndex !== undefined
    ? formData.selectedRoles[stepInfo.roleIndex]
    : null;

  const ctaLabel = stepInfo.type === "summary"
    ? (isSaving ? "保存中..." : "はじめる")
    : "次へ";

  return (
    <OnboardingLayout
      step={currentStep + 1}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      onSkip={handleSkip}
      ctaLabel={ctaLabel}
      onCTA={handleNext}
      ctaDisabled={!canProceed() || isSaving}
      hideBack={currentStep === 0}
      showSkip={
        stepInfo.type !== "birthday" &&
        stepInfo.type !== "gender" &&
        stepInfo.type !== "roleSelect" &&
        stepInfo.type !== "pet" &&
        stepInfo.type !== "summary"
      }
    >
      <AnimatePresence mode="wait">
        {stepInfo.type === "birthday" && (
          <BirthdayStep
            key="birthday"
            value={formData.birthday}
            onChange={(v) => setFormData((f) => ({ ...f, birthday: v }))}
          />
        )}
        {stepInfo.type === "gender" && (
          <GenderStep
            key="gender"
            value={formData.gender}
            onChange={(v) => setFormData((f) => ({ ...f, gender: v }))}
          />
        )}
        {stepInfo.type === "roleSelect" && (
          <RoleSelectionStep
            key="roleSelect"
            selected={formData.selectedRoles}
            onChange={(roles) =>
              setFormData((f) => ({ ...f, selectedRoles: roles }))
            }
          />
        )}
        {stepInfo.type === "priority" && currentRole && (
          <RolePriorityStep
            key={`priority-${currentRole}`}
            roleCategory={currentRole}
            selected={formData.roleValues[currentRole] || []}
            onChange={(vals) =>
              setFormData((f) => ({
                ...f,
                roleValues: { ...f.roleValues, [currentRole]: vals },
              }))
            }
          />
        )}
        {stepInfo.type === "dream" && currentRole && (
          <RoleDreamStep
            key={`dream-${currentRole}`}
            roleCategory={currentRole}
            value={formData.roleDreams[currentRole] || DEFAULT_DREAM}
            onChange={(data) =>
              setFormData((f) => ({
                ...f,
                roleDreams: { ...f.roleDreams, [currentRole]: data },
              }))
            }
          />
        )}
        {stepInfo.type === "vision" && currentRole && (
          <VisionPhotoStep
            key={`vision-${currentRole}`}
            roleCategory={currentRole}
            value={formData.visionPhotos[currentRole] || null}
            onChange={(file) =>
              setFormData((f) => ({
                ...f,
                visionPhotos: { ...f.visionPhotos, [currentRole]: file },
              }))
            }
          />
        )}
        {stepInfo.type === "pet" && (
          <PetSelectionStep
            key="pet"
            value={formData.selectedPet}
            onChange={(pet) =>
              setFormData((f) => ({ ...f, selectedPet: pet }))
            }
          />
        )}
        {stepInfo.type === "summary" && (
          <OnboardingSummaryStep
            key="summary"
            selectedRoles={formData.selectedRoles}
            roleValues={formData.roleValues}
            selectedPet={formData.selectedPet}
          />
        )}
      </AnimatePresence>
    </OnboardingLayout>
  );
}
