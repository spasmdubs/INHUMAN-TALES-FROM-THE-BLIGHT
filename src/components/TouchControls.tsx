import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { Move, RotateCcw } from 'lucide-react';
import {
  DEFAULT_TOUCH_LAYOUT,
  DEFAULT_TOUCH_STYLE,
  TOUCH_OPACITY_MAX,
  TOUCH_OPACITY_MIN,
  TOUCH_SCALE_MAX,
  TOUCH_SCALE_MIN,
  TouchControlId,
  TouchLayoutMap,
  clampTouchCoord,
} from '../game/touchLayout';
import {
  SERUM_PRESET_COST_PER_CAST,
  WeaponVisualKind,
  getWeaponShortLabel,
} from '../game/rpg';

interface TouchControlsProps {
  layout: TouchLayoutMap;
  touchScale: number;
  touchOpacity: number;
  editMode: boolean;
  astral: number;
  specialCost: number;
  presetsCollected: number;
  presetsMax: number;
  serumEffectivePower: number;
  medkitCount: number;
  hp: number;
  maxHp: number;
  equippedWeaponKind: WeaponVisualKind;
  defending: boolean;
  onMove: (dx: number, dy: number) => void;
  onAction: (action: 'attack1' | 'defend' | 'potion' | 'dash' | 'special') => void;
  onDefendChange: (active: boolean) => void;
  onLayoutChange: (next: TouchLayoutMap) => void;
  onTouchScaleChange: (nextScale: number) => void;
  onTouchOpacityChange: (nextOpacity: number) => void;
  onResetLayout: () => void;
  onToggleEditMode: () => void;
}

