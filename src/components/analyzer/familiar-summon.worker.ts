import {
  ALL_SAME,
  bestMix,
  compareFills,
  estimateFamiliars,
  type CombineMode,
  type FamiliarEstimate,
  type FamiliarGoal,
  type FillComparison,
  type MixSearch,
} from "@/lib/game/familiar-summon";

/** What the panel asks for, and what comes back. */
export type FamiliarAsk = { id: number; goals: FamiliarGoal[]; mode: CombineMode; target: number };
export type FamiliarAnswer = {
  /** The goals at the fill and the plan that are selected. */
  estimate: FamiliarEstimate;
  /** The same goals the other way round, for the line that compares the ways of filling the slots. */
  other: FamiliarEstimate;
  /** Every fill priced against the others. */
  fills: FillComparison;
  /** Where a mixed plan should stop leaning on the group, and every crossover priced. Only for the mixed plan. */
  mix: MixSearch | null;
};

/**
 * Prices familiar goals off the page's thread: a goal is hundreds of simulated runs, every fill is priced again
 * beside it, and a mixed plan prices every crossover on top of that. Far too much to do while someone is still
 * clicking.
 */
self.onmessage = (event: MessageEvent<FamiliarAsk>) => {
  const { id, goals, mode, target } = event.data;
  // The mixed plan has to be searched for before anything can be priced against it.
  const mix = mode === "mix" ? bestMix(goals, target) : null;
  const crossover = mix?.crossover ?? ALL_SAME;
  const answer: FamiliarAnswer = {
    estimate: mix?.best ?? estimateFamiliars(goals, mode, target),
    // A mixed plan is measured against the better of the two pure ways it sits between.
    other: mix
      ? mix.pureSelf.summons <= mix.pureSame.summons
        ? mix.pureSelf
        : mix.pureSame
      : estimateFamiliars(goals, mode === "self" ? "same" : "self", target),
    fills: compareFills(goals, mode, crossover),
    mix,
  };
  self.postMessage({ id, answer });
};
