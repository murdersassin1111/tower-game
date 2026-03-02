// ============================================================
// TOWER — Game Configuration
// ============================================================

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const COLORS = {
  BG:           0x0a0f0d,
  BG_ALT:       0x0e1710,
  GREEN:        0x22c55e,
  GREEN_DARK:   0x15803d,
  GREEN_DARKER: 0x0f5c2b,
  GREEN_LIGHT:  0x4ade80,
  GREEN_DIM:    0x14532d,
  WHITE:        0xffffff,
  OFFWHITE:     0xf0fdf4,
  SILVER:       0x9aabb8,
  RED:          0xff3333,
  ORANGE:       0xff6600,
  YELLOW:       0xffdd00,
  CYAN:         0x00ffff,
  BLUE:         0x3399ff,
  BOSS_RED:     0xcc0000,
  MUTED:        0x6b7280,
};

export const CSS_COLORS = {
  GREEN:      '#22c55e',
  GREEN_DARK: '#15803d',
  BG:         '#0a0f0d',
  WHITE:      '#f0fdf4',
  MUTED:      '#86efac',
  RED:        '#ff3333',
  ORANGE:     '#ff6600',
  BOSS:       '#cc0000',
};

// Isometric tile dimensions
export const ISO = {
  TILE_W: 80,
  TILE_H: 40,
  CUBE_H: 40, // height of cube side face
};

// Tower settings
export const TOWER = {
  MAX_HP:         10000,
  BASE_ARMOR:     0.05, // 5% damage reduction
  SHIELD_MAX:     2000,
  SHIELD_REGEN:   20,   // per second
  REPAIR_RATE:    5,    // HP per second (base)
  LEVELS:         5,    // iso cube stack height
  TURRET_SLOTS:   12,   // slots across all faces
};

// Enemy base configs (multiplied by wave scaling)
export const ENEMIES = {
  drone: {
    hp: 80, speed: 130, damage: 8, reward: 3,
    size: 14, color: COLORS.GREEN_LIGHT, spawnCount: 3,
  },
  crawler: {
    hp: 500, speed: 40, damage: 30, reward: 15,
    size: 22, color: COLORS.SILVER, spawnCount: 1,
  },
  hacker: {
    hp: 180, speed: 85, damage: 20, reward: 10,
    size: 18, color: COLORS.CYAN, spawnCount: 1,
  },
  juggernaut: {
    hp: 8000, speed: 22, damage: 150, reward: 250,
    size: 40, color: COLORS.BOSS_RED, spawnCount: 1,
  },
  swarmqueen: {
    hp: 3000, speed: 35, damage: 60, reward: 200,
    size: 35, color: COLORS.ORANGE, spawnCount: 1,
  },
  emp: {
    hp: 250, speed: 70, damage: 0, reward: 12,
    size: 20, color: COLORS.YELLOW, spawnCount: 1,
  },
};

// Turret base configs
export const TURRETS = {
  laser: {
    damage: 45, range: 220, fireRate: 0.85,
    cost: 150, color: COLORS.GREEN, label: 'LASER',
    description: 'Fast single-target. Bread and butter.',
  },
  mortar: {
    damage: 140, range: 300, fireRate: 0.28,
    aoeRadius: 65, cost: 350, color: COLORS.ORANGE, label: 'MORTAR',
    description: 'Slow AoE. Devastates groups.',
  },
  tesla: {
    damage: 70, range: 190, fireRate: 0.55,
    chainTargets: 3, cost: 500, color: COLORS.CYAN, label: 'TESLA',
    description: 'Chains lightning to 3 enemies.',
  },
  freeze: {
    damage: 25, range: 170, fireRate: 1.1,
    freezeDuration: 2200, cost: 280, color: COLORS.BLUE, label: 'FREEZE',
    description: 'Slows enemies. Ice cold.',
  },
  nuke: {
    damage: 1200, range: 380, fireRate: 1/14,
    aoeRadius: 140, cost: 2000, color: COLORS.RED, label: 'NUKE',
    description: 'Massive AoE. Long cooldown.',
  },
};

// Upgrade costs and effects (per level 1-5)
export const UPGRADES = {
  turret_damage:    { costs: [200, 500, 1200, 3000, 8000], mult: [1.25, 1.25, 1.30, 1.35, 1.50] },
  turret_range:     { costs: [150, 350, 800, 2000, 5000],  add:  [20, 20, 25, 30, 40] },
  turret_firerate:  { costs: [180, 420, 1000, 2500, 6000], mult: [1.15, 1.15, 1.20, 1.25, 1.35] },
  tower_hp:         { costs: [300, 700, 1500, 4000, 10000], add: [2000, 3000, 5000, 8000, 15000] },
  tower_armor:      { costs: [400, 900, 2000, 5000, 12000], add: [0.05, 0.05, 0.08, 0.10, 0.12] },
  shield_cap:       { costs: [250, 600, 1400, 3500, 9000],  add: [1000, 1500, 2000, 3000, 5000] },
  shield_regen:     { costs: [200, 450, 1100, 2800, 7000],  add: [10, 15, 20, 30, 50] },
  core_mult:        { costs: [500, 1200, 3000, 7000, 15000], mult: [1.5, 1.5, 2.0, 2.0, 3.0] },
  idle_rate:        { costs: [300, 700, 1800, 4500, 11000], mult: [1.5, 2.0, 2.5, 3.0, 5.0] },
};

// Wave scaling
export const WAVE = {
  BOSS_EVERY: 10,
  HP_SCALE:   0.18,   // enemy HP += base * wave * scale
  COUNT_SCALE: 0.4,   // extra enemies per wave
  SPAWN_DELAY: 800,   // ms between enemies in wave
  REST_TIME:   3000,  // ms between waves
  IDLE_RATE_BASE: 12, // cores per minute idle
  MAX_OFFLINE_HOURS: 8,
};

export const SAVE_KEY = 'tower-game-v1';
