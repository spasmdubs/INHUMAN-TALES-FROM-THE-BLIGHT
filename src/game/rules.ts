import { ArenaBounds, PillarObstacle, isoDistance } from './iso';

export type AttackKind = 'punch1' | 'punch2' | 'punch3' | 'kick' | 'airkick' | 'special';

export interface AttackSpec {
  kind: AttackKind;
  damage: number;
  knockback: number;
  range: number;
  windup: number;
  active: number;
  recovery: number;
  hitstop: number;
  shake: number;
  astralGain: number;
  astralCost: number;
  isAoe: boolean;
}

export const ATTACK_SPECS: Record<AttackKind, AttackSpec> = {
  punch1: {
    kind: 'punch1',
    damage: 14,
    knockback: 2.2,
    range: 1.55,
    windup: 0.045,
    active: 0.085,
    recovery: 0.11,
    hitstop: 0.032,
    shake: 0.22,
    astralGain: 8,
    astralCost: 0,
    isAoe: false,
  },
  punch2: {
    kind: 'punch2',
    damage: 18,
    knockback: 2.8,
    range: 1.65,
    windup: 0.05,
    active: 0.09,
    recovery: 0.12,
    hitstop: 0.04,
    shake: 0.3,
    astralGain: 10,
    astralCost: 0,
    isAoe: false,
  },
  punch3: {
    kind: 'punch3',
    damage: 28,
    knockback: 6.2,
    range: 1.85,
    windup: 0.07,
    active: 0.11,
    recovery: 0.17,
    hitstop: 0.062,
    shake: 0.55,
    astralGain: 16,
    astralCost: 0,
    isAoe: false,
  },
  kick: {
    kind: 'kick',
    damage: 26,
    knockback: 7.4,
    range: 1.95,
    windup: 0.09,
    active: 0.12,
    recovery: 0.19,
    hitstop: 0.058,
    shake: 0.5,
    astralGain: 14,
    astralCost: 0,
    isAoe: false,
  },
  airkick: {
    kind: 'airkick',
    damage: 24,
    knockback: 5.5,
    range: 1.85,
    windup: 0.04,
    active: 0.18,
    recovery: 0.1,
    hitstop: 0.048,
    shake: 0.42,
    astralGain: 12,
    astralCost: 0,
    isAoe: false,
  },
  special: {
    kind: 'special',
    damage: 48,
    knockback: 9.0,
    range: 3.15,
    windup: 0.08,
    active: 0.2,
    recovery: 0.2,
    hitstop: 0.075,
    shake: 0.8,
    astralGain: 0,
    astralCost: 40,
    isAoe: true,
  },
};

export const COMBO_CHAIN_WINDOW = 0.52;
export const COMBO_DECAY_TIME = 3.2;

export function nextPunchComboStep(
  currentStep: number,
  timeSinceLastPunchEnd: number
): { step: 1 | 2 | 3; kind: AttackKind } {
  if (timeSinceLastPunchEnd <= COMBO_CHAIN_WINDOW) {
    if (currentStep === 1) return { step: 2, kind: 'punch2' };
    if (currentStep === 2) return { step: 3, kind: 'punch3' };
  }
  return { step: 1, kind: 'punch1' };
}

export function applyDamage(currentHp: number, damage: number, invulnTimer: number): number {
  if (invulnTimer > 0 || damage <= 0) return currentHp;
  return Math.max(0, Math.round(currentHp - damage));
}

export function calculateHitScore(basePoints: number, comboCount: number): number {
  const multiplier = 1 + Math.min(4, Math.floor(Math.max(0, comboCount - 1) / 3) * 0.5);
  return Math.round(basePoints * multiplier);
}

export function canCastSpecial(
  serumCharge: number,
  specialCost = ATTACK_SPECS.special.astralCost
): boolean {
  return serumCharge >= specialCost;
}

