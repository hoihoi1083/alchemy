# Build roadmap — one step at a time

Check off items as you complete them. Tell AI in a new chat: *"Continue Phase X from docs/ROADMAP.md"*.

---

## Phase 1 — Guided MVP ✅ (scaffold done)

- [x] New project `~/Desktop/ai-marketing-studio`
- [x] Copy API routes + pipeline from `seadance-video`
- [x] 4-step wizard UI (template → image → video → download)
- [x] 4 marketing templates in `lib/templates.ts`
- [x] Save evaluation + `AGENTS.md` for future AI chats
- [ ] Copy `.env.local` from `seadance-video` and run `npm install && npm run dev`
- [ ] Test full flow with your FAL_KEY
- [ ] Fix any bugs from first real generation

---

## Phase 2 — Polish guided experience

- [x] Simplified ad style picker (4 beginner styles, ~80–90% hints)
- [x] Built-in reference clip library structure (`public/references/`)
- [ ] Add 2–3 MP4 reference clips to `public/references/`
- [ ] Better error messages (map fal errors to plain English / 中文)
- [ ] Loading progress + estimated time on video step
- [ ] “Regenerate image” / “Regenerate video” without losing template
- [ ] Require image OR upload before video (clearer validation)
- [ ] 2–3 more compositor templates (dark luxury card, flash sale, tips card)
- [ ] Template preview thumbnails (static examples)

---

## Phase 3 — AI assistant

- [ ] `/api/assistant` — OpenAI with system prompt + current step
- [ ] Sidebar chat on wizard pages
- [ ] Assistant can set: template, product text, prompts
- [ ] “Explain this error” button when generation fails
- [ ] Optional: Cantonese / English UI strings

---

## Phase 4 — Move Pro features from old app

- [ ] Post-process page in new app (subs: none / soft / burn)
- [ ] Collapsible “Advanced” panel (reference mode, endpoints)
- [ ] Cost presets (Free / Hybrid / Pro)
- [ ] Link or merge — decide if `seadance-video` is retired

---

## Phase 5 — Projects & history

- [ ] Save job to `.pipeline-jobs` or DB with name + date
- [ ] “My projects” list — reopen image/video URLs
- [ ] Duplicate project as new template run

---

## Phase 6 — Public beta (business)

- [ ] Auth (Clerk / NextAuth)
- [ ] Credits or subscription (Stripe)
- [ ] Per-user rate limits + cost cap
- [ ] Terms, privacy, content policy
- [ ] Landing page + pricing
- [ ] Verify fal.ai commercial / resale terms

---

## Phase 7 — Marketing launch

- [ ] 5 example videos for landing page
- [ ] FB/IG ad to WhatsApp or waitlist
- [ ] Onboard 10–20 SMB beta users
- [ ] Iterate from feedback

---

## What stays in `seadance-video`

Until Phase 4 is done, use the **old app** for:

- Reference-to-video mode
- Custom fal endpoints
- Full post-process + Azure Cantonese dub
- All experimental settings

Do **not** delete `seadance-video` — it is your production tool.
