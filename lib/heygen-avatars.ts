import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";

/**
 * Stock presenters for fal `fal-ai/heygen/avatar5/digital-twin` (Avatar V).
 * IDs must appear in fal's Avatar V-eligible examples — Avatar IV rejects many
 * older looks (e.g. "Armando Suit Front") even when listed on avatar4 enums.
 */
export type HeygenAvatarGender = "female" | "male";

export type HeygenAvatarDef = {
  id: string;
  labelEn: string;
  labelZh: string;
  gender: HeygenAvatarGender;
  tags: string[];
  /** MiniMax fal TTS voice_id per spoken locale — paired to this presenter. */
  voices: Record<VoiceoverLocale, { voiceId: string; speed: number; labelEn: string; labelZh: string }>;
};

export const HEYGEN_STOCK_AVATARS: HeygenAvatarDef[] = [
  {
    id: "Annie Office Sitting Front",
    labelEn: "Annie — office sitting",
    labelZh: "Annie — 辦公室坐姿",
    gender: "female",
    tags: ["female", "office", "professional"],
    voices: {
      hk: { voiceId: "Cantonese_ProfessionalHost（F)", speed: 1.05, labelEn: "Annie · HK pro host", labelZh: "Annie · 粵語專業女主持" },
      cn: { voiceId: "Chinese (Mandarin)_HK_Flight_Attendant", speed: 1.0, labelEn: "Annie · CN clear", labelZh: "Annie · 普通话清晰女声" },
      en: { voiceId: "English_Graceful_Lady", speed: 1.0, labelEn: "Annie · EN graceful", labelZh: "Annie · 英语优雅女声" },
    },
  },
  {
    id: "Annie Studio Pink Standing Front",
    labelEn: "Annie — studio standing",
    labelZh: "Annie — 演播室站立",
    gender: "female",
    tags: ["female", "studio", "friendly"],
    voices: {
      hk: { voiceId: "Cantonese_CuteGirl", speed: 1.05, labelEn: "Annie studio · HK cute", labelZh: "Annie 演播 · 粵語可愛女声" },
      cn: { voiceId: "Chinese (Mandarin)_Crisp_Girl", speed: 1.02, labelEn: "Annie studio · CN crisp", labelZh: "Annie 演播 · 普通话清脆女声" },
      en: { voiceId: "English_Upbeat_Woman", speed: 1.02, labelEn: "Annie studio · EN upbeat", labelZh: "Annie 演播 · 英语活泼女声" },
    },
  },
  {
    id: "Annie Casual Sitting Front",
    labelEn: "Annie — casual sitting",
    labelZh: "Annie — 休閒坐姿",
    gender: "female",
    tags: ["female", "casual", "ugc"],
    voices: {
      hk: { voiceId: "Cantonese_GentleLady", speed: 1.0, labelEn: "Annie casual · HK gentle", labelZh: "Annie 休閒 · 粵語溫柔女声" },
      cn: { voiceId: "Chinese (Mandarin)_Warm_Girl", speed: 1.0, labelEn: "Annie casual · CN warm", labelZh: "Annie 休閒 · 普通话温暖女声" },
      en: { voiceId: "English_SereneWoman", speed: 1.0, labelEn: "Annie casual · EN serene", labelZh: "Annie 休閒 · 英语平和女声" },
    },
  },
  {
    id: "Aubrey Sofa Front",
    labelEn: "Aubrey — sofa",
    labelZh: "Aubrey — 沙發",
    gender: "female",
    tags: ["female", "home", "ugc"],
    voices: {
      hk: { voiceId: "Cantonese_KindWoman", speed: 0.98, labelEn: "Aubrey · HK kind", labelZh: "Aubrey · 粵語溫和女声" },
      cn: { voiceId: "Chinese (Mandarin)_Soft_Girl", speed: 0.98, labelEn: "Aubrey · CN soft", labelZh: "Aubrey · 普通话柔和女声" },
      en: { voiceId: "English_Soft-spokenGirl", speed: 0.98, labelEn: "Aubrey · EN soft", labelZh: "Aubrey · 英语柔声女声" },
    },
  },
  {
    id: "Caroline Casual Sitting Front",
    labelEn: "Caroline — casual sitting",
    labelZh: "Caroline — 休閒坐姿",
    gender: "female",
    tags: ["female", "casual", "ugc"],
    voices: {
      hk: { voiceId: "Cantonese_GentleLady", speed: 1.02, labelEn: "Caroline · HK gentle", labelZh: "Caroline · 粵語溫柔女声" },
      cn: { voiceId: "Chinese (Mandarin)_Mature_Woman", speed: 1.0, labelEn: "Caroline · CN mature", labelZh: "Caroline · 普通话成熟女声" },
      en: { voiceId: "English_ConfidentWoman", speed: 1.0, labelEn: "Caroline · EN confident", labelZh: "Caroline · 英语自信女声" },
    },
  },
  {
    id: "June Sofa Casual Front",
    labelEn: "June — sofa casual",
    labelZh: "June — 沙發休閒",
    gender: "female",
    tags: ["female", "home", "ugc"],
    voices: {
      hk: { voiceId: "Cantonese_CuteGirl", speed: 1.0, labelEn: "June · HK cute", labelZh: "June · 粵語可愛女声" },
      cn: { voiceId: "Chinese (Mandarin)_Warm_HeartedGirl", speed: 1.0, labelEn: "June · CN warm", labelZh: "June · 普通话暖心女声" },
      en: { voiceId: "English_PlayfulGirl", speed: 1.02, labelEn: "June · EN playful", labelZh: "June · 英语俏皮女声" },
    },
  },
  {
    id: "Brandon Office Sitting Front",
    labelEn: "Brandon — office sitting",
    labelZh: "Brandon — 辦公室坐姿",
    gender: "male",
    tags: ["male", "office", "business"],
    voices: {
      hk: { voiceId: "Cantonese_ProfessionalHost（M)", speed: 1.0, labelEn: "Brandon · HK pro", labelZh: "Brandon · 粵語專業男主持" },
      cn: { voiceId: "Chinese (Mandarin)_Reliable_Executive", speed: 1.0, labelEn: "Brandon · CN exec", labelZh: "Brandon · 普通话可靠男声" },
      en: { voiceId: "English_Trustworth_Man", speed: 1.0, labelEn: "Brandon · EN trust", labelZh: "Brandon · 英语可信男声" },
    },
  },
  {
    id: "Bojan Sport Front",
    labelEn: "Bojan — sport",
    labelZh: "Bojan — 運動",
    gender: "male",
    tags: ["male", "sport", "energetic"],
    voices: {
      hk: { voiceId: "Cantonese_PlayfulMan", speed: 1.08, labelEn: "Bojan · HK energetic", labelZh: "Bojan · 粵語活力男声" },
      cn: { voiceId: "Chinese (Mandarin)_Straightforward_Boy", speed: 1.05, labelEn: "Bojan · CN direct", labelZh: "Bojan · 普通话直爽男声" },
      en: { voiceId: "English_Aussie_Bloke", speed: 1.05, labelEn: "Bojan · EN aussie", labelZh: "Bojan · 英语活力男声" },
    },
  },
  {
    id: "Gerardo Sofa Front",
    labelEn: "Gerardo — sofa",
    labelZh: "Gerardo — 沙發",
    gender: "male",
    tags: ["male", "casual", "ugc"],
    voices: {
      hk: { voiceId: "Cantonese_PlayfulMan", speed: 1.0, labelEn: "Gerardo · HK playful", labelZh: "Gerardo · 粵語活潑男声" },
      cn: { voiceId: "Chinese (Mandarin)_Unrestrained_Young_Man", speed: 1.0, labelEn: "Gerardo · CN young", labelZh: "Gerardo · 普通话年轻男声" },
      en: { voiceId: "English_FriendlyPerson", speed: 1.0, labelEn: "Gerardo · EN friendly", labelZh: "Gerardo · 英语友善男声" },
    },
  },
  {
    id: "Artur Office Front",
    labelEn: "Artur — office",
    labelZh: "Artur — 辦公室",
    gender: "male",
    tags: ["male", "office"],
    voices: {
      hk: { voiceId: "Cantonese_ProfessionalHost（M)", speed: 0.98, labelEn: "Artur · HK pro", labelZh: "Artur · 粵語專業男主持" },
      cn: { voiceId: "Chinese (Mandarin)_Male_Announcer", speed: 1.0, labelEn: "Artur · CN announcer", labelZh: "Artur · 普通话男播音" },
      en: { voiceId: "English_Diligent_Man", speed: 1.0, labelEn: "Artur · EN diligent", labelZh: "Artur · 英语勤勉男声" },
    },
  },
  {
    id: "Silas Lounge Front",
    labelEn: "Silas — lounge",
    labelZh: "Silas — 休閒廳",
    gender: "male",
    tags: ["male", "casual", "ugc"],
    voices: {
      hk: { voiceId: "Cantonese_PlayfulMan", speed: 1.0, labelEn: "Silas · HK casual", labelZh: "Silas · 粵語休閒男声" },
      cn: { voiceId: "Chinese (Mandarin)_Sincere_Adult", speed: 1.0, labelEn: "Silas · CN sincere", labelZh: "Silas · 普通话真诚男声" },
      en: { voiceId: "English_Gentle-voiced_man", speed: 1.0, labelEn: "Silas · EN gentle", labelZh: "Silas · 英语温和男声" },
    },
  },
];

export function findHeygenAvatar(id: string): HeygenAvatarDef | undefined {
  return HEYGEN_STOCK_AVATARS.find((a) => a.id === id);
}

export function heygenAvatarGender(id: string): HeygenAvatarGender {
  return findHeygenAvatar(id)?.gender ?? "female";
}

export function heygenAvatarVoice(
  avatarId: string,
  locale: VoiceoverLocale,
): { voiceId: string; speed: number; labelEn: string; labelZh: string } | null {
  const avatar = findHeygenAvatar(avatarId);
  if (!avatar) return null;
  return avatar.voices[locale] ?? avatar.voices.en;
}

/** Avatar IV — custom keyframe (image URL) lip-sync. */
export const HEYGEN_AVATAR_IV_ENDPOINT = "fal-ai/heygen/avatar4/image-to-video";

/** Avatar V — stock digital twin (eligible named looks only). */
export const HEYGEN_DIGITAL_TWIN_ENDPOINT = "fal-ai/heygen/avatar5/digital-twin";
