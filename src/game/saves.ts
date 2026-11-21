import { CharacterConfig, HERO_NAME } from './character';
import { DifficultyId, EnemyArchetype } from './rules';
import {
  CombatLogEntry,
  EquippedGearMap,
  InventoryItem,
  PowerUpDropSpec,
  PowerUpStackTotals,
  SerumState,
  SkillRankMap,
} from './rpg';

export const SAVE_SLOT_COUNT = 6;
export const SAVE_STORAGE_KEY = 'blight_inhuman_saves_v1';
export const SAVE_SCHEMA_VERSION = 1;

export interface SerializedEnemy {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  facingLeft: boolean;
  hp: number;
  maxHp: number;
  attackDamage: number;
  attackCooldown: number;
  radius: number;
  speed: number;
  flankSide: number;
  cooldown: number;
  telegraphMax: number;
  xpValue: number;
  scoreValue: number;
}

export interface SerializedCrate {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  broken: boolean;
}

export interface SerializedShrine {
  id: string;
  x: number;
  y: number;
  name: string;
  kind: 'heal' | 'forge' | 'astral' | 'vault';
  color: string;
  cooldown: number;
}

export interface SerializedPickup {
  id: string;
  x: number;
  y: number;
  kind: 'health' | 'astral' | 'powerup' | 'gear' | 'consumable' | 'preset' | 'key';
  life: number;
  powerUp?: PowerUpDropSpec;
  gearItem?: InventoryItem;
  consumableKind?: 'medkit' | 'aether_flask' | 'overcharge';
}

export interface GameSaveSummary {
  roomNumber: number;
  totalRooms: number;
  wingNumber: number;
  totalWings: number;
  isBossRoom: boolean;
  sectorName: string;
  fighterClassLabel: string;
  difficulty: DifficultyId;
  level: number;
  score: number;
  hp: number;
  maxHp: number;
  keys: number;
  presetsCollected: number;
  presetsMax: number;
  skillPoints: number;
  gold?: number;
  roomCleared: boolean;
  enemiesRemaining: number;
  roomsClearedCount: number;
}

export interface SerializedShopkeeper {
  x: number;
  y: number;
}

export interface GameSaveData {
  version: number;
  slotIndex: number;
  savedAt: number;
  summary: GameSaveSummary;
  character: CharacterConfig;
  difficulty: DifficultyId;
  runSeed: number;
  roomNumber: number;
  roomCleared: boolean;
  roomsClearedCount: number;
  roomTotalEnemies: number;
  score: number;
  maxCombo: number;
  defeatedTotal: number;
  damageTaken: number;
  runTime: number;
  keys: number;
  gold?: number;
  lastShopPlayerLevel?: number;
  shopkeeper?: SerializedShopkeeper | null;
  clearedRoomNumbers?: number[];
  presetsCollected: number;
  serumState: SerumState;
  level: number;
  xp: number;
  skillPoints: number;
  astralShards: number;
  powerUpStacks: PowerUpStackTotals;
  equipped: EquippedGearMap;
  inventory: InventoryItem[];
  skillRanks: SkillRankMap;
  playerHp: number;
  playerMaxHp: number;
  playerAstral: number;
  playerX: number;
  playerY: number;
  playerFacingLeft: boolean;
  unlockedShortcutDoorIds: string[];
  enemies: SerializedEnemy[];
  crates: SerializedCrate[];
  shrines: SerializedShrine[];
  pickups: SerializedPickup[];
  combatLog: CombatLogEntry[];
}

export type SaveSlotEntry = GameSaveData | null;

export interface ShortcutPromptDecisionState {
  activeDoorId: string | null;
  declinedDoorId: string | null;
}

export interface ShortcutPromptEvaluation {
  nextState: ShortcutPromptDecisionState;
  promptDoorId: string | null;
  shouldShowPrompt: boolean;
  canUnlock: boolean;
}

/**
 * Pure state machine for the "Ask before using a Skeleton Key" Maze Shortcut Gate flow.
 * Guarantees keys are never consumed automatically on proximity, and that declining a gate
 * suppresses re-prompting until the player steps away and approaches again.
 */
export function evaluateShortcutPromptState(
  prev: ShortcutPromptDecisionState,
  nearbyLockedDoorId: string | null,
  keysHeld: number
): ShortcutPromptEvaluation {
  if (!nearbyLockedDoorId) {
    return {
      nextState: {
        activeDoorId: null,
        declinedDoorId: null,
      },
      promptDoorId: null,
      shouldShowPrompt: false,
      canUnlock: false,
    };
  }

  // If the player moved to a different gate, clear any prior dismissal
  const stillDeclined = prev.declinedDoorId === nearbyLockedDoorId;
  const nextState: ShortcutPromptDecisionState = {
    activeDoorId: nearbyLockedDoorId,
    declinedDoorId: stillDeclined ? prev.declinedDoorId : null,
  };

  if (stillDeclined) {
    return {
      nextState,
      promptDoorId: null,
      shouldShowPrompt: false,
      canUnlock: false,
    };
  }

  return {
    nextState,
    promptDoorId: nearbyLockedDoorId,
    shouldShowPrompt: true,
    canUnlock: keysHeld > 0,
  };
}

