import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(data: { wave?: number; cores?: number }) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const wave = data?.wave ?? 1;
    const cores = data?.cores ?? 0;

    this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0, 0);

    // Particle burst on enter
    this.add.particles(W / 2, H / 2, 'particle-red', {
      speed: { min: 100, max: 300 }, scale: { start: 1, end: 0 },
      lifespan: 1200, quantity: 30, emitting: false,
    }).explode(30, W / 2, H / 2);

    const title = this.add.text(W / 2, H * 0.28, 'TOWER DESTROYED', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ff3333',
      shadow: { color: '#ff0000', blur: 30, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, y: H * 0.28 - 10, duration: 800, ease: 'Power2' });

    this.add.text(W / 2, H * 0.46, `Survived to Wave ${wave}\n${cores} Cores collected`, {
      fontFamily: 'monospace', fontSize: '16px', color: CSS_COLORS.MUTED,
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    const rebuildBtn = this.add.text(W / 2, H * 0.65, '[ REBUILD ]', {
      fontFamily: 'monospace', fontSize: '20px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 12, fill: true },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rebuildBtn.on('pointerover', () => rebuildBtn.setScale(1.08));
    rebuildBtn.on('pointerout', () => rebuildBtn.setScale(1));
    rebuildBtn.on('pointerdown', () => this.scene.start('GameScene', { loadSave: false }));

    this.add.text(W / 2, H * 0.75, '[ MAIN MENU ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6b7280',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
