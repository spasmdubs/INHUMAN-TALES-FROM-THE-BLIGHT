import { useState } from 'react';
import { BookOpen, FolderOpen, Sliders, Swords } from 'lucide-react';
import { CharacterConfig, HERO_NAME, getFighterClass } from '../game/character';
import { DIFFICULTY_CONFIGS, DIFFICULTY_LIST, DifficultyId } from '../game/rules';
import { SAVE_SLOT_COUNT } from '../game/saves';
import { DisplayFxConfig } from '../game/displayFx';
import { HeroPreviewCanvas } from './HeroPreviewCanvas';
import { TitleEmblem } from './TitleEmblem';

interface TitleScreenProps {
  character: CharacterConfig;
  difficulty: DifficultyId;
  bestScore: number;
  occupiedSaveCount: number;
  modalOpen: boolean;
  displayFx: DisplayFxConfig;
  stageFilterCss: string;
  onDifficultyChange: (next: DifficultyId) => void;
  onToggleScanlines: () => void;
  onToggleLcd: () => void;
  onToggleVhs: () => void;
  onStart: () => void;
  onOpenLoadSaves: () => void;
  onOpenCustomize: () => void;
  onOpenArchive: () => void;
}

const TITLE_BG_SRC = '/src/assets/images/blight_wasteland_bg_1795264396190.jpg';

