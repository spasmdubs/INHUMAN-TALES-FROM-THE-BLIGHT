import { useEffect, useRef, useState } from 'react';
import { CharacterConfig, HERO_NAME } from '../game/character';
import { HudSnapshot } from '../game/engine';
import {
  CombatLogCategory,
  SERUM_PRESET_COST_PER_CAST,
  SHOPKEEPER_GREETING,
} from '../game/rpg';
import {
  CrtFxSettings,
  DisplayFxConfig,
  DisplayFxSection,
  LcdFxSettings,
  VhsFxSettings,
} from '../game/displayFx';
import { DisplayFxControls } from './DisplayFxControls';

type FxDrawerTab = DisplayFxSection | 'hud';

interface GameHudProps {
  hud: HudSnapshot;
  character: CharacterConfig;
  touchControlsEnabled: boolean;
  editingTouchLayout: boolean;
  displayFx: DisplayFxConfig;
  hudOpacity: number;
  touchScale: number;
  touchOpacity: number;
  onHudOpacityChange: (nextOpacity: number) => void;
  onTouchScaleChange: (nextScale: number) => void;
  onTouchOpacityChange: (nextOpacity: number) => void;
  onToggleTouchControls: () => void;
  onToggleEditTouchLayout: () => void;
  onToggleScanlines: () => void;
  onToggleLcd: () => void;
  onToggleVhs: () => void;
  onUpdateCrtFx: (patch: Partial<CrtFxSettings>) => void;
  onUpdateLcdFx: (patch: Partial<LcdFxSettings>) => void;
  onUpdateVhsFx: (patch: Partial<VhsFxSettings>) => void;
  onResetDisplayFxSection: (section: DisplayFxSection) => void;
  onToggleHaptics: () => void;
  onToggleScreenShake: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onOpenSaveLoad: () => void;
  onOpenShop: () => void;
  onConfirmUseKey: (doorId: string) => void;
  onDeclineUseKey: (doorId: string) => void;
  onUseQuickHeal: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

const LOG_CATEGORY_COLORS: Record<CombatLogCategory, string> = {
  attack: 'text-[#F5EFE6]',
  kill: 'text-[#FDE047]',
  damage: 'text-[#FB7185]',
  key: 'text-[#FBBF24]',
  door: 'text-[#FCD34D]',
  room: 'text-[#A3E635]',
  serum: 'text-[#BEF264]',
  level: 'text-[#FEF08A]',
  loot: 'text-[#FDBA74]',
  shop: 'text-[#FDE68A]',
};

export function GameHud({
  hud,
  touchControlsEnabled,
  editingTouchLayout,
  displayFx,
  hudOpacity,
  touchScale,
  touchOpacity,
  onHudOpacityChange,
  onTouchScaleChange,
  onTouchOpacityChange,
  onToggleTouchControls,
  onToggleEditTouchLayout,
  onToggleScanlines,
  onToggleLcd,
  onToggleVhs,
  onUpdateCrtFx,
  onUpdateLcdFx,
  onUpdateVhsFx,
  onResetDisplayFxSection,
  onToggleHaptics,
  onToggleScreenShake,
  onOpenInventory,
  onOpenSkillTree,
  onOpenSaveLoad,
  onOpenShop,
  onConfirmUseKey,
  onDeclineUseKey,
  onUseQuickHeal,
  onToggleMute,
  onPause,
}: GameHudProps) {
  const [ghostHp, setGhostHp] = useState(hud.hp);
  const [showFxMenu, setShowFxMenu] = useState(false);
  const [fxTab, setFxTab] = useState<FxDrawerTab>('crt');
  const [combatLogOpen, setCombatLogOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [combatLogExpanded, setCombatLogExpanded] = useState(false);
  const logListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [hud.combatLog, combatLogOpen, combatLogExpanded]);

  useEffect(() => {
    if (hud.hp >= ghostHp) {
      setGhostHp(hud.hp);
      return;
    }
    const timer = window.setTimeout(() => {
      setGhostHp(hud.hp);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [hud.hp, ghostHp]);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (ghostHp / Math.max(1, hud.maxHp)) * 100));
  const presetsGaugePct = Math.max(
    0,
    Math.min(100, (hud.presetsCollected / Math.max(1, hud.presetsMax)) * 100)
  );
  const serumChargePct = Math.max(0, Math.min(100, (hud.astral / Math.max(1, hud.maxAstral)) * 100));
  const serumPotencyPct = Math.round(hud.serumPotency * 100);
  const xpPct = Math.max(0, Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100));
  const specialThresholdPct = Math.max(
    10,
    Math.min(90, (hud.specialCost / Math.max(1, hud.maxAstral)) * 100)
  );
  const serumReady =
    hud.presetsCollected >= SERUM_PRESET_COST_PER_CAST && hud.astral >= hud.specialCost;
  const stacks = hud.powerUpStacks;
  const wingBaseRoom = (hud.wingNumber - 1) * hud.cycleLength;
  const hudOpacityPct = Math.round(hudOpacity * 100);
  const touchScalePct = Math.round(touchScale * 100);
  const touchOpacityPct = Math.round(touchOpacity * 100);
  const panelBgStyle = { backgroundColor: `rgba(20, 16, 14, ${hudOpacity})` };
  const logBgStyle = { backgroundColor: `rgba(18, 14, 12, ${hudOpacity})` };
  const logHeaderBgStyle = { backgroundColor: `rgba(29, 23, 19, ${Math.min(1, hudOpacity + 0.04)})` };
  const bossBgStyle = { backgroundColor: `rgba(29, 18, 16, ${hudOpacity})` };

  return (
    <div
      data-testid="game-hud"
      data-hud-opacity={hudOpacityPct}
      data-room-number={hud.roomNumber}
      data-ambient-count={hud.ambientCritterCount}
      data-weapon-kind={hud.equippedWeaponKind}
      data-defending={hud.defending ? 'true' : 'false'}
      onContextMenu={(e) => e.preventDefault()}
      className={`pointer-events-none fixed inset-0 ${showFxMenu ? 'z-40' : 'z-20'} flex flex-col justify-between p-2.5 sm:p-4 select-none no-long-press`}
    >
      {/* Top Perimeter Row: Left Vitality, Serum/Presets & Combo · Center Boss Bar · Right Score & Dungeon Minimap */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left Column: Vitality + Serum & 10-Preset Bar + XP + Combo Meter */}
        <div className="flex flex-col gap-2 min-w-0">
          <div
            data-testid="hud-window-vitals"
            style={panelBgStyle}
            className={`border-2 px-2.5 sm:px-3 py-2 shadow-[0_6px_0_rgba(8,6,5,0.8)] min-w-0 w-[196px] sm:w-auto sm:min-w-[266px] max-w-[308px] transition-colors ${
              hud.defending ? 'border-[#38BDF8]' : 'border-[#574A3E]'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true">
                  <polygon
                    points="12,2 22,7 22,17 12,22 2,17 2,7"
                    fill="#261E18"
                    stroke={hud.defending ? '#38BDF8' : '#D97706'}
                    strokeWidth="2"
                  />
                  <polygon points="12,6 17,12 12,18 7,12" fill={hud.defending ? '#38BDF8' : '#84CC16'} />
                  <rect x="11" y="10" width="2" height="4" fill="#FEF3C7" />
                </svg>
                <span
                  data-testid="hud-hero-name"
                  className="font-pixel text-[9px] sm:text-[10px] text-[#FDE68A] truncate"
                >
                  {HERO_NAME}
                </span>
                {hud.defending && (
                  <span
                    data-testid="hud-guard-badge"
                    className="font-pixel text-[7px] px-1 py-0.5 bg-[#0C4A6E] border border-[#38BDF8] text-[#E0F2FE]"
                  >
                    GUARD
                  </span>
                )}
              </div>
              <span
                data-testid="hud-hp"
                className="font-mono-num text-[10px] sm:text-xs font-bold text-[#F5EFE6] whitespace-nowrap"
              >
                HP {hud.hp}/{hud.maxHp}
              </span>
            </div>

            {/* Level, Medieval Class & Difficulty Readout */}
            <div
              data-testid="hud-class-difficulty"
              className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#BEF264] mb-1.5"
            >
              <span className="truncate">
                LV.{hud.level} {hud.fighterClassLabel}
              </span>
              <span className="text-[#FDE68A] shrink-0">{hud.difficulty}</span>
            </div>

            {/* HP Bar with Trailing Damage Ghost */}
            <div className="relative h-3 sm:h-3.5 w-full bg-[#241614] border border-[#0B0908] overflow-hidden mb-1.5">
              <div
                className="absolute inset-y-0 left-0 bg-[#FDE047] transition-[width] duration-300"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-100"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hpPct <= 30 ? '#DC2626' : '#10B981',
                }}
              />
              <div className="absolute inset-x-0 top-0 h-1 bg-white/15" />
            </div>

            {/* Serum VST Skill + Preset Files Remaining Bar Gauge (Drains 2 per cast) */}
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] mb-1 gap-2">
              <span
                data-testid="hud-serum-status"
                className={`font-semibold uppercase tracking-wider truncate ${
                  hud.presetsCollected < SERUM_PRESET_COST_PER_CAST
                    ? 'text-[#FCA5A5]'
                    : hud.serumPotency < 0.75
                      ? 'text-[#FB923C]'
                      : 'text-[#BEF264]'
                }`}
              >
                SERUM VST · {hud.serumStatus}
              </span>
              <span
                data-testid="hud-presets"
                className="font-mono-num font-bold text-[#ECFCCB] whitespace-nowrap shrink-0"
              >
                {hud.presetsCollected}/{hud.presetsMax} <span className="text-[#A3E635]">(-2)</span>
              </span>
            </div>

            {/* Primary Sample Packs Bar Gauge showing remaining Sample Packs out of max total (10) */}
            <div
              data-testid="hud-presets-bar"
              className="relative h-2.5 w-full bg-[#1C1814] border border-[#0B0908] overflow-hidden mb-1"
              aria-label={`Sample Packs remaining: ${hud.presetsCollected} of ${hud.presetsMax}`}
            >
              <div
                data-testid="hud-presets-gauge-fill"
                className="absolute inset-y-0 left-0 transition-[width] duration-150"
                style={{
                  width: `${presetsGaugePct}%`,
                  backgroundColor:
                    hud.presetsCollected < SERUM_PRESET_COST_PER_CAST
                      ? '#DC2626'
                      : hud.presetsCollected >= hud.presetsMax
                        ? '#BEF264'
                        : '#84CC16',
                }}
              />
              {/* 10 crisp segment dividers matching 0..10 Preset Files */}
              <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                {Array.from({ length: hud.presetsMax }).map((_, idx) => (
                  <span
                    key={idx}
                    className="border-r border-[#0B0908]/80 last:border-r-0"
                  />
                ))}
              </div>
            </div>

            {/* Compact Serum Charge & Tolerance Potency Micro-Bar */}
            <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-[#D6D3D1] mb-0.5 font-mono-num">
              <span>CHARGE {hud.astral}/{hud.maxAstral}</span>
              <span
                data-testid="hud-serum-potency"
                className={hud.serumPotency < 0.85 ? 'text-[#FB923C]' : 'text-[#BEF264]'}
              >
                POTENCY {serumPotencyPct}%
              </span>
            </div>
            <div className="relative h-1 w-full bg-[#1C1814] border border-[#0B0908] overflow-hidden mb-1.5">
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-100"
                style={{
                  width: `${serumChargePct}%`,
                  backgroundColor: !serumReady
                    ? '#57534E'
                    : hud.serumPotency < 0.65
                      ? '#EA580C'
                      : '#65A30D',
                }}
              />
              <div
                className="absolute inset-y-0 w-[1px] bg-[#0B0908]/85"
                style={{ left: `${specialThresholdPct}%` }}
              />
            </div>

            {/* RPG Level XP Micro-Bar */}
            <div className="flex items-center justify-between text-[9px] text-[#FDE68A] mb-0.5 font-mono-num">
              <span>XP TO LV.{hud.level + 1}</span>
              <span data-testid="hud-xp">
                {hud.xp}/{hud.xpToNext}
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-[#211A14] border border-[#0B0908] overflow-hidden mb-1.5">
              <div
                className="absolute inset-y-0 left-0 bg-[#D97706] transition-[width] duration-150"
                style={{ width: `${xpPct}%` }}
              />
            </div>

            {/* Gold Purse, Skeleton Keys & Maze Shortcut Doors Status */}
            <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-mono-num">
              <div className="flex items-center gap-2.5">
                <span
                  data-testid="hud-gold"
                  className="inline-flex items-center gap-1 font-bold text-[#FDE047]"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="w-3 h-3 text-[#F59E0B] shrink-0"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="7" y="4.5" width="2" height="7" />
                  </svg>
                  {hud.gold}g
                </span>
                <span
                  data-testid="hud-keys"
                  className={`inline-flex items-center gap-1 font-bold ${
                    hud.keys > 0 ? 'text-[#FDE047]' : 'text-[#D6D3D1]'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="w-3 h-3 text-[#F59E0B] shrink-0"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="5" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="7.5" y="7.1" width="7" height="1.8" />
                    <rect x="11" y="8.8" width="1.5" height="2.4" />
                    <rect x="13.2" y="8.8" width="1.5" height="2.4" />
                  </svg>
                  {hud.keys}
                </span>
              </div>
              <span
                data-testid="hud-shortcuts"
                className="text-[#A8A29E] uppercase truncate"
              >
                {hud.lockedShortcutsRemaining > 0
                  ? `${hud.lockedShortcutsRemaining} LOCKED`
                  : 'GATES OPEN'}
              </span>
            </div>
          </div>

          {/* Dedicated Combo Meter UI + Reactive Combo VFX */}
          <div
            data-testid="combo-meter"
            data-combo-tier={hud.comboTier}
            className={`border-2 px-2 sm:px-2.5 py-1.5 w-[166px] sm:w-[224px] transition-opacity duration-150 ${
              hud.combo > 0 ? 'opacity-100' : 'opacity-65'
            }`}
            style={{
              ...panelBgStyle,
              borderColor: hud.combo > 0 ? hud.comboRank.color : '#443A32',
              boxShadow:
                hud.comboTier >= 2
                  ? `0 0 ${8 + hud.comboTier * 3}px ${hud.comboRank.color}55, 0 5px 0 rgba(8,6,5,0.8)`
                  : '0 4px 0 rgba(8,6,5,0.75)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  key={`combo-grade-${hud.comboHitSeq}`}
                  data-testid="combo-grade"
                  className={`inline-flex items-center justify-center w-7 h-7 font-pixel text-xs bg-[#1E1916] border ${
                    hud.combo > 0 ? 'animate-combo-pop' : ''
                  }`}
                  style={{
                    color: hud.combo > 0 ? hud.comboRank.color : '#78716C',
                    borderColor: hud.combo > 0 ? hud.comboRank.color : '#443A32',
                  }}
                >
                  {hud.combo > 0 ? hud.comboRank.grade : '-'}
                </span>
                <div>
                  <div
                    key={`combo-hits-${hud.comboHitSeq}`}
                    className={`font-pixel text-[10px] sm:text-xs text-[#F5EFE6] font-mono-num leading-tight ${
                      hud.combo > 0 ? 'animate-combo-pop' : ''
                    }`}
                  >
                    {hud.combo} HIT{hud.combo === 1 ? '' : 'S'}
                  </div>
                  <div
                    className="text-[9px] font-semibold uppercase tracking-wider leading-tight"
                    style={{ color: hud.combo > 0 ? hud.comboRank.color : '#A8A29E' }}
                  >
                    {hud.combo > 0 ? hud.comboRank.title : 'COMBO METER'}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#FDE68A]">
                x{hud.comboRank.scoreMultiplier.toFixed(1)}
              </span>
            </div>

            <div className="mt-1.5 h-1.5 w-full bg-[#221D1A] border border-[#0B0908] overflow-hidden">
              <div
                data-testid="combo-timer-bar"
                className={`h-full transition-[width] duration-75 ${
                  hud.comboTier >= 2 ? 'animate-combo-heat' : ''
                }`}
                style={{
                  width: `${Math.round(hud.comboTimerRatio * 100)}%`,
                  backgroundColor: hud.comboRank.color,
                }}
              />
            </div>

            {/* Tier Rank-Up / Milestone VFX Callout */}
            {hud.comboMilestoneActive && hud.comboMilestoneLabel && (
              <div
                key={`combo-rankup-${hud.comboRankUpSeq}`}
                data-testid="combo-vfx-banner"
                className="mt-1.5 pt-1 border-t border-[#3A3028] flex items-center justify-between text-[9px] font-pixel tracking-wide animate-combo-rankup"
                style={{ color: hud.comboRank.color }}
              >
                <span>RANK UP!</span>
                <span className="truncate ml-1">{hud.comboMilestoneLabel}</span>
              </div>
            )}
          </div>

          {/* Quiet Unboxed Stacking Wave Bonuses Summary */}
          {stacks.totalStacks > 0 && (
            <div
              data-testid="hud-stack-summary"
              className="text-[10px] font-mono-num font-semibold text-[#FDE68A] arcade-text-stroke truncate max-w-[240px]"
            >
              STACKS x{stacks.totalStacks}
              {stacks.mightBonusPct > 0 ? ` · +${stacks.mightBonusPct}% DMG` : ''}
              {stacks.hasteBonusPct > 0 ? ` · +${stacks.hasteBonusPct}% SPD` : ''}
              {stacks.critChancePct > 0 ? ` · +${stacks.critChancePct}% CRIT` : ''}
            </div>
          )}
        </div>

        {/* Top-Right: Score, Chamber/Wave Counter, RPG Toolbar & 7-Room Dungeon Map */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex flex-col items-end sm:flex-row sm:items-start gap-1.5 sm:gap-2">
            <div
              data-testid="hud-window-score"
              style={panelBgStyle}
              className="border-2 border-[#574A3E] px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-[0_6px_0_rgba(8,6,5,0.8)] text-right"
            >
              <div className="flex items-baseline justify-end gap-2">
                <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E]">
                  SCORE
                </span>
                <span
                  data-testid="hud-score"
                  className="font-pixel text-xs sm:text-base text-[#FDE68A] font-mono-num"
                >
                  {hud.score.toString().padStart(6, '0')}
                </span>
              </div>
              <div
                data-testid="hud-wave-info"
                className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] sm:text-[11px] font-semibold text-[#E7E0D6] font-mono-num whitespace-nowrap"
              >
                <span className={hud.isBossRoom ? 'text-[#FCA5A5]' : 'text-[#FDE68A]'}>
                  {hud.isBossRoom ? 'BOSS ' : ''}RM {hud.roomNumber}/{hud.totalRooms}
                </span>
                <span>·</span>
                <span
                  data-testid="hud-room-lock"
                  className={hud.roomLocked ? 'text-[#FCA5A5]' : 'text-[#BEF264]'}
                >
                  {hud.roomLocked ? `SEALED (${hud.enemiesRemaining})` : 'EXIT OPEN'}
                </span>
              </div>
              <div
                data-testid="hud-biome-name"
                className="text-[9px] font-semibold uppercase tracking-wider text-[#BEF264] truncate max-w-[172px] sm:max-w-[232px]"
              >
                WING {hud.wingNumber}/{hud.totalWings} · {hud.sectorName}
              </div>
            </div>

            {/* RPG Menu & Utility Toolbar */}
            <div className="pointer-events-auto flex flex-wrap justify-end gap-1 max-w-[178px] sm:max-w-none">
              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-open-inventory"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenInventory();
                }}
                aria-label="Open Inventory (I)"
                title="Inventory & Sample Packs [I]"
                className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#261E18]/95 border-2 border-[#D97706] hover:bg-[#362B21] text-[#FDE68A] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9z" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <path d="M9 13h6" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-open-skills"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenSkillTree();
                }}
                aria-label={
                  hud.skillPoints > 0
                    ? `Open Skill Tree (T) - ${hud.skillPoints} unused skill ${hud.skillPoints === 1 ? 'point' : 'points'}`
                    : 'Open Skill Tree (T)'
                }
                title={
                  hud.skillPoints > 0
                    ? `Skill Tree [T] · ${hud.skillPoints} unused Skill ${hud.skillPoints === 1 ? 'Point' : 'Points'}`
                    : 'Skill Tree [T]'
                }
                className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border-2 cursor-pointer transition-colors ${
                  hud.skillPoints > 0
                    ? 'bg-[#362814] border-[#FDE047] text-[#FDE047] shadow-[0_0_10px_rgba(250,204,21,0.45)]'
                    : 'bg-[#1D2516]/95 border-[#65A30D] hover:border-[#BEF264] text-[#ECFCCB]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="5" r="2.2" />
                  <circle cx="6" cy="18" r="2.2" />
                  <circle cx="18" cy="18" r="2.2" />
                  <path d="M12 7.5v4.5M12 12l-5 4M12 12l5 4" />
                </svg>
                {hud.skillPoints > 0 && (
                  <span
                    data-testid="hud-skill-points-badge"
                    aria-label={`${hud.skillPoints} unused skill ${hud.skillPoints === 1 ? 'point' : 'points'}`}
                    className="absolute -top-2 -right-2 px-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#F59E0B] text-[#100D0B] font-mono-num text-[10px] font-black border-2 border-[#FEF3C7] shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                  >
                    {hud.skillPoints}
                  </span>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-open-save-load"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenSaveLoad();
                }}
                aria-label="Save or Load Game (F5)"
                title="Save / Load Chronicles [F5]"
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#1B1714]/95 border-2 border-[#8B7355] hover:border-[#FDE68A] text-[#FDE68A] cursor-pointer transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4z" />
                  <rect x="8" y="4" width="7" height="5" />
                  <rect x="8" y="13" width="8" height="7" />
                </svg>
              </button>

              {hud.shopkeeperPresent && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-toolbar-shop"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenShop();
                  }}
                  aria-label="Open Hooded Shopkeeper"
                  title="Hooded Shopkeeper [E]"
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#2A1D2E]/95 border-2 border-[#F59E0B] hover:border-[#FEF08A] text-[#FEF08A] shadow-[0_0_10px_rgba(245,158,11,0.45)] cursor-pointer transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 8h12l1 12H5L6 8z" />
                    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                  </svg>
                </button>
              )}

