#!/usr/bin/env node
// Downloads every image listed in scripts/images.manifest.json from the
// Call of Duty Wiki (Fandom) into public/images, and records where each one
// came from in src/data/image-credits.json so the site can credit it.
//
// Usage: npm run images            (skips files that already exist)
//        npm run images -- --force (re-downloads everything)
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'scripts/images.manifest.json');
const OUT_DIR = join(ROOT, 'public/images');
const CREDITS = join(ROOT, 'src/data/image-credits.json');
const API = 'https://callofduty.fandom.com/api.php';
const UA = 'e155-guide/1.0 (open-source fan guide; image credits kept per file)';
const force = process.argv.includes('--force');

const exists = (p) => access(p).then(() => true, () => false);

async function imageInfo(file, width) {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: String(width),
    format: 'json',
  });
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const page = Object.values((await res.json()).query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) throw new Error(`"${file}" not found on the wiki`);
  return { url: info.thumburl ?? info.url, page: info.descriptionurl };
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/webp,*/*' } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  if (!res.headers.get('content-type')?.includes('webp')) {
    throw new Error(`expected webp, got ${res.headers.get('content-type')}`);
  }
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const credits = (await exists(CREDITS)) ? JSON.parse(await readFile(CREDITS, 'utf8')) : {};
let failed = 0;

for (const { out, file, width = 1280 } of manifest) {
  const dest = join(OUT_DIR, out);
  const key = `/images/${out}`;
  if (!force && credits[key] && (await exists(dest))) continue;
  try {
    const { url, page } = await imageInfo(file, width);
    await download(url, dest);
    credits[key] = { file, page, source: 'Call of Duty Wiki (Fandom)' };
    console.log(`ok   ${out}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${out} <- ${file}: ${err.message}`);
  }
}

const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
await mkdir(dirname(CREDITS), { recursive: true });
await writeFile(CREDITS, JSON.stringify(sorted, null, 2) + '\n');
console.log(`\n${manifest.length - failed}/${manifest.length} images ready.`);
process.exit(failed ? 1 : 0);
