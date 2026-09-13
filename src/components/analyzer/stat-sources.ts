import characterData from "@/data/optimizer/character.json";
import constellationData from "@/data/optimizer/constellation.json";
import memoryTreeData from "@/data/optimizer/memory-tree.json";
import soulWeaponsData from "@/data/optimizer/soul-weapons.json";
import {
  enhanceStat,
  latentMultiplier,
  latentPerLevel,
  classMaxLevel,
  type EnhanceStat,
  type KnowledgeGrade,
  type LatentMultiplier,
} from "@/lib/game/character";
import { companionEffect, promotionBuff, type CompanionFormula } from "@/lib/game/companions";
import { constellationTotals, type Constellation } from "@/lib/game/constellation";
import { proficiencyBonuses } from "@/lib/game/familiars";
import { gearEffects, relicBuff, skillPower } from "@/lib/game/formulas";
import { totalSubNodeLevels, treeBonuses, treeBuffs, treeLevel, type MemoryTree } from "@/lib/game/memory-tree";
import { ELEMENTS, emptySources, type Element, type StatSources } from "@/lib/game/stats";
import {
  activeAbilityPreset,
  activeSpiritPreset,
  awakening,
  clampLevel,
  companionState,
  effectiveSkillLevel,
  gearState,
  masteryLevel,
  relicLevel,
} from "@/lib/profile/rules";
import { LATENT_STATS, type CharacterState, type GearKind, type ProfileV1 } from "@/lib/profile/types";
import companionsData from "@/data/optimizer/companions.json";
import {
  ACCESSORIES,
  AWAKENING,
  GEAR_LEVEL_FACTORS,
  MASTERY_PAGES,
  MAX_AWAKENING,
  PROFICIENCY_BONUSES,
  RELICS,
  SKILL_BY_NAME,
  SPIRITS,
  WEAPONS,
  type Gear,
} from "./data";
import { spiritStatValue, type SpiritFactors } from "./spirit-stats";

type Promotion = { number: number; atkHpBonus: number | null; extraAtk: number | null; extraHp: number | null; extraExp: number | null; monsterGold: number | null };
type GrowthStat = { key: string; detail: string | null; perLevel: number };

const ENHANCE = characterData.enhance as unknown as EnhanceStat[];
const KNOWLEDGE = characterData.growingKnowledge as KnowledgeGrade[];
const GROWTH = characterData.growth as GrowthStat[];
const LATENT = characterData.latentAwakening as { stats: LatentMultiplier[]; crit: LatentMultiplier[] };
const PROMOTIONS = characterData.promotions as Promotion[];
const CLASSES = characterData.classes as { name: string; multiplier: number }[];
const TREE = memoryTreeData as unknown as MemoryTree;
const CONSTELLATION = constellationData as unknown as Constellation;
const SOUL_WEAPONS = soulWeaponsData.soulWeapons as { name: string; soulColor: string | null; attack: number | null; engraving: { atk: number | null; hp: number | null } }[];

type CompanionSkill = { name: string; effect: string | null; formula: CompanionFormula; maxLevel: number };
type Companion = { name: string; element: string | null; skills: CompanionSkill[] };
type PromotionData = {
  tiers: { values: Record<string, number> }[];
  rankMultipliers: Record<string, number>;
  slotsByAdvancement: (string | null)[][];
};
const COMPANIONS = companionsData.companions as unknown as Companion[];
const COMPANION_PROMOTION = companionsData.promotion as unknown as PromotionData;

const rawBase = (key: string, perLevel: number) => (key === "LUK" ? perLevel * 100 : perLevel);

/** Growth totals after Latent Power: STR/HP/VIT flat, CRI and LUK as fractions (CHARACTER AR25:AR29). */
export function latentTotals(character: CharacterState) {
  const { grade, level } = character.latentAwakening;
  return Object.fromEntries(
    GROWTH.filter((stat) => (LATENT_STATS as readonly string[]).includes(stat.key)).map((stat) => {
      const sum = (character.latent[stat.key] ?? []).reduce((a, b) => a + b, 0);
      const perLevel = latentPerLevel(stat.key, rawBase(stat.key, stat.perLevel), character.slayerLevel, sum);
      const multiplier = latentMultiplier(stat.key === "CRI" ? LATENT.crit : LATENT.stats, grade, level);
      const growthLevel = character.growth[stat.key] ?? 0;
      const divisor = stat.key === "CRI" || stat.key === "LUK" ? 100 : 1;
      return [stat.key, { perLevel: perLevel * multiplier, total: (perLevel * multiplier * growthLevel) / divisor, sum }];
    }),
  ) as Record<string, { perLevel: number; total: number; sum: number }>;
}

