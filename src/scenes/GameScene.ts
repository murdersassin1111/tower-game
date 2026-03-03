import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Tower } from '../entities/Tower';
import { Turret } from '../entities/Turret';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';
import { HUD } from '../ui/HUD';
import { Shop } from '../ui/Shop';
import type { TurretType } from '../types';

export class GameScene extends Phaser.Scene {
  tower!: Tower;
  turrets: Turret[] = [];
  waveManager!: WaveManager;
  economy!: EconomyManager;
  audio!: AudioManager;
  saveManager!: SaveManager;
  hud!: HUD;
  shop!: Shop;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private paused: boolean = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private gameSpeed: 1 | 2 | 4 = 1;
  private towerDestroyed: boolean = false;

  constructor() { super('GameScene'); }

  create(data?: { loadSave?: boolean }) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.50;

    this.add.rectangle(0, 0, W, H, 0x0a0f0d, 1).setOrigin(0).setDepth(0);
    this.bgGraphics = this.add.graphics().setDepth(1);
    this.drawBackground();

    // Ambient particles
    this.add.particles(0, 0, 'particle-green', {
      x: { min: 0, max: W }, y: { min: H * 0.3, max: H },
      speedY: { min: -20, max: -50 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.25, end: 0 }, alpha: { start: 0.2, end: 0 },
      lifespan: 5500, frequency: 130, quantity: 1,
    }).setDepth(3);

    this.saveManager = new SaveManager();
    this.economy = new EconomyManager();
    this.audio = new AudioManager(this);

    const saveData = data?.loadSave ? this.saveManager.load() : null;
    if (saveData) {
      this.economy.init(saveData.cores, saveData.shards, saveData.upgrades);
      const idle = this.saveManager.calculateIdle();
      if (idle.offlineSeconds > 60) {
        const earned = Math.floor(idle.coresEarned);
        this.economy.earn(earned);
        this.time.delayedCall(800, () => this.hud.showIdleSummary(earned, idle.wavesCompleted));
      }
    } else {
      this.economy.init(0, 0, {});
    }

    this.tower = new Tower(this, cx, cy, this.economy);
    this.waveManager = new WaveManager(this, cx, cy);
    this.hud = new HUD(this, this.economy, this.audio);
    this.hud.onSpeedChange = (s) => {
      this.gameSpeed = s;
      this.time.timeScale = s;
    };
    this.hud.onShopOpen = () => this.shop.toggle();

    this.shop = new Shop(this, this.economy);
    this.shop.onTurretPurchase = (type) => this.placeTurretAtDefault(type);

    // Default starting turret
    this.placeTurretAt('laser', cx - 52, cy - 62);

    this.time.delayedCall(1200, () => this.waveManager.startNextWave());

    this.events.on('enemy-killed', (data: { type: string; reward: number; x: number; y: number }) => {
      const earned = this.economy.earn(data.reward);
      this.hud.showFloatingText(data.x, data.y, `+${earned}`, CSS_COLORS.GREEN);
      this.saveManager.save({ cores: this.economy.cores });
    });

    this.events.on('tower-damaged', (data: { amount: number }) => {
      this.hud.showFloatingText(cx + (Math.random() - 0.5) * 50, cy - 40,
        `-${Math.floor(data.amount)}`, '#ff4444');
    });

    this.events.on('tower-destroyed', () => {
      if (this.towerDestroyed) return;
      this.towerDestroyed = true;
      this.saveManager.reset();
      this.time.delayedCall(1800, () => {
        this.scene.start('GameOverScene', {
          wave: this.waveManager.currentWave,
          cores: Math.floor(this.economy.cores),
        });
      });
    });

    this.events.on('wave-complete', (d: { wave: number }) => {
      this.saveManager.save({
        wave: d.wave, cores: this.economy.cores, shards: this.economy.shards,
        towerHp: this.tower.hp, upgrades: this.economy.getState().upgrades,
      });
    });

