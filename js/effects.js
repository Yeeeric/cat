/**
 * effects.js
 * Manages ambient dust motes, speech bubbles.
 * Exported via window.Effects
 */

window.Effects = (() => {

  const layer = document.getElementById('effects-layer');

  const sayings = [
    'Purrr...', 'Miau~', 'Mrrrow~', '*bap bap bap*',
    'nya?', '*slow blink*', 'mew.', 'miw', '*stares*'
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

  // ── Idle trigger ──────────────────────────────────────────────
  function tryBubble(catX, catY, catState) {
    if (catState === 'sit' || catState === 'idle') {
      spawnBubble(catX, catY);
    }
  }

  return { spawnBubble, tryBubble };
})();
