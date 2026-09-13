"use client";

import {
  AWAKENING_LEVEL,
  BONUS_EFFECT_LEVEL,
  blackOrbEffects,
  bonusEffect,
  matchingLines,
  RESONANCE_LEVEL,
  type OrbLine,
} from "@/lib/game/black-orb";
import { ELEMENTS, type Element } from "@/lib/game/stats";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { InlineLevel } from "./level-input";
import { BLACK_ORB } from "./stat-sources";
import { ELEMENT_TEXT } from "./tiers";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const INPUT =
  "rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink";
const LINE_ELEMENTS = [...ELEMENTS, "All"] as const;

const pct = (fraction: number) => `${formatValue(Math.round(fraction * 10000) / 100)}%`;
const numberOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

function AccessoryCard({ element }: { element: Element }) {
  const { profile, updateOrbAccessory } = useProfile();
  const orb = profile.blackOrb;
  const accessory = orb.accessories[element];
  const owned = accessory.level > 0;
  const awakened = orb.level >= AWAKENING_LEVEL;
  const matching = matchingLines(element, accessory);
  const setLine = (index: number, change: Partial<OrbLine>) => updateOrbAccessory(element, { line: { index, change } });

  return (
    <article className={`flex flex-col gap-2 rounded-lg border border-ink/15 p-3 ${owned ? "" : "opacity-70"}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={`text-sm font-medium ${ELEMENT_TEXT[element] ?? ""}`}>{element} accessory</h3>
        <span className="flex items-center gap-1.5">
          <span className={LABEL}>Level</span>
          <InlineLevel value={accessory.level} min={0} max={999} name={`${element} accessory`} onChange={(level) => updateOrbAccessory(element, { level })} />
        </span>
      </header>
      <label className="flex items-center gap-2">
        <span className={LABEL}>{element} Dmg</span>
        <input
          type="number"
          min={0}
          step={1}
          value={accessory.top || ""}
          placeholder="0"
          aria-label={`${element} accessory element damage percent`}
          onChange={(event) => updateOrbAccessory(element, { top: Math.max(0, numberOr(event.target.valueAsNumber, 0)) })}
          className={`${INPUT} w-28`}
        />
        <span className="font-mono text-[11px] text-dim">%</span>
      </label>
      <ul className="flex flex-col gap-1">
        {accessory.lines.map((line, index) => (
          <li key={index} className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-dim">Amplify</span>
            <select
              aria-label={`${element} accessory line ${index + 1} element`}
              value={line.element ?? ""}
              onChange={(event) => setLine(index, { element: (event.target.value || null) as OrbLine["element"] })}
              className={SELECT}
            >
              <option value="">—</option>
              {LINE_ELEMENTS.map((e) => (
                <option key={e} value={e}>
                  {e === "All" ? "all Attributes" : e}
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px] text-dim">Dmg by</span>
            <input
              type="number"
              min={0}
              step={1}
              value={line.value || ""}
              placeholder="0"
              disabled={!line.element}
              aria-label={`${element} accessory line ${index + 1} percent`}
              onChange={(event) => setLine(index, { value: Math.max(0, numberOr(event.target.valueAsNumber, 0)) })}
              className={`${INPUT} w-12 disabled:opacity-50`}
            />
            <span className="font-mono text-[10px] text-dim">%{line.element === element ? " (X2)" : ""}</span>
            <select
              aria-label={`${element} accessory line ${index + 1} awakening`}
              value={line.bonus}
              disabled={!line.element}
              onChange={(event) => setLine(index, { bonus: Number(event.target.value) })}
              className={`${SELECT} disabled:opacity-50`}
              title={awakened ? "Awakened +level" : `Awakening opens at Black Orb level ${AWAKENING_LEVEL}`}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((b) => (
                <option key={b} value={b}>
                  +{b}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[10px] text-dim">
        Bonus effect: {matching} {element} line{matching === 1 ? "" : "s"}
        {matching >= 2
          ? ` · ${matching === 4 ? "all attributes" : element} +${pct(bonusEffect(matching))}${orb.level >= BONUS_EFFECT_LEVEL ? "" : ` (opens at orb level ${BONUS_EFFECT_LEVEL})`}`
          : ""}
      </p>
    </article>
  );
}

/** Equipment → Black Orb: the four element accessories on the left, the orb and its totals on the right. */
export function BlackOrbPanel() {
  const { profile, setOrbLevel } = useProfile();
  const orb = profile.blackOrb;
  const effects = blackOrbEffects(BLACK_ORB, orb);

  return (
    <div className="flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-2 overflow-auto border-b border-ink/15 p-3 pb-6 sm:p-4 md:border-r md:border-b-0 md:pb-20">
        {ELEMENTS.map((element) => (
          <AccessoryCard key={element} element={element} />
        ))}
      </div>
      <div className="flex min-h-0 flex-col gap-3 overflow-auto p-3 pb-20 sm:p-4">
        <label className="flex items-center gap-2">
          <span className={LABEL}>Black Orb level</span>
          <InlineLevel value={orb.level} min={0} max={999} name="Black Orb" onChange={setOrbLevel} />
        </label>
        <ul className="flex flex-col gap-0.5 font-mono text-[10px] text-dim uppercase">
          <li className={orb.level >= RESONANCE_LEVEL ? "text-ink" : ""}>Lv {RESONANCE_LEVEL}: resonance (50+ total accessory levels)</li>
          <li className={orb.level >= AWAKENING_LEVEL ? "text-ink" : ""}>Lv {AWAKENING_LEVEL}: awakening (+levels on lines)</li>
          <li className={orb.level >= BONUS_EFFECT_LEVEL ? "text-ink" : ""}>Lv {BONUS_EFFECT_LEVEL}: bonus effects</li>
        </ul>
        <section aria-label="Black Orb totals" className="flex flex-col gap-1.5">
          <h2 className={LABEL}>Totals</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 rounded-md bg-ink/[0.04] p-2 font-mono text-[11px]">
            <dt className="text-dim">Resonance ({effects.totalLevels} levels): ATK</dt>
            <dd className="text-right tabular-nums">+{pct(effects.atk)}</dd>
            <dt className="text-dim">Resonance: HP</dt>
            <dd className="text-right tabular-nums">+{pct(effects.hp)}</dd>
            <dt className="text-dim">Resonance: all attributes</dt>
            <dd className="text-right tabular-nums">+{pct(effects.resonanceAll)}</dd>
            <dt className="text-dim">Boss damage (HP +{pct(effects.boss * 2)})</dt>
            <dd className="text-right tabular-nums">+{pct(effects.boss)}</dd>
            <dt className="text-dim">Monster damage (HP Recovery +{pct(effects.monster * 2)})</dt>
            <dd className="text-right tabular-nums">+{pct(effects.monster)}</dd>
          </dl>
          <table className="w-full font-mono text-[11px] tabular-nums">
            <thead>
              <tr className={LABEL}>
                <th className="text-left font-normal">Element</th>
                <th className="text-right font-normal">Element Dmg</th>
                <th className="text-right font-normal">Amp</th>
              </tr>
            </thead>
            <tbody>
              {ELEMENTS.map((element) => (
                <tr key={element} className="border-t border-ink/10">
                  <td className={`py-0.5 ${ELEMENT_TEXT[element] ?? ""}`}>{element}</td>
                  <td className="text-right">+{pct(effects.element[element])}</td>
                  <td className="text-right">+{pct(effects.amp[element])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] leading-snug text-dim">
            Lines of the accessory&apos;s own element count double. Element damage adds to the Stats Summary&apos;s extra element
            damage, and amps multiply it along with the Sealed Shrine and Constellation of Light. Boss damage multiplies every hit
            in the promotion fight.
          </p>
        </section>
      </div>
    </div>
  );
}
