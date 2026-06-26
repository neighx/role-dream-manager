"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Mic,
  MicOff,
  Loader2,
  ArrowRight,
  Inbox,
  CheckSquare,
  Calendar,
  Lightbulb,
  RotateCcw,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ParsedQuickCapture, QuickCaptureSaveDestination } from "@/types";
import { ROLE_CATEGORY_COLORS } from "@/types";

type Phase = "input" | "analyzing" | "review" | "saving" | "done";

const DESTINATION_CONFIG: Record<
  QuickCaptureSaveDestination,
  { label: string; icon: React.ReactNode; color: string }
> = {
  task: {
    label: "タスクに追加",
    icon: <CheckSquare className="w-4 h-4" />,
    color: "bg-sage/10 border-sage text-sage",
  },
  schedule: {
    label: "予定に追加",
    icon: <Calendar className="w-4 h-4" />,
    color: "bg-blue-50 border-blue-300 text-blue-700",
  },
  today_plan: {
    label: "今日のプランへ",
    icon: <CheckSquare className="w-4 h-4" />,
    color: "bg-amber-50 border-amber-300 text-amber-700",
  },
  inbox: {
    label: "Inboxへ（あとで）",
    icon: <Inbox className="w-4 h-4" />,
    color: "bg-stone-50 border-stone-300 text-stone-600",
  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task: <CheckSquare className="w-3.5 h-3.5" />,
  schedule: <Calendar className="w-3.5 h-3.5" />,
  idea: <Lightbulb className="w-3.5 h-3.5" />,
  inbox: <Inbox className="w-3.5 h-3.5" />,
};

interface Props {
  onClose: () => void;
}

export function QuickCaptureModal({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuickCapture | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [destination, setDestination] = useState<QuickCaptureSaveDestination>("task");
  const [editedTitle, setEditedTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedDestination, setSavedDestination] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Voice ────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const API = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!API) {
      setError("このブラウザは音声入力に対応していません");
      return;
    }

    const rec = new API();
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        setText((prev) => (prev ? prev + " " : "") + result[0].transcript);
        setInterimText("");
        setIsRecording(false);
      } else {
        setInterimText(result[0].transcript);
      }
    };

    rec.onerror = () => {
      setIsRecording(false);
      setInterimText("");
    };

    rec.onend = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText("");
  }, []);

  // ─── Analyze ─────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setPhase("analyzing");
    setError(null);

    try {
      const res = await fetch("/api/ai/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: trimmed, inputType: "text" }),
      });

      if (!res.ok) throw new Error("解析失敗");

      const data = (await res.json()) as {
        captureId: string | null;
        parsed: ParsedQuickCapture;
      };

      setParsed(data.parsed);
      setCaptureId(data.captureId);
      setEditedTitle(data.parsed.title);
      setDestination(data.parsed.save_destination);
      setPhase("review");
    } catch {
      setError("AI解析に失敗しました。Inboxに保存します。");
      const fallback: ParsedQuickCapture = {
        type: "inbox",
        title: trimmed.slice(0, 60),
        suggested_role_id: null,
        suggested_role_name: null,
        confidence: "low",
        save_destination: "inbox",
        ai_generated: false,
      };
      setParsed(fallback);
      setEditedTitle(fallback.title);
      setDestination("inbox");
      setPhase("review");
    }
  };

  // ─── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!parsed) return;
    setPhase("saving");

    const finalParsed: ParsedQuickCapture = {
      ...parsed,
      title: editedTitle || parsed.title,
      save_destination: destination,
    };

    try {
      const res = await fetch("/api/ai/quick-capture/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureId,
          parsed: finalParsed,
          rawText: text,
        }),
      });

      if (!res.ok) throw new Error("保存失敗");
      const data = (await res.json()) as { destination: string };
      setSavedDestination(data.destination);
      setPhase("done");

      setTimeout(() => onClose(), 1400);
    } catch {
      setError("保存に失敗しました。もう一度試してください。");
      setPhase("review");
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="relative bg-white rounded-t-3xl shadow-2xl max-w-md mx-auto w-full"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-stone-800">
              {phase === "done" ? "保存しました" : "Quick Capture"}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 text-stone-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── Input phase ── */}
            {phase === "input" && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="relative mb-3">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="何を思いついた？　テキストか音声で入力"
                    className="w-full h-28 px-4 py-3 pr-12 border border-stone-200 rounded-2xl text-sm resize-none bg-stone-50 focus:outline-none focus:border-sage focus:bg-white transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey) handleAnalyze();
                    }}
                  />
                  {/* Interim voice text overlay */}
                  {interimText && (
                    <div className="absolute bottom-2 left-4 right-12 text-xs text-sage/60 italic truncate">
                      {interimText}
                    </div>
                  )}
                  {/* Voice button */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      isRecording
                        ? "bg-red-100 text-red-500 animate-pulse"
                        : "bg-stone-100 text-stone-400 hover:bg-sage/10 hover:text-sage"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                {isRecording && (
                  <p className="text-xs text-red-500 text-center mb-3 animate-pulse">
                    録音中… 話し終わったら停止してください
                  </p>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!text.trim() || isRecording}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sage text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  AIで解析
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-stone-400 text-center mt-2">⌘ + Enter でも解析できます</p>
              </motion.div>
            )}

            {/* ── Analyzing ── */}
            {phase === "analyzing" && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 flex flex-col items-center gap-3"
              >
                <Loader2 className="w-8 h-8 text-sage animate-spin" />
                <p className="text-sm text-stone-500">AIが解析中…</p>
              </motion.div>
            )}

            {/* ── Review ── */}
            {phase === "review" && parsed && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Parsed card */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                  {/* Type badge */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 rounded-full text-[11px] text-stone-500">
                      {TYPE_ICONS[parsed.type]}
                      {parsed.type === "task" ? "タスク" : parsed.type === "schedule" ? "予定" : parsed.type === "idea" ? "アイデア" : "未分類"}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        parsed.confidence === "high"
                          ? "bg-green-50 text-green-600"
                          : parsed.confidence === "medium"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      確信度: {parsed.confidence === "high" ? "高" : parsed.confidence === "medium" ? "中" : "低"}
                    </span>
                  </div>

                  {/* Title (editable) */}
                  <input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-sage"
                  />

                  {/* Role chip */}
                  {parsed.suggested_role_name && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-400">Role:</span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor:
                            ROLE_CATEGORY_COLORS[
                              (parsed as ParsedQuickCapture & { suggested_role_category?: string })
                                .suggested_role_category as keyof typeof ROLE_CATEGORY_COLORS
                            ]?.bg ?? "#e5e7eb",
                          color:
                            ROLE_CATEGORY_COLORS[
                              (parsed as ParsedQuickCapture & { suggested_role_category?: string })
                                .suggested_role_category as keyof typeof ROLE_CATEGORY_COLORS
                            ]?.text ?? "#374151",
                        }}
                      >
                        {parsed.suggested_role_name}
                      </span>
                    </div>
                  )}

                  {/* Gap */}
                  {parsed.gap_target && (
                    <div className="text-[11px] text-stone-500 bg-white border border-stone-100 rounded-lg px-3 py-1.5">
                      <span className="text-stone-400">Gap: </span>
                      {parsed.gap_target}
                    </div>
                  )}

                  {/* Date/time */}
                  {(parsed.suggested_date || parsed.due_date) && (
                    <div className="text-[11px] text-stone-500">
                      📅 {parsed.suggested_date ?? parsed.due_date}
                      {parsed.suggested_time && ` ${parsed.suggested_time}`}
                    </div>
                  )}

                  {/* Reasoning */}
                  {parsed.reasoning && (
                    <p className="text-[11px] text-stone-400 italic">{parsed.reasoning}</p>
                  )}
                </div>

                {/* Save destination selector */}
                <div>
                  <p className="text-xs text-stone-500 mb-2 font-medium">保存先</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(DESTINATION_CONFIG) as QuickCaptureSaveDestination[]).map((dest) => {
                      const cfg = DESTINATION_CONFIG[dest];
                      return (
                        <button
                          key={dest}
                          onClick={() => setDestination(dest)}
                          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            destination === dest
                              ? cfg.color
                              : "bg-white border-stone-200 text-stone-500"
                          }`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setParsed(null);
                      setCaptureId(null);
                      setPhase("input");
                      setError(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-stone-200 text-stone-500 text-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    やり直す
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-sage text-white text-sm font-medium active:scale-95 transition-transform"
                  >
                    <Check className="w-4 h-4" />
                    保存する
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Saving ── */}
            {phase === "saving" && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-10 flex flex-col items-center gap-3"
              >
                <Loader2 className="w-7 h-7 text-sage animate-spin" />
                <p className="text-sm text-stone-500">保存中…</p>
              </motion.div>
            )}

            {/* ── Done ── */}
            {phase === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-sage/10 flex items-center justify-center">
                  <Check className="w-7 h-7 text-sage" />
                </div>
                <p className="text-sm font-medium text-stone-700">
                  {savedDestination === "task"
                    ? "タスクに追加しました"
                    : savedDestination === "schedule"
                    ? "予定に追加しました"
                    : savedDestination === "today_plan"
                    ? "今日のプランに追加しました"
                    : "Inboxに保存しました"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
