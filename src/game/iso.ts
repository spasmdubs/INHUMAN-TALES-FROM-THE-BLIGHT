export interface IsoPoint {
  x: number;
  y: number;
  z?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PillarObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  height: number;
}

// Crisp 2:1 retro pixel isometric tile dimensions in internal 480x270 buffer pixels
export const ISO_TILE_W = 32;
export const ISO_TILE_H = 16;

export function isoToScreen(
  wx: number,
  wy: number,
  wz: number,
  originX: number,
  originY: number
): ScreenPoint {
  return {
    x: originX + (wx - wy) * (ISO_TILE_W * 0.5),
    y: originY + (wx + wy) * (ISO_TILE_H * 0.5) - wz,
  };
}

export function screenToIso(
  sx: number,
  sy: number,
  originX: number,
  originY: number
): { x: number; y: number } {
  const dx = sx - originX;
  const dy = sy - originY;
  const halfW = ISO_TILE_W * 0.5;
  const halfH = ISO_TILE_H * 0.5;
  return {
    x: (dx / halfW + dy / halfH) * 0.5,
    y: (dy / halfH - dx / halfW) * 0.5,
  };
}

/**
 * Converts screen-aligned WASD input vector (screenDx, screenDy) into
 * normalized isometric world-space movement so pressing Right moves right on screen
 * and Up moves up on screen cleanly.
 */
export function screenInputToIsoDir(
  screenDx: number,
  screenDy: number
): { vx: number; vy: number } {
  if (screenDx === 0 && screenDy === 0) {
    return { vx: 0, vy: 0 };
  }
  // In 2:1 iso: screenRight = (+x, -y), screenDown = (+x, +y)
  const rawX = screenDx + screenDy;
  const rawY = screenDy - screenDx;
  const len = Math.hypot(rawX, rawY);
  if (len < 1e-5) return { vx: 0, vy: 0 };
  return { vx: rawX / len, vy: rawY / len };
}

export function depthKey(wx: number, wy: number): number {
  return wx + wy;
}

export function isoDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function clampToArena(
  x: number,
  y: number,
  bounds: ArenaBounds,
  margin = 0.45
): { x: number; y: number } {
  return {
    x: Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, x)),
    y: Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, y)),
  };
}

export function resolvePillarCollisions(
  x: number,
  y: number,
  entityRadius: number,
  pillars: PillarObstacle[]
): { x: number; y: number; collided: boolean } {
  let outX = x;
  let outY = y;
  let collided = false;

  for (const pillar of pillars) {
    const dx = outX - pillar.x;
    const dy = outY - pillar.y;
    const minDist = entityRadius + pillar.radius;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist < 0.0001) {
        outX += minDist;
      } else {
        const push = (minDist - dist) / dist;
        outX += dx * push;
        outY += dy * push;
      }
    }
  }

  return { x: outX, y: outY, collided };
}

export function isTargetInMeleeArc(
  attackerX: number,
  attackerY: number,
  facingX: number,
  facingY: number,
  targetX: number,
  targetY: number,
  range: number,
  minDot = -0.15
): boolean {
  const dx = targetX - attackerX;
  const dy = targetY - attackerY;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 0.45) return true; // Point-blank always connects
  const fLen = Math.hypot(facingX, facingY);
  if (fLen < 1e-5) return true;
  const dot = (dx * facingX + dy * facingY) / (dist * fLen);
  return dot >= minDot;
}
