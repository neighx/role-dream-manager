"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Plus, ChevronRight, Pencil, Check, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Role, ROLE_CATEGORY_COLORS } from "@/types";
import { DreamGapCard } from "@/components/roles/DreamGapCard";

const ROLE_EMOJI: Record<string, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

export default function RolesPage() {
  const supabase = createClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDream, setEditDream] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("roles").select("*")
        .eq("user_id", user.id)
        .order("display_order");
      setRoles(data || []);
      setIsLoading(false);
    }
    load();
  }, []);

  function startEdit(role: Role, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(role.id);
    setEditTitle(role.title);
    setEditDream(role.dream || "");
  }

  function cancelEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  }

  async function saveEdit(roleId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsSaving(true);
    await supabase.from("roles").update({
      title: editTitle,
      dream: editDream,
    }).eq("id", roleId);
    setRoles(prev => prev.map(r =>
      r.id === roleId ? { ...r, title: editTitle, dream: editDream } : r
    ));
    setIsSaving(false);
    setEditingId(null);
  }

  async function deleteRole(roleId: string) {
    await supabase.from("roles").delete().eq("id", roleId);
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setDeletingId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-safe pt-6 space-y-5 pb-4">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-medium text-charcoal">Role Board</h1>
        <Link href="/roles/new">
          <div className="w-10 h-10 rounded-2xl bg-sage flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
        </Link>
      </motion.div>

      {/* Roleカード */}
      {roles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl p-10 text-center"
        >
          <div className="text-5xl mb-4">✦</div>
          <p className="font-medium text-charcoal">まだRoleがありません</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            役割を追加して夢の管理を始めましょう
          </p>
          <Link
            href="/roles/new"
            className="inline-flex items-center gap-1.5 bg-sage text-white text-sm px-5 py-3 rounded-2xl"
          >
            <Plus className="w-4 h-4" />
            最初のRoleを作る
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {roles.map((role, i) => {
            const colors = ROLE_CATEGORY_COLORS[role.category];
            const isEditing = editingId === role.id;

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
                  {/* Vision Photo or カラーヘッダー */}
                  <Link href={isEditing ? "#" : `/roles/${role.id}`} onClick={isEditing ? (e) => e.preventDefault() : undefined}>
                    <div
                      className="h-32 relative flex items-end p-4"
                      style={
                        role.vision_photo_url
                          ? {
                              backgroundImage: `url(${role.vision_photo_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : { backgroundColor: colors.bg }
                      }
                    >
                      {role.vision_photo_url && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      )}
                      <div className="relative z-10 flex items-center gap-2 flex-1">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                          style={{ backgroundColor: role.vision_photo_url ? "rgba(255,255,255,0.2)" : colors.bg }}
                        >
                          {ROLE_EMOJI[role.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs"
                            style={{ color: role.vision_photo_url ? "rgba(255,255,255,0.8)" : colors.text }}
                          >
                            {colors.label}
                          </p>
                          <p
                            className="font-medium text-sm leading-tight truncate"
                            style={{ color: role.vision_photo_url ? "white" : colors.text }}
                          >
                            {role.title}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className="ml-auto relative z-10 w-4 h-4 shrink-0"
                        style={{ color: role.vision_photo_url ? "white" : colors.text }}
                      />
                    </div>
                  </Link>

                  {/* カードボディ */}
                  <div className="p-4 space-y-3">
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        /* 編集モード */
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">タイトル</p>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                              autoFocus
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Dream</p>
                            <textarea
                              value={editDream}
                              onChange={(e) => setEditDream(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => saveEdit(role.id, e)}
                              disabled={isSaving || !editTitle.trim()}
                              className="flex-1 py-2 rounded-xl bg-sage text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
                            >
                              <Check className="w-4 h-4" />
                              {isSaving ? "保存中..." : "保存"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="py-2 px-4 rounded-xl border border-border text-sm text-muted-foreground flex items-center gap-1.5"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        /* 表示モード */
                        <motion.div
                          key="view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-3"
                        >
                          {/* Dream */}
                          {role.dream && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Dream</p>
                              <p className="text-sm text-charcoal leading-relaxed">{role.dream}</p>
                            </div>
                          )}

                          {/* 大切にしたい価値 */}
                          {role.values.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {role.values.map((v) => (
                                <span
                                  key={v}
                                  className="text-xs px-2.5 py-1 rounded-full"
                                  style={{ backgroundColor: colors.bg, color: colors.text }}
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* DreamGapCard */}
                          {(role.current_reality || role.gap) && (
                            <DreamGapCard role={role} compact />
                          )}

                          {/* 進捗 */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-muted-foreground">進捗</span>
                              <span className="text-xs font-medium text-charcoal">{role.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-mist rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${role.progress}%`,
                                  backgroundColor: colors.border,
                                }}
                              />
                            </div>
                          </div>

                          {/* 編集・削除ボタン */}
                          {deletingId === role.id ? (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs text-muted-foreground flex-1">本当に削除しますか？</span>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteRole(role.id); }}
                                className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-medium"
                              >
                                削除
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(null); }}
                                className="px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground"
                              >
                                キャンセル
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => startEdit(role, e)}
                                className="flex-1 py-2 rounded-xl border border-border text-xs text-muted-foreground flex items-center justify-center gap-1.5 hover:bg-mist transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                タイトル・Dreamを編集
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(role.id); }}
                                className="py-2 px-3 rounded-xl border border-border text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
