import { CharacterConfig, HERO_NAME, getFighterClass } from './character';
import {
  ATTACK_SPECS,
  AttackKind,
  AttackTokenPool,
  COMBO_DECAY_TIME,
  DIFFICULTY_CONFIGS,
  DifficultyId,
  ENEMY_ARCHETYPES,
  EnemyArchetype,
  applyDamage,
  calculateDefendedDamage,
  calculateHitScore,
  decideEnemyIntent,
  nextPunchComboStep,
} from './rules';
import {
  BiomeId,
  CombatLogCategory,
  CombatLogEntry,
  ComboRankInfo,
  DUNGEON_ROOMS,
  DUNGEON_ROOM_LIST,
  DungeonRoomDef,
  DungeonRoomId,
  EffectiveRpgStats,
  EquipSlot,
  EquippedGearMap,
  FIXED_CONSUMABLE_GOLD_VALUE,
  InventoryItem,
  PowerUpDropSpec,
  PowerUpStackTotals,
  RARITY_META,
  RETURN_DOOR_DIR,
  RETURN_DOOR_POS,
  ROOM_BOUNDS,
  ROOM_ENTRY_SPAWN_POS,
  ROOM_RETURN_NORTH_SPAWN_POS,
  ROOMS_PER_BOSS_CYCLE,
  SERUM_PRESET_COST_PER_CAST,
  SERUM_PRESETS_MAX,
  SHOPKEEPER_GREETING,
  SINGLE_EXIT_DOOR_DIR,
  SINGLE_EXIT_DOOR_POS,
  SerumState,
  SkillRankMap,
  TOTAL_DUNGEON_ROOMS,
  TOTAL_DUNGEON_WINGS,
  WeaponVisualKind,
  appendCombatLog,
  applyPowerUpToStacks,
  applySerumCast,
  canActivateSerum,
  canReturnToPreviousRoom,
  canUnlockSkill,
  computeEffectiveRpgStats,
  computeEffectiveSerumPotency,
  computeKeyDropChance,
  consumeSerumPresets,
  createEmptyPowerUpStacks,
  createInitialSerumState,
  createStarterEquipped,
  createStarterInventory,
  createWavePowerUp,
  generateGearDrop,
  generateWaveSpec,
  getBossHealthMeta,
  getComboRank,
  getComboVfxProfile,
  getDungeonRoom,
  getRoomProgressionInfo,
  getSerumPresetPower,
  getSerumStatusLabel,
  getWeaponAttackProfile,
  getWeaponVisualKind,
  isBossRoomNumber,
  isComboMilestone,
  isShopkeeperAllowed,
  purchaseHealingPotion,
  purchasePresetFile,
  sellItemForGold,
  shouldSpawnShopkeeperForPlayerLevel,
  shouldSpawnShopkeeperForRoom,
  tickSerumRecovery,
  xpRequiredForLevel,
} from './rpg';
import {
  ISO_TILE_H,
  ISO_TILE_W,
  clampToArena,
  depthKey,
  isTargetInMeleeArc,
  isoDistance,
  isoToScreen,
  screenInputToIsoDir,
} from './iso';
import {
  ProceduralMaze,
  findMazeNextWaypoint,
  findNearbyLockedMazeDoor,
  generateProceduralMaze,
  getActiveMazeWalls,
  isPointInMazeWall,
  pickMazeSpawnPoints,
  resolveMazeCollisions,
  unlockMazeDoor,
} from './maze';
import {
  SpriteAnimPose,
  drawAmbientCritterSprite,
  drawComboAfterimage,
  drawComboAura,
  drawComboSlashVfx,
  drawCrystalCrate,
  drawDungeonArchway,
  drawEnemyPixelSprite,
  drawGearLootSprite,
  drawHeroPixelSprite,
  drawIsoMazeWall,
  drawIsometricShadow,
  drawKeyPickupSprite,
  drawLevelUpAura,
  drawMazeShortcutDoor,
  drawPickupSprite,
  drawPowerUpOrb,
  drawPresetCollectible,
  drawShopkeeperSprite,
  drawWorldShrine,
} from './pixelSprites';
import { AmbientCritter, createRoomAmbientLife, stepAmbientCritters } from './ambientLife';
import { retroAudio } from './audio';
import { hapticsEngine } from './haptics';
import {
  GameSaveData,
  SAVE_SCHEMA_VERSION,
  ShortcutPromptDecisionState,
  evaluateShortcutPromptState,
} from './saves';

export type EnginePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface NearbyShortcutPrompt {
  doorId: string;
  hasKey: boolean;
  keysHeld: number;
}

export interface MinimapDot {
  x: number; // 0..1 normalized inside current dungeon room
  y: number;
  kind: 'player' | 'enemy' | 'boss' | 'loot' | 'shrine' | 'crate' | 'preset' | 'merchant';
}

export interface HudSnapshot {
  phase: EnginePhase;
  difficulty: DifficultyId;
  fighterClassLabel: string;
  specialCost: number;
  hp: number;
  maxHp: number;
  astral: number;
  maxAstral: number;
  serumPotency: number; // 0..1 tolerance potency (weakens on rapid use, recharges when unused)
  serumEffectivePower: number; // 0..1 combined (presets/10 * serumPotency)
  serumStatus: string;
  presetsCollected: number;
  presetsMax: number;
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  comboTimerRatio: number; // 0..1 live draining meter
  comboRank: ComboRankInfo;
  comboTier: number;
  comboHitSeq: number;
  comboRankUpSeq: number;
  comboMilestoneLabel: string | null;
  comboMilestoneActive: boolean;
  sectorIndex: number;
  totalSectors: number;
  sectorName: string;
  biomeId: BiomeId;
  biomeSubtitle: string;
  currentRoomId: DungeonRoomId;
  visitedRooms: DungeonRoomId[];
  clearedRooms: DungeonRoomId[];
  roomLocked: boolean;
  roomsCleared: number;
  dungeonDepth: number;
  roomTotalEnemies: number;
  nearbyDoorLabel: string | null;
  nearbyReturnDoor: boolean;
  canReturnPreviousRoom: boolean;
  ambientCritterCount: number;
  nearbyShortcutPrompt: NearbyShortcutPrompt | null;
  waveNumber: number;
  totalWavesInSector: number;
  waveThreatPct: number;
  enemiesRemaining: number;
  defeatedTotal: number;
  elapsedSeconds: number;
  damageTaken: number;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  bossTrailHp: number;
  bossHitSeq: number;
  bossPhaseLabel: string | null;
  bossHpPct: number;
  bossBarColor: string;
  bannerText: string | null;
  muted: boolean;
  hapticsEnabled: boolean;
  screenShakeEnabled: boolean;
  // 666-room evenly distributed progression, Skeleton Keys & Combat Log
  roomNumber: number;
  totalRooms: number;
  wingNumber: number;
  totalWings: number;
  stepInWing: number;
  cycleLength: number;
  isBossRoom: boolean;
  keys: number;
  lockedShortcutsRemaining: number;
  combatLog: CombatLogEntry[];
  // Dark-fantasy RPG progression, stacking power-ups, inventory & skill tree
  level: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  skillPointGrantSeq: number;
  levelUpAnimTimer: number;
  levelUpAnimDuration: number;
  levelUpAnimLevel: number;
  levelUpEventSeq: number;
  gold: number;
  shopkeeperPresent: boolean;
  nearbyShopkeeper: boolean;
  astralShards: number;
  powerUpStacks: PowerUpStackTotals;
  equipped: EquippedGearMap;
  equippedWeaponKind: WeaponVisualKind;
  equippedWeaponName: string;
  defending: boolean;
  inventory: InventoryItem[];
  skillRanks: SkillRankMap;
  effectiveStats: EffectiveRpgStats;
  medkitCount: number;
  minimapDots: MinimapDot[];
}

interface PlayerEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingX: number;
  facingY: number;
  facingLeft: boolean;
  hp: number;
  maxHp: number;
  astral: number;
  maxAstral: number;
  invulnTimer: number;
  hitFlashTimer: number;
  attackKind: AttackKind | null;
  attackTimer: number;
  attackHasHit: Set<string>;
  comboStep: number;
  timeSincePunchEnd: number;
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirY: number;
  defending: boolean;
  defendHeldTouch: boolean;
  defendMinTimer: number;
  defendDuration: number;
  hurtTimer: number;
  walkPhase: number;
  scaleX: number;
  scaleY: number;
  coyoteTimer: number;
}

interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingLeft: boolean;
  hp: number;
  maxHp: number;
  attackDamage: number;
  attackCooldown: number;
  radius: number;
  speed: number;
  flankSide: number;
  cooldown: number;
  state: 'idle' | 'telegraph' | 'attack' | 'hurt' | 'ko';
  stateTimer: number;
  telegraphMax: number;
  aimX: number;
  aimY: number;
  attackApplied: boolean;
  hitFlashTimer: number;
  walkPhase: number;
  scaleX: number;
  scaleY: number;
  xpValue: number;
  scoreValue: number;
}

interface CrateEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hitFlashTimer: number;
  broken: boolean;
}

interface PickupEntity {
  id: string;
  x: number;
  y: number;
  kind: 'health' | 'astral' | 'powerup' | 'gear' | 'consumable' | 'preset' | 'key';
  life: number;
  powerUp?: PowerUpDropSpec;
  gearItem?: InventoryItem;
  consumableKind?: 'medkit' | 'aether_flask' | 'overcharge';
}

interface ShrineRuntime {
  id: string;
  x: number;
  y: number;
  name: string;
  kind: 'heal' | 'forge' | 'astral' | 'vault';
  color: string;
  cooldown: number;
}

interface RoomRuntimeState {
  visited: boolean;
  cleared: boolean;
  encounterOrder: number | null;
  maze: ProceduralMaze;
  crates: CrateEntity[];
  shrine: ShrineRuntime | null;
  floorPickups: PickupEntity[];
}

interface ProjectileEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  color: string;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
}

interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ComboSlashEffect {
  active: boolean;
  x: number;
  y: number;
  z: number;
  angle: number;
  length: number;
  thickness: number;
  primaryColor: string;
  secondaryColor: string;
  life: number;
  maxLife: number;
}

interface ComboAfterimage {
  active: boolean;
  x: number;
  y: number;
  z: number;
  facingLeft: boolean;
  color: string;
  life: number;
  maxLife: number;
}

const BUF_W = 480;
const BUF_H = 270;
const GRAVITY = 175;
const BEST_SCORE_KEY = 'blight_inhuman_best_score_v2';

interface AshEmber {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
}

