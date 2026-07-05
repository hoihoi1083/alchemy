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
  srtUrl: string;
  transcriptText: string;
  correctedText: string;
  finalVideoUrl?: string;
  dubbedAudioUrl?: string;
  note?: string;
};
