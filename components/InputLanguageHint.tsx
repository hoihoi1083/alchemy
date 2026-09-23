import { useLocale } from "@/components/LocaleProvider";
import type { InputLanguageIssue } from "@/lib/input-language";

type InputLanguageHintProps = {
  issue: InputLanguageIssue;
  /** soft = amber + optional Continue; hard = red, no continue */
  severity: "soft" | "hard";
  continued?: boolean;
  onContinue?: () => void;
  className?: string;
};

/**
 * Field-level language gate hint.
 * Soft: amber, Continue anyway. Hard: red (TTS / submit blocked).
 */
export function InputLanguageHint({
  issue,
  severity,
  continued = false,
  onContinue,
  className = "",
}: InputLanguageHintProps) {
  const { m } = useLocale();
  const L = m.inputLanguage;

  if (issue.kind === "none") return null;
  if (severity === "soft" && continued && issue.kind === "unsupported") return null;

  const isHard = severity === "hard";
  const tone = isHard
    ? "border-rose-200 bg-rose-50 text-rose-900"
    : "border-amber-200 bg-amber-50 text-amber-950";

  let body: string;
  if (issue.kind === "unsupported") {
    const scriptLabel =
      issue.script === "japanese"
        ? L.scriptJapanese
        : issue.script === "korean"
          ? L.scriptKorean
          : L.scriptOther;
    body = L.unsupportedBody(scriptLabel);
  } else if (issue.kind === "voice_mismatch") {
    if (issue.got === "empty") {
      body = L.voiceNeedScript;
    } else if (issue.expected === "en") {
      body = L.voiceNeedEnglish;
    } else {
      body = L.voiceNeedChinese;
    }
  } else {
    return null;
  }

  return (
    <div
      role={isHard ? "alert" : "status"}
      className={`mt-1.5 rounded-lg border px-2.5 py-2 text-xs leading-snug ${tone} ${className}`}
    >
      <p className="font-semibold">{L.title}</p>
      <p className="mt-0.5 opacity-90">{body}</p>
      {severity === "soft" && issue.kind === "unsupported" && onContinue ? (
        <button
          type="button"
          className="mt-1.5 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
          onClick={onContinue}
        >
          {L.continueAnyway}
        </button>
      ) : null}
    </div>
  );
}

/** Compact one-line variant for research hint rows. */
export function InputLanguageHintInline({
  issue,
  continued = false,
  onContinue,
}: {
  issue: InputLanguageIssue;
  continued?: boolean;
  onContinue?: () => void;
}) {
  const { m } = useLocale();
  const L = m.inputLanguage;
  if (issue.kind !== "unsupported") return null;
  if (continued) return null;
  const scriptLabel =
    issue.script === "japanese"
      ? L.scriptJapanese
      : issue.script === "korean"
        ? L.scriptKorean
        : L.scriptOther;
  return (
    <p className="mt-1.5 text-xs leading-snug text-amber-800" role="status">
      {L.unsupportedBody(scriptLabel)}{" "}
      {onContinue ? (
        <button
          type="button"
          className="font-semibold underline underline-offset-2"
          onClick={onContinue}
        >
          {L.continueAnyway}
        </button>
      ) : null}
    </p>
  );
}
