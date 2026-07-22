/** Simple energy-based beat/onset detection from PCM samples (16 kHz mono). */
export function detectBeatTimes(
  samples: Float32Array,
  sampleRate: number,
  durationSec: number,
): number[] {
  const windowSize = Math.max(256, Math.floor(sampleRate * 0.04));
  const hop = Math.floor(windowSize / 2);
  const energies: number[] = [];

  for (let i = 0; i + windowSize < samples.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const s = samples[i + j];
      sum += s * s;
    }
    energies.push(sum / windowSize);
  }

  if (!energies.length) return [];

  const sorted = [...energies].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const threshold = median * 2.8 + 0.0001;
  const minGapSec = 0.35;
  const beats: number[] = [];
  let lastBeatSec = -minGapSec;

  for (let i = 1; i < energies.length - 1; i++) {
    const e = energies[i];
    if (e < threshold) continue;
    if (e <= energies[i - 1] || e <= energies[i + 1]) continue;
    const sec = (i * hop) / sampleRate;
    if (sec - lastBeatSec < minGapSec) continue;
    if (sec > durationSec) break;
    beats.push(Math.round(sec * 10) / 10);
    lastBeatSec = sec;
  }

  if (!beats.length && durationSec > 0) {
    const bpm = 120;
    const interval = 60 / bpm;
    for (let t = 0; t < durationSec; t += interval) {
      beats.push(Math.round(t * 10) / 10);
    }
  }

  return beats;
}

export function snapToNearestBeat(sec: number, beats: number[], maxDelta = 0.2): number {
  if (!beats.length) return sec;
  let best = sec;
  let bestDist = maxDelta + 1;
  for (const b of beats) {
    const d = Math.abs(b - sec);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return bestDist <= maxDelta ? best : sec;
}

/** Snap each caption start to nearest beat; keep each line's duration. */
export function alignCaptionsToBeats<T extends { startSec: number; endSec: number }>(
  lines: T[],
  beats: number[],
  durationSec: number,
  maxDelta = 0.85,
): T[] {
  if (!beats.length || !lines.length) return lines;
  const videoDur = Math.max(0.5, durationSec);
  return lines.map((line) => {
    const dur = Math.max(0.2, line.endSec - line.startSec);
    const start = Math.max(0, snapToNearestBeat(line.startSec, beats, maxDelta));
    const end = Math.min(videoDur, Math.max(start + 0.2, start + dur));
    return { ...line, startSec: start, endSec: end };
  });
}

