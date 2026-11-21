import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isoToScreen,
  screenToIso,
  clampToArena,
  resolvePillarCollisions,
  isTargetInMeleeArc,
  screenInputToIsoDir,
} from './iso';
import {
  ATTACK_SPECS,
  ARENA_BOUNDS,
  ARENA_PILLARS,
  AttackTokenPool,
  DIFFICULTY_CONFIGS,
  SECTOR_WAVES,
  applyDamage,
  calculateDefendedDamage,
  calculateHitScore,
  canCastSpecial,
  decideEnemyIntent,
  nextPunchComboStep,
  scaleEnemyDamage,
  scaleEnemyHp,
  scaleWaveSpawns,
} from './rules';
import {
  CHARACTER_PRESETS,
  DEFAULT_CHARACTER,
  FIGHTER_CLASSES,
  HAIR_COLORS,
  HERO_NAME,
  buildPortraitPrompt,
  describeCharacterSummary,
  findSwatch,
  getFighterClass,
  isCustomHexColor,
  randomizeCharacter,
} from './character';
import {
  DEFAULT_TOUCH_LAYOUT,
  TOUCH_OPACITY_MAX,
  TOUCH_OPACITY_MIN,
  TOUCH_SCALE_MAX,
  TOUCH_SCALE_MIN,
  clampTouchCoord,
  clampTouchOpacity,
  clampTouchScale,
} from './touchLayout';
import { createRoomAmbientLife, stepAmbientCritters } from './ambientLife';
import {
  DEFAULT_CRT_FX,
  DEFAULT_DISPLAY_FX,
  DEFAULT_LCD_FX,
  DEFAULT_VHS_FX,
  clampCrtFx,
  clampLcdFx,
  clampVhsFx,
  computeCrtOverlayStyle,
  computeLcdOverlayStyle,
  computeStageFilterCss,
  computeVhsOverlayStyle,
  sanitizeDisplayFx,
} from './displayFx';
import {
  DUNGEON_ROOMS,
  DUNGEON_ROOM_LIST,
  FIXED_CONSUMABLE_GOLD_VALUE,
  FIXED_EQUIPMENT_GOLD_VALUE,
  HUD_OPACITY_DEFAULT,
  HUD_OPACITY_MAX,
  HUD_OPACITY_MIN,
  InventoryItem,
  MAX_COMBAT_LOG_ENTRIES,
  RETURN_DOOR_DIR,
  ROOM_BOUNDS,
  ROOMS_PER_BOSS_CYCLE,
  SERUM_MIN_POTENCY,
  SERUM_PRESET_COST_PER_CAST,
  SERUM_PRESETS_MAX,
  SHOPKEEPER_GREETING,
  SHOPKEEPER_INTERVAL,
  SHOP_PRICES,
  SINGLE_EXIT_DOOR_DIR,
  TOTAL_DUNGEON_ROOMS,
  TOTAL_DUNGEON_WINGS,
  appendCombatLog,
  applyPowerUpToStacks,
  applySerumCast,
  canActivateSerum,
  canReturnToPreviousRoom,
  canUnlockSkill,
  clampHudOpacity,
  computeEffectiveRpgStats,
  computeEffectiveSerumPotency,
  computeKeyDropChance,
  consumeSerumPresets,
  createEmptyPowerUpStacks,
  createInitialSerumState,
  createStarterEquipped,
  createStarterInventory,
  createWavePowerUp,
  filterInventoryByType,
  findTriggeredDoor,
  generateGearDrop,
  generateWaveSpec,
  getBiomeAt,
  getBossHealthMeta,
  getComboRank,
  getComboVfxProfile,
  getEntrySpawnForDoor,
  getItemGoldValue,
  getOppositeDoor,
  getRoomProgressionInfo,
  getSerumPresetPower,
  getSerumStatusLabel,
  getWeaponAttackProfile,
  getWeaponShortLabel,
  getWeaponVisualKind,
  isBossBattleActive,
  isBossRoomNumber,
  isComboMilestone,
  isShopkeeperAllowed,
  purchaseHealingPotion,
  purchasePresetFile,
  sellItemForGold,
  shouldSpawnShopkeeperForPlayerLevel,
  shouldSpawnShopkeeperForRoom,
  sortInventoryItems,
  tickSerumRecovery,
  xpRequiredForLevel,
} from './rpg';
import {
  findMazeNextWaypoint,
  findNearbyLockedMazeDoor,
  generateProceduralMaze,
  getActiveMazeWalls,
  getMazeCellShortestDistance,
  isMazeFullyConnected,
  isPointInMazeWall,
  pickMazeSpawnPoints,
  resolveMazeCollisions,
  unlockMazeDoor,
} from './maze';
import {
  GameSaveData,
  SAVE_SCHEMA_VERSION,
  SAVE_SLOT_COUNT,
  countOccupiedSaveSlots,
  createEmptySaveSlots,
  deleteSaveSlot,
  evaluateShortcutPromptState,
  loadSaveSlots,
  parseSaveSlotsJson,
  saveGameToSlot,
  writeSaveToSlots,
} from './saves';

test('isometric projection round-trips accurately on ground plane', () => {
  const originX = 240;
  const originY = 48;
  const screen = isoToScreen(7.5, 4.25, 0, originX, originY);
  const back = screenToIso(screen.x, screen.y, originX, originY);
  assert.ok(Math.abs(back.x - 7.5) < 1e-6);
  assert.ok(Math.abs(back.y - 4.25) < 1e-6);
});

test('screenInputToIsoDir maps cardinal screen axes into normalized isometric vectors', () => {
  const right = screenInputToIsoDir(1, 0);
  assert.ok(right.vx > 0 && right.vy < 0);
  assert.ok(Math.abs(Math.hypot(right.vx, right.vy) - 1) < 1e-6);
  const zero = screenInputToIsoDir(0, 0);
  assert.deepEqual(zero, { vx: 0, vy: 0 });
});

test('clampToArena and resolvePillarCollisions keep fighter inside valid space', () => {
  const clamped = clampToArena(-5, 99, ARENA_BOUNDS, 0.5);
  assert.equal(clamped.x, 0.5);
  assert.equal(clamped.y, 10.5);

  const pillar = ARENA_PILLARS[0];
  const pushed = resolvePillarCollisions(pillar.x + 0.1, pillar.y, 0.45, [pillar]);
  assert.equal(pushed.collided, true);
  assert.ok(Math.hypot(pushed.x - pillar.x, pushed.y - pillar.y) >= 0.45 + pillar.radius - 1e-5);
});

test('melee arc hits targets in front and misses targets behind out of point-blank range', () => {
  assert.equal(isTargetInMeleeArc(5, 5, 1, 0, 6.2, 5, 1.8), true);
  assert.equal(isTargetInMeleeArc(5, 5, 1, 0, 3.6, 5, 1.8), false);
});

test('3-hit punch combo escalates within window and resets after timeout', () => {
  const s1 = nextPunchComboStep(0, 1.0);
  assert.deepEqual(s1, { step: 1, kind: 'punch1' });
  const s2 = nextPunchComboStep(1, 0.25);
  assert.deepEqual(s2, { step: 2, kind: 'punch2' });
  const s3 = nextPunchComboStep(2, 0.25);
  assert.deepEqual(s3, { step: 3, kind: 'punch3' });
  const reset = nextPunchComboStep(2, 1.2);
  assert.deepEqual(reset, { step: 1, kind: 'punch1' });
  assert.ok(ATTACK_SPECS.punch3.damage > ATTACK_SPECS.punch1.damage);
});

test('player defeat is strictly reachable at 0 HP and invulnerability protects damage', () => {
  assert.equal(applyDamage(100, 20, 0.5), 100);
  assert.equal(applyDamage(20, 35, 0), 0);
  assert.equal(canCastSpecial(39), false);
  assert.equal(canCastSpecial(40), true);
  assert.equal(canCastSpecial(30, 30), true);
  assert.ok(calculateHitScore(150, 7) > calculateHitScore(150, 1));
});

