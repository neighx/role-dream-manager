/**
 * seed.ts — 負荷テスト用シードデータ生成スクリプト
 *
 * 使い方:
 *   npx tsx scripts/seed.ts --scale 100 --user-id <YOUR_USER_ID>
 *   npx tsx scripts/seed.ts --scale 1000  # service_role_key が必要
 *   npx tsx scripts/seed.ts --clean --user-id <YOUR_USER_ID>
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (複数ユーザー生成時に必要)
 */

import { createClient } from "@supabase/supabase-js";

// ─── 設定 ─────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const args = process.argv.slice(2);
const scale = parseInt(args[args.indexOf("--scale") + 1] ?? "10", 10);
const targetUserId = args[args.indexOf("--user-id") + 1];
const isClean = args.includes("--clean");

const CATEGORIES = ["creator", "health", "work", "relationship", "learning", "selfcare"] as const;
const MOODS = ["good", "normal", "anxious", "rushed", "unmotivated", "angry", "sad"] as const;
const ENERGIES = [10, 40, 70, 100] as const;
const MODES = ["attack", "progress", "maintain", "protect", "recover"] as const;
const STRESS = ["money", "time", "relationship", "perfectionism", "body", "future_anxiety", "decision_fatigue", "other"] as const;

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── 単一ユーザーのデータ生成 ──────────────────────────────────
async function seedUser(supabase: ReturnType<typeof createClient>, userId: string, prefix = "") {
  console.log(`  Seeding user ${userId.slice(0, 8)}...`);

  // ── Roles ──
  const roleInserts = CATEGORIES.map((cat, i) => ({
    user_id: userId,
    category: cat,
    title: `${prefix}${cat} Role ${i + 1}`,
    dream: `${cat}で世界に影響を与えたい`,
    current_reality: `まだ始めたばかり`,
    gap: `スキルと時間が足りない`,
    progress: Math.floor(Math.random() * 60),
    display_order: i,
    values: ["成長", "貢献"],
  }));

  const { data: roles, error: rErr } = await supabase
    .from("roles").insert(roleInserts).select("id,category");
  if (rErr) { console.error("roles insert error:", rErr.message); return; }

  // ── Tasks (30件/ユーザー) ──
  const taskInserts = Array.from({ length: 30 }, (_, i) => ({
    user_id: userId,
    role_id: roles![i % roles!.length].id,
    title: `${prefix}タスク ${i + 1}`,
    status: rand(["todo", "todo", "done", "in_progress"]),
    quadrant: rand([1, 2, 2, 3, 4]),
    estimated_minutes: rand([15, 30, 45, 60, 90]),
    created_at: `${daysAgo(Math.floor(Math.random() * 14))}T${String(Math.floor(Math.random() * 14) + 8).padStart(2, "0")}:00:00Z`,
  }));

  const { error: tErr } = await supabase.from("tasks").insert(taskInserts);
  if (tErr) console.error("tasks insert error:", tErr.message);

  // ── Daily Checkins (14日分) ──
  const checkinInserts = Array.from({ length: 14 }, (_, i) => ({
    user_id: userId,
    date: daysAgo(i),
    mood: rand(MOODS),
    energy: rand(ENERGIES),
    mode: rand(MODES),
    stress_cause: rand(STRESS),
  }));

  const { error: cErr } = await supabase.from("daily_checkins").insert(checkinInserts);
  if (cErr && !cErr.message.includes("duplicate")) console.error("checkins insert error:", cErr.message);

  // ── Schedules (10件) ──
  const scheduleInserts = Array.from({ length: 10 }, (_, i) => {
    const h = 9 + i;
    const baseDate = daysAgo(-Math.floor(i / 2));
    return {
      user_id: userId,
      role_id: roles![i % roles!.length].id,
      title: `${prefix}予定 ${i + 1}`,
      start_time: `${baseDate}T${String(h).padStart(2, "0")}:00:00Z`,
      end_time: `${baseDate}T${String(h + 1).padStart(2, "0")}:00:00Z`,
      is_all_day: false,
    };
  });

  const { error: sErr } = await supabase.from("schedules").insert(scheduleInserts);
  if (sErr) console.error("schedules insert error:", sErr.message);

  console.log(`  ✓ ${userId.slice(0, 8)}: roles=${roles!.length} tasks=30 checkins=14 schedules=10`);
}

// ─── クリーンアップ ────────────────────────────────────────────
async function cleanUser(supabase: ReturnType<typeof createClient>, userId: string) {
  await Promise.all([
    supabase.from("tasks").delete().eq("user_id", userId),
    supabase.from("schedules").delete().eq("user_id", userId),
    supabase.from("daily_checkins").delete().eq("user_id", userId),
    supabase.from("quick_captures").delete().eq("user_id", userId),
    supabase.from("inbox_items").delete().eq("user_id", userId),
    supabase.from("ai_logs").delete().eq("user_id", userId),
    supabase.from("weekly_summaries").delete().eq("user_id", userId),
  ]);
  await supabase.from("roles").delete().eq("user_id", userId);
  console.log(`✓ Cleaned user ${userId.slice(0, 8)}`);
}

// ─── メイン ───────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL) {
    console.error("NEXT_PUBLIC_SUPABASE_URL が未設定です");
    process.exit(1);
  }

  // 複数ユーザー生成には service_role が必要
  const key = scale > 1 ? SERVICE_KEY || ANON_KEY : ANON_KEY;
  const supabase = createClient(SUPABASE_URL, key);

  if (isClean && targetUserId) {
    await cleanUser(supabase, targetUserId);
    return;
  }

  if (scale === 1 || targetUserId) {
    // 単一ユーザーへのシード
    const userId = targetUserId;
    if (!userId) {
      console.error("--user-id を指定してください (scale=1 の場合)");
      process.exit(1);
    }
    await seedUser(supabase, userId);
    console.log("\n✅ Seed complete");
    return;
  }

  // 複数ユーザーシミュレーション（service_role 必要）
  if (!SERVICE_KEY) {
    console.error("複数ユーザー生成には SUPABASE_SERVICE_ROLE_KEY が必要です");
    process.exit(1);
  }

  console.log(`\n🌱 ${scale}ユーザー分のシードデータを生成します...`);
  const BATCH = 10;

  for (let i = 0; i < scale; i += BATCH) {
    const batch = Math.min(BATCH, scale - i);
    console.log(`\nBatch ${Math.floor(i / BATCH) + 1}: users ${i + 1}–${i + batch}`);

    await Promise.all(
      Array.from({ length: batch }, async (_, j) => {
        const idx = i + j + 1;
        // テスト用ユーザーをadmin APIで作成
        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            email: `test_user_${idx}_${Date.now()}@loadtest.example`,
            password: "LoadTest123!",
            email_confirm: true,
          }),
        });
        const { user } = await res.json();
        if (!user?.id) return;

        await seedUser(supabase, user.id, `[u${idx}] `);
      })
    );

    // レート制限回避のため少し待機
    if (i + BATCH < scale) await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n✅ All seed complete");
  console.log("\n📊 予想データ量:");
  console.log(`  roles: ${scale * 6} rows`);
  console.log(`  tasks: ${scale * 30} rows`);
  console.log(`  daily_checkins: ${scale * 14} rows`);
  console.log(`  schedules: ${scale * 10} rows`);
}

main().catch((e) => { console.error(e); process.exit(1); });
