/**
 * Character stat totals, following the workbook's DMG Efficiency Data and
 * Character Data calculations: each stat is a product of groups, and each
 * group is 1 + the sum of its sources.
 *
 * Units: `percent` gear/class effects are whole percents (7 = 7%); every
 * other bonus is a fraction (0.4 = 40%); base stats (enhance, growth,
 * knowledge, soul weapon) are flat.
 */

export const ELEMENTS = ["Fire", "Water", "Wind", "Earth"] as const;
export type Element = (typeof ELEMENTS)[number];
export type ByElement = Record<Element, number>;

export const noElements = (): ByElement => ({ Fire: 0, Water: 0, Wind: 0, Earth: 0 });

export type StatSources = {
  mantra: number;
  weapon: { equip: number; owned: number };
  accessory: { equip: number; owned: number };
  classes: { equip: number; owned: number };
  /** The promotion's ATK / HP multiplier (1 with no promotion). */
  promotionBonus: number;
  spirits: { atk: number; hp: number; gold: number; exp: number };
  /** Spirit skills that raise a stat: Bo's Wild Heart Total HP, as a fraction. */
  spiritSkills: { hp: number };
  enhance: {
    atk: number; hp: number; hpRecovery: number; critDamage: number; critChance: number;
    /** Death Strike damage and chance, as fractions (DMG Efficiency Data B44, B48). */
    deathStrikeDamage: number; deathStrikeChance: number;
  };
  growth: { atk: number; hp: number; hpRecovery: number; crit: number; gold: number; accuracy: number; dodge: number };
  /** Growing Knowledge combined value. */
  knowledge: number;
  /** Equipped soul weapon ATK, its gems' Engraving Effect (Soul Weapon ATK fraction) and completion effects. */
  soulWeapon: { atk: number; engravingAtk: number; completionAtk: number; completionHp: number };
  /** Weapon and accessory secondary stats (Equipment Data B427:E430), as fractions. */
  gearSecondary: { critDamage: number; gold: number; exp: number; mana: number; manaRecovery: number };
  /** Skill Refinement owned effects (Skills Data I77:M77): ATK and HP as fractions, CRIT DMG fraction, Accuracy and Dodge flat. */
  refinement: { atk: number; hp: number; critDamage: number; accuracy: number; dodge: number };
  /** Black Orb: element amps and element damage by element, resonance ATK and HP, orb level boss / monster damage (fractions). */
  blackOrb: { amp: ByElement; element: ByElement; atk: number; hp: number; boss: number; monster: number };
  /** Beasts: owned (combat) effect on ATK, HP and HP Recovery, and mounted ATK, as fractions. */
  beasts: { combat: number; mountedAtk: number; mountedMspd: number };
  /** Owned clothing and guild shop outfits: ATK, HP, gold and EXP fractions, flat Accuracy and Dodge. */
  appearance: { atk: number; hp: number; gold: number; exp: number; accuracy: number; dodge: number };
  /** Sealed Shrine: Chaos soul weapon ATK amp and Character ATK, Demon Character HP, Order element damage. */
  shrine: { soulWeaponAtk: number; atk: number; hp: number; element: ByElement };
  /** Soul gems on the equipped soul weapon's plate (the workbook's Additional Options). */
  engraving: { atk: number; hp: number; hpRecovery: number; critDamage: number; gold: number; accuracy: number; dodge: number };
  relics: { atk: number; critDamage: number; hp: number; hpRecovery: number; gold: number; accuracy: number; dodge: number; speed: number; element: ByElement };
  companionPromotion: {
    atk: number; critDamage: number; hp: number; hpRecovery: number; mana: number; manaRecovery: number;
    gold: number; accuracy: number; dodge: number; exp: number; ccResist: number;
  };
  slayerPromotion: {
    atk: number; hp: number; hpRecovery: number; critDamage: number; mana: number; manaRecovery: number;
    gold: number; exp: number; accuracy: number; dodge: number; ccResist: number;
  };
  mastery: { atk: number; hp: number; hpRegen: number; gold: number; exp: number; hpAmp: number; hpRegenAmp: number };
  companions: {
    blessingOfForest: number; bladeDance: number; fortitude: number; lunatic: number; intensiveFire: number;
    shadowDance: number; goldRush: number; goldRush2: number; hymn: number; manaDope: number; manaAmplification: number;
    understanding: ByElement;
    /** Each companion's Status: element damage by its element. */
    status: ByElement;
  };
  memoryTree: { atk: number; hp: number; vit: number; atkMultiplier: number; hpMultiplier: number; goldAll: number; goldStage: number; expAll: number; expStage: number };
  constellation: { atk: number; hp: number; hpRecovery: number; promotion: number; goldAll: number; goldStage: number; expAll: number; expStage: number; amplify: ByElement };
  familiarProficiency: { atk: number; hp: number; slayer: number; attribute: number };
  skillProficiency: number;
  /** Buffs from the active skill preset, zero unless skills are included. */
  skills: { atk: number; manaRecovery: number };
};

