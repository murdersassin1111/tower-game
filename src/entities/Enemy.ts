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
  cleanedUp: boolean = false;

  isEmp: boolean;
  bypassShield: boolean;

  pathPoints: { x: number; y: number }[] = [];
  pathIndex: number = 0;
  x: number = 0; y: number = 0;

  private g!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private glowG?: Phaser.GameObjects.Graphics;
  private pulse: number = 0;
  private flashTimer: number = 0;
  private facing: number = 0;
  readonly isBoss: boolean;

  // Sizing
  private readonly size: number;

  constructor(
    scene: Phaser.Scene, type: EnemyType,
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
    this.damage = cfg.damage * Math.min(waveMult, 4);
    this.reward = cfg.reward;
    this.x = startX; this.y = startY;
    this.isBoss = type === 'juggernaut' || type === 'swarmqueen';
    this.isEmp = type === 'emp';
    this.bypassShield = type === 'hacker';
    this.size = cfg.size;

    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 80;
    const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 30;
    this.pathPoints = [
      { x: startX, y: startY },
      { x: midX, y: midY },
      { x: targetX, y: targetY },
    ];

    this.g = scene.add.graphics().setDepth(200);
    this.hpBar = scene.add.graphics().setDepth(210);
    if (this.isBoss) {
      this.glowG = scene.add.graphics().setDepth(195);
    }
    this.draw();
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  draw() {
    if (this.cleanedUp) return;
    const g = this.g;
    g.clear();
    if (this.dead) return;

    const flash = this.flashTimer > 0;
    const s = this.size;
    const p = this.pulse;

    // Boss glow ring
    if (this.glowG) {
      this.glowG.clear();
      const ga = 0.12 + Math.sin(p * 2) * 0.06;
      const gcol = this.type === 'juggernaut' ? 0xff2200 : 0xaa00ff;
      this.glowG.lineStyle(s * 0.7, gcol, ga);
      this.glowG.strokeCircle(this.x, this.y, s * 1.6);
    }

    // Frozen tint overlay
    if (this.status === 'frozen') {
      g.fillStyle(0x88ccff, 0.28);
      g.fillCircle(this.x, this.y, s * 1.3);
    }

    switch (this.type) {
      case 'drone':     this.drawDrone(g, flash, p, s); break;
      case 'crawler':   this.drawCrawler(g, flash, p, s); break;
      case 'hacker':    this.drawHacker(g, flash, p, s); break;
      case 'juggernaut':this.drawJuggernaut(g, flash, p, s); break;
      case 'swarmqueen':this.drawSwarmQueen(g, flash, p, s); break;
      case 'emp':       this.drawEmp(g, flash, p, s); break;
    }
  }

  private drawDrone(g: Phaser.GameObjects.Graphics, flash: boolean, p: number, s: number) {
    const col = flash ? 0xffffff : COLORS.GREEN_LIGHT;
    const x = this.x, y = this.y;
    // Core diamond
    g.fillStyle(col, 0.9);
    g.fillPoints([{x,y:y-s},{x:x+s,y},{x,y:y+s},{x:x-s,y}], true);
    // Inner glow
    g.fillStyle(0xffffff, 0.4);
    const is = s * 0.4;
    g.fillPoints([{x,y:y-is},{x:x+is,y},{x,y:y+is},{x:x-is,y}], true);
    // Edge
    g.lineStyle(1.5, 0x4ade80, 0.85);
    g.strokePoints([{x,y:y-s},{x:x+s,y},{x,y:y+s},{x:x-s,y}], true);
  }

  private drawCrawler(g: Phaser.GameObjects.Graphics, flash: boolean, p: number, s: number) {
    const col = flash ? 0xffffff : 0x9aabb8;
    const x = this.x, y = this.y;
    const pts = hexPts(x, y, s);
    g.fillStyle(col, 0.85);
    g.fillPoints(pts, true);
    g.fillStyle(0x6b7f8c, 0.5);
    g.fillPoints(hexPts(x, y, s * 0.6), true);
    g.lineStyle(2, 0xb0c4ce, 0.8);
    g.strokePoints(pts, true);
  }

  private drawHacker(g: Phaser.GameObjects.Graphics, flash: boolean, p: number, s: number) {
    const col = flash ? 0xffffff : COLORS.CYAN;
    const x = this.x, y = this.y;
    // Pentagon
    const pts = polyPts(x, y, s, 5, -Math.PI / 2);
    g.fillStyle(col, 0.75);
    g.fillPoints(pts, true);
    // Inner hollow
    g.fillStyle(0x001a1a, 0.5);
    g.fillPoints(polyPts(x, y, s * 0.5, 5, -Math.PI / 2), true);
    g.lineStyle(2, 0x00ffff, 0.9);
    g.strokePoints(pts, true);
    // Pulse ring
    const ra = 0.15 + Math.sin(p * 3) * 0.12;
    g.lineStyle(1, 0x00ffff, ra);
    g.strokeCircle(x, y, s * 1.4);
  }

  private drawJuggernaut(g: Phaser.GameObjects.Graphics, flash: boolean, p: number, s: number) {
    const col = flash ? 0xffffff : 0xcc2200;
    const x = this.x, y = this.y;
    // Outer octagon
    const pts = polyPts(x, y, s, 8, 0);
    g.fillStyle(col, 0.9);
    g.fillPoints(pts, true);
    // Middle ring
    g.fillStyle(0x8b0000, 0.6);
    g.fillPoints(polyPts(x, y, s * 0.65, 8, 0), true);
    // Core
    g.fillStyle(0xff4400, 0.8 + Math.sin(p * 4) * 0.15);
    g.fillCircle(x, y, s * 0.32);
    g.lineStyle(2.5, 0xff4400, 0.9);
    g.strokePoints(pts, true);
    g.lineStyle(1.5, 0xff8866, 0.5);
    g.strokeCircle(x, y, s * 0.65 * 1.05);
  }

  private drawSwarmQueen(g: Phaser.GameObjects.Graphics, flash: boolean, p: number, s: number) {
    const col = flash ? 0xffffff : COLORS.ORANGE;
    const x = this.x, y = this.y;
    g.fillStyle(col, 0.85);
    g.fillCircle(x, y, s);
    g.fillStyle(0x331100, 0.4);
    g.fillCircle(x, y, s * 0.55);
    g.lineStyle(2, 0xff8800, 0.9);
    g.strokeCircle(x, y, s);
    // 6 orbiting drones
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + p;
      const ox = x + Math.cos(a) * (s * 1.5);
      const oy = y + Math.sin(a) * (s * 1.5);
      g.fillStyle(0xff9900, 0.7);
      g.fillCircle(ox, oy, 4);
    }
  }

  private drawEmp(g: Phaser.GameObjects.Graphics, flash: boolean, p: number, s: number) {
    const col = flash ? 0xffffff : 0xffff00;
    const x = this.x, y = this.y;
    // Triangle + lightning bolt feel
    const pts = polyPts(x, y, s, 3, -Math.PI / 2);
    g.fillStyle(col, 0.8 + Math.sin(p * 5) * 0.15);
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, 0.5);
    g.fillPoints(polyPts(x, y, s * 0.4, 3, -Math.PI / 2), true);
    g.lineStyle(2, 0xffff66, 1);
    g.strokePoints(pts, true);
    // Pulse rings
    const rr = 0.08 + Math.sin(p * 6) * 0.08;
    g.lineStyle(1, 0xffff00, rr * 2);
    g.strokeCircle(x, y, s * 1.6 + Math.sin(p * 6) * 4);
  }

  // ── Logic ─────────────────────────────────────────────────────────────────

  takeDamage(amount: number) {
    if (this.dead || this.cleanedUp) return;
    this.hp -= amount;
    this.flashTimer = 100;
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead || this.cleanedUp) return;
    this.dead = true;
    this.cleanupVisuals();

    const px = this.x, py = this.y;
    const col = this.isBoss ? 'particle-orange' : 'particle-green';
    const qty = this.isBoss ? 28 : 10;
    this.scene.add.particles(px, py, col, {
      speed: { min: 60, max: this.isBoss ? 250 : 170 },
      scale: { start: this.isBoss ? 1.2 : 0.8, end: 0 },
      lifespan: this.isBoss ? 800 : 450,
      quantity: qty, emitting: false,
    }).explode(qty, px, py);

    if (this.isBoss) this.scene.cameras.main.shake(220, 0.016);
    try { this.scene.sound.play('enemy-die', { volume: 0.28, detune: (Math.random()-0.5)*500 }); } catch(_) {}

    this.scene.events.emit('enemy-killed', { type: this.type, reward: this.reward, x: px, y: py });
  }

  cleanupVisuals() {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    this.g.destroy();
    this.hpBar.destroy();
    this.glowG?.destroy();
  }

  applyStatus(s: StatusEffect, duration: number) {
    this.status = s;
    this.statusTimer = duration;
    if (s === 'frozen') this.speed = this.baseSpeed * 0.38;
  }

  update(delta: number): boolean {
    if (this.dead || this.reached || this.cleanedUp) return false;

    this.pulse += delta * 0.004;

    if (this.flashTimer > 0) this.flashTimer -= delta;

    if (this.status !== 'none') {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.status = 'none';
        this.speed = this.baseSpeed;
      }
    }

    const target = this.pathPoints[this.pathIndex + 1];
    if (!target) { this.reached = true; return true; }

    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.speed * (delta / 1000);
    this.facing = Math.atan2(dy, dx);

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

    this.draw();

    // HP bar
    this.hpBar.clear();
    if (this.hp < this.maxHp) {
      const bw = this.size * 2.2, bh = 4;
      const bx = this.x - bw / 2, by = this.y - this.size - 10;
      this.hpBar.fillStyle(0x220000, 0.85); this.hpBar.fillRect(bx, by, bw, bh);
      const r = Math.max(0, this.hp / this.maxHp);
      const col = r > 0.55 ? 0x22c55e : r > 0.28 ? 0xffaa00 : 0xff3333;
      this.hpBar.fillStyle(col, 1); this.hpBar.fillRect(bx, by, bw * r, bh);
    }

    return false;
  }
}

// ── Geometry helpers ────────────────────────────────────────────────────────

function hexPts(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

function polyPts(cx: number, cy: number, r: number, sides: number, offset = 0) {
  return Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2 + offset;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}
