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

  /** EMP enemies disable turrets instead of dealing HP damage */
  isEmp: boolean;
  /** Hacker enemies bypass tower shield */
  bypassShield: boolean;

  pathPoints: { x: number; y: number }[] = [];
  pathIndex: number = 0;
  x: number = 0; y: number = 0;

  sprite!: Phaser.GameObjects.Image;
  glowSprite?: Phaser.GameObjects.Image;
  hpBar!: Phaser.GameObjects.Graphics;
  private flashTimer: number = 0;
  private isBoss: boolean;

  constructor(
    scene: Phaser.Scene,
    type: EnemyType,
    startX: number, startY: number,
    targetX: number, targetY: number,
    waveMult: number = 1
  ) {
    this.scene = scene;
    this.type = type;
    const cfg = ENEMIES[type];
    this.hp = cfg.hp * waveMult;
    this.maxHp = this.hp;
    this.speed = cfg.speed;
    this.baseSpeed = cfg.speed;
    // Cap damage scaling so late waves don't one-shot
    this.damage = cfg.damage * Math.min(waveMult, 4);
    this.reward = cfg.reward;
    this.x = startX; this.y = startY;
    this.isBoss = type === 'juggernaut' || type === 'swarmqueen';
    this.isEmp = type === 'emp';
    this.bypassShield = type === 'hacker';

    // Curved path with slight randomness
    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 80;
    const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 30;
    this.pathPoints = [
      { x: startX, y: startY },
      { x: midX, y: midY },
      { x: targetX, y: targetY },
    ];

    const scale = this.isBoss ? 1.05 : type === 'crawler' ? 0.85 : 0.68;

    if (this.isBoss) {
      this.glowSprite = scene.add.image(startX, startY, `enemy-${type}`)
        .setDepth(195).setScale(scale * 1.45)
        .setTint(type === 'juggernaut' ? 0xff2200 : 0xaa00ff)
        .setAlpha(0.35)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    this.sprite = scene.add.image(startX, startY, `enemy-${type}`)
      .setDepth(200).setScale(scale);

    // Tint EMP/hacker distinctively
    if (type === 'emp')    this.sprite.setTint(0xffff00);
    if (type === 'hacker') this.sprite.setTint(0x00ffaa);

    this.hpBar = scene.add.graphics().setDepth(210);
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 110;
    this.sprite.setTint(0xffffff);
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    const px = this.x, py = this.y;
    this.scene.add.particles(px, py, 'particle-green', {
      speed: { min: 60, max: 190 }, scale: { start: 0.9, end: 0 },
      lifespan: 480, quantity: 10, emitting: false,
    }).explode(10, px, py);

    if (this.isBoss) {
      this.scene.add.particles(px, py, 'particle-orange', {
        speed: { min: 80, max: 280 }, scale: { start: 1.3, end: 0 },
        lifespan: 800, quantity: 25, emitting: false,
      }).explode(25, px, py);
      this.scene.cameras.main.shake(250, 0.018);
    }

    try { this.scene.sound.play('enemy-die', { volume: 0.28, detune: (Math.random()-0.5)*500 }); } catch(_) {}

    this.sprite.destroy();
    this.glowSprite?.destroy();
    this.hpBar.destroy();

    this.scene.events.emit('enemy-killed', { type: this.type, reward: this.reward, x: px, y: py });
  }

  applyStatus(s: StatusEffect, duration: number) {
    this.status = s;
    this.statusTimer = duration;
    if (s === 'frozen') {
      this.speed = this.baseSpeed * 0.38;
      this.sprite.setTint(0x88ccff);
    }
  }

  /**
   * Returns true if the enemy reached the tower.
   * Returns the bypassShield flag so tower can handle hacker logic.
   */
  update(delta: number): boolean {
    if (this.dead || this.reached) return false;

    // Flash recovery
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        if      (this.status === 'frozen') this.sprite.setTint(0x88ccff);
        else if (this.type === 'emp')      this.sprite.setTint(0xffff00);
        else if (this.type === 'hacker')   this.sprite.setTint(0x00ffaa);
        else                               this.sprite.clearTint();
      }
    }

    // Status tick
    if (this.status !== 'none') {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.status = 'none';
        this.speed = this.baseSpeed;
        if (this.flashTimer <= 0) {
          if      (this.type === 'emp')    this.sprite.setTint(0xffff00);
          else if (this.type === 'hacker') this.sprite.setTint(0x00ffaa);
          else                             this.sprite.clearTint();
        }
      }
    }

    // Move along path
    const target = this.pathPoints[this.pathIndex + 1];
    if (!target) { this.reached = true; return true; }

    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.speed * (delta / 1000);

    this.sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);

    if (dist <= step) {
      this.x = target.x; this.y = target.y;
      this.pathIndex++;
      if (this.pathIndex >= this.pathPoints.length - 1) {
        this.reached = true;
        return true;
      }
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    this.sprite.setPosition(this.x, this.y);
    if (this.glowSprite) this.glowSprite.setPosition(this.x, this.y);

    // HP bar (only when damaged)
    this.hpBar.clear();
    if (this.hp < this.maxHp) {
      const bw = 36, bh = 4, bx = this.x - bw / 2, by = this.y - 32;
      this.hpBar.fillStyle(0x220000, 1); this.hpBar.fillRect(bx, by, bw, bh);
      const r = Math.max(0, this.hp / this.maxHp);
      const col = r > 0.5 ? 0x22c55e : r > 0.25 ? 0xffaa00 : 0xff3333;
      this.hpBar.fillStyle(col, 1); this.hpBar.fillRect(bx, by, bw * r, bh);
    }

    return false;
  }
}
