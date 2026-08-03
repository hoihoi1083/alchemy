export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptResult = {
  language?: string;
  text: string;
  segments: TranscriptSegment[];
};

export type PostProcessResult = {
  jobId: string;
  /** @deprecated Prefer `srtText` — pipeline srt URLs are not durable on serverless. */
  srtUrl?: string;
  /** Full SRT contents for client download without a second request. */
  srtText?: string;
  transcriptText: string;
  correctedText: string;
  finalVideoUrl?: string;
  dubbedAudioUrl?: string;
  note?: string;
};