export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  summary: string;
  enemyHpMult: number;
  enemyDamageMult: number;
  spawnRateMult: number;
  enemySpeedMult: number;
  waveDelaySeconds: number;
  tokenOffset: number;
  scoreMult: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    summary: '0.7x Foe HP · Lighter Waves',
    enemyHpMult: 0.72,
    enemyDamageMult: 0.75,
    spawnRateMult: 0.72,
    enemySpeedMult: 0.9,
    waveDelaySeconds: 2.1,
    tokenOffset: -1,
    scoreMult: 0.85,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    summary: 'Standard Blight Trial',
    enemyHpMult: 1.0,
    enemyDamageMult: 1.0,
    spawnRateMult: 1.0,
    enemySpeedMult: 1.0,
    waveDelaySeconds: 1.55,
    tokenOffset: 0,
    scoreMult: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    summary: '1.45x Foe HP · Relentless Swarms',
    enemyHpMult: 1.45,
    enemyDamageMult: 1.3,
    spawnRateMult: 1.42,
    enemySpeedMult: 1.12,
    waveDelaySeconds: 1.05,
    tokenOffset: 1,
    scoreMult: 1.5,
  },
};

export const DIFFICULTY_LIST: DifficultyConfig[] = [
  DIFFICULTY_CONFIGS.easy,
  DIFFICULTY_CONFIGS.normal,
  DIFFICULTY_CONFIGS.hard,
];

export const DEFEND_DAMAGE_REDUCTION = 0.65;
export const PERFECT_GUARD_WINDOW = 0.26;
export const PERFECT_GUARD_DAMAGE_REDUCTION = 0.82;

export interface DefendedDamageResult {
  finalDamage: number;
  blocked: boolean;
  perfectGuard: boolean;
  reductionPct: number;
}

/**
 * Computes incoming damage after active Defend / Guard mitigation.
 * Standard guard reduces incoming damage by 65%; timing guard within 0.26s reduces by 82%.
 */
export function calculateDefendedDamage(
  rawMitigatedDamage: number,
  defending: boolean,
  guardElapsedSeconds: number
): DefendedDamageResult {
  const base = Math.max(1, Math.round(rawMitigatedDamage));
  if (!defending) {
    return {
      finalDamage: base,
      blocked: false,
      perfectGuard: false,
      reductionPct: 0,
    };
  }
  const perfectGuard = guardElapsedSeconds >= 0 && guardElapsedSeconds <= PERFECT_GUARD_WINDOW;
  const reduction = perfectGuard ? PERFECT_GUARD_DAMAGE_REDUCTION : DEFEND_DAMAGE_REDUCTION;
  const finalDamage = Math.max(1, Math.round(base * (1 - reduction)));
  return {
    finalDamage,
    blocked: true,
    perfectGuard,
    reductionPct: Math.round(reduction * 100),
  };
}

export function scaleEnemyHp(baseHp: number, difficulty: DifficultyId): number {
  return Math.max(10, Math.round(baseHp * DIFFICULTY_CONFIGS[difficulty].enemyHpMult));
}

export function scaleEnemyDamage(baseDamage: number, difficulty: DifficultyId): number {
  return Math.max(4, Math.round(baseDamage * DIFFICULTY_CONFIGS[difficulty].enemyDamageMult));
}

export function scaleWaveSpawns(
  spawns: WaveSpawnEntry[],
  difficulty: DifficultyId
): WaveSpawnEntry[] {
  const mult = DIFFICULTY_CONFIGS[difficulty].spawnRateMult;
  return spawns.map((entry) => {
    if (entry.archetype === 'warden') {
      return { ...entry, count: 1 };
    }
    const scaled = Math.max(1, Math.round(entry.count * mult));
    return { ...entry, count: scaled };
  });
}

export type EnemyArchetype = 'thrall' | 'lancer' | 'hexer' | 'warden';

export interface EnemyArchetypeConfig {
  archetype: EnemyArchetype;
  name: string;
  maxHp: number;
  speed: number;
  attackDamage: number;
  telegraphDuration: number;
  attackCooldown: number;
  preferredRange: number;
  scoreValue: number;
  radius: number;
  isBoss: boolean;
}

