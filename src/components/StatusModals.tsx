import { useState } from 'react';
import { HERO_NAME } from '../game/character';
import { HudSnapshot } from '../game/engine';
import { SAVE_SLOT_COUNT } from '../game/saves';
import {
  CrtFxSettings,
  DisplayFxConfig,
  DisplayFxSection,
  LcdFxSettings,
  VhsFxSettings,
} from '../game/displayFx';
import { DisplayFxControls } from './DisplayFxControls';

interface StatusModalsProps {
  hud: HudSnapshot;
  occupiedSaveCount: number;
  touchControlsEnabled: boolean;
  displayFx: DisplayFxConfig;
  hudOpacity: number;
  touchScale: number;
  touchOpacity: number;
  onHudOpacityChange: (nextOpacity: number) => void;
  onTouchScaleChange: (nextScale: number) => void;
  onTouchOpacityChange: (nextOpacity: number) => void;
  onToggleTouchControls: () => void;
  onToggleScanlines: () => void;
  onToggleLcd: () => void;
  onToggleVhs: () => void;
  onUpdateCrtFx: (patch: Partial<CrtFxSettings>) => void;
  onUpdateLcdFx: (patch: Partial<LcdFxSettings>) => void;
  onUpdateVhsFx: (patch: Partial<VhsFxSettings>) => void;
  onResetDisplayFxSection: (section: DisplayFxSection) => void;
  onToggleHaptics: () => void;
  onToggleScreenShake: () => void;
  onStartEditTouchLayout: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onOpenSaveLoad: (mode: 'save-load' | 'load-only') => void;
  onResume: () => void;
  onRestart: () => void;
  onOpenCustomize: () => void;
  onOpenArchive: () => void;
  onReturnTitle: () => void;
}

