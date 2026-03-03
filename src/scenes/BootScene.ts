import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const barW = 260, barH = 6;
    const barX = (W - barW) / 2, barY = H / 2 + 60;

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
    this.add.text(W / 2, H / 2 + 34, 'LOADING...', {
      fontFamily: 'monospace', fontSize: '11px', color: CSS_COLORS.MUTED,
    }).setOrigin(0.5);

    // Enemy sprites
    const enemies = ['drone','crawler','hacker','juggernaut','emp','swarmqueen'];
    enemies.forEach(e => this.load.image(`enemy-${e}`, `assets/images/enemy-${e}.png`));

    // Turret sprites
    const turrets = ['laser','mortar','tesla','freeze','nuke'];
    turrets.forEach(t => this.load.image(`turret-${t}`, `assets/images/turret-${t}.png`));

    // Tower sprites
    ['tower-base','tower-mid','tower-top','tower-cannon'].forEach(k =>
      this.load.image(k, `assets/images/${k}.png`));

    // Audio
    const sounds: Record<string, string> = {
      laser: 'assets/audio/laser.ogg',
      mortar: 'assets/audio/mortar.ogg',
      'nuke-launch': 'assets/audio/nuke-launch.ogg',
      'nuke-explode': 'assets/audio/nuke-explode.ogg',
      explosion: 'assets/audio/explosion.ogg',
      hit: 'assets/audio/hit.ogg',
      shield: 'assets/audio/shield.ogg',
      'enemy-die': 'assets/audio/enemy-die.ogg',
      click: 'assets/audio/click.ogg',
      buy: 'assets/audio/buy.ogg',
      'wave-start': 'assets/audio/wave-start.ogg',
    };
    Object.entries(sounds).forEach(([k, v]) => this.load.audio(k, v));
  }

  create() {
    this.generateParticleTextures();
    this.scene.start('MenuScene');
  }

  generateParticleTextures() {
    const make = (name: string, color: number, size: number) => {
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(color, 1); g.fillCircle(size, size, size);
      g.generateTexture(name, size * 2, size * 2); g.setVisible(false);
    };
    make('particle-green', 0x22c55e, 4);
    make('particle-orange', 0xff6600, 4);
    make('particle-white', 0xffffff, 3);
    make('particle-cyan', 0x00ffff, 3);
    make('particle-red', 0xff3333, 4);
  }
}