              {hud.medkitCount > 0 && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-quick-heal"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onUseQuickHeal();
                  }}
                  aria-label="Use Healing Potion (Q)"
                  title={`Healing Potion [Q] (${hud.medkitCount})`}
                  className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#291516]/95 border-2 border-[#DC2626] hover:border-[#FCA5A5] text-[#FCA5A5] cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <rect x="10" y="5" width="4" height="14" />
                    <rect x="5" y="10" width="14" height="4" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 px-1 bg-[#100D0B] text-[#FCA5A5] font-mono-num text-[9px] font-bold border border-[#DC2626]">
                    {hud.medkitCount}
                  </span>
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-toggle-combat-log"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setCombatLogOpen((v) => !v);
                }}
                aria-label={combatLogOpen ? 'Hide Combat Log' : 'Show Combat Log'}
                aria-pressed={combatLogOpen}
                title={combatLogOpen ? 'Hide Combat Log' : 'Show Combat Log'}
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border-2 cursor-pointer transition-colors ${
                  combatLogOpen
                    ? 'bg-[#2B2017]/95 border-[#D97706] text-[#FDE68A]'
                    : 'bg-[#14100E]/92 border-[#574A3E] hover:border-[#D97706] text-[#F5EFE6]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 6h14M5 11h11M5 16h14M5 20h8" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-display-fx"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowFxMenu((v) => !v);
                }}
                aria-label="Display & Haptics settings"
                aria-expanded={showFxMenu}
                title="CRT Scanlines, LCD, VHS Tape, Shake & Rumble"
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border-2 cursor-pointer transition-colors ${
                  showFxMenu || displayFx.crt.enabled || displayFx.lcd.enabled || displayFx.vhs.enabled
                    ? 'bg-[#2C241B]/95 border-[#D97706] text-[#FDE68A]'
                    : 'bg-[#14100E]/92 border-[#574A3E] hover:border-[#D97706] text-[#F5EFE6]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="13" rx="1" />
                  <path d="M8 20h8M12 17v3M6 8h12M6 12h12" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-toggle-touch"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleTouchControls();
                }}
                aria-label={touchControlsEnabled ? 'Hide touch controls' : 'Show touch controls'}
                aria-pressed={touchControlsEnabled}
                title={touchControlsEnabled ? 'Touch Controls: ON' : 'Touch Controls: OFF'}
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border-2 cursor-pointer transition-colors ${
                  touchControlsEnabled
                    ? 'bg-[#242C19]/95 border-[#84CC16] text-[#ECFCCB]'
                    : 'bg-[#14100E]/92 border-[#574A3E] hover:border-[#D97706] text-[#F5EFE6]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2.5" y="7" width="19" height="10" rx="3" />
                  <path d="M7.5 10v4M5.5 12h4" />
                  <circle cx="15.5" cy="11" r="1" fill="currentColor" />
                  <circle cx="18" cy="13" r="1" fill="currentColor" />
                </svg>
              </button>

              {touchControlsEnabled && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-edit-touch"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleEditTouchLayout();
                  }}
                  aria-label={editingTouchLayout ? 'Finish customizing touch controls' : 'Customize touch controls (move, resize, opacity)'}
                  aria-pressed={editingTouchLayout}
                  title={editingTouchLayout ? 'Done Customizing Touch Pads' : 'Customize Touch Pads (Move, Resize, Opacity)'}
                  className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border-2 cursor-pointer transition-colors ${
                    editingTouchLayout
                      ? 'bg-[#D97706] border-[#FDE68A] text-[#100D0B]'
                      : 'bg-[#14100E]/92 border-[#574A3E] hover:border-[#D97706] text-[#F5EFE6]'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.1">
                    <path d="M12 3v18M3 12h18" />
                    <polyline points="9 6 12 3 15 6" />
                    <polyline points="9 18 12 21 15 18" />
                    <polyline points="6 9 3 12 6 15" />
                    <polyline points="18 9 21 12 18 15" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label={hud.muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
                title={hud.muted ? 'Unmute [M]' : 'Mute [M]'}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#14100E]/92 border-2 border-[#574A3E] hover:border-[#D97706] text-[#F5EFE6] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="4,9 9,9 14,5 14,19 9,15 4,15" fill="currentColor" stroke="none" />
                  {hud.muted ? (
                    <path d="M17 9l4 6M21 9l-4 6" stroke="#DC2626" />
                  ) : (
                    <path d="M17 9c1.5 1.5 1.5 4.5 0 6M19.5 6.5c2.6 2.8 2.6 8.2 0 11" stroke="#D97706" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                aria-label="Pause game (Esc)"
                title="Pause [Esc / P]"
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#14100E]/92 border-2 border-[#574A3E] hover:border-[#D97706] text-[#F5EFE6] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Display Overlays (CRT / LCD / VHS) & HUD Customization Drawer */}
          {showFxMenu && (
            <div
              data-testid="fx-popover"
              className="pointer-events-auto relative z-40 bg-[#14100E]/98 border-2 border-[#D97706] p-2.5 shadow-2xl flex flex-col gap-2 w-[274px] sm:w-[310px] max-h-[calc(100vh-112px)] overflow-y-auto retro-scroll"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FDE68A]">
                  Display FX &amp; Feedback
                </span>
                <button
                  type="button"
                  onClick={() => setShowFxMenu(false)}
                  aria-label="Close Display FX menu"
                  className="px-1.5 py-0.5 text-[10px] font-mono-num font-bold text-[#A8A29E] hover:text-[#FDE68A] border border-[#3E342C] hover:border-[#D97706] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Primary Overlay Power Toggles: CRT · LCD · VHS */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  data-testid="toggle-scanlines"
                  aria-pressed={displayFx.crt.enabled}
                  onClick={() => {
                    onToggleScanlines();
                    if (!displayFx.crt.enabled) setFxTab('crt');
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 text-[10px] font-semibold border cursor-pointer transition-colors ${
                    displayFx.crt.enabled
                      ? 'bg-[#2C241B] border-[#D97706] text-[#FDE68A]'
                      : 'bg-[#1A1512] border-[#3E342C] text-[#A8A29E] hover:border-[#D97706]'
                  }`}
                >
                  <span>CRT</span>
                  <span className="font-mono-num text-[9px]">
                    {displayFx.crt.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="toggle-lcd"
                  aria-pressed={displayFx.lcd.enabled}
                  onClick={() => {
                    onToggleLcd();
                    if (!displayFx.lcd.enabled) setFxTab('lcd');
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 text-[10px] font-semibold border cursor-pointer transition-colors ${
                    displayFx.lcd.enabled
                      ? 'bg-[#242C19] border-[#84CC16] text-[#ECFCCB]'
                      : 'bg-[#1A1512] border-[#3E342C] text-[#A8A29E] hover:border-[#84CC16]'
                  }`}
                >
                  <span>LCD</span>
                  <span className="font-mono-num text-[9px]">
                    {displayFx.lcd.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="toggle-vhs"
                  aria-pressed={displayFx.vhs.enabled}
                  onClick={() => {
                    onToggleVhs();
                    if (!displayFx.vhs.enabled) setFxTab('vhs');
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 text-[10px] font-semibold border cursor-pointer transition-colors ${
                    displayFx.vhs.enabled
                      ? 'bg-[#2E1624] border-[#EC4899] text-[#FBCFE8]'
                      : 'bg-[#1A1512] border-[#3E342C] text-[#A8A29E] hover:border-[#EC4899]'
                  }`}
                >
                  <span>VHS</span>
                  <span className="font-mono-num text-[9px]">
                    {displayFx.vhs.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Screen Shake & Haptics Toggles */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  data-testid="toggle-shake"
                  aria-pressed={hud.screenShakeEnabled}
                  onClick={onToggleScreenShake}
                  className={`flex items-center justify-between px-2 py-1 text-[11px] font-semibold border cursor-pointer ${
                    hud.screenShakeEnabled
                      ? 'bg-[#2D2115] border-[#F59E0B] text-[#FDE68A]'
                      : 'bg-[#1A1512] border-[#3E342C] text-[#C7C0B8]'
                  }`}
                >
                  <span>Shake</span>
                  <span className="font-mono-num">{hud.screenShakeEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  data-testid="toggle-haptics"
                  aria-pressed={hud.hapticsEnabled}
                  onClick={onToggleHaptics}
                  className={`flex items-center justify-between px-2 py-1 text-[11px] font-semibold border cursor-pointer ${
                    hud.hapticsEnabled
                      ? 'bg-[#2E2018] border-[#EA580C] text-[#FDE68A]'
                      : 'bg-[#1A1512] border-[#3E342C] text-[#C7C0B8]'
                  }`}
                >
                  <span>Rumble</span>
                  <span className="font-mono-num">{hud.hapticsEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Customization Tabs: CRT | LCD | VHS | HUD */}
              <div
                role="tablist"
                aria-label="Overlay customization tabs"
                className="grid grid-cols-4 gap-1 pt-1 border-t border-[#3A3028]"
              >
                {(
                  [
                    { id: 'crt', label: 'CRT', activeCls: 'bg-[#D97706] text-[#100D0B] border-[#FDE68A]' },
                    { id: 'lcd', label: 'LCD', activeCls: 'bg-[#65A30D] text-[#100D0B] border-[#BEF264]' },
                    { id: 'vhs', label: 'VHS', activeCls: 'bg-[#DB2777] text-[#FFF1F2] border-[#F9A8D4]' },
                    { id: 'hud', label: 'HUD', activeCls: 'bg-[#B45309] text-[#FEF3C7] border-[#FDE68A]' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={fxTab === tab.id}
                    data-testid={`fx-tab-${tab.id}`}
                    onClick={() => setFxTab(tab.id)}
                    className={`py-1 text-[10px] font-pixel border cursor-pointer transition-colors ${
                      fxTab === tab.id
                        ? tab.activeCls
                        : 'bg-[#1A1512] text-[#C7C0B8] border-[#3E342C] hover:border-[#D97706]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Active Customization Panel */}
              <div className="bg-[#100C0A] border border-[#322922] p-2">
                {fxTab === 'hud' ? (
                  <div className="space-y-2" data-testid="fx-panel-hud">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-[#FDE68A]">HUD Opacity</span>
                        <span
                          data-testid="hud-opacity-value"
                          className="font-mono-num text-[#BEF264]"
                        >
                          {hudOpacityPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={5}
                        value={hudOpacityPct}
                        data-testid="hud-opacity-slider"
                        aria-label="Customize HUD window opacity"
                        onChange={(e) => onHudOpacityChange(Number(e.target.value) / 100)}
                        className="w-full h-1.5 accent-[#D97706] cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[35, 65, 92, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            data-testid={`hud-opacity-preset-${pct}`}
                            onClick={() => onHudOpacityChange(pct / 100)}
                            className={`py-0.5 text-[10px] font-mono-num font-bold border cursor-pointer ${
                              hudOpacityPct === pct
                                ? 'bg-[#D97706] text-[#100D0B] border-[#FDE68A]'
                                : 'bg-[#1A1512] text-[#C7C0B8] border-[#3E342C] hover:border-[#D97706]'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[#2E251F] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-[#FDE68A]">Touch Pad Size</span>
                        <span
                          data-testid="hud-touch-scale-value"
                          className="font-mono-num text-[#BEF264]"
                        >
                          {touchScalePct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={65}
                        max={145}
                        step={5}
                        value={touchScalePct}
                        data-testid="hud-touch-scale-slider"
                        aria-label="Touch controls size"
                        onChange={(e) => onTouchScaleChange(Number(e.target.value) / 100)}
                        className="w-full h-1.5 accent-[#D97706] cursor-pointer"
                      />

                      <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
                        <span className="text-[#FDE68A]">Touch Pad Opacity</span>
                        <span
                          data-testid="hud-touch-opacity-value"
                          className="font-mono-num text-[#BEF264]"
                        >
                          {touchOpacityPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={5}
                        value={touchOpacityPct}
                        data-testid="hud-touch-opacity-slider"
                        aria-label="Touch controls opacity"
                        onChange={(e) => onTouchOpacityChange(Number(e.target.value) / 100)}
                        className="w-full h-1.5 accent-[#D97706] cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <DisplayFxControls
                    displayFx={displayFx}
                    section={fxTab}
                    onUpdateCrt={onUpdateCrtFx}
                    onUpdateLcd={onUpdateLcdFx}
                    onUpdateVhs={onUpdateVhsFx}
                    onResetSection={onResetDisplayFxSection}
                  />
                )}
              </div>
            </div>
          )}

          {/* 666-Room Evenly Distributed Wing Progress Track (5 Maze Rooms -> Boss Room 6) */}
          {!showFxMenu && (
            <div
              data-testid="wing-progress-map"
              style={logBgStyle}
              className="hidden md:block border-2 border-[#574A3E] px-3 py-2 shadow-[0_6px_0_rgba(8,6,5,0.8)] w-[244px]"
            >
              <div className="flex items-center justify-between text-[8px] font-mono-num text-[#FDE68A] uppercase mb-1.5">
                <span>
                  WING {hud.wingNumber}/{hud.totalWings}
                </span>
                <span className="text-[#A8A29E]">
                  STEP {hud.stepInWing}/{hud.cycleLength}
                </span>
              </div>

              <div className="flex items-center justify-between">
                {Array.from({ length: hud.cycleLength }).map((_, idx) => {
                  const step = idx + 1;
                  const roomNum = wingBaseRoom + step;
                  const isBossStep = step === hud.cycleLength;
                  const isCurrent = step === hud.stepInWing;
                  const isCleared =
                    step < hud.stepInWing || (isCurrent && !hud.roomLocked);

                  return (
                    <div key={step} className="flex items-center gap-1">
                      <div
                        data-testid={`wing-step-${step}`}
                        data-current={isCurrent ? 'true' : 'false'}
                        data-boss={isBossStep ? 'true' : 'false'}
                        title={
                          isBossStep
                            ? `Room ${roomNum}/${hud.totalRooms} · Boss Chamber`
                            : `Room ${roomNum}/${hud.totalRooms}`
                        }
                        className={`w-[24px] h-[22px] border flex flex-col items-center justify-center text-[8px] font-mono-num font-bold leading-none transition-colors ${
                          isCurrent
                            ? hud.roomLocked
                              ? 'bg-[#991B1B] border-[#FCA5A5] text-[#FEF2F2] shadow-[0_0_8px_rgba(220,38,38,0.65)]'
                              : 'bg-[#D97706] border-[#FEF3C7] text-[#100D0B] shadow-[0_0_8px_rgba(217,119,6,0.65)]'
                            : isCleared
                              ? 'bg-[#263318] border-[#84CC16] text-[#BEF264]'
                              : isBossStep
                                ? 'bg-[#2B1514] border-[#B45309] text-[#FCA5A5]'
                                : 'bg-[#1A1614] border-[#443A32] text-[#A8A29E]'
                        }`}
                      >
                        <span>{isBossStep ? 'B' : step}</span>
                      </div>
                      {step < hud.cycleLength && (
                        <span
                          className={`w-1.5 h-[2px] ${
                            step < hud.stepInWing ? 'bg-[#84CC16]' : 'bg-[#443A32]'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[8px] font-mono-num text-[#A8A29E] uppercase">
                <span>
                  {hud.roomLocked ? 'N: SEALED' : 'N: NEXT'}
                  {hud.canReturnPreviousRoom ? ` · S: RM ${hud.roomNumber - 1}` : ''}
                </span>
                <span className="text-[#FDE68A]">
                  BOSS #{wingBaseRoom + hud.cycleLength}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Responsive Boss Health Bar (Visible on all viewports during Boss Battles) */}
      {hud.bossName && hud.bossMaxHp > 0 && !editingTouchLayout && (
        <div
          data-testid="boss-health-bar"
          data-boss-phase={hud.bossPhaseLabel ?? 'SOVEREIGN'}
          style={{
            ...bossBgStyle,
            borderColor: hud.bossPhaseLabel === 'CRITICAL' ? '#F43F5E' : '#B45309',
          }}
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${
            touchControlsEnabled ? 'bottom-44 sm:bottom-12' : 'bottom-10 sm:bottom-11'
          } z-30 w-[min(520px,calc(100vw-24px))] border-2 px-3 sm:px-4 py-2 shadow-[0_8px_0_rgba(8,6,5,0.88)]`}
        >
          {hud.bossHitSeq > 0 && (
            <div
              key={`boss-hit-flash-${hud.bossHitSeq}`}
              className="pointer-events-none absolute inset-0 border border-[#FEF08A]/70 animate-boss-hit"
            />
          )}
          {/* Boss Nameplate, Crest & Non-Hue Phase Readout */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4 shrink-0 text-[#F59E0B]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2 5l2-3 4 3 4-3 2 3v7l-2 2H4l-2-2V5zm3 3v2h2V8H5zm4 0v2h2V8H9zm-3 3v1h4v-1H6z" />
              </svg>
              <span
                data-testid="boss-health-name"
                className="font-pixel text-[10px] sm:text-xs text-[#FDE68A] truncate arcade-text-stroke"
              >
                {hud.bossName}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono-num text-[11px] sm:text-xs">
              <span
                data-testid="boss-health-phase"
                className={`font-bold uppercase tracking-wider ${
                  hud.bossPhaseLabel === 'CRITICAL'
                    ? 'text-[#FDA4AF]'
                    : hud.bossPhaseLabel === 'ENRAGED'
                      ? 'text-[#FDE047]'
                      : 'text-[#FDBA74]'
                }`}
              >
                {hud.bossPhaseLabel}
              </span>
              <span aria-hidden="true" className="text-[#78716C]">·</span>
              <span data-testid="boss-health-value" className="font-bold text-[#FECDD3] whitespace-nowrap">
                {hud.bossHp}/{hud.bossMaxHp} ({hud.bossHpPct}%)
              </span>
            </div>
          </div>

          {/* Dual-Layer Boss Health Track with Trailing Damage Ghost & Quarter Phase Notches */}
          <div
            role="progressbar"
            aria-label={`${hud.bossName} health`}
            aria-valuenow={hud.bossHp}
            aria-valuemin={0}
            aria-valuemax={hud.bossMaxHp}
            className="relative h-3.5 sm:h-4 w-full bg-[#1C0D0C] border border-[#0B0908] overflow-hidden"
          >
            {/* Amber trailing damage bar showing recently carved boss HP */}
            <div
              data-testid="boss-hp-trail"
              className="absolute inset-y-0 left-0 bg-[#F59E0B] transition-[width] duration-150"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (hud.bossTrailHp / Math.max(1, hud.bossMaxHp)) * 100)
                )}%`,
              }}
            />
            {/* Live boss vitality fill */}
            <div
              data-testid="boss-hp-fill"
              className="absolute inset-y-0 left-0 transition-[width] duration-100"
              style={{
                width: `${Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100))}%`,
                backgroundColor: hud.bossBarColor,
              }}
            />
            {/* Top specular pixel bevel */}
            <div
              className="absolute inset-x-0 top-0 h-[2px] bg-white/25 pointer-events-none"
              style={{
                width: `${Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100))}%`,
              }}
            />
            {/* 25% / 50% / 75% etched boss phase threshold dividers */}
            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
              <span className="border-r border-[#0B0908]/80" />
              <span className="border-r border-[#FDE68A]/50" />
              <span className="border-r border-[#0B0908]/80" />
              <span />
            </div>
          </div>

          {/* Quiet Unboxed Boss Encounter Metadata Line */}
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono-num text-[#D6D3D1]/90">
            <span>
              WING {hud.wingNumber}/{hud.totalWings} · BOSS CHAMBER {hud.roomNumber}/{hud.totalRooms}
            </span>
            <span className="text-[#FDE68A]/90 truncate ml-2">{hud.sectorName}</span>
          </div>
        </div>
      )}

      {/* Non-Blocking Animated Level-Up Celebration Banner */}
      {hud.levelUpAnimTimer > 0 && !editingTouchLayout && (
        <div
          key={`lvlup-${hud.levelUpEventSeq}`}
          data-testid="level-up-overlay"
          className="pointer-events-none absolute left-1/2 top-[13%] sm:top-[11%] z-40 px-5 py-2.5 bg-[#1B130B]/95 border-2 border-[#FDE047] text-center animate-level-up"
        >
          <div className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FDE047] shrink-0" fill="currentColor" aria-hidden="true">
              <polygon points="12,1 15,9 23,12 15,15 12,23 9,15 1,12 9,9" />
            </svg>
            <span className="font-pixel text-xs sm:text-base text-[#FEF08A] tracking-wider arcade-text-stroke">
              LEVEL UP!
            </span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FDE047] shrink-0" fill="currentColor" aria-hidden="true">
              <polygon points="12,1 15,9 23,12 15,15 12,23 9,15 1,12 9,9" />
            </svg>
          </div>
          <div className="mt-1 font-mono-num text-[11px] sm:text-xs font-bold text-[#BEF264] tracking-wide">
            {HERO_NAME} REACHED LV.{hud.levelUpAnimLevel} · +1 SKILL POINT · HP RESTORED
          </div>
        </div>
      )}

      {/* Nearby Dungeon Exit / Return Doorway Indicator */}
      {hud.nearbyDoorLabel && !editingTouchLayout && (
        <div
          data-testid="hud-door-prompt"
          style={panelBgStyle}
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${
            hud.bossName && hud.bossMaxHp > 0
              ? touchControlsEnabled
                ? 'bottom-64 sm:bottom-32'
                : 'bottom-32 sm:bottom-32'
              : 'bottom-14 sm:bottom-11'
          } px-3.5 py-1 border text-[10px] sm:text-xs font-pixel whitespace-nowrap ${
            hud.nearbyReturnDoor
              ? 'border-[#F59E0B] text-[#FEF3C7]'
              : hud.roomLocked
                ? 'border-[#DC2626] text-[#FCA5A5]'
                : 'border-[#84CC16] text-[#ECFCCB]'
          }`}
        >
          {hud.nearbyReturnDoor
            ? `WALK THROUGH ARCH: ${hud.nearbyDoorLabel}`
            : hud.roomLocked
              ? hud.nearbyDoorLabel
              : `WALK THROUGH ARCH: ${hud.nearbyDoorLabel}`}
        </div>
      )}

      {/* Hooded-Cloak Shopkeeper Proximity Prompt (Exact Iconic Greeting) */}
      {hud.nearbyShopkeeper && !hud.nearbyShortcutPrompt && !editingTouchLayout && (
        <div
          data-testid="shopkeeper-prompt"
          style={panelBgStyle}
          className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 border-2 border-[#F59E0B] shadow-[0_8px_24px_rgba(0,0,0,0.88)] max-w-[92vw] ${
            hud.nearbyDoorLabel ? 'bottom-24 sm:bottom-20' : 'bottom-14 sm:bottom-11'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5">
            <div className="text-center sm:text-left">
              <div className="font-pixel text-[9px] text-[#F59E0B] uppercase tracking-wider">
                HOODED SHOPKEEPER
              </div>
              <div className="text-xs italic text-[#FEF3C7] leading-snug mt-0.5">
                &ldquo;{SHOPKEEPER_GREETING}&rdquo;
              </div>
            </div>
            <button
              type="button"
              tabIndex={-1}
              data-testid="btn-open-shop"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenShop();
              }}
              className="px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#100D0B] bg-[#F59E0B] border border-[#FEF3C7] hover:bg-[#FBBF24] cursor-pointer whitespace-nowrap shrink-0"
            >
              OPEN SHOP [E]
            </button>
          </div>
        </div>
      )}

      {/* Interactive Ask-to-Use-Key Prompt for Maze Shortcut Gates */}
      {hud.nearbyShortcutPrompt && !editingTouchLayout && (
        <div
          data-testid="shortcut-key-prompt"
          style={panelBgStyle}
          className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 border-2 shadow-[0_8px_24px_rgba(0,0,0,0.88)] max-w-[92vw] ${
            hud.nearbyDoorLabel ? 'bottom-24 sm:bottom-20' : 'bottom-14 sm:bottom-11'
          } ${
            hud.nearbyShortcutPrompt.hasKey ? 'border-[#F59E0B]' : 'border-[#78716C]'
          }`}
        >
          {hud.nearbyShortcutPrompt.hasKey ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="text-center sm:text-left">
                <div className="font-pixel text-[9px] sm:text-[10px] text-[#FDE68A] leading-snug">
                  USE 1 SKELETON KEY TO UNLOCK SHORTCUT?
                </div>
                <div className="font-mono-num text-[10px] text-[#D6D3D1]">
                  Keys Held: {hud.nearbyShortcutPrompt.keysHeld}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-confirm-use-key"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onConfirmUseKey(hud.nearbyShortcutPrompt!.doorId);
                  }}
                  className="px-2.5 py-1 text-[10px] sm:text-xs font-bold text-[#100D0B] bg-[#F59E0B] border border-[#FEF3C7] hover:bg-[#FBBF24] cursor-pointer whitespace-nowrap"
                >
                  USE KEY [E]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="btn-decline-use-key"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onDeclineUseKey(hud.nearbyShortcutPrompt!.doorId);
                  }}
                  className="px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-[#D6D3D1] bg-[#211A16] border border-[#574A3E] hover:border-[#A8A29E] cursor-pointer whitespace-nowrap"
                >
                  KEEP KEY [N]
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center font-pixel text-[9px] sm:text-[10px] text-[#FDE68A] whitespace-nowrap">
              SHORTCUT GATE LOCKED · SLAY FOES FOR A SKELETON KEY
            </div>
          )}
        </div>
      )}

      {/* Transient Wave / Chamber Banner */}
      {hud.bannerText && !editingTouchLayout && (
        <div
          style={panelBgStyle}
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[39%] sm:top-[22%] px-3 sm:px-5 py-1.5 sm:py-2 border-y-2 border-[#D97706] text-center max-w-[92vw]"
        >
          <span className="block font-pixel text-[9px] sm:text-sm text-[#FDE68A] tracking-wider arcade-text-stroke leading-snug sm:whitespace-nowrap">
            {hud.bannerText}
          </span>
        </div>
      )}

      {/* Live Combat Log Panel (Compact bottom-left on desktop, toggleable on mobile/touch) */}
      {combatLogOpen && !editingTouchLayout && (
        <div
          data-testid="combat-log-panel"
          style={logBgStyle}
          className={`pointer-events-auto absolute z-30 border-2 border-[#574A3E] shadow-[0_6px_0_rgba(8,6,5,0.8)] flex flex-col ${
            touchControlsEnabled
              ? 'left-2.5 sm:left-4 top-[296px] w-[268px] sm:w-[304px]'
              : 'left-2.5 sm:left-4 bottom-8 sm:bottom-9 w-[280px] sm:w-[348px]'
          }`}
        >
          <div
            style={logHeaderBgStyle}
            className="flex items-center justify-between gap-2 px-2.5 py-1 border-b border-[#443A32]"
          >
            <span className="font-pixel text-[8px] text-[#FDE68A] tracking-wider">
              COMBAT LOG
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-expand-combat-log"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setCombatLogExpanded((v) => !v);
                }}
                className="text-[9px] font-mono-num uppercase text-[#A8A29E] hover:text-[#FDE68A] cursor-pointer px-1"
              >
                {combatLogExpanded ? 'COMPACT' : 'EXPAND'}
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close Combat Log"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setCombatLogOpen(false);
                }}
                className="text-[10px] font-bold text-[#A8A29E] hover:text-[#FCA5A5] cursor-pointer px-1"
              >
                ×
              </button>
            </div>
          </div>

          <div
            ref={logListRef}
            data-testid="combat-log-entries"
            className={`overflow-y-auto px-2.5 py-1.5 space-y-0.5 font-mono-num text-[10px] leading-snug ${
              combatLogExpanded ? 'max-h-[168px]' : 'max-h-[78px]'
            }`}
          >
            {hud.combatLog.length === 0 ? (
              <div className="text-[#A8A29E] italic">
                Awaiting battle in Room {hud.roomNumber}/{hud.totalRooms}...
              </div>
            ) : (
              hud.combatLog.slice(-(combatLogExpanded ? 16 : 6)).map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-1.5 ${LOG_CATEGORY_COLORS[entry.category]}`}
                >
                  <span className="text-[#78716C] shrink-0">[R{entry.roomNumber}]</span>
                  <span className="break-words">{entry.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Compact Single-Line Control Legend */}
      {!touchControlsEnabled ? (
        <div className="flex items-end justify-between text-[11px] font-semibold text-[#D6D3D1]/90 arcade-text-stroke">
          <span>
            WASD Move · J Attack 1 · K Defend · L Serum VST (-2 Packs) · Space/Q Potion · E Gate/Shop · Shift Dash · I Inventory · T Skills · F5 Save/Load
          </span>
          <span className="hidden sm:inline font-mono-num text-[#FDE68A]/90">
            BEST {hud.bestScore.toString().padStart(6, '0')}
          </span>
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
