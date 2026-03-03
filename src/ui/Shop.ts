import Phaser from 'phaser';
import { COLORS, CSS_COLORS, TURRETS, UPGRADES, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { TurretType, UpgradeKey } from '../types';
import type { EconomyManager } from '../systems/EconomyManager';

export class Shop {
  scene: Phaser.Scene;
  economy: EconomyManager;
  visible: boolean = false;
  onTurretPurchase?: (type: TurretType) => void;
  onUpgradeBought?: (key: UpgradeKey) => void;

  // Track every display object so we can show/hide cleanly
  private elements: Phaser.GameObjects.GameObject[] = [];
  // Refresh callbacks for upgrade cost/level displays
  private refreshCallbacks: (() => void)[] = [];

  constructor(scene: Phaser.Scene, economy: EconomyManager) {
    this.scene = scene;
    this.economy = economy;
    this.build();
    this.setVisible(false);
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.elements.push(obj);
    return obj;
  }

  build() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const panelH = H * 0.75;
    const panelY = H - panelH;
    const D = 750; // base depth

    // Dark overlay
    const overlay = this.track(this.scene.add.graphics().setDepth(D));
    (overlay as Phaser.GameObjects.Graphics).fillStyle(0x000000, 0.72);
    (overlay as Phaser.GameObjects.Graphics).fillRect(0, 0, W, H);
    // Intercept clicks on backdrop (close shop)
    (overlay as Phaser.GameObjects.Graphics).setInteractive(
      new Phaser.Geom.Rectangle(0, 0, W, panelY),
      Phaser.Geom.Rectangle.Contains
    );
    (overlay as Phaser.GameObjects.Graphics).on('pointerdown', () => this.setVisible(false));

    // Panel
    const panel = this.track(this.scene.add.graphics().setDepth(D + 1));
    (panel as Phaser.GameObjects.Graphics).fillStyle(0x060d08, 0.99);
    (panel as Phaser.GameObjects.Graphics).fillRoundedRect(0, panelY, W, panelH, { tl: 16, tr: 16, bl: 0, br: 0 });
    (panel as Phaser.GameObjects.Graphics).lineStyle(1.5, COLORS.GREEN, 0.45);
    (panel as Phaser.GameObjects.Graphics).strokeRoundedRect(0, panelY, W, panelH, { tl: 16, tr: 16, bl: 0, br: 0 });

    // Title & close
    this.track(this.scene.add.text(W / 2, panelY + 14, '⬡ UPGRADE SHOP', {
      fontFamily: 'monospace', fontSize: '15px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 8, fill: true },
    }).setOrigin(0.5, 0).setDepth(D + 2));

    const closeBtn = this.track(this.scene.add.text(W - 14, panelY + 14, '[X]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff4444',
    }).setOrigin(1, 0).setDepth(D + 2).setInteractive({ useHandCursor: true }));
    (closeBtn as Phaser.GameObjects.Text).on('pointerdown', () => this.setVisible(false));

    // ── TURRETS ──────────────────────────────────────────────
    const turY = panelY + 46;
    this.track(this.scene.add.text(14, turY, 'DEPLOY TURRET', {
      fontFamily: 'monospace', fontSize: '10px', color: '#4ade80',
      letterSpacing: 2,
    }).setDepth(D + 2));

    const turretTypes: TurretType[] = ['laser', 'mortar', 'tesla', 'freeze', 'nuke'];
    const cardW = Math.floor((W - 20 - (turretTypes.length - 1) * 4) / turretTypes.length);

    turretTypes.forEach((type, i) => {
      const cfg = TURRETS[type];
      const cx = 10 + i * (cardW + 4);
      const cy = turY + 16;
      const cH = 90;

      const card = this.track(this.scene.add.graphics().setDepth(D + 2));
      (card as Phaser.GameObjects.Graphics).fillStyle(0x0b1a10, 1);
      (card as Phaser.GameObjects.Graphics).fillRoundedRect(cx, cy, cardW, cH, 7);
      (card as Phaser.GameObjects.Graphics).lineStyle(1, COLORS.GREEN_DARK, 0.7);
      (card as Phaser.GameObjects.Graphics).strokeRoundedRect(cx, cy, cardW, cH, 7);

      this.track(this.scene.add.text(cx + cardW / 2, cy + 7, cfg.label, {
        fontFamily: 'monospace', fontSize: '9px', color: CSS_COLORS.GREEN,
      }).setOrigin(0.5, 0).setDepth(D + 3));

      this.track(this.scene.add.text(cx + cardW / 2, cy + 22, cfg.description, {
        fontFamily: 'monospace', fontSize: '7px', color: '#86efac',
        wordWrap: { width: cardW - 6 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(D + 3));

      const buyBtn = this.track(this.scene.add.text(
        cx + cardW / 2, cy + cH - 10,
        `⬡ ${cfg.cost}`,
        {
          fontFamily: 'monospace', fontSize: '10px', color: CSS_COLORS.GREEN,
          backgroundColor: '#14532d', padding: { x: 6, y: 3 },
        }
      ).setOrigin(0.5, 1).setDepth(D + 3).setInteractive({ useHandCursor: true }));

      (buyBtn as Phaser.GameObjects.Text).on('pointerover', () =>
        (buyBtn as Phaser.GameObjects.Text).setBackgroundColor('#1a6b3d'));
      (buyBtn as Phaser.GameObjects.Text).on('pointerout', () =>
        (buyBtn as Phaser.GameObjects.Text).setBackgroundColor('#14532d'));
      (buyBtn as Phaser.GameObjects.Text).on('pointerdown', () => {
        if (this.economy.spend(cfg.cost)) {
          this.onTurretPurchase?.(type);
          try { this.scene.sound.play('buy', { volume: 0.45 }); } catch(_) {}
          this.scene.tweens.add({ targets: buyBtn, scaleX: 1.18, scaleY: 1.18, duration: 70, yoyo: true });
        } else {
          (buyBtn as Phaser.GameObjects.Text).setColor('#ff3333');
          try { this.scene.sound.play('click', { volume: 0.2, detune: -400 }); } catch(_) {}
          this.scene.time.delayedCall(280, () =>
            (buyBtn as Phaser.GameObjects.Text).setColor(CSS_COLORS.GREEN));
        }
      });
    });

    // ── UPGRADES ──────────────────────────────────────────────
    const upgY = turY + 118;
    this.track(this.scene.add.text(14, upgY, 'UPGRADES', {
      fontFamily: 'monospace', fontSize: '10px', color: '#4ade80',
      letterSpacing: 2,
    }).setDepth(D + 2));

    const upgKeys: UpgradeKey[] = [
      'turret_damage', 'turret_range', 'turret_firerate',
      'tower_hp', 'tower_armor', 'shield_cap',
      'shield_regen', 'core_mult', 'idle_rate',
    ];
    const upgLabels: Record<UpgradeKey, string> = {
      turret_damage:   '⚡ DMG',
      turret_range:    '📡 RANGE',
      turret_firerate: '⏱ RATE',
      tower_hp:        '❤️ HP',
      tower_armor:     '🛡 ARMOR',
      shield_cap:      '🔵 SHIELD',
      shield_regen:    '♻ S.REGEN',
      core_mult:       '⬡ CORE×',
      idle_rate:       '💤 IDLE',
    };
    const upgDesc: Record<UpgradeKey, string> = {
      turret_damage:   '+25% dmg',
      turret_range:    '+20 range',
      turret_firerate: '+15% rate',
      tower_hp:        '+2000 HP',
      tower_armor:     '+5% armor',
      shield_cap:      '+1000 shld',
      shield_regen:    '+10/s regen',
      core_mult:       '+50% earn',
      idle_rate:       '+50% idle',
    };

    const cols = 3;
    const rH = 60;
    const ugW = Math.floor((W - 20 - (cols - 1) * 5) / cols);

    upgKeys.forEach((key, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ux = 10 + col * (ugW + 5);
      const uy = upgY + 16 + row * (rH + 5);

      const card = this.track(this.scene.add.graphics().setDepth(D + 2));
      (card as Phaser.GameObjects.Graphics).fillStyle(0x0b1a10, 1);
      (card as Phaser.GameObjects.Graphics).fillRoundedRect(ux, uy, ugW, rH, 6);
      (card as Phaser.GameObjects.Graphics).lineStyle(1, COLORS.GREEN_DARK, 0.55);
      (card as Phaser.GameObjects.Graphics).strokeRoundedRect(ux, uy, ugW, rH, 6);

      const levelDots = this.track(this.scene.add.text(ux + ugW - 6, uy + 6, '', {
        fontFamily: 'monospace', fontSize: '8px', color: '#22c55e',
      }).setOrigin(1, 0).setDepth(D + 3));

      this.track(this.scene.add.text(ux + ugW / 2, uy + 8, upgLabels[key], {
        fontFamily: 'monospace', fontSize: '10px', color: CSS_COLORS.GREEN,
      }).setOrigin(0.5, 0).setDepth(D + 3));

      this.track(this.scene.add.text(ux + ugW / 2, uy + 24, upgDesc[key], {
        fontFamily: 'monospace', fontSize: '7px', color: '#4ade80',
      }).setOrigin(0.5, 0).setDepth(D + 3));

      const costTxt = this.track(this.scene.add.text(
        ux + ugW / 2, uy + rH - 8, '',
        {
          fontFamily: 'monospace', fontSize: '9px', color: CSS_COLORS.GREEN,
          backgroundColor: '#14532d', padding: { x: 5, y: 2 },
        }
      ).setOrigin(0.5, 1).setDepth(D + 3).setInteractive({ useHandCursor: true }));

      const refresh = () => {
        const level = this.economy.getUpgradeLevel(key);
        const maxLevel = UPGRADES[key].costs.length;
        const maxed = level >= maxLevel;
        // Level dots
        const dots = Array.from({ length: maxLevel }, (_, j) => j < level ? '●' : '○').join('');
        (levelDots as Phaser.GameObjects.Text).setText(dots);
        if (maxed) {
          (costTxt as Phaser.GameObjects.Text).setText('MAX').setColor('#ffdd00').setBackgroundColor('#2a1f00');
        } else {
          (costTxt as Phaser.GameObjects.Text)
            .setText(`⬡ ${this.economy.getUpgradeCost(key)}`)
            .setColor(CSS_COLORS.GREEN).setBackgroundColor('#14532d');
        }
      };
      refresh();
      this.refreshCallbacks.push(refresh);

      (costTxt as Phaser.GameObjects.Text).on('pointerover', () => {
        if (this.economy.getUpgradeLevel(key) < UPGRADES[key].costs.length)
          (costTxt as Phaser.GameObjects.Text).setBackgroundColor('#1a6b3d');
      });
      (costTxt as Phaser.GameObjects.Text).on('pointerout', () =>
        (costTxt as Phaser.GameObjects.Text).setBackgroundColor('#14532d'));
      (costTxt as Phaser.GameObjects.Text).on('pointerdown', () => {
        if (this.economy.buyUpgrade(key)) {
          refresh();
          this.onUpgradeBought?.(key);
          try { this.scene.sound.play('buy', { volume: 0.4 }); } catch(_) {}
          this.scene.tweens.add({ targets: card, alpha: 0.5, duration: 80, yoyo: true });
          // Flash green border
          (card as Phaser.GameObjects.Graphics).lineStyle(2, COLORS.GREEN, 1);
          (card as Phaser.GameObjects.Graphics).strokeRoundedRect(ux, uy, ugW, rH, 6);
        }
      });
    });
  }

  /** Refresh all upgrade displays (call after cores change) */
  refreshUpgrades() {
    this.refreshCallbacks.forEach(fn => fn());
  }

  setVisible(v: boolean) {
    this.visible = v;
    for (const el of this.elements) {
      (el as Phaser.GameObjects.GameObject & { setVisible(b: boolean): void })
        .setVisible?.(v);
    }
  }

  toggle() {
    this.refreshUpgrades();
    this.setVisible(!this.visible);
  }
}
