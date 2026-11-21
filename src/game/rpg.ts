import { FighterClassSpec } from './character';
import { ArenaBounds, PillarObstacle, isoDistance } from './iso';
import { DIFFICULTY_CONFIGS, DifficultyId, WaveSpawnEntry } from './rules';

// --- Decaying Wasteland Dungeon of THE BLIGHT (7 Interconnected Rooms) ---

export const ROOM_BOUNDS: ArenaBounds = {
  minX: 0,
  maxX: 18,
  minY: 0,
  maxY: 14,
};

export const WORLD_BOUNDS: ArenaBounds = ROOM_BOUNDS;

export type BiomeId = 'promenade' | 'crucible' | 'wilds' | 'throne';

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  subtitle: string;
  tileA: string;
  tileB: string;
  conduitColor: string;
  accentHex: string;
  threatBonus: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const WORLD_BIOMES: Record<BiomeId, BiomeDefinition> = {
  promenade: {
    id: 'promenade',
    name: 'ASHEN CAUSEWAY',
    subtitle: 'Decaying Keep Ruins',
    tileA: '#262321',
    tileB: '#1E1B1A',
    conduitColor: '#A16207',
    accentHex: '#D97706',
    threatBonus: 0,
    minX: 0,
    maxX: 9,
    minY: 0,
    maxY: 7,
  },
  crucible: {
    id: 'crucible',
    name: 'SCORCHED OSSUARY',
    subtitle: 'Charred Bone Fields',
    tileA: '#2B1D1B',
    tileB: '#211514',
    conduitColor: '#C2410C',
    accentHex: '#EA580C',
    threatBonus: 1,
    minX: 9,
    maxX: 18,
    minY: 0,
    maxY: 7,
  },
  wilds: {
    id: 'wilds',
    name: 'ROTMIRE FEN',
    subtitle: 'Plague-Soaked Bog',
    tileA: '#1F261D',
    tileB: '#171D15',
    conduitColor: '#65A30D',
    accentHex: '#84CC16',
    threatBonus: 1,
    minX: 0,
    maxX: 9,
    minY: 7,
    maxY: 14,
  },
  throne: {
    id: 'throne',
    name: 'BLIGHTED SANCTUM',
    subtitle: 'Shattered Sovereign Crypt',
    tileA: '#24191F',
    tileB: '#1A1116',
    conduitColor: '#BE123C',
    accentHex: '#E11D48',
    threatBonus: 2,
    minX: 9,
    maxX: 18,
    minY: 7,
    maxY: 14,
  },
};

export function getBiomeAt(x: number, y: number): BiomeDefinition {
  const east = x >= 9;
  const south = y >= 7;
  if (!east && !south) return WORLD_BIOMES.promenade;
  if (east && !south) return WORLD_BIOMES.crucible;
  if (!east && south) return WORLD_BIOMES.wilds;
  return WORLD_BIOMES.throne;
}

export type DungeonRoomId =
  | 'ashen_courtyard'
  | 'plague_catacombs'
  | 'scorched_ossuary'
  | 'gallows_hall'
  | 'rotmire_vault'
  | 'cursed_reliquary'
  | 'blighted_sanctum';

export type DoorDirection = 'north' | 'south' | 'east' | 'west';

export interface DungeonDoorDef {
  dir: DoorDirection;
  targetRoomId: DungeonRoomId;
  x: number;
  y: number;
}

export interface WorldShrineDef {
  id: string;
  x: number;
  y: number;
  biome: BiomeId;
  name: string;
  kind: 'heal' | 'forge' | 'astral' | 'vault';
  color: string;
}

export interface DungeonRoomDef {
  id: DungeonRoomId;
  index: number;
  name: string;
  subtitle: string;
  biomeId: BiomeId;
  gridX: number; // 0..2 on dungeon minimap
  gridY: number; // 0..2 on dungeon minimap
  tileA: string;
  tileB: string;
  wallColor: string;
  wallHighlight: string;
  accentHex: string;
  crackColor: string;
  threatBonus: number;
  doors: DungeonDoorDef[];
  pillars: PillarObstacle[];
  crateSpawns: { x: number; y: number }[];
  presetSpawns: { x: number; y: number }[];
  shrine: WorldShrineDef | null;
}

export function getDoorPosition(dir: DoorDirection): { x: number; y: number } {
  switch (dir) {
    case 'north':
      return { x: 9, y: 0.75 };
    case 'south':
      return { x: 9, y: 13.25 };
    case 'west':
      return { x: 0.75, y: 7 };
    case 'east':
      return { x: 17.25, y: 7 };
  }
}

export function getOppositeDoor(dir: DoorDirection): DoorDirection {
  switch (dir) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'west':
      return 'east';
    case 'east':
      return 'west';
  }
}

export function getEntrySpawnForDoor(enteredThroughWall: DoorDirection): { x: number; y: number } {
  switch (enteredThroughWall) {
    case 'north':
      return { x: 9, y: 2.35 };
    case 'south':
      return { x: 9, y: 11.65 };
    case 'west':
      return { x: 2.35, y: 7 };
    case 'east':
      return { x: 15.65, y: 7 };
  }
}

