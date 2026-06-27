-- 008_display_mode.sql
-- かんたんモード / しっかりモード切り替え

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'simple'
    CHECK (display_mode IN ('simple', 'detail'));
