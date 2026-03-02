// ============================================================
// TOWER — Shared Types
// ============================================================

export type EnemyType = 'drone' | 'crawler' | 'hacker' | 'juggernaut' | 'swarmqueen' | 'emp';
export type TurretType = 'laser' | 'mortar' | 'tesla' | 'freeze' | 'nuke';
export type UpgradeKey = 'turret_damage' | 'turret_range' | 'turret_firerate' |
  'tower_hp' | 'tower_armor' | 'shield_cap' | 'shield_regen' | 'core_mult' | 'idle_rate';
export type StatusEffect = 'frozen' | 'emp' | 'none';
export type DamageType = 'physical' | 'energy' | 'emp' | 'shield_bypass';
export type GameSpeed = 1 | 2 | 4;

export interface Vec2 { x: number; y: number; }
export interface Vec3 { x: number; y: number; z: number; }

export interface EnemyState {
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  reward: number;
  status: StatusEffect;
  statusTimer: number;
  pathProgress: number; // 0-1 along path
}

export interface TurretState {
  type: TurretType;
  slot: number;
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFired: number;
  disabled: boolean;
  disableTimer: number;
}

export interface UpgradeState {
  [key: string]: number; // upgrade key → current level (0-5)
}

export interface SaveData {
  version: number;
  timestamp: number;
  wave: number;
  cores: number;
  shards: number;
  towerHp: number;
  towerLevel: number;
  upgrades: UpgradeState;
  turrets: TurretState[];
  highScore: number;
  totalPlayTime: number;
}

export interface WaveConfig {
  wave: number;
  enemies: SpawnEntry[];
  isBoss: boolean;
  bossType?: EnemyType;
}

export interface SpawnEntry {
  type: EnemyType;
  count: number;
  delay: number; // ms delay before spawning this group
}

export interface IdleResult {
  offlineSeconds: number;
  wavesCompleted: number;
  coresEarned: number;
  towerDamageTaken: number;
}

export interface UpgradeCard {
  key: UpgradeKey;
  level: number;
  label: string;
  description: string;
  cost: number;
  rarity: 'common' | 'rare' | 'epic';
}

export interface GameEvents {
  'enemy-killed': { type: EnemyType; reward: number; x: number; y: number };
  'tower-damaged': { amount: number; currentHp: number };
  'tower-destroyed': { wave: number; cores: number };
  'wave-start': { wave: number; isBoss: boolean };
  'wave-complete': { wave: number };
  'boss-wave': { wave: number; bossType: EnemyType };
  'turret-purchased': { type: TurretType };
  'upgrade-bought': { key: UpgradeKey; level: number };
  'cores-changed': { amount: number; total: number };
}
