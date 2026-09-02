# Dormant in-studio coach (quarantined)

These modules supported **step-by-step chat coaching** and **spotlight overlays** inside `/studio`. Product policy (2026): the mascot assistant is **landing-only**; the wizard uses on-screen cards and this help panel instead.

## Do not mount in production UI

- `components/assistant/CoachSpotlightOverlay.tsx` — spotlight ring over `data-coach-id` fields
- `lib/studio-assistant-spotlight-bus.ts` — pub/sub for spotlight events
- `lib/studio-assistant-handoff-coach.ts` — `initialCoachTaskAfterHandoff()` after landing → studio

## Still active (landing router)

- `lib/studio-assistant-coach.ts` — `buildCoachReply()` for landing **route-*** tasks only when `surface !== "studio"`
- `lib/studio-assistant-fast-paths.ts` — landing coach fast-path (anonymous users: fast-path only)
- `lib/studio-assistant-enforce-coach.ts` — ensures primary action link on landing replies

## Wizard field hooks (legacy)

`data-coach-id="coach-*"` attributes on SetupStep / VideoStep remain for optional re-enable of spotlight. Safe to delete in a future trim pass.

## Tests / scripts

- `tests/studio-assistant-micro-coach.test.ts` — handoff task order (dormant path)
- `scripts/test-studio-assistant-coach.ts` — manual coach regression

Re-enable checklist: mount overlay in `GlobalStudioAssistant`, restore spotlight dispatch in `StudioAssistantWidget`, set `isStudioAssistantMounted("/studio")` to true.
