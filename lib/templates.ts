import type { ImageInputMode } from "@/lib/image-input-mode";
import { getTemplateConfig } from "@/lib/template-slots";

export type TemplateId =
  | "paper-sticker-reel"
  | "product-reel"
  | "crystal-promo"
  | "shop-promo"
  | "info-poster"
  | "designed-poster"
  | "parts-poster"
  | "gaming-cover"
  | "sports-big-words"
  | "jelly-3d"
  | "type-force"
  | "spatial-layout"
  | "photo-doodle"
  | "light-trail"
  | "screen-break"
  | "material-letters"
  | "type-interaction"
  | "product-lifestyle"
  | "product-hold-poster"
  | "mold-word-poster"
  | "deconstruct-archive-poster"
  | "orbit-type-poster"
  | "cloche-reveal-poster"
  | "brand-fit"
  | "brand-campaign"
  | "brand-video"
  | "creative-video"
  | "storyboard-video"
  | "model-wear-reel"
  | "ugc-presenter-reel"
  | "testimonial"
  | "service-promo"
  | "pricing-offer"
  | "website-launch"
  | "explosion-unbox-reel"
  | "custom";

export type MarketingTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  aspectRatio: string;
  duration: string;
  fast: boolean;
  resolution: string;
  motionStrength: number;
  camera: string;
  avoidOnScreenText: boolean;
  generateAudio: boolean;
  imagePromptTemplate: string;
  imageEditPromptTemplate: string;
  videoPromptTemplate: string;
  negativePrompt: string;
};

export const VIDEO_BGM_HINT =
  ", soft instrumental background music only, no voiceover, no speech, no lyrics";

