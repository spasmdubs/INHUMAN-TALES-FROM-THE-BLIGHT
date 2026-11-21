import {
  CharacterConfig,
  CLOTHING_COLORS,
  EYE_COLORS,
  HAIR_COLORS,
  SHOE_COLORS,
  SKIN_TONES,
  findSwatch,
} from './character';
import { DoorDirection, ItemRarity, WeaponVisualKind } from './rpg';
import { EnemyArchetype } from './rules';

export type SpriteAnimPose =
  | 'idle'
  | 'walk'
  | 'punch1'
  | 'punch2'
  | 'punch3'
  | 'kick'
  | 'airkick'
  | 'defend'
  | 'special'
  | 'dash'
  | 'hurt'
  | 'ko';

export interface HeroRenderState {
  x: number;
  y: number;
  z: number;
  facingLeft: boolean;
  pose: SpriteAnimPose;
  animTime: number;
  walkPhase: number;
  scaleX: number;
  scaleY: number;
  hitFlash: boolean;
  invulnBlink: boolean;
  weaponKind?: WeaponVisualKind;
  weaponRarity?: ItemRarity;
  attackProgress?: number;
  defendTimer?: number;
}

const OUTLINE = '#0C0A09';

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawIsometricShadow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  radiusX: number,
  zHeight: number
) {
  const scale = Math.max(0.45, 1 - zHeight / 55);
  const rx = Math.max(3, Math.round(radiusX * scale));
  const ry = Math.max(2, Math.round(rx * 0.45));
  ctx.fillStyle = 'rgba(8, 6, 6, 0.58)';
  ctx.fillRect(Math.round(sx - rx), Math.round(sy - ry + 1), rx * 2, ry * 2 - 2);
  ctx.fillRect(Math.round(sx - rx + 2), Math.round(sy - ry), (rx - 2) * 2, ry * 2);
}

/**
 * Draws the customized medieval dark-fantasy hero sprite (Inhuman) anchored at foot (sx, sy).
 */
