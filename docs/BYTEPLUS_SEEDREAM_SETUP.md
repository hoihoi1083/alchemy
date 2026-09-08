# BytePlus ModelArk — Seedream Layerize (edit-image-2)

Alchemy calls **BytePlus ModelArk** (not fal) for Seedream 5.0 Pro layer separation on edit-image-2.

Seedance video stays on fal for now — wire later.

## Env (`.env.local`)

```bash
# Required — ModelArk API key from console (Johor / ap-southeast)
BYTEPLUS_API_KEY=your_key_here
# Alias also accepted:
# ARK_API_KEY=your_key_here

# Still required — hosts input/output PNGs on fal.storage
FAL_KEY=your_fal_key

# Optional overrides
# BYTEPLUS_SEEDREAM_MODEL=dola-seedream-5-0-pro-260628
# BYTEPLUS_ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```

Restart `npm run dev` after adding the key.

## Console checklist

1. Activate **Dola-Seedream-5.0-pro** (image + layer separation).
2. Create an API key in ModelArk → paste into `.env.local` as `BYTEPLUS_API_KEY`.
3. Confirm the model ID matches your region if the default fails (set `BYTEPLUS_SEEDREAM_MODEL`).

## API used

`POST {BYTEPLUS_ARK_BASE_URL}/images/generations` with `layer_decomposition: true`, `size: "1K"`.

Route: `/api/decompose-seedream-layers`
