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
  enhance: { atk: number; hp: number; hpRecovery: number; critDamage: number; critChance: number };
  growth: { atk: number; hp: number; hpRecovery: number; crit: number; gold: number; accuracy: number; dodge: number };
  /** Growing Knowledge combined value. */
  knowledge: number;
  soulWeapon: { atk: number; completionAtk: number; completionHp: number };
  /** Soul gems on the equipped soul weapon's plate (the workbook's Additional Options). */
  engraving: { atk: number; hp: number; hpRecovery: number; critDamage: number; gold: number; accuracy: number; dodge: number };
  relics: { atk: number; critDamage: number; hp: number; hpRecovery: number; gold: number; accuracy: number; dodge: number; element: ByElement };
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
  mana: number;
  manaRecovery: number;
  accuracy: number;
  dodge: number;
  ccResist: number;
  extraGold: number;
  extraExp: number;
  extraDamage: ByElement;
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
    ((s.enhance.atk + s.growth.atk + s.knowledge) * (1 + s.engraving.atk) + s.soulWeapon.atk) *
    (1 + s.soulWeapon.completionAtk) *
    (1 + s.relics.atk + s.companionPromotion.atk + s.slayerPromotion.atk + s.mastery.atk + s.companions.blessingOfForest + s.memoryTree.atk + s.constellation.atk) *
    (1 + s.memoryTree.atkMultiplier + s.constellation.promotion) *
    (1 + s.familiarProficiency.atk) *
    (1 + s.familiarProficiency.slayer) *
    (1 + s.skills.atk);

  const hp =
    mantra *
    down(1 + (s.accessory.equip + s.accessory.owned) / 100, 2) *
    down(1 + (s.classes.equip + s.classes.owned) / 100, 2) *
    promotion *
    down(1 + s.spirits.hp, 2) *
    (s.enhance.hp + s.growth.hp + s.knowledge * 10) * (1 + s.engraving.hp) *
    (1 + s.soulWeapon.completionHp) *
    (1 + s.relics.hp + s.companionPromotion.hp + s.slayerPromotion.hp + s.mastery.hp + s.companions.fortitude + s.memoryTree.hp + s.constellation.hp) *
    (1 + s.mastery.hpAmp) *
    breakthrough *
    familiarHp;

  const hpRecovery =
    mantra *
    down(1 + (s.accessory.equip + s.accessory.owned) / 100, 2) *
    (1 + (s.classes.equip + s.classes.owned) / 100) *
    promotion *
    (1 + s.spirits.hp) *
    (s.enhance.hpRecovery + s.growth.hpRecovery + s.knowledge) * (1 + s.engraving.hpRecovery) *
    (1 + s.soulWeapon.completionHp) *
    (1 + s.relics.hpRecovery + s.companionPromotion.hpRecovery + s.slayerPromotion.hpRecovery + s.mastery.hpRegen + s.memoryTree.vit + s.constellation.hpRecovery) *
    (1 + s.mastery.hpRegenAmp) *
    breakthrough *
    familiarHp;

  const critDamage = round(
    (1 + s.enhance.critDamage + down(s.growth.crit, 2) + s.companions.lunatic + s.engraving.critDamage + s.companionPromotion.critDamage + s.slayerPromotion.critDamage) * (1 + s.relics.critDamage),
    3,
  );

  const gold =
    down(
      (down(s.relics.gold + s.growth.gold + s.engraving.gold + s.mastery.gold + s.companionPromotion.gold + s.slayerPromotion.gold, 3) + 1) *
        (1 + s.companions.goldRush + s.companions.goldRush2 + s.memoryTree.goldAll + s.constellation.goldAll) *
        (1 + s.memoryTree.goldStage + s.constellation.goldStage) *
        (1 + down(s.spirits.gold, 3)),
      2,
    ) - 1;

  const exp =
    down(
      (down(s.mastery.exp + s.companionPromotion.exp + s.slayerPromotion.exp, 3) + 1) *
        (1 + s.companions.hymn + s.memoryTree.expAll + s.constellation.expAll) *
        (1 + s.memoryTree.expStage + s.constellation.expStage) *
        (1 + down(s.spirits.exp, 3)),
      2,
    ) - 1;

  const extraDamage = noElements();
  for (const element of ELEMENTS) {
    extraDamage[element] =
      s.companions.understanding[element] +
      s.relics.element[element] +
      s.constellation.amplify[element] +
      s.skillProficiency +
      s.familiarProficiency.attribute;
  }

  return {
    attack,
    hp,
    hpRecovery,
    critChance: s.enhance.critChance,
    critDamage,
    mana: 100 * (1 + s.companions.manaAmplification + s.companionPromotion.mana + s.slayerPromotion.mana),
    manaRecovery: 10 * (1 + s.companions.manaDope + s.companionPromotion.manaRecovery + s.slayerPromotion.manaRecovery) * (1 + s.skills.manaRecovery),
    accuracy: 30 + s.growth.accuracy + s.relics.accuracy + s.companions.intensiveFire + s.engraving.accuracy + s.companionPromotion.accuracy + s.slayerPromotion.accuracy,
    dodge: 10 + s.growth.dodge + s.relics.dodge + s.companions.shadowDance + s.engraving.dodge + s.companionPromotion.dodge + s.slayerPromotion.dodge,
    ccResist: s.companionPromotion.ccResist + s.slayerPromotion.ccResist,
    extraGold: gold,
    extraExp: exp,
    extraDamage,
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
    enhance: { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, critChance: 0 },
    growth: { atk: 0, hp: 0, hpRecovery: 0, crit: 0, gold: 0, accuracy: 0, dodge: 0 },
    knowledge: 0,
    soulWeapon: { atk: 0, completionAtk: 0, completionHp: 0 },
    engraving: { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, gold: 0, accuracy: 0, dodge: 0 },
    relics: { atk: 0, critDamage: 0, hp: 0, hpRecovery: 0, gold: 0, accuracy: 0, dodge: 0, element: noElements() },
    companionPromotion: { atk: 0, critDamage: 0, hp: 0, hpRecovery: 0, mana: 0, manaRecovery: 0, gold: 0, accuracy: 0, dodge: 0, exp: 0, ccResist: 0 },
    slayerPromotion: { atk: 0, hp: 0, hpRecovery: 0, critDamage: 0, mana: 0, manaRecovery: 0, gold: 0, exp: 0, accuracy: 0, dodge: 0, ccResist: 0 },
    mastery: { atk: 0, hp: 0, hpRegen: 0, gold: 0, exp: 0, hpAmp: 0, hpRegenAmp: 0 },
    companions: {
      blessingOfForest: 0, bladeDance: 0, fortitude: 0, lunatic: 0, intensiveFire: 0, shadowDance: 0,
      goldRush: 0, goldRush2: 0, hymn: 0, manaDope: 0, manaAmplification: 0, understanding: noElements(),
    },
    memoryTree: { atk: 0, hp: 0, vit: 0, atkMultiplier: 0, hpMultiplier: 0, goldAll: 0, goldStage: 0, expAll: 0, expStage: 0 },
    constellation: { atk: 0, hp: 0, hpRecovery: 0, promotion: 0, goldAll: 0, goldStage: 0, expAll: 0, expStage: 0, amplify: noElements() },
    familiarProficiency: { atk: 0, hp: 0, slayer: 0, attribute: 0 },
    skillProficiency: 0,
    skills: { atk: 0, manaRecovery: 0 },
  };
}
