import {
  inferProductFromMessage,
  isPhysicalProductRequest,
  wantsImageOnlyPost,
} from "@/lib/studio-assistant-product-intent";
import { isReferenceAdRequest } from "@/lib/studio-assistant-reference-intent";

export type StudioAssistantIntent =
  | "website_video"
  | "website_image"
  | "physical_product"
  | "physical_image_post"
  | "captions_only"
  | "edit_image"
  | "reference_ad"
  | "pro_canvas"
  | "brand_kit"
  | "pricing"
  | "library"
  | "ugc"
  | "general";

export function detectStudioAssistantIntent(text: string): StudioAssistantIntent {
  if (
    /edit.?image|image editor|修圖|修图|改圖|改图|inpaint|摳圖|抠图|去水印|水印|watermark|圖像編輯|图像编辑|canvas editor/i.test(
      text,
    )
  ) {
    return "edit_image";
  }
  if (/brand.?kit|品牌套件|品牌 kit|logo kit|品牌色|brand colors/i.test(text)) {
    return "brand_kit";
  }
  if (
    /\/pricing\b|how much|price|pricing|價錢|价钱|多少钱|多少錢|方案|月費|月费|yearly|annual/i.test(
      text,
    )
  ) {
    return "pricing";
  }
  if (/\/library\b|作品庫|作品库|my library|asset library|我的作品/i.test(text)) {
    return "library";
  }
  if (/\/ugc\b|ugc studio|talking presenter|口播|数字人|數字人|presenter video/i.test(text)) {
    return "ugc";
  }
  if (/caption|subtitle|字幕|燒錄|烧录|加字/.test(text)) {
    const wantsFreshGeneration =
      /generate|make|create|出.*新|生成.*视频|生成.*影片|重新出片/i.test(text) &&
      !/import|匯入|导入|existing|已有|my video|我的.*片|uploaded|已上传|已上傳/i.test(text);
    if (!wantsFreshGeneration) return "captions_only";
  }
  if (/\/ultra\b|\/pro\b|ultra canvas|pro canvas|Ultra 畫布|Ultra 画布|節點|节点|node canvas|畫布|画布/.test(text)) {
    return "pro_canvas";
  }
  if (isReferenceAdRequest(text)) {
    return "reference_ad";
  }
  if (/storyboard|分鏡|分镜|multi.?scene|多場|多场/i.test(text)) {
    return "physical_product";
  }

  if (isPhysicalProductRequest(text)) {
    if (isReferenceAdRequest(text)) return "reference_ad";
    if (wantsImageOnlyPost(text)) return "physical_image_post";
    return "physical_product";
  }

  if (
    /https?:\/\//i.test(text) ||
    /網站|网站|website|homepage|landing page|saas|app launch|服務|服务|concept|概念/.test(
      text,
    )
  ) {
    if (/static|靜態|静态|poster|海報|海报|image only|只出圖|只出图|mockup|上線圖|上线图/.test(text)) {
      return "website_image";
    }
    return "website_video";
  }

  if (
    /product photo|packshot|bracelet|jewelry|首飾|首饰|水晶|crystal|sku|實體|实体|physical|商品|包裝|包装/.test(
      text,
    )
  ) {
    return "physical_product";
  }
  if (wantsImageOnlyPost(text) && /產品|产品|洗鼻|護膚|护肤|货品|貨品|商品/.test(text)) {
    return "physical_image_post";
  }
  if (/產品圖|产品图/.test(text) && !/(图文|圖文|帖)/.test(text)) {
    return "physical_product";
  }
  if (/video|reel|影片|视频|短片|tiktok|ig|instagram|fb/.test(text)) {
    return "general";
  }
  return "general";
}
