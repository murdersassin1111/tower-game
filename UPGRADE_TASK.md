# Visual & Audio Overhaul Task

The game at /home/ubuntu/tower-game needs a full polish pass. Everything compiles and runs — now make it look and feel great.

## Assets Available

**Images** (already in public/assets/images/):
- enemy-drone.png, enemy-crawler.png, enemy-hacker.png, enemy-juggernaut.png, enemy-emp.png, enemy-swarmqueen.png
- tower-base.png, tower-mid.png, tower-top.png, tower-cannon.png
- turret-laser.png, turret-mortar.png, turret-tesla.png, turret-freeze.png, turret-nuke.png
(All 64x64 Kenney TD kit sprites)

**Audio** (already in public/assets/audio/):
- laser.ogg, mortar.ogg, nuke-launch.ogg, nuke-explode.ogg
- explosion.ogg, hit.ogg, shield.ogg, enemy-die.ogg
- click.ogg, buy.ogg, wave-start.ogg

## Changes Required

### 1. BootScene.ts - Load all assets
Add preload of all images and audio before the game starts.
Use `this.load.image('enemy-drone', 'assets/images/enemy-drone.png')` etc.
Use `this.load.audio('laser', 'assets/audio/laser.ogg')` etc.
Load all 15 images and 11 audio files.

### 2. Enemy.ts - Use sprites instead of Graphics
- Replace `graphics: Phaser.GameObjects.Graphics` with `sprite: Phaser.GameObjects.Image`
- In constructor: `this.sprite = scene.add.image(startX, startY, 'enemy-'+type).setDepth(200).setScale(0.7)`
- Remove all the draw() polygon code
- In update: just update `this.sprite.x = this.x; this.sprite.y = this.y`
- Add rotation: sprite should face direction of movement (`Math.atan2(dy, dx)`)
- Flash on hit: `this.sprite.setTint(0xffffff)` then reset tint after 100ms
- Frozen effect: `this.sprite.setTint(0x88ccff)`
- On death: `this.sprite.destroy()`
- HP bar: draw a small bar above the sprite using Phaser.GameObjects.Graphics (thin, 32px wide)
- Add boss enemies (juggernaut, swarmqueen): setScale(1.1), add glow with `scene.add.image(x,y,'enemy-'+type).setTint(0xff3300).setAlpha(0.4).setScale(1.3).setBlendMode('ADD')`

### 3. Turret.ts - Use sprites + audio
- Replace Graphics with `this.sprite = scene.add.image(x, y, 'turret-'+type).setDepth(300).setScale(0.7)`
- Turrets should rotate to face their target: in fire(), set `this.sprite.setRotation(Math.atan2(dy, dx))`
- In fire(): play audio `this.scene.sound.play('laser', { volume: 0.4, detune: Math.random()*200-100 })`
- Mortar uses 'mortar' audio, tesla uses 'laser' with detune:-600, freeze uses 'shield', nuke uses 'nuke-launch'
- Remove all the draw() polygon switch code

### 4. Tower.ts - Use stacked sprites
- Build tower from 3 stacked Kenney sprites: tower-base, tower-mid, tower-top
- Place them: base at (cx, cy+30), mid at (cx, cy), top at (cx, cy-30)
- Each is scale(0.9)
- When taking damage: red tint flash for 150ms, camera shake 200ms 0.01 intensity
- When playing shield sound: `scene.sound.play('shield', { volume: 0.3 })`
- When HP < 30%: tower sprites get a permanent slight red tint (0xff6666)

### 5. Add AudioManager system (src/systems/AudioManager.ts)
```typescript
export class AudioManager {
  scene: Phaser.Scene;
  muted: boolean = false;
  
  constructor(scene: Phaser.Scene) { this.scene = scene; }
  
  play(key: string, config: { volume?: number; detune?: number; rate?: number } = {}) {
    if (this.muted) return;
    try {
      this.scene.sound.play(key, { volume: config.volume ?? 0.5, detune: config.detune ?? 0, rate: config.rate ?? 1 });
    } catch(e) {}
  }
  
  toggleMute() { this.muted = !this.muted; }
}
```

### 6. Enemy death effects (in Enemy.ts takeDamage when hp <= 0)
```
// Particle burst on death
this.scene.add.particles(this.x, this.y, 'particle-green', {
  speed: { min: 50, max: 150 }, scale: { start: 0.8, end: 0 },
  lifespan: 600, quantity: 8, emitting: false,
}).explode(8, this.x, this.y);
// Play sound (scene.sound.play, try/catch)
```

### 7. WaveManager.ts - Play wave-start sound
When starting a new wave, play: `scene.sound.play('wave-start', { volume: 0.5 })`

### 8. HUD.ts - Add mute button + polish
Add a small mute button [🔊] / [🔇] in top-right corner next to speed buttons.
On click: toggle audio.muted, update icon.

### 9. Shop.ts - Play click/buy sounds on interactions
Button hover: `scene.sound.play('click', { volume: 0.2 })`
Purchase: `scene.sound.play('buy', { volume: 0.5 })`

### 10. GameScene.ts - Wire up AudioManager
```
this.audio = new AudioManager(this);
// Pass to HUD for mute toggle
```
Also on enemy-killed event: `this.audio.play('enemy-die', { volume: 0.3, detune: (Math.random()-0.5)*400 })`
On tower-damaged: `this.audio.play('hit', { volume: 0.5 })`

## Important Notes
- Keep TypeScript compiling! Run `npm run build` to verify.
- Don't break existing game logic — only change rendering/audio
- The game must still run after all changes
- Keep import paths correct
- `scene.sound.play()` needs audio to be loaded in BootScene first

## When done:
1. Run `npm run build` — must succeed with 0 errors
2. Commit: `git add -A && git commit -m "feat: real sprites + audio, full visual polish"`
3. Push: `git push origin master`
4. Deploy to gh-pages: `git checkout gh-pages && cp -r dist/* . && git add -A && git commit -m "deploy: sprites+audio" && git push origin gh-pages --force && git checkout master`
5. Run: `openclaw system event --text "Done: Game upgraded with Kenney sprites + audio, deployed to GitHub Pages" --mode now`
