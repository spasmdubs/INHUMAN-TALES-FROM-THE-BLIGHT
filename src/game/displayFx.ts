import type { CSSProperties } from 'react';

export interface CrtFxSettings {
  enabled: boolean;
  /** Number of horizontal scanlines spanning the viewport height (120–480). */
  scanlineCount: number;
  /** Dark scanline bar opacity percentage (10–85). */
  lineOpacity: number;
  /** Dark band duty cycle percentage within each scanline pitch (20–75). */
  lineThickness: number;
  /** Stage brightness percentage (60–150). */
  brightness: number;
  /** Stage contrast percentage (70–160). */
  contrast: number;
  /** Edge tube vignette intensity percentage (0–85). */
  vignette: number;
  /** Subtle CRT phosphor bloom / warmth percentage (0–100). */
  phosphorGlow: number;
}

export interface LcdFxSettings {
  enabled: boolean;
  /** Virtual horizontal pixel count across the screen (120–480 px). */
  pixelCount: number;
  /** Pixel matrix separator darkness percentage (10–85). */
  gridOpacity: number;
  /** RGB triad subpixel prominence percentage (0–100). */
  subpixelStrength: number;
  /** Stage brightness percentage (60–150). */
  brightness: number;
  /** Stage contrast percentage (70–160). */
  contrast: number;
  /** Color saturation percentage (50–150). */
  saturation: number;
  /** Classic handheld green-amber backlight cast percentage (0–100). */
  backlightTint: number;
}

export interface VhsFxSettings {
  enabled: boolean;
  /** Tracking sweep bar and bottom head-switch distortion intensity (0–100). */
  tracking: number;
  /** Analog tape snow / grain noise opacity (0–100). */
  noise: number;
  /** Horizontal red/cyan chroma bleed & color fringing intensity (0–100). */
  chromaBleed: number;
  /** Subtle horizontal tape flutter / warble intensity (0–100). */
  jitter: number;
  /** Stage brightness percentage (60–150). */
  brightness: number;
  /** Stage contrast percentage (70–160). */
  contrast: number;
  /** Analog tape color saturation percentage (40–140). */
  saturation: number;
}

export interface DisplayFxConfig {
  crt: CrtFxSettings;
  lcd: LcdFxSettings;
  vhs: VhsFxSettings;
}

export type DisplayFxSection = 'crt' | 'lcd' | 'vhs';

export const DISPLAY_FX_STORAGE_KEY = 'blight_display_fx_v1';
const LEGACY_SCANLINES_KEY = 'voidbreaker87_scanlines_v1';
const LEGACY_LCD_KEY = 'voidbreaker87_lcd_v1';

export const DEFAULT_CRT_FX: CrtFxSettings = {
  enabled: true,
  scanlineCount: 240,
  lineOpacity: 36,
  lineThickness: 48,
  brightness: 100,
  contrast: 105,
  vignette: 42,
  phosphorGlow: 20,
};

export const DEFAULT_LCD_FX: LcdFxSettings = {
  enabled: false,
  pixelCount: 300,
  gridOpacity: 36,
  subpixelStrength: 45,
  brightness: 100,
  contrast: 104,
  saturation: 100,
  backlightTint: 15,
};

export const DEFAULT_VHS_FX: VhsFxSettings = {
  enabled: false,
  tracking: 55,
  noise: 42,
  chromaBleed: 50,
  jitter: 35,
  brightness: 102,
  contrast: 112,
  saturation: 86,
};

export const DEFAULT_DISPLAY_FX: DisplayFxConfig = {
  crt: { ...DEFAULT_CRT_FX },
  lcd: { ...DEFAULT_LCD_FX },
  vhs: { ...DEFAULT_VHS_FX },
};

function clampNumber(val: unknown, fallback: number, min: number, max: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

export function clampCrtFx(input?: Partial<CrtFxSettings> | null): CrtFxSettings {
  const src = input ?? {};
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_CRT_FX.enabled,
    scanlineCount: clampNumber(src.scanlineCount, DEFAULT_CRT_FX.scanlineCount, 120, 480),
    lineOpacity: clampNumber(src.lineOpacity, DEFAULT_CRT_FX.lineOpacity, 10, 85),
    lineThickness: clampNumber(src.lineThickness, DEFAULT_CRT_FX.lineThickness, 20, 75),
    brightness: clampNumber(src.brightness, DEFAULT_CRT_FX.brightness, 60, 150),
    contrast: clampNumber(src.contrast, DEFAULT_CRT_FX.contrast, 70, 160),
    vignette: clampNumber(src.vignette, DEFAULT_CRT_FX.vignette, 0, 85),
    phosphorGlow: clampNumber(src.phosphorGlow, DEFAULT_CRT_FX.phosphorGlow, 0, 100),
  };
}

