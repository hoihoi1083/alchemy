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
  | "reference_ad"
  | "pro_canvas"
  | "general";

export function detectStudioAssistantIntent(text: string): StudioAssistantIntent {
  if (/caption|subtitle|字幕|燒錄|烧录|加字/.test(text) && !/video|影片|视频|reel/i.test(text)) {
    return "captions_only";
  }
  if (/\/pro\b|pro canvas|節點|节点|node canvas|畫布|画布/.test(text)) {
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
