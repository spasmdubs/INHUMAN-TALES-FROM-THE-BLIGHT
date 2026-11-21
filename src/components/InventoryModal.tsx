import { useState } from 'react';
import {
  ArrowUpDown,
  Axe,
  Backpack,
  BookOpen,
  Flame,
  FlaskConical,
  Footprints,
  Gem,
  Hammer,
  Heart,
  Shield,
  Shirt,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import { HERO_NAME } from '../game/character';
import { HudSnapshot } from '../game/engine';
import {
  EquipSlot,
  InventoryItem,
  InventorySortMode,
  InventoryTypeFilter,
  RARITY_META,
  SERUM_PRESET_COST_PER_CAST,
  filterInventoryByType,
  formatItemBonuses,
  getItemGoldValue,
  sortInventoryItems,
} from '../game/rpg';

interface InventoryModalProps {
  hud: HudSnapshot;
  onEquipItem: (itemId: string) => void;
  onUseConsumable: (itemId: string) => void;
  onSalvageItem: (itemId: string) => void;
  onOpenSkillTree: () => void;
  onClose: () => void;
}

const EQUIP_SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'armor', label: 'Armor' },
  { slot: 'relic', label: 'Relic' },
  { slot: 'boots', label: 'Boots' },
];

const SORT_OPTIONS: { id: InventorySortMode; label: string }[] = [
  { id: 'type', label: 'Item Type' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'tier', label: 'Room Tier' },
];

const TYPE_FILTERS: { id: InventoryTypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'relic', label: 'Relics' },
  { id: 'boots', label: 'Boots' },
  { id: 'consumable', label: 'Consumables' },
];

function resolveItemIconKind(item: InventoryItem | null, fallbackSlot?: EquipSlot): string {
  if (!item) {
    return fallbackSlot ?? 'relic';
  }
  const lower = item.name.toLowerCase();
  if (item.kind === 'consumable') {
    if (item.consumableKind === 'medkit') return 'heart';
    if (item.consumableKind === 'overcharge') return 'flame';
    return 'flask';
  }
  const slot = item.slot ?? fallbackSlot;
  if (slot === 'weapon') {
    if (lower.includes('axe') || lower.includes('cleaver')) return 'axe';
    if (lower.includes('flail') || lower.includes('hammer') || lower.includes('mace')) return 'hammer';
    if (lower.includes('blade') || lower.includes('sword')) return 'sword';
    return 'swords';
  }
  if (slot === 'armor') {
    if (lower.includes('coat') || lower.includes('mantle') || lower.includes('robe')) return 'shirt';
    return 'shield';
  }
  if (slot === 'relic') {
    if (lower.includes('serum') || lower.includes('vial')) return 'flask';
    if (lower.includes('grimoire') || lower.includes('tome')) return 'book';
    if (lower.includes('bone') || lower.includes('skull') || lower.includes('talisman')) return 'skull';
    return 'gem';
  }
  if (slot === 'boots') {
    return 'footprints';
  }
  return 'gem';
}

function ItemGlyph({
  item,
  fallbackSlot,
  className = 'w-5 h-5',
  color,
}: {
  item: InventoryItem | null;
  fallbackSlot?: EquipSlot;
  className?: string;
  color: string;
}) {
  const kind = resolveItemIconKind(item, fallbackSlot);
  const props = { className, style: { color }, 'aria-hidden': true as const };

  switch (kind) {
    case 'axe':
      return <Axe {...props} />;
    case 'hammer':
      return <Hammer {...props} />;
    case 'sword':
      return <Sword {...props} />;
    case 'swords':
    case 'weapon':
      return <Swords {...props} />;
    case 'shirt':
      return <Shirt {...props} />;
    case 'shield':
    case 'armor':
      return <Shield {...props} />;
    case 'flask':
      return <FlaskConical {...props} />;
    case 'book':
      return <BookOpen {...props} />;
    case 'skull':
      return <Skull {...props} />;
    case 'footprints':
    case 'boots':
      return <Footprints {...props} />;
    case 'heart':
      return <Heart {...props} />;
    case 'flame':
      return <Flame {...props} />;
    default:
      return <Gem {...props} />;
  }
}