test('attack token pool caps concurrent attackers fairly', () => {
  const pool = new AttackTokenPool(2);
  assert.equal(pool.acquire('e1'), true);
  assert.equal(pool.acquire('e2'), true);
  assert.equal(pool.acquire('e3'), false);
  pool.release('e1');
  assert.equal(pool.acquire('e3'), true);
  assert.equal(pool.activeCount(), 2);
});

test('all 4 enemy archetypes execute distinct decision policies', () => {
  const thrall = decideEnemyIntent({
    archetype: 'thrall',
    enemyX: 2,
    enemyY: 5,
    playerX: 8,
    playerY: 5,
    flankSide: 1,
    cooldown: 0,
    hasAttackToken: true,
  });
  assert.equal(thrall.action, 'move');
  assert.ok(Math.abs(thrall.moveY) > 0.2, 'thrall should flank off-axis');

  const lancer = decideEnemyIntent({
    archetype: 'lancer',
    enemyX: 4,
    enemyY: 5,
    playerX: 8,
    playerY: 5,
    flankSide: 1,
    cooldown: 0,
    hasAttackToken: true,
  });
  assert.equal(lancer.action, 'telegraph');
  assert.equal(lancer.aimX, 1);

  const hexerClose = decideEnemyIntent({
    archetype: 'hexer',
    enemyX: 6.5,
    enemyY: 5,
    playerX: 8,
    playerY: 5,
    flankSide: 1,
    cooldown: 0,
    hasAttackToken: true,
  });
  assert.equal(hexerClose.action, 'retreat');
  assert.ok(hexerClose.moveX < 0);

  const warden = decideEnemyIntent({
    archetype: 'warden',
    enemyX: 6.2,
    enemyY: 5,
    playerX: 8,
    playerY: 5,
    flankSide: 1,
    cooldown: 0,
    hasAttackToken: true,
  });
  assert.equal(warden.action, 'telegraph');
});

test('hero is permanently named INHUMAN with medieval dark-fantasy styles, custom hex swatches, and classes', () => {
  assert.equal(HERO_NAME, 'INHUMAN');
  assert.equal(DEFAULT_CHARACTER.name, 'INHUMAN');
  for (const preset of CHARACTER_PRESETS) {
    assert.equal(preset.config.name, 'INHUMAN');
  }

  const prompt = buildPortraitPrompt(DEFAULT_CHARACTER);
  assert.ok(prompt.includes('INHUMAN'));
  assert.ok(prompt.includes('The Blight'));
  assert.ok(prompt.includes('Oathbreaker'));
  assert.ok(prompt.includes('Barbarian Mane'));
  assert.ok(prompt.includes('Inquisitor Greatcoat'));
  assert.ok(prompt.includes('Knight Sabatons'));
  assert.ok(prompt.includes('Tattered Cloak'));

  // Custom hex swatch resolution generates distinct shade and highlight hex values
  assert.equal(isCustomHexColor('#ff33aa'), true);
  assert.equal(isCustomHexColor('amber'), false);
  const custom = findSwatch(HAIR_COLORS, '#ff33aa');
  assert.equal(custom.hex, '#FF33AA');
  assert.notEqual(custom.shade, custom.hex);
  assert.notEqual(custom.highlight, custom.hex);
  assert.ok(isCustomHexColor(custom.shade));
  assert.ok(isCustomHexColor(custom.highlight));

  // Class system provides 4 distinct medieval dark-fantasy profiles
  assert.equal(FIGHTER_CLASSES.length, 4);
  const jugg = getFighterClass('juggernaut');
  const assassin = getFighterClass('assassin');
  const weaver = getFighterClass('weaver');
  assert.equal(jugg.label, 'Dreadnought');
  assert.equal(assassin.label, 'Nightblade');
  assert.equal(weaver.label, 'Plague Alchemist');
  assert.ok(jugg.maxHp > assassin.maxHp);
  assert.ok(assassin.moveSpeedMult > jugg.moveSpeedMult);
  assert.ok(weaver.specialCost < jugg.specialCost);
  assert.ok(weaver.specialRangeMult > 1.2);

  const rnd = randomizeCharacter(() => 0.42);
  assert.equal(rnd.name, 'INHUMAN');
  const summary = describeCharacterSummary(rnd);
  assert.ok(summary.includes('INHUMAN'));
  assert.ok(summary.includes('Class:'));
  assert.ok(summary.includes('Hair:'));
  assert.ok(summary.includes('Face:'));
  assert.ok(summary.includes('Skin:'));
  assert.ok(summary.includes('Eyes:'));
  assert.ok(summary.includes('Outfit:'));
  assert.ok(summary.includes('Footwear:'));
  assert.ok(summary.includes('Accessory:'));
});

test('Serum VST requires Sample Packs (10 for full power), drains 2 per cast, weakens on rapid use, and recharges when unused', () => {
  assert.equal(SERUM_PRESETS_MAX, 10);
  assert.equal(SERUM_PRESET_COST_PER_CAST, 2);
  assert.equal(getSerumPresetPower(0), 0);
  assert.equal(getSerumPresetPower(5), 0.5);
  assert.equal(getSerumPresetPower(10), 1);
  assert.equal(getSerumPresetPower(14), 1);

  // Cannot cast Serum VST with fewer than 2 Sample Packs even at full charge
  assert.equal(canActivateSerum(0, 100, 40), false);
  assert.equal(canActivateSerum(1, 100, 40), false);
  assert.equal(canActivateSerum(2, 39, 40), false);
  assert.equal(canActivateSerum(2, 40, 40), true);

  // Each Serum VST cast drains 2 Sample Packs down to 0
  assert.equal(consumeSerumPresets(10), 8);
  assert.equal(consumeSerumPresets(8), 6);
  assert.equal(consumeSerumPresets(2), 0);
  assert.equal(consumeSerumPresets(1), 0);

  const initial = createInitialSerumState();
  assert.equal(computeEffectiveSerumPotency(0, initial), 0);
  assert.equal(computeEffectiveSerumPotency(5, initial), 0.5);
  assert.equal(computeEffectiveSerumPotency(10, initial), 1);
  assert.equal(getSerumStatusLabel(1, 15, 0), 'LOCKED (0/10)');
  assert.equal(getSerumStatusLabel(1, 15, 1), 'NEED 2 PACKS (1/10)');
  assert.equal(getSerumStatusLabel(1, 15, 4), '4/10 PACKS');
  assert.equal(getSerumStatusLabel(1, 15, 10), 'FULL POWER');

  // First cast weakens potency; immediate rapid second cast weakens even further
  const cast1 = applySerumCast(initial);
  assert.equal(cast1.castPotency, 1);
  assert.ok(cast1.nextState.potency < 1);
  assert.equal(getSerumStatusLabel(cast1.nextState.potency, 0.5, 10), 'WEAKENED');

  const cast2 = applySerumCast(cast1.nextState);
  assert.ok(cast2.nextState.potency < cast1.nextState.potency);
  const drop1 = 1 - cast1.nextState.potency;
  const drop2 = cast1.nextState.potency - cast2.nextState.potency;
  assert.ok(drop2 > drop1, 'rapid consecutive use should impose extra potency penalty');

  // Repeated rapid casts clamp at SERUM_MIN_POTENCY
  let drained = cast2.nextState;
  for (let i = 0; i < 6; i++) {
    drained = applySerumCast(drained).nextState;
  }
  assert.equal(drained.potency, SERUM_MIN_POTENCY);
  assert.equal(getSerumStatusLabel(drained.potency, 0.4, 10), 'DEPLETED');

  // Leaving Serum unused recharges it slowly at first, then much faster after long rest
  const afterShortRest = tickSerumRecovery(drained, 1.5, 1);
  assert.equal(afterShortRest.potency, SERUM_MIN_POTENCY, 'brief settle period before recovery');

  let recovered = drained;
  for (let i = 0; i < 16; i++) {
    recovered = tickSerumRecovery(recovered, 1.0, 1);
  }
  assert.ok(recovered.potency > 0.9, 'unused Serum should strongly recharge over time');
});

