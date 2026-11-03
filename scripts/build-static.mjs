import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "dist");
const [html, css, source] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "style.css"), "utf8"),
  readFile(resolve(dist, "app.js"), "utf8"),
]);
const metadata = source.match(/const heroAssets\s*=\s*(\[[\s\S]*?\]);/);
if (!metadata) throw new Error("Missing heroAssets metadata in dist/app.js.");
const assets = JSON.parse(metadata[1]);
if (!Array.isArray(assets) || !assets.length) throw new Error("The comic image catalog is empty.");
const ids = new Set();
let script = source;
for (const asset of assets) {
  if (!asset.id || ids.has(asset.id)) throw new Error(`Missing or duplicate image id: ${asset.id}`);
  ids.add(asset.id);
  if (typeof asset.file !== "string" || !/^assets\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(asset.file)) {
    throw new Error(`Invalid local image path for ${asset.id}.`);
  }
  const path = resolve(dist, asset.file);
  const local = relative(dist, path);
  if (local === ".." || local.startsWith(`..${sep}`)) throw new Error("Image is outside dist.");
  const image = await readFile(path);
  const jpeg = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP";
  const mime = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
  if (!mime) throw new Error(`Unsupported or damaged image: ${asset.file}`);
  const token = JSON.stringify(asset.file);
  if (!script.includes(token)) throw new Error(`Image reference missing from script: ${asset.file}`);
  script = script.replaceAll(token, JSON.stringify(`data:${mime};base64,${image.toString("base64")}`));
}
const stylesheet = /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']style\.css["'])[^>]*>/g;
const app = /<script\b[^>]*\bsrc=["']app\.js["'][^>]*>\s*<\/script>/g;
if ([...html.matchAll(stylesheet)].length !== 1 || [...html.matchAll(app)].length !== 1) {
  throw new Error("Expected exactly one style.css link and one app.js script in dist/index.html.");
}
const standalone = html
  .replace(stylesheet, () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`)
  .replace(app, () => `<script>${script.replace(/<\/script/gi, "<\\/script")}</script>`);
const output = resolve(root, "outputs/SPIDER-LINK.html");
await mkdir(resolve(root, "outputs"), { recursive: true });
await writeFile(output, standalone, "utf8");
console.log(`Built outputs/SPIDER-LINK.html with ${assets.length} embedded comic images (${Buffer.byteLength(standalone)} bytes).`);
