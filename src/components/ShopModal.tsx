import { useState } from 'react';
import { Coins, FlaskConical, Heart, ShoppingBag, X } from 'lucide-react';
import { HudSnapshot } from '../game/engine';
import {
  RARITY_META,
  SERUM_PRESET_COST_PER_CAST,
  SERUM_PRESETS_MAX,
  SHOPKEEPER_GREETING,
  SHOP_PRICES,
  formatItemBonuses,
  getItemGoldValue,
} from '../game/rpg';

interface ShopModalProps {
  hud: HudSnapshot;
  onBuyPotion: () => { ok: boolean; message: string };
  onBuyPreset: (count?: number) => { ok: boolean; message: string };
  onSellItem: (itemId: string) => { ok: boolean; message: string; goldEarned: number };
  onClose: () => void;
}

export function ShopModal({
  hud,
  onBuyPotion,
  onBuyPreset,
  onSellItem,
  onClose,
}: ShopModalProps) {
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const presetsMissing = Math.max(0, hud.presetsMax - hud.presetsCollected);
  const canBuyPotion = hud.gold >= SHOP_PRICES.healingPotion;
  const canBuy1Preset = presetsMissing >= 1 && hud.gold >= SHOP_PRICES.presetFile;
  const canBuy2Presets = presetsMissing >= 2 && hud.gold >= SHOP_PRICES.presetFileBundle2;

  const handleBuyPotion = () => {
    const res = onBuyPotion();
    setStatusMsg({ text: res.message, ok: res.ok });
  };

  const handleBuyPreset = (count: number) => {
    const res = onBuyPreset(count);
    setStatusMsg({ text: res.message, ok: res.ok });
  };

  const handleSell = (itemId: string) => {
    const res = onSellItem(itemId);
    setStatusMsg({ text: res.message, ok: res.ok });
  };

  return (
    <div
      data-testid="shop-modal"
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090706]/92 p-3 sm:p-5 no-long-press"
      role="dialog"
      aria-modal="true"
      aria-label="Hooded Shopkeeper Stall"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-[#151114] border-2 border-[#B45309] shadow-[0_24px_64px_rgba(0,0,0,0.92)] overflow-hidden">
        {/* Header Bar with Hooded Cloak Merchant Portrait & Exact Quote */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 bg-[#100C0F] border-b border-[#44352A]">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Pixel-Inspired Hooded Cloak Merchant Emblem */}
            <div className="flex items-center justify-center w-13 h-13 shrink-0 bg-[#1B1421] border-2 border-[#B45309] shadow-[inset_0_0_14px_rgba(245,158,11,0.22)]">
              <svg viewBox="0 0 32 32" className="w-10 h-10 pixelated" aria-hidden="true">
                {/* Pointed medieval hood */}
                <path d="M16 3 L26 12 L27 29 L5 29 L6 12 Z" fill="#2A2233" stroke="#090707" strokeWidth="1.5" />
                <path d="M16 5 L23 12 L23 28 L9 28 L9 12 Z" fill="#1B1522" />
                {/* Deep shadowed face hollow */}
                <rect x="10" y="12" width="12" height="8" fill="#070508" />
                {/* Glowing amber eyes */}
                <rect x="12" y="15" width="2.5" height="2.2" fill="#FEF08A" />
                <rect x="17.5" y="15" width="2.5" height="2.2" fill="#FEF08A" />
                {/* Cloak bronze trim */}
                <rect x="9" y="23" width="14" height="2" fill="#B45309" />
                <rect x="15" y="23" width="2" height="2" fill="#FDE68A" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-pixel text-[11px] sm:text-sm text-[#FDE68A] tracking-wide">
                  THE HOODED SHOPKEEPER
                </h2>
                <span className="text-[10px] font-mono-num uppercase px-1.5 py-0.5 bg-[#261D15] border border-[#92400E] text-[#FBBF24]">
                  FIXED GOLD RATES
                </span>
              </div>
              <p
                data-testid="shopkeeper-greeting"
                className="mt-1 text-xs sm:text-sm italic text-[#FEF3C7] leading-snug"
              >
                &ldquo;{SHOPKEEPER_GREETING}&rdquo;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Shop"
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Live Purse & Supply Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-[#1B1512] border-b border-[#3A3028] text-xs font-mono-num">
          <div className="flex flex-wrap items-center gap-4">
            <span
              data-testid="shop-gold-balance"
              className="inline-flex items-center gap-1.5 font-bold text-[#FDE047] text-sm"
            >
              <Coins className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
              {hud.gold} GOLD
            </span>
            <span className="text-[#34D399]">
              POTIONS: <strong>{hud.medkitCount}</strong>
            </span>
            <span data-testid="shop-presets-count" className="text-[#BEF264]">
              SAMPLE PACKS: <strong>{hud.presetsCollected}/{hud.presetsMax}</strong>
            </span>
          </div>
          <span className="text-[#A8A29E] text-[11px]">
            Room {hud.roomNumber}/{hud.totalRooms} · Lv.{hud.level}
          </span>
        </div>

        {/* Transaction Confirmation Banner */}
        {statusMsg && (
          <div
            data-testid="shop-status-msg"
            className={`px-4 sm:px-5 py-2 text-xs font-semibold border-b ${
              statusMsg.ok
                ? 'bg-[#1D2816] border-[#65A30D] text-[#ECFCCB]'
                : 'bg-[#2E1618] border-[#DC2626] text-[#FECACA]'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Main 2-Column Body: Buy Stock (Left) & Sell Satchel (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
          {/* BUY WARES */}
          <div className="flex flex-col gap-3 p-4 sm:p-5 bg-[#120E10] border-b md:border-b-0 md:border-r border-[#3A3028] overflow-y-auto retro-scroll">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#FDE68A]">
                <ShoppingBag className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
                Buy Wares
              </h3>
              <span className="text-[11px] font-mono-num text-[#A8A29E]">
                Serum VST uses {SERUM_PRESET_COST_PER_CAST} Packs/cast
              </span>
            </div>

            {/* Healing Potion */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#1A1513] border border-[#4D3B2E]">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#261416] border border-[#DC2626]">
                  <Heart className="w-5 h-5 text-[#F87171]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F5EFE6]">Healing Potion</div>
                  <p className="text-[11px] text-[#A8A29E] mt-0.5">
                    Restores 45% Max HP immediately. Press [Q] anytime in battle.
                  </p>
                  <div className="mt-1 text-[11px] font-mono-num text-[#FDE047] font-bold">
                    Fixed Price: {SHOP_PRICES.healingPotion} Gold
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-buy-potion"
                disabled={!canBuyPotion}
                onClick={handleBuyPotion}
                className={`px-3 py-2 text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
                  canBuyPotion
                    ? 'bg-[#D97706] text-[#100D0B] border-[#FDE68A] hover:bg-[#F59E0B] cursor-pointer'
                    : 'bg-[#221C18] text-[#78716C] border-[#3A3028] cursor-not-allowed'
                }`}
              >
                Buy ({SHOP_PRICES.healingPotion}g)
              </button>
            </div>

            {/* Single Serum VST Sample Pack */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#171C13] border border-[#4D7C0F]">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#1B2613] border border-[#84CC16]">
                  <FlaskConical className="w-5 h-5 text-[#BEF264]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#ECFCCB]">
                    Serum VST Sample Pack
                  </div>
                  <p className="text-[11px] text-[#A8A29E] mt-0.5">
                    Adds +1 Sample Pack ({hud.presetsCollected}/{SERUM_PRESETS_MAX} held). Fuels
                    Serum VST power.
                  </p>
                  <div className="mt-1 text-[11px] font-mono-num text-[#FDE047] font-bold">
                    Fixed Price: {SHOP_PRICES.presetFile} Gold
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-buy-preset"
                disabled={!canBuy1Preset}
                onClick={() => handleBuyPreset(1)}
                className={`px-3 py-2 text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
                  canBuy1Preset
                    ? 'bg-[#84CC16] text-[#100D0B] border-[#ECFCCB] hover:bg-[#A3E635] cursor-pointer'
                    : 'bg-[#221C18] text-[#78716C] border-[#3A3028] cursor-not-allowed'
                }`}
              >
                {presetsMissing <= 0 ? 'MAXED' : `Buy (${SHOP_PRICES.presetFile}g)`}
              </button>
            </div>

            {/* 2x Serum VST Sample Packs Bundle */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#171C13] border border-[#3F6212]">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#1B2613] border border-[#65A30D]">
                  <FlaskConical className="w-5 h-5 text-[#A3E635]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#ECFCCB]">
                    2× Serum VST Sample Packs
                  </div>
                  <p className="text-[11px] text-[#A8A29E] mt-0.5">
                    Restocks 1 full Serum VST cast (+2 Sample Packs).
                  </p>
                  <div className="mt-1 text-[11px] font-mono-num text-[#FDE047] font-bold">
                    Fixed Price: {SHOP_PRICES.presetFileBundle2} Gold
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-buy-preset-2"
                disabled={!canBuy2Presets}
                onClick={() => handleBuyPreset(2)}
                className={`px-3 py-2 text-xs font-bold border whitespace-nowrap shrink-0 transition-colors ${
                  canBuy2Presets
                    ? 'bg-[#65A30D] text-[#100D0B] border-[#ECFCCB] hover:bg-[#84CC16] cursor-pointer'
                    : 'bg-[#221C18] text-[#78716C] border-[#3A3028] cursor-not-allowed'
                }`}
              >
                {presetsMissing < 2 ? 'NEED <9' : `Buy (${SHOP_PRICES.presetFileBundle2}g)`}
              </button>
            </div>

            {/* Live 10-Segment Sample Packs Gauge */}
            <div className="mt-auto p-3 bg-[#181412] border border-[#3A3028] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono-num">
                <span className="text-[#BEF264]">SERUM VST SAMPLE PACK GAUGE</span>
                <span className="font-bold text-[#ECFCCB]">
                  {hud.presetsCollected}/{hud.presetsMax} PACKS
                </span>
              </div>
              <div className="relative h-3 w-full bg-[#221D1A] border border-[#0B0908] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#84CC16] transition-[width] duration-150"
                  style={{ width: `${(hud.presetsCollected / Math.max(1, hud.presetsMax)) * 100}%` }}
                />
                <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                  {Array.from({ length: hud.presetsMax }).map((_, i) => (
                    <span key={i} className="border-r border-[#0B0908]/75 last:border-r-0" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SELL ITEMS */}
          <div className="flex flex-col gap-3 p-4 sm:p-5 bg-[#15110F] overflow-y-auto retro-scroll">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#FDE68A]">
                <Coins className="w-3.5 h-3.5 text-[#F59E0B]" aria-hidden="true" />
                Sell From Satchel ({hud.inventory.length})
              </h3>
              <span className="text-[11px] text-[#A8A29E]">Fixed value per item</span>
            </div>

            {hud.inventory.length === 0 ? (
              <div className="p-5 text-center bg-[#1A1512] border border-[#3A3028] text-xs text-[#A8A29E]">
                Your satchel is empty. Loot gear or consumables from maze rooms and chests to sell
                for Gold.
              </div>
            ) : (
              <div data-testid="shop-sell-list" className="space-y-2">
                {hud.inventory.map((item) => {
                  const goldVal = getItemGoldValue(item);
                  const rarity = RARITY_META[item.rarity];
                  const qty = item.quantity ?? 1;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2.5 p-2.5 bg-[#1A1512] border"
                      style={{ borderColor: rarity.color }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-[#F5EFE6] truncate">
                            {item.name}
                          </span>
                          {item.kind === 'consumable' && (
                            <span className="text-[11px] font-mono-num font-bold text-[#FDE68A]">
                              x{qty}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono-num text-[#A8A29E] truncate">
                          <span style={{ color: rarity.color }}>{rarity.label}</span>
                          {item.kind === 'equipment' && item.bonuses
                            ? ` · ${formatItemBonuses(item.bonuses)}`
                            : ` · ${item.description}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid={`btn-sell-item-${item.id}`}
                        onClick={() => handleSell(item.id)}
                        className="px-2.5 py-1.5 text-xs font-bold text-[#FDE047] bg-[#281E12] border border-[#B45309] hover:border-[#FDE047] hover:bg-[#382917] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Sell (+{goldVal}g)
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-[#100C0F] border-t border-[#44352A]">
          <span className="text-xs text-[#A8A29E]">
            The Shopkeeper appears every 6 levels in The Blight.
          </span>
          <button
            type="button"
            data-testid="btn-close-shop"
            onClick={onClose}
            className="px-5 py-2 font-pixel text-[10px] sm:text-[11px] text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] cursor-pointer"
          >
            LEAVE SHOP
          </button>
        </div>
      </div>
    </div>
  );
}
