/**
 * cat-physics.js
 * Physics and state machine for the cat.
 *
 * Movement states → animations:
 *   moving fast  → 'run'         (row 5, fast leaping run)
 *   moving slow  → 'walk'        (row 4, slow trot)
 *   just stopped → 'idle'        (row 0, default idle) — immediate
 *   idle a while → cycles through: 'look-side', 'lick-paw', 'lick-paw-b',
 *                                   'paw-wag', 'arch-back'
 *   idle very long → 'sleep'     (row 6, only after extended stillness)
 *
 * One-shots (triggered externally):
 *   click near   → 'paw-wag'     (row 7, playful)
 *   click far    → 'pounce'      (row 8)
 *
 * sleep (row 6) is NEVER used as a movement or transition state.
 */
window.CatPhysics = (() => {

  function lerp(a, b, t) { return a + (b - a) * t; }

  const IDLE_CYCLE = ['idle', 'look-side', 'lick-paw', 'lick-paw-b', 'paw-wag', 'arch-back'];
  const FRAMES_BEFORE_SLEEP = 600;
  const FRAMES_BEFORE_IDLE_CYCLE = 120;

  function create(startX, startY) {
    return {
      x: startX, y: startY,
      vx: 0, vy: 0,
      targetX: startX, targetY: startY,

      state: 'idle',
      animName: 'idle',
      animFrame: 0,
      animTimer: 0,

      facing: -1,

      scaleX: 1,
      scaleY: 1,

      stillTimer: 0,
      idleCycleIndex: 0,
      idleAnimTimer: 0,

      lockedAnim: null,
      lockTimer: 0,

      isTurning: false,
      turnProgress: 0,

      speed: 0,
      wasMoving: false,
      pounceTimer: 0,
    };
  }

  function update(cat, dt) {
    const dtSec = dt / 60;

    const dx   = cat.targetX - cat.x;
    const dy   = cat.targetY - cat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ── One-shot lock (paw-wag only) ──────────────────────────────
    if (cat.lockedAnim) {
      cat.lockTimer -= dt;
      _advanceFrame(cat, dtSec);
      cat.vx *= 0.85;
      cat.vy *= 0.85;
      cat.x += cat.vx * dt;
      cat.y += cat.vy * dt;
      _clampPosition(cat);
      if (cat.lockTimer <= 0) {
        cat.lockedAnim = null;
        _enterIdle(cat);
      }
      return;
    }

    // ── Desired movement ──────────────────────────────────────────
    let desiredSpeed, moving;

    if (dist < 40) {
      desiredSpeed = 0;
      moving = false;
    } else if (dist < 180) {
      desiredSpeed = 2.5;
      moving = true;
    } else {
      desiredSpeed = Math.min(10, lerp(2.5, 10, (dist - 180) / 300));
      moving = true;
    }

    // Apply velocity
    if (dist > 2) {
      const nx = dx / dist;
      const ny = dy / dist;
      const accel = lerp(0.1, 0.22, Math.min(dist / 400, 1));
      cat.vx = lerp(cat.vx, nx * desiredSpeed, accel);
      cat.vy = lerp(cat.vy, ny * desiredSpeed, accel);
    } else {
      cat.vx *= 0.78;
      cat.vy *= 0.78;
    }

    cat.speed = Math.sqrt(cat.vx * cat.vx + cat.vy * cat.vy);

    // ── Facing & turn squish ──────────────────────────────────────
    const prevFacing = cat.facing;
    if      (cat.vx >  0.5) cat.facing =  1;
    else if (cat.vx < -0.5) cat.facing = -1;

    if (cat.facing !== prevFacing && cat.speed > 1) {
      cat.isTurning = true;
      cat.turnProgress = 0;
    }
    if (cat.isTurning) {
      cat.turnProgress += 0.1 * dt;
      if (cat.turnProgress >= 1) cat.isTurning = false;
    }

    // ── Squash/stretch ────────────────────────────────────────────
    const isRun = cat.speed > 4;
    cat.scaleX = lerp(cat.scaleX, isRun ? lerp(1, 1.15, Math.min(cat.speed/10,1)) : 1, 0.15);
    cat.scaleY = lerp(cat.scaleY, isRun ? lerp(1, 0.88, Math.min(cat.speed/10,1)) : 1, 0.15);
    if (cat.isTurning) {
      cat.scaleX = Math.max(0.05, Math.abs(cat.turnProgress - 0.5) * 2);
    }

    // ── Animation state machine ───────────────────────────────────
    if (moving) {
      cat.stillTimer     = 0;
      cat.idleCycleIndex = 0;
      cat.idleAnimTimer  = 0;
      cat.wasMoving      = true;

      // Tick down pounce — don't reassign anim until it finishes
      if (cat.pounceTimer > 0) {
        cat.pounceTimer -= dt;
      } else {
        const targetAnim = cat.speed > 4 ? 'run' : 'walk';
        if (cat.animName !== targetAnim) {
          cat.animName  = targetAnim;
          cat.animFrame = 0;
          cat.animTimer = 0;
        }
      }
    } else {
      cat.pounceTimer = 0;
      cat.stillTimer += dt;

      if (cat.wasMoving) {
        cat.wasMoving = false;
        _enterIdle(cat);
      } else {
        _updateIdleCycle(cat, dt);
      }
    }

    _advanceFrame(cat, dtSec);

    cat.x += cat.vx * dt;
    cat.y += cat.vy * dt;
    _clampPosition(cat);
  }

  function _enterIdle(cat) {
    cat.animName       = 'idle';
    cat.animFrame      = 0;
    cat.animTimer      = 0;
    cat.idleCycleIndex = 0;
    cat.idleAnimTimer  = 0;
  }

  function _updateIdleCycle(cat, dt) {
    if (cat.stillTimer < FRAMES_BEFORE_IDLE_CYCLE) {
      if (cat.animName !== 'idle') _enterIdle(cat);
      return;
    }

    if (cat.stillTimer > FRAMES_BEFORE_SLEEP) {
      if (cat.animName !== 'sleep') {
        cat.animName  = 'sleep';
        cat.animFrame = 0;
        cat.animTimer = 0;
      }
      return;
    }

    cat.idleAnimTimer += dt;

    const currentAnim    = IDLE_CYCLE[cat.idleCycleIndex];
    const framesPerCycle = CatSprite.getFrameCount(currentAnim) / CatSprite.getFPS(currentAnim) * 60;
    const holdFrames     = framesPerCycle * (2 + Math.floor(cat.idleCycleIndex % 2));

    if (cat.idleAnimTimer >= holdFrames) {
      cat.idleAnimTimer  = 0;
      cat.idleCycleIndex = (cat.idleCycleIndex + 1) % IDLE_CYCLE.length;
    }

    const newAnim = IDLE_CYCLE[cat.idleCycleIndex];
    if (cat.animName !== newAnim) {
      cat.animName  = newAnim;
      cat.animFrame = 0;
      cat.animTimer = 0;
    }
  }

  function _advanceFrame(cat, dtSec) {
    const fps   = CatSprite.getFPS(cat.animName);
    const count = CatSprite.getFrameCount(cat.animName);
    const loop  = CatSprite.isLooping(cat.animName);
    cat.animTimer += dtSec;
    const frameDur = 1 / fps;
    while (cat.animTimer >= frameDur) {
      cat.animTimer -= frameDur;
      cat.animFrame++;
      if (cat.animFrame >= count) {
        cat.animFrame = loop ? 0 : count - 1;
      }
    }
  }

  function _clampPosition(cat) {
    const PAD = 40;
    cat.x = Math.max(PAD, Math.min(window.innerWidth  - PAD, cat.x));
    cat.y = Math.max(PAD, Math.min(window.innerHeight - PAD, cat.y));
  }

  function triggerPawWag(cat) {
    if (cat.lockedAnim) return;
    cat.lockedAnim = 'paw-wag';
    cat.animName   = 'paw-wag';
    cat.animFrame  = 0;
    cat.animTimer  = 0;
    cat.lockTimer  = (CatSprite.getFrameCount('paw-wag') / CatSprite.getFPS('paw-wag')) * 60;
  }

  function triggerPounce(cat) {
    cat.animName    = 'pounce';
    cat.animFrame   = 0;
    cat.animTimer   = 0;
    cat.pounceTimer = (CatSprite.getFrameCount('pounce') / CatSprite.getFPS('pounce')) * 60;
  }

  return { create, update, triggerPawWag, triggerPounce };
})();