export function drawHeroPixelSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  cfg: CharacterConfig,
  state: HeroRenderState
) {
  if (state.invulnBlink && Math.floor(state.animTime * 24) % 2 === 0 && !state.hitFlash) {
    return;
  }

  const hair = findSwatch(HAIR_COLORS, cfg.hairColor);
  const skin = findSwatch(SKIN_TONES, cfg.skinTone);
  const eye = findSwatch(EYE_COLORS, cfg.eyeColor);
  const cloth = findSwatch(CLOTHING_COLORS, cfg.clothingColor);
  const shoe = findSwatch(SHOE_COLORS, cfg.shoeColor);

  const f = (c: string) => (state.hitFlash ? '#FFFFFF' : c);

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  const flip = state.facingLeft ? -1 : 1;
  ctx.scale(flip * state.scaleX, state.scaleY);

  if (state.pose === 'ko') {
    ctx.translate(0, -4);
    ctx.rotate(-Math.PI * 0.48);
  }

  const weaponKind: WeaponVisualKind = state.weaponKind ?? 'blade';
  const weaponRarity: ItemRarity = state.weaponRarity ?? 'common';
  const attackProg = Math.max(0, Math.min(1, state.attackProgress ?? 0.5));
  const isDefending = state.pose === 'defend';

  const breathBob = state.pose === 'idle' ? (Math.sin(state.animTime * 4.5) > 0.35 ? -1 : 0) : 0;
  const stride = state.pose === 'walk' ? Math.sin(state.walkPhase * 5.2) : 0;
  const legAOff = isDefending ? 2 : Math.round(stride * 3);
  const legBOff = isDefending ? -2 : Math.round(-stride * 3);
  const torsoBob =
    isDefending
      ? 1
      : state.pose === 'walk'
        ? Math.abs(Math.round(stride * 1.4)) * -1
        : state.pose === 'special'
          ? -4 + Math.round(Math.sin(state.animTime * 22) * 1)
          : breathBob;

  const isPunching =
    state.pose === 'punch1' || state.pose === 'punch2' || state.pose === 'punch3';
  const isKicking = state.pose === 'kick' || state.pose === 'airkick';
  const weaponLean =
    isPunching
      ? weaponKind === 'axe' && state.pose === 'punch3'
        ? 3
        : weaponKind === 'flail' && state.pose === 'punch2'
          ? 1
          : 2
      : 0;
  const leanX = isDefending
    ? -1
    : isPunching
      ? weaponLean
      : state.pose === 'dash'
        ? 3
        : state.pose === 'hurt'
          ? -2
          : 0;

  // --- BACK ACCESSORIES (drawn behind body) ---
  if (cfg.accessory === 'energy_cape') {
    // Tattered dark-fantasy war cloak
    const wave = Math.round(Math.sin(state.animTime * 8 + stride) * 2);
    px(ctx, -10 + leanX, -22 + torsoBob, 6, 17, OUTLINE);
    px(ctx, -9 + leanX + (wave > 0 ? -1 : 0), -21 + torsoBob, 5, 14, f('#5C1D1D'));
    px(ctx, -8 + leanX + wave, -19 + torsoBob, 3, 11, f('#882828'));
    px(ctx, -10 + leanX + wave, -8 + torsoBob, 2, 3, f('#3F1515'));
    px(ctx, -7 + leanX + wave, -7 + torsoBob, 2, 2, f('#3F1515'));
  } else if (cfg.accessory === 'katana_sheath') {
    // Back-slung medieval greatsword & leather scabbard
    for (let i = 0; i < 6; i++) {
      px(ctx, -9 + i * 2 + leanX, -27 + i * 2 + torsoBob, 3, 3, OUTLINE);
      px(ctx, -8 + i * 2 + leanX, -26 + i * 2 + torsoBob, 2, 2, f(i < 2 ? '#A8A29E' : '#57361C'));
    }
    // Iron crossguard + pommel
    px(ctx, -11 + leanX, -28 + torsoBob, 5, 2, f('#D97706'));
    px(ctx, -10 + leanX, -30 + torsoBob, 2, 2, f('#78716C'));
  }

  // --- LEGS & FOOTWEAR ---
  const drawBoot = (bx: number, by: number, isBack: boolean) => {
    const mainC = f(isBack ? shoe.shade : shoe.hex);
    const hiC = f(shoe.highlight);
    const pantC =
      cfg.clothingType === 'exo_suit'
        ? f('#44403C')
        : cfg.clothingType === 'battle_robe'
          ? f(cloth.hex)
          : f(isBack ? '#1C1917' : '#292524');
    px(ctx, bx - 1, by - 7, 5, 6, OUTLINE);
    px(ctx, bx, by - 6, 3, 4, pantC);

    px(ctx, bx - 1, by - 4, 7, 5, OUTLINE);
    px(ctx, bx, by - 3, 5, 3, mainC);

    if (cfg.shoeType === 'rocket_greaves') {
      // Spurred War Greaves (brass heel spur)
      px(ctx, bx + 1, by - 3, 3, 1, hiC);
      px(ctx, bx - 2, by - 2, 2, 1, f('#D97706'));
    } else if (cfg.shoeType === 'spiked_boots') {
      // Iron-shod hobnailed boots
      px(ctx, bx + 4, by - 2, 2, 1, f('#A8A29E'));
      px(ctx, bx + 2, by - 3, 1, 1, f('#D6D3D1'));
    } else if (cfg.shoeType === 'neon_hitops') {
      // Laced medieval leather boots
      px(ctx, bx, by - 1, 5, 1, f('#3B2618'));
      px(ctx, bx + 2, by - 3, 2, 2, f('#D6C7B2'));
    } else if (cfg.shoeType === 'iron_sabatons') {
      // Articulated gothic knight sabatons
      px(ctx, bx, by - 4, 5, 1, f('#78716C'));
      px(ctx, bx + 2, by - 2, 2, 1, hiC);
    } else if (cfg.shoeType === 'hover_striders') {
      // Mire-caked Blight-Walkers
      px(ctx, bx, by - 1, 5, 1, f('#4D7C0F'));
      px(ctx, bx + 1, by - 3, 3, 1, hiC);
    } else if (cfg.shoeType === 'shadow_tabi') {
      // Bound stalker footwraps
      px(ctx, bx, by - 4, 4, 1, f('#A8A29E'));
      px(ctx, bx + 3, by - 2, 2, 2, mainC);
    }
  };

  if (isKicking) {
    drawBoot(-4, 0, true);
    px(ctx, 2, -12 + torsoBob, 11, 5, OUTLINE);
    px(ctx, 3, -11 + torsoBob, 5, 3, f('#292524'));
    px(ctx, 7, -12 + torsoBob, 6, 4, f(shoe.hex));
    px(ctx, 10, -12 + torsoBob, 3, 2, f(shoe.highlight));
    px(ctx, 12, -14 + torsoBob, 4, 2, f('#D97706'));
    px(ctx, 13, -10 + torsoBob, 3, 2, f('#FDE68A'));
  } else {
    drawBoot(-5 + legBOff, 0, true);
    drawBoot(1 + legAOff, 0, false);
  }

  // --- TORSO & MEDIEVAL CLOTHING TYPE ---
  const ty = -20 + torsoBob;
  const tx = -6 + leanX;

  px(ctx, tx - 1, ty - 1, 13, 13, OUTLINE);
  px(ctx, tx, ty, 11, 11, f(cloth.hex));
  px(ctx, tx, ty, 3, 11, f(cloth.shade));
  px(ctx, tx + 8, ty, 3, 9, f(cloth.highlight));

  if (cfg.clothingType === 'trenchcoat') {
    // Inquisitor Greatcoat: high weathered mantle collar + tattered hem
    px(ctx, tx - 1, ty - 3, 4, 3, f(cloth.shade));
    px(ctx, tx + 8, ty - 3, 4, 3, f(cloth.highlight));
    px(ctx, tx + 4, ty + 1, 3, 10, f('#1C1917'));
    px(ctx, tx + 4, ty + 2, 1, 7, f('#A16207'));
    px(ctx, tx - 2, ty + 9, 5, 5, OUTLINE);
    px(ctx, tx - 1, ty + 9, 4, 4, f(cloth.shade));
    px(ctx, tx + 7, ty + 9, 5, 4, f(cloth.hex));
  } else if (cfg.clothingType === 'runic_plate') {
    // Blighted Plate: forged gothic breastplate & brass crest
    px(ctx, tx + 1, ty + 1, 9, 7, f(cloth.highlight));
    px(ctx, tx + 2, ty + 2, 7, 5, f(cloth.hex));
    px(ctx, tx + 5, ty + 3, 2, 3, f('#D97706'));
    px(ctx, tx + 4, ty + 4, 4, 1, f('#FDE68A'));
    px(ctx, tx, ty + 8, 11, 2, f('#292524'));
    px(ctx, tx + 4, ty + 8, 3, 2, f('#B45309'));
  } else if (cfg.clothingType === 'biker_vest') {
    // Brigand Jerkin: sleeveless boiled-leather vest with iron rivets
    px(ctx, tx + 3, ty, 5, 10, f('#1C1917'));
    px(ctx, tx + 1, ty + 2, 1, 1, f('#A8A29E'));
    px(ctx, tx + 1, ty + 5, 1, 1, f('#A8A29E'));
    px(ctx, tx + 9, ty + 2, 1, 1, f('#A8A29E'));
    px(ctx, tx + 9, ty + 5, 1, 1, f('#A8A29E'));
    px(ctx, tx + 1, ty + 9, 9, 2, f('#92400E'));
  } else if (cfg.clothingType === 'battle_robe') {
    // Cultist Vestments: torn acolyte robe & tarnished golden stole
    for (let i = 0; i < 6; i++) {
      px(ctx, tx + 1 + i, ty + i, 2, 2, f('#B45309'));
    }
    px(ctx, tx + 1, ty + 10, 9, 4, OUTLINE);
    px(ctx, tx + 2, ty + 10, 7, 3, f(cloth.hex));
    px(ctx, tx + 4, ty + 10, 3, 3, f('#D97706'));
  } else if (cfg.clothingType === 'exo_suit') {
    // Chainmail Hauberk: riveted iron mail rings & dark surcoat cross
    px(ctx, tx + 1, ty + 1, 9, 9, f('#57534E'));
    for (let rx = 0; rx < 4; rx++) {
      for (let ry = 0; ry < 4; ry++) {
        if ((rx + ry) % 2 === 0) {
          px(ctx, tx + 2 + rx * 2, ty + 2 + ry * 2, 1, 1, f('#A8A29E'));
        }
      }
    }
    px(ctx, tx + 4, ty + 1, 3, 9, f(cloth.hex));
    px(ctx, tx + 1, ty + 8, 9, 2, f('#292524'));
  } else if (cfg.clothingType === 'tech_harness') {
    // Gladiator Straps: rawhide crossed battle straps
    px(ctx, tx + 1, ty + 1, 9, 9, f(skin.hex));
    px(ctx, tx + 1, ty + 1, 2, 9, f(skin.shade));
    for (let i = 0; i < 7; i++) {
      px(ctx, tx + 1 + i, ty + 1 + i, 2, 2, f(cloth.hex));
      px(ctx, tx + 8 - i, ty + 1 + i, 2, 2, f(cloth.hex));
    }
    px(ctx, tx + 4, ty + 4, 3, 2, f('#A16207'));
  }

  // --- ARMS, EQUIPPED WEAPON HAND POSES & DEFEND STANCE ---
  const armColor =
    cfg.clothingType === 'biker_vest' || cfg.clothingType === 'tech_harness'
      ? f(skin.hex)
      : f(cloth.highlight);

  // Track front-hand anchor for rendering the equipped weapon cleanly in Inhuman's hand
  let handX = tx + 11;
  let handY = ty + 7;

  if (isDefending) {
    // Braced defensive guard stance: arms raised diagonally across chest
    px(ctx, tx - 2, ty + 2, 4, 6, OUTLINE);
    px(ctx, tx - 1, ty + 3, 2, 4, armColor);
    px(ctx, tx + 6, ty + 1, 7, 5, OUTLINE);
    px(ctx, tx + 7, ty + 2, 5, 3, armColor);
    px(ctx, tx + 10, ty + 2, 3, 3, weaponKind === 'gauntlets' ? f('#94A3B8') : f(skin.hex));
    handX = tx + 11;
    handY = ty + 3;
  } else if (isPunching) {
    if (weaponKind === 'gauntlets' || weaponKind === 'unarmed') {
      // Weapon-specific Brawler Gauntlets / Fist combo (Jab -> Cross -> Rising Uppercut)
      if (state.pose === 'punch3') {
        // Rising skyward uppercut
        px(ctx, tx + 8, ty - 9, 5, 13, OUTLINE);
        px(ctx, tx + 9, ty - 6, 3, 9, armColor);
        px(ctx, tx + 8, ty - 11, 6, 6, OUTLINE);
        px(ctx, tx + 9, ty - 10, 4, 4, weaponKind === 'gauntlets' ? f('#94A3B8') : f(skin.hex));
        if (weaponKind === 'gauntlets') {
          px(ctx, tx + 9, ty - 11, 1, 2, f('#F59E0B'));
          px(ctx, tx + 12, ty - 11, 1, 2, f('#F59E0B'));
        }
        handX = tx + 11;
        handY = ty - 9;
      } else {
        const ext = state.pose === 'punch2' ? 13 : 10;
        const armY = state.pose === 'punch2' ? ty + 2 : ty + 4;
        px(ctx, tx + 8, armY - 1, ext, 5, OUTLINE);
        px(ctx, tx + 8, armY, ext - 4, 3, armColor);
        px(
          ctx,
          tx + 8 + ext - 5,
          armY - 1,
          5,
          5,
          weaponKind === 'gauntlets' ? f('#64748B') : f(skin.hex)
        );
        if (weaponKind === 'gauntlets') {
          px(ctx, tx + 8 + ext - 4, armY, 3, 3, f('#CBD5E1'));
          px(ctx, tx + 8 + ext - 1, armY, 2, 1, f('#F59E0B'));
          px(ctx, tx + 8 + ext - 1, armY + 2, 2, 1, f('#F59E0B'));
        }
        handX = tx + 8 + ext - 2;
        handY = armY + 1;
      }
      // Back guard arm
      px(ctx, tx - 3, ty + 4, 4, 4, OUTLINE);
      px(ctx, tx - 2, ty + 5, 2, 2, weaponKind === 'gauntlets' ? f('#64748B') : f(skin.shade));
    } else if (weaponKind === 'axe') {
      // Heavy Battle Axe stance (Hack -> Rib Cleave -> Two-handed Overhead Executioner Slam)
      const armY = state.pose === 'punch3' ? ty - 5 + Math.round(attackProg * 11) : state.pose === 'punch2' ? ty + 3 : ty + 1;
      const reach = state.pose === 'punch3' ? 8 + Math.round(attackProg * 4) : 10;
      px(ctx, tx + 7, armY - 1, reach, 5, OUTLINE);
      px(ctx, tx + 8, armY, reach - 3, 3, armColor);
      px(ctx, tx + 6 + reach - 2, armY, 3, 3, f(skin.hex));
      handX = tx + 7 + reach - 1;
      handY = armY + 1;
      px(ctx, tx - 2, ty + 3, 4, 5, OUTLINE);
      px(ctx, tx - 1, ty + 4, 2, 3, armColor);
    } else if (weaponKind === 'flail') {
      // Spiked Flail whip stance (Snap Lash -> Sweeping Arc -> Overhead Spin)
      const armY = state.pose === 'punch3' ? ty - 4 : state.pose === 'punch2' ? ty + 4 : ty + 2;
      px(ctx, tx + 8, armY - 1, 9, 5, OUTLINE);
      px(ctx, tx + 9, armY, 6, 3, armColor);
      px(ctx, tx + 14, armY, 3, 3, f(skin.hex));
      handX = tx + 16;
      handY = armY + 1;
      px(ctx, tx - 3, ty + 4, 4, 4, OUTLINE);
      px(ctx, tx - 2, ty + 5, 2, 2, f(skin.shade));
    } else {
      // War Blade stance (Forehand Slash -> Rising Reverse Cut -> Overhead Greatsword Cleave)
      const armY =
        state.pose === 'punch3'
          ? ty - 4 + Math.round(attackProg * 9)
          : state.pose === 'punch2'
            ? ty + 5 - Math.round(attackProg * 6)
            : ty + 2;
      px(ctx, tx + 8, armY - 1, 10, 5, OUTLINE);
      px(ctx, tx + 9, armY, 6, 3, armColor);
      px(ctx, tx + 15, armY, 3, 3, f(skin.hex));
      handX = tx + 16;
      handY = armY + 1;
      px(ctx, tx - 3, ty + 4, 4, 4, OUTLINE);
      px(ctx, tx - 2, ty + 5, 2, 2, f(skin.shade));
    }
  } else if (state.pose === 'special') {
    // Unleashing SERUM surge
    px(ctx, tx - 4, ty - 4, 4, 7, OUTLINE);
    px(ctx, tx - 3, ty - 3, 2, 5, armColor);
    px(ctx, tx + 11, ty - 4, 4, 7, OUTLINE);
    px(ctx, tx + 12, ty - 3, 2, 5, armColor);
    px(ctx, tx - 4, ty - 6, 4, 3, '#84CC16');
    px(ctx, tx + 11, ty - 6, 4, 3, '#D97706');
    handX = tx + 13;
    handY = ty - 3;
  } else {
    const swing = Math.round(stride * 2);
    px(ctx, tx + 10, ty + 2 - swing, 4, 7, OUTLINE);
    px(ctx, tx + 11, ty + 3 - swing, 2, 4, armColor);
    px(
      ctx,
      tx + 11,
      ty + 7 - swing,
      weaponKind === 'gauntlets' ? 3 : 2,
      weaponKind === 'gauntlets' ? 3 : 2,
      weaponKind === 'gauntlets' ? f('#94A3B8') : f(skin.hex)
    );
    px(ctx, tx - 3, ty + 2 + swing, 4, 8, OUTLINE);
    px(ctx, tx - 2, ty + 3 + swing, 2, 4, armColor);
    px(
      ctx,
      tx - 2,
      ty + 7 + swing,
      weaponKind === 'gauntlets' ? 3 : 2,
      weaponKind === 'gauntlets' ? 3 : 2,
      weaponKind === 'gauntlets' ? f('#64748B') : f(skin.hex)
    );
    handX = tx + 12;
    handY = ty + 8 - swing;
  }

  // --- SPIKED PAULDRON ACCESSORY ---
  if (cfg.accessory === 'laser_pauldron') {
    px(ctx, tx - 3, ty - 2, 6, 5, OUTLINE);
    px(ctx, tx - 2, ty - 1, 4, 3, f('#57534E'));
    px(ctx, tx - 4, ty - 4, 2, 3, f('#D6D3D1')); // Bone/iron spike
    px(ctx, tx - 1, ty, 2, 1, f('#A8A29E'));
  }

  // --- HEAD & SKIN TONE ---
  const hx = -5 + leanX;
  const hy = -30 + torsoBob;
  px(ctx, hx - 1, hy - 1, 11, 11, OUTLINE);
  px(ctx, hx, hy, 9, 9, f(skin.hex));
  px(ctx, hx, hy, 2, 9, f(skin.shade));
  px(ctx, hx + 6, hy + 1, 2, 3, f(skin.highlight));

  // --- EYES ---
  if (cfg.faceStyle !== 'visor') {
    px(ctx, hx + 3, hy + 4, 2, 2, OUTLINE);
    px(ctx, hx + 7, hy + 4, 2, 2, OUTLINE);
    px(ctx, hx + 4, hy + 4, 1, 2, f(eye.hex));
    px(ctx, hx + 7, hy + 4, 1, 2, f(eye.hex));
    px(ctx, hx + 4, hy + 4, 1, 1, f(eye.highlight));
    px(ctx, hx + 7, hy + 4, 1, 1, f(eye.highlight));
  }

  // --- MEDIEVAL FACE STYLES ---
  if (cfg.faceStyle === 'stoic') {
    px(ctx, hx + 2, hy + 6, 1, 1, f('#9F1239'));
    px(ctx, hx + 3, hy + 7, 2, 1, f('#9F1239'));
    px(ctx, hx + 5, hy + 7, 2, 1, f(skin.shade));
  } else if (cfg.faceStyle === 'visor') {
    // Riveted Iron Blindfold with faint glowing eye-slit
    px(ctx, hx + 1, hy + 3, 9, 3, OUTLINE);
    px(ctx, hx + 2, hy + 3, 7, 3, f('#57534E'));
    px(ctx, hx + 3, hy + 4, 5, 1, f(eye.hex));
    px(ctx, hx + 2, hy + 4, 1, 1, f('#A8A29E'));
  } else if (cfg.faceStyle === 'rogue') {
    px(ctx, hx + 4, hy + 7, 4, 1, f('#E7E5E4'));
    px(ctx, hx + 7, hy + 6, 1, 1, f('#E7E5E4'));
  } else if (cfg.faceStyle === 'runes') {
    // Blood & ash ritual war paint
    px(ctx, hx + 5, hy + 1, 1, 2, f('#B91C1C'));
    px(ctx, hx + 2, hy + 6, 2, 1, f('#991B1B'));
    px(ctx, hx + 7, hy + 6, 2, 1, f('#991B1B'));
  } else if (cfg.faceStyle === 'bearded') {
    px(ctx, hx + 1, hy + 7, 8, 3, OUTLINE);
    px(ctx, hx + 2, hy + 7, 6, 2, f(hair.shade));
    px(ctx, hx + 4, hy + 7, 3, 1, f(hair.hex));
  } else if (cfg.faceStyle === 'masked') {
    px(ctx, hx, hy + 6, 10, 4, OUTLINE);
    px(ctx, hx + 1, hy + 6, 8, 3, f(cloth.shade));
    px(ctx, hx + 2, hy + 7, 6, 1, f(cloth.highlight));
  }

  // --- HAIR STYLE & COLOR ---
  if (cfg.hairStyle === 'spiked') {
    px(ctx, hx - 2, hy - 4, 13, 5, OUTLINE);
    px(ctx, hx - 1, hy - 3, 3, 4, f(hair.hex));
    px(ctx, hx + 2, hy - 5, 3, 6, f(hair.hex));
    px(ctx, hx + 5, hy - 4, 3, 5, f(hair.hex));
    px(ctx, hx + 8, hy - 2, 2, 3, f(hair.shade));
    px(ctx, hx + 3, hy - 4, 2, 2, f(hair.highlight));
    px(ctx, hx - 1, hy, 2, 4, f(hair.shade));
  } else if (cfg.hairStyle === 'mane') {
    px(ctx, hx - 3, hy - 2, 13, 5, OUTLINE);
    px(ctx, hx - 3, hy + 1, 4, 10, OUTLINE);
    px(ctx, hx - 2, hy - 1, 11, 3, f(hair.hex));
    px(ctx, hx - 2, hy + 1, 3, 9, f(hair.shade));
    px(ctx, hx - 1, hy + 2, 2, 7, f(hair.hex));
    px(ctx, hx + 1, hy - 1, 6, 1, f(hair.highlight));
  } else if (cfg.hairStyle === 'undercut') {
    px(ctx, hx - 1, hy - 3, 12, 4, OUTLINE);
    px(ctx, hx, hy - 2, 10, 3, f(hair.hex));
    px(ctx, hx + 3, hy - 2, 6, 1, f(hair.highlight));
    px(ctx, hx + 8, hy, 3, 2, f(hair.hex));
    px(ctx, hx, hy + 1, 2, 3, f(hair.shade));
  } else if (cfg.hairStyle === 'braided') {
    px(ctx, hx - 2, hy - 2, 12, 4, OUTLINE);
    px(ctx, hx - 1, hy - 1, 10, 3, f(hair.hex));
    px(ctx, hx + 2, hy - 1, 5, 1, f(hair.highlight));
    px(ctx, hx - 3, hy + 2, 3, 9, OUTLINE);
    px(ctx, hx - 2, hy + 2, 2, 8, f(hair.hex));
    px(ctx, hx - 2, hy + 5, 2, 1, f('#D97706'));
    px(ctx, hx - 2, hy + 8, 2, 1, f('#D97706'));
  } else if (cfg.hairStyle === 'mullet') {
    px(ctx, hx - 2, hy - 3, 12, 4, OUTLINE);
    px(ctx, hx - 3, hy + 1, 4, 9, OUTLINE);
    px(ctx, hx - 1, hy - 2, 10, 3, f(hair.hex));
    px(ctx, hx + 2, hy - 2, 4, 1, f(hair.highlight));
    px(ctx, hx - 2, hy + 1, 3, 8, f(hair.hex));
    px(ctx, hx - 3, hy + 6, 2, 3, f(hair.shade));
  } else if (cfg.hairStyle === 'bald') {
    px(ctx, hx + 1, hy, 7, 1, f(skin.highlight));
    px(ctx, hx + 4, hy + 1, 2, 1, f('#B91C1C'));
  }

  // --- HEAD & ORBITING MEDIEVAL ACCESSORIES ---
  if (cfg.accessory === 'holo_halo') {
    // Floating wrought-iron & ember Crown of Thorns
    const floatY = Math.round(Math.sin(state.animTime * 5) * 1.5);
    px(ctx, hx - 1, hy - 7 + floatY, 11, 2, f('#57534E'));
    px(ctx, hx, hy - 8 + floatY, 2, 1, f('#D97706'));
    px(ctx, hx + 4, hy - 9 + floatY, 2, 2, f('#F59E0B'));
    px(ctx, hx + 8, hy - 8 + floatY, 2, 1, f('#D97706'));
  } else if (cfg.accessory === 'war_crown') {
    px(ctx, hx - 1, hy - 4, 11, 3, OUTLINE);
    px(ctx, hx, hy - 3, 9, 2, f('#78716C'));
    px(ctx, hx - 2, hy - 6, 2, 4, f('#D97706'));
    px(ctx, hx + 9, hy - 6, 2, 4, f('#D97706'));
    px(ctx, hx + 4, hy - 3, 2, 2, f('#DC2626'));
  } else if (cfg.accessory === 'grimoire_drone') {
    // Floating chained Cursed Grimoire
    const ox = Math.round(Math.cos(state.animTime * 3.4) * 12);
    const oy = Math.round(Math.sin(state.animTime * 6.8) * 2.5);
    px(ctx, ox - 3, ty - 6 + oy, 7, 6, OUTLINE);
    px(ctx, ox - 2, ty - 5 + oy, 5, 4, f('#5C2415'));
    px(ctx, ox - 1, ty - 4 + oy, 3, 2, f('#E7E5E4'));
    px(ctx, ox, ty - 4 + oy, 1, 2, f('#84CC16'));
  }

  // --- EQUIPPED WEAPON IN HAND + WEAPON-SPECIFIC ATTACK ANIMATION ---
  if (state.pose !== 'ko') {
    drawEquippedWeaponInHand(
      ctx,
      handX,
      handY,
      weaponKind,
      weaponRarity,
      state.pose,
      state.animTime,
      stride,
      attackProg,
      state.hitFlash
    );
  }

  // --- ACTIVE DEFEND / GUARD IRON RUNIC WARD SHIELD ---
  if (isDefending) {
    const pulse = 0.72 + Math.sin(state.animTime * 16) * 0.2;
    const shieldX = tx + 13;
    const shieldY = ty - 3;
    ctx.save();
    ctx.globalAlpha = pulse * 0.38;
    px(ctx, shieldX - 1, shieldY - 1, 7, 17, '#0EA5E9');
    ctx.globalAlpha = pulse * 0.92;
    px(ctx, shieldX + 1, shieldY - 2, 3, 19, '#38BDF8');
    px(ctx, shieldX + 2, shieldY, 2, 15, '#E0F2FE');
    px(ctx, shieldX, shieldY + 1, 1, 13, '#7DD3FC');
    px(ctx, shieldX + 4, shieldY + 2, 1, 11, '#BAE6FD');
    // Top & bottom chevron runes
    px(ctx, shieldX + 1, shieldY - 3, 2, 1, '#FFFFFF');
    px(ctx, shieldX + 1, shieldY + 17, 2, 1, '#FFFFFF');
    ctx.restore();
  }

  ctx.restore();
}

