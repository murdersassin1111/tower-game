import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { IsoMath } from '../utils/IsoMath';
import { SaveManager } from '../systems/SaveManager';

export class MenuScene extends Phaser.Scene {
  private towerGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private rotAngle: number = 0;
  private save!: SaveManager;

  constructor() { super('MenuScene'); }

  create() {
    this.save = new SaveManager();
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // Background
    this.add.rectangle(0, 0, W, H, COLORS.BG, 1).setOrigin(0, 0);

    // Grid bg
    this.bgGraphics = this.add.graphics().setDepth(1);
    this.drawGrid();

    // Particle emitter
    this.particles = this.add.particles(0, 0, 'particle-green', {
      x: { min: 0, max: W }, y: H + 10,
      speedY: { min: -60, max: -120 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 4000,
      frequency: 80,
      quantity: 1,
    }).setDepth(2);

    // Tower graphic
    this.towerGraphics = this.add.graphics().setDepth(10);
    this.drawMenuTower();

    // Title
    const title = this.add.text(W / 2, H * 0.14, 'TOWER', {
      fontFamily: 'monospace', fontSize: '56px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 40, fill: true },
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    // Pulse title
    this.tweens.add({ targets: title, scaleX: 1.04, scaleY: 1.04, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add.text(W / 2, H * 0.14 + 48, '// DEFEND THE TOWER', {
      fontFamily: 'monospace', fontSize: '12px', color: CSS_COLORS.MUTED,
    }).setOrigin(0.5).setDepth(20);

    // Buttons
    const btnY = H * 0.78;
    this.makeButton(W / 2, btnY, '[ PLAY ]', 20, () => this.startGame(false));
    if (this.save.hasSave()) {
      const wave = this.save.get().wave;
      this.makeButton(W / 2, btnY + 58, `[ CONTINUE — WAVE ${wave} ]`, 15, () => this.startGame(true));
    }
    this.makeButton(W / 2, btnY + 110, '[ NEW GAME ]', 13, () => {
      this.save.reset(); this.startGame(false);
    }, '#6b7280');

    // Version
    this.add.text(W - 8, H - 8, 'v1.0.0', {
      fontFamily: 'monospace', fontSize: '9px', color: '#333333',
    }).setOrigin(1, 1).setDepth(20);
  }

  makeButton(x: number, y: number, label: string, size: number, cb: () => void, color = CSS_COLORS.GREEN) {
    const btn = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: `${size}px`, color,
      shadow: { color, blur: 10, fill: true },
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.08));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerdown', () => {
      this.tweens.add({ targets: btn, scaleX: 0.9, scaleY: 0.9, duration: 80, yoyo: true });
      this.time.delayedCall(120, cb);
    });
    return btn;
  }

  drawGrid() {
    const g = this.bgGraphics; g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const spacing = 32;
    g.lineStyle(0.5, COLORS.GREEN, 0.05);
    for (let x = 0; x < W; x += spacing) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += spacing) g.lineBetween(0, y, W, y);
  }

  drawMenuTower() {
    const g = this.towerGraphics; g.clear();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT * 0.5;
    const W = 52, H = 26, FH = 28;
    const levels = 4;

    for (let level = 0; level < levels; level++) {
      const ty = cy - level * (H + FH) + 30;
      const alpha = 0.75 - level * 0.06;
      const s = 1 - level * 0.04;

      // Glow on top
      if (level === levels - 1) {
        const glowA = 0.06 + Math.sin(this.rotAngle * 2) * 0.03;
        g.fillStyle(COLORS.GREEN, glowA);
        g.fillCircle(cx, ty - H * s, W * s * 1.5);
      }

      g.fillStyle(COLORS.GREEN, alpha);
      g.fillPoints([
        { x: cx, y: ty - H * s }, { x: cx + W * s, y: ty },
        { x: cx, y: ty + H * s }, { x: cx - W * s, y: ty },
      ], true);
      g.fillStyle(COLORS.GREEN_DARK, alpha * 0.8);
      g.fillPoints([
        { x: cx - W * s, y: ty }, { x: cx, y: ty + H * s },
        { x: cx, y: ty + H * s + FH * s }, { x: cx - W * s, y: ty + FH * s },
      ], true);
      g.fillStyle(COLORS.GREEN_DARKER, alpha * 0.65);
      g.fillPoints([
        { x: cx, y: ty + H * s }, { x: cx + W * s, y: ty },
        { x: cx + W * s, y: ty + FH * s }, { x: cx, y: ty + H * s + FH * s },
      ], true);

      const ea = 0.25 + Math.sin(this.rotAngle + level) * 0.1;
      g.lineStyle(1, COLORS.GREEN_LIGHT, ea);
      g.strokePoints([
        { x: cx, y: ty - H * s }, { x: cx + W * s, y: ty },
        { x: cx, y: ty + H * s }, { x: cx - W * s, y: ty },
      ], true);
    }
  }

  startGame(loadSave: boolean) {
    // Flash effect
    const flash = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x22c55e, 0).setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 0.6, duration: 200, yoyo: true,
      onComplete: () => this.scene.start('GameScene', { loadSave }),
    });
  }

  update(_time: number, delta: number) {
    this.rotAngle += delta * 0.001;
    this.drawMenuTower();
  }
}
