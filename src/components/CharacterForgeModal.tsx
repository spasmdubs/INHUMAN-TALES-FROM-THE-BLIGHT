import { useState } from 'react';
import { Dices, FlipHorizontal, Lock, Pipette, Shield, Sparkles, X } from 'lucide-react';
import {
  ACCESSORIES,
  CHARACTER_PRESETS,
  CLOTHING_COLORS,
  CLOTHING_TYPES,
  CharacterConfig,
  EYE_COLORS,
  FACE_STYLES,
  FIGHTER_CLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HERO_NAME,
  SHOE_COLORS,
  SHOE_TYPES,
  SKIN_TONES,
  SwatchOption,
  findSwatch,
  getFighterClass,
  isCustomHexColor,
  randomizeCharacter,
} from '../game/character';
import { SpriteAnimPose } from '../game/pixelSprites';
import { HeroPreviewCanvas } from './HeroPreviewCanvas';

interface CharacterForgeModalProps {
  character: CharacterConfig;
  onChange: (next: CharacterConfig) => void;
  onClose: () => void;
  onOpenPortraitForge: () => void;
  onStartGame: () => void;
}

type ForgeTab = 'class' | 'head' | 'gear' | 'accessories';

const PREVIEW_POSES: { id: SpriteAnimPose; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'punch1', label: 'Attack 1' },
  { id: 'defend', label: 'Defend' },
  { id: 'special', label: 'Serum VST' },
];

