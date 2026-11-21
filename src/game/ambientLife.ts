import { ArenaBounds, clampToArena } from './iso';
import {
  MazeWallRect,
  ProceduralMaze,
  createSeededRng,
  pickMazeSpawnPoints,
  resolveMazeCollisions,
} from './maze';
import { BiomeId, ROOM_BOUNDS } from './rpg';

export type AmbientCritterKind = 'rat' | 'bat' | 'moth' | 'wisp';

export interface AmbientCritter {
  id: string;
  kind: AmbientCritterKind;
  x: number;
  y: number;
  z: number;
  baseZ: number;
  vx: number;
  vy: number;
  facingLeft: boolean;
  phase: number;
  speed: number;
  turnTimer: number;
  fleeTimer: number;
  homeX: number;
  homeY: number;
  orbitRadius: number;
  color: string;
  accentColor: string;
}

const BIOME_AMBIENT_PALETTE: Record<
  BiomeId,
  { wisp: string; wispAccent: string; moth: string; bat: string }
> = {
  promenade: {
    wisp: '#F59E0B',
    wispAccent: '#FEF08A',
    moth: '#D6D3D1',
    bat: '#443742',
  },
  crucible: {
    wisp: '#FB923C',
    wispAccent: '#FEF08A',
    moth: '#FDBA74',
    bat: '#4A2525',
  },
  wilds: {
    wisp: '#84CC16',
    wispAccent: '#ECFCCB',
    moth: '#BEF264',
    bat: '#2E3B2B',
  },
  throne: {
    wisp: '#F43F5E',
    wispAccent: '#FDA4AF',
    moth: '#E2C2D2',
    bat: '#3B1E2E',
  },
};

/**
 * Deterministically populates a dungeon chamber with animated dark-fantasy ambient life
 * (crypt rats, blight bats, bone moths, and drifting wasteland spore wisps).
 */
export function createRoomAmbientLife(
  roomNumber: number,
  seed: number,
  maze: ProceduralMaze,
  biomeId: BiomeId,
  bounds: ArenaBounds = ROOM_BOUNDS
): AmbientCritter[] {
  const rng = createSeededRng((seed ^ (roomNumber * 2654435761)) >>> 0);
  const palette = BIOME_AMBIENT_PALETTE[biomeId];
  const ratCount = 3 + Math.floor(rng() * 2); // 3..4 scurrying crypt rats
  const batCount = 2 + Math.floor(rng() * 2); // 2..3 fluttering blight bats
  const mothCount = 2 + Math.floor(rng() * 2); // 2..3 bone/ash moths
  const wispCount = 3 + Math.floor(rng() * 2); // 3..4 glowing spore wisps
  const total = ratCount + batCount + mothCount + wispCount;

  const spawnPts = pickMazeSpawnPoints(maze, [], total, seed + 511, 1.0, bounds);
  const critters: AmbientCritter[] = [];

  const pushCritter = (kind: AmbientCritterKind, idx: number) => {
    const pt = spawnPts[idx] ?? {
      x: bounds.minX + 2 + rng() * (bounds.maxX - bounds.minX - 4),
      y: bounds.minY + 2 + rng() * (bounds.maxY - bounds.minY - 4),
    };
    const angle = rng() * Math.PI * 2;
    const phase = rng() * Math.PI * 2;

    if (kind === 'rat') {
      const speed = 1.45 + rng() * 0.75;
      critters.push({
        id: `amb_r${roomNumber}_rat_${idx}`,
        kind,
        x: pt.x,
        y: pt.y,
        z: 0,
        baseZ: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        facingLeft: Math.cos(angle) < 0,
        phase,
        speed,
        turnTimer: 0.7 + rng() * 1.9,
        fleeTimer: 0,
        homeX: pt.x,
        homeY: pt.y,
        orbitRadius: 2.2,
        color: '#57534E',
        accentColor: '#EF4444',
      });
    } else if (kind === 'bat') {
      const baseZ = 20 + rng() * 14;
      const speed = 1.85 + rng() * 0.85;
      critters.push({
        id: `amb_r${roomNumber}_bat_${idx}`,
        kind,
        x: pt.x,
        y: pt.y,
        z: baseZ,
        baseZ,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        facingLeft: Math.cos(angle) < 0,
        phase,
        speed,
        turnTimer: 1.2 + rng() * 1.8,
        fleeTimer: 0,
        homeX: pt.x,
        homeY: pt.y,
        orbitRadius: 2.6 + rng() * 2.2,
        color: palette.bat,
        accentColor: '#F59E0B',
      });
    } else if (kind === 'moth') {
      const baseZ = 12 + rng() * 12;
      const speed = 1.15 + rng() * 0.55;
      critters.push({
        id: `amb_r${roomNumber}_moth_${idx}`,
        kind,
        x: pt.x,
        y: pt.y,
        z: baseZ,
        baseZ,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        facingLeft: Math.cos(angle) < 0,
        phase,
        speed,
        turnTimer: 0.8 + rng() * 1.5,
        fleeTimer: 0,
        homeX: pt.x,
        homeY: pt.y,
        orbitRadius: 1.7 + rng() * 1.4,
        color: palette.moth,
        accentColor: '#FDE68A',
      });
    } else {
      const baseZ = 9 + rng() * 15;
      const speed = 0.55 + rng() * 0.4;
      critters.push({
        id: `amb_r${roomNumber}_wisp_${idx}`,
        kind,
        x: pt.x,
        y: pt.y,
        z: baseZ,
        baseZ,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        facingLeft: false,
        phase,
        speed,
        turnTimer: 1.6 + rng() * 2.4,
        fleeTimer: 0,
        homeX: pt.x,
        homeY: pt.y,
        orbitRadius: 1.6 + rng() * 1.6,
        color: palette.wisp,
        accentColor: palette.wispAccent,
      });
    }
  };

  let cursor = 0;
  for (let i = 0; i < ratCount; i++) pushCritter('rat', cursor++);
  for (let i = 0; i < batCount; i++) pushCritter('bat', cursor++);
  for (let i = 0; i < mothCount; i++) pushCritter('moth', cursor++);
  for (let i = 0; i < wispCount; i++) pushCritter('wisp', cursor++);

  return critters;
}

