"use client";

import { useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { CanvasTextarea } from "@/components/pro/CanvasTextField";
import {
  imageUrlFromNode,
  mentionableNodes,
  nodeAlias,
  videoUrlFromNode,
} from "@/lib/pro-canvas-graph";
import type { ProCanvasNodeData } from "@/lib/pro-canvas-types";

type Props = {
  nodeId: string;
  nodes: Node[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

type MentionOption = {
  id: string;
  alias: string;
  label: string;
  kind: string;
  thumbUrl?: string;
  hasMedia: boolean;
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
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const options = useMemo<MentionOption[]>(() => {
    return mentionableNodes(nodes, nodeId)
      .map((o) => {
        const node = nodes.find((n) => n.id === o.id);
        if (!node) return null;
        const data = node.data as ProCanvasNodeData;
        const thumbUrl = imageUrlFromNode(node) || videoUrlFromNode(node);
        return {
          id: o.id,
          alias: o.alias || nodeAlias(node),
          label: o.label || data.label,
          kind: data.kind,
          thumbUrl,
          hasMedia: Boolean(thumbUrl),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Image-capable / with preview first so refs are easy to pick.
        if (a!.hasMedia !== b!.hasMedia) return a!.hasMedia ? -1 : 1;
        return a!.alias.localeCompare(b!.alias);
      }) as MentionOption[];
  }, [nodeId, nodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.alias.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q) ||
        o.kind.toLowerCase().includes(q),
    );
  }, [options, query]);

  const insertMention = (alias: string) => {
    const el = textareaRef.current;
    const token = `@${alias} `;
    const current = el?.value ?? value;
    if (!el) {
      onChange(`${current}${current.endsWith(" ") || !current ? "" : " "}${token}`);
      setOpen(false);
      setQuery("");
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    onChange(next);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <CanvasTextarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {options.length > 0 && (
        <div className="relative mt-1">
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setQuery("");
            }}
            className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-sky-500"
          >
            @ ref
          </button>
          {open ? (
            <div className="nodrag nopan nowheel absolute left-0 top-full z-30 mt-1 w-[min(100%,18rem)] overflow-hidden rounded-xl border border-sky-500/30 bg-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-sky-500/15">
              <div className="border-b border-slate-800 px-2 py-1.5">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search refs…"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <p className="px-1 py-2 text-[10px] text-slate-500">No matching nodes</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {filtered.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        title={`@${o.alias} · ${o.label}`}
                        onClick={() => insertMention(o.alias)}
                        className="group overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-left hover:border-sky-400/60 hover:bg-slate-800/80"
                      >
                        <div className="relative aspect-square bg-slate-950">
                          {o.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={o.thumbUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-contain p-1"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center px-1 text-center text-[9px] uppercase tracking-wide text-slate-500">
                              {o.kind}
                            </div>
                          )}
                        </div>
                        <div className="px-1.5 py-1">
                          <p className="truncate text-[10px] font-medium text-sky-300">
                            @{o.alias}
                          </p>
                          <p className="truncate text-[9px] text-slate-500">{o.kind}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
