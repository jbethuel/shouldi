// Renders the Chrome Web Store images from the real built extension.
// Run from apps/extension: pnpm store:images   (builds first, then writes store/images/*.png)
//
// How it works: copies build/chrome-mv3 into store/.stage (WXT pages load scripts from root paths such as
// /chunks/...), loads shim.js before the page's own
// scripts (it stands in for the Chrome APIs with invented sample data), serves the folder locally,
// and captures each scene with headless Chrome at the exact sizes the store asks for.
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const here = new URL(".", import.meta.url).pathname;
const stage = join(here, ".stage");
const out = join(here, "images");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const SHOTS = [
  { file: "screenshot-1-match.png", page: "scene.html?id=01-match", size: [1280, 800] },
  { file: "screenshot-2-preview.png", page: "scene.html?id=02-preview", size: [1280, 800] },
  { file: "screenshot-3-encouraging.png", page: "scene.html?id=03-encouraging", size: [1280, 800] },
  { file: "screenshot-4-privacy.png", page: "scene.html?id=04-privacy", size: [1280, 800] },
  { file: "screenshot-5-sent.png", page: "scene.html?id=05-sent", size: [1280, 800] },
  { file: "promo-small-440x280.png", page: "promo.html?size=small", size: [440, 280] },
  { file: "promo-marquee-1400x560.png", page: "promo.html?size=marquee", size: [1400, 560] },
];

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
};

await rm(stage, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(here, "..", "build", "chrome-mv3"), stage, { recursive: true });
for (const name of ["shim.js", "scene.html", "scene.css", "scene.js", "promo.html"]) {
  await cp(join(here, name), join(stage, name));
}
for (const page of ["popup.html", "options.html"]) {
  const path = join(stage, page);
  const html = await readFile(path, "utf8");
  await writeFile(path, html.replace("<head>", '<head><script src="/shim.js"></script>'));
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const body = await readFile(join(stage, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const profile = await mkdtemp(join(tmpdir(), "shouldi-store-"));
try {
  for (const shot of SHOTS) {
    const [width, height] = shot.size;
    const file = join(out, shot.file);
    await rm(file, { force: true });
    // Headless Chrome sometimes stays open after it writes the screenshot, so stop it once the file exists.
    const browser = spawn(chrome, [
      "--headless=new",
      "--hide-scrollbars",
      // Light mode, whatever the computer's appearance setting is (0 = dark, 1 = light).
      "--blink-settings=preferredColorScheme=1",
      "--force-device-scale-factor=1",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      "--virtual-time-budget=5000",
      `--screenshot=${file}`,
      `http://127.0.0.1:${port}/${shot.page}`,
    ], { stdio: "ignore" });
    const written = await waitForFile(file, 30_000);
    browser.kill();
    await new Promise((resolve) => (browser.exitCode === null ? browser.once("exit", resolve) : resolve()));
    if (!written) throw new Error(`Chrome did not write ${shot.file}`);
    console.log(`✔ ${shot.file} (${width}×${height})`);
  }
} finally {
  server.close();
  await rm(profile, { recursive: true, force: true });
  await rm(stage, { recursive: true, force: true });
}

async function waitForFile(file, timeoutMs) {
  const end = Date.now() + timeoutMs;
  let lastSize = -1;
  while (Date.now() < end) {
    const size = await stat(file).then((s) => s.size, () => 0);
    if (size > 0 && size === lastSize) return true;
    lastSize = size;
    await sleep(300);
  }
  return false;
}
