/**
 * cat-sprite.js
 * Renders the cat using the Elthen sprite sheet (256x320, 32x32 cells).
 *
 * Sprite sheet layout (each row = one animation, left-facing):
 *   Row 0 — idle-sit-a      4 frames   (gentle seated breathing)
 *   Row 1 — idle-sit-b      4 frames   (seated, slight head tilt)
 *   Row 2 — idle-stand-a    4 frames   (standing, raises paw)
 *   Row 3 — idle-stand-b    4 frames   (standing, stretch/paw)
 *   Row 4 — walk            8 frames   (full side-on walk)
 *   Row 5 — run             8 frames   (low galloping run)
 *   Row 6 — sneak           4 frames   (belly-low creep)
 *   Row 7 — attack          6 frames   (standing swipe)
 *   Row 8 — jump            7 frames   (leap + land)
 *   Row 9 — tail-wag        8 frames   (sitting, flicking tail)
 *
 * The sprite is white-on-black. We use canvas compositing to tint it.
 * Exported via window.CatSprite
 */
window.CatSprite = (() => {

  const CELL       = 32;   // px per cell on sheet
  const DRAW_SCALE = 3;    // render at 3× (96×96 px on screen)

  // Animation definitions: [sheetRow, frameCount, fps, loop]
  // Row numbers are 0-indexed, matching the sprite sheet from top to bottom:
  //   Row 0 — idle (default sit)
  //   Row 1 — look side
  //   Row 2 — lick paw
  //   Row 3 — lick paw alternate
  //   Row 4 — slow trot (walk)
  //   Row 5 — fast leaping run
  //   Row 6 — sleeping  ← never used for movement
  //   Row 7 — playful paw wag
  //   Row 8 — pounce
  //   Row 9 — arching back
  const ANIMS = {
    'idle':       { row: 0, frames: 4, fps: 4,  loop: true  },
    'look-side':  { row: 1, frames: 4, fps: 4,  loop: true  },
    'lick-paw':   { row: 2, frames: 4, fps: 6,  loop: true  },
    'lick-paw-b': { row: 3, frames: 4, fps: 6,  loop: true  },
    'walk':       { row: 4, frames: 8, fps: 10, loop: true  },
    'run':        { row: 5, frames: 8, fps: 14, loop: true  },
    'sleep':      { row: 6, frames: 4, fps: 3,  loop: true  },
    'paw-wag':    { row: 7, frames: 6, fps: 8,  loop: true  },
    'pounce':     { row: 8, frames: 7, fps: 10, loop: false },
    'arch-back':  { row: 9, frames: 8, fps: 6,  loop: false },
  };

  // Internal offscreen canvas for tinting
  let _sheet     = null;   // HTMLImageElement
  let _tintCanvas = null;
  let _tintCtx    = null;
  let _loaded     = false;

  // ── Load sprite sheet ──────────────────────────────────────────
  function load(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        _sheet = img;

        // Build offscreen canvas same size as sheet for tinting
        _tintCanvas = document.createElement('canvas');
        _tintCanvas.width  = img.width;
        _tintCanvas.height = img.height;
        _tintCtx = _tintCanvas.getContext('2d');

        _loaded = true;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // ── Draw one frame ─────────────────────────────────────────────
  /**
   * @param {CanvasRenderingContext2D} ctx  — main canvas context
   * @param {Object} s  — sprite state
   *   s.x, s.y         — centre-bottom of cat in canvas coords
   *   s.animName       — key from ANIMS
   *   s.animFrame      — integer frame index (caller advances this)
   *   s.facing         — 1=right, -1=left (sheet faces left natively)
   *   s.scaleX         — extra horizontal scale (for squash/stretch)
   *   s.scaleY         — extra vertical scale
   *   s.tint           — optional CSS colour string (default: no tint)
   *   s.alpha          — opacity 0–1 (default 1)
   */
  function draw(ctx, s) {
    if (!_loaded) return;

    const anim = ANIMS[s.animName] || ANIMS['idle-sit'];
    const frame = Math.floor(s.animFrame) % anim.frames;

    const sx = frame * CELL;
    const sy = anim.row * CELL;

    const drawW = CELL * DRAW_SCALE * (s.scaleX || 1);
    const drawH = CELL * DRAW_SCALE * (s.scaleY || 1);

    // Anchor at centre-bottom
    const drawX = -drawW / 2;
    const drawY = -drawH;

    ctx.save();
    ctx.translate(s.x, s.y);

    // Flip: sheet is left-facing; facing=1 means moving right → flip horizontally
    if (s.facing === -1) ctx.scale(-1, 1);

    ctx.globalAlpha = (s.alpha !== undefined) ? s.alpha : 1;

    // Draw shadow
    ctx.save();
    ctx.scale(s.facing === 1 ? -1 : 1, 1); // undo flip for shadow
    ctx.beginPath();
    ctx.ellipse(0, -2, drawW * 0.38, drawW * 0.08, 0, 0, Math.PI * 2);
    const shadowG = ctx.createRadialGradient(0, -2, 0, 0, -2, drawW * 0.38);
    shadowG.addColorStop(0, 'rgba(0,0,0,0.28)');
    shadowG.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowG;
    ctx.fill();
    ctx.restore();

    // Draw sprite (white pixels are the cat; black bg is transparent via 'screen' blend)
    // Use destination-over trick: draw sheet, use 'screen' so black disappears
    ctx.drawImage(
      _sheet,
      sx, sy, CELL, CELL,   // source
      drawX, drawY, drawW, drawH  // dest
    );

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Helpers ────────────────────────────────────────────────────
  function getAnim(name)   { return ANIMS[name]; }
  function isLoaded()      { return _loaded; }
  function getFrameCount(name) { return (ANIMS[name] || ANIMS['idle-sit']).frames; }
  function getFPS(name)    { return (ANIMS[name] || ANIMS['idle-sit']).fps; }
  function isLooping(name) { return (ANIMS[name] || ANIMS['idle-sit']).loop; }

  return { load, draw, getAnim, isLoaded, getFrameCount, getFPS, isLooping, ANIMS };
})();
