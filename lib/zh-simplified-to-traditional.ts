/**
 * Instagram (and Just One IG endpoints) index Traditional Chinese / English
 * hashtags far more reliably than mainland Simplified. Convert SC → TC before
 * IG keyword / hashtag search. Idempotent for already-Traditional text.
 */
import { Converter } from "opencc-js/cn2t";

const HAS_CJK = /[\u3400-\u9fff]/;

let cnToTw: ((text: string) => string) | null = null;

function converter(): (text: string) => string {
  if (!cnToTw) {
    cnToTw = Converter({ from: "cn", to: "tw" });
  }
  return cnToTw;
}

/** Simplified → Traditional (Taiwan). Leaves non-CJK strings unchanged. */
export function simplifiedToTraditional(text: string): string {
  if (!text || !HAS_CJK.test(text)) return text;
  return converter()(text);
}

/** Keyword / hashtag phrase prepared for Instagram Just One search. */
export function instagramSearchKeyword(keyword: string): string {
  return simplifiedToTraditional(keyword);
}