function getWeaponRarityColors(rarity: ItemRarity): {
  steel: string;
  edge: string;
  trim: string;
  trail: string;
} {
  switch (rarity) {
    case 'uncommon':
      return { steel: '#94A3B8', edge: '#4ADE80', trim: '#15803D', trail: '#86EFAC' };
    case 'rare':
      return { steel: '#94A3B8', edge: '#60A5FA', trim: '#1D4ED8', trail: '#93C5FD' };
    case 'epic':
      return { steel: '#A1A1AA', edge: '#C084FC', trim: '#7E22CE', trail: '#E9D5FF' };
    case 'mythic':
      return { steel: '#CBD5E1', edge: '#FDE047', trim: '#EA580C', trail: '#FDBA74' };
    default:
      return { steel: '#9CA3AF', edge: '#F8FAFC', trim: '#B45309', trail: '#FDE68A' };
  }
}

function drawEquippedWeaponInHand(
  ctx: CanvasRenderingContext2D,
  handX: number,
  handY: number,
  kind: WeaponVisualKind,
  rarity: ItemRarity,
  pose: SpriteAnimPose,
  animTime: number,
  stride: number,
  attackProg: number,
  hitFlash: boolean
) {
  if (kind === 'unarmed') {
    if (pose === 'punch1' || pose === 'punch2' || pose === 'punch3') {
      px(ctx, handX + 1, handY - 2, 4, 4, hitFlash ? '#FFFFFF' : '#E7E5E4');
    }
    return;
  }

  const pal = getWeaponRarityColors(rarity);
  const f = (c: string) => (hitFlash ? '#FFFFFF' : c);
  const isAttacking = pose === 'punch1' || pose === 'punch2' || pose === 'punch3';

  if (kind === 'gauntlets') {
    // Spiked Iron War-Gauntlets visibly encasing the hand + kinetic punch burst
    px(ctx, handX - 2, handY - 2, 5, 5, OUTLINE);
    px(ctx, handX - 1, handY - 1, 3, 3, f(pal.steel));
    px(ctx, handX + 1, handY - 2, 2, 1, f(pal.trim));
    px(ctx, handX + 1, handY + 1, 2, 1, f(pal.trim));
    if (isAttacking) {
      const flare = pose === 'punch3' ? pal.trail : pal.edge;
      if (pose === 'punch3') {
        // Uppercut upward shock-plume
        px(ctx, handX - 3, handY - 9, 8, 5, f(pal.trim));
        px(ctx, handX - 1, handY - 12, 4, 7, f(flare));
        px(ctx, handX, handY - 14, 2, 4, '#FFFFFF');
      } else {
        // Horizontal iron knuckle shockwave cone
        px(ctx, handX + 3, handY - 4, 5, 9, f(pal.trim));
        px(ctx, handX + 5, handY - 3, 5, 7, f(flare));
        px(ctx, handX + 8, handY - 1, 3, 3, '#FFFFFF');
      }
    }
    return;
  }

  ctx.save();
  ctx.translate(Math.round(handX), Math.round(handY));

  if (kind === 'blade') {
    // Medieval Gothic War Blade — distinct swing angles per combo step
    let angle = -0.45 + Math.sin(animTime * 4 + stride) * 0.08;
    if (pose === 'defend') {
      angle = -1.2;
    } else if (pose === 'punch1') {
      angle = -1.35 + attackProg * 2.25; // Forehand horizontal slash
    } else if (pose === 'punch2') {
      angle = 1.2 - attackProg * 2.45; // Rising reverse cross-cut
    } else if (pose === 'punch3') {
      angle = -2.35 + attackProg * 3.15; // Overhead greatsword cleave
    } else if (pose === 'dash') {
      angle = -0.85;
    }

    // Sweeping sword arc trail during active swing
    if (isAttacking && attackProg >= 0.14 && attackProg <= 0.88) {
      ctx.save();
      ctx.globalAlpha = 0.72 * (1 - Math.abs(attackProg - 0.5) * 1.4);
      ctx.strokeStyle = f(pose === 'punch3' ? pal.trail : pal.edge);
      ctx.lineWidth = pose === 'punch3' ? 4 : 2.5;
      ctx.beginPath();
      if (pose === 'punch2') {
        ctx.arc(0, 0, 17, angle, angle + 1.15);
      } else {
        ctx.arc(0, 0, pose === 'punch3' ? 20 : 17, angle - 1.25, angle);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(angle);
    // Pommel & leather grip
    px(ctx, -4, -1, 5, 3, OUTLINE);
    px(ctx, -3, 0, 3, 1, f('#57361C'));
    px(ctx, -4, -1, 2, 3, f(pal.trim));
    // Crossguard
    px(ctx, 1, -4, 3, 9, OUTLINE);
    px(ctx, 2, -3, 1, 7, f(pal.trim));
    // Broadsword blade (15px steel with bright fuller & rarity edge)
    px(ctx, 3, -3, 15, 6, OUTLINE);
    px(ctx, 4, -2, 12, 4, f(pal.steel));
    px(ctx, 4, -2, 13, 1, f(pal.edge));
    px(ctx, 16, -1, 3, 2, f(pal.edge));
  } else if (kind === 'axe') {
    // Double-Bit Medieval Battle Axe — brutal hack, rib cleave, and towering executioner slam
    let angle = -0.65 + Math.sin(animTime * 3.5 + stride) * 0.08;
    if (pose === 'defend') {
      angle = -1.45;
    } else if (pose === 'punch1') {
      angle = -1.75 + attackProg * 2.45; // Heavy diagonal chop
    } else if (pose === 'punch2') {
      angle = 0.95 - attackProg * 2.25; // Wide horizontal cleave
    } else if (pose === 'punch3') {
      angle = -2.55 + attackProg * 3.45; // Towering overhead executioner slam
    }

    if (isAttacking && attackProg >= 0.16 && attackProg <= 0.88) {
      ctx.save();
      ctx.globalAlpha = 0.78 * (1 - Math.abs(attackProg - 0.52) * 1.35);
      ctx.strokeStyle = f(pose === 'punch3' ? '#EF4444' : '#FB923C');
      ctx.lineWidth = pose === 'punch3' ? 5 : 3.5;
      ctx.beginPath();
      if (pose === 'punch2') {
        ctx.arc(0, 0, 18, angle, angle + 1.15);
      } else {
        ctx.arc(0, 0, pose === 'punch3' ? 21 : 18, angle - 1.35, angle);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(angle);
    // Long ash-wood haft
    px(ctx, -5, -1, 21, 3, OUTLINE);
    px(ctx, -4, 0, 19, 1, f('#78350F'));
    px(ctx, -5, -1, 2, 3, f(pal.trim));
    // Twin curved crescent war-axe head
    px(ctx, 10, -7, 8, 15, OUTLINE);
    px(ctx, 11, -6, 6, 13, f(pal.steel));
    px(ctx, 15, -6, 2, 13, f(pal.edge));
    px(ctx, 11, -2, 3, 5, f(pal.trim));
    // Top iron spike
    px(ctx, 16, -1, 4, 3, OUTLINE);
    px(ctx, 17, 0, 2, 1, f(pal.edge));
  } else if (kind === 'flail') {
    // Chained Spiked Morningstar Flail — swaying chain in idle/walk, snapping whip & whirling spin on attack
    const sway = Math.sin(animTime * 6.5 + stride * 1.4);
    let handleAngle = -0.35 + sway * 0.1;
    let chainEndX = 6 + Math.round(sway * 3);
    let chainEndY = 9;

    if (pose === 'defend') {
      handleAngle = -1.3;
      chainEndX = 5;
      chainEndY = -9;
    } else if (pose === 'punch1') {
      // Forward snapping chain lash
      const extend = Math.sin(attackProg * Math.PI);
      handleAngle = -0.25 + attackProg * 0.65;
      chainEndX = Math.round(8 + extend * 17);
      chainEndY = Math.round(-2 + (attackProg - 0.5) * 6);
    } else if (pose === 'punch2') {
      // Sweeping low-to-high morningstar arc
      const arcAngle = 1.25 - attackProg * 2.6;
      const radius = 15 + Math.sin(attackProg * Math.PI) * 6;
      handleAngle = arcAngle * 0.5;
      chainEndX = Math.round(Math.cos(arcAngle) * radius);
      chainEndY = Math.round(Math.sin(arcAngle) * radius);
    } else if (pose === 'punch3') {
      // Full 360-degree overhead whirling morningstar spin & crush
      const spinAngle = -Math.PI * 0.9 + attackProg * Math.PI * 2.35;
      const radius = 19;
      handleAngle = spinAngle;
      chainEndX = Math.round(Math.cos(spinAngle) * radius);
      chainEndY = Math.round(Math.sin(spinAngle) * radius);
    }

    // Motion ring/arc for flail attacks
    if (isAttacking && attackProg >= 0.12 && attackProg <= 0.9) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = f(pose === 'punch3' ? '#FDE047' : '#F59E0B');
      ctx.lineWidth = pose === 'punch3' ? 3 : 2;
      ctx.beginPath();
      if (pose === 'punch3') {
        ctx.arc(0, 0, 19, -Math.PI * 0.9 + attackProg * 2.5, -Math.PI * 0.9 + attackProg * Math.PI * 2.35);
      } else {
        ctx.moveTo(4, 0);
        ctx.lineTo(chainEndX, chainEndY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Iron flail handle
    ctx.save();
    ctx.rotate(handleAngle);
    px(ctx, -3, -1, 10, 3, OUTLINE);
    px(ctx, -2, 0, 8, 1, f('#57361C'));
    px(ctx, 5, -1, 2, 3, f(pal.trim));
    ctx.restore();

    const tipX = Math.round(Math.cos(handleAngle) * 7);
    const tipY = Math.round(Math.sin(handleAngle) * 7);

    // Articulated iron chain links from handle tip to spiked ball
    const links = 4;
    for (let i = 1; i < links; i++) {
      const t = i / links;
      const lx = Math.round(tipX + (chainEndX - tipX) * t);
      const ly = Math.round(tipY + (chainEndY - tipY) * t);
      px(ctx, lx - 1, ly - 1, 3, 3, OUTLINE);
      px(ctx, lx, ly, 1, 1, f('#D6D3D1'));
    }

    // Heavy spiked morningstar iron ball
    px(ctx, chainEndX - 4, chainEndY - 4, 8, 8, OUTLINE);
    px(ctx, chainEndX - 3, chainEndY - 3, 6, 6, f(pal.steel));
    px(ctx, chainEndX - 2, chainEndY - 2, 3, 2, f(pal.edge));
    // 4 directional steel spikes
    px(ctx, chainEndX - 1, chainEndY - 6, 2, 2, f(pal.edge));
    px(ctx, chainEndX - 1, chainEndY + 4, 2, 2, f(pal.edge));
    px(ctx, chainEndX - 6, chainEndY - 1, 2, 2, f(pal.edge));
    px(ctx, chainEndX + 4, chainEndY - 1, 2, 2, f(pal.edge));
  }

  ctx.restore();
}

export interface EnemyRenderState {
  archetype: EnemyArchetype;
  facingLeft: boolean;
  animTime: number;
  walkPhase: number;
  telegraphProgress: number;
  attacking: boolean;
  hitFlash: boolean;
  koProgress: number;
  scaleX: number;
  scaleY: number;
}

export function drawEnemyPixelSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  state: EnemyRenderState
) {
  const f = (c: string) => (state.hitFlash ? '#FFFFFF' : c);
  const telegraphPulse =
    state.telegraphProgress > 0 && Math.floor(state.animTime * 22) % 2 === 0;

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));

  if (state.koProgress > 0) {
    ctx.globalAlpha = Math.max(0, 1 - state.koProgress * 1.05);
    ctx.translate(0, Math.round(-state.koProgress * 6));
    ctx.rotate((state.facingLeft ? 1 : -1) * state.koProgress * 1.4);
  }

  const flip = state.facingLeft ? -1 : 1;
  ctx.scale(flip * state.scaleX, state.scaleY);

  const stride = Math.round(Math.sin(state.walkPhase * 5) * 2.5);

  if (state.archetype === 'thrall') {
    // Hunched Blight Thrall (decayed ghoul with bone mask & claws)
    const bob = Math.abs(stride) > 1 ? -1 : 0;
    px(ctx, -5 + stride, -6, 4, 6, OUTLINE);
    px(ctx, -4 + stride, -5, 2, 4, f('#3F3A36'));
    px(ctx, 1 - stride, -6, 4, 6, OUTLINE);
    px(ctx, 2 - stride, -5, 2, 4, f('#524B45'));
    px(ctx, -7, -17 + bob, 14, 12, OUTLINE);
    px(ctx, -6, -16 + bob, 12, 10, f('#2E2926'));
    px(ctx, -4, -15 + bob, 8, 4, f('#443B34'));
    px(ctx, -2, -13 + bob, 4, 2, f(telegraphPulse ? '#FDE047' : '#84CC16'));
    px(ctx, -4, -24 + bob, 10, 8, OUTLINE);
    px(ctx, -3, -23 + bob, 8, 6, f('#D6D3D1'));
    px(ctx, -2, -26 + bob, 2, 3, f('#78716C'));
    px(ctx, 3, -26 + bob, 2, 3, f('#78716C'));
    px(ctx, 0, -21 + bob, 2, 2, f(telegraphPulse ? '#FFFFFF' : '#E11D48'));
    px(ctx, 3, -21 + bob, 2, 2, f(telegraphPulse ? '#FFFFFF' : '#E11D48'));
    const reach = state.attacking ? 7 : state.telegraphProgress > 0 ? -2 : 0;
    px(ctx, 5 + reach, -15 + bob, 6, 4, OUTLINE);
    px(ctx, 6 + reach, -14 + bob, 4, 2, f('#B91C1C'));
  } else if (state.archetype === 'lancer') {
    // Dread Knight with rusted gothic armor, crimson plume & steel halberd/lance
    const bob = Math.abs(stride) > 1 ? -1 : 0;
    px(ctx, -5 + stride, -7, 4, 7, OUTLINE);
    px(ctx, -4 + stride, -6, 2, 5, f('#332E2C'));
    px(ctx, 1 - stride, -7, 4, 7, OUTLINE);
    px(ctx, 2 - stride, -6, 2, 5, f('#4A4440'));
    px(ctx, -6, -21 + bob, 12, 15, OUTLINE);
    px(ctx, -5, -20 + bob, 10, 13, f('#292524'));
    px(ctx, -4, -19 + bob, 8, 6, f('#57534E'));
    px(ctx, -2, -17 + bob, 4, 3, f('#B91C1C'));
    px(ctx, -5, -30 + bob, 10, 10, OUTLINE);
    px(ctx, -4, -29 + bob, 8, 8, f('#A8A29E'));
    px(ctx, -1, -26 + bob, 6, 2, f(telegraphPulse ? '#FDE047' : '#DC2626'));
    px(ctx, -7, -32 + bob, 6, 3, f('#991B1B'));
    const lanceShift = state.attacking ? 8 : state.telegraphProgress > 0 ? -3 : 0;
    px(ctx, -2 + lanceShift, -15 + bob, 22, 4, OUTLINE);
    px(ctx, -1 + lanceShift, -14 + bob, 14, 2, f('#6B4423'));
    px(ctx, 12 + lanceShift, -15 + bob, 8, 4, f(telegraphPulse ? '#FFFFFF' : '#D6D3D1'));
  } else if (state.archetype === 'hexer') {
    // Plague Hexer with hooded burlap/mire robes & blight censer staff
    const hover = Math.round(Math.sin(state.animTime * 4.2) * 2.5) - 4;
    px(ctx, -6, -19 + hover, 12, 16, OUTLINE);
    px(ctx, -5, -18 + hover, 10, 14, f('#2B3618'));
    px(ctx, -3, -17 + hover, 6, 12, f('#3F541E'));
    px(ctx, -1, -15 + hover, 2, 10, f('#A16207'));
    px(ctx, -5, -28 + hover, 10, 10, OUTLINE);
    px(ctx, -4, -27 + hover, 8, 8, f('#1E2612'));
    px(ctx, -2, -24 + hover, 6, 4, OUTLINE);
    px(ctx, -1, -23 + hover, 2, 2, f('#84CC16'));
    px(ctx, 2, -23 + hover, 2, 2, f('#84CC16'));
    px(ctx, 6, -24 + hover, 3, 18, OUTLINE);
    px(ctx, 7, -23 + hover, 1, 16, f('#78350F'));
    const orbSize = state.telegraphProgress > 0 ? 6 : 4;
    px(ctx, 5, -28 + hover, orbSize, orbSize, f(telegraphPulse ? '#FFFFFF' : '#A3E635'));
  } else {
    // IRON LICH WARDEN (Towering medieval dark-fantasy boss)
    const bob = Math.round(Math.sin(state.walkPhase * 3.5) * 1.5);
    px(ctx, -9 + stride, -10, 7, 10, OUTLINE);
    px(ctx, -8 + stride, -9, 5, 8, f('#3B3532'));
    px(ctx, 2 - stride, -10, 7, 10, OUTLINE);
    px(ctx, 3 - stride, -9, 5, 8, f('#524A45'));
    px(ctx, -12, -29 + bob, 24, 20, OUTLINE);
    px(ctx, -11, -28 + bob, 22, 18, f('#261F1D'));
    px(ctx, -10, -27 + bob, 20, 7, f('#57534E'));
    px(ctx, -14, -28 + bob, 5, 8, f('#78716C'));
    px(ctx, 9, -28 + bob, 5, 8, f('#78716C'));
    px(ctx, -5, -21 + bob, 10, 8, f(telegraphPulse ? '#FEF08A' : '#EA580C'));
    px(ctx, -4, -19 + bob, 8, 1, OUTLINE);
    px(ctx, -4, -16 + bob, 8, 1, OUTLINE);
    px(ctx, -7, -39 + bob, 14, 11, OUTLINE);
    px(ctx, -6, -38 + bob, 12, 9, f('#D6D3D1'));
    px(ctx, -10, -44 + bob, 4, 8, f('#B45309'));
    px(ctx, 6, -44 + bob, 4, 8, f('#B45309'));
    px(ctx, -3, -34 + bob, 3, 2, f('#DC2626'));
    px(ctx, 2, -34 + bob, 3, 2, f('#DC2626'));
    const hammerY = state.attacking ? -8 : state.telegraphProgress > 0 ? -36 : -22;
    px(ctx, 11, hammerY + bob, 4, 22, OUTLINE);
    px(ctx, 12, hammerY + 1 + bob, 2, 20, f('#78716C'));
    px(ctx, 8, hammerY - 4 + bob, 11, 7, OUTLINE);
    px(ctx, 9, hammerY - 3 + bob, 9, 5, f(telegraphPulse ? '#FFFFFF' : '#D97706'));
  }

  ctx.restore();
}

export function drawCrystalCrate(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hpRatio: number,
  hitFlash: boolean
) {
  // Iron-bound decaying medieval dungeon chest
  const f = (c: string) => (hitFlash ? '#FFFFFF' : c);
  const x = Math.round(sx);
  const y = Math.round(sy);

  drawIsometricShadow(ctx, x, y + 1, 9, 0);

  px(ctx, x - 8, y - 14, 16, 13, OUTLINE);
  px(ctx, x - 7, y - 13, 7, 11, f('#452715')); // Dark oak left
  px(ctx, x, y - 13, 7, 11, f('#5E371E')); // Weathered oak right
  px(ctx, x - 6, y - 16, 12, 5, OUTLINE);
  px(ctx, x - 5, y - 15, 10, 3, f('#734527')); // Lid
  // Iron banding & clasp
  px(ctx, x - 7, y - 10, 14, 2, f('#44403C'));
  px(ctx, x - 2, y - 11, 4, 4, f(hpRatio < 0.6 ? '#DC2626' : '#D97706'));
  px(ctx, x - 1, y - 10, 2, 2, f('#FDE68A'));
}

export function drawPickupSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  kind: 'health' | 'astral',
  time: number
) {
  const floatY = Math.round(Math.sin(time * 5.5) * 2.5);
  const x = Math.round(sx);
  const y = Math.round(sy) + floatY;

  drawIsometricShadow(ctx, x, Math.round(sy) + 1, 5, Math.abs(floatY) * 2);

  if (kind === 'health') {
    // Crimson healing elixir vial
    px(ctx, x - 4, y - 11, 8, 9, OUTLINE);
    px(ctx, x - 3, y - 10, 6, 7, '#DC2626');
    px(ctx, x - 2, y - 9, 2, 4, '#FCA5A5');
    px(ctx, x - 2, y - 13, 4, 2, '#A16207');
  } else {
    // Alchemical Serum phial (glowing bile-emerald)
    px(ctx, x - 4, y - 11, 8, 9, OUTLINE);
    px(ctx, x - 3, y - 10, 6, 7, '#65A30D');
    px(ctx, x - 2, y - 9, 3, 4, '#BEF264');
    px(ctx, x - 2, y - 13, 4, 2, '#78716C');
  }
}

export function drawIsoPillar(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  height: number,
  time: number
) {
  // Crumbling dark-fantasy gothic ruin column with flickering torch sconce
  const x = Math.round(sx);
  const y = Math.round(sy);
  const h = Math.round(height);

  px(ctx, x - 11, y - 5, 22, 8, OUTLINE);
  px(ctx, x - 10, y - 4, 10, 6, '#262220');
  px(ctx, x, y - 4, 10, 6, '#38332E');

  px(ctx, x - 8, y - h - 4, 16, h + 1, OUTLINE);
  px(ctx, x - 7, y - h - 3, 7, h - 1, '#2D2926');
  px(ctx, x, y - h - 3, 7, h - 1, '#443E38');

  // Weathered cracks & blight moss streaks
  px(ctx, x - 5, y - h + 4, 2, 7, '#171412');
  px(ctx, x + 2, y - h + 9, 2, 8, '#365314');

  // Flickering medieval iron torch sconce on column
  const flicker = Math.floor(time * 10 + x) % 2 === 0;
  px(ctx, x - 2, y - h + 6, 4, 3, '#1C1917');
  px(ctx, x - 1, y - h + (flicker ? 3 : 4), 2, 3, flicker ? '#F59E0B' : '#EA580C');
  px(ctx, x - 1, y - h + 4, 1, 1, '#FEF08A');

  // Broken stone capital
  px(ctx, x - 10, y - h - 8, 20, 6, OUTLINE);
  px(ctx, x - 9, y - h - 7, 14, 4, '#57534E');
  px(ctx, x - 8, y - h - 7, 12, 1, '#78716C');
}

export function drawIsoMazeWall(
  ctx: CanvasRenderingContext2D,
  topPt: { x: number; y: number },
  rightPt: { x: number; y: number },
  bottomPt: { x: number; y: number },
  leftPt: { x: number; y: number },
  height: number,
  accentColor: string,
  isPost: boolean
) {
  const h = Math.round(height);
  const tx = Math.round(topPt.x);
  const ty = Math.round(topPt.y);
  const rx = Math.round(rightPt.x);
  const ry = Math.round(rightPt.y);
  const bx = Math.round(bottomPt.x);
  const by = Math.round(bottomPt.y);
  const lx = Math.round(leftPt.x);
  const ly = Math.round(leftPt.y);

  // Left vertical stone face (deep shadow)
  ctx.fillStyle = isPost ? '#29231F' : '#241F1C';
  ctx.beginPath();
  ctx.moveTo(lx, ly - h);
  ctx.lineTo(bx, by - h);
  ctx.lineTo(bx, by);
  ctx.lineTo(lx, ly);
  ctx.closePath();
  ctx.fill();

  // Right vertical stone face (weathered mid-tone masonry)
  ctx.fillStyle = isPost ? '#3B332E' : '#352E29';
  ctx.beginPath();
  ctx.moveTo(bx, by - h);
  ctx.lineTo(rx, ry - h);
  ctx.lineTo(rx, ry);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();

  // Top weathered stone cap diamond
  ctx.fillStyle = isPost ? '#574E46' : '#4A423B';
  ctx.beginPath();
  ctx.moveTo(tx, ty - h);
  ctx.lineTo(rx, ry - h);
  ctx.lineTo(bx, by - h);
  ctx.lineTo(lx, ly - h);
  ctx.closePath();
  ctx.fill();

  // Subtle horizontal mortar line across side faces for brick texture
  const midH = Math.round(h * 0.5);
  ctx.strokeStyle = '#14110F';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, ly - midH);
  ctx.lineTo(bx, by - midH);
  ctx.lineTo(rx, ry - midH);
  ctx.stroke();

  // Crisp pixel outline around wall prism
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, ty - h);
  ctx.lineTo(rx, ry - h);
  ctx.lineTo(rx, ry);
  ctx.lineTo(bx, by);
  ctx.lineTo(lx, ly);
  ctx.lineTo(lx, ly - h);
  ctx.closePath();
  ctx.stroke();

  // Highlight ridge on top edge + tiny moss/accent fleck on corner posts
  ctx.strokeStyle = '#6C6258';
  ctx.beginPath();
  ctx.moveTo(tx, ty - h + 1);
  ctx.lineTo(rx - 1, ry - h);
  ctx.stroke();

  if (isPost) {
    px(ctx, bx - 1, by - h - 2, 3, 2, accentColor);
  }
}

