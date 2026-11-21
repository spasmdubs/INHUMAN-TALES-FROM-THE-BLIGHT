export const HERO_NAME = 'INHUMAN';

export type HairStyleId =
  | 'spiked'
  | 'mane'
  | 'undercut'
  | 'braided'
  | 'mullet'
  | 'bald';

export type FaceStyleId =
  | 'stoic'
  | 'visor'
  | 'rogue'
  | 'runes'
  | 'bearded'
  | 'masked';

export type ClothingTypeId =
  | 'trenchcoat'
  | 'runic_plate'
  | 'biker_vest'
  | 'battle_robe'
  | 'exo_suit'
  | 'tech_harness';

export type ShoeTypeId =
  | 'rocket_greaves'
  | 'spiked_boots'
  | 'neon_hitops'
  | 'iron_sabatons'
  | 'hover_striders'
  | 'shadow_tabi';

export type AccessoryId =
  | 'none'
  | 'energy_cape'
  | 'holo_halo'
  | 'laser_pauldron'
  | 'katana_sheath'
  | 'grimoire_drone'
  | 'war_crown';

export interface SwatchOption {
  id: string;
  label: string;
  hex: string;
  shade: string;
  highlight: string;
}

export interface StyleOption<T extends string> {
  id: T;
  label: string;
  desc: string;
}

export type FighterClassId = 'brawler' | 'assassin' | 'juggernaut' | 'weaver';

export interface FighterClassSpec {
  id: FighterClassId;
  label: string;
  role: string;
  traitName: string;
  description: string;
  accentHex: string;
  maxHp: number;
  moveSpeedMult: number;
  meleeDamageMult: number;
  knockbackMult: number;
  astralGainMult: number;
  specialRangeMult: number;
  specialDamageMult: number;
  specialCost: number;
  dashCooldown: number;
}

export const FIGHTER_CLASSES: FighterClassSpec[] = [
  {
    id: 'brawler',
    label: 'Oathbreaker',
    role: 'Mercenary Bruiser',
    traitName: 'Iron Resolve',
    description:
      'Battle-scarred sellsword with balanced grit, crisp heavy combos, and steady Serum VST control.',
    accentHex: '#D97706',
    maxHp: 110,
    moveSpeedMult: 1.0,
    meleeDamageMult: 1.05,
    knockbackMult: 1.05,
    astralGainMult: 1.0,
    specialRangeMult: 1.0,
    specialDamageMult: 1.0,
    specialCost: 40,
    dashCooldown: 0.52,
  },
  {
    id: 'assassin',
    label: 'Nightblade',
    role: 'Shadow Cutthroat',
    traitName: 'Grim Step',
    description:
      'Swift wasteland stalker with relentless evade speed, rapid strikes, and vicious critical blows.',
    accentHex: '#10B981',
    maxHp: 88,
    moveSpeedMult: 1.22,
    meleeDamageMult: 1.18,
    knockbackMult: 0.9,
    astralGainMult: 1.15,
    specialRangeMult: 0.95,
    specialDamageMult: 1.1,
    specialCost: 36,
    dashCooldown: 0.34,
  },
  {
    id: 'juggernaut',
    label: 'Dreadnought',
    role: 'Plate-Bound Knight',
    traitName: 'Bastion Bulk',
    description:
      'Towering ironclad bulwark with massive vitality and bone-crushing blows that scatter horrors.',
    accentHex: '#DC2626',
    maxHp: 145,
    moveSpeedMult: 0.88,
    meleeDamageMult: 1.24,
    knockbackMult: 1.38,
    astralGainMult: 0.9,
    specialRangeMult: 1.05,
    specialDamageMult: 1.15,
    specialCost: 44,
    dashCooldown: 0.68,
  },
  {
    id: 'weaver',
    label: 'Plague Alchemist',
    role: 'Serum VST Channeler',
    traitName: 'Blight Surge',
    description:
      'Forbidden apothecary who distills potent Serum VST bursts with wider reach and faster recovery.',
    accentHex: '#84CC16',
    maxHp: 96,
    moveSpeedMult: 1.06,
    meleeDamageMult: 0.95,
    knockbackMult: 1.0,
    astralGainMult: 1.55,
    specialRangeMult: 1.32,
    specialDamageMult: 1.25,
    specialCost: 30,
    dashCooldown: 0.48,
  },
];

