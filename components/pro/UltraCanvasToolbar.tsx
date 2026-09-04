"use client";

import { CanvasInput } from "@/components/pro/CanvasTextField";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  ULTRA_CANVAS_TEMPLATE_IDS,
  type UltraCanvasTemplateId,
} from "@/lib/ultra-canvas-templates";

type BoardSummary = {
  id: string;
  name: string;
  updatedAt: string;
  nodeCount: number;
};

type Props = {
  boardName: string;
  boardId: string | null;
  saving: boolean;
  saveSuccessAt?: number | null;
  loading: boolean;
  boardError?: string | null;
  navDisabled?: boolean;
  onBoardNameChange: (name: string) => void;
  onSave: () => void;
  onNew: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onLoadTemplate: (id: UltraCanvasTemplateId) => void;
};

export function UltraCanvasToolbar({
  boardName,
  boardId,
  saving,
  saveSuccessAt,
  loading,
  boardError,
  navDisabled = false,
  onBoardNameChange,
  onSave,
  onNew,
  onLoad,
  onDelete,
  onUndo,
  onRedo,
  onLoadTemplate,
}: Props) {
  const { m } = useLocale();
  const tb = m.ultraCanvas.toolbar;
  const tpl = m.ultraCanvas.templates;
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);
  const showSaved =
    saveSuccessAt != null && Date.now() - saveSuccessAt < 2500 && !saving && !boardError;

  useEffect(() => {
    if (saveSuccessAt == null) return;
    const msLeft = 2500 - (Date.now() - saveSuccessAt);
    if (msLeft <= 0) return;
    const t = window.setTimeout(() => setSavedTick((n) => n + 1), msLeft);
    return () => window.clearTimeout(t);
  }, [saveSuccessAt, savedTick]);

  const refreshBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/ultra-canvas");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Failed to list boards.");
      }
      setBoards((data as { boards?: BoardSummary[] }).boards ?? []);
      setListError(null);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to list boards.");
    }
  }, []);

  useEffect(() => {
    void refreshBoards();
  }, [refreshBoards, boardId]);

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <div
        className={`flex w-full flex-wrap items-center justify-end gap-2 rounded-xl border border-violet-500/25 bg-slate-900/95 p-2 shadow-[0_0_32px_rgba(139,92,246,0.12)] backdrop-blur ${
          listOpen || tplOpen ? "relative z-50" : "relative z-10"
        }`}
      >
        <CanvasInput
          value={boardName}
          onChange={onBoardNameChange}
          placeholder={tb.boardNamePlaceholder}
          className="min-w-[8rem] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
        />
        <button
          type="button"
          disabled={saving || loading || navDisabled}
          onClick={onSave}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? tb.saving : boardId ? tb.save : tb.saveAs}
        </button>
        <button
          type="button"
          disabled={loading || navDisabled}
          onClick={onNew}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          {tb.newBoard}
        </button>
        <div className="relative">
          <button
            type="button"
            disabled={loading || navDisabled}
            onClick={() => {
              setListOpen((v) => !v);
              setTplOpen(false);
              void refreshBoards();
            }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            {tb.load}
          </button>
          {listOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-[min(50vh,20rem)] w-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
              {listError ? (
                <p className="px-2 py-2 text-xs text-red-400">{listError}</p>
              ) : boards.length === 0 ? (
                <p className="px-2 py-2 text-xs text-slate-500">{tb.emptyBoards}</p>
              ) : (
                boards.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center gap-1 rounded-lg hover:bg-slate-800 ${
                      b.id === boardId ? "bg-violet-950/60" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setListOpen(false);
                        onLoad(b.id);
                      }}
                      className={`min-w-0 flex-1 flex-col rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-800 ${
                        b.id === boardId ? "text-violet-200" : "text-slate-200"
                      }`}
                    >
                      <span className="font-medium">{b.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {tb.nodeCount.replace("{n}", String(b.nodeCount))}
                      </span>
                    </button>
                    <button
                      type="button"
                      title={tb.deleteBoard}
                      aria-label={tb.deleteBoard}
                      disabled={navDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(b.id);
                        void refreshBoards();
                      }}
                      className="shrink-0 rounded px-2 py-1 text-[10px] text-red-400 hover:bg-red-950/50"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div className="relative">
          <button
            type="button"
            disabled={loading || navDisabled}
            onClick={() => {
              setTplOpen((v) => !v);
              setListOpen(false);
            }}
            className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-950/60 disabled:opacity-40"
          >
            {tb.templates}
          </button>
          {tplOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-[min(50vh,20rem)] w-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
              {ULTRA_CANVAS_TEMPLATE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTplOpen(false);
                    onLoadTemplate(id);
                  }}
                  className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                >
                  <span className="font-medium">{tpl[id].name}</span>
                  <span className="text-[10px] text-slate-500">{tpl[id].desc}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onUndo}
          title={tb.undo}
          className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          ↶ {tb.undo}
        </button>
        <button
          type="button"
          onClick={onRedo}
          title={tb.redo}
          className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          ↷ {tb.redo}
        </button>
      </div>
      <details className="rounded-lg border border-slate-800/80 bg-slate-950/80 px-2.5 py-1">
        <summary className="cursor-pointer text-[10px] font-medium text-slate-400">
          Shortcuts
        </summary>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{tb.shortcuts}</p>
      </details>
      {showSaved ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-xs text-emerald-300">
          {tb.saved}
        </p>
      ) : null}
      {boardError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-2.5 py-1 text-xs text-red-300">
          {boardError}
        </p>
      ) : null}
    </div>
  );
}
