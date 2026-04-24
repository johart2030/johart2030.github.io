import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

function getConfig(overrides = {}) {
  return {
    supabaseUrl: overrides.supabaseUrl || process.env.SUPABASE_URL,
    supabaseServiceRoleKey: overrides.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
    sourceBucket: overrides.sourceBucket || process.env.SOURCE_BUCKET || "images",
    previewBucket: overrides.previewBucket || process.env.PREVIEW_BUCKET || process.env.SOURCE_BUCKET || "images",
    previewFolder: overrides.previewFolder || process.env.PREVIEW_FOLDER || "previews"
  };
}

export async function runPreviewPass(overrides = {}) {
  const config = getConfig(overrides);
  validateConfig(config);

  const posts = await fetchPendingRawPosts(config);
  const results = [];

  for (const post of posts) {
    try {
      const previewUrl = await processPost(post, config);
      results.push({ postId: post.id, status: "success", previewUrl });
    } catch (error) {
      results.push({ postId: post.id, status: "error", message: error.message });
    }
  }

  return {
    scanned: posts.length,
    processed: results.filter((entry) => entry.status === "success").length,
    failed: results.filter((entry) => entry.status === "error").length,
    results
  };
}

function validateConfig(config) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
}

async function fetchPendingRawPosts(config) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/posts`);
  url.searchParams.set("select", "id,image_url,storage_path,file_name,file_type");
  url.searchParams.set("file_type", "eq.nef");
  url.searchParams.set("preview_url", "is.null");
  url.searchParams.set("order", "id.asc");

  const response = await fetch(url, {
    headers: restHeaders(config)
  });

  if (!response.ok) {
    throw new Error(`Could not fetch posts: ${await response.text()}`);
  }

  return response.json();
}

async function processPost(post, config) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "snippr-nef-"));
  const nefPath = path.join(tempDir, post.file_name || `${post.id}.nef`);
  const jpgPath = path.join(tempDir, `${post.id}.jpg`);

  try {
    const rawBuffer = await downloadOriginal(post, config);
    await writeFile(nefPath, rawBuffer);

    await runMagick([
      nefPath,
      "-auto-orient",
      "-thumbnail",
      "2400x2400>",
      "-quality",
      "90",
      jpgPath
    ]);

    const previewBuffer = await readFile(jpgPath);
    const previewStoragePath = `${config.previewFolder}/post-${post.id}-${randomUUID()}.jpg`;
    const previewUrl = await uploadPreview(previewStoragePath, previewBuffer, config);
    await updatePostPreview(post.id, previewUrl, config);
    return previewUrl;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function downloadOriginal(post, config) {
  if (post.storage_path) {
    const storageUrl = `${config.supabaseUrl}/storage/v1/object/${config.sourceBucket}/${post.storage_path}`;
    const response = await fetch(storageUrl, {
      headers: {
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`
      }
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  const fallback = await fetch(post.image_url);
  if (!fallback.ok) {
    throw new Error(`Could not download RAW file: ${await fallback.text()}`);
  }

  return Buffer.from(await fallback.arrayBuffer());
}

async function uploadPreview(storagePath, buffer, config) {
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.previewBucket}/${storagePath}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "x-upsert": "true",
      "content-type": "image/jpeg"
    },
    body: buffer
  });

  if (!uploadResponse.ok) {
    throw new Error(`Could not upload preview: ${await uploadResponse.text()}`);
  }

  return `${config.supabaseUrl}/storage/v1/object/public/${config.previewBucket}/${storagePath}`;
}

async function updatePostPreview(postId, previewUrl, config) {
  const updateUrl = new URL(`${config.supabaseUrl}/rest/v1/posts`);
  updateUrl.searchParams.set("id", `eq.${postId}`);

  const response = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      ...restHeaders(config),
      "content-type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      preview_url: previewUrl
    })
  });

  if (!response.ok) {
    throw new Error(`Could not update preview_url: ${await response.text()}`);
  }
}

function restHeaders(config) {
  return {
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    apikey: config.supabaseServiceRoleKey
  };
}

function runMagick(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("magick", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`ImageMagick is required. ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `magick exited with code ${code}`));
    });
  });
}
