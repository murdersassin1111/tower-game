import Phaser from 'phaser';
import { TOWER, COLORS, CSS_COLORS } from '../config';
import type { EconomyManager } from '../systems/EconomyManager';

export class Tower {
  scene: Phaser.Scene;
  x: number; y: number;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  armor: number;           // percentage 0-1
  shieldRegen: number;     // per second
  destroyed: boolean = false;

  private sprites: Phaser.GameObjects.Image[] = [];
  private shieldRing!: Phaser.GameObjects.Graphics;
  private shieldPulse: number = 0;
  private dmgFlash: number = 0;
  private economy?: EconomyManager;

  constructor(scene: Phaser.Scene, x: number, y: number, economy?: EconomyManager) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.economy = economy;

    // Use config constants
    this.maxHp = TOWER.MAX_HP;
    this.hp = TOWER.MAX_HP;
    this.maxShield = TOWER.SHIELD_MAX;
    this.shield = TOWER.SHIELD_MAX;
    this.armor = TOWER.BASE_ARMOR;          // 5% base
    this.shieldRegen = TOWER.SHIELD_REGEN;  // 20/s base

    this.buildSprites();
    this.shieldRing = scene.add.graphics().setDepth(380);
  }

  buildSprites() {
    const layers = [
      { key: 'tower-base',   dy: 48,  scale: 1.05 },
      { key: 'tower-mid',    dy: 0,   scale: 0.95 },
      { key: 'tower-top',    dy: -48, scale: 0.88 },
      { key: 'tower-cannon', dy: -94, scale: 0.75 },
    ];
    this.sprites = layers.map(l =>
      this.scene.add.image(this.x, this.y + l.dy, l.key)
        .setDepth(370).setScale(l.scale)
    );
  }

  /** Call after an upgrade is purchased to reapply stats */
  applyUpgrades() {
    if (!this.economy) return;

    // HP upgrade — add bonus HP without healing
    const newMaxHp = TOWER.MAX_HP + this.economy.getHpBonus();
    if (newMaxHp > this.maxHp) {
      const diff = newMaxHp - this.maxHp;
      this.maxHp = newMaxHp;
      this.hp = Math.min(this.hp + diff, this.maxHp); // partial heal on upgrade
    }

    // Shield upgrade
    const newMaxShield = TOWER.SHIELD_MAX + this.economy.getShieldBonus();
    if (newMaxShield > this.maxShield) {
      this.maxShield = newMaxShield;
      this.shield = Math.min(this.shield + 500, this.maxShield);
    }

    this.armor = TOWER.BASE_ARMOR + this.economy.getArmorBonus();
    this.shieldRegen = TOWER.SHIELD_REGEN + this.economy.getShieldRegenBonus();
  }

  /**
   * @param bypassShield  Hacker enemies ignore shield
   */
  takeDamage(amount: number, bypassShield: boolean = false): boolean {
    if (this.destroyed) return true;

    // Armor = % reduction
    const reduced = Math.max(1, Math.round(amount * (1 - this.armor)));

    let hpDmg = reduced;
    if (!bypassShield && this.shield > 0) {
      const shieldAbsorb = Math.min(this.shield, reduced);
      this.shield -= shieldAbsorb;
      hpDmg = reduced - shieldAbsorb;
      if (shieldAbsorb > 0) {
        try { this.scene.sound.play('shield', { volume: 0.28 }); } catch(_) {}
      }
    }

    if (hpDmg > 0) {
      this.hp = Math.max(0, this.hp - hpDmg);
    }

    this.dmgFlash = 220;
    this.scene.cameras.main.shake(150, 0.008);
    try { this.scene.sound.play('hit', { volume: 0.4 }); } catch(_) {}

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
    this.shieldPulse += delta * 0.002;
    this.dmgFlash = Math.max(0, this.dmgFlash - delta);

    // Shield regen (uses upgrade bonus)
    const regen = this.shieldRegen + (this.economy?.getShieldRegenBonus() ?? 0);
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + regen * (delta / 1000));
    }

    // HP auto-repair (slow)
    if (this.hp < this.maxHp && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + TOWER.REPAIR_RATE * (delta / 1000));
    }

    // Sprite tint
    const ratio = this.hp / this.maxHp;
    let tint = 0xffffff;
    if (this.dmgFlash > 0)    tint = 0xff8888;
    else if (ratio < 0.25)    tint = 0xff5555;
    else if (ratio < 0.5)     tint = 0xffbb66;
    this.sprites.forEach(s => s.setTint(tint));

    // Float
    const bob = Math.sin(this.shieldPulse) * 1.8;
    this.sprites.forEach((s, i) => {
      const baseY = this.y + [48, 0, -48, -94][i]!;
      s.setY(baseY + bob * (0.2 + i * 0.1));
    });

    // Shield ring
    this.shieldRing.clear();
    if (this.shield > 20) {
      const alpha = 0.12 + Math.sin(this.shieldPulse * 2) * 0.06 + (this.shield / this.maxShield) * 0.22;
      const col = ratio < 0.3 ? 0xff4444 : 0x00aaff;
      this.shieldRing.lineStyle(3, col, alpha);
      this.shieldRing.strokeCircle(this.x, this.y - 22, 74 + Math.sin(this.shieldPulse) * 3);
      this.shieldRing.lineStyle(1, 0x88ccff, alpha * 0.45);
      this.shieldRing.strokeCircle(this.x, this.y - 22, 84);
    }
  }
}
