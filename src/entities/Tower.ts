import Phaser from 'phaser';
import { COLORS, TOWER, ISO } from '../config';
import { IsoMath } from '../utils/IsoMath';

export class Tower {
  scene: Phaser.Scene;
  cx: number; cy: number;
  hp: number; maxHp: number;
  armor: number;
  shieldHp: number; shieldMax: number; shieldRegen: number;
  repairRate: number;
  graphics!: Phaser.GameObjects.Graphics;
  shieldGraphics!: Phaser.GameObjects.Graphics;
  crackLevel: number = 0;
  destroyed: boolean = false;
  private shieldPulse: number = 0;
  private glowPulse: number = 0;

  constructor(scene: Phaser.Scene, cx: number, cy: number) {
    this.scene = scene;
    this.cx = cx; this.cy = cy;
    this.hp = TOWER.MAX_HP; this.maxHp = TOWER.MAX_HP;
    this.armor = TOWER.BASE_ARMOR;
    this.shieldHp = TOWER.SHIELD_MAX; this.shieldMax = TOWER.SHIELD_MAX;
    this.shieldRegen = TOWER.SHIELD_REGEN;
    this.repairRate = TOWER.REPAIR_RATE;
    this.graphics = scene.add.graphics().setDepth(100);
    this.shieldGraphics = scene.add.graphics().setDepth(101);
    this.draw();
  }

  draw() {
    const g = this.graphics;
    g.clear();
    const W = 64, H = 32, FH = 36;
    const hpRatio = this.hp / this.maxHp;
    const glow = this.glowPulse;

    for (let level = 0; level < TOWER.LEVELS; level++) {
      const ty = this.cy - level * (H + FH) + 60;
      const alphaTop = 0.9 - level * 0.06;
      const scale = 1 - level * 0.05;
      const w = W * scale, h = H * scale, fh = FH * scale;

      // Glow aura for top cube
      if (level === TOWER.LEVELS - 1) {
        g.fillStyle(COLORS.GREEN, 0.04 + Math.sin(glow) * 0.02);
        g.fillCircle(this.cx, ty - h, w * 1.4);
      }

      // Top face
      let topColor = COLORS.GREEN;
      if (hpRatio < 0.3) topColor = 0xff4444;
      else if (hpRatio < 0.6) topColor = 0xffaa00;
      g.fillStyle(topColor, alphaTop);
      g.fillPoints([
        { x: this.cx, y: ty - h },
        { x: this.cx + w, y: ty },
        { x: this.cx, y: ty + h },
        { x: this.cx - w, y: ty },
      ], true);

      // Left face
      g.fillStyle(COLORS.GREEN_DARK, alphaTop * 0.8);
      g.fillPoints([
        { x: this.cx - w, y: ty },
        { x: this.cx, y: ty + h },
        { x: this.cx, y: ty + h + fh },
        { x: this.cx - w, y: ty + fh },
      ], true);

      // Right face
      g.fillStyle(COLORS.GREEN_DARKER, alphaTop * 0.65);
      g.fillPoints([
        { x: this.cx, y: ty + h },
        { x: this.cx + w, y: ty },
        { x: this.cx + w, y: ty + fh },
        { x: this.cx, y: ty + h + fh },
      ], true);

      // Edges
      const edgeA = 0.35 + Math.sin(glow + level) * 0.08;
      g.lineStyle(1.5, COLORS.GREEN_LIGHT, edgeA);
      g.strokePoints([
        { x: this.cx, y: ty - h },
        { x: this.cx + w, y: ty },
        { x: this.cx, y: ty + h },
        { x: this.cx - w, y: ty },
      ], true);

      // Crack overlays
      if (this.crackLevel >= 1 && level < 2) {
        g.lineStyle(1, 0xff0000, 0.5);
        g.lineBetween(this.cx - w * 0.3, ty + h * 0.3, this.cx + w * 0.1, ty + h * 0.8);
        g.lineBetween(this.cx + w * 0.1, ty + h * 0.8, this.cx + w * 0.4, ty + h * 0.5);
      }
      if (this.crackLevel >= 2 && level < 3) {
        g.lineStyle(1, 0xff0000, 0.6);
        g.lineBetween(this.cx - w * 0.5, ty + h * 0.1, this.cx - w * 0.2, ty + h * 0.6);
        g.lineBetween(this.cx + w * 0.2, ty - h * 0.2, this.cx + w * 0.5, ty + h * 0.3);
      }
    }
  }

