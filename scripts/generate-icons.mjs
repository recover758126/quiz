import { readFile } from 'fs/promises';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';

async function main() {
  const svgPath = resolve('public/icons/icon.svg');
  const outDir = resolve('public/icons');
  if (!existsSync(svgPath)) {
    console.error('[icons] Missing source SVG at', svgPath);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const svg = await readFile(svgPath);
  const tasks = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
  ];
  for (const t of tasks) {
    const out = resolve(outDir, t.name);
    await sharp(svg, { density: 384 })
      .resize(t.size, t.size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log('[icons] Generated', out);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });