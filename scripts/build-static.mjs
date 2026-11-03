import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "dist");
const [html, catalogSource] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "catalog.js"), "utf8"),
]);
const assets = JSON.parse(catalogSource.replace(/^const spiderCatalog\s*=\s*/, "").replace(/;\s*$/, ""));
if (!Array.isArray(assets) || !assets.length) throw new Error("The comic image catalog is empty.");
const ids = new Set();
const profiles = new Set();
for (const asset of assets) {
  if (!asset.id || ids.has(asset.id)) throw new Error(`Missing or duplicate image id: ${asset.id}`);
  ids.add(asset.id);
  if (typeof asset.image !== "string" || !/^assets\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(asset.image)) {
    throw new Error(`Invalid local image path for ${asset.id}.`);
  }
  const profile = asset.quizProfile;
  if (!Array.isArray(profile) || profile.length !== 6 || !profile.every(n => Number.isInteger(n) && n >= 0) || profile.reduce((a,b)=>a+b,0) !== 7 || profiles.has(profile.join(','))) {
    throw new Error(`Invalid or duplicate quiz profile for ${asset.id}.`);
  }
  profiles.add(profile.join(','));
  if (!asset.name || !asset.alias || !asset.source?.startsWith('https://')) throw new Error(`Incomplete metadata for ${asset.id}.`);
  const path = resolve(dist, asset.image);
  const local = relative(dist, path);
  if (local === ".." || local.startsWith(`..${sep}`)) throw new Error("Image is outside dist.");
  const image = await readFile(path);
  const jpeg = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP";
  const mime = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
  if (!mime) throw new Error(`Unsupported or damaged image: ${asset.image}`);
  asset.image = `data:${mime};base64,${image.toString("base64")}`;
}
const catalog = /<script\b[^>]*\bsrc=["']catalog\.js["'][^>]*>\s*<\/script>/g;
if ([...html.matchAll(catalog)].length !== 1) throw new Error('Expected one catalog.js script.');
const escapeScript = value => value.replace(/<\/script/gi, "<\\/script");
let standalone = html.replace(catalog, () => `<script>${escapeScript('const spiderCatalog = '+JSON.stringify(assets)+';')}</script>`);
for(const name of ['style.css','team.css','extras.css']){
  const css=await readFile(resolve(dist,name),'utf8');
  const pattern=new RegExp('<link\\b(?=[^>]*\\brel=["\']stylesheet["\'])(?=[^>]*\\bhref=["\']'+name.replace('.','\\.')+'["\'])[^>]*>','g');
  if([...standalone.matchAll(pattern)].length!==1)throw new Error('Expected stylesheet '+name);
  standalone=standalone.replace(pattern,()=>`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`);
}
for(const name of ['app.js','extras.js','team.js','boot.js']){
  const source=await readFile(resolve(dist,name),'utf8');
  const pattern=new RegExp('<script\\b[^>]*\\bsrc=["\']'+name.replace('.','\\.')+'["\'][^>]*>\\s*<\\/script>','g');
  if([...standalone.matchAll(pattern)].length!==1)throw new Error('Expected script '+name);
  standalone=standalone.replace(pattern,()=>`<script>${escapeScript(source)}</script>`);
}
const output = resolve(root, "outputs/SPIDER-LINK.html");
await mkdir(resolve(root, "outputs"), { recursive: true });
await writeFile(output, standalone, "utf8");
console.log(`Built outputs/SPIDER-LINK.html with ${assets.length} embedded comic images (${Buffer.byteLength(standalone)} bytes).`);