export function getFighterClass(id: FighterClassId | undefined): FighterClassSpec {
  return FIGHTER_CLASSES.find((c) => c.id === id) ?? FIGHTER_CLASSES[0];
}

export interface CharacterConfig {
  name: string;
  fighterClass: FighterClassId;
  hairStyle: HairStyleId;
  hairColor: string;
  faceStyle: FaceStyleId;
  skinTone: string;
  eyeColor: string;
  clothingType: ClothingTypeId;
  clothingColor: string;
  shoeType: ShoeTypeId;
  shoeColor: string;
  accessory: AccessoryId;
}

export const HAIR_STYLES: StyleOption<HairStyleId>[] = [
  { id: 'spiked', label: 'Wildmane Crest', desc: 'Ragged windswept locks' },
  { id: 'mane', label: 'Barbarian Mane', desc: 'Wild shoulder-length locks' },
  { id: 'undercut', label: 'Sellsword Crop', desc: 'Swept mercenary cut' },
  { id: 'braided', label: 'Shieldmaiden Braids', desc: 'Twin iron-clasped braids' },
  { id: 'mullet', label: 'Outlaw Shag', desc: 'Long ragged ranger hair' },
  { id: 'bald', label: 'Tonsured Brand', desc: 'Shaved brow with carved brand' },
];

export const HAIR_COLORS: SwatchOption[] = [
  { id: 'crimson', label: 'Blood Auburn', hex: '#B91C1C', shade: '#7F1D1D', highlight: '#F87171' },
  { id: 'amber', label: 'Tarnished Gold', hex: '#D97706', shade: '#92400E', highlight: '#FDE68A' },
  { id: 'violet', label: 'Nightshade', hex: '#6B21A8', shade: '#3B0764', highlight: '#C084FC' },
  { id: 'cyan', label: 'Frost Slate', hex: '#475569', shade: '#1E293B', highlight: '#94A3B8' },
  { id: 'silver', label: 'Ashen Silver', hex: '#CBD5E1', shade: '#64748B', highlight: '#F8FAFC' },
  { id: 'obsidian', label: 'Raven Black', hex: '#1F2229', shade: '#0E1015', highlight: '#474D5C' },
  { id: 'chestnut', label: 'Burnt Chestnut', hex: '#854D27', shade: '#4A2511', highlight: '#C27D48' },
  { id: 'emerald', label: 'Blight Moss', hex: '#3F6212', shade: '#1A2E05', highlight: '#84CC16' },
];

export const FACE_STYLES: StyleOption<FaceStyleId>[] = [
  { id: 'stoic', label: 'Scarred Veteran', desc: 'Deep blade scar across cheek' },
  { id: 'visor', label: 'Iron Blindfold', desc: 'Riveted penitent eye-band' },
  { id: 'rogue', label: 'Gallows Grin', desc: 'Grim scarred smirk' },
  { id: 'runes', label: 'Blood War Paint', desc: 'Ash & crimson ritual markings' },
  { id: 'bearded', label: 'Oathkeeper Beard', desc: 'Thick braided warrior beard' },
  { id: 'masked', label: 'Plague Wrap', desc: 'Tattered wasteland cloth mask' },
];

export const SKIN_TONES: SwatchOption[] = [
  { id: 'alabaster', label: 'Pale Ivory', hex: '#F3D7C4', shade: '#C9A28A', highlight: '#FFF1E8' },
  { id: 'peach', label: 'Weathered Fair', hex: '#E3B290', shade: '#B5805E', highlight: '#F7CCA9' },
  { id: 'golden', label: 'Tanned Ochre', hex: '#C98F60', shade: '#966138', highlight: '#E3AE80' },
  { id: 'bronze', label: 'Rich Bronze', hex: '#965C3B', shade: '#663A22', highlight: '#BA7A54' },
  { id: 'obsidian', label: 'Deep Umber', hex: '#593526', shade: '#361D12', highlight: '#7D4E3A' },
  { id: 'astral_violet', label: 'Cadaver Pale', hex: '#B8B2A6', shade: '#7E7970', highlight: '#DDD8CD' },
  { id: 'starlight_cyan', label: 'Blighted Ash', hex: '#94A194', shade: '#5E6B5E', highlight: '#C2CFC2' },
];