export function StatusModals({
  hud,
  occupiedSaveCount,
  touchControlsEnabled,
  displayFx,
  hudOpacity,
  touchScale,
  touchOpacity,
  onHudOpacityChange,
  onTouchScaleChange,
  onTouchOpacityChange,
  onToggleTouchControls,
  onToggleScanlines,
  onToggleLcd,
  onToggleVhs,
  onUpdateCrtFx,
  onUpdateLcdFx,
  onUpdateVhsFx,
  onResetDisplayFxSection,
  onToggleHaptics,
  onToggleScreenShake,
  onStartEditTouchLayout,
  onOpenInventory,
  onOpenSkillTree,
  onOpenSaveLoad,
  onResume,
  onRestart,
  onOpenCustomize,
  onOpenArchive,
  onReturnTitle,
}: StatusModalsProps) {
  const [tuningTab, setTuningTab] = useState<DisplayFxSection | null>(null);

  if (hud.phase !== 'paused' && hud.phase !== 'victory' && hud.phase !== 'gameover') {
    return null;
  }

  const isPaused = hud.phase === 'paused';
  const isVictory = hud.phase === 'victory';

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090706]/84 p-4 no-long-press"
      role="dialog"
      aria-modal="true"
      aria-label={isPaused ? 'Game Paused' : isVictory ? 'The Blight Cleansed' : 'Fallen in The Blight'}
    >
      <div className="w-full max-w-md max-h-[calc(100vh-32px)] overflow-y-auto retro-scroll bg-[#161210] border-2 border-[#574A3E] shadow-[0_24px_64px_rgba(0,0,0,0.88)] p-5 sm:p-6 text-center space-y-4">
        <div className="space-y-1">
          <h2
            className={`font-pixel text-lg sm:text-xl tracking-wide ${
              isVictory ? 'text-[#FDE68A]' : isPaused ? 'text-[#F5EFE6]' : 'text-[#FB7185]'
            }`}
          >
            {isPaused ? 'PAUSED' : isVictory ? 'SANCTUM CONQUERED' : 'FALLEN IN THE BLIGHT'}
          </h2>
          <p className="text-xs sm:text-sm text-[#A8A29E]">
            {isPaused
              ? `${hud.sectorName} · Room ${hud.roomNumber}/${hud.totalRooms} · Wing ${hud.wingNumber}/${hud.totalWings} · Lv.${hud.level}`
              : `${HERO_NAME} reached Room ${hud.roomNumber}/${hud.totalRooms} (${hud.roomsCleared} cleared · Lv.${hud.level})`}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#BEF264]">
            {hud.fighterClassLabel} · {hud.difficulty.toUpperCase()} · KEYS {hud.keys} · PACKS{' '}
            {hud.presetsCollected}/{hud.presetsMax}
          </p>
        </div>

        {/* Tabular-Nums Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <MetricTile label="Score" value={hud.score.toLocaleString()} accent />
          <MetricTile label="Room / KO" value={`${hud.roomNumber}/${hud.totalRooms} · ${hud.defeatedTotal}`} />
          <MetricTile label="Max Combo" value={`${hud.maxCombo}x`} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 font-pixel text-xs text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] transition-colors cursor-pointer"
            >
              RETURN TO BLIGHT
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full py-3 font-pixel text-xs text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] transition-colors cursor-pointer"
            >
              RISE AGAIN (NEW RUN)
            </button>
          )}

          {isPaused ? (
            <>
              <button
                type="button"
                data-testid="btn-pause-save-load"
                onClick={() => onOpenSaveLoad('save-load')}
                className="w-full py-2.5 px-3 text-xs font-bold text-[#FDE68A] bg-[#281E14] border-2 border-[#D97706] hover:bg-[#36281A] transition-colors cursor-pointer"
              >
                Save / Load Game ({occupiedSaveCount}/{SAVE_SLOT_COUNT} Slots)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenInventory}
                  className="py-2 px-3 text-xs font-semibold text-[#FDE68A] bg-[#261E18] border border-[#D97706]/75 hover:border-[#FDE68A] transition-colors cursor-pointer"
                >
                  Inventory [I]
                </button>
                <button
                  type="button"
                  onClick={onOpenSkillTree}
                  className="relative py-2 px-3 text-xs font-semibold text-[#ECFCCB] bg-[#1E2716] border border-[#65A30D] hover:border-[#BEF264] transition-colors cursor-pointer"
                >
                  Skill Tree [T]
                  {hud.skillPoints > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono-num font-black bg-[#F59E0B] text-[#100D0B] border border-[#FEF3C7]">
                      {hud.skillPoints}
                    </span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  data-testid="pause-toggle-scanlines"
                  onClick={onToggleScanlines}
                  className={`py-1.5 px-2 text-[11px] font-semibold border cursor-pointer ${
                    displayFx.crt.enabled
                      ? 'bg-[#2C241B] border-[#D97706] text-[#FDE68A]'
                      : 'bg-[#1B1613] border-[#3E342C] text-[#A8A29E]'
                  }`}
                >
                  CRT: {displayFx.crt.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  data-testid="pause-toggle-lcd"
                  onClick={onToggleLcd}
                  className={`py-1.5 px-2 text-[11px] font-semibold border cursor-pointer ${
                    displayFx.lcd.enabled
                      ? 'bg-[#242C19] border-[#84CC16] text-[#ECFCCB]'
                      : 'bg-[#1B1613] border-[#3E342C] text-[#A8A29E]'
                  }`}
                >
                  LCD: {displayFx.lcd.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  data-testid="pause-toggle-vhs"
                  onClick={onToggleVhs}
                  className={`py-1.5 px-2 text-[11px] font-semibold border cursor-pointer ${
                    displayFx.vhs.enabled
                      ? 'bg-[#2E1624] border-[#EC4899] text-[#FBCFE8]'
                      : 'bg-[#1B1613] border-[#3E342C] text-[#A8A29E]'
                  }`}
                >
                  VHS: {displayFx.vhs.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onToggleScreenShake}
                  className={`py-1.5 px-2 text-[11px] font-semibold border cursor-pointer ${
                    hud.screenShakeEnabled
                      ? 'bg-[#2D2115] border-[#F59E0B] text-[#FDE68A]'
                      : 'bg-[#1B1613] border-[#3E342C] text-[#A8A29E]'
                  }`}
                >
                  Shake: {hud.screenShakeEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={onToggleHaptics}
                  className={`py-1.5 px-2 text-[11px] font-semibold border cursor-pointer ${
                    hud.hapticsEnabled
                      ? 'bg-[#2E2018] border-[#EA580C] text-[#FDE68A]'
                      : 'bg-[#1B1613] border-[#3E342C] text-[#A8A29E]'
                  }`}
                >
                  Rumble: {hud.hapticsEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Expandable Display FX Sliders inside Pause Menu */}
              <div className="px-3 py-2 bg-[#110D0B] border border-[#3A3028] text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#FDE68A]">
                    Tune Screen Overlays
                  </span>
                  <div className="flex items-center gap-1">
                    {(['crt', 'lcd', 'vhs'] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        data-testid={`pause-tune-${sec}`}
                        onClick={() => setTuningTab((prev) => (prev === sec ? null : sec))}
                        className={`px-2 py-0.5 text-[10px] font-mono-num font-bold uppercase border cursor-pointer ${
                          tuningTab === sec
                            ? sec === 'lcd'
                              ? 'bg-[#65A30D] text-[#100D0B] border-[#BEF264]'
                              : sec === 'vhs'
                                ? 'bg-[#DB2777] text-[#FFF1F2] border-[#F9A8D4]'
                                : 'bg-[#D97706] text-[#100D0B] border-[#FDE68A]'
                            : 'bg-[#1B1613] text-[#C7C0B8] border-[#3E342C] hover:border-[#D97706]'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>
                {tuningTab && (
                  <DisplayFxControls
                    displayFx={displayFx}
                    section={tuningTab}
                    onUpdateCrt={onUpdateCrtFx}
                    onUpdateLcd={onUpdateLcdFx}
                    onUpdateVhs={onUpdateVhsFx}
                    onResetSection={onResetDisplayFxSection}
                  />
                )}
              </div>

              <div className="px-3 py-2 bg-[#110D0B] border border-[#3A3028] text-left space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#FDE68A]">HUD Window Opacity</span>
                  <span className="font-mono-num text-[#BEF264]">{Math.round(hudOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={Math.round(hudOpacity * 100)}
                  data-testid="pause-hud-opacity-slider"
                  aria-label="HUD Window Opacity"
                  onChange={(e) => onHudOpacityChange(Number(e.target.value) / 100)}
                  className="w-full accent-[#D97706] cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-[#2A221D]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-[#FDE68A]">Touch Size</span>
                      <span className="font-mono-num text-[#BEF264]">
                        {Math.round(touchScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={65}
                      max={145}
                      step={5}
                      value={Math.round(touchScale * 100)}
                      data-testid="pause-touch-scale-slider"
                      aria-label="Touch Controls Size"
                      onChange={(e) => onTouchScaleChange(Number(e.target.value) / 100)}
                      className="w-full accent-[#D97706] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-[#FDE68A]">Touch Opacity</span>
                      <span className="font-mono-num text-[#BEF264]">
                        {Math.round(touchOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={5}
                      value={Math.round(touchOpacity * 100)}
                      data-testid="pause-touch-opacity-slider"
                      aria-label="Touch Controls Opacity"
                      onChange={(e) => onTouchOpacityChange(Number(e.target.value) / 100)}
                      className="w-full accent-[#D97706] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleTouchControls}
                  className="py-2 px-3 text-xs font-semibold text-[#ECFCCB] bg-[#1E2716] border border-[#4D7C0F] hover:border-[#84CC16] transition-colors cursor-pointer"
                >
                  Touch Pads: {touchControlsEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={onStartEditTouchLayout}
                  className="py-2 px-3 text-xs font-semibold text-[#FDE68A] bg-[#241E1A] border border-[#574A3E] hover:border-[#D97706] transition-colors cursor-pointer"
                >
                  Customize Touch Pads
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              data-testid="btn-gameover-load-save"
              onClick={() => onOpenSaveLoad('load-only')}
              className="w-full py-2.5 px-3 text-xs font-bold text-[#FDE68A] bg-[#281E14] border-2 border-[#B45309] hover:border-[#FDE68A] transition-colors cursor-pointer"
            >
              Load Saved Game ({occupiedSaveCount}/{SAVE_SLOT_COUNT} Slots)
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenCustomize}
              className="py-2 px-3 text-xs font-semibold text-[#F5EFE6] bg-[#241E1A] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer"
            >
              Customize {HERO_NAME}
            </button>
            <button
              type="button"
              onClick={onOpenArchive}
              className="py-2 px-3 text-xs font-semibold text-[#ECFCCB] bg-[#1E2716] border border-[#4D7C0F] hover:border-[#84CC16] transition-colors cursor-pointer"
            >
              Chronicle Archive
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {isPaused && (
              <button
                type="button"
                onClick={onRestart}
                className="py-2 px-3 text-xs font-semibold text-[#D6D3D1] bg-[#1B1613] border border-[#3E342C] hover:border-[#A8A29E] transition-colors cursor-pointer"
              >
                Restart Run
              </button>
            )}
            <button
              type="button"
              onClick={onReturnTitle}
              className={`py-2 px-3 text-xs font-semibold text-[#D6D3D1] bg-[#1B1613] border border-[#3E342C] hover:border-[#A8A29E] transition-colors cursor-pointer ${
                isPaused ? '' : 'col-span-2'
              }`}
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#110D0B] border border-[#3A3028] py-2.5 px-2">
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] mb-1">{label}</div>
      <div
        className={`font-mono-num text-sm sm:text-base font-bold ${
          accent ? 'text-[#FDE68A]' : 'text-[#F5EFE6]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
