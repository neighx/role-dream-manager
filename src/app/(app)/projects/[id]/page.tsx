"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Check, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Project, ProjectTask, AIProjectTask, AIProjectBreakdown } from "@/types";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ProjectBreakdownReview } from "@/components/projects/ProjectBreakdownReview";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  planning: "計画中",
  active: "進行中",
  completed: "完了",
  paused: "一時停止",
  archived: "アーカイブ",
};

const INFO_FIELDS = [
  { key: "goal" as const, label: "目的", placeholder: "クリエイターとして動員と実績を作る" },
  { key: "success_metric" as const, label: "成功条件", placeholder: "30人集客、赤字にしない" },
  { key: "current_state" as const, label: "現在決まっていること", placeholder: "会場候補は2つある" },
  { key: "missing_info" as const, label: "まだ決まっていないこと", placeholder: "出演者、フライヤー、告知方法" },
  { key: "priority_focus" as const, label: "優先したいこと", placeholder: "集客よりも質を重視したい" },
];

type InfoForm = {
  goal: string;
  success_metric: string;
  current_state: string;
  missing_info: string;
  priority_focus: string;
  target_date: string;
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [breakdown, setBreakdown] = useState<AIProjectBreakdown | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // プロジェクト情報編集
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<InfoForm>({
    goal: "",
    success_metric: "",
    current_state: "",
    missing_info: "",
    priority_focus: "",
    target_date: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single(),
        supabase.from("project_tasks").select("*").eq("project_id", id).order("due_date"),
      ]);
      setProject(p);
      setTasks(t || []);
      if (p) {
        setInfoForm({
          goal: p.goal ?? "",
          success_metric: p.success_metric ?? "",
          current_state: p.current_state ?? "",
          missing_info: p.missing_info ?? "",
          priority_focus: p.priority_focus ?? "",
          target_date: p.target_date ?? "",
        });
      }
      setIsLoading(false);
    }
    load();
  }, [id]);

  async function saveProjectInfo() {
    if (!project) return;
    const updates = {
      goal: infoForm.goal || null,
      success_metric: infoForm.success_metric || null,
      current_state: infoForm.current_state || null,
      missing_info: infoForm.missing_info || null,
      priority_focus: infoForm.priority_focus || null,
      target_date: infoForm.target_date || null,
    };
    await supabase.from("projects").update(updates).eq("id", project.id);
    setProject((prev) => (prev ? { ...prev, ...updates } : prev));
    setIsEditingInfo(false);
  }

  async function saveTitle() {
    if (!project || !titleInput.trim()) return;
    await supabase.from("projects").update({ title: titleInput.trim() }).eq("id", project.id);
    setProject((prev) => (prev ? { ...prev, title: titleInput.trim() } : prev));
    setIsEditingTitle(false);
  }

  async function deleteProject() {
    if (!project) return;
    await supabase.from("project_tasks").delete().eq("project_id", project.id);
    await supabase.from("projects").delete().eq("id", project.id);
    router.back();
  }

  async function generateBreakdown() {
    if (!project) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-project-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, project }),
      });
      const { breakdown: bd } = (await res.json()) as { breakdown: AIProjectBreakdown };
      setBreakdown(bd);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveAllTasks(selectedTasks: AIProjectTask[]) {
    if (!project) return;
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const inserts = selectedTasks.map((t) => ({
      user_id: user.id,
      project_id: project.id,
      role_id: project.role_id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      estimated_minutes: t.estimated_minutes,
      importance: t.importance,
      urgency: t.urgency,
      quadrant: t.quadrant,
      ai_reason: t.reason,
      status: "todo" as const,
    }));

    const { data: saved } = await supabase.from("project_tasks").insert(inserts).select();
    setTasks((prev) => [...prev, ...(saved || [])]);
    setBreakdown(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    await supabase.from("projects").update({ status: "active" }).eq("id", project.id);
    setProject((prev) => (prev ? { ...prev, status: "active" } : prev));
    setIsSaving(false);
  }

  async function saveTodayOnly(action: AIProjectBreakdown["today_first_action"]) {
    if (!project) return;
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("tasks").insert({
      user_id: user.id,
      role_id: project.role_id,
      project_id: project.id,
      title: action.title,
      estimated_minutes: action.estimated_minutes,
      quadrant: 1,
      status: "todo",
    });
    setBreakdown(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    setIsSaving(false);
  }

  async function toggleTaskStatus(taskId: string, current: ProjectTask["status"]) {
    const newStatus = current === "done" ? "todo" : "done";
    await supabase.from("project_tasks").update({ status: newStatus }).eq("id", taskId);
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus as ProjectTask["status"] } : t
    );
    setTasks(updated);
    const doneCount = updated.filter((t) => t.status === "done").length;
    const progress =
      updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : 0;
    await supabase.from("projects").update({ progress }).eq("id", project!.id);
    setProject((prev) => (prev ? { ...prev, progress } : prev));
  }

  async function updateTask(
    taskId: string,
    updates: { title?: string; due_date?: string | null; estimated_minutes?: number | null }
  ) {
    await supabase.from("project_tasks").update(updates).eq("id", taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
  }

  async function addTask(task: {
    title: string;
    due_date: string | null;
    estimated_minutes: number | null;
  }) {
    if (!project) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: newTask } = await supabase
      .from("project_tasks")
      .insert({
        user_id: user.id,
        project_id: project.id,
        role_id: project.role_id,
        title: task.title,
        due_date: task.due_date,
        estimated_minutes: task.estimated_minutes,
        status: "todo",
      })
      .select()
      .single();
    if (newTask) setTasks((prev) => [...prev, newTask as ProjectTask]);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const daysLeft = project.target_date
    ? differenceInDays(new Date(project.target_date), new Date())
    : null;

  const hasInfo = INFO_FIELDS.some((f) => project[f.key]);

  return (
    <div className="px-5 pt-safe pt-6 pb-8 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl bg-mist flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-charcoal" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{STATUS_LABELS[project.status]}</p>
          {isEditingTitle ? (
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="flex-1 text-sm text-charcoal bg-mist rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage/30"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setIsEditingTitle(false); }}
              />
              <button onClick={saveTitle} className="w-7 h-7 rounded-lg bg-sage flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={() => setIsEditingTitle(false)} className="w-7 h-7 rounded-lg bg-mist flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-charcoal" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setTitleInput(project.title); setIsEditingTitle(true); }}
              className="flex items-center gap-1.5 group w-full"
            >
              <h1 className="font-medium text-charcoal text-base leading-tight truncate text-left">
                {project.title}
              </h1>
              <Pencil className="w-3 h-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-8 h-8 rounded-xl bg-mist flex items-center justify-center shrink-0"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* 削除確認 */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3"
        >
          <p className="text-sm font-medium text-red-700">このプロジェクトを削除しますか？</p>
          <p className="text-xs text-red-500">タスクも含めてすべて削除されます。この操作は元に戻せません。</p>
          <div className="flex gap-2">
            <button
              onClick={deleteProject}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
            >
              削除する
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground"
            >
              キャンセル
            </button>
          </div>
        </motion.div>
      )}

      {/* 締切・進捗 */}
      <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {project.target_date
              ? `締切: ${format(new Date(project.target_date), "M月d日(E)", { locale: ja })}`
              : "締切未設定"}
          </span>
          {daysLeft !== null && (
            <span
              className={`text-xs font-medium ${
                daysLeft <= 7 ? "text-red-500" : "text-charcoal"
              }`}
            >
              あと{daysLeft}日
            </span>
          )}
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">進捗</span>
            <span className="text-xs font-medium text-charcoal">{project.progress}%</span>
          </div>
          <div className="h-2 bg-mist rounded-full overflow-hidden">
            <div
              className="h-full bg-sage rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* プロジェクト情報（詳細）*/}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-charcoal">プロジェクト情報</p>
          <button
            onClick={() => {
              if (isEditingInfo) {
                setInfoForm({
                  goal: project.goal ?? "",
                  success_metric: project.success_metric ?? "",
                  current_state: project.current_state ?? "",
                  missing_info: project.missing_info ?? "",
                  priority_focus: project.priority_focus ?? "",
                  target_date: project.target_date ?? "",
                });
              }
              setIsEditingInfo(!isEditingInfo);
            }}
            className="text-xs text-sage flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            {isEditingInfo ? "キャンセル" : "編集"}
          </button>
        </div>

        {isEditingInfo ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">締切</label>
              <input
                type="date"
                value={infoForm.target_date}
                onChange={(e) =>
                  setInfoForm((prev) => ({ ...prev, target_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            {INFO_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <textarea
                  value={infoForm[key]}
                  onChange={(e) =>
                    setInfoForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
                />
              </div>
            ))}
            <button
              onClick={saveProjectInfo}
              className="w-full py-2.5 rounded-xl bg-sage text-white text-sm font-medium"
            >
              保存
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {INFO_FIELDS.filter((f) => project[f.key]).map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm text-charcoal mt-0.5">{project[key]}</p>
              </div>
            ))}
            {!hasInfo && (
              <button
                onClick={() => setIsEditingInfo(true)}
                className="text-xs text-sage flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                目的・成功条件などを追加する
              </button>
            )}
          </div>
        )}
      </div>

      {/* 保存完了通知 */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-sage/10 rounded-2xl p-3 flex items-center gap-2 border border-sage/20"
        >
          <Check className="w-4 h-4 text-sage" />
          <span className="text-sm text-sage font-medium">タスクを保存しました</span>
        </motion.div>
      )}

      {/* AIブレークダウン or タイムライン */}
      {breakdown ? (
        <ProjectBreakdownReview
          breakdown={breakdown}
          onSaveAll={saveAllTasks}
          onSaveTodayOnly={saveTodayOnly}
          isSaving={isSaving}
        />
      ) : tasks.length === 0 ? (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={generateBreakdown}
          disabled={isGenerating}
          className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "締切から逆算中..." : "AIで今やることを逆算する"}
        </motion.button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-charcoal">タイムライン</h2>
            <button
              onClick={generateBreakdown}
              disabled={isGenerating}
              className="flex items-center gap-1 text-xs text-sage"
            >
              <Sparkles className="w-3 h-3" />
              {isGenerating ? "生成中..." : "再生成"}
            </button>
          </div>
          <ProjectTimeline
            tasks={tasks}
            targetDate={project.target_date ?? undefined}
            onToggleStatus={toggleTaskStatus}
            onUpdateTask={updateTask}
            onAddTask={addTask}
          />
        </div>
      )}
    </div>
  );
}