export type Stats = {
  attack: number;
  hp: number;
  hpRecovery: number;
  /** Fractions: 0.1 = 10%. */
  critChance: number;
  critDamage: number;
  deathStrikeChance: number;
  /** Death Strike multiplier: 1 + its damage (1.01 = 101%). */
  deathStrikeDamage: number;
  mana: number;
  manaRecovery: number;
  /** Basic attacks a second: 1 (the workbook has no base attack speed) raised by the Bracelet of Speed. */
  attackSpeed: number;
  /** Movement speed as a multiple of the base walk (1 = 100%), raised by a mounted beast. */
  movementSpeed: number;
  accuracy: number;
  dodge: number;
  ccResist: number;
  extraGold: number;
  extraExp: number;
  /** Extra element damage as the game shows it: element damage x (1 + amps). */
  extraDamage: ByElement;
  /** Element damage before amps, and the amps that multiply it. */
  elementDamage: ByElement;
  elementAmp: ByElement;
  /** Black Orb damage against bosses and monsters. */
  bossDamage: number;
  monsterDamage: number;
};

const down = (value: number, places: number) => {
  const scale = 10 ** places;
  return Math.floor(Number((value * scale).toFixed(6))) / scale;
};
const round = (value: number, places: number) => Number(value.toFixed(places));