interface ActiveButtonSpec {
  id: Exclude<TouchControlId, 'dpad'>;
  label: string;
  subLabel: string;
  category: 'attack' | 'defense' | 'skill';
  sizeClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const ACTION_BUTTONS: ActiveButtonSpec[] = [
  {
    id: 'attack1',
    label: 'ATTACK 1',
    subLabel: 'STRIKE',
    category: 'attack',
    sizeClass: 'w-[72px] h-[72px]',
    bgClass: 'bg-[#B45309]/88 active:bg-[#D97706]',
    borderClass: 'border-[#FDE68A]',
    textClass: 'text-[#FFFBEB]',
  },
  {
    id: 'defend',
    label: 'DEFEND',
    subLabel: 'GUARD',
    category: 'defense',
    sizeClass: 'w-15 h-15',
    bgClass: 'bg-[#1E3A5F]/90 active:bg-[#0284C7]',
    borderClass: 'border-[#7DD3FC]',
    textClass: 'text-[#F0F9FF]',
  },
  {
    id: 'potion',
    label: 'POTION',
    subLabel: 'HEAL',
    category: 'skill',
    sizeClass: 'w-15 h-15',
    bgClass: 'bg-[#991B1B]/90 active:bg-[#DC2626]',
    borderClass: 'border-[#FCA5A5]',
    textClass: 'text-[#FEF2F2]',
  },
  {
    id: 'dash',
    label: 'DASH',
    subLabel: 'EVADE',
    category: 'skill',
    sizeClass: 'w-14 h-14',
    bgClass: 'bg-[#0F766E]/85 active:bg-[#14B8A6]',
    borderClass: 'border-[#5EEAD4]',
    textClass: 'text-[#F0FDFA]',
  },
  {
    id: 'special',
    label: 'SERUM',
    subLabel: 'VST',
    category: 'skill',
    sizeClass: 'w-16 h-16',
    bgClass: 'bg-[#3F6212]/90 active:bg-[#65A30D]',
    borderClass: 'border-[#BEF264]',
    textClass: 'text-[#ECFCCB]',
  },
];

export function TouchControls({
  layout,
  touchScale,
  touchOpacity,
  editMode,
  astral,
  specialCost,
  presetsCollected,
  presetsMax,
  serumEffectivePower,
  medkitCount,
  hp,
  maxHp,
  equippedWeaponKind,
  defending,
  onMove,
  onAction,
  onDefendChange,
  onLayoutChange,
  onTouchScaleChange,
  onTouchOpacityChange,
  onResetLayout,
  onToggleEditMode,
}: TouchControlsProps) {
  const [dpadDir, setDpadDir] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<TouchControlId | null>(null);

  const dpadRef = useRef<HTMLDivElement | null>(null);
  const dpadPointerId = useRef<number | null>(null);
  const defendPointerId = useRef<number | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const dragStartOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const serumReady = presetsCollected >= SERUM_PRESET_COST_PER_CAST && astral >= specialCost;
  const effectivePct = Math.round(serumEffectivePower * 100);
  const scalePct = Math.round(touchScale * 100);
  const opacityPct = Math.round(touchOpacity * 100);
  const weaponShort = getWeaponShortLabel(equippedWeaponKind);

  const startControlDrag = (id: TouchControlId, e: ReactPointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    dragPointerId.current = e.pointerId;
    dragStartOffset.current = {
      dx: e.clientX - centerX,
      dy: e.clientY - centerY,
    };
    setDraggingId(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveControlDrag = (id: TouchControlId, e: ReactPointerEvent<HTMLElement>) => {
    if (draggingId !== id || dragPointerId.current !== e.pointerId) return;
    e.preventDefault();
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const nextX = ((e.clientX - dragStartOffset.current.dx) / vw) * 100;
    const nextY = ((e.clientY - dragStartOffset.current.dy) / vh) * 100;
    onLayoutChange({
      ...layout,
      [id]: clampTouchCoord({ x: nextX, y: nextY }),
    });
  };

  const endControlDrag = (id: TouchControlId, e: ReactPointerEvent<HTMLElement>) => {
    if (draggingId !== id || dragPointerId.current !== e.pointerId) return;
    dragPointerId.current = null;
    setDraggingId(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
  };

  const updateDpadFromPointer = (clientX: number, clientY: number) => {
    const el = dpadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const rx = clientX - cx;
    const ry = clientY - cy;
    const dist = Math.hypot(rx, ry);
    const deadzone = rect.width * 0.11;

    if (dist < deadzone) {
      setDpadDir({ x: 0, y: 0 });
      onMove(0, 0);
      return;
    }

    const angle = Math.atan2(ry, rx);
    const octant = Math.round(angle / (Math.PI / 4));
    const snapped = octant * (Math.PI / 4);
    const dx = Math.cos(snapped);
    const dy = Math.sin(snapped);
    setDpadDir({ x: Math.round(dx), y: Math.round(dy) });
    onMove(dx, dy);
  };

  const handleDpadDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editMode) {
      startControlDrag('dpad', e);
      return;
    }
    e.preventDefault();
    dpadPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateDpadFromPointer(e.clientX, e.clientY);
  };

  const handleDpadMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editMode) {
      moveControlDrag('dpad', e);
      return;
    }
    if (dpadPointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateDpadFromPointer(e.clientX, e.clientY);
  };

  const handleDpadUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editMode) {
      endControlDrag('dpad', e);
      return;
    }
    if (dpadPointerId.current !== e.pointerId) return;
    dpadPointerId.current = null;
    setDpadDir({ x: 0, y: 0 });
    onMove(0, 0);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const isCustomLayout =
    (Object.keys(DEFAULT_TOUCH_LAYOUT) as TouchControlId[]).some(
      (id) =>
        Math.abs(layout[id].x - DEFAULT_TOUCH_LAYOUT[id].x) > 0.5 ||
        Math.abs(layout[id].y - DEFAULT_TOUCH_LAYOUT[id].y) > 0.5
    ) ||
    Math.abs(touchScale - DEFAULT_TOUCH_STYLE.scale) > 0.01 ||
    Math.abs(touchOpacity - DEFAULT_TOUCH_STYLE.opacity) > 0.01;

