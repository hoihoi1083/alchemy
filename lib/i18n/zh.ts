import type { TemplateId } from "@/lib/templates";

export const zh = {
	meta: {
		title: "Alchemy AI Lab",
		description: "上傳產品相片製作廣告短片，附背景音樂",
	},
	lang: {
		en: "English",
		zh: "繁體中文（香港）",
		"zh-cn": "简体中文",
		"zh-tw": "繁體中文（台灣）",
	},
	auth: {
		signIn: "登入",
		signInTab: "登入",
		signUpTab: "註冊",
		signInSubtitle: "歡迎回來！請登入你嘅帳戶以繼續。",
		signInOAuthHint: "第一次用？如果你未有 Alchemy 帳戶，請按「註冊」。",
		signUpSubtitle: "建立帳戶 — 註冊即送 500 免費 token。",
		tokensBalance: "{n} 點數",
		tokensBalanceTitle: "你的點數餘額 — 查看方案與加購",
		accountMenu: "帳戶與帳單",
		libraryMenu: "我的作品庫",
		brandKitMenu: "品牌套件",
		signupPromoBar: "註冊即送 500 免費 token",
		closeModal: "關閉",
		panelTagline: "AI 營銷創意工作流",
		panelFeatures: [
			{
				icon: "✦",
				title: "新手友好預設",
				body: "精靈預設保持簡單，幫你避開常見嘅質量問題。",
			},
			{
				icon: "▶",
				title: "由草稿到成片更快",
				body: "先生成靜圖，再動畫成片 — 更容易 iterate、控制質量。",
			},
			{
				icon: "◫",
				title: "為小生意廣告而生",
				body: "模板同提示詞針對 IG/FB Reels 同實際推廣場景優化。",
			},
		],
	},
	account: {
		title: "帳戶與帳單",
		subtitle:
			"查看計劃、點數餘額同帳單紀錄。需要時可喺 Stripe 管理信用卡同發票。",
		loading: "載入帳戶中…",
		loadError: "無法載入帳戶。",
		planLabel: "目前計劃",
		balanceLabel: "Token 餘額",
		tokensUnit: "點數",
		renewsLabel: "下次續費",
		pendingDowngradeLabel: "已排程降級",
		pendingDowngradeBody:
			"將於 {date} 改為 {plan}。在此之前仍享用目前計劃。",
		manageBilling: "管理帳單",
		portalRedirecting: "正開啟 Stripe…",
		portalError: "無法開啟帳單頁面。",
		portalNeedSubscribe:
			"請先訂閱，先可以管理信用卡、取消同查看 Stripe 發票。",
		viewPlans: "查看方案與加購",
		historyTitle: "收據與 token 紀錄",
		historySubtitle:
			"包括訂閱發放、加購同生成扣費。Stripe 訂閱發票亦可喺「管理帳單」查看。",
		historyEmpty: "暫時未有交易紀錄。",
		balanceAfter: "結餘",
		invoiceRef: "發票",
		reasons: {
			signup_grant: "免費註冊 token",
			subscription_grant: "訂閱 token",
			topup: "Token 加購",
			consume: "生成扣費",
			refund: "退款",
			admin_adjust: "調整",
		},
		team: {
			title: "企業席位",
			seatsUsed: "已用席位：{held} / {limit}",
			seatsUsedHint: "{members} 位成員 · {pending} 個待接受邀請",
			seatsFull: "席位已滿。請先移除成員或撤銷邀請，再加入其他人。",
			invitePlaceholder: "邀請同事電郵",
			invite: "邀請",
			inviteHint:
				"瀏覽器允許時會自動複製邀請連結。隊友必須用受邀電郵登入後打開連結（唔好用擁有者帳號）。生成會使用團隊 token 池。",
			membersTitle: "現有成員",
			ownerSuffix: "（擁有人）",
			remove: "移除",
			removeConfirm: "將 {name} 移出團隊？對方會失去企業權限，個人作品庫仍屬對方。",
			pendingTitle: "待接受邀請",
			expires: "於 {date} 到期",
			resend: "重發",
			revoke: "撤銷",
			revokeConfirm: "撤銷發給 {email} 的邀請？",
			noPending: "暫時沒有待接受邀請。",
			inviteCreatedCopied: "已發送邀請，連結已複製到剪貼簿。",
			inviteCreatedNoCopy: "已發送邀請。請從電郵複製連結。",
			inviteCreatedCopiedNoEmail: "已建立邀請，電郵未送出；連結已複製到剪貼簿。",
			inviteCreatedNoEmailNoCopy: "已建立邀請，電郵未送出；請自行複製連結。",
			inviteResentCopied: "已重發邀請，新連結已複製到剪貼簿。",
			inviteResentNoCopy: "已重發邀請。",
			inviteFailed: "無法建立邀請。",
			revokeFailed: "無法撤銷邀請。",
			removeFailed: "無法移除成員。",
			resendFailed: "無法重發邀請。",
			memberTitle: "企業團隊",
			memberBody: "你而家用緊 {owner} 嘅 Custom 計劃。生成會用團隊 token 池。",
			memberBodyGeneric: "你而家喺企業團隊。生成會用團隊 token 池。",
			leave: "離開團隊",
			leaveConfirm: "離開呢個企業團隊？你會失去 Custom 計劃權限。",
			leaveFailed: "無法離開團隊。",
			pooledBalance: "團隊 token 池",
			inviteAcceptTitle: "團隊邀請",
			inviteAcceptSubtitle: "接受企業席位邀請即可解鎖計劃權限。",
			inviteAccepting: "正在接受邀請…",
			inviteSignIn: "請用受邀電郵登入以繼續。",
			inviteOk: "已加入席位，你而家有企業權限。",
			inviteGoAccount: "前往帳戶",
			inviteBack: "返回帳戶",
			inviteMissingToken: "缺少邀請 token。",
			inviteFailedAccept: "無法接受邀請。",
			inviteWrongEmail: "呢封邀請係發給另一個電郵。請登出，再用受邀電郵登入。",
			inviteWrongEmailFor:
				"呢封邀請係發給 {email}。請登出，再用呢個電郵登入（唔好用團隊擁有者帳號）。",
			inviteWrongEmailOwner:
				"而家登入緊嘅係團隊擁有者帳號。呢封邀請係發給 {email}。請登出，再用呢個電郵登入。",
			inviteSwitchAccount: "登出再換帳號",
		},
	},
	library: {
		title: "我的作品庫",
		subtitle:
			"已儲存嘅生成結果同工作室專案 — 有永久副本時會用嚟預覽同下載。",
		loading: "載入作品庫中…",
		loadError: "無法載入作品庫。",
		empty: "暫時未有專案。去工作室創作後就會出現喺呢度。",
		emptyCta: "開啟工作室",
		openStudio: "喺工作室繼續",
		downloadImage: "下載圖片",
		downloadVideo: "下載影片",
		openMedia: "開啟",
		delete: "刪除",
		deleteConfirm: "確定刪除呢個專案？唔可以還原。",
		deleting: "刪除中…",
		noMedia: "未有已儲存嘅媒體",
		linkExpiredHint:
			"舊專案可能仲用緊已過期嘅 臨時連結 — 請用下面「已儲存檔案」，或重新生成。新輸出會永久儲存。",
		updatedLabel: "更新於",
		imageBadge: "圖片",
		videoBadge: "影片",
		accountLink: "帳戶與帳單",
		savedFilesTitle: "已儲存檔案",
		savedFilesSubtitle:
			"你生成嘅圖片、影片同音訊嘅永久副本 — 存喺我哋伺服器，隨時可以再下載。",
		savedFilesEmpty: "暫時未有已儲存檔案。新生成會自動複製到呢度。",
		projectsTitle: "專案",
		audioBadge: "音訊",
		voiceoverBadge: "配音",
		download: "下載",
		editCaptions: "加字幕／配音",
		editImage: "編輯圖片",
	},
	footer: {
		tagline:
			"任何想法，幾分鐘變成停滑吸睛內容 — 圖片、影片同 Reels 一次完成。",
		productTitle: "產品",
		legalTitle: "法律資訊",
		studio: "開始製作",
		pricing: "方案與 tokens",
		how: "運作方式",
		watchDemo: "觀看示範",
		proCanvas: "專業畫布",
		accountTitle: "帳戶",
		library: "我的作品庫",
		account: "帳戶與帳單",
		companyTitle: "公司",
		contact: "聯絡我們",
		privacy: "隱私政策",
		terms: "服務條款",
		refund: "退款政策",
		followUs: "追蹤我們",
		paymentsNote: "由 Stripe 提供安全付款（Visa、Mastercard、Apple Pay、Google Pay、支付寶、微信支付）",
		rights: "保留所有權利。",
	},
	studio: {
		loadingTitle: "正在載入 studio…",
		loadingHint: "還原推廣模式同精靈版面。",
		errorTitle: "Studio 出現錯誤",
		errorBody: "精靈流程遇到問題。你可以重試，或返回模式選擇。",
		errorRetry: "重試",
		errorBackStart: "返回模式選擇",
		mongoRequiredTitle: "無法自動儲存專案",
		mongoRequiredBody:
			"伺服器未設定 MONGODB_URI。連接 MongoDB 前，你的工作不會自動儲存。",
		mongoRequiredBodyConnected:
			"已設定 MongoDB，但健康檢查失敗。請修復索引／連線後重新部署。詳情：",
		saveSaving: "儲存中…",
		saveSaved: "已儲存 ✓",
		saveError: "儲存失敗",
	},
	start: {
		title: "你推廣咩？",
		subtitle: "揀一條路徑 — 我哋會調整 studio 風格同必填欄位。",
		heroSubtitle:
			"Alchemy 會一步步帶你：先揀推廣類型，再幫你對齊欄位、風格同輸出格式。",
		stepEyebrow: "第 1 步",
		stepTitle: "揀你想推廣咩",
		stepHint: "揀最啱描述你而家要推廣嘅選項。",
		physicalTitle: "實體產品",
		physicalDesc: "有真實貨品可以影相 — 手鏈、食品、護膚、小工具等。",
		physicalExamples: "例如：護膚套裝、零食飲料、飾品珠寶、服裝、家居日用",
		physicalTags: ["護膚", "食品飲料", "飾品珠寶", "服裝", "家居日用"],
		conceptTitle: "服務／網站／品牌／概念",
		conceptDesc: "冇實體貨 — 推廣服務、網站、品牌或概念創意。",
		conceptExamples:
			"例如：美容美髮、顧問諮詢、網站上線、品牌宣傳、品牌故事、活動概念",
		conceptTags: [
			"美容美髮",
			"顧問諮詢",
			"網站上線",
			"品牌宣傳",
			"品牌故事",
			"活動概念",
			"會員課程",
		],
		continueLabel: "進入 studio",
		continueToStep2: "繼續",
		switchLaterHint: "之後可喺 studio 頂部切換類型。",
		tipTitle: "應該揀邊個？",
		tipChoose: "揀",
		tipPhysical: "—— 如果你有真實貨品可以影相／寄送俾顧客。",
		tipConcept: "—— 如果你推廣服務、網站、品牌或概念。",
		tipNote: "之後隨時可以改",
		tipNoteBody: "而家未決定都得 — 之後可以喺 Studio 入面再轉。",
		secureNote: "你嘅資料安全，唔會對外分享。",
		roadmapTitle: "點樣運作",
		roadmapSubtitle:
			"五個階段 — 創作路徑會分支（只要圖、只要片，或兩者）。",
		phases: ["揀推廣類型", "揀創作路徑", "設定", "生成", "檢查"],
		phasesImage: [
			"揀推廣類型",
			"揀創作路徑",
			"素材同設定",
			"生成圖片",
			"檢查同匯出",
		],
		phasesVideo: [
			"揀推廣類型",
			"揀創作路徑",
			"影片簡報",
			"生成影片",
			"檢查同匯出",
		],
		phasesCombined: [
			"揀推廣類型",
			"揀創作路徑",
			"分鏡設定",
			"分鏡圖",
			"製作影片",
		],
		phaseBodies: [
			"揀實體產品定服務／網站／品牌／概念。",
			"只要相片、只要影片，或先圖再片。",
			"填資料、研究、風格同素材。",
			"跑相片同／或影片 — 只顯示你條路徑需要嘅步驟。",
			"檢查、編輯，再匯出適合 IG／FB／TikTok 嘅廣告。",
		],
		physicalShort: "有真實貨品可以影相 — 護膚、食品、飾品、服裝、家居同更多。",
		conceptShort: "推廣服務、網站、品牌或概念創意，唔使實體貨。",
		examplesLabel: "例如",
		templateBanner: "模板：{name} — 實體產品模式",
		templateBannerHint: "揀下面「實體產品」以用此版型進入精靈。",
		welcomeTitle: "歡迎加入！",
		welcomeBody:
			"你已獲得 {n} 免費 tokens，可以開始創作。請先選擇下方路徑。",
	},
	header: {
		badge: "簡易模式 · Reels · 稍後加 BGM",
		title: "Alchemy AI Lab studio",
		subtitle: "上傳產品圖 · 揀款式 · 出 Reels",
		subtitleConcept: "品牌文案 · 揀款式 · 出 feed 圖同 Reels",
		promotionPhysical: "實體產品",
		promotionConcept: "服務／品牌／概念",
		switchPromotion: "切換類型",
		homeLink: "返回 Landing",
		themeToggleLight: "淺色",
		themeToggleDark: "深色",
		proLink: "Pro 智能畫布",
		captionsLink: "字幕同音頻工作室",
		imageCanvasLink: "圖片加字工作室",
	},
	landing: {
		badge: "AI 營銷內容平台",
		titleBefore: "做營銷內容，",
		titleHighlight: "唔使",
		titleAfter: "自己寫 prompt。",
		title: "做營銷內容，唔使自己寫 prompt。",
		subtitle:
			"上傳產品相或貼參考帖。Alchemy 分析風格、引導設定，再生成可編輯廣告圖同影片，5 分鐘搞掂。",
		openStudio: "開啟工作室",
		startCreating: "開始製作",
		tryFree: "免費試用",
		floatingCta: "立即開始",
		ctaPrimary: "免費試用 — 做你第一隻廣告",
		ctaSecondary: "睇下點運作",
		howItWorks: "運作方式",
		navHome: "首頁",
		navProduct: "產品",
		navTemplates: "模板",
		navHow: "運作方式",
		navBrandKit: "品牌套件",
		navUseCases: "使用場景",
		navPricing: "收費",
		navEditImage: "改圖",
		navEditImageHint: "加字、Logo、微調圖片",
		navCaptions: "字幕",
		navCaptionsHint: "MP4 燒字幕、BGM、口播",
		navCanva: "畫布",
		canvaHubBadge: "後製工具",
		canvaHubTitle: "畫布工具",
		canvaHubSubtitle: "喺畫布改圖，或者幫 MP4 燒字幕同音軌。",
		navProCanvas: "Pro 畫布（需 Master 方案）",
		navProCanvasUnlocked: "Pro 畫布",
		heroTrust: [
			"唔使空白 prompt",
			"先分鏡再出片",
			"產品同概念都得",
			"AI 市場研究",
		],
		heroImageAlt: "產品相同 AI 風格分析",
		heroMascotAlt: "Alchemy 可愛燒瓶夥伴（護目鏡）— 郁吓滑鼠就會睇唔同方向",
		heroBeforeLabel: "之前",
		heroAfterLabel: "之後",
		heroPanelTitle: "AI 風格分析",
		heroPanelBars: [
			{ label: "顏色", value: "92%", pct: 92 },
			{ label: "排版", value: "88%", pct: 88 },
			{ label: "語氣", value: "85%", pct: 85 },
		],
		transformBadge: "產品變身",
		transformTitleBefore: "由一張普通產品相，變成 ",
		transformTitleHighlight: "工作室級",
		transformTitleAfter: " 廣告圖。",
		transformBody:
			"上傳一張產品相。Alchemy 分析顏色、排版同語氣，再幫你重塑場景同光影，做出吸引眼球、又可以再編輯嘅廣告素材。",
		transformPoints: [
			{
				title: "保留你真正嘅產品",
				body: "改場景同光感，唔會亂改你嘅樽身、標籤同品牌細節。",
			},
			{
				title: "對齊你想要嘅風格",
				body: "AI 為顏色、排版、語氣打分，輸出更有方向，唔係亂撞。",
			},
			{
				title: "幾分鐘就出廣告位",
				body: "做出適合 IG、Facebook、TikTok、小紅書嘅靜態圖，再喺畫布微調。",
			},
		],
		transformCta: "幫我變產品圖",
		transformHint: "唔使空白 prompt，由你嘅產品相開始。",
		howTitleBefore: "運作",
		howTitleHighlight: "方式",
		howSubtitle: "由參考到成品，四個引導步驟。",
		howSteps: [
			{
				title: "上傳或貼參考",
				body: "加產品相，或帶入你鍾意嘅帖／Reel 做風格參考。",
			},
			{
				title: "AI 分析風格",
				body: "抽出排版、色調同語氣，再套去你嘅產品或概念。",
			},
			{
				title: "改文案同規劃",
				body: "確認標題、格式；需要時先睇分鏡靜幀，再花 token。",
			},
			{
				title: "生成同編輯",
				body: "出圖或出片後，再喺畫布改字、加 Logo、導出尺寸。",
			},
		],
		demoModal: {
			close: "關閉示範",
			tryCta: "免費試用 — 做第一張廣告",
			tabsAria: "示範類型",
			tabs: {
				image: "出圖",
				storyboard: "分鏡",
				video: "出片",
			},
			demos: {
				image: {
					title: "四步出圖廣告",
					subtitle: "真實 Studio 操作 — 產品相入，靜態廣告出。",
					hint: "真實錄影 · 撳步驟可跳轉",
					steps: [
						{ title: "揀產品", body: "揀實體產品，然後入 Studio。" },
						{ title: "只出圖", body: "揀「只生成圖片」— 今次唔使出片。" },
						{ title: "產品相 + 標題", body: "填產品名、上傳真實產品相，再加一句 hook。" },
						{ title: "生成圖片", body: "撳生成圖片。睇成品，再下載或去畫布改。" },
					],
				},
				storyboard: {
					title: "四步奢侈品分鏡",
					subtitle: "真實 Studio 操作 — AI 研究、分鏡靜幀，再到奢侈品成片。",
					hint: "真實錄影 · 節奏放慢 · 柔和配樂 · 撳步驟可跳轉",
					steps: [
						{ title: "揀產品", body: "唔再停喺首頁。揀實體產品，再揀「先出圖再出片」。" },
						{ title: "AI 研究", body: "搜熱門帖做版式靈感 — 呢個係 Alchemy 賣點之一。" },
						{ title: "奢侈品分鏡", body: "揀 Luxury birth，出大綱，再生成場景靜幀。" },
						{ title: "生成影片", body: "確認靜幀。成片先定格一鏡，再獨立全畫面播放。" },
					],
				},
				video: {
					title: "四步三分屏 drip",
					subtitle: "只出片路徑 — 用產品相做出三格 meme drip（漢堡例子）。",
					hint: "Studio 操作 + 生成嘅三分屏成片 · 撳步驟可跳轉",
					steps: [
						{ title: "只出片", body: "揀實體產品，再揀「只生成影片」。" },
						{ title: "Social drip", body: "揀三分屏 Social drip — 產品、社交欄、角色反應。" },
						{ title: "產品相", body: "上傳清晰包裝照（呢個漢堡）同短 hook。" },
						{ title: "Drip 成片", body: "生成 — 成片先定格一鏡，再獨立播放三分屏。" },
					],
				},
			},
		},
		howDemo: {
			uploadTitle: "參考 · 上傳或貼連結",
			pasteHint: "貼連結",
			urlTyped: "instagram.com/p/style-ref…",
			dropZone: "拖入產品相",
			analyzeTitle: "風格分析 · 進行中",
			checkLayout: "排版同構圖",
			checkColor: "色調同光線",
			checkTone: "語氣口吻",
			checkCopy: "文案風格",
			analyzeReady: "風格簡報已就緒",
			storyTitle: "分鏡 · 可編輯",
			scene1: "場景 1",
			scene2: "場景 2",
			scene3: "場景 3",
			promptTyped: "柔光 · 產品主視覺 · 乾淨背景…",
			generateTitle: "創作工作室 · 你嘅成品",
			reelLabel: "短片",
			imageLabel: "圖片",
			readyEdit: "可喺畫布繼續編輯",
		},
		refTitle: "參考風格，出你品牌。",
		refBody:
			"貼你鍾意嘅帖或 Reel。Alchemy 會抽出排版、色板、光線同語氣，再套去你嘅產品或概念 — 學風格唔抄內容，成品仍然係你自己嘅品牌。",
		refCardLabel: "參考風格",
		refFeatureItems: [
			{
				title: "抽出風格 DNA",
				body: "讀排版、色調、光線同語氣 — 唔抄參考嘅文案或產品。",
			},
			{
				title: "保留你真正嘅產品",
				body: "樽身、標籤同品牌細節保持真實，只改場景同氛圍。",
			},
			{
				title: "套用，唔係抄襲",
				body: "對齊你鍾意嘅 vibe，同時保留你嘅賣點同訊息。",
			},
			{
				title: "多平台輸出",
				body: "做出適合 IG、TikTok、Facebook 等嘅圖或片。",
			},
		],
		resultCardLabel: "你嘅品牌內容",
		refCardAlt: "參考飲品風格圖",
		resultCardAlt: "品牌飲品廣告結果",
		canvasTitle: "完全可編輯畫布",
		canvasBody:
			"生成結果唔會鎖死。可以清元素、加文字同 Logo，再導出你要嘅尺寸。",
		canvasFeatures: ["清元素", "加文字", "加 Logo", "導出尺寸"],
		canvasOverlayText: "亮白你的肌膚",
		canvasImageAlt: "可編輯護膚廣告",
		canvasCta: "打開圖片編輯",
		storyboardBadge: "故事版模式",
		storyboardTitle: "故事版模式，從分鏡到成片",
		storyboardBody:
			"三格靜幀合成一條故事片 — 先計劃每個鏡頭，再生成語氣同畫面一致嘅影片。",
		storyboardFeatureItems: [
			{
				title: "先計劃每個場景",
				body: "確認鏡頭同時間，先至花 token 出片。",
			},
			{
				title: "故事同語氣一致",
				body: "整條 Reel 嘅敘事、色調同動態保持統一。",
			},
			{
				title: "時間軸同鏡頭控制",
				body: "出片前可調時長、次序同構圖。",
			},
			{
				title: "幾分鐘導出",
				body: "輸出適合廣告同社交嘅高質短片。",
			},
		],
		storyboardCta: "開始故事版模式",
		storyboardImageAlt: "故事版模式：三格分鏡合成一條影片",
		tplTitleBefore: "覆蓋每個",
		tplTitleHighlight: "平台，營銷場景",
		tplTitleAfter: "",
		tplSubtitle: "",
		tplPlatformsLabel: "支援平台",
		tplFormatsLabel: "支援格式",
		tplTabAll: "全部",
		tplTabProduct: "產品廣告",
		tplTabVideo: "Reels / 影片",
		tplTabService: "服務業",
		whyTitle: "Why is Alchemy AI Lab different",
		whyItems: [
			{
				title: "免寫 Prompt",
				body: "MicroWizard 全程省心引導，簡單幾步即可產出精緻內容。",
			},
			{
				title: "智能市場研究",
				body: "睇清而家咩最興。參考最新風格，唔使亂估。",
			},
			{
				title: "先分鏡再出片",
				body: "全片渲染前鎖定每個場景，唔會白費 token。",
			},
			{
				title: "輸出可再編輯",
				body: "生成後即改細節。即時修正，唔使成套重跑。",
			},
			{
				title: "產品同概念都得",
				body: "實體產品、服務、概念以至抽象意念都一樣好用。",
			},
			{
				title: "訂閱 + Token",
				body: "註冊即享 Free 方案，需要時再升級或充值點數。",
			},
		],
		scenariosTitle: "覆蓋常見營銷場景",
		scenariosSubtitle: "揀貼近你下一個 campaign 嘅行業方向。",
		scenarios: [
			{ title: "電商零售", body: "一張產品相做出海報、套圖同短片。" },
			{
				title: "美容護膚",
				body: "適合 IG／TikTok 嘅乾淨生活感畫面同 Reel。",
			},
			{ title: "餐飲食品", body: "跟熱門帖學風格，做出食欲感排版。" },
			{
				title: "教育教練",
				body: "概念同教學輪播路徑，唔一定要有實體貨。",
			},
			{ title: "地產", body: "重點賣點圖同由靜幀做成短片。" },
			{
				title: "金融／SaaS",
				body: "清晰 offer 海報同品牌片，唔亂發明價格。",
			},
		],
		pricingSubtitle:
			"真實計劃：Free／Standard／Pro／Master／Custom，全部用 Tokens。",
		pricingFreeCta: "免費開始",
		pricingProCta: "開始 Pro",
		pricingCustom: "Enterprise",
		pricingCustomHint: "5 席 · 每月 40,000 token",
		tokensTitle: "AI Tokens 點計",
		tokensBody:
			"每個方案顯示獨立上限：token 全用嚟出 1K 單圖最多幾張，或者全用嚟出 8 秒 480p 片最多幾條。混搭或用更高解像度會令每件作品用多啲 token。",
		tokensUnit: "點數",
		tokensPlanGrant: "{n} 點數",
		tokensCapacityImages: "最多單圖",
		tokensCapacityOr: "或",
		tokensCapacityAnd: "加",
		tokensCapacityVideos: "最多 8 秒 480p 片",
		tokensCapacityVideosFree: "最多 8 秒 480p 片",
		tokensCapacityStoryboards: "條分鏡短片（約 {sec} 秒）",
		tokenCostPlan: "AI 規劃／brief",
		tokenCostImage: "單張圖片",
		tokenCostStoryboard: "分鏡套組（約 4 場）",
		tokenCostMusic: "音樂床",
		tokensVideoNote:
			"以 1K 單圖同 8 秒 480p 片（最低設定）計算。更高解像度、更長片、更多場、Logo 會多用 token。",
		tokensSeePricing: "睇完整收費 →",
		finalTitle: "準備做好似代理嘅內容？",
		finalBody: "免費開始，上傳一張產品相，幾分鐘出第一隻廣告。",
		finalImageAlt: "Alchemy 工作室創作同產品素材預覽",
		proCanvasLink: "Pro 智能畫布",
		captionsLink: "為任何影片加字幕、BGM 同口播",
		imageCanvasLink: "為任何圖片加字同 Logo",
		ugcLink: "試 UGC 數字人口播",
		brandKitLink: "設定品牌套件",
		brandKitBadge: "創作前準備",
		brandKitTitle: "上傳一次 Logo，之後每條 Reel 都用得着",
		brandKitBody:
			"建議上傳透明底 PNG。影片：勾選「影片靜幀使用品牌 Logo」後，分鏡／電影感關鍵幀會自動加 Logo。宣傳圖請去「編輯圖片」自行加。",
		brandKitLogoTip: "提示：接近正方形、Logo 佔畫面大部分、約 512–1024px。",
		brandKitCta: "繼續去工作室",
		toolsTitle: "更多創作工具",
		toolsSubtitle: "品牌套件、圖片編輯、字幕同 Pro 畫布 — 隨時跳入。",
		toolsOpenCta: "打開",
		toolBrandTitle: "品牌套件",
		toolBrandDesc:
			"一次存 Logo 同色系 — 影片靜幀可自動加；宣傳圖請去「編輯圖片」加。",
		toolEditTitle: "圖片編輯",
		toolEditDesc: "為任何圖片加字、Logo，微調成品。",
		toolCaptionsTitle: "字幕同音頻",
		toolCaptionsDesc: "為任何 MP4 加字幕、BGM 同口播。",
		toolProTitle: "Pro 智能畫布",
		toolProDesc: "節點式進階工作流 — 需 Master 方案。",
		proMasterBadge: "Master 方案",
		visualCaptionsLink: "視覺字幕實驗室（Beta）",
		recipes: {
			badge: "一鍵配方",
			title: "可完成嘅影片配方",
			subtitle:
				"產品同概念同一套兩條路。動態海報免費額度夠用。12 秒 單鏡出片 TVC 需要付費方案。",
			cta: "用呢個配方",
			physicalGroup: "產品",
			conceptGroup: "概念／服務",
			tvcPaidHint:
				"4 格靜圖 + 12 秒片要付費方案（約 752 token）。免費額度大概夠 1 張圖 + 1 條 8 秒 480p 片。",
			needPrefix: "需要",
			tvcNeedPhysical: "產品圖 + 產品名稱",
			tvcNeedConcept: "標題或概念 idea",
			items: {
				"motion-poster": {
					title: "動態海報",
					description:
						"兩張靜圖（無字 → 有字）再交 單鏡出片 中間過渡，產品同字一齊郁。唔係多分鏡故事板。",
					costHint: "約 2 圖 + 1 段短片 · 免費額度夠",
				},
				"product-tvc-12s": {
					title: "產品 TVC 約 12 秒",
					description: "4 拍分鏡：開場 → 微距 → 環繞 → 生活／收束。",
					costHint:
						"約 4 張靜幀 + 12 秒高級影片 — 要付費 · 拼接後備 拼接或夠免費額",
				},
				"concept-motion-poster": {
					title: "概念動態海報",
					description:
						"兩張場景靜圖（無字 → 有字）+ 影片過渡，按服務／想法揀動態。唔使 SKU 包裝特寫。",
					costHint: "約 2 張 AI 靜圖 + 1 段短片 · 免費額度夠",
				},
				"concept-tvc-12s": {
					title: "概念 TVC 約 12 秒",
					description:
						"服務／想法 4 拍分鏡：開場 → 隱喻 → 環繞 → 收束。",
					costHint:
						"約 4 張靜幀 + 12 秒高級影片 — 要付費 · 拼接後備 拼接或夠免費額",
				},
				"product-blockbuster-9s": {
					title: "大片級出場 約 9 秒",
					description:
						"3 張圖單鏡：貨車紙箱撞天橋，產品升起。唔係分鏡拼接。",
					costHint: "約 9 秒單鏡 · 產品 + 包裝 + 可選場景首幀",
				},
				"concept-blockbuster-9s": {
					title: "大片級 Logo／吉祥物 約 9 秒",
					description:
						"同一套單鏡物流廣告，用 Logo 或吉祥物彈出，代替產品特寫。",
					costHint: "約 9 秒單鏡 · Logo／吉祥物 + 品牌卡片 + 可選場景首幀",
				},
				
				"product-vacuum-inflate-4s": {
					title: "真空充氣 ~4s",
					description:
						"產品必須看得見：真空膜貼緊 → 充氣成透明泡 → 4 秒過渡。唔會把手機換成包裝袋。",
					costHint: "~2 圖 + 4s video · 產品圖",
				},
				"product-creative-motion-4s": {
					title: "產品創意動效 ~4s",
					description:
						"揀方案卡（爆汁、撕標、碎紙還原…）→ 自動首尾幀 → 4 秒视频。",
					costHint: "~2 圖 + 4s video · 產品圖",
				},
				"product-hand-throw-scene-6s": {
					title: "手拋萬物變實景 ~6s",
					description:
						"掌心微縮開頭 → 真實場景結尾 → 約 6 秒拋出過渡。",
					costHint: "~2 圖 + 6s video · 產品／地標圖",
				},
				"product-product-explode-4s": {
					title: "產品拆解 ~4s",
					description:
						"完整棚拍 → 懸浮零件靜圖 → 約 4 秒柔和拆解（風格化，非 CAD）。",
					costHint: "~2 圖 + 4s video · 產品圖",
				},
				"product-ecom-orbit-6s": {
					title: "電商環繞 ~6s",
					description:
						"一張產品圖 → 環繞/仰拍/旋轉。身份鎖定的轉台廣告。",
					costHint: "~6s 單鏡 · 產品圖",
				},
				"product-object-lock-6s": {
					title: "物體鎖定運鏡 ~6s",
					description:
						"鏡頭黏在商品上，世界在動，產品不動。SnorriCam 感。",
					costHint: "~6s 單鏡 · 產品圖",
				},
				"product-macro-snap-6s": {
					title: "微距物理 / 美食碎裂 ~6s",
					description:
						"滴落、碎屑、斷裂 — 在你的靜物上做連續物理。",
					costHint: "~6s 單鏡 · 美食/材質圖",
				},
				"product-luxury-tabletop-8s": {
					title: "奢侈品桌面+手 ~8s",
					description:
						"大理石桌面，手指輕觸或打開產品，一鏡到底。",
					costHint: "~8s 單鏡 · 產品圖",
				},
				"product-beauty-mv-10s": {
					title: "美妝/角色一鏡 MV ~10s",
					description:
						"臉或吉祥物身份鎖定，柔光環繞 — MV/UGC 級一鏡。",
					costHint: "~10s 單鏡 · 人像/角色圖",
				},
				"product-imitate-ad-8s": {
					title: "仿拍這支廣告 ~8s",
					description:
						"你的產品圖 + 參考 MP4 → 學運鏡，保留你的 SKU。",
					costHint: "~8s · 產品圖 + 參考影片",
				},
				"product-neon-on-real-8s": {
					title: "霓虹疊實景 ~8s",
					description:
						"你的真實影片 + 發光霓虹線稿（動物、符號）在場景裡遊走。",
					costHint: "~8s · 真實 MP4（可選產品靜圖）",
				},
				"product-food-bullet-time-6s": {
					title: "美食子彈時間 ~6s",
					description:
						"打卡美食圖 → 食物爆裂定格靜圖 → 鏡頭環繞飛散層次。",
					costHint: "~6s · 人+食物生活照（或生成靜圖）",
				},
				"product-c4d-motion-8s": {
					title: "C4D 動態視覺 ~8s",
					description:
						"黑場品牌開場 → 抽象材質 → 你嘅產品揭幕（Nike 級 C4D 感）。",
					costHint: "~8s · 產品圖（或生成靜圖）",
				},
				"product-h3-showreel-8s": {
					title: "秀場一鏡 ~8s",
					description:
						"產品靜圖 + 方案卡（汽車 · 鍵盤 · 抽象）。允許動能大字，可選 16:9。參考秀場片選填。",
					costHint: "~8s · 產品圖（參考秀場片選填）",
				},
				"product-h3-sphere-mg-8s": {
					title: "球體運動圖形 ~8s",
					description:
						"先球體 MG 世界，再把產品揭出嚟當英雄。允許動能大字。",
					costHint: "~8s · 產品圖（或生成靜圖）",
				},
				"product-h3-movie-title-8s": {
					title: "電影標題 ~8s",
					description:
						"電影標題卡 + 多格擦除，圍繞你嘅產品。允許設計感大字 — 唔使參考片。",
					costHint: "~8s · 產品圖（或生成靜圖）",
				},
				"product-h3-lifestyle-8s": {
					title: "生活人物 ~8s",
					description:
						"真人喺咖啡館／街道／居家場景使用產品 — 唔係美妝 MV。",
					costHint: "~8s · 人+產品生活照（或生成靜圖）",
				},
				"product-gaming-cover": {
					title: "電競封面",
					description:
						"AAA 遊戲封面靜圖 — 低角度動作、字刻進場景、HUD 裝飾。",
					costHint: "只出圖 · 可選產品／主角圖",
				},
				"product-sports-big-words": {
					title: "運動大字海報",
					description:
						"運動編輯海報 — 超大疊字、動作張力、HUD 數據。",
					costHint: "只出圖 · 可選產品／運動員圖",
				},
				"product-jelly-3d": {
					title: "果凍立體字",
					description:
						"極簡果凍／玻璃 3D 主體 — 柔和陰影、少量品牌字。",
					costHint: "只出圖 · 品牌名／數字",
				},
				
				"concept-vacuum-inflate-4s": {
					title: "真空充氣（概念）~4s",
					description:
						"Logo／吉祥物留喺充氣膜裏面看得見 — 癟→透明泡靜圖 → 4 秒视频。",
					costHint: "~2 圖 + 4s video · Logo/吉祥物",
				},
				"concept-creative-motion-4s": {
					title: "創意動效（概念）~4s",
					description:
						"方案卡 + Logo／吉祥物鎖定 → 自動首尾幀 → 4 秒视频。",
					costHint: "~2 圖 + 4s video · Logo/吉祥物",
				},
				"concept-hand-throw-scene-6s": {
					title: "手拋變實景（概念）~6s",
					description:
						"Logo／吉祥物作微縮身份 → 真實場景結尾 → 約 6 秒拋出過渡。",
					costHint: "~2 圖 + 6s video · Logo/吉祥物",
				},
				"concept-product-explode-4s": {
					title: "產品拆解（概念）~4s",
					description:
						"Logo／吉祥物作裝置鎖定 → 懸浮零件靜圖 → 約 4 秒柔和拆解。",
					costHint: "~2 圖 + 4s video · Logo/吉祥物",
				},
				"concept-beauty-mv-10s": {
					title: "美妝/角色一鏡（概念）~10s",
					description:
						"Logo 或吉祥物身份鎖定的 MV 一鏡 — 不需商品包材圖。",
					costHint: "~10s 單鏡 · Logo/吉祥物",
				},
				"concept-imitate-ad-8s": {
					title: "仿拍這支廣告（概念）~8s",
					description:
						"品牌標誌 + 參考 MP4 → 跟運鏡，保留你的身份。",
					costHint: "~8s · Logo/吉祥物 + 參考影片",
				},
				"concept-neon-on-real-8s": {
					title: "霓虹疊實景（概念）~8s",
					description:
						"真實影片 + 霓虹動物/符號在場景中移動 — 可選 Logo 鎖定。",
					costHint: "~8s · 真實 MP4（可選 Logo 靜圖）",
				},
				"concept-food-bullet-time-6s": {
					title: "美食子彈時間（概念）~6s",
					description:
						"餐廳／美食 campaign 子彈時間 — 戲劇性爆裂定格＋環繞，唔一定要 SKU 包裝圖。",
					costHint: "~6s · 打卡美食圖（或生成靜圖）",
				},
				"concept-c4d-motion-8s": {
					title: "C4D 動態視覺（概念）~8s",
					description:
						"Logo／吉祥物黑場開場 → 抽象 CGI 材質 → 身份鎖定揭幕。品牌級動態視覺。",
					costHint: "~8s · Logo/吉祥物靜圖",
				},
				"concept-h3-showreel-8s": {
					title: "秀場一鏡（概念）~8s",
					description:
						"Logo／吉祥物 + 方案卡。概念優先「抽象變形」。可選 16:9。參考秀場片選填。",
					costHint: "~8s · Logo/吉祥物靜圖（參考秀場片選填）",
				},
				"concept-h3-sphere-mg-8s": {
					title: "球體運動圖形（概念）~8s",
					description:
						"Logo／吉祥物作球體身份 — 啞光行星／霓虹／水晶包裹。唔使參考片。",
					costHint: "~8s · Logo/吉祥物靜圖",
				},
				"concept-h3-movie-title-8s": {
					title: "電影標題（概念）~8s",
					description:
						"Logo／吉祥物進入電影標題卡 + 多格。允許設計感大字。",
					costHint: "~8s · Logo/吉祥物靜圖",
				},
				"concept-h3-lifestyle-8s": {
					title: "生活人物（概念）~8s",
					description:
						"人物＋品牌標識嘅生活場景。最好有生活照（純 Logo 偏弱）。",
					costHint: "~8s · 人+Logo/吉祥物生活照",
				},
				"concept-gaming-cover": {
					title: "電競封面（概念）",
					description:
						"品牌／吉祥物 AAA 遊戲封面 — 電影感動作、場景內嵌字。",
					costHint: "只出圖 · 可選 Logo／吉祥物",
				},
				"concept-sports-big-words": {
					title: "運動大字海報（概念）",
					description:
						"活動／品牌運動海報 — 超大字、HUD 感，唔一定要 SKU。",
					costHint: "只出圖 · 標題帶動大字",
				},
				"concept-jelly-3d": {
					title: "果凍立體字（概念）",
					description:
						"周年／品牌果凍標 — 半透明立體、極簡字排。",
					costHint: "只出圖 · 品牌名／數字",
				},

			},
		},
		templatesBadge: "模板",
		templatesTitle: "由營銷模板開始",
		templatesSubtitle: "場景卡 — 揀一個，跟住精靈（上傳 → 圖片 → 影片）。",
		useTemplate: "用精靈開始",
		templateOutputImage: "圖文帖",
		templateOutputVideo: "影片 Reel",
		howInlineIntro: "由參考到成品，四步完成。",
		howReadMore: "完整指南 →",
		demoItems: [
			"產品相輸入",
			"風格 + Prompt 引導",
			"故事分鏡場景",
			"影片輸出",
		],
		steps: [
			{
				no: "01",
				title: "理解產品",
				body: "用產品資料加可選品牌資訊，先定創作方向。",
			},
			{
				no: "02",
				title: "生成素材",
				body: "生成生活感廣告圖或故事分鏡場景圖。",
			},
			{
				no: "03",
				title: "輸出最終影片",
				body: "用引導 prompt + 影片生成最終 Reels。",
			},
		],
		quickStart: { quickAd: "快速廣告開始", storyboard: "故事分鏡開始" },
		highlightsTitle: "點解呢個流程有效",
		highlights: [
			{
				title: "新手友善預設",
				body: "預設設定夠簡單，會避開常見出圖/出片錯誤。",
			},
			{
				title: "先圖後片更易改",
				body: "先生成相，再做影片，修改成本更低。",
			},
			{
				title: "為中小企宣傳而設",
				body: "模板同 prompt 針對 IG/FB reels。",
			},
		],
		sampleTitle: "典型輸出路徑",
		sampleTimeline: [
			"上傳產品相 + 填寫主標題",
			"生成單圖或分鏡場景組",
			"檢查 prompt 後按生成影片",
			"下載乾淨 MP4 去 CapCut/Premiere",
		],
		faqTitle: "常見問題",
		faqShowMore: "顯示更多問題",
		faqShowLess: "收起問題",
		faq: [
			{
				q: "Alchemy AI Lab 係咩？",
				a: "Alchemy AI Lab 係 AI 營銷創意工作室，幫品牌整產品廣告、社交內容、分鏡同短片，唔使寫複雜 prompt。",
			},
			{
				q: "一定要自己寫 prompt 嗎？",
				a: "唔使。上傳產品相、貼參考連結或揀模板就得。系統會自動分析風格、版式、色系同推廣方向。",
			},
			{
				q: "AI 創作流程點行？",
				a: "1）上傳或貼參考 2）AI 分析風格 3）檢查或改內容同分鏡 4）生成再微調成品。",
			},
			{
				q: "可以用參考圖片嗎？",
				a: "可以。系統會分析參考圖嘅風格、結構、色系同創意方向，用嚟指導新創作 — 目的唔係克隆原帖或品牌素材。",
			},
			{
				q: "可以整啲咩內容？",
				a: "產品廣告、促銷橫額、上新帖、Instagram／Facebook 素材、小紅書帖文、Reels 短片、服務推廣、評價口碑、教學輪播等。",
			},
			{
				q: "可以整短片嗎？",
				a: "可以。可以直接出片，或者先確認分鏡再出片。",
			},
			{
				q: "一條片大概幾耐？",
				a: "快速出圖約 10–30 秒；分鏡場景組約 2–5 分鐘；影片通常約 1–3 分鐘（視乎隊列同片長）。",
			},
			{
				q: "重新生成會唔會多用 token？",
				a: "會。每次 AI 重新生成（圖片、鏡頭或影片）都係新一次生成，會再用 token。",
			},
			{
				q: "新註冊送幾多免費 token？",
				a: "新帳戶一次過送 500 token（唔會每月自動再送），夠 1 張宣傳圖 + 1 條 8 秒 480p 片。詳情見定價頁。",
			},
			{
				q: "一定要上傳參考影片？",
				a: "唔一定。參考 MP4 係選填，只係想跟某條廣告節奏／風格先至上傳。",
			},
			{
				q: "係咪全部都要先分鏡？",
				a: "唔係。只要影片可直接出片；先圖後片先走分鏡靜幀。",
			},
			{
				q: "點樣升級計劃？",
				a: "登入後喺「收費」頁揀更高計劃即可。升級會由今日起開新嘅更高計劃帳單期：Stripe 會退回舊計劃未用時間嘅差額，再由今日起收新計劃費用（產品標價唔會改）。你保留剩餘 token，並即時獲得新計劃完整份額。下次續費日由升級日起重新計算（月付一個月，年付一年）。例如：8 月 1 日 Standard 月付 → 8 月 15 日升 Master 月付 → 下次係 9 月 15 日再發完整 Master token。",
			},
			{
				q: "點樣降級計劃？",
				a: "喺「收費」頁揀較低計劃。降級會排程到下一個帳單日生效 — 之前仍然用目前計劃、功能同剩餘 token。較低價錢同每月 token 由下個週期開始。",
			},
			{
				q: "點樣取消訂閱？",
				a: "喺收費頁用「管理帳單」（Stripe）取消續訂或改卡。取消後，目前週期完結前仍然可用付費功能。升級／降級請喺收費頁操作，唔係喺 Portal 改計劃。",
			},
		],
		builtFor: ["市場推廣", "品牌與代理", "中小企", "電商", "創作者"],
		builtForLabel: "適合",

		canvasFeatureItems: [
			{ title: "移除元素", body: "輕鬆刪除唔想要嘅物件" },
			{ title: "加文字", body: "完美標題、CTA 同文案" },
			{ title: "加 Logo", body: "保持品牌一致" },
			{ title: "加圖表", body: "講解賣點、價錢或步驟" },
			{ title: "導出尺寸", body: "IG、FB、小紅書、TikTok 等" },
		],

		canvasMockTitle: "未命名設計",

		canvasSidebar: ["模板", "元素", "工具", "字體", "品牌"],

		heroSidebar: ["Upload", "Style", "Layout", "Tone", "BrandKit"],
		navResources: "Token",

		planBlurbCustom: "5 個席位 · 共用 token 池",

		planBlurbFree: "Try the guided Studio workflow",

		planBlurbMaster: "For agencies & teams",

		planBlurbPro: "For brands & freelancers",

		planBlurbStandard: "For early businesses",

		planFeaturesCustom: [
			"每月 40,000 token",
			"5 席 · 共用池",
			"Pro 畫布 + 2K 圖片",
		],

		planFeaturesFree: [
			"Guided image & video paths",
			"500 signup tokens",
			"Library downloads",
		],

		planFeaturesMaster: [
			"16,000 tokens / month",
			"Pro canvas",
			"Priority support",
			"2K images",
		],

		planFeaturesPro: [
			"8,000 tokens / month",
			"1080p video",
			"Priority generation",
			"High-res exports",
		],

		planFeaturesStandard: [
			"3,000 tokens / month",
			"720p video",
			"Token top-ups",
		],
		pricingSaveBadge: "慳高達 50%",
		tokenCostVideoDraft: "短片（約 8 秒）",
		tokenCostVoice: "口播",
		topUpBody: "訂閱後可隨時加購。",
		topUpCustom: "自訂 token 或計劃",
		topUpCustomCta: "聯絡我們",
		topUpCustomMailSubject: "自訂 token 或計劃",
		topUpTitle: "需要更多 Tokens？",

		tplCapFb: "Facebook 廣告",
		tplCapIg: "Instagram 帖文",
		tplCapXhs: "小紅書帖文",
		tplCapProduct: "產品廣告",
		tplCapReel: "Reels / 影片",
		tplCapService: "服務業",
		tplCardCoffee: "冷萃咖啡",
		tplCardHero: "產品主視覺",
		tplCardReel: "Reels 分鏡",
		tplCardService: "服務推廣",
		tplCardSkincare: "護膚廣告",
		tplCardSunscreen: "促銷優惠",
		tplPlatformIg: "Instagram",
		tplPlatformFb: "Facebook",
		tplPlatformXhs: "小紅書",
		tplPlatformTiktok: "TikTok",
		tplPlatformX: "X",
		tplFormatImage: "圖片",
		tplFormatCarousel: "輪播",
		tplFormatReels: "短片",
		tplFormatVideo: "影片",
		tplAdBadge: "廣告",
		tplEmptyFilter: "呢個篩選暫時未有模板。",
		tplBizBeauty: "美容護膚",
		tplBizMakeup: "美妝",
		tplBizFashion: "時尚",
		tplBizJewelry: "珠寶",
		tplBizBranding: "品牌設計",
		tplBizAmber: "琥珀",
		tplBizCafe: "咖啡餐飲",
		tplBizProduct: "產品改造",
		tplBizService: "服務業",
		tplBizWellness: "身心靈",
		tplBizRetail: "零售",
		tplBizRealEstate: "房地產",
		tplAdBeauty: "7 日光澤 — 前後對比轉化高",
		tplAdMakeup: "直接用產品作宣傳",
		tplAdFashion: "三格靜幀 → 一條故事片",
		tplAdJewelry: "七種礦能，一條手串就停得住滑動",
		tplAdBranding: "Style matching ≠ copying — 保留你嘅品牌 DNA",
		tplAdAmber: "陽光下嘅藥珀 — 每粒都唔同",
		tplAdCafe: "冷萃賣相同味道一樣吸引",
		tplAdProduct: "一張產品相，無限廣告風格",
		tplAdService: "快速出廣告，唔使識 AI 都得",
		tplAdWellness: "每週運勢建議，粉絲會儲",
		tplAdRetail: "AI 購物建議，感覺好私人",
		tplAdRealEstate: "樓盤導覽片 — 將概念直接導出",
		tplTabFacebook: "Facebook Ads",
		tplTabInstagram: "Instagram",
		tplTabXhs: "小紅書",
	},

	pricing: {
		badge: "簡單 token 定價",
		title: "按創作量與喜好選擇適合你的計劃",
		titleBefore: "按創作量與喜好",
		titleHighlight: "選擇適合你的計劃",
		subtitle:
			"每個計劃都包含 AI 圖片同影片 token。用多少付多少 — 訂閱後可隨時加購 token。",
		pricingLink: "收費方案",
		monthly: "月付",
		yearly: "年付",
		yearlyBadge: "慳高達 50%",
		monthlyBadge: "慳高達 38%",
		perMonth: "/月",
		billedYearly: "按年收費",
		tokensPerMonth: "token / 月",
		tokensOnce: "token · 新註冊送一次",
		tokensIncluded: "token",
		capacityImagesFeature: "最多 {n} 張單圖",
		capacityVideosFeature: "最多 {n} 條 8 秒 480p 片",
		capacityFreeImages: "最多 {n} 張單圖",
		capacityFreeVideos: "最多 {n} 條 8 秒 480p 片",
		capacityStoryboardsFeature: "約 {n} 條分鏡短片（約 {sec} 秒）",
		mostPopular: "最受歡迎",
		getStarted: "開始使用",
		subscribe: "訂閱",
		contactSales: "聯絡我們",
		freeForever: "免費",
		compareTitle: "計劃比較",
		compareFeature: "功能",
		topUpTitle: "需要更多 token？",
		topUpSubtitle: "訂閱用戶可隨時加購 — 唔使升級計劃。",
		topUpPrice: "$10",
		topUpTokens: "1,000 token",
		topUpNote: "任何付費計劃訂閱後可用",
		buyTopUp: "購買 token",
		manageBilling: "管理帳單",
		checkoutRedirecting: "正前往 Stripe…",
		checkoutSuccess: "付款成功。Token 幾秒內會入帳 — 如未更新請重新整理。",
		checkoutCanceled: "已取消結帳，未有收費。",
		proCanvasUpgradeHint: "Pro 畫布包含喺 Master 方案。請揀下面 Master 方案先可以解鎖節點畫布。",
		checkoutError: "無法開始結帳。請再試，或聯絡支援。",
		paymentIncomplete:
			"付款未成功。請喺「管理帳單」更新信用卡後再試升級。你原本嘅計劃未有更改。",
		subscriptionUpdated: "已更新方案。重複訂閱已取消，之後唔會收兩次費。",
		subscriptionUpgraded:
			"已即時升級。新計劃月份由今日起計 — 已加入完整每月 token，剩餘保留，下次續費改為一個月後。",
		subscriptionDowngradeScheduled:
			"已安排於 {date} 降級至 {plan}。在此之前仍保持目前計劃同剩餘 token；較低價錢由下一個帳單週期開始。",
		alreadySubscribed:
			"你已有有效訂閱。改計劃請喺呢個收費頁；取消／改卡請用「管理帳單」。",
		tokenTitle: "Token 點樣計",
		tokenSubtitle: "Token 係工作室貨幣。每次生成前會顯示所需 token。",
		tokenItems: [
			{
				title: "生成前透明顯示",
				body: "喺圖片同影片步驟會先顯示 token 費用，先確認再生成。",
			},
			{
				title: "對應真實 AI 用量",
				body: "費用反映 系統 圖片/影片同規劃 API — 唔係虛擬點數。",
			},
			{
				title: "加購唔使升級",
				body: "需要推廣旺季？$10 買 1,000 額外 token 即可。",
			},
		],
		faqTitle: "收費常見問題",
		faqShowMore: "顯示更多問題",
		faqShowLess: "收起問題",
		faq: [
			{
				q: "Token 點樣計？",
				body: "Token 用嚟量度工作室入面要計費嘅 AI 用量。工作越複雜（更長影片、更高解像度、分鏡組）用得越多。每次付費步驟生成前都會顯示預計消耗。",
			},
			{
				q: "新註冊送幾多免費 token？",
				body: "新帳戶一次過送 500 token，唔會每月自動再送。夠 1 張宣傳圖 + 1 條 8 秒 480p 片。要用多啲就升級或加購。",
			},
			{
				q: "Token 用喺邊啲位？",
				body: "用喺圖片生成、分鏡場景、影片生成、規劃／簡報步驟，以及部分分析任務（例如研究短片分析）。費用會喺運行前顯示。",
			},
			{
				q: "Token 用晒會點？",
				body: "會阻止生成，直到你加購或升級。每次運行前都會有清楚提示。",
			},
			{
				q: "每個計劃大概可以整幾多圖或片？",
				body: "視乎格式同參數。收費卡以 1K 單圖同 8 秒 480p 片計算獨立上限（最多幾張或最多幾條），即 token 全用喺一種格式。混搭、更高解像度、更長片會令單次用多啲 token。",
			},
			{
				q: "生成失敗會扣 token 嗎？",
				body: "如果 AI 任務扣費後失敗，我哋會把今次運行扣走嘅 token 退回餘額。失敗生成唔應該被收費。",
			},
			{
				q: "生成內容可以商用嗎？",
				body: "可以，喺符合服務條款嘅前提下用嚟做合法推廣。發佈前請自己審閱內容。大量使用建議揀付費計劃，以攞更高限額同解像度。",
			},
			{
				q: "支援邊啲平台？",
				body: "導出尺寸覆蓋常見 Instagram、Facebook、TikTok、小紅書、YouTube Shorts 同一般網站／社交廣告比例。各平台發佈要喺你自己嘅帳號完成。",
			},
			{
				q: "適合代理或團隊嗎？",
				body: "支援。喺收費頁訂閱 Enterprise 即有 5 個席位：擁有人喺帳戶邀請隊友，各自保留獨立作品庫，生成會用擁有人嘅共用 40,000 token 池。Pro 同 Master 仍然係單人自助計劃。",
			},
			{
				q: "幾時可以買額外 token？",
				body: "訂閱任何付費計劃之後。免費用戶需先升級。",
			},
			{
				q: "點樣升級計劃？",
				body: "登入後喺呢個收費頁揀更高計劃（Standard → Pro → Master → Enterprise）確認即可。升級會由今日起開新帳單期：Stripe 退回舊計劃未用時間嘅差額，再由今日起收新計劃費用 — 我哋唔會改 Stripe 產品標價。你保留剩餘 token，並即時獲得新計劃完整份額（例如 Standard 3,000 → Master 會再加 16,000）。下次續費由升級日起重新計算（月付／年付取決於你揀嘅計劃）。升級唔使經「管理帳單」。",
			},
			{
				q: "點樣降級計劃？",
				body: "喺收費頁揀較低計劃。降級會排程到下一個帳單日生效 — 之前你仍然用緊目前計劃、功能同剩餘點數。較低價錢同計劃點數由下個週期開始。咁樣可以避免中途用低價享用高計劃權益。「管理帳單」用嚟取消續訂／改卡，唔係揀較低計劃。",
			},
			{
				q: "喺邊度改計劃或取消訂閱？",
				body: "升級或排程降級：登入後喺收費頁操作。取消續訂或更新付款方式：用「管理帳單」（Stripe）。取消後，目前週期完結前仍然可用付費功能。",
			},
		],
		footnote:
			"價格以美元計。影片解像度同片長會影響 token。經 Stripe 付款。喺定價頁升級會由今日起開新計劃月；降級由下個週期生效。取消請用「管理帳單」。",
		plans: {
			free: {
				name: "免費",
				description: "試用完整引導流程",
				features: [
					"500 token（1 張圖 + 1 條 8 秒 480p 片）",
					"引導精靈 + 模板",
					"影片最高 480p",
					"圖片最高 1K",
					"平台研究",
					"圖片→影片合併流程",
					"故事板模式",
					"A/B、Campaign 模式、教學輪播",
				],
			},
			standard: {
				name: "Standard",
				listPrice: "$29.99",
				monthlyPrice: "$19.99",
				yearlyPrice: "$14.99",
				monthlySave: "慳 33%",
				yearlySave: "慳 50%",
				tokens: "3,000",
				description: "每週出帖嘅中小企",
				features: [
					"3,000 token / 月",
					"引導精靈 + 模板",
					"影片最高 720p",
					"圖片最高 1K",
					"平台研究",
					"圖片→影片合併流程",
					"故事板模式",
					"A/B、Campaign 模式、教學輪播",
					"電郵支援",
				],
			},
			pro: {
				name: "Pro",
				listPrice: "$79.99",
				monthlyPrice: "$49.99",
				yearlyPrice: "$39.99",
				monthlySave: "慳 38%",
				yearlySave: "慳 50%",
				tokens: "8,000",
				description: "代辦同重度用戶",
				features: [
					"8,000 token / 月",
					"引導精靈 + 模板",
					"影片最高 1080p",
					"圖片最高 1K",
					"平台研究",
					"圖片→影片合併流程",
					"故事板模式",
					"A/B、Campaign 模式、教學輪播",
					"優先生成",
				],
			},
			master: {
				name: "Master",
				listPrice: "$159.99",
				monthlyPrice: "$99.99",
				yearlyPrice: "$79.00",
				monthlySave: "慳 38%",
				yearlySave: "慳 50%",
				tokens: "16,000",
				description: "高產量團隊",
				features: [
					"16,000 token / 月",
					"引導精靈 + 模板",
					"影片最高 1080p",
					"圖片最高 2K",
					"平台研究",
					"圖片→影片合併流程",
					"故事板模式",
					"A/B、Campaign 模式、教學輪播",
					"Pro 畫布",
					"優先支援",
				],
			},
			custom: {
				name: "Enterprise",
				listPrice: "$399.99",
				monthlyPrice: "$249.99",
				yearlyPrice: "$199.99",
				monthlySave: "38% off",
				yearlySave: "50% off",
				tokens: "40,000",
				description: "團隊 5 席，共用一個 token 池",
				badge: "5 席",
				seatsLabel: "5 席 · 共用 token 池",
				features: [
					"每月 40,000 token",
					"5 個席位（擁有人 + 4 位隊友）",
					"生成扣擁有人嘅共用 token 池",
					"各自獨立作品庫",
					"擁有人可隨時邀請、移除、更換席位",
					"1080p 影片、2K 圖片、Pro 畫布",
					"優先支援",
					"可加購 token（$10 / 1k）",
				],
			},
		},
		comparisonRows: [
			{
				feature: "Token",
				free: "500 · 新註冊送一次",
				standard: "3,000 / 月",
				pro: "8,000 / 月",
				master: "16,000 / 月",
				custom: "40,000 / 月",
			},
			{
				feature: "團隊席位",
				free: "1",
				standard: "1",
				pro: "1",
				master: "1",
				custom: "5 · 共用池",
			},
			{
				feature: "大約產能",
				free: "最多 7 張圖或 1 條 8 秒 480p",
				standard: "最多 46 張圖或 9 條 8 秒 480p",
				pro: "最多 123 張圖或 24 條 8 秒 480p",
				master: "最多 246 張圖或 48 條 8 秒 480p",
				custom: "最多 615 張圖或 121 條 8 秒 480p",
			},
			{
				feature: "圖片最高解像度",
				free: "最高 1K",
				standard: "最高 1K",
				pro: "最高 1K",
				master: "最高 2K",
				custom: "最高 2K",
			},
			{
				feature: "影片最高解像度",
				free: "最高 480p",
				standard: "最高 720p",
				pro: "最高 1080p",
				master: "最高 1080p",
				custom: "最高 1080p",
			},
			{
				feature: "平台研究 / 合併流程 / 故事板",
				free: "✓",
				standard: "✓",
				pro: "✓",
				master: "✓",
				custom: "✓",
			},
			{
				feature: "A/B、Campaign、教學輪播",
				free: "✓",
				standard: "✓",
				pro: "✓",
				master: "✓",
				custom: "✓",
			},
			{
				feature: "電郵支援",
				free: "—",
				standard: "✓",
				pro: "✓",
				master: "✓",
				custom: "✓",
			},
			{
				feature: "優先生成",
				free: "—",
				standard: "—",
				pro: "✓",
				master: "✓",
				custom: "✓",
			},
			{
				feature: "Pro 畫布",
				free: "—",
				standard: "—",
				pro: "—",
				master: "✓",
				custom: "✓",
			},
			{
				feature: "優先支援",
				free: "—",
				standard: "—",
				pro: "—",
				master: "✓",
				custom: "✓",
			},
			{
				feature: "加購 token（$10 / 1k）",
				free: "—",
				standard: "✓",
				pro: "✓",
				master: "✓",
				custom: "✓",
			},
		],
	},
	steps: {
		setup: "設定",
		image: "相片",
		video: "影片",
		done: "完成",
	},
	wizard: {
		workflowLabel: "你想輸出咩？",
		workflowModes: {
			"image-only": {
				title: "只要相片",
				description: "AI 宣傳圖 — 下載 PNG",
				cardDescription: "生成高質宣傳圖，適合社交貼文、廣告同橫額。",
				tags: ["社交貼文", "產品照"],
			},
			"video-only": {
				title: "只要影片",
				description: "單場景連續鏡頭 — 可直接發佈短片",
				cardDescription:
					"單場景：由一張產品關鍵圖做連續運鏡短片，適合快速發佈。",
				tags: ["單場景", "短片", "影片廣告"],
				sceneBadge: "只得單場景",
			},
			combined: {
				title: "先要相片，再要影片",
				description: "多場景分鏡 — 先確認畫面，再拼接成片",
				cardDescription:
					"多場景分鏡：先出多張場景圖確認，再拼接成一條短片。",
				tags: ["多場景", "分鏡", "動態廣告"],
				sceneBadge: "多場景分鏡",
			},
		},
		creationPath: {
			stepEyebrow: "第 2 步",
			title: "揀你嘅創作路徑。",
			hint: "揀只要相片、只要影片，定先出圖再做片。",
			bestForLabel: "適合：",
			tipTitle: "應該揀邊條？",
			tipImage: "適合需要 feed 圖、Carousel 或靜態廣告。",
			tipVideo: "只得單場景 — 適合一張關鍵圖做出連續運鏡短片。",
			tipCombined: "多場景分鏡 — 適合先確認多張場景圖，再拼接成一條片。",
			tipNote: "之後隨時可以改",
			tipNoteBody: "而家未決定都得 — 之後可喺進階工作室再轉。",
			backToStep1: "返回",
			continueToSetup: "繼續",
			nextTitle: "之後會點",
			nextSubtitleUnset:
				"上面揀路徑之後，Studio 只會顯示嗰條路需要嘅步驟。",
			nextSubtitleImage: "你嘅路徑：設定 → 生成圖片 → 檢查同匯出。",
			nextSubtitleVideo: "你嘅路徑：影片簡報 → 生成影片 → 檢查同匯出。",
			nextSubtitleCombined:
				"你嘅路徑：分鏡設定 → 檢查分鏡圖 → 製作影片。",
			nextStepsUnset: [
				{
					title: "設定",
					body: "填資料、研究、風格同素材。",
					icon: "setup",
				},
				{
					title: "生成",
					body: "相片、影片，或兩者 — 只跑你條路需要嘅。",
					icon: "generate",
				},
				{ title: "檢查", body: "喺畫布編輯再匯出。", icon: "done" },
			],
			nextStepsImage: [
				{
					title: "設定",
					body: "參考、產品同圖片設定。",
					icon: "setup",
				},
				{
					title: "生成圖片",
					body: "為活動產出靜態圖。",
					icon: "image",
				},
				{
					title: "檢查同匯出",
					body: "喺畫布編輯，再下載。",
					icon: "done",
				},
			],
			nextStepsVideo: [
				{
					title: "影片簡報",
					body: "產品、動態方向同設定。",
					icon: "setup",
				},
				{
					title: "生成影片",
					body: "準備好就生成短片。",
					icon: "video",
				},
				{
					title: "檢查同匯出",
					body: "預覽、字幕同下載。",
					icon: "done",
				},
			],
			nextStepsCombined: [
				{
					title: "分鏡設定",
					body: "簡報、場景同靜態圖設定。",
					icon: "setup",
				},
				{
					title: "分鏡圖",
					body: "檢查場景圖（未係最終影片）。",
					icon: "image",
				},
				{ title: "製作影片", body: "將分鏡拼成短片。", icon: "video" },
				{ title: "檢查", body: "預覽同匯出最終影片。", icon: "done" },
			],
		},
		videoOutputLabel: "你的影片輸出",
		videoOutputPathLockedHint: "已由上方畫面風格決定 — 唔使再揀影片模式。",
		videoOutputTypes: {
			"storyboard-reel": {
				title: "分鏡短片",
				pipeline:
					"第 2 步：場景圖（可預覽）→ 第 3 步：影片生成 拼接成一條片（硬切）",
				pipelineVideoOnly:
					"設定 → 場景圖（如需要）→ 拼接成一條片 — 以影片為主，唔係先做廣告圖再出片",
				pipelineImageStep:
					"在下方生成場景圖 — 每格對應影片 @Image1、@Image2…",
				pipelineReady: "已準備 {count} 格場景圖 → 第 3 步合成",
				confidence: "想先預覽再出片時最穩陣 — 內容研究短片、多節奏廣告",
				confidenceVideoOnly:
					"只要影片嘅分鏡流程 — 先預覽節奏再拼接；若已有一張靜態圖，可改用單圖動態",
			},
			"animate-keyframe": {
				title: "單圖動態",
				pipeline:
					"一張關鍵圖（第 2 步或上傳）→ 影片生成 加流暢動態 — 單場景、無硬切",
				pipelineVideoOnly:
					"設定 → 一張關鍵圖（上傳或生成）→ 影片生成 加動態 — 設定 → 影片 → 完成",
				pipelineImageStep: "下方圖片會成為影片關鍵幀",
				pipelineReady: "關鍵圖已準備 → 第 3 步動畫化",
				confidence: "一張產品相或廣告圖快速出 6–8 秒 — 推／拉／環繞",
				confidenceVideoOnly:
					"適合已有靜態圖、想快出短片 — 唔使行「先出圖再做片」路徑",
			},
			"reference-motion": {
				title: "跟參考片節奏",
				pipeline:
					"參考 MP4 定節奏（@Video1）→ 影片生成 生成節奏相近的新片",
				pipelineImageStep:
					"Setup 已分析參考片 — 可選產品／關鍵圖作 @Image1",
				pipelineReady: "參考片已分析 → 可生成",
				confidence: "跟 viral 節奏 — 預覽少過分鏡；一次生成",
			},
			"text-reel": {
				title: "純文案短片",
				pipeline: "概念文案 → 影片生成 文字出片 — 唔使關鍵圖",
				pipelineImageStep: "跳過圖片步驟 — 用 Setup 文案",
				pipelineReady: "Prompt 已準備 → 生成影片",
				confidence: "概念／品牌文案、唔需要 hero 圖",
			},
			"product-assistant": {
				title: "AI 產品影片",
				pipeline: "上傳產品＋多角度 → AI 規劃情境 → 影片生成 短片",
				pipelineImageStep: "請先在影片步驟上傳產品套圖",
				pipelineReady: "套圖已分析 → 生成情境片",
				confidence: "實體產品、多張相時最啱",
			},
			"cinematic-reel": {
				title: "電影感短片",
				pipeline: "氛圍關鍵幀 → 每段 8 秒 影片生成（多段會拼接）",
				pipelineImageStep: "在下方生成電影感關鍵幀",
				pipelineReady: "關鍵幀已準備 → 第 3 步動態",
				confidence: "概念氛圍場景 — 賣點放字幕／配音",
			},
			"digital-presenter": {
				title: "UGC 數字人口播",
				pipeline:
					"產品關鍵幀 → digital presenter 對嘴講稿（約 $0.10/秒）",
				pipelineImageStep: "在下方生成口播關鍵幀（產品喺手腕／手上）",
				pipelineReady: "關鍵幀已準備 → 第 3 步數字人對嘴",
				confidence: "手鍊／飾品帶貨片 — 唔係 影片生成 單圖動態",
			},
		},
		visualStyleLabel: "畫面風格",
		visualStyleHint: "揀風格會自動套用光線同氛圍 — 適用任何產品類別",
		visualStyleHintVideoOnly:
			"只整影片：隱藏資訊海報、品牌出圖、Campaign 套圖（專為有相無圖嘅流程）",
		visualStyleHintCombined:
			"相片＋影片：先出圖再做片。「故事分鏡片」= AI 規劃多場景 → 多圖 → 一條 影片生成 片。",
		styleModeLabel: "風格集合",
		styleModeSimple: "顯示精簡（推薦）",
		styleModeAll: "顯示全部風格",
		artStyleLabel: "畫面風格（關鍵圖）",
		artStyleVideoSafeHint:
			"只顯示影片安全色調（膠片／數碼閃光快拍／中式電影感／電影感）。Look 只改色調，唔改故事。有參考片時 @Video1 仍然係骨架。",
		artStyleHint:
			"控制 AI 出圖 關鍵圖外觀 — 影片生成 只負責動態。選漫畫／水彩／3D 時，成張圖（包括文字）都會用該風格；含大量文案的 product ad 建議用「概念 cinematic」或寫實。",
		artStyles: {
			realistic: {
				title: "寫實相片",
				description: "真人實拍商業感（預設）",
			},
			cinematic: {
				title: "電影感 TVC",
				description: "受控輪廓光、淺景深、高級商業感",
			},
			film: {
				title: "膠片顆粒",
				description: "菲林顆粒、柔和光暈、懷舊色調",
			},
			ccd: {
				title: "數碼閃光快拍",
				description: "早期輕便相機閃光感、隨手社交快拍",
			},
			guofeng: {
				title: "中式電影感",
				description: "煙霧山景、詩意光線、寫實產品（國風氛圍）",
			},
			"anime-2d": {
				title: "2D 動漫",
				description: "日系賽璐珞平面動畫",
			},
			"cartoon-3d": {
				title: "3D 卡通",
				description: "Pixar 風 3D 渲染",
			},
			"comic-webtoon": {
				title: "漫畫 / 條漫",
				description: "粗線條、平塗色塊",
			},
			watercolor: {
				title: "水彩插畫",
				description: "柔和手繪水彩質感",
			},
		},
		styleAutoAppliedLabel: "已自動套用風格：",
		visualStyles: {
			product: {
				title: "乾淨產品",
				description: "影樓 / 生活感產品照 — 任何貨都適用（預設）",
			},
			"dark-premium": {
				title: "暗色高級",
				description: "深色底、金色光點 — 珠寶、手錶、護膚、禮品都適用",
			},
			"warm-shop": {
				title: "溫馨店鋪",
				description: "本地小店 / 優惠宣傳感",
			},
			"model-wear": {
				title: "模特兒佩戴／使用",
				description:
					"產品相 → 似真模特兒生活感廣告圖（手鏈上手、洗鼻器示範等）",
			},
			"info-poster": {
				title: "精品資訊海報",
				description:
					"白底單主題、賣點拆解 — 避免一眼 AI 海報（IG 技巧）",
			},
			"designed-poster": {
				title: "設計海報",
				description:
					"商業 feed 海報 — 你填嘅標題＋標語上圖（任何品類，唔限食品）",
			},
			"parts-poster": {
				title: "零件拆解",
				description:
					"產品爆炸圖 — 拆開零件並標註說明，一張海報連標題同內容",
			},
			"gaming-cover": {
				title: "電競封面",
				description:
					"AAA 遊戲封面 — 低角度動作、字刻進場景、HUD 裝飾",
			},
			"sports-big-words": {
				title: "運動大字海報",
				description:
					"運動編輯海報 — 超大疊字、動作張力、HUD 數據",
			},
			"jelly-3d": {
				title: "果凍立體字",
				description:
					"極簡果凍／玻璃 3D 主體 — 柔和陰影、少量品牌字",
			},
			"brand-fit": {
				title: "品牌風格分析",
				description: "貼網站 / IG → AI 分析品牌再出相符廣告",
			},
			"brand-campaign": {
				title: "品牌分析 + Campaign 套圖",
				description:
					"分析品牌 → 自動出 3 張串連 post（主打 / 賣點 / 優惠）",
			},
			"brand-video": {
				title: "品牌動態短片",
				description: "分析官網 / 社交 → AI 寫動態 prompt（鏡頭點樣郁）",
			},
			"creative-video": {
				title: "創意動態簡報",
				description:
					"用文字描述你想拍嘅 Reel → AI 寫動態 prompt（運鏡／節奏）",
			},
			"concept-cinematic": {
				title: "概念電影感短片",
				description: "概念故事 / 公益訊息 / 病毒感短片，偏電影感畫面",
			},
			"storyboard-video": {
				title: "故事分鏡片",
				description:
					"AI 按產品寫分鏡 → AI 出圖 出多張場景圖 → 影片生成 一條片（@Image 分鏡）",
			},
			"ugc-presenter": {
				title: "UGC 數字人口播",
				description:
					"產品關鍵幀 → digital presenter 對嘴講稿（似 viral 帶貨短片）",
			},
			"paper-layout": {
				title: "固定紙片版面（舊式）",
				description: "文字原字放上模板 — 唔係全 AI 場景生成",
			},
			"service-promo": {
				title: "專業服務推廣",
				description: "諮詢、課程、會員 — 信任感，唔係產品 hero",
			},
			"pricing-offer": {
				title: "方案／優惠",
				description: "計劃、套票、優惠 — CTA + 賣點",
			},
			"website-launch": {
				title: "網站／App 上線",
				description: "推廣 URL 或 App — 裝置 mockup 感",
			},
		},
		visualStyleHints: {
			product: "乾淨商業產品照 — 影樓或明亮生活場景，適用任何實體貨",
			"dark-premium":
				"深色奢華氛圍、金色光點 — 唔限水晶，珠寶/手錶/護膚/禮品都得",
			"warm-shop": "溫暖親切小店感，突出店舖名同優惠",
			"model-wear":
				"上傳產品相 → AI 生成模特兒佩戴／使用嘅生活感廣告（按產品類型自動調整，唔係固定手鏈模板）",
			"info-poster": "",
			"designed-poster": "",
			"parts-poster": "",
			"gaming-cover": "",
			"sports-big-words": "",
			"jelly-3d": "",
			"brand-fit": "",
			"brand-campaign": "",
			"brand-video": "",
			"creative-video": "",
			"concept-cinematic":
				"概念電影感風格：戲劇光影、景深、情緒節奏，避免畫面內文字。",
			"storyboard-video":
				"似真商業片：AI 按你件貨類型規劃場景（手鏈、洗鼻器、護膚等），唔會固定手鏈模板",
			"ugc-presenter":
				"UGC 口播關鍵幀 + digital presenter 對嘴 — 適合手鏈／飾品帶貨片",
			"paper-layout": "",
			"service-promo": "服務推廣 — 以排版同信任感為主，唔係產品 hero",
			"pricing-offer": "方案／優惠卡 — 清晰 CTA；價錢只用你填嘅 offer",
			"website-launch": "上線推廣 — App／網站 mockup；logo／截圖可選",
		},
		brandVideoIntro:
			"貼官網或 IG @handle。AI 會分析品牌，再寫動態 prompt（運鏡同氛圍 — 唔係口播講稿）。產品相選填。",
		modelWearIntro:
			"上傳產品相，AI 會生成似真模特兒佩戴或使用產品嘅 9:16 廣告圖。手鏈／手串會上手；洗鼻器等會示範用法。進階可揀「主體取景」控制露臉或只手。",
		creativeVideoIntro:
			"用文字描述你想拍嘅短片（例如：功夫對打後飲能量飲品）。AI 會寫動態 prompt（鏡頭點樣郁 — 唔係口播）。產品相或關鍵圖選填。",
		creativeBriefLabel: "創意影片描述（必填）",
		creativeBriefPlaceholder:
			"例如：開場一人對五人功夫對峙，打贏後拿起能量飲品喝一口 — 電影感、節奏快",
		brandCampaignIntro:
			"分析完品牌後，會用 AI 規劃 3 張串連 post，再逐張生成 — 同一品牌 DNA，唔同 message。",
		brandFitTitle: "品牌風格分析（選填）",
		brandFitTitleRequired: "品牌風格分析（選填）",
		brandFitIntro:
			"選填：貼官網或 IG @handle，AI 可抽出色調同語氣。冇網站都可以跳過，用文案同產品相繼續。",
		brandAnalyzeOptionalIntro:
			"選填：分析品牌網站／社交會更貼品牌。冇網站？直接撳繼續即可。",
		brandWebsiteLabel: "品牌網站（選填）",
		brandWebsitePlaceholder: "https://yourshop.com",
		brandSocialLabel: "社交帳號（選填）",
		brandSocialPlaceholder: "@yourbrand 或 IG 主頁連結",
		brandAnalyzeBtn: "分析品牌",
		brandAnalyzeBusy: "分析中…",
		infoPosterTechniqueTitle: "IG 資訊海報技巧（已內建）",
		infoPosterTechniqueIntro:
			"唔好將所有字擠一張圖。跟住呢個流程，AI 會做精品白底資訊圖：",
		infoPosterTechniqueSteps: [
			"產品類別判斷 — 從產品名同相片推斷（美妝、珠寶、食品…）",
			"賣點拆解 — 副標每行一點，最多 3–4 個",
			"文案精簡 — 主標題只講一個主題",
			"單一主題分圖 — 呢張圖只突出一個訊息",
			"品類視覺化 — 配合類別嘅小道具/色調",
			"精品白底風格 — 明亮白底、留白、唔係深色 AI 感",
			"品質檢查 — 避免擠滿文字、制式模板框",
		],
		infoPosterBulletsPlaceholder:
			"每行一個賣點，例如：\n招財聚氣\n日常配戴百搭\n低調有質感",
		designedPosterTechniqueTitle: "設計商業海報（已內建）",
		designedPosterTechniqueIntro:
			"小紅書／IG feed 海報文法 — 產品／場景主視覺＋設計字排（任何品類，唔限食品；唔係白紙目錄 cutout）：",
		designedPosterTechniqueSteps: [
			"主視覺攝影 — 左上柔光、淺景深、場景跟呢件產品品類走",
			"你填嘅標題＋標語原句上圖（填咩就畫咩）",
			"細圓章＋可選一個細毛筆品類字 — 裝飾細過你嘅標題",
			"色調跟產品／場景走 — 統一，唔好彩虹亂撞",
			"電子／美妝／食品／時裝同概念／服務場景都用得",
		],
		designedPosterTaglinePlaceholder:
			"短句上海報，例如：All-day power／柔軟新鮮",
		partsPosterTechniqueTitle: "零件拆解海報（已內建）",
		partsPosterTechniqueIntro:
			"技術爆炸圖海報 — 將產品拆成標註零件，標題＋短說明（唔係暴力破壞）：",
		partsPosterTechniqueSteps: [
			"保留產品相身份 — 外形、顏色、材質",
			"拆開浮動零件，用幼引線連去標註",
			"上方標題；輔助文案 = 一行一個零件說明",
			"乾淨棚影背景 — 手機尺寸都睇得清",
			"只限產品路徑 — 需要清晰產品相",
		],
		partsPosterPartsPlaceholder:
			"每行一個零件標註，例如：\n電池 — 全日續航\n外殼 — 磨砂防滑\n晶片 — 快充 IC",
		requirementsLabel: "額外要求（選填）",
		requirementsPlaceholder: "例如：柔和日光、唔出人、街頭穿搭感…",
		requirementsPlaceholders: {
			product: "例如：食品攝影感、白底、護膚品清新感、街頭穿搭…",
			"dark-premium": "例如：手錶奢華感、香水暗調、茶具金色高光…",
			"warm-shop": "例如：開張優惠、木枱小店、社區街坊感…",
			"model-wear": "例如：男士沉穩風、窗邊自然光、唔要價錢字樣…",
			"info-poster": "例如：美妝清新感、食品天然感、珠寶極簡 pedestal…",
			"designed-poster":
				"例如：左上柔光、食慾場景、你填嘅標題＋標語、細圓章…",
			"parts-poster":
				"例如：深色棚影、幼引線、6 個標註、石墨色調…",
			"gaming-cover":
				"例如：低角度追擊、貨箱路徑、地上寫 CHALLENGE…",
			"sports-big-words":
				"例如：超大 SMASH、螢光 HUD、賽點比分板…",
			"jelly-3d":
				"例如：半透明果凍「1」、青→藍漸層、ONE YEAR 字…",
			"brand-fit": "分析後會自動填；你可再微調產品或場景",
			"brand-campaign":
				"可填 campaign 主題，例如：春季新品三張圖講清功效",
			"brand-video": "分析後會自動寫動態 prompt；可補充運鏡或氛圍要求",
			"creative-video": "上面已填創意描述；呢度可補充運鏡或氛圍",
			"concept-cinematic":
				"例如：戲劇邊緣光、奇幻大殿、電影鏡頭感、情緒張力、唔要 logo 同 UI 字樣",
			"storyboard-video": "例如：似真拍攝、柔和光線、示範用法、唔要價錢…",
			"ugc-presenter":
				"例如：溫馨書房、女主持、手腕示範手鏈、粵語 UGC 感…",
			"paper-layout": "紙片模板主要靠你填嘅文字，呢度通常唔使填",
			"service-promo": "例如：信任感配色、學員見證氛圍、課程時間表感覺…",
			"pricing-offer": "例如：突出中間方案、柔和漸層、唔好自己加價錢…",
			"website-launch":
				"例如：手機 App mockup、乾淨 SaaS 介面、上線倒數氛圍…",
		},
		campaignThemeLabel: "Campaign 主題（選填）",
		campaignThemePlaceholder: "例如：開張優惠三連 post、新品功效系列…",
		imageOutputModeLabel: "出圖數量",
		imageOutputModeHint:
			"Campaign 會出 3 張概念串連嘅圖（約 3× API 成本 + AI 規劃）",
		imageOutputModeHintDesignedPoster:
			"呢個海報方向係一張完整靜幀 — 唔適合 A/B、Campaign 套圖同教學輪播。",
		imageKeyframeModeLabel: "關鍵幀數量",
		imageKeyframeModeHint:
			"圖→片只需 1 張關鍵幀做動態（可選 A/B 揀一張）。唔係故事分鏡；Campaign／教學輪播請用「只要圖」。",
		imageOutputModes: {
			single: {
				title: "單張",
				description: "一張宣傳圖（預設）",
			},
			ab: {
				title: "A / B 兩版本",
				description: "同一設定出兩張，揀較滿意嗰張",
			},
			campaign: {
				title: "Campaign 套圖",
				description: "3 張串連 post — 主打、賣點、優惠",
			},
			"teaching-carousel": {
				title: "教學輪播",
				description: "4–6 張教學卡 — 封面、重點、總結",
			},
		},
		imageAspectRatioLabel: "貼文尺寸（比例）",
		imageAspectRatioHint:
			"1K 出圖。IG/FB feed 揀 4:5；Reels/Stories 揀 9:16；正方形 post 揀 1:1。",
		imageAspectRatios: {
			"9:16": {
				title: "9:16 Reels / Stories",
				description: "直身影片框 · 1K 約 768×1365 px",
			},
			"4:5": {
				title: "4:5 Feed 直圖",
				description: "IG/FB feed 預設 · 1K 約 928×1152 px",
			},
			"1:1": {
				title: "1:1 正方形",
				description: "方形 feed / carousel · 1K 約 1024×1024 px",
			},
		},
		imagePreflightAspect: "尺寸：{ratio} @ 1K",
		imagePostflightTitle: "品質檢查 — 生成圖片",
		imagePostflightResolution: "{width}×{height} 像素（1K 輸出）",
		imagePostflightAspect: "比例：{ratio}",
		imagePostflightSafeForVideo: "可用於影片 — 9:16 且清晰度足夠",
		imagePostflightNotSafeForVideo: "影片前可能需要調整 — 檢查比例或解像度",
		imagePostflightLowRes: "解像度偏低 — 產品細節可能模糊",
		imagePostflightVerySmall: "圖片太小 — 建議重新生成",
		imagePostflightAnalyzing: "正在分析圖片品質…",
		imageVisionReviewTitle: "AI 品質掃描",
		imageVisionReviewAnalyzing: "檢查亂碼文字同偏離 brief 嘅畫面…",
		imageVisionReviewScore: "吻合度：{score}/100",
		imageVisionReviewSummary: "{summary}",
		imageVisionReviewIssues: "問題：{issues}",
		imageVisionReviewPass: "大致符合 brief — 可以繼續。",
		imageVisionContinueWarn: "品質掃描發現問題 — 請檢查下方或重新生成。",
		imageVisionShipItBlocked:
			"Ship-it 已暫停 — 請重新生成圖片或修正文字/品牌問題。",
		imagePostGenChecklistTitle: "快速信心確認",
		imagePostGenChecklistHint: "繼續前先確認 — 如有問題可重新生成。",
		imagePostGenProductReadable: "產品清晰可見、易辨識",
		imagePostGenTextLegible: "圖上文字清晰（或按預期無字）",
		imagePostGenRegenerateBtn: "重新生成圖片",
		imagePostGenRegenerating: "重新生成中…",
		imagePostGenAllChecked: "看起來不錯 — 可以繼續或一鍵出片。",
		shipItModeOn: "一鍵出片模式 — 更少選擇、更快",
		shipItModeOff: "專家模式 — 顯示全部選項",
		shipItModeHint: "隱藏進階提示詞同專家控制。你嘅設定會保留，唔會刪除。",
		shipItShowExpert: "顯示專家選項",
		shipItRunBtn: "一鍵出片 — 圖片 + 影片 + BGM",
		shipItRunning: "出片中…",
		shipItRunHint: "一鍵：生成圖片（如需要）→ 影片 + 曲庫背景音樂。",
		shipItUnsupported:
			"一鍵出片只適用標準產品圖→影片。分鏡、主播或概念路線請用專家模式。",
		campaignPlanLabel: "Campaign 大綱",
		campaignGenerating: "規劃並生成 Campaign 套圖中…（約 1–3 分鐘）",
		campaignProgressPlanning: "規劃 Campaign 大綱中…",
		campaignProgressRendering: "生成 Campaign 第 {current}/{total} 張…",
		teachingCarouselProgressPlanning: "規劃教學輪播大綱中…",
		teachingCarouselProgressRendering:
			"生成輪播第 {current}/{total} 張…（全程約 2–4 分鐘）",
		storyboardBriefLabel: "故事／風格要求（選填）",
		storyboardBriefPlaceholder:
			"例如：似真拍攝、柔和光線；洗鼻器示範用法；唔要價錢；可以露手唔露樣…",
		storyboardIntro:
			"AI 會按產品類型規劃分鏡（幾個場景、每張圖拍咩），再自動寫 影片生成 @Image 分鏡 prompt — 唔係固定手鏈模板。",
		storyboardGenerating:
			"規劃分鏡並生成場景圖中…（約 2–5 分鐘，視場景數量）",
		storyboardProgressPlanning: "AI 規劃分鏡中…",
		storyboardProgressRendering: "生成場景圖 {current}/{total}…",
		progressEta: "預計尚餘 ~{seconds} 秒",
		progressEtaMinutes: "預計尚餘約 {minutes} 分鐘",
		storyboardPlanLabel: "分鏡大綱",
		storyboardPlanReviewHint:
			"先用 AI 出分鏡大綱，改到啱再生成場景圖。唔啱嘅場景描述／畫面字可以直接改。",
		storyboardRecipeTitle: "分鏡配方",
		storyboardRecipeHint:
			"經典彈性分鏡，或豪華產品誕生（建議實體產品）。唔係三分屏 Social drip。",
		storyboardRecipeLuxuryNoRefHint:
			"唔用參考短片。可揀 3 場（緊湊）或 5 場（建議）。影片預設 單鏡出片。",
		storyboardRecipeLuxuryDrivers: {
			title: "豪華分鏡故事靠咩決定？",
			intro:
				"AI 只根據你填嘅文字出大綱——規劃時睇唔到產品相。下面高亮欄位最重要：",
			priorityPrimary: "最重要",
			prioritySecondary: "影響語氣",
			items: [
				{
					field: "storyboardBrief",
					priority: "primary",
					section: "分鏡卡片",
					hint: "寫清隱喻弧（例如：紅色水晶虛空 → 紅寶心脈動 → 液體金屬中誕生唇膏）",
				},
				{
					field: "product",
					priority: "primary",
					hint: "產品名定品類同語氣——用真實產品名",
				},
				{
					field: "productPhoto",
					priority: "primary",
					section: "產品相",
					hint: "包裝相鎖定最後 reveal 靜幀（規劃後先用）",
				},
				{
					field: "headline",
					priority: "secondary",
					hint: "主標題同字幕語氣——有輔助文案可以一齊填",
				},
				{
					field: "promptExtra",
					priority: "secondary",
					hint: "電影感、光線、質感、唔想要嘅元素",
				},
				{
					field: "artStyle",
					priority: "secondary",
					section: "畫面風格",
					hint: "整體視覺語言（靜幀同動態）",
				},
			],
			footnote:
				"最啱實體產品（美妝、珠寶、高級包裝）。概念模式配呢個配方較弱。",
		},
		storyboardLuxuryFieldBadge: "故事驅動",
		storyboardLuxuryContentBanner: {
			title: "呢啲欄位決定豪華分鏡大綱",
			body: "出大綱前，先填好「內容詳情」同「分鏡」入面高亮嘅欄位。",
		},
		storyboardBriefLuxuryRequired: "— 豪華配方請填",
		storyboardBriefLuxuryPlaceholder:
			"例如：紅色水晶虛空 → 紅寶心脈動 → 液體金屬中誕生唇膏；珠寶廣告光；唔好價錢…",
		storyboardLuxurySceneCountHint:
			"3 場 → 10 秒影片（短 Reel）；5 場 → 15 秒影片（建議，每拍更有空間）。片長自動設定。",
		storyboardLuxuryDurationAutoHint: "自動",
		storyboardRecipes: {
			"classic-tvc": {
				title: "經典 TVC",
				desc: "彈性場景數 · 開場 → 細節 → 收束",
			},
			"luxury-birth": {
				title: "豪華誕生",
				desc: "產品包裝相 · 抽象 → 隱喻 → reveal · 3 或 5 場",
			},
		},
		compositionPresetLabel: "構圖",
		compositionPresetHint:
			"疊喺漫畫／動漫／3D 卡通畫風上面嘅鏡頭語法。",
		compositionPresets: {
			standard: {
				title: "標準",
				desc: "跟畫風一般構圖",
			},
			"fisheye-hero": {
				title: "魚眼英雄",
				desc: "超廣角魚眼 · 桶形變形 · 大手／產品衝向鏡頭",
			},
		},
		storyboardPlanBtn: "生成分鏡大綱",
		storyboardPlanBusy: "AI 規劃中…",
		storyboardPlanReplanBtn: "重新規劃大綱",
		storyboardPlanThemeLabel: "故事主題",
		storyboardPlanSceneDescLabel: "場景描述",
		storyboardPlanCopyLabel: "畫面字（選填）",
		storyboardPlanCameraLabel: "鏡頭／動態（英文，可改）",
		storyboardPlanPlacementLabel: "產品／概念位置",
		storyboardPlanPunchLabel: "金句／字幕節拍",
		videoEngineLabel: "影片引擎",
		videoEngineSeedance: "參考片模式（預設）",
		videoEngineMinimaxH3: "單鏡出片（人臉／產品鎖定）",
		videoEngineHint:
			"簡易工作室自動揀引擎：有研究片用 參考片模式，淨靜幀／海報用 單鏡出片。拼接後備 只係無片時後備。",
		storyboardSceneLabel: "場景",
		storyboardVideoIntro:
			"呢啲靜幀會鎖入影片。壞格請返去審查重產。有研究片：參考片模式 跟節奏，再 單鏡出片。淨靜幀：先單鏡，失敗先 拼接後備 拼接。",
		storyboardVideoPreflight:
			"有研究片：參考片模式 → 單鏡。淨靜幀：單鏡 → 拼接後備 拼接",
		klingStoryboardFallbackNote:
			"分鏡影片 — 每格靜幀變成短片，再拼接成完整片",
		storyboardMinimaxH3Note:
			"分鏡影片 — 單鏡出片 用場景圖一次出片（唔使拼接）",
		storyboardSeedanceR2vNote:
			"分鏡影片 — 參考片模式 參考片對片（@Video1 主軸 + 靜幀，非 fast）",
		storyboardEnginePipelineHint:
			"有研究片：參考片模式 → 單鏡出片（唔用 拼接後備）。淨靜幀：單鏡 → 拼接後備 5/10 秒拼接。",
		researchReelCopyingNote:
			"跟緊你嘅參考片 — 如果人臉被擋會改用 單鏡出片。",
		switchToMotionPosterBtn: "改用動態海報（通常更平）",
		switchToMotionPosterHint: "跳過多場景拼接 — 只對一張關鍵幀做微動態。",
		lookBiblePaletteLabel: "色盤",
		lookBibleLightingLabel: "燈光",
		lookBibleMaterialsLabel: "材質",
		lookBibleNegativesLabel: "避免",
		seedanceToKlingFallbackNote:
			"參考片模式 此請求被阻擋 — 改用 拼接後備 分鏡（每格短片再拼接）",
		seedanceToMinimaxH3FallbackNote:
			"參考片模式 此請求被阻擋 — 改用 單鏡出片（盡量保留參考片運鏡）",
		h3ToSeedanceFallbackNote:
			"單鏡出片暫時未能用 — 已改用 Seedance，並混入音樂庫 BGM",
		klingStoryboardClipCount: "片段 × {n}",
		storyboardDurationLabel: "目標片長",
		storyboardDurationHint:
			"會影響分鏡場景數量。改咗片長請重新生成場景圖。",
		storyboardAllScenesHint:
			"場景圖會出無字版本（方便做片）。畫面字會喺出片後自動燒錄做字幕。",
		storyboardCaptionsAutoNote: "已自動燒錄分鏡文案做字幕",
		storyboardCaptionsReadyNote:
			"分鏡文案已備好 — 去字幕工作室編時間、旁白同燒錄",
		storyboardAllScenesImageHint:
			"全部場景會用於影片 — 唔使喺下面揀「版本」。",
		storyboardTrimDurationLabel: "片長裁剪預設",
		storyboardSceneCountLabel: "場景數量",
		storyboardSceneCountAuto: "自動",
		storyboardSceneCountHint:
			"片長會同步去步驟 3 影片設定。場景數量控制 AI 規劃幾張圖。",
		storyboardEditorHint:
			"迷你編輯器：可調場景順序、逐張替換，再喺 app 內重生影片。",
		storyboardMoveUpBtn: "上移",
		storyboardMoveDownBtn: "下移",
		storyboardReplaceImageBtn: "替換相片",
		storyboardRegenerateAiBtn: "AI 重新生成",
		storyboardRegenerateAiCostHint:
			"按新場景出圖收費（開啟品牌 Logo 時為 2 倍 Token）。",
		storyboardStampLogoBtn: "印上品牌 Logo",
		storyboardStampingLogo: "印 Logo 中…",
		storyboardStampLogoHint: "角標印上 Brand kit Logo（唔經 AI、唔收費）。",
		storyboardStampLogoCornerHint:
			"角標印上 Brand kit Logo（唔經 AI、唔收費）。",
		storyboardReplacingImage: "替換中…",
		storyboardRegeneratingImage: "生成中…",
		storyboardRegenerateConfirm:
			"即刻用 AI 重新生成場景 {scene}？呢次會再出一次並再次收費。",
		storyboardKeyframeSectionTitle: "分鏡參考圖（@Image1…@ImageN）",
		storyboardPromptLabel: "影片生成 分鏡 Prompt",
		storyboardPromptHint:
			"AI 已為每個場景標記 @Image1、@Image2… 檢查後再生成影片。",
		storyboardPromptEditLabel: "編輯分鏡 Prompt（進階）",
		ugcPresenter: {
			setupIntro:
				"第 2 步：AI 出圖 出對嘴關鍵幀（產品喺手）。第 3 步：digital presenter 對你嘅廣告包講稿（約 $0.10/秒）。請先規劃廣告包同預聽聲線。",
			imageStepIntro:
				"生成 UGC 口播關鍵幀 — 面清晰、產品喺手腕／手上。用呢張圖做 digital presenter 動畫（唔係 影片生成）。",
			videoStepIntro:
				"開啟廣告包 → 規劃講稿 → 預聽聲線 → 生成影片。對嘴已燒入片內。",
			imagePreflight:
				"模式：digital presenter 口播關鍵幀（對嘴、手持產品）",
			videoPreflight: "模式：digital presenter 對嘴（唔係 影片生成）",
			voiceBakedInNote: "口播已對嘴燒入影片 — 唔會再配音覆蓋。",
			needScript: "需要廣告包口播講稿先可以生成數字人影片。",
			needAdPackHint: "請先開啟廣告包 — 規劃講稿（同預聽聲線）再生成。",
		},
		primaryPathsTitle: "主要創作路徑",
		primaryPathsHint: "先揀以下 2 條主路徑；其他風格放喺進階。",
		videoPathsTitle: "影片主路徑",
		videoPathsHint: "揀點樣整 Reel — 產品相寫動態 prompt，或跟參考短片。",
		videoAssistantStepHint:
			"已選 AI 影片助手 — 按「繼續」到步驟 3 上傳產品、包裝同角度相片，AI 會分析並寫動態 prompt。",
		primaryPathsShortcutNote:
			"呢兩個係快捷入口；進階入面一樣可以揀返同一風格，而且選項更多。",
		primaryPathsHiddenResearchHint:
			"已透過內容研究設定參考排版同出圖模式 — 可直接填產品相片同文案，然後繼續。",
		pathQuickTitle: "快速廣告",
		pathQuickDesc: "大部分產品可用，快速出圖/出片。",
		pathQuickVideoDesc:
			"一張產品相 + AI 寫運鏡 prompt → 短宣傳片（先出無聲片，之後可加 BGM／字幕）。",
		pathModelTitle: "模特兒佩戴／使用",
		pathModelDesc: "模特兒風格快捷入口（進階都可以揀到同一款）。",
		pathStoryboardTitle: "故事分鏡片",
		pathStoryboardDesc: "AI 規劃多場景故事再出片。",
		pathUgcPresenterTitle: "UGC 數字人口播",
		pathUgcPresenterDesc: "對嘴講稿帶貨片（關鍵幀 + digital presenter）。",
		pathReferenceTitle: "參考排版廣告",
		pathReferenceDesc: "上傳參考廣告圖 — 保留排版，換成你嘅產品同文案。",
		pathReferenceVideoTitle: "跟參考短片",
		pathReferenceVideoDesc:
			"上傳參考短片 MP4 — 會分析運鏡／剪輯感覺（唔係逐格複製）。你嘅產品相仍然係 @Image1。",
		sceneReelTitle: "短片製作",
		sceneReelDesc:
			"用主題寫一條場景短片。可選官網／IG 對齊品牌語氣，可選參考 MP4 跟運鏡。",
		contentResearchSectionTitle: "平台內容研究（選填）",
		contentResearchSectionHint: "搵熱門帖做版式靈感 — 已有參考圖可跳過。",
		conceptPathsTitle: "概念推廣主路徑",
		conceptPathsHint: "適合服務、網站、方案 — 唔係產品 packshot。",
		conceptVideoPathsTitle: "概念影片主路徑",
		conceptVideoPathsHint:
			"同一套概念會用嚟做影片，唔使上傳產品相。揀風格、套用欄位，再繼續去影片步驟。",
		closestMatchRecipeTitle: "最接近範例配方（電影感社交片）",
		closestMatchRecipeHint:
			"圖片→影片流程：3 張 AI 關鍵幀 + 3 段 影片生成 片段拼接（約 24 秒）。先出無聲片 — 完成後再加 BGM 同字幕。",
		closestMatchRecipeApply: "套用最接近配方",
		closestMatchRecipeApplied: "已套用最接近配方",
		quickTest8sRecipeTitle: "8 秒測試配方（慳成本）",
		quickTest8sRecipeHint:
			"單場景 8 秒：Step 2 撳「生成電影感關鍵幀」→ Step 3 撳「生成完整 Reel（8 秒）」。先出無聲片，完成後可加 BGM 同字幕。",
		quickTest8sRecipeApply: "套用 8 秒測試配方",
		quickTest8sRecipeApplied: "已套用 8 秒測試配方",
		conceptCinematicPathsTitle: "概念電影感 Reel（圖片→影片）",
		conceptCinematicPathsHint:
			"先生成靜態關鍵幀，再用 影片生成 做動態。 viral 電影感 Reel 質素最好 — 唔建議純文字出片。",
		conceptCinematicSingleTitle: "單場景（約 8 秒）",
		conceptCinematicSingleDesc: "一張關鍵幀 + 一段短片 — 快速電影感 hook。",
		conceptCinematicSingleImageStepIntro:
			"8 秒電影感模式：撳「生成電影感關鍵幀」會自動規劃 1 個場景 + 1 張關鍵幀（唔需要產品相片）。",
		conceptCinematicSingleOutputTitle: "出圖：1 張電影感關鍵幀",
		conceptCinematicSingleOutputDesc:
			"會用 AI 規劃場景同 影片生成 動態 prompt，再生成 1 張 9:16 關鍵幀。",
		conceptCinematicSingleNoPosterHint:
			"⚠️ 關鍵幀係電影感場景（酒吧、人物、氣氛）— 唔係產品海報。文案會喺之後用字幕／口播加入，唔會燒入圖片。",
		conceptSocialImageStepIntro:
			"概念社交帖：AI 會做醒目 IG/FB 創意圖，將 hook 同 CTA 融入版面 — 唔係白底資訊圖海報。",
		conceptSocialImageHint:
			"提示：Setup 先用「AI 分析概念」可以得到更好嘅視覺隱喻。下面「人物 / 身體部位」可控制出唔出模特樣。",
		conceptCarouselModeHint:
			"教學輪播 = 多張教學卡。概念模式有參考圖時只跟 topic + 色調/字體（style-only）— 每張用新 layout，唔會 clone 參考圖。",
		conceptNoStyleMemoryHint:
			"每次生成係獨立嘅 — AI 唔會自動記住你上次邊張圖好睇。想固定風格，用「跟參考圖概念」或喺進階設定寫清楚視覺要求。",
		conceptCinematicSingleGenerateBtn: "生成電影感關鍵幀",
		conceptCinematicSingleGenerating: "規劃場景並生成關鍵幀中…",
		imagePreflightConceptCinematicSingle:
			"8 秒電影感：AI 規劃 1 個場景 + 1 張關鍵幀。",
		imagePreflightConceptSocial:
			"概念社交帖：醒目 IG/FB 創意圖，hook 同 CTA 融入版面 — 唔係白底資訊圖海報。",
		conceptCinematicSingleVideoStepIntro:
			"8 秒 Reel：撳「生成完整 Reel」會做 1 段 影片生成（無聲片 — 完成後再加 BGM／字幕）。",
		conceptCinematicSingleGenerateVideoBtn: "生成完整 Reel（8 秒）",
		conceptCinematicSingleSceneReady: "已準備關鍵幀 — 0–8 秒",
		conceptCinematicSingleRecipeSteps: [
			"1) Setup 填好概念，Step 2 撳「生成電影感關鍵幀」。",
			"2) Step 3 撳「生成完整 Reel」— 出無聲 影片生成 片。",
			"3) 完成後可下載，或去字幕同音頻工作室加 BGM 同字。",
		],
		conceptCinematicStitchTitle: "多場景拼接",
		conceptCinematicStitchDesc:
			"多張關鍵幀 + 多段短片拼接 — 更接近 viral 蒙太奇 Reel。",
		cinematicSceneCountLabel: "場景數量",
		cinematicSceneCountOption: "{count} 場景（約 {totalSec} 秒）",
		cinematicSceneCountTotalHint: "≈ {totalSec} 秒總長",
		cinematicSceneCountHint:
			"AI 會按場景數量規劃腳本節拍。每段 8 秒；場景越多節奏越快，成本越高。",
		imagePreflightCinematicStitch:
			"電影感拼接：AI 規劃 {count} 個場景，再生成 {count} 張關鍵幀（約 {count} 倍圖片成本）。",
		cinematicReelPlanLabel: "Reel 主題",
		cinematicStitchImageStepIntro:
			"{count} 場景拼接：撳一次會自動規劃並生成 {count} 張關鍵幀（約 {totalSec} 秒 Reel）。唔需要產品相片。",
		cinematicStitchOutputTitle: "出圖：{count} 張場景圖",
		cinematicStitchOutputDesc:
			"AI 會為每個場景寫一個節拍。生成前可改場景數量 — 每場景一張圖 + 一段 影片生成。",
		cinematicStitchGenerateBtn: "生成 {count} 張關鍵幀",
		cinematicStitchGenerating: "規劃場景並生成關鍵幀中…",
		cinematicStitchImageHint:
			"繼續去影片 — 會生成 {count} 段 影片生成 短片並自動拼接。",
		cinematicStitchVideoPreflight:
			"{count} 場景電影感拼接：{count} 次圖生影片 + 本地拼接",
		cinematicStitchFfmpegNote: "拼接喺本地完成（每段 8 秒動態分開生成）",
		cinematicLogoStampNote:
			"已喺出片前將品牌 logo 印喺靜幀（每場景同一位置同大小）。",
		cinematicLogoModeBNote:
			"勾選「影片靜幀使用品牌 Logo」時，每張影片關鍵幀會印上 Brand kit Logo（由模型揀自然位置）。",
		cinematicLogoStampHint:
			"喺 Brand kit 上傳 logo，再勾選「影片靜幀使用品牌 Logo」。重新生成影片靜幀先會套用。圖片請用「編輯圖片」加 Logo。",
		cinematicStitchWorkflowOrder:
			"生成順序：{count} 段 影片生成 → 本地拼接。BGM 同字幕可喺完成後加。腳本／音樂可選用廣告包或字幕工作室。",
		cinematicStitchVideoCost: "{count} 次影片生成 + 拼接（成本高過單段）",
		cinematicStitchClipCount: "已拼接片段",
		cinematicStitchRecipeSteps: [
			"1) Setup 填好概念、揀場景數量，Step 2 生成關鍵幀。",
			"2) Step 3 直接撳「生成完整 Reel」— 影片生成 + 拼接（無聲）。",
			"3) 完成後下載無聲 MP4，或開啟字幕同音頻工作室。",
		],
		cinematicStitchVideoStepIntro:
			"{count} 場景拼接：撳「生成完整 Reel」會自動做 {count} 段 影片生成 + 拼接（BGM／字幕之後可選）。",
		cinematicStitchGenerateVideoBtn: "生成完整 Reel（{count} 段拼接）",
		cinematicStitchScenesReady:
			"已準備 {ready}/{count} 張場景圖 — 會用晒 {count} 張做拼接",
		conceptVideoSameBriefHint:
			"影片模式會用同一套概念欄位。有圖請先上傳（可選），再 AI 分析 — 然後繼續去影片。",
		conceptVideoImageLabel: "影片參考圖（可選）",
		conceptVideoImageHint:
			"海報、插圖或相片 — AI 會讀圖並規劃點樣加入影片動態。",
		conceptVideoImageOrderHint:
			"有自己嘅圖：請先喺呢度上傳，再撳 AI 分析概念，AI 先會知道畫面有咩。",
		conceptWizardTitle: "概念助手（非實體產品）",
		conceptWizardHint:
			"填呢 6 格，然後一鍵帶入主標題／副標／優惠同 prompt 方向。",
		conceptIdeaLabel: "你嘅概念",
		conceptIdeaPlaceholder:
			"例如：瑜伽會員招募，或護膚品牌煥新",
		conceptAudienceLabel: "受眾",
		conceptAudiencePlaceholder: "呢條廣告係想同邊類人講？",
		conceptPainLabel: "痛點",
		conceptPainPlaceholder: "佢哋而家最困擾係咩？",
		conceptPromiseLabel: "承諾",
		conceptPromisePlaceholder: "用你服務後可以得到咩結果？",
		conceptProofLabel: "證據／方法",
		conceptProofPlaceholder: "點解可信？",
		conceptCtaLabel: "優惠 + 行動",
		conceptCtaPlaceholder: "而家想佢哋做咩？",
		conceptVisualMetaphorLabel: "視覺隱喻",
		conceptVisualMetaphorPlaceholder: "畫面應該出現咩場景／象徵？",
		conceptAnalyzeBtn: "AI 分析概念",
		conceptAnalyzeBusy: "AI 分析概念中…",
		conceptAnalyzeReady: "概念草稿已填入，請檢查後套用到欄位。",
		conceptApplyBtn: "套用到欄位",
		conceptApplyHint:
			"會將承諾→主標題，痛點+證據→副標，CTA→優惠，受眾+隱喻→額外要求。",
		pathInfoTitle: "資訊／教學圖",
		pathInfoDesc: "賣點條列、點解揀你 — 適合 IG feed。",
		pathBrandTitle: "品牌／網站",
		pathBrandDesc: "分析網站或社交 → 統一風格提示。",
		pathPricingTitle: "方案／優惠",
		pathPricingDesc: "收費計劃、套票、限時優惠 + CTA。",
		pathWebsiteTitle: "網站／App",
		pathWebsiteDesc: "上線推廣 — logo 或截圖可選。",
		imagePreflightTitle: "生成相片前檢查",
		imagePreflightSingle: "單張生成：1 次出圖。",
		imagePreflightAB: "A/B 模式：2 次出圖（約 2x 成本）。",
		imagePreflightCampaign: "Campaign：3 張串連圖 + 規劃。",
		imagePreflightCampaignReference:
			"參考廣告 + 產品相：排版跟參考圖設計語言；產品同文案用你自己上傳同填寫嘅內容。",
		referenceBriefTitle: "參考圖創意簡報",
		referenceBriefAnalyzing: "分析緊你嘅參考圖 — 排版、色調、字體…",
		referenceBriefAnalyzingWait: "請等參考圖分析完成後再繼續。",
		referenceBriefAnalyzed: "參考圖已分析 — 生成會借用設計，唔會照抄內容。",
		referenceCarouselBriefAnalyzed:
			"參考輪播已分析（{count} 張）— 規劃同生成會跟每張參考圖嘅排版同共享風格。",
		researchReelAnalyzed:
			"參考短片已分析 — 畫面風格同剪接節奏跟參考片；內容用你嘅主題同文案。已用片內畫面取代搜尋縮圖做風格參考。第 2 步出場景圖，第 3 步 影片生成 合成。",
		referenceVideoAnalyzed:
			"參考短片已分析 — 已按鏡頭節奏寫好 影片生成 提示；生成時會用精華蒙太奇 + 你嘅產品照。",
		referenceVideoAnalyzing: "正在分析你上傳嘅參考短片…",
		researchReelAnalyzing: "正在分析參考短片並排分鏡…",
		researchReelAnalyzeFirstHint:
			"等參考短片分鏡分析完成，或上傳產品相片後再繼續。",
		referenceR2vDurationHint:
			"長片會自動做 15 秒精華蒙太奇（開場＋中段＋結尾）俾 影片生成；分析會睇成條片。輸出 6 秒係完整小廣告節奏，唔係淨係抄頭 15 秒。",
		researchReelSetupTitle: "參考短片 → 分鏡短片",
		researchReelSetupTitleConcept: "參考短片 → 分鏡概念短片",
		researchReelSetupIntro:
			"揀咗熱門短片之後：下載參考 MP4 → AI 分析鏡頭節奏并排分鏡 → 上傳產品照 → 第 2 步 AI 出圖 出場景圖 → 第 3 步 影片生成 合成同款節奏短片。",
		researchReelSetupIntroConcept:
			"揀咗熱門短片之後：下載參考 MP4 → 分析畫面風格同剪接節奏 → 第 2 步用參考封面＋你嘅文案出場景圖（風格跟參考、內容跟你）→ 第 3 步合成。參考話題同你嘅主題可以完全唔同。",
		researchReelStatusPost: "已揀參考帖",
		researchReelStatusMp4: "參考 MP4 已就緒（搜尋下載或你自己上傳）",
		researchReelMp4Missing:
			"參考 MP4 未就緒 — 等搜尋自動下載、喺下面上傳你自己嘅 MP4，或再搜尋揀帖。",
		researchReelMp4OptionalCombined:
			"圖文帖唔使 MP4（選填）— 會用參考圖風格 + AI 分鏡出片。",
		researchReelStatusProductPhoto: "產品相片已上傳",
		researchReelStatusProductPhotoOptional:
			"產品相片（可在此上傳，或到第 2 步再上傳）",
		researchReelStatusConceptCopy: "主標題／概念文案已填入",
		researchReelStatusConceptCopyMissing:
			"請先揀研究角度，或填主標題／概念助手",
		researchReelUploadProductHint:
			"你嘅產品照 — 每格分鏡場景圖會用佢配合參考節奏生成",
		researchReelUploadMp4Hint:
			"搜尋自動下載或上傳你自己嘅 MP4/MOV — 兩種都得；分析畫面風格同剪接節奏一樣",
		researchReelPickDurationFirst:
			"請先喺上方揀輸出片長（唔好留「自動」），參考片分析同 影片生成 出片先會按呢個長度規劃。",
		researchReelReanalyzeForDuration: "片長已改 — 重新分析參考片…",
		researchReelStatusOutputDuration: "輸出片長已揀（分析同計費用）",
		researchReelStatusOutputDurationMissing:
			"請先揀輸出片長（4–12 秒）— 參考片可以好長，出片長度以呢度為準",
		setupReferenceVideoTitle: "參考短片（選填）",
		setupReferenceVideoIntro:
			"喺第 1 步上傳參考廣告 MP4，出場景圖前會先分析風格同節奏。唔使參考片都可以生成（產品助手或純文案影片）。",
		setupReferenceVideoHint:
			"MP4 或 MOV · 選填 — 填好主標題／產品名後會自動分析",
		setupReferenceVideoSkipNote:
			"選填 — 唔上傳參考片都可以出片（產品推廣、AI 影片助手、或文字 prompt）。",
		setupReferenceVideoWaitingCopy:
			"參考 MP4 已上傳 — 請先填好上面主標題或產品名，系統會自動分析風格同節奏。",
		setupReferenceVideoAnalyzeRequired:
			"參考 MP4 需要先分析 — 返回第 1 步填好主標題／產品名，再按繼續以開始分析。",
		setupReferenceVideoNonStoryboardHint:
			"參考 MP4 主要影響第 3 步影片（R2V）。若要第 2 步分鏡場景圖跟參考風格，請喺第 1 步揀「分鏡短片」視覺風格。",
		imageStepReferenceReelTitle: "參考短片（來自第 1 步）",
		imageStepReferenceReelStyle: "鎖定視覺風格",
		imageStepReferenceReelStoryboardHint:
			"喺下面生成場景圖 — 每格跟參考片視覺風格；內容用你嘅主標題文案。",
		imageStepReferenceReelNeedStoryboardTitle: "參考短片要用分鏡模式",
		imageStepReferenceReelNeedStoryboardHint:
			"你已上傳參考 MP4，但第 2 步仍係單張出圖模式。請切換去「故事分鏡片」，AI 出圖 才會按參考分析出多格場景圖。",
		imageStepReferenceReelSwitchStoryboardBtn: "切換去故事分鏡片",
		continueToSimilarVideo: "繼續 → 生成同款短片",
		referenceBriefAnalyzeFailed: "參考圖分析失敗，你仍然可以生成。",
		referenceBriefStrategyLabel: "策略",
		referenceBriefLayoutDetected: "排版",
		referenceBriefColors: "色調",
		referenceBriefSceneSpine: "場景",
		referenceBriefBorrow: "跟參考借",
		referenceBriefReplace: "換成你嘅",
		referenceBriefFootnote:
			"參考同產品唔關事都得 — 保留設計語法，換成你嘅產品同文案。",
		referenceStrategyKind: {
			none: "無參考",
			styleOnly: "風格跟參考（送圖）",
			layoutTransfer: "排版轉移（參考 + 產品）",
			productClone: "產品相美化",
			moodOnly: "氛圍／動態 only",
		},
		referenceLayerLabel: {
			layout: "排版",
			visualStyle: "視覺風格",
			topic: "主題",
			subjects: "主角",
			text: "圖上文字",
			mood: "氛圍光線",
			staging: "擺位姿勢",
		},
		referenceLayerAction: {
			keep: "保留",
			adapt: "配合調整",
			replace: "替換",
			ignore: "忽略",
		},
		imagePreflightTeachingCarousel: "教學輪播：{count} 張教學卡 + 規劃。",
		teachingCarouselSlideCountLabel: "幾多張卡？",
		teachingCarouselSlideCountOption: "{count} 張",
		teachingCarouselSlideCountHint:
			"Week 1「不用寫 Prompt」建議 5 張（封面 → 3 步 → CTA）。最多 6 張。",
		imagePreflightStoryboard: "分鏡模式：多張場景圖 + AI 規劃。",
		conceptResearchReelStoryboardImageStepIntro:
			"生成影片前先預覽每格場景圖 — 可揀長度同場景數。用主標題／概念文案驅動畫面（唔使產品相）。",
		conceptResearchReelStoryboardImagePreflight:
			"概念分鏡：用參考片風格 + 你嘅主題文案出場景圖 — 唔使產品相。有參考封面會跟視覺風格生成。",
		quickFixTitle: "快速小修（細節）",
		quickFixImageHint:
			"描述要改什麼——我們會編輯你在上方選中的那張圖。改文字時請寫明想要的文案、字號或樣式。",
		quickFixEditingSlide: "正在編輯：{label}",
		quickFixVideoHint:
			"加一條提示後重新生成影片——重新生成仍會扣影片 tokens（並非免費）。",
		quickFixRealism: "提升真實感",
		quickFixText: "移除文字/Logo",
		quickFixLighting: "微調光線",
		quickFixLogoTitle: "換 Logo／加 Logo",
		quickFixLogoHint: "上傳 PNG（透明底最佳），我們會加到你揀嘅圖片上。",
		quickFixLogoUploadBtn: "上傳 Logo 圖",
		quickFixLogoChangeBtn: "換另一個 Logo",
		quickFixLogoPlacementLabel: "Logo 位置",
		quickFixLogoNoteLabel: "額外說明（可選）",
		quickFixLogoNotePlaceholder: "例如：Logo 細一點、唔好遮住產品",
		quickFixLogoApplyBtn: "套用 Logo",
		quickFixLogoPlacements: {
			"bottom-right": "右下角",
			"bottom-left": "左下角",
			"top-right": "右上角",
			"top-left": "左上角",
			center: "置中",
			replace: "取代現有 Logo",
		},
		quickFixCustomLabel: "或自行描述問題",
		quickFixCustomPlaceholder: "例如：把標題放大加粗，或改成「夏日特惠」",
		quickFixApplyBtn: "套用修正",
		quickFixRefining: "正在修正…",
		quickFixLessMotion: "減少動作",
		quickFixNoFace: "不要露臉",
		quickFixMinor: "修正細微瑕疵",
		quickFixCreditReady:
			"AI 快速小修會扣圖片 tokens（每次約 {tokens}）——與正常圖片生成相同。",
		quickFixCreditUsed:
			"AI 快速小修會扣圖片 tokens（每次約 {tokens}）。文字／Logo 燒錄疊加不扣 tokens。",
		quickFixVideoTipReady:
			"本片可加一條建議提示。重新生成影片仍會扣影片 tokens。",
		quickFixVideoTipUsed:
			"提示已套用。你仍可在「影片」步驟自行加註再生成——會扣影片 tokens。",
		quickFixTabPresets: "快速預設",
		quickFixTabRegions: "框選區域",
		quickFixTabTextEditor: "自己加字",
		quickFixTabInpaint: "涂抹修復",
		quickFixInpaintHint:
			"1）先高亮要改嘅位置（筆刷或框選）。2）擦除＝AI 用周圍背景修補。3）或輸入描述再「替換」— 只重生高亮區。",
		quickFixInpaintBrush: "塗抹要修改嘅區域（輕點可標細位）",
		quickFixInpaintClear: "清除遮罩",
		quickFixInpaintPrompt: "替換例子：改成「認識金砂石」／大理石背景",
		quickFixInpaintApply: "套用修復",
		quickFixInpaintNeedMask: "請先高亮至少一個區域。",
		quickFixInpaintEraseBtn: "擦走塗抹區域",
		quickFixInpaintFillBtn: "按描述替換",
		quickFixInpaintBrushSize: "筆刷大小",
		quickFixInpaintAiSteps:
			"用紫色蓋住成個唔要嘅框。\n「擦走」＝刪走（唔使寫字）。\n改錯字：輸入 改成「正確字」再撳替換。\n字體要完美：先擦走，再自己加字。",
		quickFixRegionHint:
			"在圖上拖拽框選要修改的區域，為每個區域填寫說明 — 一次提交可修多個區域。",
		quickFixRegionDrawHint:
			"拖動畫框，再輸入該區域內要改什麼（每次最多 5 個區域）。",
		quickFixRegionZoneLabel: "區域 {n}",
		quickFixRegionInstructionPlaceholder:
			"例如：移除這裡的 Logo / 調亮這一塊",
		quickFixRegionAddZoneBtn: "手動添加區域",
		quickFixRegionRemoveZoneBtn: "刪除",
		quickFixRegionApplyBtn: "套用區域修正",
		quickFixRegionNeedZone: "請至少框選一個區域並填寫修改說明。",
		quickFixRegionMaxZones: "每次最多 5 個區域。",
		quickFixRegionInpaintBtn: "用修補編輯器精修（筆刷 + 區域）",
		quickFixRegionInpaintDirectBtn: "直接修補區域（inpaint）",
		quickFixTextEditorHint:
			"若要精確文案與位置：先移除 AI 文字，再在圖上放置你自己的文字。",
		quickFixStripTextBtn: "移除 AI 文字並打開編輯器",
		quickFixTextOverlayHint:
			"喺圖上加你自己嘅文字、形狀同 Logo。如果要清走 AI 原有文字，先去清理步驟擦走，再喺呢度加字同燒錄。",
		quickFixTextOverlayDragHint:
			"拖圖層移動 · 旋轉手柄轉角度 · Cmd/Ctrl+Z 撤銷 · Delete 刪除已選",
		quickFixTextLayerLabel: "文字 {n}",
		quickFixTextLayerPlaceholder: "標題或副標題",
		quickFixTextStyleLabel: "樣式預設",
		quickFixTextAddLayerBtn: "添加一行文字",
		quickFixTextRemoveLayerBtn: "刪除",
		quickFixDuplicateLayerBtn: "複製",
		quickFixBringForwardBtn: "移前一層",
		quickFixSendBackwardBtn: "移後一層",
		quickFixNoLogoHint: "請先喺品牌套件上傳 Logo，再喺呢度加入",
		quickFixTextApplyBtn: "將文字合成到圖片",
		quickFixTextNeedLayer: "請至少添加一行文字。",
		quickFixTextRestoreBtn: "恢復 AI 原圖",
		quickFixShapeLayerLabel: "形狀 {n}",
		quickFixColorLabel: "顏色",
		quickFixAddShapeBtn: "添加形狀",
		quickFixFillColorLabel: "文字 / 填色",
		quickFixStrokeColorLabel: "描邊顏色",
		quickFixAlignLabel: "對齊",
		quickFixAlignLeft: "靠左",
		quickFixAlignCenter: "置中",
		quickFixAlignRight: "靠右",
		quickFixOpacityLabel: "透明度",
		quickFixStrokeWidthLabel: "邊框粗幼",
		quickFixFontSizeLabel: "字體大小",
		quickFixLayersLabel: "圖層",
		quickFixMarketingTitle: "快速版面",
		quickFixMarketingHint:
			"每次加一個元件，會自動排在現有圖層下方，可再拖拽調整。",
		quickFixShapeRect: "矩形",
		quickFixShapeCapsule: "膠囊",
		quickFixShapeCircle: "圓形",
		quickFixShapeLine: "線條",
		quickFixShapeArrow: "箭嘴",
		quickFixShapeBadge: "徽章",
		quickFixShapeButton: "按鈕",
		quickFixShapeCheck: "剔號",
		quickFixMarketingSlideNum: "頁碼",
		quickFixMarketingTitleBlock: "主標題",
		quickFixMarketingCapsule: "膠囊標籤",
		quickFixMarketingBullet: "重點列",
		quickFixMarketingDivider: "分隔線",
		quickFixMarketingCta: "行動按鈕",
		imageTextModeTitle: "圖上文字",
		imageTextModeHint:
			"揀 AI 喺圖上寫標題，定係你自己喺快速小修加字（都只計一次生成）。",
		imageTextModeIntegrated: "AI 圖上文字",
		imageTextModeIntegratedHint: "主標副標寫入生成提示詞。",
		imageTextModeTextless: "無字底圖",
		imageTextModeTextlessHint: "乾淨底圖 — 喺快速小修 → 添加文字自己排版。",
		imageTextlessPostHint:
			"無字底圖已生成 — 打開快速小修 → 添加文字，放置標題、形狀同 logo。",
		batchExportTitle: "批量導出尺寸",
		batchExportHint:
			"將當前圖片縮放至常見廣告比例（9:16、1:1、4:5、16:9），方便多平台發佈。",
		batchExportBtn: "導出全部尺寸",
		batchExportBusy: "導出中…",
		batchExportDownload: "下載 {size}",
		batchExportFailed: "導出下載失敗 — 請再試。",
		batchExportSelectedSlide: "尺寸套用到已選幻燈片：{label}",
		downloadAllSlides: "下載全部原圖",
		exportAllSlidesAllSizes: "全部幻燈片 × 全部尺寸",
		doneAllSlidesTitle: "已生成嘅全部圖片",
		downloadSlide: "下載 PNG",
		presenterPicker: {
			title: "數碼主播",
			hint: "用第二步關鍵幀面孔，或揀 digital presenter 庫存主播（唔使產品相）。",
			customKeyframe: "我嘅關鍵幀圖",
			stockAvatar: "庫存主播",
		},
		videoVariants: {
			title: "腳本同 hook 變體",
			hint: "AI 規劃多個 hook 同腳本 — 生成影片前揀一個。",
			planBtn: "規劃 3 個變體",
			planning: "規劃變體中…",
			generateAllBtn: "並行生成全部影片",
			generatingAll: "生成影片中…",
			variantRunning: "生成中…",
			downloadVariant: "下載此變體",
		},
		brandKit: {
			title: "品牌套件",
			hint: "上傳一次 Logo。影片：勾選下面「影片靜幀使用品牌 Logo」。圖片：隨時喺「編輯圖片」加 Logo，位置自由。",
			uploadLogo: "上傳 Logo",
			changeLogo: "更換 Logo",
			endWithLogoLabel: "影片靜幀使用品牌 Logo",
			endWithLogoHint:
				"只用於影片 — 俾每張影片關鍵幀／靜幀加 Logo（2 倍出圖 Token；位置由模型按畫面揀）。圖片請去「編輯圖片」隨時加 Logo。",
			useLogoLabel: "影片靜幀使用品牌 Logo",
			useLogoHint:
				"只用於影片 — 俾每張影片關鍵幀／靜幀加你嘅 Logo（2 倍出圖 Token；位置由模型按畫面揀）。圖片請去「編輯圖片」隨時、任意位置加 Logo。",
			primaryColor: "主色",
			secondaryColor: "副色",
			accentColor: "強調色",
			tagline: "預設標語",
			taglinePlaceholder: "例如：本週免運費",
			saveBtn: "儲存品牌套件",
			saving: "儲存中…",
			savedNote: "品牌套件已儲存到帳戶。",
			localOnlyNote: "已儲存喺本機（登入 + MongoDB 可雲端同步）。",
			addLogoToCanvas: "加入品牌 Logo",
			clearLogo: "移除 Logo",
		},
		pickCampaignSlideLabel: "揀一張繼續（或全部下載）",
		pickTeachingCarouselSlideLabel: "教學輪播 — 揀一張預覽（全部可下載）",
		carouselSlideCountLabel: "張",
		campaignSlideRoles: {
			hero: "主打",
			"selling-points": "賣點",
			offer: "優惠",
		},
		imageCreativeLabel: "點樣整宣傳圖？",
		imageCreativeModes: {
			"promo-ai": {
				title: "AI 宣傳圖",
				description:
					"產品相 + 你填嘅資料 → 風格跟產品同文案自動推斷（唔係固定模板）",
			},
			"reference-concept": {
				title: "跟參考圖概念",
				description:
					"保留參考廣告排版同設計元素；場地、光線配合你產品／店舖；文案用你填嘅標題",
			},
		},
		imageRefConceptLabel: "參考廣告圖（設計參考）",
		imageRefConceptHint:
			"上傳你鍾意嘅廣告設計作參考 — AI 會保留排版、裝飾元素、產品擺位姿勢；場地同光線會配合你嘅產品／店舖；主標副標用你自己填嘅字。",
		imageRefConceptActiveHint:
			"保留參考圖設計語言（排版、組件、上手/flat lay 姿勢）+ 你嘅產品相真貨 + 你嘅文案。場地、背景、光線會因應產品同店舖調整，唔會照抄參考圖原文字。",
		referenceConceptOverridesStyle:
			"參考圖模式：設計跟參考廣告；場地、光線、背景配合產品同畫面風格（例如暗黑精品只影響光線氛圍）。進階可揀「只出手」若參考圖係上手佩戴。",
		referenceConceptStyleOnlyHint:
			"已上傳風格參考 — 會把參考圖送俾 AI 出圖，跟參考片嘅視覺風格同排版語法；主標／副標同場景內容用你自己嘅主題（可以同參考片完全唔同）。",
		referenceOptionalCopyHint:
			"參考圖負責排版同風格。主標、副標會用研究「為你改寫」預填，你可隨時修改；留空則生成簡潔產品圖。",
		imageRefAutoModeNote:
			"已偵測參考廣告圖 — 今次會用「跟參考圖概念」生成（唔係淨係美化產品相）。",
		uploadPreviewLabel: "你上傳嘅原圖（未生成）",
		aiImageResultLabel: "AI 生成結果",
		originalImageLabel: "使用原圖（未經 AI）",
		videoCreativeLabel: "點樣整影片？",
		conceptVideoCreativeLabel: "點樣整概念影片？",
		conceptVideoCreativeMode: {
			title: "概念影片（由文案出片）",
			description:
				"用 Concept Wizard 填好嘅內容，唔使產品相。先寫 AI 動態 prompt，再生成。",
		},
		conceptVideoStepIntro:
			"概念模式：你嘅訊息（例如叫人唔好打架、一個打十個比喻）會變成影片 brief。揀「概念影片」→ 寫動態 prompt → 生成；唔使上傳產品相。",
		conceptVideoPromptSectionTitle: "AI 動態 Prompt（來自概念）",
		conceptVideoPromptSectionHint:
			"唔使關鍵圖 — 影片生成 會由文字出片。請先喺上面撳「AI 寫動態 Prompt」。",
		conceptVideoPromptPending:
			"請先撳上面「AI 寫動態 Prompt」— Concept Wizard 嘅內容會變成運鏡 brief。",
		conceptVideoReferenceModeTitle: "跟參考片模式",
		conceptVideoReferenceModeHint:
			"可選：上傳參考 MP4 跟節奏。概念文案仍然主導訊息。",
		conceptVideoUseReferenceInstead: "改用參考片",
		conceptVideoBackToBrief: "返回概念影片（由文案出片）",
		conceptVideoKeyframeFromSetup:
			"會用步驟 1 上傳嘅參考圖做 @Image1 — AI 會喺保留概念訊息下為呢張圖加動態。",
		conceptVideoRefKeyframeReady:
			"參考短片已分析 — 會跟 @Video1 運鏡生成概念短片，唔使上傳產品圖。",
		cinematicRecipeTitle: "概念電影感配方（推薦流程）",
		cinematicRecipeSteps: [
			"1) Step 2 生成電影感關鍵幀（或上傳參考圖）。",
			"2) 影片步驟撳「AI 寫動態 Prompt」寫運鏡／節奏文案。",
			"3) 按「規劃腳本與音樂」，揀一首 AI 音樂。",
			"4) 生成影片 — 圖片→影片，可加口播同燒錄字幕。",
		],
		conceptAnalyzeApplied: "已套用欄位 — 準備好可繼續去影片。",
		videoCreativeModes: {
			"product-assistant": {
				title: "AI 影片助手",
				description:
					"上傳產品 + 包裝 + 角度 → AI 分析相片 → 寫 影片生成 情境 prompt",
			},
			"product-promo": {
				title: "產品宣傳片",
				description: "用關鍵圖做柔和商業動態",
			},
			"motion-poster": {
				title: "動態海報",
				description:
					"開頭無字靜圖 + 結尾有字靜圖 → 影片過渡。唔係普通產品 I2V。",
			},
			"social-drip": {
				title: "三分屏 Social drip",
				description:
					"迷因三分屏＋下落穿越——唔係生活寫實 TVC。生成前請睇清適配。",
			},
			blockbuster: {
				title: "大片級出場",
				description:
					"3 張圖 → 9 秒單鏡：紙箱飛出，產品（或 Logo／吉祥物）揭曉。唔係分鏡。",
			},
			"vacuum-inflate": {
				title: "真空充氣",
				description:
					"產品留喺畫面：真空膜貼緊 → 充氣成泡 → 4 秒過渡。",
			},
			"creative-motion": {
				title: "產品創意動效",
				description:
					"揀方案 → 自動首尾幀 → 4 秒视频創意動效。",
			},
			"hand-throw-scene": {
				title: "手拋萬物變實景",
				description:
					"掌心微縮 → 真實場景尾幀 → 約 6 秒拋出過渡。",
			},
			"product-explode": {
				title: "產品拆解（風格化）",
				description:
					"完整棚拍 → 懸浮零件尾幀 → 約 4 秒柔和拆解（非精準 CAD）。",
			},
			
			"ecom-orbit": {
				title: "電商環繞",
				description:
					"一張產品圖 → 6s 環繞/仰拍/旋轉。身份鎖定轉台廣告。",
			},
			"object-lock": {
				title: "物體鎖定運鏡",
				description:
					"鏡頭黏在商品上，背景流動。SnorriCam 一鏡。",
			},
			"macro-snap": {
				title: "微距物理 / 美食碎裂",
				description:
					"滴落、碎屑、斷裂 — 在你的美食/材質靜物上做物理。",
			},
			"luxury-tabletop": {
				title: "奢侈品桌面+手",
				description:
					"大理石桌面，優雅手部互動，連續奢侈品廣告。",
			},
			"beauty-mv": {
				title: "美妝/角色一鏡 MV",
				description:
					"臉或吉祥物鎖定，柔光環繞 — 10s MV/美妝一鏡。",
			},
			"imitate-ad": {
				title: "仿拍這支廣告",
				description:
					"產品圖 + 參考 MP4 → 學運鏡，保留你的 SKU。",
			},
			"neon-on-real": {
				title: "霓虹疊實景",
				description:
					"真實影片 + 發光霓虹線稿在場景裡遊走。",
			},
			"food-bullet-time": {
				title: "美食子彈時間",
				description:
					"打卡美食爆裂定格 → 6s 鏡頭環繞（3D 食物爆裂）。",
			},
			"c4d-motion": {
				title: "C4D 動態視覺",
				description:
					"黑場品牌開場 → 抽象材質 → 產品揭幕（頂級三維動態視覺）。",
			},
			"h3-showreel": {
				title: "秀場一鏡",
				description:
					"主體靜圖 + 方案卡（汽車 · 鍵盤 · 抽象）。允許動能大字，可選 16:9。參考片選填。",
			},
			"h3-sphere-mg": {
				title: "球體運動圖形",
				description:
					"先球體 MG 世界，再把產品揭出嚟當英雄。允許動能大字。",
			},
			"h3-movie-title": {
				title: "電影標題",
				description:
					"電影標題卡 + 多格擦除。允許設計感大字；唔使參考片。",
			},
			"h3-lifestyle": {
				title: "生活人物",
				description:
					"真人喺生活場景使用產品 — 唔係美妝 MV，唔係純靜物。",
			},
"reference-concept": {
				title: "跟參考片概念",
				description:
					"產品 + 參考 MP4 → 跟運鏡同剪輯概念（唔係逐格複製）",
			},
			"image-to-video": {
				title: "圖片變影片",
				description: "用步驟 2 嘅 AI 圖 — 最適合「先要圖後要片」",
			},
		},
		motionPosterHint:
			"首尾幀：兩張設計海報靜圖（開頭無字、結尾大標題）。單鏡出片 由開頭過渡到結尾，產品同字一齊郁。計 2 圖 + 1 短片。",
		motionPosterBuildingStill: "第 1/3 步：無字開頭靜圖…",
		motionPosterBuildingEnd: "第 2/3 步：有字結尾靜圖…",
		motionPosterAnimatingCard: "第 3/3 步：影片開頭→結尾過渡中…",
		motionPosterArtStyleTitle: "海報畫面",
		motionPosterArtStyleHint:
			"AI 靜圖風格 — 寫實、3D、漫畫、膠片…。動態係之後先加。預設寫實相片。",
		motionPosterDialectTitle: "海報動態",
		motionPosterDialectHint:
			"同一套即夢首尾幀，唔同節奏（出字、3D 卡、視差、倒液…）。自動會揀啱嘅——再生成試另一種。",
		motionPosterDialectAuto: "自動 · 適合產品",
		motionPosterDialects: {
			"card-warp": {
				title: "3D 卡片",
				desc: "平面開頭 → 卡紙彎曲＋大標題",
			},
			"kinetic-type": {
				title: "文字揭幕",
				desc: "無字遠景 → 拉近＋大字",
			},
			parallax: { title: "層次視差", desc: "廣景 → 特寫＋大標題" },
			"light-sweep": { title: "掃光", desc: "暗影 → 轉面掃光＋字" },
			"liquid-reveal": {
				title: "液體揭幕",
				desc: "靜杯 → 倒液／蒸汽＋字",
			},
			"scene-breathe": { title: "氛圍呼吸", desc: "靜氣 → 定格＋大標題" },
			"designed-poster": {
				title: "設計海報",
				desc: "主視覺 → 你填嘅標題＋標語上圖",
			},
		},
		motionPosterTypeOverlayNote: "疊字",
		motionPosterTypeOverlaySkipped: "疊字未加上 — 而家係無字氣氛片",
		motionPosterNeedKeyframe: "動態海報請先上傳產品相、場景相或關鍵幀。",
		blockbusterHint:
			"一條 9 秒單鏡：貨車撞天橋、紙箱炸開、再升起主體。上傳主體 + 包裝。請生成天橋貨車首幀——冇呢張，模型好容易變成產品棚拍。",
		blockbusterHeroTitle: "主體（必填）",
		blockbusterHeroHint: "清晰產品圖。結尾升起嘅就係呢件。",
		blockbusterHeroHintConcept:
			"Logo 或吉祥物。飛出嘅卡片會揭曉呢個——冇上傳就用品牌套件 Logo。",
		blockbusterPackTitle: "包裝／飛出道具",
		blockbusterPackHint:
			"上傳品牌紙箱效果最好；留空就用 Brand kit Logo 印喺飛出嘅箱上。",
		blockbusterPackHintConcept:
			"品牌卡片、貼紙。留空就用 Brand kit Logo 做飛出道具。",
		blockbusterSceneTitle: "場景首幀",
		blockbusterSceneHint:
			"貨車上路靜圖＝開場第一幀。請生成黃昏天橋（貨箱堆得過高）。盡量唔好留空。",
		blockbusterGenerateSceneBtn: "生成場景靜圖",
		blockbusterGenerateSceneBusy: "正在生成天橋靜圖…",
		blockbusterNeedHero: "請先上傳產品相（概念模式可上傳 Logo／吉祥物）。",
		blockbusterNeedConceptHero: "請上傳 Logo／吉祥物，或喺品牌套件存好 Logo。",
		blockbusterAnimating: "正在生成 9 秒單鏡…",
		blockbusterFinishing: "收尾中：字幕／英雄定格／Logo…",
		blockbusterFinishFailed: "Blockbuster 收尾失敗，請重試。",
		blockbusterControlsTitle: "登場設定（類似 Social drip）",
		blockbusterControlsBadge: "燒進成片",
		blockbusterControlsHint:
			"節奏改 AI 一鏡。英雄定格同 Brand kit Logo 喺生成後疊加。字幕請之後自己加。",
		blockbusterTimingLabel: "故事節奏",
		blockbusterTimingClassic: {
			title: "經典",
			desc: "0–2 貨車 · 2–4 撞擊 · 4–6 浮現 · 6–9 英雄",
		},
		blockbusterTimingEarly: {
			title: "提前揭曉",
			desc: "箱子更短 · 產品更早 · 英雄更長（面霜罐）",
		},
		blockbusterCaptionLabel: "畫面文案（可選）",
		blockbusterCaptionBadge: "預設關閉",
		blockbusterCaptionPlaceholder: "一行一句…",
		blockbusterCaptionHint: "只有勾選先會燒進成片。唔勾選可以之後自己加字幕。",
		blockbusterBurnCaptionsLabel: "而家燒進字幕（一般保持關閉）",
		blockbusterHeroHoldLabel: "揭曉後英雄放大 + 約 1.5 秒定格",
		blockbusterEndLogoLabel:
			"Brand kit Logo 片尾右下（約 0.8 秒）。冇上傳包裝圖就會用 Logo 印喺飛出嘅箱上。",

		h3ShotNeedHero: "可上傳產品圖，或用 AI 生成靜圖。",
		h3ShotNeedConceptHero:
			"可上傳 Logo/吉祥物、用品牌套件 Logo，或用 AI 生成靜圖。",
		h3ShotNeedReferenceVideo:
			"請上傳參考 MP4（仿拍、霓虹疊實景必填）。",
		h3ShotGenerateStillBtn: "生成靜圖",
		h3ShotConceptHeroTitle: "主體鎖定靜圖",
		h3ShotPhotoTitle: {
			"food-bullet-time": "人＋食物照片",
			"h3-lifestyle": "人＋產品照片",
		},
		h3ShotReelHint: {
			"imitate-ad":
				"必填：參考廣告 MP4 — 只學運鏡／剪輯節奏（唔抄參考品）。",
			"neon-on-real":
				"必填：真實實景 MP4 — 呢條片係霓虹場景底。",
			"h3-showreel":
				"選填：上傳秀場 MP4 可跟運鏡／節奏。唔傳就由方案卡帶一鏡。",
		},
		h3ShotHeroHint: {
			"ecom-orbit":
				"必填：上傳產品圖。環繞該 SKU。",
			"object-lock":
				"必填：上傳產品圖。鏡頭黏住該商品。",
			"macro-snap":
				"必填：上傳美食或材質近拍。物理效果基於該圖。",
			"luxury-tabletop":
				"必填：上傳產品圖作為桌面主視覺。",
			"beauty-mv":
				"必填：上傳人臉或角色靜圖作身份鎖定。",
			"imitate-ad":
				"必填：產品或 Logo 靜圖作主體鎖定（配下方參考 MP4）。",
			"neon-on-real":
				"選填：產品／Logo／吉祥物靜圖鎖霓虹形狀同色。上方 MP4 先係必填。",
			"food-bullet-time":
				"必填：人+食物打卡照（臉與菜要清楚）。純 Logo 唔夠。",
			"c4d-motion":
				"必填：產品圖（概念可用 Logo／吉祥物）。以該主體做黑場 C4D 揭幕。",
			"h3-showreel":
				"必填：產品或 Logo／吉祥物靜圖作主體鎖定。允許動能大字。秀場 MP4 選填。",
			"h3-sphere-mg":
				"必填：產品圖（概念可用 Logo／吉祥物）。球體包裹你嘅身份；唔使參考片。",
			"h3-movie-title":
				"必填：產品圖（概念可用 Logo／吉祥物）。標題卡＋多格；允許設計感大字。",
			"h3-lifestyle":
				"必填：人+產品生活照（臉同產品要清楚）。純 Logo 偏弱 — 可用 AI 生成生活靜圖。",
		},
		h3ShotHint: {
			"ecom-orbit":
				"請先上傳產品圖 — 未上傳前無法按生成。之後 環繞約 6s。",
			"object-lock":
				"請先上傳產品圖 — 未上傳前無法按生成。鏡頭黏住商品。",
			"macro-snap":
				"請先上傳美食／材質圖 — 未上傳前無法按生成。再做滴落／碎裂。",
			"luxury-tabletop":
				"請先上傳產品圖 — 未上傳前無法按生成。再接手部互動約 8s。",
			"beauty-mv":
				"請先上傳人像／角色圖 — 未上傳前無法按生成。再做 MV 環繞約 10s。",
			"imitate-ad":
				"請上傳產品圖 + 參考 MP4 — 兩者齊備才能生成。",
			"neon-on-real":
				"請上傳真實 MP4（必填）。可把 Logo／吉祥物放進「產品照片」作霓虹身份；也可只用品牌包 Logo。霓虹在場景中移動。",
			"food-bullet-time":
				"請先上傳人+食物打卡照 — 未上傳前無法按生成。鏡頭環繞食物爆裂定格約 6s。",
			"c4d-motion":
				"請先上傳產品圖（概念可用 Logo／吉祥物）— 未上傳前無法按生成。再做約 8s 黑場 C4D 揭幕。",
			"h3-showreel":
				"請先上傳主體靜圖 — 未上傳前無法按生成。方案卡帶一鏡。可選 16:9；允許動能大字。參考片選填。",
			"h3-sphere-mg":
				"請先上傳產品圖（概念可用 Logo／吉祥物）— 未上傳前無法按生成。再做約 8s 球體運動圖形一鏡。",
			"h3-movie-title":
				"請先上傳產品圖（概念可用 Logo／吉祥物）— 未上傳前無法按生成。再做約 8s 電影標題／多格一鏡。",
			"h3-lifestyle":
				"請先上傳人+產品生活照 — 未上傳前無法按生成。再做約 8s 生活人物一鏡。",
		},
		macroSnapIntensityTitle: "碎裂／滴落強度",
		macroSnapIntensityHint:
			"餅乾／食物裂開同醬汁湧出嘅力度。開場仍會先見完整產品。",
		macroSnapIntensity: {
			weak: {
				title: "弱",
				desc: "細裂紋 + 輕滴",
			},
			medium: {
				title: "中",
				desc: "清晰裂縫 + 可見滴落",
			},
			strong: {
				title: "強",
				desc: "戲劇性掰開 + 大量湧出",
			},
		},
		h3ShowreelAspectTitle: "秀場畫幅",
		h3ShowreelAspectHint:
			"9:16 適合資訊流；16:9 適合橫屏／演示秀場。預設 16:9。",
		h3ShowreelAspect: {
			"9:16": {
				title: "9:16",
				desc: "直式資訊流",
			},
			"16:9": {
				title: "16:9",
				desc: "橫式秀場",
			},
		},
		h3ShowreelSchemeTitle: "秀場方案卡",
		h3ShowreelSchemeHint:
			"方案卡決定運鏡語言。參考 MP4 選填 — 想跟某一支片請用「仿拍這支廣告」。",
		h3ShowreelSchemeAuto: "自動 · 啱產品",
		h3ShowreelSchemes: {
			"car-cinematic": {
				title: "汽車電影感",
				desc: "夜色路面 · 低機位 · 光軌",
			},
			"keyboard-tech": {
				title: "鍵盤科技",
				desc: "鍵帽微距 · RGB · 科技網格",
			},
			"abstract-morph": {
				title: "抽象變形",
				desc: "液態金屬／體素 → 產品揭幕",
			},
		},
		h3SphereMgSchemeTitle: "球體風格",
		h3SphereMgSchemeHint:
			"一顆 C4D 球世界開場，再把產品揭出嚟。汽車用水晶。唔係空白星球。",
		h3SphereMgSchemeAuto: "自動 · 啱產品",
		h3SphereMgSchemes: {
			"crystal-glass": {
				title: "水晶玻璃",
				desc: "球內可見產品",
			},
			"chrome-spin": {
				title: "鉻面旋轉",
				desc: "鏡面鉻球自轉",
			},
			"liquid-mercury": {
				title: "液態汞",
				desc: "流體金屬凝聚",
			},
			"neon-core": {
				title: "霓虹內核",
				desc: "暗球 + 能量核",
			},
			"matte-planet": {
				title: "啞光行星",
				desc: "C4D 啞光圓球（唔係地球）",
			},
		},
		recipePathUxTitles: {
			need: "你需要",
			attention: "請注意",
			output: "你會得到",
		},
		recipePathUx: {
			"ecom-orbit": {
				need: ["產品圖（清楚包裝／英雄位）"],
				attention: ["SKU 外形、Logo、配色會鎖定", "乾淨背景最好 — 避免拼貼雜圖"],
				output: ["約 6 秒單鏡環繞／傾斜產品"],
			},
			"object-lock": {
				need: ["產品圖（盡量填滿畫面）"],
				attention: ["產品保持清晰置中", "移動的是背景，不是商品"],
				output: ["約 6 秒物體鎖定（SnorriCam）短片"],
			},
			"macro-snap": {
				need: ["美食或材質近拍圖"],
				attention: [
					"同一道菜／材質身份 — 不要換盤",
					"開場先見完整產品，再戲劇性裂開 + 熔融湧出（不要細線裂紋）",
					"預期明顯斷裂／碎屑／滴落（不是子彈時間定格）",
				],
				output: ["約 6 秒微距物理一鏡"],
			},
			"luxury-tabletop": {
				need: ["產品圖"],
				attention: ["奢華材質與 Logo 鎖定", "一次優雅手部互動"],
				output: ["約 8 秒桌面奢華一鏡"],
			},
			"beauty-mv": {
				need: ["人臉或吉祥物／角色靜圖"],
				attention: ["身份鎖定 — 禁止換臉", "柔光 MV 環繞"],
				output: ["約 10 秒美妝／MV 一鏡"],
			},
			"imitate-ad": {
				need: ["產品圖", "參考 MP4（運鏡語言）"],
				attention: ["保留你的 SKU — 不複製參考片產品", "運鏡／節奏跟隨參考片"],
				output: ["約 8 秒仿拍廣告（single-clip）"],
			},
			"neon-on-real": {
				need: ["真實／參考 MP4", "可選產品／Logo／吉祥物靜圖（霓虹身份）"],
				attention: [
					"實景保留 — 霓虹是疊加而非整段 CGI",
					"上傳 Logo／吉祥物可鎖定霓虹外形；不上傳則用通用霓虹符號",
				],
				output: ["約 8 秒霓虹疊實景一鏡"],
			},
			"food-bullet-time": {
				need: [
					"人+食物／飲品打卡生活照（臉與菜要清楚）",
					"朝鏡頭舉起食物 — 卷餅、碟裝、波霸都得",
					"單靠 Logo 唔夠 — 畫面要有真實食物",
				],
				attention: [
					"保持同一道菜 — 不要憑空加食材",
					"目標：戲劇性爆裂定格（層次＋碎屑＋醬汁）＋鏡頭向右環繞，人幾乎靜止",
					"臉部盡量保持可辨；咖啡店／街景背景更佳",
				],
				output: ["約 6 秒美食子彈時間／3D 食物爆裂打卡片"],
			},
			"c4d-motion": {
				need: ["產品圖（概念可用 Logo／吉祥物）", "主體要清晰，方便黑場鎖定"],
				attention: [
					"外形、Logo、配色鎖定 — 唔好換成另一件商品",
					"黑場同抽象材質服務你嘅產品，唔係抄 Nike",
					"一鏡到底連續運動 — 唔係硬切蒙太奇",
				],
				output: ["約 8 秒 C4D／品牌動態視覺一鏡"],
			},
			"h3-showreel": {
				need: [
					"產品圖（概念可用 Logo／吉祥物）",
					"參考秀場 MP4 選填（運鏡／節奏）。唔傳就由方案卡帶一鏡",
				],
				attention: [
					"選方案卡：汽車電影感 · 鍵盤科技 · 抽象變形（自動按產品名）",
					"保留你嘅主體 — 唔抄參考片入面嘅原產品",
					"允許設計感動能大字；禁止字幕條／UI",
					"抽象變形最通用；汽車／鍵盤係專用鏡頭語言",
				],
				output: ["約 8 秒 秀場一鏡（9:16 或 16:9）"],
			},
			"h3-sphere-mg": {
				need: [
					"產品圖（概念可用 Logo／吉祥物）",
					"清晰主體作球體身份鎖定（唔使參考片）",
				],
				attention: [
					"汽車選水晶 — 先喺球內，再把車揭到鏡頭前",
					"開場可以係抽象 MG＋動能大字；結尾必須係產品英雄",
					"唔係空白灰星球，唔係 NASA 地球",
					"靜圖如果只係一顆球，先重做靜圖再出片",
				],
				output: ["約 8 秒球體運動圖形一鏡"],
			},
			"h3-movie-title": {
				need: ["產品圖（概念可用 Logo／吉祥物）", "清晰主體作標題卡鎖定"],
				attention: [
					"允許電影標題／多格擦除 — 唔係字幕條",
					"各格保持同一主體身份",
					"唔使參考片 — 有示例 MP4 請用仿拍廣告",
				],
				output: ["約 8 秒電影標題／多格一鏡"],
			},
			"h3-lifestyle": {
				need: ["人+產品生活照（臉同產品要清楚）", "純 Logo 偏弱 — 需要使用場景"],
				attention: [
					"生活使用場景 — 唔係美妝 MV 環繞肖像",
					"保持同一人物同產品身份",
					"咖啡館／街道／居家場景最啱",
				],
				output: ["約 8 秒生活人物一鏡"],
			},
			"designed-poster": {
				need: ["產品圖", "標題（畫面主文案）"],
				attention: [
					"你填嘅標題＋標語會原句畫上海報",
					"商業 feed 海報排版",
					"鎖定單張 — 無 A/B 或 campaign",
				],
				output: ["一張設計商業海報靜圖"],
			},
			"parts-poster": {
				need: ["產品圖", "標題"],
				attention: ["爆炸／零件標註保持技術感", "鎖定單張"],
				output: ["一張零件拆解海報靜圖"],
			},
			"gaming-cover": {
				need: ["產品或英雄圖", "標題（封面大字）"],
				attention: ["AAA 封面感 — 字嵌進場景", "上傳圖身份鎖定"],
				output: ["一張電競封面靜圖"],
			},
			"sports-big-words": {
				need: ["產品或運動員圖", "標題（驅動巨大動作詞）"],
				attention: ["巨大疊層字＋動作能量", "高飽和運動字 — 主體要清晰"],
				output: ["一張運動大字海報靜圖"],
			},
			"jelly-3d": {
				need: ["產品、Logo 或名稱（果凍造型）", "標題"],
				attention: ["極簡透亮 3D — 少量文字", "不要雜亂生活場景"],
				output: ["一張果凍／玻璃 3D 海報靜圖"],
			},
			"vacuum-inflate": {
				need: ["產品圖（概念可用 Logo／吉祥物靜圖）", "清晰主體 — 單靠文字／主題唔夠"],
				attention: ["你嘅產品係主角 — 包膜充氣，唔會掉包", "手機就係手機，唔會變成虛構袋裝"],
				output: ["約 2 張靜圖 + 4 秒真空→充氣過渡"],
			},
			"creative-motion": {
				need: ["產品圖（概念可用 Logo／吉祥物靜圖）", "揀方案卡（或自動）"],
				attention: ["身份鎖定上傳圖 — 噱頭服務你嘅產品", "首尾靜圖再短過渡 — 唔係分鏡"],
				output: ["約 2 張靜圖 + 4 秒方案過渡"],
			},
			"hand-throw-scene": {
				need: ["產品／地標圖（概念可用 Logo／吉祥物靜圖）", "掌心微縮要見到輪廓"],
				attention: ["由掌心到實景結尾都係同一個主體", "約 6 秒拋出過渡 — 唔係多分鏡拼接"],
				output: ["約 2 張靜圖 + 6 秒拋出→實景過渡"],
			},
			"product-explode": {
				need: ["產品圖（概念可用 Logo／吉祥物靜圖）", "棚拍可讀嘅主體（唔好太細 crop）"],
				attention: ["風格化懸浮零件 — 唔係精準 CAD 內部", "完整主角 → 拆解靜圖 → 短拆解片"],
				output: ["約 2 張靜圖 + 4 秒風格化拆解過渡"],
			},
			"motion-poster": {
				need: ["產品圖（產品）— 或 Logo／主題 + 可選靜圖（概念）", "結尾海報要用嘅標題"],
				attention: ["兩張設計靜圖：無字開頭 → 有字結尾", "產品同字一齊過渡 — 唔係分鏡"],
				output: ["約 2 張靜圖 + 1 段短過渡"],
			},
			"social-drip": {
				need: ["產品圖（產品）— 或主題／靜圖（概念）", "穿越隱喻（或自動）"],
				attention: ["三分屏 meme 排版 — 唔係寫實生活廣告", "唔用參考 MP4 — 呢個配方自己定 layout"],
				output: ["首尾靜圖 + 短過渡"],
			},
			blockbuster: {
				need: ["產品主圖（概念可用 Logo／吉祥物靜圖）", "包裝／品牌磚 + 可選場景板"],
				attention: ["一鏡物流入場 — 唔係分鏡拼接", "箱子之後先出你嘅主角 — 身份鎖定"],
				output: ["約 9 秒單鏡入場"],
			},
		},
		h3ShotGenerateStillBusy: {
			"ecom-orbit": "AI 產品圖…",
			"object-lock": "AI 靜圖…",
			"macro-snap": "AI 美食圖…",
			"luxury-tabletop": "AI 奢侈品圖…",
			"beauty-mv": "AI 人像…",
			"imitate-ad": "AI 產品圖…",
			"neon-on-real": "AI 霓虹鎖定靜圖…",
			"food-bullet-time": "AI 食物爆裂定格…",
			"c4d-motion": "AI 黑場 C4D 靜圖…",
			"h3-showreel": "AI 秀場靜圖…",
			"h3-sphere-mg": "AI 球體 MG 靜圖…",
			"h3-movie-title": "AI 電影標題靜圖…",
			"h3-lifestyle": "AI 生活人物靜圖…",
		},
		h3ShotAnimating: {
			"ecom-orbit": "正在生成電商環繞片…",
			"object-lock": "正在生成物體鎖定運鏡…",
			"macro-snap": "正在生成微距物理片…",
			"luxury-tabletop": "正在生成奢侈品桌面片…",
			"beauty-mv": "正在生成美妝/MV 一鏡…",
			"imitate-ad": "正在生成仿拍廣告…",
			"neon-on-real": "正在生成霓虹疊實景…",
			"food-bullet-time": "正在生成美食子彈時間…",
			"c4d-motion": "正在生成 C4D 動態視覺…",
			"h3-showreel": "正在生成 秀場一鏡…",
			"h3-sphere-mg": "正在生成 球體運動圖形…",
			"h3-movie-title": "正在生成 電影標題…",
			"h3-lifestyle": "正在生成 生活人物…",
		},
		socialDripHint:
			"三分屏迷因：產品 → 假 IG 欄 → 可愛精緻卡通。有嘢垂直落下穿過中間欄。唔係寫實生活廣告。",
		socialDripPlanningMetaphor: "正在諗穿越動作…",
		socialDripBuildingStill: "第 1/3 步：三分屏開頭靜圖…",
		socialDripBuildingEnd: "第 2/3 步：三分屏結尾靜圖…",
		socialDripAnimatingCard: "第 3/3 步：影片開頭→結尾過渡中…",
		socialDripMetaphorTitle: "穿越動作",
		socialDripMetaphorHint:
			"自動會按品類揀合適穿越。揀錯（例如精華用張嘴接汁）會喺下面警示。",
		socialDripMetaphorAuto: "自動 · AI 揀",
		socialDripNoReferenceNote: "三分屏唔用參考片——版面由呢條 recipe 控制。",
		socialDripNeedKeyframe: "三分屏請先上傳產品相，或填概念主題。",
		socialDripChromeTitle: "Instagram 欄（影片中間）",
		socialDripChromeBadge: "會入片",
		socialDripChromeHint:
			"呢兩個欄位會出現喺成片中間嘅假 IG 欄——唔只係 prompt。",
		socialDripChromePreviewLabel: "預覽",
		socialDripChromeHandleLabel: "發佈者名稱 (@handle)",
		socialDripChromeHandlePlaceholder: "alchemy_ai_lab",
		socialDripChromeCaptionLabel: "欄下 Caption",
		socialDripChromeCaptionPlaceholder: "可以再芝士一點嗎？",
		socialDripChromeCaptionLimit: "盡量短——最多 {n} 字（太長會糊）。",
		socialDripPourControlsTitle: "芝士／倒出樣式",
		socialDripPourControlsHint:
			"漢堡／溶芝士：揀「溢喺產品上」，液體由食物層溢出，唔好由底部噴出。",
		socialDripPourOriginLabel: "液體由邊度出",
		socialDripPourOrigins: {
			overflow: {
				title: "溢喺產品上",
				desc: "由芝士層／邊緣溢出（漢堡 meme）",
			},
			tip: {
				title: "由瓶嘴／尖端",
				desc: "只適合樽或擠壓嘴",
			},
			center: {
				title: "中央滴落",
				desc: "由中間一條幼流",
			},
		},
		socialDripPourAmountLabel: "分量",
		socialDripPourAmounts: {
			light: "少",
			medium: "中",
			extra: "多",
		},
		
		vacuumInflateHint:
			"產品必須看得見。用真空膜包住你嘅商品再充氣成透明泡，約 4 秒過渡。相機會留成手機，唔會變成第二種包裝袋。",
		vacuumInflateBuildingStill: "第 1/3 步：癟袋開頭靜圖…",
		vacuumInflateBuildingEnd: "第 2/3 步：充氣結尾靜圖…",
		vacuumInflateAnimatingCard: "第 3/3 步：充氣過渡中…",
		vacuumInflateNeedKeyframe: "請先上傳產品圖（概念用 Logo／吉祥物靜圖 — 單靠文字唔夠）。",
		creativeMotionHint:
			"產品創意動效：揀方案卡，自動生成首尾幀，再 約 4 秒影片。",
		creativeMotionBuildingStill: "第 1/3 步：創意動效開頭靜圖…",
		creativeMotionBuildingEnd: "第 2/3 步：創意動效結尾靜圖…",
		creativeMotionAnimatingCard: "第 3/3 步：方案過渡中…",
		creativeMotionNeedKeyframe: "請先上傳產品圖（概念用 Logo／吉祥物靜圖 — 單靠文字唔夠）。",
		handThrowHint:
			"手拋萬物變實景：AI 生成掌心+微縮開頭同真實場景結尾，再由約 6 秒影片過渡。最好有清晰產品／地標圖。",
		handThrowBuildingStill: "第 1/3 步：掌心微縮開頭靜圖…",
		handThrowBuildingEnd: "第 2/3 步：真實場景結尾靜圖…",
		handThrowAnimatingCard: "第 3/3 步：拋出→實景過渡中…",
		handThrowNeedKeyframe: "請先上傳產品圖（概念用 Logo／吉祥物靜圖 — 單靠文字唔夠）。",
		productExplodeHint:
			"完整組裝棚拍（耳塞要坐喺盒入面）→ 零件沿組裝軸分開 — 唔係耳塞飛出充電盒。約 4 秒過渡。風格化零件，唔係精準 CAD。",
		productExplodeBuildingStill: "第 1/3 步：完整產品棚拍靜圖…",
		productExplodeBuildingEnd: "第 2/3 步：懸浮零件拆解靜圖…",
		productExplodeAnimatingCard: "第 3/3 步：拆解過渡中…",
		productExplodeNeedKeyframe: "請先上傳產品圖（概念用 Logo／吉祥物靜圖 — 單靠文字唔夠）。",
		creativeMotionSchemeTitle: "方案卡",
		creativeMotionSchemeHint:
			"同一套首尾幀過渡，唔同創意。自動會揀啱嘅——再生成試另一種。",
		creativeMotionSchemeAuto: "自動 · 啱產品",
		creativeMotionSchemes: {
			"juice-burst": { title: "檸檬爆汁", desc: "乾燥產品 → 果汁飛濺開場" },
			"label-peel": { title: "復古標籤撕揭", desc: "封簽 → 撕揭揭幕" },
			"squeeze-reveal": { title: "擠出變場景", desc: "擠出珠 → 微縮場景" },
			"cap-rays": { title: "瓶蓋光芒", desc: "合蓋 → 旋開＋光束" },
			"body-breathe": { title: "管身呼吸", desc: "略癟 → 飽滿呼吸" },
			"shredder-restore": { title: "碎紙機還原", desc: "碎條 → 產品還原" },
		},
socialDripFitTitle: "呢個格式可以／唔可以做咩",
		socialDripFitGoodTitle: "適合",
		socialDripFitGoodItems: [
			"底欄＝可愛精緻卡通（開心迷因感覺）",
			"餐飲：醬汁倒入卡通角色嘴",
			"美妝：幼精華滴落卡通面頰（唔係飲精華）",
			"珠寶閃粉／時裝彩紙／電子能量束越過假 IG 欄",
		],
		socialDripFitBadTitle: "唔適合 — 請換第二條影片路",
		socialDripFitBadItems: [
			"真實／寫實人物趴枱底接液體（感覺唔舒服）",
			"粗糙簡筆塗鴉（卡通一定要精緻可愛）",
			"非食品用張嘴吞／飲（精華、電子產品…）",
			"多鏡頭 TVC、電影敘事、或複製參考片",
		],
		socialDripFitLevels: {
			good: "適合用三分屏",
			caution: "可以試，但動作可能會怪",
			mismatch: "唔啱 — 請換穿越動作或影片風格",
		},
		socialDripFitReasons: {
			good_fnb: "餐飲倒汁 gag 啱呢個格式。",
			good_beauty_skin: "美妝要用滴落面頰，唔好張嘴飲。",
			good_sparkle: "珠寶閃粉落到手／膊啱用。",
			good_fashion: "時裝用彩紙或布帶下落。",
			good_tech: "電子產品用能量束落到塗鴉。",
			good_wellness: "養生用蒸汽或花瓣落到塗鴉。",
			good_general: "請揀同產品匹配嘅下落隱喻。",
			good_concept_falling:
				"概念可以用——要睇到素材／海報落下，唔好淨係抽象光柱。",
			caution_mouth_nonfood: "張嘴接汁係餐飲 gag — 非食品會怪。",
			caution_beauty_pour: "精華倒入口似飲精華。請用「精華滴」。",
			caution_concept_pour: "概念主題少用張嘴接汁 — 建議彩紙／花瓣／光束。",
			caution_concept_abstract:
				"呢個概念太抽象。三分屏要見到素材落下，或者改用動態海報。",
			caution_no_product_photo: "請加產品相，下落先有清晰起點。",
			mismatch_no_falling: "呢個產品冇自然下落故事 — 試圖片→影片。",
			mismatch_wrong_metaphor: "呢個穿越動作同產品品類唔夾。",
		},
		socialDripFitSuggest: "建議穿越：{metaphor}",
		socialDripMetaphors: {
			pour: { title: "倒汁", desc: "醬汁入塗鴉嘴 — 只適合餐飲" },
			glow: { title: "精華滴", desc: "滴管幼精華落面頰 — 美妝" },
			sparkle: { title: "閃粉瀑布", desc: "密集閃粉直落 — 珠寶時裝" },
			steam: { title: "蒸汽", desc: "濃蒸汽直落 — 咖啡、SPA、家居" },
			confetti: { title: "彩紙", desc: "彩紙直落 — 時裝／新品" },
			"light-streak": { title: "能量束", desc: "粗光束落到塗鴉 — 電子" },
			fabric: { title: "布帶下落", desc: "布帶直落 — 軟性時裝" },
			petals: { title: "花瓣", desc: "花瓣直落 — 養生／概念" },
		},
		storyboardShotMapTitle: "分鏡圖（生成前預覽）",
		storyboardLookBibleLabel: "Look bible（色調鎖定）：",
		storyboardShotMapEmptyStill: "靜幀待生成",
		tvcShotRoles: {
			establish: "開場建立",
			macro: "細節特寫",
			"logo-trace": "Logo 掃光",
			orbit: "環繞運鏡",
			lifestyle: "生活場景",
			payoff: "收束／行動",
		},
		tvcShotJobs: {
			establish: "我喺邊？主角出現喺一個世界。",
			macro: "點解高級？質感 / Logo。",
			"logo-trace": "掃過標誌，幾何唔可以跑。",
			orbit: "郁起來／使用。轉台或手持。",
			lifestyle: "生活場景，產品仲係主角。",
			payoff: "記住／落單。包裝 + 賣點。",
		},
		storyboardTapToReview: "撳入去檢查",
		storyboardCellReviewed: "已睇過",
		storyboardApproveNeedLookHint:
			"請先撳開每一格。影片只會郁你鎖住嘅錯 — 壞格請重產嗰格，唔好指望生成影片嚟遮。",
		storyboardApproveCheckbox: "呢啲靜幀得，繼續去做片",
		storyboardApproveHint:
			"想睇大啲可以撳格。壞格隨時重產。靜幀一變，確認會取消。",
		storyboardApproveRequiredHint: "請先確認九宮格靜幀，先至可以生成影片。",
		storyboardPlanLightingLabel: "燈光（英文，可改）",
		videoSettingsTitle: "影片設定",
		videoReferenceOutputSettingsTitle: "輸出片長與畫質",
		videoReferenceOutputSettingsHint:
			"參考短片已決定節奏與動態——請選擇生成影片的片長與清晰度。",
		videoSetupOutputSettingsTitle: "輸出片長與畫質（影響收費）",
		videoSetupOutputSettingsHint:
			"Token 按影片片長同解像度計費 — 請喺上傳參考片／分析前先揀。參考 MP4 可以好長；實際出片以呢度嘅片長為準（AI 會將參考節奏壓縮成完整短片）。",
		videoSettingsResolution: "解像度",
		videoResolutionPlanHint: "你目前方案最高 {max}。",
		videoResolutionUpgradeLink: "升級以解鎖更高解像度",
		videoSettingsDuration: "片長",
		videoSettingsMotion: "鏡頭 / 動態",
		videoSettingsCreativity: "動態豐富度",
		videoCreativityLevels: {
			subtle: "柔和 — 輕微 zoom",
			lively: "豐富 — 多種運鏡（推薦）",
			cinematic: "電影感 — 多段節奏",
		},
		videoAutoSecondFrame: "自動整第二個畫面（一張相 → 影片更有變化）",
		videoAutoSecondFrameHint:
			"AI 會生成另一個角度（例如上手佩戴）作為結尾畫面，影片生成 由頭行到尾 — 唔係淨係 zoom。",
		extraAnglesLabel: "更多產品角度（選填）",
		extraAnglesHint: "同一款貨 2–3 張相 — 多角度動態，比單張 zoom 更靚",
		extraAnglesCta: "加入角度相片",
		endFrameLabel: "結尾畫面（選填）",
		endFrameHint: "唔用自動 — 自己 upload 第二張",
		videoRichMotionNote:
			"使用豐富動態 + 第二畫面，比淨係 zoom 更有廣告感。",
		videoWearVarietyTitle: "想更多變化或上手佩戴？",
		videoWearVarietyTips: [
			"跟參考片模式：動態主要跟 @Video1 — 參考片冇上手，出嚟通常都唔會有手。",
			"要上手佩戴：參考 MP4 揀有手背/佩戴嘅片段；@Image1 用原始產品相（靜物宣傳圖較難跟手）；進階揀「只出手」。",
			"要更多變化：動態豐富度揀「豐富／電影感」；或改「產品宣傳片」+ 開「自動第二畫面」（靜物→上手過渡）。",
			"亦可自己生成上手圖做「結尾畫面」，或影片 prompt 寫：gentle hand lifts bracelet onto wrist, face never shown。",
			"完整露樣模特：而家唔支援，只做到手／腳／身體（唔出樣）。",
		],
		videoSettingsFast: "快速模式（平啲、草稿質素）",
		videoDurationAuto: "自動",
		videoMotionStyles: {
			"slow-push": "慢推近",
			"gentle-orbit": "輕微環繞",
			"static-glow": "微閃（鏡頭固定）",
			"pull-out": "慢拉遠",
		},
		preGenerate: {
			title: "生成前檢查（唔使識晒所有設定）",
			hint: "AI 已根據你嘅概念填好 — 檢查下面 3 項，再撳「生成完整 Reel」。",
			keyframeLabel: "關鍵圖",
			keyframeReady: "已準備",
			keyframeMissing: "請先喺步驟 2 生成關鍵圖",
			keyframeConceptRefReady:
				"參考 MP4 已分析 — 可直接生成（唔使產品圖）",
			keyframeConceptStoryboardReady:
				"場景圖已準備 — 生成影片前先喺上面預覽",
			motionLabel: "動態",
			audioLabel: "音訊",
			voiceOn: "口播：開",
			voiceOff: "口播：關",
			captionsOn: "燒錄字幕：開",
			captionsOff: "字幕：關",
			aiMusic: "AI 音樂",
			downloadTip:
				"完成後喺「Done」下載最終 MP4 — 唔係 raw *_video.mp4。",
			stableMotionBtn: "穩定鏡頭（最少動態）",
			cinematicMotionBtn: "電影感運鏡（推薦）",
			adPackBtn: "聲音、音樂同字幕 →",
			advancedHint:
				"電影感 Reel 預設會用 orbit / push / pull 運鏡。只有想要近乎靜態先揀穩定鏡頭。",
		},
		step1Title: "步驟 1 — 輸出類型同產品資料",
		step1Hint: "揀只要圖、只要片、定兩樣都要。填好產品資料，AI 跟住做。",
		setupHints: {
			"image-only":
				"下一步：用文字描述、一張參考圖、或產品相+風格參考圖來整相片。",
			"video-only":
				"下一步：上傳產品靜態圖（@Image1），可選參考廣告 MP4 跟運鏡（@Video1）。",
			combined:
				"下一步：先 AI 整圖，再 影片生成 做片 — 影片步驟可上傳參考 MP4。",
		},
		setupCallouts: {
			"image-only": "只整相片 — 冇影片步驟。下一步揀點樣生成圖片。",
			"video-only":
				"只整影片 — 影片生成 + BGM。下一步上傳產品相同可選參考廣告 MP4。",
			combined:
				"完整廣告 — 先生成/美化相片，再做動態。參考 MP4 跟返之前嘅運鏡功能。",
		},
		imageInputLabel: "你想點樣整張圖？",
		imageInputModes: {
			"product-ad": {
				title: "產品 → 廣告圖（推薦）",
				description:
					"只上傳產品相 — AI 保留你件貨，整張靚廣告圖（唔跟風格參考）",
			},
			"product-style": {
				title: "產品 + 風格參考",
				description:
					"產品相 + 第二張參考圖，跟嗰張廣告嘅構圖、光線、氛圍",
			},
			describe: {
				title: "純文字描述",
				description: "唔使上傳 — 用 prompt 描述（步驟 1 產品名有幫助）",
			},
			reference: {
				title: "只用參考圖",
				description:
					"上傳一張廣告/相片 — AI 跟佢嘅視覺風格，配合你嘅產品描述",
			},
		},
		videoSectionKeyframe: "1. 關鍵圖（@Image1）",
		videoSectionReference: "2. 參考廣告 — 跟運鏡（@Video1）",
		videoSectionBgm: "3. 背景音樂",
		continueNext: "繼續",
		continueToImage: "繼續",
		continueToVideo: "繼續",
		approveGenerateVideoBtn: "確認並生成影片",
		finishImage: "完成 → 下載",
		mobileVideoBusy: "正在生成 — 請等完成。",
		mobileVideoNeedPrompt: "請先寫或確認動態 prompt。",
		mobileVideoNeedPlan: "請先分析相片並寫動態 Prompt（產品助手）。",
		mobileVideoBlocked: "請先完成上面步驟再出片。",
		step2Title: "步驟 2 — 宣傳圖（AI 出圖）",
		step2Hint:
			"上傳產品相。AI 為你生成新廣告圖；若揀咗參考概念，會跟參考圖重新設計（唔照抄）。",
		step2Hints: {
			"image-only": "下面揀一種方式，生成後下載 — 唔會做影片。",
			combined:
				"預設只上傳產品整靚廣告圖。想跟另一張廣告風格先揀「產品 + 風格參考」。",
		},
		imageModelLabel: "圖片品質",
		imageModels: {
			"nano-banana-2-edit": {
				label: "AI 出圖 Edit（預設）",
				hint: "上傳產品相 → AI 設計新廣告圖，保留你件貨",
			},
			"nano-banana-edit": {
				label: "AI 出圖 Edit（舊版）",
				hint: "上傳產品相 → AI 美化，保留你件貨",
			},
			"nano-banana": {
				label: "AI 出圖 — 純文字",
				hint: "唔使上傳 — 靠步驟 1 產品名 + prompt",
			},
			"nano-banana-pro-edit": {
				label: "AI 出圖 Pro Edit（進階）",
				hint: "高質美化 — 需要上傳產品相",
			},
		},
		twoVariantsLabel: "一次產生 2 個版本",
		twoVariantsHint: "同一設定出兩張圖，揀較滿意嗰張（約 2× API 成本）",
		pickVariantLabel: "揀一個版本繼續",
		variantA: "版本 A",
		variantB: "版本 B",
		exactTextHint: "要圖上精確中文標題？AI 生圖未必字字正確。",
		exactTextCta: "改用紙條貼紙模板 → 文字原字放上版面",
		uploadQualityLowRes:
			"相片解像度偏低（建議至少 800×800）— 仍可生成，但產品細節可能唔夠清晰。",
		uploadQualityVerySmall:
			"相片太細（低於 512px）— 建議換一張更清晰嘅產品相。",
		imageRefLabel: "風格參考圖（相片，選填）",
		imageRefHint:
			"只影響相片 AI — 構圖/光線/氛圍。影片參考 MP4 喺「影片」步驟上傳。",
		styleRefPromptActive:
			"已偵測風格參考圖 — prompt 已改為跟參考圖（構圖、光線、圖案）。請重新生成。",
		productAdHint:
			"AI 會用你填嘅主標題／副標／優惠設計宣傳圖 — 保留同一件貨，加上廣告文字同靚背景。唔使上傳參考圖。",
		imageRefCta: "選擇參考圖",
		imageRefChange: "更換參考圖",
		videoKeyframeLabel: "關鍵圖（影片起點）",
		videoKeyframeHint: "影片生成 會將呢張圖變成動態（你嘅相或 AI 生成圖）",
		downloadImage: "下載相片",
		imageDoneTitle: "相片已完成",
		imageDoneHint:
			"下載圖片。需要影片可另外揀「只整影片」或「相片+影片」。",
		generateImageBtn: "生成相片",
		storyboardGenerateScenesBtn: "生成分鏡場景圖",
		regenerateImageBtn: "重新生成相片",
		tokenCostHint: "約用 {n} 點數",
		imageReviewRegenerateHint: "唔滿意？",
		imageReviewRegenerateLink: "重新生成",
		imageReviewHeroBefore: "檢查你嘅",
		imageReviewHeroAccent: "生成內容。",
		imageReviewHeroHint: "預覽、編輯、下載，或者重新生成。",
		imageReviewCompleteTitle: "生成完成！",
		imageReviewCompleteBodySingle: "你嘅圖片已經可以檢查。",
		imageReviewCompleteBodyMany: "你嘅 {n} 張圖已經可以檢查。",
		imageReviewCompleteSingle: "生成完成！你嘅圖片已經可以檢查。",
		imageReviewCompleteMany: "生成完成！你嘅 {n} 張圖已經可以檢查。",
		imageReviewStoryboardReadyTitle: "分鏡圖已準備好",
		imageReviewStoryboardReadyBody:
			"四拍靜幀就係成片。壞格重產，再一次確認。影片會郁呢啲畫面。",
		imageReviewStoryboardHeroBefore: "檢查你嘅",
		imageReviewStoryboardHeroAccent: "分鏡圖。",
		imageReviewStoryboardHeroHint:
			"睇吓分鏡，壞格重產，再確認。生成影片修唔好弱九宮格。",
		imageReviewPathLabel: "路徑",
		imageReviewPathImagesVideo: "先圖再片",
		imageReviewVisualSetLabel: "視覺組",
		imageReviewVisualSetStoryboard: "分鏡場景",
		imageReviewFailedTitle: "生成失敗",
		imageReviewFailedBody:
			"請睇下面錯誤再試。若提示未扣費，今次唔會扣 tokens。",
		imageReviewGeneratedHeading: "生成內容（{n}）",
		imageReviewGeneratedSub: "{mode} · {product}",
		imageReviewPreviewCarousel: "輪播預覽",
		imageReviewMetaOutput: "輸出類型",
		imageReviewMetaAspect: "比例",
		imageReviewMetaCount: "張數",
		imageReviewAddLogoBtn: "加 Logo",
		imageReviewEditCanvasBtn: "喺畫布編輯",
		imageReviewRegenerateOneBtn: "重新生成",
		imageReviewBackLibraryNote:
			"呢張圖已儲存到「我的資料庫」。返回後唔會返到呢一頁，可喺資料庫查看。",
		sidePanelRequirementsTitle: "必填項目",
		sidePanelCostTitle: "預計費用",
		sidePanelTipsTitle: "提示",
		sidePanelReqReady: "完成",
		sidePanelReqMissing: "未齊",
		imageReviewRegenerateBannerTitle: "唔滿意結果？",
		imageReviewRegenerateBannerBody:
			"用同一個簡報重新生成，或者返回改設定再試。",
		imageReviewRegenerateBannerBtn: "重新生成內容",
		imageReviewGenerateOneMore: "再生成一張",
		imageReviewSteps: [
			"揀推廣目標",
			"填寫資料",
			"AI 分析",
			"揀風格",
			"生成內容",
		],
		videoReviewHeroBefore: "檢查你嘅",
		videoReviewHeroAccent: "生成影片。",
		videoReviewHeroHint:
			"預覽、下載無聲片，或開啟字幕工作室加 BGM 同畫面文字。",
		videoReviewCompleteTitle: "生成完成！",
		videoReviewCompleteBody: "你嘅影片已經可以檢查。",
		videoReviewCompleteEmpty: "未有影片 — 重新生成，或者返回再試。",
		videoReviewFailedTitle: "影片生成失敗",
		videoReviewFailedBody:
			"請睇下面錯誤，再返回影片設定。若提示未扣費，今次唔會扣 tokens。",
		videoReviewGeneratedHeading: "生成影片",
		videoReviewGeneratedSub: "{style} · {product}",
		videoReviewMetaDuration: "時長",
		videoReviewMetaResolution: "解像度",
		videoReviewMetaStyle: "風格",
		videoReviewRegenerateOneBtn: "重新生成",
		videoReviewRegenerateBannerTitle: "唔滿意結果？",
		videoReviewRegenerateBannerBody:
			"用同一個簡報重新生成，或者返回改設定再試。",
		videoReviewRegenerateBannerBtn: "重新生成影片",
		videoReviewGenerateOneMore: "再生成一次",

		useOriginalBtn: "直接用原圖（跳過生成，去影片）",
		useOriginalImageOnlyBtn: "直接用原圖（唔經 AI）",
		imageReadyHint: "滿意呢張圖？繼續製作影片。",
		imageReadyHintCombined: "呢張圖會做影片 @Image1 — 滿意就繼續。",
		combinedVideoKeyframeCallout:
			"步驟 2 已生成嘅宣傳圖會做 影片生成 @Image1（圖片變影片）。要跟參考片運鏡，請改揀「跟參考片概念」。",
		combinedCreativeImageHint:
			"請先喺呢步生成一張符合你創意簡介嘅宣傳圖 — 影片步驟會用呢張圖做動態起點。",
		combinedRefKeyframeNote:
			"跟參考片模式：建議用原始產品相做 @Image1（唔好用宣傳圖），影片生成 先易跟 @Video1 運鏡。",
		step3Title: "步驟 3 — 影片（AI 動態）",
		step3Hint:
			"影片生成 將相片變成影片。可上傳參考廣告 MP4 跟運鏡（@Image1 + @Video1）。",
		step3Hints: {
			"video-only":
				"預設：AI 影片助手 — 上傳產品（+ 包裝／角度）→ 分析 → 生成。亦可切換產品宣傳片或跟參考 MP4。",
			combined:
				"步驟 2 嘅圖係 @Image1。下面可加參考 MP4 跟運鏡 — 同之前一樣。",
		},
		generateVideoBtn: "生成影片",
		step4Title: "步驟 4 — 廣告已完成",
		step4Hint:
			"下載無聲 MP4（未加 BGM），或開啟音頻／字幕工作室自行加音樂同字幕。",
		videoDoneEmptyTitle: "未有影片",
		videoDoneEmptyHint:
			"生成未完成。請返回再試 — 或用產品特寫（唔出人），或唔用有人手／人臉嘅參考 Reel。",
		videoDoneEmptyBack: "返回影片步驟",
		uploadLabel: "產品相片",
		uploadLabelConcept: "主體圖片（選填）",
		uploadHint: "JPG、PNG 或 WEBP · 產品清楚就得",
		uploadHintConcept: "Logo、App 截圖或品牌圖 — 可選；只填文案都可以出圖",
		uploadCta: "按此選擇相片",
		uploadChange: "更換相片",
		referenceLabel: "參考廣告影片（MP4）",
		referenceHint:
			"上傳你想跟嘅短片 MP4。AI 會將你嘅產品（@Image1）做成類似 @Video1 嘅運鏡同風格。",
		referenceVideoOnlyHint: "MP4 或 MOV · 選填，但建議上傳先有參考運鏡",
		needKeyframeGoBack:
			"未有關鍵圖 — 請按返回，生成相片或確認上傳後再來呢步。",
		referenceImageOnlyHint:
			"你上傳咗圖片 — 要跟參考片運鏡請上傳 MP4 影片。",
		referenceModeNote: "已用參考影片模式：你嘅產品相片 + 參考廣告。",
		referenceModeActive:
			"已偵測參考影片 — AI 會用上面關鍵圖做 @Image1，跟 @Video1 嘅運鏡同風格。",
		referenceVideoTooLong:
			"參考片約 {seconds} 秒 — 影片生成 只會用首段 2–15 秒。請喺 CapCut 剪一段 8–12 秒精華再上傳，效果先會似。",
		referenceVideoTips:
			"跟參考片貼士：① 剪短至 8–12 秒（唔好成條 30 秒 Reels）② 產品相要同參考片同一類貨 ③ 避免螢幕錄影（IG 按鈕會入鏡）④ 揀「跟參考片概念」+ 720p。",
		videoRefAutoModeNote:
			"已偵測參考 MP4 — 會用「跟參考片概念」生成（唔會再用圖片變影片忽略參考片）。",
		videoRefProductMismatch:
			"參考片係穿珠/上手動態 — 請用「產品相片」做 @Image1（唔好用已生成宣傳圖），影片生成 先會跟到手同運鏡。",
		videoRefUseProductPhoto:
			"提示：今次用 AI 宣傳圖做產品參考 — 建議改用上傳嘅原始產品相，先易跟參考片動態。",
		videoGenPathLabel: "影片生成 路徑",
		videoRefIgnoredOnImageMode:
			"你上傳咗參考 MP4，但今次係「產品動態」模式 — 參考片唔會用。要跟運鏡請改揀「跟參考片概念」。",
		videoPreflightTitle: "生成前檢查",
		videoPreflightModeProduct: "模式：產品圖 → 影片（image-to-video）",
		videoPreflightModeRef: "模式：產品圖 + 參考 MP4（reference-to-video）",
		videoPreflightModeConceptRef:
			"模式：參考 MP4（concept reference-to-video）— 跟 @Video1 運鏡，唔使產品圖",
		videoPreflightSettings: "畫質 {resolution} · 時長 {duration} · {tier}",
		videoPreflightTierFast: "快速草稿（慳錢）",
		videoPreflightTierQuality: "標準質素",
		videoPreflightStyle: "畫面風格：{style}",
		videoPreflightSecondFrame:
			"會額外 call 1 次出圖 API 自動做第二幀（約多 1× 圖片費用）— 慳錢請關閉「自動整第二個畫面」",
		videoPreflightSingleCall:
			"預計：1 次 影片生成 + 本地 BGM（無額外出圖）",
		videoPreflightDoubleCall: "預計：1 次出圖 + 1 次 影片生成 + BGM",
		videoPreflightAI: "＋1 次 AI 寫動態 prompt（品牌／產品分析）",
		planVideoPromptBtn: "AI 寫動態 Prompt",
		planVideoPromptBusy: "AI 寫緊動態 prompt…",
		planVideoPromptReady: "已填入下方動態 Prompt — 請檢查後再生成",
		planVideoPromptDurationRefresh:
			"片長已改 — AI 按新片長重寫動態 prompt…",
		planVideoPromptDurationStale:
			"片長已改 — 你嘅腳本仍保留；要更新請再撳「AI 寫動態提示」。",
		planStaleAfterAssetChange:
			"產品相已改 — 如要動態腳本配合新圖，請再跑一次 AI 規劃。",
		productVideoKitTitle: "產品相片套裝",
		productVideoKitHint:
			"上傳主產品（必填）、包裝或額外角度 — AI 視覺讀全部相，再寫動態 prompt。",
		productVideoHeroLabel: "主產品（@Image1）",
		productVideoHeroHint: "主要產品相 — 必填",
		productVideoPackagingLabel: "包裝／盒（選填）",
		productVideoPackagingHint: "零售盒或包裝 — 有上傳就係 @Image2",
		productVideoExtraLabel: "額外角度（選填）",
		productVideoExtraHint: "最多 2 張 — 特寫、背面、使用情境",
		planProductVideoBtn: "分析相片並寫動態 Prompt",
		planProductVideoBusy: "AI 分析相片中，寫緊動態 prompt…",
		planProductVideoReady: "動態方案已準備 — 請檢查下方 prompt 再生成",
		productVideoSituationLabel: "建議場景",
		productVideoPlanLabel: "動態 Prompt",
		productVideoPlanHint:
			"已分析你上傳嘅相；AI 寫好鏡頭同動態。可喺進階修改。",
		productVideoAssistantPreflight:
			"模式：產品動態助手 — 多圖 reference-to-video",
		productVideoAnalyzeFirstHint:
			"上傳主產品 → 撳「分析相片並寫動態 Prompt」→ 再生成。",
		productVideoUploadFirstHint:
			"請先上傳主產品相片，再撳「分析相片並寫動態 Prompt」。",
		storyboardVideoNeedScenesHint:
			"請先返回步驟 2 生成場景圖，再生成影片。",
		videoKeyframeProductLabel: "產品 / 關鍵圖（@Image1）",
		videoKeyframeProductHint:
			"必須上傳。你嘅產品或靜態圖 — 作為 @Image1。有參考 MP4 時，AI 會跟 @Video1 運鏡。",
		referenceCta: "按此選擇參考廣告",
		referenceChange: "更換影片",
		productLabel: "產品名稱（選填）",
		productLabelRequired: "產品名稱",
		productPlaceholder: "例如：金砂石手鏈",
		businessLabel: "店舖名稱",
		businessPlaceholder: "例如：幸運水晶 HK",
		offerLabel: "優惠（選填）",
		offerPlaceholder: "例如：本週八折",
		bgmLabel: "背景音樂",
		bgmCalm: "柔和",
		bgmUpbeat: "活潑",
		bgmWarm: "溫暖",
		bgmNone: "無音樂",
		phaseSecondFrame: "正在生成第二個畫面（豐富動態）…",
		phaseVideo: "正在製作影片…",
		phaseBgm: "正在加入背景音樂…",
		phaseVoiceover: "正在加入口播旁白…",
		phaseCaptions: "正在燒錄字幕…",
		imageGenerating: "正在生成相片…",
		generationWaitHint: "稍等 — 創作內容正在呢個畫面入面生成。",
		imageGenerateNotReady:
			"請先完成上方參考圖／標題等必填項目，再生成相片。",
		download: "下載影片（無 BGM、無字幕）",
		downloadEditPack: "下載 CapCut 編輯包（JSON）",
		subtitles: "加字幕（進階）",
		newProject: "再製作一條",
		back: "返回",
		advanced: "進階選項",
		advancedWorkflow: "進階：輸出類型同畫面風格",
		advancedPrompts: "進階：AI prompt 文字",
		advancedHint: "以下選項會自動更新 prompt，你仍可改下面文字。",
		marketLabel: "市場 / 風格",
		framingLabel: "人物 / 身體部位",
		framingPickerHint:
			"控制畫面有冇模特樣 — 追女生、服務類概念圖建議揀「唔出樣」或「完全唔出人」。",
		imageAdvancedLabel: "進階設定（人物構圖 / prompt）",
		extraLabel: "額外指示（選填）",
		extraPlaceholder: "例如：金色手鏈戴喺手腕、戶外自然光",
		promptPreview: "AI prompt（可改）",
		resetPrompts: "按選項重設",
		imagePromptLabel: "相片美化 prompt",
		videoPromptLabel: "動態 Prompt",
		promptMarkets: {
			hk: {
				label: "香港 / 粵語市場",
				hint: "港式視覺、都市感（文案語言跟你輸入嘅中英文自動判斷）",
			},
			tw: { label: "台灣市場", hint: "柔和生活感、本地品牌" },
			cn: { label: "內地市場", hint: "明亮電商 / 短視頻風格" },
			en: { label: "英文 / 國際", hint: "簡潔西式零售感" },
		},
		promptFramings: {
			auto: { label: "自動（跟模板）", hint: "用你上面揀嘅風格" },
			"product-only": {
				label: "只有產品 — 唔出人",
				hint: "產品特寫，畫面冇人",
			},
			"hands-only": {
				label: "只出手 — 唔出樣",
				hint: "手拎或佩戴產品，絕對唔露出樣",
			},
			"legs-feet": {
				label: "只出腿同腳",
				hint: "鞋、襪、褲腳 — 膝蓋以上唔入鏡、唔出樣",
			},
			"torso-no-face": {
				label: "身體 / 腰以上 — 唔出樣",
				hint: "可以有手臂或身體，樣要出鏡外",
			},
			"no-people": { label: "完全唔出人", hint: "只有產品同背景" },
		},
		retry: "再試一次",
		bgmNote: "已加入背景音樂。",
		bgmFallbackNote:
			"搵唔到音樂檔 — 已用 AI 輕音樂。請執行：npm run setup:bgm",
		adPack: {
			title: "廣告包 — 文案、字幕同音樂",
			intro: "生成影片前，AI 會幫你計 hook、定時字幕同 BGM 風格。每部分都可以改或重新生成。",
			planCta: "規劃文案同音樂",
			planning: "規劃中…",
			reviewTitle: "檢視廣告包",
			reviewHint: "生成影片前，可編輯任何部分或重新規劃。",
			regenerateAll: "重新規劃",
			scriptSection: "文案同字幕",
			burnCaptions: "將字幕燒錄到影片",
			hookLabel: "Hook",
			hookPickerLabel: "揀一個 hook",
			hookPickerHint:
				"三個唔同切入角度 — 揀好會更新口播同字幕（hook 置頂、產品句置底）。",
			hookOptionLabel: "Hook {n}",
			voiceoverPlaceholder:
				"口播旁白文案 — 生成後用 AI TTS 朗讀（可手動填寫）",
			voiceoverEmptyHint:
				"口播文案係空 — 口播會跳過。請填寫下方，或按「從字幕填入口播」。",
			voiceoverFromCaptionsBtn: "從字幕填入口播文案",
			speakVoiceover: "朗讀口播（混入 BGM 之上）",
			voiceoverHint:
				"下面可預聽男/女聲；揀好後生成影片會用同一把聲混入 BGM。",
			voiceSection: "口播預聽",
			voicePreviewHint:
				"下面可預聽男/女聲；揀好後生成影片會用同一把聲混入 BGM。改咗文案或語言後請重新生成。English 聲線建議用英文口播文案。",
			voicePreviewPartial:
				"有 {failed} 把聲預聽失敗 — 已成功嘅仍可試聽同選擇。",
			generateVoice: "生成口播預聽",
			generatingVoice: "生成口播中…",
			voicePresets: {
				"hk-female-pro": "女聲（專業）",
				"hk-male-warm": "男聲（溫暖）",
				"cn-female": "女聲",
				"cn-male": "男聲",
				"en-female": "Female",
				"en-male": "Male",
			},
			voiceLocales: { hk: "粵語", en: "English", cn: "普通话" },
			timingLabel: "時間",
			positionLabel: "位置",
			positionOptions: {
				top: "頂部置中",
				center: "中間",
				bottom: "底部置中",
				"top-left": "左上",
				"top-right": "右上",
				"bottom-left": "左下",
				"bottom-right": "右下",
			},
			multilineHint: "按 Enter 可在同一位置同時段加第二行。",
			addCaption: "+ 加字幕行",
			removeCaption: "移除字幕行",
			timelineSection: "場景時間軸",
			sceneLabel: "場景 {n}",
			startSec: "開始（秒）",
			endSec: "結束（秒）",
			musicSection: "背景音樂",
			musicMoodLabel: "音樂氛圍（引導 AI 規劃）",
			musicMoods: {
				auto: "自動",
				warm: "溫暖生活",
				upbeat: "活力節奏",
				premium: "高級簡約",
				cinematic: "電影感",
			},
			aiStyleLabel: "AI 風格",
			libraryMusic: "音樂庫",
			aiMusic: "AI 生成",
			generateMusic: "生成 3 段 AI 音樂",
			generatingMusic: "生成音樂中…",
			trackLabel: "曲目 {label}",
			selected: "已選",
			selectTrack: "選擇",
			needPlanFirst: "請先規劃廣告包，以取得 AI 音樂提示。",
			aiBgmNote: "已混入 AI 生成背景音樂。",
			captionsAppliedNote: "已按文案燒錄字幕。",
			captionsSoftTrackNote:
				"字幕已加入為字幕軌 — 播放器開 CC 先會見到。",
			captionBurnSkippedNote:
				"字幕燒錄失敗 — 已顯示加咗 BGM 嘅影片，你仍可下載。",
			voiceoverAppliedNote: "已混入口播旁白。",
			voiceoverSkippedNote:
				"口播失敗 — 保留 BGM 版本。請檢查 service credentials。",
			needVoiceoverScript: "請先填口播文案或字幕行。",
		},
		adStyleLabel: "你想做邊種廣告？",
		adStyleHint: "揀最接近嘅款式 — 跟住做，第一次大約有 80–90% 似預期。",
		moreOptionsLabel: "更多選項（輸出類型）",
		adStyles: {
			"paper-sticker": {
				title: "紙片 + 貼紙 Reels",
				description: "固定 IG 版面 — 標題同重點原字放上。文字最準。",
			},
			"product-showcase": {
				title: "產品展示 Reels",
				description: "AI 產品特寫 + 柔和動態。任何產品都適用。",
			},
			"copy-reference-ad": {
				title: "跟同款廣告做",
				description:
					"揀 sample 運鏡片 + 你嘅產品圖。最接近真實 Reels。",
			},
			"shop-promo": {
				title: "店鋪 / 優惠宣傳",
				description: "店舖、服務或限時優惠 — 溫馨宣傳感。",
			},
		},
		referenceClipLibraryLabel: "內置運鏡 sample",
		referenceClipLibraryHint:
			"按一下用作 @Video1 — 或者下面自己 upload MP4。",
		referenceClipsMissing:
			"可選內置運鏡 sample 未安裝。用研究片或下面自己 upload 參考 MP4 即可（呢個先係主路徑）。",
		videoGenerateDisabledHint:
			"請先喺「關鍵圖」上傳產品相，或返回步驟 2 生成／確認圖片。",
		referenceClips: {
			"product-push-in": "慢推近",
			"gentle-orbit": "輕微環繞",
			"cozy-lifestyle": "溫馨生活感",
		},
		adTemplateLabel: "揀廣告模板",
		templateChecklistLabel: "模板組件",
		templateSlotRequired: "必填",
		templateSlotNextStep: "下一步填寫",
		templateImageModeLocked: "呢個模板已固定相片生成方式。",
		headlineLabel: "主標題（hook）",
		headlinePlaceholder: "例如：我如何在 2 小時準備好一個月內容？",
		sublineLabel: "副標（選填）",
		sublinePlaceholder: "例如：令效率翻 10 倍嘅核心秘密",
		sublineBulletsLabel: "重點列表（每行一點）",
		sublineBulletsPlaceholder: "賣點一\n賣點二\n賣點三",
		brandLabel: "品牌 / handle",
		brandPlaceholder: "你的品牌",
		signoffLabel: "落款（選填）",
		signoffPlaceholder: "從略",
		compositorCallout:
			"呢個模板用固定 IG 版面 — 你填嘅標題、重點同品牌會原字放上圖，唔係 AI 亂寫。",
		compositorImageHint:
			"上傳產品相。我哋會裁成圓形貼紙，同紙片筆記同你嘅文字合成。",
		compositorImageBtn: "合成廣告圖",
		compositorRegenerateImageBtn: "重新合成",
		compositorVideoHint:
			"輸出 6 秒 Reels：慢 zoom、紙片浮動、閃光 + BGM。唔用 影片生成 AI 影片。",
		compositorVideoBtn: "合成 Reels 影片",
		compositorPhaseRender: "渲染畫面中…",
		templateSlots: {
			product: "產品名稱",
			headline: "主標題",
			subline: "副標",
			productPhoto: "產品相片",
			styleRef: "風格參考圖",
			referenceVideo: "參考廣告 MP4",
			business: "店舖名稱",
			offer: "優惠",
		},
	},
	templates: {
		"paper-sticker-reel": {
			name: "紙片 + 貼紙 Reels",
			description:
				"固定 IG 紙片版面 — 你嘅文字 + 產品貼紙，可出圖同動畫片",
		},
		"product-reel": {
			name: "產品展示",
			description: "乾淨產品特寫 + 柔和動態",
		},
		"crystal-promo": {
			name: "暗色高級",
			description: "深色奢華感 + 金色點綴 — 唔限水晶",
		},
		"shop-promo": {
			name: "店舖優惠",
			description: "門面、服務或限時優惠",
		},
		"info-poster": {
			name: "精品資訊海報",
			description: "白底 IG 資訊圖 — 單主題、精簡文案、品類視覺",
		},
		"designed-poster": {
			name: "設計商業海報",
			description: "主視覺＋你填嘅標題同標語 — 小紅書／IG feed",
		},
		"parts-poster": {
			name: "零件拆解海報",
			description: "爆炸圖零件＋標題同標註說明 — 技術商業靜幀",
		},
		"gaming-cover": {
			name: "電競封面海報",
			description: "AAA 遊戲封面 — 低角度動作、場景內嵌字、HUD 裝飾",
		},
		"sports-big-words": {
			name: "運動大字海報",
			description: "運動編輯海報 — 超大疊字、HUD 數據、動作張力",
		},
		"jelly-3d": {
			name: "果凍立體字海報",
			description: "極簡果凍／玻璃 3D 主體 — 柔和陰影、少量品牌字",
		},
		"brand-fit": {
			name: "品牌風格分析",
			description: "跟網站/社交品牌 DNA 出廣告",
		},
		"brand-campaign": {
			name: "品牌 Campaign 套圖",
			description: "分析品牌 → 3 張串連 post",
		},
		"brand-video": {
			name: "品牌動態短片",
			description: "由品牌線索寫動態 prompt",
		},
		"creative-video": {
			name: "創意動態簡報",
			description: "描述創意 → AI 寫動態 prompt",
		},
		"storyboard-video": {
			name: "故事分鏡片",
			description: "AI 分鏡 → 多張場景圖 → 影片生成 一條片",
		},
		"ugc-presenter-reel": {
			name: "UGC 數字人口播",
			description: "口播關鍵幀 → digital presenter 對嘴",
		},
		"model-wear-reel": {
			name: "模特兒佩戴／使用",
			description: "產品相 → 似真模特兒生活感廣告圖",
		},
		testimonial: {
			name: "顧客分享風格",
			description: "溫暖生活感，適合好評帖",
		},
		"service-promo": {
			name: "服務推廣",
			description: "課程、諮詢、會員 — 以信任感排版為主",
		},
		"pricing-offer": {
			name: "方案／優惠",
			description: "收費計劃、套票或限時優惠 + 清晰 CTA",
		},
		"website-launch": {
			name: "網站／App 上線",
			description: "上線推廣圖 — logo 或截圖可選",
		},
		custom: {
			name: "自訂",
			description: "自己揀組件同 prompt",
		},
	} satisfies Record<TemplateId, { name: string; description: string }>,
	errors: {
		polishFailed: "無法美化相片，請再試或開啟快速模式。",
		videoFailed: "影片製作失敗，請再試。",
		requestTooLarge:
			"請求太大（通常係場景圖太多或太大）。請減少場景或重新生成靜幀，再試生成影片。",
		network: "網絡錯誤，請檢查網絡後再試。",
		serviceUnavailable: "圖片／影片生成暫時不可用，請稍後再試。",
		planningUnavailable: "AI 規劃暫時不可用，請稍後再試。",
		deepSeekBalanceEmpty:
			"AI 帳戶餘額已用完，請到 platform.AI.com 充值後再試。",
		insufficientTokens:
			"Token 不足，無法生成。請到 Pricing 升級或加購後再試。",
		insufficientTokensTitle: "Token 已用完",
		insufficientTokensCta: "查看方案與加購",
		insufficientTokensDismiss: "關閉",
		tvcNeedsPaidPlan:
			"呢條片比免費額度貴。免費大概夠 1 張圖 + 1 條 8 秒 480p 片。請到 Pricing 升級，或者餘額夠就用 拼接後備。",
		tvcNeedsPaidPlanTitle: "12 秒 TVC 需要付費方案",
		storyboardEngineChoiceTitle: "單鏡額度唔夠 — 拼接後備 拼接而家用得",
		storyboardEngineChoiceBody:
			"單鏡出片 12 秒大約要 {single} token。你而家有 {balance}。拼接後備（約 {stitch}）係 4 段剪埋，唔係一鏡到底。",
		storyboardEngineChoiceH3: "升級用單鏡出片",
		storyboardEngineChoiceKling: "而家用拼接後備",
		storyboardCellBlocked:
			"呢格被安全過濾擋住。撳呢格重新生成 — 同一個產品，唔好有臉同品牌字。",
		tokensNotCharged: "今次嘗試冇扣 Token。",
		timeout: "請求逾時，請再試。",
		seedanceSensitive:
			"影片生成 拒絕呢條片（暴力／打鬥過濾）。請用較溫和字眼：唔好 weapons、opponent、standoff — 改為 figures at rest、peaceful pause。參考圖似打鬥都會觸發。",
		falContentPolicy:
			"影片生成 拒絕呢次媒體（人物／私隱過濾）。我哋可以改用 逐場動畫再拼接——如果自動切換失敗，請再撳生成影片。",
		klingStoryboardFailed: "分鏡備援失敗，請再試或改用無臉場景圖。",
		klingDurationUnreachable:
			"拼接後備 拼接唔到呢個秒數（每格最少 5 秒）。請再試 單鏡出片 或改揀 12 秒。",
		needPhoto: "請先上傳產品相片。",
		needReferenceImage: "請先上傳參考圖。",
		needHeadline: "請輸入呢個模板需要嘅主標題。",
		needKeyframe: "請先生成相片，或選擇「直接用原圖」，再製作影片。",
		needStyleReference: "請上傳參考廣告圖（跟參考概念模式）。",
		needReferenceVideo: "請上傳參考 MP4（跟參考片概念模式）。",
		referenceVideoPrepareFailed:
			"參考片（@Video1）準備失敗。我哋冇改做純靜圖影片 — 請修好 MP4 再試。",
		needGeneratedImage: "請先喺步驟 2 生成 AI 宣傳圖（圖片變影片流程）。",
		needPrompt: "請上傳相片，或在進階選項描述要製作嘅內容。",
		imageGenNoUrl: "AI 冇返回圖片網址 — 請睇終端機錯誤或再試。",
		needRefineImage: "請先生成 AI 圖片，然後先可以針對性修正。",
		refineFailed:
			"無法套用圖片修正。請寫得更具體（例如：「移除右上角 Logo」）。",
		exportFailed: "批量導出失敗，請重試或下載主圖。",
		videoVariantsBatchUnsupported:
			"並行變體影片只支援圖片→影片（唔支援分鏡或主播）。",
		needQuickFixLogo: "請先上傳 Logo 圖片。",
		needAiImage: "請按「生成宣傳圖」，唔好只上傳原圖就下一步。",
		brandUrlRequired: "請輸入品牌網站或社交帳號。",
		brandAnalyzeFailed: "品牌分析失敗，請檢查網址後再試。",
		campaignFailed: "Campaign 套圖失敗，請再試。",
		storyboardFailed: "故事分鏡生成失敗，請再試。",
		storyboardSceneImagesMissing:
			"無法載入全部場景圖（{got}/{expected}）。請重新生成缺嘅靜幀，再試影片。",
		brandLogoRequired: "請先喺 Brand kit 上傳 Logo。",
		storyboardVideoPromptRequired: "請先喺步驟 2 生成分鏡場景圖。",
		cinematicStitchNeedScenes:
			"請先喺步驟 2 生成 {count} 張場景關鍵幀，再繼續去影片。",
		needProductName: "故事分鏡需要填產品名稱。",
		needProductNameSetup: "請先填產品名稱再繼續。",
		extraAnglesNeedRefVideo:
			"多角度模式需要同時上傳參考 MP4（跟參考片概念）。",
		brandVideoPromptRequired: "請先分析品牌，再撳「AI 寫動態 Prompt」。",
		creativeBriefRequired: "請先填「創意影片描述」。",
		creativeVideoPromptRequired:
			"請先撳「AI 寫動態 Prompt」並檢查下方 prompt。",
		planVideoPromptFailed: "影片 prompt 規劃失敗，請再試。",
		planProductVideoFailed: "產品影片規劃失敗，請檢查相片再試。",
		adPackPlanFailed: "廣告包規劃失敗，請再試。",
		musicGenerateFailed: "AI 音樂生成失敗，請再試或揀音樂庫。",
		voiceoverFailed:
			"口播合成失敗。請檢查 service credentials 或關閉口播。",
		ugcPresenterFailed:
			"數字人影片生成失敗。請檢查 service credentials 後再試。",
		postProcessIncomplete:
			"後製未完成 — 最終仍係未處理嘅 CDN 原片（未成功寫入本機／圖庫）。請重新生成；如持續失敗請檢查拼接／字幕燒錄。",
		bgmFilesMissing:
			"背景音樂檔案缺失。請用 AI 音樂，或執行 npm run setup:bgm 安裝音樂庫。",
		planConceptFailed: "概念分析失敗，請再試。",
		conceptVideoAssistantBlocked:
			"AI 影片助手只適用實體產品。概念模式請用「概念影片（由文案出片）」。",
		conceptIdentityRequired:
			"產生影片前請先填概念 idea、主標題，或上傳概念圖。",
		conceptVideoPlanRequired:
			"AI 正在寫動態 prompt，請等幾秒；若仍未出現，撳「AI 寫動態 Prompt」。",
		needProductVideoPlan: "請先撳「分析相片並寫動態 Prompt」。",
		researchReelAnalyzeFailed:
			"參考短片分析失敗 — 請稍後再試，或重新揀帖。",
		brandAnalyzeRequired: "請先按「分析品牌」。",
	},
	ugcStudio: {
		badge: "獨立工具 · digital presenter 對嘴",
		title: "UGC 數字人口播",
		subtitle:
			"寫一段短口播、揀數字人主播，即刻生成 TikTok 風格對嘴短片。可選：上傳產品相做自訂關鍵幀。",
		setupTitle: "講稿同主播",
		setupHint:
			"要畫面見到你嘅產品：上傳產品相 → 生成關鍵幀 → 生成影片。庫存主播只對嘴講稿，畫面唔會出現你嘅產品。",
		productHowHint:
			"兩個模式 — 我嘅關鍵幀圖：用你嘅產品相生成手持／手腕口播靜態圖，再交俾 digital presenter 對嘴。庫存主播：通用數字人，產品名只會喺講稿講出嚟，唔會顯示你嘅真產品。",
		productLabel: "產品名稱",
		productPlaceholder: "例如：水晶手串、便攜電源…",
		photoLabel: "產品相（畫面要見到產品先要上傳）",
		photoRequiredHint: "自訂關鍵幀需要",
		scriptLabel: "口播講稿（約 10 秒）",
		scriptPlaceholder: "控制喺約 10 秒內 — 一句 hook + 一個賣點 + CTA。",
		scriptHint: "10 秒 UGC 建議 1–3 句短句。AI 稿可以再改。",
		planScript: "AI 寫講稿",
		planningScript: "寫講稿中…",
		planScriptHint: "用 AI 根據產品名草稿約 10 秒口播。生成後可以再改。",
		scriptReady: "AI 講稿已好 — 可改再預聽聲線。",
		scriptFailed: "AI 講稿失敗。請檢查 AI API key。",
		localeHk: "粵語/繁中",
		localeCn: "普通话",
		localeEn: "English",
		voiceLabel: "聲線",
		avatarVoiceLabel: "主播聲線（跟呢個主播鎖定）",
		avatarVoiceHint:
			"每個庫存主播都有配對嘅 AI 聲線（跟你揀嘅語言）。",
		previewVoice: "預聽聲線",
		previewingVoice: "預聽中…",
		generateVideo: "生成 UGC 影片",
		generatingVideo: "生成 UGC 影片中…",
		generateKeyframe: "生成口播關鍵幀",
		generatingKeyframe: "生成關鍵幀中…",
		customHint: "上傳清晰產品相，然後生成手持／手腕示範關鍵幀。",
		stockHint: "庫存主播最快睇到對嘴效果，唔使產品相。",
		stockNoProductNote:
			"而家係庫存主播 — 影片唔會顯示你嘅產品相。想畫面有產品，請上傳產品相並用「我嘅關鍵幀圖」。",
		voiceMatchesAvatarNote: "轉主播就會轉佢配對嘅聲線。",
		customUsesProductNote:
			"自訂關鍵幀模式 — 請先用產品相生成關鍵幀，再生成影片。",
		previewTitle: "結果",
		previewHint: "生成短片會喺度播放 — 對嘴已燒入。",
		previewEmpty: "生成後 UGC 短片會顯示喺呢度。",
		waitHint: "稍等 — 對嘴短片正在呢個畫面入面生成。",
		download: "下載 MP4",
		costHint:
			"會扣 token（聲線 + digital presenter 影片，約 30 token/秒音訊 ≈ $0.10/秒）。需要登入。",
		needScript: "請先填口播講稿。",
		needProduct: "請先填產品名稱。",
		needPhoto: "自訂關鍵幀請先上傳產品相。",
		needKeyframe: "請先生成關鍵幀，或改用庫存主播。",
		needAvatar: "請揀一個庫存主播。",
		voiceReady: "聲線預聽已好 — 滿意就可以生成。",
		voiceFailed: "聲線預聽失敗。",
		keyframeReady: "關鍵幀已好 — 下一步生成影片。",
		keyframeFailed: "關鍵幀生成失敗。",
		videoReady: "UGC 影片已好。",
		videoFailed: "UGC 影片生成失敗。",
	},
	captions: {
		badge: "後期工作室 · 任何影片",
		title: "字幕同音頻工作室",
		subtitle:
			"由作品庫或你自己嘅片開始 — 改文案、加 BGM／口播、再燒錄字幕。片長無限制。",
		uploadTitle: "加入影片",
		uploadHint:
			"從作品庫揀片（studio 生成會自動存入），或由 studio 完成頁開啟字幕工作室。",
		uploadHintAny:
			"由作品庫揀、上傳你自己嘅 MP4，或由 Studio 完成頁帶住成品嚟呢度。",
		anyLengthNote:
			"片長隨意 — 會讀檔案真實時長。多段拼接片會顯示場次切開標記。",
		chooseFile: "上傳影片檔案",
		chooseFromLibrary: "從作品庫選擇",
		changeVideo: "更換影片（作品庫）",
		sourceFromStudio: "來自 studio",
		sourceFromLibrary: "來自作品庫",
		phaseScript: "1 · 文案",
		phaseAudio: "2 · 旁白同音樂",
		phaseBurn: "3 · 燒錄",
		phaseScriptName: "文案",
		phaseAudioName: "旁白同音樂",
		phaseBurnName: "燒錄",
		continueToAudio: "繼續去旁白同音樂",
		continueToBurn: "繼續去燒錄",
		phaseHowToScript: "右邊改字幕同時間。文案 OK 就繼續去旁白同音樂。",
		phaseHowToAudio:
			"可選：用主題規劃旁白、生成試聽，或加 BGM。再繼續燒錄字幕。",
		phaseHowToBurn: "檢查預覽，再燒錄字幕（同已套用音訊）。完成後下載。",
		cutsLabel: "{n} 段",
		timingFromVideo: "時間來自影片",
		timingEstimated: "時間為估算",
		largeFileHint:
			"大檔要用直傳雲端（R2 CORS）或「從作品庫選擇」— 伺服器上傳上限約 4.5MB。",
		uploadNeedCorsOrLibrary:
			"呢條片對伺服器上傳路徑嚟講太大。請從「我的作品庫」揀（如果已儲存），或請管理員為本站開 R2 PUT CORS，再重試上傳。",
		uploadFailed: "影片上傳失敗。",
		libraryPickerTitle: "揀作品庫影片",
		libraryPickerLoading: "載入作品庫中…",
		libraryPickerEmpty: "未有已儲存影片。請先喺 studio 生成。",
		libraryPickerLoadError: "無法載入作品庫影片。",
		libraryPickerCancel: "取消",
		libraryPickerUse: "用呢條",
		libraryPickerClose: "關閉",
		pipelineSourceNote: "使用 studio 已處理嘅影片 — 字幕會喺伺服器燒錄。",
		previewTitle: "預覽",
		showOriginal: "顯示原片（無字幕）",
		durationLabel: "片長：{sec} 秒",
		linesTitle: "畫面字幕",
		linesHint:
			"設定開始/結束秒數、位置同文字。時間可以重疊 — 例如一行放頂部、一行放底部。改完再套用；永遠由原始上傳重新燒錄。",
		timingLabel: "時間",
		positionLabel: "位置",
		positionOptions: {
			top: "頂部置中",
			center: "中間",
			bottom: "底部置中",
			"top-left": "左上",
			"top-right": "右上",
			"bottom-left": "左下",
			"bottom-right": "右下",
		},
		multilineHint: "按 Enter 可在同一位置同時段加第二行。",
		removeLine: "移除字幕行",
		addLine: "+ 加字幕行",
		addTopSameTiming: "+ 加頂部一行（同時間）",
		splitEvenly: "平均分配時間",
		fitCaptionsToVoice: "對齊口播時長",
		fitCaptionsNeedVoice: "請先生成口播預聽，再對齊字幕時間。",
		fitCaptionsToVoiceDone:
			"字幕時間已對齊口播（約 {sec} 秒）。片尾無對白保持靜音。",
		voiceLongerThanVideo:
			"口播（約 {voice}s）長過可用影片（約 {video}s）。字幕已壓到影片長度；請縮短文案或少剪一點。",
		voiceFittedToVoice:
			"字幕時間已對齊口播（約 {voice}s）。影片尾段約 {tail}s 會保持靜音。",
		voiceFittedCapped:
			"口播（約 {voice}s）超過影片（約 {video}s）— 字幕已壓到影片長度。",
		applyBtn: "燒錄字幕到影片",
		applying: "燒錄字幕中…",
		appliedNote: "字幕已燒錄到影片 — 請拖動播放器檢查每個時段。",
		appliedLegacyNote: "字幕已燒錄（舊版字幕渲染）。",
		previewCaptionedHint: "正在顯示加字幕版本 — 可按「顯示原片」對比。",
		previewLoadFailed: "燒錄成功但預覽載入失敗 — 請試下載。",
		softTrackNote: "字幕已加入為字幕軌 — 播放器開 CC 先會見到。",
		softTrackError:
			"畫面燒錄失敗 — 只加咗 CC 字幕軌。請重新整理再試（新版會用 overlay 燒錄）；或稍後再試。",
		downloadBtn: "下載加字幕 MP4",
		downloading: "下載中…",
		downloadFailed: "下載失敗。",
		burnFailed: "字幕燒錄失敗。",
		needVideo: "請先上傳或載入影片。",
		needCaptionText: "請至少加一行有文字嘅字幕。",
		invalidVideoType: "請選擇影片檔案（MP4、WebM、MOV）。",
		reeditHint: "字幕文字會喺瀏覽器為此影片保存。要開新項目，",
		studioLink: "打開 studio",
		openFromDone: "編輯字幕同音頻",
		doneHint:
			"下載乾淨影片，或開啟字幕工作室改文案、旁白、音樂同燒錄 — 亦可以之後上傳任何影片嚟編。",
		styleLabel: "字幕樣式",
		styleHint: "燒錄字幕嘅預設顏色同粗幼（overlay 模式）。",
		audioTitle: "背景音樂同口播",
		audioHint:
			"最簡單：用 AI 按主題規劃字幕+口播，再預聽→混入。或者先加 BGM，再口播，最後燒錄字幕。",
		planCaptionVoiceSection: "AI 一鍵規劃字幕 + 口播",
		planCaptionVoiceHint:
			"輸入產品/主題。AI 會寫短字幕排滿片長，同時間每段加長口播填滿時段。下一步：預聽 → 混入口播。",
		planCaptionVoiceTopicLabel: "產品 / 主題 / 想法",
		planCaptionVoiceTopicPlaceholder:
			"例如：廣告素材自由、一站式幫 SMB 做推廣…",
		planCaptionVoice: "AI 規劃字幕 + 口播",
		planningCaptionVoice: "AI 規劃中…",
		planCaptionVoiceNeedTopic: "請先喺上面輸入產品/主題。",
		planCaptionVoiceFailed: "AI 規劃失敗。請檢查 AI API key。",
		planCaptionVoiceDone:
			"已規劃 {n} 句字幕（約 {sec}s）— 下一步：預聽 → 混入口播（{n} 段）。口播預設同畫面字幕一樣；只有完整長句裝得落先會加長。",
		audioBgmLabel: "音樂曲目",
		audioApplyBgm: "加 BGM",
		audioApplyingBgm: "加緊 BGM…",
		audioReplaceOriginal: "取代原片聲音",
		audioReplaceOriginalHint:
			"關閉時會保留上傳影片原聲，BGM 混在底下。開啟則輸出以音樂為主。",
		audioVoicePlaceholder: "完整口播稿（可以長過畫面字幕）",
		audioApplyVoice: "混入口播",
		audioApplyingVoice: "混音中…",
		audioSpeakVoiceover: "加口播配音（TTS）",
		audioLocaleHk: "粵語/繁中",
		audioLocaleCn: "普通话",
		audioLocaleEn: "English",
		audioBgmDone: "BGM 已加入 — 預覽已更新。",
		audioVoiceDone: "口播已混入 — 預覽已更新。",
		audioVoiceDoneAtCaption:
			"口播已按自然語速混入，從字幕開始時間 {sec}s 起播（唔拉長唔壓縮）。",
		audioVoiceDonePerCaption:
			"已用自然語速按字幕時段混入 {n} 段口播（有「口播」欄就讀口播；唔拉長唔壓縮）。",
		audioVoicePerCaptionHint:
			"畫面字幕保持短句。口播可以加長填滿每段時段 — 或撳「加長口播配合時段」— 再預聽 → 混入。男女聲預聽時長可以差好遠（同一稿、講速唔同，例如 19s vs 13s），屬正常。揀一把聲；混入先會按每段字幕時段擺好。",
		audioVoiceNeedCaptionLines:
			"字幕時間軸至少要有 2 句有文字嘅字幕（而家只有 {n} 句）。請由口播稿同步，或喺右邊改字幕，再混入。",
		audioVoiceNeedPreviewOrScript:
			"請先生成口播預聽（或填口播稿）揀一把聲。",
		audioVoiceSingleClipFallback:
			"伺服器只混咗 1 段（預期 {n} 段）。請強制重新整理頁面後再撳混入口播。",
		audioApplyVoicePerCaption: "混入口播（{n} 段）",
		fillVoiceFromCaptions: "由口播欄填入口播稿",
		syncCaptionsFromVoice: "由口播稿同步字幕",
		syncCaptionsNeedScript: "請先喺上面貼入口播稿，再同步字幕。",
		syncCaptionsFromVoiceDone:
			"已由口播稿同步 {n} 句字幕（約 {sec}s）— 下一步：需要就加長口播 → 預聽 → 混入（{n} 段）。",
		expandCaptionVoice: "加長口播配合時段",
		expandingCaptionVoice: "加長口播中…",
		expandCaptionVoiceNeedLines:
			"請先喺右邊填好短字幕，再撳加長口播填滿每段時段。",
		expandCaptionVoiceFailed: "加長口播失敗。請檢查 AI API key。",
		expandCaptionVoiceDone:
			"已為 {n} 段字幕加長口播（約 {sec}s），並更新預聽 — 下一步：混入口播（{n} 段）。",
		spokenLineLabel: "口播（TTS）— 可以長過畫面字",
		spokenLinePlaceholder: "呢段字幕顯示期間講嘅較長句子",
		productBriefLabel: "產品 / 主題（用於 AI 口播同音樂）",
		productBriefPlaceholder: "例如：粉水晶手串、咖啡店新品…",
		musicTopicLabel: "產品 / 主題（可選 — 令 AI 音樂更貼題）",
		musicTopicPlaceholder: "例如：手串、咖啡店… 留空則只用氛圍",
		planAdPackCta: "用 AI 規劃 hook、口播同音樂",
		previewProcessedHint: "顯示已處理版本 — 播放可聽 BGM / 口播。",
		previewAudioHint: "提示：加 BGM 後請取消靜音並調大音量。",
		libraryBgmPreviewLabel: "試聽音樂庫循環（播放器會循環）",
		libraryBgmDisclaimer:
			"音樂庫係短循環示範，音色相近。要唔同風格同配合片長，請用 AI 生成。",
		aiMusicNeedBrief:
			"請喺上方輸入產品/主題（或用 AI 規劃），先可以生成音樂。",
		aiMusicGenerateHint: "揀好上面氛圍即可生成 — 產品/主題可選填。",
		aiMusicGenerateFirst: "請先生成並試聽 AI 音樂，再按加 BGM。",
		aiMusicSelectTrack: "請揀一段 AI 音樂先套用。",
		aiMusicGeneratedNote:
			"已生成 {count} 段 AI 音樂 — 下面試聽後再按加 BGM。",
		defaultStyleLabel: "新字幕行預設樣式",
		defaultStyleHint:
			"每行可喺下拉選單覆蓋 — 例如 0–2s 粗標題、3–6s 簡約字。",
		lineStyleLabel: "樣式",
		linesHintPerLineStyle:
			"每行可獨立設定時間、位置同樣式 — 唔使全部用同一款。",
		timelineTitle: "字幕時間軸",
		timelineHint: "點擊色塊揀一行；喺下面調整入點同出點秒數。",
		timelineL2Hint:
			"拖動字幕色塊；頂部軌道修剪影片入出點。建議先加 BGM 先有準節拍，再開吸附或「對齊字幕到節拍」。",
		videoTrack: "影片",
		captionTrack: "字幕",
		bgmTrack: "BGM / 節拍",
		snapBeats: "吸附節拍",
		alignToBeats: "對齊字幕到節拍",
		beatStatusAnalyzing: "正在偵測節拍…",
		beatStatusReady:
			"已偵測 {n} 個節拍 — 開吸附拖動，或撳「對齊字幕到節拍」。",
		beatStatusEmpty: "未偵測到節拍 — 請先加 BGM，等系統再分析。",
		beatStatusUnavailable:
			"節拍偵測需要伺服器影片網址（請加 BGM 或由工作室開啟）。",
		beatAlignNeedBeats: "未有節拍 — 請先加 BGM 等偵測完成。",
		beatAlignDone: "已將字幕起點對齊最近嘅 {n} 個節拍。",
		trimVideoIn: "影片入點",
		trimVideoOut: "影片出點",
		trimFailed: "影片修剪失敗。",
		trimIn: "開始（秒）",
		trimOut: "結束（秒）",
	},
	imageCanvas: {
		badge: "獨立工具 · 唔使重新生成",
		title: "圖片畫布工作室",
		subtitle:
			"上傳任何 PNG / JPG — 拖曳標題、形狀同品牌 Logo 落圖。同 wizard 入面嘅 Konva 編輯器一樣，唔使再跑 AI 出圖。",
		uploadTitle: "圖片來源",
		uploadHint: "從電腦上傳、從作品庫揀，或喺 studio 生成圖片後開啟。",
		chooseFile: "選擇圖片",
		chooseFromLibrary: "從作品庫選擇",
		changeImage: "換一張圖",
		sourceFromStudio: "來自 Studio",
		sourceFromLibrary: "來自作品庫",
		libraryPickerTitle: "揀作品庫圖片",
		libraryPickerLoading: "載入作品庫中…",
		libraryPickerEmpty: "未有已儲存圖片。請先喺 studio 生成。",
		libraryPickerLoadError: "無法載入作品庫圖片。",
		libraryPickerCancel: "取消",
		libraryPickerUse: "用呢張",
		libraryPickerClose: "關閉",
		pipelineSourceNote: "使用你喺 studio 生成嘅圖 — 圖層會喺伺服器燒錄。",
		editorTitle: "畫布編輯器",
		applyBtn: "將圖層燒錄到圖片",
		applying: "燒錄中…",
		appliedNote:
			"已燒錄 — 可下載結果，或繼續改圖層（每次都由原始上傳圖重新燒錄）。",
		previewTitle: "結果預覽",
		previewEmptyHint: "加文字或形狀後，按「將圖層燒錄到圖片」。",
		previewResultHint: "顯示燒錄後結果 — 換圖可重新開始。",
		previewLoadFailed: "燒錄成功但預覽載入失敗 — 請試下載。",
		previewLoading: "載入圖片中…",
		showOriginal: "清除結果預覽",
		downloadBtn: "下載 PNG",
		downloading: "下載中…",
		downloadFailed: "下載失敗。",
		burnFailed: "無法將圖層套用到圖片。",
		needImage: "請先上傳或載入圖片。",
		invalidImageType: "請選擇圖片檔（PNG、JPG、WebP）。",
		stepUpload: "1. 圖片",
		stepClean: "2. 清理",
		stepDesign: "3. 加字",
		stepExport: "4. 匯出",
		stepUploadName: "圖片",
		stepCleanName: "清理",
		stepDesignName: "加字",
		stepExportName: "匯出",
		stepPrev: "上一步",
		stepNext: "下一步",
		stepContinueClean: "繼續去清理",
		stepContinueDesign: "繼續去加字",
		stepHowToUpload: "由作品庫或裝置載入圖片，然後繼續。",
		stepHowToClean:
			"可選：擦除 Logo 或文字，再用呢張圖加自己文案 — 唔使清就跳過。",
		stepHowToDesign: "喺畫布加標題同 Logo，再燒錄圖層匯出。",
		stepHowToExport: "下載成品，或返回畫布再改圖層。",
		canvasPrev: "上一版",
		canvasNext: "下一版",
		canvasVersion: (current: number, total: number) =>
			`圖片修改 ${current} / ${total}`,
		canvasRecoverEdits: "回到最初編輯",
		recoverOriginal: "恢復原圖",
		backToCanvas: "返回畫布編輯",
		stepSkipClean: "跳過 — 唔使清理",
		cleanTitle: "擦除唔要嘅部分（可選）",
		cleanHint:
			"用紫色塗滿要刪嘅位（連文字框邊緣一齊蓋住）。然後撳「擦走塗抹區域」— AI 會用周圍背景填返，唔使打字。",
		cleanBoxHint: "為每段文字拖貼實嘅方框 — 可畫多個後一次擦除",
		cleanMultiRegionHint:
			"可圈選最多 5 個區域。只會改你塗嘅位，唔會成個櫃／產品一齊刪。",
		cleanRegionCount: (n: number) => `已選 ${n} 個要擦走嘅區域`,
		cleanRemoveRegion: "區域",
		cleanDeleteSelected: "刪除已選區域",
		cleanUndoBrush: "撤銷筆刷",
		cleanMaxRegions: "每次最多 5 個區域 — 可再擦第二次。",
		cleanModeBox: "方框圈選",
		cleanModeBrush: "筆刷塗抹",
		cleanBrushSize: "筆刷大小",
		cleanAiStepsHint:
			"用紫色蓋住成個唔要嘅框（邊緣都要蓋）。\n撳「擦走塗抹區域」— AI 用附近背景填返（似手機相簿修復）。\n如果字寫錯：塗住錯字，輸入例如 改成「正確標題」，再撳「按描述替換」。\n要字體完美：先擦走，再到第 3 步自己加字。",
		cleanPresetRemoveText: "移除文字，背景自然",
		cleanPresetRemoveLogo: "移除 Logo，保留產品",
		cleanPresetSeamless: "清理背景，無文字",
		cleanPromptPlaceholder:
			"替換例子：改成「認識金砂石」／大理石枱面（擦走唔使寫）",
		cleanEraseBtn: "擦走塗抹區域",
		cleanFillBtn: "按描述替換",
		cleanCostNote:
			"每次擦走／替換消耗 1 次圖片額度。AI 只改你塗紫色嘅像素。",
		cleanPreviewTitle: "擦除結果預覽",
		cleanAcceptBtn: "使用此圖，繼續加字",
		cleanRetryBtn: "唔滿意，再試",
		cleanApplyNote: "清理完成 — 可以繼續加你自己嘅文字同 Logo。",
		cleanFillNote: "填補完成 — 可以繼續加你自己嘅文字同 Logo。",
		workflowNote:
			"建議流程：Studio 生成 → Wizard 快速修正 → 呢度擦除 → 第 3 步加字。",
		reeditHint: "圖層配置會儲存在瀏覽器（同一張圖）。",
		studioHint: "需要 AI 生成圖片？",
		studioLink: "開啟 Studio",
		sourcePreviewFailed: "無法載入圖片預覽。請檢查網絡或再試一次。",
		retryPreview: "再試",
		openFromDone: "為圖片加字同 Logo",
		doneHint: "用已生成嘅宣傳圖開啟畫布 — 加標題同品牌 Logo。",
		editAnotherHint:
			"每次「編輯」會開新分頁，呢個結果頁會留住 — 改完一張再返嚟改下一張。",
		backToResults: "返回工作室結果",
		backToLibrary: "返回作品庫",
		editAnotherFromLibrary: "從作品庫再選一張編輯",
	},
	visualCaptions: {
		badge: "Beta · 拖放定位",
		title: "視覺字幕實驗室",
		subtitle:
			"上傳影片，喺畫面任意位置拖放文字，設定時間，再匯出。同表格式字幕工作室唔同。",
		hint: "喺預覽畫面拖動文字框。拖動影片時間軸可預覽每句幾時出現。匯出會按你嘅座標燒錄落片。",
		uploadTitle: "上傳影片",
		uploadHint: "MP4、WebM 或 MOV",
		dragHint: "拖動文字定位 · 拖時間軸預覽出現時機",
		selectedClip: "已選文字",
		startSec: "開始（秒）",
		endSec: "結束（秒）",
		positionLabel: "位置",
		addClip: "+ 加文字",
		removeClip: "刪除",
		exportBtn: "匯出帶字幕影片",
		exporting: "匯出中…",
		exportFailed: "匯出失敗。",
		previewFailed: "匯出成功但預覽載入失敗 — 請試下載。",
		downloadBtn: "下載 MP4",
		changeVideo: "換另一條影片",
		needVideo: "請先上傳影片。",
		needText: "請至少加一段文字。",
	},
	contentResearch: {
		title: "AI 平台內容研究",
		physical: "實體產品",
		concept: "服務／品牌／概念",
		topicPlaceholder: "例如：水晶手鏈送禮指南、洗鼻器…",
		searchKeywordLabel: "搜尋關鍵字（喺呢個品類搵熱門帖）",
		searchKeywordPlaceholder: "例如：水晶手串、護膚流程…",
		platformsLabel: "搜尋平台",
		platformsHint: "揀一個平台，搵 trending 內容做風格參考。",
		promoteProductLabel: "你要推廣嘅產品",
		promoteProductPlaceholder: "例如：馬達加斯加粉水晶手鏈",
		promoteProductHint:
			"搜尋關鍵字搵品類熱門帖（例如：護膚）；呢度填你要賣嘅具體產品。版式參考帖文，文案同產品圖用你自己嘅。",
		promoteProductRequired:
			"請先填產品名稱 — 所有文案同圖片都會推廣呢個產品，唔會用參考帖話題。",
		researchBtn: "即時研究內容",
		directPostBadge: "快捷入口",
		directPostTitle: "或貼上你想跟嘅參考帖",
		directPostHint:
			"已有目標帖就唔使搜關鍵字 — 支援 xhslink、小紅書 explore 連結、Instagram /p/ 或 /reel/。實體產品請先填上方產品名稱。xhslink 失效時，請喺 App 內「分享 → 複製連結」貼完整連結。",
		directPostUrlLabel: "參考帖連結",
		directPostUrlPlaceholder:
			"例如 http://xhslink.com/o/… 或 Instagram reel 連結",
		directPostBtn: "用這篇帖",
		postUrlRequired: "請先貼上帖文連結。",
		directPostFailed: "無法載入此帖，請確認連結公開有效。",
		busy: "搜尋網頁並分析中…",
		failed: "內容研究失敗，請再試。",
		searchCooldown: "小紅書 API 需要冷卻 — 請等 {seconds} 秒再搜尋。",
		topicRequired: "請先輸入搜尋關鍵字。",
		topPicksTitle: "為你改寫嘅 3 個方向（參考爆款）",
		inspiredBy: "參考爆款",
		originalPostLabel: "原帖內容",
		yourAngle: "為你改寫",
		allPostsTitle: "全部搜到的貼文",
		prevPage: "上一頁",
		nextPage: "下一頁",
		pageOf: (page: number, total: number) => `第 ${page} / ${total} 頁`,
		totalAngles: (total: number) =>
			`今次搜尋共 ${total} 個方向 · 每次顯示 3 個`,
		carouselSlides: (count: number) => `${count} 圖`,
		researchMediaImage:
			"搜尋範圍：只找圖文／輪播帖（配合上方「圖片」模式）。",
		researchMediaVideo:
			"搜尋範圍：只找影片／Reels（配合上方「影片」模式）。",
		researchMediaBoth: "搜尋範圍：全部帖文類型（配合「圖片＋影片」模式）。",
		tiktokImageWarning:
			"TikTok 只有影片 — 圖文研究請選小紅書或 Instagram，或改選「影片」模式。",
		platformSearchHintXhs:
			"小紅書最適合中文品類詞（如 維他命C精華、護膚流程）— 直接搜筆記，有封面可揀風格。",
		platformSearchHintIgImage:
			"Instagram 圖文模式用 hashtag 搜 — 英文標籤最穩（vitaminc、skincare、serum）。",
		platformSearchHintIgHashtags: (tags: string) => `將搜尋：${tags}`,
		platformSearchHintIgCjk:
			"中文品類詞已轉成英文標籤；結果仍少就改打英文或換小紅書。",
		platformSearchHintIgVideo:
			"Instagram 影片模式用關鍵詞搜 Reels（中英文都得，如 vitamin c serum）。",
		platformSearchHintFacebook:
			"Facebook 用關鍵詞搜公開帖 — 品類詞通常比品牌名易搵參考。",
		platformSearchHintTiktok:
			"TikTok 只返回影片 — 用短句關鍵詞（skincare routine、開箱）。",
		useAngle: "用呢個方向",
		selectAngle: "揀呢個風格",
		selectedLabel: "已選擇 ✓",
		selectedContinueHint: "已選擇 — 撳底部「繼續」就會套用呢個風格。",
		resultTitle: "AI 研究結果（推薦）",
		resultSubtitle: "根據小紅書、Instagram、TikTok 熱門帖整理。",
		resultSubtitleForPlatform: (platform: string) =>
			`根據今次搜尋嘅${platform}熱門帖整理。`,
		styleSummaryLabel: "風格摘要",
		toneLabel: "語氣",
		layoutNotesLabel: "版面重點",
		viewMoreExamples: "睇更多例子",
		sourcePlatformsLabel: "來源平台",
		sourcePlatformLabel: "來源平台",
		morePlatforms: (count: number) => `+${count} 個`,
		applyingAngle: "下載參考片並套用中…",
		applied: "已套用 — 請檢查欄位再繼續。",
		appliedWithReference:
			"已套用 — 已把參考貼文封面載入為風格參考圖，請檢查欄位再繼續。",
		appliedWithVideoReference:
			"已套用 — 已載入參考短片，系統會分析影片分鏡並用「跟參考片」生成（唔係淨係封面）。",
		appliedWithVideoAttached:
			"已套用 — 參考 MP4 已下載並載入，系統會自動分析短片分鏡。",
		appliedCoverOnlyVideoFailed:
			"已套用文案同封面，但參考 MP4 未下載成功 — 請揀有「MP4」標記嘅帖，或手動上傳短片。",
		videoDownloadFailed:
			"參考 MP4 下載失敗 — 請揀另一帖（封面有 MP4 標記），或手動上傳短片。",
		videoResolveFailed:
			"無法從此帖取得影片網址 — 請揀有「MP4」標記嘅帖，或換關鍵字再搜尋。",
		videoUrlMissing: "此帖冇可用影片 — 影片模式請揀標有 MP4 嘅帖。",
		videoReadyUrl: "MP4",
		videoReadyResolve: "影片",
		videoReadyMissing: "無影片",
		appliedWithCarouselReference:
			"已套用 — 已載入輪播參考圖，並設定最合適嘅出圖模式同風格，請檢查欄位再繼續。",
		appliedReferenceImageFailed:
			"參考圖下載失敗 — 文案同格式已套用，但冇載入到參考圖。請揀另一個方向，或喺第 2 步手動上傳參考圖。",
		appliedCopyOnlyNoImage:
			"已套用文案同出圖模式（教學輪播／單圖等）— 視覺參考圖未載入，生成前請上傳參考圖或換一個方向。",
		researchHiddenNoCover: "已隱藏 {count} 個無法載入封面嘅帖文。",
		appliedContinue: "已套用 — 檢查主標題同出圖模式，然後去 Step 2。",
		scoreLabel: "適合度",
		allAnglesTitle: "全部角度",
		liveBadge: "即時網頁研究",
		playbookBadge: "AI 建議（無搜尋）",
		sourceLabel: "參考來源",
		sourcesTitle: "網頁來源",
		postsTitle: "平台上搜到嘅熱門貼文（封面預覽）",
		likes: "讚",
		collects: "收藏",
		comments: "評論",
		openNote: "打開原帖",
		noCover: "無封面",
		platforms: {
			xiaohongshu: "小紅書",
			instagram: "Instagram",
			tiktok: "TikTok",
			facebook: "Facebook",
		},
	},
	studioAssistant: {
		title: "工作室嚮導",
		subtitle: "問 Alchemy 點用 · 或者幫你開路",
		welcome:
			"你好！可以問 Alchemy 點運作（Tokens、頁面、single clip vs stitch），或者話我想出咩，我幫你開正確路徑。",
		welcomeLanding:
			"你好！問我 Alchemy 任何嘢 — Tokens、studio／字幕／修圖、免費額度夠唔夠。或者話你想推廣咩，我幫你開路。",
		welcomeStart:
			"唔肯定實體定概念？描述目標或貼網址 — 我會話你揀邊張卡、入 studio 要填咩。",
		welcomeEditImage:
			"你而家喺修圖工作室。上傳或從作品庫揀圖，問我點清雜物、加 logo／文字、或匯出。我會喺呢頁教你。",
		welcomeCaptions:
			"你而家喺字幕工作室。匯入任何 MP4 — 我幫你改時間軸字幕、BGM、配音，再燒錄。唔使重新出片。",
		welcomePro:
			"Pro 畫布 — 將 Upload → Image → Video 節點接好。跑之前可以問我順序同成本。按次 token 計費。",
		welcomeBrandKit:
			"品牌套件 — 上傳一次 logo 同品牌色。分鏡靜幀要唔要蓋 logo 可以問我。",
		welcomeLibrary:
			"呢度係作品庫。問我點樣再開去修圖／字幕，或者下載檔案。",
		welcomeUgc:
			"UGC 工作室 — 話我知產品同感覺（開箱、評價、街拍）。要分鏡廣告就同我講，我帶你去 /studio。",
		welcomeSite:
			"你好 — 可以問 Alchemy 點用，或者我幫你開 wizard、修圖、字幕、Pro 畫布或品牌套件。",
		shortLabel: "問 AI",
		openingStudio: "正在開啟工作室並套用設定…",
		studioContinued:
			"你已入 studio — 對話會保留。回覆 下一步 繼續 Step 2。",
		placeholder: "例如：免費額度夠唔夠 12 秒 TVC？或者：手鏈 Reel…",
		thinking: "諗緊…",
		send: "發送",
		close: "關閉",
		spotlightDismiss: "知道了 — 關閉提示",
		signInToChat: "請先登入使用工作室導覽 — 登入後再發送訊息。",
		openLauncher: "開啟工作室助理",
		dialogLabel: "工作室助理對話",
		errorNetwork: "連線有啲唔穩，請稍後再試。",
		actionApplied: "已套用 — 請睇設定步的欄位，準備好就繼續。",
		websiteReelApplied:
			"已設定 8 秒 Reel 配方並填入網址。若 headline 未填，按「分析品牌」，然後繼續 → 出圖 → 出片。",
		analyzingBrand: "正在讀取網站並填入品牌欄位…",
		brandAnalyzed:
			"已分析品牌 — {name}。建議 headline：{headline}。請檢查設定步，然後繼續出圖。",
		brandAnalyzeFailed:
			"暫時無法分析網站。請在設定步貼網址再按「分析品牌」，或稍後再試。",
		chipSetupWebsite: "一鍵設定並進入工作室",
		chipProductImagePost: "產品圖文帖",
		chipContentResearch: "研究平台內容方向",
		unknownAction: "嗰個掣冇反應 — 請用下面呢個掣。",
		renewConversation: "重新對話",
	},
	microWizard: {
		progress: "步驟 {current} / {total}",
		continue: "繼續",
		skip: "跳過",
		classicLink: "進階工作室",
		footerHint: "需要全部選項？",
		outputGoalTitle: "你想創作什麼？",
		outputGoalHint: "揀圖片、影片或兩者 — 進階工作室可隨時改。",
		pickAngleTitle: "揀參考貼文",
		pickAngleHint: "從平台研究揀一個角度 — 只借排版同風格，唔抄話題。",
		generateImageTitle: "生成圖片",
		generateWaitEyebrow: "第 5 步",
		generateImageHint: "確認上面設定後，生成海報或關鍵幀。",
		generateImageFooterHint:
			"揀出圖數量（單張 / A/B / Campaign / 教學輪播），然後按下方「生成相片」。",
		referenceAnalyzeReadyTitle: "參考圖分析完成",
		referenceAnalyzeReadyHint:
			"分析完成 — 會自動進入下一步；亦可按「繼續」。",
		referenceAnalyzeTapContinue: "✓ 分析完成 — 請按下方「繼續」",
		referenceLoadingHint: "正在載入參考圖…",
		imageReviewTitle: "檢查生成圖片",
		imageReviewHint: "確認圖片同文案，滿意就按「繼續」。",
		generateVideoTitle: "生成影片",
		generateVideoHint: "確認上面設定後，生成 Reels。",
		generateVideoFooterHint: "準備好就撳下方「生成影片」。",
		videoResultEyebrow: "第 5 步",
		videoResultTitle: "影片已準備好",
		videoResultHint: "預覽、下載無聲片，或開啟字幕工作室加音樂同文字。",
		videoResultEmpty: "未有影片 — 返回再生成。",
		videoResultRegenerate: "再生成一次",
		videoModeTitle: "影片創作模式",
		videoModeHint: "影片生成 點樣用你嘅關鍵幀或參考片？",
		imagePromptTitle: "圖片潤色 prompt",
		imagePromptHint: "生成前可選填 — 俾 AI 出圖 嘅額外指示。",
		cinematicModeTitle: "概念電影感模式",
		cinematicModeHint: "而家只支援單場 8 秒電影感。多場景拼接未開放。",
		sceneCountTitle: "幾個場景？",
		sceneCountHint: "每場約 8 秒。4–5 場 ≈ 拼接後 30–40 秒。",
		intakeTitle: "點樣開始？",
		intakeHint: "平台研究搵 trending 排版；直接創作可自己上傳參考。",
		intakeResearchTitle: "平台研究",
		intakeResearchDesc: "瀏覽帖子搵風格 — 文案仍然係你嘅主題。",
		intakeDirectTitle: "直接創作",
		intakeDirectDesc: "跳過研究 — 可選上傳參考圖。",
		intakeFuse: {
			stepEyebrow: "第 3 步",
			title: "研究風格，定直接創作。",
			hint: "平台研究借排版同風格 — 產品名仍然係你嘅。直接創作會跳過研究，繼續設定。",
			conceptTitle: "研究風格，定用概念助手。",
			conceptHint: "平台研究搵排版參考。概念助手直接寫簡報，唔使先研究。",
			pathOptionsPhysical:
				"任選一種開始：① 平台研究 · ② 直接創作 · ③ 或喺下面貼參考帖連結。",
			pathOptionsConcept:
				"任選一種開始：① 平台研究 · ② 概念助手 · ③ 或貼參考帖 / 遲啲再設。",
			tabsAriaLabel: "點樣開始",
			tabResearch: "平台研究",
			tabDirect: "直接創作",
			tabAssistant: "概念助手",
			pickTabHint: "揀一個分頁先繼續 — 研究或直接創作。",
			tipTitle: "參考風格，唔抄內容。",
			tipIntro:
				"AI 會分析排版、語氣、色調同構圖 — 唔會抄貼文內容或品牌。",
			tip1: {
				title: "效果更好",
				body: "關鍵字寫得具體啲，研究結果會更接近你想要嘅風格。",
			},
			tip2: {
				title: "多個平台",
				body: "覺得唔啱可以換平台試 — 每個 feed 風格唔同。",
			},
			tip3: {
				title: "風格大於內容",
				body: "我哋借設計同構圖規律 — 文案仍然講你嘅產品。",
			},
			tipSecure: {
				title: "你嘅資料安全",
				body: "我哋唔會分享你輸入嘅內容或參考連結。",
			},
			conceptTip3: {
				title: "風格大於內容",
				body: "我哋借設計同構圖規律 — 文案仍然講你嘅服務或概念。",
			},
			assistantTipTitle: "概念助手點幫你",
			assistantTipIntro:
				"你寫主題同方向，AI 幫你填標題同視覺 — 唔使先做平台研究。",
			assistantTip1: {
				title: "寫清楚服務",
				body: "一兩個短句講你推咩同對象就夠。",
			},
			assistantTip2: {
				title: "下一頁再微調",
				body: "創作方向、參考圖同輸出格式會喺設定頁一次完成。",
			},
			assistantTip3: {
				title: "之後可改",
				body: "標題同文案喺設定頁仍然可以改。",
			},
			directTitle: "而家跳過研究",
			directBody:
				"下一步會揀直接創作或模特兒佩戴、可選上傳參考圖，再用同研究路徑一樣嘅設定頁。",
			directBullets: [
				"唔使先做平台搜尋",
				"揀直接創作或模特兒佩戴／使用",
				"可選參考圖喺下一頁設定",
			],
			videoDirectBody:
				"下一步會揀短片方向（產品動態、參考片或 UGC），再喺同一個設定頁填文案、上傳產品相同片長。",
			videoDirectBullets: [
				"唔使先做平台搜尋",
				"產品動態：相片 → 短片（最快）",
				"片長同解像度會顯示預計 token",
			],
			assistantIntro:
				"描述你嘅服務或優惠 — AI 幫你填標題同視覺方向。會跳過平台研究。",
		},
		primaryStyleTitle: "選擇創作方向",
		primaryStyleHint:
			"先揀快速廣告或模特兒佩戴／使用。UGC 同參考排版屬影片或其他進階路徑。",
		productNameTitle: "產品名稱",
		productNameHint: "賣緊乜？會用作標題同 prompt 錨點。",
		productNameStep: {
			stepEyebrow: "第 3 步",
			title: "產品叫咩名？",
			hint: "會用作標題、prompt 同分鏡規劃 — 寫短啲、清楚啲就得。",
			label: "產品名稱",
			labelHint: "繼續前必須填寫",
			placeholder: "例如：金砂石手鏈",
			examplesLabel: "試下例子",
			examples: ["金砂石手鏈", "便攜電源", "維他命 C 精華"],
			tipTitle: "點解要填？",
			tipBody:
				"Studio 會用產品名寫出圖 prompt、影片簡報同畫面文案，等廣告對準你賣緊嘅嘢。",
			tipNote: "之後隨時可以改",
			tipNoteBody: "喺設定或進階工作室都可以再改。",
		},
		preGenerateSetup: {
			stepEyebrow: "第 4 步",
			titleBefore: "設定你嘅",
			titleAccent: "內容同素材",
			title: "設定你嘅內容同素材",
			hint: "填內容詳情、上傳產品相、揀輸出類型同風格。",
			directHint:
				"揀直接創作或模特兒佩戴、可選上傳參考圖，再填內容同產品相 — 同研究路徑揀完後嘅設定一樣。",
			conceptHint:
				"檢查研究簡報同文案，可選上傳產品相，再揀輸出類型同生成 — 概念廣告唔一定要有產品相。",
			conceptDirectHint:
				"先揀創作方向，可選上傳參考圖，再填文案同生成 — 概念廣告唔一定要有產品相。",
			conceptTopicLabel: "概念主題",
			conceptTopicRequired: "必填",
			productPhotosOptionalTitle: "產品相片（選填）",
			mainPhotoOptional: "選填",
			mainPhotoOptionalHint:
				"有產品相可以上傳 — 冇嘅話會用主題、文案同研究風格出圖。",
			stylePickerTitle: "創作方向",
			stylePickerHint:
				"揀一個：直接產品廣告、設計海報、零件拆解、或模特兒佩戴／使用。",
			conceptStylePickerHint:
				"每個選項會改排版提示 — 資訊圖、設計海報、品牌風格、方案優惠卡、或網站上線。",
			stylePickerQuickLabel: "直接創作",
			stylePickerQuickDesc: "以產品為主嘅宣傳圖，唔一定要有模特兒。",
			stylePickerDesignedLabel: "設計海報",
			stylePickerDesignedDesc:
				"商業 feed 海報 — 你填嘅標題＋標語上圖（唔限食品）。",
			stylePickerPartsLabel: "零件拆解",
			stylePickerPartsDesc:
				"產品爆炸圖 — 拆開零件並標註說明，一張海報連標題同內容。",
						stylePickerGamingLabel: "電競封面",
			stylePickerGamingDesc:
				"AAA 封面靜圖 — 場景內大字、HUD、身份鎖定英雄。",
			stylePickerSportsLabel: "運動大字",
			stylePickerSportsDesc:
				"巨大疊層動作詞（SMASH／SPIKE…）加運動能量。",
			stylePickerJellyLabel: "果凍 3D",
			stylePickerJellyDesc:
				"極簡透亮果凍／玻璃 3D — 少量品牌字。",
			stylePickerModelLabel: "模特兒佩戴／使用",
			stylePickerModelDesc: "畫面有人佩戴或使用你嘅產品。",
			stylePickerModelLockedHint: "有參考圖時唔可用 — 會跟參考圖版式。",
			stylePickerModelLockedNote:
				"已上傳參考圖，模特兒佩戴會停用。出圖會跟參考圖版式。想用模特兒佩戴請先移除參考圖。",
			referenceUploadTitle: "參考圖（選填）",
			referenceUploadHint:
				"上傳版式／風格參考，AI 會分析並借構圖。只有產品相同文案都可以出圖。",
			referenceRemove: "移除",
			referenceTitle: "參考創意簡報",
			changeBrief: "改簡報",
			noReference: "未有參考",
			briefSummaryTitle: "簡報分析摘要",
			briefProduct: "產品",
			briefTarget: "對象",
			briefGoal: "目標",
			briefTone: "語氣",
			briefKeyMessage: "關鍵訊息",
			contentTitle: "內容詳情",
			hookLabel: "主標題 (hook)",
			supportingLabel: "輔助文案",
			extraLabel: "額外要求",
			extraOptional: "（選填）",
			onImageBadge: "會出現喺圖上",
			copyPresetHint:
				"呢兩格請你改成自己嘅文案，會印喺圖上。唔改就用而家預填嘅字（研究角度或預設模板）。",
			conceptCopyFocus: {
				info: {
					title: "呢個方向：重點填「賣點條列」",
					body: "主標題係 hook；輔助文案請一行一個賣點 — 會直接變成資訊圖 bullets。",
					supportingLabel: "賣點條列（一行一點）",
					supportingPlaceholder:
						"例如：\n天然成分\n即時見效\n適合每日使用",
				},
				designed: {
					title: "呢個方向：重點填「會上海報嘅字」",
					body: "主標題 = 海報大標題（你填咩就畫咩，唔會換成產品名或亂發明標語）。輔助文案 = 短標語。額外要求只寫色調／場景。",
					hookLabel: "海報主標題 (hook)",
					hookPlaceholder: "例如：便攜續航 · All-day power",
					supportingLabel: "海報標語",
					supportingPlaceholder:
						"短句上海報，例如：Creamy & Juicy／柔軟新鮮",
				},
				parts: {
					title: "呢個方向：重點填「標題＋零件標註」",
					body: "主標題 = 海報標題。輔助文案 = 一行一個零件短說明 — 會變成爆炸圖標註。額外要求寫燈光／零件數量／背景氣氛。",
					hookLabel: "海報主標題 (hook)",
					hookPlaceholder: "例如：內在結構 · Inside the build",
					supportingLabel: "零件標註（一行一點）",
					supportingPlaceholder:
						"例如：\n電池 — 全日續航\n外殼 — 磨砂防滑\n晶片 — 快充 IC",
				},
				"gaming-cover": {
					title: "呢個方向：填封面大字",
					body: "主標題會變成場景入面嘅大字。上傳圖鎖英雄／產品身份。輔助文案＝HUD。額外＝場景／燈光。",
					hookLabel: "封面標題",
					hookPlaceholder: "例如：CHALLENGE · 決戰",
					supportingLabel: "HUD／輔助句",
					supportingPlaceholder: "短遊戲標語（可選）",
				},
				"sports-big-words": {
					title: "呢個方向：填巨大動作詞",
					body: "主標題驅動巨大疊層字（SMASH／SPIKE…）。上傳＝運動員或產品動作。輔助＝HUD 數據。",
					hookLabel: "大字／標題",
					hookPlaceholder: "例如：SMASH · 爆發",
					supportingLabel: "HUD／輔助句",
					supportingPlaceholder: "短運動 HUD（可選）",
				},
				"jelly-3d": {
					title: "呢個方向：填少量品牌字",
					body: "主標題＝頂部稀疏字。上傳引導果凍造型／品牌。輔助＝底部品牌行。畫面保持極簡。",
					hookLabel: "頂部品牌行",
					hookPlaceholder: "例如：ONE YEAR · 一週年",
					supportingLabel: "底部品牌行",
					supportingPlaceholder: "短品牌句（可選）",
				},
				brand: {
					title: "呢個方向：重點係品牌風格",
					body: "有網站／社交請先做品牌分析。主標題同輔助文案會跟品牌色調排版，唔係價卡。",
					supportingLabel: "品牌訊息／副標",
					supportingPlaceholder: "例如：專業顧問 · 可信賴 · 本地服務",
				},
				pricing: {
					title: "呢個方向：重點填「優惠／CTA」",
					body: "主標題寫方案名；優惠欄會變成價卡／套票上嘅 CTA。冇填優惠就唔會發明價錢。",
					supportingLabel: "方案重點（簡短）",
					supportingPlaceholder: "例如：三個方案 · 適合初學／進階",
					offerLabel: "優惠／CTA（建議填）",
					offerPlaceholder: "例如：限時 8 折 · 立即報名 · 首月 $198",
				},
				website: {
					title: "呢個方向：重點係上線 hook",
					body: "主標題寫上線賣點；輔助文案寫功能／好處。畫面會偏網站／App mockup。",
					supportingLabel: "功能／好處",
					supportingPlaceholder: "例如：一鍵預約 · 即時確認 · 手機都用得",
					offerLabel: "CTA（選填）",
					offerPlaceholder: "例如：立即體驗 · 免費試用",
				},
			},
			outputTypeTitle: "輸出類型",
			productPhotosTitle: "上傳產品相片",
			dragDrop: "拖放上傳",
			addMore: "再加",
			mainPhotoBadge: "主圖",
			anglePhotoBadge: "選填角度",
			mainPhotoRowLabel: "主圖",
			mainPhotoRequired: "必須",
			mainPhotoHint: "清晰正面產品相 — 輸出會以呢張做產品身份。",
			anglePhotoRowLabel: "其他角度",
			anglePhotoOptional: "選填",
			anglePhotoHint: "額外角度幫 AI 睇材質同外形細節，唔係必須。",
			productPhotosHint:
				"主圖必須上傳，決定產品樣貌。額外角度選填，會一併參考細節。",
			imageOptionsTitle: "圖片選項",
			storyboardLookBeforePlanHint:
				"先揀畫面風格 — 會寫入 AI 分鏡大綱同之後嘅靜幀。",
			storyboardTextModeHint:
				"預設無字靜幀（字幕之後先燒）。想每格有標題就揀 AI 圖上文字 — 影片會盡量跟住字做動態。",
			styleLabel: "揀畫面風格",
			aspectLabel: "比例",
			textModeLabel: "文字模式",
			tipTitle: "更好效果小提示",
			tipIntro: "",
			tip1: {
				title: "用清晰產品相",
				body: "光線充足、產品清楚，AI 先留得住你嘅產品。",
			},
			tip2: {
				title: "Hook 寫具體啲",
				body: "短而清楚嘅標題，好過空泛宣傳句。",
			},
			tip3: {
				title: "揀啱輸出格式",
				body: "單張發帖、A/B 比較、輪播適合教學故事。",
			},
			tip4: {
				title: "風格可交俾 AI",
				body: "風格、比例、文字模式預設通常夠用 — 有需要先改。",
			},
			conceptTip1: {
				title: "產品相唔係必須",
				body: "有相可以上傳；冇相都可以用主題、文案同創作方向出圖。",
			},
			conceptTip2: {
				title: "Hook 寫具體啲",
				body: "短而清楚嘅標題，好過空泛宣傳句。",
			},
			conceptTip3: {
				title: "揀啱輸出格式",
				body: "單張發帖、A/B 比較、輪播適合教學或方案故事。",
			},
			conceptTip4: {
				title: "創作方向會改排版",
				body: "資訊圖、品牌風格、方案優惠、網站上線 — 每個選項用唔同提示。",
			},
			conceptBriefTopic: "主題",
			conceptReferenceUploadHint:
				"上傳版式／風格參考，AI 會分析並借構圖。只填主題同文案都可以出圖。",
			conceptMainPhotoOptionalHint:
				"有相可以上傳 — 冇嘅話會用主題、文案同創作方向／參考風格出圖。",
			combinedHint:
				"填文案、上傳產品相、可選故事備註，再生成多格場景圖 — 下一步會串成一條無聲短片。",
			combinedConceptHint:
				"填主題同文案、相片選填、可選故事備註，再生成多格場景圖 — 下一步會串成一條無聲短片。",
			storyboardTitle: "分鏡短片",
			storyboardHint: "選填故事備註，同片長／場景數，用嚟串成一條 Reel。",
			secureNote: "你嘅選擇安全保存，唔會對外分享。",
		},
		preVideoSetup: {
			titleBefore: "設定你嘅",
			titleAccent: "影片詳情",
			hint: "填文案、上傳產品相、寫／確認動態 prompt、揀片長，再生成無聲短片。",
			scenesReadyHint:
				"場景圖已準備 — 會用 單鏡出片 一次出一條片（全部靜幀）。字幕之後再加。",
			scenesReadyTitle: "分鏡場景已準備",
			scenesReadyBody: "呢啲靜態圖會合成一條短片 短片。壞格請先重產嗰格。",
			assistantHint:
				"上傳產品相 → AI 寫動態 prompt → 檢查後再生成（無聲片；字幕之後再加）。",
			assistantTitle: "AI 動態 Prompt",
			assistantBody:
				"AI 會睇你嘅產品相，寫鏡頭點樣郁 — 唔係口播講稿或字幕。",
			assistantNeedPlan: "請先分析相片 — 未有動態 prompt 前唔可以生成。",
			assistantTip1: {
				title: "先寫動態 prompt",
				body: "撳「分析相片並寫動態 Prompt」再生成。",
			},
			assistantTip2: {
				title: "可改 prompt",
				body: "生成前可以改 AI 寫好嘅運鏡文字。",
			},
			conceptPlanTitle: "AI 動態 Prompt",
			conceptPlanBody:
				"AI 會按你嘅簡報或品牌線索寫短片點樣郁 — 唔係口播講稿。",
			conceptPlanNeed:
				"請先撳「AI 寫動態 Prompt」— 未有 prompt 前唔可以生成。",
			conceptHint:
				"確認主題同文案，相片選填，寫動態 prompt，揀片長，再生成。",
			conceptCreativeHint:
				"寫清創作方向，寫動態 prompt，相片選填，再生成。",
			conceptBrandHint:
				"可加品牌網站線索，寫動態 prompt，相片選填，再生成。",
			sceneReelHint:
				"寫場景方向；可加官網／IG 對齊品牌；可選參考 MP4 跟運鏡。相片選填。",
			referenceVideoHintConcept:
				"選填 — 跟運鏡／節奏，唔係逐格複製。概念短片可以無產品相。",
			contentTitle: "內容詳情",
			hookLabel: "主標題 (hook)",
			supportingLabel: "輔助文案",
			extraLabel: "額外運鏡備註",
			extraOptional: "（選填）",
			onImageBadge: "會出現喺結尾靜圖",
			inVideoBadge: "會出現喺影片",
			requiredBadge: "必填",
			conceptLockWaysBadge: "圖 · Logo · 靜圖",
			h3PathFocusLead: "呢條 path",
			motionPosterCopyFocus: {
				title: "動態海報：重點填「結尾靜圖標題」",
				body: "開頭靜圖無字；結尾靜圖會用你嘅主標題做大海報字（輔助文案可做副標）。產品相必須 — 係主體。額外備註只寫光線／場景，唔好當標題。",
				hookLabel: "結尾靜圖標題 (hook)",
				hookPlaceholder: "例如：便攜續航 · All-day power",
				supportingLabel: "結尾靜圖副標",
				supportingPlaceholder: "標題下短句（選填）",
				extraLabel: "額外畫面／運鏡備註",
				extraPlaceholder: "例如：左上柔光、枱面場景、唔出人…",
			},
			conceptTopicLabel: "主題／服務",
			productPhotoTitle: "產品相片",
			productPhotoHint: "清晰產品相 — 必須。會做短片入面嘅主體。",
			productPhotoWithRefHint:
				"必須 — 你嘅產品做 @Image1。參考 MP4 只提供運鏡／剪輯感覺。",
			neonIdentityPhotoTitle: "Logo／吉祥物（霓虹身份）",
			neonIdentityPhotoHint:
				"選填 — 將 Logo 或吉祥物放呢度，鎖定霓虹外形。亦可用品牌包 Logo。唔上傳就用通用霓虹符號。",
			conceptPhotoTitle: "參考相片（選填）",
			conceptPhotoHint:
				"選填 — 幫畫面落地；概念短片亦可以只靠簡報 + 動態 prompt。",
			brandTitle: "品牌網站",
			brandHint: "選填分析 — 幫動態 prompt 同畫面語氣。",
			dragDrop: "上傳",
			settingsTitle: "影片設定",
			settingsHint: "片長同解像度會影響 token 費用。",
			aspectLabel: "海報尺寸",
			aspectHint:
				"靜圖同影片共用呢個比例。9:16 Reels／Stories · 4:5 IG feed · 1:1 正方形。",
			klingSettingsHint:
				"影片會先用 單鏡出片（全部靜幀 → 一條）。單鏡失敗先會改 拼接後備 拼接，唔使你揀 5／10 秒。",
			klingClipLabel: "每場片長",
			klingClipHint:
				"拼接後備 每場只支援 5 秒或 10 秒 — 唔係 參考片模式 嗰種 4–12 秒總片長。",
			klingTotalLabel: "合計約 {total} 秒（{n} × {clip} 秒）",
			costLabel: "預計約 {n} 點數",
			tipTitle: "更好影片小提示",
			tip1: {
				title: "用清晰產品相",
				body: "光線充足嘅產品相，動態時先留得住產品樣貌。",
			},
			tip2: {
				title: "Hook 寫短啲",
				body: "具體標題幫到動態方案唔離題。",
			},
			tip3: {
				title: "留意片長同費用",
				body: "愈長愈高解像度愈貴 — 建議先試 6–8 秒。",
			},
			klingTip1: {
				title: "圖下有劇本",
				body: "AI 場景文案顯示故事節拍 — 之後可以燒成字幕。",
			},
			klingTip2: {
				title: "一鏡到底",
				body: "全部靜幀入同一條 單鏡出片，唔係四段分開出。",
			},
			klingTip3: {
				title: "先修好靜幀",
				body: "壞格先重產再出片。影片只會郁你鎖住嘅畫面。",
			},
			conceptTip1: {
				title: "相片可以唔傳",
				body: "主題 + 簡報 + 動態 prompt 已夠出片 — 有畫面先上傳。",
			},
			conceptTip2: {
				title: "簡報寫具體啲",
				body: "氣氛、運鏡、對象，好過空泛「靚啲」。",
			},
			conceptTip3: {
				title: "先短後長",
				body: "6–8 秒夠睇節奏，再決定係咪加長。",
			},
			stylePickerTitle: "點樣做呢條短片",
			stylePickerHint:
				"AI 按產品相寫動態 prompt，或者跟參考／研究短片嘅運鏡方案。",
			referenceHint:
				"上傳參考 MP4（會分析運鏡）。產品短片仲要上傳產品相做 @Image1，再生成。",
			ugcHint: "UGC 要先出對嘴關鍵幀 — 繼續去設定 presenter 短片。",
			ugcContinueLabel: "繼續去關鍵幀",
			ugcNextNote: "下一步會生成對嘴關鍵幀、檢查畫面，再出 UGC 短片。",
			ugcPhotoHint: "清晰產品相，方便 presenter 展示。",
			referenceVideoTitle: "參考短片（MP4）",
			referenceVideoHint:
				"會分析運鏡／剪輯感覺 — 唔係逐格複製。唔會當口播講稿用。",
			referenceUploadCta: "上傳參考 MP4",
			referenceRemove: "移除",
			refTip1: {
				title: "揀清楚啲嘅短片",
				body: "6–15 秒、運鏡清楚嘅 reel 好過太雜嘅 montage。",
			},
			refTip2: {
				title: "內容係你嘅",
				body: "產品同文案仍然係你 — 只借動態語言。",
			},
			ugcTip1: {
				title: "產品相仍然要",
				body: "UGC 關鍵幀仍然需要清晰產品相。",
			},
			ugcTip2: {
				title: "講稿下一步先填",
				body: "關鍵幀之後先設定 presenter pack 同對嘴講稿。",
			},
			secureNote: "你嘅選擇安全保存，唔會對外分享。",
		},
		conceptNameStep: {
			stepEyebrow: "第 3 步",
			title: "你嘅概念係咩？",
			hint: "寫出要推廣嘅服務、品牌、會員或活動概念 — 下一步會揀研究或概念助手。",
			label: "你嘅概念",
			labelHint: "繼續前必須填寫",
			placeholder: "例如：瑜伽會員招募",
			examplesLabel: "試下例子",
			examples: [
				"護膚品牌煥新",
				"瑜伽會員招募",
				"雙十一閃購",
				"美白當日預約",
				"顧問官網發布",
				"週末早午餐推廣",
			],
			tipTitle: "點解要填？",
			tipBody:
				"Studio 會用呢個概念寫 prompt、簡報同畫面文案，等廣告清楚講你推緊嘅品牌、會員、優惠或活動。",
			tipNote: "之後隨時可以改",
			tipNoteBody: "喺設定或進階工作室都可以再改。",
		},
		conceptTitle: "概念助手",
		conceptHint: "描述服務或優惠 — 非實體 SKU。",
		conceptSourceTitle: "概念從哪裡開始？",
		conceptSourceHint:
			"揀一個起點 — AI 概念簡報或平台研究參考，唔會同時混用。",
		conceptSourceAssistantTitle: "概念助手",
		conceptSourceAssistantDesc:
			"由 AI 幫你寫文案同視覺方向 — 跳過平台研究。",
		conceptSourceResearchTitle: "平台研究",
		conceptSourceResearchDesc:
			"搵 trending 排版參考 — 跳過概念助手，之後必須檢查文案。",
		conceptTopicTitle: "你嘅概念",
		conceptTopicHint: "寫出要推廣嘅服務、品牌、會員或活動概念 — 下一步會揀研究或概念助手。",
		conceptTopicLabel: "你嘅概念",
		conceptTopicPlaceholder: "例如：瑜伽會員招募",
		copyEditTitle: "內容與生成設定",
		copyEditHint: "主標、副標、優惠同可選品牌設定。",
		brandKitSummary: "品牌設定（可選）",
		refImageTitle: "參考圖（可選）",
		refImageHint: "借排版同色調 — 產品同文案仍然係你嘅主題。",
		imageOptionsTitle: "圖片選項",
		imageOptionsHint: "畫面風格、比例、文字模式 — 預設大多數路徑已夠。",
		videoSettingsTitle: "影片設定",
		videoSettingsHint: "片長同解像度影響收費 — 生成前請確認。",
		analyzing: "分析中…",
		generatingImage: "正在生成相片…",
		generatingVideo: "生成影片中…",
		reelDownloading: "正在下載參考 reel…",
		fallbackTitle: "微步驟即將支援",
		fallbackHint: "此路徑請先用進階工作室，直至 v2 完整支援。",
		blockReasons: {
			pick_output: "請揀圖片、影片或兩者。",
			pick_subject: "請揀實體產品或服務/概念。",
			pick_intake: "請揀平台研究或直接創作。",
			complete_research: "請先揀一個研究方向（或貼參考帖），再撳繼續 — 或改揀直接創作。",
			pick_concept_source: "請揀概念助手或平台研究。",
			need_pick_angle: "請揀研究貼文或上傳參考。",
			pick_cinematic_mode: "請揀單場或多場拼接。",
			pick_combined_style: "請揀分鏡故事片工作流。",
			pick_video_subpath: "請揀影片創作方式。",
			need_product_name: "請輸入產品名稱。",
			need_concept: "請輸入概念 idea。",
			need_concept_topic: "請輸入研究主題。",
			need_product_photo: "請上傳產品相片。",
			need_creative_brief: "請填寫創意影片簡介。",
			need_reference_video: "請上傳參考 MP4（或從研究揀 reel）。",
			need_brand_website: "品牌網站係選填 — 可以唔填直接繼續。",
			need_duration_before_reel: "請先選明確片長再分析 reel。",
			reference_analyzing: "請等參考分析完成。",
			brand_analyzing: "請等品牌分析完成。",
			reel_analyzing: "請等 reel 分析完成。",
			reel_downloading: "正在從平台研究下載參考 reel…",
			need_headline: "請填主標或概念 idea。",
			image_busy: "請等圖片生成完成。",
			image_not_ready: "請等生成圖片顯示。",
			need_storyboard_approve: "請先確認分鏡靜幀（九宮格）再繼續做片。",
			need_visual_lock: "請上傳產品圖、Logo 或吉祥物靜圖 — 單靠文字／主題唔夠。",
			video_busy: "請等影片生成完成。",
			video_not_ready: "影片未完成 — 請等生成，或返回再試。",
			plan_video_busy: "請等 AI 動態方案寫完。",
		},
		combinedStyleTitle: "圖片+影片工作流",
		combinedStyleHint:
			"圖+片只用分鏡：多場景關鍵幀再串成一條 Reel。唔支援單圖動態／一鍵出片。",
		combinedAnimateTitle: "分鏡故事片",
		combinedAnimateDesc:
			"多場景關鍵幀 → 串成一條 Reel。呢個係圖+片唯一路徑。",
		videoSubpathTitle: "影片創作方式",
		videoSubpathHint: "由產品相寫動態方案，或跟參考短片運鏡。",
		refVideoTitle: "參考短片（MP4）",
		refVideoHint:
			"有 reel／短片先上傳；圖文研究帖可跳過（用參考圖 + 分鏡即可）。",
		refVideoTitleOptional: "參考短片（選填）",
		refVideoHintOptional:
			"圖文帖唔使上傳 MP4 — 會自動跳過。有 reel 先上傳會跟節奏排分鏡。",
		extraKitTitle: "產品相片套裝",
		extraKitHint: "AI 影片助手可選：包裝同角度相。",
		bgmTitle: "背景音樂",
		bgmHint: "可選 — 為成片揀音樂氛圍。",
		legacyImageTitle: "生成場景",
		legacyImageHint: "繼續到出圖步驟 — 生成關鍵幀後返回。",
		doneTitle: "匯出",
		doneHint: "繼續下載同分享廣告。",
	},
	pro: {
		back: "← 首頁",
		backStudio: "引導精靈",
		title: "Pro 智能畫布",
		subtitle:
			"Lumina 式節點畫布：新增節點、用 @ 引用素材、逐步或一次運行。",
		costHint:
			"Pro 使用 系統 按次收費（唔係 Lumina 訂閱價）。每次運行會消耗你 service credentials 嘅 API 額度。",
		mobileDesktopOnly:
			"Pro 畫布適合桌面使用 — 手機請用橫屏平板或電腦；日常出片可用 /studio 嚮導（支援手機）。",
		steps: [
			"1. 新增上傳／圖片節點 — 設 @別名（例如 Ava、Outfit）",
			"2. 可選：圖片同影片之間加相機角度節點",
			"3. 劇本或文字生成影片；最後用拼接節點合併片段同音樂",
		],
		addNode: "新增節點",
		addResource: "新增素材",
		queueTitle: "任務隊列",
		runAll: "全部運行",
		running: "運行中…",
		queueEmpty: "新增節點後按「全部運行」",
		nodeLabels: {
			text: "文字",
			image: "圖片",
			audio: "音訊",
			video: "圖生影片",
			textVideo: "文字生影片",
			splice: "影片拼接",
			script: "劇本規劃",
			camera: "相機角度",
			upload: "上傳",
		},
	},
} as const;