export function drawDungeonArchway(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  dir: DoorDirection,
  accentColor: string,
  time: number,
  label: string,
  nearPlayer: boolean,
  locked = false
) {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const flicker = Math.sin(time * 11 + x) > 0;

  // Stone archway frame & shadowed dungeon doorway
  px(ctx, x - 15, y - 24, 30, 26, OUTLINE);
  px(ctx, x - 14, y - 23, 28, 24, locked ? '#322726' : '#3D3631');
  px(ctx, x - 12, y - 22, 24, 3, locked ? '#523B39' : '#5C534B');

  // Dark arched passage opening
  px(ctx, x - 9, y - 18, 18, 19, '#090707');
  px(ctx, x - 7, y - 20, 14, 3, '#090707');

  if (locked) {
    // Wrought-iron portcullis bars sealing the chamber until all monsters are defeated
    for (let bx = -7; bx <= 7; bx += 4) {
      px(ctx, x + bx, y - 19, 2, 20, '#57534E');
      px(ctx, x + bx, y - 19, 1, 20, '#78716C');
    }
    // Horizontal iron crossbars & glowing crimson ward seal
    px(ctx, x - 9, y - 13, 18, 2, '#44403C');
    px(ctx, x - 9, y - 6, 18, 2, '#44403C');
    px(ctx, x - 3, y - 14, 6, 5, '#090707');
    px(ctx, x - 2, y - 13, 4, 3, flicker ? '#EF4444' : '#B91C1C');

    // Subtle crimson locked floor threshold
    ctx.save();
    ctx.globalAlpha = nearPlayer ? 0.52 : 0.24;
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(x - 7, y - 3, 14, 4);
    ctx.restore();
  } else {
    // Open chamber floor threshold glow showing unlocked passage
    ctx.save();
    ctx.globalAlpha = nearPlayer ? 0.62 : 0.3 + Math.sin(time * 4) * 0.08;
    ctx.fillStyle = accentColor;
    ctx.fillRect(x - 7, y - 3, 14, 4);
    ctx.restore();
  }

  // Twin medieval torches flanking the dungeon archway (blood-red when sealed, gold when unlocked)
  const flameC = locked
    ? flicker
      ? '#EF4444'
      : '#991B1B'
    : flicker
      ? '#F59E0B'
      : '#EA580C';
  px(ctx, x - 13, y - 14, 2, 5, '#1C1917');
  px(ctx, x - 13, y - 17, 2, 3, flameC);
  px(ctx, x + 11, y - 14, 2, 5, '#1C1917');
  px(ctx, x + 11, y - 17, 2, 3, flameC);

  // Direction arrow chevron & destination hint when near or on top walls
  if (nearPlayer || dir === 'north' || dir === 'west') {
    const caption = locked ? 'SEALED' : label;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    const textY = y - 27;
    ctx.fillStyle = '#090707';
    ctx.fillText(caption, x + 1, textY + 1);
    ctx.fillStyle = locked ? '#FCA5A5' : nearPlayer ? '#FDE68A' : '#D6D3D1';
    ctx.fillText(caption, x, textY);
  }
}