  drawShield() {
    const sg = this.shieldGraphics;
    sg.clear();
    if (this.shieldHp <= 0) return;
    const ratio = this.shieldHp / this.shieldMax;
    const pulse = Math.sin(this.shieldPulse) * 0.15 + 0.85;
    const r = 100 * pulse;
    sg.lineStyle(2, 0x00ffff, ratio * 0.7);
    sg.strokeCircle(this.cx, this.cy - 40, r);
    sg.lineStyle(1, 0x00ffff, ratio * 0.3);
    sg.strokeCircle(this.cx, this.cy - 40, r * 1.05);
  }

  takeDamage(amount: number, bypassShield = false): boolean {
    if (this.destroyed) return false;
    const reduced = amount * (1 - this.armor);
    if (!bypassShield && this.shieldHp > 0) {
      const shieldAbsorb = Math.min(this.shieldHp, reduced);
      this.shieldHp -= shieldAbsorb;
      const overflow = reduced - shieldAbsorb;
      if (overflow > 0) this.hp -= overflow;
      this.scene.events.emit('tower-damaged', { amount: reduced, currentHp: this.hp });
      // Shield pulse effect
      this.scene.cameras.main.shake(80, 0.005);
    } else {
      this.hp -= reduced;
      this.scene.events.emit('tower-damaged', { amount: reduced, currentHp: this.hp });
      this.scene.cameras.main.shake(120, 0.01);
    }
    this.hp = Math.max(0, this.hp);
    this.crackLevel = this.hp < this.maxHp * 0.3 ? 2 : this.hp < this.maxHp * 0.6 ? 1 : 0;
    if (this.hp <= 0) { this.destroyTower(); return true; }
    // Red flash
    this.scene.tweens.add({ targets: this.graphics, alpha: 0.5, duration: 80, yoyo: true, repeat: 1 });
    return false;
  }

  destroyTower() {
    this.destroyed = true;
    this.scene.cameras.main.shake(500, 0.04);
    // Collapse animation
    this.scene.tweens.add({
      targets: this.graphics,
      scaleY: 0, alpha: 0, duration: 1200, ease: 'Power2',
      onComplete: () => this.scene.events.emit('tower-destroyed', {
        wave: 0, cores: 0,
      }),
    });
  }

  getHpRatio() { return this.hp / this.maxHp; }
  getShieldRatio() { return this.shieldHp / this.shieldMax; }

  /** Returns positions for enemy path endpoint (base of tower) */
  getBasePositions(): { x: number; y: number }[] {
    return [
      { x: this.cx - 80,  y: this.cy + 100 },
      { x: this.cx + 80,  y: this.cy + 100 },
      { x: this.cx - 130, y: this.cy + 60  },
      { x: this.cx + 130, y: this.cy + 60  },
    ];
  }

  update(delta: number) {
    if (this.destroyed) return;
    this.glowPulse += delta * 0.001 * 2;
    this.shieldPulse += delta * 0.001 * 3;
    // Shield regen
    if (this.shieldHp < this.shieldMax) {
      this.shieldHp = Math.min(this.shieldMax, this.shieldHp + this.shieldRegen * delta / 1000);
    }
    // Auto repair
    if (this.hp < this.maxHp && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.repairRate * delta / 1000);
    }
    this.draw();
    this.drawShield();
  }
}
