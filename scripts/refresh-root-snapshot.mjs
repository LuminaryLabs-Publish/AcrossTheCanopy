import { cp, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const built = new URL('source/dist/', root);
const html = await readFile(new URL('index.html', built), 'utf8');
if (!html.includes('./assets/index-') || !html.includes('id="world"')) throw new Error('Build source/ before refreshing the game snapshot.');
const oldFiles = await readdir(new URL('assets/', root));
for (const file of oldFiles) {
  if (!/^index-[\w-]+\.(js|css)$/.test(file) && file !== 'artifacts' && !file.startsWith('__vite-browser-external-')) {
    throw new Error(`Unexpected root asset ${file}; preserve it and inspect before replacing generated output.`);
  }
}
await cp(new URL('assets/', built), new URL('assets/', root), { recursive: true });
const newFiles = new Set(await readdir(new URL('assets/', built)));
for (const file of oldFiles) if (!newFiles.has(file)) await unlink(new URL(`assets/${file}`, root));
await writeFile(new URL('index.html', root), html);
console.log(`Refreshed ${fileURLToPath(root)} from its generated source/dist build.`);
