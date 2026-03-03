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
import type { TurretType, UpgradeKey } from '../types';

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
  readonly cx: number = GAME_WIDTH / 2;
  readonly cy: number = GAME_HEIGHT * 0.50;

  constructor() { super('GameScene'); }

  create(data?: { loadSave?: boolean }) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const { cx, cy } = this;

    this.add.rectangle(0, 0, W, H, 0x0a0f0d, 1).setOrigin(0).setDepth(0);
    this.bgGraphics = this.add.graphics().setDepth(1);
    this.drawBackground();

    // Ambient floating particles
    this.add.particles(0, 0, 'particle-green', {
      x: { min: 0, max: W }, y: { min: H * 0.35, max: H },
      speedY: { min: -18, max: -45 }, speedX: { min: -5, max: 5 },
      scale: { start: 0.22, end: 0 }, alpha: { start: 0.18, end: 0 },
      lifespan: 6000, frequency: 140, quantity: 1,
    }).setDepth(3);

    // Systems
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
        this.time.delayedCall(900, () => this.hud.showIdleSummary(earned, idle.wavesCompleted));
      }
    } else {
      // Start player with enough cores for first upgrade decision
      this.economy.init(80, 0, {});
    }

    // Entities
    this.tower = new Tower(this, cx, cy, this.economy);
    this.waveManager = new WaveManager(this, cx, cy);

    // UI
    this.hud = new HUD(this, this.economy, this.audio);
    this.hud.onSpeedChange = (s) => {
      this.gameSpeed = s;
      this.time.timeScale = s;
    };
    this.hud.onShopOpen = () => {
      this.shop.toggle();
      try { this.sound.play('click', { volume: 0.18 }); } catch(_) {}
    };

    this.shop = new Shop(this, this.economy);
    this.shop.onTurretPurchase = (type) => this.placeTurretAtDefault(type);
    this.shop.onUpgradeBought = (key) => this.onUpgradeBought(key);

    // Start with one laser turret
    this.placeTurretAt('laser', cx - 54, cy - 60);

    // Start first wave after short intro delay
    this.time.delayedCall(1400, () => this.waveManager.startNextWave());

    // ── Events ──────────────────────────────────────────────
    this.events.on('enemy-killed', (d: { type: string; reward: number; x: number; y: number }) => {
      const earned = this.economy.earn(d.reward);
      this.hud.showFloatingText(d.x, d.y - 10, `+${earned}`, CSS_COLORS.GREEN);
    });

    this.events.on('tower-damaged', (d: { amount: number }) => {
      this.hud.showFloatingText(
        cx + (Math.random() - 0.5) * 60, cy - 50,
        `-${Math.floor(d.amount)}`, '#ff4444'
      );
    });

    this.events.on('tower-destroyed', () => {
      if (this.towerDestroyed) return;
      this.towerDestroyed = true;
      this.saveManager.reset();
      this.cameras.main.shake(600, 0.04);
      this.time.delayedCall(2000, () => {
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
      try { this.sound.play('wave-start', { volume: 0.38 }); } catch(_) {}
    });

    // ── Controls ─────────────────────────────────────────────
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-U', () => this.shop.toggle());
    this.input.keyboard?.on('keydown-M', () => {
      const m = this.audio.toggleMute();
      this.hud.updateMuteIcon(m);
    });

    // Auto-save on tab hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveManager.save({
        wave: this.waveManager.currentWave,
        cores: this.economy.cores, shards: this.economy.shards,
        towerHp: this.tower.hp, upgrades: this.economy.getState().upgrades,
      });
    });
  }

  /** Called whenever an upgrade is purchased — propagate to all game objects */
  private onUpgradeBought(key: UpgradeKey) {
    this.tower.applyUpgrades();
    // Turrets automatically read from economy via getters — no extra step needed
    // Show confirmation float
    const label: Record<string, string> = {
      turret_damage: 'DMG ▲', turret_range: 'RANGE ▲', turret_firerate: 'RATE ▲',
      tower_hp: 'MAX HP ▲', tower_armor: 'ARMOR ▲', shield_cap: 'SHIELD ▲',
      shield_regen: 'S.REGEN ▲', core_mult: 'CORE× ▲', idle_rate: 'IDLE ▲',
    };
    this.hud.showFloatingText(this.cx, this.cy - 110, label[key] ?? 'UPGRADE ▲', '#4ade80');
  }

  drawBackground() {
    const g = this.bgGraphics; g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    g.lineStyle(0.5, 0x22c55e, 0.04);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);
    // Corner vignettes
    for (const [vx, vy] of [[0,0],[W,0],[0,H],[W,H]] as const) {
      g.fillStyle(0x000000, 0.5); g.fillCircle(vx, vy, 210);
    }
    // CRT scan lines
    g.lineStyle(0.5, 0x000000, 0.07);
    for (let y = 0; y < H; y += 3) g.lineBetween(0, y, W, y);
  }

  placeTurretAtDefault(type: TurretType) {
    const { cx, cy } = this;
    const slots = [
      { x: cx - 54, y: cy - 60 }, { x: cx + 54, y: cy - 60 },
      { x: cx - 78, y: cy - 18 }, { x: cx + 78, y: cy - 18 },
      { x: cx - 56, y: cy + 22 }, { x: cx + 56, y: cy + 22 },
      { x: cx,      y: cy - 88 }, { x: cx - 108, y: cy + 36 },
      { x: cx + 108, y: cy + 36 },
    ];
    const used = new Set(this.turrets.map(t => `${Math.round(t.x)},${Math.round(t.y)}`));
    const free = slots.find(s => !used.has(`${Math.round(s.x)},${Math.round(s.y)}`));
    if (free) { this.placeTurretAt(type, free.x, free.y); return; }
    // Replace oldest non-nuke
    const oldest = this.turrets.find(t => t.type !== 'nuke');
    if (oldest) {
      oldest.sprite.destroy(); oldest.baseSprite.destroy(); oldest.rangeCircle.destroy();
      this.turrets = this.turrets.filter(t => t !== oldest);
      this.placeTurretAt(type, oldest.x, oldest.y);
    }
  }

  placeTurretAt(type: TurretType, x: number, y: number) {
    this.turrets.push(new Turret(this, type, x, y, this.economy));
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
    bg.fillStyle(0x000000, 0.78); bg.fillRect(0, 0, W, H);

    const title = this.add.text(W/2, H/2-65, '[ PAUSED ]', {
      fontFamily: 'monospace', fontSize: '26px', color: CSS_COLORS.GREEN,
      shadow: { color: CSS_COLORS.GREEN, blur: 15, fill: true },
    }).setOrigin(0.5).setDepth(991);

    const waveInfo = this.add.text(W/2, H/2-28, `Wave ${this.waveManager.currentWave}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#4ade80',
    }).setOrigin(0.5).setDepth(991);

    const resume = this.add.text(W/2, H/2+14, '[ RESUME ]', {
      fontFamily: 'monospace', fontSize: '19px', color: CSS_COLORS.GREEN,
    }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });
    resume.on('pointerover', () => resume.setScale(1.07));
    resume.on('pointerout',  () => resume.setScale(1));
    resume.on('pointerdown', () => this.togglePause());

    const menuBtn = this.add.text(W/2, H/2+62, '[ MAIN MENU ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6b7280',
    }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.time.paused = false;
      this.scene.start('MenuScene');
    });

    this.pauseOverlay = this.add.container(0, 0, [bg, title, waveInfo, resume, menuBtn]);
  }

  update(time: number, delta: number) {
    if (this.paused || this.towerDestroyed) return;

    this.tower.update(delta);
    this.waveManager.update(delta);

    // Update enemies
    for (const e of this.waveManager.activeEnemies) {
      if (e.dead || e.reached) continue;
      const reached = e.update(delta);
      if (reached) {
        if (e.isEmp) {
          // EMP: disable random turret instead of damaging tower
          const active = this.turrets.filter(t => !t.disabled);
          if (active.length > 0) {
            const victim = active[Math.floor(Math.random() * active.length)]!;
            victim.disable(3500);
            this.hud.showFloatingText(victim.x, victim.y - 20, 'EMP!', '#ffff00');
          }
        } else {
          // Normal hit on tower
          const destroyed = this.tower.takeDamage(e.damage, e.bypassShield);
          if (destroyed) break;
        }
      }
    }

    // Update turrets
    const alive = this.waveManager.activeEnemies.filter(e => !e.dead && !e.reached);
    for (const t of this.turrets) {
      t.update(time, delta, alive, this.gameSpeed);
    }

    // Update HUD
    this.hud.update(
      this.waveManager.currentWave,
      this.tower.getHpRatio(),
      this.tower.getShieldRatio(),
    );

    // Periodic auto-save
    this.saveManager.update(delta);
  }
}
