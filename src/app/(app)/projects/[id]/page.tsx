"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
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

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", id)
          .order("due_date"),
      ]);
      setProject(p);
      setTasks(t || []);
      setIsLoading(false);
    }
    load();
  }, [id]);

  async function generateBreakdown() {
    if (!project) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-project-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, project }),
      });
      const { breakdown: bd } = await res.json() as { breakdown: AIProjectBreakdown };
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

    await supabase
      .from("projects")
      .update({ status: "active" })
      .eq("id", project.id);
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

  return (
    <div className="px-5 pt-safe pt-6 pb-8 space-y-5">
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
          <h1 className="font-medium text-charcoal text-base leading-tight truncate">
            {project.title}
          </h1>
        </div>
      </div>

      {/* 締切・進捗 */}
      {project.target_date && (
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              締切: {format(new Date(project.target_date), "M月d日(E)", { locale: ja })}
            </span>
            <span
              className={`text-xs font-medium ${
                daysLeft !== null && daysLeft <= 7 ? "text-red-500" : "text-charcoal"
              }`}
            >
              {daysLeft !== null ? `あと${daysLeft}日` : ""}
            </span>
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
      )}

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
      ) : (
        <>
          {tasks.length === 0 ? (
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
              />
            </div>
          )}

          {(project.goal || project.success_metric) && (
            <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
              {project.goal && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">目的</p>
                  <p className="text-sm text-charcoal">{project.goal}</p>
                </div>
              )}
              {project.success_metric && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">成功条件</p>
                  <p className="text-sm text-charcoal">{project.success_metric}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
