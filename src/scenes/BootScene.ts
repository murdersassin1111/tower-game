import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Loading bar
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const barW = 260, barH = 6;
    const barX = (W - barW) / 2, barY = H / 2 + 40;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2e1f, 1);
    bg.fillRect(barX, barY, barW, barH);

    const fill = this.add.graphics();
    this.load.on('progress', (v: number) => {
      fill.clear(); fill.fillStyle(COLORS.GREEN, 1);
      fill.fillRect(barX, barY, barW * v, barH);
    });

    this.add.text(W / 2, H / 2, 'TOWER', {
      fontFamily: 'monospace', fontSize: '48px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 30, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 + 28, 'LOADING...', {
      fontFamily: 'monospace', fontSize: '11px', color: CSS_COLORS.MUTED,
    }).setOrigin(0.5);
  }

  create() {
    // Generate all textures procedurally
    this.generateTextures();
    this.scene.start('MenuScene');
  }

  generateTextures() {
    // Green particle
    const pg = this.add.graphics({ x: 0, y: 0 });
    pg.fillStyle(COLORS.GREEN, 1); pg.fillCircle(4, 4, 4);
    pg.generateTexture('particle-green', 8, 8); pg.setVisible(false);

    // Orange particle
    const po = this.add.graphics({ x: 0, y: 0 });
    po.fillStyle(0xff6600, 1); po.fillCircle(4, 4, 4);
    po.generateTexture('particle-orange', 8, 8); po.setVisible(false);

    // White particle
    const pw = this.add.graphics({ x: 0, y: 0 });
    pw.fillStyle(0xffffff, 1); pw.fillCircle(3, 3, 3);
    pw.generateTexture('particle-white', 6, 6); pw.setVisible(false);

    // Cyan particle
    const pc = this.add.graphics({ x: 0, y: 0 });
    pc.fillStyle(0x00ffff, 1); pc.fillCircle(3, 3, 3);
    pc.generateTexture('particle-cyan', 6, 6); pc.setVisible(false);

    // Red particle
    const pr = this.add.graphics({ x: 0, y: 0 });
    pr.fillStyle(0xff3333, 1); pr.fillCircle(4, 4, 4);
    pr.generateTexture('particle-red', 8, 8); pr.setVisible(false);
  }
}
