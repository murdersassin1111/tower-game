# TOWER — Game Design Specification

## Concept
Isometric PvE tower defense idle game. Dark green retro-tech aesthetic.
The player owns THE TOWER — an isometric cube stack (matching the Mesquite Manufacturing ad aesthetic).
Waves of enemies attack 24/7. The tower auto-defends even offline (idle mechanics).

## Visual Style
- Deep black background (#0a0f0d)
- Green primary (#22c55e), dark greens for shadows
- Isometric 3D cube geometry — the tower IS the game map
- Retro-tech / terminal UI overlays
- Particle effects: green energy blasts, explosions, shield pulses
- Smooth 60fps animations

## Gameplay Loop
1. Enemies spawn in waves (continuous, never stops)
2. Tower auto-shoots with base turret
3. Player earns "cores" (currency) per kill
4. Spend cores to: upgrade turret, add shield, add turrets, boost speed
5. Offline: time-based idle income + wave simulation
6. Boss waves every 10 levels — unique mechanics

## Tower Structure (Isometric)
- 5-high isometric cube stack (matches the ad visual)
- Each cube level = a defense layer
- Enemies climb UP the tower face
- Player places turrets on cube faces

## Enemy Types
1. Drone — fast, low HP, swarm
2. Crawler — slow, high HP, tank
3. Hacker — bypasses shields, medium
4. Juggernaut — boss, massive HP, AoE damage
5. Swarm Queen — spawns drones on death
6. EMP Burst — disables one turret temporarily

## Turret Types
1. Laser (default) — fast, single target
2. Mortar — AoE, slow reload
3. Tesla — chain lightning, 3 targets
4. Freeze Ray — slows enemies 50%
5. Nuke — massive AoE, long cooldown

## Economy
- Cores: earned per kill, used for upgrades
- Shards: rare drop from bosses, used for premium upgrades
- Idle rate: 10 cores/min base, scales with tower level

## Upgrade Tree
- Turret: Damage / Fire Rate / Range / Multi-shot
- Shield: Capacity / Regen Rate / Reflect
- Tower: HP / Armor / Auto-repair
- Economy: Core multiplier / Idle rate / Shard chance

## Scenes
1. BootScene — preload assets, show logo
2. MenuScene — animated tower, play/settings/leaderboard
3. GameScene — main gameplay
4. UpgradeScene — shop overlay (semi-transparent)
5. BossIntroScene — cinematic boss arrival
6. GameOverScene — tower destroyed

## Mobile
- Touch to place/select turrets
- Swipe to rotate camera (3 angles)
- Pinch to zoom
- Bottom HUD: cores, wave, HP bar
- Side buttons: speed x1/x2/x4, auto-upgrade toggle

## Always-Active
- Server timestamp on save
- On load: calculate offline time
- Simulate waves at 10x speed for offline period
- Show "while you were away" summary
- Max offline time: 8 hours

## Technical
- Phaser 3 + TypeScript
- Canvas renderer (WebGL with fallback)
- Capacitor for iOS/Android
- localStorage for save (+ cloud sync hook for future)
- Target: 60fps on iPhone 12+, Android mid-range 2022+

## File Structure
```
src/
  scenes/         — Phaser scenes
  entities/       — Tower, Enemy, Turret, Projectile classes
  systems/        — WaveManager, EconomyManager, SaveManager, IdleManager
  ui/             — HUD, Shop, BossIntro components
  assets/         — SVG sprite sheets, audio
  utils/          — Isometric math, tweens, helpers
  config.ts       — Game constants
  main.ts         — Entry point
```
