# R2 CORS for direct browser uploads

Browser → R2 presigned PUT fails with **Failed to fetch** when the bucket
has no CORS rule for this origin.

Used by: `/edit-image-2`, `/captions`, `/captions-2`, and `/ultra` (via
`uploadFileViaLibraryPresign`).

In Cloudflare Dashboard → R2 → your bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://www.alchemyailab.com",
      "https://alchemyailab.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

After saving, hard-refresh and retry upload.

If CORS is still missing, the app falls back to same-origin
`POST /api/library/upload` (or tool-specific upload routes) **only for files ≤ ~4MB**
(Vercel body limit). Larger files must use direct R2 PUT or **Choose from library**.
