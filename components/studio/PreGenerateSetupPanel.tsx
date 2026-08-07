"use client";

import { useEffect, useId, useRef, type ChangeEvent, type ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { BrandWebsitePanel } from "@/components/studio/BrandWebsitePanel";
import { useWizard } from "@/components/studio/WizardContext";
import { ART_STYLE_IDS, getArtStyle, type ArtStyleId } from "@/lib/art-style";
import { copyFieldsFromAngle } from "@/lib/content-research-promote";
import { IMAGE_ASPECT_RATIOS, type ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { ImageTextMode } from "@/lib/image-text-mode";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";
import { requiresBrandProfileForImages } from "@/lib/visual-styles";
import { studioPhasesForMode } from "@/lib/studio-phases";
import { estimateImageTokens } from "@/lib/billing/token-costs";
import { STORYBOARD_SCENE_COUNTS } from "@/lib/ad-pack-preferences";

const PANEL_CSS = `
.pg-page {
  background: transparent;
  color: #0f172a;
  margin-left: -1rem;
  margin-right: -1rem;
  padding: 0.35rem 1rem 1.25rem;
}
@media (min-width: 640px) {
  .pg-page { margin-left: -1.5rem; margin-right: -1.5rem; padding-left: 1.5rem; padding-right: 1.5rem; }
}
.pg-phase-rail {
  position: relative; display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.35rem; max-width: 1320px; margin: 0 auto; padding: 0.85rem 0.25rem 1.05rem;
}
.pg-phase-line {
  position: absolute; top: calc(0.85rem + 16px); left: calc(0.25rem + 16px); right: calc(0.25rem + 16px);
  border-top: 2px dotted #cbd5e1; z-index: 0; pointer-events: none;
}
.pg-phase-item {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
  gap: 0.45rem; flex: 1 1 0; min-width: 0; text-align: center;
}
.pg-phase-dot--active { background: #6c3bff !important; color: #fff !important; box-shadow: 0 0 0 4px rgba(108,59,255,0.16); }
.pg-phase-dot--done { background: #6c3bff !important; color: #fff !important; }
.pg-phase-dot--idle { background: #e2e8f0 !important; color: #94a3b8 !important; }
.pg-phase-label { font-size: 11px; line-height: 1.25; max-width: 7.5rem; }
.pg-layout {
  display: grid; gap: 1.15rem; margin-top: 1rem; align-items: start;
  grid-template-columns: 1fr;
}
.pg-stack { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
.pg-card {
  border-radius: 1rem; border: 1px solid #e2e8f0; background: #fff;
  padding: 1.05rem 1.05rem 1.15rem;
  box-shadow: 0 1px 2px rgba(15,23,42,0.03);
}
.pg-card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
}
.pg-card-title-row {
  display: flex; align-items: center; gap: 0.55rem; min-width: 0;
}
.pg-card-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.35rem; height: 2.35rem; border-radius: 0.65rem;
  background: #f5f3ff; color: #6c3bff; flex-shrink: 0;
}
.pg-card-title {
  font-size: 0.95rem; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;
}
.pg-brief-row {
  display: grid;
  gap: 1rem;
  align-items: start;
  grid-template-columns: 1fr;
  margin-top: 1rem;
}
.pg-brief-media {
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  aspect-ratio: 4 / 5;
  width: 100%;
  max-width: 200px;
}
.pg-brief-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pg-brief-summary {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0;
}
.pg-brief-summary-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
}
.pg-brief-row-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #475569;
}
.pg-brief-row-item + .pg-brief-row-item {
  margin-top: 0.55rem;
}
.pg-brief-check {
  flex-shrink: 0;
  margin-top: 0.1rem;
  width: 0.95rem;
  height: 0.95rem;
  color: #6c3bff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 0;
}
.pg-edit-brief {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1.5px solid #c4b5fd;
  background: #fff;
  padding: 0.4rem 0.85rem;
  font-size: 12px;
  font-weight: 600;
  color: #6c3bff;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.pg-edit-brief:hover {
  background: #f5f3ff;
  border-color: #a78bfa;
}
.pg-field-grid {
  display: grid; gap: 0.9rem;
  grid-template-columns: 1fr;
  flex: 1;
  min-width: 0;
}
.pg-content-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pg-content-row--center {
  align-items: stretch;
}
.pg-content-aside {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
}
.pg-output-grid {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: 1fr;
  flex: 1;
  min-width: 0;
}
.pg-output-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  border-radius: 0.85rem;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 0.75rem;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.pg-output-card:hover { border-color: #ddd6fe; }
.pg-output-card.is-selected {
  border-color: #6c3bff;
  background: #faf5ff;
  box-shadow: 0 0 0 1px rgba(108, 59, 255, 0.2);
}
.pg-output-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  background: #ede9fe;
  color: #6c3bff;
  flex-shrink: 0;
}
.pg-output-card.is-selected .pg-output-icon {
  background: #6c3bff;
  color: #fff;
}
.pg-output-copy { min-width: 0; padding-right: 0.85rem; }
.pg-output-copy strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
}
.pg-output-copy span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: #64748b;
}
.pg-input, .pg-textarea {
  width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0;
  background: #fff; padding: 0.7rem 0.85rem; font-size: 14px; line-height: 1.4;
  color: #0f172a; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.pg-input:focus, .pg-textarea:focus {
  border-color: #6c3bff; background: #fff; box-shadow: 0 0 0 4px rgba(108,59,255,0.12);
}
.pg-input::placeholder, .pg-textarea::placeholder { color: #94a3b8; }
.pg-label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 0.4rem; }
.pg-label-req { color: #ef4444; margin-left: 0.15rem; font-weight: 700; }
.pg-label-opt { color: #94a3b8; font-weight: 500; margin-left: 0.25rem; }
.pg-count { margin-top: 0.3rem; text-align: right; font-size: 11px; color: #94a3b8; }
.pg-tip-wrap { display: flex; flex-direction: column; gap: 0.85rem; }
.pg-tip-card {
  display: flex; flex-direction: column; min-width: 0; gap: 0;
  border-radius: 1.15rem; border: 1px solid #e9e4ff; background: #f7f5ff;
  padding: 1.15rem 1.05rem 1.2rem;
}
.pg-tip-head {
  display: flex; align-items: center; gap: 0.5rem;
  margin-bottom: 0.15rem;
}
.pg-tip-head-icon {
  display: inline-flex; align-items: center; justify-content: center;
  color: #6c3bff; flex-shrink: 0;
}
.pg-tip-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.5rem; height: 2.5rem; border-radius: 0.65rem;
  background: #ede9fe; color: #6c3bff; flex-shrink: 0;
}
.pg-secure {
  display: flex; align-items: flex-start; gap: 0.7rem;
  border-radius: 0.95rem; border: 1px solid #ddd6fe; background: #f5f3ff;
  padding: 0.9rem 0.95rem;
}
.pg-secure-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.25rem; height: 2.25rem; border-radius: 0.55rem;
  background: #fff; color: #6c3bff; flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.35);
}
.pg-generate-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  width: 100%; border-radius: 9999px; border: none;
  background: #6c3bff; color: #fff;
  padding: 0.85rem 1.1rem; font-size: 0.9rem; font-weight: 700;
  box-shadow: 0 8px 20px rgba(108, 59, 255, 0.22);
  transition: background 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}
.pg-generate-btn:hover:not(:disabled) { background: #5b2fe0; }
.pg-generate-btn:disabled {
  background: #c4b5fd; color: #fff; box-shadow: none; cursor: not-allowed; opacity: 1;
}
.pg-check {
  position: absolute; top: 0.4rem; right: 0.4rem;
  display: flex; align-items: center; justify-content: center;
  width: 1.15rem; height: 1.15rem; border-radius: 9999px;
  background: #6c3bff; color: #fff;
}
.pg-ref-drop {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.45rem;
  width: 100%; min-height: 8.5rem; border-radius: 0.9rem; border: 1.5px dashed #ddd6fe;
  background: #faf8ff; padding: 1.1rem 1rem; text-align: center;
  color: #5b2fe0; transition: border-color 0.15s ease, background 0.15s ease;
}
.pg-ref-drop:hover { border-color: #c4b5fd; background: #f5f3ff; }
.pg-ref-actions {
  display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.65rem;
}
.pg-ref-actions button {
  flex: 1 1 auto; min-width: 5.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;
  background: #fff; padding: 0.5rem 0.75rem; font-size: 12px; font-weight: 600; color: #475569;
}
.pg-ref-actions button:hover { border-color: #ddd6fe; background: #f8fafc; color: #5b2fe0; }
.pg-aspect-frame {
  margin: 0 auto 0.45rem; border: 1.5px solid currentColor; border-radius: 0.25rem; opacity: 0.85;
}
.pg-style-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0.45rem;
  margin-top: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
}
.pg-style-card {
  position: relative;
  flex: 0 0 4.25rem;
  width: 4.25rem;
  max-width: 4.25rem;
  overflow: hidden;
  border-radius: 0.65rem;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  padding: 0;
  text-align: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.pg-style-card:hover { border-color: #ddd6fe; }
.pg-style-card.is-selected {
  border-color: #6c3bff;
  box-shadow: 0 0 0 1px rgba(108, 59, 255, 0.22);
}
.pg-style-card img {
  display: block;
  width: 4.25rem;
  height: 4.25rem;
  object-fit: cover;
}
.pg-style-card span {
  display: block;
  padding: 0.3rem 0.2rem 0.4rem;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.2;
  color: #1e293b;
}
@media (max-width: 639px) {
  .pg-phase-label { display: none; }
  .pg-phase-item.is-active .pg-phase-label {
    display: block; font-weight: 600; color: #5b2fe0;
  }
}
@media (min-width: 640px) {
  .pg-field-grid { grid-template-columns: 1fr 1fr; gap: 1rem 1.1rem; }
  .pg-content-row {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.35rem;
  }
  .pg-content-row--center { align-items: center; }
  .pg-content-aside {
    width: 9.5rem;
    padding-top: 0.15rem;
  }
  .pg-content-row--center .pg-content-aside { padding-top: 0; }
  .pg-output-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
  }
  .pg-brief-row {
    grid-template-columns: minmax(150px, 34%) minmax(0, 1fr);
    gap: 1.5rem;
  }
  .pg-brief-media {
    max-width: none;
    aspect-ratio: 4 / 5;
  }
}
@media (min-width: 768px) {
  .pg-layout {
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 1.35rem;
  }
  .pg-tip-wrap {
    position: sticky;
    top: 1rem;
  }
  .pg-card { padding: 1.2rem 1.25rem 1.3rem; }
  .pg-content-aside { width: 10.5rem; }
}
@media (min-width: 1024px) {
  .pg-layout {
    grid-template-columns: minmax(0, 1fr) 272px;
    gap: 1.6rem;
  }
  .pg-brief-row {
    grid-template-columns: minmax(180px, 30%) minmax(0, 1fr);
    gap: 1.75rem;
  }
  .pg-content-aside { width: 11rem; }
  .pg-output-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .pg-layout {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 1.85rem;
  }
  .pg-content-aside { width: 11.5rem; }
}
.pg-mobile-cta {
  display: none;
}
@media (max-width: 767px) {
  .pg-mobile-cta {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    position: sticky;
    bottom: 0.35rem;
    z-index: 30;
    margin-top: 0.75rem;
    padding: 0.65rem 0.7rem;
    border-radius: 1rem;
    border: 1px solid #ddd6fe;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(8px);
  }
  .pg-tip-wrap .pg-desktop-generate { display: none; }
}
`;

function TipSvg({ kind }: { kind: "bulb" | "photo" | "hook" | "grid" | "ai" | "shield" }) {
  const common = "h-5 w-5";
  if (kind === "bulb") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M9 18h6M10 21h4"
          strokeLinecap="round"
        />
        <path
          d="M12 3a5.5 5.5 0 0 0-3.3 9.9c.6.5 1 1.2 1.1 2.1h4.4c.1-.9.5-1.6 1.1-2.1A5.5 5.5 0 0 0 12 3Z"
          strokeLinejoin="round"
        />
        <path d="M12 2v1.2M7.2 4.6l.8.8M16.8 4.6l-.8.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "photo") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m7.5 16.5 3.2-3.4 2.4 2.3 2.6-3.2 3.3 4.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "hook") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3.5v8.2a3.3 3.3 0 1 0 3.3 3.3" strokeLinecap="round" />
        <circle cx="12" cy="3.5" r="1.3" />
        <path d="m16.2 5.2.9-.9M18 8.5h1.2M16.5 12.2l.9.9" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "grid") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2.2" />
        <path d="M4 10h16M4 14h16M10 4v16M14 4v16" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "ai") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M12 4.2 13.4 8.6 18 10l-4.6 1.4L12 16l-1.4-4.6L6 10l4.6-1.4L12 4.2Z"
          strokeLinejoin="round"
        />
        <path d="M18.2 15.2 18.8 17 20.6 17.6l-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3.2 19 6.4v5.1c0 4.35-2.95 8.15-7 9.2-4.05-1.05-7-4.85-7-9.2V6.4L12 3.2Z" strokeLinejoin="round" />
      <path d="m9.2 12 1.9 1.9 3.7-3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionIcon({ kind }: { kind: "brief" | "content" | "output" | "upload" | "options" }) {
  const common = "h-5 w-5";
  if (kind === "brief") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="7" height="16" rx="1.5" />
        <path d="M14 7h6M14 12h6M14 17h4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "content") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M7 3.75h7.2L18.5 8v12.25a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 7 3.75Z"
          strokeLinejoin="round"
        />
        <path d="M14.2 3.75V8h4.3" strokeLinejoin="round" />
        <path d="M9 12h6.5M9 15.5h4.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "output") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="4" width="12.5" height="16" rx="2" />
        <path d="M8 9h6.5M8 12.5h6.5M8 16h4" strokeLinecap="round" />
        <circle cx="17.8" cy="6.2" r="2.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "upload") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M8.2 9.2V8a3.8 3.8 0 0 1 7.6 0v1.2"
          strokeLinecap="round"
        />
        <path
          d="M6.5 9.5h11a1.7 1.7 0 0 1 1.7 1.7v7.6a1.7 1.7 0 0 1-1.7 1.7h-11a1.7 1.7 0 0 1-1.7-1.7v-7.6a1.7 1.7 0 0 1 1.7-1.7Z"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="14.2" r="1.35" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="m6.5 15.5 3.4-3.6 2.3 2.2 2.8-3.4L17.5 15.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FusedReferenceCard({
  title,
  hint,
  briefSummaryTitle,
  noReference,
  changeLabel,
  removeLabel,
  cta,
  uploadHint,
  previewUrl,
  fileName,
  analyzeActive,
  analyzingLabel,
  analyzedFallback,
  summaryRows,
  onFile,
}: {
  title: string;
  hint: string;
  briefSummaryTitle: string;
  noReference: string;
  changeLabel: string;
  removeLabel: string;
  cta: string;
  uploadHint: string;
  previewUrl: string | null;
  fileName: string | null;
  analyzeActive: boolean;
  analyzingLabel: string;
  analyzedFallback: string;
  summaryRows: { label: string; value: string }[];
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPreview = Boolean(previewUrl);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  return (
    <section className="pg-card">
      <div className="pg-card-title-row">
        <span className="pg-card-icon">
          <SectionIcon kind="brief" />
        </span>
        <div className="min-w-0">
          <h3 className="pg-card-title">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onChange}
      />

      {!hasPreview ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="pg-ref-drop mt-3">
          <span className="text-2xl" aria-hidden>
            📎
          </span>
          <span className="text-sm font-semibold text-violet-700">{cta}</span>
          <span className="max-w-sm text-xs leading-relaxed text-slate-500">{uploadHint}</span>
        </button>
      ) : (
        <div className="pg-brief-row mt-3">
          <div className="min-w-0">
            <div className="pg-brief-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl!} alt="" />
            </div>
            {fileName ? (
              <p className="mt-1.5 truncate text-xs text-slate-500">{fileName}</p>
            ) : null}
            <div className="pg-ref-actions">
              <button type="button" onClick={() => inputRef.current?.click()}>
                {changeLabel}
              </button>
              <button type="button" onClick={() => onFile(null)}>
                {removeLabel}
              </button>
            </div>
          </div>

          <div className="pg-brief-summary">
            <p className="pg-brief-summary-title">{briefSummaryTitle}</p>
            {analyzeActive ? (
              <p className="flex items-center gap-2 text-sm text-violet-900">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                {analyzingLabel}
              </p>
            ) : summaryRows.length > 0 ? (
              <ul>
                {summaryRows.map((row) => (
                  <li key={row.label} className="pg-brief-row-item">
                    <span className="pg-brief-check" aria-hidden>
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                      >
                        <path
                          d="m5 12 5 5L20 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-900">{row.label}:</span>{" "}
                      <span className="text-slate-500">{row.value}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{analyzedFallback || noReference}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PhaseStepper({
  phases,
  activeIndex,
}: {
  phases: readonly string[];
  activeIndex: number;
}) {
  return (
    <nav aria-label="Progress" className="border-b border-slate-100">
      <ol className="pg-phase-rail">
        <span className="pg-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li
              key={label}
              className={`pg-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active
                    ? "pg-phase-dot--active"
                    : done
                      ? "pg-phase-dot--done"
                      : "pg-phase-dot--idle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`pg-phase-label ${
                  active ? "font-semibold text-violet-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckBadge() {
  return (
    <span className="pg-check" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function briefSummaryRows(
  brief: UserReferenceBrief | null,
  product: string,
  labels: {
    product: string;
    target: string;
    goal: string;
    tone: string;
    keyMessage: string;
  },
): Array<{ label: string; value: string }> {
  if (!brief) return [];
  return [
    { label: labels.product, value: product.trim() || brief.subjects || brief.topic },
    { label: labels.target, value: brief.contentType || brief.topic },
    { label: labels.goal, value: brief.layoutStyle },
    { label: labels.tone, value: brief.mood },
    { label: labels.keyMessage, value: brief.contentSummary || brief.visibleText },
  ].filter((row) => Boolean(row.value?.trim()));
}

const OUTPUT_ICONS: Record<ImageOutputMode, ReactNode> = {
  single: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <circle cx="16.2" cy="9.2" r="1.35" fill="currentColor" stroke="none" />
      <path d="m5.5 16.2 4.1-4.4 2.6 2.5 2.5-2.7 4.3 4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ab: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="7.2" y="3.8" width="12.5" height="10.5" rx="1.8" />
      <rect x="4" y="8.2" width="12.5" height="10.5" rx="1.8" fill="currentColor" fillOpacity="0.06" />
      <circle cx="13.3" cy="11.4" r="1.05" fill="currentColor" stroke="none" />
      <path d="m5.6 16.6 3.1-3.2 1.9 1.8 1.9-2 3.2 3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  campaign: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <path d="M3.5 10.5h17M11.5 5v14" strokeLinecap="round" />
      <path d="M13.2 12.2c1.1.9 2.5.9 3.6 0 1.1-.9 2.4-.9 3.2-.15" strokeLinecap="round" />
    </svg>
  ),
  "teaching-carousel": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="8.5" y="3.5" width="11" height="13.5" rx="1.6" />
      <rect x="6" y="5.5" width="11" height="13.5" rx="1.6" />
      <rect x="3.5" y="7.5" width="11" height="13.5" rx="1.6" fill="currentColor" fillOpacity="0.06" />
      <path d="M6.2 12.2h5.4M6.2 14.8h3.8" strokeLinecap="round" />
    </svg>
  ),
};

/**
 * Fused post-intake setup — shared by research + direct creation.
 * Direct adds: creation direction (quick vs model) + optional reference upload.
 */
export function PreGenerateSetupPanel({
  onGenerate,
  generateDisabled = false,
  generateLabel,
  generateBlockMessage,
  showStylePicker = false,
  showReferenceUpload = false,
  combinedStoryboard = false,
}: {
  onGenerate?: () => void;
  generateDisabled?: boolean;
  generateLabel?: string;
  /** Shown above the generate CTA (e.g. wait for reference analysis). */
  generateBlockMessage?: string | null;
  /** Direct path: quick ad vs model-wear (affects visualStyleId / prompts). */
  showStylePicker?: boolean;
  /** Direct path: optional user reference image (triggers analyze + dual-ref). */
  showReferenceUpload?: boolean;
  /** 圖+片: fuse storyboard brief; hide single-image output modes. */
  combinedStoryboard?: boolean;
} = {}) {
  const { m } = useLocale();
  const wizard = useWizard();
  const pg = m.microWizard.preGenerateSetup;
  const isConcept = wizard.promotionMode === "concept";
  const contentRef = useRef<HTMLElement | null>(null);
  const mainInputId = useId();
  const angleInputId = useId();
  const showBrandWebsite = requiresBrandProfileForImages(wizard.visualStyleId);
  const effectiveShowStylePicker = showStylePicker && !combinedStoryboard;

  const brief = wizard.userReferenceBrief as UserReferenceBrief | null;
  const showReferenceBrief =
    Boolean(wizard.imageRefPhoto) ||
    wizard.referenceAnalyzeBusy ||
    Boolean(brief) ||
    Boolean(wizard.referenceAnalyzeNote) ||
    (!showReferenceUpload && Boolean(wizard.promptExtra?.trim()));

  const analyzeDone = Boolean(brief) || Boolean(wizard.referenceAnalyzeNote);
  // Don't keep spinning after brief/note exists — busy can stick true after a
  // cancelled remount even when analyze-reference already returned 200.
  const analyzeActive = Boolean(wizard.imageRefPhoto) && !analyzeDone;

  const isModelWear = wizard.visualStyleId === "model-wear";
  const isQuickAd = !isModelWear;
  const hasReference = Boolean(wizard.imageRefPhoto);
  /** Reference layout transfer overrides model-wear staging — lock to product path. */
  const modelWearLockedByReference = effectiveShowStylePicker && !isConcept && hasReference;
  const conceptPath =
    wizard.visualStyleId === "info-poster"
      ? "info"
      : wizard.visualStyleId === "brand-fit"
        ? "brand"
        : wizard.visualStyleId === "pricing-offer"
          ? "pricing"
          : wizard.visualStyleId === "website-launch"
            ? "website"
            : null;
  const showConceptShopFields =
    isConcept &&
    (wizard.visualStyleId === "pricing-offer" ||
      wizard.visualStyleId === "website-launch" ||
      wizard.visualStyleId === "service-promo");

  const setupHint = combinedStoryboard
    ? isConcept
      ? pg.combinedConceptHint
      : pg.combinedHint
    : isConcept
      ? showStylePicker || showReferenceUpload
        ? pg.conceptDirectHint
        : pg.conceptHint
      : showStylePicker || showReferenceUpload
        ? pg.directHint
        : pg.hint;

  // If research already applied but hook/subline were left blank (stale session /
  // older concept branch), backfill the same way product research does.
  const researchCopyBackfillKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isConcept) return;
    if (wizard.headline.trim() && wizard.subline.trim()) return;
    const promote = wizard.conceptIdea.trim();
    if (!promote) return;
    const ref = wizard.contentResearchApplyRef;
    const key = `${ref?.angle?.id ?? "no-angle"}:${promote}`;
    if (researchCopyBackfillKeyRef.current === key) return;
    researchCopyBackfillKeyRef.current = key;

    if (ref?.angle) {
      const copy = copyFieldsFromAngle(ref.angle, promote, ref.plan.topic, {
        promotionMode: "concept",
        referenceSourced: true,
        market: wizard.promptMarket,
      });
      if (!wizard.headline.trim() && copy.headline.trim()) {
        wizard.setHeadline(copy.headline);
      }
      if (!wizard.subline.trim() && copy.subline.trim()) {
        wizard.setSubline(copy.subline);
      }
      return;
    }

    if (!wizard.headline.trim()) {
      const copy = copyFieldsFromAngle(
        {
          id: "concept-topic-fallback",
          title: promote,
          hook: promote,
          format: "single-image",
          formatLabel: "Single",
          whyItWorks: "",
          bulletPoints: [],
          cta: "",
          scriptOutline: "",
          score: 0,
        },
        promote,
        promote,
        { promotionMode: "concept", referenceSourced: false, market: wizard.promptMarket },
      );
      if (copy.headline.trim()) wizard.setHeadline(copy.headline);
      if (copy.subline.trim()) wizard.setSubline(copy.subline);
    }
  }, [
    isConcept,
    wizard.headline,
    wizard.subline,
    wizard.conceptIdea,
    wizard.contentResearchApplyRef,
    wizard.promptMarket,
    wizard.setHeadline,
    wizard.setSubline,
  ]);

  function pickCreationDirection(path: "quick" | "model") {
    if (path === "model" && hasReference) return;
    wizard.applyPrimaryPath(path);
    // Keep dual-ref mode if user already uploaded a reference.
    if (wizard.imageRefPhoto) {
      wizard.setImageCreativeMode("reference-concept");
    }
  }

  function pickConceptDirection(path: "info" | "brand" | "pricing" | "website") {
    wizard.applyPrimaryPathConcept(path);
    if (wizard.imageRefPhoto) {
      wizard.setImageCreativeMode("reference-concept");
    }
  }

  function onReferenceFile(file: File | null) {
    wizard.setImageRefPhoto(file);
    if (file) {
      // Reference layout wins over model-wear — switch to product path.
      if (wizard.visualStyleId === "model-wear") {
        wizard.applyPrimaryPath("quick");
      }
      wizard.setImageCreativeMode("reference-concept");
      return;
    }
    // Cleared — fall back to promo mode for the selected creation direction.
    wizard.setUserReferenceBrief(null);
    wizard.setReferenceAnalyzeNote(null);
    wizard.setImageCreativeMode("promo-ai");
  }

  const summaryRows = briefSummaryRows(
    brief,
    isConcept ? wizard.conceptIdea || wizard.product : wizard.product,
    {
      product: isConcept ? pg.conceptBriefTopic : pg.briefProduct,
      target: pg.briefTarget,
      goal: pg.briefGoal,
      tone: pg.briefTone,
      keyMessage: pg.briefKeyMessage,
    },
  );

  const mainThumb =
    wizard.uploadPreviewUrl
      ? {
          url: wizard.uploadPreviewUrl,
          name: wizard.productPhoto?.name ?? "product",
        }
      : null;
  const angleThumbs = wizard.extraKitPreviewUrls.map((url: string, i: number) => ({
    url,
    name: wizard.extraKitPhotos[i]?.name ?? `extra-${i}`,
    key: `extra-${i}`,
  }));

  function onMainFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) wizard.onProductPhotoSelected(file);
  }

  function onAngleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    wizard.setExtraKitPhotos([...wizard.extraKitPhotos, ...files]);
  }

  function removeMain() {
    wizard.onProductPhotoSelected(null);
  }

  function removeAngle(key: string) {
    const idx = Number(key.replace("extra-", ""));
    if (Number.isNaN(idx)) return;
    wizard.setExtraKitPhotos(wizard.extraKitPhotos.filter((_: File, i: number) => i !== idx));
  }

  const outputModes: ImageOutputMode[] = wizard.lockedCampaignMode
    ? ["campaign"]
    : ["single", "ab", "campaign", "teaching-carousel"];

  return (
    <div className="pg-page">
      <style dangerouslySetInnerHTML={{ __html: PANEL_CSS }} />
      <PhaseStepper phases={studioPhasesForMode(m.start, wizard.workflowMode)} activeIndex={2} />

      <div className="mt-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {pg.titleBefore}{" "}
          <span className="relative inline-block text-violet-600">
            {pg.titleAccent}
            <span
              className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-violet-400/70"
              aria-hidden
            />
          </span>
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{setupHint}</p>

        <div className="pg-layout">
          <div className="pg-stack">
            {showReferenceUpload ? (
              <FusedReferenceCard
                title={pg.referenceUploadTitle}
                hint={isConcept ? pg.conceptReferenceUploadHint : pg.referenceUploadHint}
                briefSummaryTitle={pg.briefSummaryTitle}
                noReference={pg.noReference}
                changeLabel={m.wizard.referenceChange}
                removeLabel={pg.referenceRemove}
                cta={m.wizard.referenceCta}
                uploadHint={m.wizard.uploadHintConcept}
                previewUrl={wizard.imageRefPreviewUrl}
                fileName={wizard.imageRefPhoto?.name ?? null}
                analyzeActive={analyzeActive}
                analyzingLabel={m.wizard.referenceBriefAnalyzing}
                analyzedFallback={
                  wizard.referenceAnalyzeNote ?? m.wizard.referenceBriefAnalyzed
                }
                summaryRows={summaryRows}
                onFile={onReferenceFile}
              />
            ) : showReferenceBrief ? (
              <section className="pg-card">
                <div className="pg-card-head">
                  <h3 className="pg-card-title">{pg.referenceTitle}</h3>
                  <button
                    type="button"
                    onClick={() =>
                      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="pg-edit-brief shrink-0"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    {pg.changeBrief}
                  </button>
                </div>

                <div className="pg-brief-row">
                  <div className="pg-brief-media">
                    {wizard.imageRefPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={wizard.imageRefPreviewUrl} alt="" />
                    ) : (
                      <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-slate-400">
                        {pg.noReference}
                      </div>
                    )}
                  </div>

                  <div className="pg-brief-summary">
                    <p className="pg-brief-summary-title">{pg.briefSummaryTitle}</p>
                    {analyzeActive ? (
                      <p className="flex items-center gap-2 text-sm text-violet-900">
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                        {m.wizard.referenceBriefAnalyzing}
                      </p>
                    ) : summaryRows.length > 0 ? (
                      <ul>
                        {summaryRows.map((row) => (
                          <li key={row.label} className="pg-brief-row-item">
                            <span className="pg-brief-check" aria-hidden>
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.6"
                              >
                                <path
                                  d="m5 12 5 5L20 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <span className="min-w-0">
                              <span className="font-semibold text-slate-900">{row.label}:</span>{" "}
                              <span className="text-slate-500">{row.value}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {wizard.referenceAnalyzeNote ?? m.wizard.referenceBriefAnalyzed}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {effectiveShowStylePicker ? (
              <section className="pg-card">
                <div className="pg-card-title-row">
                  <span className="pg-card-icon">
                    <SectionIcon kind="options" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="pg-card-title">{pg.stylePickerTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isConcept ? pg.conceptStylePickerHint : pg.stylePickerHint}
                    </p>
                  </div>
                </div>
                {isConcept ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["info", m.wizard.pathInfoTitle, m.wizard.pathInfoDesc],
                        ["brand", m.wizard.pathBrandTitle, m.wizard.pathBrandDesc],
                        ["pricing", m.wizard.pathPricingTitle, m.wizard.pathPricingDesc],
                        ["website", m.wizard.pathWebsiteTitle, m.wizard.pathWebsiteDesc],
                      ] as const
                    ).map(([path, title, desc]) => {
                      const selected = conceptPath === path;
                      return (
                        <button
                          key={path}
                          type="button"
                          onClick={() => pickConceptDirection(path)}
                          className={`pg-output-card text-left${selected ? " is-selected" : ""}`}
                        >
                          {selected ? (
                            <span className="pg-check" aria-hidden>
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <path
                                  d="m5 12 5 5L20 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          ) : null}
                          <div className="pg-output-copy">
                            <strong>{title}</strong>
                            <span>{desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => pickCreationDirection("quick")}
                      className={`pg-output-card text-left${isQuickAd ? " is-selected" : ""}`}
                    >
                      {isQuickAd ? (
                        <span className="pg-check" aria-hidden>
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              d="m5 12 5 5L20 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      ) : null}
                      <div className="pg-output-copy">
                        <strong>{pg.stylePickerQuickLabel}</strong>
                        <span>{pg.stylePickerQuickDesc}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => pickCreationDirection("model")}
                      disabled={modelWearLockedByReference}
                      title={
                        modelWearLockedByReference ? pg.stylePickerModelLockedHint : undefined
                      }
                      className={`pg-output-card text-left${isModelWear ? " is-selected" : ""}${
                        modelWearLockedByReference ? " opacity-45" : ""
                      }`}
                    >
                      {isModelWear ? (
                        <span className="pg-check" aria-hidden>
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              d="m5 12 5 5L20 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      ) : null}
                      <div className="pg-output-copy">
                        <strong>{pg.stylePickerModelLabel}</strong>
                        <span>
                          {modelWearLockedByReference
                            ? pg.stylePickerModelLockedHint
                            : pg.stylePickerModelDesc}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
                {modelWearLockedByReference ? (
                  <p className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-900">
                    {pg.stylePickerModelLockedNote}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="pg-card" ref={contentRef}>
              <div className="pg-content-row">
                <div className="pg-content-aside">
                  <span className="pg-card-icon">
                    <SectionIcon kind="content" />
                  </span>
                  <h3 className="pg-card-title">{pg.contentTitle}</h3>
                </div>
                <div className="pg-field-grid">
                  {isConcept ? (
                    <label>
                      <span className="pg-label">
                        {pg.conceptTopicLabel}
                        <span className="pg-label-req" aria-hidden>
                          *
                        </span>
                        <span className="ml-1.5 font-medium text-violet-600">
                          ({pg.conceptTopicRequired})
                        </span>
                      </span>
                      <input
                        className="pg-input"
                        value={wizard.conceptIdea}
                        onChange={(e) => wizard.setConceptIdea(e.target.value)}
                        placeholder={m.microWizard.conceptTopicPlaceholder}
                      />
                    </label>
                  ) : (
                    <label>
                      <span className="pg-label">
                        {m.wizard.productLabelRequired}
                        <span className="pg-label-req" aria-hidden>
                          *
                        </span>
                      </span>
                      <input
                        className="pg-input"
                        value={wizard.product}
                        onChange={(e) => wizard.setProduct(e.target.value)}
                        placeholder={m.wizard.productPlaceholder}
                      />
                    </label>
                  )}
                  <label>
                    <span className="pg-label">
                      {pg.hookLabel}
                      <span className="pg-label-req" aria-hidden>
                        *
                      </span>
                    </span>
                    <input
                      className="pg-input"
                      value={wizard.headline}
                      onChange={(e) => wizard.setHeadline(e.target.value)}
                      placeholder={m.wizard.headlinePlaceholder}
                    />
                  </label>
                  <label>
                    <span className="pg-label">{pg.supportingLabel}</span>
                    <textarea
                      className="pg-textarea"
                      rows={3}
                      value={wizard.subline}
                      onChange={(e) => wizard.setSubline(e.target.value.slice(0, 200))}
                      placeholder={m.wizard.sublinePlaceholder}
                    />
                    <p className="pg-count">{wizard.subline.length} / 200</p>
                  </label>
                  {showConceptShopFields ? (
                    <>
                      <label>
                        <span className="pg-label">
                          {m.wizard.businessLabel}
                          <span className="pg-label-opt">{pg.extraOptional}</span>
                        </span>
                        <input
                          className="pg-input"
                          value={wizard.business}
                          onChange={(e) => wizard.setBusiness(e.target.value)}
                          placeholder={m.wizard.businessPlaceholder}
                        />
                      </label>
                      <label>
                        <span className="pg-label">
                          {m.wizard.offerLabel}
                          <span className="pg-label-opt">{pg.extraOptional}</span>
                        </span>
                        <input
                          className="pg-input"
                          value={wizard.offer}
                          onChange={(e) => wizard.setOffer(e.target.value)}
                          placeholder={m.wizard.offerPlaceholder}
                        />
                      </label>
                    </>
                  ) : null}
                  <label>
                    <span className="pg-label">
                      {pg.extraLabel}
                      <span className="pg-label-opt">{pg.extraOptional}</span>
                    </span>
                    <textarea
                      className="pg-textarea"
                      rows={3}
                      value={wizard.promptExtra}
                      onChange={(e) => wizard.setPromptExtra(e.target.value)}
                      placeholder={m.wizard.requirementsPlaceholder}
                    />
                    <p className="pg-count">{wizard.promptExtra.length}</p>
                  </label>
                </div>
              </div>
            </section>

            {combinedStoryboard ? (
              <section className="pg-card">
                <div className="pg-content-row">
                  <div className="pg-content-aside">
                    <span className="pg-card-icon">
                      <SectionIcon kind="output" />
                    </span>
                    <h3 className="pg-card-title">{pg.storyboardTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{pg.storyboardHint}</p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">
                        {m.wizard.storyboardBriefLabel}
                        <span className="ml-1 font-normal text-slate-400">{pg.extraOptional}</span>
                      </span>
                      <textarea
                        className="pg-textarea"
                        rows={3}
                        value={wizard.storyboardBrief}
                        onChange={(e) => wizard.setStoryboardBrief(e.target.value)}
                        placeholder={m.wizard.storyboardBriefPlaceholder}
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <label className="text-sm text-slate-700">
                        <span className="mb-1 block text-xs font-medium text-slate-600">
                          {m.wizard.storyboardTrimDurationLabel}
                        </span>
                        <select
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                          value={wizard.storyboardTrimDuration}
                          onChange={(e) =>
                            wizard.setStoryboardTrimDuration(
                              e.target.value as typeof wizard.storyboardTrimDuration,
                            )
                          }
                        >
                          {["6", "8", "10", "12"].map((n) => (
                            <option key={n} value={n}>
                              {n}s
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-slate-700">
                        <span className="mb-1 block text-xs font-medium text-slate-600">
                          {m.wizard.storyboardSceneCountLabel}
                        </span>
                        <select
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                          value={wizard.storyboardSceneCount}
                          onChange={(e) =>
                            wizard.setStoryboardSceneCount(
                              e.target.value as typeof wizard.storyboardSceneCount,
                            )
                          }
                        >
                          {STORYBOARD_SCENE_COUNTS.map((n) => (
                            <option key={n} value={n}>
                              {n === "auto" ? m.wizard.storyboardSceneCountAuto : n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500">{m.wizard.storyboardSceneCountHint}</p>

                    <p className="text-xs leading-relaxed text-violet-800/90">
                      {m.wizard.storyboardPlanReviewHint}
                    </p>
                    <button
                      type="button"
                      disabled={
                        wizard.planStoryboardBusy ||
                        wizard.imageBusy ||
                        Boolean(wizard.imageGenerateDisabledReason)
                      }
                      onClick={() => void wizard.planStoryboard()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                      {wizard.planStoryboardBusy
                        ? m.wizard.storyboardPlanBusy
                        : wizard.storyboardPlan
                          ? m.wizard.storyboardPlanReplanBtn
                          : m.wizard.storyboardPlanBtn}
                    </button>

                    {wizard.storyboardPlan ? (
                      <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                        <label className="block text-xs font-medium text-slate-700">
                          {m.wizard.storyboardPlanThemeLabel}
                          <input
                            value={wizard.storyboardPlan.theme}
                            onChange={(e) =>
                              wizard.setStoryboardPlan({
                                ...wizard.storyboardPlan!,
                                theme: e.target.value,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                          />
                        </label>
                        {wizard.storyboardPlan.scenes.map((scene, i) => (
                          <div
                            key={`plan-scene-${scene.imageIndex}`}
                            className="rounded-lg border border-violet-100 bg-white p-2.5"
                          >
                            <p className="text-xs font-semibold text-slate-800">
                              {m.wizard.storyboardSceneLabel} {scene.imageIndex} ·{" "}
                              {scene.startSec}–{scene.endSec}s
                              {scene.role ? ` · ${scene.role}` : ""}
                            </p>
                            <label className="mt-1.5 block text-[11px] text-slate-600">
                              {m.wizard.storyboardPlanSceneDescLabel}
                              <textarea
                                value={scene.sceneDescriptionZh}
                                onChange={(e) =>
                                  wizard.updateStoryboardPlanScene(i, {
                                    sceneDescriptionZh: e.target.value,
                                  })
                                }
                                rows={2}
                                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                              />
                            </label>
                            <label className="mt-1.5 block text-[11px] text-slate-600">
                              {m.wizard.storyboardPlanCopyLabel}
                              <input
                                value={scene.onImageCopyZh ?? ""}
                                onChange={(e) =>
                                  wizard.updateStoryboardPlanScene(i, {
                                    onImageCopyZh: e.target.value,
                                  })
                                }
                                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {!combinedStoryboard ? (
            <section className="pg-card">
              <div className="pg-content-row pg-content-row--center">
                <div className="pg-content-aside">
                  <span className="pg-card-icon">
                    <SectionIcon kind="output" />
                  </span>
                  <h3 className="pg-card-title">{pg.outputTypeTitle}</h3>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="pg-output-grid">
                    {outputModes.map((mode) => {
                      const copy = m.wizard.imageOutputModes[mode];
                      const selected = wizard.imageOutputMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => wizard.setImageOutputMode(mode)}
                          className={`pg-output-card${selected ? " is-selected" : ""}`}
                        >
                          {selected ? <CheckBadge /> : null}
                          <span className="pg-output-icon">{OUTPUT_ICONS[mode]}</span>
                          <span className="pg-output-copy">
                            <strong>{copy.title}</strong>
                            <span>{copy.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {wizard.imageOutputMode === "teaching-carousel" ? (
                    <label className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      <span className="font-medium">{m.wizard.teachingCarouselSlideCountLabel}</span>
                      <select
                        value={wizard.referenceCarouselSlideCount}
                        onChange={(e) =>
                          wizard.setReferenceCarouselSlideCount(Number(e.target.value))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                      >
                        {[4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {m.wizard.teachingCarouselSlideCountOption.replace(
                              "{count}",
                              String(n),
                            )}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
            </section>
            ) : null}

            <section className="pg-card">
              <div className="pg-content-row">
                <div className="pg-content-aside">
                  <span className="pg-card-icon">
                    <SectionIcon kind="upload" />
                  </span>
                  <h3 className="pg-card-title">
                    {isConcept ? pg.productPhotosOptionalTitle : pg.productPhotosTitle}
                  </h3>
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {pg.mainPhotoRowLabel}
                      {isConcept ? (
                        <span className="ml-1.5 font-medium text-slate-500">
                          ({pg.mainPhotoOptional})
                        </span>
                      ) : (
                        <>
                          <span className="pg-label-req" aria-hidden>
                            *
                          </span>
                          <span className="ml-1.5 font-medium text-violet-600">
                            ({pg.mainPhotoRequired})
                          </span>
                        </>
                      )}
                    </p>
                    <input
                      id={mainInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={onMainFile}
                    />
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {mainThumb ? (
                        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-violet-400 ring-1 ring-violet-300">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mainThumb.url} alt="" className="h-full w-full object-cover" />
                          <span className="absolute left-1 top-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                            {pg.mainPhotoBadge}
                          </span>
                          <button
                            type="button"
                            onClick={removeMain}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-[10px] text-white"
                            aria-label={m.wizard.uploadChange}
                          >
                            ×
                          </button>
                          <label
                            htmlFor={mainInputId}
                            className="absolute inset-x-0 bottom-0 cursor-pointer bg-slate-900/55 py-0.5 text-center text-[9px] font-semibold text-white"
                          >
                            {m.wizard.uploadChange}
                          </label>
                        </div>
                      ) : (
                        <label
                          htmlFor={mainInputId}
                          className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/70 px-1 text-center text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-7 w-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            aria-hidden
                          >
                            <path
                              d="M7.5 16.2A4.2 4.2 0 0 1 8.2 8a5 5 0 0 1 9.5 1.4 3.4 3.4 0 0 1 .8 6.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 19.2V12.4M9.6 14.6 12 12.2l2.4 2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {pg.dragDrop}
                        </label>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {isConcept ? pg.conceptMainPhotoOptionalHint : pg.mainPhotoHint}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {pg.anglePhotoRowLabel}
                      <span className="pg-label-opt">({pg.anglePhotoOptional})</span>
                    </p>
                    <input
                      id={angleInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={onAngleFiles}
                    />
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {angleThumbs.map((thumb) => (
                        <div
                          key={thumb.key}
                          className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb.url} alt="" className="h-full w-full object-cover" />
                          <span className="absolute left-1 top-1 rounded-md bg-slate-700/80 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                            {pg.anglePhotoBadge}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAngle(thumb.key)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-[10px] text-white"
                            aria-label={m.wizard.uploadChange}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label
                        htmlFor={angleInputId}
                        className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/70 px-1 text-center text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          aria-hidden
                        >
                          <path
                            d="M7.5 16.2A4.2 4.2 0 0 1 8.2 8a5 5 0 0 1 9.5 1.4 3.4 3.4 0 0 1 .8 6.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 19.2V12.4M9.6 14.6 12 12.2l2.4 2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {pg.addMore}
                      </label>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">{pg.anglePhotoHint}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="pg-card">
              <div className="pg-content-row">
                <div className="pg-content-aside">
                  <span className="pg-card-icon">
                    <SectionIcon kind="options" />
                  </span>
                  <h3 className="pg-card-title">{pg.imageOptionsTitle}</h3>
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{pg.styleLabel}</p>
                    <div className="pg-style-row">
                      {ART_STYLE_IDS.map((id: ArtStyleId) => {
                        const def = getArtStyle(id);
                        const copy = m.wizard.artStyles[id];
                        const selected = wizard.artStyleId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => wizard.setArtStyleId(id)}
                            className={`pg-style-card${selected ? " is-selected" : ""}`}
                          >
                            {selected ? <CheckBadge /> : null}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={def.previewSrc} alt="" />
                            <span>{copy.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">{pg.aspectLabel}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {IMAGE_ASPECT_RATIOS.map((ratio: ImageAspectRatio) => {
                        const copy = m.wizard.imageAspectRatios[ratio];
                        const selected = wizard.imageAspectRatio === ratio;
                        const frameStyle =
                          ratio === "9:16"
                            ? { width: 18, height: 32 }
                            : ratio === "4:5"
                              ? { width: 22, height: 28 }
                              : { width: 26, height: 26 };
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => wizard.setImageAspectRatio(ratio)}
                            className={`relative rounded-xl border px-2 py-3 text-center transition ${
                              selected
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 bg-white text-slate-400 hover:border-violet-200"
                            }`}
                          >
                            {selected ? <CheckBadge /> : null}
                            <span className="pg-aspect-frame block" style={frameStyle} />
                            <span className="block text-sm font-bold text-slate-900">{ratio}</span>
                            <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                              {copy.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">{pg.textModeLabel}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          [
                            "integrated",
                            m.wizard.imageTextModeIntegrated,
                            m.wizard.imageTextModeIntegratedHint,
                          ],
                          [
                            "textless",
                            m.wizard.imageTextModeTextless,
                            m.wizard.imageTextModeTextlessHint,
                          ],
                        ] as Array<[ImageTextMode, string, string]>
                      ).map(([mode, title, hint]) => {
                        const selected = wizard.imageTextMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => wizard.setImageTextMode(mode)}
                            className={`relative flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                              selected
                                ? "border-violet-500 bg-violet-50"
                                : "border-slate-200 bg-white hover:border-violet-200"
                            }`}
                          >
                            {selected ? <CheckBadge /> : null}
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                selected
                                  ? "bg-violet-600 text-white"
                                  : "bg-violet-100 text-violet-700"
                              }`}
                              aria-hidden
                            >
                              T
                            </span>
                            <span className="min-w-0 pr-4">
                              <span className="block text-sm font-semibold text-slate-900">
                                {title}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {showBrandWebsite ? (
              <section className="pg-card">
                <div className="pg-card-title-row">
                  <span className="pg-card-icon">
                    <SectionIcon kind="content" />
                  </span>
                  <h3 className="pg-card-title">{m.wizard.brandFitTitle}</h3>
                </div>
                <div className="mt-3">
                  <BrandWebsitePanel />
                </div>
              </section>
            ) : null}
          </div>

          <aside className="pg-tip-wrap">
            <div className="pg-tip-card">
              <div className="pg-tip-head">
                <span className="pg-tip-head-icon" aria-hidden>
                  <TipSvg kind="bulb" />
                </span>
                <p className="text-sm font-bold text-violet-800">{m.wizard.sidePanelRequirementsTitle}</p>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  {
                    ok: Boolean(
                      wizard.product.trim() ||
                        wizard.conceptIdea.trim() ||
                        wizard.effectivePromoteName,
                    ),
                    label: isConcept
                      ? m.microWizard.conceptNameStep.label
                      : m.microWizard.productNameStep.label,
                  },
                  {
                    ok: isConcept || Boolean(wizard.productPhoto || wizard.uploadPreviewUrl),
                    label: m.wizard.videoKeyframeLabel,
                  },
                  {
                    ok: !wizard.imageGenerateDisabledReason,
                    label: m.wizard.sidePanelReqReady,
                  },
                ].map((row) => (
                  <li key={row.label} className="flex items-start gap-2 text-xs">
                    <span
                      className={`mt-0.5 font-bold ${row.ok ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {row.ok ? "✓" : "✕"}
                    </span>
                    <span className={row.ok ? "text-slate-700" : "text-amber-800"}>
                      {row.label}{" "}
                      <span className="text-slate-400">
                        ({row.ok ? m.wizard.sidePanelReqReady : m.wizard.sidePanelReqMissing})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl border border-violet-100 bg-white px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  {m.wizard.sidePanelCostTitle}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {m.wizard.tokenCostHint.replace(
                    "{n}",
                    String(
                      estimateImageTokens({
                        mode:
                          wizard.workflowMode === "combined" || wizard.isStoryboardOutput
                            ? "storyboard"
                            : wizard.effectiveImageOutputMode === "ab"
                              ? "ab"
                              : wizard.effectiveImageOutputMode === "campaign"
                                ? "campaign"
                                : wizard.effectiveImageOutputMode === "teaching-carousel"
                                  ? "teaching_carousel"
                                  : "single",
                        sceneCount: wizard.storyboardScenes.length || 4,
                      }),
                    ),
                  )}
                </p>
              </div>
              <p className="mt-4 text-sm font-bold text-violet-800">{m.wizard.sidePanelTipsTitle}</p>
              <div className="mt-2.5 space-y-3.5">
                {(isConcept
                  ? [
                      { tip: pg.conceptTip1, icon: "photo" as const },
                      { tip: pg.conceptTip2, icon: "hook" as const },
                      { tip: pg.conceptTip3, icon: "grid" as const },
                      { tip: pg.conceptTip4, icon: "ai" as const },
                    ]
                  : [
                      { tip: pg.tip1, icon: "photo" as const },
                      { tip: pg.tip2, icon: "hook" as const },
                      { tip: pg.tip3, icon: "grid" as const },
                      { tip: pg.tip4, icon: "ai" as const },
                    ]
                ).map(({ tip, icon }) => (
                  <div key={tip.title} className="flex gap-2.5">
                    <span className="pg-tip-icon" aria-hidden>
                      <TipSvg kind={icon} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{tip.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{tip.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pg-secure">
              <span className="pg-secure-icon" aria-hidden>
                <TipSvg kind="shield" />
              </span>
              <p className="text-xs leading-relaxed text-slate-600">{pg.secureNote}</p>
            </div>
            {onGenerate ? (
              <div className="pg-desktop-generate flex flex-col gap-2.5">
                {generateBlockMessage ? (
                  <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
                    {generateBlockMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={generateDisabled}
                  className="pg-generate-btn"
                >
                  {generateLabel ?? m.wizard.generateImageBtn}
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M7.5 4.5 13 10l-5.5 5.5" />
                  </svg>
                </button>
              </div>
            ) : null}
          </aside>
        </div>

        {onGenerate ? (
          <div className="pg-mobile-cta">
            {generateBlockMessage ? (
              <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                {generateBlockMessage}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onGenerate}
              disabled={generateDisabled}
              className="pg-generate-btn"
            >
              {generateLabel ?? m.wizard.generateImageBtn}
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7.5 4.5 13 10l-5.5 5.5" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
