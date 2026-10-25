'use strict';

const api = window.torami;
const pet = document.querySelector('#pet');
const character = document.querySelector('#character');
const menuButton = document.querySelector('#menu-button');
const bubble = document.querySelector('#bubble');
const effects = document.querySelector('#effects');
const audio = document.querySelector('#hmph-audio');
const performanceSpec = window.ToramiPerformance;
const i18n = window.ToramiI18n;
let pointer = null;
let clickTimer;
let bubbleTimer;
let bubbleUntil = 0;
let bubbleRemaining = 0;
let bubbleMessage = null;
let hoverTimer;
let lastState = { mode: 'idle' };
let activeAct = null;
let actFrame;
const tr = (key, params) => i18n.t(lastState.language, key, params);

function stopAct() {
  cancelAnimationFrame(actFrame);
  audio.pause();
  audio.currentTime = 0;
  activeAct = null;
  delete pet.dataset.phase;
  delete pet.dataset.audio;
}

async function playAngry(effect) {
  stopAct();
  clearTimeout(bubbleTimer);
  effects.replaceChildren();
  const act = { id: effect.id, sound: effect.soundEnabled, start: performance.now(), stage: null };
  activeAct = act;
  audio.volume = 0.7;
  pet.dataset.audio = act.sound ? 'loading' : 'muted';
  if (lastState.paused) {
    act.pausedAt = performance.now();
    act.resumeAudio = act.sound;
  } else if (act.sound) {
    try {
      await audio.play();
      if (activeAct !== act) return;
      pet.dataset.audio = 'playing';
    } catch (error) {
      if (activeAct !== act) return;
      act.sound = false;
      pet.dataset.audio = 'unavailable';
      console.error('Could not play Yuha excerpt:', error.message);
    }
  }
  act.start = performance.now();
  function frame() {
    if (activeAct !== act || lastState.mode !== 'angry') return;
    if (act.pausedAt !== undefined) { actFrame = requestAnimationFrame(frame); return; }
    if (act.sound && audio.ended && !act.endedAt) act.endedAt = performance.now();
    const time = act.sound
      ? act.endedAt ? audio.duration + (performance.now() - act.endedAt) / 1000 : audio.currentTime
      : (performance.now() - act.start) / 1000;
    const stage = performanceSpec.stageAt(time);
    if (act.stage !== stage.phase) {
      act.stage = stage.phase;
      pet.dataset.phase = stage.phase;
      say(stage.textKey, 1800);
    }
    if (time >= performanceSpec.angry.duration) {
      const id = act.id;
      stopAct();
      api.finishPerformance(id);
      return;
    }
    actFrame = requestAnimationFrame(frame);
  }
  frame();
}

function say(textKey, duration = 2400, params = {}) {
  clearTimeout(bubbleTimer);
  bubbleMessage = { textKey, params };
  document.querySelector('#bubble-text').textContent = tr(textKey, params);
  bubble.classList.add('visible');
  bubbleRemaining = duration;
  bubbleUntil = performance.now() + duration;
  if (!lastState.paused) bubbleTimer = setTimeout(() => bubble.classList.remove('visible'), duration);
}

function hearts(count = 5) {
  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.textContent = index % 3 === 0 ? '♡' : '♥';
    heart.style.setProperty('--left', `${26 + Math.random() * 48}%`);
    heart.style.setProperty('--top', `${40 + Math.random() * 20}%`);
    heart.style.setProperty('--delay', `${index * 55}ms`);
    heart.style.setProperty('--drift', `${-20 + Math.random() * 40}px`);
    effects.append(heart);
    heart.addEventListener('animationend', () => heart.remove(), { once: true });
  }
}

