import Phaser from 'phaser';
import { COLORS, CSS_COLORS } from '../config';
import type { EconomyManager } from '../systems/EconomyManager';

export class Tower {
  scene: Phaser.Scene;
  x: number; y: number;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  armor: number;
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
    this.maxHp = 500; this.hp = 500;
    this.maxShield = 200; this.shield = 200;
    this.armor = 5;
    this.buildSprites();
    this.shieldRing = scene.add.graphics().setDepth(380);
  }

  buildSprites() {
    const layers = [
      { key: 'tower-base', dy: 45, scale: 1.05 },
      { key: 'tower-mid',  dy: 0,  scale: 0.95 },
      { key: 'tower-top',  dy: -45, scale: 0.88 },
      { key: 'tower-cannon', dy: -90, scale: 0.75 },
    ];
    this.sprites = layers.map(l =>
      this.scene.add.image(this.x, this.y + l.dy, l.key)
        .setDepth(370).setScale(l.scale)
    );
  }

  takeDamage(amount: number): boolean {
    if (this.destroyed) return true;
    const reduced = Math.max(1, amount - this.armor);

    if (this.shield > 0) {
      const shieldDmg = Math.min(this.shield, reduced);
      this.shield -= shieldDmg;
      try { this.scene.sound.play('shield', { volume: 0.3 }); } catch(_) {}
      const rem = reduced - shieldDmg;
      if (rem > 0) this.hp = Math.max(0, this.hp - rem);
    } else {
      this.hp = Math.max(0, this.hp - reduced);
    }

    this.dmgFlash = 200;
    this.scene.cameras.main.shake(180, 0.01);
    try { this.scene.sound.play('hit', { volume: 0.45 }); } catch(_) {}

    this.scene.events.emit('tower-damaged', { amount: reduced, currentHp: this.hp });
    if (this.hp <= 0) {
      this.destroyed = true;
      this.scene.events.emit('tower-destroyed');
    }
    return this.destroyed;
  }

  getHpRatio() { return this.hp / this.maxHp; }
  getShieldRatio() { return this.shield / this.maxShield; }

  update(delta: number) {
    this.shieldPulse += delta * 0.002;
    this.dmgFlash = Math.max(0, this.dmgFlash - delta);

    // Shield regen
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + delta * 0.04);
    }

    // Tower tint based on HP
    const ratio = this.hp / this.maxHp;
    let tint = 0xffffff;
    if (this.dmgFlash > 0) {
      tint = 0xff8888;
    } else if (ratio < 0.3) {
      tint = Phaser.Display.Color.ValueToColor(0xff6666).color;
    } else if (ratio < 0.6) {
      tint = 0xffcc88;
    }
    this.sprites.forEach(s => s.setTint(tint));

    // Subtle float animation
    const bob = Math.sin(this.shieldPulse) * 1.5;
    this.sprites.forEach((s, i) => {
      const baseY = this.y + [45, 0, -45, -90][i]!;
      s.setY(baseY + bob * (0.3 + i * 0.1));
    });

    // Shield ring
    this.shieldRing.clear();
    if (this.shield > 10) {
      const a = 0.15 + Math.sin(this.shieldPulse * 2) * 0.08;
      const shieldColor = ratio < 0.3 ? 0xff4444 : 0x00aaff;
      this.shieldRing.lineStyle(3, shieldColor, a + (this.shield / this.maxShield) * 0.25);
      this.shieldRing.strokeCircle(this.x, this.y - 20, 70 + Math.sin(this.shieldPulse) * 3);
      this.shieldRing.lineStyle(1, 0x88ccff, a * 0.5);
      this.shieldRing.strokeCircle(this.x, this.y - 20, 80);
    }
  }
}