export class VoidbreakerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bctx: CanvasRenderingContext2D;
  private character: CharacterConfig;
  private onHudUpdate: (snapshot: HudSnapshot) => void;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private phase: EnginePhase = 'title';
  private totalTime = 0;
  private runTime = 0;
  private hitstopTimer = 0;
  private defeatDelayTimer = 0;

  // Screen Shake + Room Transition Fade
  private trauma = 0;
  private shakeKickX = 0;
  private shakeKickY = 0;
  private impactFlash = 0;
  private screenShakeEnabled = true;
  private roomTransitionAlpha = 0;
  private doorCooldown = 0;
  private shortcutWarnCooldown = 0;
  private shortcutPromptState: ShortcutPromptDecisionState = {
    activeDoorId: null,
    declinedDoorId: null,
  };

  // Smooth isometric camera in internal buffer space
  private camOriginX = BUF_W * 0.5;
  private camOriginY = 54;

  // Input state
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private bufferedAction: {
    action: 'attack1' | 'special' | 'dash';
    timer: number;
  } | null = null;

  // 666-Room Procedural Maze Progression (111 Wings x 6 Rooms, North Exit + South Return)
  private currentRoomId: DungeonRoomId = 'ashen_courtyard';
  private runSeed: number = ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1;
  private currentMaze: ProceduralMaze = generateProceduralMaze(1);
  private roomNumber = 1;
  private roomCleared = false;
  private clearedRoomNumbers = new Set<number>();
  private roomMemory = new Map<
    number,
    {
      cleared: boolean;
      unlockedShortcutDoorIds: string[];
      crates: CrateEntity[];
      shrines: ShrineRuntime[];
      pickups: PickupEntity[];
      shopkeeper: { x: number; y: number } | null;
    }
  >();
  private pendingShopkeeperAfterBoss = false;
  private keys = 0;
  private combatLog: CombatLogEntry[] = [];
  private combatLogSeq = 0;
  private roomStates = new Map<DungeonRoomId, RoomRuntimeState>();
  private roomCacheMap = new Map<DungeonRoomId, HTMLCanvasElement>();
  private readonly roomCacheOriginX = 330;
  private readonly roomCacheOriginY = 48;

  // Active Room Gameplay Entities & Animated Ambient Life
  private player: PlayerEntity;
  private enemies: EnemyEntity[] = [];
  private crates: CrateEntity[] = [];
  private pickups: PickupEntity[] = [];
  private shrines: ShrineRuntime[] = [];
  private ambientCritters: AmbientCritter[] = [];
  private projectiles: ProjectileEntity[] = [];
  private particles: PooledParticle[] = [];
  private floatingTexts: FloatingText[] = [];
  private rings: ShockwaveRing[] = [];
  private comboSlashes: ComboSlashEffect[] = [];
  private comboAfterimages: ComboAfterimage[] = [];
  private particleCursor = 0;
  private textCursor = 0;
  private ringCursor = 0;
  private slashCursor = 0;
  private afterimageCursor = 0;
  private projectileCursor = 0;

  // Escalating Locked-Room Dungeon Progression, RPG Inventory, Skill Tree, Serum VST & Sample Packs
  private difficulty: DifficultyId = 'normal';
  private waveNumber = 1; // Mirrors roomNumber (1..666)
  private roomsClearedCount = 0;
  private dungeonDepth = 1; // Mirrors wingNumber (1..111)
  private roomTotalEnemies = 0;
  private doorLockWarnCooldown = 0;
  private tokenPool = new AttackTokenPool(2);
  private score = 0;
  private bestScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboDecayTimer = 0;
  private comboHitSeq = 0;
  private comboRankUpSeq = 0;
  private comboFlashTimer = 0;
  private comboFlashColor = '#FDE047';
  private comboMilestoneBannerTimer = 0;
  private comboMilestoneLabel: string | null = null;
  private afterimageEmitCooldown = 0;
  private bossTrailHp = 0;
  private bossTrailHoldTimer = 0;
  private bossHitSeq = 0;
  private defeatedTotal = 0;
  private damageTaken = 0;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private enemyIdCounter = 0;

  // Serum Potency + Presets Collection (10 Presets fully power up Serum)
  private serumState: SerumState = createInitialSerumState();
  private presetsCollected = 0;
  private activeSerumCastPower = 1;

  // XP, Skill Points, Level-Up Animation, Gold & Hooded-Cloak Shopkeeper
  private level = 1;
  private xp = 0;
  private skillPoints = 0;
  private skillPointGrantSeq = 0;
  private levelUpAnimTimer = 0;
  private readonly levelUpAnimDuration = 2.6;
  private levelUpAnimLevel = 1;
  private levelUpEventSeq = 0;
  private gold = 60;
  private shopkeeper: { x: number; y: number } | null = null;
  private lastShopPlayerLevel = 0;
  private astralShards = 0;
  private powerUpStacks: PowerUpStackTotals = createEmptyPowerUpStacks();
  private equipped: EquippedGearMap = createStarterEquipped();
  private inventory: InventoryItem[] = createStarterInventory();
  private skillRanks: SkillRankMap = {};

  // Drifting Wasteland Ash & Embers
  private embers: AshEmber[] = [];

  // Throttled HUD emission
  private lastHudEmit = 0;
  private needsStaticRedraw = true;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    initialCharacter: CharacterConfig,
    onHudUpdate: (snapshot: HudSnapshot) => void
  ) {
    this.canvas = canvas;
    this.canvas.width = BUF_W;
    this.canvas.height = BUF_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.bctx = ctx;

    this.character = { ...initialCharacter, name: HERO_NAME };
    this.onHudUpdate = onHudUpdate;
    this.bestScore = this.loadBestScore();
    this.player = this.createInitialPlayer();

    this.initPools();
    this.initEmbers();
    this.initDungeonRooms();
    this.attachEvents();
    this.handleResize();
    this.emitHud(true);

    this.lastTimestamp = performance.now();
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  private getCurrentRoom(): DungeonRoomDef {
    return getDungeonRoom(this.currentRoomId);
  }

  private getEffectiveStats(): EffectiveRpgStats {
    return computeEffectiveRpgStats(
      getFighterClass(this.character.fighterClass),
      this.level,
      this.equipped,
      this.skillRanks,
      this.powerUpStacks,
      COMBO_DECAY_TIME
    );
  }

  private syncPlayerMaxHp(healDelta = false): void {
    const stats = this.getEffectiveStats();
    const prevMax = this.player.maxHp;
    this.player.maxHp = stats.maxHp;
    if (healDelta && stats.maxHp > prevMax) {
      this.player.hp = Math.min(stats.maxHp, this.player.hp + (stats.maxHp - prevMax));
    } else {
      this.player.hp = Math.min(stats.maxHp, Math.max(1, this.player.hp));
    }
  }

  private loadBestScore(): number {
    try {
      const val = Number(window.localStorage.getItem(BEST_SCORE_KEY) || '0');
      return Number.isFinite(val) && val > 0 ? val : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(Math.round(score)));
    } catch {
      // ignore
    }
  }

  private initPools(): void {
    this.particles = Array.from({ length: 200 }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 2,
      life: 0,
      maxLife: 0.3,
      color: '#D97706',
      gravity: 110,
    }));

    this.floatingTexts = Array.from({ length: 34 }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      text: '',
      color: '#F5EFE6',
      life: 0,
      maxLife: 0.78,
    }));

    this.rings = Array.from({ length: 20 }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 0.2,
      maxRadius: 2.5,
      color: '#84CC16',
      life: 0,
      maxLife: 0.35,
    }));

    this.projectiles = Array.from({ length: 32 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      damage: 14,
      life: 0,
      color: '#84CC16',
    }));

    this.comboSlashes = Array.from({ length: 28 }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      angle: 0,
      length: 14,
      thickness: 2,
      primaryColor: '#FDE047',
      secondaryColor: '#FFFFFF',
      life: 0,
      maxLife: 0.24,
    }));

    this.comboAfterimages = Array.from({ length: 12 }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      facingLeft: false,
      color: '#84CC16',
      life: 0,
      maxLife: 0.22,
    }));
  }

  private initEmbers(): void {
    const palette = ['#78716C', '#A8A29E', '#D97706', '#EA580C', '#65A30D'];
    this.embers = Array.from({ length: 64 }, (_, idx) => ({
      x: (idx * 97) % BUF_W,
      y: (idx * 53) % BUF_H,
      size: idx % 6 === 0 ? 2 : 1,
      speedX: 3 + (idx % 4) * 2.2,
      speedY: -2 - (idx % 3) * 1.6,
      color: palette[idx % palette.length],
    }));
  }

  private buildRoomSeed(roomIndex: number, depth: number): number {
    return (
      ((this.runSeed ^ Math.imul(roomIndex + 1, 0x9e3779b1) ^ Math.imul(depth, 0x85ebca6b)) >>> 0) ||
      1
    );
  }

  private getCurrentMaze(): ProceduralMaze {
    return this.currentMaze;
  }

  private pushCombatLog(text: string, category: CombatLogCategory): void {
    this.combatLog = appendCombatLog(this.combatLog, {
      id: ++this.combatLogSeq,
      text,
      category,
      roomNumber: this.roomNumber,
    });
  }

  private initDungeonRooms(): void {
    this.roomStates.clear();
    this.setupRoomNumber(1, false);
  }

  private isCurrentRoomLocked(): boolean {
    return !this.roomCleared;
  }

  private snapshotCurrentRoomMemory(): void {
    const unlockedIds = this.currentMaze.lockedDoors
      .filter((d) => d.unlocked)
      .map((d) => d.id);
    this.roomMemory.set(this.roomNumber, {
      cleared: this.roomCleared,
      unlockedShortcutDoorIds: unlockedIds,
      crates: this.crates.map((c) => ({ ...c })),
      shrines: this.shrines.map((s) => ({ ...s })),
      pickups: this.pickups.map((p) => ({ ...p })),
      shopkeeper: this.shopkeeper ? { ...this.shopkeeper } : null,
    });
  }

  private pickShopkeeperSpot(nearX: number, nearY: number, seedOffset: number): { x: number; y: number } {
    const shopPts = pickMazeSpawnPoints(
      this.currentMaze,
      [
        { x: SINGLE_EXIT_DOOR_POS.x, y: SINGLE_EXIT_DOOR_POS.y },
        { x: RETURN_DOOR_POS.x, y: RETURN_DOOR_POS.y },
      ],
      4,
      this.buildRoomSeed(this.roomNumber, this.dungeonDepth) + seedOffset,
      1.5,
      ROOM_BOUNDS
    );
    let bestPt = shopPts[0] ?? { x: 7.4, y: 9.8 };
    let bestDist = Infinity;
    for (const candidate of shopPts) {
      const d = isoDistance(candidate.x, candidate.y, nearX, nearY);
      if (d >= 1.3 && d < bestDist) {
        bestDist = d;
        bestPt = candidate;
      }
    }
    return bestPt;
  }

  private setupRoomNumber(
    targetRoomNumber: number,
    announceLog = true,
    entryFrom: 'south' | 'north' = 'south'
  ): void {
    const info = getRoomProgressionInfo(targetRoomNumber);
    this.roomNumber = info.roomNumber;
    this.waveNumber = info.roomNumber;
    this.dungeonDepth = info.wingNumber;
    this.currentRoomId = info.themeRoomId;

    const room = getDungeonRoom(info.themeRoomId);
    const seed = this.buildRoomSeed(info.roomNumber, info.wingNumber);
    this.currentMaze = generateProceduralMaze(seed);

    const savedRoom = this.roomMemory.get(info.roomNumber);
    if (savedRoom) {
      this.roomCleared = savedRoom.cleared || this.clearedRoomNumbers.has(info.roomNumber);
      for (const doorId of savedRoom.unlockedShortcutDoorIds) {
        unlockMazeDoor(this.currentMaze, doorId);
      }
      this.crates = savedRoom.crates.map((c) => ({ ...c }));
      this.shrines = savedRoom.shrines.map((s) => ({ ...s }));
      this.pickups = savedRoom.pickups.map((p) => ({ ...p }));
      if (isShopkeeperAllowed(info.roomNumber, this.roomCleared)) {
        this.shopkeeper = savedRoom.shopkeeper
          ? { ...savedRoom.shopkeeper }
          : shouldSpawnShopkeeperForRoom(info.roomNumber)
            ? this.pickShopkeeperSpot(ROOM_ENTRY_SPAWN_POS.x, ROOM_ENTRY_SPAWN_POS.y, 77)
            : null;
      } else {
        this.shopkeeper = null;
      }
    } else {
      this.roomCleared = this.clearedRoomNumbers.has(info.roomNumber);

      // Avoid South return/entry spawn and North exit door when placing crates, shrines & Preset Files
      const avoidPoints = [
        { x: ROOM_ENTRY_SPAWN_POS.x, y: ROOM_ENTRY_SPAWN_POS.y },
        { x: SINGLE_EXIT_DOOR_POS.x, y: SINGLE_EXIT_DOOR_POS.y },
        { x: RETURN_DOOR_POS.x, y: RETURN_DOOR_POS.y },
      ];
      const crateCount = Math.min(3, Math.max(2, room.crateSpawns.length));
      const includeShrine = Boolean(room.shrine) && (info.isBossRoom || info.roomNumber % 2 === 1);
      const presetCount = this.presetsCollected < SERUM_PRESETS_MAX ? (info.roomNumber === 1 ? 2 : 1) : 0;

      const openPts = pickMazeSpawnPoints(
        this.currentMaze,
        avoidPoints,
        crateCount + (includeShrine ? 1 : 0) + presetCount,
        seed + 31,
        2.1,
        ROOM_BOUNDS
      );

      let ptCursor = 0;
      const crateHp = 26 + Math.min(200, info.roomNumber * 4);
      this.crates = Array.from({ length: crateCount }, (_, i) => {
        const pt = openPts[ptCursor++] ?? { x: 5.6, y: 4.4 };
        return {
          id: `crate_r${info.roomNumber}_${i}`,
          x: pt.x,
          y: pt.y,
          hp: crateHp,
          maxHp: crateHp,
          hitFlashTimer: 0,
          broken: false,
        };
      });

      if (includeShrine && room.shrine) {
        const shrinePt = openPts[ptCursor++] ?? { x: 9.0, y: 7.0 };
        this.shrines = [
          {
            id: `${room.shrine.id}_r${info.roomNumber}`,
            x: shrinePt.x,
            y: shrinePt.y,
            name: room.shrine.name,
            kind: room.shrine.kind,
            color: room.shrine.color,
            cooldown: 0,
          },
        ];
      } else {
        this.shrines = [];
      }

      this.pickups = Array.from({ length: presetCount }, (_, i) => {
        const pt = openPts[ptCursor++] ?? { x: 12.4, y: 7.0 };
        return {
          id: `preset_r${info.roomNumber}_${i}`,
          x: pt.x,
          y: pt.y,
          kind: 'preset' as const,
          life: 9999,
        };
      });

      // Hooded Shopkeeper spawns every 6 levels ONLY when NOT in an active Boss Battle!
      if (shouldSpawnShopkeeperForRoom(info.roomNumber) && isShopkeeperAllowed(info.roomNumber, this.roomCleared)) {
        this.shopkeeper = this.pickShopkeeperSpot(ROOM_ENTRY_SPAWN_POS.x, ROOM_ENTRY_SPAWN_POS.y, 77);
      } else {
        this.shopkeeper = null;
      }
    }

    // Populate animated dark-fantasy ambient life (crypt rats, blight bats, bone moths, spore wisps)
    this.ambientCritters = createRoomAmbientLife(info.roomNumber, seed, this.currentMaze, room.biomeId);

    // Position Inhuman at South entrance (advancing forward) or North entrance (returning to previous room)
    if (this.player) {
      const spawn = entryFrom === 'north' ? ROOM_RETURN_NORTH_SPAWN_POS : ROOM_ENTRY_SPAWN_POS;
      const resolvedSpawn = resolveMazeCollisions(
        spawn.x,
        spawn.y,
        0.38,
        getActiveMazeWalls(this.currentMaze)
      );
      this.player.x = resolvedSpawn.x;
      this.player.y = resolvedSpawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.facingX = 0;
      this.player.facingY = entryFrom === 'north' ? 1 : -1;
      this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.85);
    }

    if (announceLog) {
      const lockedCount = this.currentMaze.lockedDoors.filter((d) => !d.unlocked).length;
      if (entryFrom === 'north') {
        this.pushCombatLog(
          `Returned to Room ${info.roomNumber}/${TOTAL_DUNGEON_ROOMS} · ${room.name}${this.roomCleared ? ' (Cleared)' : ''}.`,
          'room'
        );
      } else if (info.isFinalBossRoom && !this.roomCleared) {
        this.pushCombatLog(
          `FINAL BOSS ROOM 666/666 · ${room.name}! Defeat the Sovereign Lich in single combat!`,
          'room'
        );
      } else if (info.isBossRoom && !this.roomCleared) {
        this.pushCombatLog(
          `BOSS DUEL ${info.roomNumber}/${TOTAL_DUNGEON_ROOMS} (Wing ${info.wingNumber}/${TOTAL_DUNGEON_WINGS}) · ${room.name}!`,
          'room'
        );
      } else {
        this.pushCombatLog(
          `Room ${info.roomNumber}/${TOTAL_DUNGEON_ROOMS} · ${room.name}${this.roomCleared ? ' (Cleared)' : ` (${lockedCount} locked maze shortcut${lockedCount === 1 ? '' : 's'})`}.`,
          'room'
        );
      }
      if (this.shopkeeper) {
        this.pushCombatLog(`Hooded Shopkeeper: "${SHOPKEEPER_GREETING}"`, 'shop');
      }
    }
  }

  private createInitialPlayer(): PlayerEntity {
    const stats = this.getEffectiveStats();
    return {
      x: ROOM_ENTRY_SPAWN_POS.x,
      y: ROOM_ENTRY_SPAWN_POS.y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facingX: 0,
      facingY: -1,
      facingLeft: false,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      astral: 100,
      maxAstral: 100,
      invulnTimer: 1.4,
      hitFlashTimer: 0,
      attackKind: null,
      attackTimer: 0,
      attackHasHit: new Set(),
      comboStep: 0,
      timeSincePunchEnd: 99,
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: -1,
      defending: false,
      defendHeldTouch: false,
      defendMinTimer: 0,
      defendDuration: 0,
      hurtTimer: 0,
      walkPhase: 0,
      scaleX: 1,
      scaleY: 1,
      coyoteTimer: 0,
    };
  }

  public setCharacter(cfg: CharacterConfig): void {
    const prevMax = this.player.maxHp;
    this.character = { ...cfg, name: HERO_NAME };
    const nextStats = this.getEffectiveStats();
    if (nextStats.maxHp !== prevMax) {
      const ratio = prevMax > 0 ? this.player.hp / prevMax : 1;
      this.player.maxHp = nextStats.maxHp;
      this.player.hp = Math.max(1, Math.round(nextStats.maxHp * ratio));
    }
    this.needsStaticRedraw = true;
    this.emitHud(true);
  }

  public setDifficulty(diff: DifficultyId): void {
    this.difficulty = diff;
    this.emitHud(true);
  }

  public setTouchMove(dx: number, dy: number): void {
    this.touchMoveX = Math.max(-1, Math.min(1, dx));
    this.touchMoveY = Math.max(-1, Math.min(1, dy));
  }

  public setTouchDefend(active: boolean): void {
    if (this.phase !== 'playing') {
      this.player.defendHeldTouch = false;
      this.player.defending = false;
      return;
    }
    this.player.defendHeldTouch = active;
    if (active) {
      this.player.defendMinTimer = Math.max(this.player.defendMinTimer, 0.35);
      if (this.player.attackKind === null && this.player.dashTimer <= 0 && this.player.hurtTimer <= 0) {
        this.player.defending = true;
      }
      this.emitHud(true);
    }
  }

  public triggerTouchAction(action: 'potion' | 'attack1' | 'defend' | 'special' | 'dash'): void {
    if (this.phase !== 'playing') return;
    if (action === 'potion') {
      this.useQuickHeal();
      return;
    }
    if (action === 'defend') {
      this.setTouchDefend(true);
      return;
    }
    this.bufferedAction = { action, timer: 0.14 };
  }

  public getPhase(): EnginePhase {
    return this.phase;
  }

  public toggleHaptics(): boolean {
    const next = hapticsEngine.toggle();
    this.emitHud(true);
    return next;
  }

  public toggleScreenShake(): boolean {
    this.screenShakeEnabled = !this.screenShakeEnabled;
    if (!this.screenShakeEnabled) {
      this.trauma = 0;
      this.shakeKickX = 0;
      this.shakeKickY = 0;
    } else {
      // Immediate tactile feedback pulse so player feels Screen Shake reactivate
      this.addScreenShake(0.38, 0, -1, 0);
    }
    this.emitHud(true);
    return this.screenShakeEnabled;
  }

  public isScreenShakeEnabled(): boolean {
    return this.screenShakeEnabled;
  }

  public logExternalEvent(text: string, category: CombatLogCategory): void {
    this.pushCombatLog(text, category);
    this.emitHud(true);
  }

  public confirmUnlockNearbyShortcut(doorId?: string): boolean {
    if (this.phase !== 'playing') return false;
    if (this.keys <= 0) return false;
    const targetId = doorId ?? this.shortcutPromptState.activeDoorId;
    if (!targetId) return false;

    const maze = this.getCurrentMaze();
    const door = maze.lockedDoors.find((d) => d.id === targetId && !d.unlocked);
    if (!door) return false;
    const dist = Math.hypot(this.player.x - door.cx, this.player.y - door.cy);
    if (dist > 2.35) return false;

    if (!unlockMazeDoor(maze, door.id)) return false;
    this.keys -= 1;
    this.shortcutPromptState = { activeDoorId: null, declinedDoorId: null };
    this.spawnRing(door.cx, door.cy, 2.2, '#F59E0B', 0.45);
    this.spawnBurst(door.cx, door.cy, 12, 18, '#FDE68A', 68);
    this.spawnFloatingText(
      door.cx,
      door.cy,
      28,
      'SHORTCUT UNLOCKED! (-1 KEY)',
      '#FEF08A'
    );
    this.addScreenShake(0.34, 0, -1, 0.1);
    retroAudio.playPowerUp();
    hapticsEngine.trigger('powerUp');
    this.pushCombatLog(
      `Unlocked Maze Shortcut Gate (-1 Key, ${this.keys} left).`,
      'door'
    );
    this.emitHud(true);
    return true;
  }

  public declineNearbyShortcut(doorId?: string): void {
    const targetId = doorId ?? this.shortcutPromptState.activeDoorId;
    if (!targetId) return;
    this.shortcutPromptState = {
      activeDoorId: targetId,
      declinedDoorId: targetId,
    };
    this.emitHud(true);
  }

  public createSaveData(slotIndex: number): GameSaveData {
    const prog = getRoomProgressionInfo(this.roomNumber);
    const room = this.getCurrentRoom();
    const classSpec = getFighterClass(this.character.fighterClass);
    const aliveEnemies = this.enemies.filter((e) => e.state !== 'ko');
    const unlockedShortcutDoorIds = this.currentMaze.lockedDoors
      .filter((d) => d.unlocked)
      .map((d) => d.id);

    return {
      version: SAVE_SCHEMA_VERSION,
      slotIndex,
      savedAt: Date.now(),
      summary: {
        roomNumber: prog.roomNumber,
        totalRooms: TOTAL_DUNGEON_ROOMS,
        wingNumber: prog.wingNumber,
        totalWings: TOTAL_DUNGEON_WINGS,
        isBossRoom: prog.isBossRoom,
        sectorName: room.name,
        fighterClassLabel: classSpec.label,
        difficulty: this.difficulty,
        level: this.level,
        score: Math.round(this.score),
        hp: Math.round(this.player.hp),
        maxHp: this.player.maxHp,
        keys: this.keys,
        presetsCollected: this.presetsCollected,
        presetsMax: SERUM_PRESETS_MAX,
        skillPoints: this.skillPoints,
        gold: this.gold,
        roomCleared: this.roomCleared,
        enemiesRemaining: aliveEnemies.length,
        roomsClearedCount: this.roomsClearedCount,
      },
      character: { ...this.character, name: HERO_NAME },
      difficulty: this.difficulty,
      runSeed: this.runSeed,
      roomNumber: this.roomNumber,
      roomCleared: this.roomCleared,
      roomsClearedCount: this.roomsClearedCount,
      roomTotalEnemies: this.roomTotalEnemies,
      score: Math.round(this.score),
      maxCombo: this.maxCombo,
      defeatedTotal: this.defeatedTotal,
      damageTaken: Math.round(this.damageTaken),
      runTime: this.runTime,
      keys: this.keys,
      gold: this.gold,
      lastShopPlayerLevel: this.lastShopPlayerLevel,
      shopkeeper: this.shopkeeper ? { ...this.shopkeeper } : null,
      clearedRoomNumbers: Array.from(this.clearedRoomNumbers),
      presetsCollected: this.presetsCollected,
      serumState: { ...this.serumState },
      level: this.level,
      xp: this.xp,
      skillPoints: this.skillPoints,
      astralShards: this.astralShards,
      powerUpStacks: JSON.parse(JSON.stringify(this.powerUpStacks)),
      equipped: JSON.parse(JSON.stringify(this.equipped)),
      inventory: JSON.parse(JSON.stringify(this.inventory)),
      skillRanks: { ...this.skillRanks },
      playerHp: Math.max(1, Math.round(this.player.hp)),
      playerMaxHp: this.player.maxHp,
      playerAstral: Math.round(this.player.astral),
      playerX: this.player.x,
      playerY: this.player.y,
      playerFacingLeft: this.player.facingLeft,
      unlockedShortcutDoorIds,
      enemies: aliveEnemies.map((e) => ({
        id: e.id,
        archetype: e.archetype,
        x: e.x,
        y: e.y,
        facingLeft: e.facingLeft,
        hp: Math.max(1, Math.round(e.hp)),
        maxHp: e.maxHp,
        attackDamage: e.attackDamage,
        attackCooldown: e.attackCooldown,
        radius: e.radius,
        speed: e.speed,
        flankSide: e.flankSide,
        cooldown: e.cooldown,
        telegraphMax: e.telegraphMax,
        xpValue: e.xpValue,
        scoreValue: e.scoreValue,
      })),
      crates: this.crates.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        hp: c.hp,
        maxHp: c.maxHp,
        broken: c.broken,
      })),
      shrines: this.shrines.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        name: s.name,
        kind: s.kind,
        color: s.color,
        cooldown: s.cooldown,
      })),
      pickups: JSON.parse(JSON.stringify(this.pickups)),
      combatLog: JSON.parse(JSON.stringify(this.combatLog)),
    };
  }

  public loadFromSaveData(save: GameSaveData): void {
    this.held.clear();
    this.justPressed.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.bufferedAction = null;

    this.character = { ...save.character, name: HERO_NAME };
    this.difficulty = save.difficulty;
    this.runSeed = save.runSeed || 1;
    this.level = Math.max(1, save.level);
    this.xp = Math.max(0, save.xp);
    this.skillPoints = Math.max(0, save.skillPoints);
    this.astralShards = Math.max(0, save.astralShards);
    this.presetsCollected = Math.max(0, Math.min(SERUM_PRESETS_MAX, save.presetsCollected));
    this.serumState = { ...save.serumState };
    this.activeSerumCastPower = 1;
    this.powerUpStacks = JSON.parse(JSON.stringify(save.powerUpStacks));
    this.equipped = JSON.parse(JSON.stringify(save.equipped));
    this.inventory = JSON.parse(JSON.stringify(save.inventory));
    this.skillRanks = { ...save.skillRanks };

    const prog = getRoomProgressionInfo(save.roomNumber);
    this.roomNumber = prog.roomNumber;
    this.waveNumber = prog.roomNumber;
    this.dungeonDepth = prog.wingNumber;
    this.currentRoomId = prog.themeRoomId;
    this.roomCleared = Boolean(save.roomCleared);
    this.clearedRoomNumbers = new Set<number>(save.clearedRoomNumbers ?? []);
    if (this.roomCleared) {
      this.clearedRoomNumbers.add(this.roomNumber);
    }
    this.roomMemory.clear();
    this.pendingShopkeeperAfterBoss = false;
    this.roomsClearedCount = Math.max(0, save.roomsClearedCount);
    this.roomTotalEnemies = Math.max(0, save.roomTotalEnemies);
    this.keys = Math.max(0, save.keys);
    this.gold = Math.max(0, typeof save.gold === 'number' ? save.gold : 60);
    this.lastShopPlayerLevel = Math.max(0, save.lastShopPlayerLevel ?? 0);
    this.shopkeeper =
      save.shopkeeper && isShopkeeperAllowed(this.roomNumber, this.roomCleared)
        ? { x: save.shopkeeper.x, y: save.shopkeeper.y }
        : null;
    this.levelUpAnimTimer = 0;

    // Rebuild exact deterministic procedural maze and re-open any unlocked shortcut gates
    const seed = this.buildRoomSeed(prog.roomNumber, prog.wingNumber);
    this.currentMaze = generateProceduralMaze(seed);
    for (const unlockedId of save.unlockedShortcutDoorIds ?? []) {
      unlockMazeDoor(this.currentMaze, unlockedId);
    }
    const loadedRoomDef = getDungeonRoom(prog.themeRoomId);
    this.ambientCritters = createRoomAmbientLife(
      prog.roomNumber,
      seed,
      this.currentMaze,
      loadedRoomDef.biomeId
    );

    this.player = this.createInitialPlayer();
    const stats = this.getEffectiveStats();
    this.player.maxHp = stats.maxHp;
    this.player.hp = Math.max(1, Math.min(stats.maxHp, save.playerHp));
    this.player.astral = Math.max(0, Math.min(this.player.maxAstral, save.playerAstral));
    const activeWalls = getActiveMazeWalls(this.currentMaze);
    const clampedPos = clampToArena(save.playerX, save.playerY, ROOM_BOUNDS, 0.62);
    const resolvedPos = resolveMazeCollisions(clampedPos.x, clampedPos.y, 0.38, activeWalls);
    this.player.x = resolvedPos.x;
    this.player.y = resolvedPos.y;
    this.player.facingLeft = Boolean(save.playerFacingLeft);
    this.player.invulnTimer = 1.0;

    const spec = generateWaveSpec(prog.roomNumber, this.difficulty);
    this.tokenPool.clear();
    this.tokenPool.setCapacity(spec.maxConcurrentTokens);

    this.enemies = (save.enemies ?? []).map((e) => ({
      id: e.id,
      archetype: e.archetype,
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      facingLeft: e.facingLeft,
      hp: Math.max(1, e.hp),
      maxHp: Math.max(1, e.maxHp),
      attackDamage: e.attackDamage,
      attackCooldown: e.attackCooldown,
      radius: e.radius,
      speed: e.speed,
      flankSide: e.flankSide,
      cooldown: Math.max(0.35, e.cooldown),
      state: 'idle',
      stateTimer: 0,
      telegraphMax: e.telegraphMax,
      aimX: -1,
      aimY: 0,
      attackApplied: false,
      hitFlashTimer: 0,
      walkPhase: 0,
      scaleX: 1,
      scaleY: 1,
      xpValue: e.xpValue,
      scoreValue: e.scoreValue,
    }));

    this.crates = (save.crates ?? []).map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      hp: c.hp,
      maxHp: c.maxHp,
      hitFlashTimer: 0,
      broken: c.broken,
    }));

    this.shrines = (save.shrines ?? []).map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      name: s.name,
      kind: s.kind,
      color: s.color,
      cooldown: s.cooldown,
    }));

    this.pickups = JSON.parse(JSON.stringify(save.pickups ?? []));

    this.projectiles.forEach((p) => {
      p.active = false;
    });
    this.particles.forEach((p) => {
      p.active = false;
    });
    this.floatingTexts.forEach((t) => {
      t.active = false;
    });
    this.rings.forEach((r) => {
      r.active = false;
    });

    this.score = Math.max(0, save.score);
    this.combo = 0;
    this.maxCombo = Math.max(0, save.maxCombo);
    this.comboDecayTimer = 0;
    this.defeatedTotal = Math.max(0, save.defeatedTotal);
    this.damageTaken = Math.max(0, save.damageTaken);
    this.runTime = Math.max(0, save.runTime);
    this.hitstopTimer = 0;
    this.defeatDelayTimer = 0;
    this.trauma = 0;
    this.shakeKickX = 0;
    this.shakeKickY = 0;
    this.impactFlash = 0;
    this.doorCooldown = 0.7;
    this.doorLockWarnCooldown = 0;
    this.shortcutWarnCooldown = 0;
    this.shortcutPromptState = { activeDoorId: null, declinedDoorId: null };
    this.roomTransitionAlpha = 0.65;

    this.combatLog = JSON.parse(JSON.stringify(save.combatLog ?? []));
    this.combatLogSeq = this.combatLog.reduce((maxId, entry) => Math.max(maxId, entry.id), 0);
    this.pushCombatLog(
      `Loaded Save Slot ${save.slotIndex + 1} · Room ${prog.roomNumber}/${TOTAL_DUNGEON_ROOMS} (${this.getCurrentRoom().name}).`,
      'room'
    );

    this.bannerText = `LOADED SLOT ${save.slotIndex + 1} · ROOM ${prog.roomNumber}/${TOTAL_DUNGEON_ROOMS}`;
    this.bannerTimer = 2.2;

    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    this.camOriginX = BUF_W * 0.5 - pScreen.x;
    this.camOriginY = BUF_H * 0.56 - pScreen.y;

    this.phase = 'playing';
    this.needsStaticRedraw = true;
    this.lastTimestamp = performance.now();
    retroAudio.startBgm();
    this.emitHud(true);
  }

  // --- RPG Inventory & Skill Tree Public Actions ---

  public equipItem(itemId: string): void {
    const idx = this.inventory.findIndex((it) => it.id === itemId && it.kind === 'equipment');
    if (idx === -1) return;
    const item = this.inventory[idx];
    const slot = item.slot as EquipSlot | undefined;
    if (!slot) return;

    const currentlyEquipped = this.equipped[slot];
    this.equipped = { ...this.equipped, [slot]: item };
    const nextInv = [...this.inventory];
    nextInv.splice(idx, 1);
    if (currentlyEquipped) {
      nextInv.unshift(currentlyEquipped);
    }
    this.inventory = nextInv;
    this.syncPlayerMaxHp(true);
    retroAudio.playPickup();
    hapticsEngine.trigger('pickup');
    this.emitHud(true);
  }

  public salvageItem(itemId: string): void {
    const idx = this.inventory.findIndex((it) => it.id === itemId && it.kind === 'equipment');
    if (idx === -1) return;
    const item = this.inventory[idx];
    const shardGain = Math.round(25 * RARITY_META[item.rarity].tierMultiplier);
    const xpGain = Math.round(20 * RARITY_META[item.rarity].tierMultiplier);
    this.inventory = this.inventory.filter((it) => it.id !== itemId);
    this.astralShards += shardGain;
    this.grantXp(xpGain);
    retroAudio.playCrateBreak();
    hapticsEngine.trigger('pickup');
    this.emitHud(true);
  }

  public useConsumable(itemId: string): boolean {
    const idx = this.inventory.findIndex((it) => it.id === itemId && it.kind === 'consumable');
    if (idx === -1) return false;
    const item = this.inventory[idx];
    const p = this.player;

    if (item.consumableKind === 'medkit') {
      const heal = Math.max(25, Math.round(p.maxHp * 0.45));
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.spawnFloatingText(p.x, p.y, 26, `+${heal} HP`, '#34D399');
      this.spawnBurst(p.x, p.y, 10, 12, '#34D399', 52);
    } else if (item.consumableKind === 'aether_flask') {
      p.astral = Math.min(p.maxAstral, p.astral + 55);
      this.serumState = {
        ...this.serumState,
        potency: Math.min(1, this.serumState.potency + 0.3),
      };
      this.spawnFloatingText(p.x, p.y, 26, '+55 SERUM VST +30% POTENCY', '#84CC16');
      this.spawnBurst(p.x, p.y, 10, 12, '#84CC16', 52);
    } else if (item.consumableKind === 'overcharge') {
      const bonus = createWavePowerUp(this.waveNumber, 'might');
      this.powerUpStacks = applyPowerUpToStacks(this.powerUpStacks, bonus);
      this.spawnFloatingText(p.x, p.y, 28, bonus.shortTag, bonus.color);
      this.spawnRing(p.x, p.y, 2.2, bonus.color, 0.38);
    }

    const nextInv = [...this.inventory];
    const qty = (item.quantity ?? 1) - 1;
    if (qty <= 0) {
      nextInv.splice(idx, 1);
    } else {
      nextInv[idx] = { ...item, quantity: qty };
    }
    this.inventory = nextInv;

    retroAudio.playPowerUp();
    hapticsEngine.trigger('powerUp');
    this.emitHud(true);
    return true;
  }

  public useQuickHeal(): boolean {
    const medkit = this.inventory.find(
      (it) => it.kind === 'consumable' && it.consumableKind === 'medkit'
    );
    if (!medkit) return false;
    return this.useConsumable(medkit.id);
  }

  public unlockSkill(skillId: string): boolean {
    if (!canUnlockSkill(skillId, this.skillRanks, this.skillPoints)) return false;
    this.skillPoints -= 1;
    this.skillRanks = {
      ...this.skillRanks,
      [skillId]: (this.skillRanks[skillId] ?? 0) + 1,
    };
    this.syncPlayerMaxHp(true);
    retroAudio.playSkillUnlock();
    hapticsEngine.trigger('powerUp');
    this.emitHud(true);
    return true;
  }

  // --- Hooded-Cloak Shopkeeper Buy & Sell Transactions (Fixed Gold Values) ---

  public buyHealingPotion(): { ok: boolean; message: string } {
    const res = purchaseHealingPotion(this.gold, this.inventory, this.roomNumber);
    if (!res.ok) {
      retroAudio.playTelegraph();
      return { ok: false, message: res.message };
    }
    this.gold = res.gold;
    this.inventory = res.inventory;
    retroAudio.playPickup();
    hapticsEngine.trigger('pickup');
    this.pushCombatLog(res.message, 'shop');
    this.emitHud(true);
    return { ok: true, message: res.message };
  }

  public buyPresetFile(count = 1): { ok: boolean; message: string } {
    const res = purchasePresetFile(this.gold, this.presetsCollected, count);
    if (!res.ok) {
      retroAudio.playTelegraph();
      return { ok: false, message: res.message };
    }
    this.gold = res.gold;
    this.presetsCollected = res.presetsCollected;
    if (this.presetsCollected >= SERUM_PRESETS_MAX) {
      this.player.astral = this.player.maxAstral;
    }
    retroAudio.playPowerUp();
    hapticsEngine.trigger('powerUp');
    this.pushCombatLog(res.message, 'shop');
    this.emitHud(true);
    return { ok: true, message: res.message };
  }

  public sellItem(itemId: string): { ok: boolean; message: string; goldEarned: number } {
    const res = sellItemForGold(this.gold, this.inventory, itemId);
    if (!res.ok) {
      retroAudio.playTelegraph();
      return { ok: false, message: res.message, goldEarned: 0 };
    }
    this.gold = res.gold;
    this.inventory = res.inventory;
    retroAudio.playPickup();
    hapticsEngine.trigger('pickup');
    this.pushCombatLog(res.message, 'shop');
    this.emitHud(true);
    return { ok: true, message: res.message, goldEarned: res.goldEarned };
  }

  // --- Automated Verification Helpers (invisible in UI) ---

  public debugGrantPresets(count: number): void {
    this.presetsCollected = Math.max(0, Math.min(SERUM_PRESETS_MAX, Math.floor(count)));
    if (this.presetsCollected >= SERUM_PRESET_COST_PER_CAST) {
      this.player.astral = this.player.maxAstral;
    }
    this.emitHud(true);
  }

  public debugGrantXp(amount: number): void {
    this.grantXp(Math.max(0, Math.floor(amount)));
    this.emitHud(true);
  }

  public debugGrantGold(amount: number): void {
    this.gold = Math.max(0, this.gold + Math.floor(amount));
    this.emitHud(true);
  }

  public debugJumpToRoom(targetRoomNum: number): void {
    if (this.phase === 'title') {
      this.startNewRun();
    }
    this.snapshotCurrentRoomMemory();
    this.enemies = [];
    this.tokenPool.clear();
    this.projectiles.forEach((p) => {
      p.active = false;
    });
    this.setupRoomNumber(targetRoomNum, true, 'south');
    if (!this.roomCleared) {
      this.spawnRoomEncounter(this.roomNumber);
    }
    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    this.camOriginX = BUF_W * 0.5 - pScreen.x;
    this.camOriginY = BUF_H * 0.56 - pScreen.y;
    this.emitHud(true);
  }

  public debugClearRoom(): void {
    this.enemies = [];
    this.tokenPool.clear();
    this.updateRoomLockProgression();
    this.emitHud(true);
  }

  public debugReturnToPreviousRoom(): boolean {
    if (!canReturnToPreviousRoom(this.roomNumber)) return false;
    this.returnToPreviousRoom();
    return true;
  }

  public debugHurtPlayer(amount: number): void {
    this.player.hp = Math.max(10, this.player.hp - Math.max(0, amount));
    this.emitHud(true);
  }

  public debugSetDefending(active: boolean): void {
    this.player.defendHeldTouch = active;
    this.player.defending = active;
    this.player.defendMinTimer = active ? 2.0 : 0;
    this.player.defendDuration = active ? 0.35 : 0;
    this.emitHud(true);
  }

  public debugSimulateEnemyHit(amount: number): number {
    this.player.invulnTimer = 0;
    const before = this.player.hp;
    this.damagePlayer(amount, -1, 0);
    return Math.round(before - this.player.hp);
  }

  public debugEquipWeaponKind(kind: WeaponVisualKind): boolean {
    const match = this.inventory.find(
      (it) => it.kind === 'equipment' && it.slot === 'weapon' && getWeaponVisualKind(it) === kind
    );
    if (!match) return getWeaponVisualKind(this.equipped.weapon) === kind;
    this.equipItem(match.id);
    return true;
  }

  public debugTriggerAttack1(): void {
    if (this.phase !== 'playing') return;
    this.player.defending = false;
    this.player.defendHeldTouch = false;
    this.player.defendMinTimer = 0;
    const next = nextPunchComboStep(this.player.comboStep, this.player.timeSincePunchEnd);
    this.player.comboStep = next.step;
    this.beginPlayerAttack(next.kind);
    this.emitHud(true);
  }

  public debugMoveNearShopkeeper(): boolean {
    if (!this.shopkeeper) return false;
    const activeWalls = getActiveMazeWalls(this.currentMaze);
    const target = resolveMazeCollisions(this.shopkeeper.x, this.shopkeeper.y + 0.85, 0.38, activeWalls);
    this.player.x = target.x;
    this.player.y = target.y;
    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    this.camOriginX = BUF_W * 0.5 - pScreen.x;
    this.camOriginY = BUF_H * 0.56 - pScreen.y;
    this.emitHud(true);
    return true;
  }

  public debugAddCombo(hits: number): void {
    const count = Math.max(1, Math.min(40, Math.floor(hits)));
    const target = this.enemies.find((e) => e.state !== 'ko');
    const tx = target ? target.x : this.player.x + this.player.facingX * 1.4;
    const ty = target ? target.y : this.player.y + this.player.facingY * 1.4;
    for (let i = 0; i < count; i++) {
      this.registerComboHit(tx, ty, 14, i === count - 1, false);
    }
    this.emitHud(true);
  }

  public debugDamageBoss(amount: number): { hp: number; maxHp: number } | null {
    const boss = this.enemies.find((e) => e.archetype === 'warden' && e.state !== 'ko');
    if (!boss) return null;
    const dmg = Math.max(1, Math.round(amount));
    const prevHp = boss.hp;
    boss.hp = Math.max(1, boss.hp - dmg);
    boss.hitFlashTimer = 0.12;
    this.notifyBossDamaged(boss, prevHp);
    this.registerComboHit(boss.x, boss.y, 18, false, true);
    this.spawnFloatingText(boss.x, boss.y, 26, `${dmg}`, '#FDE047');
    this.emitHud(true);
    return { hp: Math.round(boss.hp), maxHp: boss.maxHp };
  }

  public startNewRun(difficulty?: DifficultyId): void {
    if (difficulty) {
      this.difficulty = difficulty;
    }
    this.held.clear();
    this.justPressed.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.bufferedAction = null;

    // Reset all roguelite-RPG run stacks, gear, XP, Serum, Presets, Gold & dungeon rooms
    this.level = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.levelUpAnimTimer = 0;
    this.levelUpAnimLevel = 1;
    this.gold = 60;
    this.shopkeeper = null;
    this.lastShopPlayerLevel = 0;
    this.pendingShopkeeperAfterBoss = false;
    this.clearedRoomNumbers.clear();
    this.roomMemory.clear();
    this.astralShards = 0;
    this.presetsCollected = 0;
    this.serumState = createInitialSerumState();
    this.activeSerumCastPower = 1;
    this.powerUpStacks = createEmptyPowerUpStacks();
    this.equipped = createStarterEquipped();
    this.inventory = createStarterInventory();
    this.skillRanks = {};

    this.player = this.createInitialPlayer();
    this.roomNumber = 1;
    this.waveNumber = 1;
    this.roomsClearedCount = 0;
    this.dungeonDepth = 1;
    this.roomTotalEnemies = 0;
    this.roomCleared = false;
    this.keys = 0;
    this.combatLog = [];
    this.combatLogSeq = 0;
    this.roomTransitionAlpha = 0;
    this.doorCooldown = 0.6;
    this.doorLockWarnCooldown = 0;
    this.shortcutWarnCooldown = 0;
    this.shortcutPromptState = { activeDoorId: null, declinedDoorId: null };

    this.runSeed = ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1;
    this.setupRoomNumber(1, true);

    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    this.camOriginX = BUF_W * 0.5 - pScreen.x;
    this.camOriginY = BUF_H * 0.56 - pScreen.y;

    this.enemies = [];
    this.projectiles.forEach((p) => {
      p.active = false;
    });
    this.particles.forEach((p) => {
      p.active = false;
    });
    this.floatingTexts.forEach((t) => {
      t.active = false;
    });
    this.rings.forEach((r) => {
      r.active = false;
    });
    this.comboSlashes.forEach((s) => {
      s.active = false;
    });
    this.comboAfterimages.forEach((a) => {
      a.active = false;
    });

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboDecayTimer = 0;
    this.comboHitSeq = 0;
    this.comboRankUpSeq = 0;
    this.comboFlashTimer = 0;
    this.comboMilestoneBannerTimer = 0;
    this.comboMilestoneLabel = null;
    this.bossTrailHp = 0;
    this.bossTrailHoldTimer = 0;
    this.bossHitSeq = 0;
    this.defeatedTotal = 0;
    this.damageTaken = 0;
    this.runTime = 0;
    this.hitstopTimer = 0;
    this.defeatDelayTimer = 0;
    this.trauma = 0;
    this.shakeKickX = 0;
    this.shakeKickY = 0;
    this.impactFlash = 0;
    this.tokenPool.clear();

    this.spawnRoomEncounter(1);

    this.phase = 'playing';
    retroAudio.startBgm();
    this.emitHud(true);
  }

  public pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.needsStaticRedraw = true;
    this.held.clear();
    this.justPressed.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    retroAudio.stopBgm();
    this.emitHud(true);
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.needsStaticRedraw = true;
    this.held.clear();
    this.justPressed.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.lastTimestamp = performance.now();
    retroAudio.startBgm();
    this.emitHud(true);
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.needsStaticRedraw = true;
    this.held.clear();
    this.justPressed.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    retroAudio.stopBgm();
    this.emitHud(true);
  }

  public toggleMute(): boolean {
    const muted = retroAudio.toggleMute();
    if (!muted && this.phase === 'playing') {
      retroAudio.startBgm();
    }
    this.emitHud(true);
    return muted;
  }

  private addScreenShake(traumaDelta: number, dirX = 0, dirY = 0, flash = 0): void {
    if (flash > 0) {
      this.impactFlash = Math.max(this.impactFlash, flash);
    }
    if (!this.screenShakeEnabled) return;
    this.trauma = Math.min(1, this.trauma + traumaDelta);
    this.shakeKickX += dirX * traumaDelta * 7.5;
    this.shakeKickY += dirY * traumaDelta * 5.5;
  }

  private collectPreset(x: number, y: number): void {
    const prev = this.presetsCollected;
    this.presetsCollected = Math.min(SERUM_PRESETS_MAX, this.presetsCollected + 1);
    const pct = Math.round(getSerumPresetPower(this.presetsCollected) * 100);

    if (this.presetsCollected === SERUM_PRESETS_MAX && prev < SERUM_PRESETS_MAX) {
      this.player.astral = this.player.maxAstral;
      this.serumState = { ...this.serumState, potency: 1.0 };
      this.spawnFloatingText(x, y, 34, '10/10 SAMPLE PACKS · SERUM VST MAX!', '#BEF264');
      this.spawnRing(x, y, 2.8, '#84CC16', 0.55);
      this.spawnBurst(x, y, 14, 22, '#BEF264', 76);
      this.bannerText = '10/10 SAMPLE PACKS COLLECTED · SERUM VST FULLY POWERED!';
      this.bannerTimer = 2.6;
      retroAudio.playLevelUp();
      hapticsEngine.trigger('levelUp');
      this.pushCombatLog('Collected 10/10 Sample Packs! Serum VST is at FULL POWER!', 'serum');
    } else if (prev < SERUM_PRESETS_MAX) {
      this.spawnFloatingText(
        x,
        y,
        28,
        `SAMPLE PACK ${this.presetsCollected}/${SERUM_PRESETS_MAX} (${pct}%)`,
        '#BEF264'
      );
      this.spawnRing(x, y, 1.8, '#84CC16', 0.36);
      this.spawnBurst(x, y, 10, 14, '#84CC16', 56);
      retroAudio.playPowerUp();
      hapticsEngine.trigger('powerUp');
      this.pushCombatLog(
        `Collected Sample Pack (${this.presetsCollected}/${SERUM_PRESETS_MAX}) · Serum VST at ${pct}%.`,
        'serum'
      );
    } else {
      // Bonus Serum VST surge + XP if already at 10/10 Sample Packs
      this.player.astral = Math.min(this.player.maxAstral, this.player.astral + 35);
      this.grantXp(15);
      this.spawnFloatingText(x, y, 26, 'SAMPLE PACK SURGE +35 SERUM VST', '#BEF264');
      retroAudio.playPickup();
      hapticsEngine.trigger('pickup');
      this.pushCombatLog('Sample Pack Surge: +35 Serum VST Charge & +15 XP.', 'serum');
    }
  }

  private advanceToNextRoom(): void {
    if (this.roomNumber >= TOTAL_DUNGEON_ROOMS) {
      this.phase = 'victory';
      retroAudio.playLevelUp();
      retroAudio.stopBgm();
      this.pushCombatLog(
        'THE BLIGHT CONQUERED! Inhuman cleared all 666 rooms across all 111 Wings!',
        'room'
      );
      this.emitHud(true);
      return;
    }

    this.snapshotCurrentRoomMemory();
    this.enemies = [];
    this.tokenPool.clear();
    this.projectiles.forEach((proj) => {
      proj.active = false;
    });

    const nextRoomNum = this.roomNumber + 1;
    this.setupRoomNumber(nextRoomNum, true, 'south');

    this.doorCooldown = 0.75;
    this.doorLockWarnCooldown = 0;
    this.shortcutWarnCooldown = 0;
    this.shortcutPromptState = { activeDoorId: null, declinedDoorId: null };
    this.roomTransitionAlpha = 0.88;

    // Snap camera gently near the South doorway entry
    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    this.camOriginX = BUF_W * 0.5 - pScreen.x;
    this.camOriginY = BUF_H * 0.56 - pScreen.y;

    retroAudio.playDash();
    hapticsEngine.trigger('dash');

    if (!this.roomCleared) {
      this.spawnRoomEncounter(nextRoomNum);
    } else {
      const room = this.getCurrentRoom();
      this.bannerText = `ROOM ${nextRoomNum}/${TOTAL_DUNGEON_ROOMS} · ${room.name} (CLEARED)`;
      this.bannerTimer = 2.0;
    }
    this.emitHud(true);
  }

  private returnToPreviousRoom(): void {
    if (!canReturnToPreviousRoom(this.roomNumber)) return;

    this.snapshotCurrentRoomMemory();
    this.enemies = [];
    this.tokenPool.clear();
    this.projectiles.forEach((proj) => {
      proj.active = false;
    });

    const prevRoomNum = this.roomNumber - 1;
    this.setupRoomNumber(prevRoomNum, true, 'north');

    this.doorCooldown = 0.75;
    this.doorLockWarnCooldown = 0;
    this.shortcutWarnCooldown = 0;
    this.shortcutPromptState = { activeDoorId: null, declinedDoorId: null };
    this.roomTransitionAlpha = 0.88;

    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    this.camOriginX = BUF_W * 0.5 - pScreen.x;
    this.camOriginY = BUF_H * 0.56 - pScreen.y;

    retroAudio.playDash();
    hapticsEngine.trigger('dash');

    if (!this.roomCleared) {
      this.spawnRoomEncounter(prevRoomNum);
    } else {
      const room = this.getCurrentRoom();
      this.bannerText = `RETURNED TO ROOM ${prevRoomNum}/${TOTAL_DUNGEON_ROOMS} · ${room.name}`;
      this.bannerTimer = 2.1;
    }
    this.emitHud(true);
  }

  private spawnRoomEncounter(roomOrder: number): void {
    const spec = generateWaveSpec(roomOrder, this.difficulty);
    const info = getRoomProgressionInfo(roomOrder);
    const room = this.getCurrentRoom();
    const maze = this.getCurrentMaze();
    const activeWalls = getActiveMazeWalls(maze);

    this.waveNumber = roomOrder;
    this.roomTotalEnemies = spec.totalEnemies;
    this.tokenPool.clear();
    this.tokenPool.setCapacity(spec.maxConcurrentTokens);

    this.bannerText = info.isFinalBossRoom
      ? `FINAL BOSS DUEL 666/666 · ${room.name}`
      : info.isBossRoom
        ? `BOSS DUEL ${roomOrder}/${TOTAL_DUNGEON_ROOMS} · ${room.name} (1 HIGH-POWERED BOSS)`
        : `ROOM ${roomOrder}/${TOTAL_DUNGEON_ROOMS} LOCKED · ${room.name} (${spec.totalEnemies} FOES)`;
    this.bannerTimer = 2.5;

    let spawnIdx = 0;
    const totalCount = spec.totalEnemies;
    const mazeSpawnPts = pickMazeSpawnPoints(
      maze,
      [{ x: this.player.x, y: this.player.y }],
      totalCount,
      this.buildRoomSeed(roomOrder, this.dungeonDepth) + 97,
      3.0,
      ROOM_BOUNDS
    );

    for (const entry of spec.spawns) {
      const cfg = ENEMY_ARCHETYPES[entry.archetype];
      const scaledHp = Math.max(12, Math.round(cfg.maxHp * spec.hpMultiplier));
      const scaledDmg = Math.max(5, Math.round(cfg.attackDamage * spec.damageMultiplier));
      const scaledTelegraph = Math.max(0.22, cfg.telegraphDuration * spec.telegraphMultiplier);
      const scaledCooldown = Math.max(0.55, cfg.attackCooldown * spec.cooldownMultiplier);

      for (let i = 0; i < entry.count; i++) {
        const chosen = mazeSpawnPts[spawnIdx] ?? { x: 9.0, y: 7.0 };
        spawnIdx++;

        const clamped = clampToArena(chosen.x, chosen.y, ROOM_BOUNDS, 1.2);
        const resolved = resolveMazeCollisions(clamped.x, clamped.y, cfg.radius + 0.12, activeWalls);
        const id = `enemy_${++this.enemyIdCounter}`;

        this.enemies.push({
          id,
          archetype: entry.archetype,
          x: resolved.x,
          y: resolved.y,
          vx: 0,
          vy: 0,
          facingLeft: resolved.x > this.player.x,
          hp: scaledHp,
          maxHp: scaledHp,
          attackDamage: scaledDmg,
          attackCooldown: scaledCooldown,
          radius: cfg.radius,
          speed: cfg.speed * spec.speedMultiplier,
          flankSide: spawnIdx % 2 === 0 ? 1 : -1,
          cooldown: (0.9 + (spawnIdx % 4) * 0.3) * spec.cooldownMultiplier,
          state: 'idle',
          stateTimer: 0,
          telegraphMax: scaledTelegraph,
          aimX: -1,
          aimY: 0,
          attackApplied: false,
          hitFlashTimer: 0,
          walkPhase: 0,
          scaleX: 1,
          scaleY: 1,
          xpValue: Math.round((cfg.isBoss ? 120 : 28) * spec.xpMultiplier),
          scoreValue: Math.round(cfg.scoreValue * spec.scoreMultiplier),
        });

        this.spawnRing(resolved.x, resolved.y, 1.5, cfg.isBoss ? '#EA580C' : '#84CC16', 0.45);
        if (cfg.isBoss) {
          this.bossTrailHp = scaledHp;
          this.bossTrailHoldTimer = 0;
        }
      }
    }

    if (spec.isBossWave) {
      this.addScreenShake(0.42, 0, 1, 0.14);
      hapticsEngine.trigger('waveClear', 1.1);
    }
  }

  private spawnWaveClearLoot(waveNum: number): void {
    const spec = generateWaveSpec(waveNum, this.difficulty);
    const p = this.player;
    const maze = this.getCurrentMaze();

    const activeWalls = getActiveMazeWalls(maze);

    const safeDropPos = (rawX: number, rawY: number) => {
      const clamped = clampToArena(rawX, rawY, ROOM_BOUNDS, 1.3);
      return resolveMazeCollisions(clamped.x, clamped.y, 0.45, activeWalls);
    };

    // 1. Guaranteed escalating stacking Power-Up Orbs dropped around the player
    for (let i = 0; i < spec.powerUpDropCount; i++) {
      const ang = (i / Math.max(1, spec.powerUpDropCount)) * Math.PI * 2 + 0.4;
      const pos = safeDropPos(p.x + Math.cos(ang) * 1.9, p.y + Math.sin(ang) * 1.9);
      const drop = createWavePowerUp(waveNum);
      this.pickups.push({
        id: `pw_${Date.now()}_${i}_${Math.random()}`,
        x: pos.x,
        y: pos.y,
        kind: 'powerup',
        life: 60,
        powerUp: drop,
      });
      this.spawnRing(pos.x, pos.y, 1.6, RARITY_META[drop.rarity].color, 0.5);
    }

    // 2. Guaranteed RPG Equipment drop every room
    const gearPos = safeDropPos(p.x + 1.5, p.y - 1.2);
    const gear = generateGearDrop(waveNum, spec.isBossWave ? 1 : 0);
    this.pickups.push({
      id: `gear_pk_${Date.now()}_${Math.random()}`,
      x: gearPos.x,
      y: gearPos.y,
      kind: 'gear',
      life: 60,
      gearItem: gear,
    });
    this.spawnRing(gearPos.x, gearPos.y, 1.7, RARITY_META[gear.rarity].color, 0.55);

    // 3. Guaranteed Serum VST Preset File drop if under 10/10 Preset Files
    if (this.presetsCollected < SERUM_PRESETS_MAX) {
      const presetPos = safeDropPos(p.x, p.y + 1.5);
      this.pickups.push({
        id: `preset_wave_${waveNum}_${Math.random()}`,
        x: presetPos.x,
        y: presetPos.y,
        kind: 'preset',
        life: 90,
      });
      this.spawnRing(presetPos.x, presetPos.y, 1.6, '#84CC16', 0.5);
    }

    // 4. Bonus dark-fantasy consumable drop
    const conPos = safeDropPos(p.x - 1.5, p.y + 1.1);
    this.pickups.push({
      id: `con_pk_${Date.now()}_${Math.random()}`,
      x: conPos.x,
      y: conPos.y,
      kind: 'consumable',
      consumableKind: p.hp < p.maxHp * 0.7 ? 'medkit' : 'aether_flask',
      life: 60,
    });
  }

  private addItemToInventory(item: InventoryItem): void {
    if (item.kind === 'consumable' && item.consumableKind) {
      const existingIdx = this.inventory.findIndex(
        (it) => it.kind === 'consumable' && it.consumableKind === item.consumableKind
      );
      if (existingIdx >= 0) {
        const next = [...this.inventory];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: (next[existingIdx].quantity ?? 1) + (item.quantity ?? 1),
        };
        this.inventory = next;
        return;
      }
    }
    this.inventory = [item, ...this.inventory].slice(0, 24);
  }

  private grantXp(amount: number): void {
    this.xp += amount;
    let gainedSkillPoints = 0;
    while (this.xp >= xpRequiredForLevel(this.level)) {
      this.xp -= xpRequiredForLevel(this.level);
      this.level += 1;
      this.skillPoints += 1;
      gainedSkillPoints += 1;
    }

    if (gainedSkillPoints > 0) {
      this.skillPointGrantSeq += 1;
      this.levelUpAnimTimer = this.levelUpAnimDuration;
      this.levelUpAnimLevel = this.level;
      this.levelUpEventSeq += 1;
      this.syncPlayerMaxHp(false);
      this.player.hp = this.player.maxHp;
      this.player.astral = Math.min(this.player.maxAstral, this.player.astral + 40);
      this.spawnRing(this.player.x, this.player.y, 3.4, '#FDE047', 0.65);
      this.spawnRing(this.player.x, this.player.y, 2.3, '#BEF264', 0.45);
      this.spawnBurst(this.player.x, this.player.y, 16, 28, '#FDE047', 86);
      this.spawnFloatingText(
        this.player.x,
        this.player.y,
        36,
        `LEVEL ${this.level}! +${gainedSkillPoints} SP`,
        '#FDE047'
      );
      this.addScreenShake(0.42, 0, -1, 0.18);
      retroAudio.playLevelUp();
      hapticsEngine.trigger('levelUp');
      this.pushCombatLog(
        `LEVEL UP! Inhuman reached LV.${this.level} (+${gainedSkillPoints} Skill Point${gainedSkillPoints === 1 ? '' : 's'}).`,
        'level'
      );

      // Every 6 character levels, summon the hooded-cloak Shopkeeper — deferred if a Boss Battle is active!
      if (shouldSpawnShopkeeperForPlayerLevel(this.level, this.lastShopPlayerLevel)) {
        this.lastShopPlayerLevel = this.level;
        if (!isShopkeeperAllowed(this.roomNumber, this.roomCleared)) {
          this.pendingShopkeeperAfterBoss = true;
        } else if (!this.shopkeeper) {
          const bestPt = this.pickShopkeeperSpot(this.player.x, this.player.y, 53);
          this.shopkeeper = { x: bestPt.x, y: bestPt.y };
          this.spawnRing(bestPt.x, bestPt.y, 2.4, '#F59E0B', 0.55);
          this.spawnBurst(bestPt.x, bestPt.y, 12, 16, '#FDE68A', 64);
          this.spawnFloatingText(bestPt.x, bestPt.y, 34, 'SHOPKEEPER APPEARED!', '#FDE68A');
          this.pushCombatLog(`Hooded Shopkeeper appeared: "${SHOPKEEPER_GREETING}"`, 'shop');
        }
      }

      this.emitHud(true);
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    if (code === 'KeyM' && !e.repeat) {
      this.toggleMute();
      return;
    }

    if ((code === 'KeyQ' || code === 'Space') && !e.repeat && this.phase === 'playing') {
      this.useQuickHeal();
      return;
    }

    if (
      code === 'KeyE' &&
      !e.repeat &&
      this.phase === 'playing' &&
      this.shortcutPromptState.activeDoorId &&
      this.shortcutPromptState.declinedDoorId !== this.shortcutPromptState.activeDoorId &&
      this.keys > 0
    ) {
      this.confirmUnlockNearbyShortcut();
      return;
    }

    if (
      code === 'KeyN' &&
      !e.repeat &&
      this.phase === 'playing' &&
      this.shortcutPromptState.activeDoorId &&
      this.shortcutPromptState.declinedDoorId !== this.shortcutPromptState.activeDoorId
    ) {
      this.declineNearbyShortcut();
      return;
    }

    if ((code === 'Escape' || code === 'KeyP') && !e.repeat) {
      if (this.phase === 'playing') {
        this.pause();
      } else if (this.phase === 'paused') {
        this.resume();
      }
      return;
    }

    if (code === 'KeyR' && !e.repeat && (this.phase === 'playing' || this.phase === 'paused')) {
      this.startNewRun();
      return;
    }

    if (this.phase !== 'playing') return;

    if (!this.held.has(code)) {
      this.justPressed.add(code);
    }
    this.held.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private handleWindowBlur = (): void => {
    this.held.clear();
    this.justPressed.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.player.defendHeldTouch = false;
    this.player.defending = false;
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.held.clear();
      this.justPressed.clear();
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.player.defendHeldTouch = false;
      this.player.defending = false;
    }
  };

  private handleCanvasPointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'playing') return;
    if (e.button === 0) {
      this.justPressed.add('KeyJ');
    } else if (e.button === 2) {
      this.justPressed.add('KeyK');
    }
  };

  private handleResize = (): void => {
    if (this.canvas.width !== BUF_W || this.canvas.height !== BUF_H) {
      this.canvas.width = BUF_W;
      this.canvas.height = BUF_H;
    }
    this.ctx.imageSmoothingEnabled = false;
    this.needsStaticRedraw = true;
  };

  private attachEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);

    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      window.addEventListener('resize', this.handleResize);
    }
  }

  public destroy(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    retroAudio.stopBgm();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
  }

  private loop = (now: number): void => {
    const rawDt = Math.max(0, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;
    const dt = Math.min(rawDt, 0.05);

    this.totalTime += dt;

    if (this.phase === 'playing') {
      this.tickPlaying(dt);
      this.renderFrame();
    } else if (this.phase !== 'title' && this.needsStaticRedraw) {
      this.needsStaticRedraw = false;
      this.renderFrame();
    }

    this.justPressed.clear();

    this.rafId = window.requestAnimationFrame(this.loop);
  };

  private tickPlaying(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    this.shakeKickX *= Math.pow(0.002, dt);
    this.shakeKickY *= Math.pow(0.002, dt);
    this.impactFlash = Math.max(0, this.impactFlash - dt * 2.4);
    this.roomTransitionAlpha = Math.max(0, this.roomTransitionAlpha - dt * 3.1);
    this.doorCooldown = Math.max(0, this.doorCooldown - dt);
    this.doorLockWarnCooldown = Math.max(0, this.doorLockWarnCooldown - dt);
    this.shortcutWarnCooldown = Math.max(0, this.shortcutWarnCooldown - dt);
    if (this.levelUpAnimTimer > 0) {
      this.levelUpAnimTimer = Math.max(0, this.levelUpAnimTimer - dt);
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerText = null;
      }
    }

    if (this.defeatDelayTimer > 0) {
      this.defeatDelayTimer -= dt;
      this.updateParticles(dt * 0.45);
      if (this.defeatDelayTimer <= 0) {
        this.phase = 'gameover';
        retroAudio.stopBgm();
        this.emitHud(true);
      }
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.player.hitFlashTimer = Math.max(0, this.player.hitFlashTimer - dt);
      for (const e of this.enemies) {
        e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      }
      return;
    }

    this.runTime += dt;

    // Serum Potency Recovery & Passive Charge when left unused
    const stats = this.getEffectiveStats();
    this.serumState = tickSerumRecovery(this.serumState, dt, stats.serumRecoveryMult);
    if (this.presetsCollected > 0 && this.player.astral < this.player.maxAstral) {
      this.player.astral = Math.min(
        this.player.maxAstral,
        this.player.astral + 5.5 * stats.serumRecoveryMult * dt
      );
    }

    if (this.combo > 0) {
      this.comboDecayTimer -= dt;
      if (this.comboDecayTimer <= 0) {
        this.combo = 0;
        this.comboDecayTimer = 0;
        this.comboMilestoneBannerTimer = 0;
        this.comboMilestoneLabel = null;
      }
    }

    if (this.comboFlashTimer > 0) {
      this.comboFlashTimer = Math.max(0, this.comboFlashTimer - dt);
    }
    if (this.comboMilestoneBannerTimer > 0) {
      this.comboMilestoneBannerTimer = Math.max(0, this.comboMilestoneBannerTimer - dt);
      if (this.comboMilestoneBannerTimer <= 0) {
        this.comboMilestoneLabel = null;
      }
    }
    if (this.afterimageEmitCooldown > 0) {
      this.afterimageEmitCooldown = Math.max(0, this.afterimageEmitCooldown - dt);
    }

    // Smoothly decay Boss Health trailing damage ghost bar
    const activeBoss = this.enemies.find((e) => e.archetype === 'warden' && e.state !== 'ko');
    if (activeBoss) {
      if (this.bossTrailHp < activeBoss.hp) {
        this.bossTrailHp = activeBoss.hp;
      } else if (this.bossTrailHp > activeBoss.hp) {
        if (this.bossTrailHoldTimer > 0) {
          this.bossTrailHoldTimer = Math.max(0, this.bossTrailHoldTimer - dt);
        } else {
          const decayRate = Math.max(35, activeBoss.maxHp * 0.35);
          this.bossTrailHp = Math.max(activeBoss.hp, this.bossTrailHp - decayRate * dt);
        }
      }
    } else {
      this.bossTrailHp = 0;
      this.bossTrailHoldTimer = 0;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateShrines(dt);
    this.updatePickups(dt);
    stepAmbientCritters(
      this.ambientCritters,
      dt,
      this.totalTime,
      this.player.x,
      this.player.y,
      getActiveMazeWalls(this.currentMaze)
    );
    this.updateParticles(dt);
    this.updateRoomLockProgression();
    this.updateCamera(dt);

    if (this.totalTime - this.lastHudEmit > 0.065) {
      this.emitHud(false);
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const stats = this.getEffectiveStats();
    const classSpec = getFighterClass(this.character.fighterClass);

    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    p.defendMinTimer = Math.max(0, p.defendMinTimer - dt);
    p.timeSincePunchEnd += dt;

    p.scaleX += (1 - p.scaleX) * Math.min(1, dt * 15);
    p.scaleY += (1 - p.scaleY) * Math.min(1, dt * 15);

    if (this.bufferedAction) {
      this.bufferedAction.timer -= dt;
      if (this.bufferedAction.timer <= 0) this.bufferedAction = null;
    }
    if (this.justPressed.has('KeyK') || this.justPressed.has('KeyX')) {
      p.defendMinTimer = Math.max(p.defendMinTimer, 0.35);
    }
    if (this.justPressed.has('KeyL') || this.justPressed.has('KeyC')) {
      this.bufferedAction = { action: 'special', timer: 0.13 };
    } else if (this.justPressed.has('KeyJ') || this.justPressed.has('KeyZ')) {
      this.bufferedAction = { action: 'attack1', timer: 0.13 };
    } else if (this.justPressed.has('ShiftLeft') || this.justPressed.has('ShiftRight')) {
      this.bufferedAction = { action: 'dash', timer: 0.13 };
    }

    let sdx = 0;
    let sdy = 0;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) sdx -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) sdx += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) sdy -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) sdy += 1;
    if (
      sdx === 0 &&
      sdy === 0 &&
      (Math.abs(this.touchMoveX) > 0.08 || Math.abs(this.touchMoveY) > 0.08)
    ) {
      sdx = this.touchMoveX;
      sdy = this.touchMoveY;
    }
    const isoDir = screenInputToIsoDir(sdx, sdy);

    if (p.z <= 0.01) {
      p.coyoteTimer = 0.1;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      const dashSpeed = 11.2 * stats.moveSpeedMult;
      p.vx = p.dashDirX * dashSpeed;
      p.vy = p.dashDirY * dashSpeed;
      if (Math.random() < 0.65) {
        this.spawnParticle(p.x, p.y, p.z + 10, 0, 0, 4, 2, 0.16, classSpec.accentHex, 0);
      }
    } else if (p.hurtTimer > 0) {
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
    } else {
      const canAct = p.attackKind === null;
      if (this.bufferedAction) {
        if (this.bufferedAction.action === 'dash' && p.dashCooldown <= 0 && canAct) {
          p.dashTimer = 0.17;
          p.dashCooldown = stats.dashCooldown;
          p.invulnTimer = Math.max(p.invulnTimer, 0.28);
          p.dashDirX = isoDir.vx !== 0 || isoDir.vy !== 0 ? isoDir.vx : p.facingX;
          p.dashDirY = isoDir.vx !== 0 || isoDir.vy !== 0 ? isoDir.vy : p.facingY;
          p.scaleX = 1.25;
          p.scaleY = 0.82;
          retroAudio.playDash();
          hapticsEngine.trigger('dash');
          this.addScreenShake(0.14, p.dashDirX, p.dashDirY);

          if (stats.hasDashAftershock) {
            this.triggerBonusShockwave(
              p.x,
              p.y,
              2.3,
              Math.round(22 * stats.meleeDamageMult),
              '#34D399'
            );
          }
          this.bufferedAction = null;
        } else if (this.bufferedAction.action === 'special' && canAct) {
          if (this.presetsCollected < SERUM_PRESET_COST_PER_CAST) {
            this.spawnFloatingText(
              p.x,
              p.y,
              30,
              `NEED ${SERUM_PRESET_COST_PER_CAST} SAMPLE PACKS (${this.presetsCollected}/${SERUM_PRESETS_MAX})!`,
              '#FCA5A5'
            );
            retroAudio.playTelegraph();
            this.bufferedAction = null;
          } else if (canActivateSerum(this.presetsCollected, p.astral, stats.specialCost)) {
            const preCastPresets = this.presetsCollected;
            const { nextState, castPotency } = applySerumCast(this.serumState);
            this.serumState = nextState;
            const presetRatio = getSerumPresetPower(preCastPresets);
            this.activeSerumCastPower = Math.max(0.1, presetRatio * castPotency);
            // Each Serum VST cast drains 2 Sample Packs!
            this.presetsCollected = consumeSerumPresets(preCastPresets);

            this.beginPlayerAttack('special');
            p.astral = Math.max(0, p.astral - stats.specialCost);
            p.invulnTimer = Math.max(p.invulnTimer, 0.5);

            const visualRadiusScale = 0.58 + 0.42 * this.activeSerumCastPower;
            this.spawnRing(
              p.x,
              p.y,
              3.2 * stats.specialRangeMult * visualRadiusScale,
              '#84CC16',
              0.46
            );
            this.spawnRing(
              p.x,
              p.y,
              2.3 * stats.specialRangeMult * visualRadiusScale,
              '#D97706',
              0.36
            );
            this.spawnBurst(p.x, p.y, 12, 20, '#84CC16', 72);

            const pct = Math.round(this.activeSerumCastPower * 100);
            const label =
              castPotency < 0.88
                ? `SERUM VST ${pct}% (-2 PACKS · ${this.presetsCollected}/${SERUM_PRESETS_MAX})`
                : `SERUM VST ${pct}% (-2 · ${this.presetsCollected}/${SERUM_PRESETS_MAX})`;
            this.spawnFloatingText(
              p.x,
              p.y,
              32,
              label,
              castPotency < 0.7 ? '#FB923C' : '#BEF264'
            );

            retroAudio.playSpecial();
            hapticsEngine.trigger('special', Math.max(0.45, this.activeSerumCastPower));
            this.addScreenShake(0.38 + 0.45 * this.activeSerumCastPower, 0, -1, 0.2);
            this.pushCombatLog(
              `Cast Serum VST at ${pct}% power (-${SERUM_PRESET_COST_PER_CAST} Sample Packs, ${this.presetsCollected}/${SERUM_PRESETS_MAX} left).`,
              'serum'
            );
            this.bufferedAction = null;
            this.emitHud(true);
          } else {
            this.spawnFloatingText(p.x, p.y, 28, 'LOW SERUM VST CHARGE', '#FDE68A');
            this.bufferedAction = null;
          }
        } else if (this.bufferedAction.action === 'attack1' && canAct) {
          p.defending = false;
          p.defendMinTimer = 0;
          const next = nextPunchComboStep(p.comboStep, p.timeSincePunchEnd);
          p.comboStep = next.step;
          this.beginPlayerAttack(next.kind);
          this.bufferedAction = null;
        }
      }

      const defendInputActive =
        this.held.has('KeyK') ||
        this.held.has('KeyX') ||
        p.defendHeldTouch ||
        p.defendMinTimer > 0;
      const prevDefending = p.defending;
      p.defending =
        defendInputActive &&
        p.attackKind === null &&
        p.dashTimer <= 0 &&
        p.hurtTimer <= 0 &&
        p.hp > 0;
      if (p.defending) {
        p.defendDuration = prevDefending ? p.defendDuration + dt : 0;
      } else {
        p.defendDuration = 0;
      }
      if (prevDefending !== p.defending) {
        this.emitHud(true);
      }

      const speedFactor = p.defending
        ? 0.42
        : p.attackKind && p.z <= 0.1
          ? 0.34
          : 1.0;
      const moveSpeed = 5.0 * speedFactor * stats.moveSpeedMult;
      p.vx = isoDir.vx * moveSpeed;
      p.vy = isoDir.vy * moveSpeed;

      if (Math.abs(sdx) > 0.05 || Math.abs(sdy) > 0.05) {
        p.facingX = isoDir.vx;
        p.facingY = isoDir.vy;
        if (sdx < -0.05) p.facingLeft = true;
        if (sdx > 0.05) p.facingLeft = false;
      }
    }

    const prevX = p.x;
    const prevY = p.y;
    const maze = this.getCurrentMaze();

    // Detect proximity to Key-Locked Maze Shortcut Doors and ask player before spending a key
    const nearShortcut = findNearbyLockedMazeDoor(maze, p.x, p.y, 1.65);
    const prevActiveDoor = this.shortcutPromptState.activeDoorId;
    const promptEval = evaluateShortcutPromptState(
      this.shortcutPromptState,
      nearShortcut ? nearShortcut.id : null,
      this.keys
    );
    this.shortcutPromptState = promptEval.nextState;

    if (nearShortcut && this.keys <= 0 && this.shortcutWarnCooldown <= 0) {
      this.shortcutWarnCooldown = 1.85;
      this.spawnFloatingText(
        nearShortcut.cx,
        nearShortcut.cy,
        28,
        'LOCKED SHORTCUT · NEED KEY',
        '#FDE68A'
      );
      retroAudio.playTelegraph();
      this.pushCombatLog(
        'Maze Shortcut Gate locked — slay enemies for a Skeleton Key.',
        'door'
      );
      this.emitHud(true);
    } else if (prevActiveDoor !== this.shortcutPromptState.activeDoorId) {
      this.emitHud(true);
    }

    const activeWalls = getActiveMazeWalls(maze);
    const clamped = clampToArena(p.x + p.vx * dt, p.y + p.vy * dt, ROOM_BOUNDS, 0.62);
    const resolved = resolveMazeCollisions(clamped.x, clamped.y, 0.38, activeWalls);
    p.x = resolved.x;
    p.y = resolved.y;

    // Check North Exit Door (unsealed after clearing room) AND South Return Door (return to previous room)
    if (this.doorCooldown <= 0) {
      const distToExit = isoDistance(p.x, p.y, SINGLE_EXIT_DOOR_POS.x, SINGLE_EXIT_DOOR_POS.y);
      if (distToExit <= 1.2) {
        if (this.isCurrentRoomLocked()) {
          p.y = Math.max(p.y, SINGLE_EXIT_DOOR_POS.y + 0.42);
          if (this.doorLockWarnCooldown <= 0) {
            this.doorLockWarnCooldown = 0.95;
            const alive = this.enemies.filter((e) => e.state !== 'ko').length;
            this.spawnFloatingText(
              p.x,
              p.y,
              30,
              `EXIT SEALED · ${alive} FOE${alive === 1 ? '' : 'S'} LEFT`,
              '#FCA5A5'
            );
            retroAudio.playTelegraph();
            hapticsEngine.trigger('lightHit', 0.35);
          }
        } else {
          this.advanceToNextRoom();
          return;
        }
      }

      if (canReturnToPreviousRoom(this.roomNumber)) {
        const distToReturn = isoDistance(p.x, p.y, RETURN_DOOR_POS.x, RETURN_DOOR_POS.y);
        if (distToReturn <= 1.2) {
          this.returnToPreviousRoom();
          return;
        }
      }
    }

    const distMoved = Math.hypot(p.x - prevX, p.y - prevY);
    if (distMoved > 0.001 && p.z <= 0.1) {
      p.walkPhase += distMoved * 2.2;
    }

    if (p.z > 0 || p.vz !== 0) {
      p.z += p.vz * dt;
      p.vz -= GRAVITY * dt;
      if (p.z <= 0) {
        p.z = 0;
        p.vz = 0;
        p.scaleX = 1.2;
        p.scaleY = 0.82;
        retroAudio.playLand();
        this.spawnBurst(p.x, p.y, 1, 4, '#78716C', 18);
      }
    }

    if (p.attackKind) {
      const spec = ATTACK_SPECS[p.attackKind];
      p.attackTimer += dt;
      const inActive =
        p.attackTimer >= spec.windup && p.attackTimer <= spec.windup + spec.active;

      if (inActive) {
        this.resolvePlayerAttackHits(spec);
      }

      if (p.attackTimer >= spec.windup + spec.active + spec.recovery) {
        const wasPunch =
          p.attackKind === 'punch1' || p.attackKind === 'punch2' || p.attackKind === 'punch3';
        if (wasPunch) {
          p.timeSincePunchEnd = 0;
          if (p.attackKind === 'punch3') p.comboStep = 0;
        }
        p.attackKind = null;
        p.attackTimer = 0;
        p.attackHasHit.clear();
      }
    }
  }

  private beginPlayerAttack(kind: AttackKind): void {
    const p = this.player;
    const weaponKind = getWeaponVisualKind(this.equipped.weapon);
    const profile = getWeaponAttackProfile(weaponKind);
    p.attackKind = kind;
    p.attackTimer = 0;
    p.attackHasHit.clear();
    p.defending = false;
    p.defendMinTimer = 0;
    p.scaleX = kind === 'punch3' ? (profile.heavyTrail ? 1.24 : 1.18) : 1.09;
    p.scaleY = kind === 'punch3' ? 0.87 : 0.91;
    if (kind !== 'special') {
      retroAudio.playSwing(kind === 'punch3' || profile.heavyTrail);
      // Spawn weapon-specific swing VFX particles in front of Inhuman
      const fxX = p.x + p.facingX * 0.95;
      const fxY = p.y + p.facingY * 0.95;
      if (weaponKind === 'blade') {
        this.spawnBurst(fxX, fxY, p.z + 14, kind === 'punch3' ? 10 : 6, profile.primaryColor, 58);
      } else if (weaponKind === 'axe') {
        this.spawnBurst(fxX, fxY, p.z + 13, kind === 'punch3' ? 14 : 8, profile.primaryColor, 72);
        if (kind === 'punch3') {
          this.spawnRing(fxX, fxY, 1.55, profile.secondaryColor, 0.24);
        }
      } else if (weaponKind === 'flail') {
        this.spawnBurst(fxX, fxY, p.z + 14, kind === 'punch3' ? 12 : 7, profile.primaryColor, 66);
        if (kind === 'punch3') {
          this.spawnRing(p.x, p.y, 1.85, profile.primaryColor, 0.26);
        }
      } else if (weaponKind === 'gauntlets') {
        this.spawnBurst(fxX, fxY, p.z + 12, kind === 'punch3' ? 11 : 6, profile.primaryColor, 52);
      }
      const comboVfx = getComboVfxProfile(this.combo);
      if (comboVfx.afterimageActive && this.afterimageEmitCooldown <= 0) {
        this.spawnComboAfterimage(p.x, p.y, p.z, p.facingLeft, comboVfx.primaryColor);
        this.afterimageEmitCooldown = 0.08;
      }
    }
  }

  private triggerBonusShockwave(
    cx: number,
    cy: number,
    radius: number,
    damage: number,
    color: string
  ): void {
    this.spawnRing(cx, cy, radius, color, 0.34);
    this.addScreenShake(0.32, 0, 1, 0.09);
    for (const enemy of this.enemies) {
      if (enemy.state === 'ko') continue;
      if (isoDistance(cx, cy, enemy.x, enemy.y) <= radius + enemy.radius) {
        const prevEnemyHp = enemy.hp;
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hitFlashTimer = 0.08;
        if (enemy.archetype === 'warden') {
          this.notifyBossDamaged(enemy, prevEnemyHp);
        }
        this.registerComboHit(enemy.x, enemy.y, 16, false, true);
        this.spawnFloatingText(enemy.x, enemy.y, 26, `${damage}`, color);
        if (enemy.hp <= 0) {
          this.handleEnemyDefeated(enemy);
        }
      }
    }
  }

  private handleEnemyDefeated(enemy: EnemyEntity): void {
    if (enemy.state === 'ko') return;
    enemy.state = 'ko';
    enemy.stateTimer = 0;
    this.tokenPool.release(enemy.id);
    this.defeatedTotal++;

    const killScore = calculateHitScore(enemy.scoreValue, this.combo);
    const goldGain = enemy.archetype === 'warden' ? 140 : 14 + Math.min(40, this.waveNumber * 2);
    this.gold += goldGain;
    this.addScore(killScore);
    this.grantXp(enemy.xpValue);
    this.astralShards += enemy.archetype === 'warden' ? 40 : 6 + this.waveNumber;

    this.hitstopTimer = Math.max(this.hitstopTimer, 0.068);
    this.addScreenShake(enemy.archetype === 'warden' ? 0.72 : 0.45, 0, -1, 0.14);
    retroAudio.playEnemyKo();
    hapticsEngine.trigger('enemyKo', enemy.archetype === 'warden' ? 1.3 : 1);

    const foeName = ENEMY_ARCHETYPES[enemy.archetype].name;
    this.pushCombatLog(`Slain ${foeName} (+${enemy.xpValue} XP · +${goldGain}g).`, 'kill');

    this.spawnBurst(enemy.x, enemy.y, 12, 22, '#D97706', 84);
    this.spawnRing(enemy.x, enemy.y, 1.8, '#D97706', 0.35);
    this.spawnFloatingText(enemy.x, enemy.y, 32, `+${enemy.xpValue} XP · +${goldGain}g`, '#FDE68A');

    // Random Skeleton Key drop for unlocking Maze Shortcut Doors
    const lockedShortcuts = this.currentMaze.lockedDoors.filter((d) => !d.unlocked).length;
    const keyChance = computeKeyDropChance(enemy.archetype === 'warden', this.keys, lockedShortcuts);
    if (Math.random() < keyChance) {
      const activeWalls = getActiveMazeWalls(this.currentMaze);
      const keyClamped = clampToArena(enemy.x + 0.35, enemy.y + 0.25, ROOM_BOUNDS, 1.2);
      const keyPos = resolveMazeCollisions(keyClamped.x, keyClamped.y, 0.35, activeWalls);
      this.pickups.push({
        id: `pk_key_${Date.now()}_${Math.random()}`,
        x: keyPos.x,
        y: keyPos.y,
        kind: 'key',
        life: 90,
      });
      this.spawnRing(keyPos.x, keyPos.y, 1.5, '#F59E0B', 0.45);
      this.pushCombatLog(`${foeName} dropped a Skeleton Key!`, 'key');
    }

    if (enemy.archetype === 'warden') {
      const bossDrop = createWavePowerUp(this.waveNumber + 1);
      this.pickups.push({
        id: `boss_pw_${Date.now()}_${Math.random()}`,
        x: enemy.x,
        y: enemy.y,
        kind: 'powerup',
        life: 60,
        powerUp: bossDrop,
      });
      if (this.presetsCollected < SERUM_PRESETS_MAX) {
        this.pickups.push({
          id: `boss_preset_${Date.now()}_${Math.random()}`,
          x: Math.min(ROOM_BOUNDS.maxX - 1.5, enemy.x + 1.0),
          y: enemy.y,
          kind: 'preset',
          life: 90,
        });
      }
    } else if (this.presetsCollected < SERUM_PRESETS_MAX && Math.random() < 0.45) {
      this.pickups.push({
        id: `pk_preset_${Date.now()}_${Math.random()}`,
        x: enemy.x,
        y: enemy.y,
        kind: 'preset',
        life: 75,
      });
    } else if (Math.random() < 0.42) {
      const roll = Math.random();
      if (roll < 0.18) {
        const drop = createWavePowerUp(this.waveNumber);
        this.pickups.push({
          id: `pk_pw_${Date.now()}_${Math.random()}`,
          x: enemy.x,
          y: enemy.y,
          kind: 'powerup',
          life: 40,
          powerUp: drop,
        });
      } else {
        this.pickups.push({
          id: `pk_${Date.now()}_${Math.random()}`,
          x: enemy.x,
          y: enemy.y,
          kind: this.player.hp < this.player.maxHp * 0.6 ? 'health' : 'astral',
          life: 24,
        });
      }
    }
  }

  private resolvePlayerAttackHits(spec: (typeof ATTACK_SPECS)[AttackKind]): void {
    const p = this.player;
    const stats = this.getEffectiveStats();
    const diffCfg = DIFFICULTY_CONFIGS[this.difficulty];
    const weaponKind = getWeaponVisualKind(this.equipped.weapon);
    const weaponProfile = getWeaponAttackProfile(weaponKind);
    const isHeavy = spec.kind === 'punch3' || spec.kind === 'kick' || spec.kind === 'special';
    const serumScale = spec.isAoe ? this.activeSerumCastPower : 1;
    const effectiveRange = spec.isAoe
      ? spec.range * stats.specialRangeMult * (0.58 + 0.42 * serumScale)
      : spec.range * weaponProfile.reachMult;
    const baseDmg =
      spec.damage *
      (spec.isAoe
        ? stats.specialDamageMult * serumScale
        : stats.meleeDamageMult * weaponProfile.damageMult);
    const effectiveKnockback = spec.knockback * stats.knockbackMult;
    const effectiveAstralGain = Math.round(spec.astralGain * stats.astralGainMult);

    let landedHit = false;

    for (const enemy of this.enemies) {
      if (enemy.state === 'ko' || p.attackHasHit.has(enemy.id)) continue;

      const hit = spec.isAoe
        ? isoDistance(p.x, p.y, enemy.x, enemy.y) <= effectiveRange + enemy.radius
        : isTargetInMeleeArc(
            p.x,
            p.y,
            p.facingX,
            p.facingY,
            enemy.x,
            enemy.y,
            effectiveRange + enemy.radius,
            -0.2
          );

      if (!hit) continue;

      landedHit = true;
      p.attackHasHit.add(enemy.id);

      const isCrit = Math.random() < stats.critChance;
      const finalDamage = Math.max(
        1,
        Math.round(baseDmg * (isCrit ? stats.critDamageMult : 1))
      );

      const prevEnemyHp = enemy.hp;
      enemy.hp = Math.max(0, enemy.hp - finalDamage);
      enemy.hitFlashTimer = 0.09;
      enemy.scaleX = isCrit ? 1.32 : 1.24;
      enemy.scaleY = isCrit ? 0.72 : 0.78;
      if (enemy.archetype === 'warden') {
        this.notifyBossDamaged(enemy, prevEnemyHp);
      }

      const dx = enemy.x - p.x;
      const dy = enemy.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const kbScale = enemy.archetype === 'warden' ? 0.42 : 1;
      enemy.vx = (dx / d) * effectiveKnockback * kbScale;
      enemy.vy = (dy / d) * effectiveKnockback * kbScale;

      if (stats.lifestealOnHit > 0 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + stats.lifestealOnHit);
      }

      this.registerComboHit(enemy.x, enemy.y, 16, isCrit, isHeavy);
      p.astral = Math.min(p.maxAstral, p.astral + effectiveAstralGain);

      const hitPts = Math.round(
        calculateHitScore(isHeavy ? 50 : 28, this.combo) * diffCfg.scoreMult
      );
      this.addScore(hitPts);

      this.hitstopTimer = Math.max(
        this.hitstopTimer,
        isCrit ? spec.hitstop + 0.025 : spec.hitstop
      );
      this.addScreenShake(
        spec.shake * (isCrit ? 0.95 : 0.65),
        dx / d,
        dy / d,
        isCrit ? 0.16 : isHeavy ? 0.08 : 0
      );

      if (isCrit) {
        retroAudio.playCritHit();
        hapticsEngine.trigger('critHit');
      } else {
        retroAudio.playHit(isHeavy);
        hapticsEngine.trigger(isHeavy ? 'heavyHit' : 'lightHit');
      }

      this.spawnBurst(
        enemy.x,
        enemy.y,
        14,
        isCrit ? 22 : isHeavy ? 18 : 9,
        isCrit
          ? '#FDE047'
          : spec.kind === 'special'
            ? '#84CC16'
            : isHeavy
              ? '#D97706'
              : '#E7E5E4',
        isCrit ? 84 : isHeavy ? 72 : 48
      );
      this.spawnFloatingText(
        enemy.x,
        enemy.y,
        24,
        isCrit ? `CRIT ${finalDamage}!` : `${finalDamage}`,
        isCrit ? '#FDE047' : isHeavy ? '#FB923C' : '#F4EFE6'
      );

      const hitFoeName = ENEMY_ARCHETYPES[enemy.archetype].name;
      this.pushCombatLog(
        isCrit
          ? `CRIT! ${hitFoeName} took ${finalDamage} DMG (${this.combo}x combo).`
          : `Hit ${hitFoeName} for ${finalDamage} DMG.`,
        'attack'
      );

      if (enemy.hp <= 0) {
        this.handleEnemyDefeated(enemy);
      } else if (enemy.archetype !== 'warden' || isHeavy || isCrit) {
        this.tokenPool.release(enemy.id);
        enemy.state = 'hurt';
        enemy.stateTimer = isHeavy ? 0.28 : 0.17;
      }

      this.emitHud(true);
    }

    if (
      landedHit &&
      stats.hasQuakeFinisher &&
      (spec.kind === 'punch3' || spec.kind === 'kick') &&
      !p.attackHasHit.has('__quake_done__')
    ) {
      p.attackHasHit.add('__quake_done__');
      this.triggerBonusShockwave(
        p.x + p.facingX * 1.1,
        p.y + p.facingY * 1.1,
        2.4,
        Math.round(24 * stats.meleeDamageMult),
        '#D97706'
      );
    }

    // Destructible oak dungeon loot chests
    for (const crate of this.crates) {
      if (crate.broken || p.attackHasHit.has(crate.id)) continue;
      const dist = isoDistance(p.x, p.y, crate.x, crate.y);
      if (dist <= spec.range + 0.65) {
        p.attackHasHit.add(crate.id);
        crate.hp -= Math.round(Math.max(10, baseDmg));
        crate.hitFlashTimer = 0.08;
        this.addScreenShake(0.18, 0, 1);
        this.spawnBurst(crate.x, crate.y, 8, 8, '#A16207', 52);
        retroAudio.playCrateBreak();
        hapticsEngine.trigger('lightHit');
        if (crate.hp <= 0) {
          crate.broken = true;
          this.gold += 20;
          this.addScore(150);
          this.grantXp(22 + this.waveNumber * 5);
          this.spawnBurst(crate.x, crate.y, 8, 18, '#D97706', 74);
          this.spawnFloatingText(crate.x, crate.y, 24, '+20g', '#FDE047');

          if (this.presetsCollected < SERUM_PRESETS_MAX) {
            this.pickups.push({
              id: `pk_crate_preset_${crate.id}`,
              x: crate.x,
              y: crate.y,
              kind: 'preset',
              life: 80,
            });
          } else {
            const roll = Math.random();
            if (roll < 0.45) {
              const drop = createWavePowerUp(this.waveNumber);
              this.pickups.push({
                id: `pk_crate_pw_${crate.id}`,
                x: crate.x,
                y: crate.y,
                kind: 'powerup',
                life: 45,
                powerUp: drop,
              });
            } else if (roll < 0.78) {
              const gear = generateGearDrop(this.waveNumber);
              this.pickups.push({
                id: `pk_crate_gear_${crate.id}`,
                x: crate.x,
                y: crate.y,
                kind: 'gear',
                life: 45,
                gearItem: gear,
              });
            } else {
              this.pickups.push({
                id: `pk_crate_${crate.id}`,
                x: crate.x,
                y: crate.y,
                kind: 'consumable',
                consumableKind: p.hp < p.maxHp * 0.8 ? 'medkit' : 'overcharge',
                life: 45,
              });
            }
          }
          this.emitHud(true);
        }
      }
    }
  }

  private updateShrines(dt: number): void {
    const p = this.player;
    for (const shrine of this.shrines) {
      if (shrine.cooldown > 0) {
        shrine.cooldown = Math.max(0, shrine.cooldown - dt);
        continue;
      }

      if (isoDistance(p.x, p.y, shrine.x, shrine.y) <= 1.55) {
        shrine.cooldown = 36;
        this.spawnRing(shrine.x, shrine.y, 2.8, shrine.color, 0.5);
        this.spawnBurst(shrine.x, shrine.y, 14, 18, shrine.color, 65);
        retroAudio.playPowerUp();
        hapticsEngine.trigger('powerUp');
        this.addScreenShake(0.28, 0, -1, 0.08);

        if (shrine.kind === 'heal') {
          const heal = Math.round(p.maxHp * 0.55);
          p.hp = Math.min(p.maxHp, p.hp + heal);
          this.spawnFloatingText(shrine.x, shrine.y, 30, `ALTAR +${heal} HP`, '#34D399');
        } else if (shrine.kind === 'astral') {
          p.astral = p.maxAstral;
          this.serumState = { ...this.serumState, potency: 1.0 };
          this.grantXp(45 + this.waveNumber * 12);
          if (this.presetsCollected < SERUM_PRESETS_MAX) {
            this.collectPreset(shrine.x, shrine.y);
          } else {
            this.spawnFloatingText(shrine.x, shrine.y, 30, 'SERUM VST RESTORED +XP!', '#84CC16');
          }
        } else if (shrine.kind === 'forge') {
          const drop = createWavePowerUp(this.waveNumber + 1);
          this.powerUpStacks = applyPowerUpToStacks(this.powerUpStacks, drop);
          this.syncPlayerMaxHp(true);
          this.spawnFloatingText(shrine.x, shrine.y, 30, `ANVIL ${drop.shortTag}`, drop.color);
        } else {
          const gear = generateGearDrop(this.waveNumber + 1, 1);
          this.addItemToInventory(gear);
          this.spawnFloatingText(
            shrine.x,
            shrine.y,
            30,
            `FOUND ${gear.name}!`,
            RARITY_META[gear.rarity].color
          );
        }

        this.emitHud(true);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    const maze = this.getCurrentMaze();
    const activeWalls = getActiveMazeWalls(maze);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      e.scaleX += (1 - e.scaleX) * Math.min(1, dt * 12);
      e.scaleY += (1 - e.scaleY) * Math.min(1, dt * 12);

      if (e.state === 'ko') {
        e.stateTimer += dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= Math.pow(0.08, dt);
        e.vy *= Math.pow(0.08, dt);
        if (e.stateTimer >= 0.45) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      e.cooldown = Math.max(0, e.cooldown - dt);

      if (e.state === 'hurt') {
        e.stateTimer -= dt;
        e.vx *= Math.pow(0.04, dt);
        e.vy *= Math.pow(0.04, dt);
        if (e.stateTimer <= 0) {
          e.state = 'idle';
        }
      } else if (e.state === 'telegraph') {
        e.vx = 0;
        e.vy = 0;
        e.stateTimer += dt;
        if (e.stateTimer >= e.telegraphMax) {
          e.state = 'attack';
          e.stateTimer = 0;
          e.attackApplied = false;
          if (e.archetype === 'lancer') {
            const chargeSpeed = 11.2 * (1 + Math.min(0.45, (this.waveNumber - 1) * 0.04));
            e.vx = e.aimX * chargeSpeed;
            e.vy = e.aimY * chargeSpeed;
            retroAudio.playDash();
          } else if (e.archetype === 'hexer') {
            this.fireEnemyProjectile(e.x, e.y, e.aimX, e.aimY, e.attackDamage);
            retroAudio.playSwing(false);
          } else {
            retroAudio.playSwing(true);
          }
        }
      } else if (e.state === 'attack') {
        e.stateTimer += dt;

        if (e.archetype === 'lancer') {
          if (!e.attackApplied && p.z < 14 && isoDistance(e.x, e.y, p.x, p.y) <= 1.05) {
            e.attackApplied = true;
            this.damagePlayer(e.attackDamage, e.aimX, e.aimY);
          }
          if (e.stateTimer >= 0.36) {
            this.finishEnemyAttack(e, e.attackCooldown);
          }
        } else if (e.archetype === 'hexer') {
          e.vx = 0;
          e.vy = 0;
          if (e.stateTimer >= 0.24) {
            this.finishEnemyAttack(e, e.attackCooldown);
          }
        } else if (e.archetype === 'warden') {
          e.vx = 0;
          e.vy = 0;
          if (!e.attackApplied && e.stateTimer >= 0.08) {
            e.attackApplied = true;
            this.spawnRing(e.x, e.y, 2.85, '#EA580C', 0.42);
            this.addScreenShake(0.55, 0, 1, 0.12);
            hapticsEngine.trigger('heavyHit', 1.15);
            if (p.z < 15 && isoDistance(e.x, e.y, p.x, p.y) <= 2.75) {
              const dx = p.x - e.x;
              const dy = p.y - e.y;
              const d = Math.hypot(dx, dy) || 1;
              this.damagePlayer(e.attackDamage, dx / d, dy / d);
            }
          }
          if (e.stateTimer >= 0.38) {
            this.finishEnemyAttack(e, e.attackCooldown);
          }
        } else {
          e.vx = e.aimX * 2.2;
          e.vy = e.aimY * 2.2;
          if (
            !e.attackApplied &&
            e.stateTimer >= 0.06 &&
            p.z < 12 &&
            isoDistance(e.x, e.y, p.x, p.y) <= 1.45
          ) {
            e.attackApplied = true;
            this.damagePlayer(e.attackDamage, e.aimX, e.aimY);
          }
          if (e.stateTimer >= 0.25) {
            this.finishEnemyAttack(e, e.attackCooldown);
          }
        }
      } else {
        const hasToken = this.tokenPool.acquire(e.id);
        const intent = decideEnemyIntent({
          archetype: e.archetype,
          enemyX: e.x,
          enemyY: e.y,
          playerX: p.x,
          playerY: p.y,
          flankSide: e.flankSide,
          cooldown: e.cooldown,
          hasAttackToken: hasToken,
        });

        if (intent.action !== 'telegraph') {
          this.tokenPool.release(e.id);
        }

        const wp = findMazeNextWaypoint(e.x, e.y, p.x, p.y, maze);
        const wallBlocksDirect =
          Math.hypot(wp.x - p.x, wp.y - p.y) > 0.25 ||
          isPointInMazeWall((e.x + p.x) * 0.5, (e.y + p.y) * 0.5, activeWalls, 0.12);

        if (intent.action === 'telegraph' && !wallBlocksDirect) {
          e.state = 'telegraph';
          e.stateTimer = 0;
          e.aimX = intent.aimX;
          e.aimY = intent.aimY;
          e.vx = 0;
          e.vy = 0;
          retroAudio.playTelegraph();
        } else {
          if (intent.action === 'telegraph') {
            this.tokenPool.release(e.id);
          }
          if (wallBlocksDirect && intent.action !== 'retreat') {
            const wdx = wp.x - e.x;
            const wdy = wp.y - e.y;
            const wd = Math.hypot(wdx, wdy) || 1;
            e.vx = (wdx / wd) * e.speed;
            e.vy = (wdy / wd) * e.speed;
          } else {
            const speedMult = intent.action === 'retreat' ? 0.92 : 1;
            e.vx = intent.moveX * e.speed * speedMult;
            e.vy = intent.moveY * e.speed * speedMult;
          }
        }

        const enemyScreen = isoToScreen(e.x, e.y, 0, 0, 0);
        const playerScreen = isoToScreen(p.x, p.y, 0, 0, 0);
        e.facingLeft = playerScreen.x < enemyScreen.x;
      }

      for (const other of this.enemies) {
        if (other === e || other.state === 'ko') continue;
        const dx = e.x - other.x;
        const dy = e.y - other.y;
        const d = Math.hypot(dx, dy);
        const minSep = e.radius + other.radius + 0.14;
        if (d > 0.001 && d < minSep) {
          const push = ((minSep - d) / minSep) * 2.5;
          e.vx += (dx / d) * push;
          e.vy += (dy / d) * push;
        }
      }

      const prevX = e.x;
      const prevY = e.y;
      const clamped = clampToArena(e.x + e.vx * dt, e.y + e.vy * dt, ROOM_BOUNDS, 0.72);
      const resolved = resolveMazeCollisions(clamped.x, clamped.y, Math.min(0.44, e.radius), activeWalls);
      e.x = resolved.x;
      e.y = resolved.y;

      const moved = Math.hypot(e.x - prevX, e.y - prevY);
      if (moved > 0.001) {
        e.walkPhase += moved * 2.2;
      }
    }
  }

  private finishEnemyAttack(e: EnemyEntity, cooldown: number): void {
    this.tokenPool.release(e.id);
    e.state = 'idle';
    e.stateTimer = 0;
    e.cooldown = cooldown * (0.88 + Math.random() * 0.24);
    e.vx = 0;
    e.vy = 0;
  }

  private fireEnemyProjectile(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    damage: number
  ): void {
    const proj = this.projectiles[this.projectileCursor];
    this.projectileCursor = (this.projectileCursor + 1) % this.projectiles.length;
    const speedScale = 1 + Math.min(0.6, (this.waveNumber - 1) * 0.045);
    proj.active = true;
    proj.x = x + dirX * 0.4;
    proj.y = y + dirY * 0.4;
    proj.vx = dirX * 5.6 * speedScale;
    proj.vy = dirY * 5.6 * speedScale;
    proj.damage = damage;
    proj.life = 3.4;
    proj.color = '#84CC16';
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    const maze = this.getCurrentMaze();
    const activeWalls = getActiveMazeWalls(maze);
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.life -= dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      if (
        proj.life <= 0 ||
        proj.x < ROOM_BOUNDS.minX ||
        proj.x > ROOM_BOUNDS.maxX ||
        proj.y < ROOM_BOUNDS.minY ||
        proj.y > ROOM_BOUNDS.maxY
      ) {
        proj.active = false;
        continue;
      }

      if (isPointInMazeWall(proj.x, proj.y, activeWalls, 0.16)) {
        proj.active = false;
        this.spawnBurst(proj.x, proj.y, 12, 6, '#84CC16', 42);
        continue;
      }

      if (p.z < 15 && isoDistance(proj.x, proj.y, p.x, p.y) <= 0.65) {
        proj.active = false;
        const d = Math.hypot(proj.vx, proj.vy) || 1;
        this.damagePlayer(proj.damage, proj.vx / d, proj.vy / d);
      }
    }
  }

  private damagePlayer(amount: number, dirX: number, dirY: number): void {
    const p = this.player;
    if (p.invulnTimer > 0 || this.defeatDelayTimer > 0) return;

    const stats = this.getEffectiveStats();
    const mitigated = Math.max(2, Math.round(amount * (1 - stats.armorReduction)));
    const defendRes = calculateDefendedDamage(mitigated, p.defending, p.defendDuration);
    const nextHp = applyDamage(p.hp, defendRes.finalDamage, p.invulnTimer);
    const actualLoss = p.hp - nextHp;
    p.hp = nextHp;
    this.damageTaken += actualLoss;

    if (defendRes.blocked) {
      p.invulnTimer = 0.48;
      p.hitFlashTimer = 0.07;
      p.hurtTimer = 0.06;
      p.vx = dirX * 1.4;
      p.vy = dirY * 1.4;
      p.scaleX = 0.9;
      p.scaleY = 1.08;
      const chargeGain = defendRes.perfectGuard ? 16 : 8;
      p.astral = Math.min(p.maxAstral, p.astral + chargeGain);

      this.hitstopTimer = defendRes.perfectGuard ? 0.05 : 0.032;
      this.addScreenShake(defendRes.perfectGuard ? 0.34 : 0.24, dirX, dirY, 0.14);
      retroAudio.playHit(false);
      hapticsEngine.trigger('lightHit', defendRes.perfectGuard ? 0.75 : 0.5);

      const shieldColor = defendRes.perfectGuard ? '#E0F2FE' : '#38BDF8';
      this.spawnBurst(p.x, p.y, p.z + 14, defendRes.perfectGuard ? 16 : 11, shieldColor, 58);
      this.spawnRing(p.x, p.y, defendRes.perfectGuard ? 1.5 : 1.15, '#38BDF8', 0.28);
      this.spawnFloatingText(
        p.x,
        p.y,
        p.z + 28,
        defendRes.perfectGuard
          ? `PERFECT GUARD -${defendRes.reductionPct}% (-${actualLoss})`
          : `GUARD -${defendRes.reductionPct}% (-${actualLoss})`,
        shieldColor
      );
      this.pushCombatLog(
        `${defendRes.perfectGuard ? 'Perfect Guard' : 'Defended'}! Reduced damage by ${defendRes.reductionPct}% (-${actualLoss} HP, +${chargeGain} Charge).`,
        'attack'
      );
    } else {
      p.invulnTimer = 0.82;
      p.hitFlashTimer = 0.11;
      p.hurtTimer = 0.22;
      p.attackKind = null;
      p.vx = dirX * 4.5;
      p.vy = dirY * 4.5;
      p.scaleX = 1.24;
      p.scaleY = 0.78;
      this.combo = 0;
      this.comboDecayTimer = 0;
      this.comboMilestoneBannerTimer = 0;
      this.comboMilestoneLabel = null;

      this.hitstopTimer = 0.055;
      this.addScreenShake(0.75, dirX, dirY, 0.28);
      retroAudio.playPlayerHurt();
      hapticsEngine.trigger('playerHurt');

      this.spawnBurst(p.x, p.y, p.z + 12, 16, '#DC2626', 65);
      this.spawnFloatingText(p.x, p.y, p.z + 24, `-${actualLoss}`, '#FB7185');
      this.pushCombatLog(
        `Inhuman took ${actualLoss} DMG (${Math.round(p.hp)}/${p.maxHp} HP).`,
        'damage'
      );
    }

    if (p.hp <= 0) {
      this.defeatDelayTimer = 0.65;
      retroAudio.playGameOver();
      hapticsEngine.trigger('gameOver');
      this.pushCombatLog(`Inhuman fell in Room ${this.roomNumber}/${TOTAL_DUNGEON_ROOMS}.`, 'damage');
    }

    this.emitHud(true);
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (pk.kind !== 'preset') {
        pk.life -= dt;
        if (pk.life <= 0) {
          this.pickups.splice(i, 1);
          continue;
        }
      }

      const dist = isoDistance(pk.x, pk.y, p.x, p.y);
      if (dist < 2.2 && dist > 0.1) {
        const pull = 3.8 * dt;
        pk.x += ((p.x - pk.x) / dist) * pull;
        pk.y += ((p.y - pk.y) / dist) * pull;
      }

      if (dist <= 0.95) {
        if (pk.kind === 'preset') {
          this.collectPreset(p.x, p.y);
        } else if (pk.kind === 'key') {
          this.keys += 1;
          this.spawnFloatingText(p.x, p.y, 28, `+1 SKELETON KEY (${this.keys})`, '#FDE047');
          this.spawnRing(pk.x, pk.y, 1.8, '#F59E0B', 0.36);
          this.spawnBurst(pk.x, pk.y, 10, 12, '#FDE047', 54);
          retroAudio.playPickup();
          hapticsEngine.trigger('pickup');
          this.pushCombatLog(
            `Picked up Skeleton Key (${this.keys} held) — unlock maze shortcuts!`,
            'key'
          );
        } else if (pk.kind === 'health') {
          const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * 0.24));
          p.hp += heal;
          this.spawnFloatingText(p.x, p.y, 24, `+${heal} HP`, '#34D399');
          retroAudio.playPickup();
          hapticsEngine.trigger('pickup');
          this.spawnBurst(pk.x, pk.y, 8, 8, '#34D399', 45);
        } else if (pk.kind === 'astral') {
          p.astral = Math.min(p.maxAstral, p.astral + 35);
          this.spawnFloatingText(p.x, p.y, 24, '+35 SERUM VST', '#84CC16');
          retroAudio.playPickup();
          hapticsEngine.trigger('pickup');
          this.spawnBurst(pk.x, pk.y, 8, 8, '#84CC16', 45);
        } else if (pk.kind === 'powerup' && pk.powerUp) {
          this.powerUpStacks = applyPowerUpToStacks(this.powerUpStacks, pk.powerUp);
          this.syncPlayerMaxHp(true);
          if (pk.powerUp.kind === 'vitality') {
            p.hp = Math.min(p.maxHp, p.hp + pk.powerUp.magnitude);
          }
          this.spawnFloatingText(p.x, p.y, 30, `STACK ${pk.powerUp.shortTag}`, pk.powerUp.color);
          this.spawnRing(p.x, p.y, 2.0, RARITY_META[pk.powerUp.rarity].color, 0.36);
          this.spawnBurst(p.x, p.y, 10, 14, pk.powerUp.color, 60);
          retroAudio.playPowerUp();
          hapticsEngine.trigger('powerUp');
          this.pushCombatLog(`Stacked Blessing: ${pk.powerUp.shortTag}.`, 'loot');
        } else if (pk.kind === 'gear' && pk.gearItem) {
          this.addItemToInventory(pk.gearItem);
          const col = RARITY_META[pk.gearItem.rarity].color;
          this.spawnFloatingText(p.x, p.y, 30, `LOOT: ${pk.gearItem.name}`, col);
          this.spawnBurst(pk.x, pk.y, 10, 12, col, 55);
          retroAudio.playPowerUp();
          hapticsEngine.trigger('powerUp');
          this.pushCombatLog(`Looted ${pk.gearItem.name} (${pk.gearItem.rarity}).`, 'loot');
        } else if (pk.kind === 'consumable' && pk.consumableKind) {
          const isMed = pk.consumableKind === 'medkit';
          const isOver = pk.consumableKind === 'overcharge';
          this.addItemToInventory({
            id: `cons_${Date.now()}_${Math.random()}`,
            name: isMed ? 'Healing Potion' : isOver ? 'Blight Draught' : 'Alchemical Phial',
            kind: 'consumable',
            consumableKind: pk.consumableKind,
            rarity: isOver ? 'rare' : isMed ? 'common' : 'uncommon',
            waveLevel: this.waveNumber,
            description: isMed
              ? 'Restores 45% Max HP immediately.'
              : isOver
                ? 'Infuses a permanent Blood Sigil attack stack!'
                : 'Restores +55 Serum VST Charge and +30% Serum VST Potency.',
            quantity: 1,
            goldValue: FIXED_CONSUMABLE_GOLD_VALUE[pk.consumableKind],
          });
          this.spawnFloatingText(
            p.x,
            p.y,
            26,
            isMed ? '+1 POTION' : isOver ? '+1 DRAUGHT' : '+1 PHIAL',
            isMed ? '#34D399' : '#84CC16'
          );
          retroAudio.playPickup();
          hapticsEngine.trigger('pickup');
        }

        this.pickups.splice(i, 1);
        this.emitHud(true);
      }
    }

    for (const c of this.crates) {
      c.hitFlashTimer = Math.max(0, c.hitFlashTimer - dt);
    }
  }

  private updateRoomLockProgression(): void {
    if (this.roomCleared) return;

    const alive = this.enemies.some((e) => e.state !== 'ko');
    if (alive || this.enemies.length > 0) return;

    // All monsters (or the solo Boss) in this chamber are defeated — unseal the North Exit Door!
    this.roomCleared = true;
    this.clearedRoomNumbers.add(this.roomNumber);
    this.roomsClearedCount += 1;

    this.spawnRing(SINGLE_EXIT_DOOR_POS.x, SINGLE_EXIT_DOOR_POS.y, 2.4, '#84CC16', 0.55);
    this.spawnBurst(SINGLE_EXIT_DOOR_POS.x, SINGLE_EXIT_DOOR_POS.y, 12, 12, '#FDE68A', 52);

    retroAudio.playSectorClear();
    hapticsEngine.trigger('waveClear');
    this.addScreenShake(0.36, 0, -1, 0.12);
    this.spawnWaveClearLoot(this.waveNumber);
    this.gold += 35 + this.waveNumber * 5;
    this.grantXp(45 + this.waveNumber * 20);

    // After defeating the Boss (every 6th room) or deferred 6-level milestone, the Hooded Shopkeeper emerges!
    if (
      !this.shopkeeper &&
      (shouldSpawnShopkeeperForRoom(this.roomNumber) || this.pendingShopkeeperAfterBoss)
    ) {
      this.pendingShopkeeperAfterBoss = false;
      const spot = this.pickShopkeeperSpot(this.player.x, this.player.y, 77);
      this.shopkeeper = { x: spot.x, y: spot.y };
      this.spawnRing(spot.x, spot.y, 2.5, '#F59E0B', 0.6);
      this.spawnBurst(spot.x, spot.y, 12, 18, '#FDE68A', 68);
      this.spawnFloatingText(spot.x, spot.y, 34, 'SHOPKEEPER EMERGED!', '#FDE68A');
      this.pushCombatLog(`Hooded Shopkeeper: "${SHOPKEEPER_GREETING}"`, 'shop');
    }

    if (this.roomNumber >= TOTAL_DUNGEON_ROOMS) {
      this.bannerText = 'ROOM 666 CONQUERED · WALK THROUGH THE FINAL ARCH!';
      this.pushCombatLog(
        'FINAL BOSS ROOM 666/666 CLEARED! Walk through the North Exit Arch to claim victory!',
        'room'
      );
    } else {
      const nextInfo = getRoomProgressionInfo(this.roomNumber + 1);
      this.bannerText = nextInfo.isBossRoom
        ? `EXIT UNLOCKED · BOSS DUEL ${nextInfo.roomNumber}/${TOTAL_DUNGEON_ROOMS} AHEAD!`
        : `ROOM ${this.roomNumber}/${TOTAL_DUNGEON_ROOMS} CLEARED · EXIT DOOR UNLOCKED!`;
      this.pushCombatLog(
        nextInfo.isBossRoom
          ? `Room ${this.roomNumber}/${TOTAL_DUNGEON_ROOMS} cleared! North Exit unsealed → BOSS DUEL ${nextInfo.roomNumber}!`
          : `Room ${this.roomNumber}/${TOTAL_DUNGEON_ROOMS} cleared! North Exit Door unsealed.`,
        'room'
      );
    }
    this.bannerTimer = 2.6;
    this.snapshotCurrentRoomMemory();
    this.emitHud(true);
  }

  private updateCamera(dt: number): void {
    const pScreen = isoToScreen(this.player.x, this.player.y, 0, 0, 0);
    const targetOriginX = BUF_W * 0.5 - pScreen.x;
    const targetOriginY = BUF_H * 0.56 - pScreen.y;

    this.camOriginX += (targetOriginX - this.camOriginX) * Math.min(1, dt * 7);
    this.camOriginY += (targetOriginY - this.camOriginY) * Math.min(1, dt * 7);
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore(this.bestScore);
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    life: number,
    color: string,
    gravity = 110
  ): void {
    const pt = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % this.particles.length;
    pt.active = true;
    pt.x = x;
    pt.y = y;
    pt.z = z;
    pt.vx = vx;
    pt.vy = vy;
    pt.vz = vz;
    pt.size = size;
    pt.life = life;
    pt.maxLife = life;
    pt.color = color;
    pt.gravity = gravity;
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    color: string,
    speed: number
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed * 0.045;
      this.spawnParticle(
        x,
        y,
        z,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        24 + Math.random() * 48,
        Math.random() < 0.35 ? 3 : 2,
        0.22 + Math.random() * 0.25,
        i % 4 === 0 ? '#FEF3C7' : color,
        130
      );
    }
  }

  private spawnFloatingText(x: number, y: number, z: number, text: string, color: string): void {
    const ft = this.floatingTexts[this.textCursor];
    this.textCursor = (this.textCursor + 1) % this.floatingTexts.length;
    ft.active = true;
    ft.x = x;
    ft.y = y;
    ft.z = z;
    ft.text = text;
    ft.color = color;
    ft.life = 0.9;
    ft.maxLife = 0.9;
  }

  private spawnRing(x: number, y: number, maxRadius: number, color: string, life: number): void {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    r.active = true;
    r.x = x;
    r.y = y;
    r.radius = 0.2;
    r.maxRadius = maxRadius;
    r.color = color;
    r.life = life;
    r.maxLife = life;
  }

  private notifyBossDamaged(boss: EnemyEntity, prevHp: number): void {
    this.bossTrailHp = Math.max(this.bossTrailHp, prevHp);
    this.bossTrailHoldTimer = 0.55;
    this.bossHitSeq++;
    const prevMeta = getBossHealthMeta(prevHp, boss.maxHp);
    const nextMeta = getBossHealthMeta(boss.hp, boss.maxHp);
    if (prevMeta.phaseLabel !== nextMeta.phaseLabel && boss.hp > 0) {
      this.spawnRing(boss.x, boss.y, 2.8, nextMeta.barColor, 0.45);
      this.spawnBurst(boss.x, boss.y, 18, 20, nextMeta.accentColor, 78);
      this.spawnFloatingText(
        boss.x,
        boss.y,
        36,
        `BOSS ${nextMeta.phaseLabel}!`,
        nextMeta.accentColor
      );
      this.addScreenShake(0.45, 0, -1, 0.14);
    }
  }

  private registerComboHit(
    targetX: number,
    targetY: number,
    targetZ: number,
    isCrit: boolean,
    isHeavy: boolean
  ): void {
    const prevCombo = this.combo;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboDecayTimer = this.getEffectiveStats().comboDecaySeconds;
    this.comboHitSeq++;

    const vfx = getComboVfxProfile(this.combo);

    // Spawn directional pixelated combo impact slashes on hit
    const slashCount = vfx.slashCount + (isCrit ? 1 : 0);
    for (let i = 0; i < slashCount; i++) {
      const baseAngle = -0.78 + (i * Math.PI) / Math.max(2, slashCount) + (Math.random() - 0.5) * 0.35;
      const len = 11 + vfx.tier * 2.8 + (isCrit || isHeavy ? 3 : 0);
      this.spawnComboSlash(
        targetX + (Math.random() - 0.5) * 0.35,
        targetY + (Math.random() - 0.5) * 0.35,
        targetZ + (Math.random() - 0.5) * 4,
        baseAngle,
        len,
        vfx.tier >= 3 || isCrit ? 3 : 2,
        vfx.primaryColor,
        vfx.secondaryColor
      );
    }

    // Tier-scaled combo sparks & shockwave ring on chained hits
    if (vfx.tier >= 1) {
      this.spawnBurst(
        targetX,
        targetY,
        targetZ,
        Math.min(18, Math.round(vfx.sparkCount * 0.55)),
        vfx.primaryColor,
        54 + vfx.tier * 8
      );
      if (this.combo % 3 === 0 || isHeavy || isCrit) {
        this.spawnRing(targetX, targetY, 1.05 + vfx.tier * 0.22, vfx.primaryColor, 0.24);
      }
    }

    // Combo Rank-Up / Milestone Celebration VFX
    if (isComboMilestone(prevCombo, this.combo)) {
      this.comboRankUpSeq++;
      this.comboFlashTimer = 0.42;
      this.comboFlashColor = vfx.primaryColor;
      this.comboMilestoneBannerTimer = 1.65;
      this.comboMilestoneLabel = `${vfx.grade} · ${vfx.title} ${this.combo}x`;

      const p = this.player;
      this.spawnRing(p.x, p.y, 1.9 + vfx.tier * 0.38, vfx.primaryColor, 0.48);
      this.spawnRing(p.x, p.y, 1.2 + vfx.tier * 0.25, vfx.secondaryColor, 0.34);
      this.spawnBurst(p.x, p.y, p.z + 14, vfx.sparkCount, vfx.primaryColor, 68 + vfx.tier * 9);
      this.spawnFloatingText(p.x, p.y, p.z + 34, `${vfx.title} ${this.combo}x!`, vfx.primaryColor);
      this.addScreenShake(vfx.shakeBonus, 0, -1, 0.12);
      retroAudio.playPowerUp();
    }
  }

  private spawnComboSlash(
    x: number,
    y: number,
    z: number,
    angle: number,
    length: number,
    thickness: number,
    primaryColor: string,
    secondaryColor: string
  ): void {
    const s = this.comboSlashes[this.slashCursor];
    this.slashCursor = (this.slashCursor + 1) % this.comboSlashes.length;
    s.active = true;
    s.x = x;
    s.y = y;
    s.z = z;
    s.angle = angle;
    s.length = length;
    s.thickness = thickness;
    s.primaryColor = primaryColor;
    s.secondaryColor = secondaryColor;
    s.life = 0.22;
    s.maxLife = 0.22;
  }

  private spawnComboAfterimage(
    x: number,
    y: number,
    z: number,
    facingLeft: boolean,
    color: string
  ): void {
    const a = this.comboAfterimages[this.afterimageCursor];
    this.afterimageCursor = (this.afterimageCursor + 1) % this.comboAfterimages.length;
    a.active = true;
    a.x = x;
    a.y = y;
    a.z = z;
    a.facingLeft = facingLeft;
    a.color = color;
    a.life = 0.24;
    a.maxLife = 0.24;
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z = Math.max(0, pt.z + pt.vz * dt);
      pt.vz -= pt.gravity * dt;
    }

    for (const ft of this.floatingTexts) {
      if (!ft.active) continue;
      ft.life -= dt;
      ft.z += 24 * dt;
      if (ft.life <= 0) ft.active = false;
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        continue;
      }
      const prog = 1 - r.life / r.maxLife;
      r.radius = 0.2 + prog * r.maxRadius;
    }

    for (const s of this.comboSlashes) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) s.active = false;
    }

    for (const a of this.comboAfterimages) {
      if (!a.active) continue;
      a.life -= dt;
      if (a.life <= 0) a.active = false;
    }
  }

  private buildMinimapDots(): MinimapDot[] {
    const dots: MinimapDot[] = [];
    const maxW = ROOM_BOUNDS.maxX;
    const maxH = ROOM_BOUNDS.maxY;

    for (const s of this.shrines) {
      if (s.cooldown <= 0) {
        dots.push({ x: s.x / maxW, y: s.y / maxH, kind: 'shrine' });
      }
    }
    for (const c of this.crates) {
      if (!c.broken) {
        dots.push({ x: c.x / maxW, y: c.y / maxH, kind: 'crate' });
      }
    }
    for (const pk of this.pickups) {
      if (pk.kind === 'preset') {
        dots.push({ x: pk.x / maxW, y: pk.y / maxH, kind: 'preset' });
      } else if (pk.kind === 'powerup' || pk.kind === 'gear') {
        dots.push({ x: pk.x / maxW, y: pk.y / maxH, kind: 'loot' });
      }
    }
    for (const e of this.enemies) {
      if (e.state !== 'ko') {
        dots.push({
          x: e.x / maxW,
          y: e.y / maxH,
          kind: e.archetype === 'warden' ? 'boss' : 'enemy',
        });
      }
    }
    if (this.shopkeeper) {
      dots.push({ x: this.shopkeeper.x / maxW, y: this.shopkeeper.y / maxH, kind: 'merchant' });
    }
    dots.push({ x: this.player.x / maxW, y: this.player.y / maxH, kind: 'player' });
    return dots;
  }

  private emitHud(force: boolean): void {
    if (!force && this.totalTime - this.lastHudEmit < 0.06) return;
    this.lastHudEmit = this.totalTime;

    const room = this.getCurrentRoom();
    const prog = getRoomProgressionInfo(this.roomNumber);
    const waveSpec = generateWaveSpec(this.waveNumber, this.difficulty);
    const boss = this.enemies.find((e) => e.archetype === 'warden' && e.state !== 'ko');
    const aliveCount = this.enemies.filter((e) => e.state !== 'ko').length;
    const classSpec = getFighterClass(this.character.fighterClass);
    const stats = this.getEffectiveStats();
    const medkitItem = this.inventory.find(
      (it) => it.kind === 'consumable' && it.consumableKind === 'medkit'
    );

    const roomLocked = this.isCurrentRoomLocked();
    const lockedShortcutsRemaining = this.currentMaze.lockedDoors.filter((d) => !d.unlocked).length;
    const distToExit = isoDistance(
      this.player.x,
      this.player.y,
      SINGLE_EXIT_DOOR_POS.x,
      SINGLE_EXIT_DOOR_POS.y
    );
    const nearShortcut = findNearbyLockedMazeDoor(
      this.currentMaze,
      this.player.x,
      this.player.y,
      1.65
    );
    const shortcutEval = evaluateShortcutPromptState(
      this.shortcutPromptState,
      nearShortcut ? nearShortcut.id : null,
      this.keys
    );
    const nearbyShortcutPrompt: NearbyShortcutPrompt | null =
      shortcutEval.shouldShowPrompt && shortcutEval.promptDoorId
        ? {
            doorId: shortcutEval.promptDoorId,
            hasKey: shortcutEval.canUnlock,
            keysHeld: this.keys,
          }
        : null;

    let nearbyDoorLabel: string | null = null;
    let nearbyReturnDoor = false;
    const canReturnPrev = canReturnToPreviousRoom(this.roomNumber);
    const distToReturn = canReturnPrev
      ? isoDistance(this.player.x, this.player.y, RETURN_DOOR_POS.x, RETURN_DOOR_POS.y)
      : Infinity;

    if (distToExit <= 2.35) {
      if (roomLocked) {
        nearbyDoorLabel = `EXIT DOOR SEALED · DEFEAT ${aliveCount} FOE${aliveCount === 1 ? '' : 'S'}`;
      } else if (this.roomNumber >= TOTAL_DUNGEON_ROOMS) {
        nearbyDoorLabel = 'FINAL ARCH · CLAIM VICTORY';
      } else {
        const nextInfo = getRoomProgressionInfo(this.roomNumber + 1);
        nearbyDoorLabel = nextInfo.isBossRoom
          ? `NORTH EXIT → BOSS ROOM ${nextInfo.roomNumber}/${TOTAL_DUNGEON_ROOMS}`
          : `NORTH EXIT → ROOM ${nextInfo.roomNumber}/${TOTAL_DUNGEON_ROOMS}`;
      }
    } else if (canReturnPrev && distToReturn <= 2.35) {
      nearbyReturnDoor = true;
      nearbyDoorLabel = `SOUTH RETURN → ROOM ${this.roomNumber - 1}/${TOTAL_DUNGEON_ROOMS}`;
    }

    const nearbyShopkeeper = Boolean(
      this.shopkeeper &&
        isoDistance(this.player.x, this.player.y, this.shopkeeper.x, this.shopkeeper.y) <= 2.15
    );

    this.onHudUpdate({
      phase: this.phase,
      difficulty: this.difficulty,
      fighterClassLabel: classSpec.label,
      specialCost: stats.specialCost,
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      astral: Math.round(this.player.astral),
      maxAstral: this.player.maxAstral,
      serumPotency: this.serumState.potency,
      serumEffectivePower: computeEffectiveSerumPotency(this.presetsCollected, this.serumState),
      serumStatus: getSerumStatusLabel(
        this.serumState.potency,
        this.serumState.unusedSeconds,
        this.presetsCollected
      ),
      presetsCollected: this.presetsCollected,
      presetsMax: SERUM_PRESETS_MAX,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      combo: this.combo,
      maxCombo: this.maxCombo,
      comboTimerRatio:
        this.combo > 0
          ? Math.max(0, Math.min(1, this.comboDecayTimer / stats.comboDecaySeconds))
          : 0,
      comboRank: getComboRank(this.combo),
      comboTier: getComboVfxProfile(this.combo).tier,
      comboHitSeq: this.comboHitSeq,
      comboRankUpSeq: this.comboRankUpSeq,
      comboMilestoneLabel: this.comboMilestoneLabel,
      comboMilestoneActive: this.comboMilestoneBannerTimer > 0 && Boolean(this.comboMilestoneLabel),
      sectorIndex: prog.stepInWing,
      totalSectors: ROOMS_PER_BOSS_CYCLE,
      sectorName: room.name,
      biomeId: room.biomeId,
      biomeSubtitle: room.subtitle,
      currentRoomId: room.id,
      visitedRooms: [room.id],
      clearedRooms: this.roomCleared ? [room.id] : [],
      roomLocked,
      roomsCleared: this.roomsClearedCount,
      dungeonDepth: prog.wingNumber,
      roomNumber: prog.roomNumber,
      totalRooms: TOTAL_DUNGEON_ROOMS,
      wingNumber: prog.wingNumber,
      totalWings: TOTAL_DUNGEON_WINGS,
      stepInWing: prog.stepInWing,
      cycleLength: ROOMS_PER_BOSS_CYCLE,
      isBossRoom: prog.isBossRoom,
      keys: this.keys,
      lockedShortcutsRemaining,
      combatLog: this.combatLog,
      roomTotalEnemies: this.roomTotalEnemies,
      nearbyDoorLabel,
      nearbyReturnDoor,
      canReturnPreviousRoom: canReturnPrev,
      ambientCritterCount: this.ambientCritters.length,
      nearbyShortcutPrompt,
      waveNumber: this.waveNumber,
      totalWavesInSector: 0,
      waveThreatPct: Math.round(waveSpec.hpMultiplier * 100),
      enemiesRemaining: aliveCount,
      defeatedTotal: this.defeatedTotal,
      elapsedSeconds: Math.round(this.runTime),
      damageTaken: Math.round(this.damageTaken),
      bossName: boss ? `LV.${this.waveNumber} ${ENEMY_ARCHETYPES.warden.name}` : null,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      bossTrailHp: boss ? Math.round(Math.max(boss.hp, this.bossTrailHp)) : 0,
      bossHitSeq: this.bossHitSeq,
      bossPhaseLabel: boss ? getBossHealthMeta(boss.hp, boss.maxHp).phaseLabel : null,
      bossHpPct: boss ? getBossHealthMeta(boss.hp, boss.maxHp).pct : 0,
      bossBarColor: boss ? getBossHealthMeta(boss.hp, boss.maxHp).barColor : '#DC2626',
      bannerText: this.bannerText,
      muted: retroAudio.isMuted(),
      hapticsEnabled: hapticsEngine.isEnabled(),
      screenShakeEnabled: this.screenShakeEnabled,
      level: this.level,
      xp: this.xp,
      xpToNext: xpRequiredForLevel(this.level),
      skillPoints: this.skillPoints,
      skillPointGrantSeq: this.skillPointGrantSeq,
      levelUpAnimTimer: this.levelUpAnimTimer,
      levelUpAnimDuration: this.levelUpAnimDuration,
      levelUpAnimLevel: this.levelUpAnimLevel,
      levelUpEventSeq: this.levelUpEventSeq,
      gold: this.gold,
      shopkeeperPresent: Boolean(this.shopkeeper),
      nearbyShopkeeper,
      astralShards: this.astralShards,
      powerUpStacks: this.powerUpStacks,
      equipped: this.equipped,
      equippedWeaponKind: getWeaponVisualKind(this.equipped.weapon),
      equippedWeaponName: this.equipped.weapon?.name ?? 'Bare Fists',
      defending: this.player.defending,
      inventory: this.inventory,
      skillRanks: this.skillRanks,
      effectiveStats: stats,
      medkitCount: medkitItem?.quantity ?? 0,
      minimapDots: this.buildMinimapDots(),
    });
  }

  private renderFrame(): void {
    const bctx = this.bctx;
    bctx.imageSmoothingEnabled = false;

    const shakeMag = this.screenShakeEnabled ? this.trauma * this.trauma * 12 : 0;
    const shakeX = this.screenShakeEnabled
      ? Math.round((Math.random() * 2 - 1) * shakeMag + this.shakeKickX)
      : 0;
    const shakeY = this.screenShakeEnabled
      ? Math.round((Math.random() * 2 - 1) * shakeMag + this.shakeKickY)
      : 0;
    const ox = Math.round(this.camOriginX + shakeX);
    const oy = Math.round(this.camOriginY + shakeY);

    const room = this.getCurrentRoom();

    // 1. Decaying Wasteland Ash Sky & Drifting Embers of The Blight
    this.drawWastelandBackdrop(bctx, room);

    // 2. Pre-baked Dungeon Chamber Floor & Crumbling Stone Walls
    this.drawDungeonRoomFloor(bctx, room, ox, oy);

    // 3. Ground Telegraphs & Shockwave Rings
    this.drawGroundEffects(bctx, ox, oy);

    // 4. Depth-Sorted Isometric Entities & Single Exit Archway
    const drawables: { depth: number; draw: () => void }[] = [];
    const inView = (sx: number, sy: number) =>
      sx >= -52 && sx <= BUF_W + 52 && sy >= -52 && sy <= BUF_H + 64;

    // ONLY 1 Exit Door per room (North Archway) — sealed until ALL enemies are defeated
    const doorsLocked = this.isCurrentRoomLocked();
    const exitPos = isoToScreen(SINGLE_EXIT_DOOR_POS.x, SINGLE_EXIT_DOOR_POS.y, 0, ox, oy);
    if (inView(exitPos.x, exitPos.y)) {
      const nextNum = Math.min(TOTAL_DUNGEON_ROOMS, this.roomNumber + 1);
      const nextIsBoss = this.roomNumber < TOTAL_DUNGEON_ROOMS && isBossRoomNumber(nextNum);
      const exitLabel =
        this.roomNumber >= TOTAL_DUNGEON_ROOMS
          ? 'VICTORY'
          : nextIsBoss
            ? `BOSS ${nextNum}`
            : `RM ${nextNum}`;
      const nearPlayer =
        isoDistance(this.player.x, this.player.y, SINGLE_EXIT_DOOR_POS.x, SINGLE_EXIT_DOOR_POS.y) <=
        2.4;
      drawables.push({
        depth: depthKey(SINGLE_EXIT_DOOR_POS.x, SINGLE_EXIT_DOOR_POS.y) - 0.15,
        draw: () =>
          drawDungeonArchway(
            bctx,
            exitPos.x,
            exitPos.y,
            SINGLE_EXIT_DOOR_DIR,
            room.accentHex,
            this.totalTime,
            exitLabel,
            nearPlayer,
            doorsLocked
          ),
      });
    }

    // South Return Archway — allows returning to the previous room (roomNumber - 1) whenever Room > 1
    if (canReturnToPreviousRoom(this.roomNumber)) {
      const returnPos = isoToScreen(RETURN_DOOR_POS.x, RETURN_DOOR_POS.y, 0, ox, oy);
      if (inView(returnPos.x, returnPos.y)) {
        const nearReturn =
          isoDistance(this.player.x, this.player.y, RETURN_DOOR_POS.x, RETURN_DOOR_POS.y) <= 2.4;
        drawables.push({
          depth: depthKey(RETURN_DOOR_POS.x, RETURN_DOOR_POS.y) + 0.12,
          draw: () =>
            drawDungeonArchway(
              bctx,
              returnPos.x,
              returnPos.y,
              RETURN_DOOR_DIR,
              '#F59E0B',
              this.totalTime,
              `BACK RM ${this.roomNumber - 1}`,
              nearReturn,
              false
            ),
        });
      }
    }

    const currentMaze = this.getCurrentMaze();
    for (const wall of currentMaze.walls) {
      const topPt = isoToScreen(wall.x, wall.y, 0, ox, oy);
      const rightPt = isoToScreen(wall.x + wall.w, wall.y, 0, ox, oy);
      const bottomPt = isoToScreen(wall.x + wall.w, wall.y + wall.h, 0, ox, oy);
      const leftPt = isoToScreen(wall.x, wall.y + wall.h, 0, ox, oy);
      const midX = (topPt.x + bottomPt.x) * 0.5;
      const midY = (topPt.y + bottomPt.y) * 0.5;
      if (!inView(midX, midY)) continue;
      drawables.push({
        depth: depthKey(wall.x + wall.w * 0.5, wall.y + wall.h * 0.5),
        draw: () =>
          drawIsoMazeWall(
            bctx,
            topPt,
            rightPt,
            bottomPt,
            leftPt,
            wall.height,
            room.accentHex,
            wall.orientation === 'post'
          ),
      });
    }

    // Key-Locked Maze Shortcut Doors (golden padlock iron bars when locked, emerald threshold when open)
    for (const mdoor of currentMaze.lockedDoors) {
      const topPt = isoToScreen(mdoor.x, mdoor.y, 0, ox, oy);
      const rightPt = isoToScreen(mdoor.x + mdoor.w, mdoor.y, 0, ox, oy);
      const bottomPt = isoToScreen(mdoor.x + mdoor.w, mdoor.y + mdoor.h, 0, ox, oy);
      const leftPt = isoToScreen(mdoor.x, mdoor.y + mdoor.h, 0, ox, oy);
      const midX = (topPt.x + bottomPt.x) * 0.5;
      const midY = (topPt.y + bottomPt.y) * 0.5;
      if (!inView(midX, midY)) continue;
      drawables.push({
        depth: depthKey(mdoor.cx, mdoor.cy) - (mdoor.unlocked ? 0.5 : 0),
        draw: () =>
          drawMazeShortcutDoor(
            bctx,
            topPt,
            rightPt,
            bottomPt,
            leftPt,
            mdoor.height,
            mdoor.unlocked,
            this.totalTime
          ),
      });
    }

    for (const shrine of this.shrines) {
      const pos = isoToScreen(shrine.x, shrine.y, 0, ox, oy);
      if (!inView(pos.x, pos.y)) continue;
      drawables.push({
        depth: depthKey(shrine.x, shrine.y),
        draw: () =>
          drawWorldShrine(bctx, pos.x, pos.y, shrine.color, shrine.cooldown <= 0, this.totalTime),
      });
    }

    for (const crate of this.crates) {
      if (crate.broken) continue;
      const pos = isoToScreen(crate.x, crate.y, 0, ox, oy);
      if (!inView(pos.x, pos.y)) continue;
      drawables.push({
        depth: depthKey(crate.x, crate.y),
        draw: () =>
          drawCrystalCrate(bctx, pos.x, pos.y, crate.hp / crate.maxHp, crate.hitFlashTimer > 0),
      });
    }

    for (const pk of this.pickups) {
      const pos = isoToScreen(pk.x, pk.y, 0, ox, oy);
      if (!inView(pos.x, pos.y)) continue;
      drawables.push({
        depth: depthKey(pk.x, pk.y) - 0.1,
        draw: () => {
          if (pk.kind === 'preset') {
            drawPresetCollectible(bctx, pos.x, pos.y, this.totalTime);
          } else if (pk.kind === 'key') {
            drawKeyPickupSprite(bctx, pos.x, pos.y, this.totalTime);
          } else if (pk.kind === 'powerup' && pk.powerUp) {
            drawPowerUpOrb(
              bctx,
              pos.x,
              pos.y,
              pk.powerUp.color,
              RARITY_META[pk.powerUp.rarity].color,
              this.totalTime
            );
          } else if (pk.kind === 'gear' && pk.gearItem) {
            drawGearLootSprite(
              bctx,
              pos.x,
              pos.y,
              RARITY_META[pk.gearItem.rarity].color,
              this.totalTime
            );
          } else {
            drawPickupSprite(
              bctx,
              pos.x,
              pos.y,
              pk.kind === 'health' || pk.consumableKind === 'medkit' ? 'health' : 'astral',
              this.totalTime
            );
          }
        },
      });
    }

    // Hooded-Cloak Shopkeeper (Appears every 6 levels)
    if (this.shopkeeper) {
      const sk = this.shopkeeper;
      const skPos = isoToScreen(sk.x, sk.y, 0, ox, oy);
      if (inView(skPos.x, skPos.y)) {
        const nearMerchant = isoDistance(this.player.x, this.player.y, sk.x, sk.y) <= 2.15;
        drawables.push({
          depth: depthKey(sk.x, sk.y),
          draw: () =>
            drawShopkeeperSprite(bctx, skPos.x, skPos.y, this.totalTime, nearMerchant),
        });
      }
    }

    // Combo Ghost Afterimages (B-rank 7+ hits)
    for (const a of this.comboAfterimages) {
      if (!a.active) continue;
      const aPos = isoToScreen(a.x, a.y, a.z, ox, oy);
      if (!inView(aPos.x, aPos.y)) continue;
      const alpha = Math.max(0, a.life / a.maxLife) * 0.45;
      drawables.push({
        depth: depthKey(a.x, a.y) - 0.15,
        draw: () => drawComboAfterimage(bctx, aPos.x, aPos.y, a.facingLeft, a.color, alpha),
      });
    }

    // Player (Inhuman) + Tiered Combo Aura + In-World Level-Up Ascension Aura
    const p = this.player;
    const comboVfx = getComboVfxProfile(this.combo);
    const comboTimerRatio =
      this.combo > 0
        ? Math.max(0, Math.min(1, this.comboDecayTimer / Math.max(0.1, this.getEffectiveStats().comboDecaySeconds)))
        : 0;
    drawables.push({
      depth: depthKey(p.x, p.y),
      draw: () => {
        const ground = isoToScreen(p.x, p.y, 0, ox, oy);
        const body = isoToScreen(p.x, p.y, p.z, ox, oy);
        drawIsometricShadow(bctx, ground.x, ground.y, 8, p.z);

        if (comboVfx.auraActive && p.hp > 0) {
          drawComboAura(
            bctx,
            ground.x,
            ground.y,
            comboVfx.tier,
            comboVfx.primaryColor,
            comboVfx.secondaryColor,
            comboTimerRatio,
            this.totalTime
          );
        }

        let pose: SpriteAnimPose = 'idle';
        let attackProgress = 0.5;
        if (p.hp <= 0) pose = 'ko';
        else if (p.hurtTimer > 0) pose = 'hurt';
        else if (p.dashTimer > 0) pose = 'dash';
        else if (p.attackKind) {
          pose = p.attackKind;
          const spec = ATTACK_SPECS[p.attackKind];
          const totalDur = Math.max(0.05, spec.windup + spec.active + spec.recovery);
          attackProgress = Math.max(0, Math.min(1, p.attackTimer / totalDur));
        } else if (p.defending) pose = 'defend';
        else if (Math.hypot(p.vx, p.vy) > 0.35 && p.z <= 0.1) pose = 'walk';

        drawHeroPixelSprite(bctx, body.x, body.y, this.character, {
          x: p.x,
          y: p.y,
          z: p.z,
          facingLeft: p.facingLeft,
          pose,
          animTime: this.totalTime,
          walkPhase: p.walkPhase,
          scaleX: p.scaleX,
          scaleY: p.scaleY,
          hitFlash: p.hitFlashTimer > 0,
          invulnBlink: p.invulnTimer > 0 && p.dashTimer <= 0,
          weaponKind: getWeaponVisualKind(this.equipped.weapon),
          weaponRarity: this.equipped.weapon?.rarity ?? 'common',
          attackProgress,
          defendTimer: p.defendDuration,
        });

        if (this.levelUpAnimTimer > 0) {
          const progress = 1 - this.levelUpAnimTimer / this.levelUpAnimDuration;
          drawLevelUpAura(bctx, ground.x, ground.y, progress, this.totalTime);
        }
      },
    });

    // Animated Dark-Fantasy Ambient Life (Crypt Rats, Blight Bats, Bone Moths, Spore Wisps)
    for (const critter of this.ambientCritters) {
      const ground = isoToScreen(critter.x, critter.y, 0, ox, oy);
      const body = isoToScreen(critter.x, critter.y, critter.z, ox, oy);
      if (!inView(body.x, body.y)) continue;
      drawables.push({
        depth: depthKey(critter.x, critter.y) + (critter.z > 4 ? 1.8 : -0.22),
        draw: () =>
          drawAmbientCritterSprite(
            bctx,
            critter.kind,
            ground.x,
            ground.y,
            body.x,
            body.y,
            critter.z,
            critter.facingLeft,
            critter.phase,
            critter.color,
            critter.accentColor
          ),
      });
    }

    // Enemies (with Sovereign Crimson Ground Halo for High-Powered Solo Bosses)
    for (const e of this.enemies) {
      const pos = isoToScreen(e.x, e.y, 0, ox, oy);
      if (!inView(pos.x, pos.y)) continue;
      drawables.push({
        depth: depthKey(e.x, e.y),
        draw: () => {
          if (e.archetype === 'warden' && e.state !== 'ko') {
            bctx.save();
            const pulse = 0.32 + 0.18 * Math.sin(this.totalTime * 5.2);
            bctx.strokeStyle = '#E11D48';
            bctx.globalAlpha = pulse;
            bctx.lineWidth = 2;
            bctx.beginPath();
            bctx.ellipse(pos.x, pos.y, 20, 10, 0, 0, Math.PI * 2);
            bctx.stroke();
            bctx.strokeStyle = '#F59E0B';
            bctx.globalAlpha = pulse * 0.7;
            bctx.lineWidth = 1;
            bctx.beginPath();
            bctx.ellipse(pos.x, pos.y, 15, 7.5, 0, 0, Math.PI * 2);
            bctx.stroke();
            bctx.restore();
          }
          drawIsometricShadow(bctx, pos.x, pos.y, e.archetype === 'warden' ? 14 : 8, 0);
          drawEnemyPixelSprite(bctx, pos.x, pos.y, {
            archetype: e.archetype,
            facingLeft: e.facingLeft,
            animTime: this.totalTime,
            walkPhase: e.walkPhase,
            telegraphProgress:
              e.state === 'telegraph' ? Math.min(1, e.stateTimer / e.telegraphMax) : 0,
            attacking: e.state === 'attack',
            hitFlash: e.hitFlashTimer > 0,
            koProgress: e.state === 'ko' ? Math.min(1, e.stateTimer / 0.45) : 0,
            scaleX: e.scaleX,
            scaleY: e.scaleY,
          });

          if (e.state !== 'ko' && e.archetype !== 'warden' && e.hp < e.maxHp) {
            const bw = 18;
            const bx = Math.round(pos.x - bw * 0.5);
            const by = Math.round(pos.y - 34);
            bctx.fillStyle = '#090707';
            bctx.fillRect(bx - 1, by - 1, bw + 2, 4);
            bctx.fillStyle = '#3B161A';
            bctx.fillRect(bx, by, bw, 2);
            bctx.fillStyle = '#DC2626';
            bctx.fillRect(bx, by, Math.max(1, Math.round((e.hp / e.maxHp) * bw)), 2);
          }
        },
      });
    }

    // Projectiles
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      const pos = isoToScreen(proj.x, proj.y, 12, ox, oy);
      if (!inView(pos.x, pos.y)) continue;
      drawables.push({
        depth: depthKey(proj.x, proj.y),
        draw: () => {
          const x = Math.round(pos.x);
          const y = Math.round(pos.y);
          bctx.fillStyle = '#090707';
          bctx.fillRect(x - 4, y - 4, 8, 8);
          bctx.fillStyle = proj.color;
          bctx.fillRect(x - 3, y - 3, 6, 6);
          bctx.fillStyle = '#ECFCCB';
          bctx.fillRect(x - 1, y - 1, 2, 2);
        },
      });
    }

    drawables.sort((a, b) => a.depth - b.depth);
    for (const item of drawables) {
      item.draw();
    }

    // 5. Combo Slash VFX, Pixel Particles & Floating Arcade Damage / Loot Numbers
    for (const s of this.comboSlashes) {
      if (!s.active) continue;
      const pos = isoToScreen(s.x, s.y, s.z, ox, oy);
      const prog = 1 - s.life / s.maxLife;
      drawComboSlashVfx(
        bctx,
        pos.x,
        pos.y,
        s.angle,
        s.length,
        prog,
        s.primaryColor,
        s.secondaryColor,
        s.thickness
      );
    }

    for (const pt of this.particles) {
      if (!pt.active) continue;
      const pos = isoToScreen(pt.x, pt.y, pt.z, ox, oy);
      bctx.fillStyle = pt.color;
      bctx.fillRect(Math.round(pos.x), Math.round(pos.y), pt.size, pt.size);
    }

    bctx.font = 'bold 8px monospace';
    bctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      if (!ft.active) continue;
      const pos = isoToScreen(ft.x, ft.y, ft.z, ox, oy);
      bctx.fillStyle = '#090707';
      bctx.fillText(ft.text, Math.round(pos.x) + 1, Math.round(pos.y) + 1);
      bctx.fillStyle = ft.color;
      bctx.fillText(ft.text, Math.round(pos.x), Math.round(pos.y));
    }

    // 6. Impact Flash, Combo Edge Glow / Milestone Pulse, Low HP Vignette & Room Transition Fade
    if (this.impactFlash > 0.01) {
      bctx.fillStyle = `rgba(255, 240, 210, ${(this.impactFlash * 0.22).toFixed(3)})`;
      bctx.fillRect(0, 0, BUF_W, BUF_H);
    }

    if (this.phase === 'playing' && (this.comboFlashTimer > 0.01 || comboVfx.edgeGlowAlpha > 0)) {
      bctx.save();
      const flashAlpha = this.comboFlashTimer > 0.01 ? (this.comboFlashTimer / 0.42) * 0.34 : 0;
      const pulse = 0.72 + Math.sin(this.totalTime * 7.5) * 0.28;
      const rimAlpha = Math.max(flashAlpha, comboVfx.edgeGlowAlpha * pulse);
      bctx.globalAlpha = Math.min(0.45, rimAlpha);
      bctx.strokeStyle = this.comboFlashTimer > 0.01 ? this.comboFlashColor : comboVfx.primaryColor;
      bctx.lineWidth = this.comboFlashTimer > 0.01 ? 8 : 5;
      bctx.strokeRect(0, 0, BUF_W, BUF_H);
      bctx.restore();
    }

    if (
      this.phase === 'playing' &&
      this.player.hp > 0 &&
      this.player.hp <= this.player.maxHp * 0.28
    ) {
      const pulse = 0.16 + Math.sin(this.totalTime * 7.5) * 0.09;
      bctx.strokeStyle = `rgba(220, 38, 38, ${pulse.toFixed(2)})`;
      bctx.lineWidth = 10;
      bctx.strokeRect(0, 0, BUF_W, BUF_H);
    }

    if (this.roomTransitionAlpha > 0.01) {
      bctx.fillStyle = `rgba(10, 8, 7, ${this.roomTransitionAlpha.toFixed(3)})`;
      bctx.fillRect(0, 0, BUF_W, BUF_H);
    }
  }

  private drawWastelandBackdrop(bctx: CanvasRenderingContext2D, room: DungeonRoomDef): void {
    const bands = ['#0C0A09', '#14110F', '#1C1714', '#231C18', '#1A1613'];
    const bandH = Math.ceil(BUF_H / bands.length);
    for (let i = 0; i < bands.length; i++) {
      bctx.fillStyle = bands[i];
      bctx.fillRect(0, i * bandH, BUF_W, bandH);
    }

    // Subtle sickly wasteland mist band tinted by room theme
    const drift = Math.sin(this.totalTime * 0.32) * 10;
    bctx.save();
    bctx.globalAlpha = 0.12;
    bctx.fillStyle = room.accentHex;
    bctx.fillRect(0, 34 + Math.round(drift * 0.3), BUF_W, 34);
    bctx.restore();

    // Drifting ash flecks & rising embers
    for (const em of this.embers) {
      const ex = Math.floor((em.x + this.totalTime * em.speedX) % BUF_W);
      const ey = Math.floor(((em.y + this.totalTime * em.speedY) % BUF_H + BUF_H) % BUF_H);
      bctx.fillStyle = em.color;
      bctx.fillRect(ex, ey, em.size, em.size);
    }
  }

  private getOrBuildRoomCache(room: DungeonRoomDef): HTMLCanvasElement {
    const existing = this.roomCacheMap.get(room.id);
    if (existing) return existing;

    const cache = document.createElement('canvas');
    cache.width = 680;
    cache.height = 380;
    const cctx = cache.getContext('2d');
    if (!cctx) return cache;
    cctx.imageSmoothingEnabled = false;

    const ox = this.roomCacheOriginX;
    const oy = this.roomCacheOriginY;
    const maxX = ROOM_BOUNDS.maxX;
    const maxY = ROOM_BOUNDS.maxY;

    const cornerN = isoToScreen(0, 0, 0, ox, oy);
    const cornerE = isoToScreen(maxX, 0, 0, ox, oy);
    const cornerS = isoToScreen(maxX, maxY, 0, ox, oy);
    const cornerW = isoToScreen(0, maxY, 0, ox, oy);

    // 1. Back Dungeon Stone Walls (North-East & North-West perimeter walls)
    const wallH = 26;
    // West back wall (x = 0, y = 0..maxY)
    cctx.fillStyle = room.wallColor;
    cctx.beginPath();
    cctx.moveTo(cornerN.x, cornerN.y - wallH);
    cctx.lineTo(cornerW.x, cornerW.y - wallH);
    cctx.lineTo(cornerW.x, cornerW.y);
    cctx.lineTo(cornerN.x, cornerN.y);
    cctx.closePath();
    cctx.fill();
    cctx.strokeStyle = '#0D0A09';
    cctx.lineWidth = 1;
    cctx.stroke();

    // North back wall (y = 0, x = 0..maxX)
    cctx.fillStyle = room.wallHighlight;
    cctx.beginPath();
    cctx.moveTo(cornerN.x, cornerN.y - wallH);
    cctx.lineTo(cornerE.x, cornerE.y - wallH);
    cctx.lineTo(cornerE.x, cornerE.y);
    cctx.lineTo(cornerN.x, cornerN.y);
    cctx.closePath();
    cctx.fill();
    cctx.strokeStyle = '#0D0A09';
    cctx.stroke();

    // Wall stone brick seams along top edge
    cctx.fillStyle = room.crackColor;
    for (let i = 1; i < maxX; i += 2) {
      const p = isoToScreen(i, 0, 0, ox, oy);
      cctx.fillRect(Math.round(p.x), Math.round(p.y - wallH + 2), 1, wallH - 3);
    }
    for (let j = 1; j < maxY; j += 2) {
      const p = isoToScreen(0, j, 0, ox, oy);
      cctx.fillRect(Math.round(p.x), Math.round(p.y - wallH + 2), 1, wallH - 3);
    }

    // 2. Front Dungeon Stone Cliff Base (South-West & South-East drop-off)
    cctx.fillStyle = '#14110F';
    cctx.beginPath();
    cctx.moveTo(cornerW.x, cornerW.y);
    cctx.lineTo(cornerS.x, cornerS.y);
    cctx.lineTo(cornerS.x, cornerS.y + 18);
    cctx.lineTo(cornerW.x, cornerW.y + 18);
    cctx.closePath();
    cctx.fill();

    cctx.fillStyle = '#1E1916';
    cctx.beginPath();
    cctx.moveTo(cornerS.x, cornerS.y);
    cctx.lineTo(cornerE.x, cornerE.y);
    cctx.lineTo(cornerE.x, cornerE.y + 18);
    cctx.lineTo(cornerS.x, cornerS.y + 18);
    cctx.closePath();
    cctx.fill();

    // 3. Cracked Decaying Wasteland Stone Floor Tiles
    for (let tx = 0; tx < maxX; tx++) {
      for (let ty = 0; ty < maxY; ty++) {
        const p = isoToScreen(tx, ty, 0, ox, oy);
        const isBorder = tx === 0 || ty === 0 || tx === maxX - 1 || ty === maxY - 1;
        const isPath = tx === 8 || tx === 9 || ty === 6 || ty === 7;
        const checker = (tx + ty) % 2 === 0;

        cctx.fillStyle = isBorder
          ? room.wallColor
          : isPath
            ? checker
              ? room.wallHighlight
              : room.tileA
            : checker
              ? room.tileA
              : room.tileB;

        cctx.beginPath();
        cctx.moveTo(p.x, p.y);
        cctx.lineTo(p.x + ISO_TILE_W * 0.5, p.y + ISO_TILE_H * 0.5);
        cctx.lineTo(p.x, p.y + ISO_TILE_H);
        cctx.lineTo(p.x - ISO_TILE_W * 0.5, p.y + ISO_TILE_H * 0.5);
        cctx.closePath();
        cctx.fill();

        cctx.strokeStyle = room.crackColor;
        cctx.lineWidth = 1;
        cctx.stroke();

        // Deterministic wasteland floor cracks, moss specks & bone ash debris
        const hash = (tx * 31 + ty * 17 + room.index * 13) % 19;
        if (!isBorder && hash === 0) {
          cctx.fillStyle = room.crackColor;
          cctx.fillRect(Math.round(p.x - 3), Math.round(p.y + ISO_TILE_H * 0.5), 6, 1);
          cctx.fillRect(Math.round(p.x + 1), Math.round(p.y + ISO_TILE_H * 0.5 - 2), 2, 3);
        } else if (!isBorder && hash === 5) {
          cctx.fillStyle = room.accentHex;
          cctx.globalAlpha = 0.25;
          cctx.fillRect(Math.round(p.x - 2), Math.round(p.y + ISO_TILE_H * 0.5 - 1), 4, 2);
          cctx.globalAlpha = 1;
        }
      }
    }

    this.roomCacheMap.set(room.id, cache);
    return cache;
  }

  private drawDungeonRoomFloor(
    bctx: CanvasRenderingContext2D,
    room: DungeonRoomDef,
    ox: number,
    oy: number
  ): void {
    const cache = this.getOrBuildRoomCache(room);
    bctx.drawImage(
      cache,
      Math.round(ox - this.roomCacheOriginX),
      Math.round(oy - this.roomCacheOriginY)
    );
  }

  private drawGroundEffects(bctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    for (const e of this.enemies) {
      if (e.state !== 'telegraph') continue;
      const prog = Math.min(1, e.stateTimer / e.telegraphMax);

      if (e.archetype === 'lancer') {
        const start = isoToScreen(e.x, e.y, 1, ox, oy);
        const end = isoToScreen(e.x + e.aimX * 4.5, e.y + e.aimY * 4.5, 1, ox, oy);
        bctx.strokeStyle = `rgba(220, 38, 38, ${(0.35 + prog * 0.6).toFixed(2)})`;
        bctx.lineWidth = 3;
        bctx.beginPath();
        bctx.moveTo(start.x, start.y);
        bctx.lineTo(end.x, end.y);
        bctx.stroke();
      } else if (e.archetype === 'warden') {
        const pos = isoToScreen(e.x, e.y, 1, ox, oy);
        const rx = 2.75 * ISO_TILE_W * 0.48;
        const ry = 2.75 * ISO_TILE_H * 0.48;
        bctx.strokeStyle = `rgba(234, 88, 12, ${(0.45 + prog * 0.5).toFixed(2)})`;
        bctx.lineWidth = 2;
        bctx.beginPath();
        bctx.ellipse(pos.x, pos.y, rx, ry, 0, 0, Math.PI * 2);
        bctx.stroke();

        bctx.fillStyle = `rgba(220, 38, 38, ${(0.14 + prog * 0.2).toFixed(2)})`;
        bctx.beginPath();
        bctx.ellipse(pos.x, pos.y, rx * prog, ry * prog, 0, 0, Math.PI * 2);
        bctx.fill();
      } else {
        const pos = isoToScreen(e.x, e.y, 1, ox, oy);
        bctx.strokeStyle = e.archetype === 'hexer' ? '#84CC16' : '#DC2626';
        bctx.lineWidth = 1.5;
        bctx.beginPath();
        bctx.ellipse(pos.x, pos.y, 12 + prog * 6, 6 + prog * 3, 0, 0, Math.PI * 2);
        bctx.stroke();
      }
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      const pos = isoToScreen(r.x, r.y, 1, ox, oy);
      const alpha = Math.max(0, r.life / r.maxLife);
      bctx.save();
      bctx.globalAlpha = alpha;
      bctx.strokeStyle = r.color;
      bctx.lineWidth = 2;
      bctx.beginPath();
      bctx.ellipse(
        pos.x,
        pos.y,
        r.radius * ISO_TILE_W * 0.46,
        r.radius * ISO_TILE_H * 0.46,
        0,
        0,
        Math.PI * 2
      );
      bctx.stroke();
      bctx.restore();
    }
  }
}
