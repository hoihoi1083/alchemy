# Built-in reference clips (optional)

These files power the **sample motion picker** only (`ReferenceClipPicker` /
「跟同款广告做」 built-in buttons).

They are **not** the same as **research references**:

| Source | What it is | Required? |
|--------|------------|-----------|
| **Content research** | Reel / post you pick from research → used as `@Video1` / style ref | No — main path |
| **User upload** | Your own MP4 in the wizard | No — always available |
| **`public/references/*.mp4`** | Optional bundled samples for one-tap motion | Optional |

If these MP4s are missing, the picker shows a short note and users continue with
**research** or **upload**. Production does not need this folder to ship.

Add silent MP4 files here only if you want one-tap samples:

| File | Style |
|------|--------|
| `product-push-in.mp4` | Slow push-in on product (~6s) |
| `gentle-orbit.mp4` | Gentle orbit / premium feel |
| `cozy-lifestyle.mp4` | Warm lifestyle, soft motion |

Requirements (if you add them):

- **9:16** vertical
- **No faces** if possible (Seedance sensitive filter)
- **Product-only** or abstract motion works best
- **6–8 seconds**, no voiceover
