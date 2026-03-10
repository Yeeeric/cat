/**
 * effects.js
 * Manages ambient dust motes, speech bubbles.
 * Exported via window.Effects
 */

window.Effects = (() => {

  const layer = document.getElementById('effects-layer');

  const sayings = [
    'Purrr...', '*chirp*', 'Mrrrow~', '*bap bap bap*',
    'nya?', '*slow blink*', 'mew.', '*kneads*', '*stares*', 'prrrp'
  ];

  let lastBubble = 0;
  let bubbleCooldown = 6000;

  // ── Speech Bubble ──────────────────────────────────────────────
  function spawnBubble(x, y) {
    const now = Date.now();
    if (now - lastBubble < bubbleCooldown) return;
    lastBubble = now;

    const el = document.createElement('div');
    el.className = 'speech-bubble';
    el.textContent = sayings[Math.floor(Math.random() * sayings.length)];
    el.style.left = x + 'px';
    el.style.top  = (y - 44) + 'px';
    el.style.transform = 'translateX(-50%)';
    layer.appendChild(el);

    setTimeout(() => el.remove(), 2600);
  }

  // ── Dust Motes ────────────────────────────────────────────────
  function spawnDustMotes() {
    for (let i = 0; i < 12; i++) {
      setTimeout(() => _addDust(), i * 600 + Math.random() * 400);
    }
    setInterval(() => _addDust(), 2200 + Math.random() * 1800);
  }

  function _addDust() {
    const el = document.createElement('div');
    el.className = 'dust-mote';
    const size = 2 + Math.random() * 3;
    el.style.width  = size + 'px';
    el.style.height = size + 'px';
    el.style.left   = (Math.random() * 100) + 'vw';
    el.style.top    = (40 + Math.random() * 40) + 'vh';
    const dur = 6 + Math.random() * 8;
    el.style.animationDuration = dur + 's';
    el.style.animationDelay    = (Math.random() * 3) + 's';
    layer.appendChild(el);
    setTimeout(() => el.remove(), (dur + 3) * 1000);
  }

  // ── Idle trigger ──────────────────────────────────────────────
  function tryBubble(catX, catY, catState) {
    if (catState === 'sit' || catState === 'idle') {
      spawnBubble(catX, catY);
    }
  }

  return { spawnBubble, spawnDustMotes, tryBubble };
})();