export const DUNGEON_ROOMS: Record<DungeonRoomId, DungeonRoomDef> = {
  ashen_courtyard: {
    id: 'ashen_courtyard',
    index: 1,
    name: 'ASHEN COURTYARD',
    subtitle: 'Decaying Keep Entry',
    biomeId: 'promenade',
    gridX: 1,
    gridY: 0,
    tileA: '#292522',
    tileB: '#201D1A',
    wallColor: '#36302B',
    wallHighlight: '#544B42',
    accentHex: '#D97706',
    crackColor: '#14110F',
    threatBonus: 0,
    doors: [
      { dir: 'west', targetRoomId: 'plague_catacombs', ...getDoorPosition('west') },
      { dir: 'east', targetRoomId: 'scorched_ossuary', ...getDoorPosition('east') },
      { dir: 'south', targetRoomId: 'gallows_hall', ...getDoorPosition('south') },
    ],
    pillars: [
      { id: 'ac-1', x: 5.0, y: 4.0, radius: 0.65, height: 28 },
      { id: 'ac-2', x: 13.0, y: 4.0, radius: 0.65, height: 28 },
      { id: 'ac-3', x: 5.0, y: 10.0, radius: 0.65, height: 28 },
      { id: 'ac-4', x: 13.0, y: 10.0, radius: 0.65, height: 28 },
    ],
    crateSpawns: [
      { x: 3.5, y: 2.8 },
      { x: 14.5, y: 11.0 },
    ],
    presetSpawns: [
      { x: 11.6, y: 7.0 },
      { x: 6.4, y: 7.0 },
    ],
    shrine: {
      id: 'shrine-ashen',
      x: 9.0,
      y: 4.2,
      biome: 'promenade',
      name: 'Altar of Mending',
      kind: 'heal',
      color: '#10B981',
    },
  },
  plague_catacombs: {
    id: 'plague_catacombs',
    index: 2,
    name: 'PLAGUE CATACOMBS',
    subtitle: 'Rotting Bone Crypts',
    biomeId: 'wilds',
    gridX: 0,
    gridY: 0,
    tileA: '#20261D',
    tileB: '#181E16',
    wallColor: '#2B3327',
    wallHighlight: '#475440',
    accentHex: '#84CC16',
    crackColor: '#0F140D',
    threatBonus: 1,
    doors: [
      { dir: 'east', targetRoomId: 'ashen_courtyard', ...getDoorPosition('east') },
      { dir: 'south', targetRoomId: 'rotmire_vault', ...getDoorPosition('south') },
    ],
    pillars: [
      { id: 'pc-1', x: 5.5, y: 4.5, radius: 0.65, height: 30 },
      { id: 'pc-2', x: 12.5, y: 4.5, radius: 0.65, height: 30 },
      { id: 'pc-3', x: 5.5, y: 9.5, radius: 0.65, height: 30 },
      { id: 'pc-4', x: 12.5, y: 9.5, radius: 0.65, height: 30 },
    ],
    crateSpawns: [
      { x: 3.2, y: 3.2 },
      { x: 3.2, y: 10.8 },
      { x: 14.2, y: 3.0 },
    ],
    presetSpawns: [
      { x: 7.2, y: 3.6 },
      { x: 10.8, y: 10.4 },
    ],
    shrine: {
      id: 'shrine-catacombs',
      x: 9.0,
      y: 7.0,
      biome: 'wilds',
      name: 'Blighted Serum VST Font',
      kind: 'astral',
      color: '#84CC16',
    },
  },
  scorched_ossuary: {
    id: 'scorched_ossuary',
    index: 3,
    name: 'SCORCHED OSSUARY',
    subtitle: 'Charred Bone Fields',
    biomeId: 'crucible',
    gridX: 2,
    gridY: 0,
    tileA: '#2D1E1B',
    tileB: '#221614',
    wallColor: '#3D2722',
    wallHighlight: '#613D35',
    accentHex: '#EA580C',
    crackColor: '#140C0B',
    threatBonus: 1,
    doors: [
      { dir: 'west', targetRoomId: 'ashen_courtyard', ...getDoorPosition('west') },
      { dir: 'south', targetRoomId: 'cursed_reliquary', ...getDoorPosition('south') },
    ],
    pillars: [
      { id: 'so-1', x: 4.8, y: 3.8, radius: 0.68, height: 32 },
      { id: 'so-2', x: 13.2, y: 3.8, radius: 0.68, height: 32 },
      { id: 'so-3', x: 4.8, y: 10.2, radius: 0.68, height: 32 },
      { id: 'so-4', x: 13.2, y: 10.2, radius: 0.68, height: 32 },
    ],
    crateSpawns: [
      { x: 14.8, y: 3.2 },
      { x: 14.8, y: 10.8 },
    ],
    presetSpawns: [
      { x: 8.8, y: 3.4 },
      { x: 8.8, y: 10.6 },
    ],
    shrine: {
      id: 'shrine-ossuary',
      x: 11.2,
      y: 7.0,
      biome: 'crucible',
      name: 'Blood-Iron Anvil',
      kind: 'forge',
      color: '#EA580C',
    },
  },
  gallows_hall: {
    id: 'gallows_hall',
    index: 4,
    name: 'GALLOWS HALL',
    subtitle: 'Sunken Dungeon Crossroads',
    biomeId: 'promenade',
    gridX: 1,
    gridY: 1,
    tileA: '#242124',
    tileB: '#1B181B',
    wallColor: '#332E33',
    wallHighlight: '#504852',
    accentHex: '#F59E0B',
    crackColor: '#100E10',
    threatBonus: 1,
    doors: [
      { dir: 'north', targetRoomId: 'ashen_courtyard', ...getDoorPosition('north') },
      { dir: 'west', targetRoomId: 'rotmire_vault', ...getDoorPosition('west') },
      { dir: 'east', targetRoomId: 'cursed_reliquary', ...getDoorPosition('east') },
      { dir: 'south', targetRoomId: 'blighted_sanctum', ...getDoorPosition('south') },
    ],
    pillars: [
      { id: 'gh-1', x: 4.2, y: 3.6, radius: 0.65, height: 30 },
      { id: 'gh-2', x: 13.8, y: 3.6, radius: 0.65, height: 30 },
      { id: 'gh-3', x: 6.2, y: 7.0, radius: 0.65, height: 30 },
      { id: 'gh-4', x: 11.8, y: 7.0, radius: 0.65, height: 30 },
      { id: 'gh-5', x: 4.2, y: 10.4, radius: 0.65, height: 30 },
      { id: 'gh-6', x: 13.8, y: 10.4, radius: 0.65, height: 30 },
    ],
    crateSpawns: [
      { x: 2.8, y: 2.8 },
      { x: 15.2, y: 11.2 },
    ],
    presetSpawns: [
      { x: 9.0, y: 7.0 },
      { x: 14.6, y: 3.2 },
    ],
    shrine: null,
  },
  rotmire_vault: {
    id: 'rotmire_vault',
    index: 5,
    name: 'ROTMIRE VAULT',
    subtitle: 'Plague-Soaked Treasury',
    biomeId: 'wilds',
    gridX: 0,
    gridY: 1,
    tileA: '#1E251B',
    tileB: '#161C14',
    wallColor: '#283324',
    wallHighlight: '#41523A',
    accentHex: '#65A30D',
    crackColor: '#0E120C',
    threatBonus: 1,
    doors: [
      { dir: 'north', targetRoomId: 'plague_catacombs', ...getDoorPosition('north') },
      { dir: 'east', targetRoomId: 'gallows_hall', ...getDoorPosition('east') },
    ],
    pillars: [
      { id: 'rv-1', x: 6.0, y: 5.0, radius: 0.65, height: 28 },
      { id: 'rv-2', x: 6.0, y: 9.5, radius: 0.65, height: 28 },
    ],
    crateSpawns: [
      { x: 3.2, y: 3.2 },
      { x: 3.2, y: 7.0 },
      { x: 3.2, y: 11.0 },
      { x: 12.2, y: 11.0 },
    ],
    presetSpawns: [
      { x: 10.2, y: 5.0 },
      { x: 10.2, y: 9.2 },
    ],
    shrine: null,
  },
  cursed_reliquary: {
    id: 'cursed_reliquary',
    index: 6,
    name: 'CURSED RELIQUARY',
    subtitle: 'Shattered Ossuary Vault',
    biomeId: 'crucible',
    gridX: 2,
    gridY: 1,
    tileA: '#291B20',
    tileB: '#1F1317',
    wallColor: '#3B252D',
    wallHighlight: '#5E3B48',
    accentHex: '#E11D48',
    crackColor: '#120A0D',
    threatBonus: 2,
    doors: [
      { dir: 'north', targetRoomId: 'scorched_ossuary', ...getDoorPosition('north') },
      { dir: 'west', targetRoomId: 'gallows_hall', ...getDoorPosition('west') },
    ],
    pillars: [
      { id: 'cr-1', x: 5.5, y: 4.0, radius: 0.68, height: 32 },
      { id: 'cr-2', x: 12.5, y: 4.0, radius: 0.68, height: 32 },
      { id: 'cr-3', x: 5.5, y: 10.0, radius: 0.68, height: 32 },
      { id: 'cr-4', x: 12.5, y: 10.0, radius: 0.68, height: 32 },
    ],
    crateSpawns: [
      { x: 14.5, y: 4.5 },
      { x: 14.5, y: 9.5 },
      { x: 9.0, y: 11.5 },
    ],
    presetSpawns: [
      { x: 8.6, y: 4.4 },
      { x: 8.6, y: 9.6 },
    ],
    shrine: {
      id: 'shrine-reliquary',
      x: 11.5,
      y: 7.0,
      biome: 'throne',
      name: 'Sovereign Reliquary',
      kind: 'vault',
      color: '#E11D48',
    },
  },
  blighted_sanctum: {
    id: 'blighted_sanctum',
    index: 7,
    name: 'BLIGHTED SANCTUM',
    subtitle: 'Ruined Sovereign Crypt',
    biomeId: 'throne',
    gridX: 1,
    gridY: 2,
    tileA: '#26171C',
    tileB: '#1B0F13',
    wallColor: '#382028',
    wallHighlight: '#5C3340',
    accentHex: '#F43F5E',
    crackColor: '#12080B',
    threatBonus: 2,
    doors: [{ dir: 'north', targetRoomId: 'gallows_hall', ...getDoorPosition('north') }],
    pillars: [
      { id: 'bs-1', x: 4.5, y: 4.2, radius: 0.72, height: 34 },
      { id: 'bs-2', x: 13.5, y: 4.2, radius: 0.72, height: 34 },
      { id: 'bs-3', x: 4.5, y: 10.2, radius: 0.72, height: 34 },
      { id: 'bs-4', x: 13.5, y: 10.2, radius: 0.72, height: 34 },
    ],
    crateSpawns: [
      { x: 3.0, y: 11.5 },
      { x: 9.0, y: 11.8 },
      { x: 15.0, y: 11.5 },
    ],
    presetSpawns: [
      { x: 6.2, y: 6.8 },
      { x: 11.8, y: 6.8 },
    ],
    shrine: {
      id: 'shrine-sanctum',
      x: 9.0,
      y: 8.6,
      biome: 'throne',
      name: 'Cursed Blood Altar',
      kind: 'forge',
      color: '#F43F5E',
    },
  },
};

export const DUNGEON_ROOM_LIST: DungeonRoomDef[] = Object.values(DUNGEON_ROOMS);

export function getDungeonRoom(id: DungeonRoomId): DungeonRoomDef {
  return DUNGEON_ROOMS[id] ?? DUNGEON_ROOMS.ashen_courtyard;
}

export function findTriggeredDoor(
  room: DungeonRoomDef,
  px: number,
  py: number,
  triggerRadius = 1.15
): DungeonDoorDef | null {
  for (const door of room.doors) {
    if (isoDistance(px, py, door.x, door.y) <= triggerRadius) {
      return door;
    }
  }
  return null;
}

// --- 666-Room Dungeon Progression (111 Evenly Distributed 6-Room Wings: 5 Rooms -> Boss Room) ---

export const TOTAL_DUNGEON_ROOMS = 666;
export const ROOMS_PER_BOSS_CYCLE = 6; // 666 / 6 = 111 exact equal wings (Rm 1..5 -> Boss Rm 6)
export const TOTAL_DUNGEON_WINGS = TOTAL_DUNGEON_ROOMS / ROOMS_PER_BOSS_CYCLE; // 111

export const SINGLE_EXIT_DOOR_DIR: DoorDirection = 'north';
export const SINGLE_EXIT_DOOR_POS = getDoorPosition(SINGLE_EXIT_DOOR_DIR); // { x: 9, y: 0.75 }
export const RETURN_DOOR_DIR: DoorDirection = 'south';
export const RETURN_DOOR_POS = getDoorPosition(RETURN_DOOR_DIR); // { x: 9, y: 13.25 }
export const ROOM_ENTRY_SPAWN_POS = getEntrySpawnForDoor('south'); // { x: 9, y: 11.65 }
export const ROOM_RETURN_NORTH_SPAWN_POS = getEntrySpawnForDoor('north'); // { x: 9, y: 2.35 }

export function canReturnToPreviousRoom(roomNumber: number): boolean {
  return Math.floor(roomNumber) > 1;
}

const NORMAL_THEME_ROTATION: DungeonRoomId[] = [
  'ashen_courtyard',
  'plague_catacombs',
  'scorched_ossuary',
  'gallows_hall',
  'rotmire_vault',
  'cursed_reliquary',
];

