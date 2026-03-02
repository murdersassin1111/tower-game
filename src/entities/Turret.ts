import Phaser from 'phaser';
import { COLORS, TURRETS } from '../config';
import type { TurretType } from '../types';
import { Enemy } from './Enemy';

export class Turret {
  scene: Phaser.Scene;
  type: TurretType;
  x: number; y: number;
  damage: number; range: number; fireRate: number;
  lastFired: number = 0;
  disabled: boolean = false;
  disableTimer: number = 0;
  level: number = 1;
  graphics!: Phaser.GameObjects.Graphics;
  rangeCircle!: Phaser.GameObjects.Graphics;
  private pulse: number = 0;
  private shootFlash: number = 0;

  constructor(scene: Phaser.Scene, type: TurretType, x: number, y: number) {
    this.scene = scene;
    this.type = type;
    this.x = x; this.y = y;
    const cfg = TURRETS[type];
    this.damage = cfg.damage;
    this.range = cfg.range;
    this.fireRate = cfg.fireRate;
    this.graphics = scene.add.graphics().setDepth(300);
    this.rangeCircle = scene.add.graphics().setDepth(50).setVisible(false);
    this.draw();
  }

  draw() {
    const g = this.graphics;
    g.clear(); g.x = this.x; g.y = this.y;
    const p = this.pulse;
    const flash = this.shootFlash > 0;
    if (this.disabled) {
      g.fillStyle(0x555555, 0.7);
      g.fillCircle(0, 0, 10);
      return;
    }
    const glow = Math.sin(p) * 0.15 + 0.85;

    switch (this.type) {
      case 'laser':
        g.fillStyle(COLORS.GREEN, glow);
        g.fillRect(-5, -12, 10, 24);
        g.fillStyle(COLORS.GREEN_LIGHT, 0.9);
        g.fillRect(-3, -15, 6, 8);
        if (flash) { g.fillStyle(0xffffff, 0.9); g.fillCircle(0, -16, 5); }
        break;
      case 'mortar':
        g.fillStyle(COLORS.ORANGE, glow);
        g.fillCircle(0, 0, 12);
        g.fillStyle(0xffaa00, 0.9);
        g.fillRect(-5, -18, 10, 18);
        break;
      case 'tesla':
        g.lineStyle(3, COLORS.CYAN, glow);
        g.strokeCircle(0, 0, 10);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + p;
          g.lineStyle(2, COLORS.CYAN, 0.7);
          g.lineBetween(Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a) * 18, Math.sin(a) * 18);
        }
        break;
      case 'freeze':
        g.fillStyle(0x3399ff, glow);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.fillRect(Math.cos(a) * 8 - 2, Math.sin(a) * 8 - 2, 4, 4);
        }
        g.fillStyle(0x88ccff, 0.9); g.fillCircle(0, 0, 6);
        break;
      case 'nuke':
        g.fillStyle(COLORS.RED, glow);
        g.fillRect(-8, -4, 16, 8);
        g.fillStyle(0xff6600, 0.9);
        g.fillRect(-5, -18, 10, 18);
        g.lineStyle(2, 0xff0000, 0.8);
        g.strokeCircle(0, 0, 14);
        break;
    }
    // Level badge
    if (this.level > 1) {
      g.fillStyle(COLORS.GREEN_LIGHT, 0.9);
      g.fillCircle(10, -10, 5);
    }
  }

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

  fire(target: Enemy, now: number, enemies: Enemy[]) {
    this.lastFired = now;
    this.shootFlash = 120;
    const cfg = TURRETS[this.type];

    switch (this.type) {
      case 'laser': {
        target.takeDamage(this.damage);
        const laserG = this.scene.add.graphics().setDepth(250);
        laserG.lineStyle(3, COLORS.GREEN, 1);
        laserG.lineBetween(this.x, this.y, target.x, target.y);
        laserG.lineStyle(1, COLORS.GREEN_LIGHT, 0.6);
        laserG.lineBetween(this.x, this.y, target.x, target.y);
        this.scene.tweens.add({ targets: laserG, alpha: 0, duration: 100, onComplete: () => laserG.destroy() });
        break;
      }

      case 'mortar': {
        const aoe = (cfg as { aoeRadius: number }).aoeRadius ?? 65;
        // Arc trajectory
        const startX = this.x, startY = this.y;
        const endX = target.x, endY = target.y;
        const shell = this.scene.add.graphics().setDepth(260);
        let t = 0;
        const interval = this.scene.time.addEvent({
          delay: 16, loop: true, callback: () => {
            t += 0.04;
            shell.clear();
            const px = Phaser.Math.Linear(startX, endX, t);
            const py = Phaser.Math.Linear(startY, endY, t) - Math.sin(t * Math.PI) * 80;
            shell.fillStyle(COLORS.ORANGE, 1); shell.fillCircle(px, py, 6);
            shell.x = 0; shell.y = 0;
            if (t >= 1) {
              interval.destroy(); shell.destroy();
              // AoE damage
              for (const e of enemies) {
                if (e.dead) continue;
                const dx = e.x - endX, dy = e.y - endY;
                if (Math.sqrt(dx * dx + dy * dy) <= aoe) e.takeDamage(this.damage);
              }
              // Explosion ring
              const ex = this.scene.add.graphics().setDepth(255);
              ex.lineStyle(3, COLORS.ORANGE, 1);
              ex.strokeCircle(endX, endY, 10);
              this.scene.tweens.add({ targets: ex, scaleX: aoe / 10, scaleY: aoe / 10, alpha: 0, duration: 350, onComplete: () => ex.destroy() });
            }
          }
        });
        break;
      }

      case 'tesla': {
        const targets: Enemy[] = [target];
        for (const e of enemies) {
          if (e === target || e.dead) continue;
          if (targets.length >= 3) break;
          const dx = e.x - target.x, dy = e.y - target.y;
          if (Math.sqrt(dx * dx + dy * dy) < 120) targets.push(e);
        }
        targets.forEach(t2 => t2.takeDamage(this.damage));
        // Draw arcs
        const arc = this.scene.add.graphics().setDepth(255);
        arc.lineStyle(2, COLORS.CYAN, 1);
        for (let i = 0; i < targets.length; i++) {
          const from = i === 0 ? { x: this.x, y: this.y } : targets[i - 1]!;
          arc.lineBetween(from.x, from.y, targets[i]!.x, targets[i]!.y);
        }
        this.scene.tweens.add({ targets: arc, alpha: 0, duration: 150, onComplete: () => arc.destroy() });
        break;
      }

      case 'freeze':
        target.takeDamage(this.damage);
        target.applyStatus('frozen', 2200);
        break;

      case 'nuke': {
        const aoeN = (cfg as { aoeRadius: number }).aoeRadius ?? 140;
        const mx = target.x, my = target.y;
        const missile = this.scene.add.graphics().setDepth(260);
        let nt = 0;
        const sx = this.x, sy = this.y;
        const intv = this.scene.time.addEvent({
          delay: 16, loop: true, callback: () => {
            nt += 0.025;
            missile.clear();
            const px = Phaser.Math.Linear(sx, mx, nt);
            const py = Phaser.Math.Linear(sy, my, nt) - Math.sin(nt * Math.PI) * 120;
            missile.fillStyle(COLORS.RED, 1); missile.fillCircle(px, py, 8);
            missile.fillStyle(COLORS.ORANGE, 0.7); missile.fillCircle(px, py + 8, 5);
            if (nt >= 1) {
              intv.destroy(); missile.destroy();
              for (const e of enemies) {
                if (e.dead) continue;
                const dx = e.x - mx, dy = e.y - my;
                if (Math.sqrt(dx * dx + dy * dy) <= aoeN) e.takeDamage(this.damage);
              }
              // Massive explosion
              const nex = this.scene.add.graphics().setDepth(255);
              this.scene.cameras.main.shake(300, 0.025);
              for (let ring = 1; ring <= 3; ring++) {
                this.scene.time.delayedCall(ring * 80, () => {
                  nex.clear();
                  nex.lineStyle(4 / ring, ring === 1 ? COLORS.RED : COLORS.ORANGE, 1);
                  nex.strokeCircle(mx, my, 10);
                  this.scene.tweens.add({ targets: nex, scaleX: aoeN / 10 * ring / 3, scaleY: aoeN / 10 * ring / 3, alpha: 0, duration: 400, onComplete: () => { if (ring === 3) nex.destroy(); } });
                });
              }
            }
          }
        });
        break;
      }
    }
  }

  disable(duration: number) {
    this.disabled = true;
    this.disableTimer = duration;
    this.scene.tweens.add({ targets: this.graphics, alpha: 0.4, duration: 200 });
  }

  update(now: number, delta: number, enemies: Enemy[]) {
    this.pulse += delta * 0.003;
    this.shootFlash = Math.max(0, this.shootFlash - delta);
    if (this.disabled) {
      this.disableTimer -= delta;
      if (this.disableTimer <= 0) {
        this.disabled = false;
        this.scene.tweens.add({ targets: this.graphics, alpha: 1, duration: 200 });
      }
    }
    if (this.canFire(now)) {
      const target = this.findTarget(enemies);
      if (target) this.fire(target, now, enemies);
    }
    this.draw();
  }
}