export const ENEMY_ARCHETYPES: Record<EnemyArchetype, EnemyArchetypeConfig> = {
  thrall: {
    archetype: 'thrall',
    name: 'Blight Thrall',
    maxHp: 56,
    speed: 2.85,
    attackDamage: 12,
    telegraphDuration: 0.36,
    attackCooldown: 1.35,
    preferredRange: 1.25,
    scoreValue: 150,
    radius: 0.42,
    isBoss: false,
  },
  lancer: {
    archetype: 'lancer',
    name: 'Dread Knight',
    maxHp: 78,
    speed: 3.1,
    attackDamage: 18,
    telegraphDuration: 0.56,
    attackCooldown: 2.2,
    preferredRange: 3.8,
    scoreValue: 260,
    radius: 0.45,
    isBoss: false,
  },
  hexer: {
    archetype: 'hexer',
    name: 'Plague Hexer',
    maxHp: 62,
    speed: 2.35,
    attackDamage: 15,
    telegraphDuration: 0.54,
    attackCooldown: 2.45,
    preferredRange: 4.8,
    scoreValue: 280,
    radius: 0.42,
    isBoss: false,
  },
  warden: {
    archetype: 'warden',
    name: 'Iron Lich Warden',
    maxHp: 320,
    speed: 1.95,
    attackDamage: 24,
    telegraphDuration: 0.68,
    attackCooldown: 2.1,
    preferredRange: 1.9,
    scoreValue: 1500,
    radius: 0.62,
    isBoss: true,
  },
};

export interface WaveSpawnEntry {
  archetype: EnemyArchetype;
  count: number;
}

export interface SectorWave {
  id: string;
  sectorIndex: number;
  sectorName: string;
  waveNumber: number;
  totalWavesInSector: number;
  maxConcurrentTokens: number;
  speedScale: number;
  spawns: WaveSpawnEntry[];
}

export const SECTOR_WAVES: SectorWave[] = [
  {
    id: 's1-w1',
    sectorIndex: 0,
    sectorName: 'ASHEN COURTYARD',
    waveNumber: 1,
    totalWavesInSector: 2,
    maxConcurrentTokens: 2,
    speedScale: 0.94,
    spawns: [{ archetype: 'thrall', count: 3 }],
  },
  {
    id: 's1-w2',
    sectorIndex: 0,
    sectorName: 'ASHEN COURTYARD',
    waveNumber: 2,
    totalWavesInSector: 2,
    maxConcurrentTokens: 2,
    speedScale: 1.0,
    spawns: [
      { archetype: 'thrall', count: 3 },
      { archetype: 'lancer', count: 1 },
    ],
  },
  {
    id: 's2-w1',
    sectorIndex: 1,
    sectorName: 'SCORCHED OSSUARY',
    waveNumber: 1,
    totalWavesInSector: 2,
    maxConcurrentTokens: 3,
    speedScale: 1.06,
    spawns: [
      { archetype: 'thrall', count: 2 },
      { archetype: 'lancer', count: 2 },
      { archetype: 'hexer', count: 1 },
    ],
  },
  {
    id: 's2-w2',
    sectorIndex: 1,
    sectorName: 'SCORCHED OSSUARY',
    waveNumber: 2,
    totalWavesInSector: 2,
    maxConcurrentTokens: 3,
    speedScale: 1.12,
    spawns: [
      { archetype: 'thrall', count: 3 },
      { archetype: 'lancer', count: 2 },
      { archetype: 'hexer', count: 2 },
    ],
  },
  {
    id: 's3-boss',
    sectorIndex: 2,
    sectorName: 'BLIGHTED SANCTUM',
    waveNumber: 1,
    totalWavesInSector: 1,
    maxConcurrentTokens: 3,
    speedScale: 1.15,
    spawns: [
      { archetype: 'warden', count: 1 },
      { archetype: 'thrall', count: 2 },
      { archetype: 'hexer', count: 1 },
    ],
  },
];

export const ARENA_BOUNDS: ArenaBounds = {
  minX: 0,
  maxX: 16,
  minY: 0,
  maxY: 11,
};

export const ARENA_PILLARS: PillarObstacle[] = [
  { id: 'p-nw', x: 4.5, y: 3.0, radius: 0.65, height: 28 },
  { id: 'p-ne', x: 11.5, y: 3.0, radius: 0.65, height: 28 },
  { id: 'p-sw', x: 4.5, y: 8.0, radius: 0.65, height: 28 },
  { id: 'p-se', x: 11.5, y: 8.0, radius: 0.65, height: 28 },
];

