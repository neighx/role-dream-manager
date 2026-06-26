# Role Dream Manager — Scaling Plan

> 最終更新: 2026-06-26

## 概要

Supabase Free → Pro → Team の段階的移行を前提に、100/1,000/10,000ユーザーそれぞれのデータ量・コスト・注意点をまとめる。

---

## フェーズ 1 — 〜100ユーザー

**Supabase プラン: Free**

### データ量試算（ユーザー×平均保有データ）

| テーブル | 行/ユーザー | 100ユーザー | 推定サイズ |
|---|---|---|---|
| users_profile | 1 | 100 | 50 KB |
| roles | 6 | 600 | 300 KB |
| tasks | ~50 (永続) | 5,000 | 1.5 MB |
| daily_checkins | ~30 (月1ヶ月) | 3,000 | 500 KB |
| schedules | ~20 | 2,000 | 600 KB |
| quick_captures | ~10 | 1,000 | 200 KB |
| inbox_items | ~10 | 1,000 | 200 KB |
| weekly_summaries | ~4 (月1ヶ月) | 400 | 400 KB |
| ai_logs | ~20/月 | 2,000 | 500 KB |
| **合計** | | **~15,100行** | **~4 MB** |

### Supabase Free 制限との比較

| リソース | 上限 | 100ユーザー予想 | 余裕 |
|---|---|---|---|
| DB ストレージ | 500 MB | ~4 MB | ◎ |
| ストレージ (Files) | 1 GB | ~1 GB (画像多め) | △ |
| 月間 API requests | 無制限 | 〜200K | ◎ |
| 同時接続 | 60 | 〜5–20 | ◎ |
| Edge Functions呼び出し | 500K/月 | 〜20K/月 | ◎ |

**注意点:**
- Storage の 1 GB は 1 ユーザーが vision_photo (WebP 〜200KB) × 6 roles = 1.2 MB。100人で 120 MB。余裕あり。
- ただし画像を削除しないユーザーが蓄積すると消費が速い → `deleteVisionPhoto` の UX を明確に。
- Free プランの Realtime は 200 同時接続。この段階では問題なし。

**コスト: $0/月**

---

## フェーズ 2 — 100〜1,000ユーザー

**Supabase プラン: Pro ($25/月)**

### データ量試算

| テーブル | 1,000ユーザー | 推定サイズ |
|---|---|---|
| roles | 6,000 | 3 MB |
| tasks | 50,000 | 15 MB |
| daily_checkins | 30,000 | 5 MB |
| schedules | 20,000 | 6 MB |
| weekly_summaries | 4,000 | 4 MB |
| ai_logs | 20,000/月 | 5 MB/月 |
| **合計 (DB)** | **~150,000行** | **~40 MB** |

### Supabase Pro 制限との比較

| リソース | 上限 | 1,000ユーザー予想 | 余裕 |
|---|---|---|---|
| DB ストレージ | 8 GB | ~500 MB | ◎ |
| ストレージ (Files) | 100 GB | ~1.2 GB | ◎ |
| 月間 帯域 | 250 GB | ~50 GB | ○ |
| 同時接続 | 200 | ~50–100 | ○ |

**この段階で必要な対応:**

1. **インデックス確認** — 004_performance.sql のインデックスが全て適用済みであること
   - `tasks(user_id, status)`, `tasks(user_id, created_at DESC)` が最重要
   - `daily_checkins(user_id, date DESC)` — Weekly Review の集計に必須

2. **Connection Pooling 有効化**
   - Supabase ダッシュボード → Settings → Database → Connection Pooling を ON
   - PgBouncer transaction mode で接続数上限を緩和

3. **ai_logs の自動削除確認**
   - `cleanup_old_ai_logs()` cron が稼働しているか確認
   - 1,000ユーザー × 月20ログ = 20,000行/月 → 90日で 60,000行上限

4. **weekly_summaries キャッシュの効果測定**
   - Weekly Review API のレスポンスタイムを Supabase Logs で確認
   - キャッシュヒット率が低ければ TTL 戦略を見直す

**コスト試算:**

| 項目 | コスト |
|---|---|
| Supabase Pro | $25/月 |
| Storage 超過 (1 GB超) | $0.021/GB/月 |
| 帯域 超過 (250 GB超) | $0.09/GB |
| AI API (Claude) 1,000ユーザー × 月10回 | ~$50–100/月 |
| **合計** | **~$80–130/月** |

---

## フェーズ 3 — 1,000〜10,000ユーザー

**Supabase プラン: Pro + Add-ons (または Team $599/月)**

### データ量試算

| テーブル | 10,000ユーザー | 推定サイズ |
|---|---|---|
| roles | 60,000 | 30 MB |
| tasks | 500,000 | 150 MB |
| daily_checkins | 300,000 | 50 MB |
| schedules | 200,000 | 60 MB |
| weekly_summaries | 40,000 | 40 MB |
| ai_logs (90日蓄積) | 600,000 | 150 MB |
| **合計 (DB)** | **~1,700,000行** | **~480 MB** |

### クエリパフォーマンス目標

