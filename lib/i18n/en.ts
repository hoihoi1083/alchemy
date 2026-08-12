import type { TemplateId } from "@/lib/templates";

export const en = {
	meta: {
		title: "Alchemy AI Lab",
		description:
			"Make social ads from your product photo — add BGM and captions when you want",
	},
	lang: {
		en: "English",
		zh: "繁體中文（香港）",
		"zh-cn": "简体中文",
		"zh-tw": "繁體中文（台灣）",
	},
	auth: {
		signIn: "Sign in",
		tokensBalance: "{n} tokens",
		tokensBalanceTitle: "Your token balance — view plans & top-ups",
		accountMenu: "Account & billing",
		libraryMenu: "My library",
	},
	account: {
		title: "Account & billing",
		subtitle:
			"Your plan, token balance, and credit history. Manage card and invoices in Stripe when needed.",
		loading: "Loading account…",
		loadError: "Could not load account.",
		planLabel: "Current plan",
		balanceLabel: "Token balance",
		tokensUnit: "tokens",
		renewsLabel: "Renews",
		pendingDowngradeLabel: "Scheduled downgrade",
		pendingDowngradeBody:
			"Changes to {plan} on {date}. You keep your current plan until then.",
		manageBilling: "Manage billing",
		portalRedirecting: "Opening Stripe…",
		portalError: "Could not open billing portal.",
		portalNeedSubscribe:
			"Subscribe first to manage card, cancel, and Stripe invoices.",
		viewPlans: "View plans & top-ups",
		historyTitle: "Receipts & token history",
		historySubtitle:
			"Every subscription grant, top-up, and generation spend. Stripe subscription invoices also appear under Manage billing.",
		historyEmpty: "No transactions yet.",
		balanceAfter: "Balance",
		invoiceRef: "Invoice",
		reasons: {
			signup_grant: "Free signup tokens",
			subscription_grant: "Subscription tokens",
			topup: "Token top-up",
			consume: "Generation spend",
			refund: "Refund",
			admin_adjust: "Adjustment",
		},
	},
	library: {
		title: "My library",
		subtitle:
			"Your saved generations and studio projects — previews and downloads use permanent copies when available.",
		loading: "Loading library…",
		loadError: "Could not load your library.",
		empty: "No projects yet. Create something in the studio and it will show up here.",
		emptyCta: "Open studio",
		openStudio: "Continue in studio",
		downloadImage: "Download image",
		downloadVideo: "Download video",
		openMedia: "Open",
		delete: "Delete",
		deleteConfirm: "Delete this project? This cannot be undone.",
		deleting: "Deleting…",
		noMedia: "No saved media yet",
		linkExpiredHint:
			"Older projects may still use expired fal links — use Saved files below, or regenerate. New outputs are stored permanently.",
		updatedLabel: "Updated",
		imageBadge: "Image",
		videoBadge: "Video",
		accountLink: "Account & billing",
		savedFilesTitle: "Saved files",
		savedFilesSubtitle:
			"Permanent copies of your generated images, videos, and audio — stored on our servers, always re-downloadable.",
		savedFilesEmpty:
			"No saved files yet. New generations are copied here automatically.",
		projectsTitle: "Projects",
		audioBadge: "Audio",
		voiceoverBadge: "Voiceover",
		download: "Download",
		editCaptions: "Edit captions",
		editImage: "Edit image",
	},
	footer: {
		tagline:
			"Turn a product photo into scroll-stopping social ads — image, video, and music in minutes.",
		productTitle: "Product",
		legalTitle: "Legal",
		studio: "Open studio",
		pricing: "Pricing & tokens",
		how: "How it works",
		proCanvas: "Pro canvas",
		accountTitle: "Account",
		library: "My library",
		account: "Account & billing",
		companyTitle: "Company",
		contact: "Contact",
		privacy: "Privacy policy",
		terms: "Terms of service",
		refund: "Refund policy",
		followUs: "Follow us",
		paymentsNote: "Secure payments via Stripe — Visa, Mastercard, Apple Pay, Google Pay, Alipay & WeChat Pay",
		rights: "All rights reserved.",
	},
	studio: {
		loadingTitle: "Loading your studio…",
		loadingHint: "Restoring your promotion mode and wizard layout.",
		errorTitle: "Studio hit an error",
		errorBody:
			"Something went wrong in the wizard. You can try again or go back to mode selection.",
		errorRetry: "Try again",
		errorBackStart: "Back to mode picker",
		mongoRequiredTitle: "Project save unavailable",
		mongoRequiredBody:
			"MONGODB_URI is not configured on this server. Your work will not autosave until MongoDB is connected.",
		mongoRequiredBodyConnected:
			"MongoDB is configured, but the health check failed. Redeploy after fixing indexes/connection. Detail:",
		saveSaving: "Saving…",
		saveSaved: "Saved ✓",
		saveError: "Save failed",
	},
	start: {
		title: "What are you promoting?",
		subtitle:
			"Pick one path — we’ll tailor the studio, styles, and required fields.",
		heroSubtitle:
			"Alchemy guides you step by step — pick what you promote, then we tailor fields, style, and output.",
		stepEyebrow: "STEP 1",
		stepTitle: "Choose what you want to promote",
		stepHint: "Pick the option that best describes what you’re promoting.",
		physicalTitle: "Physical Products",
		physicalDesc:
			"You have a real product to photograph — jewelry, food, skincare, gadgets, and more.",
		physicalExamples:
			"e.g. bracelet, nasal washer, crystal, packaged goods",
		physicalTags: ["Skincare", "Home décor", "Apparel"],
		conceptTitle: "Services / Website / Concept",
		conceptDesc:
			"No physical SKU — promote a brand, site, course, membership, or pricing plan.",
		conceptExamples:
			"e.g. career report site, yoga studio, SaaS trial, 3-tier plan",
		conceptTags: ["Consulting", "SaaS", "Courses"],
		continueLabel: "Continue to studio",
		continueToStep2: "Continue",
		switchLaterHint: "You can switch mode anytime from the studio header.",
		tipTitle: "Which option should I pick?",
		tipChoose: "Choose",
		tipPhysical:
			"if you sell or promote items that customers can buy and receive.",
		tipConcept:
			"if you’re promoting something intangible — a website, a service, or an idea.",
		tipNote: "You can always change this later",
		tipNoteBody:
			"Not sure right now? You can update this anytime inside Studio.",
		secureNote:
			"Your assets are only used to generate content and are never shared externally.",
		roadmapTitle: "How it works",
		roadmapSubtitle:
			"Five stages — your path branches at create (image, video, or both).",
		phases: [
			"Choose what to promote",
			"Choose how to create",
			"Set up content",
			"Generate assets",
			"Done",
		],
		/** Path-specific rails once creation path is chosen. */
		phasesImage: [
			"Choose what to promote",
			"Choose how to create",
			"Set up content",
			"Generate images",
			"Download & use",
		],
		phasesVideo: [
			"Choose what to promote",
			"Choose how to create",
			"Set up content",
			"Generate video",
			"Download & use",
		],
		phasesCombined: [
			"Choose what to promote",
			"Choose how to create",
			"Set up content",
			"Confirm storyboard",
			"Generate video",
		],
		phaseBodies: [
			"Pick a physical product, or a brand / website / service.",
			"Images only, video only, or images then video.",
			"Add product details, assets, and visual style.",
			"AI generates images and/or video from your setup.",
			"Download creatives for Xiaohongshu, Instagram, Facebook, and TikTok.",
		],
		physicalShort:
			"Real products you can photograph — skincare sets, home goods, apparel, and more.",
		conceptShort:
			"Ideas, brands, websites, and services you promote without a physical SKU.",
		examplesLabel: "Examples",
		templateBanner: "Template: {name} — physical product mode",
		templateBannerHint:
			"Choose Physical product below to open the wizard with this layout.",
		welcomeTitle: "Welcome — you’re in!",
		welcomeBody:
			"You’ve received {n} free tokens to start creating. Pick a path below and make your first ad.",
	},
	header: {
		badge: "Easy mode · IG / FB reels · add music later",
		title: "Alchemy AI Lab studio",
		subtitle: "Upload product · pick a style · get Reels",
		subtitleConcept: "Brand copy · pick a style · get feed posts & reels",
		promotionPhysical: "Physical product",
		promotionConcept: "Service / concept",
		switchPromotion: "Switch type",
		homeLink: "Back to landing",
		themeToggleLight: "Light",
		themeToggleDark: "Dark",
		proLink: "Pro canvas",
		captionsLink: "Caption & audio studio",
		imageCanvasLink: "Image text & logo studio",
	},
	landing: {
		badge: "AI marketing content platform",
		titleBefore: "Create marketing content ",
		titleHighlight: "without",
		titleAfter: " writing prompts.",
		title: "Create marketing content without writing prompts.",
		subtitle:
			"Upload a product image or paste a reference link. Alchemy AI analyzes the style, creates editable prompts and storyboards, then generates ready-to-use ads, images and reels.",
		openStudio: "Open Studio",
		startCreating: "Start Creating",
		tryFree: "Try Free",
		floatingCta: "Start now",
		ctaPrimary: "Try Free — Create Your First Ad",
		ctaSecondary: "Watch Demo",
		howItWorks: "How It Works",
		navHome: "Home",
		navProduct: "Product",
		navTemplates: "Templates",
		navHow: "How it Works",
		navBrandKit: "Brand kit",
		navUseCases: "Use Cases",
		navPricing: "Pricing",
		navResources: "Tokens",
		navEditImage: "Edit image",
		navCaptions: "Captions",
		navPro: "Pro",
		heroTrust: [
			"No prompt needed",
			"Storyboard first",
			"Products & concepts",
			"AI research",
		],
		builtForLabel: "Built for",
		builtFor: [
			"Marketers",
			"Brands & agencies",
			"Small businesses",
			"E-commerce",
			"Creators",
		],
		heroSidebar: ["Upload", "Style", "Layout", "Tone", "BrandKit"],
		heroImageAlt: "Product photo with AI style analysis",
		heroMascotAlt:
			"Alchemy cute flask companion with goggles — move your cursor to look around",
		heroBeforeLabel: "Before",
		heroAfterLabel: "After",
		heroPanelTitle: "AI style analysis",
		heroPanelBars: [
			{ label: "Color", value: "92%", pct: 92 },
			{ label: "Layout", value: "88%", pct: 88 },
			{ label: "Tone", value: "85%", pct: 85 },
		],
		transformBadge: "Product transform",
		transformTitleBefore: "From a plain product shot to a ",
		transformTitleHighlight: "studio-ready",
		transformTitleAfter: " creative.",
		transformBody:
			"Upload one product photo. Alchemy reads color, layout, and tone — then restyles it into lifestyle ads you can edit and export for every platform.",
		transformPoints: [
			{
				title: "Keep your real product",
				body: "We restyle the scene and lighting — your bottle, label, and brand stay true.",
			},
			{
				title: "Match the look you want",
				body: "AI scores color, layout, and tone so every output feels intentional, not random.",
			},
			{
				title: "Ready for ads in minutes",
				body: "Generate scroll-stopping stills for IG, Facebook, TikTok, and 小红书 — then tweak on canvas.",
			},
		],
		transformCta: "Transform my product",
		transformHint: "No blank prompt. Start from your photo.",
		howTitleBefore: "How it ",
		howTitleHighlight: "Works",
		howSubtitle: "From reference to final creative in 4 simple steps.",
		howSteps: [
			{
				title: "Upload or Paste Reference",
				body: "Upload your product image or paste a reference post / link.",
			},
			{
				title: "AI Analyzes the Style",
				body: "AI analyzes colors, layout, composition, tone and copywriting style.",
			},
			{
				title: "Edit Prompt & Storyboard",
				body: "Review and edit AI-generated prompt, copy and storyboard before generating.",
			},
			{
				title: "Generate & Edit Creative",
				body: "Generate images or videos, then refine with our editable canvas.",
			},
		],
		howDemo: {
			uploadTitle: "Reference · drop or paste",
			pasteHint: "Paste link",
			urlTyped: "instagram.com/p/style-ref…",
			dropZone: "Drop product photo",
			analyzeTitle: "Style analysis · live",
			checkLayout: "Layout & framing",
			checkColor: "Color & lighting",
			checkTone: "Tone of voice",
			checkCopy: "Copy style mapped",
			analyzeReady: "Style brief ready",
			storyTitle: "Storyboard · editable",
			scene1: "Scene 1",
			scene2: "Scene 2",
			scene3: "Scene 3",
			promptTyped: "Soft light · product hero · clean background…",
			generateTitle: "Creative studio · yours",
			reelLabel: "Reel",
			imageLabel: "Image",
			readyEdit: "Ready to edit on canvas",
		},
		refTitle: "Reference style. Your brand.",
		refBody:
			"Paste a post or Reel you like. Alchemy reads layout, color palette, lighting, and tone — then applies that visual system to your product or concept without copying the original content, so the result still feels like your brand.",
		refCardLabel: "Reference style",
		refFeatureItems: [
			{
				title: "Read the style DNA",
				body: "We extract layout, color, lighting, and tone — not the reference’s copy or product.",
			},
			{
				title: "Keep your real product",
				body: "Your SKU, packaging, and brand details stay true while the scene restyles.",
			},
			{
				title: "Apply, don’t copy",
				body: "The output matches the vibe you liked, with your offer and messaging.",
			},
			{
				title: "Ready for every platform",
				body: "Generate stills or video framed for IG, TikTok, Facebook, and more.",
			},
		],
		resultCardLabel: "Your Brand Creative",
		refCardAlt: "Reference beverage style photo",
		resultCardAlt: "Branded beverage ad result",
		canvasTitle: "Fully editable canvas",
		canvasBody:
			"Generated content is not final. Edit every detail to match your brand and message.",
		canvasFeatures: [
			"Remove elements",
			"Add text",
			"Add logo",
			"Add diagram",
			"Export sizes",
		],
		canvasFeatureItems: [
			{
				title: "Remove Elements",
				body: "Delete unwanted objects easily",
			},
			{ title: "Add Text", body: "Perfect headlines, CTAs and copy" },
			{ title: "Add Logo", body: "Keep your creative on brand" },
			{
				title: "Add Diagram",
				body: "Explain benefits, pricing or steps",
			},
			{ title: "Export Sizes", body: "IG, FB, 小红书, TikTok & more" },
		],
		storyboardBadge: "Storyboard mode",
		storyboardTitle: "Storyboard mode — plan scenes, then ship video",
		storyboardBody:
			"Three still scenes become one story reel — plan every shot first, then generate with consistent story, tone, and visuals.",
		storyboardFeatureItems: [
			{
				title: "Plan every scene first",
				body: "Lock shots and timing before you spend tokens on video.",
			},
			{
				title: "Consistent story & tone",
				body: "Keep narrative, color, and motion aligned across the reel.",
			},
			{
				title: "Timeline & shot control",
				body: "Adjust duration, order, and framing before you render.",
			},
			{
				title: "Export in minutes",
				body: "Generate high-quality clips ready for ads and social.",
			},
		],
		storyboardCta: "Start storyboard mode",
		storyboardImageAlt:
			"Storyboard mode: three scenes combined into one video",
		canvasSidebar: ["Templates", "Elements", "Tools", "Fonts", "BrandKit"],
		canvasMockTitle: "Untitled Design",
		canvasOverlayText: "BRIGHTEN YOUR SKIN",
		canvasImageAlt: "Editable skincare ad on canvas",
		canvasCta: "Open image editor",
		tplTitleBefore: "Cover every ",
		tplTitleHighlight: "platform & marketing scenario",
		tplTitleAfter: "",
		tplSubtitle: "",
		tplPlatformsLabel: "Supported platforms",
		tplFormatsLabel: "Supported formats",
		tplPlatformIg: "Instagram",
		tplPlatformFb: "Facebook",
		tplPlatformXhs: "小红书",
		tplPlatformTiktok: "TikTok",
		tplPlatformX: "X",
		tplFormatImage: "Image",
		tplFormatCarousel: "Carousel",
		tplFormatReels: "Reels",
		tplFormatVideo: "Video",
		tplAdBadge: "Ad",
		tplEmptyFilter: "No templates in this filter yet.",
		tplBizBeauty: "Beauty",
		tplBizMakeup: "Makeup",
		tplBizFashion: "Fashion",
		tplBizJewelry: "Jewelry",
		tplBizBranding: "Branding",
		tplBizAmber: "Amber",
		tplBizCafe: "Cafe",
		tplBizProduct: "Product",
		tplBizService: "Service",
		tplBizWellness: "Wellness",
		tplBizRetail: "Retail",
		tplBizRealEstate: "Real Estate",
		tplAdBeauty: "Glow in 7 days — before & after that converts",
		tplAdMakeup: "Promote directly with your product",
		tplAdFashion: "Three stills → one story reel",
		tplAdJewelry: "Seven minerals. One bracelet. One scroll-stopper.",
		tplAdBranding: "Style matching ≠ copying — keep your brand DNA",
		tplAdAmber: "Sunlight on amber — each bead unique",
		tplAdCafe: "Cold brew that looks as good as it tastes",
		tplAdProduct: "One photo. Infinite campaign looks.",
		tplAdService: "Fast ads — no AI expertise needed",
		tplAdWellness: "Weekly guidance your audience saves",
		tplAdRetail: "AI shopping tips that feel personal",
		tplAdRealEstate: "Property tour — export the concept straight out",
		tplTabAll: "All",
		tplTabProduct: "Product Ads",
		tplTabInstagram: "Instagram",
		tplTabFacebook: "Facebook Ads",
		tplTabXhs: "小红书",
		tplTabVideo: "Reels / Video",
		tplTabService: "Service Business",
		tplCardSkincare: "Skincare Ad",
		tplCardSunscreen: "Sale Promo",
		tplCardCoffee: "Cold Brew",
		tplCardService: "Service Promo",
		tplCardReel: "Reels Storyboard",
		tplCardHero: "Product Hero",
		tplCapIg: "Instagram Post",
		tplCapFb: "Facebook Ad",
		tplCapXhs: "Xiaohongshu Post",
		tplCapReel: "Reels / Video",
		tplCapService: "Service Business",
		tplCapProduct: "Product Ad",
		whyTitle: "Why Alchemy AI Lab is different",
		whyItems: [
			{
				title: "Prompt-free",
				body: "First prompt-free AI tool. Hassle-free guidance by MicroWizard. Deliver delicate content with few simple steps.",
			},
			{
				title: "Intelligent market research",
				body: "See what’s trending now. Reference updated styles instead of wild guessing.",
			},
			{
				title: "Storyboard first",
				body: "Lock every scene before full render. Zero wasted tokens.",
			},
			{
				title: "Editable output",
				body: "Tweak any detail after generation. Instant fixes. No restart required.",
			},
			{
				title: "Products & Concepts",
				body: "Physical products, services, concepts, or abstract ideas work just as well.",
			},
			{
				title: "Subscription + Token",
				body: "Join basic plan and top up only when needed.",
			},
		],
		scenariosTitle: "Built for every marketing scenario",
		scenariosSubtitle:
			"Pick the industry vibe that matches your next campaign.",
		scenarios: [
			{
				title: "E-commerce & retail",
				body: "Product posters, campaign packs, and short product videos from one photo.",
			},
			{
				title: "Beauty & skincare",
				body: "Clean lifestyle stills and Reels tuned for IG and TikTok.",
			},
			{
				title: "Food & beverage",
				body: "Appetite-led layouts with reference-style learning from posts you like.",
			},
			{
				title: "Education & coaching",
				body: "Concept and teaching-carousel paths for services without a physical SKU.",
			},
			{
				title: "Real estate",
				body: "Property highlights and short walkthrough-style video from stills.",
			},
			{
				title: "Financial & SaaS",
				body: "Clear offer posters and brand videos without inventing fake pricing claims.",
			},
		],
		pricingSubtitle:
			"Start free. Upgrade when you need more AI tokens, templates, videos and brand workflows.",
		pricingSaveBadge: "Save up to 50%",
		pricingFreeCta: "Start Free",
		pricingProCta: "Start Pro",
		pricingCustom: "Contact us",
		pricingCustomHint: "Volume tokens & custom limits",
		planBlurbFree: "Try the guided Studio workflow",
		planBlurbStandard: "For early businesses",
		planBlurbPro: "For brands & freelancers",
		planBlurbMaster: "For agencies & teams",
		planBlurbCustom: "For enterprise volume",
		planFeaturesFree: [
			"Guided image & video paths",
			"1,000 signup tokens",
			"Library downloads",
		],
		planFeaturesStandard: [
			"3,000 tokens / month",
			"720p video",
			"Token top-ups",
		],
		planFeaturesPro: [
			"8,000 tokens / month",
			"1080p video",
			"Priority generation",
			"High-res exports",
		],
		planFeaturesMaster: [
			"16,000 tokens / month",
			"Pro canvas",
			"Priority support",
			"2K images",
		],
		planFeaturesCustom: [
			"Custom token volume",
			"Custom limits",
			"Dedicated support",
		],
		tokensTitle: "How AI Tokens Work",
		tokensBody:
			"Rough monthly capacity if you spend tokens on images only, or on ~10s storyboard reels. Mix formats in practice.",
		tokensUnit: "tokens",
		tokensPlanGrant: "{n} tokens",
		tokensCapacityImages: "single images",
		tokensCapacityOr: "or",
		tokensCapacityStoryboards: "storyboard reels (~{sec}s)",
		tokenCostPlan: "AI plan / brief",
		tokenCostImage: "Image creation",
		tokenCostStoryboard: "Storyboard pack",
		tokenCostMusic: "Music bed",
		tokenCostVideoDraft: "Short video (~8s)",
		tokenCostVoice: "Voiceover",
		tokensVideoNote:
			"Estimates only — based on a typical ~10s storyboard reel. Longer reels, more scenes, logo passes, and music use more tokens.",
		tokensSeePricing: "See full pricing →",
		topUpTitle: "Need more tokens?",
		topUpBody: "Top up anytime after you subscribe.",
		topUpCustom: "Custom tokens",
		finalTitle: "Ready to create agency-like content?",
		finalBody: "Join marketers and businesses creating better ads, faster.",
		finalImageAlt: "Alchemy studio creatives and product asset preview",
		proCanvasLink: "Pro canvas",
		captionsLink: "Caption, BGM & voice for any video",
		imageCanvasLink: "Add text & logo to any image",
		ugcLink: "Try UGC talking presenter",
		brandKitLink: "Set up brand kit",
		brandKitBadge: "Before you create",
		brandKitTitle: "Save your logo once. Use it on every reel.",
		brandKitBody:
			"Upload a clean PNG logo (transparent background works best). Turn on “Use brand logo on video stills” for storyboard/cinematic keyframes. For promo images, add the logo in Edit image.",
		brandKitLogoTip:
			"Tip: square-ish PNG, logo filling most of the canvas, about 512–1024px — avoid tiny marks on huge empty backgrounds.",
		brandKitCta: "Continue to studio",
		toolsTitle: "More ways to create",
		toolsSubtitle:
			"Brand kit, image editor, captions, and Pro canvas — jump in anytime.",
		toolsOpenCta: "Open",
		toolBrandTitle: "Brand kit",
		toolBrandDesc:
			"Save logo & colors once — auto on video stills; add to images in Edit image.",
		toolEditTitle: "Edit image",
		toolEditDesc: "Add text, logo, and polish any generated photo.",
		toolCaptionsTitle: "Captions & audio",
		toolCaptionsDesc: "Burn subtitles, BGM, and voice onto any MP4.",
		toolProTitle: "Pro canvas",
		toolProDesc: "Node workflow for power users — Master plan.",
		proMasterBadge: "Master plan",
		visualCaptionsLink: "Visual subtitle lab (beta)",
		recipes: {
			badge: "1-tap recipes",
			title: "Finishable video recipes",
			subtitle:
				"Same two walks for product and concept. Motion poster fits the free grant. 12s MiniMax H3 TVC needs a paid plan.",
			cta: "Start this recipe",
			physicalGroup: "Product",
			conceptGroup: "Concept / service",
			tvcPaidHint:
				"12s MiniMax H3 needs a paid plan (~1140 tokens). Free grant can cover stills + Kling stitch if H3 does not fit.",
			items: {
				"motion-poster": {
					title: "Motion poster",
					description:
						"2 stills (no type → typed poster) then MiniMax H3 interpolates product + words. Not a multi-scene storyboard.",
					costHint: "~2 images + 1 short clip · fits free grant",
				},
				"product-tvc-12s": {
					title: "Product TVC ~12s",
					description:
						"4-beat storyboard: establish → macro → orbit → lifestyle/payoff.",
					costHint:
						"~4 stills + 12s H3 — paid plan · Kling stitch may fit free",
				},
				"concept-motion-poster": {
					title: "Concept motion poster",
					description:
						"2 scene stills (no type → typed) + H3 interpolates a service-fit motion. No SKU packshot.",
					costHint: "~2 AI stills + 1 short clip · fits free grant",
				},
				"concept-tvc-12s": {
					title: "Concept TVC ~12s",
					description:
						"4-beat storyboard for a service / idea: establish → metaphor → orbit → payoff.",
					costHint:
						"~4 stills + 12s H3 — paid plan · Kling stitch may fit free",
				},
			},
		},
		templatesBadge: "Templates",
		templatesTitle: "Start from a marketing template",
		templatesSubtitle:
			"Scenario cards — pick one, then follow the guided wizard (upload → image → video).",
		useTemplate: "Use in wizard",
		templateOutputImage: "Image post",
		templateOutputVideo: "Video reel",
		howInlineIntro: "Four steps from reference to published creative.",
		howReadMore: "Full guide →",
		demoItems: [
			"Product photo input",
			"Style + prompt guidance",
			"Storyboard scenes",
			"video output",
		],
		steps: [
			{
				no: "01",
				title: "Analyze product",
				body: "Use product details and optional brand context.",
			},
			{
				no: "02",
				title: "Generate creatives",
				body: "Create lifestyle images or storyboard scenes.",
			},
			{
				no: "03",
				title: "Refine to final video",
				body: "Use guided prompt + video generation for final reel.",
			},
		],
		quickStart: {
			quickAd: "Start Quick Ad",
			storyboard: "Start Storyboard Reel",
		},
		highlightsTitle: "Why this workflow works",
		highlights: [
			{
				title: "Beginner-safe defaults",
				body: "The wizard keeps settings simple by default and avoids common quality mistakes.",
			},
			{
				title: "Fast draft to final flow",
				body: "Generate still first, then animate to video — easier to iterate and control quality.",
			},
			{
				title: "Built for small business ads",
				body: "Templates and prompts are tuned for IG/FB reels and practical promotion use-cases.",
			},
		],
		sampleTitle: "Typical output path",
		sampleTimeline: [
			"Upload product photo + fill headline",
			"Generate image or storyboard scene pack",
			"Review prompt and click generate video",
			"Download clean MP4 for CapCut/Premiere",
		],
		faqTitle: "FAQ",
		faqShowMore: "Show more questions",
		faqShowLess: "Show fewer questions",
		faq: [
			{
				q: "What is Alchemy AI Lab?",
				a: "Alchemy AI Lab is an AI marketing studio that helps brands create product ads, social posts, storyboards, and short videos — without writing complex prompts.",
			},
			{
				q: "Do I need to write prompts?",
				a: "No. Upload a product image, paste a reference link, or pick a template. Alchemy analyzes style, layout, colors, and marketing direction for you.",
			},
			{
				q: "How does the AI creative workflow work?",
				a: "1) Upload or paste a reference 2) AI analyzes style 3) Review or edit the brief and storyboard 4) Generate and refine the creative.",
			},
			{
				q: "Can I use reference images?",
				a: "Yes. Alchemy analyzes visual style, structure, colors, and creative direction from references to guide new creatives — it is not meant to clone the original post or brand assets.",
			},
			{
				q: "What content can I create?",
				a: "Product ads, sale banners, new-arrival posts, Instagram/Facebook creatives, Xiaohongshu (RedNote) posts, Reels, service promos, testimonials, teaching carousels, and more.",
			},
			{
				q: "Can I create short videos?",
				a: "Yes. You can generate video directly, or use a storyboard-first path to review scenes before the final clip.",
			},
			{
				q: "How long does one run take?",
				a: "Quick image: ~10-30s. Storyboard image pack: ~2-5 min. Video: usually ~1-3 min depending on queue and duration.",
			},
			{
				q: "Will regenerating cost extra tokens?",
				a: "Yes. Every AI regenerate call (image, scene, or video) is a new model run and uses tokens again.",
			},
			{
				q: "Do I need to upload reference videos?",
				a: "No. Reference MP4 is optional. Use it only when you want to mimic motion/style from an existing ad.",
			},
			{
				q: "Is everything storyboard-first?",
				a: "No. Video-only paths generate video directly. Storyboard stills are used on image→video (combined) paths.",
			},
			{
				q: "How do upgrades work?",
				a: "Upgrade on the Pricing page (signed in). It starts a new higher-plan billing period today: Stripe credits unused time on your old plan and charges the new plan from today (list prices stay the same). You keep remaining tokens and get the full new plan token allotment right away. Your next renewal date moves forward from the upgrade (one month for monthly plans, one year for yearly). Example: Standard monthly on 1 Aug → Master monthly on 15 Aug → next renew is 15 Sep with a full Master grant.",
			},
			{
				q: "How do downgrades work?",
				a: "Choose a lower plan on Pricing. The downgrade is scheduled for your next billing date — you keep your current plan, features, and remaining tokens until then. The lower price and monthly token allotment start on the next cycle.",
			},
			{
				q: "How do I cancel?",
				a: "Open Manage billing on Pricing (Stripe Customer Portal) to cancel renewal or update your card. Paid access continues until the end of the current period. Plan upgrades and downgrades are done on Pricing, not in the portal.",
			},
		],
	},
	pricing: {
		badge: "Simple token pricing",
		title: "Plans by Volume and Preference — Pick What Fits You",
		titleBefore: "By Volume & Preference",
		titleHighlight: "Choose the Plan That Fits You",
		subtitle:
			"Every plan includes tokens for AI image and video generation. Pay for what you use — top up anytime after subscribing.",
		pricingLink: "Pricing",
		monthly: "Monthly",
		yearly: "Yearly",
		yearlyBadge: "Save up to 50%",
		monthlyBadge: "Save up to 38%",
		perMonth: "/mo",
		billedYearly: "Billed yearly",
		tokensPerMonth: "tokens / month",
		tokensIncluded: "tokens included",
		capacityImagesFeature: "~{n} single images",
		capacityStoryboardsFeature: "~{n} storyboard reels (~{sec}s)",
		mostPopular: "Most popular",
		getStarted: "Get started",
		subscribe: "Subscribe",
		contactSales: "Contact us",
		freeForever: "Free",
		compareTitle: "Compare plans",
		compareFeature: "Feature",
		topUpTitle: "Need more tokens?",
		topUpSubtitle:
			"Subscribers can buy extra tokens anytime — no plan change required.",
		topUpPrice: "$10",
		topUpTokens: "1,000 tokens",
		topUpNote: "Available after any paid subscription",
		buyTopUp: "Buy tokens",
		manageBilling: "Manage billing",
		checkoutRedirecting: "Redirecting to Stripe…",
		checkoutSuccess:
			"Payment received. Tokens will appear in your balance within a few seconds — refresh if needed.",
		checkoutCanceled: "Checkout canceled. No charge was made.",
		checkoutError:
			"Could not start checkout. Try again or contact support.",
		paymentIncomplete:
			"Payment did not go through. Update your card in Manage billing, then try upgrading again. Your previous plan was not changed.",
		subscriptionUpdated:
			"Plan updated. Duplicate subscriptions were canceled so you won’t be charged twice.",
		subscriptionUpgraded:
			"Upgraded successfully. Your new plan month starts today — full token allotment added, remaining tokens kept, and the next renewal moves to one month from now.",
		subscriptionDowngradeScheduled:
			"Downgrade to {plan} is scheduled for {date}. You keep your current plan and remaining tokens until then — the lower price starts on your next billing cycle.",
		alreadySubscribed:
			"You already have an active subscription. Change plans on this Pricing page, or open Manage billing to cancel / update your card.",
		tokenTitle: "How tokens work",
		tokenSubtitle:
			"Tokens are your studio currency. Each generation shows the cost before you run.",
		tokenItems: [
			{
				title: "Transparent before you generate",
				body: "See the token cost on image and video steps before you click Generate.",
			},
			{
				title: "Tied to real AI usage",
				body: "Costs reflect Token billing image/video runs plus planning — not arbitrary credits.",
			},
			{
				title: "Top up without upgrading",
				body: "Buy 1,000 extra tokens for $10 whenever you need a campaign push.",
			},
		],
		faqTitle: "Billing FAQ",
		faqShowMore: "Show more questions",
		faqShowLess: "Show fewer questions",
		faq: [
			{
				q: "How do AI Tokens work?",
				body: "Tokens measure billable AI usage in the studio. Harder jobs (longer video, higher resolution, storyboard packs) use more tokens. Each paid step shows the cost before you generate.",
			},
			{
				q: "What are AI Tokens used for?",
				body: "Tokens are charged for image generation, storyboard scenes, video generation, planning/brief steps, and some analysis jobs (for example research-reel analysis). Costs are shown before you run.",
			},
			{
				q: "What happens when I run out of tokens?",
				body: "Generation is blocked until you top up or upgrade. You’ll see a clear warning before each run.",
			},
			{
				q: "How many images or videos can I create with each plan?",
				body: "It depends on format and settings. Pricing cards show approximate capacity (e.g. single images vs storyboard reels). Higher resolution and longer clips use more tokens per run.",
			},
			{
				q: "Do failed generations charge tokens?",
				body: "If an AI job fails after charge, we refund that run’s tokens to your balance. You are not meant to pay for a failed generation.",
			},
			{
				q: "Can I use Alchemy-generated content commercially?",
				body: "Yes — for lawful marketing under our Terms. You must review outputs before publishing. Heavy volume should use a paid plan for higher limits and resolution.",
			},
			{
				q: "Which platforms are supported?",
				body: "Export sizes cover common Instagram, Facebook, TikTok, Xiaohongshu (RedNote), YouTube Shorts, and general web/social ad ratios. Publishing to each network is done from your own accounts.",
			},
			{
				q: "Does Alchemy support agencies and teams?",
				body: "For higher volume: Pro raises monthly tokens; Master adds more tokens, 2K images, and Pro canvas. Custom is negotiated for enterprise needs. Built-in multi-seat team workspaces are not included yet — contact us for Custom.",
			},
			{
				q: "When can I buy extra tokens?",
				body: "After you subscribe to any paid plan. Free users upgrade first, then buy top-ups as needed.",
			},
			{
				q: "How do I upgrade my plan?",
				body: "On this Pricing page (signed in), choose a higher plan (Standard → Pro → Master) and confirm. Upgrade starts a new billing period today: Stripe credits unused time on your current plan and charges the new plan from today — we do not change Stripe product list prices. You keep remaining tokens and receive the full new plan allotment immediately (for example Standard 3,000 → Master adds 16,000 on top). Your next renewal moves forward from the upgrade (monthly or yearly, matching the plan you chose). You don’t need Manage billing to upgrade.",
			},
			{
				q: "How do I downgrade my plan?",
				body: "On this Pricing page, choose a lower plan. Downgrades are scheduled for your next billing date — you keep your current plan, features, and remaining tokens until then. The lower price and plan token allotment start on the next cycle. This avoids paying a lower price while still using a higher-tier plan mid-cycle. Manage billing is for cancel / payment methods, not for picking a lower plan.",
			},
			{
				q: "Where do I change or cancel my subscription?",
				body: "Upgrade or schedule a downgrade on this Pricing page while signed in. Cancel renewal or update cards in Manage billing (Stripe Customer Portal). After cancel, paid access continues until the end of the current period.",
			},
		],
		footnote:
			"Prices in USD. Video resolution and duration affect token cost. Paid via Stripe. Upgrade on Pricing starts a new plan month today; downgrades take effect next cycle. Cancel from Manage billing.",
		plans: {
			free: {
				name: "Free",
				description: "Try the full guided workflow",
				features: [
					"1,000 tokens (~1 image + 1 short 480p video)",
					"Guided wizard + templates",
					"480p video cap",
					"Platform research",
					"Image → video combined flow",
					"Storyboard mode",
					"A/B, Campaign, and teaching carousel",
				],
			},
			standard: {
				name: "Standard",
				listPrice: "$29.99",
				monthlyPrice: "$19.99",
				yearlyPrice: "$14.99",
				monthlySave: "33% off",
				yearlySave: "50% off",
				tokens: "3,000",
				description: "SMB owners posting weekly",
				features: [
					"3,000 tokens / month",
					"720p video",
					"1K images",
					"Email support",
				],
			},
			pro: {
				name: "Pro",
				listPrice: "$79.99",
				monthlyPrice: "$49.99",
				yearlyPrice: "$39.99",
				monthlySave: "38% off",
				yearlySave: "50% off",
				tokens: "8,000",
				description: "Agencies and power users",
				features: [
					"8,000 tokens / month",
					"1080p video",
					"1K images",
					"Priority generation",
				],
			},
			master: {
				name: "Master",
				listPrice: "$159.99",
				monthlyPrice: "$99.99",
				yearlyPrice: "$79.00",
				monthlySave: "38% off",
				yearlySave: "50% off",
				tokens: "16,000",
				description: "Teams with high volume",
				features: [
					"16,000 tokens / month",
					"1080p video + 2K images",
					"Pro canvas",
					"Priority support",
				],
			},
			custom: {
				name: "Custom",
				description: "Enterprise volume and SSO",
				features: [
					"Negotiated token pool",
					"Custom retention & SLA",
					"Dedicated onboarding",
					"Invoice / PO billing",
				],
			},
		},
		comparisonRows: [
			{
				feature: "Monthly tokens",
				free: "1,000",
				standard: "3,000",
				pro: "8,000",
				master: "16,000",
			},
			{
				feature: "Max image resolution",
				free: "1K",
				standard: "1K",
				pro: "1K",
				master: "2K",
			},
			{
				feature: "Max video resolution",
				free: "480p",
				standard: "720p",
				pro: "1080p",
				master: "1080p",
			},
			{
				feature: "Research / combined / storyboard",
				free: "✓",
				standard: "✓",
				pro: "✓",
				master: "✓",
			},
			{
				feature: "A/B, Campaign, teaching carousel",
				free: "✓",
				standard: "✓",
				pro: "✓",
				master: "✓",
			},
			{
				feature: "Email support",
				free: "—",
				standard: "✓",
				pro: "✓",
				master: "✓",
			},
			{
				feature: "Priority generation",
				free: "—",
				standard: "—",
				pro: "✓",
				master: "✓",
			},
			{
				feature: "Pro canvas",
				free: "—",
				standard: "—",
				pro: "—",
				master: "✓",
			},
			{
				feature: "Priority support",
				free: "—",
				standard: "—",
				pro: "—",
				master: "✓",
			},
			{
				feature: "Token top-up ($10 / 1k)",
				free: "—",
				standard: "✓",
				pro: "✓",
				master: "✓",
			},
		],
	},
	steps: {
		setup: "Setup",
		image: "Image",
		video: "Video",
		done: "Done",
	},
	wizard: {
		workflowLabel: "What do you want to create?",
		workflowModes: {
			"image-only": {
				title: "Generate images only",
				description: "High-quality promo stills — download PNG",
				cardDescription:
					"Generate high-quality promo images for social posts, product shots, and static ads.",
				tags: ["Social posts", "Product display", "Static ads"],
			},
			"video-only": {
				title: "Generate video only",
				description:
					"AI scenes and shots — ready-to-publish short video",
				cardDescription:
					"Use AI to create scenes and camera moves for short videos you can publish right away.",
				tags: ["Short video", "Video ads", "Product intro"],
			},
			combined: {
				title: "Generate images, then video",
				description:
					"Approve visuals first, then turn them into short video",
				cardDescription:
					"Generate and refine images first, then create a short video from the approved look.",
				tags: ["Ad creative", "Product story", "Motion ads"],
			},
		},
		creationPath: {
			stepEyebrow: "STEP 2",
			title: "Choose how to create",
			hint: "Choose generate images only, generate video only, or generate images then video.",
			bestForLabel: "Best for:",
			tipTitle: "How should I choose?",
			tipImage:
				"Best when you need stills for feed posts, carousels, or static ads.",
			tipVideo: "Best when you want a short-video-first workflow.",
			tipCombined:
				"Best when you want to approve the look, then add motion.",
			tipNote: "You can change this later",
			tipNoteBody:
				"Not sure yet? You can switch creation methods anytime in Studio.",
			backToStep1: "Back",
			continueToSetup: "Continue",
			nextTitle: "What happens next",
			nextSubtitleUnset:
				"Pick a creation method above — Studio only shows the steps that method needs.",
			nextSubtitleImage:
				"Your flow: Set up content → Generate images → Download & use.",
			nextSubtitleVideo:
				"Your flow: Set up content → Generate video → Download & use.",
			nextSubtitleCombined:
				"Your flow: Set up content → Generate images → Confirm storyboard → Generate video → Download & use.",
			nextStepsUnset: [
				{
					title: "Set up",
					body: "Add details, research, style, and assets.",
					icon: "setup",
				},
				{
					title: "Generate",
					body: "Images, video, or both — only what your method needs.",
					icon: "generate",
				},
				{
					title: "Download & use",
					body: "Edit on canvas and export.",
					icon: "done",
				},
			],
			nextStepsImage: [
				{
					title: "Set up content",
					body: "Reference, product, and image settings.",
					icon: "setup",
				},
				{
					title: "Generate images",
					body: "Create stills for your campaign.",
					icon: "image",
				},
				{
					title: "Download & use",
					body: "Edit in Canvas, then download.",
					icon: "done",
				},
			],
			nextStepsVideo: [
				{
					title: "Set up content",
					body: "Product, motion direction, and settings.",
					icon: "setup",
				},
				{
					title: "Generate video",
					body: "Create your short video when ready.",
					icon: "video",
				},
				{
					title: "Download & use",
					body: "Preview, captions, and download.",
					icon: "done",
				},
			],
			nextStepsCombined: [
				{
					title: "Set up content",
					body: "Brief, scenes, and still settings.",
					icon: "setup",
				},
				{
					title: "Confirm storyboard",
					body: "Review scene stills (not the final video yet).",
					icon: "image",
				},
				{
					title: "Generate video",
					body: "Stitch scenes into a short video.",
					icon: "video",
				},
				{
					title: "Download & use",
					body: "Preview and export the final video.",
					icon: "done",
				},
			],
		},
		videoOutputLabel: "Your video output",
		videoOutputPathLockedHint:
			"Set by visual style above — no extra video mode to pick.",
		videoOutputTypes: {
			"storyboard-reel": {
				title: "Storyboard reel",
				pipeline:
					"Step 2: scene stills (preview each) → Step 3: one stitched video generation clip with hard cuts",
				pipelineVideoOnly:
					"Setup → scene stills (when needed) → one stitched video — video-first, not a separate Image campaign step",
				pipelineImageStep:
					"Generate scene stills below — each becomes @Image1, @Image2… in your video",
				pipelineReady:
					"{count} scene stills ready → Step 3 stitches them into one reel",
				confidence:
					"Best when you want to preview before video — research reels, multi-beat ads",
				confidenceVideoOnly:
					"Video-only storyboard — preview beats, then stitch; skip if you already have one still to animate",
			},
			"animate-keyframe": {
				title: "Animate one image",
				pipeline:
					"One keyframe (Step 2 image or upload) → video generation adds smooth motion — single scene, no cuts",
				pipelineVideoOnly:
					"Setup → one keyframe (upload or generate) → video generation adds motion — Setup → Video → Done",
				pipelineImageStep:
					"Your image below becomes the video keyframe",
				pipelineReady: "Keyframe ready → Step 3 animates this still",
				confidence:
					"Fast for one product photo or ad still — simple zoom / pan / orbit",
				confidenceVideoOnly:
					"Best when you already have a still and want a reel fast — no Image-then-Video campaign path",
			},
			"reference-motion": {
				title: "Match reference video motion",
				pipeline:
					"Your clip sets pacing (@Video1) → video generation generates a new ad with similar motion",
				pipelineImageStep:
					"Reference MP4 analyzed on Setup — optional product/keyframe as @Image1",
				pipelineReady: "Reference analyzed → generate when ready",
				confidence:
					"Copies viral pacing — less preview than storyboard; one video call",
			},
			"text-reel": {
				title: "Text-only reel",
				pipeline:
					"Concept copy → video generation text-to-video — no keyframe upload",
				pipelineImageStep:
					"No image step — video from your brief on Setup",
				pipelineReady: "Prompt ready → generate video",
				confidence:
					"For concept / brand copy when you do not need a hero still",
			},
			"product-assistant": {
				title: "AI product video",
				pipeline:
					"Upload product + angles → AI plans situational motion → video generation reel",
				pipelineImageStep: "Upload kit photos on the video step first",
				pipelineReady: "Kit analyzed → generate situational reel",
				confidence: "Best for physical product with multiple photos",
			},
			"cinematic-reel": {
				title: "Cinematic reel",
				pipeline:
					"Mood keyframe(s) → 8s video generation clip per scene (stitch if multi-scene)",
				pipelineImageStep: "Generate cinematic keyframe(s) below",
				pipelineReady: "Keyframe(s) ready → Step 3 motion",
				confidence:
					"Concept mood scenes — copy in captions/voiceover, not on-screen UI",
			},
			"digital-presenter": {
				title: "UGC digital presenter",
				pipeline:
					"Product keyframe → digital presenter lip-sync to your ad-pack script (~$0.10/s)",
				pipelineImageStep:
					"Generate talking-head keyframe with product on wrist/hand below",
				pipelineReady:
					"Keyframe ready → Step 3 animates presenter with your script",
				confidence:
					"Best for bracelet/UGC-style talking ads — not video generation motion",
			},
		},
		visualStyleLabel: "Visual style",
		visualStyleHint:
			"Style auto-applies lighting and mood — works for any product category",
		visualStyleHintVideoOnly:
			"Video-only: hides info poster, brand image, and campaign styles (for when you already have a still).",
		visualStyleHintCombined:
			"Image + video: still then motion. “Storyboard reel” = AI plans scenes → multiple images → one video generation clip.",
		styleModeLabel: "Style set",
		styleModeSimple: "Show fewer (recommended)",
		styleModeAll: "Show all styles",
		artStyleLabel: "Art direction (keyframes)",
		artStyleVideoSafeHint:
			"Video-safe grades only (film / digicam flash / Chinese cinematic / cinematic). Look changes grade, not the story. @Video1 still owns spine when a reference reel is attached.",
		artStyleHint:
			"Controls AI image keyframe look — video generation only adds motion. For manga/watercolor/3D, the whole frame (including text) uses that medium; text-heavy product ads work best with concept cinematic or realistic.",
		artStyles: {
			realistic: {
				title: "Realistic photo",
				description: "Live-action commercial photography (default)",
			},
			cinematic: {
				title: "Cinematic TVC",
				description:
					"Controlled rim light, shallow DOF, premium commercial",
			},
			film: {
				title: "Film grain",
				description: "Analog grain, soft halation, nostalgic grade",
			},
			ccd: {
				title: "Digicam flash",
				description:
					"Early compact-camera flash look — candid, slightly blown highlights",
			},
			guofeng: {
				title: "Chinese cinematic",
				description:
					"Misty mountains, poetic light, photoreal product in a classical Chinese mood",
			},
			"anime-2d": {
				title: "2D anime",
				description: "Japanese cel-shaded illustration",
			},
			"cartoon-3d": {
				title: "3D cartoon",
				description: "Pixar-style 3D animated render",
			},
			"comic-webtoon": {
				title: "Comic / webtoon",
				description: "Bold outlines, flat cel shading",
			},
			watercolor: {
				title: "Watercolor",
				description: "Soft hand-painted illustration",
			},
		},
		styleAutoAppliedLabel: "Auto-applied style:",
		visualStyles: {
			product: {
				title: "Clean product",
				description:
					"Studio / lifestyle product shot — any SKU (default)",
			},
			"dark-premium": {
				title: "Dark premium",
				description:
					"Dark mood, gold accents — jewelry, watches, skincare, gifts",
			},
			"warm-shop": {
				title: "Warm shop promo",
				description: "Friendly local business / offer vibe",
			},
			"model-wear": {
				title: "Model wearing / using",
				description:
					"Product photo → photorealistic lifestyle model ad (on wrist, demo use, etc.)",
			},
			"info-poster": {
				title: "Premium info poster",
				description:
					"White-bg single-theme selling points — anti-generic-AI layout (IG technique)",
			},
			"designed-poster": {
				title: "Designed poster",
				description:
					"Commercial feed poster — bilingual type, seal, category brush word for any product (not food-only)",
			},
			"parts-poster": {
				title: "Parts breakdown",
				description:
					"Exploded product view — labeled components with title + short descriptions on one poster",
			},
			"brand-fit": {
				title: "Brand style analysis",
				description:
					"Paste website / IG → AI analyzes brand, then matching ads",
			},
			"brand-campaign": {
				title: "Brand analysis + campaign set",
				description:
					"Analyze brand → 3 linked posts (hero / selling points / offer)",
			},
			"brand-video": {
				title: "Brand motion video",
				description:
					"Analyze site / social → AI writes a motion prompt (how the reel moves)",
			},
			"creative-video": {
				title: "Creative motion brief",
				description:
					"Describe your Reel idea → AI writes a motion prompt (camera / pacing)",
			},
			"concept-cinematic": {
				title: "Concept cinematic reel",
				description:
					"Dramatic short-film look for concept stories, PSA, and viral-style clips",
			},
			"storyboard-video": {
				title: "Storyboard reel",
				description:
					"AI story per product → AI image scene stills → one video generation @Image video",
			},
			"ugc-presenter": {
				title: "UGC digital presenter",
				description:
					"Product keyframe → digital presenter talking-head lip-sync (like viral UGC product demos)",
			},
			"paper-layout": {
				title: "Fixed paper layout (legacy)",
				description:
					"Exact text on template — not full AI scene generation",
			},
			"service-promo": {
				title: "Professional service",
				description:
					"Consulting, courses, memberships — trust-led, no product packshot",
			},
			"pricing-offer": {
				title: "Pricing & offer",
				description: "Plans, packages, promos — CTA + benefit bullets",
			},
			"website-launch": {
				title: "Website / app launch",
				description: "URL or app promo — device/browser mockup mood",
			},
		},
		visualStyleHints: {
			product:
				"Clean commercial product photo — studio or bright lifestyle, any physical product",
			"dark-premium":
				"Dark luxury mood with gold highlights — not only crystals; jewelry, watches, skincare, gifts",
			"warm-shop":
				"Warm inviting shop mood; emphasize business name and offer",
			"model-wear":
				"Upload product photo → AI generates a model wearing/using it — adapts to product type, not a fixed template",
			"info-poster": "",
			"designed-poster": "",
			"parts-poster": "",
			"brand-fit": "",
			"brand-campaign": "",
			"brand-video": "",
			"creative-video": "",
			"concept-cinematic":
				"Cinematic concept video look — dramatic light, depth, emotional pacing, no on-screen text.",
			"storyboard-video":
				"Photorealistic multi-scene reel — AI adapts scenes to your product category, not a fixed template",
			"ugc-presenter":
				"UGC talking-head keyframe + digital presenter lip-sync — best for bracelet/jewelry demo reels like viral 數字人 ads",
			"paper-layout": "",
			"service-promo":
				"Service marketing — typography-led trust design, not a product hero shot",
			"pricing-offer":
				"Pricing / offer card — clear CTA; only use prices from your offer field",
			"website-launch":
				"Launch promo — app or website mockup mood; logo/screenshot optional",
		},
		brandVideoIntro:
			"Paste your site or IG @handle. AI analyzes the brand, then writes a motion prompt (camera + mood — not spoken script). Optional product photo for the Reel.",
		modelWearIntro:
			"Upload a product photo — AI generates a photorealistic 9:16 lifestyle ad with a model wearing or using the product. Bracelets go on wrist; devices show real use. Use Advanced framing to control face vs hands-only.",
		creativeVideoIntro:
			"Describe your short video in plain language (e.g. kung fu fight then drink the product). AI writes a motion prompt for how the reel should move — not a spoken voiceover. Optional product photo or keyframe.",
		creativeBriefLabel: "Creative video brief (required)",
		creativeBriefPlaceholder:
			"e.g. Hero faces five opponents in kung fu, wins, then drinks the energy drink — cinematic, fast pace",
		brandCampaignIntro:
			"After brand analysis, AI plans 3 linked posts, then generates each — same brand DNA, different message per slide.",
		brandFitTitle: "Brand style analysis (optional)",
		brandFitTitleRequired: "Brand style analysis (optional)",
		brandFitIntro:
			"Optional: paste your site or IG @handle. AI can extract colors and tone. Skip if you don’t have a website — continue with your copy and product photo.",
		brandAnalyzeOptionalIntro:
			"Optional: analyze a website or social profile so prompts stay on-brand. No website? Skip and continue.",
		brandWebsiteLabel: "Brand website (optional)",
		brandWebsitePlaceholder: "https://yourshop.com",
		brandSocialLabel: "Social profile (optional)",
		brandSocialPlaceholder: "@yourbrand or IG profile URL",
		brandAnalyzeBtn: "Analyze brand",
		brandAnalyzeBusy: "Analyzing…",
		infoPosterTechniqueTitle: "IG info-poster technique (built in)",
		infoPosterTechniqueIntro:
			"Do not cram all copy on one image. This workflow builds a premium white-background info graphic:",
		infoPosterTechniqueSteps: [
			"Product category — infer from name and photo (beauty, jewelry, food…)",
			"Selling points — one bullet per line in subline, max 3–4",
			"Simplified copy — headline covers ONE theme only",
			"Single topic per image — one message per still",
			"Category visuals — subtle props/colors for the category",
			"Premium white style — bright white, airy layout, not dark AI look",
			"Quality check — avoid overcrowded text and generic template frames",
		],
		infoPosterBulletsPlaceholder:
			"One selling point per line, e.g.:\nBoost daily energy\nEasy to wear\nSubtle premium look",
		designedPosterTechniqueTitle: "Designed commercial poster (built in)",
		designedPosterTechniqueIntro:
			"XHS/IG feed poster grammar — product/scene hero plus designed type chrome (any category — not food-only, not a blank catalog cutout):",
		designedPosterTechniqueSteps: [
			"Hero photography — soft upper-left light, shallow DOF, set matched to THIS product category",
			"Bilingual type stack — big CN title → EN all-caps → short script tagline",
			"Circular seal + one brush category word that matches the product (e.g. 數碼 / 護膚 / 甜品 / 課程)",
			"Palette from the product/scene — cohesive, not rainbow",
			"Works for electronics, beauty, F&B, fashion, and concept/service scenes",
		],
		designedPosterTaglinePlaceholder:
			"Short line on the poster, e.g. All-day power / Soft & Fresh",
		partsPosterTechniqueTitle: "Parts breakdown poster (built in)",
		partsPosterTechniqueIntro:
			"Technical exploded-view poster — deconstruct the product into labeled parts with title + short descriptions (not violent destruction):",
		partsPosterTechniqueSteps: [
			"Keep product identity from your photo — shape, color, materials",
			"Explode into floating components with thin leader lines + callouts",
			"Title on top; supporting copy = one short part description per line",
			"Clean studio background — readable at phone size",
			"Product-only path — needs a clear product photo",
		],
		partsPosterPartsPlaceholder:
			"One part callout per line, e.g.:\nBattery — all-day charge\nShell — matte grip\nChip — fast charge IC",
		requirementsLabel: "Extra requirements (optional)",
		requirementsPlaceholder:
			"e.g. soft daylight, no hands, streetwear vibe…",
		requirementsPlaceholders: {
			product:
				"e.g. food photography, white backdrop, fresh skincare look, streetwear…",
			"dark-premium":
				"e.g. luxury watch mood, perfume dark tones, tea set gold highlights…",
			"warm-shop":
				"e.g. grand opening, wooden counter, neighborhood shop feel…",
			"model-wear":
				"e.g. masculine calm mood, window natural light, no price text…",
			"info-poster":
				"e.g. fresh skincare mood, natural food styling, minimal jewelry pedestal…",
			"designed-poster":
				"e.g. soft upper-left light, appetite set, bilingual type, seal + brush category…",
			"parts-poster":
				"e.g. dark studio, thin leader lines, 6 callouts, graphite palette…",
			"brand-fit":
				"Filled after analysis; tweak product or scene if needed",
			"brand-campaign":
				"Optional campaign theme, e.g. spring launch — 3 posts on benefits",
			"brand-video":
				"Optional extra motion/mood notes — main prompt comes from brand analysis",
			"creative-video":
				"Creative brief is above; add extra motion/mood notes here if needed",
			"concept-cinematic":
				"e.g. dramatic rim light, fantasy hall, cinematic lens, emotional suspense, no logos or UI overlays",
			"storyboard-video":
				"e.g. photorealistic, soft light, show product in use, no prices…",
			"ugc-presenter":
				"e.g. cozy home office, female presenter, show bracelet on wrist, Cantonese UGC vibe…",
			"paper-layout":
				"Paper template uses your exact text — usually leave this empty",
			"service-promo":
				"e.g. calm trust colors, testimonial vibe, class schedule feel…",
			"pricing-offer":
				"e.g. highlight middle tier, soft gradient, no invented prices…",
			"website-launch":
				"e.g. app mockup on phone, clean SaaS UI, launch countdown mood…",
		},
		campaignThemeLabel: "Campaign theme (optional)",
		campaignThemePlaceholder:
			"e.g. grand opening 3-post series, new product benefits…",
		imageOutputModeLabel: "How many images?",
		imageOutputModeHint:
			"Campaign generates 3 linked posts (~3× image API cost + AI planning)",
		imageOutputModeHintDesignedPoster:
			"This poster style is one finished still — A/B, campaign, and teaching carousel don’t fit this look.",
		imageKeyframeModeLabel: "Keyframe count",
		imageKeyframeModeHint:
			"Image→video only needs 1 keyframe to animate (optional A/B pick). Not storyboard — use Image-only for Campaign / teaching carousel.",
		imageOutputModes: {
			single: {
				title: "Single image",
				description: "One promo still (default)",
			},
			ab: {
				title: "A / B versions",
				description: "Two variations — pick your favorite",
			},
			campaign: {
				title: "Campaign set",
				description: "3 linked posts — hero, selling points, offer",
			},
			"teaching-carousel": {
				title: "Teaching carousel",
				description: "4–6 educational slides — cover, points, recap",
			},
		},
		imageAspectRatioLabel: "Post size (aspect ratio)",
		imageAspectRatioHint:
			"1K output. Pick 4:5 for IG/FB feed; 9:16 for Reels/Stories; 1:1 for square posts.",
		imageAspectRatios: {
			"9:16": {
				title: "9:16 Reels / Stories",
				description: "Vertical video frame · ~768×1365 px @ 1K",
			},
			"4:5": {
				title: "4:5 Feed portrait",
				description: "IG/FB feed default · ~928×1152 px @ 1K",
			},
			"1:1": {
				title: "1:1 Square",
				description: "Square feed / carousel · ~1024×1024 px @ 1K",
			},
		},
		imagePreflightAspect: "Size: {ratio} @ 1K",
		imagePostflightTitle: "Quality check — your generated image",
		imagePostflightResolution: "{width}×{height} pixels (1K generation)",
		imagePostflightAspect: "Aspect: {ratio}",
		imagePostflightSafeForVideo:
			"Ready for video — 9:16 and sharp enough for video generation",
		imagePostflightNotSafeForVideo:
			"May need tweaks before video — check aspect ratio or resolution",
		imagePostflightLowRes: "Low resolution — product detail may be soft",
		imagePostflightVerySmall: "Very small image — regenerate recommended",
		imagePostflightAnalyzing: "Analyzing image quality…",
		imageVisionReviewTitle: "AI quality scan",
		imageVisionReviewAnalyzing:
			"Checking for garbled text and off-brief visuals…",
		imageVisionReviewScore: "Fit score: {score}/100",
		imageVisionReviewSummary: "{summary}",
		imageVisionReviewIssues: "Issues: {issues}",
		imageVisionReviewPass: "Looks on-brief — safe to continue.",
		imageVisionContinueWarn:
			"Quality scan flagged issues — review below or regenerate before continuing.",
		imageVisionShipItBlocked:
			"Ship-it paused — regenerate the image or fix flagged text/brand issues first.",
		imagePostGenChecklistTitle: "Quick confidence check",
		imagePostGenChecklistHint:
			"Confirm before continuing — or regenerate if something looks off.",
		imagePostGenProductReadable: "Product is clearly visible and readable",
		imagePostGenTextLegible:
			"On-image text is legible (or textless as intended)",
		imagePostGenRegenerateBtn: "Regenerate image",
		imagePostGenRegenerating: "Regenerating…",
		imagePostGenAllChecked: "Looks good — safe to continue or ship.",
		shipItModeOn: "Ship-it mode — fewer choices, faster path",
		shipItModeOff: "Expert mode — all options visible",
		shipItModeHint:
			"Hides advanced prompts and expert controls. Your settings are kept — nothing is deleted.",
		shipItShowExpert: "Show expert options",
		shipItRunBtn: "Ship it — image + video + BGM",
		shipItRunning: "Shipping…",
		shipItRunHint:
			"One click: generate image (if needed), then video with library background music.",
		shipItUnsupported:
			"Ship-it works for standard product image→video only. Switch to expert mode for storyboard, presenter, or concept paths.",
		campaignPlanLabel: "Campaign outline",
		campaignGenerating: "Planning and generating campaign set… (~1–3 min)",
		campaignProgressPlanning: "Planning campaign outline…",
		campaignProgressRendering:
			"Generating campaign slide {current}/{total}…",
		teachingCarouselProgressPlanning: "Planning teaching carousel slides…",
		teachingCarouselProgressRendering:
			"Generating carousel slide {current}/{total}… (~2–4 min total)",
		storyboardBriefLabel: "Story / style notes (optional)",
		storyboardBriefPlaceholder:
			"e.g. photorealistic, soft light; show nasal washer in use; no prices; hands OK, no face…",
		storyboardIntro:
			"AI plans scenes for your product category (jewelry, devices, skincare, etc.) and writes a video generation @Image storyboard prompt — not a fixed bracelet template.",
		storyboardGenerating:
			"Planning storyboard and generating scene images… (~2–5 min)",
		storyboardProgressPlanning: "Planning storyboard with AI…",
		storyboardProgressRendering:
			"Generating scene images {current}/{total}…",
		progressEta: "ETA ~{seconds}s",
		progressEtaMinutes: "ETA ~{minutes} min",
		storyboardPlanLabel: "Storyboard plan",
		storyboardPlanReviewHint:
			"Generate a AI outline first, edit any odd scenes, then create the stills.",
		storyboardPlanBtn: "Generate storyboard outline",
		storyboardPlanBusy: "AI is planning…",
		storyboardPlanReplanBtn: "Re-plan outline",
		storyboardPlanThemeLabel: "Story theme",
		storyboardPlanSceneDescLabel: "Scene description",
		storyboardPlanCopyLabel: "On-image copy (optional)",
		storyboardPlanCameraLabel: "Camera / motion (English, editable)",
		storyboardPlanLightingLabel: "Lighting (English, editable)",
		storyboardShotMapTitle: "Shot map (review before generate)",
		storyboardLookBibleLabel: "Look bible (grade lock):",
		storyboardShotMapEmptyStill: "Still pending",
		tvcShotRoles: {
			establish: "Establish",
			macro: "Macro",
			"logo-trace": "Logo trace",
			orbit: "Orbit",
			lifestyle: "Lifestyle",
			payoff: "Payoff",
		},
		tvcShotJobs: {
			establish: "Where am I? Hero in a world.",
			macro: "Why is this premium? Texture / logo.",
			"logo-trace": "Trace the mark. Keep geometry locked.",
			orbit: "Energy / use. Turntable or hand in use.",
			lifestyle: "Life context. Product stays the hero.",
			payoff: "Remember / buy. Pack + claim energy.",
		},
		storyboardTapToReview: "Tap to review",
		storyboardCellReviewed: "Reviewed",
		storyboardApproveNeedLookHint:
			"Tap every still first. Video will animate mistakes — regen a bad cell, don’t generate video to hide it.",
		storyboardApproveCheckbox: "These stills are good — continue to video",
		storyboardApproveHint:
			"Optional: tap a cell to zoom. Regen a bad one anytime. Approval clears if a still changes.",
		storyboardApproveRequiredHint:
			"Approve the shot-map stills before generating video.",
		storyboardPlanPlacementLabel: "Product / concept placement",
		storyboardPlanPunchLabel: "Punch line / caption beat",
		videoEngineLabel: "Video engine",
		videoEngineSeedance: "Seedance (default)",
		videoEngineMinimaxH3: "MiniMax H3 (faces / product lock)",
		videoEngineHint:
			"Simple studio picks the engine: Seedance when you attach a research reel, MiniMax H3 for stills and posters. Kling is stills-only backup.",
		storyboardSceneLabel: "Scene",
		storyboardVideoIntro:
			"These stills are locked into the video. Regen a bad cell in review — generating will not invent a better ad. With a research reel: Seedance copies that spine, then MiniMax H3. Stills only: H3 first, Kling stitch if H3 fails.",
		storyboardVideoPreflight:
			"Reel: Seedance R2V → MiniMax H3. Stills: MiniMax H3 → Kling stitch",
		klingStoryboardFallbackNote:
			"Storyboard video — Kling fallback: each scene still becomes a short clip, then we stitch them together",
		storyboardMinimaxH3Note:
			"Storyboard video — MiniMax H3 single clip from scene stills (no stitch)",
		storyboardSeedanceR2vNote:
			"Storyboard video — Seedance reference-to-video (@Video1 spine + stills, quality)",
		storyboardEnginePipelineHint:
			"Research reel: Seedance quality R2V → MiniMax H3 (never Kling). Stills only: MiniMax H3 → Kling 5s/10s stitch.",
		researchReelCopyingNote:
			"Copying your reference — if faces are blocked we retry MiniMax H3.",
		switchToMotionPosterBtn: "Use motion poster instead (cheaper)",
		switchToMotionPosterHint:
			"Skip multi-scene stitch — animate one keyframe with micro-motion only.",
		lookBiblePaletteLabel: "Palette",
		lookBibleLightingLabel: "Lighting",
		lookBibleMaterialsLabel: "Materials",
		lookBibleNegativesLabel: "Avoid",
		seedanceToKlingFallbackNote:
			"Seedance was blocked for this request — used Kling storyboard (per-scene clips + stitch) instead",
		seedanceToMinimaxH3FallbackNote:
			"Seedance was blocked for this request — used MiniMax H3 (keeps reference motion when possible)",
		klingStoryboardClipCount: "clips × {n}",
		storyboardDurationLabel: "Target duration",
		storyboardDurationHint:
			"Affects how many scenes are planned. Regenerate scene images if you change this.",
		storyboardAllScenesHint:
			"Stills are textless for clean video. Scene copy burns in as captions after generate.",
		storyboardCaptionsAutoNote: "Auto-burned scene copy as captions",
		storyboardCaptionsReadyNote:
			"Scene scripts ready — open Caption studio to edit timing, voice, and burn",
		storyboardAllScenesImageHint:
			"Every scene is used in the video — do not pick a “version” below.",
		storyboardTrimDurationLabel: "Trim duration preset",
		storyboardSceneCountLabel: "Scene count",
		storyboardSceneCountAuto: "Auto",
		storyboardSceneCountHint:
			"Duration sets video length (synced to Step 3). Scene count controls how many stills AI plans.",
		storyboardEditorHint:
			"Mini editor: reorder scenes, replace one image, then regenerate video in-app.",
		storyboardMoveUpBtn: "Move up",
		storyboardMoveDownBtn: "Move down",
		storyboardReplaceImageBtn: "Replace image",
		storyboardRegenerateAiBtn: "Regenerate with AI",
		storyboardRegenerateAiCostHint:
			"Charged as a new scene image run (2× tokens if brand logo is on).",
		storyboardStampLogoBtn: "Stamp brand logo",
		storyboardStampingLogo: "Stamping logo…",
		storyboardStampLogoHint:
			"Stamps your Brand kit logo as a corner badge (no AI redraw, no charge).",
		storyboardStampLogoCornerHint:
			"Stamps your Brand kit logo as a corner badge (no AI redraw, no charge).",
		storyboardReplacingImage: "Replacing…",
		storyboardRegeneratingImage: "Regenerating…",
		storyboardRegenerateConfirm:
			"Regenerate Scene {scene} with AI now? This makes a new model call and charges again.",
		storyboardKeyframeSectionTitle: "Storyboard refs (@Image1…@ImageN)",
		storyboardPromptLabel: "video generation storyboard prompt",
		storyboardPromptHint:
			"AI tagged each scene as @Image1, @Image2… Review before generating video.",
		storyboardPromptEditLabel: "Edit storyboard prompt (advanced)",
		ugcPresenter: {
			setupIntro:
				"Step 2: AI image builds a talking-head keyframe with your product. Step 3: digital presenter lip-syncs your ad-pack script (~$0.10/s). Plan ad pack + preview voice before generating video.",
			imageStepIntro:
				"Generate a UGC presenter keyframe — face visible, product on wrist/hand. This still is animated with digital presenter (not video generation).",
			videoStepIntro:
				"Open Ad pack → plan script → preview voice → Generate video. Lip-sync is baked into the clip.",
			imagePreflight:
				"Mode: UGC keyframe for digital presenter (talking-head, product in hand)",
			videoPreflight:
				"Mode: digital presenter lip-sync (not video generation)",
			voiceBakedInNote:
				"Presenter voice is lip-synced in the video — no separate dub step.",
			needScript:
				"Ad pack voiceover script is required for the digital presenter.",
			needAdPackHint:
				"Open Ad pack on this step — plan script (and preview voice) before generating.",
		},
		primaryPathsTitle: "Primary creation paths",
		primaryPathsHint:
			"Start with one of these 2 paths. More styles are under Advanced.",
		videoPathsTitle: "Video creation paths",
		videoPathsHint:
			"Pick how to make your Reel — photo → motion prompt, or follow a reference reel.",
		videoAssistantStepHint:
			"AI Video Assistant selected — continue to Step 3 to upload product, packaging, and angle photos; AI will analyze and write the motion prompt.",
		primaryPathsShortcutNote:
			"These are quick shortcuts. In Advanced you can still pick the same style with more options.",
		primaryPathsHiddenResearchHint:
			"Content research already set your reference layout and output mode — add your product photo and copy, then continue.",
		pathQuickTitle: "Quick Ad",
		pathQuickDesc: "Fast image/video ad for most products.",
		pathQuickVideoDesc:
			"One product photo + AI writes a motion prompt → short silent promo reel (add BGM/captions later).",
		pathModelTitle: "Model Wear/Use",
		pathModelDesc:
			"Shortcut to model-wear style (also available in Advanced).",
		pathStoryboardTitle: "Storyboard Reel",
		pathStoryboardDesc: "AI plans multi-scene story and video.",
		pathUgcPresenterTitle: "UGC digital presenter",
		pathUgcPresenterDesc:
			"Talking-head lip-sync promo (keyframe + digital presenter).",
		pathReferenceTitle: "Reference layout",
		pathReferenceDesc:
			"Upload a reference ad — keep layout, swap in your product and copy.",
		pathReferenceVideoTitle: "Follow reference reel",
		pathReferenceVideoDesc:
			"Upload a reference MP4 — we analyze it for motion/edit feel (not a frame copy). Your product photo is still @Image1.",
		sceneReelTitle: "Scene reel",
		sceneReelDesc:
			"A short scene from your idea. Optional website / IG for brand tone; optional MP4 for camera feel.",
		contentResearchSectionTitle: "Content research (optional)",
		contentResearchSectionHint:
			"Find trending posts for layout inspiration — skip if you already have a reference.",
		conceptPathsTitle: "Main concept paths",
		conceptPathsHint:
			"For services, websites, and offers — not product packshots.",
		conceptVideoPathsTitle: "Concept video paths",
		conceptVideoPathsHint:
			"Same concept brief powers the video — no product photo required. Pick a style, apply fields, then continue to video.",
		closestMatchRecipeTitle:
			"Closest-match recipe (cinematic social style)",
		closestMatchRecipeHint:
			"Image → video workflow: 3 AI keyframes, 3 video generation clips stitched (~24s). Clean silent video — add BGM and captions on Done.",
		closestMatchRecipeApply: "Apply closest-match recipe",
		closestMatchRecipeApplied: "Closest-match recipe applied",
		quickTest8sRecipeTitle: "8s test recipe (lower cost)",
		quickTest8sRecipeHint:
			"Single keyframe + one 8s video generation clip (480p fast). Clean silent video — add BGM and captions on Done. ~1/3 the cost of the 24s stitch.",
		quickTest8sRecipeApply: "Apply 8s test recipe",
		quickTest8sRecipeApplied: "8s test recipe applied",
		conceptCinematicPathsTitle: "Concept cinematic reel (image → video)",
		conceptCinematicPathsHint:
			"Generate a still keyframe first, then animate with video generation. Best quality for viral cinematic Reels — not pure text-to-video.",
		conceptCinematicSingleTitle: "Single scene (~8s)",
		conceptCinematicSingleDesc:
			"One keyframe + one clip — quick cinematic hook.",
		conceptCinematicSingleImageStepIntro:
			"8s cinematic mode: click “Generate cinematic keyframe” to plan 1 scene + 1 keyframe (no product photo).",
		conceptCinematicSingleOutputTitle: "Output: 1 cinematic keyframe",
		conceptCinematicSingleOutputDesc:
			"AI plans the scene and video generation motion prompt, then generates one 9:16 keyframe.",
		conceptCinematicSingleNoPosterHint:
			"⚠️ Keyframe = cinematic scene (bar, people, mood) — NOT a product poster. Copy is added later via captions/voiceover, not baked into the image.",
		conceptSocialImageStepIntro:
			"Concept social post: AI builds a bold IG/FB creative with your hook and CTA woven into the layout — not a plain white infographic poster.",
		conceptSocialImageHint:
			"Tip: run Analyze concept on Setup first. Use “People / body in shot” below to control model faces.",
		conceptCarouselModeHint:
			"Teaching carousel = multi-card tips. With a reference upload in concept mode, we match topic + colors/typography only (style-only) — each slide gets a new layout, not a clone of your reference.",
		conceptNoStyleMemoryHint:
			"Each generation is independent — the AI does not remember which image you liked last time. For consistent style, use “Reference concept” or describe the look in Advanced settings.",
		conceptCinematicSingleGenerateBtn: "Generate cinematic keyframe",
		conceptCinematicSingleGenerating:
			"Planning scene and generating keyframe…",
		imagePreflightConceptCinematicSingle:
			"8s cinematic: AI plans 1 scene + 1 keyframe.",
		imagePreflightConceptSocial:
			"Concept social post: bold IG/FB creative with hook and CTA in the layout — not a white infographic poster.",
		conceptCinematicSingleVideoStepIntro:
			"8s reel: click “Generate full reel” for 1 video generation clip (clean silent video — add BGM/captions on Done).",
		conceptCinematicSingleGenerateVideoBtn: "Generate full reel (8s)",
		conceptCinematicSingleSceneReady: "Keyframe ready — 0–8s",
		conceptCinematicSingleRecipeSteps: [
			"1) Fill concept in Setup, Step 2 click “Generate cinematic keyframe”.",
			"2) Step 3 click “Generate full reel” — clean silent video generation clip.",
			"3) On Done: download, or open caption & audio studio for BGM and wording.",
		],
		conceptCinematicStitchTitle: "Multi-scene stitch",
		conceptCinematicStitchDesc:
			"Multiple keyframes + clips stitched — closer to viral montage Reels.",
		cinematicSceneCountLabel: "Scene count",
		cinematicSceneCountOption: "{count} scenes (~{totalSec}s)",
		cinematicSceneCountTotalHint: "≈ {totalSec}s total",
		cinematicSceneCountHint:
			"AI plans one script beat per scene. Each clip is 8s; more scenes = faster pacing and higher cost.",
		imagePreflightCinematicStitch:
			"Cinematic stitch: AI plans {count} scenes, then {count} keyframe images (~{count}× image cost).",
		cinematicReelPlanLabel: "Reel theme",
		cinematicStitchImageStepIntro:
			"{count}-scene stitch: one click plans and generates {count} keyframes (~{totalSec}s reel). No product photo needed.",
		cinematicStitchOutputTitle: "Output: {count} keyframes",
		cinematicStitchOutputDesc:
			"AI writes one beat per scene. Change scene count above before generating — each scene gets its own still + video generation clip.",
		cinematicStitchGenerateBtn: "Generate {count} keyframes",
		cinematicStitchGenerating: "Planning scenes and generating keyframes…",
		cinematicStitchImageHint:
			"Continue to video — we will generate {count} video generation clips and stitch them into one reel.",
		cinematicStitchVideoPreflight:
			"{count}-scene cinematic stitch: {count} image-to-video clips + local stitch",
		cinematicStitchFfmpegNote:
			"Stitching is done by local stitch (each clip is animated separately)",
		cinematicLogoStampNote:
			"Brand logo stamped on stills before video (same corner/size on every scene).",
		cinematicLogoModeBNote:
			"When “Use brand logo on video stills” is on, each video keyframe gets your Brand kit logo (Nano Banana picks natural placement).",
		cinematicLogoStampHint:
			"Upload your logo in Brand kit, then turn on “Use brand logo on video stills”. Regenerate video stills to apply. For images, use Edit image instead.",
		cinematicStitchWorkflowOrder:
			"Order: {count} video generation clips → local stitch. Add BGM and captions later on Done. Script/music auto-plan is optional in Ad pack / caption studio.",
		cinematicStitchVideoCost:
			"{count} video generations + stitch (higher cost than single clip)",
		cinematicStitchClipCount: "Clips stitched",
		cinematicStitchRecipeSteps: [
			"1) Fill concept on Setup, pick scene count, generate keyframes on Step 2.",
			"2) On Step 3 click Generate full reel — video generation clips + stitch (silent).",
			"3) On Done: download clean MP4, or open caption & audio studio.",
		],
		cinematicStitchVideoStepIntro:
			"{count}-scene stitch: Generate full reel runs {count} video generation clips + stitch (BGM/captions optional after).",
		cinematicStitchGenerateVideoBtn:
			"Generate full reel ({count}-scene stitch)",
		cinematicStitchScenesReady:
			"{ready}/{count} scene keyframes ready — all {count} will be stitched",
		conceptVideoSameBriefHint:
			"Video mode uses the same concept fields. Upload a reference image first (optional), then AI analyze — then continue to video.",
		conceptVideoImageLabel: "Reference image for video (optional)",
		conceptVideoImageHint:
			"Your poster, illustration, or photo — AI will read it and plan how to animate it.",
		conceptVideoImageOrderHint:
			"If you have your own image: upload here first, then run AI concept analysis so AI knows what is in the frame.",
		conceptWizardTitle: "Concept Wizard (for non-physical offers)",
		conceptWizardHint:
			"Fill these 6 blocks, then auto-apply to headline/subline/offer and prompt direction.",
		conceptIdeaPlaceholder:
			"Your concept in one short paragraph (e.g. World Cup watch-party booking campaign for HK football fans).",
		conceptAudiencePlaceholder: "Audience: who should this ad speak to?",
		conceptPainPlaceholder: "Pain point: what problem do they feel now?",
		conceptPromisePlaceholder: "Promise: what outcome can they get?",
		conceptProofPlaceholder: "Proof/mechanism: why should they trust this?",
		conceptCtaPlaceholder: "Offer + CTA: what should they do now?",
		conceptVisualMetaphorPlaceholder:
			"Visual metaphor: what scene or symbolic visual should appear?",
		conceptAnalyzeBtn: "AI analyze concept",
		conceptAnalyzeBusy: "AI analyzing concept…",
		conceptAnalyzeReady:
			"Concept draft filled. Review and apply to fields.",
		conceptApplyBtn: "Apply concept to fields",
		conceptApplyHint:
			"Applies promise to headline, pain+proof to subline, CTA to offer, and audience/metaphor to extra requirements.",
		pathInfoTitle: "Info / education",
		pathInfoDesc: "Bullet benefits, how-it-works — IG feed friendly.",
		pathBrandTitle: "Brand / website",
		pathBrandDesc: "Analyze site or social → on-brand prompts.",
		pathPricingTitle: "Pricing / offer",
		pathPricingDesc: "Plans, packages, limited promos + CTA.",
		pathWebsiteTitle: "Website / app",
		pathWebsiteDesc: "Launch promo — logo or screenshot optional.",
		imagePreflightTitle: "Before generating image",
		imagePreflightSingle: "Single image generation call.",
		imagePreflightAB: "A/B mode: 2 image generations (about 2x cost).",
		imagePreflightCampaign:
			"Campaign set: 3 linked images + planning call.",
		imagePreflightCampaignReference:
			"Reference ad + product photo: layout follows your reference; product and copy come from your uploads.",
		referenceBriefTitle: "Reference creative brief",
		referenceBriefAnalyzing:
			"Analyzing your reference — layout, colors, typography…",
		referenceBriefAnalyzingWait:
			"Wait for reference analysis to finish before continuing.",
		referenceBriefAnalyzed:
			"Reference analyzed — generation will borrow design, not copy content.",
		referenceCarouselBriefAnalyzed:
			"Reference carousel analyzed ({count} slides) — planner and generation will match per-slide layout and shared style.",
		researchReelAnalyzed:
			"Reference reel analyzed — visual style and edit rhythm follow the reference; content uses your topic and copy. A frame from the video replaced the search thumbnail as the style reference. Step 2: scene stills. Step 3: video generation stitch.",
		referenceVideoAnalyzed:
			"Reference video analyzed — motion prompt written from your clip. Generation uses digest montage + your product photo.",
		referenceVideoAnalyzing: "Analyzing your reference video…",
		researchReelAnalyzing:
			"Analyzing reference reel and planning storyboard…",
		researchReelAnalyzeFirstHint:
			"Wait for reel storyboard analysis, or upload a product photo first.",
		referenceR2vDurationHint:
			"Long reels become a 15s digest montage (hook + middle + close) for video generation; analysis scans the full video. Your 6s output is a complete mini-ad arc, not just the opening 15s.",
		researchReelSetupTitle: "Reference reel → storyboard video",
		researchReelSetupTitleConcept: "Reference reel → storyboard short",
		researchReelSetupIntro:
			"After picking a trending reel: download MP4 → AI analyzes shots and plans storyboard → upload product photo → Step 2 AI image scene stills → Step 3 video.",
		researchReelSetupIntroConcept:
			"After picking a trending reel: download MP4 → analyze visual style and edit rhythm → Step 2 scene stills from reference cover + your copy (style from reference, content yours) → Step 3 stitch. Reference topic and your topic can be totally unrelated.",
		researchReelStatusPost: "Reference post selected",
		researchReelStatusMp4:
			"Reference MP4 ready (search download or your upload)",
		researchReelMp4Missing:
			"Reference MP4 missing — wait for search download, upload your own MP4 below, or search again.",
		researchReelMp4OptionalCombined:
			"Image posts don't need MP4 (optional) — style images + AI storyboard are enough.",
		researchReelStatusProductPhoto: "Product photo uploaded",
		researchReelStatusProductPhotoOptional:
			"Product photo (upload here, or on Step 2)",
		researchReelStatusConceptCopy: "Headline / concept copy filled",
		researchReelStatusConceptCopyMissing:
			"Pick a research angle or fill headline / concept assistant",
		researchReelUploadProductHint:
			"Your product photo — each storyboard scene still is generated from it with reference pacing",
		researchReelUploadMp4Hint:
			"Search auto-download or upload your own MP4/MOV — either works; we analyze style and pacing the same way",
		researchReelPickDurationFirst:
			"Pick an output duration above (not Auto) before reference analysis — the reel plan and video generation billing use this length.",
		researchReelReanalyzeForDuration:
			"Duration changed — re-analyzing reference reel…",
		researchReelStatusOutputDuration:
			"Output duration selected (for analyze & billing)",
		researchReelStatusOutputDurationMissing:
			"Pick output duration (4–12s) first — reference can be long; your billable length is what you choose here",
		setupReferenceVideoTitle: "Reference reel (optional)",
		setupReferenceVideoIntro:
			"Upload a reference ad MP4 on Step 1 to analyze style and edit rhythm before scene generation. Skip if you prefer product photo + AI assistant or text-only video with no reference.",
		setupReferenceVideoHint:
			"MP4 or MOV · optional — analyzed automatically when headline/product is filled",
		setupReferenceVideoSkipNote:
			"Optional — you can still generate video without a reference (product promo, AI video assistant, or text prompt).",
		setupReferenceVideoWaitingCopy:
			"Reference MP4 uploaded — fill headline or product name above, then we analyze style and pacing automatically.",
		setupReferenceVideoAnalyzeRequired:
			"Reference MP4 needs analysis first — go back to Step 1, fill headline/product, and tap Continue to analyze.",
		setupReferenceVideoNonStoryboardHint:
			"Reference MP4 mainly drives Step 3 video (R2V). For scene stills in Step 2, pick visual style 「Storyboard video」 on Step 1.",
		imageStepReferenceReelTitle: "Reference reel (from Step 1)",
		imageStepReferenceReelStyle: "Locked visual style",
		imageStepReferenceReelStoryboardHint:
			"Generate scene stills below — each beat follows this reference look; your headline drives the content.",
		imageStepReferenceReelNeedStoryboardTitle:
			"Reference reel needs Storyboard mode",
		imageStepReferenceReelNeedStoryboardHint:
			"You uploaded a reference MP4 but Step 2 is still on single-image mode. Switch to Storyboard video so AI image generates multiple scene stills from the reference analysis.",
		imageStepReferenceReelSwitchStoryboardBtn: "Switch to Storyboard video",
		continueToSimilarVideo: "Continue → generate similar reel",
		referenceBriefAnalyzeFailed:
			"Could not analyze reference. You can still generate.",
		referenceBriefStrategyLabel: "Strategy",
		referenceBriefLayoutDetected: "Layout",
		referenceBriefColors: "Colors",
		referenceBriefSceneSpine: "Scene",
		referenceBriefBorrow: "Borrow from reference",
		referenceBriefReplace: "Replace with yours",
		referenceBriefFootnote:
			"Unrelated references are OK — we keep design grammar and swap in your product and copy.",
		referenceStrategyKind: {
			none: "No reference",
			styleOnly: "Match reference style (pixels)",
			layoutTransfer: "Layout transfer (reference + product)",
			productClone: "Product photo polish",
			moodOnly: "Mood & motion only",
		},
		referenceLayerLabel: {
			layout: "Layout",
			visualStyle: "Visual style",
			topic: "Topic",
			subjects: "Hero subject",
			text: "On-image text",
			mood: "Mood & light",
			staging: "Staging pose",
		},
		referenceLayerAction: {
			keep: "keep",
			adapt: "adapt",
			replace: "replace",
			ignore: "ignore",
		},
		imagePreflightTeachingCarousel:
			"Teaching carousel: {count} educational slides + planning call.",
		teachingCarouselSlideCountLabel: "How many slides?",
		teachingCarouselSlideCountOption: "{count} slides",
		teachingCarouselSlideCountHint:
			"Week 1 “No Prompt” post needs 5 (cover → 3 steps → CTA). Max 6.",
		imagePreflightStoryboard:
			"Storyboard mode: multiple scene images + AI planning.",
		conceptResearchReelStoryboardImageStepIntro:
			"Preview every scene still before video — pick duration and scene count, then generate. Your headline/concept copy drives each frame (no product photo required).",
		conceptResearchReelStoryboardImagePreflight:
			"Concept storyboard: reference visual style + your topic/copy — no product photo. Reference cover drives the look.",
		quickFixTitle: "Quick fix (minor issues)",
		quickFixImageHint:
			"Describe what to fix — we edit the image you selected above. For text, say exactly what wording, size, or style you want.",
		quickFixEditingSlide: "Editing: {label}",
		quickFixVideoHint:
			"Apply one tip note, then regenerate video — regenerating uses video tokens (not free).",
		quickFixRealism: "Improve realism",
		quickFixText: "Remove text/logo",
		quickFixLighting: "Adjust lighting",
		quickFixLogoTitle: "Change / add logo",
		quickFixLogoHint:
			"Upload a PNG (transparent background works best). We composite it onto your selected image.",
		quickFixLogoUploadBtn: "Upload logo",
		quickFixLogoChangeBtn: "Change logo file",
		quickFixLogoPlacementLabel: "Logo placement",
		quickFixLogoNoteLabel: "Extra note (optional)",
		quickFixLogoNotePlaceholder:
			"e.g. Smaller logo, do not cover the product",
		quickFixLogoApplyBtn: "Apply logo",
		quickFixLogoPlacements: {
			"bottom-right": "Bottom right",
			"bottom-left": "Bottom left",
			"top-right": "Top right",
			"top-left": "Top left",
			center: "Center",
			replace: "Replace existing logo",
		},
		quickFixCustomLabel: "Or describe the problem",
		quickFixCustomPlaceholder:
			"e.g. Make the headline larger and bold, or change text to “Summer Sale”",
		quickFixApplyBtn: "Apply fix",
		quickFixRefining: "Applying fix…",
		quickFixLessMotion: "Less motion",
		quickFixNoFace: "No face",
		quickFixMinor: "Fix minor artifacts",
		quickFixCreditReady:
			"AI quick fixes use image tokens (~{tokens} each) — same as a normal image generation.",
		quickFixCreditUsed:
			"AI quick fixes use image tokens (~{tokens} each). Text/logo overlay burn does not charge tokens.",
		quickFixVideoTipReady:
			"One suggested tip for this clip. Regenerating video still uses video tokens.",
		quickFixVideoTipUsed:
			"Tip already applied. You can still regenerate from Video with your own notes — that uses video tokens.",
		quickFixTabPresets: "Quick presets",
		quickFixTabRegions: "Select areas",
		quickFixTabTextEditor: "Add your text",
		quickFixTabInpaint: "Paint & inpaint",
		quickFixInpaintHint:
			"1) Highlight what to change (brush or box). 2) Erase = AI heals from surroundings. 3) Or type a prompt and Replace — only the highlight is regenerated.",
		quickFixInpaintBrush:
			"Brush over the area to change (tap for a small spot)",
		quickFixInpaintClear: "Clear mask",
		quickFixInpaintPrompt:
			"Replace example: 改成「認識金砂石」 / marble surface",
		quickFixInpaintApply: "Apply inpaint",
		quickFixInpaintNeedMask: "Highlight at least one area first.",
		quickFixInpaintEraseBtn: "Remove painted area",
		quickFixInpaintFillBtn: "Replace with my description",
		quickFixInpaintBrushSize: "Brush size",
		quickFixInpaintAiSteps:
			"Cover the whole unwanted box with purple.\nRemove = delete (no typing).\nReplace wrong words: type 改成「正確字」 then Replace.\nFor perfect fonts: Remove, then add text in the text step.",
		quickFixRegionHint:
			"Drag on the image to mark areas to fix. Describe each zone — all zones are sent in one AI edit.",
		quickFixRegionDrawHint:
			"Draw a box, then type what to change inside it (up to 5 zones per fix).",
		quickFixRegionZoneLabel: "Zone {n}",
		quickFixRegionInstructionPlaceholder:
			"e.g. Remove logo here / brighten this area",
		quickFixRegionAddZoneBtn: "Add zone manually",
		quickFixRegionRemoveZoneBtn: "Remove",
		quickFixRegionApplyBtn: "Apply area fixes",
		quickFixRegionNeedZone:
			"Draw at least one area and describe what to change.",
		quickFixRegionMaxZones: "Maximum 5 zones per fix.",
		quickFixRegionInpaintBtn: "Refine in inpaint editor (brush + zones)",
		quickFixRegionInpaintDirectBtn: "Inpaint zones now (FLUX Fill)",
		quickFixTextEditorHint:
			"For exact copy and position: remove AI text first, then place your own words on the image.",
		quickFixStripTextBtn: "Remove AI text & open editor",
		quickFixTextOverlayHint:
			"Add your own text, shapes, and logo on top of the image. First erase AI text in Clean if you need a blank area — then type here and burn.",
		quickFixTextOverlayDragHint:
			"Drag layers to move · rotate with the handle · Cmd/Ctrl+Z undo · Delete removes selected",
		quickFixTextLayerLabel: "Text {n}",
		quickFixTextLayerPlaceholder: "Headline or subline",
		quickFixTextStyleLabel: "Style preset",
		quickFixTextAddLayerBtn: "Add text line",
		quickFixTextRemoveLayerBtn: "Remove",
		quickFixDuplicateLayerBtn: "Duplicate",
		quickFixBringForwardBtn: "Bring forward",
		quickFixSendBackwardBtn: "Send backward",
		quickFixNoLogoHint:
			"Upload a logo in Brand Kit first, then add it here",
		quickFixTextApplyBtn: "Apply text to image",
		quickFixTextNeedLayer: "Add at least one text line.",
		quickFixTextRestoreBtn: "Restore AI image",
		quickFixShapeLayerLabel: "Shape {n}",
		quickFixColorLabel: "Color",
		quickFixAddShapeBtn: "Add shape",
		quickFixFillColorLabel: "Text / fill color",
		quickFixStrokeColorLabel: "Outline color",
		quickFixAlignLabel: "Alignment",
		quickFixAlignLeft: "Left",
		quickFixAlignCenter: "Center",
		quickFixAlignRight: "Right",
		quickFixOpacityLabel: "Opacity",
		quickFixStrokeWidthLabel: "Border width",
		quickFixFontSizeLabel: "Font size",
		quickFixLayersLabel: "Layers",
		quickFixMarketingTitle: "Quick layouts",
		quickFixMarketingHint:
			"Add one block at a time — each stacks below the last. Drag to position.",
		quickFixShapeRect: "Rectangle",
		quickFixShapeCapsule: "Capsule",
		quickFixShapeCircle: "Circle",
		quickFixShapeLine: "Line",
		quickFixShapeArrow: "Arrow",
		quickFixShapeBadge: "Badge",
		quickFixShapeButton: "Button",
		quickFixShapeCheck: "Check icon",
		quickFixMarketingSlideNum: "Slide #",
		quickFixMarketingTitleBlock: "Title",
		quickFixMarketingCapsule: "Capsule label",
		quickFixMarketingBullet: "Bullet row",
		quickFixMarketingDivider: "Divider + label",
		quickFixMarketingCta: "CTA button",
		imageTextModeTitle: "On-image text",
		imageTextModeHint:
			"Choose whether AI renders headline copy on the image, or you add text yourself in Quick fix (one generation either way).",
		imageTextModeIntegrated: "AI text on image",
		imageTextModeIntegratedHint:
			"Headline and subline baked into the generation prompt.",
		imageTextModeTextless: "Textless background",
		imageTextModeTextlessHint:
			"Clean plate — add your own typography in Quick fix → Add your text.",
		imageTextlessPostHint:
			"Textless image ready — open Quick fix → Add your text to place headline, shapes, and logos.",
		batchExportTitle: "Batch export sizes",
		batchExportHint:
			"Resize the current image to common ad ratios (9:16, 1:1, 4:5, 16:9) for multi-platform posting.",
		batchExportBtn: "Export all sizes",
		batchExportBusy: "Exporting…",
		batchExportDownload: "Download {size}",
		batchExportFailed: "Export download failed — try again.",
		batchExportSelectedSlide: "Sizes apply to selected slide: {label}",
		downloadAllSlides: "Download all slides (original)",
		exportAllSlidesAllSizes: "Export all slides × all sizes",
		doneAllSlidesTitle: "Your generated slides",
		downloadSlide: "Download PNG",
		presenterPicker: {
			title: "Digital presenter",
			hint: "Use your Step 2 keyframe face, or pick a stock digital presenter avatar (no product photo required).",
			customKeyframe: "My keyframe image",
			stockAvatar: "Stock avatar",
		},
		videoVariants: {
			title: "Script & hook variants",
			hint: "AI plans alternate hooks and scripts — pick one before generating video.",
			planBtn: "Plan 3 variants",
			planning: "Planning variants…",
			generateAllBtn: "Generate all videos (parallel)",
			generatingAll: "Generating videos…",
			variantRunning: "Generating…",
			downloadVariant: "Download this variant",
		},
		brandKit: {
			title: "Brand kit",
			hint: "Save your logo once. For video: turn on “Use brand logo on video stills” below. For images: add the logo anytime in Edit image.",
			uploadLogo: "Upload logo",
			changeLogo: "Change logo",
			endWithLogoLabel: "Use brand logo on video stills",
			endWithLogoHint:
				"Video only — composites your logo onto each video keyframe/still (2× image tokens; placement chosen to fit the frame). For images, add logo anytime in Edit image instead.",
			useLogoLabel: "Use brand logo on video stills",
			useLogoHint:
				"Video only — composites your logo onto each video keyframe/still (2× image tokens; placement chosen to fit the frame). For images, add logo anytime anywhere in Edit image.",
			primaryColor: "Primary",
			secondaryColor: "Secondary",
			accentColor: "Accent",
			tagline: "Default tagline",
			taglinePlaceholder: "e.g. Free shipping this week",
			saveBtn: "Save brand kit",
			saving: "Saving…",
			savedNote: "Brand kit saved to your account.",
			localOnlyNote:
				"Saved on this device (sign in + MongoDB for cloud sync).",
			addLogoToCanvas: "Add brand logo",
			clearLogo: "Remove logo",
		},
		pickCampaignSlideLabel: "Pick one to continue (or download all)",
		pickTeachingCarouselSlideLabel:
			"Teaching carousel — pick one to preview (download all)",
		carouselSlideCountLabel: "slides",
		campaignSlideRoles: {
			hero: "Hero",
			"selling-points": "Selling points",
			offer: "Offer",
		},
		imageCreativeLabel: "How should we create your image?",
		imageCreativeModes: {
			"promo-ai": {
				title: "AI promo image",
				description:
					"Product photo + your brief → style inferred from product and copy (not a fixed template)",
			},
			"reference-concept": {
				title: "Inspired by reference",
				description:
					"Keep reference layout and design elements; venue and lighting fit your product/shop; your headline copy",
			},
		},
		imageRefConceptLabel: "Reference ad (design guide)",
		imageRefConceptHint:
			"Upload an ad design you like — AI keeps layout, decorative elements, and product pose; venue and lighting adapt to your product/shop; use your own headline/subline.",
		imageRefConceptActiveHint:
			"Keeps reference design language (layout, components, in-hand/flat-lay pose) + your product photo + your copy. Venue, background, and lighting adjust for your product and shop — reference wording is not copied.",
		referenceConceptOverridesStyle:
			"Reference mode: design follows the reference ad; venue, lighting, and background fit your product and visual style (e.g. dark premium affects mood only). Pick “hands only” if the reference shows hands.",
		referenceConceptStyleOnlyHint:
			"Style reference uploaded — the image is sent to AI image to match the reference visual style and layout grammar; headlines and scene content use YOUR topic (can be totally unrelated to the reference).",
		referenceOptionalCopyHint:
			"Reference sets layout and style. Headline and subline are prefilled from research rewrites — edit anytime; leave blank for a minimal product still.",
		imageRefAutoModeNote:
			"Reference ad detected — generating with “Inspired by reference” (not a plain product polish).",
		uploadPreviewLabel: "Your upload (not generated yet)",
		aiImageResultLabel: "AI generated result",
		originalImageLabel: "Using original photo (no AI)",
		videoCreativeLabel: "How should we create your video?",
		conceptVideoCreativeLabel: "How should we create your concept video?",
		conceptVideoCreativeMode: {
			title: "Concept video (from brief)",
			description:
				"Uses your Concept Wizard copy — no product photo. Write the AI motion prompt first, then generate.",
		},
		conceptVideoStepIntro:
			"Concept mode: your anti-fight / PSA / service message becomes the video brief. Use “Concept video”, write the motion prompt, then generate — skip product uploads.",
		conceptVideoPromptSectionTitle: "AI motion prompt (from your concept)",
		conceptVideoPromptSectionHint:
			"No keyframe needed — video generation runs from text. Tap “AI write motion prompt” above first.",
		conceptVideoPromptPending:
			"Tap “AI write motion prompt” above — your Concept Wizard copy will become the motion brief.",
		conceptVideoReferenceModeTitle: "Reference clip mode",
		conceptVideoReferenceModeHint:
			"Optional: upload a reference MP4 to match pacing. Concept copy still guides the message.",
		conceptVideoUseReferenceInstead: "Use a reference clip instead",
		conceptVideoBackToBrief: "Back to concept video (from brief)",
		conceptVideoKeyframeFromSetup:
			"Using your Step 1 reference image as @Image1 — AI will animate this still while keeping your concept message.",
		conceptVideoRefKeyframeReady:
			"Reference reel analyzed — generates from @Video1 motion. No product photo needed.",
		cinematicRecipeTitle: "Concept cinematic recipe (recommended flow)",
		cinematicRecipeSteps: [
			"1) On Step 2, generate a cinematic keyframe (or upload a reference still).",
			"2) On Video, tap “AI write motion prompt” for camera / pacing text.",
			"3) Click Plan script & music, then pick one AI music track.",
			"4) Generate video — image → video with optional voice + subtitle burn.",
		],
		conceptAnalyzeApplied: "Fields applied — continue to video when ready.",
		videoCreativeModes: {
			"product-assistant": {
				title: "AI video assistant",
				description:
					"Upload product + packaging + angles → AI analyzes photos → situational video generation reel",
			},
			"product-promo": {
				title: "Product promo video",
				description:
					"Animate your product / keyframe — smooth commercial motion",
			},
			"motion-poster": {
				title: "Motion poster",
				description:
					"Start still (no type) + end still (with type) → H3 interpolates. Not a normal product I2V.",
			},
			"social-drip": {
				title: "Social drip (三分屏)",
				description:
					"Meme 3-band gag with a falling metaphor — not a lifestyle TVC. Check fit before generate.",
			},
			"reference-concept": {
				title: "Inspired by reference video",
				description:
					"Your product + reference MP4 → motion & edit concept (not a clone)",
			},
			"image-to-video": {
				title: "Image → video",
				description:
					"Use the AI image from Step 2 — best for full image-then-video flow",
			},
		},
		motionPosterHint:
			"Jimeng-style start→end: two designed poster stills (textless start, typed end with a large masthead). MiniMax H3 interpolates so product and words move together. Costs 2 images + 1 short clip.",
		motionPosterBuildingStill: "Step 1/3: textless start still…",
		motionPosterBuildingEnd: "Step 2/3: typed end still…",
		motionPosterAnimatingCard: "Step 3/3: H3 interpolating start→end…",
		motionPosterArtStyleTitle: "Poster look",
		motionPosterArtStyleHint:
			"Style of the Nano Banana still — realistic, 3D, comic, film…. Motion is applied after. Default is realistic photo.",
		motionPosterDialectTitle: "Poster motion",
		motionPosterDialectHint:
			"Same 即梦 start→end method, different beat (type reveal, 3D card, parallax, pour…). Auto picks a fit — generate again to try another.",
		motionPosterDialectAuto: "Auto · best fit",
		motionPosterDialects: {
			"card-warp": {
				title: "3D card",
				desc: "Flat start → warped card + masthead",
			},
			"kinetic-type": {
				title: "Type reveal",
				desc: "Wide textless → closer hero + large type",
			},
			parallax: {
				title: "Parallax",
				desc: "Wide scene → close hero + type",
			},
			"light-sweep": {
				title: "Light sweep",
				desc: "Dim silhouette → lit turn + type",
			},
			"liquid-reveal": {
				title: "Liquid reveal",
				desc: "Calm vessel → pour/steam + type",
			},
			"scene-breathe": {
				title: "Atmosphere",
				desc: "Still air → settle + masthead",
			},
			"designed-poster": {
				title: "Designed poster",
				desc: "Appetite hero → bilingual type + seal + brush word",
			},
		},
		motionPosterTypeOverlayNote: "Type overlay",
		motionPosterTypeOverlaySkipped:
			"Type overlay skipped — showing atmosphere clip only",
		motionPosterNeedKeyframe:
			"Add a product photo, scene still, or keyframe first for motion poster.",
		socialDripHint:
			"三分屏 meme: hero → fake IG bar → cute polished cartoon. Something falls across the bar. Not a photoreal lifestyle ad.",
		socialDripPlanningMetaphor: "Planning crossing metaphor…",
		socialDripBuildingStill: "Step 1/3: social-drip start still…",
		socialDripBuildingEnd: "Step 2/3: social-drip end still…",
		socialDripAnimatingCard: "Step 3/3: H3 interpolating start→end…",
		socialDripMetaphorTitle: "Crossing metaphor",
		socialDripMetaphorHint:
			"Auto picks a metaphor that fits your category. Wrong pick (e.g. mouth-pour on serum) gets flagged below.",
		socialDripMetaphorAuto: "Auto · AI pick",
		socialDripNoReferenceNote:
			"Reference video is disabled for Social drip — layout is owned by this recipe.",
		socialDripNeedKeyframe:
			"Add a product photo (or concept topic) first for Social drip.",
		socialDripFitTitle: "What this format can do",
		socialDripFitGoodTitle: "Works well",
		socialDripFitGoodItems: [
			"Physical product with a clear pour/fall (burger cheese, serum drip…)",
			"Bottom = simple line-art person lying on their back (meme gag)",
			"Brand kit logo + brand handle on the IG bar",
			"Concept ONLY if you can show falling creatives (posters/cards raining down)",
		],
		socialDripFitBadTitle: "Won’t work well — pick another path",
		socialDripFitBadItems: [
			"Abstract concept slogans with no falling visual (use Motion poster / Image→video)",
			"Empty light beams or invented slogans instead of your headline",
			"Cartoon of the product itself under a real product",
			"Multi-shot TVC or cloning a reference reel",
		],
		socialDripFitLevels: {
			good: "Good fit for Social drip",
			caution: "Possible, but action may look weird",
			mismatch: "Poor fit — change metaphor or video style",
		},
		socialDripFitReasons: {
			good_fnb: "Food/drink pour gag fits this format.",
			good_beauty_skin: "Beauty works as a skin drip onto a doodle — not mouth drinking.",
			good_sparkle: "Sparkle cascade onto hands/shoulders fits jewelry.",
			good_fashion: "Confetti or fabric fall fits fashion launches.",
			good_tech: "Energy beam onto a doodle fits electronics.",
			good_wellness: "Steam or petals onto a doodle fits wellness.",
			good_general: "Use a clear falling metaphor that matches the product.",
			good_concept_falling:
				"Concept can work if creatives visibly rain down (cards/posters) — not abstract light only.",
			caution_mouth_nonfood:
				"Open-mouth pour is an F&B gag — weird for non-food.",
			caution_beauty_pour:
				"Serum into an open mouth looks like drinking. Prefer Serum drip.",
			caution_concept_pour:
				"Concept topics rarely need a mouth-pour — prefer confetti / petals / beam.",
			caution_concept_abstract:
				"This concept is abstract. Social drip needs falling creatives (素材/海报 raining). Or use Motion poster.",
			caution_no_product_photo:
				"Add a product photo so the fall has a clear origin.",
			mismatch_no_falling:
				"This product has no natural falling metaphor — try Image→video.",
			mismatch_wrong_metaphor:
				"This metaphor doesn’t match the product category.",
		},
		socialDripFitSuggest: "Suggested metaphor: {metaphor}",
		socialDripMetaphors: {
			pour: { title: "Pour", desc: "Edible sauce/syrup into doodle mouth — F&B only" },
			glow: { title: "Serum drip", desc: "Thin dropper drip onto cheeks — beauty" },
			sparkle: { title: "Sparkle", desc: "Dense glitter cascade — jewelry & fashion" },
			steam: { title: "Steam", desc: "Dense steam plume — cafe, spa, home" },
			confetti: { title: "Confetti", desc: "Heavy confetti fall — fashion & launches" },
			"light-streak": {
				title: "Energy beam",
				desc: "Thick beam onto doodle — tech",
			},
			fabric: { title: "Fabric fall", desc: "Ribbon falls straight down — soft goods" },
			petals: { title: "Petals", desc: "Dense petal cascade — wellness & concept" },
		},
		videoSettingsTitle: "Video settings",
		videoReferenceOutputSettingsTitle: "Output length & quality",
		videoReferenceOutputSettingsHint:
			"Reference reel sets motion and pacing — pick how long and sharp the generated clip should be.",
		videoSetupOutputSettingsTitle: "Output length & quality (affects cost)",
		videoSetupOutputSettingsHint:
			"Tokens are based on video duration and resolution — pick these before uploading or analyzing a reference reel. The reference MP4 can be much longer; your output length here is what you pay for (AI compresses the reference into a complete short ad).",
		videoSettingsResolution: "Resolution",
		videoResolutionPlanHint: "Your plan includes up to {max}.",
		videoResolutionUpgradeLink: "Upgrade for higher resolution",
		videoSettingsDuration: "Duration",
		videoSettingsMotion: "Camera / motion",
		videoSettingsCreativity: "Motion energy",
		videoCreativityLevels: {
			subtle: "Soft — gentle zoom",
			lively: "Lively — varied motion (recommended)",
			cinematic: "Cinematic — multi-beat TVC feel",
		},
		videoAutoSecondFrame:
			"Auto-create a second scene (one upload → richer video)",
		videoAutoSecondFrameHint:
			"AI makes an alternate angle (e.g. on wrist) as the end frame so video generation can move between two looks — not just zoom.",
		extraAnglesLabel: "Extra product angles (optional)",
		extraAnglesHint:
			"2–3 photos of the same item — more dynamic motion via multi-angle mode",
		extraAnglesCta: "Add angle photos",
		endFrameLabel: "Closing frame (optional)",
		endFrameHint: "Override auto — upload your own second shot",
		videoRichMotionNote:
			"Using lively motion + second frame for a more interesting clip than zoom-only.",
		videoWearVarietyTitle: "Want more variety or on-body wearing?",
		videoWearVarietyTips: [
			"Reference-video mode: motion follows @Video1 — if the clip has no hands, the output usually won’t add them.",
			"For on-wrist / in-hand: pick a reference MP4 with hands; use raw product photo as @Image1 (static ad keyframes are harder); set advanced framing to hands only.",
			"For more variety: use Lively or Cinematic creativity; or switch to Product promo + enable auto second frame (still life → on wrist).",
			"You can also generate an on-wrist still as the end frame, or add to the video prompt: gentle hand lifts bracelet onto wrist, face never shown.",
			"Full-face models are not supported — hands, feet, or torso only (no identifiable face).",
		],
		videoSettingsFast: "Fast mode (lower cost, draft quality)",
		videoDurationAuto: "Auto",
		videoMotionStyles: {
			"slow-push": "Slow push-in",
			"gentle-orbit": "Gentle orbit",
			"static-glow": "Subtle shimmer (locked)",
			"pull-out": "Slow pull-out",
		},
		preGenerate: {
			title: "Before you generate (no need to learn every setting)",
			hint: "AI filled the idea — check these 3 things, then tap Generate full Reel.",
			keyframeLabel: "Keyframe",
			keyframeReady: "Ready",
			keyframeMissing: "Generate keyframe in Step 2 first",
			keyframeConceptRefReady:
				"Reference MP4 analyzed — ready to generate (no product photo)",
			keyframeConceptStoryboardReady:
				"Scene stills ready — preview above before generating video",
			motionLabel: "Motion",
			audioLabel: "Audio",
			voiceOn: "Voiceover on",
			voiceOff: "Voiceover off",
			captionsOn: "Captions burn on",
			captionsOff: "Captions off",
			aiMusic: "AI music",
			downloadTip:
				"Download the final MP4 from Done — not the raw *_video.mp4 file.",
			stableMotionBtn: "Stable camera (minimal motion)",
			cinematicMotionBtn: "Cinematic motion (recommended)",
			adPackBtn: "Voice, music & captions →",
			advancedHint:
				"Cinematic reel defaults to orbit / push / pull camera moves. Use stable only if you want a near-static clip.",
		},
		step1Title: "Step 1 — Output & product info",
		step1Hint:
			"Choose image, video, or both. Fill product details — AI builds from your inputs.",
		setupHints: {
			"image-only":
				"Next: create an image by describing it, from one reference photo, or from your product + a style reference.",
			"video-only":
				"Next: upload your product still (for @Image1), then optionally a reference ad MP4 to copy motion (@Video1).",
			combined:
				"Next: AI image from your product, then video — reference ad MP4 optional on the video step.",
		},
		setupCallouts: {
			"image-only":
				"Image workflow — no video step. Choose how to create the photo on the next screen.",
			"video-only":
				"Video workflow — video generation + BGM. Upload product photo + reference ad MP4 on the next screen.",
			combined:
				"Full ad — generate/polish image first, then animate it. Reference MP4 copies motion like before.",
		},
		imageInputLabel: "How do you want to create the image?",
		imageInputModes: {
			"product-ad": {
				title: "Product → ad (recommended)",
				description:
					"Upload your product photo only — AI keeps your item and makes a clean, premium ad image (no style reference)",
			},
			"product-style": {
				title: "Product + style reference",
				description:
					"Upload product + a second reference image to copy that ad’s layout, lighting, and mood",
			},
			describe: {
				title: "Describe only",
				description:
					"No upload — write what you want in the prompt (use product name from Step 1)",
			},
			reference: {
				title: "Reference image only",
				description:
					"Upload one ad/photo — AI matches its look for your product description",
			},
		},
		videoSectionKeyframe: "1. Keyframe (@Image1)",
		videoSectionReference: "2. Reference ad — copy motion (@Video1)",
		videoSectionBgm: "3. Background music",
		continueNext: "Continue",
		continueToImage: "Continue",
		continueToVideo: "Continue",
		approveGenerateVideoBtn: "Approve & generate video",
		finishImage: "Finish → Download",
		mobileVideoBusy: "Generation in progress — wait for it to finish.",
		mobileVideoNeedPrompt:
			"Write or confirm the motion prompt before generating.",
		mobileVideoNeedPlan:
			"Analyze the photo and write a motion prompt first (product assistant).",
		mobileVideoBlocked: "Complete the steps above before generating video.",
		step2Title: "Step 2 — Promotional image",
		step2Hint:
			"Upload your product photo. AI generates a new ad image — or applies a reference concept if you chose that mode.",
		step2Hints: {
			"image-only":
				"Pick one of three ways below, then generate. Download when done — no video.",
			combined:
				"Default: upload product only for a clean ad image. Use “Product + style reference” only if you want to copy another ad’s look.",
		},
		imageModelLabel: "Image AI model",
		imageModels: {
			"nano-banana-2-edit": {
				label: "AI image Edit (default)",
				hint: "Upload product photo → AI designs a new ad, keeps your item",
			},
			"nano-banana-edit": {
				label: "AI image Edit (legacy)",
				hint: "Upload product photo → AI polishes it, keeps your item",
			},
			"nano-banana": {
				label: "AI image — text only",
				hint: "No upload needed — describe product in Step 1 name + prompt",
			},
			"nano-banana-pro-edit": {
				label: "AI image Pro Edit (advanced)",
				hint: "Higher quality edit — needs product photo upload",
			},
		},
		twoVariantsLabel: "Generate 2 versions at once",
		twoVariantsHint:
			"Two images from the same settings — pick your favorite (~2× API cost)",
		pickVariantLabel: "Pick a version to continue",
		variantA: "Version A",
		variantB: "Version B",
		exactTextHint:
			"Need exact on-image Chinese text? AI images often misspell words.",
		exactTextCta: "Use paper + sticker template → exact headline on layout",
		uploadQualityLowRes:
			"Photo resolution is a bit low (800×800+ recommended) — you can still generate, but fine product detail may be soft.",
		uploadQualityVerySmall:
			"Photo is very small (under 512px) — please upload a clearer product shot.",
		imageRefLabel: "Style reference image (photo, optional)",
		imageRefHint:
			"For image AI only — layout/lighting/mood. Not the video MP4 reference (that is on the Video step).",
		styleRefPromptActive:
			"Style reference detected — prompt switched to match your reference image (composition, lighting, overlays). Regenerate to apply.",
		productAdHint:
			"AI designs a promo still from your headline/subline/offer — same product, plus ad copy and a polished background. No reference image needed.",
		imageRefCta: "Choose reference image",
		imageRefChange: "Change reference",
		videoKeyframeLabel: "Keyframe image",
		videoKeyframeHint:
			"The still image video generation will animate (your photo or a generated image)",
		downloadImage: "Download image",
		imageDoneTitle: "Your image is ready",
		imageDoneHint:
			"Download the PNG. You can start a video workflow separately if needed.",
		generateImageBtn: "Generate image",
		storyboardGenerateScenesBtn: "Generate storyboard scenes",
		regenerateImageBtn: "Regenerate image",
		tokenCostHint: "Uses ~{n} tokens",
		imageReviewRegenerateHint: "Not happy?",
		imageReviewRegenerateLink: "Regenerate",
		imageReviewHeroBefore: "Review your",
		imageReviewHeroAccent: "generated content.",
		imageReviewHeroHint:
			"Preview, edit, download, or regenerate your content.",
		imageReviewCompleteTitle: "Generation completed!",
		imageReviewCompleteBodySingle: "Your image is ready to review.",
		imageReviewCompleteBodyMany: "Your {n} cards are ready to review.",
		imageReviewCompleteSingle:
			"Generation completed! Your image is ready to review.",
		imageReviewCompleteMany:
			"Generation completed! Your {n} images are ready to review.",
		imageReviewStoryboardReadyTitle: "Storyboard visuals ready",
		imageReviewStoryboardReadyBody:
			"4-beat stills are the product. Regen a bad cell, then confirm once. Video animates these frames.",
		imageReviewStoryboardHeroBefore: "Review your",
		imageReviewStoryboardHeroAccent: "storyboard visuals.",
		imageReviewStoryboardHeroHint:
			"Check the grid, regen a bad cell if needed, then confirm. Video will not invent a better ad.",
		imageReviewPathLabel: "Path",
		imageReviewPathImagesVideo: "Images → Video",
		imageReviewVisualSetLabel: "Visual set",
		imageReviewVisualSetStoryboard: "Storyboard scenes",
		imageReviewFailedTitle: "Generation failed",
		imageReviewFailedBody:
			"Fix the issue below, then try again. You weren’t charged for a failed run when noted.",
		imageReviewGeneratedHeading: "Generated content ({n})",
		imageReviewGeneratedSub: "{mode} for {product}",
		imageReviewPreviewCarousel: "Preview as carousel",
		imageReviewMetaOutput: "Output type",
		imageReviewMetaAspect: "Aspect ratio",
		imageReviewMetaCount: "Total cards",
		imageReviewAddLogoBtn: "Add Logo",
		imageReviewEditCanvasBtn: "Edit in Canvas",
		imageReviewRegenerateOneBtn: "Regenerate",
		sidePanelRequirementsTitle: "Requirements",
		sidePanelCostTitle: "Estimated cost",
		sidePanelTipsTitle: "Tips",
		sidePanelReqReady: "Ready",
		sidePanelReqMissing: "Needed",
		imageReviewRegenerateBannerTitle: "Not satisfied with the results?",
		imageReviewRegenerateBannerBody:
			"Regenerate content with the same brief or make changes and try again.",
		imageReviewRegenerateBannerBtn: "Regenerate Content",
		imageReviewGenerateOneMore: "Generate one more",
		imageReviewSteps: [
			"Choose what to promote",
			"Add your details",
			"AI Analyze",
			"Choose style",
			"Generate content",
		],
		videoReviewHeroBefore: "Review your",
		videoReviewHeroAccent: "generated video.",
		videoReviewHeroHint:
			"Preview and download the silent reel, or open caption studio for BGM and on-screen text.",
		videoReviewCompleteTitle: "Generation completed!",
		videoReviewCompleteBody: "Your video is ready to review.",
		videoReviewCompleteEmpty:
			"No video yet — regenerate or go back and try again.",
		videoReviewFailedTitle: "Video generation failed",
		videoReviewFailedBody:
			"Check the error below, then return to video setup. You weren’t charged when the attempt failed before billing.",
		videoReviewGeneratedHeading: "Generated video",
		videoReviewGeneratedSub: "{style} for {product}",
		videoReviewMetaDuration: "Duration",
		videoReviewMetaResolution: "Resolution",
		videoReviewMetaStyle: "Style",
		videoReviewRegenerateOneBtn: "Regenerate",
		videoReviewRegenerateBannerTitle: "Not satisfied with the results?",
		videoReviewRegenerateBannerBody:
			"Regenerate the reel with the same brief or make changes and try again.",
		videoReviewRegenerateBannerBtn: "Regenerate video",
		videoReviewGenerateOneMore: "Generate one more",

		useOriginalBtn: "Use my upload as-is (skip to video)",
		useOriginalImageOnlyBtn: "Use my upload as-is (no AI)",
		imageReadyHint: "Happy with this image? Continue to make the video.",
		imageReadyHintCombined:
			"This image becomes @Image1 for video — continue when you’re happy.",
		combinedVideoKeyframeCallout:
			"Your Step 2 promo still is video generation @Image1 (image-to-video). To copy reference motion, switch to “Inspired by reference video”.",
		combinedCreativeImageHint:
			"Generate a promo still here that matches your creative brief — the video step animates this image.",
		combinedRefKeyframeNote:
			"Reference mode: use your raw product photo as @Image1 (not the ad still) so video generation can match @Video1 motion.",
		step3Title: "Step 3 — Video (AI motion)",
		step3Hint:
			"video generation animates your image. Optional: upload a reference ad MP4 to copy its motion (@Image1 + @Video1).",
		step3Hints: {
			"video-only":
				"Default: AI video assistant — upload product (+ packaging / angles), analyze, then generate. Or switch to product promo / reference MP4.",
			combined:
				"Your image from Step 2 is @Image1. Add a reference ad MP4 below to copy motion — same as before.",
		},
		generateVideoBtn: "Generate video",
		step4Title: "Step 4 — Your ad is ready",
		step4Hint:
			"Download the clean silent MP4, or open audio & caption studio to add BGM and wording.",
		videoDoneEmptyTitle: "No video yet",
		videoDoneEmptyHint:
			"Generation did not finish. Go back and try again — or use a product-only photo / skip a reference reel that shows people.",
		videoDoneEmptyBack: "Back to video step",
		uploadLabel: "Product photo",
		uploadLabelConcept: "Hero image (optional)",
		uploadHint: "JPG, PNG or WEBP · clear photo of your product works best",
		uploadHintConcept:
			"Logo, app screenshot, or brand graphic — optional; copy-only also works",
		uploadCta: "Tap to choose photo",
		uploadChange: "Change photo",
		referenceLabel: "Reference ad video (MP4)",
		referenceHint:
			"Upload a short MP4 ad you want to copy. AI will put your product (@Image1) into similar motion/style as @Video1.",
		referenceVideoOnlyHint:
			"MP4 or MOV · optional but recommended to copy motion from a real ad",
		needKeyframeGoBack:
			"No keyframe yet — go Back, generate an image (or use your upload), then return here.",
		referenceImageOnlyHint:
			"You uploaded an image — for AI motion matching, upload a video reference (MP4).",
		referenceModeNote:
			"Used reference-to-video: your product photo + reference ad.",
		referenceModeActive:
			"Reference video detected — AI uses your keyframe as @Image1 and matches @Video1 motion.",
		referenceVideoTooLong:
			"Reference is ~{seconds}s — video generation only uses the first 2–15s. Trim an 8–12s highlight in CapCut before upload for a closer match.",
		referenceVideoTips:
			"Reference tips: ① Trim to 8–12s (not a full 30s reel) ② Product photo must match the item in the ad ③ Avoid screen recordings (IG buttons) ④ Use “Inspired by reference video” + 720p.",
		videoRefAutoModeNote:
			"Reference MP4 detected — using “Inspired by reference video” (not image-to-video, which ignores your clip).",
		videoRefProductMismatch:
			"Reference shows hands/stringing — use your raw product photo as @Image1 (not the generated ad still) so video generation can match motion.",
		videoRefUseProductPhoto:
			"Tip: using the AI ad still as @Image1 — upload the raw product photo instead for better motion match.",
		videoGenPathLabel: "video generation path",
		videoRefIgnoredOnImageMode:
			"Reference MP4 uploaded but mode is “Product motion” — it will be ignored. Switch to “Inspired by reference video” to match the clip.",
		videoPreflightTitle: "Pre-flight check",
		videoPreflightModeProduct:
			"Mode: product image → video (image-to-video)",
		videoPreflightModeRef:
			"Mode: product image + reference MP4 (reference-to-video)",
		videoPreflightModeConceptRef:
			"Mode: reference MP4 (concept R2V) — follow @Video1 motion, no product photo",
		videoPreflightSettings:
			"Quality {resolution} · duration {duration} · {tier}",
		videoPreflightTierFast: "Fast draft (cheaper)",
		videoPreflightTierQuality: "Standard quality",
		videoPreflightStyle: "Visual style: {style}",
		videoPreflightSecondFrame:
			"Will call image API once for an auto second frame (~extra image cost) — turn off “Auto-create a second scene” to save",
		videoPreflightSingleCall:
			"Expected: 1× video + local BGM (no extra image)",
		videoPreflightDoubleCall: "Expected: 1× image + 1× video + BGM",
		videoPreflightAI: "+1× AI motion prompt (brand / product analysis)",
		planVideoPromptBtn: "AI write motion prompt",
		planVideoPromptBusy: "AI writing motion prompt…",
		planVideoPromptReady:
			"Motion prompt ready — review below, then generate",
		planVideoPromptDurationRefresh:
			"Output length changed — AI is rewriting the motion prompt for the new duration…",
		planVideoPromptDurationStale:
			"Output length changed — tap “AI write motion prompt” to refresh (your current script is kept).",
		planStaleAfterAssetChange:
			"Product photos changed — re-run AI plan if the motion script should match the new kit.",
		productVideoKitTitle: "Product photo kit",
		productVideoKitHint:
			"Upload hero product (required), packaging, or extra angles — AI vision reads all photos, then writes a motion prompt.",
		productVideoHeroLabel: "Hero product (@Image1)",
		productVideoHeroHint: "Main product shot — required",
		productVideoPackagingLabel: "Packaging / box (optional)",
		productVideoPackagingHint:
			"Retail box or package — @Image2 if uploaded",
		productVideoExtraLabel: "Extra angles (optional)",
		productVideoExtraHint:
			"Up to 2 more photos — detail, back, in-use context",
		planProductVideoBtn: "Analyze photo & write motion prompt",
		planProductVideoBusy: "AI analyzing photo & writing motion prompt…",
		planProductVideoReady:
			"Motion plan ready — review the prompt below, then generate",
		productVideoSituationLabel: "Suggested setting",
		productVideoPlanLabel: "Motion prompt (AI)",
		productVideoPlanHint:
			"Vision analyzed your uploads; AI wrote camera + motion plan. Edit in advanced if needed.",
		productVideoAssistantPreflight:
			"Mode: product motion assistant — multi-image reference-to-video",
		productVideoAnalyzeFirstHint:
			"Upload hero product → tap “Analyze photo & write motion prompt” → generate.",
		productVideoUploadFirstHint:
			"Upload a hero product photo first, then tap “Analyze photo & write motion prompt”.",
		storyboardVideoNeedScenesHint:
			"Go back to step 2 and generate storyboard scene images first.",
		videoKeyframeProductLabel: "Product / keyframe photo (@Image1)",
		videoKeyframeProductHint:
			"Required. Your product or still — used as @Image1. With a reference MP4, AI matches @Video1 motion.",
		referenceCta: "Tap to choose reference ad",
		referenceChange: "Change video",
		productLabel: "Product name (optional)",
		productLabelRequired: "Product name",
		productPlaceholder: "e.g. goldstone bracelet",
		businessLabel: "Shop name",
		businessPlaceholder: "e.g. Lucky Crystal HK",
		offerLabel: "Offer (optional)",
		offerPlaceholder: "e.g. 20% off this week",
		bgmLabel: "Background music",
		bgmCalm: "Calm",
		bgmUpbeat: "Upbeat",
		bgmWarm: "Warm",
		bgmNone: "No music",
		phaseSecondFrame: "Creating a second scene for richer motion…",
		phaseVideo: "Making your video…",
		phaseBgm: "Adding background music…",
		phaseVoiceover: "Adding spoken voiceover…",
		phaseCaptions: "Burning on-screen captions…",
		imageGenerating: "Generating image…",
		generationWaitHint:
			"Hang tight — your creative is rendering in this frame.",
		imageGenerateNotReady:
			"Finish the reference image, headline, and other required fields above before generating.",
		download: "Download video (no BGM, no captions)",
		downloadEditPack: "Download CapCut edit pack (JSON)",
		subtitles: "Add subtitles (advanced)",
		newProject: "Make another ad",
		back: "Back",
		advanced: "Advanced options",
		advancedWorkflow: "Advanced: output type & visual style",
		advancedPrompts: "Advanced: AI prompt text",
		advancedHint:
			"Pick variables below — prompts update automatically. You can still edit the text.",
		marketLabel: "Look & market style",
		framingLabel: "People / body in shot",
		framingPickerHint:
			"Control whether a model face appears — for dating/service concepts, try hands-only or no people.",
		imageAdvancedLabel: "Advanced (framing / prompts)",
		extraLabel: "Extra instructions (optional)",
		extraPlaceholder: "e.g. gold bangle on wrist, outdoor daylight",
		promptPreview: "AI prompts (editable)",
		resetPrompts: "Reset from options",
		imagePromptLabel: "Image polish prompt",
		videoPromptLabel: "Video motion prompt",
		promptMarkets: {
			hk: {
				label: "Hong Kong / Cantonese market",
				hint: "HK visual style — copy language follows your English/Chinese brief",
			},
			tw: {
				label: "Taiwan market",
				hint: "Soft lifestyle, local brand feel",
			},
			cn: {
				label: "Mainland China market",
				hint: "Bright e-commerce / short-video style",
			},
			en: {
				label: "English / international",
				hint: "Clean western retail look",
			},
		},
		promptFramings: {
			auto: {
				label: "Auto (template default)",
				hint: "Uses the style you picked above",
			},
			"product-only": {
				label: "Product only — no people",
				hint: "Hero product shot, nobody in frame",
			},
			"hands-only": {
				label: "Hands only — no face",
				hint: "Hands holding or wearing product; face never shown",
			},
			"legs-feet": {
				label: "Legs & feet only",
				hint: "For shoes, socks, leggings — cropped above knee, no face",
			},
			"torso-no-face": {
				label: "Body / torso — no face",
				hint: "Arms or torso OK; face must be out of frame",
			},
			"no-people": {
				label: "Strict — no people at all",
				hint: "Product and background only",
			},
		},
		retry: "Try again",
		bgmNote: "BGM added from your music library.",
		bgmFallbackNote:
			"Library BGM not found — used soft AI music instead. Run: npm run setup:bgm",
		adPack: {
			title: "Ad pack — script, captions & music",
			intro: "AI plans your hook, timed captions, and BGM style before video. Review and edit each part, then generate.",
			planCta: "Plan script & music",
			planning: "Planning…",
			reviewTitle: "Review your ad pack",
			reviewHint:
				"Edit any section or regenerate the full plan before generating video.",
			regenerateAll: "Regenerate plan",
			scriptSection: "Script & captions",
			burnCaptions: "Burn captions onto video",
			hookLabel: "Hook",
			hookPickerLabel: "Pick a hook",
			hookPickerHint:
				"Three different angles — updates voiceover and captions (hook top-center, product line bottom-center).",
			hookOptionLabel: "Hook {n}",
			voiceoverPlaceholder:
				"Voiceover script — spoken after video (fal TTS)",
			voiceoverEmptyHint:
				"Voiceover script is empty — dub will be skipped. Fill below or use “Fill from captions”.",
			voiceoverFromCaptionsBtn: "Fill voiceover from captions",
			speakVoiceover: "Speak voiceover (mix over BGM)",
			voiceoverHint:
				"Generate voice previews below (male/female). Selected voice is mixed over BGM on final export.",
			voiceSection: "Voice preview",
			voicePreviewHint:
				"Listen and pick a voice before generating video. Re-generate after editing script or locale. English voices work best with English script.",
			voicePreviewPartial:
				"{failed} voice preview(s) failed — available tracks are still playable.",
			generateVoice: "Generate voice previews",
			generatingVoice: "Generating voices…",
			voicePresets: {
				"hk-female-pro": "Female — professional",
				"hk-male-warm": "Male — warm",
				"cn-female": "Female",
				"cn-male": "Male",
				"en-female": "Female",
				"en-male": "Male",
			},
			voiceLocales: { hk: "粵語", en: "English", cn: "普通话" },
			timingLabel: "Timing",
			positionLabel: "Position",
			positionOptions: {
				top: "Top center",
				center: "Middle",
				bottom: "Bottom center",
				"top-left": "Top left",
				"top-right": "Top right",
				"bottom-left": "Bottom left",
				"bottom-right": "Bottom right",
			},
			multilineHint:
				"Press Enter for a second line in the same position and time slot.",
			addCaption: "+ Add caption line",
			removeCaption: "Remove caption line",
			timelineSection: "Scene timeline",
			sceneLabel: "Scene {n}",
			startSec: "Start (s)",
			endSec: "End (s)",
			musicSection: "Background music",
			musicMoodLabel: "Music mood (guides AI planner)",
			musicMoods: {
				auto: "Auto",
				warm: "Warm lifestyle",
				upbeat: "Upbeat energy",
				premium: "Premium minimal",
				cinematic: "Cinematic",
			},
			aiStyleLabel: "AI style",
			libraryMusic: "Music library",
			aiMusic: "AI-generated",
			generateMusic: "Generate 3 AI tracks",
			generatingMusic: "Generating music…",
			trackLabel: "Track {label}",
			selected: "Selected",
			selectTrack: "Select",
			needPlanFirst: "Plan the ad pack first to get an AI music prompt.",
			aiBgmNote: "AI-generated BGM mixed into your video.",
			captionsAppliedNote: "On-screen captions burned from your script.",
			captionsSoftTrackNote:
				"Captions added as a subtitle track (toggle CC in your player if not visible).",
			captionBurnSkippedNote:
				"Caption burn failed — showing video with BGM only. You can still download it.",
			voiceoverAppliedNote: "Spoken voiceover mixed over BGM.",
			voiceoverSkippedNote:
				"Voiceover failed — video kept with BGM only. Check service credentials.",
			needVoiceoverScript:
				"Add a voiceover script or caption lines first.",
		},
		adStyleLabel: "What kind of ad?",
		adStyleHint:
			"Pick the closest match — ~80–90% on first try when you use the suggested path.",
		moreOptionsLabel: "More options (output type)",
		adStyles: {
			"paper-sticker": {
				title: "Paper note + sticker Reels",
				description:
					"Fixed IG layout — your exact headline & bullets. Best text accuracy.",
			},
			"product-showcase": {
				title: "Product showcase Reels",
				description:
					"Clean AI product shot + gentle motion. Works for any product.",
			},
			"copy-reference-ad": {
				title: "Copy a reference ad",
				description:
					"Pick a sample motion clip + your product photo. Closest to real ads.",
			},
			"shop-promo": {
				title: "Shop / offer promo",
				description:
					"Store, service or limited-time offer — warm promo vibe.",
			},
		},
		referenceClipLibraryLabel: "Sample motion clips (built-in)",
		referenceClipLibraryHint:
			"Tap one to use as @Video1 — or upload your own MP4 below.",
		referenceClipsMissing:
			"Optional built-in motion samples are not installed. Use a research reel or upload your own reference MP4 below — that is the main path.",
		videoGenerateDisabledHint:
			"Upload a product photo in the keyframe section, or go back to Step 2 to generate or confirm your image.",
		referenceClips: {
			"product-push-in": "Slow push-in",
			"gentle-orbit": "Gentle orbit",
			"cozy-lifestyle": "Cozy lifestyle",
		},
		adTemplateLabel: "Choose ad template",
		templateChecklistLabel: "Template components",
		templateSlotRequired: "required",
		templateSlotNextStep: "next step",
		templateImageModeLocked: "Image mode is fixed for this template.",
		headlineLabel: "Headline (main hook)",
		headlinePlaceholder: "e.g. How I prep a month of content in 2 hours",
		sublineLabel: "Subline (optional)",
		sublinePlaceholder: "e.g. The secret to 10× efficiency",
		sublineBulletsLabel: "Bullet points (one per line)",
		sublineBulletsPlaceholder: "Benefit one\nBenefit two\nBenefit three",
		brandLabel: "Brand / handle",
		brandPlaceholder: "your brand",
		signoffLabel: "Sign-off (optional)",
		signoffPlaceholder: "從略",
		compositorCallout:
			"This template uses a fixed IG layout — your headline, bullets, and brand are placed exactly. AI is not used for the layout.",
		compositorImageHint:
			"Upload your product photo. We cut it into a circular sticker and compose the paper note with your text.",
		compositorImageBtn: "Build ad image",
		compositorRegenerateImageBtn: "Rebuild image",
		compositorVideoHint:
			"Builds a 6-second reel: slow zoom, paper float, sparkle twinkle, plus BGM. No video generation AI video.",
		compositorVideoBtn: "Build reel video",
		compositorPhaseRender: "Rendering frames…",
		templateSlots: {
			product: "Product name",
			headline: "Headline",
			subline: "Subline",
			productPhoto: "Product photo",
			styleRef: "Style reference image",
			referenceVideo: "Reference ad MP4",
			business: "Shop name",
			offer: "Offer",
		},
	},
	templates: {
		"paper-sticker-reel": {
			name: "Paper + sticker reel",
			description:
				"Fixed IG paper layout — your text + product sticker, image & animated reel",
		},
		"product-reel": {
			name: "Product showcase",
			description: "Clean hero product shot with gentle motion",
		},
		"crystal-promo": {
			name: "Dark premium",
			description:
				"Dark luxury look with gold accents — not only crystals",
		},
		"shop-promo": {
			name: "Shop promo",
			description: "Storefront, service or limited-time offer",
		},
		"info-poster": {
			name: "Premium info poster",
			description:
				"White IG info graphic — single theme, tight copy, category visuals",
		},
		"designed-poster": {
			name: "Designed commercial poster",
			description:
				"Appetite hero + bilingual type, seal, brush category — XHS/IG feed poster",
		},
		"parts-poster": {
			name: "Parts breakdown poster",
			description:
				"Exploded components with title + labeled callouts — technical commercial still",
		},
		"brand-fit": {
			name: "Brand style analysis",
			description: "Ads matched to website/social brand DNA",
		},
		"brand-campaign": {
			name: "Brand campaign set",
			description: "Analyze brand → 3 linked posts",
		},
		"brand-video": {
			name: "Brand motion video",
			description: "AI writes a motion prompt from brand cues",
		},
		"creative-video": {
			name: "Creative motion brief",
			description: "Describe idea → AI writes motion prompt",
		},
		"storyboard-video": {
			name: "Storyboard reel",
			description:
				"AI storyboard → scene images → one video generation clip",
		},
		"ugc-presenter-reel": {
			name: "UGC digital presenter",
			description: "Talking-head keyframe → digital presenter lip-sync",
		},
		"model-wear-reel": {
			name: "Model lifestyle wear",
			description: "Product photo → photorealistic model lifestyle ad",
		},
		testimonial: {
			name: "Customer style",
			description: "Warm lifestyle look for reviews",
		},
		"service-promo": {
			name: "Service promo",
			description:
				"Trust-led layout for classes, consulting, or memberships",
		},
		"pricing-offer": {
			name: "Pricing / offer",
			description: "Plans, packages, or limited promos with clear CTA",
		},
		"website-launch": {
			name: "Website / app launch",
			description: "Launch graphic — logo or screenshot optional",
		},
		custom: {
			name: "Custom",
			description: "Pick your own components and prompts",
		},
	} satisfies Record<TemplateId, { name: string; description: string }>,
	errors: {
		polishFailed:
			"Could not enhance your photo. Try again or turn on fast mode.",
		videoFailed: "Video creation failed. Please try again.",
		requestTooLarge:
			"Request too large for the server (often too many / too big scene images). Try fewer scenes or regenerate stills, then generate video again.",
		network: "Network error. Check your internet connection and try again.",
		serviceUnavailable:
			"Image and video generation is temporarily unavailable. Please try again later.",
		planningUnavailable:
			"AI planning is temporarily unavailable. Please try again later.",
		deepSeekBalanceEmpty:
			"AI account balance is empty. Top up at platform.deepseek.com, then try again.",
		insufficientTokens:
			"Not enough tokens for this generation. Open Pricing to upgrade or top up, then try again.",
		insufficientTokensTitle: "Out of tokens",
		insufficientTokensCta: "View plans & top up",
		insufficientTokensDismiss: "Close",
		tvcNeedsPaidPlan:
			"12s MiniMax H3 needs more tokens than the free grant (~1140 for 12s). Upgrade on Pricing, or use Kling stitch if it fits your balance.",
		tvcNeedsPaidPlanTitle: "12s TVC needs a paid plan",
		storyboardEngineChoiceTitle:
			"H3 needs more tokens — Kling stitch fits now",
		storyboardEngineChoiceBody:
			"MiniMax H3 12s costs ~{h3} tokens. You have {balance}. Kling stitch (~{kling}) is 4 clips cut together, not one H3 take.",
		storyboardEngineChoiceH3: "Upgrade for MiniMax H3",
		storyboardEngineChoiceKling: "Use Kling stitch now",
		storyboardCellBlocked:
			"This scene was blocked by the safety filter. Tap regen on this cell — same product, no faces, no brand text.",
		tokensNotCharged: "You weren’t charged for this attempt.",
		timeout: "The request took too long. Please try again.",
		seedanceSensitive:
			"video generation blocked this clip (violence/combat filter). Use calmer wording: no weapons, opponents, or standoffs — figures at rest, peaceful pause. A combat-looking reference image can also trigger this.",
		falContentPolicy:
			"video generation blocked this media (people / private-info filter). We can retry with per-scene animation + stitch—if auto-switch fails, tap Generate video again.",
		klingStoryboardFailed:
			"storyboard fallback failed. Try again or use stills without faces.",
		klingDurationUnreachable:
			"This duration can’t be hit with Kling stitch (5s min per still). Retry MiniMax H3 or pick 12s.",
		needPhoto: "Please upload a product photo first.",
		needReferenceImage: "Please upload a reference image first.",
		needHeadline: "Please enter a headline for this template.",
		needKeyframe:
			"Generate an image or choose “use my upload as-is” before making video.",
		needStyleReference:
			"Upload a reference ad image for “inspired by reference” mode.",
		needReferenceVideo:
			"Upload a reference MP4 for “inspired by reference video” mode.",
		referenceVideoPrepareFailed:
			"Your reference video (@Video1) could not be prepared. We did not generate a stills-only clip — fix the MP4 and try again.",
		needGeneratedImage:
			"Generate your AI image in Step 2 first (image → video flow).",
		needPrompt:
			"Upload a photo, or describe what to create in advanced options.",
		imageGenNoUrl:
			"AI did not return an image URL — check the terminal or try again.",
		needRefineImage:
			"Generate an AI image first, then you can apply a targeted fix.",
		refineFailed:
			"Could not apply your image fix. Try a more specific note (e.g. “remove the logo in the top-right corner”).",
		exportFailed:
			"Batch export failed. Try again or download the main image.",
		videoVariantsBatchUnsupported:
			"Parallel variant videos work for image→video only (not storyboard or presenter).",
		needQuickFixLogo: "Upload a logo image first.",
		needAiImage:
			"Tap Generate image — do not continue with only your raw upload.",
		brandUrlRequired: "Enter a brand website or social handle.",
		brandAnalyzeFailed:
			"Brand analysis failed — check the URL and try again.",
		campaignFailed: "Campaign generation failed. Please try again.",
		storyboardFailed: "Storyboard generation failed. Please try again.",
		storyboardSceneImagesMissing:
			"Could not load all storyboard scene images ({got}/{expected}). Re-generate the missing still, then try video again.",
		brandLogoRequired: "Upload a logo in Brand kit first.",
		storyboardVideoPromptRequired:
			"Generate storyboard scene images in Step 2 first.",
		cinematicStitchNeedScenes:
			"Generate {count} scene keyframes in Step 2 before continuing to video.",
		needProductName: "Product name is required for storyboard planning.",
		needProductNameSetup: "Enter a product name before continuing.",
		extraAnglesNeedRefVideo:
			"Multi-angle mode needs a reference MP4 too (use “Inspired by reference video”).",
		brandVideoPromptRequired:
			"Analyze brand first, then tap “AI write motion prompt”.",
		creativeBriefRequired: "Fill in the creative video brief first.",
		creativeVideoPromptRequired:
			"Tap “AI write motion prompt” and review the prompt below first.",
		planVideoPromptFailed:
			"Video prompt planning failed. Please try again.",
		planProductVideoFailed:
			"Product video planning failed. Check photos and try again.",
		adPackPlanFailed: "Ad pack planning failed. Try again.",
		musicGenerateFailed:
			"AI music generation failed. Try again or pick library music.",
		voiceoverFailed:
			"Voiceover dub failed. Check service credentials or disable spoken voiceover.",
		ugcPresenterFailed:
			"Digital presenter video failed. Check service credentials and try again.",
		postProcessIncomplete:
			"Post-process incomplete — final file is still a raw CDN clip (not saved to library). Regenerate; check stitching / caption burn if it persists.",
		bgmFilesMissing:
			"Background music files missing. Use AI music or run npm run setup:bgm.",
		planConceptFailed: "Concept analysis failed. Please try again.",
		conceptVideoAssistantBlocked:
			"AI Video Assistant is for physical products only. Concept mode uses Concept video from your brief.",
		conceptIdentityRequired:
			"Add a concept idea, headline, or concept still before generating video.",
		conceptVideoPlanRequired:
			"AI is writing the motion prompt — wait a few seconds, or tap “AI write motion prompt”.",
		needProductVideoPlan:
			"Tap “Analyze photo & write motion prompt” first.",
		researchReelAnalyzeFailed:
			"Reference reel analysis failed — try again or pick another post.",
		brandAnalyzeRequired: "Tap Analyze brand first.",
	},
	ugcStudio: {
		badge: "Standalone tool · digital presenter lip-sync",
		title: "UGC talking presenter",
		subtitle:
			"Type a short product intro, pick a digital presenter, and generate a TikTok-style talking-head clip. Optional: upload your product photo for a custom keyframe.",
		setupTitle: "Script & presenter",
		setupHint:
			"To show YOUR product on screen: upload photo → generate keyframe → generate video. Stock avatar only lip-syncs the script (no product in frame).",
		productHowHint:
			"Two modes — Custom keyframe: your product photo becomes a talking-head still with product in hand/wrist, then digital presenter animates it. Stock avatar: generic presenter only; product name is spoken in the script, not shown as your real item.",
		productLabel: "Product name",
		productPlaceholder: "e.g. crystal bracelet, portable power station…",
		photoLabel: "Product photo (for on-screen product)",
		photoRequiredHint: "Needed for custom keyframe",
		scriptLabel: "Spoken script (~10s)",
		scriptPlaceholder:
			"Keep it under ~10 seconds — one hook + one benefit + CTA.",
		scriptHint:
			"For ~10s UGC, aim for 1–3 short sentences. Edit AI script before generate.",
		planScript: "AI write script (AI)",
		planningScript: "Writing script…",
		planScriptHint:
			"Uses AI to draft a ~10s spoken intro from your product name. Edit freely after.",
		scriptReady: "AI script ready — edit if needed, then preview voice.",
		scriptFailed: "AI script planning failed. Check AI API key.",
		localeHk: "粵語/繁中",
		localeCn: "普通话",
		localeEn: "English",
		voiceLabel: "Voice",
		avatarVoiceLabel: "Presenter voice (locked to this 主播)",
		avatarVoiceHint:
			"Each stock presenter has a paired MiniMax voice for the language you selected.",
		previewVoice: "Preview voice",
		previewingVoice: "Previewing voice…",
		generateVideo: "Generate UGC video",
		generatingVideo: "Generating UGC video…",
		generateKeyframe: "Generate talking-head keyframe",
		generatingKeyframe: "Generating keyframe…",
		customHint:
			"Upload a clear product photo, then generate a keyframe with the product in hand/wrist.",
		stockHint:
			"Stock avatar is the quickest way to see lip-sync. No product photo required.",
		stockNoProductNote:
			"Stock avatar selected — video will NOT show your product photo. Switch to “My keyframe” after uploading a photo if you want the product on screen.",
		voiceMatchesAvatarNote:
			"Changing the presenter also changes their paired voice.",
		customUsesProductNote:
			"Custom keyframe mode — generate the keyframe from your product photo first, then generate video.",
		previewTitle: "Result",
		previewHint: "Generated clip plays here — lip-sync is baked in.",
		previewEmpty: "Your UGC clip will appear here after generate.",
		waitHint: "Hang tight — lip-sync video is rendering in this frame.",
		download: "Download MP4",
		costHint:
			"Uses tokens for voice (if synthesized) + digital presenter video (~30 tokens/sec of audio ≈ $0.10/s). Sign in required.",
		needScript: "Enter a spoken script first.",
		needProduct: "Enter a product name first.",
		needPhoto: "Upload a product photo for custom keyframe.",
		needKeyframe: "Generate a keyframe first, or switch to stock avatar.",
		needAvatar: "Pick a stock presenter avatar.",
		voiceReady: "Voice preview ready — generate when you like the sound.",
		voiceFailed: "Voice preview failed.",
		keyframeReady: "Keyframe ready — generate video next.",
		keyframeFailed: "Keyframe generation failed.",
		videoReady: "UGC video ready.",
		videoFailed: "UGC video generation failed.",
	},
	captions: {
		badge: "Post studio · any video",
		title: "Caption & audio studio",
		subtitle:
			"Import a library reel or your own video — edit scripts, add BGM/voice, then burn captions. Works for any length.",
		uploadTitle: "Add a video",
		uploadHint:
			"Choose a video from My library (studio outputs are saved there), or open Caption studio from the studio done screen.",
		uploadHintAny:
			"Pick from My library, upload your own MP4, or open this page from Studio Done with a finished reel.",
		anyLengthNote:
			"Any length is fine — we read the real duration from the file. Scene cut markers appear when the video came from a multi-clip stitch.",
		chooseFile: "Upload video file",
		chooseFromLibrary: "Choose from library",
		changeVideo: "Change video (library)",
		sourceFromStudio: "From studio",
		sourceFromLibrary: "From library",
		phaseScript: "1 · Script",
		phaseAudio: "2 · Voice & music",
		phaseBurn: "3 · Burn",
		phaseScriptName: "Script",
		phaseAudioName: "Voice & music",
		phaseBurnName: "Burn",
		continueToAudio: "Continue to voice & music",
		continueToBurn: "Continue to burn",
		phaseHowToScript:
			"Edit on-screen lines and timing on the right. When the script looks right, continue to voice & music.",
		phaseHowToAudio:
			"Optional: plan voice from a topic, generate voice previews, or add BGM. Then continue to burn captions onto the video.",
		phaseHowToBurn:
			"Review the preview, then burn captions (and applied audio) onto the video. Download when ready.",
		cutsLabel: "{n} clips",
		timingFromVideo: "timing from video",
		timingEstimated: "timing estimated",
		largeFileHint:
			"Large files need direct cloud upload (R2 CORS) or Choose from library — the server path caps ~4.5MB.",
		uploadNeedCorsOrLibrary:
			"This video is too large for the server upload path. Pick it from My library (if already saved), or ask an admin to enable R2 PUT CORS for this site, then retry the file upload.",
		uploadFailed: "Video upload failed.",
		libraryPickerTitle: "Choose a library video",
		libraryPickerLoading: "Loading library…",
		libraryPickerEmpty:
			"No saved videos yet. Generate one in the studio first.",
		libraryPickerLoadError: "Could not load library videos.",
		libraryPickerCancel: "Cancel",
		libraryPickerUse: "Use this",
		libraryPickerClose: "Close",
		pipelineSourceNote:
			"Using your processed studio video — captions burn on the server.",
		previewTitle: "Preview",
		showOriginal: "Show original (no captions)",
		durationLabel: "Duration: {sec}s",
		linesTitle: "On-screen lines",
		linesHint:
			"Set start/end seconds, position, and text. Overlapping times are OK — e.g. one line at top and one at bottom. Re-apply after edits; we always burn from the original upload.",
		timingLabel: "Timing",
		positionLabel: "Position",
		positionOptions: {
			top: "Top center",
			center: "Middle",
			bottom: "Bottom center",
			"top-left": "Top left",
			"top-right": "Top right",
			"bottom-left": "Bottom left",
			"bottom-right": "Bottom right",
		},
		multilineHint:
			"Press Enter for a second line in the same position and time slot.",
		removeLine: "Remove line",
		addLine: "+ Add line",
		addTopSameTiming: "+ Add top line (same timing)",
		splitEvenly: "Split timing evenly",
		fitCaptionsToVoice: "Fit captions to voice",
		fitCaptionsNeedVoice:
			"Generate a voice preview first, then fit captions to it.",
		fitCaptionsToVoiceDone:
			"Caption timings fitted to voice (~{sec}s). Rest of the video stays silent.",
		voiceLongerThanVideo:
			"Voice (~{voice}s) is longer than available video (~{video}s). Captions were fitted to the video; shorten the script or trim less.",
		voiceFittedToVoice:
			"Caption timings fitted to voice (~{voice}s). Video has ~{tail}s silent tail.",
		voiceFittedCapped:
			"Voice (~{voice}s) exceeds video (~{video}s) — captions fitted to video length.",
		applyBtn: "Burn captions onto video",
		applying: "Burning captions…",
		appliedNote:
			"Captions burned onto your video — scrub the player to check each time slot.",
		appliedLegacyNote: "Captions burned (legacy subtitle renderer).",
		previewCaptionedHint:
			"Showing captioned version — use “Show original” to compare.",
		previewLoadFailed:
			"Caption burn succeeded but preview failed to load — try Download.",
		softTrackNote:
			"Captions added as a subtitle track — turn on CC in the player if you do not see them.",
		softTrackError:
			"Visible burn failed — only a CC track was added. Retry after refresh, or (overlay mode should work after refresh).",
		downloadBtn: "Download captioned MP4",
		downloading: "Downloading…",
		downloadFailed: "Download failed.",
		burnFailed: "Caption burn failed.",
		needVideo: "Upload or load a video first.",
		needCaptionText: "Add at least one caption line with text.",
		invalidVideoType: "Please choose a video file (MP4, WebM, MOV).",
		reeditHint:
			"Caption text is saved in your browser for this video. To start a new project,",
		studioLink: "open the studio",
		openFromDone: "Edit captions & audio",
		doneHint:
			"Download the clean video, or open Caption studio to edit scripts, voice, music, and burn — works for this reel or any video you upload later.",
		styleLabel: "Caption style",
		styleHint:
			"Preset colors and weight for burned subtitles (overlay mode).",
		audioTitle: "Background music & voiceover",
		audioHint:
			"Easiest path: AI plan captions + voice from your topic, then preview → mix. Or add BGM first, then voice, then burn captions.",
		planCaptionVoiceSection: "AI plan captions + voice",
		planCaptionVoiceHint:
			"Type your product/topic. AI writes short on-screen captions timed to the video, plus longer spoken lines that fill each window. Next: voice preview → Mix.",
		planCaptionVoiceTopicLabel: "Product / topic / idea",
		planCaptionVoiceTopicPlaceholder:
			"e.g. free ad creatives for SMBs, one-stop promo…",
		planCaptionVoice: "AI plan captions + voice",
		planningCaptionVoice: "Planning with AI…",
		planCaptionVoiceNeedTopic: "Enter a product/topic above first.",
		planCaptionVoiceFailed:
			"AI caption/voice plan failed. Check AI API key.",
		planCaptionVoiceDone:
			"Planned {n} caption lines for ~{sec}s — next: voice preview → Mix ({n} clips). Spoken matches on-screen unless a full longer line fits.",
		audioBgmLabel: "Music track",
		audioApplyBgm: "Add BGM",
		audioApplyingBgm: "Adding BGM…",
		audioReplaceOriginal: "Replace original audio",
		audioReplaceOriginalHint:
			"Off keeps the uploaded video’s existing sound and mixes BGM underneath. Turn on for music-only output.",
		audioVoicePlaceholder:
			"Full spoken script (can be longer than on-screen captions)",
		audioApplyVoice: "Mix voiceover",
		audioApplyingVoice: "Mixing voice…",
		audioSpeakVoiceover: "Add spoken voiceover (TTS)",
		audioLocaleHk: "粵語/繁中",
		audioLocaleCn: "普通话",
		audioLocaleEn: "English",
		audioBgmDone: "BGM added — preview updated.",
		audioVoiceDone: "Voiceover mixed — preview updated.",
		audioVoiceDoneAtCaption:
			"Voiceover mixed at natural speed, starting at {sec}s (first caption). No time-stretch.",
		audioVoiceDonePerCaption:
			"Mixed {n} caption windows as separate natural-speed clips (uses Spoken text when set; no stretch).",
		audioVoicePerCaptionHint:
			"Keep on-screen captions short. Lengthen Spoken (TTS) per line — or use “Lengthen spoken to fit windows” — then preview → Mix. Female/male previews often differ in length (same script, different speaking rates — e.g. 19s vs 13s). That is normal. Pick one voice; Mix places each line into its caption window on the full video timeline.",
		audioVoiceNeedCaptionLines:
			"Need at least 2 caption lines with text on the timeline (you have {n}). Sync from the voice script, or edit lines on the right — then mix.",
		audioVoiceNeedPreviewOrScript:
			"Generate a voice preview (or fill the script) to pick a voice first.",
		audioVoiceSingleClipFallback:
			"Server mixed only one clip (expected {n}). Hard-refresh the page and try Mix again.",
		audioApplyVoicePerCaption: "Mix voiceover ({n} clips)",
		fillVoiceFromCaptions: "Fill voice script from spoken lines",
		syncCaptionsFromVoice: "Sync captions from script",
		syncCaptionsNeedScript:
			"Paste a voice script above first, then sync captions.",
		syncCaptionsFromVoiceDone:
			"Synced {n} caption lines across ~{sec}s — next: lengthen spoken if needed → preview → Mix ({n} clips).",
		expandCaptionVoice: "Lengthen spoken to fit windows",
		expandingCaptionVoice: "Lengthening spoken lines…",
		expandCaptionVoiceNeedLines:
			"Add short caption text on the right timeline first, then lengthen spoken lines to fill each window.",
		expandCaptionVoiceFailed:
			"Could not lengthen spoken lines. Check AI API key.",
		expandCaptionVoiceDone:
			"Filled spoken lines for {n} caption windows (~{sec}s) and refreshed voice preview — next: Mix ({n} clips).",
		spokenLineLabel: "Spoken (TTS) — can be longer than on-screen",
		spokenLinePlaceholder: "Longer line spoken while this caption shows",
		productBriefLabel: "Product / topic (for AI script & music)",
		productBriefPlaceholder: "e.g. rose quartz bracelet, café latte promo…",
		musicTopicLabel: "Product / topic (optional — tailors AI music)",
		musicTopicPlaceholder:
			"e.g. bracelet, café promo… leave blank for mood-only",
		planAdPackCta: "Plan hook, voice & music with AI",
		previewProcessedHint:
			"Showing processed version — play to hear BGM / voice.",
		previewAudioHint:
			"Tip: unmute the player and turn up volume after adding BGM.",
		libraryBgmPreviewLabel: "Preview library loop (loops in player)",
		libraryBgmDisclaimer:
			"Library tracks are short placeholder loops — similar tone. Use AI 生成 for unique music matched to your video length.",
		aiMusicNeedBrief:
			"Enter a product/topic above (or plan with AI) before generating music.",
		aiMusicGenerateHint:
			"Pick a mood above, then generate — product/topic is optional.",
		aiMusicGenerateFirst:
			"Generate and preview AI tracks first, then click Add BGM.",
		aiMusicSelectTrack: "Select an AI music track to apply.",
		aiMusicGeneratedNote:
			"{count} AI tracks ready — preview below, then Add BGM.",
		defaultStyleLabel: "Default style for new lines",
		defaultStyleHint:
			"Each line can override this in its own style dropdown.",
		lineStyleLabel: "Style",
		linesHintPerLineStyle:
			"Set timing, position, and style per line. Mix styles — e.g. bold hook 0–2s, minimal body 3–6s.",
		timelineTitle: "Caption timeline",
		timelineHint:
			"Click a block to select a line; adjust in/out seconds below.",
		timelineL2Hint:
			"Drag caption blocks; trim video in/out on the top track. Add BGM first for better beat detection, then snap or Align to beats.",
		videoTrack: "Video",
		captionTrack: "Captions",
		bgmTrack: "BGM / beats",
		snapBeats: "Snap to beats",
		alignToBeats: "Align captions to beats",
		beatStatusAnalyzing: "Detecting beats…",
		beatStatusReady:
			"Detected {n} beats — drag with Snap on, or Align captions to beats.",
		beatStatusEmpty:
			"No beats detected — add BGM first, then wait for re-analysis.",
		beatStatusUnavailable:
			"Beat detection needs a server video URL (add BGM or open from studio).",
		beatAlignNeedBeats: "No beats yet — add BGM and wait for detection.",
		beatAlignDone: "Caption starts snapped to nearest of {n} beats.",
		trimVideoIn: "Video in",
		trimVideoOut: "Video out",
		trimFailed: "Video trim failed.",
		trimIn: "Start (sec)",
		trimOut: "End (sec)",
	},
	imageCanvas: {
		badge: "Standalone tool · no re-generation",
		title: "Image canvas studio",
		subtitle:
			"Upload any PNG or JPG — drag headlines, shapes, and brand logo onto your image. Same Konva editor as the wizard, without generating a new AI image.",
		uploadTitle: "Image source",
		uploadHint:
			"Upload from your computer, pick from My library, or open from the studio after generating an image.",
		chooseFile: "Choose image file",
		chooseFromLibrary: "Choose from library",
		changeImage: "Change image file",
		sourceFromStudio: "From studio",
		sourceFromLibrary: "From library",
		libraryPickerTitle: "Choose a library image",
		libraryPickerLoading: "Loading library…",
		libraryPickerEmpty:
			"No saved images yet. Generate one in the studio first.",
		libraryPickerLoadError: "Could not load library images.",
		libraryPickerCancel: "Cancel",
		libraryPickerUse: "Use this",
		libraryPickerClose: "Close",
		pipelineSourceNote:
			"Using your studio image — layers burn on the server.",
		editorTitle: "Canvas editor",
		applyBtn: "Burn layers onto image",
		applying: "Applying layers…",
		appliedNote:
			"Layers burned — download the result or keep editing (re-applies from the original upload).",
		previewTitle: "Result preview",
		previewEmptyHint:
			"Add text or shapes, then click Burn layers onto image.",
		previewResultHint:
			"Showing burned result — change image to start over.",
		previewLoadFailed: "Burn succeeded but preview failed — try Download.",
		previewLoading: "Loading image…",
		showOriginal: "Clear result preview",
		downloadBtn: "Download PNG",
		downloading: "Downloading…",
		downloadFailed: "Download failed.",
		burnFailed: "Could not apply layers to image.",
		needImage: "Upload or load an image first.",
		invalidImageType: "Please choose an image file (PNG, JPG, WebP).",
		stepUpload: "1. Image",
		stepClean: "2. Clean up",
		stepDesign: "3. Add text",
		stepExport: "4. Export",
		stepUploadName: "Image",
		stepCleanName: "Clean up",
		stepDesignName: "Add text",
		stepExportName: "Export",
		stepPrev: "Previous",
		stepNext: "Next",
		stepContinueClean: "Continue to clean up",
		stepContinueDesign: "Continue to add text",
		stepHowToUpload:
			"Load an image from your library or device, then continue.",
		stepHowToClean:
			"Optional: erase logos or text, then use this image to add your own copy — or skip if nothing to remove.",
		stepHowToDesign:
			"Add headlines and logo on the canvas, then burn layers to export.",
		stepHowToExport:
			"Download your finished image, or go back to the canvas to adjust layers.",
		canvasPrev: "Previous edit",
		canvasNext: "Next edit",
		canvasVersion: (current: number, total: number) =>
			`Image edit ${current} / ${total}`,
		canvasRecoverEdits: "Back to first edit",
		recoverOriginal: "Recover original image",
		backToCanvas: "Back to canvas editor",
		stepSkipClean: "Skip — no cleanup needed",
		cleanTitle: "Erase unwanted areas (optional)",
		cleanHint:
			"Paint purple over what you want gone (cover the whole text box). Then tap Remove painted area — AI fills that spot with the surrounding background. No typing needed.",
		cleanBoxHint:
			"Drag a tight box around each text block — draw multiple boxes, erase once",
		cleanMultiRegionHint:
			"You can highlight several areas (up to 5). Remove only affects your highlight — not the whole cabinet/product.",
		cleanRegionCount: (n: number) =>
			`${n} area${n === 1 ? "" : "s"} selected to remove`,
		cleanRemoveRegion: "Area",
		cleanDeleteSelected: "Delete selected area",
		cleanUndoBrush: "Undo brush stroke",
		cleanMaxRegions: "Maximum 5 areas per erase — run again for more.",
		cleanModeBox: "Highlight box",
		cleanModeBrush: "Brush",
		cleanBrushSize: "Brush size",
		cleanAiStepsHint:
			"Cover the whole unwanted box with purple (edges too).\nTap Remove painted area — AI clones the nearby background into that spot (like phone heal).\nTo fix wrong words: paint over them, type e.g. 改成「正確標題」, then Replace.\nFor pixel-perfect copy, Remove first, then add your own text in step 3.",
		cleanPresetRemoveText: "Remove text, seamless background",
		cleanPresetRemoveLogo: "Remove Logo, keep product",
		cleanPresetSeamless: "Clean background, no text",
		cleanPromptPlaceholder:
			"Replace example: 改成「認識金砂石」 / soft marble (Remove needs no text)",
		cleanEraseBtn: "Remove painted area",
		cleanFillBtn: "Replace with my description",
		cleanCostNote:
			"Each remove/replace uses 1 image credit. AI only regenerates the painted pixels.",
		cleanPreviewTitle: "Erase preview",
		cleanAcceptBtn: "Use this image → add text",
		cleanRetryBtn: "Not good — try again",
		cleanApplyNote:
			"Cleanup done — continue to add your own text and logo.",
		cleanFillNote: "Fill done — continue to add your own text and logo.",
		workflowNote:
			"Recommended flow: Studio generate → AI quick fix in wizard → erase here if needed → add your text in step 3.",
		reeditHint: "Layer layout is saved in your browser for this image.",
		studioHint: "Need AI-generated images?",
		studioLink: "Open studio",
		sourcePreviewFailed:
			"Could not load this image preview. Check your connection or try again.",
		retryPreview: "Retry",
		openFromDone: "Edit text & logo on image",
		doneHint:
			"Opens image canvas with your generated still — add headlines and brand logo.",
		editAnotherHint:
			"Each “Edit” opens in a new tab so this results page stays open — finish one slide, then edit the next here.",
		backToResults: "Back to studio results",
		backToLibrary: "Back to library",
		editAnotherFromLibrary: "Edit another from library",
	},
	visualCaptions: {
		badge: "Beta · drag & drop",
		title: "Visual subtitle lab",
		subtitle:
			"Upload a video, drag text anywhere on the frame, set timing — then export. Different from the form-based caption studio.",
		hint: "Drag text boxes on the video preview. Scrub the player to preview when each line appears. Export burns pixels at your exact positions.",
		uploadTitle: "Upload video",
		uploadHint: "MP4, WebM, or MOV",
		dragHint: "Drag text to position · scrub video to preview timing",
		selectedClip: "Selected text",
		startSec: "Start (s)",
		endSec: "End (s)",
		positionLabel: "Position",
		addClip: "+ Add text",
		removeClip: "Remove",
		exportBtn: "Export video with text",
		exporting: "Exporting…",
		exportFailed: "Export failed.",
		previewFailed: "Export OK but preview failed — try Download.",
		downloadBtn: "Download MP4",
		changeVideo: "Upload a different video",
		needVideo: "Upload a video first.",
		needText: "Add at least one text clip.",
	},
	contentResearch: {
		title: "AI platform content research",
		physical: "Physical product",
		concept: "Service / concept",
		topicPlaceholder: "e.g. crystal bracelet gift guide, nasal washer…",
		searchKeywordLabel:
			"Search keyword (find trending posts in this category)",
		searchKeywordPlaceholder: "e.g. crystal bracelet, skincare routine…",
		platformsLabel: "Search platforms",
		platformsHint: "Select a platform to research trending content.",
		promoteProductLabel: "Your product to promote",
		promoteProductPlaceholder: "e.g. Madagascar rose quartz bracelet",
		promoteProductHint:
			"Search keyword finds trending posts in a category (e.g. skincare). This field is the exact product you sell. Layout comes from references; copy and hero product are yours.",
		promoteProductRequired:
			"Enter your product name first — all copy and images will promote this, not the reference post topic.",
		researchBtn: "Research live content",
		directPostTitle: "Or paste a post you want to match",
		directPostHint:
			"Skip search when you already have the reference — xhslink, xiaohongshu.com/explore/…, or Instagram /p/ /reel/ links. Layout comes from this post; copy stays about your product. In physical mode, fill product name above first. If xhslink fails, copy the full link from the 小紅書 app (Share → Copy link).",
		directPostUrlLabel: "Reference post link",
		directPostUrlPlaceholder:
			"e.g. http://xhslink.com/o/… or https://www.instagram.com/reel/…",
		directPostBtn: "Use this post",
		postUrlRequired: "Paste a post link first.",
		directPostFailed: "Could not load this post. Check the link is public.",
		busy: "Searching the web + analyzing…",
		failed: "Content research failed. Try again.",
		searchCooldown:
			"XHS API needs a short cooldown — wait {seconds}s before searching again.",
		topicRequired: "Enter a search keyword first.",
		topPicksTitle: "Top 3 picks — inspired by trending posts",
		inspiredBy: "Trending post",
		originalPostLabel: "Original post",
		yourAngle: "Your adapted angle",
		allPostsTitle: "All posts found",
		prevPage: "Previous",
		nextPage: "Next",
		pageOf: (page: number, total: number) => `Page ${page} / ${total}`,
		totalAngles: (total: number) =>
			`${total} directions from this search · 3 shown at a time`,
		carouselSlides: (count: number) => `${count} slides`,
		researchMediaImage:
			"Research scope: image & carousel posts only (matches Image workflow above).",
		researchMediaVideo:
			"Research scope: video & reels only (matches Video workflow above).",
		researchMediaBoth:
			"Research scope: all post types (Combined workflow).",
		tiktokImageWarning:
			"TikTok is video-only. Use 小紅書 or Instagram for image research, or switch workflow to Video.",
		useAngle: "Use this direction",
		selectedLabel: "Selected ✓",
		resultTitle: "AI Research Result (Recommendation)",
		resultSubtitle:
			"Based on trending posts from Xiaohongshu, Instagram, TikTok.",
		styleSummaryLabel: "Style Summary",
		toneLabel: "Tone",
		layoutNotesLabel: "Layout Notes",
		viewMoreExamples: "View more examples",
		sourcePlatformsLabel: "Source Platforms",
		morePlatforms: (count: number) => `+${count} more`,
		applyingAngle: "Downloading reference clip…",
		applied: "Angle applied to your brief — review fields and continue.",
		appliedWithReference:
			"Angle applied — reference post cover loaded as style reference. Review fields and continue.",
		appliedWithVideoReference:
			"Angle applied — reference reel loaded; we analyze video shots and generate via reference-to-video (not cover only).",
		appliedWithVideoAttached:
			"Applied — reference MP4 downloaded and loaded; reel analysis will start automatically.",
		appliedCoverOnlyVideoFailed:
			"Copy and cover applied, but reference MP4 failed to download — pick a post tagged MP4 or upload manually.",
		videoDownloadFailed:
			"Reference MP4 download failed — pick another post (MP4 badge on cover) or upload manually.",
		videoResolveFailed:
			"Could not resolve a video URL for this post — pick an MP4-tagged post or search again.",
		videoUrlMissing:
			"No video on this post — in video mode, pick a post tagged MP4.",
		videoReadyUrl: "MP4",
		videoReadyResolve: "Video",
		videoReadyMissing: "No video",
		appliedWithCarouselReference:
			"Angle applied — carousel reference images loaded, output mode and style set to match. Review fields and continue.",
		appliedReferenceImageFailed:
			"Reference image download failed — copy and format were applied, but no reference image was attached. Pick another angle or upload a reference on Step 2.",
		appliedCopyOnlyNoImage:
			"Copy and output mode applied (carousel / single, etc.) — visual reference image missing. Upload a reference or pick another angle before generating.",
		researchHiddenNoCover:
			"Hidden {count} posts whose covers could not be loaded.",
		appliedContinue:
			"Angle applied — check headline and output mode, then continue to Step 2.",
		scoreLabel: "Fit",
		allAnglesTitle: "All angles",
		liveBadge: "Live web research",
		playbookBadge: "AI playbook (no web)",
		sourceLabel: "Inspired by",
		sourcesTitle: "Web sources",
		postsTitle: "Trending posts on this platform",
		likes: "Likes",
		collects: "Saves",
		comments: "Comments",
		openNote: "Open original post",
		noCover: "No cover",
		platforms: {
			xiaohongshu: "小紅書",
			instagram: "Instagram",
			tiktok: "TikTok",
			facebook: "Facebook",
		},
	},
	studioAssistant: {
		title: "Studio guide",
		subtitle: "Ask how Alchemy works · or start a path",
		welcome:
			"Hi! Ask me how Alchemy works (tokens, pages, H3 vs Kling), or tell me what you want to make and I'll open the right path.",
		welcomeLanding:
			"Hi! Ask anything about Alchemy — tokens, studio vs captions vs edit-image, what fits the free grant. Or say what you want to promote and I'll start the right path.",
		welcomeStart:
			"Not sure physical vs concept? Describe your goal or paste a URL — I'll tell you which card to pick and what to type in the studio.",
		welcomeEditImage:
			"You're in the image editor. Upload or pick a photo, then ask me how to clean (inpaint), add logo/text, or export. I stay on this page.",
		welcomeCaptions:
			"You're in caption studio. Import any MP4 — I'll help with timed lines, BGM, voice, then burn. No need to regenerate the video.",
		welcomePro:
			"Pro canvas — connect Upload → Image → Video nodes. Ask me the order or cost before you run. Pay-per-use fal.",
		welcomeBrandKit:
			"Brand kit — upload logo and colors once. Ask me whether to stamp the logo on storyboard stills.",
		welcomeLibrary:
			"Your library. Ask me how to reopen a file in the image editor or caption studio, or download it.",
		welcomeUgc:
			"UGC studio — tell me the product and vibe (unboxing, review, street). For storyboard ads, say so and I'll send you to /studio.",
		welcomeSite:
			"Hi — ask how Alchemy works, or I can open the wizard, image editor, captions, Pro canvas, or brand kit.",
		shortLabel: "Ask AI",
		openingStudio: "Opening the studio with your setup — one moment…",
		studioContinued:
			"You're in the studio now — your chat history is kept here. Reply next or 下一步 for Step 2.",
		placeholder: "e.g. Does free grant cover 12s TVC? Or: bracelet Reel…",
		thinking: "Thinking…",
		send: "Send",
		close: "Close",
		spotlightDismiss: "Got it — hide spotlight",
		signInToChat:
			"Sign in to use the studio guide — then send your message again.",
		openLauncher: "Open studio assistant",
		dialogLabel: "Studio assistant chat",
		errorNetwork: "Connection hiccup — please try again in a moment.",
		actionApplied:
			"Done — I applied that in the wizard. Check the setup fields and continue when ready.",
		websiteReelApplied:
			"8s Reel recipe is set and your URL is filled in. Click Analyze brand if headline is empty, then Continue → generate keyframe → generate video.",
		analyzingBrand: "Reading your website and filling brand fields…",
		brandAnalyzed:
			"Brand analyzed — {name}. Suggested headline: {headline}. Check Setup, then Continue to image.",
		brandAnalyzeFailed:
			"Couldn't analyze the site right now. Paste your URL in Setup and click Analyze brand, or try again.",
		chipSetupWebsite: "Set up & open studio",
		chipProductImagePost: "Product image post",
		chipContentResearch: "Research platform topics",
		unknownAction:
			"That button didn't work — use the button below instead.",
		renewConversation: "New chat",
	},
	microWizard: {
		progress: "Step {current} of {total}",
		continue: "Continue",
		skip: "Skip",
		classicLink: "Advanced studio",
		footerHint: "Need all options?",
		outputGoalTitle: "What do you want to create?",
		outputGoalHint:
			"Pick image, video, or both — you can change this later in Advanced studio.",
		pickAngleTitle: "Pick a reference post",
		pickAngleHint:
			"Choose an angle from research — we borrow layout and style, not the topic.",
		generateImageTitle: "Generate image",
		generateWaitEyebrow: "STEP 5",
		generateImageHint:
			"Review settings above, then generate your poster or keyframe.",
		generateImageFooterHint:
			"Pick output count (single / A/B / campaign / teaching carousel), then tap Generate image below.",
		referenceAnalyzeReadyTitle: "Reference analysis complete",
		referenceAnalyzeReadyHint:
			"Done — advancing automatically, or tap Continue.",
		referenceAnalyzeTapContinue: "✓ Analysis complete — tap Continue below",
		referenceLoadingHint: "Loading reference image…",
		imageReviewTitle: "Review generated image",
		imageReviewHint:
			"Check the image and on-image copy, then tap Continue.",
		generateVideoTitle: "Generate video",
		generateVideoHint: "Review settings above, then generate your reel.",
		generateVideoFooterHint: "When ready, tap Generate video below.",
		videoResultEyebrow: "STEP 5",
		videoResultTitle: "Your video is ready",
		videoResultHint:
			"Preview, download the silent reel, or open caption studio for music and text.",
		videoResultEmpty: "No video yet — go back and generate one.",
		videoResultRegenerate: "Generate again",
		videoModeTitle: "Video creation mode",
		videoModeHint:
			"How should video generation use your keyframe or reference?",
		imagePromptTitle: "Image polish prompt",
		imagePromptHint:
			"Optional extra instructions for AI image before generating.",
		cinematicModeTitle: "Concept cinematic style",
		cinematicModeHint:
			"Single 8s cinematic clip only. Multi-scene stitch is not available yet.",
		sceneCountTitle: "How many scenes?",
		sceneCountHint:
			"Each scene is ~8 seconds. 4–5 scenes ≈ 30–40s after stitch.",
		intakeTitle: "How do you want to start?",
		intakeHint:
			"Research finds trending layouts; Direct lets you upload your own references.",
		intakeResearchTitle: "Platform research",
		intakeResearchDesc:
			"Browse posts for style inspiration — copy stays yours.",
		intakeDirectTitle: "Direct create",
		intakeDirectDesc: "Skip research — optional reference upload only.",
		intakeFuse: {
			stepEyebrow: "STEP 3",
			title: "Research a style, or create directly.",
			hint: "Platform research borrows layout and style — your product name stays yours. Direct skips research and continues setup.",
			conceptTitle: "Research a style, or use Concept assistant.",
			conceptHint:
				"Platform research finds layout references. Concept assistant writes your brief without research.",
			tabsAriaLabel: "How to start",
			tabResearch: "Platform research",
			tabDirect: "Direct create",
			tabAssistant: "Concept assistant",
			pickTabHint:
				"Pick a tab to continue — research or create directly.",
			tipTitle: "Reference the style, not the content.",
			tipIntro:
				"AI analyzes layout, tone, color, and composition — not the exact content or brand.",
			tip1: {
				title: "Better results",
				body: "Be specific with keywords so research finds posts closer to your look.",
			},
			tip2: {
				title: "Multiple platforms",
				body: "Try another platform if results feel off — each feed has different styles.",
			},
			tip3: {
				title: "Style over content",
				body: "We focus on design patterns and framing — copy stays about your product.",
			},
			tipSecure: {
				title: "Your data is secure",
				body: "We never share your inputs or reference links.",
			},
			conceptTip3: {
				title: "Style over content",
				body: "We focus on design patterns and framing — copy stays about your service or concept.",
			},
			assistantTipTitle: "How Concept assistant helps",
			assistantTipIntro:
				"You describe the topic and direction; AI fills headline and visuals — no platform research first.",
			assistantTip1: {
				title: "Be clear about the offer",
				body: "One or two short lines on what you promote and who it’s for is enough.",
			},
			assistantTip2: {
				title: "Fine-tune on the next page",
				body: "Creative direction, optional reference, and output format all live on one setup screen.",
			},
			assistantTip3: {
				title: "You can edit later",
				body: "Headline and copy can still be changed on the setup page.",
			},
			directTitle: "Skip research for now",
			directBody:
				"Next you’ll pick direct creation or model-wear, optionally upload a reference, then use the same setup page as after research.",
			directBullets: [
				"No platform search required",
				"Choose direct creation or model wear/use",
				"Optional reference upload on the next setup page",
			],
			videoDirectBody:
				"Next you’ll pick a video direction (product motion, reference reel, or UGC), then set copy, product photo, and duration on one setup page.",
			videoDirectBullets: [
				"No platform search required",
				"Product motion: photo → short video (fastest)",
				"Duration and resolution show estimated tokens",
			],
			assistantIntro:
				"Describe your offer — AI fills headline and visual direction. Platform research is skipped.",
		},
		primaryStyleTitle: "Pick a creative direction",
		primaryStyleHint:
			"Pick Quick Ad or Model Wear/Use. UGC and reference layout live under video or Advanced.",
		productNameTitle: "Product name",
		productNameHint:
			"What are you selling? This anchors headlines and prompts.",
		productNameStep: {
			stepEyebrow: "STEP 3",
			title: "What's your product name?",
			hint: "This anchors headlines, prompts, and scene planning — keep it short and clear.",
			label: "Product name",
			labelHint: "Required before you continue",
			placeholder: "e.g. goldstone bracelet",
			examplesLabel: "Try an example",
			examples: [
				"Goldstone bracelet",
				"Portable power station",
				"Vitamin C serum",
			],
			tipTitle: "Why we ask",
			tipBody:
				"Studio uses the product name in image prompts, video briefs, and on-screen copy so ads stay on-brand for what you sell.",
			tipNote: "You can edit this later",
			tipNoteBody: "Change it anytime in Setup or Advanced studio.",
		},
		preGenerateSetup: {
			stepEyebrow: "STEP 4",
			titleBefore: "Set your",
			titleAccent: "content and materials",
			title: "Set your content and materials",
			hint: "Add content details, upload product images, choose output type and style.",
			directHint:
				"Choose quick ad or model-wear, optionally add a reference image, then set content and product photos — same setup as after research.",
			conceptHint:
				"Review research brief and copy, optionally add a product photo, then choose output type and generate — product photo is optional for concept ads.",
			conceptDirectHint:
				"Pick a creative direction, optionally add a reference image, then set copy and generate — product photo is optional for concept ads.",
			conceptTopicLabel: "Concept topic",
			conceptTopicRequired: "Required",
			productPhotosOptionalTitle: "Product images (optional)",
			mainPhotoOptional: "Optional",
			mainPhotoOptionalHint:
				"Add a product shot if you have one — otherwise we generate from your topic, copy, and research style.",
			stylePickerTitle: "Creation direction",
			stylePickerHint:
				"Pick one look: direct product ad, designed commercial poster, parts breakdown, or model wear/use.",
			conceptStylePickerHint:
				"Each option changes layout prompts — info posters, designed posters, brand match, pricing cards, or website launch.",
			stylePickerQuickLabel: "Direct creation",
			stylePickerQuickDesc:
				"Product-focused promo image — no model required.",
			stylePickerDesignedLabel: "Designed poster",
			stylePickerDesignedDesc:
				"Commercial feed poster — bilingual type, seal, category brush word (any product, not food-only).",
			stylePickerPartsLabel: "Parts breakdown",
			stylePickerPartsDesc:
				"Exploded product view — labeled components with title + short descriptions on one poster.",
			stylePickerModelLabel: "Model wear / use",
			stylePickerModelDesc:
				"Person wearing or using your product in the shot.",
			stylePickerModelLockedHint:
				"Unavailable with a reference — layout follows the reference instead.",
			stylePickerModelLockedNote:
				"A reference image is uploaded, so model-wear is turned off. The ad will follow the reference layout. Remove the reference to use model-wear.",
			referenceUploadTitle: "Reference image (optional)",
			referenceUploadHint:
				"Upload a layout or style reference. AI analyzes it and borrows composition — skip if you only have product + copy.",
			referenceRemove: "Remove",
			referenceTitle: "Reference creative brief",
			changeBrief: "Change brief",
			noReference: "No reference",
			briefSummaryTitle: "Brief analysis summary",
			briefProduct: "Product",
			briefTarget: "Target",
			briefGoal: "Goal",
			briefTone: "Tone",
			briefKeyMessage: "Key message",
			contentTitle: "Content details",
			hookLabel: "Main hook",
			supportingLabel: "Supporting copy",
			extraLabel: "Extra requirements",
			extraOptional: "(optional)",
			onImageBadge: "Shows on the image",
			conceptCopyFocus: {
				info: {
					title: "For this direction: fill selling-point bullets",
					body: "Hook is the headline. Put one selling point per line in supporting copy — they become the info-poster bullets.",
					supportingLabel: "Selling points (one per line)",
					supportingPlaceholder:
						"e.g.\nNatural ingredients\nVisible results\nDaily use friendly",
				},
				designed: {
					title: "For this direction: fill on-poster type",
					body: "Hook = big bilingual title on the poster. Supporting = short tagline under it. Product name drives the hero + brush category word. Extra requirements = seal claim, palette, set mood — not the main title.",
					hookLabel: "Poster title (hook)",
					hookPlaceholder: "e.g. 便攜續航 · All-day power",
					supportingLabel: "Poster tagline",
					supportingPlaceholder:
						"Short line on the poster, e.g. Creamy & Juicy / Soft & Fresh",
				},
				parts: {
					title: "For this direction: fill title + part callouts",
					body: "Hook = poster title. Supporting copy = one short part description per line — they become labeled callouts on the exploded diagram. Extra requirements = lighting, part count, background mood.",
					hookLabel: "Poster title (hook)",
					hookPlaceholder: "e.g. 內在結構 · Inside the build",
					supportingLabel: "Part callouts (one per line)",
					supportingPlaceholder:
						"e.g.\nBattery — all-day charge\nShell — matte grip\nChip — fast charge IC",
				},
				brand: {
					title: "For this direction: brand style comes first",
					body: "Analyze your website/social when you can. Hook + supporting copy follow brand palette — not a pricing card.",
					supportingLabel: "Brand message / subline",
					supportingPlaceholder: "e.g. Trusted local experts · Clear results",
				},
				pricing: {
					title: "For this direction: fill offer / CTA",
					body: "Hook names the plan. Offer text becomes the pricing-card CTA. We won’t invent prices if Offer is empty.",
					supportingLabel: "Plan highlights (short)",
					supportingPlaceholder: "e.g. Three tiers · Beginner to pro",
					offerLabel: "Offer / CTA (recommended)",
					offerPlaceholder: "e.g. 20% off this week · Book now · From $198",
				},
				website: {
					title: "For this direction: launch hook first",
					body: "Hook is the launch line; supporting copy lists features. Layout leans website/app mockup.",
					supportingLabel: "Features / benefits",
					supportingPlaceholder: "e.g. Book in one tap · Instant confirm · Mobile ready",
					offerLabel: "CTA (optional)",
					offerPlaceholder: "e.g. Try free · Open the site",
				},
			},
			outputTypeTitle: "Output type",
			productPhotosTitle: "Upload product images",
			dragDrop: "Drag & drop",
			addMore: "Add more",
			mainPhotoBadge: "Main",
			anglePhotoBadge: "Angle",
			mainPhotoRowLabel: "Main product photo",
			mainPhotoRequired: "Required",
			mainPhotoHint:
				"Clear front-facing product shot — this drives product identity in the output.",
			anglePhotoRowLabel: "Other angles",
			anglePhotoOptional: "Optional",
			anglePhotoHint:
				"Extra angles help material and form detail. Not required.",
			productPhotosHint:
				"Main photo is required and drives product identity. Extra angles are optional and help detail.",
			imageOptionsTitle: "Image options",
			storyboardLookBeforePlanHint:
				"Pick look first — style is written into the AI storyboard plan and the stills.",
			storyboardTextModeHint:
				"Default is textless stills (captions later). Choose AI on-image type if you want words baked into each frame — H3 will try to keep them moving.",
			styleLabel: "Choose image style",
			aspectLabel: "Aspect ratio",
			textModeLabel: "Text mode",
			tipTitle: "Tips for better results",
			tipIntro: "",
			tip1: {
				title: "Use clear product images",
				body: "Sharp, well-lit product shots help AI keep your item accurate.",
			},
			tip2: {
				title: "Be specific with your hook",
				body: "A short, concrete headline beats vague marketing phrases.",
			},
			tip3: {
				title: "Choose the right format",
				body: "Single for one post, A/B to compare, carousel for teachable stories.",
			},
			tip4: {
				title: "Let AI enhance styling",
				body: "Defaults for style, ratio, and text usually work — tweak only if needed.",
			},
			conceptTip1: {
				title: "Product photo is optional",
				body: "Upload one if you have it; otherwise we generate from topic, copy, and creative direction.",
			},
			conceptTip2: {
				title: "Be specific with your hook",
				body: "A short, concrete headline beats vague marketing phrases.",
			},
			conceptTip3: {
				title: "Choose the right format",
				body: "Single for one post, A/B to compare, carousel for teaching or offer stories.",
			},
			conceptTip4: {
				title: "Creative direction changes layout",
				body: "Info poster, brand match, pricing card, or website launch — each uses different prompts.",
			},
			conceptBriefTopic: "Topic",
			conceptReferenceUploadHint:
				"Upload a layout or style reference. AI analyzes it and borrows composition — topic and copy alone can still generate.",
			conceptMainPhotoOptionalHint:
				"Add a shot if you have one — otherwise we generate from topic, copy, and creative direction / reference style.",
			combinedHint:
				"Add copy, upload your product photo, optionally note the story, then generate multi-scene stills — we stitch them into one silent reel next.",
			combinedConceptHint:
				"Add topic and copy, optionally a photo, note the story, then generate multi-scene stills — we stitch them into one silent reel next.",
			storyboardTitle: "Storyboard reel",
			storyboardHint:
				"Optional story notes plus duration / scene count for the stitched reel.",
			secureNote: "All your selections are safe and secure.",
		},
		preVideoSetup: {
			titleBefore: "Set your",
			titleAccent: "video details",
			hint: "Add copy, upload a product photo, write/confirm the motion prompt, pick duration, then generate a silent reel.",
			scenesReadyHint:
				"Scene stills are ready. Generate uses MiniMax H3 (one clip from all stills). Captions later.",
			scenesReadyTitle: "Storyboard scenes ready",
			scenesReadyBody:
				"These stills become one H3 clip. Regen a bad cell first if needed.",
			assistantHint:
				"Upload a product photo → AI writes a motion prompt → review it → generate (silent reel; captions later).",
			assistantTitle: "AI motion prompt",
			assistantBody:
				"AI reads your product photo and writes how the camera should move — not spoken script or captions.",
			assistantNeedPlan:
				"Analyze the photo first — generate stays locked until a motion prompt exists.",
			assistantTip1: {
				title: "Motion prompt first",
				body: "Tap “Analyze photo & write motion prompt” before generate.",
			},
			assistantTip2: {
				title: "Edit if needed",
				body: "You can tweak the motion text before generating the reel.",
			},
			conceptPlanTitle: "AI motion prompt",
			conceptPlanBody:
				"AI writes how the reel should move from your brief or brand cues — not a spoken voiceover script.",
			conceptPlanNeed:
				"Tap “AI write motion prompt” first — generate stays locked until a prompt exists.",
			conceptHint:
				"Confirm topic and copy, optionally add a photo, write the motion prompt, pick duration, then generate.",
			conceptCreativeHint:
				"Describe the creative direction, write the motion prompt, optionally add a photo, then generate.",
			conceptBrandHint:
				"Add brand website cues if you want, write the motion prompt, optionally add a photo, then generate.",
			sceneReelHint:
				"Describe the scene; optional website / IG for brand tone; optional MP4 for camera feel. Photo optional.",
			referenceVideoHintConcept:
				"Optional — we follow motion/edit feel, not a frame copy. Concept reels can skip a product photo.",
			contentTitle: "Content details",
			hookLabel: "Main hook",
			supportingLabel: "Supporting copy",
			extraLabel: "Extra motion notes",
			extraOptional: "(optional)",
			onImageBadge: "Shows on end frame",
			motionPosterCopyFocus: {
				title: "For motion poster: fill the end-frame title",
				body: "Start still is textless. End still paints your hook as a large masthead (plus optional supporting line). Product photo is required — it is the hero. Extra notes = lighting / set only, not the title.",
				hookLabel: "End-frame title (hook)",
				hookPlaceholder: "e.g. 便攜續航 · All-day power",
				supportingLabel: "End-frame support line",
				supportingPlaceholder: "Short line under the masthead (optional)",
				extraLabel: "Extra still / motion notes",
				extraPlaceholder:
					"e.g. soft upper-left light, desk set, no people…",
			},
			conceptTopicLabel: "Topic / service",
			productPhotoTitle: "Product photo",
			productPhotoHint:
				"Clear product shot — required. This becomes the subject in the reel.",
			productPhotoWithRefHint:
				"Required — your product as @Image1. The reference MP4 only supplies motion/edit feel.",
			conceptPhotoTitle: "Optional still",
			conceptPhotoHint:
				"Optional — helps grounding; concept reels can also run from brief + motion prompt alone.",
			brandTitle: "Brand website",
			brandHint:
				"Optional analyze — helps tone for the motion prompt and look.",
			dragDrop: "Upload",
			settingsTitle: "Video settings",
			settingsHint: "Duration and resolution affect token cost.",
			aspectLabel: "Poster size",
			aspectHint:
				"Still + video share this size. 9:16 Reels/Stories · 4:5 IG feed · 1:1 square.",
			klingSettingsHint:
				"Video uses MiniMax H3 first (all stills → one clip). Kling stitch only if H3 fails — no 5s/10s picker.",
			klingClipLabel: "Clip length (per scene)",
			klingClipHint:
				"Kling only supports 5s or 10s per scene — not Seedance-style 4–12s totals.",
			klingTotalLabel: "About {total}s total ({n} × {clip}s)",
			costLabel: "Estimated ~{n} tokens for this video",
			tipTitle: "Tips for better video",
			tip1: {
				title: "Use a clear product photo",
				body: "Well-lit product shots keep identity stable when the reel animates.",
			},
			tip2: {
				title: "Keep the hook short",
				body: "A concrete headline helps the motion plan stay on-message.",
			},
			tip3: {
				title: "Watch duration vs cost",
				body: "Longer clips and higher resolution use more tokens — start with 6–8s.",
			},
			klingTip1: {
				title: "Script under each still",
				body: "The AI scene copy shows the story beat — captions can burn it later.",
			},
			klingTip2: {
				title: "H3 one take",
				body: "All stills go into one MiniMax H3 clip — not four separate videos.",
			},
			klingTip3: {
				title: "Fix stills first",
				body: "Regen a weak cell before generate. Video only animates what you lock.",
			},
			conceptTip1: {
				title: "Photo is optional",
				body: "Topic + brief + motion prompt can drive the clip — upload a still only if it helps.",
			},
			conceptTip2: {
				title: "Be specific in the brief",
				body: "Mood, camera move, and who it’s for beat vague “make it nice” notes.",
			},
			conceptTip3: {
				title: "Start short",
				body: "6–8s is enough to judge pacing before spending more tokens.",
			},
			stylePickerTitle: "How to make this video",
			stylePickerHint:
				"AI writes the motion prompt from your photo, or a reference/research reel supplies the motion plan.",
			referenceHint:
				"Upload a reference MP4 (analyzed for motion). For products, also upload your product photo as @Image1, then generate.",
			ugcHint:
				"UGC needs a talking-head keyframe first — continue to build the presenter clip.",
			ugcContinueLabel: "Continue to keyframe",
			ugcNextNote:
				"Next you’ll generate a talking-head keyframe, review it, then produce the UGC video.",
			ugcPhotoHint:
				"Clear product photo for the presenter to hold or show.",
			referenceVideoTitle: "Reference reel (MP4)",
			referenceVideoHint:
				"We analyze this clip for camera / edit feel — not a frame-by-frame copy. Not used as spoken script.",
			referenceUploadCta: "Upload reference MP4",
			referenceRemove: "Remove",
			refTip1: {
				title: "Use a clear short",
				body: "A clean 6–15s reel with obvious motion works better than a busy montage.",
			},
			refTip2: {
				title: "Your product, their pacing",
				body: "Subject and copy stay yours — only motion language transfers from the reference.",
			},
			ugcTip1: {
				title: "Photo for the product",
				body: "UGC still needs a clear product shot for the keyframe.",
			},
			ugcTip2: {
				title: "Lip-sync script comes next",
				body: "After the keyframe you’ll set presenter pack and spoken lip-sync lines.",
			},
			secureNote: "All your selections are safe and secure.",
		},
		conceptNameStep: {
			stepEyebrow: "STEP 3",
			title: "What's your concept name?",
			hint: "Name your service or concept — next you’ll choose research or Concept assistant.",
			label: "Concept / service name",
			labelHint: "Required before you continue",
			placeholder: "e.g. fast-approval personal loan",
			examplesLabel: "Try an example",
			examples: [
				"Fast-approval personal loan",
				"Yoga membership",
				"SaaS free trial",
			],
			tipTitle: "Why we ask",
			tipBody:
				"Studio uses this name in prompts, briefs, and on-screen copy so ads stay clear about the service or offer you promote.",
			tipNote: "You can edit this later",
			tipNoteBody: "Change it anytime in Setup or Advanced studio.",
		},
		conceptTitle: "Concept assistant",
		conceptHint: "Describe your service or offer — not a physical SKU.",
		conceptSourceTitle: "Where should concept start?",
		conceptSourceHint:
			"Pick one starting point — AI brief or platform research, not both.",
		conceptSourceAssistantTitle: "Concept assistant",
		conceptSourceAssistantDesc:
			"AI writes copy and visual direction — skips platform research.",
		conceptSourceResearchTitle: "Platform research",
		conceptSourceResearchDesc:
			"Find trending layout references — skips concept assistant; copy review required.",
		conceptTopicTitle: "Concept name",
		conceptTopicHint:
			"Name your service or concept — next you’ll choose research or Concept assistant.",
		conceptTopicLabel: "Concept / service name",
		conceptTopicPlaceholder: "e.g. fast-approval personal loan",
		copyEditTitle: "Copy & generation settings",
		copyEditHint:
			"Hook, subline, offer, and optional brand kit before generating.",
		brandKitSummary: "Brand settings (optional)",
		refImageTitle: "Reference image (optional)",
		refImageHint:
			"Match layout and colors — your product and copy still drive the topic.",
		imageOptionsTitle: "Image options",
		imageOptionsHint:
			"Art style, aspect ratio, and text mode — defaults are fine for most paths.",
		videoSettingsTitle: "Video settings",
		videoSettingsHint:
			"Duration and resolution affect billing — set before generating.",
		analyzing: "Analyzing…",
		generatingImage: "Generating photos…",
		generatingVideo: "Generating video…",
		reelDownloading: "Downloading reference reel…",
		fallbackTitle: "Coming soon in micro-wizard",
		fallbackHint:
			"Use Advanced studio for this path until v2 parity ships.",
		blockReasons: {
			pick_output: "Pick image, video, or both to continue.",
			pick_subject: "Pick physical product or concept to continue.",
			pick_intake: "Pick research or direct create.",
			complete_research:
				"Apply a research direction, or switch to Direct create.",
			pick_concept_source: "Pick concept assistant or platform research.",
			need_pick_angle: "Pick a research post or upload a reference.",
			pick_cinematic_mode: "Pick single scene or multi-scene stitch.",
			pick_combined_style: "Pick the storyboard reel workflow.",
			pick_video_subpath: "Pick how to create your video.",
			need_product_name: "Enter a product name.",
			need_concept: "Enter your concept idea.",
			need_concept_topic: "Enter a research topic.",
			need_product_photo: "Upload a product photo.",
			need_creative_brief: "Add a creative video brief.",
			need_reference_video:
				"Upload a reference MP4 (or pick a reel from research).",
			need_brand_website:
				"Brand website is optional — continue without it.",
			need_duration_before_reel:
				"Pick explicit video duration before reel analyze.",
			reference_analyzing: "Wait for reference analysis to finish.",
			brand_analyzing: "Wait for brand analysis to finish.",
			reel_analyzing: "Wait for reel analysis to finish.",
			reel_downloading: "Downloading reference reel from research…",
			need_headline: "Add a headline or concept idea.",
			image_busy: "Wait for image generation to finish.",
			image_not_ready: "Wait for the generated image to appear.",
			need_storyboard_approve:
				"Approve the storyboard stills (九宫格) before continuing to video.",
			video_busy: "Wait for video generation to finish.",
			video_not_ready:
				"Video is not ready yet — wait for generation, or go back and retry.",
			plan_video_busy: "Wait for the AI motion plan to finish.",
		},
		combinedStyleTitle: "Image + video workflow",
		combinedStyleHint:
			"Image + video uses 分鏡 storyboard only — multi-scene stills, then one Reel. No single-poster Ship-it.",
		combinedAnimateTitle: "Storyboard (分鏡)",
		combinedAnimateDesc:
			"Multi-scene keyframes → one stitched Reel. This is the only image+video path.",
		videoSubpathTitle: "Video creation path",
		videoSubpathHint:
			"AI motion plan from your photo, or follow a reference reel.",
		refVideoTitle: "Reference video (MP4)",
		refVideoHint:
			"Upload a reel if you have one; skip for image posts (style images + storyboard are enough).",
		refVideoTitleOptional: "Reference video (optional)",
		refVideoHintOptional:
			"Image posts don't need an MP4 — this step auto-skips. Upload a reel only if you want rhythm matching.",
		extraKitTitle: "Product photo kit",
		extraKitHint:
			"Optional packaging and angle photos for AI video assistant.",
		bgmTitle: "Background music",
		bgmHint: "Optional — pick a track mood for the final reel.",
		legacyImageTitle: "Generate scenes",
		legacyImageHint:
			"Continue to the image studio — generate keyframes, then return here.",
		doneTitle: "Export",
		doneHint: "Continue to download and share your ad.",
	},
	pro: {
		back: "← Home",
		backStudio: "Guided wizard",
		title: "Pro canvas",
		subtitle:
			"Lumina-style node canvas: add nodes, wire refs with @, run each step or Run all.",
		costHint:
			"Pro uses Token billing at pay-per-use rates (not Lumina subscription pricing). Each run costs API credits on your service credentials.",
		mobileDesktopOnly:
			"Pro canvas is built for desktop — use a tablet in landscape or a computer for the best experience. The guided wizard at /studio works on phones.",
		steps: [
			"1. Add upload / image nodes — set @aliases (e.g. Ava, Outfit)",
			"2. Optional camera angle node between image and video",
			"3. Script or text-to-video nodes; splice clips + audio at the end",
		],
		addNode: "Add node",
		addResource: "Add resource",
		queueTitle: "Task queue",
		runAll: "Run all",
		running: "Running…",
		queueEmpty: "Add nodes, then Run all",
		nodeLabels: {
			text: "Text",
			image: "Image",
			audio: "Audio",
			video: "Image-to-video",
			textVideo: "Text-to-video",
			splice: "Video splice",
			script: "Script planning",
			camera: "Camera angle",
			upload: "Upload",
		},
	},
} as const;
