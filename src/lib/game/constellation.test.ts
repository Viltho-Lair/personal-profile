import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/constellation.json";
import {
  constellationTotals,
  MATCHING_STAR,
  nodeBuff,
  OTHER_STAR,
  signSummary,
  starEnergy,
  type Constellation,
} from "./constellation";

const constellation = data as unknown as Constellation;
const aries = constellation.signs[0];
const allStars = (star: number) =>
  Object.fromEntries(constellation.signs.flatMap((sign) => sign.nodes.map((node) => [String(node.id), star])));

describe("constellation", () => {
  it("gives five times the energy for the matching star", () => {
    const node = aries.nodes[0];
    expect(starEnergy(node, OTHER_STAR)).toBe(node.energy);
    expect(starEnergy(node, MATCHING_STAR)).toBe(node.energy * 5);
  });

  it("applies completion effects only when every node has a star", () => {
    const stars = Object.fromEntries(aries.nodes.map((node) => [String(node.id), MATCHING_STAR]));
    const energy = aries.nodes.reduce((total, node) => total + node.energy * 5, 0);
    expect(signSummary(aries, stars)).toMatchObject({
      complete: true,
      energy,
      amplify: Math.floor(energy / 100),
      promotion: Math.floor(energy / 10),
    });
    expect(signSummary(aries, { ...stars, [aries.nodes[0].id]: 0 })).toMatchObject({ complete: false, amplify: 0, promotion: 0 });
    expect(nodeBuff(aries.nodes[0], MATCHING_STAR, 20)).toBe(Math.floor(aries.nodes[0].value * 1.2));
  });

  it("levels up by stars placed, reaching level 12 with every star", () => {
    expect(constellationTotals(constellation, {}).current.level).toBe(1);
    const totals = constellationTotals(constellation, allStars(OTHER_STAR));
    expect(totals.placed).toBe(148);
    expect(totals.current.level).toBe(12);
    expect(totals.next).toBeNull();
  });
});
