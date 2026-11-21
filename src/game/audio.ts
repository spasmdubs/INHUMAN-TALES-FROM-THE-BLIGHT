class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopBgm();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, volume: number, highpass = 500): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  private jitter(): number {
    return 0.92 + Math.random() * 0.16;
  }

  public playSwing(heavy = false): void {
    const j = this.jitter();
    this.playTone(heavy ? 240 * j : 340 * j, heavy ? 75 : 120, heavy ? 0.11 : 0.07, 'triangle', heavy ? 0.12 : 0.08);
    this.playNoise(heavy ? 0.08 : 0.05, heavy ? 0.09 : 0.05, 1100);
  }

  public playHit(heavy = false): void {
    const j = this.jitter();
    this.playTone(heavy ? 180 * j : 240 * j, 48, heavy ? 0.15 : 0.09, 'square', heavy ? 0.16 : 0.11);
    this.playNoise(heavy ? 0.12 : 0.07, heavy ? 0.18 : 0.12, 320);
  }

  public playJump(): void {
    const j = this.jitter();
    this.playTone(190 * j, 460 * j, 0.13, 'square', 0.08);
  }

  public playLand(): void {
    this.playTone(110, 52, 0.06, 'triangle', 0.07);
  }

  public playDash(): void {
    this.playTone(520, 180, 0.11, 'sawtooth', 0.08);
    this.playNoise(0.08, 0.06, 1500);
  }

  public playSpecial(): void {
    this.playTone(180, 740, 0.18, 'sawtooth', 0.14);
    this.playTone(360, 120, 0.34, 'square', 0.14, 0.08);
    this.playNoise(0.28, 0.16, 400);
  }

  public playTelegraph(): void {
    this.playTone(380, 620, 0.12, 'triangle', 0.07);
  }

  public playEnemyKo(): void {
    this.playTone(260, 52, 0.25, 'sawtooth', 0.15);
    this.playNoise(0.22, 0.15, 260);
  }

  public playPlayerHurt(): void {
    this.playTone(160, 64, 0.18, 'sawtooth', 0.17);
    this.playNoise(0.14, 0.14, 240);
  }

  public playPickup(): void {
    this.playTone(523, 659, 0.08, 'square', 0.08);
    this.playTone(659, 880, 0.11, 'square', 0.08, 0.07);
  }

  public playCrateBreak(): void {
    this.playNoise(0.12, 0.13, 650);
    this.playTone(290, 95, 0.11, 'triangle', 0.1);
  }

  public playSectorClear(): void {
    const notes = [330, 392, 494, 659];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.01, 0.14, 'square', 0.09, idx * 0.09);
    });
  }

  public playCritHit(): void {
    const j = this.jitter();
    this.playTone(320 * j, 82, 0.16, 'sawtooth', 0.17);
    this.playTone(680 * j, 1020 * j, 0.1, 'square', 0.11, 0.02);
    this.playNoise(0.14, 0.18, 420);
  }

  public playPowerUp(): void {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.03, 0.11, 'square', 0.085, idx * 0.055);
    });
  }

  public playLevelUp(): void {
    const notes = [293.66, 369.99, 440, 587.33, 739.99, 880];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.15, 'triangle', 0.11, idx * 0.075);
      this.playTone(n * 0.5, n * 0.5, 0.14, 'square', 0.06, idx * 0.075);
    });
  }

  public playSkillUnlock(): void {
    this.playTone(392, 587.33, 0.1, 'square', 0.09);
    this.playTone(587.33, 783.99, 0.16, 'triangle', 0.1, 0.07);
  }

  public playGameOver(): void {
    const notes = [311, 277, 233, 185];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 0.96, 0.2, 'sawtooth', 0.1, idx * 0.14);
    });
  }

  public startBgm(): void {
    if (this.muted || this.bgmTimer !== null || typeof window === 'undefined') return;
    // Subtle 1987 dark-synthwave bassline in D minor / Phrygian
    const bassLine = [73.42, 73.42, 87.31, 73.42, 110.0, 103.83, 87.31, 65.41];
    this.bgmTimer = window.setInterval(() => {
      if (this.muted) return;
      const freq = bassLine[this.bgmStep % bassLine.length];
      this.bgmStep++;
      this.playTone(freq, freq * 0.98, 0.16, 'sawtooth', 0.032);
    }, 220);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const retroAudio = new RetroAudioEngine();