/** Best equip effect and 30% of every owned item's effect, in whole percents. */
function gearTotals(profile: ProfileV1, kind: GearKind, list: readonly Gear[]) {
  const row = AWAKENING[awakening(profile, kind, MAX_AWAKENING)];
  let equip = 0;
  let owned = 0;
  for (const gear of list) {
    const state = gearState(profile, kind, gear.grade, gear.maxLevel);
    if (!state.owned) continue;
    const awakened = gear.tier === "Immortal" && row ? (kind === "weapons" ? row.weaponMultiplier : row.accessoryMultiplier) : 1;
    const effects = gearEffects(gear.multiplier, GEAR_LEVEL_FACTORS, state.level, awakened);
    equip = Math.max(equip, effects.equip);
    owned += effects.owned;
  }
  return { equip, owned };
}

function companionSkill(profile: ProfileV1, companion: string, skill: string): number {
  const data = COMPANIONS.find((c) => c.name === companion)?.skills.find((s) => s.name === skill);
  if (!data) return 0;
  const level = clampLevel(companionState(profile, companion).skills[skill] ?? 0, data.maxLevel);
  return companionEffect(data.formula, level);
}

/** Skills whose effect is a plain "Total ATK +X%" or "Mana recovery +X%" while active. */
const FLAT_ATK_BUFF = /total atk (\+|increases by )X%/i;
const CONDITIONAL = /every|per |reviv/i;

export function skillBuffs(profile: ProfileV1) {
  let atk = 0;
  let manaRecovery = 0;
  const counted: string[] = [];
  const preset = profile.skillPresets[profile.activeSkillPreset] ?? [];
  for (const name of preset) {
    const skill = name ? SKILL_BY_NAME.get(name) : undefined;
    const text = skill?.description.specific ?? "";
    if (!skill || skill.baseValue === null || skill.upgradeValue === null || CONDITIONAL.test(text)) continue;
    const power = skillPower(skill.baseValue, skill.upgradeValue, effectiveSkillLevel(profile, skill.name, skill.maxLevel));
    if (power === null) continue;
    if (FLAT_ATK_BUFF.test(text)) {
      atk += power / 100;
      counted.push(skill.name);
    } else if (/^mana recovery \+X%/i.test(text)) {
      manaRecovery += power / 100;
      counted.push(skill.name);
    }
  }
  return { atk, manaRecovery, counted };
}