export function CharacterForgeModal({
  character,
  onChange,
  onClose,
  onOpenPortraitForge,
  onStartGame,
}: CharacterForgeModalProps) {
  const [activeTab, setActiveTab] = useState<ForgeTab>('class');
  const [previewPose, setPreviewPose] = useState<SpriteAnimPose>('idle');
  const [facingLeft, setFacingLeft] = useState(false);

  const activeClass = getFighterClass(character.fighterClass);

  const patch = <K extends keyof CharacterConfig>(key: K, val: CharacterConfig[K]) => {
    onChange({ ...character, [key]: val, name: HERO_NAME });
  };

  return (
    <div
      data-testid="character-forge-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090706]/92 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Inhuman Customization Forge"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-[#161210] border-2 border-[#574A3E] shadow-[0_24px_64px_rgba(0,0,0,0.88)] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-3.5 bg-[#100D0B] border-b border-[#3A3028]">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-pixel text-[11px] sm:text-base text-[#FDE68A] tracking-wide truncate">
              INHUMAN FORGE
            </h2>
            <span className="hidden md:inline text-xs text-[#A8A29E] truncate">
              Medieval Class · Hair · Face · Skin · Eyes · Armor · Boots · Custom Colors
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onChange(randomizeCharacter())}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-[#F5EFE6] bg-[#241E1A] border border-[#574A3E] hover:border-[#D97706] hover:text-[#FDE68A] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Dices className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Randomize
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Inhuman customization"
              className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Locked Identity + Live Isometric Pixel Preview + Active Class + Archetypes */}
          <div className="flex flex-col justify-between p-5 bg-[#120E0C] border-b lg:border-b-0 lg:border-r border-[#3A3028] gap-4 overflow-y-auto retro-scroll">
            <div className="space-y-3">
              {/* Permanently Locked Hero Nameplate (Non-editable) */}
              <div className="px-3 py-2.5 bg-[#1A1512] border border-[#4D4137]">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-1">
                  <span>Cursed Vessel</span>
                  <span className="inline-flex items-center gap-1 text-[#BEF264]">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    Fixed Name
                  </span>
                </div>
                <div
                  data-testid="locked-hero-name"
                  className="font-pixel text-sm text-[#FDE68A] tracking-wider"
                >
                  {HERO_NAME}
                </div>
              </div>

              {/* Active Class Readout */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1A1512] border border-[#4D4137]">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-4 h-4 text-[#D97706] shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold text-[#FDE68A] truncate">
                    {activeClass.label}
                  </span>
                </div>
                <span className="font-mono-num text-[11px] font-bold text-[#BEF264] whitespace-nowrap">
                  {activeClass.maxHp} HP
                </span>
              </div>

              {/* Pixel Stage Preview */}
              <div className="relative flex flex-col items-center justify-center bg-[#0D0A09] border border-[#3E342C] py-3 px-2">
                <HeroPreviewCanvas
                  character={character}
                  pose={previewPose}
                  facingLeft={facingLeft}
                  width={200}
                  height={200}
                />
                <button
                  type="button"
                  onClick={() => setFacingLeft((v) => !v)}
                  aria-label="Flip fighter facing direction"
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#D6D3D1] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  Flip
                </button>
              </div>

              {/* Animation Pose Tester */}
              <div className="grid grid-cols-5 gap-1">
                {PREVIEW_POSES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreviewPose(p.id)}
                    className={`py-1.5 text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      previewPose === p.id
                        ? 'bg-[#D97706] text-[#100D0B] border-[#FDE68A]'
                        : 'bg-[#1E1916] text-[#D6D3D1] border-[#3E342C] hover:border-[#D97706]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Archetype Builds */}
            <div className="space-y-2 pt-2 border-t border-[#322923]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                Archetype Builds
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {CHARACTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChange({ ...preset.config, name: HERO_NAME })}
                    className="px-2.5 py-1.5 text-xs font-semibold text-left text-[#E7E0D6] bg-[#1E1916] border border-[#443A32] hover:border-[#84CC16] hover:text-[#FDE68A] transition-colors cursor-pointer truncate"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Categorized Customization Controls */}
          <div className="flex flex-col min-h-0">
            {/* Category Tabs */}
            <div
              role="tablist"
              aria-label="Customization categories"
              className="flex items-center gap-1 px-5 pt-4 pb-3 border-b border-[#3A3028] bg-[#14100E] overflow-x-auto"
            >
              {(
                [
                  { id: 'class', label: 'Class' },
                  { id: 'head', label: 'Head, Hair & Eyes' },
                  { id: 'gear', label: 'Outfit & Footwear' },
                  { id: 'accessories', label: 'Relics & Cloaks' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  data-testid={`forge-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#2E241A] text-[#FDE68A] border-[#D97706]'
                      : 'bg-[#1A1512] text-[#A8A29E] border-[#3A3028] hover:text-[#F5EFE6]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Controls Panel */}
            <div className="flex-1 overflow-y-auto retro-scroll p-5 space-y-6">
              {activeTab === 'class' && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                      Medieval Combat Class
                    </h3>
                    <span className="text-xs text-[#BEF264]">
                      Shapes Vitality, Speed, Strike Power &amp; Serum VST Mastery
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FIGHTER_CLASSES.map((cls) => {
                      const active = cls.id === character.fighterClass;
                      const hpPct = Math.round((cls.maxHp / 150) * 100);
                      const speedPct = Math.round((cls.moveSpeedMult / 1.3) * 100);
                      const powerPct = Math.round((cls.meleeDamageMult / 1.35) * 100);
                      const serumPct = Math.round((cls.astralGainMult / 1.65) * 100);

                      return (
                        <button
                          key={cls.id}
                          type="button"
                          data-testid={`class-option-${cls.id}`}
                          aria-pressed={active}
                          onClick={() => patch('fighterClass', cls.id)}
                          className={`flex flex-col text-left p-4 border-2 transition-colors cursor-pointer space-y-3 ${
                            active
                              ? 'bg-[#2A2118] border-[#D97706]'
                              : 'bg-[#1A1512] border-[#3E342C] hover:border-[#84CC16]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div
                                className={`font-pixel text-xs ${
                                  active ? 'text-[#FDE68A]' : 'text-[#F5EFE6]'
                                }`}
                              >
                                {cls.label}
                              </div>
                              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#BEF264]">
                                {cls.role} · {cls.traitName}
                              </div>
                            </div>
                            <span className="font-mono-num text-xs font-bold text-[#FDE68A] whitespace-nowrap">
                              {cls.maxHp} HP
                            </span>
                          </div>

                          <p className="text-xs text-[#D6D3D1] leading-relaxed">{cls.description}</p>

                          <div className="space-y-1.5 pt-1">
                            <ClassStatBar label="Vitality" pct={hpPct} color="#10B981" />
                            <ClassStatBar label="Speed" pct={speedPct} color="#F59E0B" />
                            <ClassStatBar label="Strike" pct={powerPct} color="#E11D48" />
                            <ClassStatBar label="Serum VST" pct={serumPct} color="#84CC16" />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#A8A29E] pt-1 border-t border-[#3A3028] font-mono-num">
                            <span>Serum VST Cost: {cls.specialCost}</span>
                            <span>Dash CD: {cls.dashCooldown.toFixed(2)}s</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeTab === 'head' && (
                <>
                  <SwatchPicker
                    idPrefix="skin-tone"
                    label="Skin Tone"
                    options={SKIN_TONES}
                    selectedId={character.skinTone}
                    onSelect={(id) => patch('skinTone', id)}
                  />

                  <StyleGrid
                    label="Hair Style"
                    options={HAIR_STYLES}
                    selectedId={character.hairStyle}
                    onSelect={(id) => patch('hairStyle', id)}
                  />

                  <SwatchPicker
                    idPrefix="hair-color"
                    label="Hair Color"
                    options={HAIR_COLORS}
                    selectedId={character.hairColor}
                    onSelect={(id) => patch('hairColor', id)}
                  />

                  <StyleGrid
                    label="Face Style"
                    options={FACE_STYLES}
                    selectedId={character.faceStyle}
                    onSelect={(id) => patch('faceStyle', id)}
                  />

                  <SwatchPicker
                    idPrefix="eye-color"
                    label="Eye Color"
                    options={EYE_COLORS}
                    selectedId={character.eyeColor}
                    onSelect={(id) => patch('eyeColor', id)}
                  />
                </>
              )}

              {activeTab === 'gear' && (
                <>
                  <StyleGrid
                    label="Medieval Garb & Armor"
                    options={CLOTHING_TYPES}
                    selectedId={character.clothingType}
                    onSelect={(id) => patch('clothingType', id)}
                  />

                  <SwatchPicker
                    idPrefix="clothing-color"
                    label="Armor & Cloth Dye"
                    options={CLOTHING_COLORS}
                    selectedId={character.clothingColor}
                    onSelect={(id) => patch('clothingColor', id)}
                  />

                  <StyleGrid
                    label="Boots & Sabatons"
                    options={SHOE_TYPES}
                    selectedId={character.shoeType}
                    onSelect={(id) => patch('shoeType', id)}
                  />

                  <SwatchPicker
                    idPrefix="shoe-color"
                    label="Footwear Tone"
                    options={SHOE_COLORS}
                    selectedId={character.shoeColor}
                    onSelect={(id) => patch('shoeColor', id)}
                  />
                </>
              )}

              {activeTab === 'accessories' && (
                <StyleGrid
                  label="Relics, Cloaks & Wargear"
                  options={ACCESSORIES}
                  selectedId={character.accessory}
                  onSelect={(id) => patch('accessory', id)}
                />
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#100D0B] border-t border-[#3A3028]">
              <button
                type="button"
                onClick={onOpenPortraitForge}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#ECFCCB] bg-[#1D2516] border border-[#4D7C0F] hover:border-[#84CC16] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-[#84CC16]" aria-hidden="true" />
                Chronicle Portrait
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#D6D3D1] bg-[#211B18] border border-[#4D4137] hover:border-[#A8A29E] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Save &amp; Back
                </button>
                <button
                  type="button"
                  onClick={onStartGame}
                  className="px-5 py-2 text-xs sm:text-sm font-pixel text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] transition-colors cursor-pointer whitespace-nowrap"
                >
                  ENTER THE BLIGHT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassStatBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 text-[#A8A29E] font-medium shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#100D0B] border border-[#322923] overflow-hidden">
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${Math.max(12, Math.min(100, pct))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StyleGrid<T extends string>({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: { id: T; label: string; desc: string }[];
  selectedId: T;
  onSelect: (id: T) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">{label}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              aria-pressed={active}
              className={`flex flex-col items-start text-left px-3 py-2.5 border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#2C231A] border-[#D97706] text-[#FDE68A]'
                  : 'bg-[#1A1512] border-[#3E342C] text-[#E7E0D6] hover:border-[#84CC16]'
              }`}
            >
              <span className="text-xs sm:text-sm font-semibold leading-tight">{opt.label}</span>
              <span className="text-[11px] text-[#A8A29E] mt-0.5 leading-snug">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SwatchPicker({
  idPrefix,
  label,
  options,
  selectedId,
  onSelect,
}: {
  idPrefix: string;
  label: string;
  options: SwatchOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const resolved = findSwatch(options, selectedId);
  const isCustom = isCustomHexColor(selectedId);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">{label}</h3>
        <span className="text-xs text-[#E7E0D6] font-mono-num">
          {isCustom ? `Custom ${resolved.hex}` : resolved.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((swatch) => {
          const active = !isCustom && swatch.id === selectedId;
          return (
            <button
              key={swatch.id}
              type="button"
              onClick={() => onSelect(swatch.id)}
              aria-label={`${label}: ${swatch.label}`}
              aria-pressed={active}
              title={swatch.label}
              className={`flex items-center gap-2 px-2.5 py-1.5 border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#2C231A] border-[#D97706] text-[#FDE68A]'
                  : 'bg-[#1A1512] border-[#3E342C] text-[#D6D3D1] hover:border-[#84CC16]'
              }`}
            >
              <span
                className="w-4 h-4 border border-[#100D0B] shrink-0"
                style={{ backgroundColor: swatch.hex }}
              />
              <span className="text-xs font-medium whitespace-nowrap">{swatch.label}</span>
            </button>
          );
        })}

        {/* Custom Color Picker alongside every preset group */}
        <label
          htmlFor={`custom-${idPrefix}`}
          className={`flex items-center gap-2 px-2.5 py-1.5 border transition-colors cursor-pointer ${
            isCustom
              ? 'bg-[#2C231A] border-[#D97706] text-[#FDE68A]'
              : 'bg-[#1A1512] border-dashed border-[#6B5D4F] text-[#D6D3D1] hover:border-[#D97706]'
          }`}
          title={`Pick any custom ${label.toLowerCase()}`}
        >
          <input
            id={`custom-${idPrefix}`}
            data-testid={`custom-color-${idPrefix}`}
            type="color"
            aria-label={`Custom ${label}`}
            value={resolved.hex}
            onChange={(e) => onSelect(e.target.value.toUpperCase())}
            className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer shrink-0"
          />
          <Pipette className="w-3.5 h-3.5 text-[#BEF264] shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium whitespace-nowrap">
            {isCustom ? resolved.hex : 'Custom'}
          </span>
        </label>
      </div>
    </section>
  );
}