export function clampLcdFx(input?: Partial<LcdFxSettings> | null): LcdFxSettings {
  const src = input ?? {};
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_LCD_FX.enabled,
    pixelCount: clampNumber(src.pixelCount, DEFAULT_LCD_FX.pixelCount, 120, 480),
    gridOpacity: clampNumber(src.gridOpacity, DEFAULT_LCD_FX.gridOpacity, 10, 85),
    subpixelStrength: clampNumber(src.subpixelStrength, DEFAULT_LCD_FX.subpixelStrength, 0, 100),
    brightness: clampNumber(src.brightness, DEFAULT_LCD_FX.brightness, 60, 150),
    contrast: clampNumber(src.contrast, DEFAULT_LCD_FX.contrast, 70, 160),
    saturation: clampNumber(src.saturation, DEFAULT_LCD_FX.saturation, 50, 150),
    backlightTint: clampNumber(src.backlightTint, DEFAULT_LCD_FX.backlightTint, 0, 100),
  };
}

export function clampVhsFx(input?: Partial<VhsFxSettings> | null): VhsFxSettings {
  const src = input ?? {};
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_VHS_FX.enabled,
    tracking: clampNumber(src.tracking, DEFAULT_VHS_FX.tracking, 0, 100),
    noise: clampNumber(src.noise, DEFAULT_VHS_FX.noise, 0, 100),
    chromaBleed: clampNumber(src.chromaBleed, DEFAULT_VHS_FX.chromaBleed, 0, 100),
    jitter: clampNumber(src.jitter, DEFAULT_VHS_FX.jitter, 0, 100),
    brightness: clampNumber(src.brightness, DEFAULT_VHS_FX.brightness, 60, 150),
    contrast: clampNumber(src.contrast, DEFAULT_VHS_FX.contrast, 70, 160),
    saturation: clampNumber(src.saturation, DEFAULT_VHS_FX.saturation, 40, 140),
  };
}

export function sanitizeDisplayFx(
  input?: {
    crt?: Partial<CrtFxSettings> | null;
    lcd?: Partial<LcdFxSettings> | null;
    vhs?: Partial<VhsFxSettings> | null;
  } | null
): DisplayFxConfig {
  return {
    crt: clampCrtFx(input?.crt),
    lcd: clampLcdFx(input?.lcd),
    vhs: clampVhsFx(input?.vhs),
  };
}

export function loadDisplayFxConfig(): DisplayFxConfig {
  try {
    const raw = window.localStorage.getItem(DISPLAY_FX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DisplayFxConfig>;
      return sanitizeDisplayFx(parsed);
    }
    const legacyScanlines = window.localStorage.getItem(LEGACY_SCANLINES_KEY);
    const legacyLcd = window.localStorage.getItem(LEGACY_LCD_KEY);
    return sanitizeDisplayFx({
      crt: {
        ...DEFAULT_CRT_FX,
        enabled: legacyScanlines === null ? DEFAULT_CRT_FX.enabled : legacyScanlines === '1',
      },
      lcd: {
        ...DEFAULT_LCD_FX,
        enabled: legacyLcd === null ? DEFAULT_LCD_FX.enabled : legacyLcd === '1',
      },
      vhs: { ...DEFAULT_VHS_FX },
    });
  } catch {
    return sanitizeDisplayFx(DEFAULT_DISPLAY_FX);
  }
}

