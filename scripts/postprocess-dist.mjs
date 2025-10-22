import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function removeLegacyScripts(html) {
  // Remove <script nomodule ... id="vite-legacy-polyfill" ...></script>
  const polyfillRe = /\s*<script[^>]*id=["']vite-legacy-polyfill["'][^>]*>[^<]*<\/script>\s*/g;
  // Remove <script nomodule ... id="vite-legacy-entry" ...>...System.import(...)<\/script>
  const entryRe = /\s*<script[^>]*id=["']vite-legacy-entry["'][^>]*>[\s\S]*?<\/script>\s*/g;
  let out = html.replace(polyfillRe, '\n').replace(entryRe, '\n');
  return out;
}

function main() {
  const file = resolve('dist/index.html');
  if (!existsSync(file)) {
    console.error('[postprocess] dist/index.html not found. Did you run `vite build`?');
    process.exit(1);
  }
  const html = readFileSync(file, 'utf8');
  const cleaned = removeLegacyScripts(html);
  if (cleaned === html) {
    console.log('[postprocess] No legacy script tags found or already removed.');
  } else {
    console.log('[postprocess] Removed legacy script tags from dist/index.html');
    writeFileSync(file, cleaned, 'utf8');
  }
}

main();