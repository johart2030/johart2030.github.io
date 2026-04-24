import { runPreviewPass } from "./nef-preview-core.mjs";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const summary = await runPreviewPass();

  if (!summary.scanned) {
    console.log("No NEF posts are waiting for previews.");
    return;
  }

  console.log(`Scanned ${summary.scanned} post(s).`);

  summary.results.forEach((result) => {
    if (result.status === "success") {
      console.log(`Preview generated for post ${result.postId}.`);
      return;
    }

    console.error(`Failed for post ${result.postId}: ${result.message}`);
  });
}