export function saveDisplayFxConfig(config: DisplayFxConfig): void {
  try {
    window.localStorage.setItem(DISPLAY_FX_STORAGE_KEY, JSON.stringify(config));
    window.localStorage.setItem(LEGACY_SCANLINES_KEY, config.crt.enabled ? '1' : '0');
    window.localStorage.setItem(LEGACY_LCD_KEY, config.lcd.enabled ? '1' : '0');
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Computes the combined GPU-accelerated CSS `filter` string for the game canvas/stage
 * from all currently active display overlays (CRT, LCD, VHS).
 */
export function computeStageFilterCss(config: DisplayFxConfig): string {
  const crt = clampCrtFx(config.crt);
  const lcd = clampLcdFx(config.lcd);
  const vhs = clampVhsFx(config.vhs);

  if (!crt.enabled && !lcd.enabled && !vhs.enabled) {
    return 'none';
  }

  let brightness = 1;
  let contrast = 1;
  let saturate = 1;
  let sepia = 0;

  if (crt.enabled) {
    brightness *= crt.brightness / 100;
    contrast *= crt.contrast / 100;
    saturate *= 1 + (crt.phosphorGlow / 100) * 0.24;
  }

  if (lcd.enabled) {
    brightness *= lcd.brightness / 100;
    contrast *= lcd.contrast / 100;
    saturate *= lcd.saturation / 100;
  }

  if (vhs.enabled) {
    brightness *= vhs.brightness / 100;
    contrast *= vhs.contrast / 100;
    saturate *= vhs.saturation / 100;
    sepia = Math.min(0.22, 0.04 + (vhs.chromaBleed / 100) * 0.12);
  }

  const clampedBright = Math.max(0.45, Math.min(1.85, brightness));
  const clampedContrast = Math.max(0.55, Math.min(1.95, contrast));
  const clampedSaturate = Math.max(0.3, Math.min(1.8, saturate));

  const parts: string[] = [];
  if (Math.abs(clampedBright - 1) >= 0.005) {
    parts.push(`brightness(${clampedBright.toFixed(2)})`);
  }
  if (Math.abs(clampedContrast - 1) >= 0.005) {
    parts.push(`contrast(${clampedContrast.toFixed(2)})`);
  }
  if (Math.abs(clampedSaturate - 1) >= 0.005) {
    parts.push(`saturate(${clampedSaturate.toFixed(2)})`);
  }
  if (sepia > 0.01) {
    parts.push(`sepia(${sepia.toFixed(2)})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

export type CssVarStyle = CSSProperties & Record<`--${string}`, string>;

/**
 * Maps CRT scanline settings into CSS custom properties consumed by `.crt-scanlines-overlay`.
 */
export function computeCrtOverlayStyle(settings: CrtFxSettings): CssVarStyle {
  const crt = clampCrtFx(settings);
  const clearRatio = Math.max(0.2, Math.min(0.82, (100 - crt.lineThickness) / 100));
  const lineAlpha = (crt.lineOpacity / 100).toFixed(3);
  const vignetteAlpha = (crt.vignette / 100).toFixed(3);
  const glowAlpha = ((crt.phosphorGlow / 100) * 0.14).toFixed(3);
  const vignetteStart = Math.max(48, Math.round(86 - crt.vignette * 0.36));
  const pitchPx = Math.max(1.8, Math.min(9, 900 / crt.scanlineCount));
  const clearPx = pitchPx * clearRatio;

  return {
    '--crt-line-pitch': `${pitchPx.toFixed(2)}px`,
    '--crt-clear-px': `${clearPx.toFixed(2)}px`,
    '--crt-line-alpha': lineAlpha,
    '--crt-vignette-alpha': vignetteAlpha,
    '--crt-vignette-start': `${vignetteStart}%`,
    '--crt-phosphor-alpha': glowAlpha,
  };
}

/**
 * Maps LCD pixel count and subpixel matrix parameters into CSS custom properties
 * consumed by `.lcd-matrix-overlay` using single-pass 1D repeating gradients.
 */
export function computeLcdOverlayStyle(settings: LcdFxSettings): CssVarStyle {
  const lcd = clampLcdFx(settings);
  const gridAlpha = (lcd.gridOpacity / 100).toFixed(3);
  const subpixelAlpha = ((lcd.subpixelStrength / 100) * 0.24).toFixed(3);
  const tintAlpha = ((lcd.backlightTint / 100) * 0.18).toFixed(3);
  const cellPx = Math.max(2.5, Math.min(12, 1440 / lcd.pixelCount));

  return {
    '--lcd-cell-size': `${cellPx.toFixed(2)}px`,
    '--lcd-r-end': `${(cellPx * 0.26).toFixed(2)}px`,
    '--lcd-g-end': `${(cellPx * 0.52).toFixed(2)}px`,
    '--lcd-b-end': `${(cellPx * 0.78).toFixed(2)}px`,
    '--lcd-row-clear': `${(cellPx * 0.76).toFixed(2)}px`,
    '--lcd-grid-alpha': gridAlpha,
    '--lcd-subpixel-alpha': subpixelAlpha,
    '--lcd-tint-alpha': tintAlpha,
  };
}

/**
 * Maps VHS analog tape settings into CSS custom properties consumed by `.vhs-tape-overlay`.
 */
export function computeVhsOverlayStyle(settings: VhsFxSettings): CssVarStyle {
  const vhs = clampVhsFx(settings);
  const trackingAlpha = ((vhs.tracking / 100) * 0.65).toFixed(3);
  const headSwitchAlpha = ((vhs.tracking / 100) * 0.72).toFixed(3);
  const noiseAlpha = ((vhs.noise / 100) * 0.34).toFixed(3);
  const chromaAlpha = ((vhs.chromaBleed / 100) * 0.26).toFixed(3);
  const chromaOffset = `${(1 + (vhs.chromaBleed / 100) * 5).toFixed(1)}px`;
  const jitterPx = `${((vhs.jitter / 100) * 2.6).toFixed(2)}px`;
  const trackingDuration = `${Math.max(2.6, 8.5 - (vhs.tracking / 100) * 4.4).toFixed(2)}s`;

  return {
    '--vhs-tracking-alpha': trackingAlpha,
    '--vhs-head-switch-alpha': headSwitchAlpha,
    '--vhs-noise-alpha': noiseAlpha,
    '--vhs-chroma-alpha': chromaAlpha,
    '--vhs-chroma-offset': chromaOffset,
    '--vhs-jitter-px': jitterPx,
    '--vhs-tracking-duration': trackingDuration,
  };
}
