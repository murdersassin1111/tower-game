import { SAVE_KEY, WAVE } from '../config';
import type { SaveData, UpgradeState, TurretState, IdleResult } from '../types';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  timestamp: Date.now(),
  wave: 1,
  cores: 0,
  shards: 0,
  towerHp: 10000,
  towerLevel: 1,
  upgrades: {},
  turrets: [],
  highScore: 0,
  totalPlayTime: 0,
};

export class SaveManager {
  private data: SaveData;
  private autoSaveTimer: number = 0;
  private readonly AUTO_SAVE_INTERVAL = 30000;

  constructor() {
    this.data = this.load() ?? { ...DEFAULT_SAVE };
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  save(partial?: Partial<SaveData>) {
    if (partial) Object.assign(this.data, partial);
    this.data.timestamp = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  reset() {
    this.data = { ...DEFAULT_SAVE, timestamp: Date.now() };
    localStorage.removeItem(SAVE_KEY);
  }

  get(): SaveData { return this.data; }
  set(key: keyof SaveData, value: SaveData[keyof SaveData]) {
    (this.data as unknown as Record<string, unknown>)[key] = value;
  }

  update(delta: number) {
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= this.AUTO_SAVE_INTERVAL) {
      this.autoSaveTimer = 0;
      this.save();
    }
  }

  calculateIdle(): IdleResult {
    const now = Date.now();
    const offlineMs = now - this.data.timestamp;
    const maxMs = WAVE.MAX_OFFLINE_HOURS * 3600 * 1000;
    const clampedMs = Math.min(offlineMs, maxMs);
    const offlineSec = clampedMs / 1000;

    // Rough simulation
    const idleRate = WAVE.IDLE_RATE_BASE; // cores/min
    const coresEarned = Math.floor((offlineSec / 60) * idleRate);
    const wavesCompleted = Math.floor(offlineSec / 60); // ~1 wave per min
    const damageTaken = offlineSec > 14400 ? 2000 : offlineSec > 3600 ? 500 : 0;

    return { offlineSeconds: offlineSec, wavesCompleted, coresEarned, towerDamageTaken: damageTaken };
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}
