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
      <p>
        Everything below is how the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link> adds up the totals in its Stats
        Summary, on the Analysis tab.
      </p>

      <h2>The one rule: add inside a group, multiply between groups</h2>
      <p>
        Every major stat is built from <strong>groups</strong>. Each group is worth 1 plus the sum
        of the bonuses inside it, and the stat is the product of all its groups:
      </p>
      <p>
        <code>stat = base × (1 + a + b + …) × (1 + c + d + …) × (1 + e) × …</code>
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
      <p>ATK is the base value multiplied by each of these groups:</p>
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
                Enhance ATK, Growth STR (with Latent Power) and Growing Knowledge, multiplied by 1 +
                soul gem ATK, Refinement ATK, Appearance ATK and the Statue of Chaos’s Character ATK.
                Then the equipped soul weapon’s ATK is added, multiplied by 1 + its gems’ Soul Weapon
                ATK and the Statue of Chaos’s Soul Weapon ATK
              </td>
            </tr>
            <tr>
              <td>Weapons</td>
              <td>The equipped weapon’s equip effect plus 30% of every owned weapon’s effect</td>
            </tr>
            <tr>
              <td>Classes</td>
              <td>The equipped class’s effect plus 30% of every owned class’s effect</td>
            </tr>
            <tr>
              <td>Promotion</td>
              <td>Your promotion’s ATK/HP multiplier</td>
            </tr>
            <tr>
              <td>Spirits</td>
              <td>ATK from the spirits in the active spirit preset (see below)</td>
            </tr>
            <tr>
              <td>Soul weapon completion</td>
              <td>The equipped soul weapon’s completion effect, once its engraving is complete</td>
            </tr>
            <tr>
              <td>Extra ATK</td>
              <td>
                Strength Gloves, companion promotion ATK rolls, Slayer Promotion ATK, Skill Mastery
                ATK nodes, Ellie’s Blessing of Forest, Memory Tree ATK and Constellation of Light
                Extra ATK
              </td>
            </tr>
            <tr>
              <td>Breakthrough</td>
              <td>The Memory Tree ATK multiplier plus the Constellation’s Promotion ATK/HP</td>
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
              <td>Familiar ATK</td>
              <td>The ATK increase from Familiar Proficiency (all three proficiencies)</td>
            </tr>
            <tr>
              <td>Slayer DMG</td>
              <td>The Weapon familiar proficiency’s Slayer DMG</td>
            </tr>
            <tr>
              <td>Owned beasts</td>
              <td>The owned effect of every beast you have</td>
            </tr>
            <tr>
              <td>Mounted beast</td>
              <td>Mounted ATK, counted once a beast is mounted</td>
            </tr>
            <tr>
              <td>Black Orb</td>
              <td>The Black Orb’s resonance ATK</td>
            </tr>
            <tr>
              <td>Skill buffs</td>
              <td>
                Plain “Total ATK +X%” buffs from the skill preset, only while the fight on the
                Analysis tab is playing with Include Skills ticked
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Look at the Extra ATK row: seven different sources share one group, so every new source
        there is diluted by the others. Blade Dance, Slayer DMG and the Black Orb each sit alone in
        their group, which is why small numbers on them punch above their weight.
      </p>

      <h2>Soul weapon completion</h2>
      <p>
        Completing a soul weapon’s engraving gives that weapon’s engraving ATK and HP percentages,
        and the completion effect is multiplied twice: by 1 + the companion passive for the weapon’s
        soul colour (Ellie’s Spirit’s Touch for green, Miho’s Casting for red, Luna’s Rune Magic for
        blue) and by 1 + the chaos level’s completion bonus, which you enter on the soul weapon
        panel. The HP part feeds both HP and HP Recovery.
      </p>

      <h2>Spirits</h2>
      <p>
        Spirit ATK, HP, Gold and EXP are the sums over the spirits in your active spirit preset.
        Each spirit’s stat is:
      </p>
      <p>
        <code>
          base × (1 + Fountain of Circulation effect) × (1 + element companion passive)
        </code>
      </p>
      <ul>
        <li>The base comes from the spirit’s ratio for that stat and its awakening tier and level.</li>
        <li>
          The Fountain of Circulation effect is the one for that stat’s fountain slot. The Settings
          panel shows your Fountain of Circulation grade from your Forest of Circulation level.
        </li>
        <li>
          The companion passive matches the spirit’s element: Ellie’s Wind Interaction, Zeke’s
          Earth Interaction, Miho’s Communion of Flames or Luna’s Sea Interaction.
        </li>
      </ul>
      <p>
        The partner, the first slot of the spirit preset, levels to 1,000; every other spirit
        levels to 700. Being the partner makes the spirit’s skill 10% stronger, not its stats. Once
        all six of your Main 6 spirits are owned, other spirits use the lowest level among those
        six.
      </p>

      <h2>HP and HP Recovery</h2>
      <p>
        HP follows the same shape as ATK with its own sources. The differences:
      </p>
      <ul>
        <li>
          Base HP is Enhance HP, Growth HP and ten times Growing Knowledge, multiplied by 1 + soul
          gem HP, Refinement HP, Appearance HP and the Statue of Demon’s Character HP. There is no
          soul weapon ATK part.
        </li>
        <li>Accessories take the place of weapons.</li>
        <li>
          The Extra HP group holds HP Ring, promotion HP rolls, Skill Mastery HP, Zeke’s Fortitude,
          Memory Tree HP and Constellation Extra HP.
        </li>
        <li>
          An amplifier group holds Skill Mastery’s HP AMP nodes plus twice the Black Orb’s boss
          damage.
        </li>
        <li>
          Breakthrough uses the Memory Tree HP multiplier. Familiar HP, owned beasts, Black Orb HP
          and Bo’s Wild Heart spirit skill each add their own group. HP has no Blade Dance, Slayer
          DMG, mounted beast or skill buff group.
        </li>
      </ul>
      <p>
        HP Recovery mirrors HP with a few changes: its base is Enhance HP Recovery, Growth VIT and
        Growing Knowledge, multiplied only by soul gem HP Recovery. Its extra group holds Recovery
        Totem, promotion rolls, Skill Mastery HP REGEN, Memory Tree VIT and Constellation HP
        Recovery. Its amplifier is Mastery’s HP REGEN AMP nodes plus twice the Black Orb’s monster
        damage. Spirit HP counts for it too, but Fortitude and Wild Heart don’t.
      </p>

      <h2>Crit and death strike</h2>
      <p>
        Crit chance comes only from Enhance CRIT %, at 0.1% per level, reaching 100% at level 1,000.
        Crit damage starts at 100% and has two groups. The first adds Enhance CRIT DMG, Growth CRI,
        weapon secondary stats, Refinement, Zeke’s Lunatic, soul gems and promotion rolls. The
        second holds only Hunter’s Eye and multiplies the first, which makes Hunter’s Eye one of the
        most efficient relics for damage.
      </p>
      <p>
        Death strike only opens up after crit chance is maxed. Until Enhance CRIT % reaches level
        1,000, both death strike stats are capped at level 1. After that, Death Strike % goes to
        level 1,000 (0.1% per level), and Death Strike damage (1% per level, shown on top of 100%)
        is capped by your Growing Knowledge grade plus its Superhuman bonus.
      </p>

      <h2>Gold and EXP</h2>
      <p>Extra Gold is the product of four groups, minus the starting 1:</p>
      <ul>
        <li>
          flat sources: weapon secondary stats, Appearance, Lucky Pendant, Growth LUK, soul gems,
          Skill Mastery and promotion rolls;
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
        way. Its flat group holds accessory secondary stats, Appearance, Skill Mastery and promotion
        rolls; Luna’s Hymn of the Abyss sits in its all-mode group.
      </p>

      <h2>Flat stats: Accuracy, Dodge and Mana</h2>
      <p>
        Accuracy starts at 30 and Dodge at 10, and everything else simply adds to them: Appearance,
        Growth, Focus Ring or Invisible Cloak, Ellie’s Intensive Fire or Miho’s Shadow Dance,
        Refinement, soul gems and promotion rolls. There’s no multiplication, so each point is worth
        the same whenever you get it.
      </p>
      <p>
        Mana starts at 100 and Mana Recovery at 10 per second. Each is multiplied by accessory
        secondary stats and by a second group: Luna’s Mana Amplification (Mana) or Mana Dope (Mana
        Recovery), plus promotion rolls.
      </p>
      <p>
        A few more stats are single sums. CC Resist comes only from promotion rolls, Movement Speed
        is 100% plus the mounted beast’s speed, and the Bracelet of Speed raises attack speed in the
        fight.
      </p>

      <h2>Element damage</h2>
      <p>
        Each element has its own damage bonus: that companion’s Understanding passive and Status,
        the matching relic, Skill Proficiency, the Attribute familiar proficiency and the Black Orb.
        A separate amplifier comes from the Statue of Order, the Constellation’s Amplify DMG and the
        Black Orb. The Stats Summary shows them combined as element damage × (1 + amplifier). The
        bonus applies to skills of that element, so it matters most for the element your skill
        preset is built around.
      </p>

      <h2>A worked example</h2>
      <p>
        Take a new account with Enhance ATK at level 1 (a base ATK of 1), a Common 4 weapon owned
        and equipped, companion promotion ATK of +80%, Slayer Promotion ATK of +40% and Memory Tree
        ATK of +50%, and nothing else:
      </p>
      <ul>
        <li>The weapon group is 1 + 7% equip + 2.1% owned = 1.091.</li>
        <li>The Extra ATK group is 1 + 0.8 + 0.4 + 0.5 = 2.7.</li>
        <li>
          ATK is 1 × 1.091 × 2.7 = <strong>2.9457</strong>.
        </li>
      </ul>
      <p>
        Three separate-looking systems all landed in one group. Another +50% in Extra ATK would give
        1.091 × 3.2 ≈ 3.49. The same +50% in an empty group gives 2.9457 × 1.5 ≈ 4.42.
      </p>

      <h2>Using this to plan</h2>
      <p>
        When choosing an upgrade, ask which group it feeds and how full that group already is. The
        analyzer does the maths for you: when a promotion fight on the Analysis tab falls short, it
        shows how many times your damage has to grow and a plan of upgrades, steepest first, priced
        against the resources you own. See{" "}
        <Link href="/guides/promotion-fights">promotion fights</Link> for how that works, and{" "}
        <Link href="/guides/character-progression">Enhance, Growth, Promotion and Classes</Link> for
        how each system’s numbers scale.
      </p>
    </GuideArticle>
  );
}
