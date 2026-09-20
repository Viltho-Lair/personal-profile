import {
  compareFills,
  estimateFamiliars,
  type CombineMode,
  type FamiliarEstimate,
  type FamiliarGoal,
  type FillComparison,
} from "@/lib/game/familiar-summon";

/** What the panel asks for, and what comes back. */
export type FamiliarAsk = { id: number; goals: FamiliarGoal[]; mode: CombineMode; target: number };
export type FamiliarAnswer = {
  /** The goals at the fill that is selected. */
  estimate: FamiliarEstimate;
  /** The same goals the other way round, for the line that compares the two modes. */
  other: FamiliarEstimate;
  /** Every fill priced against the others. */
  fills: FillComparison;
};

/**
 * Prices familiar goals off the page's thread: a goal is hundreds of simulated runs and every fill is priced
 * again beside it, which is far too much to do while someone is still clicking.
 */
self.onmessage = (event: MessageEvent<FamiliarAsk>) => {
  const { id, goals, mode, target } = event.data;
  const answer: FamiliarAnswer = {
    estimate: estimateFamiliars(goals, mode, target),
    other: estimateFamiliars(goals, mode === "self" ? "same" : "self", target),
    fills: compareFills(goals, mode),
  };
  self.postMessage({ id, answer });
};
