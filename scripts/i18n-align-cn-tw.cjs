/**
 * Align zh-cn to Mainland copy guide (点数 unit) and generate zh-tw (Taiwan Mandarin).
 * Only rewrites string / template-literal contents — property keys stay intact.
 *
 * Usage: node scripts/i18n-align-cn-tw.mjs
 */
const fs = require("fs");
const path = require("path");
const OpenCC = require("opencc-js");

const root = path.join(__dirname, "..");
const zhCnPath = path.join(root, "lib/i18n/zh-cn.ts");
const zhTwPath = path.join(root, "lib/i18n/zh-tw.ts");

/** Ordered phrase replacements for Mainland Simplified (PDF + 点数). */
const CN_PHRASES = [
  // Longer / specific first
  ["点额度", "点数"],
  ["AI Tokens 点计", "AI 点数怎么算"],
  ["Token 计费", "点数计费"],
  ["Token 余额", "点数余额"],
  ["token 余额", "点数余额"],
  ["免费注册 token", "免费注册点数"],
  ["订阅 token", "订阅点数"],
  ["Token 加购", "点数加购"],
  ["计划包月 token", "计划包月点数"],
  ["免费 tokens", "免费点数"],
  ["用完可加购", "用完可加购"],
  ["全部用 Tokens", "全部按点数计费"],
  ["大量 token", "大量点数"],
  ["多用 token", "多用点数"],
  ["花 token", "消耗点数"],
  ["扣 tokens", "扣点数"],
  ["未扣 tokens", "未扣点数"],
  ["不会扣 tokens", "不会扣点数"],
  ["tokens", "点数"],
  ["Tokens", "点数"],
  ["token", "点数"],
  ["Token", "点数"],

  ["创作路径", "创作方式"],
  ["創作路徑", "创作方式"],
  ["选择创作路径", "选择创作方式"],
  ["揀創作路徑", "选择创作方式"],
  ["即时研究", "查找热门内容"],
  ["即時研究", "查找热门内容"],
  ["用这个方向", "选择此风格"],
  ["用呢個方向", "选择此风格"],
  ["运作方式", "使用方法"],
  ["點樣運作", "使用方法"],
  ["看看点运作", "查看使用方法"],
  ["点解 ", "为什么"],
  ["点解", "为什么"],

  ["相片", "图片"],
  ["实体货", "实物产品"],
  ["真實貨品", "实物产品"],
  ["真实货品", "实物产品"],
  ["实体 SKU", "实物产品"],
  ["帖文", "帖子"],

  // HK/Cantonese leftovers → Mandarin
  ["设定", "设置"],
  ["影片简报", "视频简报"],
  ["制作影片", "制作视频"],
  ["生成影片", "生成视频"],
  ["分镜设定", "分镜设置"],
  ["影片 Reel", "短视频"],
  ["只要相片、只要影片", "只生成图片、只生成视频"],
  ["只要图、只要片", "只生成图片、只生成视频"],
  ["先图再片", "先生成图片再制作视频"],
  ["跑相片和／或影片", "生成图片和／或视频"],
  ["分镜短片", "分镜视频"],
  ["条分镜短片", "条分镜视频"],
  ["参考片", "参考视频"],
  ["广告片", "广告视频"],
  ["短片", "短视频"],
  ["影片", "视频"], // after more specific 影片 phrases

  ["简体", "简体中文"], // lang label — applied carefully below
];

/** Taiwan-specific after OpenCC cn→tw (Traditional). */
const TW_PHRASES = [
  ["點額度", "點數"],
  ["視頻", "影片"], // TW prefers 影片
  ["資訊資訊", "資訊"],
  ["軟體軟體", "軟體"],
  ["繁體中文（台灣）", "繁體中文（台灣）"],
];

function transformQuotedStrings(source, mapFn) {
  // Double/single quoted strings (no nested templates complexity)
  return source.replace(/(["'])((?:\\.|(?!\1).)*)\1/g, (full, q, inner) => {
    // Skip import paths and pure ASCII identifiers-looking URLs
    if (/^(https?:|\.\/|\.\.\/|\/)/.test(inner)) return full;
    const next = mapFn(inner);
    return q + next + q;
  });
}

function applyPhrases(text, pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    if (!from) continue;
    out = out.split(from).join(to);
  }
  return out;
}

