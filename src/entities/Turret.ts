import Phaser from 'phaser';
import { COLORS, TURRETS } from '../config';
import type { TurretType } from '../types';
import { Enemy } from './Enemy';
import type { EconomyManager } from '../systems/EconomyManager';

export class Turret {
  scene: Phaser.Scene;
  type: TurretType;
  x: number; y: number;
  baseDamage: number; baseRange: number; baseFireRate: number;
  lastFired: number = 0;
  disabled: boolean = false;
  disableTimer: number = 0;

  private g!: Phaser.GameObjects.Graphics;
  rangeCircle!: Phaser.GameObjects.Graphics;
  private pulse: number = 0;
  private shootFlash: number = 0;
  private aimAngle: number = 0;
  private economy?: EconomyManager;

  constructor(scene: Phaser.Scene, type: TurretType, x: number, y: number, economy?: EconomyManager) {
    this.scene = scene;
    this.type = type;
    this.x = x; this.y = y;
    this.economy = economy;
    const cfg = TURRETS[type];
    this.baseDamage = cfg.damage;
    this.baseRange = cfg.range;
    this.baseFireRate = cfg.fireRate;

    this.g = scene.add.graphics().setDepth(300);
    this.rangeCircle = scene.add.graphics().setDepth(50).setVisible(false);
    this.draw();
  }

  get damage()   { return this.baseDamage   * (this.economy?.getDamageMult()   ?? 1); }
  get range()    { return this.baseRange    + (this.economy?.getRangeBonus()   ?? 0); }
  get fireRate() { return this.baseFireRate * (this.economy?.getFireRateMult() ?? 1); }

  draw() {
    const g = this.g; g.clear();
    const x = this.x, y = this.y;
    const p = this.pulse;
    const flash = this.shootFlash > 0;

    if (this.disabled) {
      g.fillStyle(0x333333, 0.6); g.fillCircle(x, y, 10);
      g.lineStyle(1, 0x555555, 0.5); g.strokeCircle(x, y, 10);
      return;
    }

    // Base pad (all turrets)
    g.fillStyle(0x0e1f14, 0.9);
    g.fillCircle(x, y, 13);
    g.lineStyle(1, COLORS.GREEN_DARK, 0.6);
    g.strokeCircle(x, y, 13);

    const a = this.aimAngle;

    switch (this.type) {
      case 'laser': {
        const col = flash ? 0xffffff : COLORS.GREEN;
        // Barrel
        const bx = x + Math.cos(a) * 14, by = y + Math.sin(a) * 14;
        g.lineStyle(4, col, 0.9);
        g.lineBetween(x, y, bx, by);
        g.lineStyle(2, 0x4ade80, 0.6);
        g.lineBetween(x, y, bx, by);
        // Body
        g.fillStyle(col, 0.85); g.fillCircle(x, y, 7);
        g.fillStyle(0xffffff, 0.3); g.fillCircle(x, y, 3);
        // Muzzle glow
        if (flash) {
          g.fillStyle(0xffffff, 0.8); g.fillCircle(bx, by, 5);
        }
        break;
      }

      case 'mortar': {
        const col = flash ? 0xffffff : COLORS.ORANGE;
        // Fat mortar body
        g.fillStyle(col, 0.85); g.fillCircle(x, y, 9);
        // Barrel (points up with slight aim)
        const mx = x + Math.cos(a) * 10, my = y + Math.sin(a) * 10;
        g.lineStyle(6, col, 0.9); g.lineBetween(x, y, mx, my);
        g.lineStyle(2, 0xffcc66, 0.7); g.lineBetween(x, y, mx, my);
        g.fillStyle(0x331100, 0.4); g.fillCircle(x, y, 5);
        if (flash) {
          g.fillStyle(0xff8800, 0.8); g.fillCircle(mx, my, 6);
        }
        break;
      }

      case 'tesla': {
        const col = flash ? 0xffffff : COLORS.CYAN;
        // Coil shape
        g.lineStyle(2.5, col, 0.9);
        for (let i = 0; i < 4; i++) {
          const ta = (i / 4) * Math.PI * 2 + p;
          const r1 = 5, r2 = 10;
          g.lineBetween(
            x + Math.cos(ta) * r1, y + Math.sin(ta) * r1,
            x + Math.cos(ta + Math.PI / 4) * r2, y + Math.sin(ta + Math.PI / 4) * r2
          );
        }
        g.fillStyle(col, 0.75); g.fillCircle(x, y, 6);
        // Arc bolts
        if (flash) {
          g.lineStyle(1.5, 0xffffff, 0.9);
          for (let i = 0; i < 3; i++) {
            const ba = a + (i - 1) * 0.5;
            g.lineBetween(x, y, x + Math.cos(ba) * 18, y + Math.sin(ba) * 18);
          }
        }
        break;
      }

      case 'freeze': {
        const col = flash ? 0xffffff : 0x3399ff;
        // Snowflake
        for (let i = 0; i < 6; i++) {
          const fa = (i / 6) * Math.PI * 2;
          g.lineStyle(2, col, 0.85);
          g.lineBetween(x, y, x + Math.cos(fa) * 11, y + Math.sin(fa) * 11);
          // Branch
          const bLen = 5;
          const bx2 = x + Math.cos(fa) * 7, by2 = y + Math.sin(fa) * 7;
          g.lineStyle(1.5, col, 0.6);
          g.lineBetween(bx2, by2, bx2 + Math.cos(fa + Math.PI/3)*bLen, by2 + Math.sin(fa + Math.PI/3)*bLen);
          g.lineBetween(bx2, by2, bx2 + Math.cos(fa - Math.PI/3)*bLen, by2 + Math.sin(fa - Math.PI/3)*bLen);
        }
        g.fillStyle(0x88ccff, 0.8); g.fillCircle(x, y, 4);
        if (flash) {
          g.lineStyle(1, 0xffffff, 0.7); g.strokeCircle(x, y, 14);
        }
        break;
      }

      case 'nuke': {
        const col = flash ? 0xffffff : COLORS.RED;
        // Missile body
        const nx = x + Math.cos(a) * 14, ny = y + Math.sin(a) * 14;
        g.lineStyle(6, col, 0.9); g.lineBetween(x, y, nx, ny);
        // Warhead
        g.fillStyle(col, 0.9); g.fillCircle(nx, ny, 5);
        g.fillStyle(0xff8800, 0.7); g.fillCircle(x, y, 8);
        // Warning rings
        const wa = 0.2 + Math.sin(p * 4) * 0.15;
        g.lineStyle(1.5, col, wa); g.strokeCircle(x, y, 12);
        g.lineStyle(1, COLORS.ORANGE, wa * 0.6); g.strokeCircle(x, y, 15);
        if (flash) {
          g.fillStyle(0xff3300, 0.9); g.fillCircle(nx, ny, 7);
        }
        break;
      }
    }
  }

