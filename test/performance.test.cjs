'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { angry, stageAt } = require('../src/pet/performance.js');

test('playback positions select the same pose, including after a delayed frame', () => {
  assert.equal(stageAt(0).phase, 'ears');
  assert.equal(stageAt(1.25).phase, 'pout');
  assert.equal(stageAt(1.85).phase, 'hmph');
  assert.equal(stageAt(angry.duration).phase, 'recover');
  assert.equal(stageAt(NaN).phase, 'ears');
});

test('the hmph gesture fits in the voice excerpt, followed by a short recovery', () => {
  const times = angry.stages.map(stage => stage.at);
  assert.equal(times[0], 0);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.ok(times.at(-1) < angry.duration);
  assert.ok(angry.stages.find(stage => stage.phase === 'hmph').at < angry.audioDuration);
  assert.ok(angry.duration - angry.audioDuration < 1);
});
