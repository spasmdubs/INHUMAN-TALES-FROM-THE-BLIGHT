export type TouchControlId = 'dpad' | 'attack1' | 'defend' | 'potion' | 'dash' | 'special';

export interface TouchControlCoord {
  /** Normalized horizontal viewport percentage (0..100) */
  x: number;
  /** Normalized vertical viewport percentage (0..100) */
  y: number;
}

export type TouchLayoutMap = Record<TouchControlId, TouchControlCoord>;

export interface TouchControlsStyle {
  /** Uniform scale multiplier for touch controls (0.65..1.45) */
  scale: number;
  /** Opacity for touch controls overlay (0.20..1.00) */
  opacity: number;
}

export const TOUCH_SCALE_MIN = 0.65;
export const TOUCH_SCALE_MAX = 1.45;
export const TOUCH_SCALE_DEFAULT = 1.0;

export const TOUCH_OPACITY_MIN = 0.2;
export const TOUCH_OPACITY_MAX = 1.0;
export const TOUCH_OPACITY_DEFAULT = 0.9;

export const DEFAULT_TOUCH_STYLE: TouchControlsStyle = {
  scale: TOUCH_SCALE_DEFAULT,
  opacity: TOUCH_OPACITY_DEFAULT,
};

export const DEFAULT_TOUCH_LAYOUT: TouchLayoutMap = {
  dpad: { x: 19, y: 78 },
  attack1: { x: 75, y: 80 },
  defend: { x: 89, y: 70 },
  potion: { x: 89, y: 85 },
  dash: { x: 64, y: 69 },
  special: { x: 78, y: 60 },
};

const TOUCH_LAYOUT_KEY = 'voidbreaker87_touch_layout_v1';
const TOUCH_STYLE_KEY = 'blight_touch_style_v1';

export function clampTouchCoord(coord: TouchControlCoord): TouchControlCoord {
  return {
    x: Math.max(7, Math.min(93, Math.round(coord.x * 10) / 10)),
    y: Math.max(16, Math.min(91, Math.round(coord.y * 10) / 10)),
  };
}

export function clampTouchScale(scale: number): number {
  if (!Number.isFinite(scale)) return TOUCH_SCALE_DEFAULT;
  return Math.max(TOUCH_SCALE_MIN, Math.min(TOUCH_SCALE_MAX, Math.round(scale * 100) / 100));
}

export function clampTouchOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) return TOUCH_OPACITY_DEFAULT;
  return Math.max(
    TOUCH_OPACITY_MIN,
    Math.min(TOUCH_OPACITY_MAX, Math.round(opacity * 100) / 100)
  );
}

export function loadTouchLayout(): TouchLayoutMap {
  try {
    const raw = window.localStorage.getItem(TOUCH_LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_TOUCH_LAYOUT };
    const parsed = JSON.parse(raw) as Partial<TouchLayoutMap> & {
      jump?: TouchControlCoord;
      punch?: TouchControlCoord;
      kick?: TouchControlCoord;
    };
    const merged: TouchLayoutMap = { ...DEFAULT_TOUCH_LAYOUT };
    (Object.keys(DEFAULT_TOUCH_LAYOUT) as TouchControlId[]).forEach((id) => {
      const candidate =
        id === 'potion'
          ? parsed.potion ?? parsed.jump
          : id === 'attack1'
            ? parsed.attack1 ?? parsed.punch
            : id === 'defend'
              ? parsed.defend ?? parsed.kick
              : parsed[id];
      if (
        candidate &&
        typeof candidate.x === 'number' &&
        typeof candidate.y === 'number' &&
        Number.isFinite(candidate.x) &&
        Number.isFinite(candidate.y)
      ) {
        merged[id] = clampTouchCoord(candidate);
      }
    });
    return merged;
  } catch {
    return { ...DEFAULT_TOUCH_LAYOUT };
  }
}

export function saveTouchLayout(layout: TouchLayoutMap): void {
  try {
    window.localStorage.setItem(TOUCH_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // ignore quota errors
  }
}

export function loadTouchControlsStyle(): TouchControlsStyle {
  try {
    const raw = window.localStorage.getItem(TOUCH_STYLE_KEY);
    if (!raw) return { ...DEFAULT_TOUCH_STYLE };
    const parsed = JSON.parse(raw) as Partial<TouchControlsStyle>;
    return {
      scale: clampTouchScale(typeof parsed.scale === 'number' ? parsed.scale : TOUCH_SCALE_DEFAULT),
      opacity: clampTouchOpacity(
        typeof parsed.opacity === 'number' ? parsed.opacity : TOUCH_OPACITY_DEFAULT
      ),
    };
  } catch {
    return { ...DEFAULT_TOUCH_STYLE };
  }
}

export function saveTouchControlsStyle(style: TouchControlsStyle): void {
  try {
    window.localStorage.setItem(
      TOUCH_STYLE_KEY,
      JSON.stringify({
        scale: clampTouchScale(style.scale),
        opacity: clampTouchOpacity(style.opacity),
      })
    );
  } catch {
    // ignore quota errors
  }
}

export function detectTouchOrTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches);
  const hasTouchPoints =
    typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
  const tabletOrPhoneWidth = window.innerWidth <= 1024;
  return coarsePointer || hasTouchPoints || tabletOrPhoneWidth;
}