function applyState(state) {
  if (!state) return;
  const now = performance.now();
  if (state.paused && !lastState.paused) {
    clearTimeout(bubbleTimer);
    bubbleRemaining = Math.max(0, bubbleUntil - now);
    if (activeAct) {
      activeAct.pausedAt = now;
      activeAct.resumeAudio = activeAct.sound && !audio.paused && !audio.ended;
      audio.pause();
    }
  } else if (!state.paused && lastState.paused) {
    if (bubbleRemaining > 0) {
      bubbleUntil = now + bubbleRemaining;
      bubbleTimer = setTimeout(() => bubble.classList.remove('visible'), bubbleRemaining);
    }
    if (activeAct?.pausedAt !== undefined) {
      const elapsed = now - activeAct.pausedAt;
      activeAct.start += elapsed;
      if (activeAct.endedAt) activeAct.endedAt += elapsed;
      delete activeAct.pausedAt;
      if (activeAct.resumeAudio && activeAct.sound) audio.play().catch(() => {
        if (!activeAct) return;
        activeAct.start = performance.now() - audio.currentTime * 1000;
        activeAct.sound = false;
        pet.dataset.audio = 'unavailable';
      });
    }
  }
  if ((state.mode !== 'angry' || state.hidden) && activeAct) {
    const id = activeAct.id;
    stopAct();
    bubble.classList.remove('visible');
    if (state.hidden) api.finishPerformance(id);
  }
  if (state.soundEnabled === false && activeAct?.sound) {
    const clock = activeAct.pausedAt ?? performance.now();
    const progress = activeAct.endedAt
      ? audio.duration + (clock - activeAct.endedAt) / 1000 : audio.currentTime;
    activeAct.start = clock - progress * 1000;
    activeAct.sound = false;
    audio.pause();
    pet.dataset.audio = 'muted';
  }
  const languageChanged = state.language !== lastState.language;
  lastState = state;
  document.documentElement.lang = i18n.normalizeLanguage(state.language);
  document.title = tr('title');
  pet.setAttribute('aria-label', tr('petLabel'));
  character.title = tr('characterHint');
  menuButton.title = tr('menuTitle');
  menuButton.setAttribute('aria-label', tr('menuLabel'));
  if (languageChanged && bubbleMessage) document.querySelector('#bubble-text').textContent = tr(bubbleMessage.textKey, bubbleMessage.params);
  pet.dataset.mode = state.mode;
  pet.dataset.paused = String(state.paused === true);
  pet.dataset.airborne = String(state.airborne === true);
  pet.style.setProperty('--facing', state.direction === -1 ? '-1' : '1');
  const statistics = document.querySelector('#statistics');
  statistics.setAttribute('aria-label', tr('statisticsLabel'));
  statistics.hidden = !state.showStats;
  if (state.showStats && state.stats) {
    const stats = state.stats;
    statistics.textContent = tr('statsText', { id: state.id, count: stats.count,
      minutes: Math.floor(stats.age / 60), seconds: stats.age % 60, touches: stats.touches, drags: stats.drags,
      distance: Math.round(stats.distance), surface: tr(stats.surface === 'window' ? 'surfaceWindow' : 'surfaceDesktop'),
      status: tr(state.paused ? 'statsPaused' : 'statsActive') });
  }
  const modeLabels = { sleeping: 'ariaSleeping', dragging: 'ariaDragging', falling: 'ariaFalling', angry: 'ariaAngry', shy: 'ariaShy' };
  character.setAttribute('aria-label', tr(modeLabels[state.mode] || 'ariaIdle'));
}

api.onState(applyState);
api.onEffect((effect) => {
  if (effect.kind === 'angry') { playAngry(effect); return; }
  if (effect.kind === 'love') hearts(effect.count);
  if (effect.textKey) say(effect.textKey, effect.duration, effect.params);
});
api.getState().then(applyState);

function isInteractive(target) {
  return target instanceof Element && Boolean(target.closest('#character, #menu-button'));
}

document.addEventListener('pointermove', (event) => {
  // macOS may omit pointerup while a transparent window moves. Forwarded
  // mouse moves still report the actual button state, so release on the next one.
  if (pointer?.dragging && (event.buttons & 1) === 0) finishPointer(event, true);
  const hovering = isInteractive(event.target) || pointer !== null;
  api.setHover(hovering);
  pet.classList.toggle('hover', hovering);
  if (!pointer || pointer.dragging) return;
  if (Math.hypot(event.screenX - pointer.x, event.screenY - pointer.y) > 6) {
    clearTimeout(clickTimer);
    pointer.dragging = true;
    bubble.classList.remove('visible');
    api.beginDrag({ x: pointer.offsetX, y: pointer.offsetY });
  }
});

document.addEventListener('pointerleave', () => {
  if (pointer) return;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    pet.classList.remove('hover');
    api.setHover(false);
  }, 120);
});

character.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  if (pointer?.dragging) api.endDrag();
  character.setPointerCapture(event.pointerId);
  pointer = { id: event.pointerId, x: event.screenX, y: event.screenY,
    offsetX: event.clientX, offsetY: event.clientY, dragging: false };
  api.setHover(true);
});

function finishPointer(event, cancelled = false) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const wasDragging = pointer.dragging;
  pointer = null;
  if (character.hasPointerCapture(event.pointerId)) character.releasePointerCapture(event.pointerId);
  if (wasDragging) api.endDrag();
  if (cancelled || wasDragging) return;
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = undefined;
    api.interact('double');
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = undefined;
      api.interact('single');
    }, 300);
  }
}

window.addEventListener('pointerup', (event) => finishPointer(event), true);
window.addEventListener('pointercancel', (event) => finishPointer(event, true), true);
window.addEventListener('mouseup', () => {
  if (!pointer?.dragging) return;
  api.endDrag();
  pointer = null;
}, true);
character.addEventListener('lostpointercapture', (event) => finishPointer(event, true));
character.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); api.interact('single'); }
});
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  api.openMenu();
});
menuButton.addEventListener('click', () => api.openMenu());

// On forwarded mouse events the transparent margins should immediately pass through.
window.addEventListener('blur', () => {
  if (pointer?.dragging) {
    api.endDrag();
    pointer = null;
  }
  api.setHover(false);
});
