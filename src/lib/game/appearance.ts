/** An outfit from the workbook's APPEARANCE sheet; sweatsuits also raise a promotion ability row's multiplier. */
export type Outfit = {
  key: string;
  name: string;
  bonus: string;
  value: number;
  icon: string | null;
  iconSize: number | null;
  promotionRow?: number;
  multiplier?: number;
};
export type AppearanceData = { clothing: Outfit[]; guild: Outfit[] };
export type OwnedAppearance = { clothing: string[]; guild: string[] };

export type AppearanceTotals = { atk: number; hp: number; gold: number; exp: number; accuracy: number; dodge: number };

const TARGET: Record<string, keyof AppearanceTotals> = {
  "Character ATK": "atk",
  "Character HP": "hp",
  "Monster Gold": "gold",
  "Extra EXP": "exp",
  Accuracy: "accuracy",
  Dodge: "dodge",
};

/** Owned effects summed by stat (APPEARANCE J7:N7 and J13:M13); gold, EXP, ATK and HP are fractions. */
export function appearanceTotals(data: AppearanceData, owned: OwnedAppearance): AppearanceTotals {
  const totals: AppearanceTotals = { atk: 0, hp: 0, gold: 0, exp: 0, accuracy: 0, dodge: 0 };
  const add = (items: Outfit[], names: string[]) => {
    for (const item of items) {
      const target = TARGET[item.bonus];
      if (target && names.includes(item.name)) totals[target] += item.value;
    }
  };
  add(data.clothing, owned.clothing);
  add(data.guild, owned.guild);
  return totals;
}

/** A promotion ability row's multiplier: the best owned sweatsuit for that row (×2 to ×4), else ×1. */
export function sweatsuitMultiplier(data: AppearanceData, owned: OwnedAppearance, row: number): { multiplier: number; suit: string | null } {
  let best = { multiplier: 1, suit: null as string | null };
  for (const item of data.clothing) {
    if (item.promotionRow === row && item.multiplier && item.multiplier > best.multiplier && owned.clothing.includes(item.name)) {
      best = { multiplier: item.multiplier, suit: item.name };
    }
  }
  return best;
}