/**
 * Advances all ambient creatures smoothly for one frame.
 * Ground rats respect maze walls and scurry away from Inhuman; flying bats, moths,
 * and spore wisps weave organically through the chamber air.
 */
export function stepAmbientCritters(
  critters: AmbientCritter[],
  dt: number,
  time: number,
  playerX: number,
  playerY: number,
  activeWalls: MazeWallRect[],
  bounds: ArenaBounds = ROOM_BOUNDS
): void {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  for (let i = 0; i < critters.length; i++) {
    const c = critters[i];
    c.phase += safeDt * (c.kind === 'bat' ? 14 : c.kind === 'moth' ? 18 : c.kind === 'rat' ? 11 : 4.2);

    if (c.kind === 'rat') {
      const dxP = c.x - playerX;
      const dyP = c.y - playerY;
      const distP = Math.hypot(dxP, dyP);

      if (distP < 2.85 && distP > 0.01) {
        // Scurry rapidly away when Inhuman steps close
        const fleeSpeed = c.speed * 2.15;
        c.vx = (dxP / distP) * fleeSpeed;
        c.vy = (dyP / distP) * fleeSpeed;
        c.fleeTimer = 0.65;
      } else {
        c.fleeTimer = Math.max(0, c.fleeTimer - safeDt);
        c.turnTimer -= safeDt;
        if (c.turnTimer <= 0) {
          c.turnTimer = 0.8 + ((Math.sin(time * 2.7 + i * 3.1) + 1) * 0.9);
          // Alternate between brief sniffing pauses and darting scurries
          const pause = Math.sin(time * 1.9 + i * 4.3) > 0.52;
          if (pause) {
            c.vx = 0;
            c.vy = 0;
          } else {
            const ang = Math.atan2(c.vy, c.vx) + Math.sin(time * 3.7 + i * 2.1) * 1.65;
            c.vx = Math.cos(ang) * c.speed;
            c.vy = Math.sin(ang) * c.speed;
          }
        }
      }

      const nextX = c.x + c.vx * safeDt;
      const nextY = c.y + c.vy * safeDt;
      const clamped = clampToArena(nextX, nextY, bounds, 0.72);
      const resolved = resolveMazeCollisions(clamped.x, clamped.y, 0.22, activeWalls);

      if (resolved.collided || Math.abs(clamped.x - nextX) > 0.01 || Math.abs(clamped.y - nextY) > 0.01) {
        // Bounce cleanly along the corridor when hitting a stone wall
        const bounceAng = Math.atan2(-c.vy, -c.vx) + 0.85;
        c.vx = Math.cos(bounceAng) * c.speed;
        c.vy = Math.sin(bounceAng) * c.speed;
      }

      c.x = resolved.x;
      c.y = resolved.y;
      c.z = 0;
      if (Math.abs(c.vx) > 0.08) {
        c.facingLeft = c.vx < 0;
      }
      continue;
    }

    // Airborne ambient life (bat, moth, wisp): smooth figure-8 / wandering loops aloft
    const freq = c.kind === 'bat' ? 0.62 : c.kind === 'moth' ? 0.95 : 0.42;
    const t = time * freq + i * 1.37;
    const targetX = c.homeX + Math.cos(t) * c.orbitRadius;
    const targetY = c.homeY + Math.sin(t * (c.kind === 'bat' ? 2 : 1.3)) * (c.orbitRadius * 0.65);

    const dxT = targetX - c.x;
    const dyT = targetY - c.y;
    const steer = c.kind === 'bat' ? 3.2 : c.kind === 'moth' ? 4.4 : 1.9;
    c.vx += (dxT * steer - c.vx) * Math.min(1, safeDt * 2.6);
    c.vy += (dyT * steer - c.vy) * Math.min(1, safeDt * 2.6);

    const clamped = clampToArena(c.x + c.vx * safeDt, c.y + c.vy * safeDt, bounds, 0.9);
    c.x = clamped.x;
    c.y = clamped.y;

    const bobAmp = c.kind === 'bat' ? 4.5 : c.kind === 'moth' ? 3.2 : 3.8;
    c.z = c.baseZ + Math.sin(time * (c.kind === 'wisp' ? 2.4 : 4.6) + i * 1.9) * bobAmp;
    if (Math.abs(c.vx) > 0.05) {
      c.facingLeft = c.vx < 0;
    }
  }
}
