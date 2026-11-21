import { Backpack, Check, Lock, Sparkles, X } from 'lucide-react';
import { HERO_NAME } from '../game/character';
import { HudSnapshot } from '../game/engine';
import {
  SKILL_BRANCHES,
  SKILL_TREE_NODES,
  canUnlockSkill,
  getSkillRank,
} from '../game/rpg';

interface SkillTreeModalProps {
  hud: HudSnapshot;
  onUnlockSkill: (skillId: string) => void;
  onOpenInventory: () => void;
  onClose: () => void;
}

export function SkillTreeModal({
  hud,
  onUnlockSkill,
  onOpenInventory,
  onClose,
}: SkillTreeModalProps) {
  const xpPct = Math.min(100, Math.round((hud.xp / Math.max(1, hud.xpToNext)) * 100));

  return (
    <div
      data-testid="skill-tree-modal"
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090706]/92 p-3 sm:p-4 no-long-press"
      role="dialog"
      aria-modal="true"
      aria-label="Blood and Ash Skill Tree"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[94vh] bg-[#161210] border-2 border-[#574A3E] shadow-[0_24px_64px_rgba(0,0,0,0.88)] overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-3.5 sm:px-5 py-3 bg-[#100D0B] border-b border-[#3A3028]">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#84CC16] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-pixel text-[11px] sm:text-sm text-[#FDE68A] tracking-wide truncate">
                  BLOOD &amp; ASH SKILL TREE
                </h2>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] sm:text-[11px] font-mono-num text-[#BEF264]">
                  <span>
                    {HERO_NAME} · LEVEL {hud.level}
                  </span>
                  <span>·</span>
                  <span>
                    XP {hud.xp}/{hud.xpToNext} ({xpPct}%)
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close skill tree"
              className="sm:hidden inline-flex items-center justify-center w-8 h-8 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <div
              data-testid="skill-points-readout"
              className={`px-2.5 sm:px-3 py-1.5 border font-pixel text-[10px] sm:text-xs ${
                hud.skillPoints > 0
                  ? 'bg-[#362612] border-[#FDE047] text-[#FDE68A]'
                  : 'bg-[#1A1512] border-[#3E342C] text-[#A8A29E]'
              }`}
            >
              {hud.skillPoints} SKILL {hud.skillPoints === 1 ? 'PT' : 'PTS'}
            </div>

            <button
              type="button"
              data-testid="btn-switch-inventory"
              onClick={onOpenInventory}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-[#F5EFE6] bg-[#241E1A] border border-[#574A3E] hover:border-[#D97706] cursor-pointer whitespace-nowrap"
            >
              <Backpack className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
              Inventory
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close skill tree"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Unspent Skill Point Callout */}
        {hud.skillPoints > 0 && (
          <div
            data-testid="skill-point-banner"
            className="px-4 py-2 bg-[#2B1F11] border-b border-[#D97706] text-center font-pixel text-[10px] sm:text-xs text-[#FDE68A]"
          >
            SKILL POINT EARNED! CHOOSE A NODE BELOW TO EMPOWER {HERO_NAME}
          </div>
        )}

        {/* 3-Branch Skill Tree Grid */}
        <div className="flex-1 overflow-y-auto retro-scroll p-3.5 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {SKILL_BRANCHES.map((branch) => {
              const nodes = SKILL_TREE_NODES.filter((n) => n.branch === branch.id).sort(
                (a, b) => a.tier - b.tier
              );

              return (
                <section
                  key={branch.id}
                  className="flex flex-col bg-[#120E0C] border border-[#3A3028] p-3 space-y-2.5"
                >
                  <div className="pb-1.5 border-b border-[#322923]">
                    <h3
                      className="font-pixel text-xs tracking-wide"
                      style={{ color: branch.color }}
                    >
                      {branch.label.toUpperCase()}
                    </h3>
                    <p className="text-[11px] text-[#A8A29E] mt-0.5">{branch.desc}</p>
                  </div>

                  <div className="flex flex-col items-stretch">
                    {nodes.map((node, idx) => {
                      const rank = getSkillRank(hud.skillRanks, node.id);
                      const maxed = rank >= node.maxRank;
                      const unlockable = canUnlockSkill(node.id, hud.skillRanks, hud.skillPoints);
                      const prereqMet =
                        !node.requires || getSkillRank(hud.skillRanks, node.requires) > 0;

                      return (
                        <div key={node.id} className="flex flex-col items-center">
                          {idx > 0 && (
                            <div
                              className="w-1 h-2.5"
                              style={{
                                backgroundColor: prereqMet ? branch.color : '#3A3028',
                              }}
                            />
                          )}

                          <button
                            type="button"
                            data-testid={`skill-node-${node.id}`}
                            disabled={!unlockable}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onUnlockSkill(node.id);
                            }}
                            className={`w-full text-left p-2.5 border-2 transition-colors ${
                              maxed
                                ? 'bg-[#1E2716] border-[#84CC16]'
                                : unlockable
                                  ? 'bg-[#261E16] border-[#D97706] hover:bg-[#33271A] cursor-pointer'
                                  : rank > 0
                                    ? 'bg-[#1D1815] border-[#574A3E]'
                                    : 'bg-[#161210] border-[#2E2620] opacity-65'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs sm:text-[13px] font-semibold text-[#F5EFE6]">
                                  {node.name}
                                </div>
                                <div
                                  className="text-[10px] font-semibold uppercase tracking-wider"
                                  style={{ color: branch.color }}
                                >
                                  Tier {node.tier} {node.tier === 4 ? '· Capstone' : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 font-mono-num text-xs font-bold shrink-0">
                                {maxed ? (
                                  <span className="inline-flex items-center gap-0.5 text-[#84CC16]">
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                    MAX
                                  </span>
                                ) : !prereqMet ? (
                                  <Lock className="w-3.5 h-3.5 text-[#78716C]" aria-hidden="true" />
                                ) : (
                                  <span className={unlockable ? 'text-[#FDE68A]' : 'text-[#A8A29E]'}>
                                    {rank}/{node.maxRank}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-[#D6D3D1] mt-1 leading-snug">
                              {node.summary}
                            </p>

                            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-mono-num text-[#FDE68A]">
                                {node.effectPerRank}
                              </span>
                            </div>

                            {/* Rank Pips */}
                            <div className="mt-1.5 flex items-center gap-1">
                              {Array.from({ length: node.maxRank }).map((_, pipIdx) => (
                                <span
                                  key={pipIdx}
                                  className="h-1.5 flex-1 border border-[#100D0B]"
                                  style={{
                                    backgroundColor:
                                      pipIdx < rank ? branch.color : '#29221D',
                                  }}
                                />
                              ))}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#100D0B] border-t border-[#3A3028]">
          <span className="text-xs text-[#A8A29E]">
            Earn XP from foes, dungeon chests, and chamber clears. Every level-up grants a Skill Point.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 font-pixel text-[11px] text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] cursor-pointer"
          >
            RETURN TO BLIGHT
          </button>
        </div>
      </div>
    </div>
  );
}
