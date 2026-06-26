"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
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
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={`/roles/${role.id}`}>
                  <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
                    {/* Vision Photo or カラーヘッダー */}
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
                      <div className="relative z-10 flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                          style={{ backgroundColor: role.vision_photo_url ? "rgba(255,255,255,0.2)" : colors.bg }}
                        >
                          {ROLE_EMOJI[role.category]}
                        </div>
                        <div>
                          <p
                            className="text-xs"
                            style={{ color: role.vision_photo_url ? "rgba(255,255,255,0.8)" : colors.text }}
                          >
                            {colors.label}
                          </p>
                          <p
                            className="font-medium text-sm leading-tight"
                            style={{ color: role.vision_photo_url ? "white" : colors.text }}
                          >
                            {role.title}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className="ml-auto relative z-10 w-4 h-4"
                        style={{ color: role.vision_photo_url ? "white" : colors.text }}
                      />
                    </div>

                    {/* カードボディ */}
                    <div className="p-4 space-y-3">
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
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