export function drawPowerUpOrb(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  color: string,
  rarityColor: string,
  time: number
) {
  const bob = Math.round(Math.sin(time * 6.2 + sx * 0.1) * 3);
  const x = Math.round(sx);
  const y = Math.round(sy) + bob;

  drawIsometricShadow(ctx, x, Math.round(sy) + 1, 7, Math.abs(bob) * 2);

  ctx.save();
  ctx.globalAlpha = 0.22 + Math.sin(time * 7) * 0.07;
  ctx.fillStyle = rarityColor;
  ctx.fillRect(x - 3, y - 28, 6, 20);
  ctx.restore();

  px(ctx, x - 5, y - 14, 10, 10, OUTLINE);
  px(ctx, x - 4, y - 13, 8, 8, rarityColor);
  px(ctx, x - 3, y - 12, 6, 6, color);
  px(ctx, x - 1, y - 10, 2, 2, '#FEF3C7');
  const ox = Math.round(Math.cos(time * 5.5) * 6);
  const oy = Math.round(Math.sin(time * 5.5) * 3);
  px(ctx, x + ox - 1, y - 10 + oy, 2, 2, '#FDE68A');
}

export function drawGearLootSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  rarityColor: string,
  time: number
) {
  const bob = Math.round(Math.sin(time * 4.8 + sy * 0.1) * 2);
  const x = Math.round(sx);
  const y = Math.round(sy) + bob;

  drawIsometricShadow(ctx, x, Math.round(sy) + 1, 8, Math.abs(bob) * 2);

  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = rarityColor;
  ctx.fillRect(x - 2, y - 24, 4, 16);
  ctx.restore();

  px(ctx, x - 6, y - 11, 12, 9, OUTLINE);
  px(ctx, x - 5, y - 10, 10, 7, '#3B2516');
  px(ctx, x - 5, y - 10, 10, 2, rarityColor);
  px(ctx, x - 1, y - 8, 2, 3, '#FDE68A');
}