export function isValidSlotIndex(slotIndex: number): boolean {
  return Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < SAVE_SLOT_COUNT;
}

export function createEmptySaveSlots(): SaveSlotEntry[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
}

export function isValidSaveData(candidate: unknown): candidate is GameSaveData {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Partial<GameSaveData>;
  return (
    typeof obj.version === 'number' &&
    typeof obj.slotIndex === 'number' &&
    isValidSlotIndex(obj.slotIndex) &&
    typeof obj.savedAt === 'number' &&
    typeof obj.roomNumber === 'number' &&
    obj.roomNumber >= 1 &&
    typeof obj.runSeed === 'number' &&
    Boolean(obj.character && typeof obj.character === 'object') &&
    Boolean(obj.summary && typeof obj.summary === 'object')
  );
}

export function parseSaveSlotsJson(raw: string | null): SaveSlotEntry[] {
  const slots = createEmptySaveSlots();
  if (!raw) return slots;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return slots;
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      const entry = parsed[i];
      if (isValidSaveData(entry)) {
        slots[i] = {
          ...entry,
          slotIndex: i,
          character: { ...entry.character, name: HERO_NAME },
        };
      }
    }
  } catch {
    return createEmptySaveSlots();
  }
  return slots;
}

export function writeSaveToSlots(
  slots: SaveSlotEntry[],
  slotIndex: number,
  data: GameSaveData
): { slots: SaveSlotEntry[]; overwritten: boolean } {
  if (!isValidSlotIndex(slotIndex)) {
    throw new RangeError(`Save slot index ${slotIndex} out of range (0..${SAVE_SLOT_COUNT - 1})`);
  }
  const normalized = createEmptySaveSlots();
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    normalized[i] = slots[i] ?? null;
  }
  const overwritten = normalized[slotIndex] !== null;
  const cloned: GameSaveData = JSON.parse(
    JSON.stringify({
      ...data,
      version: SAVE_SCHEMA_VERSION,
      slotIndex,
      character: { ...data.character, name: HERO_NAME },
    })
  );
  normalized[slotIndex] = cloned;
  return { slots: normalized, overwritten };
}

export function deleteSaveFromSlots(slots: SaveSlotEntry[], slotIndex: number): SaveSlotEntry[] {
  if (!isValidSlotIndex(slotIndex)) {
    throw new RangeError(`Save slot index ${slotIndex} out of range (0..${SAVE_SLOT_COUNT - 1})`);
  }
  const normalized = createEmptySaveSlots();
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    normalized[i] = i === slotIndex ? null : slots[i] ?? null;
  }
  return normalized;
}

export function countOccupiedSaveSlots(slots: SaveSlotEntry[]): number {
  let count = 0;
  for (let i = 0; i < Math.min(SAVE_SLOT_COUNT, slots.length); i++) {
    if (slots[i] !== null) count++;
  }
  return count;
}

export function formatSaveTimestamp(savedAt: number): string {
  try {
    const d = new Date(savedAt);
    if (Number.isNaN(d.getTime())) return 'Unknown time';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Saved';
  }
}

function getDefaultStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore storage access errors
  }
  return null;
}

export function loadSaveSlots(storage?: Pick<Storage, 'getItem'> | null): SaveSlotEntry[] {
  const store = storage === undefined ? getDefaultStorage() : storage;
  if (!store) return createEmptySaveSlots();
  try {
    return parseSaveSlotsJson(store.getItem(SAVE_STORAGE_KEY));
  } catch {
    return createEmptySaveSlots();
  }
}

export function persistSaveSlots(
  slots: SaveSlotEntry[],
  storage?: Pick<Storage, 'setItem'> | null
): boolean {
  const store = storage === undefined ? getDefaultStorage() : storage;
  if (!store) return false;
  try {
    store.setItem(SAVE_STORAGE_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

export function saveGameToSlot(
  slotIndex: number,
  data: GameSaveData,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): { slots: SaveSlotEntry[]; overwritten: boolean; persisted: boolean } {
  const current = loadSaveSlots(storage);
  const { slots, overwritten } = writeSaveToSlots(current, slotIndex, data);
  const persisted = persistSaveSlots(slots, storage);
  return { slots, overwritten, persisted };
}

export function deleteSaveSlot(
  slotIndex: number,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): { slots: SaveSlotEntry[]; persisted: boolean } {
  const current = loadSaveSlots(storage);
  const slots = deleteSaveFromSlots(current, slotIndex);
  const persisted = persistSaveSlots(slots, storage);
  return { slots, persisted };
}
