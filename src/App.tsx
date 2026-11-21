import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CharacterConfig,
  HERO_NAME,
  getFighterClass,
  loadSavedCharacter,
  saveCharacter,
} from './game/character';
import { HudSnapshot, VoidbreakerEngine } from './game/engine';
import { DifficultyId } from './game/rules';
import {
  DUNGEON_ROOMS,
  HUD_OPACITY_DEFAULT,
  ROOMS_PER_BOSS_CYCLE,
  SERUM_PRESETS_MAX,
  TOTAL_DUNGEON_ROOMS,
  TOTAL_DUNGEON_WINGS,
  WeaponVisualKind,
  clampHudOpacity,
  computeEffectiveRpgStats,
  createEmptyPowerUpStacks,
  createStarterEquipped,
  createStarterInventory,
  getComboRank,
  getSerumStatusLabel,
  getWeaponVisualKind,
  xpRequiredForLevel,
} from './game/rpg';
import {
  DEFAULT_TOUCH_LAYOUT,
  DEFAULT_TOUCH_STYLE,
  TouchControlsStyle,
  TouchLayoutMap,
  clampTouchOpacity,
  clampTouchScale,
  detectTouchOrTabletDevice,
  loadTouchControlsStyle,
  loadTouchLayout,
  saveTouchControlsStyle,
  saveTouchLayout,
} from './game/touchLayout';
import {
  SaveSlotEntry,
  countOccupiedSaveSlots,
  deleteSaveSlot,
  loadSaveSlots,
  saveGameToSlot,
} from './game/saves';
import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import { StatusModals } from './components/StatusModals';
import { CharacterForgeModal } from './components/CharacterForgeModal';
import { ArcadeArchiveModal, ArchiveTab } from './components/ArcadeArchiveModal';
import { TouchControls } from './components/TouchControls';
import { InventoryModal } from './components/InventoryModal';
import { SkillTreeModal } from './components/SkillTreeModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { ShopModal } from './components/ShopModal';
import {
  CrtFxSettings,
  DEFAULT_CRT_FX,
  DEFAULT_LCD_FX,
  DEFAULT_VHS_FX,
  DisplayFxConfig,
  DisplayFxSection,
  LcdFxSettings,
  VhsFxSettings,
  clampCrtFx,
  clampLcdFx,
  clampVhsFx,
  computeCrtOverlayStyle,
  computeLcdOverlayStyle,
  computeStageFilterCss,
  computeVhsOverlayStyle,
  loadDisplayFxConfig,
  saveDisplayFxConfig,
} from './game/displayFx';

const DIFFICULTY_STORAGE_KEY = 'voidbreaker87_difficulty_v1';
const HUD_OPACITY_STORAGE_KEY = 'blight_inhuman_hud_opacity_v1';

function loadHudOpacity(): number {
  try {
    const raw = window.localStorage.getItem(HUD_OPACITY_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return clampHudOpacity(parsed);
    }
  } catch {
    // ignore
  }
  return HUD_OPACITY_DEFAULT;
}

function loadSavedDifficulty(): DifficultyId {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramDiff = params.get('difficulty');
    if (paramDiff === 'easy' || paramDiff === 'normal' || paramDiff === 'hard') {
      return paramDiff;
    }
    const stored = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'normal';
}

function getInitialTouchEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('touch') === '1') return true;
    if (params.get('touch') === '0') return false;
  } catch {
    // ignore
  }
  return detectTouchOrTabletDevice();
}

