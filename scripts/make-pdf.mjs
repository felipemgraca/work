// Builds the site, serves it briefly, and prints /resume/ to public/Felipe-Graca-Resume.pdf using Chrome.
// Run: npm run pdf   (needs Google Chrome installed; CHROME_PATH overrides the location)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4399;
const OUT = new URL('../public/Felipe-Graca-Resume.pdf', import.meta.url).pathname;

if (!fs.existsSync(CHROME)) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(1);
}
execFileSync('npx', ['astro', 'build'], { stdio: 'ignore' });
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
try {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/resume/`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000',
    `--print-to-pdf=${OUT}`, `http://localhost:${PORT}/resume/`,
  ], { stdio: 'ignore' });
  console.log('Wrote', OUT, fs.statSync(OUT).size, 'bytes');
} finally {
  server.kill();
}