export const EYE_COLORS: SwatchOption[] = [
  { id: 'amber', label: 'Ember Gold', hex: '#F59E0B', shade: '#92400E', highlight: '#FEF3C7' },
  { id: 'cyan', label: 'Pale Frost', hex: '#93C5FD', shade: '#3B82F6', highlight: '#DBEAFE' },
  { id: 'crimson', label: 'Blood Ruby', hex: '#E11D48', shade: '#881337', highlight: '#FECDD3' },
  { id: 'emerald', label: 'Serum Green', hex: '#84CC16', shade: '#3F6212', highlight: '#ECFCCB' },
  { id: 'violet', label: 'Cursed Plum', hex: '#A855F7', shade: '#581C87', highlight: '#F3E8FF' },
  { id: 'ice', label: 'Wight White', hex: '#E2E8F0', shade: '#94A3B8', highlight: '#FFFFFF' },
  { id: 'void', label: 'Hollow Pitch', hex: '#18181B', shade: '#09090B', highlight: '#3F3F46' },
];

export const CLOTHING_TYPES: StyleOption<ClothingTypeId>[] = [
  { id: 'trenchcoat', label: 'Inquisitor Greatcoat', desc: 'Tattered leather mantle & collar' },
  { id: 'runic_plate', label: 'Blighted Plate', desc: 'Forged gothic iron breastplate' },
  { id: 'biker_vest', label: 'Brigand Jerkin', desc: 'Studded boiled-leather vest' },
  { id: 'battle_robe', label: 'Cultist Vestments', desc: 'Torn acolyte robe & sash' },
  { id: 'exo_suit', label: 'Chainmail Hauberk', desc: 'Dark-iron mail & riveted surcoat' },
  { id: 'tech_harness', label: 'Gladiator Straps', desc: 'Crossed rawhide battle harness' },
];

export const CLOTHING_COLORS: SwatchOption[] = [
  { id: 'royal_indigo', label: 'Storm Iron', hex: '#3F4756', shade: '#242933', highlight: '#6B768A' },
  { id: 'crimson', label: 'Dried Blood', hex: '#991B1B', shade: '#5C1111', highlight: '#DC2626' },
  { id: 'amber_bronze', label: 'Rusted Bronze', hex: '#9A5B13', shade: '#5C3409', highlight: '#D97706' },
  { id: 'obsidian', label: 'Charred Ash', hex: '#292524', shade: '#161413', highlight: '#57534E' },
  { id: 'amethyst', label: 'Mourning Plum', hex: '#581C87', shade: '#33104F', highlight: '#9333EA' },
  { id: 'teal', label: 'Fen Moss', hex: '#365314', shade: '#1A2E05', highlight: '#65A30D' },
  { id: 'ivory', label: 'Bleached Bone', hex: '#B8B0A0', shade: '#736C60', highlight: '#E7E2D8' },
];

export const SHOE_TYPES: StyleOption<ShoeTypeId>[] = [
  { id: 'rocket_greaves', label: 'Spurred Greaves', desc: 'Steel greaves with brass spurs' },
  { id: 'spiked_boots', label: 'Iron-Shod Boots', desc: 'Hobnailed heavy war boots' },
  { id: 'neon_hitops', label: 'Laced Leather', desc: 'Worn medieval traveler boots' },
  { id: 'iron_sabatons', label: 'Knight Sabatons', desc: 'Articulated gothic plate boots' },
  { id: 'hover_striders', label: 'Blight-Walkers', desc: 'Mire-stained plague-tread boots' },
  { id: 'shadow_tabi', label: 'Stalker Wraps', desc: 'Bound hide & cloth footwraps' },
];

export const SHOE_COLORS: SwatchOption[] = [
  { id: 'charcoal', label: 'Blackened Iron', hex: '#292524', shade: '#141211', highlight: '#57534E' },
  { id: 'crimson', label: 'Oxblood Hide', hex: '#7F1D1D', shade: '#450A0A', highlight: '#B91C1C' },
  { id: 'gold', label: 'Tarnished Brass', hex: '#A16207', shade: '#5C3704', highlight: '#EAB308' },
  { id: 'cyan', label: 'Bog Leather', hex: '#3F6212', shade: '#1E3107', highlight: '#65A30D' },
  { id: 'violet', label: 'Ashen Slate', hex: '#44403C', shade: '#262321', highlight: '#78716C' },
  { id: 'ivory', label: 'Bone Hide', hex: '#A8A29E', shade: '#57534E', highlight: '#E7E5E4' },
];

