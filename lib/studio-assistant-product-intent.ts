/** User describes a real SKU / product — not a website or abstract concept. */
export function isPhysicalProductRequest(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const hasProductNoun =
    /\b(product|sku|item|goods|supplement|serum|blender|bracelet|nasal|washer|bottle|kit|skincare)\b/i.test(
      t,
    ) ||
    /\b(實體|实体|商品|產品|产品|護膚|护肤|洗鼻|货品|貨品)\b/.test(t);
  return (
    /\b(my|our|the|a)\s+product\b/i.test(t) ||
    /\bmy product is\b/i.test(t) ||
    /\bsell\s+physical\b/i.test(t) ||
    /\bproduct\s+(photo|shot|image|images|post|ad|pack|packshot|picture|pictures|video|launch)\b/i.test(
      t,
    ) ||
    /\b(post|posts|carousel|images?|photos?|pictures?).{0,50}\b(product|sku|item|goods)\b/i.test(t) ||
    /\b(product|sku|item|goods).{0,50}\b(post|posts|images?|photos?|pictures?|ad|launch)\b/i.test(t) ||
    /\b(build|create|make|generate|need)\s+(a\s+)?(post|images?|photos?|content)\b/i.test(t) &&
      hasProductNoun ||
    /\b(build|create|make)\s+(a\s+)?(post|images?|photos?).{0,40}\bproduct\b/i.test(t) ||
    /\b(carousel|instagram|social).{0,40}\b(product|photos?|images?)\b/i.test(t) ||
    /\b(product|photos?|images?).{0,40}\b(carousel|instagram|social)\b/i.test(t) ||
    /\b(nasal|packshot|merchandise|sku|實體|实体|商品|產品圖|产品图|產品相|产品照|護膚|护肤|洗鼻)\b/i.test(
      t,
    ) ||
    /\bproduct photo|physical product|physical goods|實體產品|实体产品|實體貨|实体货/i.test(t) ||
    /\b(generate|need)\s+product\s+images?\b/i.test(t)
  );
}

/** Social/static image post — not a video Reel. */
export function wantsImageOnlyPost(text: string): boolean {
  if (/storyboard|分鏡|分镜|multi.?scene|多場|多场/i.test(text)) return false;
  if (/video|reel|影片|视频|8\s*s|tiktok|seedance/i.test(text)) return false;
  if (/\bad\b/i.test(text) && !/\bimage.?only|只出圖|只出图|carousel|图文|圖文|static\b/i.test(text)) {
    return false;
  }
  return (
    /\b(post|posts)\s+with\s+(images?|photos?)\b/i.test(text) ||
    /\bimage\s+post\b/i.test(text) ||
    /\bimages?\s+about\b/i.test(text) ||
    /\b(build|create|make|help me build)\s+(a\s+)?post\b/i.test(text) ||
    /\bpromotion\s+on\s+(the\s+)?post\b/i.test(text) ||
    /\bpost\s+with\s+my\s+product\b/i.test(text) ||
    /\bcarousel\b/i.test(text) ||
    /\b(static|still)\s+(post|image|photo)\b/i.test(text) ||
    /(图文帖|圖文帖|只出圖|只出图|图文|圖文)/.test(text) ||
    /\bgenerate\s+product\s+images?\b/i.test(text) ||
    /\b(image.?only|photo.?only|海报|海報|posters?)\b/i.test(text) ||
    (/\b(photos?|images?|pictures?)\b/i.test(text) &&
      /\b(for|of|about)\s+(my\s+)?(product|instagram|social|supplement|serum|skincare)\b/i.test(text))
  );
}

export function inferPhysicalProductName(text: string): string | undefined {
  const patterns = [
    /\babout my product\s+(.+?)(?:[.!?]|$)/i,
    /\bmy product\s+(.+?)(?:[.!?]|$)/i,
    /\bfor my\s+(.+?)\s+product\b/i,
    /\bcalled\s+(.+?)(?:[.!?]|$)/i,
    /叫[「「]?(.+?)[」」]?(?:[.!?]|$)/,
    /產品叫(.+?)(?:[.!?]|$)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const name = m?.[1]?.trim();
    if (name && name.length >= 2 && name.length <= 80) return name;
  }
  return undefined;
}

/** e.g. 產品是洗鼻器 / product is nasal rinse */
export function inferProductFromMessage(text: string): string | undefined {
  const fromNamed = inferPhysicalProductName(text) ?? inferProductCalled(text);
  if (fromNamed) return fromNamed;

  const patterns = [
    /(?:產品|产品)(?:是|為|为)\s*[「「""]?([^，,。.!?；;賣卖賣点卖点」」""\n]+)/,
    /(?:product)\s+(?:is|:)\s*[""]?([^,.!?\n]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const name = m?.[1]?.trim();
    if (name && name.length >= 2 && name.length <= 80) return name;
  }
  return undefined;
}

/** e.g. 賣點是溫和洗鼻 */
export function inferSellingPointsFromMessage(text: string): string | undefined {
  const patterns = [
    /(?:賣點|卖点)(?:是|為|为)\s*[「「""]?([^。.!?\n]+)/,
    /(?:selling point(?:s)?)\s*(?:is|:)\s*[""]?([^.\n]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const points = m?.[1]?.trim();
    if (points && points.length >= 2 && points.length <= 200) return points;
  }
  return undefined;
}

/** e.g. "product called 風鈴手串" */
export function inferProductCalled(text: string): string | undefined {
  const m = text.match(/\bcalled\s+(.+?)(?:[.!?]|$)/i);
  const name = m?.[1]?.trim();
  if (name && name.length >= 2 && name.length <= 80) return name;
  return undefined;
}