export function drawWorldShrine(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  color: string,
  ready: boolean,
  time: number
) {
  // Ancient carved dark-fantasy stone altar with glowing relic brazier
  const x = Math.round(sx);
  const y = Math.round(sy);
  const pulse = ready ? Math.round(Math.sin(time * 5) * 2) : 0;

  px(ctx, x - 13, y - 5, 26, 9, OUTLINE);
  px(ctx, x - 12, y - 4, 24, 7, '#2B2623');
  px(ctx, x - 10, y - 7, 20, 4, '#47403B');

  const cryY = y - 21 + pulse;
  px(ctx, x - 5, cryY - 4, 10, 14, OUTLINE);
  px(ctx, x - 4, cryY - 3, 8, 12, ready ? color : '#57534E');
  px(ctx, x - 2, cryY - 1, 4, 8, ready ? '#FEF3C7' : '#78716C');

  if (ready) {
    ctx.save();
    ctx.globalAlpha = 0.24 + Math.sin(time * 4) * 0.08;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawPresetCollectible(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  time: number
) {
  // Glowing alchemical "Preset" serum catalyst relic — 10 needed for full Serum power
  const bob = Math.round(Math.sin(time * 5.8 + sx * 0.12) * 3);
  const x = Math.round(sx);
  const y = Math.round(sy) + bob;

  drawIsometricShadow(ctx, x, Math.round(sy) + 1, 7, Math.abs(bob) * 2);

  // Subtle vertical beacon beam
  ctx.save();
  ctx.globalAlpha = 0.24 + Math.sin(time * 6.5) * 0.08;
  ctx.fillStyle = '#84CC16';
  ctx.fillRect(x - 2, y - 26, 4, 18);
  ctx.restore();

  // Iron-capped emerald serum preset ampoule
  px(ctx, x - 4, y - 14, 8, 12, OUTLINE);
  px(ctx, x - 3, y - 13, 6, 2, '#A16207'); // bronze stopper
  px(ctx, x - 3, y - 11, 6, 8, '#4D7C0F'); // outer vial
  px(ctx, x - 2, y - 10, 4, 6, '#84CC16'); // glowing serum core
  px(ctx, x - 2, y - 10, 2, 4, '#ECFCCB'); // bright specular gleam
  px(ctx, x - 3, y - 3, 6, 1, '#D97706'); // brass base band

  // Crisp micro-tag so Sample Packs are unmistakable in the dungeon
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#090707';
  ctx.fillText('SAMPLE PACK', x + 1, y - 17);
  ctx.fillStyle = '#D9F99D';
  ctx.fillText('SAMPLE PACK', x, y - 18);
}

/**
 * Renders a locked or unlocked key-gate shortcut placed inside a procedural maze corridor.
 * Visually distinct wrought-iron gate with glowing golden padlock when locked; open stone threshold when unlocked.
 */
export function drawMazeShortcutDoor(
  ctx: CanvasRenderingContext2D,
  topPt: { x: number; y: number },
  rightPt: { x: number; y: number },
  bottomPt: { x: number; y: number },
  leftPt: { x: number; y: number },
  height: number,
  unlocked: boolean,
  time: number
) {
  const tx = Math.round(topPt.x);
  const ty = Math.round(topPt.y);
  const rx = Math.round(rightPt.x);
  const ry = Math.round(rightPt.y);
  const bx = Math.round(bottomPt.x);
  const by = Math.round(bottomPt.y);
  const lx = Math.round(leftPt.x);
  const ly = Math.round(leftPt.y);

  // Subtle floor threshold slab
  ctx.fillStyle = unlocked ? '#2B271F' : '#1E1510';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(rx, ry);
  ctx.lineTo(bx, by);
  ctx.lineTo(lx, ly);
  ctx.closePath();
  ctx.fill();

  if (unlocked) {
    // Open shortcut markers (warm amber floor rune glint)
    ctx.strokeStyle = '#65A30D';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(rx, ry);
    ctx.lineTo(bx, by);
    ctx.lineTo(lx, ly);
    ctx.closePath();
    ctx.stroke();
    return;
  }

  const h = Math.round(height);
  // Determine the long axis of the gate so iron bars span cleanly from post to post
  const spanA = Math.hypot(rx - tx, ry - ty);
  const spanB = Math.hypot(bx - rx, by - ry);
  const startX = spanA >= spanB ? Math.round((tx + lx) * 0.5) : Math.round((tx + rx) * 0.5);
  const startY = spanA >= spanB ? Math.round((ty + ly) * 0.5) : Math.round((ty + ry) * 0.5);
  const endX = spanA >= spanB ? Math.round((rx + bx) * 0.5) : Math.round((lx + bx) * 0.5);
  const endY = spanA >= spanB ? Math.round((ry + by) * 0.5) : Math.round((ly + by) * 0.5);

  // Translucent dark iron backing so the locked gate reads solidly against stone walls
  ctx.fillStyle = 'rgba(20, 12, 8, 0.72)';
  ctx.beginPath();
  ctx.moveTo(startX, startY - h);
  ctx.lineTo(endX, endY - h);
  ctx.lineTo(endX, endY);
  ctx.lineTo(startX, startY);
  ctx.closePath();
  ctx.fill();

  // Top & mid wrought-iron crossbeams (bronzed gold trim)
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, startY - h);
  ctx.lineTo(endX, endY - h);
  ctx.moveTo(startX, startY - Math.round(h * 0.48));
  ctx.lineTo(endX, endY - Math.round(h * 0.48));
  ctx.stroke();

  // Vertical iron prison pickets
  const bars = 5;
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= bars; i++) {
    const t = i / bars;
    const pxX = Math.round(startX + (endX - startX) * t);
    const pxY = Math.round(startY + (endY - startY) * t);
    ctx.beginPath();
    ctx.moveTo(pxX, pxY);
    ctx.lineTo(pxX, pxY - h - 1);
    ctx.stroke();
  }

  // Gleaming golden padlock emblem at center of gate
  const midX = Math.round((startX + endX) * 0.5);
  const midY = Math.round((startY + endY) * 0.5) - Math.round(h * 0.55);
  const pulse = Math.sin(time * 5.2) > 0 ? '#FEF08A' : '#F59E0B';
  px(ctx, midX - 4, midY - 4, 8, 8, OUTLINE);
  px(ctx, midX - 3, midY - 3, 6, 6, pulse);
  px(ctx, midX - 1, midY - 1, 2, 3, '#1C130C'); // keyhole slit

  // Crisp micro-tag
  ctx.font = 'bold 5px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#090707';
  ctx.fillText('LOCKED', midX + 1, midY - 7);
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('LOCKED', midX, midY - 8);
}

