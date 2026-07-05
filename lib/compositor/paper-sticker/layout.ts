/** 9:16 canvas — matches IG reel export size */
export const W = 1080;
export const H = 1920;

export const PAPER = {
  x: 56,
  y: 260,
  width: 968,
  height: 1380,
};

/** Circular product sticker — centered, overlapping top of paper (IG-style) */
export const STICKER = {
  cx: PAPER.width / 2,
  cy: 210,
  r: 200,
  ring: 12,
  glow: 18,
};

export const TEXT = {
  headlineY: 460,
  headlineSize: 64,
  headlineMaxChars: 14,
  headlineMaxLines: 3,
  bulletsX: 88,
  bulletsStartY: 640,
  bulletSize: 30,
  bulletLineHeight: 46,
  bulletMaxChars: 22,
  footerY: 1240,
  brandSize: 26,
  signoffSize: 38,
};

export const VIDEO = {
  fps: 24,
  durationSec: 6,
};