export interface RoomProgressionInfo {
  roomNumber: number;
  totalRooms: number;
  wingNumber: number;
  totalWings: number;
  stepInWing: number; // 1..6 (6 = Boss Room)
  cycleLength: number;
  isBossRoom: boolean;
  isFinalBossRoom: boolean;
  themeRoomId: DungeonRoomId;
}

export function isBossRoomNumber(roomNumber: number): boolean {
  const r = Math.floor(roomNumber);
  return r >= 1 && r <= TOTAL_DUNGEON_ROOMS && r % ROOMS_PER_BOSS_CYCLE === 0;
}

export function getRoomProgressionInfo(roomNumber: number): RoomProgressionInfo {
  const clamped = Math.max(1, Math.min(TOTAL_DUNGEON_ROOMS, Math.floor(roomNumber)));
  const wingNumber = Math.floor((clamped - 1) / ROOMS_PER_BOSS_CYCLE) + 1;
  const stepInWing = ((clamped - 1) % ROOMS_PER_BOSS_CYCLE) + 1;
  const isBossRoom = stepInWing === ROOMS_PER_BOSS_CYCLE;
  const isFinalBossRoom = clamped === TOTAL_DUNGEON_ROOMS;
  const themeRoomId: DungeonRoomId = isBossRoom
    ? 'blighted_sanctum'
    : NORMAL_THEME_ROTATION[(clamped - 1) % NORMAL_THEME_ROTATION.length];

  return {
    roomNumber: clamped,
    totalRooms: TOTAL_DUNGEON_ROOMS,
    wingNumber,
    totalWings: TOTAL_DUNGEON_WINGS,
    stepInWing,
    cycleLength: ROOMS_PER_BOSS_CYCLE,
    isBossRoom,
    isFinalBossRoom,
    themeRoomId,
  };
}

// --- Combat Log Pure Model ---

export type CombatLogCategory =
  | 'attack'
  | 'damage'
  | 'kill'
  | 'loot'
  | 'key'
  | 'door'
  | 'serum'
  | 'level'
  | 'room'
  | 'shop';

export interface CombatLogEntry {
  id: number;
  text: string;
  category: CombatLogCategory;
  roomNumber: number;
}

export const MAX_COMBAT_LOG_ENTRIES = 36;

export function appendCombatLog(
  entries: CombatLogEntry[],
  entry: CombatLogEntry,
  maxEntries = MAX_COMBAT_LOG_ENTRIES
): CombatLogEntry[] {
  const next = [...entries, entry];
  if (next.length <= maxEntries) return next;
  return next.slice(next.length - maxEntries);
}

/** Computes random drop probability for a Skeleton Key when an enemy falls. */
export function computeKeyDropChance(
  isBoss: boolean,
  currentKeys: number,
  lockedShortcutsInRoom: number
): number {
  if (isBoss) return 0.85;
  let chance = 0.34;
  if (currentKeys <= 0 && lockedShortcutsInRoom > 0) {
    chance += 0.2;
  }
  return Math.min(0.95, chance);
}

export const WORLD_PILLARS: PillarObstacle[] = DUNGEON_ROOMS.ashen_courtyard.pillars;
export const WORLD_SHRINES: WorldShrineDef[] = DUNGEON_ROOM_LIST.map((r) => r.shrine).filter(
  (s): s is WorldShrineDef => s !== null
);

// --- SERUM Skill System (Weakens with Repeated/Rapid Use, Recharges When Unused) ---

export interface SerumState {
  potency: number; // 0.25 .. 1.0 (scales Serum damage & radius)
  unusedSeconds: number; // seconds since last Serum injection
  rapidUses: number; // consecutive rapid casts within tolerance window
}

export const SERUM_MIN_POTENCY = 0.25;
export const SERUM_PRESETS_MAX = 10;
export const SERUM_PRESET_COST_PER_CAST = 2;

export function getSerumPresetPower(presets: number): number {
  return Math.max(0, Math.min(1, Math.floor(presets) / SERUM_PRESETS_MAX));
}

export function canActivateSerum(
  presets: number,
  astral: number,
  specialCost: number
): boolean {
  return presets >= SERUM_PRESET_COST_PER_CAST && astral >= specialCost;
}

export function consumeSerumPresets(presets: number): number {
  return Math.max(0, Math.floor(presets) - SERUM_PRESET_COST_PER_CAST);
}

export function computeEffectiveSerumPotency(presets: number, state: SerumState): number {
  const presetRatio = getSerumPresetPower(presets);
  if (presetRatio <= 0) return 0;
  return Math.round(presetRatio * Math.max(SERUM_MIN_POTENCY, Math.min(1, state.potency)) * 1000) / 1000;
}

export function createInitialSerumState(): SerumState {
  return {
    potency: 1.0,
    unusedSeconds: 15,
    rapidUses: 0,
  };
}

export function applySerumCast(state: SerumState): {
  nextState: SerumState;
  castPotency: number;
} {
  const castPotency = Math.max(SERUM_MIN_POTENCY, Math.min(1, state.potency));
  const rapidPenalty =
    state.unusedSeconds < 4.5 ? 0.14 : state.unusedSeconds < 8.5 ? 0.06 : 0;
  const streakPenalty = Math.min(0.12, state.rapidUses * 0.04);
  const totalDrop = 0.24 + rapidPenalty + streakPenalty;

  const nextPotency = Math.max(
    SERUM_MIN_POTENCY,
    Math.round((castPotency - totalDrop) * 1000) / 1000
  );

  return {
    castPotency,
    nextState: {
      potency: nextPotency,
      unusedSeconds: 0,
      rapidUses: state.unusedSeconds < 7.0 ? state.rapidUses + 1 : 1,
    },
  };
}

export function tickSerumRecovery(
  state: SerumState,
  dt: number,
  recoverySpeedMult = 1
): SerumState {
  const nextUnused = state.unusedSeconds + dt;
  const nextRapidUses = nextUnused >= 8.5 ? 0 : state.rapidUses;

  if (state.potency >= 1) {
    return {
      potency: 1,
      unusedSeconds: nextUnused,
      rapidUses: nextRapidUses,
    };
  }

  // Brief settle period before potency begins regenerating; recharges much faster when left unused longer
  let ratePerSecond = 0;
  if (nextUnused >= 12) {
    ratePerSecond = 0.18;
  } else if (nextUnused >= 6) {
    ratePerSecond = 0.1;
  } else if (nextUnused >= 2.2) {
    ratePerSecond = 0.045;
  }

  const nextPotency = Math.min(
    1,
    Math.round((state.potency + ratePerSecond * recoverySpeedMult * dt) * 1000) / 1000
  );

  return {
    potency: nextPotency,
    unusedSeconds: nextUnused,
    rapidUses: nextRapidUses,
  };
}

export function getSerumStatusLabel(
  potency: number,
  unusedSeconds: number,
  presets: number = SERUM_PRESETS_MAX
): string {
  if (presets <= 0) return 'LOCKED (0/10)';
  if (presets < SERUM_PRESET_COST_PER_CAST) return `NEED 2 PACKS (${presets}/${SERUM_PRESETS_MAX})`;
  if (potency <= 0.34) return unusedSeconds >= 2.2 ? 'RECOVERING' : 'DEPLETED';
  if (unusedSeconds >= 2.2 && potency < 0.98) return 'RECHARGING';
  if (potency < 0.98) return 'WEAKENED';
  if (presets < SERUM_PRESETS_MAX) return `${presets}/${SERUM_PRESETS_MAX} PACKS`;
  return 'FULL POWER';
}

// --- Combo Meter Tier & Rank ---

export interface ComboRankInfo {
  grade: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
  title: string;
  color: string;
  scoreMultiplier: number;
}

export function getComboRank(combo: number): ComboRankInfo {
  const scoreMultiplier = 1 + Math.min(4, Math.floor(Math.max(0, combo - 1) / 3) * 0.5);
  if (combo >= 30) {
    return { grade: 'SS', title: 'INHUMAN', color: '#FDE047', scoreMultiplier };
  }
  if (combo >= 20) {
    return { grade: 'S', title: 'BLIGHT FURY', color: '#F59E0B', scoreMultiplier };
  }
  if (combo >= 12) {
    return { grade: 'A', title: 'RUTHLESS', color: '#E11D48', scoreMultiplier };
  }
  if (combo >= 7) {
    return { grade: 'B', title: 'SAVAGE', color: '#84CC16', scoreMultiplier };
  }
  if (combo >= 4) {
    return { grade: 'C', title: 'CHAIN', color: '#34D399', scoreMultiplier };
  }
  return { grade: 'D', title: 'SPARK', color: '#CBD5E1', scoreMultiplier };
}

// --- Boss Health Bar Phase & Visual Telemetry ---

export type BossHealthPhase = 'SOVEREIGN' | 'ENRAGED' | 'CRITICAL' | 'FALLEN';

export interface BossHealthMeta {
  ratio: number; // 0..1
  pct: number; // 0..100 integer
  phaseLabel: BossHealthPhase;
  isEnraged: boolean;
  isCritical: boolean;
  barColor: string;
  accentColor: string;
}