    this.events.on('wave-start', () => {
      try { this.sound.play('wave-start', { volume: 0.4 }); } catch(_) {}
    });

    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-U', () => this.shop.toggle());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveManager.save({
        wave: this.waveManager.currentWave, cores: this.economy.cores,
        shards: this.economy.shards, towerHp: this.tower.hp,
        upgrades: this.economy.getState().upgrades,
      });
    });
  }

  drawBackground() {
    const g = this.bgGraphics; g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    g.lineStyle(0.5, 0x22c55e, 0.04);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);
    // Vignette
    for (const [vx, vy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
      g.fillStyle(0x000000, 0.5); g.fillCircle(vx, vy, 200);
    }
    // Scan lines
    g.lineStyle(0.5, 0x000000, 0.07);
    for (let y = 0; y < H; y += 3) g.lineBetween(0, y, W, y);
  }

  placeTurretAtDefault(type: TurretType) {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT * 0.50;
    const slots = [
      { x: cx - 55, y: cy - 58 }, { x: cx + 55, y: cy - 58 },
      { x: cx - 78, y: cy - 20 }, { x: cx + 78, y: cy - 20 },
      { x: cx - 58, y: cy + 18 }, { x: cx + 58, y: cy + 18 },
      { x: cx,     y: cy - 85 }, { x: cx - 105, y: cy + 32 },
      { x: cx + 105, y: cy + 32 },
    ];
    const used = this.turrets.map(t => `${Math.round(t.x)},${Math.round(t.y)}`);
    const free = slots.find(s => !used.includes(`${Math.round(s.x)},${Math.round(s.y)}`));
    if (free) { this.placeTurretAt(type, free.x, free.y); return; }
    const oldest = this.turrets.find(t => t.type !== 'nuke');
    if (oldest) {
      oldest.sprite.destroy(); oldest.baseSprite.destroy(); oldest.rangeCircle.destroy();
      this.turrets = this.turrets.filter(t => t !== oldest);
      this.placeTurretAt(type, oldest.x, oldest.y);
    }
  }

  placeTurretAt(type: TurretType, x: number, y: number) {
    this.turrets.push(new Turret(this, type, x, y));
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) { this.time.paused = true; this.showPauseMenu(); }
    else { this.time.paused = false; this.pauseOverlay?.destroy(); this.pauseOverlay = undefined; }
  }

  showPauseMenu() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const bg = this.add.graphics().setDepth(990);
    bg.fillStyle(0x000000, 0.75); bg.fillRect(0, 0, W, H);
    const title = this.add.text(W/2, H/2-60, '[ PAUSED ]', {
      fontFamily: 'monospace', fontSize: '26px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(991);
    const resume = this.add.text(W/2, H/2+4, '[ RESUME ]', {
      fontFamily: 'monospace', fontSize: '18px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });
    resume.on('pointerdown', () => this.togglePause());
    const menu = this.add.text(W/2, H/2+56, '[ MENU ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6b7280',
    }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });
    menu.on('pointerdown', () => { this.time.paused = false; this.scene.start('MenuScene'); });
    this.pauseOverlay = this.add.container(0, 0, [bg, title, resume, menu]).setDepth(990);
  }

  update(time: number, delta: number) {
    if (this.paused || this.towerDestroyed) return;
    const dt = delta;

    this.tower.update(dt);
    this.waveManager.update(dt);

    for (const e of this.waveManager.activeEnemies) {
      if (e.dead || e.reached) continue;
      const hit = e.update(dt);
      if (hit) this.tower.takeDamage(e.damage);
    }

    const alive = this.waveManager.activeEnemies.filter(e => !e.dead && !e.reached);
    for (const t of this.turrets) t.update(time, dt, alive);

    this.hud.update(
      this.waveManager.currentWave,
      this.tower.getHpRatio(),
      this.tower.getShieldRatio(),
    );

    this.saveManager.update(dt);
  }
}