export function computeStats(s: StatSources): Stats {
  const mantra = 1 + s.mantra;
  const promotion = s.promotionBonus || 1;
  const breakthrough = 1 + s.memoryTree.hpMultiplier + s.constellation.promotion;
  const familiarHp = 1 + s.familiarProficiency.hp;

  const attack =
    mantra *
    (1 + (s.weapon.equip + s.weapon.owned) / 100) *
    (1 + s.companions.bladeDance) *
    (1 + (s.classes.equip + s.classes.owned) / 100) *
    promotion *
    (1 + s.spirits.atk) *
    ((s.enhance.atk + s.growth.atk + s.knowledge) * (1 + s.engraving.atk + s.refinement.atk + s.appearance.atk + s.shrine.atk) + s.soulWeapon.atk * (1 + s.soulWeapon.engravingAtk + s.shrine.soulWeaponAtk)) *
    (1 + s.soulWeapon.completionAtk) *
    (1 + s.relics.atk + s.companionPromotion.atk + s.slayerPromotion.atk + s.mastery.atk + s.companions.blessingOfForest + s.memoryTree.atk + s.constellation.atk) *
    (1 + s.memoryTree.atkMultiplier + s.constellation.promotion) *
    (1 + s.familiarProficiency.atk) *
    (1 + s.familiarProficiency.slayer) *
    (1 + s.beasts.combat) *
    (1 + s.beasts.mountedAtk) *
    (1 + s.blackOrb.atk) *
    (1 + s.skills.atk);

  const hp =
    mantra *
    down(1 + (s.accessory.equip + s.accessory.owned) / 100, 2) *
    down(1 + (s.classes.equip + s.classes.owned) / 100, 2) *
    promotion *
    down(1 + s.spirits.hp, 2) *
    (s.enhance.hp + s.growth.hp + s.knowledge * 10) * (1 + s.engraving.hp + s.refinement.hp + s.appearance.hp + s.shrine.hp) *
    (1 + s.soulWeapon.completionHp) *
    (1 + s.relics.hp + s.companionPromotion.hp + s.slayerPromotion.hp + s.mastery.hp + s.companions.fortitude + s.memoryTree.hp + s.constellation.hp) *
    (1 + s.mastery.hpAmp + s.blackOrb.boss * 2) *
    breakthrough *
    familiarHp *
    (1 + s.beasts.combat) *
    (1 + s.blackOrb.hp) *
    (1 + s.spiritSkills.hp);

  const hpRecovery =
    mantra *
    down(1 + (s.accessory.equip + s.accessory.owned) / 100, 2) *
    (1 + (s.classes.equip + s.classes.owned) / 100) *
    promotion *
    (1 + s.spirits.hp) *
    (s.enhance.hpRecovery + s.growth.hpRecovery + s.knowledge) * (1 + s.engraving.hpRecovery) *
    (1 + s.soulWeapon.completionHp) *
    (1 + s.relics.hpRecovery + s.companionPromotion.hpRecovery + s.slayerPromotion.hpRecovery + s.mastery.hpRegen + s.memoryTree.vit + s.constellation.hpRecovery) *
    (1 + s.mastery.hpRegenAmp + s.blackOrb.monster * 2) *
    breakthrough *
    familiarHp *
    (1 + s.beasts.combat) *
    (1 + s.blackOrb.hp);

  const critDamage = round(
    (1 + s.enhance.critDamage + down(s.growth.crit, 2) + down(s.gearSecondary.critDamage, 2) + s.refinement.critDamage + s.companions.lunatic + s.engraving.critDamage + s.companionPromotion.critDamage + s.slayerPromotion.critDamage) * (1 + s.relics.critDamage),
    3,
  );

  const gold =
    down(
      (down(s.gearSecondary.gold + s.appearance.gold + s.relics.gold + s.growth.gold + s.engraving.gold + s.mastery.gold + s.companionPromotion.gold + s.slayerPromotion.gold, 3) + 1) *
        (1 + s.companions.goldRush + s.companions.goldRush2 + s.memoryTree.goldAll + s.constellation.goldAll) *
        (1 + s.memoryTree.goldStage + s.constellation.goldStage) *
        (1 + down(s.spirits.gold, 3)),
      2,
    ) - 1;

  const exp =
    down(
      (down(s.gearSecondary.exp + s.appearance.exp + s.mastery.exp + s.companionPromotion.exp + s.slayerPromotion.exp, 3) + 1) *
        (1 + s.companions.hymn + s.memoryTree.expAll + s.constellation.expAll) *
        (1 + s.memoryTree.expStage + s.constellation.expStage) *
        (1 + down(s.spirits.exp, 3)),
      2,
    ) - 1;

  // Element damage and its amps (Black Orb Data H290:H291): the Sealed Shrine,
  // Constellation of Light and Black Orb amplify the element damage.
  const elementDamage = noElements();
  const elementAmp = noElements();
  const extraDamage = noElements();
  for (const element of ELEMENTS) {
    elementDamage[element] =
      s.companions.understanding[element] +
      s.companions.status[element] +
      s.relics.element[element] +
      s.skillProficiency +
      s.familiarProficiency.attribute +
      s.blackOrb.element[element];
    elementAmp[element] = s.shrine.element[element] + s.constellation.amplify[element] + s.blackOrb.amp[element];
    extraDamage[element] = elementDamage[element] * (1 + elementAmp[element]);
  }

  return {
    attack,
    hp,
    hpRecovery,
    critChance: s.enhance.critChance,
    critDamage,
    deathStrikeChance: s.enhance.deathStrikeChance,
    deathStrikeDamage: 1 + s.enhance.deathStrikeDamage,
    mana: 100 * (1 + s.gearSecondary.mana) * (1 + s.companions.manaAmplification + s.companionPromotion.mana + s.slayerPromotion.mana),
    manaRecovery: 10 * (1 + s.gearSecondary.manaRecovery) * (1 + s.companions.manaDope + s.companionPromotion.manaRecovery + s.slayerPromotion.manaRecovery) * (1 + s.skills.manaRecovery),
    accuracy: 30 + s.appearance.accuracy + s.growth.accuracy + s.relics.accuracy + s.companions.intensiveFire + s.refinement.accuracy + s.engraving.accuracy + s.companionPromotion.accuracy + s.slayerPromotion.accuracy,
    dodge: 10 + s.appearance.dodge + s.growth.dodge + s.relics.dodge + s.companions.shadowDance + s.refinement.dodge + s.engraving.dodge + s.companionPromotion.dodge + s.slayerPromotion.dodge,
    ccResist: s.companionPromotion.ccResist + s.slayerPromotion.ccResist,
    attackSpeed: 1 + s.relics.speed,
    movementSpeed: 1 + s.beasts.mountedMspd,
    extraGold: gold,
    extraExp: exp,
    extraDamage,
    elementDamage,
    elementAmp,
    bossDamage: s.blackOrb.boss,
    monsterDamage: s.blackOrb.monster,
  };
}