/** Everything the Stats Summary adds up, from the profile and its active presets. */
export function collectSources(profile: ProfileV1, factors: SpiritFactors | null, includeSkills: boolean): StatSources {
  const s = emptySources();
  const c = profile.character;

  const mantra = SKILL_BY_NAME.get("Mantra");
  if (mantra?.baseValue != null && mantra.upgradeValue != null) {
    s.mantra = (skillPower(mantra.baseValue, mantra.upgradeValue, effectiveSkillLevel(profile, mantra.name, mantra.maxLevel)) ?? 0) / 100;
  }

  s.weapon = gearTotals(profile, "weapons", WEAPONS);
  s.accessory = gearTotals(profile, "accessories", ACCESSORIES);

  // Classes: best equip effect + 30% of all owned; the last class awakens with Blast.
  const stars = constellationTotals(CONSTELLATION, c.constellation);
  const classMax = classMaxLevel(c.classAwakening) + stars.current.classLevelCap;
  CLASSES.forEach((cls, index) => {
    const state = c.classes[cls.name];
    if (!state?.owned) return;
    const isLast = index === CLASSES.length - 1;
    const multiplier = isLast ? (AWAKENING[c.classAwakening]?.blastMultiplier ?? 1) : 1;
    const effects = gearEffects(cls.multiplier, GEAR_LEVEL_FACTORS, clampLevel(state.level, classMax), multiplier);
    s.classes.equip = Math.max(s.classes.equip, effects.equip);
    s.classes.owned += effects.owned;
  });

  const promotion = PROMOTIONS.find((p) => p.number === c.promotion);
  s.promotionBonus = promotion?.atkHpBonus ?? 1;

  // Equipped spirit preset.
  for (const name of activeSpiritPreset(profile)) {
    const spirit = SPIRITS.find((sp) => sp.name === name);
    if (!spirit) continue;
    for (const key of ["atk", "hp", "gold", "exp"] as const) {
      s.spirits[key] += spiritStatValue(profile, spirit, key, factors) ?? 0;
    }
  }

  const enhance = (name: string) => {
    const stat = ENHANCE.find((e) => e.name === name);
    return stat ? enhanceStat(stat.formula, c.enhance[name] ?? 0).value : 0;
  };
  s.enhance = {
    atk: enhance("ATK"),
    hp: enhance("HP"),
    hpRecovery: enhance("HP Recovery"),
    critDamage: enhance("CRIT DMG"),
    critChance: enhance("CRIT %"),
  };

  const latent = latentTotals(c);
  const growthLevel = (key: string) => (c.growth[key] ?? 0) * (GROWTH.find((g) => g.key === key)?.perLevel ?? 0);
  s.growth = {
    atk: latent.STR?.total ?? 0,
    hp: latent.HP?.total ?? 0,
    hpRecovery: latent.VIT?.total ?? 0,
    crit: latent.CRI?.total ?? 0,
    gold: latent.LUK?.total ?? 0,
    accuracy: growthLevel("ACC"),
    dodge: growthLevel("DODGE"),
  };
  s.knowledge = KNOWLEDGE[c.growingKnowledge]?.atk ?? 0;

  // Equipped soul weapon and its completion effect, amplified by the companion of its soul colour.
  const soulWeapon = SOUL_WEAPONS.find((w) => w.name === profile.equippedSoulWeapon);
  if (soulWeapon) {
    const amp =
      { GREEN: companionSkill(profile, "Ellie", "Spirit's Touch"), RED: companionSkill(profile, "Miho", "Casting"), BLUE: companionSkill(profile, "Luna", "Rune Magic") }[
        soulWeapon.soulColor ?? ""
      ] ?? 0;
    s.soulWeapon = {
      atk: soulWeapon.attack ?? 0,
      completionAtk: ((soulWeapon.engraving.atk ?? 0) / 100) * (1 + amp),
      completionHp: ((soulWeapon.engraving.hp ?? 0) / 100) * (1 + amp),
    };
  }

  const relic = (name: string) => {
    const data = RELICS.find((r) => r.name === name);
    if (!data) return 0;
    const value = relicBuff(data.bands, relicLevel(profile, name, data.maxLevel), false) ?? 0;
    return value;
  };
  s.relics = {
    atk: relic("Strength Gloves"),
    critDamage: relic("Hunter's Eye"),
    hp: relic("HP Ring"),
    hpRecovery: relic("Recovery Totem"),
    gold: relic("Lucky Pendant"),
    accuracy: relic("Focus Ring"),
    dodge: relic("Invisible Cloak"),
    element: { Fire: relic("Silence Flame"), Water: relic("Abyss's Water Drop"), Wind: relic("Eye of Typoon"), Earth: relic("Emperor Ring") },
  };

  // Companion promotion rolls, by option.
  for (const companion of COMPANIONS) {
    const state = companionState(profile, companion.name);
    const ranks = COMPANION_PROMOTION.slotsByAdvancement[clampLevel(state.advancement, COMPANION_PROMOTION.slotsByAdvancement.length - 1)] ?? [];
    state.promotion.forEach((roll, slot) => {
      const value = roll.option !== null && roll.tier !== null ? (COMPANION_PROMOTION.tiers[roll.tier]?.values[roll.option] ?? null) : null;
      const buff = promotionBuff(value, ranks[slot] ?? null, COMPANION_PROMOTION.rankMultipliers);
      if (roll.option === "Extra ATK") s.companionPromotion.atk += buff;
      if (roll.option === "Extra HP") s.companionPromotion.hp += buff;
      if (roll.option === "Extra EXP") s.companionPromotion.exp += buff;
      if (roll.option === "Monster Gold") s.companionPromotion.gold += buff;
    });
  }

  // Active Slayer Promotion Ability preset: the page effect plus open ability rows.
  const ability = activeAbilityPreset(profile);
  const page = {
    "Extra ATK": ["atk", promotion?.extraAtk],
    "Extra HP": ["hp", promotion?.extraHp],
    "Extra EXP": ["exp", promotion?.extraExp],
    "Monster Gold": ["gold", promotion?.monsterGold],
  } as const;
  const pageEffect = ability.effect ? page[ability.effect as keyof typeof page] : undefined;
  if (pageEffect) s.slayerPromotion[pageEffect[0]] += pageEffect[1] ?? 0;
  const ROW_TARGET: Record<string, keyof StatSources["slayerPromotion"]> = {
    "Extra ATK(%)": "atk",
    "CRIT Dmg(%)": "critDamage",
    "Extra HP(%)": "hp",
    "Extra HP Recovery(%)": "hpRecovery",
    "Extra Mana(%)": "mana",
    "Extra Mana Recovery(%)": "manaRecovery",
    "Monster Gold(%)": "gold",
    "Extra EXP(%)": "exp",
    Accuracy: "accuracy",
    Dodge: "dodge",
  };
  ability.rows.forEach((row, index) => {
    const target = row.option ? ROW_TARGET[row.option] : undefined;
    if (!target || row.value === null || c.promotion <= index) return;
    const flat = target === "accuracy" || target === "dodge";
    s.slayerPromotion[target] += (row.value * row.multiplier) / (flat ? 1 : 100);
  });

  // Skill Mastery level nodes.
  const MASTERY_TARGET: Record<string, keyof StatSources["mastery"]> = {
    ATK: "atk", HP: "hp", "HP REGEN": "hpRegen", "MONSTER GOLD": "gold", EXP: "exp", "HP AMP": "hpAmp", "HP REGEN AMP": "hpRegenAmp",
  };
  for (const pageData of MASTERY_PAGES) {
    for (const node of pageData.nodes) {
      const target = node.label ? MASTERY_TARGET[node.label] : undefined;
      if (!target || !node.bonus || !("perLevel" in node.bonus)) continue;
      s.mastery[target] += node.bonus.perLevel * masteryLevel(profile, node.id, node.maxLevel);
    }
  }

  const understanding = Object.fromEntries(
    ELEMENTS.map((element) => {
      const companion = COMPANIONS.find((comp) => comp.element === element);
      const skill = companion?.skills.find((sk) => sk.formula.kind === "understanding");
      return [element, companion && skill ? companionSkill(profile, companion.name, skill.name) : 0];
    }),
  ) as Record<Element, number>;
  s.companions = {
    blessingOfForest: companionSkill(profile, "Ellie", "Blessing of Forest"),
    bladeDance: companionSkill(profile, "Zeke", "Blade Dance"),
    fortitude: companionSkill(profile, "Zeke", "Fortitude"),
    lunatic: companionSkill(profile, "Zeke", "Lunatic") / 100,
    intensiveFire: companionSkill(profile, "Ellie", "Intensive Fire"),
    shadowDance: companionSkill(profile, "Miho", "Shadow Dance"),
    goldRush: companionSkill(profile, "Miho", "Gold Rush"),
    goldRush2: companionSkill(profile, "Miho", "Gold Rush II"),
    hymn: companionSkill(profile, "Luna", "Hymn of the Abyss"),
    manaDope: companionSkill(profile, "Luna", "Mana Dope"),
    manaAmplification: companionSkill(profile, "Luna", "Mana Amplification"),
    understanding,
  };

  const { spent } = totalSubNodeLevels(TREE, c.memoryTree);
  const tree = treeLevel(TREE, spent);
  const treeBonus = treeBonuses(TREE, tree.level, tree.grade);
  const buffs = treeBuffs(TREE, c.memoryTree).buffs;
  const treeBuff = (buff: string, mode: string) => buffs.find((b) => b.buff === buff && b.mode === mode)?.value ?? 0;
  s.memoryTree = {
    atk: treeBonus.atk,
    hp: treeBonus.hp,
    vit: treeBonus.vit,
    atkMultiplier: treeBonus.atkMultiplier,
    hpMultiplier: treeBonus.hpMultiplier,
    goldAll: treeBuff("GOLD", "ALL"),
    goldStage: treeBuff("GOLD", "STAGE"),
    expAll: treeBuff("EXP", "ALL"),
    expStage: treeBuff("EXP", "STAGE"),
  };

  const starBuff = (buff: string, appliesTo: string) =>
    (stars.buffs.find((b) => b.buff === buff && b.appliesTo === appliesTo)?.value ?? 0) / 100;
  s.constellation = {
    atk: stars.current.extraAtk / 100,
    hp: stars.current.extraHp / 100,
    hpRecovery: stars.current.extraHpRecovery / 100,
    promotion: stars.promotion / 100,
    goldAll: starBuff("Gold", "All"),
    goldStage: starBuff("Gold", "Stage"),
    expAll: starBuff("EXP", "All"),
    expStage: starBuff("EXP", "Stage"),
    amplify: Object.fromEntries(ELEMENTS.map((e) => [e, (stars.amplify[e] ?? 0) / 100])) as Record<Element, number>,
  };

  const proficiency = proficiencyBonuses(profile.familiarProficiency);
  s.familiarProficiency = { atk: proficiency.atk, hp: proficiency.hp, slayer: proficiency.slayerDamage, attribute: proficiency.allAttributeDamage };
  s.skillProficiency = PROFICIENCY_BONUSES[clampLevel(profile.proficiencyLevel, PROFICIENCY_BONUSES.length - 1)] ?? 0;

  if (includeSkills) {
    const buffsFromSkills = skillBuffs(profile);
    s.skills = { atk: buffsFromSkills.atk, manaRecovery: buffsFromSkills.manaRecovery };
  }
  return s;
}

/** Sources the workbook counts that the analyzer doesn't track yet. */
export const UNTRACKED_SOURCES = [
  "Appearance",
  "Black Orb",
  "Beasts",
  "Skill Stones",
  "Skill Refinement",
  "Soul Weapon engravings",
  "Sealed Shrine statues",
  "Weapon/accessory secondary stats",
] as const;
