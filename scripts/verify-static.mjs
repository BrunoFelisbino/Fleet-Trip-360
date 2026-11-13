import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Script } from 'node:vm';
const files = ['trips/index.html', 'index.html', 'print-options.js', 'addin-config.json', 'icon.svg'];
const read = path => readFileSync(path, 'utf8');
const current = JSON.parse(read('addin-config.json'));
assert.ok(current.version);
assert.ok(current.items.length >= 1);
for (const file of files) {
  const code = read(file);
  if (/\.(js)$/.test(file)) new Script(code, { filename: file });
  if (file.endsWith('.html')) {
    const script = code.match(/<script>\s*([\s\S]*?)<\/script>/);
    if (script) new Script(script[1], { filename: file });
  }
}
console.log('OK');