export const ACCESSORIES: StyleOption<AccessoryId>[] = [
  { id: 'none', label: 'None', desc: 'Unburdened silhouette' },
  { id: 'energy_cape', label: 'Tattered Cloak', desc: 'Weathered crimson-ash war cloak' },
  { id: 'holo_halo', label: 'Crown of Thorns', desc: 'Wrought-iron & ember thorn halo' },
  { id: 'laser_pauldron', label: 'Spiked Pauldron', desc: 'Forged iron & bone shoulder guard' },
  { id: 'katana_sheath', label: 'Greatsword Scabbard', desc: 'Back-slung medieval broadsword' },
  { id: 'grimoire_drone', label: 'Cursed Grimoire', desc: 'Floating chained dark-magic tome' },
  { id: 'war_crown', label: 'Horned Iron Crown', desc: 'Ancient blackened war crown' },
];

export const DEFAULT_CHARACTER: CharacterConfig = {
  name: HERO_NAME,
  fighterClass: 'brawler',
  hairStyle: 'mane',
  hairColor: 'obsidian',
  faceStyle: 'stoic',
  skinTone: 'alabaster',
  eyeColor: 'emerald',
  clothingType: 'trenchcoat',
  clothingColor: 'obsidian',
  shoeType: 'iron_sabatons',
  shoeColor: 'charcoal',
  accessory: 'energy_cape',
};

export interface CharacterPreset {
  id: string;
  label: string;
  config: CharacterConfig;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'blight_paladin',
    label: 'Blight Dreadnought',
    config: {
      name: HERO_NAME,
      fighterClass: 'juggernaut',
      hairStyle: 'mane',
      hairColor: 'silver',
      faceStyle: 'visor',
      skinTone: 'alabaster',
      eyeColor: 'amber',
      clothingType: 'runic_plate',
      clothingColor: 'royal_indigo',
      shoeType: 'iron_sabatons',
      shoeColor: 'gold',
      accessory: 'holo_halo',
    },
  },
  {
    id: 'plague_cutthroat',
    label: 'Mire Nightblade',
    config: {
      name: HERO_NAME,
      fighterClass: 'assassin',
      hairStyle: 'undercut',
      hairColor: 'crimson',
      faceStyle: 'masked',
      skinTone: 'peach',
      eyeColor: 'crimson',
      clothingType: 'biker_vest',
      clothingColor: 'obsidian',
      shoeType: 'shadow_tabi',
      shoeColor: 'crimson',
      accessory: 'katana_sheath',
    },
  },
  {
    id: 'cursed_alchemist',
    label: 'Plague Alchemist',
    config: {
      name: HERO_NAME,
      fighterClass: 'weaver',
      hairStyle: 'braided',
      hairColor: 'emerald',
      faceStyle: 'runes',
      skinTone: 'starlight_cyan',
      eyeColor: 'emerald',
      clothingType: 'battle_robe',
      clothingColor: 'teal',
      shoeType: 'hover_striders',
      shoeColor: 'cyan',
      accessory: 'grimoire_drone',
    },
  },
  {
    id: 'ashen_warlord',
    label: 'Ashen Oathbreaker',
    config: {
      name: HERO_NAME,
      fighterClass: 'brawler',
      hairStyle: 'mullet',
      hairColor: 'obsidian',
      faceStyle: 'bearded',
      skinTone: 'bronze',
      eyeColor: 'amber',
      clothingType: 'tech_harness',
      clothingColor: 'crimson',
      shoeType: 'spiked_boots',
      shoeColor: 'charcoal',
      accessory: 'war_crown',
    },
  },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isCustomHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function createCustomSwatch(hex: string): SwatchOption {
  const normalized = hex.toUpperCase();
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  const shade = rgbToHex(r * 0.62, g * 0.62, b * 0.65);
  const highlight = rgbToHex(r + (255 - r) * 0.4, g + (255 - g) * 0.4, b + (255 - b) * 0.4);

  return {
    id: normalized,
    label: `Custom (${normalized})`,
    hex: normalized,
    shade,
    highlight,
  };
}

export function findSwatch(list: SwatchOption[], id: string): SwatchOption {
  const preset = list.find((item) => item.id === id);
  if (preset) return preset;
  if (isCustomHexColor(id)) {
    return createCustomSwatch(id);
  }
  return list[0];
}

export function findStyleLabel<T extends string>(list: StyleOption<T>[], id: T): string {
  return list.find((item) => item.id === id)?.label ?? id;
}

