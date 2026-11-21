import { useState } from 'react';
import { FolderOpen, Save, Trash2, X } from 'lucide-react';
import { HERO_NAME } from '../game/character';
import {
  SAVE_SLOT_COUNT,
  SaveSlotEntry,
  countOccupiedSaveSlots,
  formatSaveTimestamp,
} from '../game/saves';

interface CurrentRunSummary {
  roomNumber: number;
  totalRooms: number;
  wingNumber: number;
  totalWings: number;
  sectorName: string;
  level: number;
  score: number;
  keys: number;
}

interface SaveLoadModalProps {
  mode: 'save-load' | 'load-only';
  slots: SaveSlotEntry[];
  currentRun?: CurrentRunSummary | null;
  statusMessage?: string | null;
  onSaveSlot: (slotIndex: number) => void;
  onLoadSlot: (slotIndex: number) => void;
  onDeleteSlot: (slotIndex: number) => void;
  onClose: () => void;
}

export function SaveLoadModal({
  mode,
  slots,
  currentRun,
  statusMessage,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onClose,
}: SaveLoadModalProps) {
  const [confirmOverwriteSlot, setConfirmOverwriteSlot] = useState<number | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);

  const canSave = mode === 'save-load';
  const occupiedCount = countOccupiedSaveSlots(slots);

  return (
    <div
      data-testid="save-load-modal"
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090706]/92 p-3 sm:p-4 no-long-press"
      role="dialog"
      aria-modal="true"
      aria-label={canSave ? 'Save and Load Chronicles' : 'Load Saved Chronicle'}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-[#161210] border-2 border-[#574A3E] shadow-[0_24px_64px_rgba(0,0,0,0.88)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-[#100D0B] border-b border-[#3A3028]">
          <div className="flex items-center gap-2.5 min-w-0">
            {canSave ? (
              <Save className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E0B] shrink-0" aria-hidden="true" />
            ) : (
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#84CC16] shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h2 className="font-pixel text-[11px] sm:text-sm text-[#FDE68A] tracking-wide truncate">
                {canSave ? 'SAVE & LOAD CHRONICLES' : 'LOAD SAVED CHRONICLE'}
              </h2>
              <div className="mt-0.5 text-[10px] sm:text-[11px] font-mono-num text-[#A8A29E]">
                {occupiedCount}/{SAVE_SLOT_COUNT} SAVE SLOTS USED
                {currentRun && canSave
                  ? ` · ACTIVE: RM ${currentRun.roomNumber}/${currentRun.totalRooms} · LV.${currentRun.level} · SCORE ${currentRun.score.toLocaleString()}`
                  : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-save-load"
            onClick={onClose}
            aria-label="Close save and load menu"
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            data-testid="save-load-status"
            className="px-4 py-2 bg-[#212B14] border-b border-[#65A30D] text-center font-mono-num text-xs font-semibold text-[#ECFCCB]"
          >
            {statusMessage}
          </div>
        )}

        {/* 6 Save Slots Grid */}
        <div className="flex-1 overflow-y-auto retro-scroll p-3.5 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: SAVE_SLOT_COUNT }).map((_, idx) => {
              const slotNum = idx + 1;
              const entry = slots[idx] ?? null;
              const isConfirmingOverwrite = confirmOverwriteSlot === idx;
              const isConfirmingDelete = confirmDeleteSlot === idx;

              return (
                <div
                  key={slotNum}
                  data-testid={`save-slot-${slotNum}`}
                  data-occupied={entry ? 'true' : 'false'}
                  className={`flex flex-col justify-between gap-2.5 p-3.5 border-2 transition-colors ${
                    entry
                      ? 'bg-[#1D1714] border-[#574A3E] hover:border-[#D97706]'
                      : 'bg-[#13100E] border-[#322922]'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-[10px] text-[#FDE68A]">
                          SLOT {slotNum}
                        </span>
                        {entry ? (
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-mono-num font-bold uppercase border ${
                              entry.summary.isBossRoom
                                ? 'bg-[#3B1316] border-[#DC2626] text-[#FCA5A5]'
                                : 'bg-[#251E18] border-[#D97706]/70 text-[#FDE68A]'
                            }`}
                          >
                            {entry.summary.isBossRoom ? 'BOSS ' : ''}RM {entry.summary.roomNumber}/
                            {entry.summary.totalRooms}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono-num uppercase bg-[#1A1614] border border-[#3E342C] text-[#78716C]">
                            EMPTY
                          </span>
                        )}
                      </div>

                      {entry ? (
                        <div className="mt-1 text-xs font-semibold text-[#F5EFE6] truncate">
                          {entry.summary.sectorName} · WING {entry.summary.wingNumber}/
                          {entry.summary.totalWings}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-[#78716C]">
                          No chronicle etched in this slot yet.
                        </div>
                      )}
                    </div>

                    {entry && (
                      <div className="text-right shrink-0">
                        <div className="font-mono-num text-[10px] text-[#A8A29E]">
                          {formatSaveTimestamp(entry.savedAt)}
                        </div>
                        <div className="font-mono-num text-[10px] font-bold text-[#BEF264] uppercase">
                          {entry.summary.difficulty}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slot Details when Occupied */}
                  {entry && (
                    <div className="grid grid-cols-3 gap-1.5 bg-[#120E0C] border border-[#322922] p-2 font-mono-num text-[10px]">
                      <div>
                        <div className="text-[#78716C] uppercase text-[9px]">{HERO_NAME}</div>
                        <div className="text-[#F5EFE6] font-bold truncate">
                          LV.{entry.summary.level} {entry.summary.fighterClassLabel}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#78716C] uppercase text-[9px]">VITALITY</div>
                        <div className="text-[#34D399] font-bold">
                          HP {entry.summary.hp}/{entry.summary.maxHp}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#78716C] uppercase text-[9px]">SCORE</div>
                        <div className="text-[#FDE68A] font-bold">
                          {entry.summary.score.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#78716C] uppercase text-[9px]">KEYS</div>
                        <div className="text-[#FBBF24] font-bold">{entry.summary.keys}</div>
                      </div>
                      <div>
                        <div className="text-[#78716C] uppercase text-[9px]">PACKS</div>
                        <div className="text-[#BEF264] font-bold">
                          {entry.summary.presetsCollected}/{entry.summary.presetsMax}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#78716C] uppercase text-[9px]">CHAMBER</div>
                        <div
                          className={`font-bold ${
                            entry.summary.roomCleared ? 'text-[#BEF264]' : 'text-[#FCA5A5]'
                          }`}
                        >
                          {entry.summary.roomCleared
                            ? 'EXIT OPEN'
                            : `${entry.summary.enemiesRemaining} FOES`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Overwrite / Delete Confirmation or Primary Actions */}
                  {isConfirmingOverwrite ? (
                    <div
                      data-testid={`confirm-overwrite-panel-${slotNum}`}
                      className="flex flex-wrap items-center justify-between gap-2 bg-[#2B1D10] border border-[#F59E0B] px-2.5 py-2"
                    >
                      <span className="text-[11px] font-semibold text-[#FDE68A]">
                        Overwrite Slot {slotNum}?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`btn-confirm-overwrite-slot-${slotNum}`}
                          onClick={() => {
                            setConfirmOverwriteSlot(null);
                            onSaveSlot(idx);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#100D0B] bg-[#F59E0B] border border-[#FEF3C7] hover:bg-[#FBBF24] cursor-pointer"
                        >
                          Confirm Overwrite
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-cancel-overwrite-slot-${slotNum}`}
                          onClick={() => setConfirmOverwriteSlot(null)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#D6D3D1] bg-[#1A1512] border border-[#443A32] hover:border-[#A8A29E] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div
                      data-testid={`confirm-delete-panel-${slotNum}`}
                      className="flex flex-wrap items-center justify-between gap-2 bg-[#2C1215] border border-[#DC2626] px-2.5 py-2"
                    >
                      <span className="text-[11px] font-semibold text-[#FCA5A5]">
                        Erase Slot {slotNum}?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`btn-confirm-delete-slot-${slotNum}`}
                          onClick={() => {
                            setConfirmDeleteSlot(null);
                            onDeleteSlot(idx);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#FEF2F2] bg-[#DC2626] border border-[#FCA5A5] hover:bg-[#EF4444] cursor-pointer"
                        >
                          Erase Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSlot(null)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#D6D3D1] bg-[#1A1512] border border-[#443A32] hover:border-[#A8A29E] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {entry ? (
                        <>
                          <button
                            type="button"
                            data-testid={`btn-load-slot-${slotNum}`}
                            onClick={() => onLoadSlot(idx)}
                            className="flex-1 min-w-[92px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#100D0B] bg-[#84CC16] border border-[#ECFCCB] hover:bg-[#A3E635] transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                            Load Slot {slotNum}
                          </button>

                          {canSave && (
                            <button
                              type="button"
                              data-testid={`btn-overwrite-slot-${slotNum}`}
                              onClick={() => {
                                setConfirmDeleteSlot(null);
                                setConfirmOverwriteSlot(idx);
                              }}
                              className="flex-1 min-w-[92px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#FDE68A] bg-[#2B1F14] border border-[#D97706] hover:bg-[#3A2918] transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" aria-hidden="true" />
                              Overwrite
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid={`btn-delete-slot-${slotNum}`}
                            aria-label={`Delete Save Slot ${slotNum}`}
                            title={`Delete Save Slot ${slotNum}`}
                            onClick={() => {
                              setConfirmOverwriteSlot(null);
                              setConfirmDeleteSlot(idx);
                            }}
                            className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs text-[#FCA5A5] bg-[#241314] border border-[#7F1D1D] hover:border-[#DC2626] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </>
                      ) : canSave ? (
                        <button
                          type="button"
                          data-testid={`btn-save-slot-${slotNum}`}
                          onClick={() => onSaveSlot(idx)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#100D0B] bg-[#D97706] border border-[#FDE68A] hover:bg-[#F59E0B] transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" aria-hidden="true" />
                          Save to Slot {slotNum}
                        </button>
                      ) : (
                        <div className="w-full text-center py-1.5 text-[11px] font-mono-num text-[#78716C] border border-dashed border-[#322922]">
                          Start a run to save into Slot {slotNum}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#100D0B] border-t border-[#3A3028] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A8A29E]">
          <span>
            Saves preserve room progress, maze shortcuts, keys, gear, Sample Packs, level &amp; Skill Points.
          </span>
          <span className="font-mono-num text-[#FDE68A]">ESC to Close</span>
        </div>
      </div>
    </div>
  );
}