export const TEMPLATES: MarketingTemplate[] = [
  {
    id: "paper-sticker-reel",
    name: "Paper + sticker reel",
    description: "IG-style paper note, product sticker, cozy background — headline from your text.",
    icon: "📄",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical social ad, torn paper note collage style, cozy lifestyle background with book and warm bokeh. Headline theme: {{headline}}. {{subline}}. Product {{product}} as hero sticker with white outline, sparkles, no real human faces, 9:16",
    imageEditPromptTemplate:
      "Create a vertical IG-style ad: torn paper note layout, cozy background. Keep exact {{product}} from reference as sticker with white outline. Visual theme for text area: {{headline}} — {{subline}}. Match style reference if provided. No photorealistic faces. 9:16",
    videoPromptTemplate:
      "Gentle motion on {{product}} sticker ad, subtle paper float, sparkle twinkle, cozy background, stable camera, no new people or faces",
    negativePrompt:
      "real human face, portrait, celebrity, blurry, low quality, watermark, speech, voiceover",
  },
  {
    id: "product-reel",
    name: "Product showcase",
    description: "9:16 reel — hero product shot with gentle motion.",
    icon: "📦",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 30,
    camera: "Slow Push In",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate:
      "Professional product photography of {{product}}, centered composition, soft studio lighting, clean background, high-end commercial look, no text, no watermark, 9:16 vertical framing",
    imageEditPromptTemplate:
      "Enhance this photo into a premium vertical social ad. Keep the exact same {{product}} from the reference — same shape, colors, and materials. Do not replace it with a person or a different object. Clean studio background, soft lighting, commercial look, no text, no watermark, 9:16 vertical framing",
    videoPromptTemplate:
      "Slow cinematic push-in on {{product}}, subtle light shimmer, stable camera, premium commercial feel, no on-screen text, no subtitles, no logos",
    negativePrompt:
      "text, subtitles, logo, watermark, speech, voiceover, dialogue, lyrics, blurry, distorted hands, low quality, jitter",
  },
  {
    id: "crystal-promo",
    name: "Crystal / dark mood",
    description: "Dark luxury look — gold accents, bokeh, ideal for crystals and spiritual SMB.",
    icon: "💎",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 26,
    camera: "Slow Push In",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate:
      "Dark luxury product ad for {{product}}, black background with soft gold bokeh, crystal sparkle highlights, minimal text space, premium HK boutique aesthetic, 9:16 vertical",
    imageEditPromptTemplate:
      "Enhance for dark luxury crystal ad. Keep exact {{product}} from reference. Black/dark gradient background, gold accent lighting, subtle sparkle, premium mood. Theme: {{headline}}. No faces. 9:16 vertical",
    videoPromptTemplate:
      "Slow push-in on {{product}}, subtle sparkle shimmer, dark luxury mood, stable camera, no on-screen text",
    negativePrompt:
      "bright white background, cartoon, face, speech, voiceover, blurry, low quality",
  },
  {
    id: "shop-promo",
    name: "Shop / offer promo",
    description: "Vertical promo for a local business or limited-time offer.",
    icon: "🏪",
    aspectRatio: "9:16",
    duration: "8",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Pull Out",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate:
      "Welcoming storefront or service scene for {{business}}, warm inviting atmosphere, {{offer}} mood, professional marketing photo, no text on image, vertical 9:16",
    imageEditPromptTemplate:
      "Enhance this photo for a local business promo. Keep the same storefront, product, or scene from the reference — do not add people unless they are already in the photo. Warm inviting atmosphere for {{business}}, {{offer}} mood, no text on image, 9:16 vertical",
    videoPromptTemplate:
      "Gentle pull-out revealing {{business}} scene, warm lighting, calm promotional vibe, no text overlays, no subtitles",
    negativePrompt:
      "text, subtitles, watermark, speech, voiceover, dialogue, lyrics, chaotic motion, horror, low resolution",
  },
  {
    id: "info-poster",
    name: "Selling-points info graphic",
    description:
      "White-background IG info graphic — single theme, simplified copy, category visuals (anti-generic-AI layout).",
    icon: "📋",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 24,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Premium white-background vertical info poster for {{product}}. Single theme: {{headline}}. Selling points: {{subline}}. Clean hierarchy, airy layout, category-appropriate accents, not overcrowded.",
    imageEditPromptTemplate:
      "Create a premium white/off-white info poster. Keep exact {{product}} from reference. ONE headline theme: {{headline}}. Bullets: {{subline}}. Editorial IG carousel style, generous whitespace, accurate Chinese typography.",
    videoPromptTemplate:
      "Gentle push-in on {{product}} info poster, subtle sparkle, stable camera, preserve on-screen text legibility",
    negativePrompt:
      "cluttered layout, overcrowded text blocks, dark muddy background, neon gradients, generic AI template frame, watermark, social media UI, blurry illegible text, misspelled characters, cartoon, low quality, speech, voiceover",
  },
  {
    id: "designed-poster",
    name: "Commercial designed poster",
    description:
      "Commercial feed poster — bilingual type, circular seal, brush category matched to product (any category).",
    icon: "🪧",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical designed commercial poster for {{product}}. Category-matched hero photography, bilingual title {{headline}}, support {{subline}}, circular seal, brush category word. Soft upper-left light, not a blank catalog cutout, not food-only.",
    imageEditPromptTemplate:
      "Create a designed commercial poster. Keep exact {{product}} from IMAGE 1. Bilingual headline {{headline}}, support {{subline}}. Circular seal + brush category matching THIS product. Soft upper-left light; set must match product category (not forced food).",
    videoPromptTemplate:
      "Gentle push-in on {{product}} designed poster, soft steam or sauce drip, preserve on-screen text",
    negativePrompt:
      "blank white catalog cutout, cluttered Canva flyer, neon gradients, watermark, social UI, blurry illegible text, misspelled characters, plastic CGI food, low quality, speech, voiceover",
  },
  {
    id: "parts-poster",
    name: "Parts breakdown poster",
    description:
      "Exploded product view — labeled components with title and short descriptions on one poster.",
    icon: "🧩",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical parts-breakdown poster for {{product}}. Exploded components with callout labels, title {{headline}}, part descriptions {{subline}}. Technical commercial still, soft studio light.",
    imageEditPromptTemplate:
      "Create a parts-breakdown poster. Keep exact {{product}} from IMAGE 1 identity. Explode into labeled components with leader lines. Title {{headline}}. Part descriptions from {{subline}}. Technical commercial poster, not violent destruction.",
    videoPromptTemplate:
      "Gentle push-in on {{product}} parts-breakdown poster, preserve on-screen text and callouts",
    negativePrompt:
      "violent destruction, fire, debris chaos, blank catalog cutout, cluttered Canva flyer, neon gradients, watermark, social UI, blurry illegible text, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "gaming-cover",
    name: "Gaming cover poster",
    description:
      "AAA game-cover still — low-angle cinematic action, type baked into the scene, HUD accents.",
    icon: "🎮",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical AAA gaming cover for {{product}}. Theme {{headline}}. Support {{subline}}. Low-angle cinematic action, typography integrated into the 3D world, HUD accents.",
    imageEditPromptTemplate:
      "Create an AAA gaming cover poster. Keep exact {{product}} from IMAGE 1. Theme {{headline}}. Support {{subline}}. Low-angle cinematic action; bake type into crates/path/rocks; HUD/barcode accents.",
    videoPromptTemplate:
      "Gentle push-in on {{product}} gaming cover, preserve on-screen text and scene type",
    negativePrompt:
      "flat Canva flyer, cluttered collage, blank catalog cutout, watermark, social UI, blurry illegible text, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "sports-big-words",
    name: "Sports big-words poster",
    description:
      "Sports editorial still — huge layered word, athlete/action energy, HUD stats.",
    icon: "🏆",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical sports editorial poster for {{product}}. Huge integrated word from {{headline}}. Support {{subline}}. Low-angle action, HUD microcopy, sky/stadium energy.",
    imageEditPromptTemplate:
      "Create a sports big-words poster. Keep exact {{product}} from IMAGE 1 when present. One huge layered word from {{headline}}. Support {{subline}}. Layer type behind/around subject; HUD stats accents.",
    videoPromptTemplate:
      "Gentle push-in on {{product}} sports poster, preserve huge typography",
    negativePrompt:
      "plain catalog cutout, cluttered Canva flyer, tiny unreadable type, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "jelly-3d",
    name: "Jelly 3D poster",
    description:
      "Minimal glossy translucent 3D hero — soft shadow, sparse brand type.",
    icon: "🫧",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 24,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical minimal jelly/glass 3D poster for {{product}}. Theme {{headline}}. Sparse type {{subline}}. Single glossy translucent hero on clean ground, soft colored shadow.",
    imageEditPromptTemplate:
      "Create a jelly/glass 3D still. Hero inspired by {{product}} / {{headline}}. Sparse brand type {{subline}}. Glossy translucent materials, clean white ground, no busy lifestyle scene.",
    videoPromptTemplate:
      "Gentle push-in on jelly 3D hero, soft light shimmer, preserve type",
    negativePrompt:
      "busy lifestyle scene, cluttered flyer, neon cyberpunk city, watermark, social UI, blurry illegible text, low quality, speech, voiceover",
  },
  {
    id: "type-force",
    name: "Type force poster",
    description:
      "Giant in-scene type reacting to sound, refraction, tension, or shock.",
    icon: "🌊",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical type-force poster for {{product}}. Huge in-scene word from {{headline}}. Support {{subline}}. Type reacts to one physical force (product impact or spatial install); product and subject stay intact.",
    imageEditPromptTemplate:
      "Create a type-force poster. Keep exact {{product}} from IMAGE 1 when present. One huge in-scene word from {{headline}}. Support {{subline}}. Apply one clear force to typography only — product impact or spatial architecture install.",
    videoPromptTemplate:
      "Gentle push-in on type-force poster, preserve giant typography",
    negativePrompt:
      "flat overlay type, whole-frame liquify, warped subject, Canva flyer, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "spatial-layout",
    name: "Spatial layout poster",
    description:
      "Architectural type on planes, carved voids, extruded mass, or wrapped corners.",
    icon: "🏙️",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 26,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical spatial-layout poster for {{product}}. Giant architectural type from {{headline}}. Support {{subline}}. Type is planes / void / extrude / corner — not flat overlay.",
    imageEditPromptTemplate:
      "Create a spatial-layout poster. Keep exact {{product}} from IMAGE 1 when present. Giant architectural words from {{headline}}. Support {{subline}}. Type lives on concrete planes or as 3D mass.",
    videoPromptTemplate:
      "Gentle push-in on spatial-layout poster, preserve architectural typography",
    negativePrompt:
      "flat Canva overlay type, warped subject, busy flyer collage, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "photo-doodle",
    name: "Photo doodle poster",
    description:
      "Real photo scene + cute 2D cartoon overlays (commute, city-pop, people, nature).",
    icon: "✏️",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 26,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical photo-doodle poster for {{product}}. Real photographic scene with 2D cartoon doodles. Theme {{headline}}. Support {{subline}}. Photo stays real; doodles share the ground plane.",
    imageEditPromptTemplate:
      "Create a photo-doodle poster. Keep exact {{product}} / people from IMAGE 1 when present. Real photo base + thick-outline 2D doodle overlays. Theme {{headline}}. Support {{subline}}.",
    videoPromptTemplate:
      "Gentle push-in on photo-doodle poster, preserve photo + doodle layers",
    negativePrompt:
      "full-frame illustration, flat stickers with no perspective, giant architectural type, force-melted letters, watermark, social UI, low quality, speech, voiceover",
  },
  {
    id: "light-trail",
    name: "Light trail poster",
    description:
      "Dark cinematic still with crimson–cyan neon light trails and speed energy.",
    icon: "💫",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical light-trail cinematic poster for {{product}}. Dark teal base with crimson and cyan neon long-exposure streaks. Theme {{headline}}. Support {{subline}}. Subject stays photoreal under motion light.",
    imageEditPromptTemplate:
      "Create a light-trail cinematic poster. Keep exact {{product}} / people from IMAGE 1 when present. Dark cinematic still + crimson/cyan light trails. Theme {{headline}}. Support {{subline}}.",
    videoPromptTemplate:
      "Gentle push-in on light-trail poster, preserve neon streaks and subject identity",
    negativePrompt:
      "flat Canva neon stickers, giant architectural type, force-melted letters, cartoon doodles, gaming HUD, watermark, social UI, low quality, speech, voiceover",
  },
  {
    id: "screen-break",
    name: "Screen break poster",
    description:
      "Subject or product bursts through a profile tear or giant phone portal.",
    icon: "📱",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical screen-break poster for {{product}}. Subject or product bursts through a social-profile tear or giant phone portal. Theme {{headline}}. Support {{subline}}. Forced perspective + floating 3D UI chrome.",
    imageEditPromptTemplate:
      "Create a screen-break poster. Keep exact {{product}} / person from IMAGE 1 when present. Burst through torn profile UI or giant phone portal. Theme {{headline}}. Support {{subline}}.",
    videoPromptTemplate:
      "Gentle push-in on screen-break poster, preserve portal break and subject identity",
    negativePrompt:
      "flat Canva UI stickers, giant architectural concrete type, force-melted letters, cartoon doodles, neon light trails only, watermark, real XHS/IG chrome overlays, low quality, speech, voiceover",
  },
  {
    id: "material-letters",
    name: "Material letters poster",
    description:
      "Giant letters made of down, denim, tent nylon, or leather with real behavior.",
    icon: "🧵",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 26,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical material-letters poster for {{product}}. Giant material word from {{headline}}. Support {{subline}}. Real material behavior at contact points.",
    imageEditPromptTemplate:
      "Create a material-letters poster. Keep exact {{product}} from IMAGE 1 when present. Giant letters from {{headline}} in a real material. Support {{subline}}.",
    videoPromptTemplate:
      "Gentle push-in on material letters poster, preserve fabric detail",
    negativePrompt:
      "flat texture sticker type, plastic balloon letters, jelly glass type, warped whole background, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "type-interaction",
    name: "Type interaction poster",
    description:
      "Type as fold, peel film, motion slices, or mirror TRACE — product-linked.",
    icon: "🪞",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical type-interaction poster for {{product}}. Hero word from {{headline}}. Support {{subline}}. Type participates in product expression (fold/peel/slice/mirror).",
    imageEditPromptTemplate:
      "Create a type-interaction poster. Keep exact {{product}} from IMAGE 1 when present. Hero word from {{headline}}. Support {{subline}}. Keep subject intact where required.",
    videoPromptTemplate:
      "Gentle push-in on type-interaction poster, preserve type material",
    negativePrompt:
      "flat background type, chopped subject on MOVE, random melt, Canva flyer, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "product-lifestyle",
    name: "Product lifestyle",
    description:
      "Product extreme front + model + rainbow light + big title and numeric selling points.",
    icon: "✨",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical high-impact lifestyle product ad for {{product}}. Title {{headline}}. Selling points {{subline}}. Product extreme foreground, model behind, rainbow refraction, oversized title + numeric specs.",
    imageEditPromptTemplate:
      "Create a lifestyle product impact still. Keep exact {{product}} from IMAGE 1 in extreme foreground (hand/hold). Title {{headline}}. Selling points {{subline}}. Model behind, rainbow light, big numbers in frame.",
    videoPromptTemplate:
      "Gentle push-in on lifestyle product still, preserve title and specs",
    negativePrompt:
      "flat white info flyer, bullet checklist poster, missing product foreground, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "product-hold-poster",
    name: "Product hold poster",
    description:
      "Person holds the product toward camera — white studio, punchy pain→attitude headline, brush slogan.",
    icon: "🤲",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical product-hold poster for {{product}}. Title {{headline}}. Tagline {{subline}}. Real person holds SKU in forced perspective toward camera, clean white studio, punchy A？B headline, brush slogan, small category pill.",
    imageEditPromptTemplate:
      "Create a product-hold talking poster. Keep exact {{product}} from IMAGE 1 in the person's hand, extreme foreground / forced perspective. Title {{headline}}. Tagline {{subline}}. Clean white studio, dynamic pose, brush slogan + category pill.",
    videoPromptTemplate:
      "Gentle push-in on product-hold poster, preserve on-screen text and product identity",
    negativePrompt:
      "product-only catalog cutout, no person, missing hand hold, cluttered Canva flyer, neon cyberpunk, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "mold-word-poster",
    name: "Mold funny-word poster",
    description:
      "Clay / vinyl 3D funny words as the hero — product centered with type, or concept scene built around the wordplay.",
    icon: "🧁",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical mold/clay funny-word poster. Hero words {{headline}}. Support {{subline}}. Soft cream studio, chunky 3D molded typography is the major focus. If product {{product}} present, center it with the words.",
    imageEditPromptTemplate:
      "Create a mold/clay funny-word poster. Paint exact hero words {{headline}}. Support {{subline}}. Soft cream claymation / vinyl-toy look. If IMAGE 1 is a product, keep exact {{product}} centered under/with the words; if concept, invent a whimsical scene that illustrates the wordplay.",
    videoPromptTemplate:
      "Gentle push-in on mold-word poster, preserve stylized 3D type and subject",
    negativePrompt:
      "flat Canva flyer, tiny unreadable type, product-only catalog with no hero words, neon cyberpunk, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "deconstruct-archive-poster",
    name: "Deconstruct archive poster",
    description:
      "50/50 split — top photoreal product, bottom technical watercolor explode of the same SKU on warm paper.",
    icon: "📐",
    aspectRatio: "3:4",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical deconstruct archive poster for {{product}}. Title {{headline}}. Support {{subline}}. Top half photoreal product photo; bottom half technical watercolor isometric explode of the same product with numbered callouts, palette, archive marks on warm paper.",
    imageEditPromptTemplate:
      "Create a deconstruct archive poster. Keep exact {{product}} from IMAGE 1. Top 50%: photoreal hero of IMAGE 1. Bottom 50%: technical watercolor isometric explode of the SAME product. Title {{headline}}. Support {{subline}}. Warm paper archive aesthetic.",
    videoPromptTemplate:
      "Gentle push-in on deconstruct archive poster, preserve top photo and bottom diagram text",
    negativePrompt:
      "single full-bleed photo only, missing bottom explode, different product in bottom half, flat Canva flyer, neon cyberpunk, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "orbit-type-poster",
    name: "Orbit type poster",
    description:
      "Subject locked center — bold kinetic type orbits / tunnels / passes behind them on white studio.",
    icon: "🌀",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 32,
    camera: "Orbit Right",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical orbit-type fashion poster. Subject {{product}} locked center on clean white studio. Bold kinetic words {{headline}} orbit / tunnel / pass behind and around the subject. Support {{subline}}.",
    imageEditPromptTemplate:
      "Create an orbit-type poster. Keep exact subject from IMAGE 1 centered. Paint bold kinetic words {{headline}} orbiting / tunneling around them on white studio. Support {{subline}}. Type sits in 3D space — some behind subject, some in front.",
    videoPromptTemplate:
      "Orbit kinetic type around the locked center subject, preserve white studio and exact subject identity",
    negativePrompt:
      "flat caption stickers only, no depth layering, type never behind subject, cluttered Canva collage, neon cyberpunk, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "cloche-reveal-poster",
    name: "Cloche reveal poster",
    description:
      "Silver tray + white-glove cloche — ingredients or metaphor mess, then finished product or brand reveal.",
    icon: "🛎️",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical cloche-reveal still-life for {{product}}. Title {{headline}}. Support {{subline}}. Silver tray, white gloves, dome mid-lift, warm cream studio. Product path: ingredients under dome becoming the SKU. Concept path: metaphor props becoming brand lockup.",
    imageEditPromptTemplate:
      "Create a cloche-reveal poster. Keep exact {{product}} from IMAGE 1 as the revealed hero on a silver tray under a mid-lift dome, white-glove service, warm cream studio. Title {{headline}}. Support {{subline}}.",
    videoPromptTemplate:
      "Gentle push-in as the silver cloche lifts to reveal the hero on the tray, preserve identity",
    negativePrompt:
      "messy kitchen chaos without service framing, plastic toy cloche, neon cyberpunk, watermark, social UI, misspelled characters, low quality, speech, voiceover",
  },
  {
    id: "brand-fit",
    name: "Brand-fit ad",
    description: "Match analyzed website/social brand DNA — mood, colors, copy tone.",
    icon: "🔗",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical ad matching {{business}} brand style for {{product}}. Theme: {{headline}}. {{subline}}. Same visual DNA as their existing marketing.",
    imageEditPromptTemplate:
      "Create ad matching this brand's style. Keep exact {{product}} from reference. Headline: {{headline}}. Bullets: {{subline}}. Cohesive with brand colors and mood.",
    videoPromptTemplate:
      "Gentle motion on brand-fit {{product}} ad, stable camera, preserve legibility",
    negativePrompt:
      "generic AI template, off-brand colors, wrong tone, cluttered layout, watermark, social UI, blurry text, low quality, speech, voiceover",
  },
  {
    id: "brand-video",
    name: "Brand-fit video",
    description: "AI plans motion from analyzed brand DNA.",
    icon: "🎬",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate:
      "Product keyframe for {{product}} — {{business}} brand mood, {{headline}}",
    imageEditPromptTemplate:
      "Keep exact {{product}} from reference. Brand mood for {{business}}.",
    videoPromptTemplate:
      "Gentle cinematic motion on {{product}} for {{business}}, brand-matched lighting and pacing, stable camera, no on-screen text",
    negativePrompt:
      "on-screen text, subtitles, logo, watermark, speech, voiceover, dialogue, lyrics, chaotic motion, blurry, low quality",
  },
  {
    id: "creative-video",
    name: "Creative video prompt",
    description: "Describe your Reel idea — AI writes a motion prompt for your product.",
    icon: "✨",
    aspectRatio: "9:16",
    duration: "8",
    fast: true,
    resolution: "480p",
    motionStrength: 32,
    camera: "Orbit Around Subject",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate: "Product keyframe for {{product}} — {{headline}}",
    imageEditPromptTemplate: "Keep exact {{product}} from reference.",
    videoPromptTemplate:
      "Cinematic motion on {{product}}, creative commercial pacing, dynamic but stable camera, no on-screen text",
    negativePrompt:
      "on-screen text, subtitles, logo, watermark, speech, voiceover, dialogue, lyrics, chaotic jitter, blurry, low quality",
  },
  {
    id: "model-wear-reel",
    name: "Model lifestyle wear",
    description: "Product photo → photorealistic model wearing or using the product in a premium ad.",
    icon: "🧑‍💼",
    aspectRatio: "9:16",
    duration: "6",
    fast: false,
    resolution: "720p",
    motionStrength: 22,
    camera: "Static Locked Shot",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate:
      "Photorealistic lifestyle ad, model wearing {{product}}, premium editorial photography, 9:16",
    imageEditPromptTemplate:
      "Photorealistic lifestyle advertisement. Keep exact {{product}} from reference on model wrist/body. Premium mood: {{headline}}. Natural light, realistic skin, 9:16 vertical",
    videoPromptTemplate:
      "Very subtle motion on lifestyle {{product}} ad, locked camera, photorealistic, minimal movement, no morphing",
    negativePrompt:
      "plastic skin, distorted face, extra fingers, morphing, cartoon, on-screen text, watermark, speech, voiceover, chaotic motion, blurry, low quality",
  },
  {
    id: "ugc-presenter-reel",
    name: "UGC digital presenter",
    description: "Product photo → talking-head keyframe → lip-sync reel.",
    icon: "🎙️",
    aspectRatio: "9:16",
    duration: "6",
    fast: false,
    resolution: "720p",
    motionStrength: 0,
    camera: "Static Locked Shot",
    avoidOnScreenText: true,
    generateAudio: false,
    imagePromptTemplate:
      "Photorealistic UGC talking-head ad, presenter showing {{product}}, cozy home office, 9:16",
    imageEditPromptTemplate:
      "Photorealistic vertical UGC talking-head ad. Presenter in home office showing {{product}} on wrist or in hand, face visible, 9:16",
    videoPromptTemplate: "",
    negativePrompt:
      "distorted hands, extra fingers, plastic skin, cartoon, on-screen text, watermark, blurry face, low quality",
  },
  {
    id: "storyboard-video",
    name: "Storyboard product reel",
    description:
      "AI storyboard → scene stills → per-scene animation (stitched; captions via /captions).",
    icon: "🎞️",
    aspectRatio: "9:16",
    duration: "10",
    fast: false,
    resolution: "720p",
    motionStrength: 22,
    camera: "Static Locked Shot",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate: "Photorealistic storyboard still for {{product}}",
    imageEditPromptTemplate:
      "Photorealistic storyboard still. Keep exact {{product}} from reference. Scene: {{headline}}",
    videoPromptTemplate:
      "Photorealistic product story reel, hard cuts between scenes, minimal motion per scene, no morphing",
    negativePrompt:
      "on-screen text, subtitles, logo, watermark, morphing, melting, plastic skin, finger distortion, speech, voiceover, chaotic motion, blurry, low quality",
  },
  {
    id: "brand-campaign",
    name: "Brand campaign set",
    description: "Analyze brand → generate 3 linked posts (hero, selling points, offer).",
    icon: "🎯",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Linked brand campaign for {{business}} — {{product}}. Slide theme: {{headline}}. {{subline}}. Cohesive 3-post series.",
    imageEditPromptTemplate:
      "Brand campaign slide. Keep exact {{product}} from reference. Headline: {{headline}}. {{subline}}. Match analyzed brand DNA across the set.",
    videoPromptTemplate:
      "Gentle motion on brand campaign {{product}} ad, stable camera, preserve legibility",
    negativePrompt:
      "generic AI template, off-brand colors, inconsistent series style, cluttered layout, watermark, social UI, blurry text, low quality, speech, voiceover",
  },
  {
    id: "testimonial",
    name: "Customer story",
    description: "Product on a desk — warm lifestyle look for reviews.",
    icon: "💬",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 25,
    camera: "Static Locked Shot",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate:
      "Authentic customer-style photo of {{product}} on a natural surface, soft daylight, trustworthy and warm, lifestyle marketing, no text, vertical frame",
    imageEditPromptTemplate:
      "Enhance this lifestyle product photo for a testimonial-style ad. Keep the exact same {{product}} from the reference. Soft natural daylight, trustworthy and warm, no text, 9:16 vertical",
    videoPromptTemplate:
      "Very subtle motion on {{product}}, almost static, authentic testimonial feel, no generated text on screen",
    negativePrompt:
      "text, subtitles, logo, speech, voiceover, dialogue, lyrics, exaggerated motion, artificial look",
  },
  {
    id: "service-promo",
    name: "Professional service promo",
    description: "Consulting, courses, memberships — trust-led service ad without product packshot.",
    icon: "🤝",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 26,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Premium vertical service marketing graphic for {{business}}. Main message: {{headline}}. {{subline}}. Professional trustworthy design — consulting, coaching, wellness, education. Clean typography, modern SMB aesthetic, no physical product packshot.",
    imageEditPromptTemplate:
      "Create a professional service promo ad. If reference image is a logo or screenshot, integrate it subtly. Business: {{business}}. Headline: {{headline}}. Points: {{subline}}. Trustworthy service marketing — not a product hero shot.",
    videoPromptTemplate:
      "Gentle cinematic push-in on service promo graphic, stable camera, professional mood, preserve legible typography",
    negativePrompt:
      "product packshot, warehouse, shipping box, speech, voiceover, watermark, cluttered layout, blurry text, low quality",
  },
  {
    id: "pricing-offer",
    name: "Pricing & offer promo",
    description: "Plans, packages, limited offers — clear CTA and bullet benefits.",
    icon: "💳",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 24,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical pricing / offer promo for {{business}}. Theme: {{headline}}. Benefits: {{subline}}. Offer: {{offer}}. Clean pricing-card layout, clear CTA button area, premium but approachable. Do NOT invent specific prices unless offer text includes them.",
    imageEditPromptTemplate:
      "Design a pricing or limited-offer promo graphic. Business: {{business}}. Headline: {{headline}}. Bullets: {{subline}}. Offer line: {{offer}}. Clear hierarchy, CTA, modern IG feed style.",
    videoPromptTemplate:
      "Subtle push-in on offer graphic, soft shimmer on CTA area, stable camera, keep text readable",
    negativePrompt:
      "fake discount numbers, invented HK$ prices, speech, voiceover, watermark, overcrowded text, low quality",
  },
  {
    id: "website-launch",
    name: "Website / app launch",
    description: "Promote a URL, landing page, or app — browser or device mockup mood.",
    icon: "🌐",
    aspectRatio: "9:16",
    duration: "6",
    fast: true,
    resolution: "480p",
    motionStrength: 28,
    camera: "Slow Push In",
    avoidOnScreenText: false,
    generateAudio: true,
    imagePromptTemplate:
      "Vertical launch promo for {{business}} website or app. Hook: {{headline}}. {{subline}}. Modern device or browser mockup mood, clean UI marketing aesthetic, soft gradient background. Optional subtle logo placement — no fake UI chrome from Instagram.",
    imageEditPromptTemplate:
      "Create a website or app launch promo. Use reference image as logo or screenshot if provided. Brand: {{business}}. Headline: {{headline}}. Supporting copy: {{subline}}. Polished tech/SMB launch ad.",
    videoPromptTemplate:
      "Gentle motion on launch promo, subtle UI glow, stable camera, no on-screen platform watermarks",
    negativePrompt:
      "social media UI overlay, instagram buttons, speech, voiceover, watermark, blurry text, low quality",
  },
  {
    id: "explosion-unbox-reel",
    name: "AI explosion unbox reel",
    description:
      "Viral unboxing effect — themed box opens, room assembles, props float (text-to-video, no product photo).",
    icon: "📦✨",
    aspectRatio: "9:16",
    duration: "8",
    fast: true,
    resolution: "480p",
    motionStrength: 32,
    camera: "Static Locked Shot",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate: "Keyframe for {{headline}} explosion-unbox scene — {{conceptIdea}}",
    imageEditPromptTemplate: "Themed room assembly scene for {{headline}}.",
    videoPromptTemplate:
      "Cinematic fixed wide-angle. Sealed themed box shakes and opens; furniture and props assemble into a bright room, then lift and float in a playful zero-gravity burst. Theme: {{conceptIdea}}. No on-screen text.",
    negativePrompt:
      "on-screen text, subtitles, logo, watermark, speech, voiceover, dialogue, lyrics, shaky handheld, blurry, low quality",
  },
  {
    id: "custom",
    name: "Custom",
    description: "All components optional — you control prompts in Advanced.",
    icon: "✨",
    aspectRatio: "9:16",
    duration: "auto",
    fast: true,
    resolution: "480p",
    motionStrength: 30,
    camera: "Slow Push In",
    avoidOnScreenText: true,
    generateAudio: true,
    imagePromptTemplate: "{{headline}} {{subline}} {{product}}",
    imageEditPromptTemplate:
      "Enhance this reference photo for a vertical social ad. Keep the same subject and composition from the reference. {{headline}} {{subline}} Clean professional look, no watermark, 9:16",
    videoPromptTemplate: "Cinematic motion on {{product}}, stable, no on-screen text",
    negativePrompt:
      "text, subtitles, logo, watermark, speech, voiceover, dialogue, lyrics, blurry, distorted, low quality",
  },
];

export function applyTemplate(
  template: string,
  vars: {
    product: string;
    business?: string;
    offer?: string;
    headline?: string;
    subline?: string;
  },
): string {
  return template
    .replace(/\{\{product\}\}/g, vars.product || "the product")
    .replace(/\{\{business\}\}/g, vars.business || vars.product || "the business")
    .replace(/\{\{offer\}\}/g, vars.offer || "special offer")
    .replace(/\{\{headline\}\}/g, vars.headline || vars.product || "special offer")
    .replace(/\{\{subline\}\}/g, vars.subline || "");
}

export function getTemplate(id: TemplateId): MarketingTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function defaultImageInputModeForTemplate(id: TemplateId): ImageInputMode {
  return getTemplateConfig(id).defaultImageInputMode;
}
