import {
  CrtFxSettings,
  DisplayFxConfig,
  DisplayFxSection,
  LcdFxSettings,
  VhsFxSettings,
} from '../game/displayFx';

interface DisplayFxControlsProps {
  displayFx: DisplayFxConfig;
  section: DisplayFxSection;
  onUpdateCrt: (patch: Partial<CrtFxSettings>) => void;
  onUpdateLcd: (patch: Partial<LcdFxSettings>) => void;
  onUpdateVhs: (patch: Partial<VhsFxSettings>) => void;
  onResetSection: (section: DisplayFxSection) => void;
}

interface SliderRowProps {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accentClass: string;
  sliderTestId: string;
  valueTestId?: string;
  onChange: (nextVal: number) => void;
}

function FxSliderRow({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  accentClass,
  sliderTestId,
  valueTestId,
  onChange,
}: SliderRowProps) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-[#E7E0D6]">{label}</span>
        <span data-testid={valueTestId} className="font-mono-num text-[#BEF264]">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={sliderTestId}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 cursor-pointer ${accentClass}`}
      />
    </div>
  );
}

export function DisplayFxControls({
  displayFx,
  section,
  onUpdateCrt,
  onUpdateLcd,
  onUpdateVhs,
  onResetSection,
}: DisplayFxControlsProps) {
  if (section === 'crt') {
    const crt = displayFx.crt;
    return (
      <div className="space-y-2" data-testid="fx-panel-crt">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#3A3028]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FDE68A]">
            CRT Scanlines {crt.enabled ? '· ACTIVE' : '· OFF'}
          </span>
          <button
            type="button"
            data-testid="crt-reset-btn"
            onClick={() => onResetSection('crt')}
            className="px-1.5 py-0.5 text-[10px] font-semibold text-[#D6D3D1] bg-[#1E1916] border border-[#4A3F36] hover:border-[#D97706] hover:text-[#FDE68A] cursor-pointer"
          >
            Reset
          </button>
        </div>

        <FxSliderRow
          label="Scanline Count"
          valueLabel={`${crt.scanlineCount} lines`}
          value={crt.scanlineCount}
          min={120}
          max={480}
          step={20}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-scanline-count-slider"
          valueTestId="crt-scanline-count-value"
          onChange={(scanlineCount) => onUpdateCrt({ enabled: true, scanlineCount })}
        />
        <FxSliderRow
          label="Brightness"
          valueLabel={`${crt.brightness}%`}
          value={crt.brightness}
          min={60}
          max={150}
          step={5}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-brightness-slider"
          valueTestId="crt-brightness-value"
          onChange={(brightness) => onUpdateCrt({ enabled: true, brightness })}
        />
        <FxSliderRow
          label="Contrast"
          valueLabel={`${crt.contrast}%`}
          value={crt.contrast}
          min={70}
          max={160}
          step={5}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-contrast-slider"
          valueTestId="crt-contrast-value"
          onChange={(contrast) => onUpdateCrt({ enabled: true, contrast })}
        />
        <FxSliderRow
          label="Line Opacity"
          valueLabel={`${crt.lineOpacity}%`}
          value={crt.lineOpacity}
          min={10}
          max={85}
          step={5}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-opacity-slider"
          onChange={(lineOpacity) => onUpdateCrt({ enabled: true, lineOpacity })}
        />
        <FxSliderRow
          label="Line Thickness"
          valueLabel={`${crt.lineThickness}%`}
          value={crt.lineThickness}
          min={20}
          max={75}
          step={5}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-thickness-slider"
          onChange={(lineThickness) => onUpdateCrt({ enabled: true, lineThickness })}
        />
        <FxSliderRow
          label="Tube Vignette"
          valueLabel={`${crt.vignette}%`}
          value={crt.vignette}
          min={0}
          max={85}
          step={5}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-vignette-slider"
          onChange={(vignette) => onUpdateCrt({ enabled: true, vignette })}
        />
        <FxSliderRow
          label="Phosphor Glow"
          valueLabel={`${crt.phosphorGlow}%`}
          value={crt.phosphorGlow}
          min={0}
          max={100}
          step={5}
          accentClass="accent-[#D97706]"
          sliderTestId="crt-phosphor-slider"
          onChange={(phosphorGlow) => onUpdateCrt({ enabled: true, phosphorGlow })}
        />
      </div>
    );
  }

  if (section === 'lcd') {
    const lcd = displayFx.lcd;
    return (
      <div className="space-y-2" data-testid="fx-panel-lcd">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#3A3028]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#BEF264]">
            LCD Pixel Matrix {lcd.enabled ? '· ACTIVE' : '· OFF'}
          </span>
          <button
            type="button"
            data-testid="lcd-reset-btn"
            onClick={() => onResetSection('lcd')}
            className="px-1.5 py-0.5 text-[10px] font-semibold text-[#D6D3D1] bg-[#1E1916] border border-[#4A3F36] hover:border-[#84CC16] hover:text-[#ECFCCB] cursor-pointer"
          >
            Reset
          </button>
        </div>

        <FxSliderRow
          label="Pixel Count"
          valueLabel={`${lcd.pixelCount} px`}
          value={lcd.pixelCount}
          min={120}
          max={480}
          step={20}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-pixel-count-slider"
          valueTestId="lcd-pixel-count-value"
          onChange={(pixelCount) => onUpdateLcd({ enabled: true, pixelCount })}
        />
        <FxSliderRow
          label="Brightness"
          valueLabel={`${lcd.brightness}%`}
          value={lcd.brightness}
          min={60}
          max={150}
          step={5}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-brightness-slider"
          valueTestId="lcd-brightness-value"
          onChange={(brightness) => onUpdateLcd({ enabled: true, brightness })}
        />
        <FxSliderRow
          label="Contrast"
          valueLabel={`${lcd.contrast}%`}
          value={lcd.contrast}
          min={70}
          max={160}
          step={5}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-contrast-slider"
          valueTestId="lcd-contrast-value"
          onChange={(contrast) => onUpdateLcd({ enabled: true, contrast })}
        />
        <FxSliderRow
          label="Grid Darkness"
          valueLabel={`${lcd.gridOpacity}%`}
          value={lcd.gridOpacity}
          min={10}
          max={85}
          step={5}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-grid-opacity-slider"
          onChange={(gridOpacity) => onUpdateLcd({ enabled: true, gridOpacity })}
        />
        <FxSliderRow
          label="RGB Subpixels"
          valueLabel={`${lcd.subpixelStrength}%`}
          value={lcd.subpixelStrength}
          min={0}
          max={100}
          step={5}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-subpixel-slider"
          onChange={(subpixelStrength) => onUpdateLcd({ enabled: true, subpixelStrength })}
        />
        <FxSliderRow
          label="Color Saturation"
          valueLabel={`${lcd.saturation}%`}
          value={lcd.saturation}
          min={50}
          max={150}
          step={5}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-saturation-slider"
          onChange={(saturation) => onUpdateLcd({ enabled: true, saturation })}
        />
        <FxSliderRow
          label="Backlight Tint"
          valueLabel={`${lcd.backlightTint}%`}
          value={lcd.backlightTint}
          min={0}
          max={100}
          step={5}
          accentClass="accent-[#84CC16]"
          sliderTestId="lcd-tint-slider"
          onChange={(backlightTint) => onUpdateLcd({ enabled: true, backlightTint })}
        />
      </div>
    );
  }

  const vhs = displayFx.vhs;
  return (
    <div className="space-y-2" data-testid="fx-panel-vhs">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#3A3028]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F472B6]">
          VHS Analog Tape {vhs.enabled ? '· ACTIVE' : '· OFF'}
        </span>
        <button
          type="button"
          data-testid="vhs-reset-btn"
          onClick={() => onResetSection('vhs')}
          className="px-1.5 py-0.5 text-[10px] font-semibold text-[#D6D3D1] bg-[#1E1916] border border-[#4A3F36] hover:border-[#EC4899] hover:text-[#FBCFE8] cursor-pointer"
        >
          Reset
        </button>
      </div>

      <FxSliderRow
        label="Tracking Sweep"
        valueLabel={`${vhs.tracking}%`}
        value={vhs.tracking}
        min={0}
        max={100}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-tracking-slider"
        valueTestId="vhs-tracking-value"
        onChange={(tracking) => onUpdateVhs({ enabled: true, tracking })}
      />
      <FxSliderRow
        label="Tape Noise / Snow"
        valueLabel={`${vhs.noise}%`}
        value={vhs.noise}
        min={0}
        max={100}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-noise-slider"
        valueTestId="vhs-noise-value"
        onChange={(noise) => onUpdateVhs({ enabled: true, noise })}
      />
      <FxSliderRow
        label="Chroma Bleed"
        valueLabel={`${vhs.chromaBleed}%`}
        value={vhs.chromaBleed}
        min={0}
        max={100}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-chroma-slider"
        onChange={(chromaBleed) => onUpdateVhs({ enabled: true, chromaBleed })}
      />
      <FxSliderRow
        label="Tape Jitter"
        valueLabel={`${vhs.jitter}%`}
        value={vhs.jitter}
        min={0}
        max={100}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-jitter-slider"
        onChange={(jitter) => onUpdateVhs({ enabled: true, jitter })}
      />
      <FxSliderRow
        label="Brightness"
        valueLabel={`${vhs.brightness}%`}
        value={vhs.brightness}
        min={60}
        max={150}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-brightness-slider"
        valueTestId="vhs-brightness-value"
        onChange={(brightness) => onUpdateVhs({ enabled: true, brightness })}
      />
      <FxSliderRow
        label="Contrast"
        valueLabel={`${vhs.contrast}%`}
        value={vhs.contrast}
        min={70}
        max={160}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-contrast-slider"
        valueTestId="vhs-contrast-value"
        onChange={(contrast) => onUpdateVhs({ enabled: true, contrast })}
      />
      <FxSliderRow
        label="Tape Saturation"
        valueLabel={`${vhs.saturation}%`}
        value={vhs.saturation}
        min={40}
        max={140}
        step={5}
        accentClass="accent-[#EC4899]"
        sliderTestId="vhs-saturation-slider"
        onChange={(saturation) => onUpdateVhs({ enabled: true, saturation })}
      />
    </div>
  );
}