test('7-room dungeon graph has valid reciprocal doors, spawn positions, and preset spawns', () => {
  assert.equal(DUNGEON_ROOM_LIST.length, 7);

  for (const room of DUNGEON_ROOM_LIST) {
    assert.ok(room.doors.length >= 1, `${room.id} must have at least one doorway`);
    assert.ok(room.presetSpawns.length >= 2, `${room.id} must spawn Presets on floor`);

    for (const door of room.doors) {
      const target = DUNGEON_ROOMS[door.targetRoomId];
      assert.ok(target, `target room ${door.targetRoomId} must exist`);
      const expectedBackDir = getOppositeDoor(door.dir);
      const backDoor = target.doors.find((d) => d.dir === expectedBackDir);
      assert.ok(
        backDoor && backDoor.targetRoomId === room.id,
        `${room.id} (${door.dir}) -> ${target.id} must have reciprocal ${expectedBackDir} door`
      );

      // Door trigger detection fires when standing at doorway and returns null at center
      const triggered = findTriggeredDoor(room, door.x, door.y);
      assert.equal(triggered?.dir, door.dir);
    }

    assert.equal(findTriggeredDoor(room, 9, 7), null);
  }

  // Entry spawn stays comfortably inside the room away from the doorway trigger radius
  const eastEntry = getEntrySpawnForDoor('west');
  assert.equal(findTriggeredDoor(DUNGEON_ROOMS.ashen_courtyard, eastEntry.x, eastEntry.y), null);
});

test('difficulty modes scale enemy HP, damage, wave spawn rates, and wave delays', () => {
  assert.ok(scaleEnemyHp(100, 'easy') < scaleEnemyHp(100, 'normal'));
  assert.ok(scaleEnemyHp(100, 'hard') > scaleEnemyHp(100, 'normal'));
  assert.ok(scaleEnemyDamage(20, 'easy') < scaleEnemyDamage(20, 'hard'));

  const wave1 = SECTOR_WAVES[0].spawns;
  const easyCount = scaleWaveSpawns(wave1, 'easy').reduce((s, e) => s + e.count, 0);
  const normalCount = scaleWaveSpawns(wave1, 'normal').reduce((s, e) => s + e.count, 0);
  const hardCount = scaleWaveSpawns(wave1, 'hard').reduce((s, e) => s + e.count, 0);
  assert.ok(easyCount < normalCount);
  assert.ok(hardCount > normalCount);

  // Boss count always stays exactly 1 regardless of difficulty
  const bossWave = SECTOR_WAVES[SECTOR_WAVES.length - 1].spawns;
  const hardBoss = scaleWaveSpawns(bossWave, 'hard').find((e) => e.archetype === 'warden');
  assert.equal(hardBoss?.count, 1);

  assert.ok(DIFFICULTY_CONFIGS.hard.waveDelaySeconds < DIFFICULTY_CONFIGS.easy.waveDelaySeconds);
});

test('touch control coordinates clamp safely inside viewport margins', () => {
  const topLeft = clampTouchCoord({ x: -10, y: 2 });
  assert.equal(topLeft.x, 7);
  assert.equal(topLeft.y, 16);

  const bottomRight = clampTouchCoord({ x: 120, y: 99 });
  assert.equal(bottomRight.x, 93);
  assert.equal(bottomRight.y, 91);

  const mid = clampTouchCoord({ x: 42.34, y: 65.78 });
  assert.deepEqual(mid, { x: 42.3, y: 65.8 });
});

test('non-boss rooms strictly scale monster count and difficulty while boss rooms spawn 1 single high-powered Boss', () => {
  for (const diff of ['easy', 'normal', 'hard'] as const) {
    let prevNonBoss = generateWaveSpec(1, diff);
    assert.ok(prevNonBoss.totalEnemies >= 2, `${diff} Room 1 should have monsters`);

    for (let roomNum = 2; roomNum <= 14; roomNum++) {
      const next = generateWaveSpec(roomNum, diff);
      if (next.isBossWave) {
        assert.equal(
          next.totalEnemies,
          1,
          `${diff} Boss Room ${roomNum} must contain strictly 1 solo Boss`
        );
        assert.deepEqual(next.spawns, [{ archetype: 'warden', count: 1 }]);
        assert.ok(
          next.hpMultiplier > prevNonBoss.hpMultiplier * 2,
          `${diff} Boss Room ${roomNum} solo Boss HP (${next.hpMultiplier}) must far exceed non-boss Room`
        );
        assert.ok(
          next.damageMultiplier > prevNonBoss.damageMultiplier * 1.3,
          `${diff} Boss Room ${roomNum} solo Boss damage (${next.damageMultiplier}) must far exceed non-boss Room`
        );
        assert.ok(next.speedMultiplier > prevNonBoss.speedMultiplier);
        assert.ok(next.telegraphMultiplier < prevNonBoss.telegraphMultiplier);
        assert.ok(next.cooldownMultiplier < prevNonBoss.cooldownMultiplier);
      } else {
        assert.ok(
          next.totalEnemies > prevNonBoss.totalEnemies,
          `${diff} Room ${roomNum} (${next.totalEnemies}) must have strictly more monsters than prior non-boss room (${prevNonBoss.totalEnemies})`
        );
        assert.ok(
          next.hpMultiplier > prevNonBoss.hpMultiplier,
          `${diff} Room ${roomNum} HP must exceed prior non-boss room`
        );
        assert.ok(
          next.damageMultiplier > prevNonBoss.damageMultiplier,
          `${diff} Room ${roomNum} damage must exceed prior non-boss room`
        );
        assert.ok(
          next.speedMultiplier > prevNonBoss.speedMultiplier,
          `${diff} Room ${roomNum} speed must exceed prior non-boss room`
        );
        assert.ok(next.telegraphMultiplier <= prevNonBoss.telegraphMultiplier);
        assert.ok(next.cooldownMultiplier <= prevNonBoss.cooldownMultiplier);
        prevNonBoss = next;
      }
    }
  }

  const r1 = generateWaveSpec(1, 'normal');
  const r5 = generateWaveSpec(5, 'normal');
  const r6 = generateWaveSpec(6, 'normal');
  const r12 = generateWaveSpec(12, 'normal');
  const r666 = generateWaveSpec(666, 'normal');
  assert.equal(r1.isBossWave, false);
  assert.equal(r5.isBossWave, false);
  assert.equal(r6.isBossWave, true);
  assert.equal(r12.isBossWave, true);
  assert.equal(r666.isBossWave, true);
  assert.equal(r6.totalEnemies, 1);
  assert.equal(r12.totalEnemies, 1);
  assert.equal(r666.totalEnemies, 1);
  assert.deepEqual(r6.spawns, [{ archetype: 'warden', count: 1 }]);
  assert.deepEqual(r666.spawns, [{ archetype: 'warden', count: 1 }]);
  assert.ok(r12.hpMultiplier > r6.hpMultiplier);
  assert.ok(r666.hpMultiplier > r12.hpMultiplier);
});

test('stacking wave power-ups improve in rarity/magnitude across waves and accumulate cleanly', () => {
  const dropW1 = createWavePowerUp(1, 'might', () => 0.5);
  const dropW10 = createWavePowerUp(10, 'might', () => 0.5);
  assert.equal(dropW1.rarity, 'common');
  assert.equal(dropW10.rarity, 'mythic');
  assert.ok(dropW10.magnitude > dropW1.magnitude);

  let stacks = createEmptyPowerUpStacks();
  stacks = applyPowerUpToStacks(stacks, dropW1);
  stacks = applyPowerUpToStacks(stacks, dropW10);
  const vitDrop = createWavePowerUp(4, 'vitality', () => 0.5);
  stacks = applyPowerUpToStacks(stacks, vitDrop);

  assert.equal(stacks.totalStacks, 3);
  assert.equal(stacks.counts.might, 2);
  assert.equal(stacks.counts.vitality, 1);
  assert.equal(stacks.mightBonusPct, dropW1.magnitude + dropW10.magnitude);
  assert.equal(stacks.vitalityBonusHp, vitDrop.magnitude);
});

