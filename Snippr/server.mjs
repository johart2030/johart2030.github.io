import http from "node:http";
import { runPreviewPass } from "./scripts/nef-preview-core.mjs";

const port = Number(process.env.PORT || 3000);
const runToken = process.env.RUN_TOKEN || "";
const pollIntervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES || 30);
const runOnBoot = process.env.RUN_ON_BOOT !== "false";

let isRunning = false;
let lastRun = null;
let lastSummary = null;
let lastError = null;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/healthz") {
    return sendJson(response, 200, {
      ok: true,
      running: isRunning,
      lastRun,
      lastSummary,
      lastError
    });
  }

  if ((request.method === "POST" || request.method === "GET") && url.pathname === "/run") {
    if (runToken) {
      const supplied = request.headers["x-run-token"] || url.searchParams.get("token");
      if (supplied !== runToken) {
        return sendJson(response, 401, { ok: false, error: "Unauthorized" });
      }
    }

    if (isRunning) {
      return sendJson(response, 409, { ok: false, error: "Preview worker is already running." });
    }

    try {
      const summary = await runOnce("manual");
      return sendJson(response, 200, { ok: true, summary });
    } catch (error) {
      return sendJson(response, 500, { ok: false, error: error.message });
    }
  }

  sendJson(response, 404, { ok: false, error: "Not found" });
});

server.listen(port, async () => {
  console.log(`Snippr preview worker listening on port ${port}.`);

  if (runOnBoot) {
    try {
      await runOnce("boot");
    } catch (error) {
      console.error(error.message);
    }
  }
});

if (pollIntervalMinutes > 0) {
  setInterval(async () => {
    if (isRunning) {
      return;
    }

    try {
      await runOnce("schedule");
    } catch (error) {
      console.error(error.message);
    }
  }, pollIntervalMinutes * 60 * 1000);
}

async function runOnce(source) {
  isRunning = true;
  lastError = null;

  try {
    const summary = await runPreviewPass();
    lastRun = new Date().toISOString();
    lastSummary = { ...summary, source };
    console.log(`[${source}] scanned=${summary.scanned} processed=${summary.processed} failed=${summary.failed}`);
    return lastSummary;
  } catch (error) {
    lastRun = new Date().toISOString();
    lastError = error.message;
    throw error;
  } finally {
    isRunning = false;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}
