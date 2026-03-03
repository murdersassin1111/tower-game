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
  level: number = 1;

  sprite!: Phaser.GameObjects.Image;
  baseSprite!: Phaser.GameObjects.Image;
  rangeCircle!: Phaser.GameObjects.Graphics;
  private pulse: number = 0;
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

    this.baseSprite = scene.add.image(x, y + 6, 'tower-base')
      .setDepth(295).setScale(0.28).setTint(0x1a3a2a).setAlpha(0.8);
    this.sprite = scene.add.image(x, y, `turret-${type}`)
      .setDepth(300).setScale(0.55);
    this.rangeCircle = scene.add.graphics().setDepth(50).setVisible(false);
  }

  get damage()   { return this.baseDamage   * (this.economy?.getDamageMult()   ?? 1); }
  get range()    { return this.baseRange    + (this.economy?.getRangeBonus()   ?? 0); }
  get fireRate() { return this.baseFireRate * (this.economy?.getFireRateMult() ?? 1); }

  findTarget(enemies: Enemy[]): Enemy | null {
    let best: Enemy | null = null; let bestDist = Infinity;
    for (const e of enemies) {
      if (e.dead || e.reached) continue;
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

    // Rotate gun toward target
    const dx = target.x - this.x, dy = target.y - this.y;
    this.sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

    switch (this.type) {
      case 'laser': {
        target.takeDamage(this.damage);
        try { this.scene.sound.play('laser', { volume: 0.28, detune: (Math.random()-0.5)*200 }); } catch(_) {}
        const beam = this.scene.add.graphics().setDepth(250);
        beam.lineStyle(3, COLORS.GREEN, 1);
        beam.lineBetween(this.x, this.y, target.x, target.y);
        beam.lineStyle(1, 0xaaffaa, 0.6);
        beam.lineBetween(this.x, this.y, target.x, target.y);
        this.scene.tweens.add({ targets: beam, alpha: 0, duration: 90, onComplete: () => beam.destroy() });
        break;
      }

      case 'mortar': {
        const aoe = (TURRETS.mortar as { aoeRadius: number }).aoeRadius;
        try { this.scene.sound.play('mortar', { volume: 0.38 }); } catch(_) {}
        this.fireProjectile(this.x, this.y, target.x, target.y, 0xff8800, 6, 80, gameSpeed, (ex, ey) => {
          for (const e of enemies) {
            if (e.dead) continue;
            const ddx = e.x - ex, ddy = e.y - ey;
            if (Math.sqrt(ddx*ddx+ddy*ddy) <= aoe) e.takeDamage(this.damage);
          }
          this.explode(ex, ey, aoe, COLORS.ORANGE, 'particle-orange', 14);
          try { this.scene.sound.play('explosion', { volume: 0.45 }); } catch(_) {}
        });
        break;
      }

      case 'tesla': {
        const chain: Enemy[] = [target];
        for (const e of enemies) {
          if (e === target || e.dead || chain.length >= 3) continue;
          const ddx = e.x - target.x, ddy = e.y - target.y;
          if (Math.sqrt(ddx*ddx+ddy*ddy) < 120) chain.push(e);
        }
        chain.forEach(t2 => t2.takeDamage(this.damage));
        try { this.scene.sound.play('laser', { volume: 0.35, detune: -700 }); } catch(_) {}
        const arc = this.scene.add.graphics().setDepth(255);
        for (let i = 0; i < chain.length; i++) {
          const from = i === 0 ? this : chain[i-1]!;
          arc.lineStyle(2 + Math.random(), 0x00ffff, 1);
          // zigzag lightning
          const tx = chain[i]!.x, ty = chain[i]!.y;
          const pts = this.lightningPts(from.x, from.y, tx, ty, 4);
          arc.strokePoints(pts, false);
        }
        this.scene.tweens.add({ targets: arc, alpha: 0, duration: 140, onComplete: () => arc.destroy() });
        break;
      }

      case 'freeze': {
        target.takeDamage(this.damage);
        target.applyStatus('frozen', 2400);
        try { this.scene.sound.play('shield', { volume: 0.28, detune: 500 }); } catch(_) {}
        this.scene.add.particles(target.x, target.y, 'particle-cyan', {
          speed:{min:25,max:75}, scale:{start:0.7,end:0}, lifespan:400, quantity:6, emitting:false,
        }).explode(6, target.x, target.y);
        break;
      }

      case 'nuke': {
        const aoeN = (TURRETS.nuke as { aoeRadius: number }).aoeRadius;
        try { this.scene.sound.play('nuke-launch', { volume: 0.5 }); } catch(_) {}
        this.fireProjectile(this.x, this.y, target.x, target.y, 0xff3333, 9, 120, gameSpeed, (ex, ey) => {
          for (const e of enemies) {
            if (e.dead) continue;
            const ddx = e.x - ex, ddy = e.y - ey;
            if (Math.sqrt(ddx*ddx+ddy*ddy) <= aoeN) e.takeDamage(this.damage);
          }
          this.scene.cameras.main.shake(380, 0.028);
          this.explode(ex, ey, aoeN, COLORS.RED, 'particle-red', 30);
          this.scene.add.particles(ex, ey, 'particle-orange', {
            speed:{min:80,max:260}, scale:{start:1.4,end:0}, lifespan:700, quantity:22, emitting:false,
          }).explode(22, ex, ey);
          try { this.scene.sound.play('nuke-explode', { volume: 0.7 }); } catch(_) {}
        });
        break;
      }
    }
  }

  private fireProjectile(
    sx: number, sy: number, ex: number, ey: number,
    color: number, size: number, arc: number,
    gameSpeed: number, onHit: (x: number, y: number) => void
  ) {
    const shell = this.scene.add.graphics().setDepth(260);
    const totalMs = 500 / gameSpeed;
    let elapsed = 0;
    const cb = this.scene.time.addEvent({
      delay: 16, loop: true, callback: () => {
        elapsed += 16;
        const t = Math.min(elapsed / totalMs, 1);
        shell.clear();
        const px = Phaser.Math.Linear(sx, ex, t);
        const py = Phaser.Math.Linear(sy, ey, t) - Math.sin(t * Math.PI) * arc;
        shell.fillStyle(color, 1); shell.fillCircle(px, py, size);
        if (t >= 1) { cb.destroy(); shell.destroy(); onHit(ex, ey); }
      }
    });
  }

  private explode(cx: number, cy: number, radius: number, color: number, particle: string, qty: number) {
    this.scene.add.particles(cx, cy, particle, {
      speed:{min:50,max:180}, scale:{start:1.0,end:0}, lifespan:500, quantity:qty, emitting:false,
    }).explode(qty, cx, cy);
    const ring = this.scene.add.graphics().setDepth(255);
    ring.lineStyle(3, color, 1); ring.strokeCircle(cx, cy, 10);
    this.scene.tweens.add({ targets: ring, scaleX: radius/10, scaleY: radius/10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
  }

  private lightningPts(x1: number, y1: number, x2: number, y2: number, segs: number) {
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: x1, y: y1 }];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = Phaser.Math.Linear(x1, x2, t) + (Math.random()-0.5)*18;
      const my = Phaser.Math.Linear(y1, y2, t) + (Math.random()-0.5)*18;
      pts.push({ x: mx, y: my });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  disable(duration: number) {
    this.disabled = true;
    this.disableTimer = duration;
    this.sprite.setTint(0x555555).setAlpha(0.55);
    // Visual EMP sparks
    this.scene.add.particles(this.x, this.y, 'particle-cyan', {
      speed:{min:20,max:60}, scale:{start:0.5,end:0}, lifespan:300, quantity:5, emitting:false,
    }).explode(5, this.x, this.y);
  }

  update(now: number, delta: number, enemies: Enemy[], gameSpeed: number = 1) {
    this.pulse += delta * 0.003;

    if (this.disabled) {
      this.disableTimer -= delta;
      if (this.disableTimer <= 0) {
        this.disabled = false;
        this.sprite.clearTint().setAlpha(1);
      }
    }

    // Idle bob
    this.sprite.setY(this.y + Math.sin(this.pulse) * 1.5);

    if (this.canFire(now)) {
      const target = this.findTarget(enemies);
      if (target) this.fire(target, now, enemies, gameSpeed);
    }
  }
}
