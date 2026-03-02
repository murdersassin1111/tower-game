import Phaser from 'phaser';
import { COLORS, ENEMIES } from '../config';
import type { EnemyType, StatusEffect } from '../types';

export class Enemy {
  scene: Phaser.Scene;
  type: EnemyType;
  hp: number; maxHp: number;
  speed: number; baseSpeed: number;
  damage: number; reward: number;
  status: StatusEffect = 'none';
  statusTimer: number = 0;
  dead: boolean = false;
  reached: boolean = false;

  // Path: from spawn point toward tower base
  pathPoints: { x: number; y: number }[] = [];
  pathIndex: number = 0;
  x: number = 0; y: number = 0;

  graphics!: Phaser.GameObjects.Graphics;
  private pulse: number = 0;
  private size: number;
  private color: number;
  private flashTimer: number = 0;

  constructor(scene: Phaser.Scene, type: EnemyType, startX: number, startY: number, targetX: number, targetY: number, waveMult: number = 1) {
    this.scene = scene;
    this.type = type;
    const cfg = ENEMIES[type];
    this.hp = cfg.hp * waveMult;
    this.maxHp = this.hp;
    this.speed = cfg.speed;
    this.baseSpeed = cfg.speed;
    this.damage = cfg.damage * waveMult;
    this.reward = cfg.reward;
    this.size = cfg.size;
    this.color = cfg.color;
    this.x = startX; this.y = startY;

    // Build a simple curved path
    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 60;
    const midY = (startY + targetY) / 2;
    this.pathPoints = [
      { x: startX, y: startY },
      { x: midX, y: midY },
      { x: targetX, y: targetY },
    ];

    this.graphics = scene.add.graphics().setDepth(200);
    this.draw();
  }

  draw() {
    const g = this.graphics;
    g.clear();
    if (this.dead) return;
    g.x = this.x; g.y = this.y;

    const s = this.size;
    const hpRatio = this.hp / this.maxHp;
    const p = this.pulse;
    const flash = this.flashTimer > 0;
    const col = flash ? 0xffffff : this.color;
    const alpha = this.status === 'frozen' ? 0.7 : 1;

    g.fillStyle(col, alpha);

    switch (this.type) {
      case 'drone': {
        // Diamond
        g.fillPoints([{ x: 0, y: -s }, { x: s, y: 0 }, { x: 0, y: s }, { x: -s, y: 0 }], true);
        g.lineStyle(1, COLORS.GREEN_LIGHT, 0.6);
        g.strokePoints([{ x: 0, y: -s }, { x: s, y: 0 }, { x: 0, y: s }, { x: -s, y: 0 }], true);
        break;
      }
      case 'crawler': {
        // Wide hexagon
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          pts.push({ x: Math.cos(a) * s * 1.4, y: Math.sin(a) * s });
        }
        g.fillPoints(pts, true);
        g.lineStyle(2, COLORS.SILVER, 0.8);
        g.strokePoints(pts, true);
        break;
      }
      case 'hacker': {
        // Angular shape (cross)
        g.fillRect(-s * 0.4, -s, s * 0.8, s * 2);
        g.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
        g.lineStyle(1, COLORS.CYAN, 0.7);
        g.strokeRect(-s, -s, s * 2, s * 2);
        break;
      }
      case 'juggernaut': {
        // Massive cube silhouette
        const bs = s + Math.sin(p) * 3;
        g.fillStyle(COLORS.BOSS_RED, 1);
        g.fillRect(-bs, -bs, bs * 2, bs * 2);
        g.lineStyle(3, 0xff6666, 0.9);
        g.strokeRect(-bs, -bs, bs * 2, bs * 2);
        // Inner detail
        g.lineStyle(1, 0xff0000, 0.4);
        g.lineBetween(-bs, 0, bs, 0);
        g.lineBetween(0, -bs, 0, bs);
        break;
      }
      case 'swarmqueen': {
        // Spiky orb
        const r = s + Math.sin(p * 2) * 4;
        g.fillCircle(0, 0, r);
        g.lineStyle(2, COLORS.ORANGE, 0.8);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r + 8), Math.sin(a) * (r + 8));
        }
        break;
      }
      case 'emp': {
        // Ring shape
        g.lineStyle(4, COLORS.YELLOW, 0.9);
        g.strokeCircle(0, 0, s);
        g.lineStyle(2, COLORS.YELLOW, 0.4);
        g.strokeCircle(0, 0, s * 0.6);
        break;
      }
    }

    // HP bar (mini)
    const barW = s * 2.4;
    const barH = 3;
    const barY = -s - 8;
    g.fillStyle(0x333333, 0.8);
    g.fillRect(-barW / 2, barY, barW, barH);
    g.fillStyle(hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xffaa00 : 0xff3333, 0.9);
    g.fillRect(-barW / 2, barY, barW * hpRatio, barH);

    // Status indicator
    if (this.status === 'frozen') {
      g.lineStyle(2, 0x00aaff, 0.8);
      g.strokeCircle(0, 0, s + 4);
    }
  }

  takeDamage(amount: number, bypassArmor: boolean = false): boolean {
    if (this.dead) return false;
    this.hp -= amount;
    this.flashTimer = 80;
    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  applyStatus(effect: StatusEffect, duration: number) {
    this.status = effect;
    this.statusTimer = duration;
    if (effect === 'frozen') this.speed = this.baseSpeed * 0.4;
  }

  die() {
    this.dead = true;
    // Death explosion effect
    const g = this.graphics;
    this.scene.tweens.add({
      targets: g, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 250,
      ease: 'Power2', onComplete: () => g.destroy(),
    });
    this.scene.events.emit('enemy-killed', { type: this.type, reward: this.reward, x: this.x, y: this.y });
  }

  moveTo(targetX: number, targetY: number, delta: number): boolean {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spd = this.speed * delta / 1000;
    if (dist <= spd) {
      this.x = targetX; this.y = targetY;
      return true;
    }
    this.x += (dx / dist) * spd;
    this.y += (dy / dist) * spd;
    return false;
  }

  update(delta: number): boolean {
    if (this.dead || this.reached) return false;
    this.pulse += delta * 0.003;
    this.flashTimer = Math.max(0, this.flashTimer - delta);

    // Status timer
    if (this.status !== 'none') {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.status = 'none';
        this.speed = this.baseSpeed;
      }
    }

    // Move along path
    if (this.pathIndex < this.pathPoints.length) {
      const target = this.pathPoints[this.pathIndex]!;
      const arrived = this.moveTo(target.x, target.y, delta);
      if (arrived) this.pathIndex++;
      if (this.pathIndex >= this.pathPoints.length) {
        this.reached = true;
        this.graphics.destroy();
        return true; // reached tower
      }
    }

    this.draw();
    return false;
  }
}