test('skill tree prerequisites, XP curve, gear, and stacked power-ups feed into live RPG stats', () => {
  const oathbreaker = getFighterClass('brawler');
  const baseEquipped = createStarterEquipped();
  const baseStacks = createEmptyPowerUpStacks();

  // Tier 2 Vanguard skill is locked until Tier 1 is unlocked
  assert.equal(canUnlockSkill('van_might', {}, 1), true);
  assert.equal(canUnlockSkill('van_impact', {}, 1), false);
  assert.equal(canUnlockSkill('van_impact', { van_might: 1 }, 1), true);
  assert.equal(canUnlockSkill('van_might', { van_might: 3 }, 2), false);

  const baseStats = computeEffectiveRpgStats(oathbreaker, 1, baseEquipped, {}, baseStacks);

  const mythicGear = generateGearDrop(10, 1, () => 0.05);
  const upgradedEquipped = { ...baseEquipped, [mythicGear.slot!]: mythicGear };
  let upgradedStacks = applyPowerUpToStacks(baseStacks, createWavePowerUp(7, 'vitality', () => 0.5));
  upgradedStacks = applyPowerUpToStacks(upgradedStacks, createWavePowerUp(7, 'haste', () => 0.5));
  const upgradedStats = computeEffectiveRpgStats(
    oathbreaker,
    4,
    upgradedEquipped,
    { van_might: 2, arc_conduit: 2, shd_stride: 1, van_quake: 1 },
    upgradedStacks
  );

  assert.ok(upgradedStats.maxHp > baseStats.maxHp);
  assert.ok(upgradedStats.meleeDamageMult > baseStats.meleeDamageMult);
  assert.ok(upgradedStats.moveSpeedMult > baseStats.moveSpeedMult);
  assert.ok(upgradedStats.specialCost < baseStats.specialCost);
  assert.ok(upgradedStats.serumRecoveryMult > baseStats.serumRecoveryMult);
  assert.equal(upgradedStats.hasQuakeFinisher, true);

  assert.equal(xpRequiredForLevel(1), 70);
  assert.ok(xpRequiredForLevel(2) > xpRequiredForLevel(1));
  assert.ok(xpRequiredForLevel(4) > xpRequiredForLevel(2));
});

test('leveling up requires progressively more XP points and larger increments each level', () => {
  let prevXp = xpRequiredForLevel(1);
  let prevDelta = 0;
  for (let lv = 2; lv <= 10; lv++) {
    const nextXp = xpRequiredForLevel(lv);
    const delta = nextXp - prevXp;
    assert.ok(nextXp > prevXp, `Level ${lv} XP (${nextXp}) must exceed level ${lv - 1} (${prevXp})`);
    assert.ok(
      delta > prevDelta,
      `Level ${lv} XP jump (+${delta}) must exceed prior jump (+${prevDelta})`
    );
    prevXp = nextXp;
    prevDelta = delta;
  }
});

test('inventory sorting by item type orders weapons, armor, relics, boots, and consumables deterministically', () => {
  const sample: InventoryItem[] = [
    {
      id: 'c1',
      name: 'Crimson Poultice',
      kind: 'consumable',
      consumableKind: 'medkit',
      rarity: 'common',
      waveLevel: 1,
      description: 'Heals',
      quantity: 2,
    },
    {
      id: 'b1',
      name: 'Iron Treads',
      kind: 'equipment',
      slot: 'boots',
      rarity: 'rare',
      waveLevel: 3,
      description: 'Boots',
    },
    {
      id: 'w1',
      name: 'Rusted Gauntlets',
      kind: 'equipment',
      slot: 'weapon',
      rarity: 'common',
      waveLevel: 1,
      description: 'Common weapon',
    },
    {
      id: 'r1',
      name: 'Serum VST Vial',
      kind: 'equipment',
      slot: 'relic',
      rarity: 'epic',
      waveLevel: 5,
      description: 'Relic',
    },
    {
      id: 'w2',
      name: 'Cataclysm Battle Axe',
      kind: 'equipment',
      slot: 'weapon',
      rarity: 'mythic',
      waveLevel: 7,
      description: 'Mythic weapon',
    },
    {
      id: 'a1',
      name: 'Blighted Plate Mail',
      kind: 'equipment',
      slot: 'armor',
      rarity: 'rare',
      waveLevel: 4,
      description: 'Armor',
    },
  ];

  const byType = sortInventoryItems(sample, 'type');
  assert.deepEqual(
    byType.map((it) => it.id),
    ['w2', 'w1', 'a1', 'r1', 'b1', 'c1']
  );

  const byRarity = sortInventoryItems(sample, 'rarity');
  assert.equal(byRarity[0].id, 'w2');
  assert.equal(byRarity[1].id, 'r1');

  const byTier = sortInventoryItems(sample, 'tier');
  assert.equal(byTier[0].id, 'w2');
  assert.equal(byTier[1].id, 'r1');

  assert.deepEqual(
    filterInventoryByType(byType, 'weapon').map((it) => it.id),
    ['w2', 'w1']
  );
  assert.deepEqual(
    filterInventoryByType(byType, 'consumable').map((it) => it.id),
    ['c1']
  );
});

test('procedural maze generation guarantees full connectivity, wall collision resolution, BFS navigation, and wall-free spawns', () => {
  const mazeA = generateProceduralMaze(101);
  const mazeB = generateProceduralMaze(202);
  const mazeC = generateProceduralMaze(303);

  assert.ok(mazeA.walls.length > 0, 'Maze should generate solid stone wall segments');
  assert.equal(isMazeFullyConnected(mazeA), true, 'Maze A must connect every chamber cell');
  assert.equal(isMazeFullyConnected(mazeB), true, 'Maze B must connect every chamber cell');
  assert.equal(isMazeFullyConnected(mazeC), true, 'Maze C must connect every chamber cell');

  // Distinct seeds must produce distinct labyrinth layouts
  const sigA = mazeA.walls.map((w) => `${w.x.toFixed(2)},${w.y.toFixed(2)}`).join('|');
  const sigB = mazeB.walls.map((w) => `${w.x.toFixed(2)},${w.y.toFixed(2)}`).join('|');
  assert.notEqual(sigA, sigB);

  // Cell centers are always wall-free
  for (let r = 0; r < mazeA.rows; r++) {
    for (let c = 0; c < mazeA.cols; c++) {
      const cell = mazeA.cells[r][c];
      assert.equal(
        isPointInMazeWall(cell.cx, cell.cy, mazeA.walls, 0.05),
        false,
        `Cell (${c},${r}) center should never lie inside a wall`
      );
    }
  }

  // Wall collision pushes overlapping entities cleanly out of wall rects
  const sampleWall = mazeA.walls[0];
  const insideX = sampleWall.x + sampleWall.w * 0.5;
  const insideY = sampleWall.y + sampleWall.h * 0.5;
  assert.equal(isPointInMazeWall(insideX, insideY, mazeA.walls, 0), true);
  const pushed = resolveMazeCollisions(insideX, insideY, 0.35, mazeA.walls);
  assert.equal(pushed.collided, true);

  // BFS waypoint navigates from top-left cell to bottom-right cell through open corridors
  const startCell = mazeA.cells[0][0];
  const endCell = mazeA.cells[mazeA.rows - 1][mazeA.cols - 1];
  const wp = findMazeNextWaypoint(startCell.cx, startCell.cy, endCell.cx, endCell.cy, mazeA);
  assert.equal(isPointInMazeWall(wp.x, wp.y, mazeA.walls, 0.05), false);
  assert.ok(
    Math.hypot(wp.x - startCell.cx, wp.y - startCell.cy) > 0.5,
    'BFS waypoint must advance out of the starting cell'
  );

  // Picked spawn points are wall-free and respect avoid distance
  const avoid = [{ x: 9.0, y: 7.0 }];
  const spawns = pickMazeSpawnPoints(mazeA, avoid, 6, 999, 2.5, ROOM_BOUNDS);
  assert.equal(spawns.length, 6);
  for (const pt of spawns) {
    assert.equal(isPointInMazeWall(pt.x, pt.y, mazeA.walls, 0.05), false);
    assert.ok(Math.hypot(pt.x - 9.0, pt.y - 7.0) >= 2.0);
  }
});