export class AttackTokenPool {
  private holders = new Set<string>();
  public capacity: number;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
  }

  setCapacity(capacity: number): void {
    this.capacity = Math.max(1, capacity);
  }

  acquire(enemyId: string): boolean {
    if (this.holders.has(enemyId)) return true;
    if (this.holders.size >= this.capacity) return false;
    this.holders.add(enemyId);
    return true;
  }

  release(enemyId: string): void {
    this.holders.delete(enemyId);
  }

  clear(): void {
    this.holders.clear();
  }

  activeCount(): number {
    return this.holders.size;
  }
}

export interface EnemyIntentInput {
  archetype: EnemyArchetype;
  enemyX: number;
  enemyY: number;
  playerX: number;
  playerY: number;
  flankSide: number;
  cooldown: number;
  hasAttackToken: boolean;
}

export interface EnemyIntentOutput {
  action: 'move' | 'telegraph' | 'retreat';
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
}

export function decideEnemyIntent(input: EnemyIntentInput): EnemyIntentOutput {
  const { archetype, enemyX, enemyY, playerX, playerY, flankSide, cooldown, hasAttackToken } = input;
  const dx = playerX - enemyX;
  const dy = playerY - enemyY;
  const dist = isoDistance(enemyX, enemyY, playerX, playerY);
  const nx = dist > 0.001 ? dx / dist : 1;
  const ny = dist > 0.001 ? dy / dist : 0;

  if (archetype === 'thrall') {
    if (dist <= 1.35 && cooldown <= 0 && hasAttackToken) {
      return { action: 'telegraph', moveX: 0, moveY: 0, aimX: nx, aimY: ny };
    }
    const perpScale = dist > 1.8 ? 0.55 * flankSide : 0;
    const tx = nx - ny * perpScale;
    const ty = ny + nx * perpScale;
    const tLen = Math.hypot(tx, ty) || 1;
    return { action: 'move', moveX: tx / tLen, moveY: ty / tLen, aimX: nx, aimY: ny };
  }

  if (archetype === 'lancer') {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const alignedOnX = absDy < 0.7 && absDx >= 1.5 && absDx <= 5.5;
    const alignedOnY = absDx < 0.7 && absDy >= 1.5 && absDy <= 5.5;

    if ((alignedOnX || alignedOnY) && cooldown <= 0 && hasAttackToken) {
      const aimX = alignedOnX ? Math.sign(dx) : 0;
      const aimY = alignedOnY ? Math.sign(dy) : 0;
      return { action: 'telegraph', moveX: 0, moveY: 0, aimX, aimY };
    }

    let targetX = playerX;
    let targetY = playerY;
    if (absDy < absDx) {
      targetY = playerY;
      targetX = playerX - Math.sign(dx || 1) * 3.4;
    } else {
      targetX = playerX;
      targetY = playerY - Math.sign(dy || 1) * 3.4;
    }
    const mx = targetX - enemyX;
    const my = targetY - enemyY;
    const mLen = Math.hypot(mx, my) || 1;
    return { action: 'move', moveX: mx / mLen, moveY: my / mLen, aimX: nx, aimY: ny };
  }

  if (archetype === 'hexer') {
    if (dist < 2.9) {
      const rx = -nx - ny * 0.35 * flankSide;
      const ry = -ny + nx * 0.35 * flankSide;
      const rLen = Math.hypot(rx, ry) || 1;
      return { action: 'retreat', moveX: rx / rLen, moveY: ry / rLen, aimX: nx, aimY: ny };
    }
    if (dist <= 6.8 && cooldown <= 0 && hasAttackToken) {
      return { action: 'telegraph', moveX: 0, moveY: 0, aimX: nx, aimY: ny };
    }
    if (dist > 5.8) {
      return { action: 'move', moveX: nx, moveY: ny, aimX: nx, aimY: ny };
    }
    const ox = -ny * flankSide;
    const oy = nx * flankSide;
    return { action: 'move', moveX: ox * 0.65, moveY: oy * 0.65, aimX: nx, aimY: ny };
  }

  if (dist <= 2.35 && cooldown <= 0 && hasAttackToken) {
    return { action: 'telegraph', moveX: 0, moveY: 0, aimX: nx, aimY: ny };
  }
  return { action: 'move', moveX: nx, moveY: ny, aimX: nx, aimY: ny };
}
