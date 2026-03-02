# Agent Task Assignments

## RULES FOR ALL AGENTS
- Read GAME_SPEC.md first
- TypeScript strict mode
- Phaser 3 API only
- Do NOT import from other agents' files until they exist — use interfaces from src/types.ts
- Commit your work when done: git add -A && git commit -m "agent-N: description"
- Signal completion: openclaw system event --text "Agent N done: summary" --mode now

## Agent 1 — Types & Config (FOUNDATION — do first)
Create src/types.ts (all shared interfaces/enums) and src/config.ts (all game constants).
Also create src/main.ts (Phaser game init) and index.html.

## Agent 2 — Asset Generator
Create src/assets/AssetGenerator.ts — generates ALL game graphics procedurally using Phaser Graphics API.
Tower cubes, enemies (6 types), turrets (5 types), projectiles, particles, UI elements.
All must be rendered to textures in BootScene.

## Agent 3 — Boot & Menu Scenes
src/scenes/BootScene.ts — preload, generate all assets via AssetGenerator, animated logo
src/scenes/MenuScene.ts — animated isometric tower rotating, menu buttons, particle bg

## Agent 4 — Isometric Engine
src/utils/IsoMath.ts — world↔screen conversion, depth sorting, cube rendering helpers
src/utils/DepthSort.ts — z-ordering for isometric sprites
The entire game renders in isometric projection.

## Agent 5 — Tower Entity
src/entities/Tower.ts — the player's tower
- 5-level isometric cube stack
- HP system, armor, shield (visual shield bubble)
- Auto-repair
- Face slots for turrets (each cube face = 1 slot)
- Damage animations (cubes crack, glow red)
- Destruction sequence

## Agent 6 — Enemy System
src/entities/Enemy.ts — base enemy class
src/entities/enemies/ — Drone, Crawler, Hacker, Juggernaut, SwarmQueen, EMPBurst
Each has: HP, speed, damage, reward, death effect, unique behavior
Enemies pathfind UP the tower face (isometric climbing animation)

## Agent 7 — Turret System  
src/entities/Turret.ts — base turret class
src/entities/turrets/ — Laser, Mortar, Tesla, FreezeRay, Nuke
Each has: damage, range, reload, targeting logic, shoot animation
Turrets snap to tower cube faces

## Agent 8 — Projectile & Combat
src/entities/Projectile.ts — base projectile
Laser beam, mortar shell, lightning arc, ice bolt, nuke missile
Hit detection, damage application, AoE splash, status effects (freeze/disable)

## Agent 9 — Wave Manager
src/systems/WaveManager.ts
- Infinite wave generation with scaling difficulty
- Enemy composition tables per wave
- Boss waves every 10 levels
- Spawn positions around tower base
- Wave announcement UI (cinematic text)
- "Endless" — never stops

## Agent 10 — Economy & Save System
src/systems/EconomyManager.ts — cores, shards, earn/spend, multipliers
src/systems/SaveManager.ts — localStorage save/load, versioning
src/systems/IdleManager.ts — offline time calculation, catch-up simulation, "while you were away" popup

## Agent 11 — Upgrade Shop
src/ui/Shop.ts — full upgrade tree UI
Grid layout, locked/unlocked states, cost display, purchase animations
Turret placement UI (drag from shop to tower face)

## Agent 12 — HUD
src/ui/HUD.ts — always-visible game UI
HP bar (tower health), wave counter, cores display, wave timer
Speed buttons (x1/x2/x4), auto-upgrade toggle
Boss health bar (appears during boss waves)
Floating damage numbers

## Agent 13 — Particle System
src/utils/ParticleSystem.ts — reusable particle effects
Green energy hit, explosion (orange+red), shield pulse, core pickup sparkle,
death dissolve (pixels scatter), boss arrival shockwave, laser beam glow

## Agent 14 — Audio System
src/systems/AudioManager.ts — Web Audio API (not Phaser audio — more control)
Procedurally generated 8-bit style sounds: laser shoot, explosion, upgrade ping,
wave start fanfare, boss roar, core pickup, tower hit, shield break
Background: generative dark ambient drone (oscillators)

## Agent 15 — Game Scene (INTEGRATION)
src/scenes/GameScene.ts — main game scene, integrates ALL systems
- Initialize tower, wave manager, economy, HUD
- Update loop: enemies move, turrets shoot, projectiles travel
- Camera: isometric view, touch pan/zoom
- Pause menu
- Game over → GameOverScene

## Agent 16 — Boss System
src/scenes/BossIntroScene.ts — cinematic boss arrival (black screen, boss name, roar)
Boss-specific behaviors: Juggernaut (charge attack), SwarmQueen (spawn waves)
Boss health bar, phase transitions, special death sequence

## Agent 17 — Upgrade Scene & Game Over
src/scenes/UpgradeScene.ts — between-wave upgrade choices (3 random cards)
src/scenes/GameOverScene.ts — tower destroyed, score, restart, share

## Agent 18 — Mobile Controls & Touch
src/utils/TouchControls.ts
- Tap: select/place turret
- Drag: pan camera
- Pinch: zoom
- Long press: turret info
Haptic feedback hooks (Capacitor)

## Agent 19 — Capacitor & App Config
capacitor.config.ts, ios/, android/ config
App icon (1024x1024 green tower), splash screen
App Store metadata: title, description, keywords, screenshots spec
package.json scripts: build, cap sync, cap open ios, cap open android

## Agent 20 — Polish, Balance & Integration QA
Read ALL files. Fix any TypeScript errors. 
Balance: wave scaling, upgrade costs, idle rates.
Add missing transitions, ensure all scenes connect properly.
Final git commit. Run `npm run build` and fix any errors.
Signal: openclaw system event --text "TOWER GAME COMPLETE — build passing" --mode now
