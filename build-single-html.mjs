import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

async function main() {
  const result = await build({
    entryPoints: [resolve('src/main.tsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    write: false,
    outdir: resolve('dist/_bundle'),
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css',
    },
    jsx: 'automatic',
  });

  const jsFile = result.outputFiles.find(f => f.path.endsWith('.js'))?.text ?? result.outputFiles[0].text;
  const cssBundle = result.outputFiles.filter(f => f.path.endsWith('.css')).map(f => f.text).join('\n');
  const js = jsFile;

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="built-at" content="${new Date().toISOString()}" />
  <title>题库练习（单文件原型）</title>
  <style id="lib-css">
${cssBundle}
  </style>
  <style>
    :root {
      --bg: #fafafa;
      --fg: #222;
      --muted: #666;
      --border: #ddd;
      --accent: #2e7d32;
      --error-bg: #fff7f7;
      --error-border: #f2c1c1;
    }
    html, body { height: 100%; }
    body { margin: 0; background: var(--bg); color: var(--fg); font-family: system-ui, -apple-system, sans-serif; font-size: 16px; line-height: 1.5; }
    .container { max-width: 720px; margin: 0 auto; padding: 16px; }
    @media (min-width: 600px) { .container { padding: 24px; } }
    h1 { font-size: 20px; margin: 16px 0; }
    h2 { font-size: 18px; margin: 14px 0; }
    .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: #fff; cursor: pointer; }
    .btn:hover { background: #f8f8f8; }
    .file-btn input[type="file"] { display: none; }
    .summary { margin-top: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: #fff; }
    .errors { margin-top: 12px; padding: 12px; background: var(--error-bg); border: 1px solid var(--error-border); border-radius: 10px; }
    .card { margin-bottom: 12px; padding: 12px; border: 1px solid #eee; border-radius: 10px; background: #fff; }
    .opt-list { margin-top: 8px; padding-left: 1rem; }
    .answer { margin-top: 4px; color: var(--accent); }
    .explain { margin-top: 4px; color: var(--muted); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
${js}
  </script>
</body>
</html>`;

  const outDir = resolve('dist');
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, 'index.html');
  writeFileSync(outFile, html, 'utf8');
  console.log('Built single-file HTML:', outFile);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});