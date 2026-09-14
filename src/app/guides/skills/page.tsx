import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("skills");

export default function Guide() {
  return (
    <GuideArticle slug="skills">
      <p>
        Skills do most of the damage in a Slayer Legends fight, and half a dozen systems make them
        stronger. Some raise a skill’s power directly, some multiply its damage, some make it cast
        more often. This guide goes through each in turn and shows how they stack.
      </p>

      <h2>Skill power and level</h2>
      <p>
        Every skill has a base value and a per-level upgrade value. Its power at a given level is:
      </p>
      <p>
        <code>power = base + upgrade × (level − 1)</code>
      </p>
      <p>
        So a skill with base 110 and upgrade 11 has 495% power at level 36. Growth is linear: each
        level adds the same amount, so the percentage gain per level shrinks as the skill climbs.
      </p>
      <p>
        Maximum levels differ a lot between skills. Fire Slash and Demon Hunt go to level 250 (Fire
        Slash reaches 10,360%, Demon Hunt 25,900%). Most buff and utility skills stop at 20. Wrath
        of Gods reaches 975%, Warrior Burn 383% and Lightning Body 364%. Meditation caps at 10, and
        Mantra and Rave at 5.
      </p>
      <p>
        Skills are either <strong>attack</strong>, <strong>buff</strong> or{" "}
        <strong>passive</strong>. Attack skills trigger either on a cooldown (Hot Blast every 12
        seconds, for example) or after a number of basic attacks (Fire Slash every 12 strikes). That
        difference decides which Refinement options and Skill Stones help them, as covered below.
      </p>
      <p className="note">
        Mantra is a special case: it boosts ATK and HP in your character stats whether or not it’s
        in your active preset.
      </p>

      <h2>Presets</h2>
      <p>
        You can keep five skill presets of ten slots each. Only the active preset’s skills fight,
        and several effects depend on its make-up. Heart of Fire, for example, needs at least four
        Fire attack skills and grows stronger with each Fire skill beyond four.
      </p>

      <h2>Skill Mastery</h2>
      <p>
        Skill Mastery is a ten-page tree. Page 1 is open from the start, and each later page opens
        once the one before it is full. It has two kinds of node:
      </p>
      <ul>
        <li>
          <strong>Level nodes</strong> add character stats per level: ATK, HP, HP REGEN, monster
          gold, EXP, and the separate HP AMP and HP REGEN AMP amplifiers. Values rise on later
          pages, from +20% ATK per level on page 1 to +125% on page 8. With every node maxed, Mastery
          adds +21,000% ATK and +6,340% HP.
        </li>
        <li>
          <strong>Check nodes</strong> are one-time unlocks. Some give rewards such as diamonds or
          summon tickets. The important ones multiply specific skills: triple damage, or 1.5× damage
          with twice the hits. Several need a minimum weapon or accessory grade before you can take
          them.
        </li>
      </ul>
      <p>
        Mastery ATK and HP land in the crowded Extra groups (see{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>), so the skill
        multipliers on check nodes are often the stronger part of the tree. A few later nodes also
        change timing: one removes a required strike from the Fire Slash line, another shortens
        Pillar of Fire’s cooldown by two seconds.
      </p>

      <h2>Skill Refinement</h2>
      <p>
        Twenty-five attack skills can be refined. Each has three, four or five lines, and each line
        rolls an option and a colour tier. The tiers, weakest to strongest, are White, Green,
        Orange, Purple, Red and Aqua. The options are:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>White</th>
              <th>Aqua</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>DMG Increase</td><td>1–3%</td><td>13–20%</td></tr>
            <tr><td>Cooldown Reduction</td><td>0.1–0.2%</td><td>1.3–2%</td></tr>
            <tr><td>Reduction in Required Strikes</td><td>0.1–0.3%</td><td>1.9–3%</td></tr>
            <tr><td>Mana Consumption Reduction</td><td>0.1–0.3%</td><td>1.6–3%</td></tr>
            <tr><td>DMG dealt to attribute enemies</td><td>1–4%</td><td>19–25%</td></tr>
            <tr><td>DMG Resist while equipped</td><td>0.1–0.2%</td><td>1.1–1.5%</td></tr>
            <tr><td>Accuracy while equipped</td><td>5–15</td><td>65–100</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Each skill can roll six of the seven. Cooldown skills can’t roll Reduction in Required
        Strikes, and strike-triggered skills can’t roll Cooldown Reduction. The attribute option
        targets the element the skill is strong against: Water beats Fire, Fire beats Earth, Earth
        beats Wind, and Wind beats Water.
      </p>
      <p>
        Refinement also has an <strong>owned effect</strong> that applies to your character
        whether or not the skill is equipped. It starts once a skill has three Aqua lines and grows
        at four and five. Fire Slash with three Aqua lines gives +2% character HP; Demon Hunt fully
        refined gives +30% character ATK; Pillar of Fire gives up to +600% crit damage.
      </p>

      <h2>Skill Proficiency</h2>
      <p>
        Skill Proficiency runs from level 0 to 328 and adds All Attribute damage, which counts for
        every element. It accelerates hard: +5% at level 1, +58% at 10, +1,935% at 100, +14,975% at
        200 and +133,287% at 328. Because element damage feeds skills directly, Proficiency becomes
        one of the largest skill damage sources in the late game.
      </p>

      <h2>Skill Stones</h2>
      <p>
        Each stone preset holds three stones: a Cooldown Stone (shorter cooldowns), a Time Stone
        (longer buff durations) and a Heat Stone (fewer required attacks). Every stone has an element
        and only affects skills of that element. Type A stones give 4% and Type B stones 7%.
      </p>
      <p>
        For example, a Water buff with a 20-second cooldown and 10-second duration, with a Type B
        Water Cooldown Stone and a Type A Water Time Stone, becomes an 18.6-second cooldown with
        10.4 seconds of duration. A Fire skill in the same preset is unaffected. Heat Stones round
        strike counts and never reduce them below one.
      </p>

      <h2>Familiars</h2>
      <p>
        Twelve familiars come in three groups of four: Weapon (Na, Rion, Ru, Mus), Attribute (Hi,
        A, Je, Ti, one per element) and Battle (Ku, Pe, Sha, Po). You equip one from each group.
        Familiars have 0 to 11 stars, and their rarity rises with stars: Common at 0–1, up to Mythic
        at 10 and Immortal at 11.
      </p>
      <p>
        Familiar proficiency is a separate track per group. Every level of any group adds +1% ATK
        and +10% HP. On top of that, Attribute levels add element damage, Weapon levels add Slayer
        damage and Battle levels add familiar damage. The Mana Altar counts your six highest-starred
        familiars and levels up from 30 total stars to 66.
      </p>

      <h2>Putting it together</h2>
      <p>
        A skill’s damage in a fight multiplies its power by your ATK, by crit and death strike, by
        its element damage and amplifiers, by Refinement and by other skill bonuses. Its cooldown,
        strike count and mana cost decide how often that happens. The{" "}
        <Link href="/guides/promotion-fights">promotion fights guide</Link> explains how the
        analyzer turns all of this into total damage over a 60-second fight. You can build and test
        presets in the Skill tab of the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link>.
      </p>
    </GuideArticle>
  );
}
