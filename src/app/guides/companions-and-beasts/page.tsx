import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("companions-and-beasts");

export default function Guide() {
  return (
    <GuideArticle slug="companions-and-beasts">
      <p>
        Companions and beasts are easy to under-invest in because their bonuses are spread across
        many small passives. But several of those passives sit in multiplier groups of their own,
        and a companion’s element damage can end up among the biggest numbers on your account. This
        guide explains how both systems work and how the analyzer counts them. Both live in the
        analyzer’s Companion tab, under Companion and Beasts.
      </p>

      <h2>The four companions</h2>
      <p>Each companion is tied to an element:</p>
      <ul>
        <li><strong>Ellie</strong>: Wind</li>
        <li><strong>Zeke</strong>: Earth</li>
        <li><strong>Miho</strong>: Fire</li>
        <li><strong>Luna</strong>: Water</li>
      </ul>
      <p>
        Each has nine passives in three groups. Passive I is available from the start. Passive II
        opens at advancement 13, 15 and 17, and Passive III at 20, 22 and 24. The first passive in
        groups II and III needs all four companions to reach that advancement, not just the one
        you’re levelling. Advancement runs from 0 to 48.
      </p>

      <h2>Passive I</h2>
      <p>These are the passives most players level first, because most of them feed character stats directly:</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Companion</th>
              <th>Passive I</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ellie</td>
              <td>Intensive Fire (+5 Accuracy per level), Blessing of Forest (+3% Extra ATK per level), Song of Elf (+0.5% Reduce Enemy HP per level)</td>
            </tr>
            <tr>
              <td>Zeke</td>
              <td>Fortitude (+2% HP per level), Lunatic (+4% crit damage per level), Blade Dance (+2% ATK per level)</td>
            </tr>
            <tr>
              <td>Miho</td>
              <td>Shadow Step (+0.5% damage resist per level), Shadow Dance (+3 Dodge per level), Gold Rush (+1% total gold per level)</td>
            </tr>
            <tr>
              <td>Luna</td>
              <td>Mana Dope (+2% mana recovery per level), Mana Amplification (+2% mana per level), Wisdom of War (+1% skill damage per level)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Every passive except Understanding maxes at level 100, so Blessing of Forest reaches +300%
        Extra ATK. Zeke’s Blade Dance is worth a closer look: it’s the only source in its ATK
        group, so every level multiplies your whole ATK rather than adding to the Extra ATK group,
        which Blessing of Forest shares with relics, promotion rolls, mastery and more. Fortitude,
        by contrast, adds to the shared HP group.
      </p>
      <p>
        Wisdom of War multiplies every skill hit in the fight on its own. Gold Rush adds to a total
        gold multiplier together with Gold Rush II, the Memory Tree and the Constellation. Song of
        Elf and Shadow Step are listed with their costs but don’t enter the analyzer’s stats.
      </p>

      <h2>Passive II</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Companion</th>
              <th>Passive II</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ellie</td>
              <td>Wind’s Song (+1% Green Soul per level), Elf’s Hymn (+1% Mana Crystal per level), Wind’s Understanding</td>
            </tr>
            <tr>
              <td>Zeke</td>
              <td>Soul Catch (+0.5% White Soul per level), Ductility’s Wisdom (+1% Enhanced Cubes per level), Earth’s Understanding</td>
            </tr>
            <tr>
              <td>Miho</td>
              <td>Red Greed (+1% Red Soul per level), Gold Rush II (+2% total gold per level), Flame’s Understanding</td>
            </tr>
            <tr>
              <td>Luna</td>
              <td>Deep Sea Song (+1% Blue Soul per level), Hymn of the Abyss (+1% total EXP per level), Sea’s Understanding</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Gold Rush II joins Gold Rush’s gold multiplier, and Hymn of the Abyss sits in the total EXP
        multiplier with the Memory Tree and the Constellation. The soul, Mana Crystal and Enhanced
        Cubes passives don’t affect the analyzer’s stats.
      </p>

      <h3>Understanding: the long passive</h3>
      <p>
        Each companion’s <strong>Understanding</strong> adds damage for its element and goes to
        level 1,500 instead of 100. It doesn’t grow in a straight line. Levels 1 to 10 give +1%
        each, then every block of ten levels adds 1% more per level than the block before, until
        the gain reaches +50% per level around level 500 and stays there. Some reference points:
      </p>
      <ul>
        <li>level 25: +45%</li>
        <li>level 100: +550%</li>
        <li>level 500: +12,750%</li>
        <li>level 1,500: +62,750%</li>
      </ul>
      <p>
        After level 99, each level costs the same as level 99: 8,000 stones and 1,350 emeralds.
        Because the gain per level keeps rising while the cost stays flat, Understanding gets more
        cost-effective up to about level 500, and stays at its best rate after that.
      </p>
      <p>
        Understanding is added to your element damage along with Status (below), relics and other
        sources, before element amplification. See{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link> for the full
        formula.
      </p>

      <h2>Passive III</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Companion</th>
              <th>Passive III</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ellie</td>
              <td>Spirit’s Touch (+1% green soul weapon completion effect per level), Detect Weakness (+2% damage to Destructionist per level), Wind Interaction (+1% Wind spirit stats per level)</td>
            </tr>
            <tr>
              <td>Zeke</td>
              <td>Disorder (+1% Chaos Soul acquisition per level), Lockdown (+0.5% Rift Demon damage reduction per level), Earth Interaction (+1% Earth spirit stats per level)</td>
            </tr>
            <tr>
              <td>Miho</td>
              <td>Casting (+1% red soul weapon completion effect per level), Shadow Brand (+2% damage to Devourist per level), Communion of Flames (+1% Fire spirit stats per level)</td>
            </tr>
            <tr>
              <td>Luna</td>
              <td>Rune Magic (+1% blue soul weapon completion effect per level), Block Magic (+2% damage to Origin of Chaos per level), Sea Interaction (+1% Water spirit stats per level)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Two kinds of Passive III feed the analyzer:</p>
      <ul>
        <li>
          <strong>Soul weapon completion.</strong> Spirit’s Touch, Casting and Rune Magic multiply
          the completion effect of your equipped soul weapon if its soul colour matches (green, red
          or blue) and its engraving is marked complete. At level 100 the effect doubles.
        </li>
        <li>
          <strong>Spirit interaction.</strong> The four Interaction passives multiply the stats of
          spirits of their element, up to +100% at level 100.
        </li>
      </ul>
      <p>
        The mode damage passives (Detect Weakness, Lockdown, Shadow Brand, Block Magic) and Disorder
        are listed with their costs but don’t change the analyzer’s stats or fights.
      </p>

      <h2>Levelling costs</h2>
      <p>
        Passives cost stones and emeralds, with the cost rising per level. Taking a passive to 100
        is a big commitment: Blessing of Forest needs 198,000 stones and 74,500 emeralds in total,
        while Blade Dance needs 891,000 stones and 223,500 emeralds. Maxing an Understanding takes
        11,796,000 stones and 1,990,575 emeralds. The analyzer shows the next-level cost and the
        cost to max next to each passive, plus a total per companion and for all four, so you can
        compare gain per resource directly.
      </p>

      <h2>Companion level and Status</h2>
      <p>
        A companion’s level comes from its passive levels: the total ÷ 5 up to 300 total levels,
        then 60 + (total − 300) ÷ 10 after that, rounded down. So 299 total passive levels is
        companion level 59, and 320 is level 62.
      </p>
      <p>
        <strong>Status</strong> turns that level into element damage: the element damage per level
        set by the companion’s advancement, times its companion level. It runs from 0.5% per level
        at advancement 0 to 47% at advancement 48. A companion at advancement 4 and level 10 gives
        +30%. One with every passive maxed (companion level 260) at advancement 48 gives +12,220%
        damage for its element. That’s why advancement is worth more than it first appears: it
        multiplies the value of every passive level you already have, including the ones whose
        effects the analyzer doesn’t count.
      </p>

      <h2>Promotion rolls</h2>
      <p>
        Companions also have seven promotion slots. Each slot rolls one of eleven stats (Extra ATK,
        crit damage, Extra HP, HP Recovery, Extra Mana, Mana Recovery, Monster Gold, Accuracy,
        Dodge, Extra EXP or CC Resist) at a colour tier: White, Green, Orange, Purple, Red or Aqua.
        Its value is multiplied by the slot’s rank: ×1 for 1st, rising by 0.5 per rank to ×4 for
        7th. Advancement opens slots and raises their rank. At advancement 0 a companion has a
        single 1st-rank slot; at 48 all seven slots are 7th-rank. An Aqua Extra ATK roll of 20% in
        a 7th-rank slot is worth 80%.
      </p>
      <p>
        Roll values add into the same groups as the matching stat from other sources, so Extra ATK
        rolls share the Extra ATK group with Blessing of Forest.
      </p>

      <h2>Beasts</h2>
      <p>
        There are 21 beasts in five families: Wolf, Boar, Bat, Golem and Draco. Each family has
        three or four common beasts and one unique beast (Shadow Wolf, General Boar, Golden Bat,
        Rift Golem and Light Draco).
      </p>
      <p>
        Beasts awaken from 0 to 6, and their affection cap is (awaken + 1) × 10: 10 at awaken 0 up
        to 70 at awaken 6. They contribute in three ways.
      </p>
      <h3>Owned effect</h3>
      <p>
        Every beast you own adds a combat bonus, and the total multiplies ATK, HP and HP Recovery
        in its own group. A common beast at awaken 0 and affection 1 gives 3%, and a unique beast
        at awaken 6 and affection 70 gives 29.58%. Dracos use a higher column: 5% and 59.16% for the
        same points. A Shadow Wolf at awaken 3 and affection 20 gives 14.48%.
      </p>
      <h3>Mounted effect</h3>
      <p>
        While any beast is mounted, every owned wolf and boar adds its mounted ATK bonus, again in
        its own group. Owned bats and dracos likewise add movement speed while mounted. Golems and
        dracos also show a mounted affection bonus, which doesn’t feed the analyzer’s stats. You
        can keep five beast presets, each with its own beast and a Mounted switch.
      </p>
      <h3>Beast skill</h3>
      <p>
        The active preset’s beast brings its skill to the Analysis tab’s fights whether or not it’s
        mounted. It triggers once per battle:
      </p>
      <ul>
        <li><strong>Wolves</strong>: after a set number of strike skills, ATK +Y% for 10 seconds. A Gray Wolf at awaken 2 gives +12%.</li>
        <li><strong>Boars</strong>: after a set number of knockbacks, ATK +Y% for 30 seconds. The fight counts one knockback every 20 seconds.</li>
        <li><strong>Bats</strong>: after a set number of kills, movement speed +Y% for 30 seconds.</li>
        <li>
          <strong>Dracos</strong>: when a stacking skill’s stacks are maxed, boss damage +Y% for 60
          seconds. Wind, Earth, Water and Fire Draco each watch one skill (Speed Sword, Earth’s
          Will, Curved Blade and Burning Sword); Light Draco waits until all buff stacks are maxed.
        </li>
        <li><strong>Golems</strong>: only work in the Rift, so they don’t act in the analyzer’s fights.</li>
      </ul>

      <h2>Where to invest first</h2>
      <p>
        Blade Dance and the two beast bonuses each feed a multiplier group of their own, so they
        tend to give more per resource than another source added to an already large Extra ATK
        group. Collecting more beasts raises the owned bonus even before you awaken them.
        Advancement raises the value of every passive level through Status, and Understanding
        grows cheaper per point up to about level 500. For the reasoning behind multiplier groups,
        see <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>.
      </p>
      <p>
        Then enter your companions and beasts in the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link>. When a fight in the Analysis tab
        falls short, its upgrade plans include companion passives priced in stones and emeralds,
        and beast awaken and affection levels without a price. See{" "}
        <Link href="/guides/promotion-fights">promotion fights</Link> for how those plans are built.
      </p>
    </GuideArticle>
  );
}
