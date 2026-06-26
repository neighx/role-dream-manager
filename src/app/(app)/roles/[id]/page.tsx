"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Calendar, Users, MessageSquare, ImagePlus, Sparkles, Check, RefreshCw, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Role, Task, ROLE_CATEGORY_COLORS, Project } from "@/types";
import { DreamGapCard } from "@/components/roles/DreamGapCard";
import { uploadVisionPhoto, deleteVisionPhoto } from "@/lib/image/uploadVisionPhoto";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm, ProjectFormData } from "@/components/projects/ProjectForm";

const ROLE_EMOJI: Record<string, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

interface GoalSection {
  key: keyof Role;
  label: string;
  period: string;
}

const GOALS: GoalSection[] = [
  { key: "three_year_goal", label: "3年目標", period: "3 years" },
  { key: "one_year_goal", label: "1年目標", period: "1 year" },
  { key: "three_month_goal", label: "3ヶ月目標", period: "3 months" },
  { key: "monthly_goal", label: "今月の目標", period: "this month" },
  { key: "weekly_goal", label: "今週の目標", period: "this week" },
];

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<Role | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<keyof Role | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string> | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "projects">("overview");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: r }, { data: t }, { data: p }] = await Promise.all([
        supabase.from("roles").select("*").eq("id", id).single(),
        supabase.from("tasks").select("*").eq("role_id", id).order("created_at", { ascending: false }),
        user
          ? supabase
              .from("projects")
              .select("*")
              .eq("role_id", id)
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      setRole(r);
      setTasks(t || []);
      setProjects((p || []) as Project[]);
      setIsLoading(false);
    }
    load();
  }, [id]);

  async function saveField(field: keyof Role, value: string) {
    if (!role) return;
    await supabase.from("roles").update({ [field]: value }).eq("id", role.id);
    setRole((r) => r ? { ...r, [field]: value } : r);
    setEditingField(null);
  }

  function startEdit(field: keyof Role) {
    setEditingField(field);
    setEditValue((role?.[field] as string) || "");
  }

  async function generateRoadmap() {
    if (!role) return;
    setIsGenerating(true);
    setAiSuggestions(null);
    try {
      const res = await fetch("/api/ai/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: role.id }),
      });
      const data = await res.json();
      if (data.roadmap) setAiSuggestions(data.roadmap);
    } finally {
      setIsGenerating(false);
    }
  }

  async function applyAllSuggestions() {
    if (!role || !aiSuggestions) return;
    setIsSavingAll(true);
    await supabase.from("roles").update(aiSuggestions).eq("id", role.id);
    setRole((r) => r ? { ...r, ...aiSuggestions } : r);
    setAiSuggestions(null);
    setIsSavingAll(false);
  }

  async function createProject(formData: ProjectFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !role) return;
    setIsCreatingProject(true);
    const { data: newProject } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        role_id: role.id,
        title: formData.title,
        project_type: formData.project_type,
        target_date: formData.target_date || null,
        goal: formData.goal || null,
        success_metric: formData.success_metric || null,
        budget: formData.budget ? parseInt(formData.budget) : null,
        revenue_goal: formData.revenue_goal ? parseInt(formData.revenue_goal) : null,
        current_state: formData.current_state || null,
        missing_info: formData.missing_info || null,
        priority_focus: formData.priority_focus || null,
        status: "planning",
      })
      .select()
      .single();

    setIsCreatingProject(false);
    if (newProject) {
      setShowProjectForm(false);
      router.push(`/projects/${newProject.id}`);
    }
  }

  async function applySuggestion(field: string, value: string) {
    if (!role) return;
    await supabase.from("roles").update({ [field]: value }).eq("id", role.id);
    setRole((r) => r ? { ...r, [field]: value } : r);
    setAiSuggestions((s) => {
      if (!s) return s;
      const next = { ...s };
      delete next[field];
      return Object.keys(next).length ? next : null;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!role) return null;
  const colors = ROLE_CATEGORY_COLORS[role.category];

  return (
    <div className="bg-ivory">
      {/* ヘッダービジュアル */}
      <div
        className="relative h-56"
        style={
          role.vision_photo_url
            ? { backgroundImage: `url(${role.vision_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: colors.bg }
        }
      >
        {role.vision_photo_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        )}

        {/* 戻るボタン */}
        <button
          onClick={() => router.back()}
          className="absolute top-safe top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Vision Photo 追加 / 変更 / 削除 */}
        <div className="absolute top-safe top-4 right-4 z-10 flex gap-2">
          {role.vision_photo_url && (
            <button
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
              onClick={async () => {
                if (!confirm("ビジョン写真を削除しますか？")) return;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await deleteVisionPhoto(supabase, user.id, role.id);
                await supabase.from("roles").update({ vision_photo_url: null }).eq("id", role.id);
                setRole((r) => r ? { ...r, vision_photo_url: null } : r);
              }}
            >
              <Trash2 className="w-4 h-4 text-white/80" />
            </button>
          )}
          <label className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center cursor-pointer">
            <ImagePlus className="w-5 h-5" style={{ color: role.vision_photo_url ? "white" : colors.text }} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                // 最適化アップロード（最大1600px・WebP変換・サムネイル生成）
                const { publicUrl } = await uploadVisionPhoto(supabase, user.id, role.id, file);
                await supabase.from("roles").update({ vision_photo_url: publicUrl }).eq("id", role.id);
                setRole((r) => r ? { ...r, vision_photo_url: publicUrl } : r);
              }}
            />
          </label>
        </div>

        {/* Role情報 */}
        <div className="absolute bottom-5 left-5 right-5 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{ROLE_EMOJI[role.category]}</span>
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "white" }}
            >
              {colors.label}
            </span>
          </div>
          <h1 className="text-2xl font-medium text-white">{role.title}</h1>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="px-5 py-5 space-y-5">
        {/* タブ */}
        <div className="flex gap-4 border-b border-border">
          {[
            { key: "overview" as const, label: "概要" },
            {
              key: "projects" as const,
              label: `プロジェクト${projects.length > 0 ? ` (${projects.length})` : ""}`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 px-1 text-sm border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-sage text-sage font-medium"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Projectsタブ */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            {showProjectForm ? (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h3 className="font-medium text-charcoal mb-4">新しいプロジェクト</h3>
                <ProjectForm
                  onSubmit={createProject}
                  onCancel={() => setShowProjectForm(false)}
                  isLoading={isCreatingProject}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowProjectForm(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-sage/40 text-sage text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                プロジェクトを追加
              </button>
            )}
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                roleCategory={role.category}
                onClick={() => router.push(`/projects/${p.id}`)}
              />
            ))}
            {projects.length === 0 && !showProjectForm && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p className="text-3xl mb-3">📋</p>
                <p>まだプロジェクトがありません</p>
                <p className="text-xs mt-1">
                  イベントやリリースなど、
                  <br />
                  大きな目標をプロジェクトにしよう
                </p>
              </div>
            )}
          </div>
        )}

        {/* 大切にしたい価値 */}
        {activeTab === "overview" && role.values.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-5"
          >
            <h3 className="text-xs font-medium text-muted-foreground mb-3">大切にしたいこと</h3>
            <div className="flex flex-wrap gap-2">
              {role.values.map((v) => (
                <span
                  key={v}
                  className="text-sm px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {v}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dream Gap Analysis */}
        {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <DreamGapCard role={role} />
        </motion.div>
        )}

        {/* 目標ロードマップ */}
        {activeTab === "overview" && <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-charcoal">目標ロードマップ</h3>
            <button
              onClick={generateRoadmap}
              disabled={isGenerating || !role.dream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-40"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  AIで提案
                </>
              )}
            </button>
          </div>

          {/* AI提案バナー */}
          <AnimatePresence>
            {aiSuggestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-2xl p-3.5 border"
                style={{ backgroundColor: colors.bg + "40", borderColor: colors.border + "60" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: colors.text }}>
                    <Sparkles className="w-3 h-3" />
                    AIが提案を生成しました
                  </p>
                  <button
                    onClick={applyAllSuggestions}
                    disabled={isSavingAll}
                    className="text-xs px-3 py-1 rounded-full font-medium text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: colors.text }}
                  >
                    {isSavingAll ? "保存中..." : "すべて適用"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  各目標の「適用」で個別に採用できます
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {GOALS.map((goal) => {
              const savedValue = role[goal.key] as string | null;
              const suggestion = aiSuggestions?.[goal.key as string];
              const isEditing = editingField === goal.key;

              return (
                <div key={goal.key} className="flex gap-3">
                  <div
                    className="w-1.5 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: colors.border, minHeight: "40px" }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{goal.label}</p>
                      {!suggestion && (
                        <button
                          onClick={() => isEditing ? saveField(goal.key, editValue) : startEdit(goal.key)}
                          className="text-xs text-sage"
                        >
                          {isEditing ? "保存" : "編集"}
                        </button>
                      )}
                    </div>

                    {/* AI提案表示 */}
                    <AnimatePresence mode="wait">
                      {suggestion ? (
                        <motion.div
                          key="suggestion"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="rounded-xl p-2.5 border"
                          style={{ backgroundColor: colors.bg + "30", borderColor: colors.border + "50" }}
                        >
                          <p className="text-sm leading-relaxed mb-2" style={{ color: colors.text }}>
                            {suggestion}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => applySuggestion(goal.key as string, suggestion)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-white font-medium"
                              style={{ backgroundColor: colors.text }}
                            >
                              <Check className="w-3 h-3" />
                              適用
                            </button>
                            <button
                              onClick={() => setAiSuggestions((s) => {
                                if (!s) return s;
                                const next = { ...s };
                                delete next[goal.key as string];
                                return Object.keys(next).length ? next : null;
                              })}
                              className="text-xs px-2.5 py-1 rounded-full text-muted-foreground bg-mist"
                            >
                              スキップ
                            </button>
                          </div>
                        </motion.div>
                      ) : isEditing ? (
                        <motion.textarea
                          key="editing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full text-sm text-charcoal leading-relaxed focus:outline-none bg-mist rounded-xl p-2.5 resize-none"
                          rows={2}
                          autoFocus
                        />
                      ) : savedValue ? (
                        <motion.p
                          key="value"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-charcoal leading-relaxed"
                        >
                          {savedValue}
                        </motion.p>
                      ) : (
                        <motion.button
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => startEdit(goal.key)}
                          className="text-sm text-muted-foreground/50"
                        >
                          タップして入力
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>}

        {/* 進捗 */}
        {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="bg-white rounded-3xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-charcoal">夢への進捗</h3>
            <span className="text-2xl font-medium" style={{ color: colors.text }}>{role.progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={role.progress}
            onChange={async (e) => {
              const val = Number(e.target.value);
              setRole((r) => r ? { ...r, progress: val } : r);
              await supabase.from("roles").update({ progress: val }).eq("id", role.id);
            }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.border} ${role.progress}%, #E8E6E0 ${role.progress}%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">スタート</span>
            <span className="text-[10px] text-muted-foreground">夢を達成</span>
          </div>
        </motion.div>
        )}

        {/* 今日のTODO */}
        {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-charcoal">TODO</h3>
            <Link href="/today" className="text-xs text-sage">
              Today's Planで管理
            </Link>
          </div>
          {tasks.filter((t) => t.status !== "done").length === 0 ? (
            <p className="text-xs text-muted-foreground">
              まだTODOがありません。Today's Planから生成できます。
            </p>
          ) : (
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status !== "done")
                .slice(0, 5)
                .map((task) => (
                  <div key={task.id} className="flex items-start gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0"
                      style={{ borderColor: colors.border }}
                    />
                    <p className="text-sm text-charcoal">{task.title}</p>
                  </div>
                ))}
            </div>
          )}
        </motion.div>
        )}

        {/* アクションボタン */}
        {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-2.5"
        >
          {[
            { href: `/calendar?role=${role.id}`, icon: Calendar, label: "カレンダー" },
            { href: `/shared?role=${role.id}`, icon: Users, label: "共有" },
            { href: `/roles/${role.id}/comments`, icon: MessageSquare, label: "コメント" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-charcoal">{item.label}</span>
              </div>
            </Link>
          ))}
        </motion.div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