function buildInitialHud(char: CharacterConfig, diff: DifficultyId): HudSnapshot {
  const cls = getFighterClass(char.fighterClass);
  const equipped = createStarterEquipped();
  const inventory = createStarterInventory();
  const stacks = createEmptyPowerUpStacks();
  const effectiveStats = computeEffectiveRpgStats(cls, 1, equipped, {}, stacks);
  const startRoom = DUNGEON_ROOMS.ashen_courtyard;

  return {
    phase: 'title',
    difficulty: diff,
    fighterClassLabel: cls.label,
    specialCost: effectiveStats.specialCost,
    hp: effectiveStats.maxHp,
    maxHp: effectiveStats.maxHp,
    astral: 50,
    maxAstral: 100,
    serumPotency: 1,
    serumEffectivePower: 0,
    serumStatus: getSerumStatusLabel(1, 20, 0),
    presetsCollected: 0,
    presetsMax: SERUM_PRESETS_MAX,
    score: 0,
    bestScore: 0,
    combo: 0,
    maxCombo: 0,
    comboTimerRatio: 0,
    comboRank: getComboRank(0),
    comboTier: 0,
    comboHitSeq: 0,
    comboRankUpSeq: 0,
    comboMilestoneLabel: null,
    comboMilestoneActive: false,
    sectorIndex: 1,
    totalSectors: ROOMS_PER_BOSS_CYCLE,
    sectorName: startRoom.name,
    biomeId: startRoom.biomeId,
    biomeSubtitle: startRoom.subtitle,
    currentRoomId: startRoom.id,
    visitedRooms: [startRoom.id],
    clearedRooms: [],
    roomLocked: true,
    roomsCleared: 0,
    dungeonDepth: 1,
    roomNumber: 1,
    totalRooms: TOTAL_DUNGEON_ROOMS,
    wingNumber: 1,
    totalWings: TOTAL_DUNGEON_WINGS,
    stepInWing: 1,
    cycleLength: ROOMS_PER_BOSS_CYCLE,
    isBossRoom: false,
    keys: 0,
    lockedShortcutsRemaining: 0,
    combatLog: [],
    roomTotalEnemies: 0,
    nearbyDoorLabel: null,
    nearbyReturnDoor: false,
    canReturnPreviousRoom: false,
    ambientCritterCount: 0,
    nearbyShortcutPrompt: null,
    waveNumber: 1,
    totalWavesInSector: 0,
    waveThreatPct: 100,
    enemiesRemaining: 0,
    defeatedTotal: 0,
    elapsedSeconds: 0,
    damageTaken: 0,
    bossName: null,
    bossHp: 0,
    bossMaxHp: 0,
    bossTrailHp: 0,
    bossHitSeq: 0,
    bossPhaseLabel: null,
    bossHpPct: 0,
    bossBarColor: '#DC2626',
    bannerText: null,
    muted: false,
    hapticsEnabled: true,
    screenShakeEnabled: true,
    level: 1,
    xp: 0,
    xpToNext: xpRequiredForLevel(1),
    skillPoints: 0,
    skillPointGrantSeq: 0,
    levelUpAnimTimer: 0,
    levelUpAnimDuration: 1.9,
    levelUpAnimLevel: 1,
    levelUpEventSeq: 0,
    gold: 60,
    shopkeeperPresent: false,
    nearbyShopkeeper: false,
    astralShards: 0,
    powerUpStacks: stacks,
    equipped,
    equippedWeaponKind: getWeaponVisualKind(equipped.weapon),
    equippedWeaponName: equipped.weapon?.name ?? 'Bare Fists',
    defending: false,
    inventory,
    skillRanks: {},
    effectiveStats,
    medkitCount: 2,
    minimapDots: [],
  };
}