  findTarget(enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null; let bestDist = Infinity;
    for (const e of enemies) {
      if (e.dead || e.reached || e.cleanedUp) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= this.range && d < bestDist) { best = e; bestDist = d; }
    }
    return best;
  }

  canFire(now: number): boolean {
    if (this.disabled) return false;
    return (now - this.lastFired) >= (1000 / this.fireRate);
  }

  fire(target: Enemy, now: number, enemies: Enemy[], gameSpeed: number = 1) {
    this.lastFired = now;
    this.shootFlash = 130;

    const dx = target.x - this.x, dy = target.y - this.y;
    this.aimAngle = Math.atan2(dy, dx);

    switch (this.type) {
      case 'laser': {
        target.takeDamage(this.damage);
        try { this.scene.sound.play('laser', { volume: 0.25, detune: (Math.random()-0.5)*250 }); } catch(_) {}
        const beam = this.scene.add.graphics().setDepth(250);
        beam.lineStyle(3, COLORS.GREEN, 0.9);
        beam.lineBetween(this.x, this.y, target.x, target.y);
        beam.lineStyle(1, 0xaaffaa, 0.55);
        beam.lineBetween(this.x, this.y, target.x, target.y);
        this.scene.tweens.add({ targets: beam, alpha: 0, duration: 85, onComplete: () => beam.destroy() });
        break;
      }

      case 'mortar': {
        const aoe = (TURRETS.mortar as { aoeRadius: number }).aoeRadius;
        try { this.scene.sound.play('mortar', { volume: 0.36 }); } catch(_) {}
        this.fireProjectile(this.x, this.y, target.x, target.y, 0xff8800, 6, 85, gameSpeed, (ex, ey) => {
          for (const e of enemies) {
            if (e.dead || e.cleanedUp) continue;
            if (Math.hypot(e.x - ex, e.y - ey) <= aoe) e.takeDamage(this.damage);
          }
          this.explode(ex, ey, aoe, COLORS.ORANGE, 'particle-orange', 14);
          try { this.scene.sound.play('explosion', { volume: 0.42 }); } catch(_) {}
        });
        break;
      }

      case 'tesla': {
        const chain: Enemy[] = [target];
        for (const e of enemies) {
          if (e === target || e.dead || e.cleanedUp || chain.length >= 3) continue;
          if (Math.hypot(e.x - target.x, e.y - target.y) < 125) chain.push(e);
        }
        chain.forEach(t2 => t2.takeDamage(this.damage));
        try { this.scene.sound.play('laser', { volume: 0.32, detune: -750 }); } catch(_) {}

        const arc = this.scene.add.graphics().setDepth(255);
        for (let i = 0; i < chain.length; i++) {
          const from = i === 0 ? this : chain[i-1]!;
          const to = chain[i]!;
          const pts = zigzag(from.x, from.y, to.x, to.y, 5);
          arc.lineStyle(2.5, 0x00ffff, 0.95); arc.strokePoints(pts, false);
          arc.lineStyle(1, 0x88ffff, 0.5);    arc.strokePoints(pts, false);
        }
        this.scene.tweens.add({ targets: arc, alpha: 0, duration: 130, onComplete: () => arc.destroy() });
        break;
      }

      case 'freeze': {
        target.takeDamage(this.damage);
        target.applyStatus('frozen', 2500);
        try { this.scene.sound.play('shield', { volume: 0.26, detune: 600 }); } catch(_) {}
        this.scene.add.particles(target.x, target.y, 'particle-cyan', {
          speed:{min:22,max:70}, scale:{start:0.65,end:0}, lifespan:380, quantity:6, emitting:false,
        }).explode(6, target.x, target.y);
        // Ice beam visual
        const iceBeam = this.scene.add.graphics().setDepth(248);
        iceBeam.lineStyle(2, 0x88ccff, 0.8);
        iceBeam.lineBetween(this.x, this.y, target.x, target.y);
        this.scene.tweens.add({ targets: iceBeam, alpha: 0, duration: 120, onComplete: () => iceBeam.destroy() });
        break;
      }

      case 'nuke': {
        const aoeN = (TURRETS.nuke as { aoeRadius: number }).aoeRadius;
        try { this.scene.sound.play('nuke-launch', { volume: 0.48 }); } catch(_) {}
        this.fireProjectile(this.x, this.y, target.x, target.y, 0xff3333, 10, 130, gameSpeed, (ex, ey) => {
          for (const e of enemies) {
            if (e.dead || e.cleanedUp) continue;
            if (Math.hypot(e.x - ex, e.y - ey) <= aoeN) e.takeDamage(this.damage);
          }
          this.scene.cameras.main.shake(380, 0.028);
          this.explode(ex, ey, aoeN, COLORS.RED, 'particle-red', 30);
          this.scene.add.particles(ex, ey, 'particle-orange', {
            speed:{min:90,max:280}, scale:{start:1.5,end:0}, lifespan:720, quantity:24, emitting:false,
          }).explode(24, ex, ey);
          try { this.scene.sound.play('nuke-explode', { volume: 0.68 }); } catch(_) {}
        });
        break;
      }
    }
  }

  private fireProjectile(
    sx: number, sy: number, ex: number, ey: number,
    color: number, size: number, arcH: number,
    gameSpeed: number, onHit: (x: number, y: number) => void
  ) {
    const shell = this.scene.add.graphics().setDepth(260);
    const totalMs = 480 / gameSpeed;
    let elapsed = 0;
    const tick = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
      elapsed += 16;
      const t = Math.min(elapsed / totalMs, 1);
      shell.clear();
      const px = Phaser.Math.Linear(sx, ex, t);
      const py = Phaser.Math.Linear(sy, ey, t) - Math.sin(t * Math.PI) * arcH;
      shell.fillStyle(color, 1); shell.fillCircle(px, py, size);
      shell.fillStyle(0xffffff, 0.4); shell.fillCircle(px, py, size * 0.4);
      if (t >= 1) { tick.destroy(); shell.destroy(); onHit(ex, ey); }
    }});
  }

  private explode(cx: number, cy: number, radius: number, color: number, particle: string, qty: number) {
    this.scene.add.particles(cx, cy, particle, {
      speed:{min:55,max:185}, scale:{start:1.0,end:0}, lifespan:480, quantity:qty, emitting:false,
    }).explode(qty, cx, cy);
    const ring = this.scene.add.graphics().setDepth(255);
    ring.lineStyle(3, color, 1); ring.strokeCircle(cx, cy, 10);
    this.scene.tweens.add({ targets: ring, scaleX: radius/10, scaleY: radius/10, alpha: 0,
      duration: 340, onComplete: () => ring.destroy() });
  }

  disable(duration: number) {
    this.disabled = true;
    this.disableTimer = duration;
    this.scene.add.particles(this.x, this.y, 'particle-cyan', {
      speed:{min:18,max:55}, scale:{start:0.45,end:0}, lifespan:280, quantity:5, emitting:false,
    }).explode(5, this.x, this.y);
    this.draw();
  }

  update(now: number, delta: number, enemies: Enemy[], gameSpeed: number = 1) {
    this.pulse += delta * 0.003;
    this.shootFlash = Math.max(0, this.shootFlash - delta);

    if (this.disabled) {
      this.disableTimer -= delta;
      if (this.disableTimer <= 0) { this.disabled = false; }
    }

    if (this.canFire(now)) {
      const target = this.findTarget(enemies);
      if (target) this.fire(target, now, enemies, gameSpeed);
    }

    this.draw();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function zigzag(x1: number, y1: number, x2: number, y2: number, segs: number) {
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push({
      x: Phaser.Math.Linear(x1, x2, t) + (Math.random()-0.5)*20,
      y: Phaser.Math.Linear(y1, y2, t) + (Math.random()-0.5)*20,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}