test('dungeon quadrant biomes and combo rank progression resolve accurately', () => {
  assert.equal(getBiomeAt(4, 3).id, 'promenade');
  assert.equal(getBiomeAt(14, 3).id, 'crucible');
  assert.equal(getBiomeAt(4, 11).id, 'wilds');
  assert.equal(getBiomeAt(14, 11).id, 'throne');

  assert.equal(getComboRank(1).grade, 'D');
  assert.equal(getComboRank(5).grade, 'C');
  assert.equal(getComboRank(8).grade, 'B');
  assert.equal(getComboRank(14).grade, 'A');
  assert.equal(getComboRank(22).grade, 'S');
  assert.equal(getComboRank(35).grade, 'SS');
  assert.equal(getComboRank(35).title, 'INHUMAN');
  assert.ok(getComboRank(35).scoreMultiplier > getComboRank(1).scoreMultiplier);
});

test('666 dungeon rooms divide evenly into 111 equal 6-room wings ending in Boss Rooms with 1 exit door per room', () => {
  assert.equal(TOTAL_DUNGEON_ROOMS, 666);
  assert.equal(ROOMS_PER_BOSS_CYCLE, 6);
  assert.equal(TOTAL_DUNGEON_WINGS, 111);
  assert.equal(TOTAL_DUNGEON_ROOMS % ROOMS_PER_BOSS_CYCLE, 0);
  assert.equal(TOTAL_DUNGEON_ROOMS / ROOMS_PER_BOSS_CYCLE, TOTAL_DUNGEON_WINGS);
  assert.equal(SINGLE_EXIT_DOOR_DIR, 'north');

  let bossCount = 0;
  for (let r = 1; r <= TOTAL_DUNGEON_ROOMS; r++) {
    const info = getRoomProgressionInfo(r);
    assert.equal(info.roomNumber, r);
    const expectedWing = Math.floor((r - 1) / ROOMS_PER_BOSS_CYCLE) + 1;
    const expectedStep = ((r - 1) % ROOMS_PER_BOSS_CYCLE) + 1;
    assert.equal(info.wingNumber, expectedWing);
    assert.equal(info.stepInWing, expectedStep);
    assert.equal(info.isBossRoom, expectedStep === ROOMS_PER_BOSS_CYCLE);
    assert.equal(isBossRoomNumber(r), expectedStep === ROOMS_PER_BOSS_CYCLE);
    if (info.isBossRoom) {
      bossCount++;
      assert.equal(info.themeRoomId, 'blighted_sanctum');
    }
    if (r === TOTAL_DUNGEON_ROOMS) {
      assert.equal(info.isFinalBossRoom, true);
      assert.equal(info.isBossRoom, true);
      assert.equal(info.wingNumber, 111);
    } else {
      assert.equal(info.isFinalBossRoom, false);
    }
  }
  assert.equal(bossCount, TOTAL_DUNGEON_WINGS);
});

test('procedural mazes place locked shortcut doors that reduce detour distance when unlocked with a key', () => {
  const maze = generateProceduralMaze(404);
  assert.ok(maze.lockedDoors.length >= 1, 'Maze should place at least 1 locked shortcut door');

  const door = maze.lockedDoors[0];
  assert.equal(door.unlocked, false);

  // Before unlocking: active walls include the locked door and detour is >= 3 cells
  const wallsBefore = getActiveMazeWalls(maze);
  assert.equal(wallsBefore.length, maze.walls.length + maze.lockedDoors.length);
  const detourBefore = getMazeCellShortestDistance(
    maze,
    door.cellA.col,
    door.cellA.row,
    door.cellB.col,
    door.cellB.row
  );
  assert.ok(detourBefore >= 3, `Shortcut detour before unlock (${detourBefore}) should be >= 3 cells`);

  // Standing next to the locked door detects it
  assert.equal(findNearbyLockedMazeDoor(maze, door.cx, door.cy, 1.5)?.id, door.id);

  // Unlocking opens the passage, removes its collider, and cuts distance to 1 step
  assert.equal(unlockMazeDoor(maze, door.id), true);
  assert.equal(door.unlocked, true);
  assert.equal(unlockMazeDoor(maze, door.id), false);
  assert.equal(getActiveMazeWalls(maze).length, wallsBefore.length - 1);
  assert.equal(findNearbyLockedMazeDoor(maze, door.cx, door.cy, 1.5), null);

  const distAfter = getMazeCellShortestDistance(
    maze,
    door.cellA.col,
    door.cellA.row,
    door.cellB.col,
    door.cellB.row
  );
  assert.equal(distAfter, 1, 'Unlocking a maze shortcut door should directly connect adjacent cells');
});

test('skeleton key drop chance and combat log ring buffer behave reliably', () => {
  const normalZeroKeys = computeKeyDropChance(false, 0, 2);
  const normalPlentyKeys = computeKeyDropChance(false, 4, 2);
  const bossChance = computeKeyDropChance(true, 0, 2);
  assert.ok(normalZeroKeys > normalPlentyKeys);
  assert.ok(bossChance > normalZeroKeys);
  assert.ok(normalPlentyKeys > 0 && bossChance <= 1);

  let log = appendCombatLog([], { id: 1, text: 'Entered Room 1', category: 'room', roomNumber: 1 });
  for (let i = 2; i <= MAX_COMBAT_LOG_ENTRIES + 10; i++) {
    log = appendCombatLog(log, { id: i, text: `Hit #${i}`, category: 'attack', roomNumber: 1 });
  }
  assert.equal(log.length, MAX_COMBAT_LOG_ENTRIES);
  assert.equal(log[0].id, 11);
  assert.equal(log[log.length - 1].id, MAX_COMBAT_LOG_ENTRIES + 10);
});

test('6 save slots support saving, loading, overwriting old saves, deleting, and bounds validation', () => {
  assert.equal(SAVE_SLOT_COUNT, 6);
  const empty = createEmptySaveSlots();
  assert.equal(empty.length, 6);
  assert.equal(countOccupiedSaveSlots(empty), 0);

  const memStore = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memStore.set(k, v);
    },
  };

  const makeMockSave = (slotIndex: number, roomNumber: number, score: number): GameSaveData => ({
    version: SAVE_SCHEMA_VERSION,
    slotIndex,
    savedAt: 1700000000000 + roomNumber * 1000,
    summary: {
      roomNumber,
      totalRooms: TOTAL_DUNGEON_ROOMS,
      wingNumber: Math.floor((roomNumber - 1) / ROOMS_PER_BOSS_CYCLE) + 1,
      totalWings: TOTAL_DUNGEON_WINGS,
      isBossRoom: isBossRoomNumber(roomNumber),
      sectorName: 'Ashen Courtyard',
      fighterClassLabel: 'Oathbreaker',
      difficulty: 'normal',
      level: 3,
      score,
      hp: 112,
      maxHp: 130,
      keys: 2,
      presetsCollected: 4,
      presetsMax: SERUM_PRESETS_MAX,
      skillPoints: 2,
      roomCleared: false,
      enemiesRemaining: 3,
      roomsClearedCount: roomNumber - 1,
    },
    character: { ...DEFAULT_CHARACTER },
    difficulty: 'normal',
    runSeed: 123456,
    roomNumber,
    roomCleared: false,
    roomsClearedCount: roomNumber - 1,
    roomTotalEnemies: 5,
    score,
    maxCombo: 9,
    defeatedTotal: 14,
    damageTaken: 45,
    runTime: 92,
    keys: 2,
    presetsCollected: 4,
    serumState: createInitialSerumState(),
    level: 3,
    xp: 40,
    skillPoints: 2,
    astralShards: 80,
    powerUpStacks: createEmptyPowerUpStacks(),
    equipped: createStarterEquipped(),
    inventory: [],
    skillRanks: { van_might: 1 },
    playerHp: 112,
    playerMaxHp: 130,
    playerAstral: 85,
    playerX: 9.0,
    playerY: 10.5,
    playerFacingLeft: false,
    unlockedShortcutDoorIds: ['mdoor_1'],
    enemies: [],
    crates: [],
    shrines: [],
    pickups: [],
    combatLog: [{ id: 1, text: 'Entered Room', category: 'room', roomNumber }],
  });

  // Save into Slot 1 (index 0) and Slot 6 (index 5)
  const res1 = saveGameToSlot(0, makeMockSave(0, 4, 1800), mockStorage);
  assert.equal(res1.overwritten, false);
  assert.equal(res1.persisted, true);
  assert.equal(countOccupiedSaveSlots(res1.slots), 1);

  const res6 = saveGameToSlot(5, makeMockSave(5, 12, 9600), mockStorage);
  assert.equal(res6.overwritten, false);
  assert.equal(countOccupiedSaveSlots(res6.slots), 2);

  // Overwrite Slot 1 with newer progress; Slot 6 stays untouched
  const overwrite1 = saveGameToSlot(0, makeMockSave(0, 18, 15200), mockStorage);
  assert.equal(overwrite1.overwritten, true);
  assert.equal(countOccupiedSaveSlots(overwrite1.slots), 2);
  assert.equal(overwrite1.slots[0]?.roomNumber, 18);
  assert.equal(overwrite1.slots[0]?.score, 15200);
  assert.equal(overwrite1.slots[5]?.roomNumber, 12);
  assert.equal(overwrite1.slots[5]?.summary.isBossRoom, true);

  // Reloading from storage restores exact 6-slot array & all fields
  const reloaded = loadSaveSlots(mockStorage);
  assert.equal(reloaded.length, 6);
  assert.equal(reloaded[0]?.roomNumber, 18);
  assert.equal(reloaded[0]?.skillPoints, 2);
  assert.deepEqual(reloaded[0]?.unlockedShortcutDoorIds, ['mdoor_1']);
  assert.equal(reloaded[1], null);
  assert.equal(reloaded[5]?.score, 9600);

  // Delete Slot 6
  const afterDel = deleteSaveSlot(5, mockStorage);
  assert.equal(afterDel.slots[5], null);
  assert.equal(countOccupiedSaveSlots(afterDel.slots), 1);

  // Corrupt JSON falls back cleanly to 6 empty slots; out-of-range indices throw
  assert.equal(parseSaveSlotsJson('{bad json').length, 6);
  assert.throws(() => writeSaveToSlots(empty, -1, makeMockSave(0, 1, 0)));
  assert.throws(() => writeSaveToSlots(empty, 6, makeMockSave(0, 1, 0)));
});

