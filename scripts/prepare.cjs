'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sprite = fs.readFileSync(path.join(root, 'src/pet/torami.svg'), 'utf8');
const template = fs.readFileSync(path.join(root, 'src/pet/index.template.html'), 'utf8');
fs.writeFileSync(path.join(root, 'src/pet/index.html'), template.replace('%CHARACTER%', sprite));
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