/**
 * Renders a golden Skeleton Key dropped randomly by defeated enemies to unlock maze shortcut doors.
 */
export function drawKeyPickupSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  time: number
) {
  const bob = Math.round(Math.sin(time * 6.0 + sx * 0.14) * 3);
  const x = Math.round(sx);
  const y = Math.round(sy) + bob;

  drawIsometricShadow(ctx, x, Math.round(sy) + 1, 6, Math.abs(bob) * 2);

  // Vertical golden glint beacon
  ctx.save();
  ctx.globalAlpha = 0.28 + Math.sin(time * 7.2) * 0.1;
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(x - 2, y - 24, 4, 16);
  ctx.restore();

  // Golden skeleton key bow (ring) + shaft + teeth
  px(ctx, x - 4, y - 15, 8, 6, OUTLINE);
  px(ctx, x - 3, y - 14, 6, 4, '#F59E0B');
  px(ctx, x - 1, y - 13, 2, 2, '#1C130C'); // bow hole
  px(ctx, x - 1, y - 9, 3, 7, OUTLINE);
  px(ctx, x, y - 9, 1, 6, '#FDE68A'); // shaft
  px(ctx, x + 1, y - 6, 3, 2, '#F59E0B'); // key tooth 1
  px(ctx, x + 1, y - 3, 2, 1, '#FEF08A'); // key tooth 2

  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#090707';
  ctx.fillText('KEY', x + 1, y - 18);
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('KEY', x, y - 19);
}

/**
 * Renders the mysterious dark-fantasy Shopkeeper in a tattered hooded cloak
 * holding a flickering brass lantern and merchant pack. Appears every 6 levels.
 */
export function drawShopkeeperSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  time: number,
  nearPlayer: boolean
) {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const breath = Math.round(Math.sin(time * 3.1) * 1);
  const flicker = Math.sin(time * 12 + x * 0.1) > 0;

  // Ground shadow & warm lantern pool on stone tiles
  drawIsometricShadow(ctx, x, y + 1, 10, 0);
  ctx.save();
  ctx.globalAlpha = nearPlayer ? 0.32 : 0.18;
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.ellipse(x + 6, y, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Flowing heavy hooded cloak silhouette (deep shadowy plum-charcoal with weathered bronze trim)
  px(ctx, x - 9, y - 22 + breath, 18, 22, OUTLINE);
  px(ctx, x - 8, y - 21 + breath, 16, 20, '#1D1824'); // dark inner robe
  px(ctx, x - 7, y - 20 + breath, 6, 18, '#2C2436'); // left cloak fold
  px(ctx, x + 1, y - 20 + breath, 6, 18, '#17121D'); // right shadow fold
  // Tattered bronze hem & merchant sash
  px(ctx, x - 8, y - 3 + breath, 16, 2, '#92400E');
  px(ctx, x - 4, y - 12 + breath, 9, 2, '#B45309'); // leather belt
  px(ctx, x - 1, y - 12 + breath, 2, 2, '#FDE68A'); // brass buckle

  // Merchant satchel slung at left hip
  px(ctx, x - 11, y - 13 + breath, 5, 7, OUTLINE);
  px(ctx, x - 10, y - 12 + breath, 3, 5, '#78350F');
  px(ctx, x - 9, y - 10 + breath, 2, 1, '#F59E0B');

  // Deep pointed medieval hood casting face into pure shadow
  px(ctx, x - 7, y - 31 + breath, 14, 11, OUTLINE);
  px(ctx, x - 6, y - 30 + breath, 12, 9, '#2A2233');
  px(ctx, x - 5, y - 33 + breath, 10, 4, OUTLINE);
  px(ctx, x - 4, y - 32 + breath, 8, 3, '#382D45'); // hood crown highlight
  px(ctx, x - 2, y - 34 + breath, 4, 2, '#2A2233'); // pointed hood tip

  // Shadowed hollow under hood + twin eerie glowing amber merchant eyes
  px(ctx, x - 4, y - 27 + breath, 8, 5, '#070508');
  const eyeColor = nearPlayer ? '#FEF08A' : '#F59E0B';
  px(ctx, x - 3, y - 25 + breath, 2, 2, eyeColor);
  px(ctx, x + 1, y - 25 + breath, 2, 2, eyeColor);

  // Cloaked arm & hanging flickering brass lantern on right
  px(ctx, x + 6, y - 19 + breath, 5, 5, OUTLINE);
  px(ctx, x + 7, y - 18 + breath, 3, 3, '#2C2436');
  // Lantern hook & glass housing
  px(ctx, x + 9, y - 16 + breath, 1, 3, '#78716C');
  px(ctx, x + 7, y - 13 + breath, 5, 7, OUTLINE);
  px(ctx, x + 8, y - 12 + breath, 3, 5, flicker ? '#FEF08A' : '#F59E0B');
  px(ctx, x + 9, y - 11 + breath, 1, 3, '#FFFFFF');
  px(ctx, x + 7, y - 14 + breath, 5, 1, '#B45309'); // lantern cap

  // Floating crisp merchant tag
  const caption = nearPlayer ? '[E] SHOPKEEPER' : 'SHOPKEEPER';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  const tagY = y - 37 + breath;
  ctx.fillStyle = '#090707';
  ctx.fillText(caption, x + 1, tagY + 1);
  ctx.fillStyle = nearPlayer ? '#FEF08A' : '#F59E0B';
  ctx.fillText(caption, x, tagY);
}

/**
 * Renders the dramatic in-world golden pixel-art Level-Up animation around Inhuman.
 * progress: 0..1 over the ~1.9s celebration window.
 */
export function drawLevelUpAura(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  progress: number,
  time: number
) {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const p = Math.max(0, Math.min(1, progress));
  const fadeOut = p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1;
  const fadeIn = p < 0.12 ? p / 0.12 : 1;
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0.02) return;

  ctx.save();

  // 1. Rising golden ascension light pillar
  const pillarW = Math.max(4, Math.round((22 - p * 10) * (0.85 + Math.sin(time * 24) * 0.15)));
  const pillarH = Math.round(58 + p * 34);
  ctx.globalAlpha = alpha * 0.34;
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(x - Math.floor(pillarW / 2), y - pillarH, pillarW, pillarH);
  ctx.globalAlpha = alpha * 0.48;
  ctx.fillStyle = '#FEF08A';
  const coreW = Math.max(2, Math.floor(pillarW * 0.45));
  ctx.fillRect(x - Math.floor(coreW / 2), y - pillarH + 6, coreW, pillarH - 6);

  // 2. Expanding dual isometric magic sigil halos on the stone floor
  const r1 = 12 + p * 26;
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r1, r1 * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  const r2 = 8 + ((p * 1.45) % 1) * 22;
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = '#BEF264';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, r2, r2 * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Swirling ascending pixel rune sparks orbiting Inhuman
  ctx.globalAlpha = alpha * 0.95;
  for (let i = 0; i < 8; i++) {
    const angle = time * 6.5 + (i * Math.PI) / 4;
    const orbitR = 10 + Math.sin(p * Math.PI) * 7;
    const rise = ((p * 2.1 + i * 0.14) % 1) * 44;
    const rx = Math.round(x + Math.cos(angle) * orbitR);
    const ry = Math.round(y - 4 - rise + Math.sin(angle) * 3);
    const sparkColor = i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? '#FDE047' : '#BEF264';
    px(ctx, rx - 1, ry - 1, 2, 2, sparkColor);
  }

  // 4. Crisp golden pixel starburst crown hovering above Inhuman's head
  const crownY = y - 34 - Math.round(p * 10);
  ctx.globalAlpha = alpha;
  px(ctx, x - 1, crownY - 4, 2, 9, '#FEF08A');
  px(ctx, x - 4, crownY - 1, 9, 2, '#FEF08A');
  px(ctx, x - 2, crownY - 2, 5, 5, '#F59E0B');
  px(ctx, x - 1, crownY - 1, 3, 3, '#FFFFFF');

  ctx.restore();
}

