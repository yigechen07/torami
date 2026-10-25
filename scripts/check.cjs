'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(name) : /\.(cjs|js)$/.test(name) ? [name] : [];
  });
}
for (const file of [...walk(path.join(root, 'src')), ...walk(path.join(root, 'scripts'))]) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('All JavaScript files parse.');
