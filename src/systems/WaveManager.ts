import Phaser from 'phaser';
import { ENEMIES, WAVE, COLORS } from '../config';
import type { EnemyType, SpawnEntry } from '../types';
import { Enemy } from '../entities/Enemy';

export class WaveManager extends Phaser.Events.EventEmitter {
  scene: Phaser.Scene;
  currentWave: number = 0;
  activeEnemies: Enemy[] = [];
  private spawnQueue: { type: EnemyType; delay: number }[] = [];
  private spawnTimer: number = 0;
  private restTimer: number = 0;
  private isResting: boolean = false;
  private centerX: number;
  private centerY: number;
  private waveText!: Phaser.GameObjects.Text;
  private waveBg!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, centerX: number, centerY: number) {
    super();
    this.scene = scene;
    this.centerX = centerX;
    this.centerY = centerY;
    this.waveBg = scene.add.graphics().setDepth(900);
    this.waveText = scene.add.text(centerX, centerY - 80, '', {
      fontFamily: 'monospace', fontSize: '32px',
      color: '#22c55e', stroke: '#000000', strokeThickness: 4,
      shadow: { color: '#22c55e', blur: 20, fill: true },
    }).setOrigin(0.5).setDepth(901).setAlpha(0);
  }

  startNextWave() {
    this.currentWave++;
    const isBoss = this.currentWave % WAVE.BOSS_EVERY === 0;
    const mult = 1 + this.currentWave * WAVE.HP_SCALE;

    this.spawnQueue = this.buildSpawnQueue(this.currentWave, mult);
    this.spawnTimer = 0;
    this.isResting = false;

    this.scene.events.emit('wave-start', { wave: this.currentWave, isBoss });
    this.announceWave(this.currentWave, isBoss);

    if (isBoss) {
      this.scene.events.emit('boss-wave', { wave: this.currentWave, bossType: 'juggernaut' });
    }
  }

  buildSpawnQueue(wave: number, mult: number): { type: EnemyType; delay: number }[] {
    const queue: { type: EnemyType; delay: number }[] = [];
    let delay = 0;
    const isBoss = wave % WAVE.BOSS_EVERY === 0;

    if (isBoss) {
      queue.push({ type: wave % 20 === 0 ? 'swarmqueen' : 'juggernaut', delay });
      delay += 500;
      // Escort
      for (let i = 0; i < Math.min(wave / 5, 8); i++) {
        delay += 400;
        queue.push({ type: 'crawler', delay });
      }
      return queue;
    }

    const baseCount = 4 + Math.floor(wave * WAVE.COUNT_SCALE);
    for (let i = 0; i < baseCount; i++) {
      delay += WAVE.SPAWN_DELAY + Math.random() * 200;
      let type: EnemyType = 'drone';
      if (wave >= 6) {
        const r = Math.random();
        if (wave < 10) type = r < 0.6 ? 'drone' : 'crawler';
        else if (wave < 15) {
          if (r < 0.4) type = 'drone';
          else if (r < 0.7) type = 'crawler';
          else if (r < 0.9) type = 'hacker';
          else type = 'emp';
        } else {
          if (r < 0.3) type = 'drone';
          else if (r < 0.55) type = 'crawler';
          else if (r < 0.72) type = 'hacker';
          else if (r < 0.85) type = 'emp';
          else type = 'drone'; // swarm burst at high waves
        }
      }
      queue.push({ type, delay });
    }
    return queue;
  }

  announceWave(wave: number, isBoss: boolean) {
    const txt = this.waveText;
    const color = isBoss ? '#ff3333' : '#22c55e';
    const label = isBoss ? `⚠ BOSS WAVE ${wave} ⚠` : `WAVE ${wave}`;
    txt.setText(label).setColor(color).setAlpha(0).setScale(0.5);
    this.scene.tweens.add({
      targets: txt, alpha: 1, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.Out',
      onComplete: () => {
        this.scene.time.delayedCall(1200, () => {
          this.scene.tweens.add({ targets: txt, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 300 });
        });
      }
    });
  }

  getRandomSpawnPos(): { x: number; y: number } {
    const side = Math.floor(Math.random() * 4);
    const spread = 60;
    switch (side) {
      case 0: return { x: this.centerX - 150 - Math.random() * spread, y: this.centerY + 120 + Math.random() * spread };
      case 1: return { x: this.centerX + 150 + Math.random() * spread, y: this.centerY + 120 + Math.random() * spread };
      case 2: return { x: this.centerX - 220 - Math.random() * spread, y: this.centerY + 60 + Math.random() * spread };
      default: return { x: this.centerX + 220 + Math.random() * spread, y: this.centerY + 60 + Math.random() * spread };
    }
  }

  spawnEnemy(type: EnemyType, mult: number) {
    const pos = this.getRandomSpawnPos();
    const dx = (Math.random() - 0.5) * 40;
    const dy = (Math.random() - 0.5) * 20;
    const e = new Enemy(this.scene, type, pos.x, pos.y, this.centerX + dx, this.centerY + dy + 80, mult);
    this.activeEnemies.push(e);
    // Drone spawns 3
    if (type === 'drone' && ENEMIES.drone.spawnCount > 1) {
      for (let i = 1; i < ENEMIES.drone.spawnCount; i++) {
        const pos2 = this.getRandomSpawnPos();
        this.activeEnemies.push(new Enemy(this.scene, 'drone', pos2.x, pos2.y, this.centerX + (Math.random()-0.5)*40, this.centerY + 80, mult));
      }
    }
  }

  update(delta: number) {
    // Cleanup visuals for enemies that finished (reached or dead)
    for (const e of this.activeEnemies) {
      if ((e.dead || e.reached) && !e.cleanedUp) {
        e.cleanupVisuals();
      }
    }
    this.activeEnemies = this.activeEnemies.filter(e => !e.dead && !e.reached);

    if (this.isResting) {
      this.restTimer -= delta;
      // Show countdown
      const secs = Math.ceil(this.restTimer / 1000);
      if (secs > 0) {
        this.waveText.setText(`Next wave in ${secs}...`)
          .setColor('#86efac').setFontSize('18px').setAlpha(0.85);
      }
      if (this.restTimer <= 0) {
        this.waveText.setAlpha(0);
        this.startNextWave();
      }
      return;
    }

    // Spawn from queue
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += delta;
      const mult = 1 + this.currentWave * WAVE.HP_SCALE;
      while (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnQueue[0]!.delay) {
        const entry = this.spawnQueue.shift()!;
        this.spawnEnemy(entry.type, mult);
      }
    }

    // Wave complete?
    if (this.spawnQueue.length === 0 && this.activeEnemies.length === 0 && !this.isResting) {
      this.isResting = true;
      this.restTimer = WAVE.REST_TIME;
      this.scene.events.emit('wave-complete', { wave: this.currentWave });
    }
  }
}
