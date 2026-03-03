import Phaser from 'phaser';
import { ENEMIES } from '../config';
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

  pathPoints: { x: number; y: number }[] = [];
  pathIndex: number = 0;
  x: number = 0; y: number = 0;

  sprite!: Phaser.GameObjects.Image;
  glowSprite?: Phaser.GameObjects.Image;
  hpBar!: Phaser.GameObjects.Graphics;
  private flashTimer: number = 0;
  private isBoss: boolean;

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
    this.x = startX; this.y = startY;
    this.isBoss = type === 'juggernaut' || type === 'swarmqueen';

    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 60;
    const midY = (startY + targetY) / 2;
    this.pathPoints = [
      { x: startX, y: startY },
      { x: midX, y: midY },
      { x: targetX, y: targetY },
    ];

    const scale = this.isBoss ? 1.0 : (type === 'crawler' ? 0.85 : 0.7);

    // Glow for bosses
    if (this.isBoss) {
      this.glowSprite = scene.add.image(startX, startY, `enemy-${type}`)
        .setDepth(195).setScale(scale * 1.4)
        .setTint(type === 'juggernaut' ? 0xff2200 : 0x9900ff)
        .setAlpha(0.35).setBlendMode('ADD' as unknown as Phaser.BlendModes);
    }

    this.sprite = scene.add.image(startX, startY, `enemy-${type}`)
      .setDepth(200).setScale(scale);

    this.hpBar = scene.add.graphics().setDepth(210);
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 120;
    this.sprite.setTint(0xffffff);
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    // Particles
    this.scene.add.particles(this.x, this.y, 'particle-green', {
      speed: { min: 60, max: 180 }, scale: { start: 0.9, end: 0 },
      lifespan: 500, quantity: 10, emitting: false,
    }).explode(10, this.x, this.y);
    if (this.isBoss) {
      this.scene.add.particles(this.x, this.y, 'particle-orange', {
        speed: { min: 80, max: 250 }, scale: { start: 1.2, end: 0 },
        lifespan: 800, quantity: 20, emitting: false,
      }).explode(20, this.x, this.y);
    }
    try { this.scene.sound.play('enemy-die', { volume: 0.3, detune: (Math.random() - 0.5) * 400 }); } catch(_) {}
    this.sprite.destroy();
    this.glowSprite?.destroy();
    this.hpBar.destroy();
    this.scene.events.emit('enemy-killed', { type: this.type, reward: this.reward, x: this.x, y: this.y });
  }

  applyStatus(s: StatusEffect, duration: number) {
    this.status = s;
    this.statusTimer = duration;
    if (s === 'frozen') {
      this.speed = this.baseSpeed * 0.4;
      this.sprite.setTint(0x88ccff);
    }
  }

  update(delta: number): boolean {
    if (this.dead || this.reached) return false;

    // Flash recovery
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        if (this.status === 'frozen') {
          this.sprite.setTint(0x88ccff);
        } else {
          this.sprite.clearTint();
        }
      }
    }

    // Status
    if (this.status !== 'none') {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.status = 'none';
        this.speed = this.baseSpeed;
        if (this.flashTimer <= 0) this.sprite.clearTint();
      }
    }

    // Move along path
    const target = this.pathPoints[this.pathIndex + 1];
    if (!target) { this.reached = true; return true; }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.speed * (delta / 1000);

    // Rotate sprite toward movement direction
    this.sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

    if (dist <= step) {
      this.x = target.x; this.y = target.y;
      this.pathIndex++;
      if (this.pathIndex >= this.pathPoints.length - 1) {
        this.reached = true; return true;
      }
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    this.sprite.setPosition(this.x, this.y);
    if (this.glowSprite) this.glowSprite.setPosition(this.x, this.y);

    // HP bar (only show when damaged)
    this.hpBar.clear();
    if (this.hp < this.maxHp) {
      const bw = 36, bh = 4, bx = this.x - bw / 2, by = this.y - 28;
      this.hpBar.fillStyle(0x330000, 1); this.hpBar.fillRect(bx, by, bw, bh);
      const ratio = Math.max(0, this.hp / this.maxHp);
      const col = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xffaa00 : 0xff3333;
      this.hpBar.fillStyle(col, 1); this.hpBar.fillRect(bx, by, bw * ratio, bh);
    }

    return false;
  }
}