| ページ | 目標レスポンス | 対策 |
|---|---|---|
| ホーム | < 200ms | SELECT 6列 + limit 6 (実装済) |
| カレンダー | < 300ms | date range index (実装済) |
| Weekly Review | < 500ms | weekly_summaries キャッシュ (実装済) |
| Role Detail | < 200ms | id lookup (PK) |

**この段階で必要な対応:**

1. **Read Replica の検討**
   - Supabase Pro で Read Replica が利用可能（追加料金）
   - Weekly Review など重い SELECT を replica に向ける

2. **RLS ポリシーの EXPLAIN 確認**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM tasks WHERE user_id = $1 AND status = 'todo';
   ```
   - RLS が index scan を妨げていないか確認
   - `auth.uid()` の呼び出しコストに注意（セッションごとにキャッシュされる）

3. **Storage CDN キャッシュ**
   - vision_photo の thumbnail URL は `Cache-Control: public, max-age=31536000` を設定
   - Supabase Storage はデフォルトで CDN 配信、カスタムドメイン設定を推奨

4. **ai_logs パーティショニング**
   - 600K行超えたら月次パーティションに移行検討
   - または TimescaleDB 拡張を検討

5. **Supabase Team プランへの移行条件**
   - 同時接続 > 200 が継続する場合
   - Point-in-Time Recovery が必要になった場合
   - SLA 99.9% が求められる場合

6. **Edge Functions for AI**
   - Claude API 呼び出しを Supabase Edge Functions に移行（Node.jsより起動速度 ↑）
   - 現在の `/api/ai/` Next.js routes は Edge Runtime 対応可能

**コスト試算:**

| 項目 | コスト |
|---|---|
| Supabase Pro | $25/月 |
| Storage (10K users × 1.2MB avg) = ~12 GB | $0.21/月 |
| DB 計算リソース追加 | $50–100/月 |
| Read Replica (オプション) | $25/月 |
| 帯域 (推定 500 GB/月) | ~$22/月 |
| AI API (Claude) 10K × 月10回 | ~$500–1,000/月 |
| **合計** | **~$620–1,200/月** |

---

## インデックス戦略まとめ

`004_performance.sql` で実装済みのインデックス:

```sql
-- 最重要（全ページで使用）
idx_tasks_user_status        ON tasks(user_id, status)
idx_tasks_user_created       ON tasks(user_id, created_at DESC)
idx_roles_user_order         ON roles(user_id, display_order)
idx_checkins_user_date       ON daily_checkins(user_id, date DESC)
idx_schedules_user_time      ON schedules(user_id, start_time, end_time)

-- AI・ログ管理
idx_ai_logs_user_created     ON ai_logs(user_id, created_at DESC)
idx_ai_logs_cleanup          ON ai_logs(created_at)  -- 90日削除用
idx_weekly_summaries_lookup  ON weekly_summaries(user_id, week_start DESC)

-- ストレージ
idx_storage_files_entity     ON storage_files(entity_type, entity_id)
```

### 将来追加が必要になりうるインデックス

```sql
-- tasks が 50万行超えたら role_id でのフィルタも頻出
CREATE INDEX idx_tasks_role_status ON tasks(role_id, status);

-- inbox の未読フィルタが遅くなったら
CREATE INDEX idx_inbox_user_archived ON inbox_items(user_id, archived_at NULLS FIRST);
```

---

## データ保持ポリシー

| データ種別 | 保持期間 | 削除方法 |
|---|---|---|
| ai_logs | 90日 | `cleanup_old_ai_logs()` 定期実行 |
| inbox_items (archived) | 30日 | 追加 cron 推奨 |
| quick_captures (processed) | ユーザー判断 | 手動 / UI から |
| tasks (done, 古い) | 1年 | アーカイブ機能（将来実装） |
| vision_photo | ロール削除時 | `deleteVisionPhoto()` (実装済) |

---

## 負荷テスト手順

```bash
# 1. .env.local に以下を追加
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 2. 単一ユーザーへのシード（開発確認用）
npx tsx scripts/seed.ts --user-id <YOUR_USER_ID>

# 3. 100ユーザー分のテストデータ生成
npx tsx scripts/seed.ts --scale 100

# 4. 1,000ユーザー（本格負荷テスト）
npx tsx scripts/seed.ts --scale 1000

# 5. クリーンアップ
npx tsx scripts/seed.ts --clean --user-id <USER_ID>
```

**Supabase Dashboard で確認すべき指標:**
- `Table Editor > roles` → 行数確認
- `Logs > API` → レスポンスタイムのパーセンタイル (p50/p95/p99)
- `Database > Query Performance` → スロークエリレポート
- `Storage` → バケット使用量

---

## まとめ: Supabase プラン移行の判断基準

| トリガー | アクション |
|---|---|
| 月間アクティブユーザー > 500 | Pro プランへ移行 |
| 同時接続 > 100 が継続 | Connection Pooling の pool_size を増やす |
| DB ストレージ > 4 GB | Pro Add-on または Team へ |
| p95 レスポンス > 1s が常態化 | Read Replica + クエリ最適化 |
| 月間 AI コスト > $200 | プロンプト短縮・キャッシュ強化 |
| ユーザー > 5,000 | Supabase Team ($599/月) または Self-hosted 検討 |
