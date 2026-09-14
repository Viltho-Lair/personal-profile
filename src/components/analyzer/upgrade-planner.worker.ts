import type { ProfileV1 } from "@/lib/profile/types";
import type { SpiritFactors } from "./spirit-stats";
import { planUpgrades, type PlanTarget } from "./upgrade-planner";

/** Plans upgrades off the page's thread: the fight re-runs hundreds of times. Progress goes out in 2% steps. */
self.onmessage = (event: MessageEvent<{ id: number; profile: ProfileV1; factors: SpiritFactors | null; target: PlanTarget }>) => {
  const { id, profile, factors, target } = event.data;
  let reported = -1;
  const result = planUpgrades(profile, factors, target, (done, of) => {
    const progress = Math.floor((done / Math.max(1, of)) * 50) / 50;
    if (progress === reported) return;
    reported = progress;
    self.postMessage({ id, progress });
  });
  self.postMessage({ id, result });
};
