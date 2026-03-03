import Phaser from 'phaser';
import { TOWER, COLORS } from '../config';
import type { EconomyManager } from '../systems/EconomyManager';

export class Tower {
  scene: Phaser.Scene;
  x: number; y: number;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  armor: number;
  shieldRegen: number;
  destroyed: boolean = false;

  private g!: Phaser.GameObjects.Graphics;
  private shieldG!: Phaser.GameObjects.Graphics;
  private pulse: number = 0;
  private dmgFlash: number = 0;
  private economy?: EconomyManager;

  constructor(scene: Phaser.Scene, x: number, y: number, economy?: EconomyManager) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.economy = economy;

    this.maxHp = TOWER.MAX_HP;
    this.hp = TOWER.MAX_HP;
    this.maxShield = TOWER.SHIELD_MAX;
    this.shield = TOWER.SHIELD_MAX;
    this.armor = TOWER.BASE_ARMOR;
    this.shieldRegen = TOWER.SHIELD_REGEN;

    this.g = scene.add.graphics().setDepth(370);
    this.shieldG = scene.add.graphics().setDepth(375);
  }

  applyUpgrades() {
    if (!this.economy) return;
    const newMaxHp = TOWER.MAX_HP + this.economy.getHpBonus();
    if (newMaxHp > this.maxHp) {
      const diff = newMaxHp - this.maxHp;
      this.maxHp = newMaxHp;
      this.hp = Math.min(this.hp + diff, this.maxHp);
    }
    const newMaxShield = TOWER.SHIELD_MAX + this.economy.getShieldBonus();
    if (newMaxShield > this.maxShield) {
      this.maxShield = newMaxShield;
      this.shield = Math.min(this.shield + 400, this.maxShield);
    }
    this.armor = TOWER.BASE_ARMOR + this.economy.getArmorBonus();
    this.shieldRegen = TOWER.SHIELD_REGEN + this.economy.getShieldRegenBonus();
  }

  takeDamage(amount: number, bypassShield = false): boolean {
    if (this.destroyed) return true;
    const reduced = Math.max(1, Math.round(amount * (1 - this.armor)));
    let hpDmg = reduced;

    if (!bypassShield && this.shield > 0) {
      const abs = Math.min(this.shield, reduced);
      this.shield -= abs;
      hpDmg = reduced - abs;
      if (abs > 0) { try { this.scene.sound.play('shield', { volume: 0.26 }); } catch(_){} }
    }
    if (hpDmg > 0) this.hp = Math.max(0, this.hp - hpDmg);

    this.dmgFlash = 230;
    this.scene.cameras.main.shake(140, 0.007);
    try { this.scene.sound.play('hit', { volume: 0.38 }); } catch(_) {}
    this.scene.events.emit('tower-damaged', { amount: reduced, currentHp: this.hp });

    if (this.hp <= 0) {
      this.destroyed = true;
      this.scene.events.emit('tower-destroyed');
    }
    return this.destroyed;
  }

  getHpRatio()     { return this.hp / this.maxHp; }
  getShieldRatio() { return this.shield / this.maxShield; }

  update(delta: number) {
    this.pulse += delta * 0.0018;
    this.dmgFlash = Math.max(0, this.dmgFlash - delta);

    // Shield regen
    const regen = this.shieldRegen + (this.economy?.getShieldRegenBonus() ?? 0);
    if (this.shield < this.maxShield)
      this.shield = Math.min(this.maxShield, this.shield + regen * (delta / 1000));

    // Slow HP repair
    if (this.hp < this.maxHp && this.hp > 0)
      this.hp = Math.min(this.maxHp, this.hp + TOWER.REPAIR_RATE * (delta / 1000));

    this.drawTower();
    this.drawShield();
  }

  private drawTower() {
    const g = this.g;
    g.clear();

    const cx = this.x, cy = this.y;
    const hpRatio = this.hp / this.maxHp;
    const flash = this.dmgFlash > 0;
    const bob = Math.sin(this.pulse) * 2;

    // Color based on HP
    const topColor  = flash ? 0xffffff : hpRatio > 0.5 ? COLORS.GREEN        : hpRatio > 0.25 ? 0xffaa44 : 0xff3333;
    const leftColor = flash ? 0xdddddd : hpRatio > 0.5 ? COLORS.GREEN_DARKER : hpRatio > 0.25 ? 0x884400 : 0x881100;
    const rightColor= flash ? 0xeeeeee : hpRatio > 0.5 ? COLORS.GREEN_DARK   : hpRatio > 0.25 ? 0xaa5500 : 0xaa1100;
    const edgeColor = flash ? 0xffffff : hpRatio > 0.5 ? COLORS.GREEN_LIGHT  : hpRatio > 0.25 ? 0xffcc66 : 0xff6666;

    const levels = 5;
    for (let lv = 0; lv < levels; lv++) {
      const scale = 1 - lv * 0.12;
      const tileW = 70 * scale;
      const tileH = 35 * scale;
      const faceH = 30 * scale;
      const ly = cy - lv * (tileH + faceH) + bob;

      // Damage cracks on low HP (draw subtle lines on lower faces)
      const crackAlpha = hpRatio < 0.4 ? (0.4 - hpRatio) * 0.8 : 0;

      // Top face
      const topAlpha = 0.88 - lv * 0.04;
      g.fillStyle(topColor, topAlpha);
      g.fillPoints([
        { x: cx,          y: ly - tileH },
        { x: cx + tileW,  y: ly },
        { x: cx,          y: ly + tileH },
        { x: cx - tileW,  y: ly },
      ], true);

      // Highlight on top face
      g.fillStyle(0xffffff, 0.06 + Math.sin(this.pulse + lv) * 0.03);
      g.fillPoints([
        { x: cx,          y: ly - tileH },
        { x: cx + tileW * 0.5, y: ly - tileH * 0.5 },
        { x: cx,          y: ly },
        { x: cx - tileW * 0.5, y: ly - tileH * 0.5 },
      ], true);

      // Left face
      g.fillStyle(leftColor, topAlpha - 0.08);
      g.fillPoints([
        { x: cx - tileW,  y: ly },
        { x: cx,          y: ly + tileH },
        { x: cx,          y: ly + tileH + faceH },
        { x: cx - tileW,  y: ly + faceH },
      ], true);

      // Right face
      g.fillStyle(rightColor, topAlpha - 0.04);
      g.fillPoints([
        { x: cx,          y: ly + tileH },
        { x: cx + tileW,  y: ly },
        { x: cx + tileW,  y: ly + faceH },
        { x: cx,          y: ly + tileH + faceH },
      ], true);

      // Damage cracks
      if (crackAlpha > 0) {
        g.lineStyle(1, 0x000000, crackAlpha);
        for (let c = 0; c < 3; c++) {
          const seed = (lv * 17 + c * 31) % 100;
          const cx2 = cx - tileW * 0.6 + (seed / 100) * tileW;
          const cy2 = ly + tileH + (seed % 7) * (faceH / 7);
          g.lineBetween(cx2, cy2, cx2 + (seed % 10 - 5) * 3, cy2 + (seed % 5 + 2) * 4);
        }
      }

      // Glow edges
      const edgeAlpha = 0.5 - lv * 0.06 + Math.sin(this.pulse * 2 + lv) * 0.06;
      g.lineStyle(1.5, edgeColor, edgeAlpha);
      g.strokePoints([
        { x: cx,          y: ly - tileH },
        { x: cx + tileW,  y: ly },
        { x: cx,          y: ly + tileH },
        { x: cx - tileW,  y: ly },
      ], true);
      g.lineStyle(1, edgeColor, edgeAlpha * 0.6);
      g.lineBetween(cx - tileW, ly,          cx - tileW, ly + faceH);
      g.lineBetween(cx + tileW, ly,          cx + tileW, ly + faceH);
      g.lineBetween(cx,          ly + tileH, cx,          ly + tileH + faceH);
      g.lineBetween(cx - tileW,  ly + faceH, cx,          ly + tileH + faceH);
      g.lineBetween(cx + tileW,  ly + faceH, cx,          ly + tileH + faceH);
    }

    // Top antenna glow
    const topLevel = levels - 1;
    const topScale = 1 - topLevel * 0.12;
    const antennaY = cy - topLevel * (35 * topScale + 30 * topScale) - 35 * topScale + bob;
    const glowA = 0.35 + Math.sin(this.pulse * 3) * 0.2;
    g.fillStyle(topColor, glowA);
    g.fillCircle(cx, antennaY, 8 + Math.sin(this.pulse * 3) * 2);
    g.fillStyle(0xffffff, glowA * 0.6);
    g.fillCircle(cx, antennaY, 4);
  }

  private drawShield() {
    const g = this.shieldG;
    g.clear();
    if (this.shield < 15) return;

    const cx = this.x, cy = this.y;
    const ratio = this.shield / this.maxShield;
    const hp = this.hp / this.maxHp;
    const col = hp < 0.3 ? 0xff4444 : 0x00aaff;
    const a = 0.1 + Math.sin(this.pulse * 2.2) * 0.05 + ratio * 0.22;

    g.lineStyle(3, col, a);
    g.strokeEllipse(cx, cy - 55, 160, 240);
    g.lineStyle(1, 0x88ccff, a * 0.4);
    g.strokeEllipse(cx, cy - 55, 175, 260);

    // Hex pattern on shield at full strength
    if (ratio > 0.7) {
      const hexA = (ratio - 0.7) * 0.12;
      g.lineStyle(0.5, col, hexA);
      for (let i = 0; i < 8; i++) {
        const a2 = (i / 8) * Math.PI * 2 + this.pulse * 0.3;
        const hx = cx + Math.cos(a2) * 72;
        const hy = (cy - 55) + Math.sin(a2) * 112;
        for (let j = 0; j < 6; j++) {
          const a3 = (j / 6) * Math.PI * 2;
          const nx = hx + Math.cos(a3) * 14;
          const ny = hy + Math.sin(a3) * 14;
          g.lineBetween(hx, hy, nx, ny);
        }
      }
    }
  }
}