test('shortcut gate asks player before spending a key and remembers decline until stepping away', () => {
  const initial = { activeDoorId: null, declinedDoorId: null };

  // Approach gate with 0 keys -> prompt shows locked info, cannot unlock
  const noKey = evaluateShortcutPromptState(initial, 'mdoor_1', 0);
  assert.equal(noKey.shouldShowPrompt, true);
  assert.equal(noKey.canUnlock, false);
  assert.equal(noKey.promptDoorId, 'mdoor_1');

  // Approach gate with 2 keys -> asks confirmation (canUnlock = true), never auto-unlocks
  const withKey = evaluateShortcutPromptState(initial, 'mdoor_1', 2);
  assert.equal(withKey.shouldShowPrompt, true);
  assert.equal(withKey.canUnlock, true);
  assert.equal(withKey.promptDoorId, 'mdoor_1');

  // Player declines using a key on mdoor_1 -> prompt hides while still standing beside mdoor_1
  const declinedState = { activeDoorId: 'mdoor_1', declinedDoorId: 'mdoor_1' };
  const stillNear = evaluateShortcutPromptState(declinedState, 'mdoor_1', 2);
  assert.equal(stillNear.shouldShowPrompt, false);
  assert.equal(stillNear.promptDoorId, null);

  // Stepping away clears decline so returning asks again
  const walkedAway = evaluateShortcutPromptState(stillNear.nextState, null, 2);
  assert.equal(walkedAway.nextState.declinedDoorId, null);
  const returned = evaluateShortcutPromptState(walkedAway.nextState, 'mdoor_1', 2);
  assert.equal(returned.shouldShowPrompt, true);
  assert.equal(returned.canUnlock, true);
});

test('hooded-cloak shopkeeper spawns every 6 levels with verbatim greeting', () => {
  assert.equal(SHOPKEEPER_INTERVAL, 6);
  assert.equal(
    SHOPKEEPER_GREETING,
    "Got lot's of good things on sale today, Stranger! What're ya buyin?"
  );

  for (let room = 1; room <= 5; room++) {
    assert.equal(shouldSpawnShopkeeperForRoom(room), false);
  }
  assert.equal(shouldSpawnShopkeeperForRoom(6), true);
  assert.equal(shouldSpawnShopkeeperForRoom(7), false);
  assert.equal(shouldSpawnShopkeeperForRoom(12), true);
  assert.equal(shouldSpawnShopkeeperForRoom(18), true);
  assert.equal(shouldSpawnShopkeeperForRoom(666), true);

  assert.equal(shouldSpawnShopkeeperForPlayerLevel(5, 0), false);
  assert.equal(shouldSpawnShopkeeperForPlayerLevel(6, 0), true);
  assert.equal(shouldSpawnShopkeeperForPlayerLevel(6, 6), false);
  assert.equal(shouldSpawnShopkeeperForPlayerLevel(12, 6), true);
  assert.equal(shouldSpawnShopkeeperForPlayerLevel(12, 12), false);
});

test('fixed gold item values and shopkeeper buy/sell transactions stay exact and safe', () => {
  const starterInv = createStarterInventory();
  assert.ok(starterInv.length >= 1);
  const potionItem = starterInv.find((it) => it.consumableKind === 'medkit');
  assert.ok(potionItem);
  assert.equal(getItemGoldValue(potionItem), FIXED_CONSUMABLE_GOLD_VALUE.medkit);
  assert.equal(getItemGoldValue(potionItem), SHOP_PRICES.healingPotion);

  const mythicGear = generateGearDrop(12, 1, () => 0.01);
  assert.equal(getItemGoldValue(mythicGear), FIXED_EQUIPMENT_GOLD_VALUE[mythicGear.rarity]);

  // Buying a Healing Potion deducts 45g and increments existing stack
  const poorPotion = purchaseHealingPotion(20, starterInv, 6);
  assert.equal(poorPotion.ok, false);
  assert.equal(poorPotion.gold, 20);

  const boughtPotion = purchaseHealingPotion(100, starterInv, 6);
  assert.equal(boughtPotion.ok, true);
  assert.equal(boughtPotion.gold, 100 - SHOP_PRICES.healingPotion);
  const updatedPotion = boughtPotion.inventory.find((it) => it.consumableKind === 'medkit');
  assert.equal(updatedPotion?.quantity, (potionItem.quantity ?? 1) + 1);

  // Buying Sample Packs deducts 60g each and caps cleanly at 10/10
  const poorPreset = purchasePresetFile(30, 4, 1);
  assert.equal(poorPreset.ok, false);
  assert.equal(poorPreset.presetsCollected, 4);
  assert.match(poorPreset.message, /Sample Pack/);

  const boughtOnePreset = purchasePresetFile(200, 8, 1);
  assert.equal(boughtOnePreset.ok, true);
  assert.equal(boughtOnePreset.gold, 200 - SHOP_PRICES.presetFile);
  assert.equal(boughtOnePreset.presetsCollected, 9);
  assert.match(boughtOnePreset.message, /Sample Pack/);

  // Requesting 2 Sample Packs when at 9/10 buys only 1 for 60g and caps at 10/10
  const cappedPreset = purchasePresetFile(boughtOnePreset.gold, 9, 2);
  assert.equal(cappedPreset.ok, true);
  assert.equal(cappedPreset.gold, boughtOnePreset.gold - SHOP_PRICES.presetFile);
  assert.equal(cappedPreset.presetsCollected, 10);

  const alreadyFull = purchasePresetFile(500, 10, 1);
  assert.equal(alreadyFull.ok, false);
  assert.equal(alreadyFull.gold, 500);
  assert.match(alreadyFull.message, /Sample Packs already maxed/);

  // Selling a stacked consumable decrements quantity by 1 and grants exact fixed gold
  const soldPotion = sellItemForGold(10, boughtPotion.inventory, updatedPotion!.id);
  assert.equal(soldPotion.ok, true);
  assert.equal(soldPotion.goldEarned, SHOP_PRICES.healingPotion);
  assert.equal(soldPotion.gold, 10 + SHOP_PRICES.healingPotion);
  const remainingPotion = soldPotion.inventory.find((it) => it.id === updatedPotion!.id);
  assert.equal(remainingPotion?.quantity, (updatedPotion!.quantity ?? 1) - 1);

  // Selling a piece of equipment removes it and pays its fixed rarity gold value
  const invWithGear = [...soldPotion.inventory, mythicGear];
  const soldGear = sellItemForGold(soldPotion.gold, invWithGear, mythicGear.id);
  assert.equal(soldGear.ok, true);
  assert.equal(soldGear.goldEarned, getItemGoldValue(mythicGear));
  assert.equal(soldGear.gold, soldPotion.gold + getItemGoldValue(mythicGear));
  assert.equal(soldGear.inventory.some((it) => it.id === mythicGear.id), false);
});

