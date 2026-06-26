"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Inbox, CheckSquare, Calendar, Lightbulb, Archive, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InboxItem } from "@/types";

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  task:     { icon: <CheckSquare className="w-3.5 h-3.5" />, label: "タスク候補", color: "#C8DBC6" },
  schedule: { icon: <Calendar className="w-3.5 h-3.5" />, label: "予定候補", color: "#BDD5EA" },
  idea:     { icon: <Lightbulb className="w-3.5 h-3.5" />, label: "アイデア", color: "#EDD5CC" },
};

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [converted, setConverted] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data } = await supabase
        .from("inbox_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setItems((data ?? []) as InboxItem[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleArchive(id: string) {
    setProcessing(id);
    const supabase = createClient();
    await supabase.from("inbox_items").update({ status: "archived" }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setProcessing(null);
  }

  async function handleConvertToTask(item: InboxItem) {
    setProcessing(item.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProcessing(null); return; }

    // タスクを作成
    await supabase.from("tasks").insert({
      user_id: user.id,
      title: item.title,
      description: item.description || null,
      status: "todo",
      quadrant: 2,
    });

    // InboxアイテムをアーカイブしてDB更新
    await supabase.from("inbox_items").update({ status: "archived" }).eq("id", item.id);

    setConverted((prev) => new Set([...prev, item.id]));
    setProcessing(null);

    // 少し待ってからリストから消す
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }, 800);
  }

  async function handleConvertToSchedule(item: InboxItem) {
    // カレンダーページへ遷移（タイトルをクエリに）
    router.push(`/calendar?title=${encodeURIComponent(item.title)}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-safe pt-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-6"
      >
        <div>
          <h1 className="text-2xl font-medium text-charcoal">Inbox</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length > 0 ? `${items.length}件の未整理アイテム` : "すべて整理済み"}
          </p>
        </div>
        {items.length > 0 && (
          <span className="ml-auto text-xs bg-charcoal/8 text-charcoal px-3 py-1 rounded-full font-medium">
            {items.length}
          </span>
        )}
      </motion.div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-sage" />
          </div>
          <p className="text-sm font-medium text-charcoal">Inboxは空です</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Quick Captureで追加したアイデアや<br />メモがここに集まります
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item) => {
              const meta = item.suggested_type ? TYPE_META[item.suggested_type] : TYPE_META.idea;
              const isConverted = converted.has(item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isConverted ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm"
                >
                  {/* タイプバッジ */}
                  {item.suggested_type && (
                    <div
                      className="px-4 py-2 flex items-center gap-1.5"
                      style={{ backgroundColor: meta.color + "40" }}
                    >
                      <span style={{ color: meta.color.replace("40", "") }} className="opacity-80">
                        {meta.icon}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: "#888680" }}>
                        {meta.label}
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* タイトル */}
                    <div className="flex items-start gap-2 mb-2">
                      {isConverted ? (
                        <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 shrink-0" />
                      ) : null}
                      <p className="text-sm font-medium text-charcoal leading-relaxed flex-1">
                        {item.title}
                      </p>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
                    )}

                    {item.suggested_gap_target && (
                      <div className="bg-mist rounded-xl px-3 py-2 mb-3">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium">Gap: </span>{item.suggested_gap_target}
                        </p>
                      </div>
                    )}

                    {/* アクション */}
                    {!isConverted && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* タスクにする */}
                        <button
                          onClick={() => handleConvertToTask(item)}
                          disabled={processing === item.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sage text-white font-medium disabled:opacity-50 transition-all"
                        >
                          <CheckSquare className="w-3 h-3" />
                          タスクにする
                        </button>

                        {/* 予定にする */}
                        <button
                          onClick={() => handleConvertToSchedule(item)}
                          disabled={processing === item.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sky-100 text-sky-600 font-medium disabled:opacity-50 transition-all"
                        >
                          <Calendar className="w-3 h-3" />
                          予定にする
                        </button>

                        <div className="flex-1" />

                        {/* アーカイブ */}
                        <button
                          onClick={() => handleArchive(item.id)}
                          disabled={processing === item.id}
                          className="flex items-center gap-1 text-xs text-muted-foreground disabled:opacity-50 py-1"
                        >
                          <Archive className="w-3 h-3" />
                          削除
                        </button>
                      </div>
                    )}

                    {isConverted && (
                      <p className="text-xs text-sage font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        タスクに追加しました
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 全部アーカイブ */}
          {items.length > 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={async () => {
                const supabase = createClient();
                const ids = items.map((i) => i.id);
                await supabase.from("inbox_items").update({ status: "archived" }).in("id", ids);
                setItems([]);
              }}
              className="w-full py-3 text-sm text-muted-foreground border border-mist rounded-2xl"
            >
              すべてアーカイブ
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}