/** Every source at zero, base stats at their level 0 values. */
export function emptySources(): StatSources {
  return {
    mantra: 0,
    weapon: { equip: 0, owned: 0 },
    accessory: { equip: 0, owned: 0 },
    classes: { equip: 0, owned: 0 },
    promotionBonus: 1,
    spirits: { atk: 0, hp: 0, gold: 0, exp: 0 },
    spiritSkills: { hp: 0 },
    enhance: { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, critChance: 0, deathStrikeDamage: 0, deathStrikeChance: 0 },
    growth: { atk: 0, hp: 0, hpRecovery: 0, crit: 0, gold: 0, accuracy: 0, dodge: 0 },
    knowledge: 0,
    soulWeapon: { atk: 0, engravingAtk: 0, completionAtk: 0, completionHp: 0 },
    engraving: { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, gold: 0, accuracy: 0, dodge: 0 },
    gearSecondary: { critDamage: 0, gold: 0, exp: 0, mana: 0, manaRecovery: 0 },
    refinement: { atk: 0, hp: 0, critDamage: 0, accuracy: 0, dodge: 0 },
    shrine: { soulWeaponAtk: 0, atk: 0, hp: 0, element: noElements() },
    appearance: { atk: 0, hp: 0, gold: 0, exp: 0, accuracy: 0, dodge: 0 },
    beasts: { combat: 0, mountedAtk: 0, mountedMspd: 0 },
    blackOrb: { amp: noElements(), element: noElements(), atk: 0, hp: 0, boss: 0, monster: 0 },
    relics: { atk: 0, critDamage: 0, hp: 0, hpRecovery: 0, gold: 0, accuracy: 0, dodge: 0, speed: 0, element: noElements() },
    companionPromotion: { atk: 0, critDamage: 0, hp: 0, hpRecovery: 0, mana: 0, manaRecovery: 0, gold: 0, accuracy: 0, dodge: 0, exp: 0, ccResist: 0 },
    slayerPromotion: { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, mana: 0, manaRecovery: 0, gold: 0, exp: 0, accuracy: 0, dodge: 0, ccResist: 0 },
    mastery: { atk: 0, hp: 0, hpRegen: 0, gold: 0, exp: 0, hpAmp: 0, hpRegenAmp: 0 },
    companions: {
      blessingOfForest: 0, bladeDance: 0, fortitude: 0, lunatic: 0, intensiveFire: 0, shadowDance: 0,
      goldRush: 0, goldRush2: 0, hymn: 0, manaDope: 0, manaAmplification: 0, understanding: noElements(), status: noElements(),
    },
    memoryTree: { atk: 0, hp: 0, vit: 0, atkMultiplier: 0, hpMultiplier: 0, goldAll: 0, goldStage: 0, expAll: 0, expStage: 0 },
    constellation: { atk: 0, hp: 0, hpRecovery: 0, promotion: 0, goldAll: 0, goldStage: 0, expAll: 0, expStage: 0, amplify: noElements() },
    familiarProficiency: { atk: 0, hp: 0, slayer: 0, attribute: 0 },
    skillProficiency: 0,
    skills: { atk: 0, manaRecovery: 0 },
  };
}