  return (
    <div
      data-testid="touch-controls-overlay"
      data-touch-scale={scalePct}
      data-touch-opacity={opacityPct}
      onContextMenu={(e) => e.preventDefault()}
      className="pointer-events-none fixed inset-0 z-30 no-long-press"
    >
      {/* Edit Mode Floating Header Banner with Live Size & Opacity Sliders */}
      {editMode && (
        <div
          data-testid="touch-edit-banner"
          className="pointer-events-auto fixed top-[118px] sm:top-20 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 max-w-[calc(100vw-20px)] px-3.5 py-2.5 bg-[#14100E]/96 border-2 border-[#D97706] shadow-xl"
        >
          <div className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-[#D97706] shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold text-[#FDE68A] whitespace-nowrap">
              Drag pads · Resize · Opacity
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E7E5E4] whitespace-nowrap">
            <span>Size</span>
            <input
              type="range"
              min={Math.round(TOUCH_SCALE_MIN * 100)}
              max={Math.round(TOUCH_SCALE_MAX * 100)}
              step={5}
              value={scalePct}
              data-testid="touch-edit-scale-slider"
              aria-label="Touch controls size"
              onChange={(e) => onTouchScaleChange(Number(e.target.value) / 100)}
              className="w-20 sm:w-24 accent-[#D97706] cursor-pointer"
            />
            <span
              data-testid="touch-edit-scale-value"
              className="font-mono-num text-[#BEF264] w-9 text-right"
            >
              {scalePct}%
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E7E5E4] whitespace-nowrap">
            <span>Opacity</span>
            <input
              type="range"
              min={Math.round(TOUCH_OPACITY_MIN * 100)}
              max={Math.round(TOUCH_OPACITY_MAX * 100)}
              step={5}
              value={opacityPct}
              data-testid="touch-edit-opacity-slider"
              aria-label="Touch controls opacity"
              onChange={(e) => onTouchOpacityChange(Number(e.target.value) / 100)}
              className="w-20 sm:w-24 accent-[#D97706] cursor-pointer"
            />
            <span
              data-testid="touch-edit-opacity-value"
              className="font-mono-num text-[#BEF264] w-9 text-right"
            >
              {opacityPct}%
            </span>
          </label>

          <div className="flex items-center gap-1.5">
            {isCustomLayout && (
              <button
                type="button"
                data-testid="touch-edit-reset"
                onClick={onResetLayout}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#D6D3D1] bg-[#211B18] border border-[#574A3E] hover:border-[#D97706] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset
              </button>
            )}
            <button
              type="button"
              data-testid="touch-edit-done"
              onClick={onToggleEditMode}
              className="px-3 py-1 font-pixel text-[10px] text-[#100D0B] bg-[#D97706] border border-[#FDE68A] hover:bg-[#F59E0B] cursor-pointer whitespace-nowrap"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* Movable & Resizable 8-Way Movement D-Pad */}
      <div
        ref={dpadRef}
        role="group"
        aria-label="Movement D-Pad"
        data-testid="touch-dpad"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handleDpadDown}
        onPointerMove={handleDpadMove}
        onPointerUp={handleDpadUp}
        onPointerCancel={handleDpadUp}
        style={{
          left: `${layout.dpad.x}%`,
          top: `${layout.dpad.y}%`,
          transform: `translate(-50%, -50%) scale(${touchScale})`,
          transformOrigin: 'center',
          opacity: touchOpacity,
        }}
        className={`pointer-events-auto absolute w-32 h-32 rounded-full bg-[#14100E]/82 border-2 flex items-center justify-center no-long-press ${
          editMode
            ? 'border-dashed border-[#D97706] cursor-grab active:cursor-grabbing ring-2 ring-[#D97706]/40'
            : 'border-[#574A3E]/90'
        }`}
      >
        <div className="relative w-24 h-24 pointer-events-none">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-8 h-24 bg-[#241E1A] border-2 border-[#574A3E]" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-24 h-8 bg-[#241E1A] border-2 border-[#574A3E]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-[#171310] border border-[#3E342C] flex items-center justify-center">
            {editMode ? (
              <Move className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-[#574A3E]" />
            )}
          </div>

          <div
            className={`absolute left-1/2 top-1.5 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[9px] border-l-transparent border-r-transparent ${
              dpadDir.y < 0 ? 'border-b-[#F59E0B]' : 'border-b-[#A8A29E]'
            }`}
          />
          <div
            className={`absolute left-1/2 bottom-1.5 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[9px] border-l-transparent border-r-transparent ${
              dpadDir.y > 0 ? 'border-t-[#F59E0B]' : 'border-t-[#A8A29E]'
            }`}
          />
          <div
            className={`absolute top-1/2 left-1.5 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[9px] border-t-transparent border-b-transparent ${
              dpadDir.x < 0 ? 'border-r-[#F59E0B]' : 'border-r-[#A8A29E]'
            }`}
          />
          <div
            className={`absolute top-1/2 right-1.5 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[9px] border-t-transparent border-b-transparent ${
              dpadDir.x > 0 ? 'border-l-[#F59E0B]' : 'border-l-[#A8A29E]'
            }`}
          />
        </div>
      </div>

      {/* Individually Movable & Resizable Attack 1, Defend, Potion, Dash & Serum VST Buttons */}
      {ACTION_BUTTONS.map((btn) => {
        const pos = layout[btn.id];
        const isAttack1 = btn.id === 'attack1';
        const isDefend = btn.id === 'defend';
        const isSpecial = btn.id === 'special';
        const isPotion = btn.id === 'potion';
        const potionReady = medkitCount > 0 && hp < maxHp;
        const isReady = isSpecial ? serumReady : isPotion ? medkitCount > 0 : true;

        const specialSubLabel =
          presetsCollected < SERUM_PRESET_COST_PER_CAST
            ? `VST ${presetsCollected}/${presetsMax}`
            : serumReady
              ? `${presetsCollected}/${presetsMax} · ${effectivePct}%`
              : `VST ${astral}/${specialCost}`;
        const potionSubLabel = medkitCount > 0 ? `HEAL · x${medkitCount}` : 'EMPTY';
        const defendSubLabel = defending ? 'GUARDING!' : 'GUARD -65%';
        const resolvedSubLabel = isAttack1
          ? weaponShort
          : isDefend
            ? defendSubLabel
            : isSpecial
              ? specialSubLabel
              : isPotion
                ? potionSubLabel
                : btn.subLabel;

        const buttonOpacity = !isReady && !editMode ? touchOpacity * 0.45 : touchOpacity;

        return (
          <button
            key={btn.id}
            type="button"
            tabIndex={-1}
            data-testid={`touch-btn-${btn.id}`}
            aria-label={
              editMode
                ? `Drag to move ${btn.label} button`
                : isPotion
                  ? `Healing Potion Shortcut (${medkitCount} left)`
                  : isDefend
                    ? 'Defend (Hold to reduce incoming damage)'
                    : isAttack1
                      ? `Attack 1 (${weaponShort})`
                      : `${btn.subLabel} ${btn.label}`
            }
            aria-pressed={isDefend ? defending : undefined}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (editMode) {
                startControlDrag(btn.id, e);
                return;
              }
              e.preventDefault();
              if (isDefend) {
                defendPointerId.current = e.pointerId;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore synthetic pointer events
                }
                onDefendChange(true);
                return;
              }
              onAction(btn.id);
            }}
            onPointerMove={(e) => {
              if (editMode) moveControlDrag(btn.id, e);
            }}
            onPointerUp={(e) => {
              if (editMode) {
                endControlDrag(btn.id, e);
                return;
              }
              if (isDefend && (defendPointerId.current === e.pointerId || defendPointerId.current === null)) {
                defendPointerId.current = null;
                onDefendChange(false);
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }
            }}
            onPointerCancel={(e) => {
              if (editMode) {
                endControlDrag(btn.id, e);
                return;
              }
              if (isDefend) {
                defendPointerId.current = null;
                onDefendChange(false);
              }
            }}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) scale(${touchScale})`,
              transformOrigin: 'center',
              opacity: buttonOpacity,
            }}
            className={`pointer-events-auto absolute rounded-full border-2 flex flex-col items-center justify-center shadow-[0_4px_0_rgba(8,6,5,0.85)] no-long-press transition-[box-shadow,background-color] ${
              btn.sizeClass
            } ${btn.bgClass} ${btn.textClass} ${
              editMode
                ? 'border-dashed border-[#D97706] cursor-grab active:cursor-grabbing ring-2 ring-[#D97706]/40'
                : isDefend && defending
                  ? 'border-[#E0F2FE] bg-[#0284C7] ring-4 ring-[#38BDF8]/75'
                  : isSpecial && serumReady
                    ? 'border-[#BEF264] ring-2 ring-[#84CC16]/60'
                    : isPotion && potionReady
                      ? 'border-[#FECACA] ring-2 ring-[#EF4444]/65'
                      : btn.borderClass
            }`}
          >
            {editMode && (
              <Move className="w-3 h-3 text-[#FDE68A] mb-0.5 pointer-events-none" aria-hidden="true" />
            )}
            <span
              className={`font-pixel leading-none whitespace-nowrap pointer-events-none ${
                isAttack1 ? 'text-[7px] tracking-tight' : 'text-[8px] sm:text-[9px]'
              }`}
            >
              {btn.label}
            </span>
            <span className="text-[8px] font-semibold uppercase tracking-wider opacity-90 mt-0.5 leading-none pointer-events-none">
              {resolvedSubLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