export function randomizeCharacter(rng: () => number = Math.random): CharacterConfig {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length) % arr.length];
  return {
    name: HERO_NAME,
    fighterClass: pick(FIGHTER_CLASSES).id,
    hairStyle: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS).id,
    faceStyle: pick(FACE_STYLES).id,
    skinTone: pick(SKIN_TONES).id,
    eyeColor: pick(EYE_COLORS).id,
    clothingType: pick(CLOTHING_TYPES).id,
    clothingColor: pick(CLOTHING_COLORS).id,
    shoeType: pick(SHOE_TYPES).id,
    shoeColor: pick(SHOE_COLORS).id,
    accessory: pick(ACCESSORIES).id,
  };
}

export function describeCharacterSummary(cfg: CharacterConfig): string {
  const classSpec = getFighterClass(cfg.fighterClass);
  const hairStyle = findStyleLabel(HAIR_STYLES, cfg.hairStyle);
  const hairColor = findSwatch(HAIR_COLORS, cfg.hairColor).label;
  const faceStyle = findStyleLabel(FACE_STYLES, cfg.faceStyle);
  const skinTone = findSwatch(SKIN_TONES, cfg.skinTone).label;
  const eyeColor = findSwatch(EYE_COLORS, cfg.eyeColor).label;
  const clothing = findStyleLabel(CLOTHING_TYPES, cfg.clothingType);
  const clothingColor = findSwatch(CLOTHING_COLORS, cfg.clothingColor).label;
  const shoes = findStyleLabel(SHOE_TYPES, cfg.shoeType);
  const shoeColor = findSwatch(SHOE_COLORS, cfg.shoeColor).label;
  const accessory = findStyleLabel(ACCESSORIES, cfg.accessory);

  return [
    `Name: ${HERO_NAME}`,
    `Class: ${classSpec.label} (${classSpec.role})`,
    `Hair: ${hairColor} ${hairStyle}`,
    `Face: ${faceStyle}`,
    `Skin: ${skinTone}`,
    `Eyes: ${eyeColor}`,
    `Outfit: ${clothingColor} ${clothing}`,
    `Footwear: ${shoeColor} ${shoes}`,
    `Accessory: ${accessory}`,
  ].join(' | ');
}

export function buildPortraitPrompt(cfg: CharacterConfig): string {
  const classSpec = getFighterClass(cfg.fighterClass);
  const hairStyle = findStyleLabel(HAIR_STYLES, cfg.hairStyle);
  const hairColor = findSwatch(HAIR_COLORS, cfg.hairColor).label;
  const faceStyle = findStyleLabel(FACE_STYLES, cfg.faceStyle);
  const skinTone = findSwatch(SKIN_TONES, cfg.skinTone).label;
  const eyeColor = findSwatch(EYE_COLORS, cfg.eyeColor).label;
  const clothing = findStyleLabel(CLOTHING_TYPES, cfg.clothingType);
  const clothingColor = findSwatch(CLOTHING_COLORS, cfg.clothingColor).label;
  const shoes = findStyleLabel(SHOE_TYPES, cfg.shoeType);
  const shoeColor = findSwatch(SHOE_COLORS, cfg.shoeColor).label;
  const accessory =
    cfg.accessory === 'none' ? '' : `, wearing ${findStyleLabel(ACCESSORIES, cfg.accessory)}`;

  return `1980s hand-painted medieval dark fantasy box art character illustration: grim ${classSpec.label} (${classSpec.role}) known as ${HERO_NAME} with ${skinTone} skin, ${hairColor} ${hairStyle} hair, ${faceStyle} facial features, haunting ${eyeColor} eyes, dressed in ${clothingColor} ${clothing} and ${shoeColor} ${shoes}${accessory}. Standing ready for battle on a cracked gothic stone ruin in a decaying wasteland called The Blight with drifting ash, dead trees, flickering torchlight, and vintage oil-and-gouache fantasy painting texture, purely medieval dark fantasy, no sci-fi, no text, no logos, no UI.`;
}

const STORAGE_KEY = 'blight_inhuman_character_v2';

export function loadSavedCharacter(): CharacterConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CHARACTER, name: HERO_NAME };
    const parsed = JSON.parse(raw) as Partial<CharacterConfig>;
    return {
      ...DEFAULT_CHARACTER,
      ...parsed,
      name: HERO_NAME,
    };
  } catch {
    return { ...DEFAULT_CHARACTER, name: HERO_NAME };
  }
}

export function saveCharacter(cfg: CharacterConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cfg, name: HERO_NAME }));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}
