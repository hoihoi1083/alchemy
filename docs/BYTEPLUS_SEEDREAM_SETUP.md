# BytePlus ModelArk — Seedream + Seedance (edit-image-2 + Caption 2)

Alchemy uses **BytePlus ModelArk** (intl / Johor) for:

| Feature | Model | Route |
|---------|-------|-------|
| Seedream layerize | `dola-seedream-5-0-pro-260628` | `/api/decompose-seedream-layers` |
| Caption 2 picture edit | `dreamina-seedance-2-0-fast-260128` (default) | `/api/caption-video-edit` |

Seedance video in the **wizard** still runs on **fal** today. Caption 2 Picture prefers ModelArk, then fal R2V fallback.

## Env (`.env.local`)

```bash
# Required for ModelArk (Seedream + Seedance edit)
BYTEPLUS_API_KEY=your_key_here
# Alias also accepted:
# ARK_API_KEY=your_key_here

# Still required — fal storage + fal Seedance fallback / wizard video
FAL_KEY=your_fal_key

# Optional overrides
# BYTEPLUS_SEEDREAM_MODEL=dola-seedream-5-0-pro-260628
# BYTEPLUS_SEEDANCE_EDIT_MODEL=dreamina-seedance-2-0-fast-260128
# BYTEPLUS_ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```

Restart `npm run dev` after adding keys.

## Console checklist

1. Open [ModelArk console (ap-southeast-1)](https://console.byteplus.com/ark/region:ark+ap-southeast-1/model).
2. Activate **Dola-Seedream-5.0-pro** and **Dreamina Seedance 2.0 Fast** (and/or Standard).
3. [Create API key](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apikey) → `BYTEPLUS_API_KEY`.
4. Ensure Seedance resource pack / balance is available (ModelArk prepaid packs).

## Caption 2 edit API

`POST /api/caption-video-edit` with `{ video_url, image_url?, job: product|scene|style, note?, duration_sec?, resolution? }`.

Server calls ModelArk `contents/generations/tasks` with `omni_reference_task_type: "edit"`. On failure → fal `seedance-2.0/fast/reference-to-video`.

## LAS Enhanced (optional later)

Operator `las_video_seedance_replace` (scene/object/person) needs LAS API + TOS output path — richer chips, heavier infra. Prefer ModelArk contents API first.

