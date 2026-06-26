"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "password" | "magic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("password");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handlePasswordLogin() {
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);
    if (error) {
      setError("メールアドレスまたはパスワードが違います。");
    } else {
      router.push("/home");
    }
  }

  async function handleMagicLink() {
    if (!email) return;
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    setIsLoading(false);
    if (error) {
      setError("メール送信に失敗しました。もう一度お試しください。");
    } else {
      setSent(true);
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        {/* ロゴ */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-sage mb-4">
            <span className="text-white text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-medium text-charcoal tracking-tight">
            Role Dream Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            感情を守りながら、<br />役割ごとの夢を止めないAIマネージャー
          </p>
        </div>

        {!sent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* メールアドレス */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mode === "password" && handlePasswordLogin()}
              placeholder="メールアドレス"
              className="w-full px-4 py-4 rounded-2xl border border-border bg-white text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage transition-all text-sm"
            />

            {/* パスワードモード */}
            {mode === "password" && (
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                  placeholder="パスワード"
                  className="w-full px-4 py-4 pr-12 rounded-2xl border border-border bg-white text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-500 px-1">{error}</p>}

            {/* メインボタン */}
            {mode === "password" ? (
              <button
                onClick={handlePasswordLogin}
                disabled={isLoading || !email || !password}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isLoading ? "ログイン中..." : "ログイン"}
              </button>
            ) : (
              <button
                onClick={handleMagicLink}
                disabled={isLoading || !email}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isLoading ? "送信中..." : "メールリンクでログイン"}
              </button>
            )}

            {/* モード切替 */}
            <button
              onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(null); }}
              className="w-full text-xs text-muted-foreground underline underline-offset-2"
            >
              {mode === "password" ? "メールリンクでログインする" : "パスワードでログインする"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">または</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Googleログイン */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 rounded-2xl border border-border bg-white text-charcoal font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-mist"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Googleでログイン
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 bg-white rounded-3xl p-8 shadow-sm"
          >
            <div className="text-4xl">📬</div>
            <h2 className="text-lg font-medium text-charcoal">メールを送りました</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>{email}</strong> に<br />
              ログインリンクをお送りしました。<br />
              メールを確認してください。
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-sage underline underline-offset-2"
            >
              メールアドレスを変更する
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
