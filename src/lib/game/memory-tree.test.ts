import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/memory-tree.json";
import {
  costToMax,
  maxedTree,
  subNodeOpen,
  totalSubNodeLevels,
  treeBonuses,
  treeBuffs,
  treeLevel,
  type MemoryTree,
} from "./memory-tree";

const tree = data as unknown as MemoryTree;

describe("memory tree level", () => {
  it("starts at level 1, grade 0 and reaches level 4 / grade 1 at 16 sub node levels", () => {
    expect(treeLevel(tree, 0)).toMatchObject({ level: 1, grade: 0 });
    expect(treeLevel(tree, 15)).toMatchObject({ level: 3, grade: 0 });
    expect(treeLevel(tree, 16)).toMatchObject({ level: 4, grade: 1 });
  });

  it("is level 25, grade 5 when every node is maxed", () => {
    const { spent, max } = totalSubNodeLevels(tree, maxedTree(tree));
    expect(spent).toBe(max);
    expect(treeLevel(tree, spent)).toMatchObject({ level: 25, grade: 5, next: null });
    expect(costToMax(tree, maxedTree(tree))).toBe(0);
  });
});

describe("memory tree bonuses", () => {
  it("sums additive rows to the level and multiplier rows to the grade", () => {
    const bonus = treeBonuses(tree, 4, 1);
    expect(bonus.atk).toBeCloseTo(0.5 + 1 + 1.5 + 1);
    expect(bonus.vit).toBeCloseTo(0.05 + 0.1 + 0.15 + 0.1);
    expect(bonus.atkMultiplier).toBeCloseTo(0.2);
    expect(treeBonuses(tree, 1, 0).atkMultiplier).toBe(0);
  });

  it("groups buffs by type and mode", () => {
    const { buffs } = treeBuffs(tree, { "1": 1, "2": 4 });
    expect(buffs.find((b) => b.buff === "CUBE" && b.mode === "RIFT")?.value).toBeCloseTo(0.05);
    expect(buffs.find((b) => b.buff === "EXP" && b.mode === "STAGE")?.value).toBeCloseTo(0.12);
  });
});

describe("memory tree unlocks", () => {
  const [first, second] = tree.mainNodes;

  it("opens a sub node once its required node is maxed", () => {
    expect(subNodeOpen(tree, first, first.subNodes[1], {}, 1)).toBe(false);
    expect(subNodeOpen(tree, first, first.subNodes[1], { "1": 1 }, 1)).toBe(true);
  });

  it("keeps a main node shut until its prerequisite main node is complete", () => {
    const partial = { "1": 1, "2": 4, "3": 4, "4": 4, "5": 2 };
    expect(subNodeOpen(tree, second, second.subNodes[0], partial, 4)).toBe(false);
    expect(subNodeOpen(tree, second, second.subNodes[0], { ...partial, "5": 3 }, 4)).toBe(true);
  });
});