export function getBossHealthMeta(hp: number, maxHp: number): BossHealthMeta {
  const safeMax = Math.max(1, Math.round(maxHp));
  const safeHp = Math.max(0, Math.min(safeMax, Math.round(hp)));
  const ratio = safeHp / safeMax;
  const pct = Math.round(ratio * 100);

  if (safeHp <= 0) {
    return {
      ratio: 0,
      pct: 0,
      phaseLabel: 'FALLEN',
      isEnraged: false,
      isCritical: false,
      barColor: '#7F1D1D',
      accentColor: '#A8A29E',
    };
  }
  if (ratio <= 0.25) {
    return {
      ratio,
      pct,
      phaseLabel: 'CRITICAL',
      isEnraged: true,
      isCritical: true,
      barColor: '#F43F5E',
      accentColor: '#FEF08A',
    };
  }
  if (ratio <= 0.5) {
    return {
      ratio,
      pct,
      phaseLabel: 'ENRAGED',
      isEnraged: true,
      isCritical: false,
      barColor: '#EA580C',
      accentColor: '#FDE047',
    };
  }
  return {
    ratio,
    pct,
    phaseLabel: 'SOVEREIGN',
    isEnraged: false,
    isCritical: false,
    barColor: '#DC2626',
    accentColor: '#F59E0B',
  };
}

// --- Combo VFX Tier Profile & Milestone Detection ---

export interface ComboVfxProfile {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  grade: ComboRankInfo['grade'];
  title: string;
  primaryColor: string;
  secondaryColor: string;
  auraActive: boolean;
  afterimageActive: boolean;
  auraRadius: number;
  slashCount: number;
  sparkCount: number;
  shakeBonus: number;
  edgeGlowAlpha: number;
}

export const COMBO_RANK_THRESHOLDS = [4, 7, 12, 20, 30] as const;

export function getComboVfxProfile(combo: number): ComboVfxProfile {
  const c = Math.max(0, Math.floor(combo));
  const rank = getComboRank(c);
  if (c >= 30) {
    return {
      tier: 5,
      grade: rank.grade,
      title: rank.title,
      primaryColor: '#FDE047',
      secondaryColor: '#FFFFFF',
      auraActive: true,
      afterimageActive: true,
      auraRadius: 21,
      slashCount: 5,
      sparkCount: 28,
      shakeBonus: 0.42,
      edgeGlowAlpha: 0.28,
    };
  }
  if (c >= 20) {
    return {
      tier: 4,
      grade: rank.grade,
      title: rank.title,
      primaryColor: '#F59E0B',
      secondaryColor: '#FEF08A',
      auraActive: true,
      afterimageActive: true,
      auraRadius: 18,
      slashCount: 4,
      sparkCount: 22,
      shakeBonus: 0.34,
      edgeGlowAlpha: 0.2,
    };
  }
  if (c >= 12) {
    return {
      tier: 3,
      grade: rank.grade,
      title: rank.title,
      primaryColor: '#E11D48',
      secondaryColor: '#FDA4AF',
      auraActive: true,
      afterimageActive: true,
      auraRadius: 16,
      slashCount: 3,
      sparkCount: 16,
      shakeBonus: 0.26,
      edgeGlowAlpha: 0.14,
    };
  }
  if (c >= 7) {
    return {
      tier: 2,
      grade: rank.grade,
      title: rank.title,
      primaryColor: '#84CC16',
      secondaryColor: '#ECFCCB',
      auraActive: true,
      afterimageActive: true,
      auraRadius: 14,
      slashCount: 2,
      sparkCount: 12,
      shakeBonus: 0.2,
      edgeGlowAlpha: 0.08,
    };
  }
  if (c >= 4) {
    return {
      tier: 1,
      grade: rank.grade,
      title: rank.title,
      primaryColor: '#34D399',
      secondaryColor: '#A7F3D0',
      auraActive: true,
      afterimageActive: false,
      auraRadius: 12,
      slashCount: 2,
      sparkCount: 9,
      shakeBonus: 0.14,
      edgeGlowAlpha: 0.04,
    };
  }
  return {
    tier: 0,
    grade: rank.grade,
    title: rank.title,
    primaryColor: '#CBD5E1',
    secondaryColor: '#FEF3C7',
    auraActive: false,
    afterimageActive: false,
    auraRadius: 0,
    slashCount: c >= 2 ? 1 : 0,
    sparkCount: 5,
    shakeBonus: 0,
    edgeGlowAlpha: 0,
  };
}

export function isComboMilestone(prevCombo: number, nextCombo: number): boolean {
  const prev = Math.max(0, Math.floor(prevCombo));
  const next = Math.max(0, Math.floor(nextCombo));
  if (next <= prev) return false;
  for (const threshold of COMBO_RANK_THRESHOLDS) {
    if (prev < threshold && next >= threshold) return true;
  }
  // Every +10 hits past SS (40, 50, 60...) also celebrates as a milestone
  if (next >= 40 && Math.floor(next / 10) > Math.floor(prev / 10)) {
    return true;
  }
  return false;
}

// --- Escalating Room Encounter Scaling (Strictly More Monsters & Higher Difficulty Each Room) ---

export interface EscalatedWaveSpec {
  waveNumber: number;
  totalEnemies: number;
  hpMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  telegraphMultiplier: number;
  cooldownMultiplier: number;
  maxConcurrentTokens: number;
  isBossWave: boolean;
  xpMultiplier: number;
  scoreMultiplier: number;
  powerUpDropCount: number;
  lootTier: number;
  spawns: WaveSpawnEntry[];
}

export function generateWaveSpec(
  roomOrder: number,
  difficulty: DifficultyId
): EscalatedWaveSpec {
  const r = Math.max(1, Math.min(TOTAL_DUNGEON_ROOMS, Math.floor(roomOrder)));
  const diff = DIFFICULTY_CONFIGS[difficulty];
  const isBossWave = isBossRoomNumber(r);

  // Strictly increasing difficulty across every single stat every next room (all the way to Room 666)
  const baseHpMult =
    diff.enemyHpMult * (1 + (r - 1) * 0.22 + Math.floor((r - 1) / ROOMS_PER_BOSS_CYCLE) * 0.2);
  const baseDamageMult = diff.enemyDamageMult * (1 + (r - 1) * 0.14);
  const baseSpeedMult = diff.enemySpeedMult * (1 + Math.min(1.1, (r - 1) * 0.045));
  const baseTelegraphMult = Math.max(0.46, 1 - (r - 1) * 0.028);
  const baseCooldownMult = Math.max(0.48, 1 - (r - 1) * 0.026);
  const maxConcurrentTokens = Math.min(
    7,
    Math.max(1, 2 + Math.floor((r - 1) / 3) + diff.tokenOffset)
  );

  // Boss Rooms are a single high-powered Boss duel — zero regular enemies alongside the Boss!
  if (isBossWave) {
    const bossHpMultiplier = baseHpMult * 2.35;
    const bossDamageMultiplier = baseDamageMult * 1.45;
    const bossSpeedMultiplier = baseSpeedMult * 1.18;
    const bossTelegraphMultiplier = Math.max(0.4, baseTelegraphMult * 0.88);
    const bossCooldownMultiplier = Math.max(0.42, baseCooldownMult * 0.82);
    const powerUpDropCount = 2 + Math.min(2, Math.floor(r / 6));
    const lootTier = Math.min(5, 1 + Math.floor((r - 1) / 2));

    return {
      waveNumber: r,
      totalEnemies: 1,
      hpMultiplier: Math.round(bossHpMultiplier * 100) / 100,
      damageMultiplier: Math.round(bossDamageMultiplier * 100) / 100,
      speedMultiplier: Math.round(bossSpeedMultiplier * 100) / 100,
      telegraphMultiplier: Math.round(bossTelegraphMultiplier * 100) / 100,
      cooldownMultiplier: Math.round(bossCooldownMultiplier * 100) / 100,
      maxConcurrentTokens: 1,
      isBossWave: true,
      xpMultiplier: (1 + (r - 1) * 0.28) * 2.5,
      scoreMultiplier: diff.scoreMult * (1 + (r - 1) * 0.22) * 1.6,
      powerUpDropCount,
      lootTier,
      spawns: [{ archetype: 'warden', count: 1 }],
    };
  }

  // Strictly more monsters than the previous non-boss room, capped cleanly at 34 for 60fps in deep rooms
  const startCount = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
  const perRoomStep = difficulty === 'hard' ? 2 : 1;
  const rawTotal = startCount + (r - 1) * perRoomStep + Math.floor((r - 1) / 4);
  const targetTotal = Math.min(34, rawTotal);

  let remaining = Math.max(1, targetTotal);
  let hexerCount = 0;
  let lancerCount = 0;

  if (r >= 3 && remaining >= 2) {
    hexerCount = Math.max(1, Math.min(remaining - 1, Math.floor(remaining * 0.26)));
    remaining -= hexerCount;
  }
  if (r >= 2 && remaining >= 2) {
    lancerCount = Math.max(1, Math.min(remaining - 1, Math.floor(remaining * 0.38)));
    remaining -= lancerCount;
  }
  const thrallCount = Math.max(1, remaining);

  const spawns: WaveSpawnEntry[] = [];
  if (thrallCount > 0) spawns.push({ archetype: 'thrall', count: thrallCount });
  if (lancerCount > 0) spawns.push({ archetype: 'lancer', count: lancerCount });
  if (hexerCount > 0) spawns.push({ archetype: 'hexer', count: hexerCount });

  const totalEnemies = spawns.reduce((sum, entry) => sum + entry.count, 0);

  const powerUpDropCount = 1 + Math.min(2, Math.floor(r / 4));
  const lootTier = Math.min(5, 1 + Math.floor((r - 1) / 2));

  return {
    waveNumber: r,
    totalEnemies,
    hpMultiplier: Math.round(baseHpMult * 100) / 100,
    damageMultiplier: Math.round(baseDamageMult * 100) / 100,
    speedMultiplier: Math.round(baseSpeedMult * 100) / 100,
    telegraphMultiplier: Math.round(baseTelegraphMult * 100) / 100,
    cooldownMultiplier: Math.round(baseCooldownMult * 100) / 100,
    maxConcurrentTokens,
    isBossWave: false,
    xpMultiplier: 1 + (r - 1) * 0.28,
    scoreMultiplier: diff.scoreMult * (1 + (r - 1) * 0.22),
    powerUpDropCount,
    lootTier,
    spawns,
  };
}