test('HUD window opacity clamps safely to 0.2..1.0 and handles invalid numbers', () => {
  assert.equal(clampHudOpacity(0.05), HUD_OPACITY_MIN);
  assert.equal(clampHudOpacity(1.8), HUD_OPACITY_MAX);
  assert.equal(clampHudOpacity(0.654), 0.65);
  assert.equal(clampHudOpacity(Number.NaN), HUD_OPACITY_DEFAULT);
  assert.equal(clampHudOpacity(Number.POSITIVE_INFINITY), HUD_OPACITY_DEFAULT);
});

test('animated ambient life spawns crypt critters inside bounds, animates, and rats flee player', () => {
  const maze = generateProceduralMaze(707);
  const critters = createRoomAmbientLife(3, 707, maze, 'wilds', ROOM_BOUNDS);
  assert.ok(critters.length >= 10, 'Each room should populate lively ambient critters');

  const kinds = new Set(critters.map((c) => c.kind));
  assert.ok(kinds.has('rat'));
  assert.ok(kinds.has('bat'));
  assert.ok(kinds.has('moth'));
  assert.ok(kinds.has('wisp'));

  const rat = critters.find((c) => c.kind === 'rat')!;
  const initialPos = critters.map((c) => ({ x: c.x, y: c.y }));
  const walls = getActiveMazeWalls(maze);

  // Place player right beside the rat so it flees away
  const playerX = rat.x - 0.5;
  const playerY = rat.y;
  const startDist = Math.hypot(rat.x - playerX, rat.y - playerY);
  for (let i = 0; i < 18; i++) {
    stepAmbientCritters(critters, 0.05, i * 0.05, playerX, playerY, walls, ROOM_BOUNDS);
  }

  let movedCount = 0;
  for (let i = 0; i < critters.length; i++) {
    const c = critters[i];
    if (Math.hypot(c.x - initialPos[i].x, c.y - initialPos[i].y) > 0.05) {
      movedCount++;
    }
    assert.ok(c.x >= ROOM_BOUNDS.minX && c.x <= ROOM_BOUNDS.maxX);
    assert.ok(c.y >= ROOM_BOUNDS.minY && c.y <= ROOM_BOUNDS.maxY);
  }
  assert.ok(movedCount >= critters.length - 1, 'Ambient critters must actively animate each frame');
  const endDist = Math.hypot(rat.x - playerX, rat.y - playerY);
  assert.ok(endDist > startDist, 'Crypt rat should scurry away when Inhuman approaches');
});

test('return-to-previous-room, boss-battle shopkeeper removal, and touch Potion control obey rules', () => {
  assert.equal(RETURN_DOOR_DIR, 'south');
  assert.equal(canReturnToPreviousRoom(1), false);
  assert.equal(canReturnToPreviousRoom(2), true);
  assert.equal(canReturnToPreviousRoom(666), true);

  // Shopkeeper is removed during an active Boss battle and returns once Boss is defeated
  assert.equal(isBossBattleActive(6, false), true);
  assert.equal(isBossBattleActive(6, true), false);
  assert.equal(isBossBattleActive(5, false), false);
  assert.equal(isShopkeeperAllowed(6, false), false);
  assert.equal(isShopkeeperAllowed(12, false), false);
  assert.equal(isShopkeeperAllowed(6, true), true);
  assert.equal(isShopkeeperAllowed(5, false), true);

  // Touch layout converts Jump -> Potion, Punch -> Attack 1, Kick -> Defend
  assert.ok(DEFAULT_TOUCH_LAYOUT.potion);
  assert.ok(DEFAULT_TOUCH_LAYOUT.attack1);
  assert.ok(DEFAULT_TOUCH_LAYOUT.defend);
  assert.equal('jump' in DEFAULT_TOUCH_LAYOUT, false);
  assert.equal('punch' in DEFAULT_TOUCH_LAYOUT, false);
  assert.equal('kick' in DEFAULT_TOUCH_LAYOUT, false);
});

test('touch controls resize scale and opacity clamp safely inside valid bounds', () => {
  assert.equal(clampTouchScale(0.2), TOUCH_SCALE_MIN);
  assert.equal(clampTouchScale(3.0), TOUCH_SCALE_MAX);
  assert.equal(clampTouchScale(1.254), 1.25);
  assert.equal(clampTouchScale(Number.NaN), 1.0);

  assert.equal(clampTouchOpacity(0.05), TOUCH_OPACITY_MIN);
  assert.equal(clampTouchOpacity(1.9), TOUCH_OPACITY_MAX);
  assert.equal(clampTouchOpacity(0.554), 0.55);
  assert.equal(clampTouchOpacity(Number.NaN), 0.9);
});

test('equipped weapon visual classification and attack profiles differentiate Blade, Axe, Flail, Gauntlets, and Unarmed', () => {
  const starterEq = createStarterEquipped();
  const starterInv = createStarterInventory();
  assert.equal(getWeaponVisualKind(starterEq.weapon), 'blade');
  assert.equal(getWeaponShortLabel('blade'), 'BLADE');

  const axeItem = starterInv.find((it) => it.name.includes('Axe'));
  const flailItem = starterInv.find((it) => it.name.includes('Flail'));
  const gauntletItem = starterInv.find((it) => it.name.includes('Gauntlets'));
  assert.equal(getWeaponVisualKind(axeItem), 'axe');
  assert.equal(getWeaponVisualKind(flailItem), 'flail');
  assert.equal(getWeaponVisualKind(gauntletItem), 'gauntlets');
  assert.equal(getWeaponVisualKind(null), 'unarmed');

  const bladeProf = getWeaponAttackProfile('blade');
  const axeProf = getWeaponAttackProfile('axe');
  const flailProf = getWeaponAttackProfile('flail');
  const gauntletProf = getWeaponAttackProfile('gauntlets');
  assert.ok(flailProf.reachMult > bladeProf.reachMult);
  assert.ok(axeProf.damageMult > gauntletProf.damageMult);
  assert.notEqual(bladeProf.primaryColor, axeProf.primaryColor);
});

test('Defend button reduces incoming damage by 65% on guard and 82% on timed perfect guard', () => {
  const unblocked = calculateDefendedDamage(40, false, 0);
  assert.equal(unblocked.blocked, false);
  assert.equal(unblocked.finalDamage, 40);
  assert.equal(unblocked.reductionPct, 0);

  const guarded = calculateDefendedDamage(40, true, 0.5);
  assert.equal(guarded.blocked, true);
  assert.equal(guarded.perfectGuard, false);
  assert.equal(guarded.reductionPct, 65);
  assert.equal(guarded.finalDamage, 14);
  assert.ok(guarded.finalDamage < unblocked.finalDamage);

  const perfect = calculateDefendedDamage(40, true, 0.12);
  assert.equal(perfect.blocked, true);
  assert.equal(perfect.perfectGuard, true);
  assert.equal(perfect.reductionPct, 82);
  assert.equal(perfect.finalDamage, 7);
  assert.ok(perfect.finalDamage < guarded.finalDamage);
});

