import {
  asRecord,
  fetchJustOneApi,
  pickVideoUrl,
} from "@/lib/justoneapi-client";
import { extractXhsNoteFromDetailResponse } from "@/lib/justoneapi-platform-search";

/** Prefer v6/v5 for MP4 (Just One docs). v1/v4 are for covers only. */
export const XHS_NOTE_DETAIL_PATHS_FOR_VIDEO = [
  "/api/xiaohongshu/get-note-detail/v6",
  "/api/xiaohongshu/get-note-detail/v5",
  "/api/xiaohongshu/get-note-detail/v7",
  "/api/xiaohongshu/get-note-detail/v2",
  "/api/xiaohongshu/get-note-detail/v1",
  "/api/xiaohongshu/get-note-detail/v4",
] as const;

/** Prefer v1/v4 (reliable signed covers). v5/v7 vary by note age. */
export const XHS_NOTE_DETAIL_PATHS = [
  "/api/xiaohongshu/get-note-detail/v1",
  "/api/xiaohongshu/get-note-detail/v4",
  "/api/xiaohongshu/get-note-detail/v2",
  "/api/xiaohongshu/get-note-detail/v5",
  "/api/xiaohongshu/get-note-detail/v7",
] as const;

export function xhsNoteDetailParams(noteId: string, noteUrl?: string): Record<string, string> {
  const params: Record<string, string> = { noteId };
  const url = noteUrl?.trim();
  if (url) params.noteUrl = url;
  return params;
}

export function pickVideoUrlFromXhsNote(note: Record<string, unknown>): string | undefined {
  const noteCard = asRecord(note.note_card) ?? asRecord(note.noteCard);
  return pickVideoUrl(
    note.video,
    noteCard?.video,
    note.video_info_v2,
    note.video_info,
    noteCard?.video_info_v2,
    noteCard?.video_info,
    asRecord(note.video)?.consumer,
    asRecord(note.video)?.media,
    note.native_video,
    noteCard?.native_video,
  );
}

/** Try each detail endpoint; skip empty responses and transient COLLECT FAILED errors. */
export async function fetchXhsNoteDetailForVideo(
  noteId: string,
  noteUrl: string | undefined,
  label: string,
): Promise<string | undefined> {
  const detailParams = xhsNoteDetailParams(noteId, noteUrl);
  let lastError: string | undefined;

  for (const path of XHS_NOTE_DETAIL_PATHS_FOR_VIDEO) {
    try {
      const body = await fetchJustOneApi(path, detailParams, label);
      const note = extractXhsNoteFromDetailResponse(body);
      if (!note) continue;
      const url = pickVideoUrlFromXhsNote(note);
      if (url) return url;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (lastError) {
    throw new Error(
      `小紅書影片解析失敗（${lastError}）。請再試一次，或用 App 複製完整貼文連結。`,
    );
  }
  return undefined;
}