export const generateRoomEncounterSpec = generateWaveSpec;

// --- Rarity System ---

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic';

export interface RarityMeta {
  id: ItemRarity;
  label: string;
  color: string;
  tierMultiplier: number;
}

export const RARITY_META: Record<ItemRarity, RarityMeta> = {
  common: { id: 'common', label: 'Common', color: '#CBD5E1', tierMultiplier: 1.0 },
  uncommon: { id: 'uncommon', label: 'Uncommon', color: '#84CC16', tierMultiplier: 1.35 },
  rare: { id: 'rare', label: 'Rare', color: '#F59E0B', tierMultiplier: 1.75 },
  epic: { id: 'epic', label: 'Epic', color: '#C084FC', tierMultiplier: 2.25 },
  mythic: { id: 'mythic', label: 'Mythic', color: '#F43F5E', tierMultiplier: 3.0 },
};

export function rarityForWave(waveNumber: number, bonusTier = 0): ItemRarity {
  const effective = waveNumber + bonusTier * 2;
  if (effective >= 10) return 'mythic';
  if (effective >= 7) return 'epic';
  if (effective >= 4) return 'rare';
  if (effective >= 2) return 'uncommon';
  return 'common';
}

// --- Stacking Wave Power-Ups (Persist & Accumulate Until Death) ---

export type PowerUpKind = 'might' | 'haste' | 'vitality' | 'crit' | 'siphon' | 'nova';

export interface PowerUpDropSpec {
  kind: PowerUpKind;
  rarity: ItemRarity;
  waveTier: number;
  label: string;
  shortTag: string;
  color: string;
  magnitude: number;
  summary: string;
}

export interface PowerUpStackTotals {
  totalStacks: number;
  mightBonusPct: number;
  hasteBonusPct: number;
  vitalityBonusHp: number;
  critChancePct: number;
  critDamagePct: number;
  lifestealOnHit: number;
  astralGainBonusPct: number;
  novaPowerPct: number;
  counts: Record<PowerUpKind, number>;
}

export function createEmptyPowerUpStacks(): PowerUpStackTotals {
  return {
    totalStacks: 0,
    mightBonusPct: 0,
    hasteBonusPct: 0,
    vitalityBonusHp: 0,
    critChancePct: 0,
    critDamagePct: 0,
    lifestealOnHit: 0,
    astralGainBonusPct: 0,
    novaPowerPct: 0,
    counts: {
      might: 0,
      haste: 0,
      vitality: 0,
      crit: 0,
      siphon: 0,
      nova: 0,
    },
  };
}

const POWERUP_KINDS: PowerUpKind[] = ['might', 'haste', 'vitality', 'crit', 'siphon', 'nova'];

export function createWavePowerUp(
  waveNumber: number,
  forcedKind?: PowerUpKind,
  rng: () => number = Math.random
): PowerUpDropSpec {
  const rarity = rarityForWave(waveNumber, rng() < 0.22 ? 1 : 0);
  const mult = RARITY_META[rarity].tierMultiplier;
  const kind = forcedKind ?? POWERUP_KINDS[Math.floor(rng() * POWERUP_KINDS.length) % POWERUP_KINDS.length];

  switch (kind) {
    case 'might': {
      const val = Math.round(9 * mult);
      return {
        kind,
        rarity,
        waveTier: waveNumber,
        label: `${RARITY_META[rarity].label} Blood Sigil`,
        shortTag: `+${val}% DMG`,
        color: '#F59E0B',
        magnitude: val,
        summary: `+${val}% Attack Power (stacks)`,
      };
    }
    case 'haste': {
      const val = Math.round(6 * mult);
      return {
        kind,
        rarity,
        waveTier: waveNumber,
        label: `${RARITY_META[rarity].label} Windward Spur`,
        shortTag: `+${val}% HASTE`,
        color: '#34D399',
        magnitude: val,
        summary: `+${val}% Move & Evade Haste (stacks)`,
      };
    }
    case 'vitality': {
      const val = Math.round(16 * mult);
      return {
        kind,
        rarity,
        waveTier: waveNumber,
        label: `${RARITY_META[rarity].label} Iron Heart`,
        shortTag: `+${val} MAX HP`,
        color: '#10B981',
        magnitude: val,
        summary: `+${val} Max HP & Heal (stacks)`,
      };
    }
    case 'crit': {
      const val = Math.round(6 * mult);
      return {
        kind,
        rarity,
        waveTier: waveNumber,
        label: `${RARITY_META[rarity].label} Ravager Fang`,
        shortTag: `+${val}% CRIT`,
        color: '#F43F5E',
        magnitude: val,
        summary: `+${val}% Crit Chance & +${val * 2}% Crit DMG (stacks)`,
      };
    }
    case 'siphon': {
      const val = Math.max(1, Math.round(1.5 * mult));
      return {
        kind,
        rarity,
        waveTier: waveNumber,
        label: `${RARITY_META[rarity].label} Leech Idol`,
        shortTag: `+${val} LEECH`,
        color: '#EC4899',
        magnitude: val,
        summary: `+${val} HP On-Hit & +${val * 8}% Serum VST Gain (stacks)`,
      };
    }
    case 'nova': {
      const val = Math.round(12 * mult);
      return {
        kind,
        rarity,
        waveTier: waveNumber,
        label: `${RARITY_META[rarity].label} Blight Vial`,
        shortTag: `+${val}% SERUM VST`,
        color: '#84CC16',
        magnitude: val,
        summary: `+${val}% Serum VST Power & Recovery (stacks)`,
      };
    }
  }
}

export function applyPowerUpToStacks(
  stacks: PowerUpStackTotals,
  drop: PowerUpDropSpec
): PowerUpStackTotals {
  const next: PowerUpStackTotals = {
    ...stacks,
    totalStacks: stacks.totalStacks + 1,
    counts: { ...stacks.counts, [drop.kind]: stacks.counts[drop.kind] + 1 },
  };
  switch (drop.kind) {
    case 'might':
      next.mightBonusPct += drop.magnitude;
      break;
    case 'haste':
      next.hasteBonusPct += drop.magnitude;
      break;
    case 'vitality':
      next.vitalityBonusHp += drop.magnitude;
      break;
    case 'crit':
      next.critChancePct += drop.magnitude;
      next.critDamagePct += drop.magnitude * 2;
      break;
    case 'siphon':
      next.lifestealOnHit += drop.magnitude;
      next.astralGainBonusPct += drop.magnitude * 8;
      break;
    case 'nova':
      next.novaPowerPct += drop.magnitude;
      break;
  }
  return next;
}

// --- Dark Fantasy RPG Inventory: Equipment & Consumables ---

export type EquipSlot = 'weapon' | 'armor' | 'relic' | 'boots';
export type ConsumableKind = 'medkit' | 'aether_flask' | 'overcharge';

export interface ItemBonuses {
  attackPct?: number;
  maxHp?: number;
  armorPct?: number;
  moveSpeedPct?: number;
  critChancePct?: number;
  novaPowerPct?: number;
  lifesteal?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: 'equipment' | 'consumable';
  slot?: EquipSlot;
  consumableKind?: ConsumableKind;
  rarity: ItemRarity;
  waveLevel: number;
  description: string;
  bonuses?: ItemBonuses;
  quantity?: number;
  goldValue?: number;
}

export type EquippedGearMap = Record<EquipSlot, InventoryItem | null>;

// --- HUD Opacity Customization Helper ---

export const HUD_OPACITY_MIN = 0.2;
export const HUD_OPACITY_MAX = 1.0;
export const HUD_OPACITY_DEFAULT = 0.92;

export function clampHudOpacity(value: number): number {
  if (!Number.isFinite(value)) return HUD_OPACITY_DEFAULT;
  return Math.round(Math.max(HUD_OPACITY_MIN, Math.min(HUD_OPACITY_MAX, value)) * 100) / 100;
}

// --- Hooded-Cloak Shopkeeper & Fixed Gold Economy (Every 6 Levels) ---

export const SHOPKEEPER_INTERVAL = 6;
export const SHOPKEEPER_GREETING =
  "Got lot's of good things on sale today, Stranger! What're ya buyin?";

export const SHOP_PRICES = {
  healingPotion: 45,
  presetFile: 60,
  presetFileBundle2: 120,
} as const;

export const FIXED_CONSUMABLE_GOLD_VALUE: Record<ConsumableKind, number> = {
  medkit: SHOP_PRICES.healingPotion,
  aether_flask: 55,
  overcharge: 80,
};

export const FIXED_EQUIPMENT_GOLD_VALUE: Record<ItemRarity, number> = {
  common: 40,
  uncommon: 85,
  rare: 150,
  epic: 260,
  mythic: 420,
};