test('Boss Health Bar metadata transitions cleanly across SOVEREIGN, ENRAGED, CRITICAL, and FALLEN phases', () => {
  const full = getBossHealthMeta(500, 500);
  assert.equal(full.pct, 100);
  assert.equal(full.phaseLabel, 'SOVEREIGN');
  assert.equal(full.isEnraged, false);
  assert.equal(full.isCritical, false);

  const enraged = getBossHealthMeta(250, 500);
  assert.equal(enraged.pct, 50);
  assert.equal(enraged.phaseLabel, 'ENRAGED');
  assert.equal(enraged.isEnraged, true);
  assert.equal(enraged.isCritical, false);

  const critical = getBossHealthMeta(100, 500);
  assert.equal(critical.pct, 20);
  assert.equal(critical.phaseLabel, 'CRITICAL');
  assert.equal(critical.isEnraged, true);
  assert.equal(critical.isCritical, true);

  const fallen = getBossHealthMeta(0, 500);
  assert.equal(fallen.pct, 0);
  assert.equal(fallen.phaseLabel, 'FALLEN');
  assert.equal(fallen.ratio, 0);

  // Clamping above max or below zero stays safe
  assert.equal(getBossHealthMeta(999, 500).pct, 100);
  assert.equal(getBossHealthMeta(-40, 500).pct, 0);
});

test('Combo VFX profiles escalate cleanly across all 6 tiers and detect rank-up milestones accurately', () => {
  const t0 = getComboVfxProfile(1);
  assert.equal(t0.tier, 0);
  assert.equal(t0.auraActive, false);
  assert.equal(t0.afterimageActive, false);

  const t1 = getComboVfxProfile(4);
  assert.equal(t1.tier, 1);
  assert.equal(t1.grade, 'C');
  assert.equal(t1.auraActive, true);
  assert.equal(t1.afterimageActive, false);

  const t2 = getComboVfxProfile(7);
  assert.equal(t2.tier, 2);
  assert.equal(t2.grade, 'B');
  assert.equal(t2.afterimageActive, true);

  const t3 = getComboVfxProfile(12);
  assert.equal(t3.tier, 3);
  assert.equal(t3.grade, 'A');
  assert.ok(t3.slashCount > t2.slashCount);

  const t4 = getComboVfxProfile(20);
  assert.equal(t4.tier, 4);
  assert.equal(t4.grade, 'S');
  assert.ok(t4.edgeGlowAlpha > t3.edgeGlowAlpha);

  const t5 = getComboVfxProfile(30);
  assert.equal(t5.tier, 5);
  assert.equal(t5.grade, 'SS');
  assert.equal(t5.title, 'INHUMAN');
  assert.equal(t5.slashCount, 5);

  // Milestone detection triggers strictly when crossing rank thresholds (4, 7, 12, 20, 30) and +10 past 30
  assert.equal(isComboMilestone(2, 3), false);
  assert.equal(isComboMilestone(3, 4), true);
  assert.equal(isComboMilestone(6, 7), true);
  assert.equal(isComboMilestone(11, 12), true);
  assert.equal(isComboMilestone(19, 20), true);
  assert.equal(isComboMilestone(29, 30), true);
  assert.equal(isComboMilestone(30, 31), false);
  assert.equal(isComboMilestone(39, 40), true);
});

test('Display FX clamps CRT, LCD, and VHS customization controls safely within supported bounds', () => {
  const crt = clampCrtFx({
    enabled: true,
    scanlineCount: 999,
    lineOpacity: 2,
    lineThickness: 120,
    brightness: 250,
    contrast: 10,
    vignette: -5,
    phosphorGlow: 140,
  });
  assert.equal(crt.scanlineCount, 480);
  assert.equal(crt.lineOpacity, 10);
  assert.equal(crt.lineThickness, 75);
  assert.equal(crt.brightness, 150);
  assert.equal(crt.contrast, 70);
  assert.equal(crt.vignette, 0);
  assert.equal(crt.phosphorGlow, 100);

  const lcd = clampLcdFx({
    enabled: true,
    pixelCount: 40,
    gridOpacity: 95,
    subpixelStrength: -10,
    brightness: 20,
    contrast: 220,
    saturation: 300,
    backlightTint: 200,
  });
  assert.equal(lcd.pixelCount, 120);
  assert.equal(lcd.gridOpacity, 85);
  assert.equal(lcd.subpixelStrength, 0);
  assert.equal(lcd.brightness, 60);
  assert.equal(lcd.contrast, 160);
  assert.equal(lcd.saturation, 150);
  assert.equal(lcd.backlightTint, 100);

  const vhs = clampVhsFx({
    enabled: true,
    tracking: 150,
    noise: -20,
    chromaBleed: 85,
    jitter: 200,
    brightness: 135,
    contrast: 145,
    saturation: 10,
  });
  assert.equal(vhs.tracking, 100);
  assert.equal(vhs.noise, 0);
  assert.equal(vhs.chromaBleed, 85);
  assert.equal(vhs.jitter, 100);
  assert.equal(vhs.brightness, 135);
  assert.equal(vhs.contrast, 145);
  assert.equal(vhs.saturation, 40);

  const sanitized = sanitizeDisplayFx({ crt: { scanlineCount: Number.NaN } as Partial<typeof DEFAULT_CRT_FX> });
  assert.equal(sanitized.crt.scanlineCount, DEFAULT_CRT_FX.scanlineCount);
  assert.equal(sanitized.lcd.pixelCount, DEFAULT_LCD_FX.pixelCount);
  assert.equal(sanitized.vhs.tracking, DEFAULT_VHS_FX.tracking);
});

test('Display FX computes live stage filter CSS and overlay custom properties for CRT, LCD, and VHS', () => {
  const allOff = {
    crt: { ...DEFAULT_CRT_FX, enabled: false },
    lcd: { ...DEFAULT_LCD_FX, enabled: false },
    vhs: { ...DEFAULT_VHS_FX, enabled: false },
  };
  assert.equal(computeStageFilterCss(allOff), 'none');

  const crtBright = {
    ...allOff,
    crt: { ...DEFAULT_CRT_FX, enabled: true, brightness: 130, contrast: 120, scanlineCount: 360 },
  };
  const crtFilter = computeStageFilterCss(crtBright);
  assert.match(crtFilter, /brightness\(1\.30\)/);
  assert.match(crtFilter, /contrast\(1\.20\)/);

  const crtVars = computeCrtOverlayStyle(crtBright.crt);
  assert.equal(crtVars['--crt-line-pitch'], '2.50px');
  assert.equal(crtVars['--crt-line-alpha'], '0.360');

  const lcdChunky = { ...DEFAULT_LCD_FX, enabled: true, pixelCount: 160, subpixelStrength: 80 };
  const lcdVars = computeLcdOverlayStyle(lcdChunky);
  assert.equal(lcdVars['--lcd-cell-size'], '9.00px');
  assert.ok(Number(lcdVars['--lcd-subpixel-alpha']) > 0.15);

  const lcdFine = { ...DEFAULT_LCD_FX, enabled: true, pixelCount: 480, subpixelStrength: 45 };
  assert.ok(
    parseFloat(computeLcdOverlayStyle(lcdFine)['--lcd-cell-size']) <
      parseFloat(lcdVars['--lcd-cell-size'])
  );

  const vhsActive = {
    ...allOff,
    vhs: { ...DEFAULT_VHS_FX, enabled: true, tracking: 80, noise: 65, chromaBleed: 90, jitter: 70 },
  };
  const vhsFilter = computeStageFilterCss(vhsActive);
  assert.match(vhsFilter, /sepia\(/);
  assert.match(vhsFilter, /saturate\(0\.86\)/);

  const vhsVars = computeVhsOverlayStyle(vhsActive.vhs);
  assert.ok(Number(vhsVars['--vhs-tracking-alpha']) > 0.4);
  assert.ok(Number(vhsVars['--vhs-noise-alpha']) > 0.2);
  assert.match(vhsVars['--vhs-chroma-offset'], /px$/);
  assert.match(vhsVars['--vhs-jitter-px'], /px$/);

  // Default config has CRT enabled so stage filter is active out of the box
  assert.notEqual(computeStageFilterCss(DEFAULT_DISPLAY_FX), 'none');
});




