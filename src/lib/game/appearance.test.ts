import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/appearance.json";
import { appearanceTotals, sweatsuitMultiplier, type AppearanceData } from "./appearance";

const appearance = data as unknown as AppearanceData;

describe("appearance", () => {
  it("sums owned clothing and guild shop outfits by stat", () => {
    const totals = appearanceTotals(appearance, {
      clothing: ["Pac-Man T-shirt", "Summer Shirt", "Prison Garb (Striped)"],
      guild: ["Unity", "Chef"],
    });
    expect(totals).toEqual({ atk: 0.1, hp: 0.15, gold: 0, exp: 0.05, accuracy: 0, dodge: 6 });
  });

  it("takes the best owned sweatsuit for a promotion ability row", () => {
    const owned = { clothing: ["Sweatsuit (Orange)", "Sweatsuit (Dark Green)", "Sweatsuit (Red)"], guild: [] };
    expect(sweatsuitMultiplier(appearance, owned, 0)).toEqual({ multiplier: 4, suit: "Sweatsuit (Dark Green)" });
    expect(sweatsuitMultiplier(appearance, owned, 1).multiplier).toBe(2);
    expect(sweatsuitMultiplier(appearance, owned, 6)).toEqual({ multiplier: 1, suit: null });
  });
});