export function getItemGoldValue(item: InventoryItem): number {
  if (typeof item.goldValue === 'number' && item.goldValue > 0) {
    return Math.round(item.goldValue);
  }
  if (item.kind === 'consumable' && item.consumableKind) {
    return FIXED_CONSUMABLE_GOLD_VALUE[item.consumableKind];
  }
  return FIXED_EQUIPMENT_GOLD_VALUE[item.rarity] ?? 40;
}

export function isBossBattleActive(roomNumber: number, roomCleared: boolean): boolean {
  return isBossRoomNumber(roomNumber) && !roomCleared;
}

export function isShopkeeperAllowed(roomNumber: number, roomCleared: boolean): boolean {
  return !isBossBattleActive(roomNumber, roomCleared);
}

export function shouldSpawnShopkeeperForRoom(roomNumber: number): boolean {
  const r = Math.floor(roomNumber);
  return r >= SHOPKEEPER_INTERVAL && r % SHOPKEEPER_INTERVAL === 0;
}

export function shouldSpawnShopkeeperForPlayerLevel(
  playerLevel: number,
  lastShopPlayerLevel: number
): boolean {
  const lv = Math.floor(playerLevel);
  return lv >= SHOPKEEPER_INTERVAL && lv % SHOPKEEPER_INTERVAL === 0 && lv > lastShopPlayerLevel;
}