export function TitleScreen({
  character,
  difficulty,
  bestScore,
  occupiedSaveCount,
  modalOpen,
  displayFx,
  stageFilterCss,
  onDifficultyChange,
  onToggleScanlines,
  onToggleLcd,
  onToggleVhs,
  onStart,
  onOpenLoadSaves,
  onOpenCustomize,
  onOpenArchive,
}: TitleScreenProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const fighterClass = getFighterClass(character.fighterClass);
  const activeDiff = DIFFICULTY_CONFIGS[difficulty];

  return (
    <main
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-30 flex flex-col justify-between overflow-hidden bg-[#100D0B] select-none no-long-press"
    >
      {/* Illustrated 1980s Dark-Fantasy Decaying Wasteland Backdrop */}
      <div className="absolute inset-0 z-0" style={{ filter: stageFilterCss }}>
        {!imgFailed ? (
          <img
            src={TITLE_BG_SRC}
            alt="Crumbling gothic keep rising above the decaying wastelands of The Blight"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-[#171310]" />
        )}
        {/* Left-side scrim over negative space so typography maintains strong contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 44%, rgba(12,10,9,0.22) 74%, rgba(12,10,9,0.48) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-32"
          style={{
            background:
              'linear-gradient(0deg, rgba(12,10,9,0.94) 0%, rgba(12,10,9,0.45) 55%, rgba(12,10,9,0) 100%)',
          }}
        />
      </div>

      {/* Main Compositional Stage: Left Negative-Space Lockup + Right Live Pixel Fighter */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 px-6 sm:px-12 lg:px-16 pt-8 sm:pt-12 pb-4 max-w-[1440px] w-full mx-auto">
        {/* Left Third: Emblem + Difficulty Selector + Display FX + Menu Actions */}
        <div className="flex flex-col items-start max-w-lg w-full space-y-4 sm:space-y-5">
          <TitleEmblem />

          <p className="text-sm sm:text-base text-[#E7E0D6] max-w-md leading-relaxed arcade-text-stroke">
            Fight as <strong className="text-[#FDE68A]">{HERO_NAME}</strong> across 666 procedural
            maze rooms divided evenly into 111 Wings leading to Boss Chambers. Each room seals its
            single exit door until all foes fall — loot Skeleton Keys to unlock maze shortcuts and
            gather 10 Sample Packs for full Serum VST power.
          </p>

          {/* Easy / Normal / Hard Difficulty Toggle */}
          <div className="w-full max-w-sm space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider">
              <span className="font-semibold text-[#D6D3D1] arcade-text-stroke">Difficulty</span>
              <span
                data-testid="difficulty-summary"
                className="text-[#FDE68A] font-medium arcade-text-stroke"
              >
                {activeDiff.summary}
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Difficulty"
              className="grid grid-cols-3 bg-[#14100E]/95 border-2 border-[#574A3E] p-1 gap-1"
            >
              {DIFFICULTY_LIST.map((opt) => {
                const selected = opt.id === difficulty;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`difficulty-${opt.id}`}
                    onClick={() => onDifficultyChange(opt.id)}
                    className={`py-2 px-2 font-pixel text-[10px] sm:text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? opt.id === 'hard'
                          ? 'bg-[#9F1239] text-[#FFF1F2] border border-[#FDA4AF]'
                          : opt.id === 'easy'
                            ? 'bg-[#3F6212] text-[#ECFCCB] border border-[#BEF264]'
                            : 'bg-[#D97706] text-[#100D0B] border border-[#FDE68A]'
                        : 'bg-[#211B18] text-[#D6D3D1] border border-transparent hover:border-[#D97706] hover:text-[#FEF3C7]'
                    }`}
                  >
                    {opt.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-start gap-3 w-full sm:w-auto pt-1">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-3 px-7 py-4 font-pixel text-xs sm:text-sm text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] active:translate-y-0.5 shadow-[0_6px_0_#451A03] transition-colors cursor-pointer whitespace-nowrap min-w-[260px]"
            >
              <Swords className="w-4 h-4 shrink-0" aria-hidden="true" />
              ENTER THE BLIGHT
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="btn-title-load-save"
                onClick={onOpenLoadSaves}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#FDE68A] bg-[#241D16]/95 border-2 border-[#B45309] hover:border-[#FDE68A] transition-colors cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
                Load Save ({occupiedSaveCount}/{SAVE_SLOT_COUNT})
              </button>

              <button
                type="button"
                onClick={onOpenCustomize}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#F5EFE6] bg-[#1E1916]/95 border-2 border-[#574A3E] hover:border-[#D97706] hover:text-[#FDE68A] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sliders className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
                Customize Inhuman
              </button>

              <button
                type="button"
                onClick={onOpenArchive}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#ECFCCB] bg-[#1D2516]/95 border-2 border-[#4D7C0F] hover:border-[#84CC16] transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-[#84CC16]" aria-hidden="true" />
                Chronicle Archive
              </button>
            </div>

            {/* Retro Screen Filter Toggles (CRT Scanlines + LCD Pixel Matrix + VHS Tape) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="title-toggle-scanlines"
                aria-pressed={displayFx.crt.enabled}
                onClick={onToggleScanlines}
                className={`px-3 py-1.5 text-[11px] font-mono-num font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  displayFx.crt.enabled
                    ? 'bg-[#2C241B]/95 border-[#D97706] text-[#FDE68A]'
                    : 'bg-[#171310]/90 border-[#443A32] text-[#C7C0B8] hover:border-[#D97706]'
                }`}
              >
                CRT Scanlines: {displayFx.crt.enabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                data-testid="title-toggle-lcd"
                aria-pressed={displayFx.lcd.enabled}
                onClick={onToggleLcd}
                className={`px-3 py-1.5 text-[11px] font-mono-num font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  displayFx.lcd.enabled
                    ? 'bg-[#242C19]/95 border-[#84CC16] text-[#ECFCCB]'
                    : 'bg-[#171310]/90 border-[#443A32] text-[#C7C0B8] hover:border-[#84CC16]'
                }`}
              >
                LCD Pixels: {displayFx.lcd.enabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                data-testid="title-toggle-vhs"
                aria-pressed={displayFx.vhs.enabled}
                onClick={onToggleVhs}
                className={`px-3 py-1.5 text-[11px] font-mono-num font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  displayFx.vhs.enabled
                    ? 'bg-[#2E1624]/95 border-[#EC4899] text-[#FBCFE8]'
                    : 'bg-[#171310]/90 border-[#443A32] text-[#C7C0B8] hover:border-[#EC4899]'
                }`}
              >
                VHS Tape: {displayFx.vhs.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs arcade-text-stroke">
            <span className="text-[#D9F99D] font-semibold">
              CLASS · {fighterClass.label.toUpperCase()} ({fighterClass.maxHp} HP)
            </span>
            {bestScore > 0 && (
              <span className="font-mono-num text-[#FDE68A]">
                HIGH SCORE · {bestScore.toString().padStart(6, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Right Region: Live Customized Pixelated Isometric Fighter (INHUMAN) */}
        <div className="hidden md:flex flex-col items-center self-end lg:self-center mr-0 lg:mr-6">
          <button
            type="button"
            onClick={onOpenCustomize}
            aria-label="Customize Inhuman"
            className="group relative flex flex-col items-center focus-visible:outline-2 focus-visible:outline-[#D97706] cursor-pointer"
          >
            <HeroPreviewCanvas
              character={character}
              pose="idle"
              paused={modalOpen}
              width={256}
              height={256}
              className="drop-shadow-[0_14px_24px_rgba(6,4,3,0.88)] transition-transform duration-200 group-hover:-translate-y-1"
            />
            <div className="mt-1 px-4 py-2 bg-[#14100E]/92 border border-[#574A3E] group-hover:border-[#D97706] transition-colors text-center">
              <div className="font-pixel text-xs text-[#FDE68A]">{HERO_NAME}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#BEF264]">
                {fighterClass.label} · {fighterClass.role}
              </div>
              <div className="mt-0.5 text-xs text-[#D6D3D1] group-hover:text-[#FDE68A] transition-colors">
                Click to Customize Gear &amp; Class
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Safe-Margin Flat Control Hint Line */}
      <footer className="relative z-10 w-full px-6 sm:px-12 pb-5 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#D6D3D1]/90 max-w-[1440px] mx-auto">
        <span className="arcade-text-stroke">
          WASD Move · J Attack 1 · K Defend · L Serum VST (Collect Sample Packs) · Space/Q Potion · Shift Dash · Touch Ready
        </span>
        <span className="text-[#FDE68A]/90 arcade-text-stroke">
          Press Enter or Space to Enter The Blight
        </span>
      </footer>
    </main>
  );
}