export default function App() {
  const [character, setCharacter] = useState<CharacterConfig>(() => loadSavedCharacter());
  const [difficulty, setDifficulty] = useState<DifficultyId>(() => loadSavedDifficulty());
  const [touchControlsEnabled, setTouchControlsEnabled] = useState<boolean>(() =>
    getInitialTouchEnabled()
  );
  const [touchLayout, setTouchLayout] = useState<TouchLayoutMap>(() => loadTouchLayout());
  const [touchStyle, setTouchStyle] = useState<TouchControlsStyle>(() => loadTouchControlsStyle());
  const [editingTouchLayout, setEditingTouchLayout] = useState(false);

  // Retro Screen Overlays (CRT Scanlines, LCD Pixel Matrix, VHS Analog Tape)
  const [displayFx, setDisplayFx] = useState<DisplayFxConfig>(() => loadDisplayFxConfig());
  const [hudOpacity, setHudOpacity] = useState<number>(() => loadHudOpacity());

  const [hud, setHud] = useState<HudSnapshot>(() =>
    buildInitialHud(loadSavedCharacter(), loadSavedDifficulty())
  );
  const [showForge, setShowForge] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab | null>(null);
  const [rpgDrawer, setRpgDrawer] = useState<'inventory' | 'skills' | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlotEntry[]>(() => loadSaveSlots());
  const [saveModalMode, setSaveModalMode] = useState<'save-load' | 'load-only' | null>(null);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VoidbreakerEngine | null>(null);
  const initialCharacterRef = useRef(character);
  const initialDifficultyRef = useRef(difficulty);
  const manualTouchOverrideRef = useRef(false);
  const pausedByDrawerRef = useRef(false);

  // Sync document.body.dataset.state for accessibility & state machine parity
  useEffect(() => {
    const mappedState = hud.phase === 'victory' ? 'gameover' : hud.phase;
    document.body.dataset.state = mappedState;
  }, [hud.phase]);

  // Globally disable context menu on long tap across game & touch surfaces (preserve text inputs)
  useEffect(() => {
    const preventLongTapContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };
    window.addEventListener('contextmenu', preventLongTapContextMenu);
    return () => window.removeEventListener('contextmenu', preventLongTapContextMenu);
  }, []);

  // Automatically adopt touch controls on tablet or phone viewports unless manually overridden
  useEffect(() => {
    const syncDeviceTouch = () => {
      if (manualTouchOverrideRef.current) return;
      setTouchControlsEnabled(getInitialTouchEnabled());
    };
    window.addEventListener('resize', syncDeviceTouch);
    return () => window.removeEventListener('resize', syncDeviceTouch);
  }, []);

  // Mount Canvas2D isometric engine ONCE so React HUD updates never tear down the 60fps loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new VoidbreakerEngine(canvas, initialCharacterRef.current, (snapshot) => {
      setHud(snapshot);
    });
    engine.setDifficulty(initialDifficultyRef.current);
    engineRef.current = engine;

    // Lightweight test harness hooks for automated browser verification (invisible in UI)
    (window as unknown as Record<string, unknown>).__blightTest = {
      grantPresets: (count: number) => engine.debugGrantPresets(count),
      grantXp: (amount: number) => engine.debugGrantXp(amount),
      grantGold: (amount: number) => engine.debugGrantGold(amount),
      jumpToRoom: (roomNum: number) => engine.debugJumpToRoom(roomNum),
      clearRoom: () => engine.debugClearRoom(),
      returnToPreviousRoom: () => engine.debugReturnToPreviousRoom(),
      hurtPlayer: (dmg: number) => engine.debugHurtPlayer(dmg),
      setDefending: (active: boolean) => engine.debugSetDefending(active),
      simulateEnemyHit: (dmg: number) => engine.debugSimulateEnemyHit(dmg),
      equipWeaponKind: (kind: WeaponVisualKind) => engine.debugEquipWeaponKind(kind),
      triggerAttack1: () => engine.debugTriggerAttack1(),
      moveNearShopkeeper: () => engine.debugMoveNearShopkeeper(),
      addCombo: (hits: number) => engine.debugAddCombo(hits),
      damageBoss: (amount: number) => engine.debugDamageBoss(amount),
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      document.body.dataset.state = 'playing';
      engine.startNewRun(initialDifficultyRef.current);
    }

    return () => {
      delete (window as unknown as Record<string, unknown>).__blightTest;
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleCharacterChange = useCallback((next: CharacterConfig) => {
    const locked: CharacterConfig = { ...next, name: HERO_NAME };
    setCharacter(locked);
    saveCharacter(locked);
    engineRef.current?.setCharacter(locked);
  }, []);

  const handleDifficultyChange = useCallback((next: DifficultyId) => {
    setDifficulty(next);
    try {
      window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    engineRef.current?.setDifficulty(next);
  }, []);

  const updateDisplayFx = useCallback(
    (updater: (prev: DisplayFxConfig) => DisplayFxConfig) => {
      setDisplayFx((prev) => {
        const next = updater(prev);
        saveDisplayFxConfig(next);
        return next;
      });
    },
    []
  );

  const handleToggleScanlines = useCallback(() => {
    updateDisplayFx((prev) => ({
      ...prev,
      crt: { ...prev.crt, enabled: !prev.crt.enabled },
    }));
  }, [updateDisplayFx]);

  const handleToggleLcd = useCallback(() => {
    updateDisplayFx((prev) => ({
      ...prev,
      lcd: { ...prev.lcd, enabled: !prev.lcd.enabled },
    }));
  }, [updateDisplayFx]);

  const handleToggleVhs = useCallback(() => {
    updateDisplayFx((prev) => ({
      ...prev,
      vhs: { ...prev.vhs, enabled: !prev.vhs.enabled },
    }));
  }, [updateDisplayFx]);

  const handleUpdateCrtFx = useCallback(
    (patch: Partial<CrtFxSettings>) => {
      updateDisplayFx((prev) => ({
        ...prev,
        crt: clampCrtFx({ ...prev.crt, ...patch }),
      }));
    },
    [updateDisplayFx]
  );

  const handleUpdateLcdFx = useCallback(
    (patch: Partial<LcdFxSettings>) => {
      updateDisplayFx((prev) => ({
        ...prev,
        lcd: clampLcdFx({ ...prev.lcd, ...patch }),
      }));
    },
    [updateDisplayFx]
  );

  const handleUpdateVhsFx = useCallback(
    (patch: Partial<VhsFxSettings>) => {
      updateDisplayFx((prev) => ({
        ...prev,
        vhs: clampVhsFx({ ...prev.vhs, ...patch }),
      }));
    },
    [updateDisplayFx]
  );

  const handleResetDisplayFxSection = useCallback(
    (section: DisplayFxSection) => {
      updateDisplayFx((prev) => {
        if (section === 'crt') {
          return { ...prev, crt: { ...DEFAULT_CRT_FX, enabled: prev.crt.enabled } };
        }
        if (section === 'lcd') {
          return { ...prev, lcd: { ...DEFAULT_LCD_FX, enabled: prev.lcd.enabled } };
        }
        return { ...prev, vhs: { ...DEFAULT_VHS_FX, enabled: prev.vhs.enabled } };
      });
    },
    [updateDisplayFx]
  );

  const handleHudOpacityChange = useCallback((nextVal: number) => {
    const clamped = clampHudOpacity(nextVal);
    setHudOpacity(clamped);
    try {
      window.localStorage.setItem(HUD_OPACITY_STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const handleToggleHaptics = useCallback(() => {
    engineRef.current?.toggleHaptics();
  }, []);

  const handleToggleScreenShake = useCallback(() => {
    engineRef.current?.toggleScreenShake();
  }, []);

  const handleOpenRpgDrawer = useCallback((drawer: 'inventory' | 'skills') => {
    setEditingTouchLayout(false);
    setShowForge(false);
    setArchiveTab(null);
    setSaveModalMode(null);
    setShowShop(false);
    if (engineRef.current?.getPhase() === 'playing') {
      pausedByDrawerRef.current = true;
      engineRef.current.pause();
    }
    setRpgDrawer(drawer);
  }, []);

  const handleCloseRpgDrawer = useCallback(() => {
    setRpgDrawer(null);
    if (pausedByDrawerRef.current && engineRef.current?.getPhase() === 'paused') {
      pausedByDrawerRef.current = false;
      engineRef.current.resume();
      canvasRef.current?.focus();
    }
  }, []);

  const handleOpenShop = useCallback(() => {
    setEditingTouchLayout(false);
    setShowForge(false);
    setArchiveTab(null);
    setRpgDrawer(null);
    setSaveModalMode(null);
    if (engineRef.current?.getPhase() === 'playing') {
      pausedByDrawerRef.current = true;
      engineRef.current.pause();
    }
    setShowShop(true);
  }, []);

  const handleCloseShop = useCallback(() => {
    setShowShop(false);
    if (pausedByDrawerRef.current && engineRef.current?.getPhase() === 'paused') {
      pausedByDrawerRef.current = false;
      engineRef.current.resume();
      canvasRef.current?.focus();
    }
  }, []);

  const handleOpenSaveLoad = useCallback((mode: 'save-load' | 'load-only') => {
    setEditingTouchLayout(false);
    setShowForge(false);
    setArchiveTab(null);
    setRpgDrawer(null);
    setShowShop(false);
    setSaveStatusMessage(null);
    setSaveSlots(loadSaveSlots());
    if (engineRef.current?.getPhase() === 'playing') {
      pausedByDrawerRef.current = true;
      engineRef.current.pause();
    }
    setSaveModalMode(mode);
  }, []);

  const handleCloseSaveLoad = useCallback(() => {
    setSaveModalMode(null);
    setSaveStatusMessage(null);
    if (pausedByDrawerRef.current && engineRef.current?.getPhase() === 'paused') {
      pausedByDrawerRef.current = false;
      engineRef.current.resume();
      canvasRef.current?.focus();
    }
  }, []);

  const handleSaveToSlot = useCallback((slotIndex: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const data = engine.createSaveData(slotIndex);
    const { slots, overwritten } = saveGameToSlot(slotIndex, data);
    setSaveSlots(slots);
    const slotNum = slotIndex + 1;
    const msg = overwritten
      ? `Overwrote Save Slot ${slotNum} (Room ${data.roomNumber}/${data.summary.totalRooms} · Lv.${data.level}).`
      : `Saved progress to Slot ${slotNum} (Room ${data.roomNumber}/${data.summary.totalRooms} · Lv.${data.level}).`;
    setSaveStatusMessage(msg);
    engine.logExternalEvent(
      overwritten
        ? `Overwrote Save Slot ${slotNum} in Room ${data.roomNumber}/${data.summary.totalRooms}.`
        : `Saved run to Slot ${slotNum} in Room ${data.roomNumber}/${data.summary.totalRooms}.`,
      'room'
    );
  }, []);

  const handleLoadFromSlot = useCallback(
    (slotIndex: number) => {
      const latestSlots = loadSaveSlots();
      setSaveSlots(latestSlots);
      const entry = latestSlots[slotIndex];
      if (!entry || !engineRef.current) return;

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const restoredChar: CharacterConfig = { ...entry.character, name: HERO_NAME };
      setCharacter(restoredChar);
      saveCharacter(restoredChar);
      setDifficulty(entry.difficulty);
      try {
        window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, entry.difficulty);
      } catch {
        // ignore
      }

      setShowForge(false);
      setArchiveTab(null);
      setRpgDrawer(null);
      setShowShop(false);
      setSaveModalMode(null);
      setSaveStatusMessage(null);
      setEditingTouchLayout(false);
      pausedByDrawerRef.current = false;
      document.body.dataset.state = 'playing';
      engineRef.current.loadFromSaveData(entry);
      canvasRef.current?.focus();
    },
    []
  );

  const handleDeleteSaveSlot = useCallback((slotIndex: number) => {
    const { slots } = deleteSaveSlot(slotIndex);
    setSaveSlots(slots);
    setSaveStatusMessage(`Erased Save Slot ${slotIndex + 1}.`);
  }, []);

  const handleConfirmUseKey = useCallback((doorId: string) => {
    engineRef.current?.confirmUnlockNearbyShortcut(doorId);
    canvasRef.current?.focus();
  }, []);

  const handleDeclineUseKey = useCallback((doorId: string) => {
    engineRef.current?.declineNearbyShortcut(doorId);
    canvasRef.current?.focus();
  }, []);

  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowForge(false);
    setArchiveTab(null);
    setRpgDrawer(null);
    setShowShop(false);
    setSaveModalMode(null);
    setSaveStatusMessage(null);
    setEditingTouchLayout(false);
    pausedByDrawerRef.current = false;
    document.body.dataset.state = 'playing';
    engineRef.current?.startNewRun(difficulty);
    canvasRef.current?.focus();
  }, [difficulty]);

  const handleResume = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowForge(false);
    setArchiveTab(null);
    setRpgDrawer(null);
    setShowShop(false);
    setSaveModalMode(null);
    setSaveStatusMessage(null);
    setEditingTouchLayout(false);
    pausedByDrawerRef.current = false;
    engineRef.current?.resume();
    canvasRef.current?.focus();
  }, []);

  const handlePause = useCallback(() => {
    setEditingTouchLayout(false);
    setRpgDrawer(null);
    setShowShop(false);
    setSaveModalMode(null);
    setSaveStatusMessage(null);
    pausedByDrawerRef.current = false;
    engineRef.current?.pause();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setShowForge(false);
    setArchiveTab(null);
    setRpgDrawer(null);
    setShowShop(false);
    setSaveModalMode(null);
    setSaveStatusMessage(null);
    setEditingTouchLayout(false);
    pausedByDrawerRef.current = false;
    setSaveSlots(loadSaveSlots());
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleToggleTouchControls = useCallback(() => {
    manualTouchOverrideRef.current = true;
    setTouchControlsEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setEditingTouchLayout(false);
        engineRef.current?.setTouchMove(0, 0);
      }
      return next;
    });
  }, []);

  const handleToggleEditTouchLayout = useCallback(() => {
    manualTouchOverrideRef.current = true;
    setTouchControlsEnabled(true);
    setRpgDrawer(null);
    setEditingTouchLayout((prev) => {
      const next = !prev;
      engineRef.current?.setTouchMove(0, 0);
      if (next && engineRef.current?.getPhase() === 'playing') {
        engineRef.current.pause();
      } else if (!next && engineRef.current?.getPhase() === 'paused') {
        engineRef.current.resume();
      }
      return next;
    });
  }, []);

  const handleStartEditFromPause = useCallback(() => {
    manualTouchOverrideRef.current = true;
    setTouchControlsEnabled(true);
    setRpgDrawer(null);
    setEditingTouchLayout(true);
    engineRef.current?.setTouchMove(0, 0);
  }, []);

  const handleTouchLayoutChange = useCallback((next: TouchLayoutMap) => {
    setTouchLayout(next);
    saveTouchLayout(next);
  }, []);

  const handleTouchScaleChange = useCallback((nextScale: number) => {
    setTouchStyle((prev) => {
      const next: TouchControlsStyle = {
        ...prev,
        scale: clampTouchScale(nextScale),
      };
      saveTouchControlsStyle(next);
      return next;
    });
  }, []);

  const handleTouchOpacityChange = useCallback((nextOpacity: number) => {
    setTouchStyle((prev) => {
      const next: TouchControlsStyle = {
        ...prev,
        opacity: clampTouchOpacity(nextOpacity),
      };
      saveTouchControlsStyle(next);
      return next;
    });
  }, []);

  const handleResetTouchLayout = useCallback(() => {
    const reset = { ...DEFAULT_TOUCH_LAYOUT };
    const resetStyle = { ...DEFAULT_TOUCH_STYLE };
    setTouchLayout(reset);
    saveTouchLayout(reset);
    setTouchStyle(resetStyle);
    saveTouchControlsStyle(resetStyle);
  }, []);

  const handleTouchMove = useCallback((dx: number, dy: number) => {
    engineRef.current?.setTouchMove(dx, dy);
  }, []);

  const handleTouchAction = useCallback(
    (action: 'attack1' | 'defend' | 'potion' | 'dash' | 'special') => {
      engineRef.current?.triggerTouchAction(action);
    },
    []
  );

  const handleTouchDefendChange = useCallback((active: boolean) => {
    engineRef.current?.setTouchDefend(active);
  }, []);

  // Ensure Shop modal never lingers if Shopkeeper is absent (e.g. during a Boss Battle)
  useEffect(() => {
    if (showShop && !hud.shopkeeperPresent) {
      setShowShop(false);
    }
  }, [showShop, hud.shopkeeperPresent]);

  // Keyboard shortcuts: Title Enter/Space start + In-game [I] Inventory & [T] Skill Tree
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Escape') {
        if (showShop) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleCloseShop();
          return;
        }
        if (saveModalMode !== null) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleCloseSaveLoad();
          return;
        }
        if (archiveTab !== null) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setArchiveTab(null);
          return;
        }
        if (showForge) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setShowForge(false);
          return;
        }
      }

      if (hud.phase === 'title') {
        if (showForge || archiveTab !== null || saveModalMode !== null) return;
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (showForge || archiveTab !== null || saveModalMode !== null || showShop) return;

      if (
        e.code === 'KeyE' &&
        !e.repeat &&
        hud.nearbyShopkeeper &&
        !hud.nearbyShortcutPrompt &&
        rpgDrawer === null
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleOpenShop();
        return;
      }

      if (e.code === 'KeyI' && !e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (rpgDrawer === 'inventory') handleCloseRpgDrawer();
        else handleOpenRpgDrawer('inventory');
      } else if (e.code === 'KeyT' && !e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (rpgDrawer === 'skills') handleCloseRpgDrawer();
        else handleOpenRpgDrawer('skills');
      } else if (e.code === 'F5' && !e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleOpenSaveLoad('save-load');
      } else if (e.code === 'Escape' && rpgDrawer !== null) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleCloseRpgDrawer();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    hud.phase,
    hud.nearbyShopkeeper,
    hud.nearbyShortcutPrompt,
    showForge,
    archiveTab,
    rpgDrawer,
    showShop,
    saveModalMode,
    handleStartGame,
    handleOpenRpgDrawer,
    handleCloseRpgDrawer,
    handleOpenShop,
    handleCloseShop,
    handleOpenSaveLoad,
    handleCloseSaveLoad,
  ]);

  const occupiedSaveCount = countOccupiedSaveSlots(saveSlots);

  const showTouchOverlay =
    touchControlsEnabled &&
    !showForge &&
    archiveTab === null &&
    rpgDrawer === null &&
    !showShop &&
    saveModalMode === null &&
    (hud.phase === 'playing' || (hud.phase === 'paused' && editingTouchLayout));

  const stageFilterCss = computeStageFilterCss(displayFx);

  return (
    <div
      onContextMenu={(e) => {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
      className="relative w-screen h-screen overflow-hidden bg-[#100D0B] no-long-press"
    >
      {/* Isolated Full-Viewport Isometric Pixel-Art Canvas Container */}
      <div
        data-testid="game-stage-filter"
        style={{ filter: stageFilterCss }}
        className="fixed inset-0 z-10"
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          data-testid="game-canvas"
          onContextMenu={(e) => e.preventDefault()}
          className="block w-full h-full object-cover pixelated outline-none no-long-press"
        />
      </div>

      {/* Title Screen Shell */}
      {hud.phase === 'title' && (
        <TitleScreen
          character={character}
          difficulty={difficulty}
          bestScore={hud.bestScore}
          occupiedSaveCount={occupiedSaveCount}
          modalOpen={showForge || archiveTab !== null || saveModalMode !== null}
          displayFx={displayFx}
          stageFilterCss={stageFilterCss}
          onDifficultyChange={handleDifficultyChange}
          onToggleScanlines={handleToggleScanlines}
          onToggleLcd={handleToggleLcd}
          onToggleVhs={handleToggleVhs}
          onStart={handleStartGame}
          onOpenLoadSaves={() => handleOpenSaveLoad('load-only')}
          onOpenCustomize={() => setShowForge(true)}
          onOpenArchive={() => setArchiveTab('portrait')}
        />
      )}

      {/* Low-Occlusion World-Matched Playing HUD + Combo Meter + Minimap */}
      {hud.phase !== 'title' && (
        <GameHud
          hud={hud}
          character={character}
          touchControlsEnabled={touchControlsEnabled}
          editingTouchLayout={editingTouchLayout}
          displayFx={displayFx}
          hudOpacity={hudOpacity}
          touchScale={touchStyle.scale}
          touchOpacity={touchStyle.opacity}
          onHudOpacityChange={handleHudOpacityChange}
          onTouchScaleChange={handleTouchScaleChange}
          onTouchOpacityChange={handleTouchOpacityChange}
          onToggleTouchControls={handleToggleTouchControls}
          onToggleEditTouchLayout={handleToggleEditTouchLayout}
          onToggleScanlines={handleToggleScanlines}
          onToggleLcd={handleToggleLcd}
          onToggleVhs={handleToggleVhs}
          onUpdateCrtFx={handleUpdateCrtFx}
          onUpdateLcdFx={handleUpdateLcdFx}
          onUpdateVhsFx={handleUpdateVhsFx}
          onResetDisplayFxSection={handleResetDisplayFxSection}
          onToggleHaptics={handleToggleHaptics}
          onToggleScreenShake={handleToggleScreenShake}
          onOpenInventory={() => handleOpenRpgDrawer('inventory')}
          onOpenSkillTree={() => handleOpenRpgDrawer('skills')}
          onOpenSaveLoad={() => handleOpenSaveLoad('save-load')}
          onOpenShop={handleOpenShop}
          onConfirmUseKey={handleConfirmUseKey}
          onDeclineUseKey={handleDeclineUseKey}
          onUseQuickHeal={() => engineRef.current?.useQuickHeal()}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
        />
      )}

      {/* Individually Movable & Resizable Touch Controls */}
      {showTouchOverlay && (
        <TouchControls
          layout={touchLayout}
          touchScale={touchStyle.scale}
          touchOpacity={touchStyle.opacity}
          editMode={editingTouchLayout}
          astral={hud.astral}
          specialCost={hud.specialCost}
          presetsCollected={hud.presetsCollected}
          presetsMax={hud.presetsMax}
          serumEffectivePower={hud.serumEffectivePower}
          medkitCount={hud.medkitCount}
          hp={hud.hp}
          maxHp={hud.maxHp}
          equippedWeaponKind={hud.equippedWeaponKind}
          defending={hud.defending}
          onMove={handleTouchMove}
          onAction={handleTouchAction}
          onDefendChange={handleTouchDefendChange}
          onLayoutChange={handleTouchLayoutChange}
          onTouchScaleChange={handleTouchScaleChange}
          onTouchOpacityChange={handleTouchOpacityChange}
          onResetLayout={handleResetTouchLayout}
          onToggleEditMode={handleToggleEditTouchLayout}
        />
      )}

      {/* Pause / Game Over Modal */}
      {!showForge &&
        archiveTab === null &&
        rpgDrawer === null &&
        !showShop &&
        saveModalMode === null &&
        !editingTouchLayout && (
          <StatusModals
            hud={hud}
            occupiedSaveCount={occupiedSaveCount}
            touchControlsEnabled={touchControlsEnabled}
            displayFx={displayFx}
            hudOpacity={hudOpacity}
            touchScale={touchStyle.scale}
            touchOpacity={touchStyle.opacity}
            onHudOpacityChange={handleHudOpacityChange}
            onTouchScaleChange={handleTouchScaleChange}
            onTouchOpacityChange={handleTouchOpacityChange}
            onToggleTouchControls={handleToggleTouchControls}
            onToggleScanlines={handleToggleScanlines}
            onToggleLcd={handleToggleLcd}
            onToggleVhs={handleToggleVhs}
            onUpdateCrtFx={handleUpdateCrtFx}
            onUpdateLcdFx={handleUpdateLcdFx}
            onUpdateVhsFx={handleUpdateVhsFx}
            onResetDisplayFxSection={handleResetDisplayFxSection}
            onToggleHaptics={handleToggleHaptics}
            onToggleScreenShake={handleToggleScreenShake}
            onStartEditTouchLayout={handleStartEditFromPause}
            onOpenInventory={() => handleOpenRpgDrawer('inventory')}
            onOpenSkillTree={() => handleOpenRpgDrawer('skills')}
            onOpenSaveLoad={handleOpenSaveLoad}
            onResume={handleResume}
            onRestart={handleStartGame}
            onOpenCustomize={() => setShowForge(true)}
            onOpenArchive={() => setArchiveTab('oracle')}
            onReturnTitle={handleReturnTitle}
          />
        )}

      {/* Hooded-Cloak Shopkeeper Stall Modal (Appears Every 6 Levels) */}
      {showShop && (
        <ShopModal
          hud={hud}
          onBuyPotion={() =>
            engineRef.current?.buyHealingPotion() ?? { ok: false, message: 'Shop unavailable.' }
          }
          onBuyPreset={(count) =>
            engineRef.current?.buyPresetFile(count) ?? { ok: false, message: 'Shop unavailable.' }
          }
          onSellItem={(itemId) =>
            engineRef.current?.sellItem(itemId) ?? {
              ok: false,
              message: 'Shop unavailable.',
              goldEarned: 0,
            }
          }
          onClose={handleCloseShop}
        />
      )}

      {/* 6-Slot Save / Load / Overwrite Modal */}
      {saveModalMode !== null && (
        <SaveLoadModal
          mode={saveModalMode}
          slots={saveSlots}
          currentRun={
            hud.phase !== 'title'
              ? {
                  roomNumber: hud.roomNumber,
                  totalRooms: hud.totalRooms,
                  wingNumber: hud.wingNumber,
                  totalWings: hud.totalWings,
                  sectorName: hud.sectorName,
                  level: hud.level,
                  score: hud.score,
                  keys: hud.keys,
                }
              : null
          }
          statusMessage={saveStatusMessage}
          onSaveSlot={handleSaveToSlot}
          onLoadSlot={handleLoadFromSlot}
          onDeleteSlot={handleDeleteSaveSlot}
          onClose={handleCloseSaveLoad}
        />
      )}

      {/* RPG Inventory & Equipment Menu */}
      {rpgDrawer === 'inventory' && (
        <InventoryModal
          hud={hud}
          onEquipItem={(id) => engineRef.current?.equipItem(id)}
          onUseConsumable={(id) => engineRef.current?.useConsumable(id)}
          onSalvageItem={(id) => engineRef.current?.salvageItem(id)}
          onOpenSkillTree={() => setRpgDrawer('skills')}
          onClose={handleCloseRpgDrawer}
        />
      )}

      {/* RPG Branching Skill Tree */}
      {rpgDrawer === 'skills' && (
        <SkillTreeModal
          hud={hud}
          onUnlockSkill={(id) => engineRef.current?.unlockSkill(id)}
          onOpenInventory={() => setRpgDrawer('inventory')}
          onClose={handleCloseRpgDrawer}
        />
      )}

      {/* Full Character Customizer Modal */}
      {showForge && (
        <CharacterForgeModal
          character={character}
          onChange={handleCharacterChange}
          onClose={() => setShowForge(false)}
          onOpenPortraitForge={() => {
            setShowForge(false);
            setArchiveTab('portrait');
          }}
          onStartGame={handleStartGame}
        />
      )}

      {/* Optional Arcade Archive: 1K/2K/4K Portrait Forge + Multi-Turn Dimensional Oracle Chat */}
      {archiveTab !== null && (
        <ArcadeArchiveModal
          initialTab={archiveTab}
          character={character}
          hud={hud}
          onClose={() => setArchiveTab(null)}
        />
      )}

      {/* Toggleable & Customizable CRT Scanline Overlay */}
      {displayFx.crt.enabled && (
        <div
          data-testid="crt-scanlines-overlay"
          aria-hidden="true"
          style={computeCrtOverlayStyle(displayFx.crt)}
          className="pointer-events-none fixed inset-0 z-[60] crt-scanlines-overlay"
        />
      )}

      {/* Toggleable & Customizable LCD Screen Pixel Matrix Overlay */}
      {displayFx.lcd.enabled && (
        <div
          data-testid="lcd-matrix-overlay"
          aria-hidden="true"
          style={computeLcdOverlayStyle(displayFx.lcd)}
          className="pointer-events-none fixed inset-0 z-[61] lcd-matrix-overlay"
        />
      )}

      {/* Toggleable & Customizable VHS Analog Tape Effect Overlay */}
      {displayFx.vhs.enabled && (
        <div
          data-testid="vhs-tape-overlay"
          aria-hidden="true"
          style={computeVhsOverlayStyle(displayFx.vhs)}
          className="pointer-events-none fixed inset-0 z-[62] vhs-tape-overlay"
        >
          <div className="vhs-chroma-layer" />
          <div className="vhs-noise-layer" />
          <div className="vhs-tracking-bar" />
          <div className="vhs-head-switch" />
        </div>
      )}
    </div>
  );
}
