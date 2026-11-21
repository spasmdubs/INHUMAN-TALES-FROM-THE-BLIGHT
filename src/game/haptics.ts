export type HapticPatternId =
  | 'lightHit'
  | 'heavyHit'
  | 'critHit'
  | 'special'
  | 'playerHurt'
  | 'pickup'
  | 'powerUp'
  | 'levelUp'
  | 'waveClear'
  | 'enemyKo'
  | 'dash'
  | 'gameOver';

interface FeedbackProfile {
  vibrate: number | number[];
  rumbleDuration: number;
  weakMagnitude: number;
  strongMagnitude: number;
}

const FEEDBACK_PROFILES: Record<HapticPatternId, FeedbackProfile> = {
  lightHit: {
    vibrate: 14,
    rumbleDuration: 55,
    weakMagnitude: 0.25,
    strongMagnitude: 0.1,
  },
  heavyHit: {
    vibrate: [28, 16, 34],
    rumbleDuration: 120,
    weakMagnitude: 0.55,
    strongMagnitude: 0.45,
  },
  critHit: {
    vibrate: [22, 12, 46],
    rumbleDuration: 145,
    weakMagnitude: 0.72,
    strongMagnitude: 0.65,
  },
  special: {
    vibrate: [48, 22, 72],
    rumbleDuration: 260,
    weakMagnitude: 0.85,
    strongMagnitude: 0.9,
  },
  playerHurt: {
    vibrate: [58, 24, 48],
    rumbleDuration: 185,
    weakMagnitude: 0.65,
    strongMagnitude: 0.82,
  },
  pickup: {
    vibrate: 18,
    rumbleDuration: 60,
    weakMagnitude: 0.22,
    strongMagnitude: 0.08,
  },
  powerUp: {
    vibrate: [20, 18, 32],
    rumbleDuration: 130,
    weakMagnitude: 0.48,
    strongMagnitude: 0.28,
  },
  levelUp: {
    vibrate: [26, 18, 26, 18, 52],
    rumbleDuration: 220,
    weakMagnitude: 0.68,
    strongMagnitude: 0.52,
  },
  waveClear: {
    vibrate: [24, 20, 42],
    rumbleDuration: 170,
    weakMagnitude: 0.52,
    strongMagnitude: 0.35,
  },
  enemyKo: {
    vibrate: [24, 14, 30],
    rumbleDuration: 110,
    weakMagnitude: 0.5,
    strongMagnitude: 0.4,
  },
  dash: {
    vibrate: 12,
    rumbleDuration: 45,
    weakMagnitude: 0.18,
    strongMagnitude: 0.06,
  },
  gameOver: {
    vibrate: [95, 40, 130],
    rumbleDuration: 360,
    weakMagnitude: 0.8,
    strongMagnitude: 0.95,
  },
};

const HAPTICS_STORAGE_KEY = 'voidbreaker87_haptics_v1';

interface DualRumbleActuator {
  playEffect?: (
    type: 'dual-rumble',
    params: {
      startDelay: number;
      duration: number;
      weakMagnitude: number;
      strongMagnitude: number;
    }
  ) => Promise<string> | void;
  pulse?: (value: number, duration: number) => Promise<boolean> | void;
}

interface ExtendedGamepad extends Omit<Gamepad, 'vibrationActuator'> {
  vibrationActuator?: DualRumbleActuator | null;
  hapticActuators?: DualRumbleActuator[];
}

class HapticRumbleEngine {
  private enabled = true;
  private lastTriggerAt = 0;

  constructor() {
    this.enabled = this.loadPreference();
  }

  private loadPreference(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
      if (stored === '0') return false;
      return true;
    } catch {
      return true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(HAPTICS_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.trigger('pickup');
    }
    return this.enabled;
  }

  public trigger(pattern: HapticPatternId, intensityScale = 1): void {
    if (!this.enabled || typeof navigator === 'undefined') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Prevent overlapping rapid-fire micro-vibrations from saturating mobile motors
    if (now - this.lastTriggerAt < 28 && pattern === 'lightHit') return;
    this.lastTriggerAt = now;

    const profile = FEEDBACK_PROFILES[pattern];
    const scale = Math.max(0.4, Math.min(1.35, intensityScale));

    // 1. Mobile / Tablet Haptic Feedback via Vibration API
    try {
      if (typeof navigator.vibrate === 'function') {
        if (Array.isArray(profile.vibrate)) {
          navigator.vibrate(profile.vibrate.map((ms) => Math.max(8, Math.round(ms * scale))));
        } else {
          navigator.vibrate(Math.max(8, Math.round(profile.vibrate * scale)));
        }
      }
    } catch {
      // Ignore unsupported browsers or blocked vibration calls
    }

    // 2. Gamepad Dual-Rumble Feedback
    try {
      if (typeof navigator.getGamepads === 'function') {
        const pads = navigator.getGamepads();
        for (const rawPad of pads) {
          if (!rawPad || !rawPad.connected) continue;
          const pad = rawPad as ExtendedGamepad;
          const weak = Math.min(1, profile.weakMagnitude * scale);
          const strong = Math.min(1, profile.strongMagnitude * scale);
          const duration = Math.round(profile.rumbleDuration * scale);

          if (pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === 'function') {
            pad.vibrationActuator.playEffect('dual-rumble', {
              startDelay: 0,
              duration,
              weakMagnitude: weak,
              strongMagnitude: strong,
            });
          } else if (pad.hapticActuators && pad.hapticActuators.length > 0) {
            const first = pad.hapticActuators[0];
            if (first && typeof first.pulse === 'function') {
              first.pulse(Math.max(weak, strong), duration);
            }
          }
        }
      }
    } catch {
      // Ignore gamepad API permission restrictions
    }
  }
}

export const hapticsEngine = new HapticRumbleEngine();
