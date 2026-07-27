# R2 CORS for caption studio direct uploads

Browser → R2 presigned PUT fails with **Failed to fetch** when the bucket
has no CORS rule for this origin.

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

After saving, hard-refresh `/captions` and retry Burn / Mix voiceover.

If CORS is still missing, the app falls back to same-origin
`POST /api/library/upload` (works well on localhost; large files on Vercel
still prefer direct R2 PUT).
