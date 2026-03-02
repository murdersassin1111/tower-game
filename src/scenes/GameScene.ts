import Phaser from 'phaser';
import { COLORS, CSS_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Tower } from '../entities/Tower';
import { Turret } from '../entities/Turret';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { SaveManager } from '../systems/SaveManager';
import { HUD } from '../ui/HUD';
import { Shop } from '../ui/Shop';
import type { TurretType } from '../types';

export class GameScene extends Phaser.Scene {
  tower!: Tower;
  turrets: Turret[] = [];
  waveManager!: WaveManager;
  economy!: EconomyManager;
  saveManager!: SaveManager;
  hud!: HUD;
  shop!: Shop;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private bgParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private paused: boolean = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private gameSpeed: 1 | 2 | 4 = 1;
  private towerDestroyed: boolean = false;

  constructor() { super('GameScene'); }

  create(data?: { loadSave?: boolean }) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.52;

    // Background
    this.add.rectangle(0, 0, W, H, COLORS.BG, 1).setOrigin(0, 0).setDepth(0);
    this.bgGraphics = this.add.graphics().setDepth(1);
    this.drawBackground();

    // Ambient particles
    this.bgParticles = this.add.particles(0, 0, 'particle-green', {
      x: { min: 0, max: W },
      y: { min: H * 0.3, max: H },
      speedY: { min: -25, max: -55 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.25, end: 0 },
      lifespan: 5000, frequency: 120, quantity: 1,
    }).setDepth(3);

    // Systems
    this.saveManager = new SaveManager();
    this.economy = new EconomyManager();
    const saveData = data?.loadSave ? this.saveManager.load() : null;
    if (saveData) {
      this.economy.init(saveData.cores, saveData.shards, saveData.upgrades);
      // Idle catch-up
      const idle = this.saveManager.calculateIdle();
      if (idle.offlineSeconds > 60) {
        const earnedCores = Math.floor(idle.coresEarned);
        this.economy.earn(earnedCores);
        this.time.delayedCall(800, () => {
          this.hud.showIdleSummary(earnedCores, idle.wavesCompleted);
        });
      }
    } else {
      this.economy.init(0, 0, {});
    }

    // Tower
    this.tower = new Tower(this, cx, cy);

    // Wave Manager
    const startWave = saveData?.wave ?? 0;
    this.waveManager = new WaveManager(this, cx, cy);

    // HUD
    this.hud = new HUD(this, this.economy);
    this.hud.onSpeedChange = (s) => {
      this.gameSpeed = s;
      this.time.timeScale = s;
      this.physics.world?.timeScale && (this.physics.world.timeScale = 1 / s);
    };
    this.hud.onShopOpen = () => this.shop.toggle();

    // Shop
    this.shop = new Shop(this, this.economy);
    this.shop.onTurretPurchase = (type) => this.placeTurretAtDefault(type);

    // Place default laser turret
    this.placeTurretAt('laser', cx - 50, cy - 60);

    // Start waves
    this.time.delayedCall(1000, () => this.waveManager.startNextWave());

    // Events
    this.events.on('enemy-killed', (data: { type: string; reward: number; x: number; y: number }) => {
      const earned = this.economy.earn(data.reward);
      this.hud.showFloatingText(data.x, data.y, `+${earned}`, CSS_COLORS.GREEN);
      this.saveManager.save({ cores: this.economy.cores });
    });

    this.events.on('tower-damaged', (data: { amount: number; currentHp: number }) => {
      this.hud.showFloatingText(cx + (Math.random()-0.5)*40, cy - 30,
        `-${Math.floor(data.amount)}`, '#ff3333');
    });

    this.events.on('tower-destroyed', () => {
      if (this.towerDestroyed) return;
      this.towerDestroyed = true;
      this.saveManager.reset();
      this.time.delayedCall(1600, () => {
        this.scene.start('GameOverScene', {
          wave: this.waveManager.currentWave,
          cores: Math.floor(this.economy.cores),
        });
      });
    });

    this.events.on('wave-complete', (data: { wave: number }) => {
      this.saveManager.save({
        wave: data.wave, cores: this.economy.cores, shards: this.economy.shards,
        towerHp: this.tower.hp, upgrades: this.economy.getState().upgrades,
      });
    });

    // Keyboard controls
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-U', () => this.shop.toggle());

