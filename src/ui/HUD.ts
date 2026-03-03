import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { EconomyManager } from '../systems/EconomyManager';
import type { AudioManager } from '../systems/AudioManager';

export class HUD {
  scene: Phaser.Scene;
  economy: EconomyManager;
  audio?: AudioManager;
  private hpBar!: Phaser.GameObjects.Graphics;
  private waveText!: Phaser.GameObjects.Text;
  private coresText!: Phaser.GameObjects.Text;
  private shardsText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private speedBtn1!: Phaser.GameObjects.Text;
  private speedBtn2!: Phaser.GameObjects.Text;
  private speedBtn4!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  currentSpeed: 1 | 2 | 4 = 1;
  onSpeedChange?: (s: 1|2|4) => void;
  onShopOpen?: () => void;

  constructor(scene: Phaser.Scene, economy: EconomyManager, audio?: AudioManager) {
    this.scene = scene;
    this.economy = economy;
    this.audio = audio;
    this.build();
  }

  build() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const depth = 800;
    const barH = 56;
    const botH = 72;

    // Top bar
    const topBar = this.scene.add.graphics().setDepth(depth);
    topBar.fillStyle(0x000000, 0.82);
    topBar.fillRect(0, 0, W, barH);
    topBar.lineStyle(1, COLORS.GREEN, 0.3);
    topBar.lineBetween(0, barH, W, barH);

    // HP bar
    this.hpBar = this.scene.add.graphics().setDepth(depth + 1);

    // Bottom bar
    const botBar = this.scene.add.graphics().setDepth(depth);
    botBar.fillStyle(0x000000, 0.88);
    botBar.fillRect(0, H - botH, W, botH);
    botBar.lineStyle(1, COLORS.GREEN, 0.3);
    botBar.lineBetween(0, H - botH, W, H - botH);

    this.waveText = this.scene.add.text(W / 2, 10, 'WAVE 1', {
      fontFamily: 'monospace', fontSize: '15px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 10, fill: true },
    }).setOrigin(0.5, 0).setDepth(depth + 2);

    this.hpText = this.scene.add.text(W / 2, 30, '', {
      fontFamily: 'monospace', fontSize: '10px', color: CSS_COLORS.MUTED,
    }).setOrigin(0.5, 0).setDepth(depth + 2);

    this.coresText = this.scene.add.text(12, H - botH + 10, '⬡ 0', {
      fontFamily: 'monospace', fontSize: '22px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 8, fill: true },
    }).setDepth(depth + 2);

    this.shardsText = this.scene.add.text(12, H - botH + 40, '◆ 0 shards', {
      fontFamily: 'monospace', fontSize: '11px', color: '#99aacc',
    }).setDepth(depth + 2);

    // Shop button
    const shopBtn = this.scene.add.text(W / 2, H - botH / 2, '[ UPGRADES ]', {
      fontFamily: 'monospace', fontSize: '17px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 12, fill: true },
    }).setOrigin(0.5).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    shopBtn.on('pointerdown', () => { this.onShopOpen?.(); try { this.scene.sound.play('click', { volume: 0.2 }); } catch(_) {} });
    shopBtn.on('pointerover', () => shopBtn.setScale(1.07));
    shopBtn.on('pointerout', () => shopBtn.setScale(1));

    const makeSpeed = (label: string, speed: 1|2|4, bx: number) => {
      const btn = this.scene.add.text(bx, H - 20, label, {
        fontFamily: 'monospace', fontSize: '13px', color: '#6b7280',
      }).setOrigin(0.5, 1).setDepth(depth + 2).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.currentSpeed = speed;
        this.onSpeedChange?.(speed);
        this.updateSpeedBtns();
        try { this.scene.sound.play('click', { volume: 0.15 }); } catch(_) {}
      });
      return btn;
    };
    this.speedBtn1 = makeSpeed('×1', 1, W - 90);
    this.speedBtn2 = makeSpeed('×2', 2, W - 58);
    this.speedBtn4 = makeSpeed('×4', 4, W - 26);
    this.updateSpeedBtns();

    // Mute button
    this.muteBtn = this.scene.add.text(W - 130, H - 20, '🔊', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6b7280',
    }).setOrigin(0.5, 1).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      const muted = this.audio?.toggleMute();
      this.muteBtn.setText(muted ? '🔇' : '🔊');
    });
  }

  updateSpeedBtns() {
    const a = CSS_COLORS.GREEN, i = '#6b7280';
    this.speedBtn1.setColor(this.currentSpeed === 1 ? a : i);
    this.speedBtn2.setColor(this.currentSpeed === 2 ? a : i);
    this.speedBtn4.setColor(this.currentSpeed === 4 ? a : i);
  }

  update(wave: number, hpRatio: number, shieldRatio: number) {
    this.waveText.setText(`WAVE ${wave}`);
    this.hpText.setText(`HP ${Math.round(hpRatio * 100)}%  SHIELD ${Math.round(shieldRatio * 100)}%`);
    this.coresText.setText(`⬡ ${Math.floor(this.economy.cores)}`);
    this.shardsText.setText(`◆ ${this.economy.shards} shards`);
    this.drawHpBar(hpRatio, shieldRatio);
  }

  drawHpBar(hpRatio: number, shieldRatio: number) {
    const g = this.hpBar; g.clear();
    const W = GAME_WIDTH, y = 50, h = 5, pad = 10;
    const bw = W - pad * 2;
    g.fillStyle(0x111111, 1); g.fillRect(pad, y, bw, h);
    const hc = hpRatio > 0.6 ? COLORS.GREEN : hpRatio > 0.3 ? 0xffaa00 : 0xff3333;
    g.fillStyle(hc, 1); g.fillRect(pad, y, bw * hpRatio, h);
    if (shieldRatio > 0) {
      g.fillStyle(0x00aaff, 0.55); g.fillRect(pad, y, bw * shieldRatio, h);
    }
  }

  showFloatingText(x: number, y: number, text: string, color: string = CSS_COLORS.GREEN) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '14px', color,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(850);
    this.scene.tweens.add({
      targets: t, y: y - 55, alpha: 0, duration: 950, ease: 'Power1',
      onComplete: () => t.destroy(),
    });
  }

  showIdleSummary(cores: number, waves: number) {
    if (cores <= 0 && waves <= 0) return;
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const bg = this.scene.add.graphics().setDepth(1000);
    bg.fillStyle(0x0a0f0d, 0.96);
    bg.fillRoundedRect(W/2-160, H/2-100, 320, 200, 12);
    bg.lineStyle(2, COLORS.GREEN, 0.6);
    bg.strokeRoundedRect(W/2-160, H/2-100, 320, 200, 12);
    const title = this.scene.add.text(W/2, H/2-82, 'WHILE YOU WERE AWAY', {
      fontFamily: 'monospace', fontSize: '12px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(1001);
    const body = this.scene.add.text(W/2, H/2-20,
      `Waves survived: ${waves}\n+${cores} Cores earned\nShields held.`, {
        fontFamily: 'monospace', fontSize: '14px', color: CSS_COLORS.WHITE,
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setDepth(1001);
    const ok = this.scene.add.text(W/2, H/2+72, '[ CONTINUE ]', {
      fontFamily: 'monospace', fontSize: '16px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(1001).setInteractive({ useHandCursor: true });
    ok.on('pointerdown', () => { bg.destroy(); title.destroy(); body.destroy(); ok.destroy(); });
  }
}
