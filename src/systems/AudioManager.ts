import Phaser from 'phaser';

export class AudioManager {
  scene: Phaser.Scene;
  muted: boolean = false;

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  play(key: string, cfg: { volume?: number; detune?: number; rate?: number } = {}) {
    if (this.muted) return;
    try {
      this.scene.sound.play(key, { volume: cfg.volume ?? 0.5, detune: cfg.detune ?? 0, rate: cfg.rate ?? 1 });
    } catch (_) {}
  }

  toggleMute() { this.muted = !this.muted; return this.muted; }
}
