"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Users, Mail, Check, Clock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Role, SharedMember, ROLE_CATEGORY_COLORS } from "@/types";

const RELATIONSHIP_LABELS: Record<string, string> = {
  manager: "マネージャー", partner: "パートナー", family: "家族",
  friend: "友達", team: "チームメンバー", coach: "コーチ", teacher: "先生",
};

const PERMISSION_LABELS: Record<string, string> = {
  view: "閲覧のみ", comment: "コメント可", edit_tasks: "TODO編集可", manager: "マネージャー",
};

function SharedContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<SharedMember[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    searchParams.get("role")
  );
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("friend");
  const [permission, setPermission] = useState("view");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: r }, { data: m }] = await Promise.all([
        supabase.from("roles").select("*").eq("user_id", user.id),
        supabase.from("shared_members").select("*").eq("owner_user_id", user.id),
      ]);
      setRoles(r || []);
      setMembers(m || []);
      if (!selectedRoleId && r?.[0]) setSelectedRoleId(r[0].id);
    }
    load();
  }, []);

  async function handleInvite() {
    if (!email || !selectedRoleId) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("shared_members").insert({
      role_id: selectedRoleId,
      owner_user_id: user.id,
      invited_email: email,
      relationship_type: relationship,
      permission,
    }).select().single();

    if (data) setMembers((m) => [...m, data as SharedMember]);
    setEmail("");
    setIsSaving(false);
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const roleMembers = members.filter((m) => m.role_id === selectedRoleId);

  return (
    <div className="px-5 pt-safe pt-6 space-y-5 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-charcoal">共有設定</h1>
        <p className="text-sm text-muted-foreground mt-1">信頼できる人とRoleを共有できます</p>
      </motion.div>

      {/* Role選択 */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <p className="text-xs font-medium text-muted-foreground mb-2">共有するRoleを選択</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {roles.map((role) => {
            const colors = ROLE_CATEGORY_COLORS[role.category];
            const isSelected = selectedRoleId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className="shrink-0 px-3 py-2 rounded-2xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: isSelected ? colors.bg : "#F0EEE9",
                  color: isSelected ? colors.text : "#888680",
                  borderWidth: 2,
                  borderColor: isSelected ? colors.border : "transparent",
                }}
              >
                {role.title}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 招待フォーム */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-5 space-y-4"
      >
        <h3 className="text-sm font-medium text-charcoal">メンバーを招待する</h3>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">メールアドレス</label>
          <div className="flex items-center gap-2 bg-mist rounded-2xl px-3 py-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 text-sm text-charcoal bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">関係性</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-mist rounded-2xl px-3 py-2.5 text-sm text-charcoal focus:outline-none"
            >
              {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">権限</label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full bg-mist rounded-2xl px-3 py-2.5 text-sm text-charcoal focus:outline-none"
            >
              {Object.entries(PERMISSION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleInvite}
          disabled={!email || !selectedRoleId || isSaving}
          className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40"
        >
          {isSaving ? "送信中..." : "招待を送る"}
        </button>
      </motion.div>

      {/* メンバーリスト */}
      {roleMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-5 space-y-3"
        >
          <h3 className="text-sm font-medium text-charcoal">
            {selectedRole?.title}の共有メンバー
          </h3>
          {roleMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-mist flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-charcoal truncate">{member.invited_email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {RELATIONSHIP_LABELS[member.relationship_type]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {PERMISSION_LABELS[member.permission]}
                  </span>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${
                member.status === "accepted" ? "bg-sage/20 text-sage" :
                member.status === "declined" ? "bg-rose-100 text-rose-500" :
                "bg-mist text-muted-foreground"
              }`}>
                {member.status === "accepted" ? <><Check className="w-3 h-3" />承認済み</> :
                  member.status === "declined" ? <><X className="w-3 h-3" />辞退</> :
                  <><Clock className="w-3 h-3" />保留中</>}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function SharedPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" /></div>}>
      <SharedContent />
    </Suspense>
  );
}
