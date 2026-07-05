"use client";

import { useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { mentionableNodes } from "@/lib/pro-canvas-graph";

type Props = {
  nodeId: string;
  nodes: Node[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function MentionInput({
  nodeId,
  nodes,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const options = useMemo(() => mentionableNodes(nodes, nodeId), [nodes, nodeId]);

  const insertMention = (alias: string) => {
    const el = textareaRef.current;
    const token = `@${alias} `;
    if (!el) {
      onChange(`${value}${value.endsWith(" ") || !value ? "" : " "}${token}`);
      setOpen(false);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {options.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-sky-500"
          >
            @ ref
          </button>
          {open &&
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => insertMention(o.alias)}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-sky-300 hover:bg-slate-700"
              >
                @{o.alias}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
