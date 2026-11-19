// Offline renderer: serves this folder, drives headless Chromium frame by frame, pipes PNGs to ffmpeg.
//   node render.mjs                         → out/yadaim.mp4 (picture only) and, if out/mix.wav exists, out/yadaim-sound.mp4
//   node render.mjs stills --t 1.2,9.5      → out/wip/still-<t>.png
//   node render.mjs --from 8 --to 13        → render a slice (draft a single plate)
//   --samples 3                             → motion blur: average N sub-frames per frame (shutter 0.5)
import { createServer } from "node:http";
import { readFile, mkdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Use the pre-installed Playwright (global / NODE_PATH); ESM imports ignore NODE_PATH, require() does not.
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const mode = args[0] === "stills" ? "stills" : "video";
const TL = JSON.parse(await readFile(join(ROOT, "timeline.json"), "utf8"));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".wav": "audio/wav" };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT)) throw new Error("outside");
    const body = await readFile(p.endsWith("/") ? join(p, "index.html") : p);
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: TL.width, height: TL.height }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(`http://localhost:${port}/index.html?render=1`);
await page.waitForFunction(() => window.__ready === true);

const samples = Number(flag("samples", 1));
// Motion blur happens in the page: N sub-frames over half a frame, averaged in a float buffer.
await page.evaluate((n) => {
  const c = document.getElementById("c");
  const ctx = c.getContext("2d", { willReadFrequently: n > 1 });
  window.frameAt = (t, fps) => {
    if (n <= 1) { window.renderAt(t); return; }
    const acc = new Float32Array(c.width * c.height * 4);
    for (let s = 0; s < n; s++) {
      window.renderAt(t + ((s / n) * 0.5) / fps);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i++) acc[i] += d[i];
    }
    const img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < acc.length; i++) img.data[i] = acc[i] / n;
    ctx.putImageData(img, 0, 0);
  };
}, samples);

const shot = () => page.locator("#c").screenshot({ type: "png", animations: "disabled", caret: "initial" });

if (mode === "stills") {
  const out = join(ROOT, flag("out", "out/wip"));
  await mkdir(out, { recursive: true });
  for (const t of flag("t", "0").split(",").map(Number)) {
    await page.evaluate(([t, fps]) => window.frameAt(t, fps), [t, TL.fps]);
    const f = join(out, `still-${t.toFixed(2)}.png`);
    await (await import("node:fs/promises")).writeFile(f, await shot());
    console.log(f);
  }
} else {
  const fps = Number(flag("fps", TL.fps));
  const from = Number(flag("from", 0)), to = Number(flag("to", TL.duration));
  const file = join(ROOT, flag("out", "out/yadaim.mp4"));
  await mkdir(dirname(file), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file], { stdio: ["pipe", "inherit", "inherit"] });
  const n = Math.round((to - from) * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(([t, fps]) => window.frameAt(t, fps), [from + i / fps, fps]);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 60 === 0) process.stdout.write(`\rframe ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`\n${file}`);
  // Add the soundtrack if it has been built (python3 audio/score.py)
  const mix = join(ROOT, "out/mix.wav");
  if (from === 0 && (await access(mix).then(() => true, () => false))) {
    const withSound = file.replace(/\.mp4$/, "-sound.mp4");
    await new Promise((r) => spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", withSound], { stdio: "inherit" }).on("close", r));
    console.log(withSound);
  }
}
await browser.close();
server.close();