export function createHealingPotionItem(roomNumber: number): InventoryItem {
  return {
    id: `potion_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: 'Healing Potion',
    kind: 'consumable',
    consumableKind: 'medkit',
    rarity: 'common',
    waveLevel: Math.max(1, Math.floor(roomNumber)),
    description: 'Restores 45% Max HP immediately.',
    quantity: 1,
    goldValue: SHOP_PRICES.healingPotion,
  };
}

export function purchaseHealingPotion(
  gold: number,
  inventory: InventoryItem[],
  roomNumber: number
): { ok: boolean; gold: number; inventory: InventoryItem[]; message: string } {
  const cost = SHOP_PRICES.healingPotion;
  if (gold < cost) {
    return {
      ok: false,
      gold,
      inventory,
      message: `Not enough gold! Healing Potion costs ${cost}g.`,
    };
  }
  const existingIdx = inventory.findIndex(
    (it) => it.kind === 'consumable' && it.consumableKind === 'medkit'
  );
  let nextInv: InventoryItem[];
  if (existingIdx >= 0) {
    nextInv = inventory.map((it, idx) =>
      idx === existingIdx
        ? {
            ...it,
            quantity: (it.quantity ?? 1) + 1,
            goldValue: SHOP_PRICES.healingPotion,
          }
        : it
    );
  } else {
    nextInv = [createHealingPotionItem(roomNumber), ...inventory].slice(0, 24);
  }
  return {
    ok: true,
    gold: gold - cost,
    inventory: nextInv,
    message: `Bought Healing Potion for ${cost}g!`,
  };
}

export function purchasePresetFile(
  gold: number,
  presetsCollected: number,
  count = 1
): { ok: boolean; gold: number; presetsCollected: number; message: string } {
  const qty = Math.max(1, Math.floor(count));
  const missing = SERUM_PRESETS_MAX - Math.floor(presetsCollected);
  if (missing <= 0) {
    return {
      ok: false,
      gold,
      presetsCollected,
      message: `Serum VST Sample Packs already maxed (${SERUM_PRESETS_MAX}/${SERUM_PRESETS_MAX})!`,
    };
  }
  const actualQty = Math.min(qty, missing);
  const cost = actualQty * SHOP_PRICES.presetFile;
  if (gold < cost) {
    return {
      ok: false,
      gold,
      presetsCollected,
      message: `Not enough gold! ${actualQty} Sample Pack${actualQty === 1 ? '' : 's'} cost ${cost}g.`,
    };
  }
  const nextPresets = Math.min(SERUM_PRESETS_MAX, Math.floor(presetsCollected) + actualQty);
  return {
    ok: true,
    gold: gold - cost,
    presetsCollected: nextPresets,
    message: `Bought ${actualQty} Serum VST Sample Pack${actualQty === 1 ? '' : 's'} for ${cost}g (${nextPresets}/${SERUM_PRESETS_MAX})!`,
  };
}

export function sellItemForGold(
  gold: number,
  inventory: InventoryItem[],
  itemId: string
): {
  ok: boolean;
  gold: number;
  inventory: InventoryItem[];
  goldEarned: number;
  itemName: string;
  message: string;
} {
  const idx = inventory.findIndex((it) => it.id === itemId);
  if (idx === -1) {
    return {
      ok: false,
      gold,
      inventory,
      goldEarned: 0,
      itemName: '',
      message: 'Item no longer in satchel.',
    };
  }
  const item = inventory[idx];
  const goldEarned = getItemGoldValue(item);
  const nextInv = [...inventory];
  if (item.kind === 'consumable' && (item.quantity ?? 1) > 1) {
    nextInv[idx] = { ...item, quantity: (item.quantity ?? 1) - 1 };
  } else {
    nextInv.splice(idx, 1);
  }
  return {
    ok: true,
    gold: gold + goldEarned,
    inventory: nextInv,
    goldEarned,
    itemName: item.name,
    message: `Sold ${item.name} for +${goldEarned}g!`,
  };
}

export type WeaponVisualKind = 'blade' | 'axe' | 'flail' | 'gauntlets' | 'unarmed';

export interface WeaponAttackProfile {
  kind: WeaponVisualKind;
  shortLabel: string;
  reachMult: number;
  damageMult: number;
  primaryColor: string;
  secondaryColor: string;
  heavyTrail: boolean;
}

export function getWeaponVisualKind(weapon: InventoryItem | null | undefined): WeaponVisualKind {
  if (!weapon) return 'unarmed';
  const name = weapon.name.toLowerCase();
  if (name.includes('blade') || name.includes('sword') || name.includes('claymore')) {
    return 'blade';
  }
  if (name.includes('axe') || name.includes('cleaver') || name.includes('halberd')) {
    return 'axe';
  }
  if (name.includes('flail') || name.includes('mace') || name.includes('morningstar')) {
    return 'flail';
  }
  if (name.includes('gauntlet') || name.includes('knuckle') || name.includes('fist')) {
    return 'gauntlets';
  }
  return 'blade';
}

export function getWeaponShortLabel(kind: WeaponVisualKind): string {
  switch (kind) {
    case 'blade':
      return 'BLADE';
    case 'axe':
      return 'AXE';
    case 'flail':
      return 'FLAIL';
    case 'gauntlets':
      return 'GAUNTLET';
    default:
      return 'FIST';
  }
}

export function getWeaponAttackProfile(kind: WeaponVisualKind): WeaponAttackProfile {
  switch (kind) {
    case 'blade':
      return {
        kind: 'blade',
        shortLabel: 'BLADE',
        reachMult: 1.14,
        damageMult: 1.02,
        primaryColor: '#E2E8F0',
        secondaryColor: '#FDE68A',
        heavyTrail: false,
      };
    case 'axe':
      return {
        kind: 'axe',
        shortLabel: 'AXE',
        reachMult: 1.18,
        damageMult: 1.1,
        primaryColor: '#FB923C',
        secondaryColor: '#EF4444',
        heavyTrail: true,
      };
    case 'flail':
      return {
        kind: 'flail',
        shortLabel: 'FLAIL',
        reachMult: 1.26,
        damageMult: 1.05,
        primaryColor: '#FBBF24',
        secondaryColor: '#D97706',
        heavyTrail: true,
      };
    case 'gauntlets':
      return {
        kind: 'gauntlets',
        shortLabel: 'GAUNTLET',
        reachMult: 0.98,
        damageMult: 1.0,
        primaryColor: '#F59E0B',
        secondaryColor: '#FEF3C7',
        heavyTrail: false,
      };
    default:
      return {
        kind: 'unarmed',
        shortLabel: 'FIST',
        reachMult: 0.92,
        damageMult: 0.92,
        primaryColor: '#E7E5E4',
        secondaryColor: '#D6D3D1',
        heavyTrail: false,
      };
  }
}

export function createStarterEquipped(): EquippedGearMap {
  return {
    weapon: {
      id: 'starter-weapon',
      name: 'Iron War Blade',
      kind: 'equipment',
      slot: 'weapon',
      rarity: 'common',
      waveLevel: 1,
      description: 'Notched gothic broadsword salvaged from the Ashen Courtyard. Balanced sweeping slashes.',
      bonuses: { attackPct: 5 },
      goldValue: FIXED_EQUIPMENT_GOLD_VALUE.common,
    },
    armor: {
      id: 'starter-armor',
      name: 'Tattered Brigandine',
      kind: 'equipment',
      slot: 'armor',
      rarity: 'common',
      waveLevel: 1,
      description: 'Riveted leather & iron plates worn thin by wasteland rot.',
      bonuses: { maxHp: 10, armorPct: 4 },
      goldValue: FIXED_EQUIPMENT_GOLD_VALUE.common,
    },
    relic: null,
    boots: null,
  };
}

export function createStarterInventory(): InventoryItem[] {
  return [
    {
      id: 'starter-gauntlets',
      name: 'Rusted Iron Gauntlets',
      kind: 'equipment',
      slot: 'weapon',
      rarity: 'common',
      waveLevel: 1,
      description: 'Pitted spiked battle-gauntlets for rapid heavy brawler punches.',
      bonuses: { attackPct: 5, critChancePct: 2 },
      goldValue: FIXED_EQUIPMENT_GOLD_VALUE.common,
    },
    {
      id: 'starter-axe',
      name: 'Iron Battle Axe',
      kind: 'equipment',
      slot: 'weapon',
      rarity: 'common',
      waveLevel: 1,
      description: 'Double-bit iron war axe built for brutal overhead executioner cleaves.',
      bonuses: { attackPct: 7 },
      goldValue: FIXED_EQUIPMENT_GOLD_VALUE.common,
    },
    {
      id: 'starter-flail',
      name: 'Ashen Spiked Flail',
      kind: 'equipment',
      slot: 'weapon',
      rarity: 'common',
      waveLevel: 1,
      description: 'Chained iron morningstar that whips and whirls with extended reach.',
      bonuses: { attackPct: 6, critChancePct: 2 },
      goldValue: FIXED_EQUIPMENT_GOLD_VALUE.common,
    },
    {
      id: 'starter-medkit',
      name: 'Healing Potion',
      kind: 'consumable',
      consumableKind: 'medkit',
      rarity: 'common',
      waveLevel: 1,
      description: 'Restores 45% Max HP immediately.',
      quantity: 2,
      goldValue: FIXED_CONSUMABLE_GOLD_VALUE.medkit,
    },
    {
      id: 'starter-aether',
      name: 'Alchemical Phial',
      kind: 'consumable',
      consumableKind: 'aether_flask',
      rarity: 'uncommon',
      waveLevel: 1,
      description: 'Restores +55 Serum VST Charge and +30% Serum VST Potency.',
      quantity: 1,
      goldValue: FIXED_CONSUMABLE_GOLD_VALUE.aether_flask,
    },
  ];
}

const GEAR_PREFIXES: Record<ItemRarity, string[]> = {
  common: ['Rusted', 'Iron', 'Ashen'],
  uncommon: ['Tempered', 'Runic', 'Oathbound'],
  rare: ['Blighted', 'Bone-Forged', 'Grim'],
  epic: ['Dread', 'Cursed', 'Sovereign'],
  mythic: ['Inhuman', 'Elder', 'Cataclysm'],
};

const SLOT_NOUNS: Record<EquipSlot, string[]> = {
  weapon: ['Gauntlets', 'War Blade', 'Spiked Flail', 'Battle Axe'],
  armor: ['Brigandine', 'Plate Mail', 'Chain Hauberk', 'Inquisitor Coat'],
  relic: ['Blood Seal', 'Bone Talisman', 'Cursed Grimoire', 'Serum VST Vial'],
  boots: ['War Greaves', 'Knight Sabatons', 'Stalker Boots', 'Iron Treads'],
};

let gearIdSeq = 1;

export function generateGearDrop(
  waveNumber: number,
  bonusTier = 0,
  rng: () => number = Math.random
): InventoryItem {
  const rarity = rarityForWave(waveNumber, bonusTier);
  const mult = RARITY_META[rarity].tierMultiplier * (1 + (waveNumber - 1) * 0.08);
  const slots: EquipSlot[] = ['weapon', 'armor', 'relic', 'boots'];
  const slot = slots[Math.floor(rng() * slots.length) % slots.length];
  const prefixes = GEAR_PREFIXES[rarity];
  const nouns = SLOT_NOUNS[slot];
  const prefix = prefixes[Math.floor(rng() * prefixes.length) % prefixes.length];
  const noun = nouns[Math.floor(rng() * nouns.length) % nouns.length];

  const bonuses: ItemBonuses = {};
  if (slot === 'weapon') {
    bonuses.attackPct = Math.round(10 * mult);
    bonuses.critChancePct = Math.round(3 * mult);
    if (rarity === 'epic' || rarity === 'mythic') {
      bonuses.lifesteal = Math.max(1, Math.round(1.2 * mult));
    }
  } else if (slot === 'armor') {
    bonuses.maxHp = Math.round(18 * mult);
    bonuses.armorPct = Math.min(28, Math.round(5 * mult));
  } else if (slot === 'relic') {
    bonuses.novaPowerPct = Math.round(14 * mult);
    bonuses.critChancePct = Math.round(4 * mult);
    bonuses.lifesteal = Math.max(1, Math.round(0.9 * mult));
  } else {
    bonuses.moveSpeedPct = Math.min(35, Math.round(7 * mult));
    bonuses.maxHp = Math.round(8 * mult);
    bonuses.attackPct = Math.round(4 * mult);
  }

  const statSummary = formatItemBonuses(bonuses);
  return {
    id: `gear_${Date.now()}_${gearIdSeq++}`,
    name: `${prefix} ${noun}`,
    kind: 'equipment',
    slot,
    rarity,
    waveLevel: waveNumber,
    description: `${RARITY_META[rarity].label} Room ${waveNumber} ${slot}: ${statSummary}`,
    bonuses,
    goldValue: FIXED_EQUIPMENT_GOLD_VALUE[rarity],
  };
}

export function formatItemBonuses(bonuses?: ItemBonuses): string {
  if (!bonuses) return '';
  const parts: string[] = [];
  if (bonuses.attackPct) parts.push(`+${bonuses.attackPct}% ATK`);
  if (bonuses.maxHp) parts.push(`+${bonuses.maxHp} HP`);
  if (bonuses.armorPct) parts.push(`+${bonuses.armorPct}% ARM`);
  if (bonuses.moveSpeedPct) parts.push(`+${bonuses.moveSpeedPct}% SPD`);
  if (bonuses.critChancePct) parts.push(`+${bonuses.critChancePct}% CRIT`);
  if (bonuses.novaPowerPct) parts.push(`+${bonuses.novaPowerPct}% SERUM VST`);
  if (bonuses.lifesteal) parts.push(`+${bonuses.lifesteal} LEECH`);
  return parts.join(' · ');
}

export type InventorySortMode = 'type' | 'rarity' | 'tier';
export type InventoryTypeFilter = 'all' | EquipSlot | 'consumable';

const EQUIP_TYPE_ORDER: Record<EquipSlot, number> = {
  weapon: 0,
  armor: 1,
  relic: 2,
  boots: 3,
};

const RARITY_ORDER: Record<ItemRarity, number> = {
  mythic: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

export function getInventoryItemTypeRank(item: InventoryItem): number {
  if (item.kind === 'consumable') return 4;
  return item.slot ? EQUIP_TYPE_ORDER[item.slot] : 5;
}

export function sortInventoryItems(
  items: InventoryItem[],
  mode: InventorySortMode
): InventoryItem[] {
  return [...items].sort((a, b) => {
    const typeDiff = getInventoryItemTypeRank(a) - getInventoryItemTypeRank(b);
    const rarityDiff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    const tierDiff = b.waveLevel - a.waveLevel;

    if (mode === 'type') {
      if (typeDiff !== 0) return typeDiff;
      if (rarityDiff !== 0) return rarityDiff;
      if (tierDiff !== 0) return tierDiff;
      return a.name.localeCompare(b.name);
    }
    if (mode === 'rarity') {
      if (rarityDiff !== 0) return rarityDiff;
      if (typeDiff !== 0) return typeDiff;
      if (tierDiff !== 0) return tierDiff;
      return a.name.localeCompare(b.name);
    }
    if (tierDiff !== 0) return tierDiff;
    if (rarityDiff !== 0) return rarityDiff;
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name);
  });
}

export function filterInventoryByType(
  items: InventoryItem[],
  filter: InventoryTypeFilter
): InventoryItem[] {
  if (filter === 'all') return items;
  if (filter === 'consumable') return items.filter((it) => it.kind === 'consumable');
  return items.filter((it) => it.kind === 'equipment' && it.slot === filter);
}

// --- RPG Skill Tree (3 Dark-Fantasy Branches, 12 Multi-Rank Nodes) ---

export type SkillBranchId = 'vanguard' | 'shadow' | 'arcanist';

export interface SkillNodeDef {
  id: string;
  branch: SkillBranchId;
  tier: 1 | 2 | 3 | 4;
  name: string;
  maxRank: number;
  requires?: string;
  summary: string;
  effectPerRank: string;
}

export const SKILL_BRANCHES: { id: SkillBranchId; label: string; color: string; desc: string }[] = [
  {
    id: 'vanguard',
    label: 'Vanguard',
    color: '#F59E0B',
    desc: 'Brutal melee force, crits & earthshaker finishers',
  },
  {
    id: 'shadow',
    label: 'Shadowstep',
    color: '#34D399',
    desc: 'Swift footwork, combo fervor & wraith evades',
  },
  {
    id: 'arcanist',
    label: 'Alchemist',
    color: '#84CC16',
    desc: 'Serum VST mastery, iron ward & blood leech',
  },
];

export const SKILL_TREE_NODES: SkillNodeDef[] = [
  // Vanguard Branch
  {
    id: 'van_might',
    branch: 'vanguard',
    tier: 1,
    name: 'Iron Knuckles',
    maxRank: 3,
    summary: 'Amplifies all melee punch, kick, and plunging strikes.',
    effectPerRank: '+12% Melee Damage per rank',
  },
  {
    id: 'van_impact',
    branch: 'vanguard',
    tier: 2,
    name: 'Shatter Force',
    maxRank: 3,
    requires: 'van_might',
    summary: 'Increases knockback impact and breaks foe poise faster.',
    effectPerRank: '+15% Knockback & +6% Attack per rank',
  },
  {
    id: 'van_crit',
    branch: 'vanguard',
    tier: 3,
    name: 'Executioner Edge',
    maxRank: 3,
    requires: 'van_impact',
    summary: 'Precision strikes land devastating golden critical hits.',
    effectPerRank: '+8% Crit Chance & +20% Crit Damage per rank',
  },
  {
    id: 'van_quake',
    branch: 'vanguard',
    tier: 4,
    name: 'Earthshaker',
    maxRank: 1,
    requires: 'van_crit',
    summary: 'Your 3rd strike finisher and heavy kick unleash a bone-rattling shockwave.',
    effectPerRank: 'Finishers trigger bonus shockwave blast',
  },

  // Shadowstep Branch
  {
    id: 'shd_stride',
    branch: 'shadow',
    tier: 1,
    name: 'Ashen Stride',
    maxRank: 3,
    summary: 'Boosts movement speed across every chamber of The Blight.',
    effectPerRank: '+8% Move Speed per rank',
  },
  {
    id: 'shd_blink',
    branch: 'shadow',
    tier: 2,
    name: 'Phantom Step',
    maxRank: 3,
    requires: 'shd_stride',
    summary: 'Trims evade cooldown and extends shadow invulnerability.',
    effectPerRank: '-14% Dash Cooldown per rank',
  },
  {
    id: 'shd_tempo',
    branch: 'shadow',
    tier: 3,
    name: 'Blood Momentum',
    maxRank: 3,
    requires: 'shd_blink',
    summary: 'Keeps your Combo Meter alive longer and sharpens crit precision.',
    effectPerRank: '+0.8s Combo Window & +5% Crit per rank',
  },
  {
    id: 'shd_burst',
    branch: 'shadow',
    tier: 4,
    name: 'Wraith Dash',
    maxRank: 1,
    requires: 'shd_tempo',
    summary: 'Dashing blasts nearby horrors with a cursed shock burst.',
    effectPerRank: 'Dash deals AoE damage & builds combo',
  },

  // Alchemist Branch (Serum VST Mastery)
  {
    id: 'arc_conduit',
    branch: 'arcanist',
    tier: 1,
    name: 'Potent Distillate',
    maxRank: 3,
    summary: 'Speeds Serum VST potency recharge when unused and trims Serum VST cost.',
    effectPerRank: '+25% Serum VST Recharge & -4 Cost per rank',
  },
  {
    id: 'arc_shell',
    branch: 'arcanist',
    tier: 2,
    name: 'Ironhide Ward',
    maxRank: 3,
    requires: 'arc_conduit',
    summary: 'Fortifies maximum health and hardens skin against Blight blows.',
    effectPerRank: '+20 Max HP & +6% Armor per rank',
  },
  {
    id: 'arc_leech',
    branch: 'arcanist',
    tier: 3,
    name: 'Blood Leech',
    maxRank: 3,
    requires: 'arc_shell',
    summary: 'Drains vital essence from every strike landed in combat.',
    effectPerRank: '+2 HP healed on hit per rank',
  },
  {
    id: 'arc_supernova',
    branch: 'arcanist',
    tier: 4,
    name: 'Blight Cataclysm',
    maxRank: 1,
    requires: 'arc_leech',
    summary: 'Unleashes a devastating Serum VST eruption with massive damage and radius.',
    effectPerRank: '+45% Serum VST Damage & +35% Serum VST Radius',
  },
];

export type SkillRankMap = Record<string, number>;

export function getSkillRank(ranks: SkillRankMap, skillId: string): number {
  return ranks[skillId] ?? 0;
}

export function canUnlockSkill(
  skillId: string,
  ranks: SkillRankMap,
  availablePoints: number
): boolean {
  if (availablePoints <= 0) return false;
  const node = SKILL_TREE_NODES.find((n) => n.id === skillId);
  if (!node) return false;
  if (getSkillRank(ranks, skillId) >= node.maxRank) return false;
  if (node.requires && getSkillRank(ranks, node.requires) <= 0) return false;
  return true;
}

export function xpRequiredForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 70 + n * 65 + n * n * 15;
}

// --- Unified Live Effective RPG Stats Calculation ---

export interface EffectiveRpgStats {
  maxHp: number;
  meleeDamageMult: number;
  specialDamageMult: number;
  specialRangeMult: number;
  specialCost: number;
  serumRecoveryMult: number;
  moveSpeedMult: number;
  dashCooldown: number;
  knockbackMult: number;
  astralGainMult: number;
  critChance: number;
  critDamageMult: number;
  armorReduction: number;
  lifestealOnHit: number;
  comboDecaySeconds: number;
  hasQuakeFinisher: boolean;
  hasDashAftershock: boolean;
}

export function computeEffectiveRpgStats(
  classSpec: FighterClassSpec,
  level: number,
  equipped: EquippedGearMap,
  skillRanks: SkillRankMap,
  stacks: PowerUpStackTotals,
  baseComboDecay = 3.2
): EffectiveRpgStats {
  let equipAtkPct = 0;
  let equipHp = 0;
  let equipArmorPct = 0;
  let equipSpeedPct = 0;
  let equipCritPct = 0;
  let equipNovaPct = 0;
  let equipLeech = 0;

  for (const item of Object.values(equipped)) {
    if (!item?.bonuses) continue;
    equipAtkPct += item.bonuses.attackPct ?? 0;
    equipHp += item.bonuses.maxHp ?? 0;
    equipArmorPct += item.bonuses.armorPct ?? 0;
    equipSpeedPct += item.bonuses.moveSpeedPct ?? 0;
    equipCritPct += item.bonuses.critChancePct ?? 0;
    equipNovaPct += item.bonuses.novaPowerPct ?? 0;
    equipLeech += item.bonuses.lifesteal ?? 0;
  }

  const rMight = getSkillRank(skillRanks, 'van_might');
  const rImpact = getSkillRank(skillRanks, 'van_impact');
  const rCrit = getSkillRank(skillRanks, 'van_crit');
  const rQuake = getSkillRank(skillRanks, 'van_quake');

  const rStride = getSkillRank(skillRanks, 'shd_stride');
  const rBlink = getSkillRank(skillRanks, 'shd_blink');
  const rTempo = getSkillRank(skillRanks, 'shd_tempo');
  const rBurst = getSkillRank(skillRanks, 'shd_burst');

  const rConduit = getSkillRank(skillRanks, 'arc_conduit');
  const rShell = getSkillRank(skillRanks, 'arc_shell');
  const rLeech = getSkillRank(skillRanks, 'arc_leech');
  const rSupernova = getSkillRank(skillRanks, 'arc_supernova');

  const levelHpBonus = (Math.max(1, level) - 1) * 12;
  const levelAtkBonus = (Math.max(1, level) - 1) * 0.04;

  const maxHp = Math.round(
    classSpec.maxHp + levelHpBonus + equipHp + rShell * 20 + stacks.vitalityBonusHp
  );

  const meleeDamageMult =
    classSpec.meleeDamageMult *
    (1 + levelAtkBonus + (equipAtkPct + stacks.mightBonusPct + rMight * 12 + rImpact * 6) / 100);

  const specialDamageMult =
    classSpec.specialDamageMult *
    (1 +
      levelAtkBonus +
      (equipAtkPct * 0.5 + equipNovaPct + stacks.mightBonusPct * 0.6 + stacks.novaPowerPct + rSupernova * 45) /
        100);

  const specialRangeMult =
    classSpec.specialRangeMult *
    (1 + Math.min(0.9, stacks.novaPowerPct * 0.0045 + rSupernova * 0.35));

  const specialCost = Math.max(18, classSpec.specialCost - rConduit * 4);
  const serumRecoveryMult =
    (classSpec.id === 'weaver' ? 1.3 : 1) *
    (1 + rConduit * 0.25 + stacks.novaPowerPct * 0.008);

  const moveSpeedMult =
    classSpec.moveSpeedMult *
    (1 + Math.min(1.15, (equipSpeedPct + stacks.hasteBonusPct + rStride * 8) / 100));

  const dashCooldown = Math.max(
    0.16,
    classSpec.dashCooldown * Math.max(0.35, 1 - rBlink * 0.14 - stacks.hasteBonusPct * 0.0045)
  );

  const knockbackMult = classSpec.knockbackMult * (1 + rImpact * 0.15);
  const astralGainMult =
    classSpec.astralGainMult * (1 + (stacks.astralGainBonusPct + rConduit * 20) / 100);

  const critChance = Math.min(
    0.85,
    0.08 + (equipCritPct + stacks.critChancePct + rCrit * 8 + rTempo * 5) / 100
  );
  const critDamageMult = 1.6 + (stacks.critDamagePct + rCrit * 20) / 100;

  const armorReduction = Math.min(0.65, (equipArmorPct + rShell * 6) / 100);
  const lifestealOnHit = equipLeech + stacks.lifestealOnHit + rLeech * 2;
  const comboDecaySeconds = baseComboDecay + rTempo * 0.8;

  return {
    maxHp,
    meleeDamageMult,
    specialDamageMult,
    specialRangeMult,
    specialCost,
    serumRecoveryMult,
    moveSpeedMult,
    dashCooldown,
    knockbackMult,
    astralGainMult,
    critChance,
    critDamageMult,
    armorReduction,
    lifestealOnHit,
    comboDecaySeconds,
    hasQuakeFinisher: rQuake > 0,
    hasDashAftershock: rBurst > 0,
  };
}
