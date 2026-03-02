import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { EconomyManager } from '../systems/EconomyManager';

export class HUD {
  scene: Phaser.Scene;
  economy: EconomyManager;
  private topBar!: Phaser.GameObjects.Graphics;
  private bottomBar!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private waveText!: Phaser.GameObjects.Text;
  private coresText!: Phaser.GameObjects.Text;
  private shardsText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private speedBtn1!: Phaser.GameObjects.Text;
  private speedBtn2!: Phaser.GameObjects.Text;
  private speedBtn4!: Phaser.GameObjects.Text;
  private shopBtn!: Phaser.GameObjects.Text;
  currentSpeed: 1 | 2 | 4 = 1;
  onSpeedChange?: (s: 1|2|4) => void;
  onShopOpen?: () => void;

  constructor(scene: Phaser.Scene, economy: EconomyManager) {
    this.scene = scene;
    this.economy = economy;
    this.build();
  }

  build() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const depth = 800;
    const barH = 52;
    const botH = 72;

    // Top bar bg
    this.topBar = this.scene.add.graphics().setDepth(depth);
    this.topBar.fillStyle(0x0a0f0d, 0.92);
    this.topBar.fillRect(0, 0, W, barH);
    this.topBar.lineStyle(1, COLORS.GREEN, 0.4);
    this.topBar.lineBetween(0, barH, W, barH);

    // HP bar
    this.hpBar = this.scene.add.graphics().setDepth(depth + 1);

    // Bottom bar bg
    this.bottomBar = this.scene.add.graphics().setDepth(depth);
    this.bottomBar.fillStyle(0x0a0f0d, 0.94);
    this.bottomBar.fillRect(0, H - botH, W, botH);
    this.bottomBar.lineStyle(1, COLORS.GREEN, 0.4);
    this.bottomBar.lineBetween(0, H - botH, W, H - botH);

    // Wave text
    this.waveText = this.scene.add.text(W / 2, 15, 'WAVE 1', {
      fontFamily: 'monospace', fontSize: '14px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 8, fill: true },
    }).setOrigin(0.5, 0).setDepth(depth + 2);

    // HP text
    this.hpText = this.scene.add.text(W / 2, 30, 'HP 100%', {
      fontFamily: 'monospace', fontSize: '10px', color: CSS_COLORS.MUTED,
    }).setOrigin(0.5, 0).setDepth(depth + 2);

    // Cores
    this.coresText = this.scene.add.text(12, H - botH + 12, '⬡ 0', {
      fontFamily: 'monospace', fontSize: '20px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 6, fill: true },
    }).setDepth(depth + 2);

    // Shards
    this.shardsText = this.scene.add.text(12, H - botH + 40, '◆ 0 shards', {
      fontFamily: 'monospace', fontSize: '11px', color: '#aabbcc',
    }).setDepth(depth + 2);

    // Shop button
    this.shopBtn = this.scene.add.text(W / 2, H - botH / 2, '[ SHOP ]', {
      fontFamily: 'monospace', fontSize: '18px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 10, fill: true },
    }).setOrigin(0.5).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    this.shopBtn.on('pointerdown', () => this.onShopOpen?.());
    this.shopBtn.on('pointerover', () => this.shopBtn.setScale(1.08));
    this.shopBtn.on('pointerout', () => this.shopBtn.setScale(1));

    // Speed buttons
    const makeSpeed = (label: string, speed: 1|2|4, bx: number) => {
      const btn = this.scene.add.text(bx, H - 20, label, {
        fontFamily: 'monospace', fontSize: '13px', color: '#6b7280',
      }).setOrigin(0.5, 1).setDepth(depth + 2).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.currentSpeed = speed;
        this.onSpeedChange?.(speed);
        this.updateSpeedBtns();
      });
      return btn;
    };
    this.speedBtn1 = makeSpeed('×1', 1, W - 90);
    this.speedBtn2 = makeSpeed('×2', 2, W - 60);
    this.speedBtn4 = makeSpeed('×4', 4, W - 28);
    this.updateSpeedBtns();
  }

  updateSpeedBtns() {
    const active = CSS_COLORS.GREEN;
    const inactive = '#6b7280';
    this.speedBtn1.setColor(this.currentSpeed === 1 ? active : inactive);
    this.speedBtn2.setColor(this.currentSpeed === 2 ? active : inactive);
    this.speedBtn4.setColor(this.currentSpeed === 4 ? active : inactive);
  }

  update(wave: number, hpRatio: number, shieldRatio: number) {
    this.waveText.setText(`WAVE ${wave}`);
    const pct = Math.round(hpRatio * 100);
    this.hpText.setText(`HP ${pct}%`);
    this.coresText.setText(`⬡ ${Math.floor(this.economy.cores)}`);
    this.shardsText.setText(`◆ ${this.economy.shards} shards`);
    this.drawHpBar(hpRatio, shieldRatio);
  }

  drawHpBar(hpRatio: number, shieldRatio: number) {
    const g = this.hpBar; g.clear();
    const W = GAME_WIDTH, y = 48, h = 6, pad = 12;
    const barW = W - pad * 2;
    g.fillStyle(0x1a2e1f, 1); g.fillRect(pad, y, barW, h);
    // HP
    const hpColor = hpRatio > 0.6 ? COLORS.GREEN : hpRatio > 0.3 ? 0xffaa00 : 0xff3333;
    g.fillStyle(hpColor, 1); g.fillRect(pad, y, barW * hpRatio, h);
    // Shield on top
    if (shieldRatio > 0) {
      g.fillStyle(0x00ccff, 0.6); g.fillRect(pad, y, barW * shieldRatio, h);
    }
  }

  showFloatingText(x: number, y: number, text: string, color: string = CSS_COLORS.GREEN) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '14px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(850);
    this.scene.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Power1',
      onComplete: () => t.destroy(),
    });
  }

  showIdleSummary(cores: number, waves: number) {
    if (cores <= 0 && waves <= 0) return;
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const bg = this.scene.add.graphics().setDepth(1000);
    bg.fillStyle(0x0a0f0d, 0.95);
    bg.fillRoundedRect(W/2 - 160, H/2 - 100, 320, 200, 12);
    bg.lineStyle(2, COLORS.GREEN, 0.6);
    bg.strokeRoundedRect(W/2 - 160, H/2 - 100, 320, 200, 12);

    const title = this.scene.add.text(W/2, H/2 - 80, 'WHILE YOU WERE AWAY', {
      fontFamily: 'monospace', fontSize: '13px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(1001);

    const body = this.scene.add.text(W/2, H/2 - 20,
      `Waves survived: ${waves}\n+${cores} CORES earned\nShields held.`, {
        fontFamily: 'monospace', fontSize: '14px', color: CSS_COLORS.WHITE,
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setDepth(1001);

    const ok = this.scene.add.text(W/2, H/2 + 70, '[ CONTINUE ]', {
      fontFamily: 'monospace', fontSize: '16px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(1001).setInteractive({ useHandCursor: true });
    ok.on('pointerdown', () => { bg.destroy(); title.destroy(); body.destroy(); ok.destroy(); });
  }
}
