/**
 * main.js
 * Entry point. Loads sprite sheet, wires everything up, runs the loop.
 */
(function () {

  // ── Background image ──────────────────────────────────────────
  const BG_CANDIDATES = [
    'background/background.jpg',
    'background/background.jpeg',
    'background/background.png',
    'background/background.webp',
    'background/background.gif',
  ];

  function tryLoadBackground() {
    let idx = 0;
    function tryNext() {
      if (idx >= BG_CANDIDATES.length) return;
      const img = new Image();
      img.onload = () => {
        document.getElementById('room').style.display = 'none';
        document.body.style.backgroundImage    = `url('${BG_CANDIDATES[idx]}')`;
        document.body.style.backgroundSize     = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat   = 'no-repeat';
      };
      img.onerror = () => { idx++; tryNext(); };
      img.src = BG_CANDIDATES[idx];
    }
    tryNext();
  }
  tryLoadBackground();

  // ── Canvas ────────────────────────────────────────────────────
  const canvas = document.getElementById('catCanvas');
  const ctx    = canvas.getContext('2d');

  // Pixel-art friendly — disable smoothing so sprites stay crisp
  ctx.imageSmoothingEnabled = false;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Load sprite sheet then start ──────────────────────────────
  CatSprite.load('Cat_Sprite_Sheet.png').then(start).catch(err => {
    console.error('Failed to load sprite sheet:', err);
  });

  function start() {
    const cat = CatPhysics.create(window.innerWidth * 0.4, window.innerHeight * 0.65);

    // ── Input ──────────────────────────────────────────────────
    document.addEventListener('mousemove', e => {
      cat.targetX = e.clientX;
      cat.targetY = e.clientY;
    });

    document.addEventListener('touchmove', e => {
      e.preventDefault();
      cat.targetX = e.touches[0].clientX;
      cat.targetY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('click', e => {
      const dx   = e.clientX - cat.x;
      const dy   = e.clientY - cat.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        CatPhysics.triggerPawWag(cat);
      } else {
        CatPhysics.triggerPounce(cat);
        Effects.spawnBubble(cat.x, cat.y - 100);
      }
    });

    // ── Ambient effects ────────────────────────────────────────
    Effects.spawnDustMotes();

    let bubbleTick = 0;
    const BUBBLE_INTERVAL = 400; // frames

    // ── Loop ───────────────────────────────────────────────────
    let lastTime = performance.now();

    function loop(now) {
      const rawDt = (now - lastTime) / (1000 / 60);
      const dt    = Math.min(rawDt, 3);
      lastTime = now;

      CatPhysics.update(cat, dt);

      // Idle speech bubbles
      if (cat.state === 'idle' || cat.state === 'sit') {
        bubbleTick += dt;
        if (bubbleTick >= BUBBLE_INTERVAL) {
          bubbleTick = 0;
          Effects.tryBubble(cat.x, cat.y - 110, cat.state);
        }
      } else {
        bubbleTick = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      CatSprite.draw(ctx, {
        x:         cat.x,
        y:         cat.y,
        animName:  cat.animName,
        animFrame: cat.animFrame,
        facing:    cat.facing,
        scaleX:    cat.scaleX,
        scaleY:    cat.scaleY,
        alpha:     1,
      });

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

})();
