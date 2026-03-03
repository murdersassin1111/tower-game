import { UPGRADES } from '../config';
import type { UpgradeKey, UpgradeState } from '../types';

export class EconomyManager extends Phaser.Events.EventEmitter {
  cores: number = 0;
  shards: number = 0;
  private upgrades: UpgradeState = {};
  private coreMultiplier: number = 1;

  constructor() { super(); }

  init(cores: number, shards: number, upgrades: UpgradeState) {
    this.cores = cores;
    this.shards = shards;
    this.upgrades = { ...upgrades };
    this.recalcMultipliers();
  }

  earn(amount: number) {
    const total = Math.floor(amount * this.coreMultiplier);
    this.cores += total;
    this.emit('cores-changed', { amount: total, total: this.cores });
    return total;
  }

  spend(amount: number): boolean {
    if (this.cores < amount) return false;
    this.cores -= amount;
    this.emit('cores-changed', { amount: -amount, total: this.cores });
    return true;
  }

  earnShards(amount: number) {
    this.shards += amount;
    this.emit('shards-changed', { amount, total: this.shards });
  }

  getUpgradeLevel(key: UpgradeKey): number {
    return this.upgrades[key] ?? 0;
  }

  canAffordUpgrade(key: UpgradeKey): boolean {
    const level = this.getUpgradeLevel(key);
    const cfg = UPGRADES[key];
    if (!cfg || level >= cfg.costs.length) return false;
    return this.cores >= cfg.costs[level]!;
  }

  buyUpgrade(key: UpgradeKey): boolean {
    const level = this.getUpgradeLevel(key);
    const cfg = UPGRADES[key];
    if (!cfg || level >= cfg.costs.length) return false;
    const cost = cfg.costs[level]!;
    if (!this.spend(cost)) return false;
    this.upgrades[key] = level + 1;
    this.recalcMultipliers();
    this.emit('upgrade-bought', { key, level: level + 1 });
    return true;
  }

  getUpgradeCost(key: UpgradeKey): number {
    const level = this.getUpgradeLevel(key);
    const cfg = UPGRADES[key];
    if (!cfg || level >= cfg.costs.length) return Infinity;
    return cfg.costs[level]!;
  }

  private recalcMultipliers() {
    const coreLevel = this.getUpgradeLevel('core_mult');
    const cfg = UPGRADES['core_mult'];
    let mult = 1;
    for (let i = 0; i < coreLevel; i++) {
      mult *= cfg.mult![i]!;
    }
    this.coreMultiplier = mult;
  }

  getDamageMult(): number {
    const level = this.getUpgradeLevel('turret_damage');
    const cfg = UPGRADES['turret_damage'];
    let mult = 1;
    for (let i = 0; i < level; i++) mult *= cfg.mult![i]!;
    return mult;
  }

  getRangeBonus(): number {
    const level = this.getUpgradeLevel('turret_range');
    const cfg = UPGRADES['turret_range'];
    let bonus = 0;
    for (let i = 0; i < level; i++) bonus += cfg.add![i]!;
    return bonus;
  }

  getIdleRateMult(): number {
    const level = this.getUpgradeLevel('idle_rate');
    const cfg = UPGRADES['idle_rate'];
    let mult = 1;
    for (let i = 0; i < level; i++) mult *= cfg.mult![i]!;
    return mult;
  }

  getArmorBonus(): number {
    const level = this.getUpgradeLevel('tower_armor');
    const cfg = UPGRADES['tower_armor'];
    let bonus = 0;
    for (let i = 0; i < level; i++) bonus += cfg.add![i]!;
    return bonus;
  }

  getShieldBonus(): number {
    const level = this.getUpgradeLevel('shield_cap');
    const cfg = UPGRADES['shield_cap'];
    let bonus = 0;
    for (let i = 0; i < level; i++) bonus += cfg.add![i]!;
    return bonus;
  }

  getShieldRegenBonus(): number {
    const level = this.getUpgradeLevel('shield_regen');
    const cfg = UPGRADES['shield_regen'];
    let bonus = 0;
    for (let i = 0; i < level; i++) bonus += cfg.add![i]!;
    return bonus;
  }

  getHpBonus(): number {
    const level = this.getUpgradeLevel('tower_hp');
    const cfg = UPGRADES['tower_hp'];
    let bonus = 0;
    for (let i = 0; i < level; i++) bonus += cfg.add![i]!;
    return bonus;
  }

  getFireRateMult(): number {
    const level = this.getUpgradeLevel('turret_firerate');
    const cfg = UPGRADES['turret_firerate'];
    let mult = 1;
    for (let i = 0; i < level; i++) mult *= cfg.mult![i]!;
    return mult;
  }

  getState(): { cores: number; shards: number; upgrades: UpgradeState } {
    return { cores: this.cores, shards: this.shards, upgrades: { ...this.upgrades } };
  }
}
