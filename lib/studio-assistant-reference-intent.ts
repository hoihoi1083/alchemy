/** User wants to mimic a reference ad layout (XHS / IG carousel style). */
export function isReferenceAdRequest(text: string): boolean {
  return /reference ad|reference layout|layout reference|參考排版|参考排版|參考廣告|参考广告|排版廣告|排版广告|reference video|對標|对标|like this ad|照抄|复刻|複刻|同款排版|小紅書|小红书|xhs/i.test(
    text,
  );
}
