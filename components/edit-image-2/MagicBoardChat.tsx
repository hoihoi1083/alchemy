"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  placeholder: string;
  sendLabel: string;
  title: string;
  hint: string;
  onSend: (text: string) => void | Promise<void>;
};

/** Compact Magic Layers board chat — intents run in the parent. */
export function MagicBoardChat({
  disabled,
  placeholder,
  sendLabel,
  title,
  hint,
  onSend,
}: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = text.trim();
    if (!v || disabled || busy) return;
    setBusy(true);
    try {
      await onSend(v);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
        {title}
      </p>
      <p className="text-[10px] leading-snug text-slate-500">{hint}</p>
      <textarea
        className="min-h-[56px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white placeholder:text-slate-600"
        value={text}
        disabled={disabled || busy}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <button
        type="button"
        disabled={disabled || busy || !text.trim()}
        onClick={() => void submit()}
        className="w-full rounded-lg border border-cyan-400/40 bg-cyan-600/80 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {busy ? "…" : sendLabel}
      </button>
    </div>
  );
}
