"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LogOut, ChevronRight, Bell, Shield, Palette, Edit3, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, PetType, DisplayMode } from "@/types";

const PET_OPTIONS: { type: PetType; name: string; emoji: string }[] = [
  { type: "cat", name: "秘書ネコ", emoji: "🐱" },
  { type: "dog", name: "秘書犬", emoji: "🐶" },
  { type: "robot", name: "秘書ロボ", emoji: "🤖" },
];

type EditableField = "name" | "birthday" | "life_vision" | null;

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(data);
    }
    load();
  }, []);

  function startEdit(field: EditableField, currentValue: string) {
    setEditingField(field);
    setEditValue(currentValue);
  }

  async function saveField() {
    if (!profile || !editingField) return;
    setIsSaving(true);
    await supabase.from("users_profile").update({ [editingField]: editValue || null }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, [editingField]: editValue || null } : p);
    setEditingField(null);
    setIsSaving(false);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
  }

  async function handlePetChange(pet: PetType) {
    if (!profile) return;
    await supabase.from("users_profile").update({ selected_pet: pet }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, selected_pet: pet } : p);
  }

  async function handleDisplayModeChange(mode: DisplayMode) {
    if (!profile) return;
    await supabase.from("users_profile").update({ display_mode: mode }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, display_mode: mode } : p);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const petEmoji = profile?.selected_pet === "cat" ? "🐱" : profile?.selected_pet === "dog" ? "🐶" : "🤖";

  return (
    <div className="px-5 pt-safe pt-6 space-y-5 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-charcoal">設定</h1>
      </motion.div>

      {/* プロフィール */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl p-5 space-y-4"
      >
        {/* アバター + ペット */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-sage/20 flex items-center justify-center text-2xl shrink-0">
            {petEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-charcoal truncate">{profile?.name || "名前未設定"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">プロフィール</p>
          </div>
        </div>

        <div className="h-px bg-mist" />

        {/* 名前 */}
        <ProfileField
          label="名前"
          value={profile?.name || ""}
          placeholder="お名前を入力"
          isEditing={editingField === "name"}
          editValue={editValue}
          onEdit={() => startEdit("name", profile?.name || "")}
          onSave={saveField}
          onCancel={cancelEdit}
          onEditValueChange={setEditValue}
          isSaving={isSaving}
        />

        {/* 生年月日 */}
        <ProfileField
          label="生年月日"
          value={profile?.birthday || ""}
          placeholder="未設定"
          isEditing={editingField === "birthday"}
          editValue={editValue}
          onEdit={() => startEdit("birthday", profile?.birthday || "")}
          onSave={saveField}
          onCancel={cancelEdit}
          onEditValueChange={setEditValue}
          isSaving={isSaving}
          inputType="date"
        />

        {/* ライフビジョン */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">ライフビジョン</p>
            {editingField === "life_vision" ? (
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="text-xs text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={saveField} disabled={isSaving} className="text-xs text-sage font-medium">
                  {isSaving ? "保存中..." : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button onClick={() => startEdit("life_vision", profile?.life_vision || "")} className="text-sage">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <AnimatePresence mode="wait">
            {editingField === "life_vision" ? (
              <motion.textarea
                key="editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="あなたが生きたい人生像を一言で"
                className="w-full text-sm text-charcoal bg-mist rounded-xl px-3 py-2.5 focus:outline-none resize-none"
                rows={3}
                autoFocus
              />
            ) : (
              <motion.p
                key="value"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-charcoal leading-relaxed"
                onClick={() => startEdit("life_vision", profile?.life_vision || "")}
              >
                {profile?.life_vision || (
                  <span className="text-muted-foreground/50">タップして入力</span>
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 表示モード */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white rounded-3xl p-5 space-y-3"
      >
        <div>
          <h3 className="text-sm font-medium text-charcoal">表示モード</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">かんたんモードでは難しい言葉を隠します</p>
        </div>
        <div className="flex gap-2">
          {([
            { mode: "simple" as DisplayMode, label: "かんたん", desc: "やさしい言葉で表示", emoji: "🌱" },
            { mode: "detail" as DisplayMode, label: "しっかり", desc: "Role/Dream/Gapを表示", emoji: "📊" },
          ]).map((opt) => {
            const isSelected = (profile?.display_mode || "simple") === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => handleDisplayModeChange(opt.mode)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all ${
                  isSelected ? "border-sage bg-sage/8" : "border-transparent bg-mist"
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-xs font-medium text-charcoal">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground text-center px-1">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 秘書ペット変更 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-5 space-y-3"
      >
        <h3 className="text-sm font-medium text-charcoal">秘書ペット</h3>
        <div className="flex gap-3">
          {PET_OPTIONS.map((pet) => {
            const isSelected = profile?.selected_pet === pet.type;
            return (
              <button
                key={pet.type}
                onClick={() => handlePetChange(pet.type)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all ${
                  isSelected ? "border-sage bg-sage/8" : "border-transparent bg-mist"
                }`}
              >
                <span className="text-2xl">{pet.emoji}</span>
                <span className="text-xs text-charcoal">{pet.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* メニュー */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl overflow-hidden"
      >
        {[
          { icon: Bell, label: "通知設定" },
          { icon: Palette, label: "テーマ" },
          { icon: Shield, label: "プライバシー" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-4 border-b border-mist last:border-0"
          >
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-charcoal flex-1">{item.label}</span>
            <span className="text-xs text-muted-foreground bg-mist px-2 py-0.5 rounded-full">近日公開</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        ))}
      </motion.div>

      {/* ログアウト */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={handleLogout}
        className="w-full py-4 rounded-3xl border-2 border-rose-200 text-rose-500 text-sm font-medium flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        ログアウト
      </motion.button>

      <p className="text-center text-xs text-muted-foreground">Role Dream Manager v0.1.0</p>
    </div>
  );
}

// ─── インライン編集フィールド ──────────────────────────────────
interface ProfileFieldProps {
  label: string;
  value: string;
  placeholder: string;
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditValueChange: (v: string) => void;
  isSaving: boolean;
  inputType?: string;
}

function ProfileField({
  label, value, placeholder, isEditing, editValue,
  onEdit, onSave, onCancel, onEditValueChange, isSaving, inputType = "text",
}: ProfileFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isEditing ? (
          <div className="flex gap-3">
            <button onClick={onCancel} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
            <button onClick={onSave} disabled={isSaving} className="text-sage">
              {isSaving ? <span className="text-xs">保存中</span> : <Check className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <button onClick={onEdit} className="text-sage">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.input
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            type={inputType}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="w-full text-sm text-charcoal bg-mist rounded-xl px-3 py-2.5 focus:outline-none"
            autoFocus
          />
        ) : (
          <motion.p
            key="value"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-charcoal"
            onClick={onEdit}
          >
            {value || <span className="text-muted-foreground/50">{placeholder}</span>}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
