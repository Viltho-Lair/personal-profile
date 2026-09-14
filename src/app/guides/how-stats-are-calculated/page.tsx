import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("how-stats-are-calculated");

export default function Guide() {
  return (
    <GuideArticle slug="how-stats-are-calculated">
      <p>
        Two upgrades can both say “+50% ATK” and change your damage by very different amounts. That
        isn’t a display bug; it comes from how Slayer Legends combines bonuses. Once you understand
        the structure, you can tell at a glance which upgrades are worth chasing and which are
        already diluted.
      </p>

      <h2>The one rule: add inside a group, multiply between groups</h2>
      <p>
        Every major stat is built from <strong>groups</strong>. Each group is worth 1 plus the sum
        of the bonuses inside it, and the stat is the product of all its groups:
      </p>
      <p>
        <code>stat = (1 + a + b + …) × (1 + c + d + …) × (1 + e) × …</code>
      </p>
      <p>
        Bonuses in the same group add together, so they compete with each other. Bonuses in
        different groups multiply, so they reinforce each other. Suppose you already have +300%
        from sources in one group, making it worth 4. Another +50% there takes it to 4.5, a 12.5%
        gain in your final stat. The same +50% in a group that’s currently empty takes that group
        from 1 to 1.5: a 50% gain.
      </p>
      <p className="note">
        The practical rule: a modest bonus in a small, separate group often beats a large bonus in
        a crowded one.
      </p>

      <h2>What goes into ATK</h2>
      <p>ATK is the product of these groups:</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>What feeds it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base</td>
              <td>
                Enhance ATK, Growth STR and Growing Knowledge, amplified by soul gem ATK, Refinement,
                Appearance and the Statue of Chaos; plus soul weapon ATK amplified by gem engraving
              </td>
            </tr>
            <tr>
              <td>Weapons</td>
              <td>The equipped weapon’s equip effect plus every owned weapon’s owned effect</td>
            </tr>
            <tr>
              <td>Classes</td>
              <td>The equipped class’s effect plus owned class effects</td>
            </tr>
            <tr>
              <td>Promotion</td>
              <td>Your promotion’s ATK/HP multiplier</td>
            </tr>
            <tr>
              <td>Spirits</td>
              <td>ATK from the active spirit preset</td>
            </tr>
            <tr>
              <td>Extra ATK</td>
              <td>
                Strength Gloves, companion and Slayer Promotion ATK rolls, Skill Mastery, Blessing of
                Forest, Memory Tree and Constellation
              </td>
            </tr>
            <tr>
              <td>Breakthrough</td>
              <td>Memory Tree ATK multiplier and the Constellation promotion bonus</td>
            </tr>
            <tr>
              <td>Mantra</td>
              <td>The Mantra skill’s power</td>
            </tr>
            <tr>
              <td>Blade Dance</td>
              <td>Zeke’s Blade Dance passive</td>
            </tr>
            <tr>
              <td>Beasts</td>
              <td>One group for owned beasts, another for the mounted beast</td>
            </tr>
            <tr>
              <td>Others</td>
              <td>
                Soul weapon completion, familiar ATK, Black Orb resonance, and skill buffs while a
                fight is running
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Look at the Extra ATK row: seven different sources share one group. By the late game it can
        reach thousands of percent, and every new source there is diluted. Blade Dance and the beast
        groups each hold a single source, which is why small numbers on them punch above their
        weight.
      </p>

      <h2>HP and HP Recovery</h2>
      <p>
        HP follows the same shape with its own sources: accessories instead of weapons, HP Ring in
        the Extra HP group, Zeke’s Fortitude, and the Statue of Demon in the base. Two things differ
        from ATK. Growing Knowledge counts ten times toward base HP, and HP has an extra amplifier
        group fed by Skill Mastery’s HP AMP nodes. HP Recovery mirrors HP, with its own amplifier from
        Mastery’s HP REGEN AMP nodes.
      </p>

      <h2>Crit and death strike</h2>
      <p>
        Crit chance comes only from Enhance CRIT %, at 0.1% per level, reaching 100% at level 1,000.
        Crit damage has two groups. The first adds Enhance CRIT DMG, Growth CRI, weapon secondary
        stats, Refinement, Zeke’s Lunatic, soul gems and promotion rolls. The second holds only
        Hunter’s Eye and multiplies the first, which makes Hunter’s Eye one of the most efficient
        relics for damage.
      </p>
      <p>
        Death strike only opens up after crit chance is maxed. Until Enhance CRIT % reaches level
        1,000, both death strike stats stay at level 1.
      </p>

      <h2>Gold and EXP</h2>
      <p>Extra Gold is the product of four groups, minus the starting 1:</p>
      <ul>
        <li>
          flat sources: gear secondaries, Appearance, Lucky Pendant, Growth LUK, soul gems, Mastery
          and promotion rolls;
        </li>
        <li>
          all-mode multipliers: Miho’s Gold Rush and Gold Rush II, and Memory Tree and Constellation
          gold for all modes;
        </li>
        <li>stage-mode multipliers: Memory Tree and Constellation gold for stages;</li>
        <li>spirit gold.</li>
      </ul>
      <p>
        Example: a Lucky Pendant worth +50%, Gold Rush at +20% and spirits at +10% give 1.5 × 1.2 ×
        1.1 − 1 = <strong>+98%</strong>, not the +80% you’d get by adding them. EXP works the same
        way, with Luna’s Hymn of the Abyss in the all-mode group.
      </p>

      <h2>Flat stats: Accuracy, Dodge and Mana</h2>
      <p>
        Accuracy starts at 30 and Dodge at 10, and everything else simply adds to them: Appearance,
        Growth, Focus Ring or Invisible Cloak, Ellie’s Intensive Fire or Miho’s Shadow Dance,
        Refinement, gems and promotion rolls. There’s no multiplication, so each point is worth the
        same whenever you get it.
      </p>
      <p>
        Mana starts at 100 and Mana Recovery at 10 per second. Each is multiplied by accessory
        secondary stats and by a second group of companion passives and promotion rolls.
      </p>

      <h2>Element damage</h2>
      <p>
        Each element has its own damage bonus, from that companion’s Understanding passive and
        Status, the matching relic, Skill Proficiency, Attribute familiar proficiency and the Black
        Orb. A separate amplifier comes from the Statue of Order, Constellation and Black Orb lines.
        The Stats Summary shows them combined as element damage × (1 + amplifier). The bonus applies
        to skills of that element, so it matters most for the element your skill preset is built
        around.
      </p>

      <h2>A worked example</h2>
      <p>
        Take a new account with a Common 4 weapon and accessory, every enhance stat at level 1,
        companion promotion ATK of +80%, Slayer Promotion ATK of +40% and Memory Tree ATK of +50%:
      </p>
      <ul>
        <li>The weapon and class groups together are worth 1.091.</li>
        <li>The Extra ATK group is 1 + 0.8 + 0.4 + 0.5 = 2.7.</li>
        <li>
          The ATK multiplier is 1.091 × 2.7 = <strong>2.9457</strong>.
        </li>
      </ul>
      <p>
        Three separate-looking systems all landed in one group. Put +50% into a new group instead
        and the result would be 2.9457 × 1.5 ≈ 4.42.
      </p>

      <h2>Using this to plan</h2>
      <p>
        When choosing an upgrade, ask which group it feeds and how full that group already is. The{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link> does this for you: its promotion fight
        suggestions are grouped the same way, showing how far each group would need to grow to close
        the gap. For how each system’s numbers scale, continue with{" "}
        <Link href="/guides/character-progression">Enhance, Growth, Promotion and Classes</Link>.
      </p>
    </GuideArticle>
  );
}