    // Touch: tap on tower area to open shop
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.shop.visible) return;
      const dx = ptr.x - cx, dy = ptr.y - cy;
      if (Math.abs(dx) < 100 && Math.abs(dy) < 120) {
        // tapped tower — open shop
      }
    });

    // Auto-save on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveManager.save({
          wave: this.waveManager.currentWave, cores: this.economy.cores,
          shards: this.economy.shards, towerHp: this.tower.hp,
          upgrades: this.economy.getState().upgrades,
        });
      }
    });
  }

  drawBackground() {
    const g = this.bgGraphics; g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    // Subtle grid
    g.lineStyle(0.5, COLORS.GREEN, 0.04);
    for (let x = 0; x < W; x += 36) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 36) g.lineBetween(0, y, W, y);
    // Corner vignettes
    for (const [vx, vy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
      g.fillStyle(0x000000, 0.4);
      g.fillCircle(vx, vy, 180);
    }
    // Scan lines
    g.lineStyle(0.5, 0x000000, 0.06);
    for (let y = 0; y < H; y += 4) g.lineBetween(0, y, W, y);
  }

  placeTurretAtDefault(type: TurretType) {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT * 0.52;
    const slots = [
      { x: cx - 55, y: cy - 55 }, { x: cx + 55, y: cy - 55 },
      { x: cx - 75, y: cy - 20 }, { x: cx + 75, y: cy - 20 },
      { x: cx - 55, y: cy + 15 }, { x: cx + 55, y: cy + 15 },
      { x: cx,      y: cy - 80 }, { x: cx - 100, y: cy + 30 },
      { x: cx + 100, y: cy + 30 },
    ];
    const used = this.turrets.map(t => `${Math.round(t.x)},${Math.round(t.y)}`);
    const free = slots.find(s => !used.includes(`${Math.round(s.x)},${Math.round(s.y)}`));
    if (free) this.placeTurretAt(type, free.x, free.y);
    else {
      // Replace oldest non-nuke turret
      const oldest = this.turrets.find(t => t.type !== 'nuke');
      if (oldest) {
        oldest.graphics.destroy(); oldest.rangeCircle.destroy();
        this.turrets = this.turrets.filter(t => t !== oldest);
        this.placeTurretAt(type, oldest.x, oldest.y);
      }
    }
  }

  placeTurretAt(type: TurretType, x: number, y: number) {
    const t = new Turret(this, type, x, y);
    this.turrets.push(t);
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.time.paused = true;
      this.showPauseMenu();
    } else {
      this.time.paused = false;
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  showPauseMenu() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const bg = this.add.graphics().setDepth(990);
    bg.fillStyle(0x000000, 0.7); bg.fillRect(0, 0, W, H);
    const title = this.add.text(W/2, H/2 - 60, '[ PAUSED ]', {
      fontFamily: 'monospace', fontSize: '24px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(991);
    const resume = this.add.text(W/2, H/2, '[ RESUME ]', {
      fontFamily: 'monospace', fontSize: '18px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });
    resume.on('pointerdown', () => this.togglePause());
    const menu = this.add.text(W/2, H/2 + 50, '[ MENU ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6b7280',
    }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });
    menu.on('pointerdown', () => { this.time.paused = false; this.scene.start('MenuScene'); });
    this.pauseOverlay = this.add.container(0, 0, [bg, title, resume, menu]).setDepth(990);
  }

  update(time: number, delta: number) {
    if (this.paused || this.towerDestroyed) return;
    const dt = delta;

    // Update tower
    this.tower.update(dt);

    // Update wave manager (handles enemy spawning)
    this.waveManager.update(dt);

    // Update enemies, check if reached tower
    for (const e of this.waveManager.activeEnemies) {
      if (e.dead || e.reached) continue;
      const reached = e.update(dt);
      if (reached) {
        const destroyed = this.tower.takeDamage(e.damage);
        if (destroyed) break;
      }
    }

    // Update turrets
    const aliveEnemies = this.waveManager.activeEnemies.filter(e => !e.dead && !e.reached);
    for (const t of this.turrets) {
      t.update(time, dt, aliveEnemies);
    }

    // HUD update
    this.hud.update(
      this.waveManager.currentWave,
      this.tower.getHpRatio(),
      this.tower.getShieldRatio(),
    );

    // Auto save
    this.saveManager.update(dt);
  }
}