function alignZhCn(source) {
  let out = transformQuotedStrings(source, (s) => applyPhrases(s, CN_PHRASES));

  // Fix over-replacement on lang label if doubled
  out = out.replace(/简体中文中文/g, "简体中文");
  out = out.replace(/"zh-cn":\s*"简体中文中文"/g, '"zh-cn": "简体中文"');

  // Force PDF phase rails (property assignments)
  out = out.replace(
    /phases:\s*\[[^\]]*\]/,
    `phases: ["选择推广类型", "选择创作方式", "设置内容", "生成素材", "完成"]`,
  );
  out = out.replace(
    /phasesImage:\s*\[[^\]]*\]/,
    `phasesImage: ["选择推广类型", "选择创作方式", "设置内容", "生成图片", "下载使用"]`,
  );
  out = out.replace(
    /phasesVideo:\s*\[[^\]]*\]/,
    `phasesVideo: ["选择推广类型", "选择创作方式", "设置内容", "生成视频", "下载使用"]`,
  );
  out = out.replace(
    /phasesCombined:\s*\[[^\]]*\]/,
    `phasesCombined: ["选择推广类型", "选择创作方式", "设置内容", "确认分镜", "生成视频"]`,
  );

  // Secure note (PDF)
  out = out.replace(
    /secureNote:\s*"[^"]*"/,
    `secureNote: "你的素材仅用于内容生成，不会对外分享。"`,
  );

  return out;
}

function buildZhTw(zhCnSource) {
  const converter = OpenCC.Converter({ from: "cn", to: "tw" });
  let out = transformQuotedStrings(zhCnSource, (s) => {
    let t = converter(s);
    t = applyPhrases(t, TW_PHRASES);
    return t;
  });

  // Export rename
  out = out.replace(/export const zhCn\b/, "export const zhTw");
  out = out.replace(/\/\/ Simplified Chinese.*/, "// Traditional Chinese — Taiwan Mandarin (zh-TW)");

  // Lang labels inside file
  out = transformQuotedStrings(out, (s) => {
    if (s === "简体中文" || s === "簡體中文") return s; // keep other langs as-is in nested — fixed below
    return s;
  });

  // Force lang block entries for TW file
  out = out.replace(
    /lang:\s*\{[^}]*\}/m,
    `lang: {
    en: "English",
    zh: "繁體中文（香港）",
    "zh-cn": "简体中文",
    "zh-tw": "繁體中文（台灣）",
  }`,
  );

  // TW phase rails (Traditional + 影片)
  out = out.replace(
    /phases:\s*\[[^\]]*\]/,
    `phases: ["選擇推廣類型", "選擇創作方式", "設定內容", "產生素材", "完成"]`,
  );
  out = out.replace(
    /phasesImage:\s*\[[^\]]*\]/,
    `phasesImage: ["選擇推廣類型", "選擇創作方式", "設定內容", "產生圖片", "下載使用"]`,
  );
  out = out.replace(
    /phasesVideo:\s*\[[^\]]*\]/,
    `phasesVideo: ["選擇推廣類型", "選擇創作方式", "設定內容", "產生影片", "下載使用"]`,
  );
  out = out.replace(
    /phasesCombined:\s*\[[^\]]*\]/,
    `phasesCombined: ["選擇推廣類型", "選擇創作方式", "設定內容", "確認分鏡", "產生影片"]`,
  );

  out = out.replace(
    /secureNote:\s*"[^"]*"/,
    `secureNote: "你的素材僅用於內容產生，不會對外分享。"`,
  );

  return out;
}

function patchLangInZhCn(source) {
  return source.replace(
    /lang:\s*\{[^}]*\}/m,
    `lang: {
    en: "English",
    zh: "繁體中文（香港）",
    "zh-cn": "简体中文",
    "zh-tw": "繁體中文（台灣）",
  }`,
  );
}

function main() {
  const raw = fs.readFileSync(zhCnPath, "utf8");
  let zhCn = alignZhCn(raw);
  zhCn = patchLangInZhCn(zhCn);
  fs.writeFileSync(zhCnPath, zhCn);
  console.log("Updated", zhCnPath);

  const zhTw = buildZhTw(zhCn);
  fs.writeFileSync(zhTwPath, zhTw);
  console.log("Wrote", zhTwPath);
}

main();
