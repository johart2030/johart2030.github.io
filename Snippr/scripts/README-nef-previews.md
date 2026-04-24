# NEF Preview Worker

This starter worker scans Supabase for posts where:

- `file_type = 'nef'`
- `preview_url is null`

It downloads the original RAW file, renders a JPEG preview with ImageMagick, uploads that JPEG to Supabase Storage, and updates `posts.preview_url`.

## Requirements

- Node 18+
- ImageMagick installed and available as `magick`
- `supabase-schema.sql` already applied

## Environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOURCE_BUCKET` optional, defaults to `images`
- `PREVIEW_BUCKET` optional, defaults to `images`
- `PREVIEW_FOLDER` optional, defaults to `previews`

## Run

```bash
node scripts/generate-nef-previews.mjs
```

Or on Windows PowerShell:

```powershell
Copy-Item .env.preview.example .env.preview
# fill in .env.preview first
.\scripts\run-nef-previews.ps1
```

If you prefer npm:

```bash
npm run nef:previews
```

## GitHub Actions

This repo can also run the preview worker on GitHub Actions.

Add these repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional repository variables:

- `SOURCE_BUCKET`
- `PREVIEW_BUCKET`
- `PREVIEW_FOLDER`

Then the workflow in `.github/workflows/nef-previews.yml` can be run manually or on a schedule.

## Railway

This repo is also prepared for Railway deployment as a small worker service.

Files involved:

- `server.mjs`
- `Dockerfile`
- `railway.json`

### Railway environment variables

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended:

- `SOURCE_BUCKET=images`
- `PREVIEW_BUCKET=images`
- `PREVIEW_FOLDER=previews`
- `POLL_INTERVAL_MINUTES=30`
- `RUN_ON_BOOT=true`

Optional:

- `RUN_TOKEN`

### What the Railway service does

- starts an HTTP server for health checks
- runs one preview pass on boot by default
- keeps polling for NEF files on the interval you choose
- exposes `/healthz`
- exposes `/run` for manual triggering, optionally protected by `RUN_TOKEN`

### Railway deploy steps

1. Push this repo to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Set the required environment variables listed above.
4. Deploy.
5. Confirm the service is healthy by checking Railway logs and `/healthz`.

If you set `RUN_TOKEN`, manual runs can be triggered with:

```bash
curl -X POST "https://your-railway-service.up.railway.app/run?token=YOUR_RUN_TOKEN"
```

## Suggested flow

1. User uploads a `.nef`
2. Snippr stores the original file and creates a `posts` row
3. Railway runs the preview worker on boot and on a schedule
4. The worker fills in `preview_url`
5. The web UI starts showing the JPEG preview inline automatically
