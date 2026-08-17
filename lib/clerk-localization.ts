import { enUS, zhCN, zhTW } from "@clerk/localizations";
import type { Locale } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { zhCn } from "@/lib/i18n/zh-cn";
import { zhTw } from "@/lib/i18n/zh-tw";
import { zh } from "@/lib/i18n/zh";

const CLERK_LOCALES = {
	en: enUS,
	zh: zhTW,
	"zh-cn": zhCN,
	"zh-tw": zhTW,
} as const satisfies Record<Locale, typeof enUS>;

const AUTH_COPY = {
	en: en.auth,
	zh: zh.auth,
	"zh-cn": zhCn.auth,
	"zh-tw": zhTw.auth,
} as const;

export function clerkLocalizationFor(locale: Locale) {
	const base = CLERK_LOCALES[locale];
	const copy = AUTH_COPY[locale];

	return {
		...base,
		signIn: {
			...base.signIn,
			start: {
				...base.signIn?.start,
				title: copy.signInTab,
				subtitle: copy.signInSubtitle,
			},
		},
		signUp: {
			...base.signUp,
			start: {
				...base.signUp?.start,
				title: copy.signUpTab,
				subtitle: copy.signUpSubtitle,
			},
		},
	};
}
