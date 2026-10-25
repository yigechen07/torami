'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { languages, messages, t } = require('../src/pet/i18n.js');
const { normalizeSettings } = require('../src/settings.cjs');

test('every interface message has Chinese and Korean with the same substitutions', () => {
  const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, pair] of Object.entries(messages)) {
    assert.equal(pair.length, 2, key);
    assert.ok(pair[0].trim() && pair[1].trim(), key);
    assert.deepEqual(params(pair[0]), params(pair[1]), key);
    if (!['language'].includes(key)) assert.doesNotMatch(pair[1], /\p{Script=Han}/u, key);
  }
});
test('Korean settings persist as a supported locale and invalid values fall back to Chinese', () => {
  assert.deepEqual(languages, ['zh-CN', 'ko']);
  assert.equal(normalizeSettings({ language: 'ko' }).language, 'ko');
  assert.equal(normalizeSettings({ language: '../../file' }).language, 'zh-CN');
  assert.equal(normalizeSettings({}).hideOnFullscreen, true);
  assert.equal(t('ko', 'restored', { count: 2 }), '창 2개를 제자리로 돌려놨어~');
});