/**
 * Renders a tiered pixel-art Combo Aura around Inhuman's feet and silhouette (C-rank through SS-rank).
 * Scales from a crisp emerald floor ring at tier 1 up to orbiting flame runes & energy wisps at tier 5.
 */
export function drawComboAura(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tier: number,
  primaryColor: string,
  secondaryColor: string,
  timerRatio: number,
  time: number
) {
  if (tier < 1) return;
  const x = Math.round(sx);
  const y = Math.round(sy);
  const decayFade = Math.max(0.28, Math.min(1, timerRatio * 1.45));
  const pulse = 0.85 + Math.sin(time * (6 + tier * 2)) * 0.15;

  ctx.save();

  // 1. Primary isometric floor sigil halo
  const baseR = 11 + tier * 2.1;
  ctx.globalAlpha = (0.34 + tier * 0.08) * decayFade * pulse;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = tier >= 4 ? 2 : 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, baseR, baseR * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Secondary inner pulsing ring at B-rank (tier 2) and above
  if (tier >= 2) {
    const innerR = (baseR - 3.5) * (0.92 + Math.sin(time * 11) * 0.08);
    ctx.globalAlpha = (0.32 + tier * 0.06) * decayFade;
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, innerR, innerR * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Orbiting pixel embers & ascending combo sparks around Inhuman
  const sparkCount = Math.min(10, 2 + tier * 2);
  ctx.globalAlpha = 0.88 * decayFade;
  for (let i = 0; i < sparkCount; i++) {
    const speed = 4.2 + tier * 1.25;
    const ang = time * speed + (i * Math.PI * 2) / sparkCount;
    const orbitX = Math.cos(ang) * (baseR - 1);
    const orbitY = Math.sin(ang) * (baseR * 0.48);
    const rise = ((time * (1.1 + tier * 0.25) + i * 0.23) % 1) * (16 + tier * 5);
    const pxX = Math.round(x + orbitX);
    const pxY = Math.round(y - 2 - rise + orbitY * 0.45);
    const sz = tier >= 4 && i % 2 === 0 ? 2 : 1;
    const col = i % 3 === 0 ? secondaryColor : primaryColor;
    px(ctx, pxX, pxY, sz, sz + (tier >= 3 ? 1 : 0), col);
  }

  // 4. High-tier S / SS vertical heat shimmer streaks flanking Inhuman
  if (tier >= 4) {
    ctx.globalAlpha = (tier >= 5 ? 0.36 : 0.22) * decayFade * pulse;
    const h = tier >= 5 ? 34 : 26;
    const jitter = Math.round(Math.sin(time * 18) * 1.5);
    px(ctx, x - 9 + jitter, y - h, 2, h - 4, primaryColor);
    px(ctx, x + 7 - jitter, y - h + 3, 2, h - 6, secondaryColor);
    if (tier >= 5) {
      // SS INHUMAN crown sparks
      const crownY = y - 34 + Math.round(Math.sin(time * 14) * 1.5);
      ctx.globalAlpha = 0.9 * decayFade;
      px(ctx, x - 1, crownY - 2, 2, 5, secondaryColor);
      px(ctx, x - 2, crownY - 1, 5, 2, primaryColor);
    }
  }

  ctx.restore();
}

/**
 * Renders crisp pixelated diagonal combo hit slash streaks and star-flash at the point of impact.
 */
export function drawComboSlashVfx(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  angle: number,
  length: number,
  progress: number,
  primaryColor: string,
  secondaryColor: string,
  thickness: number
) {
  const p = Math.max(0, Math.min(1, progress));
  const alpha = p < 0.2 ? p / 0.2 : Math.max(0, 1 - (p - 0.2) / 0.8);
  if (alpha <= 0.03) return;

  const cx = Math.round(sx);
  const cy = Math.round(sy);
  const reach = length * (0.45 + p * 0.75);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer primary slash line
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = Math.max(1.5, thickness * (1 - p * 0.45));
  ctx.beginPath();
  ctx.moveTo(cx - dx * reach, cy - dy * reach);
  ctx.lineTo(cx + dx * reach, cy + dy * reach);
  ctx.stroke();

  // Bright core streak
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = Math.max(1, thickness * 0.45);
  ctx.beginPath();
  ctx.moveTo(cx - dx * reach * 0.65, cy - dy * reach * 0.65);
  ctx.lineTo(cx + dx * reach * 0.65, cy + dy * reach * 0.65);
  ctx.stroke();

  // Impact pixel star glint on initial frames
  if (p < 0.45) {
    const starSize = Math.max(2, Math.round((1 - p / 0.45) * 4));
    px(ctx, cx - starSize, cy, starSize * 2 + 1, 1, secondaryColor);
    px(ctx, cx, cy - starSize, 1, starSize * 2 + 1, secondaryColor);
  }

  ctx.restore();
}

/**
 * Renders a crisp pixelated combo ghost afterimage behind Inhuman at B-rank (7+ hits) and above.
 */
export function drawComboAfterimage(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  facingLeft: boolean,
  color: string,
  alpha: number
) {
  if (alpha <= 0.03) return;
  const x = Math.round(sx);
  const y = Math.round(sy);
  const dir = facingLeft ? -1 : 1;

  ctx.save();
  ctx.globalAlpha = Math.min(0.55, alpha);
  // Stylized hooded/armored silhouette in combo tier tint
  px(ctx, x - 4, y - 24, 8, 6, color); // head/helm
  px(ctx, x - 6, y - 18, 12, 11, color); // shoulders & torso
  px(ctx, x - 5, y - 7, 4, 7, color); // left leg
  px(ctx, x + 1, y - 7, 4, 7, color); // right leg
  px(ctx, x + dir * 5, y - 16, 4, 7, color); // forward strike limb
  ctx.restore();
}

/**
 * Renders animated dark-fantasy ambient life:
 * - 'rat': scurrying crypt rat on stone tiles with animated feet & tail
 * - 'bat': flapping blight bat aloft with soft shadow below
 * - 'moth': fluttering pale bone/ash moth
 * - 'wisp': softly pulsing bioluminescent wasteland spore wisp
 */
export function drawAmbientCritterSprite(
  ctx: CanvasRenderingContext2D,
  kind: 'rat' | 'bat' | 'moth' | 'wisp',
  groundX: number,
  groundY: number,
  bodyX: number,
  bodyY: number,
  z: number,
  facingLeft: boolean,
  phase: number,
  color: string,
  accentColor: string
) {
  const gx = Math.round(groundX);
  const gy = Math.round(groundY);
  const x = Math.round(bodyX);
  const y = Math.round(bodyY);
  const dir = facingLeft ? -1 : 1;

  if (kind === 'rat') {
    const step = Math.sin(phase) > 0 ? 1 : 0;
    const tailWag = Math.round(Math.sin(phase * 0.8) * 1);

    // Subtle ground contact shadow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#090707';
    ctx.fillRect(gx - 4, gy - 1, 8, 2);
    ctx.restore();

    // Long twitching pixel tail behind body
    px(ctx, x - dir * 5, y - 3 + tailWag, 3, 1, '#9A8C82');
    px(ctx, x - dir * 7, y - 4 + tailWag, 2, 1, '#78716C');

    // Compact hunched rat body + tiny rounded ears
    px(ctx, x - 3, y - 5, 6, 4, OUTLINE);
    px(ctx, x - 2, y - 4, 4, 2, color);
    px(ctx, x + dir * 1, y - 5, 2, 1, '#78716C'); // ear highlight

    // Pointed snout + crimson eye glint
    px(ctx, x + dir * 3, y - 3, 2, 2, color);
    px(ctx, x + dir * 2, y - 4, 1, 1, accentColor);

    // Animated tiny scurrying paws
    px(ctx, x - 2 + step, y - 1, 1, 1, '#292524');
    px(ctx, x + 1 - step, y - 1, 1, 1, '#292524');
    return;
  }

  if (kind === 'bat') {
    const flap = Math.sin(phase);
    const wingUp = flap > 0.25;
    const wingDown = flap < -0.25;

    // Tiny shadow projected far below on the floor tiles
    ctx.save();
    ctx.globalAlpha = Math.max(0.12, 0.28 - z * 0.004);
    ctx.fillStyle = '#090707';
    ctx.fillRect(gx - 3, gy - 1, 6, 2);
    ctx.restore();

    // Central bat torso & twin pointed ears
    px(ctx, x - 2, y - 4, 4, 4, OUTLINE);
    px(ctx, x - 1, y - 3, 2, 2, color);
    px(ctx, x - 2, y - 5, 1, 1, color);
    px(ctx, x + 1, y - 5, 1, 1, color);
    // Tiny amber eye glints
    px(ctx, x - 1, y - 3, 1, 1, accentColor);
    px(ctx, x + 1, y - 3, 1, 1, accentColor);

    // Animated flapping pixel wings
    if (wingUp) {
      px(ctx, x - 6, y - 7, 4, 3, OUTLINE);
      px(ctx, x - 5, y - 6, 3, 2, color);
      px(ctx, x + 2, y - 7, 4, 3, OUTLINE);
      px(ctx, x + 2, y - 6, 3, 2, color);
    } else if (wingDown) {
      px(ctx, x - 6, y - 2, 4, 3, OUTLINE);
      px(ctx, x - 5, y - 1, 3, 2, color);
      px(ctx, x + 2, y - 2, 4, 3, OUTLINE);
      px(ctx, x + 2, y - 1, 3, 2, color);
    } else {
      px(ctx, x - 7, y - 4, 5, 2, OUTLINE);
      px(ctx, x - 6, y - 3, 4, 1, color);
      px(ctx, x + 2, y - 4, 5, 2, OUTLINE);
      px(ctx, x + 2, y - 3, 4, 1, color);
    }
    return;
  }

  if (kind === 'moth') {
    const spread = Math.sin(phase) > 0;
    // Delicate pale fluttering wings
    px(ctx, x, y - 3, 1, 3, '#1C1917');
    if (spread) {
      px(ctx, x - 3, y - 4, 3, 2, color);
      px(ctx, x + 1, y - 4, 3, 2, color);
      px(ctx, x - 2, y - 2, 2, 1, accentColor);
      px(ctx, x + 1, y - 2, 2, 1, accentColor);
    } else {
      px(ctx, x - 1, y - 5, 3, 3, color);
      px(ctx, x, y - 4, 1, 1, accentColor);
    }
    return;
  }

  // 'wisp': softly pulsing bioluminescent wasteland spore mote
  const pulse = 0.5 + 0.5 * Math.sin(phase);
  ctx.save();
  ctx.globalAlpha = 0.22 + pulse * 0.28;
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 4, 6, 6);
  ctx.globalAlpha = 0.72 + pulse * 0.25;
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 2, 3, 3);
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y - 1, 1, 1);
  ctx.restore();
}

