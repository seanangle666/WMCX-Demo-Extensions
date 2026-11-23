import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { languages } from './language.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const file of ['index.json', 'Extensions', 'Source', 'LICENSE']) {
    fs.cpSync(path.join(root, file), path.join(output, file), { recursive: true });
}
const renderer = fileURLToPath(new URL('render.mjs', import.meta.url));
for (const action of ['build', 'validate']) {
    for (const locale of Object.keys(languages)) {
        execFileSync(process.execPath, [renderer, locale, action], { stdio: 'inherit' });
    }
}
