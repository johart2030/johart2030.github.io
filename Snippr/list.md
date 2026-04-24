# Snippr Setup List

## 1. Supabase

- Open your Supabase project.
- Go to the SQL Editor.
- Run the SQL from [supabase-schema.sql](/c:/Users/johart2030/Documents/Snippr/supabase-schema.sql).
- Make sure you already have these tables/buckets working:
  - `posts`
  - `likes`
  - `comments`
  - storage bucket `images`
- Confirm the new `posts` columns exist:
  - `preview_url`
  - `storage_path`
  - `file_name`
  - `file_type`
- Confirm these new tables exist:
  - `albums`
  - `album_photos`
- Confirm the unique like index exists on `likes(post_id, user_id)`.

## 2. Supabase Storage

- Open Supabase Storage.
- Make sure the `images` bucket exists.
- Make sure the frontend can upload into `images`.
- Make sure preview JPGs can also be stored in `images/previews/...`.
- If you use RLS or storage policies, allow the app to:
  - upload original files
  - read public image URLs
  - let the Render worker upload preview JPGs

## 3. Frontend Repo

- Keep this frontend in your `johart2030.github.io` repo if that is your GitHub Pages site.
- Make sure these files are present:
  - [index.html](/c:/Users/johart2030/Documents/Snippr/index.html)
  - [feed.html](/c:/Users/johart2030/Documents/Snippr/feed.html)
  - [dashboard.html](/c:/Users/johart2030/Documents/Snippr/dashboard.html)
  - [albums.html](/c:/Users/johart2030/Documents/Snippr/albums.html)
  - [app.js](/c:/Users/johart2030/Documents/Snippr/app.js)
  - [styles.css](/c:/Users/johart2030/Documents/Snippr/styles.css)
- Commit and push the repo to GitHub.

## 4. GitHub Pages

- Open the GitHub repo settings for `johart2030.github.io`.
- Go to `Settings -> Pages`.
- Set the site to deploy from the main branch.
- Make sure the site is serving the root of the repo.
- After deploy, open `https://johart2030.github.io`.
- Verify these pages load:
  - `/`
  - `/feed.html`
  - `/dashboard.html`
  - `/albums.html`

## 5. Render Project

- Create or sign in to your account at `render.com`.
- Create a new Render project or new Web Service.
- Connect the GitHub repo that contains this worker code.
- Let Render deploy from the repo.

## 6. Render Environment Variables

- In Render, add these required variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Add these recommended variables:
  - `SOURCE_BUCKET=images`
  - `PREVIEW_BUCKET=images`
  - `PREVIEW_FOLDER=previews`
  - `POLL_INTERVAL_MINUTES=30`
  - `RUN_ON_BOOT=true`
- Optional:
  - `RUN_TOKEN=some-random-secret`

## 7. Worker Files

- Make sure these files are in the repo Render is deploying:
  - [server.mjs](/c:/Users/johart2030/Documents/Snippr/server.mjs)
  - [Dockerfile](/c:/Users/johart2030/Documents/Snippr/Dockerfile)
  - [package.json](/c:/Users/johart2030/Documents/Snippr/package.json)
  - [scripts/nef-preview-core.mjs](/c:/Users/johart2030/Documents/Snippr/scripts/nef-preview-core.mjs)
  - [scripts/generate-nef-previews.mjs](/c:/Users/johart2030/Documents/Snippr/scripts/generate-nef-previews.mjs)

## 8. First Render Deploy Check

- Deploy the Render service.
- Open Render logs.
- Confirm the container starts without crashing.
- Confirm the service responds on `/healthz`.
- Confirm ImageMagick is available inside the container.
- Confirm there are no missing env var errors.

## 9. First End-to-End Test

- Open `https://johart2030.github.io`.
- Sign in.
- Upload a normal JPG or PNG.
- Confirm it appears in the feed.
- Upload a `.nef`.
- Confirm the RAW upload is accepted.
- Confirm the RAW post appears with a RAW placeholder first.
- Wait for Render to process it or trigger the worker manually.
- Confirm `preview_url` gets filled in for that post in Supabase.
- Refresh the site.
- Confirm the `.nef` now shows an inline JPG preview.

## 10. Manual Worker Trigger

- If you set `RUN_TOKEN`, trigger a manual preview run with:

```bash
curl -X POST "https://YOUR-RENDER-URL.onrender.com/run?token=YOUR_RUN_TOKEN"
```

- If you did not set `RUN_TOKEN`, you can call:

```bash
curl -X POST "https://YOUR-RENDER-URL.onrender.com/run"
```

## 11. Comments and Albums Check

- Open a photo in full view.
- Confirm comments appear in the modal.
- Create a public album from the dashboard.
- Add a photo to the album.
- Open the albums page.
- Confirm the album and its photos appear.

## 12. Like Spam Check

- Like a photo once.
- Try liking the same photo again.
- Confirm the app blocks duplicate likes.
- Confirm the database unique index also protects against duplicates.

## 13. Optional Local Worker Test

- Install Node.js 18+ locally.
- Copy [.env.preview.example](/c:/Users/johart2030/Documents/Snippr/.env.preview.example) to `.env.preview`.
- Fill in the Supabase values.
- Run:

```powershell
.\scripts\run-nef-previews.ps1
```

## 14. If Something Fails

- Check browser console errors.
- Check Supabase table structure.
- Check Supabase storage policies.
- Check Render deploy logs.
- Check Render environment variables.
- Check whether `preview_url` is being written to the `posts` row.
