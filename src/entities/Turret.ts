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

  sprite!: Phaser.GameObjects.Image;
  baseSprite!: Phaser.GameObjects.Image;
  rangeCircle!: Phaser.GameObjects.Graphics;
  private pulse: number = 0;

  constructor(scene: Phaser.Scene, type: TurretType, x: number, y: number) {
    this.scene = scene;
    this.type = type;
    this.x = x; this.y = y;
    const cfg = TURRETS[type];
    this.damage = cfg.damage;
    this.range = cfg.range;
    this.fireRate = cfg.fireRate;

    // Small circular base plate
    this.baseSprite = scene.add.image(x, y + 6, 'tower-base')
      .setDepth(295).setScale(0.28).setTint(0x1a3a2a).setAlpha(0.8);

    this.sprite = scene.add.image(x, y, `turret-${type}`)
      .setDepth(300).setScale(0.55);

    this.rangeCircle = scene.add.graphics().setDepth(50).setVisible(false);
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
    const cfg = TURRETS[this.type];

    // Rotate turret gun toward target
    const dx = target.x - this.x, dy = target.y - this.y;
    this.sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

    switch (this.type) {
      case 'laser': {
        target.takeDamage(this.damage);
        try { this.scene.sound.play('laser', { volume: 0.3, detune: (Math.random() - 0.5) * 200 }); } catch(_) {}
        const laserG = this.scene.add.graphics().setDepth(250);
        laserG.lineStyle(3, COLORS.GREEN, 1);
        laserG.lineBetween(this.x, this.y, target.x, target.y);
        laserG.lineStyle(1, 0xaaffaa, 0.7);
        laserG.lineBetween(this.x, this.y, target.x, target.y);
        this.scene.tweens.add({ targets: laserG, alpha: 0, duration: 100, onComplete: () => laserG.destroy() });
        break;
      }

      case 'mortar': {
        const aoe = (cfg as { aoeRadius: number }).aoeRadius ?? 65;
        try { this.scene.sound.play('mortar', { volume: 0.4 }); } catch(_) {}
        const sx = this.x, sy = this.y, ex = target.x, ey = target.y;
        const shell = this.scene.add.graphics().setDepth(260);
        let t = 0;
        const iv = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
          t += 0.04;
          shell.clear();
          const px = Phaser.Math.Linear(sx, ex, t);
          const py = Phaser.Math.Linear(sy, ey, t) - Math.sin(t * Math.PI) * 80;
          shell.fillStyle(0xff8800, 1); shell.fillCircle(px, py, 6);
          if (t >= 1) {
            iv.destroy(); shell.destroy();
            for (const e of enemies) {
              if (e.dead) continue;
              const ddx = e.x - ex, ddy = e.y - ey;
              if (Math.sqrt(ddx*ddx+ddy*ddy) <= aoe) e.takeDamage(this.damage);
            }
            try { this.scene.sound.play('explosion', { volume: 0.5 }); } catch(_) {}
            this.scene.add.particles(ex, ey, 'particle-orange', {
              speed:{min:60,max:200}, scale:{start:1,end:0}, lifespan:500, quantity:15, emitting:false,
            }).explode(15, ex, ey);
            const ring = this.scene.add.graphics().setDepth(255);
            ring.lineStyle(3, 0xff6600, 1); ring.strokeCircle(ex, ey, 10);
            this.scene.tweens.add({ targets: ring, scaleX: aoe/10, scaleY: aoe/10, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
          }
        }});
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
        try { this.scene.sound.play('laser', { volume: 0.4, detune: -600 }); } catch(_) {}
        const arc = this.scene.add.graphics().setDepth(255);
        for (let i = 0; i < chain.length; i++) {
          const from = i === 0 ? { x: this.x, y: this.y } : chain[i-1]!;
          arc.lineStyle(2, 0x00ffff, 1); arc.lineBetween(from.x, from.y, chain[i]!.x, chain[i]!.y);
        }
        this.scene.tweens.add({ targets: arc, alpha: 0, duration: 150, onComplete: () => arc.destroy() });
        break;
      }

      case 'freeze': {
        target.takeDamage(this.damage);
        target.applyStatus('frozen', 2200);
        try { this.scene.sound.play('shield', { volume: 0.3, detune: 400 }); } catch(_) {}
        this.scene.add.particles(target.x, target.y, 'particle-cyan', {
          speed:{min:30,max:80}, scale:{start:0.7,end:0}, lifespan:400, quantity:6, emitting:false,
        }).explode(6, target.x, target.y);
        break;
      }

      case 'nuke': {
        const aoeN = (cfg as { aoeRadius: number }).aoeRadius ?? 140;
        try { this.scene.sound.play('nuke-launch', { volume: 0.5 }); } catch(_) {}
        const mx = target.x, my = target.y;
        const missile = this.scene.add.graphics().setDepth(260);
        let nt = 0;
        const nsx = this.x, nsy = this.y;
        const niv = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
          nt += 0.025;
          missile.clear();
          const px = Phaser.Math.Linear(nsx, mx, nt);
          const py = Phaser.Math.Linear(nsy, my, nt) - Math.sin(nt * Math.PI) * 120;
          missile.fillStyle(0xff3333, 1); missile.fillCircle(px, py, 9);
          missile.fillStyle(0xff8800, 0.8); missile.fillCircle(px, py + 10, 6);
          if (nt >= 1) {
            niv.destroy(); missile.destroy();
            for (const e of enemies) {
              if (e.dead) continue;
              const ddx = e.x - mx, ddy = e.y - my;
              if (Math.sqrt(ddx*ddx+ddy*ddy) <= aoeN) e.takeDamage(this.damage);
            }
            try { this.scene.sound.play('nuke-explode', { volume: 0.7 }); } catch(_) {}
            this.scene.cameras.main.shake(350, 0.025);
            this.scene.add.particles(mx, my, 'particle-orange', {
              speed:{min:100,max:350}, scale:{start:1.5,end:0}, lifespan:800, quantity:30, emitting:false,
            }).explode(30, mx, my);
            this.scene.add.particles(mx, my, 'particle-red', {
              speed:{min:60,max:200}, scale:{start:1,end:0}, lifespan:600, quantity:20, emitting:false,
            }).explode(20, mx, my);
            const ex = this.scene.add.graphics().setDepth(255);
            ex.lineStyle(4, 0xff3300, 1); ex.strokeCircle(mx, my, 10);
            this.scene.tweens.add({ targets: ex, scaleX: aoeN/10, scaleY: aoeN/10, alpha: 0, duration: 500, onComplete: () => ex.destroy() });
          }
        }});
        break;
      }
    }
  }

  disable(duration: number) {
    this.disabled = true;
    this.disableTimer = duration;
    this.sprite.setTint(0x555555).setAlpha(0.6);
  }

  update(now: number, delta: number, enemies: Enemy[]) {
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
      if (target) this.fire(target, now, enemies);
    }
  }
}