export function InventoryModal({
  hud,
  onEquipItem,
  onUseConsumable,
  onSalvageItem,
  onOpenSkillTree,
  onClose,
}: InventoryModalProps) {
  const [sortMode, setSortMode] = useState<InventorySortMode>('type');
  const [typeFilter, setTypeFilter] = useState<InventoryTypeFilter>('all');

  const sortedAll = sortInventoryItems(hud.inventory, sortMode);
  const filteredItems = filterInventoryByType(sortedAll, typeFilter);
  const consumables = filteredItems.filter((it) => it.kind === 'consumable');
  const gearItems = filteredItems.filter((it) => it.kind === 'equipment');
  const showConsumables = typeFilter === 'all' || typeFilter === 'consumable';
  const showGear = typeFilter !== 'consumable';

  const stats = hud.effectiveStats;
  const stacks = hud.powerUpStacks;
  const potencyPct = Math.round(hud.serumPotency * 100);
  const effectiveSerumPct = Math.round(hud.serumEffectivePower * 100);

  return (
    <div
      data-testid="inventory-modal"
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090706]/92 p-3 sm:p-5 no-long-press"
      role="dialog"
      aria-modal="true"
      aria-label="Inhuman Inventory and Equipment"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-[#161210] border-2 border-[#574A3E] shadow-[0_24px_64px_rgba(0,0,0,0.88)] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 bg-[#100D0B] border-b border-[#3A3028]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Backpack className="w-4 h-4 sm:w-5 sm:h-5 text-[#D97706] shrink-0" aria-hidden="true" />
            <h2 className="font-pixel text-[11px] sm:text-sm text-[#FDE68A] tracking-wide truncate">
              INVENTORY<span className="hidden sm:inline"> &amp; LOADOUT</span>
            </h2>
            <span className="hidden md:inline text-xs font-mono-num text-[#BEF264] whitespace-nowrap">
              {HERO_NAME} · LV.{hud.level} {hud.fighterClassLabel.toUpperCase()} · GOLD {hud.gold}g · KEYS {hud.keys}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              data-testid="btn-switch-skills"
              onClick={onOpenSkillTree}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-[#ECFCCB] bg-[#1E2716] border border-[#65A30D] hover:border-[#BEF264] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#84CC16] shrink-0" aria-hidden="true" />
              Skills{hud.skillPoints > 0 ? ` (${hud.skillPoints})` : ''}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inventory"
              className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Serum VST & Sample Packs + Equipped Slots + Computed Stats + Stacked Power-Ups */}
          <div className="flex flex-col gap-4 p-4 sm:p-5 bg-[#120E0C] border-b lg:border-b-0 lg:border-r border-[#3A3028] overflow-y-auto retro-scroll">
            {/* Serum VST & Sample Packs Mastery Box */}
            <section className="p-3 bg-[#1A1512] border border-[#4D7C0F] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#BEF264]">
                  <FlaskConical className="w-3.5 h-3.5 text-[#84CC16]" aria-hidden="true" />
                  Serum VST &amp; Sample Packs
                </h3>
                <span className="font-mono-num text-xs font-bold text-[#ECFCCB]">
                  {hud.presetsCollected}/{hud.presetsMax}
                </span>
              </div>

              <div className="relative h-2.5 w-full bg-[#25201C] border border-[#100D0B] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#84CC16] transition-[width] duration-150"
                  style={{ width: `${(hud.presetsCollected / Math.max(1, hud.presetsMax)) * 100}%` }}
                />
                <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                  {Array.from({ length: hud.presetsMax }).map((_, idx) => (
                    <span key={idx} className="border-r border-[#100D0B]/80 last:border-r-0" />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-num text-[#D6D3D1]">
                <span>Potency: {potencyPct}%</span>
                <span className="text-[#BEF264]">Active Power: {effectiveSerumPct}%</span>
              </div>
              <p className="text-[11px] text-[#A8A29E] leading-snug">
                Hold up to 10 Sample Packs for full Serum VST power. Each cast drains{' '}
                {SERUM_PRESET_COST_PER_CAST} Sample Packs; buy replacements from the Shopkeeper or
                loot maze chambers.
              </p>
            </section>

            {/* Equipped 4 Slots with Respective Item Icons */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                  Equipped Gear
                </h3>
                <span className="text-[11px] font-mono-num text-[#FDE68A]">
                  Room {hud.roomNumber}/{hud.totalRooms} · Keys {hud.keys}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {EQUIP_SLOTS.map(({ slot, label }) => {
                  const item = hud.equipped[slot];
                  const rarityColor = item ? RARITY_META[item.rarity].color : '#4D4137';
                  const iconKind = resolveItemIconKind(item, slot);
                  return (
                    <div
                      key={slot}
                      data-testid={`equipped-slot-${slot}`}
                      className="flex items-center gap-2.5 p-2.5 bg-[#1A1512] border"
                      style={{ borderColor: rarityColor }}
                    >
                      {/* Respective Item Icon Box */}
                      <div
                        data-testid={`equipped-icon-${slot}`}
                        data-item-icon={iconKind}
                        className="flex items-center justify-center w-10 h-10 shrink-0 border bg-[#110D0B]"
                        style={{
                          borderColor: item ? rarityColor : '#3A3028',
                          boxShadow: item ? `inset 0 0 10px ${rarityColor}26` : 'none',
                        }}
                        title={item ? `${item.name} (${label})` : `Empty ${label} slot`}
                      >
                        <ItemGlyph
                          item={item}
                          fallbackSlot={slot}
                          className="w-5 h-5"
                          color={item ? rarityColor : '#57534E'}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
                          <span className="text-[#A8A29E] font-semibold">{label}</span>
                          {item && (
                            <span className="font-semibold" style={{ color: rarityColor }}>
                              {RARITY_META[item.rarity].label}
                            </span>
                          )}
                        </div>
                        {item ? (
                          <>
                            <div className="mt-0.5 text-xs font-semibold text-[#F5EFE6] truncate">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#D6D3D1] font-mono-num truncate">
                              {formatItemBonuses(item.bonuses)}
                            </div>
                          </>
                        ) : (
                          <div className="mt-0.5 text-xs text-[#78716C] italic">Empty Slot</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Live Computed RPG Stats */}
            <section className="space-y-2 pt-2 border-t border-[#322923]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                Computed Combat Stats
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono-num">
                <StatRow label="Max HP" value={`${stats.maxHp}`} color="#34D399" />
                <StatRow
                  label="Melee ATK"
                  value={`${Math.round(stats.meleeDamageMult * 100)}%`}
                  color="#F59E0B"
                />
                <StatRow
                  label="Crit Rate"
                  value={`${Math.round(stats.critChance * 100)}%`}
                  color="#F43F5E"
                />
                <StatRow
                  label="Crit DMG"
                  value={`${Math.round(stats.critDamageMult * 100)}%`}
                  color="#FB7185"
                />
                <StatRow
                  label="Move SPD"
                  value={`${Math.round(stats.moveSpeedMult * 100)}%`}
                  color="#FBBF24"
                />
                <StatRow
                  label="Armor"
                  value={`${Math.round(stats.armorReduction * 100)}%`}
                  color="#D6D3D1"
                />
                <StatRow
                  label="Serum VST"
                  value={`${Math.round(stats.specialDamageMult * 100)}%`}
                  color="#84CC16"
                />
                <StatRow
                  label="Life Leech"
                  value={`+${stats.lifestealOnHit} HP`}
                  color="#FB7185"
                />
              </div>
            </section>

            {/* Stacking Room Boons (Persist Until Death) */}
            <section className="space-y-2 pt-2 border-t border-[#322923]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#FDE68A]">
                  <Flame className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
                  Stacked Room Boons ({stacks.totalStacks})
                </h3>
                <span className="text-[10px] text-[#A8A29E]">Until Death</span>
              </div>
              {stacks.totalStacks === 0 ? (
                <p className="text-xs text-[#A8A29E] leading-relaxed">
                  Clear locked maze chambers, smash dungeon chests, or invoke Blight Shrines to
                  collect stacking boons that compound until defeat.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-num">
                  {stacks.mightBonusPct > 0 && (
                    <StackBadge
                      label={`Might x${stacks.counts.might}`}
                      value={`+${stacks.mightBonusPct}% DMG`}
                      color="#F59E0B"
                    />
                  )}
                  {stacks.hasteBonusPct > 0 && (
                    <StackBadge
                      label={`Haste x${stacks.counts.haste}`}
                      value={`+${stacks.hasteBonusPct}% SPD`}
                      color="#FBBF24"
                    />
                  )}
                  {stacks.vitalityBonusHp > 0 && (
                    <StackBadge
                      label={`Vitality x${stacks.counts.vitality}`}
                      value={`+${stacks.vitalityBonusHp} HP`}
                      color="#10B981"
                    />
                  )}
                  {stacks.critChancePct > 0 && (
                    <StackBadge
                      label={`Crit x${stacks.counts.crit}`}
                      value={`+${stacks.critChancePct}%`}
                      color="#F43F5E"
                    />
                  )}
                  {stacks.lifestealOnHit > 0 && (
                    <StackBadge
                      label={`Siphon x${stacks.counts.siphon}`}
                      value={`+${stacks.lifestealOnHit} HP`}
                      color="#FB7185"
                    />
                  )}
                  {stacks.novaPowerPct > 0 && (
                    <StackBadge
                      label={`Serum VST x${stacks.counts.nova}`}
                      value={`+${stacks.novaPowerPct}%`}
                      color="#84CC16"
                    />
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sort & Filter Bar + Consumables & Backpack Gear */}
          <div className="flex flex-col min-h-0">
            {/* Inventory Sorting & Item Type Filter Toolbar */}
            <div className="flex flex-col gap-2 px-4 sm:px-5 py-3 bg-[#130F0D] border-b border-[#3A3028]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E]">
                    Sort By
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort inventory">
                  {SORT_OPTIONS.map((opt) => {
                    const active = sortMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`sort-mode-${opt.id}`}
                        onClick={() => setSortMode(opt.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#D97706] text-[#100D0B] border-[#FDE68A]'
                            : 'bg-[#1C1714] text-[#D6D3D1] border-[#443A32] hover:border-[#D97706]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by item type">
                {TYPE_FILTERS.map((f) => {
                  const active = typeFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-testid={`filter-type-${f.id}`}
                      onClick={() => setTypeFilter(f.id)}
                      className={`px-2 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#2B2219] text-[#FDE68A] border-[#D97706]'
                          : 'bg-[#171310] text-[#A8A29E] border-[#322923] hover:text-[#F5EFE6] hover:border-[#574A3E]'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto retro-scroll p-4 sm:p-5 space-y-6">
              {/* Consumables */}
              {showConsumables && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                      Quick Consumables (Press Q for Poultice)
                    </h3>
                    <span className="text-xs font-mono-num text-[#BEF264]">
                      HP {hud.hp}/{hud.maxHp} · SERUM VST {hud.astral}/{hud.maxAstral}
                    </span>
                  </div>
                  {consumables.length === 0 ? (
                    <p className="text-xs text-[#78716C] bg-[#1A1512] border border-[#3A3028] p-3">
                      No consumables in pack. Clear maze chambers or smash dungeon chests for
                      poultices and phials.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {consumables.map((item) => {
                        const rarityColor = RARITY_META[item.rarity].color;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-3 bg-[#1A1512] border border-[#443A32]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="flex items-center justify-center w-9 h-9 shrink-0 bg-[#110D0B] border"
                                style={{ borderColor: rarityColor }}
                              >
                                <ItemGlyph
                                  item={item}
                                  className="w-4 h-4"
                                  color={
                                    item.consumableKind === 'medkit'
                                      ? '#34D399'
                                      : item.consumableKind === 'overcharge'
                                        ? '#F59E0B'
                                        : '#84CC16'
                                  }
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-semibold text-[#F5EFE6] truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-[11px] font-mono-num font-bold text-[#FDE68A]">
                                    x{item.quantity ?? 1}
                                  </span>
                                  <span className="text-[10px] font-mono-num text-[#F59E0B]">
                                    {getItemGoldValue(item)}g
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              data-testid={`use-item-${item.consumableKind}`}
                              onClick={() => onUseConsumable(item.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-[#100D0B] bg-[#84CC16] border border-[#ECFCCB] hover:bg-[#A3E635] cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Use
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Looted Gear Backpack */}
              {showGear && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                      Equipment Satchel ({gearItems.length}) · Sorted by{' '}
                      {SORT_OPTIONS.find((s) => s.id === sortMode)?.label}
                    </h3>
                    <span className="text-[11px] text-[#A8A29E]">
                      Salvage spare gear for XP &amp; Blight Shards
                    </span>
                  </div>
                  {gearItems.length === 0 ? (
                    <div className="p-5 text-center bg-[#1A1512] border border-[#3A3028] text-xs text-[#A8A29E]">
                      {typeFilter === 'all'
                        ? 'Clear locked maze rooms, smash dungeon chests, or visit Blight Shrines to loot rarity-tiered weapons, armor, relics, and boots.'
                        : `No ${TYPE_FILTERS.find((t) => t.id === typeFilter)?.label.toLowerCase()} in your satchel yet.`}
                    </div>
                  ) : (
                    <div
                      data-testid="inventory-gear-grid"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                    >
                      {gearItems.map((item) => (
                        <GearCard
                          key={item.id}
                          item={item}
                          onEquip={() => onEquipItem(item.id)}
                          onSalvage={() => onSalvageItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[#100D0B] border-t border-[#3A3028]">
              <span className="text-xs text-[#A8A29E]">
                Chamber: <strong className="text-[#FDE68A]">{hud.sectorName}</strong> · Room{' '}
                {hud.roomNumber}/{hud.totalRooms} (Wing {hud.wingNumber}/{hud.totalWings})
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
      </div>
    </div>
  );
}

function GearCard({
  item,
  onEquip,
  onSalvage,
}: {
  item: InventoryItem;
  onEquip: () => void;
  onSalvage: () => void;
}) {
  const rarity = RARITY_META[item.rarity];
  return (
    <div
      data-testid={`gear-card-${item.slot ?? 'item'}`}
      className="flex flex-col justify-between gap-2.5 p-3 bg-[#1A1512] border"
      style={{ borderColor: rarity.color }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex items-center justify-center w-9 h-9 shrink-0 bg-[#110D0B] border mt-0.5"
          style={{
            borderColor: rarity.color,
            boxShadow: `inset 0 0 8px ${rarity.color}24`,
          }}
        >
          <ItemGlyph item={item} fallbackSlot={item.slot} className="w-4 h-4" color={rarity.color} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
            <span className="font-semibold" style={{ color: rarity.color }}>
              {rarity.label} {item.slot}
            </span>
            <span className="text-[#FDE047] font-mono-num font-bold">
              {getItemGoldValue(item)}g · R{item.waveLevel}
            </span>
          </div>
          <div className="mt-0.5 text-xs sm:text-sm font-semibold text-[#F5EFE6] truncate">
            {item.name}
          </div>
          <div className="mt-0.5 text-[11px] font-mono-num text-[#FDE68A]">
            {formatItemBonuses(item.bonuses)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onEquip}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-semibold text-[#100D0B] bg-[#D97706] border border-[#FDE68A] hover:bg-[#F59E0B] cursor-pointer"
        >
          <ItemGlyph item={item} fallbackSlot={item.slot} className="w-3.5 h-3.5" color="#100D0B" />
          Equip
        </button>
        <button
          type="button"
          onClick={onSalvage}
          aria-label={`Salvage ${item.name}`}
          title="Salvage for XP & Shards"
          className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-semibold text-[#FDA4AF] bg-[#291516] border border-[#7F1D1D] hover:border-[#F43F5E] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1A1512] border border-[#322923]">
      <span className="text-[#A8A29E]">{label}</span>
      <span className="font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function StackBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 bg-[#1A1512] border border-[#3A3028]">
      <span className="text-[#D6D3D1] truncate">{label}</span>
      <span className="font-bold whitespace-nowrap" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
