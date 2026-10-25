'use strict';

(function expose(root) {
  // Times are relative to the local excerpt, so muted playback keeps the same beat.
  const angry = Object.freeze({
    duration: 3,
    audioDuration: 2.35,
    stages: Object.freeze([
      { at: 0, phase: 'ears', textKey: 'angryIntro' },
      { at: 1.05, phase: 'pout', textKey: 'angryPout' },
      { at: 1.6, phase: 'hmph', textKey: 'angryHmph' },
      { at: 2.35, phase: 'recover', textKey: 'angryHmph' },
    ]),
  });

  function stageAt(seconds) {
    const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    return angry.stages.findLast((stage) => time >= stage.at) || angry.stages[0];
  }

  const api = Object.freeze({ angry, stageAt });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ToramiPerformance = api;
})(typeof window === 'object' ? window : globalThis);
