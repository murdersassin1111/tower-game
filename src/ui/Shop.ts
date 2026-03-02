import Phaser from 'phaser';
import { COLORS, CSS_COLORS, TURRETS, UPGRADES, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { TurretType, UpgradeKey } from '../types';
import type { EconomyManager } from '../systems/EconomyManager';

export class Shop {
  scene: Phaser.Scene;
  economy: EconomyManager;
  visible: boolean = false;
  onTurretPurchase?: (type: TurretType) => void;
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, economy: EconomyManager) {
    this.scene = scene; this.economy = economy;
    this.build();
    this.setVisible(false);
  }

  build() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const panelH = H * 0.72;
    const panelY = H - panelH;
    const depth = 750;

    this.bg = this.scene.add.graphics().setDepth(depth);
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(0, 0, W, H);
    this.bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);

    const panel = this.scene.add.graphics().setDepth(depth + 1);
    panel.fillStyle(0x0a0f0d, 0.98);
    panel.fillRoundedRect(0, panelY, W, panelH, 16);
    panel.lineStyle(1, COLORS.GREEN, 0.5);
    panel.strokeRoundedRect(0, panelY, W, panelH, 16);

    // Title
    const title = this.scene.add.text(W / 2, panelY + 16, '// UPGRADE SHOP', {
      fontFamily: 'monospace', fontSize: '16px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5, 0).setDepth(depth + 2);

    // Close button
    const closeBtn = this.scene.add.text(W - 16, panelY + 16, '[X]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff3333',
    }).setOrigin(1, 0).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.setVisible(false));

    // Turrets section
    const secY = panelY + 52;
    this.scene.add.text(14, secY, 'TURRETS', {
      fontFamily: 'monospace', fontSize: '12px', color: '#86efac',
    }).setDepth(depth + 2);

    const turretTypes: TurretType[] = ['laser', 'mortar', 'tesla', 'freeze', 'nuke'];
    const cardW = (W - 28) / turretTypes.length - 4;
    turretTypes.forEach((type, i) => {
      const cfg = TURRETS[type];
      const cx = 14 + i * (cardW + 4);
      const cy = secY + 18;
      const cardH = 85;

      const card = this.scene.add.graphics().setDepth(depth + 2);
      card.fillStyle(0x0e1710, 1);
      card.fillRoundedRect(cx, cy, cardW, cardH, 6);
      card.lineStyle(1, COLORS.GREEN_DARK, 0.6);
      card.strokeRoundedRect(cx, cy, cardW, cardH, 6);

      this.scene.add.text(cx + cardW/2, cy + 8, cfg.label, {
        fontFamily: 'monospace', fontSize: '10px', color: CSS_COLORS.GREEN,
      }).setOrigin(0.5, 0).setDepth(depth + 3);

      this.scene.add.text(cx + cardW/2, cy + 26, cfg.description, {
        fontFamily: 'monospace', fontSize: '7px', color: '#86efac',
        wordWrap: { width: cardW - 4 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(depth + 3);

      const buyBtn = this.scene.add.text(cx + cardW/2, cy + cardH - 14, `⬡ ${cfg.cost}`, {
        fontFamily: 'monospace', fontSize: '10px', color: CSS_COLORS.GREEN,
        backgroundColor: '#14532d', padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 1).setDepth(depth + 3).setInteractive({ useHandCursor: true });

      buyBtn.on('pointerdown', () => {
        if (this.economy.spend(cfg.cost)) {
          this.onTurretPurchase?.(type);
          this.scene.tweens.add({ targets: buyBtn, scaleX: 1.2, scaleY: 1.2, duration: 80, yoyo: true });
        } else {
          buyBtn.setColor('#ff3333');
          this.scene.time.delayedCall(300, () => buyBtn.setColor(CSS_COLORS.GREEN));
        }
      });
    });

    // Upgrades section
    const upgY = secY + 115;
    this.scene.add.text(14, upgY, 'UPGRADES', {
      fontFamily: 'monospace', fontSize: '12px', color: '#86efac',
    }).setDepth(depth + 2);

    const upgKeys: UpgradeKey[] = ['turret_damage', 'turret_range', 'turret_firerate', 'tower_hp', 'tower_armor', 'shield_cap', 'shield_regen', 'core_mult', 'idle_rate'];
    const upgLabels: Record<UpgradeKey, string> = {
      turret_damage: 'DMG',
      turret_range: 'RANGE',
      turret_firerate: 'RATE',
      tower_hp: 'HP',
      tower_armor: 'ARMOR',
      shield_cap: 'SHIELD',
      shield_regen: 'S.REGEN',
      core_mult: 'CORE×',
      idle_rate: 'IDLE',
    };

    const cols = 3;
    const rowH = 52;
    const ugW = (W - 28) / cols - 4;

    upgKeys.forEach((key, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ux = 14 + col * (ugW + 4);
      const uy = upgY + 18 + row * (rowH + 4);

      const ub = this.scene.add.graphics().setDepth(depth + 2);
      ub.fillStyle(0x0e1710, 1);
      ub.fillRoundedRect(ux, uy, ugW, rowH, 5);
      ub.lineStyle(1, COLORS.GREEN_DARK, 0.5);
      ub.strokeRoundedRect(ux, uy, ugW, rowH, 5);

      const levelTxt = this.scene.add.text(ux + 6, uy + 6, '', {
        fontFamily: 'monospace', fontSize: '9px', color: '#86efac',
      }).setDepth(depth + 3);

      const nameTxt = this.scene.add.text(ux + ugW/2, uy + 8, upgLabels[key], {
        fontFamily: 'monospace', fontSize: '11px', color: CSS_COLORS.GREEN,
      }).setOrigin(0.5, 0).setDepth(depth + 3);

      const costTxt = this.scene.add.text(ux + ugW/2, uy + rowH - 8, '', {
        fontFamily: 'monospace', fontSize: '9px', color: CSS_COLORS.GREEN,
        backgroundColor: '#14532d', padding: { x: 4, y: 1 },
      }).setOrigin(0.5, 1).setDepth(depth + 3).setInteractive({ useHandCursor: true });

      const refresh = () => {
        const level = this.economy.getUpgradeLevel(key);
        const maxed = level >= UPGRADES[key].costs.length;
        levelTxt.setText(`Lv ${level}`);
        if (maxed) {
          costTxt.setText('MAX').setColor('#ffdd00');
        } else {
          costTxt.setText(`⬡ ${this.economy.getUpgradeCost(key)}`).setColor(CSS_COLORS.GREEN);
        }
      };
      refresh();

      costTxt.on('pointerdown', () => {
        if (this.economy.buyUpgrade(key)) {
          refresh();
          this.scene.tweens.add({ targets: ub, alpha: 0.5, duration: 80, yoyo: true });
        }
      });
    });

    // Collect all display objects into arrays (we'll manage visibility via alpha)
    this.container = this.scene.add.container(0, 0, [this.bg, panel, title, closeBtn]);
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.scene.children.each(child => {
      const d = (child as Phaser.GameObjects.Graphics).depth;
      if (d >= 750 && d <= 760) {
        (child as Phaser.GameObjects.GameObject & { setVisible: (b: boolean) => void }).setVisible?.(v);
      }
    });
  }

  toggle() { this.setVisible(!this.visible); }
}
