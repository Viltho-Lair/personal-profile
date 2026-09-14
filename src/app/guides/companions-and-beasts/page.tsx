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
        guide explains how both systems work.
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
        Each has nine passives in three groups. Group I is available from the start. Group II opens
        at advancement 13, 15 and 17, and group III at 20, 22 and 24. The first passive in groups II
        and III needs all four companions to reach that advancement, not just the one you’re
        levelling.
      </p>

      <h2>What the passives do</h2>
      <p>Group I holds the passives most players level first, because they feed character stats directly:</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Companion</th>
              <th>Group I passives</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ellie</td>
              <td>Intensive Fire (+5 Accuracy per level), Blessing of Forest (+3% Extra ATK per level), Song of Elf</td>
            </tr>
            <tr>
              <td>Zeke</td>
              <td>Fortitude (+2% HP per level), Lunatic (+4% crit damage per level), Blade Dance (+2% ATK per level)</td>
            </tr>
            <tr>
              <td>Miho</td>
              <td>Shadow Step (damage resist), Shadow Dance (+3 Dodge per level), Gold Rush (+1% total gold per level)</td>
            </tr>
            <tr>
              <td>Luna</td>
              <td>Mana Dope (+2% mana recovery per level), Mana Amplification (+2% mana per level), Wisdom of War (+1% skill damage per level)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Most passives max at level 100, so Blessing of Forest reaches +300% Extra ATK. Zeke’s Blade
        Dance is worth a closer look: it’s the only source in its ATK group, so every level
        multiplies your whole ATK rather than competing with other Extra ATK sources. Gold Rush and
        Luna’s Hymn of the Abyss also sit in multiplier groups for gold and EXP.
      </p>
      <p>
        Groups II and III add each companion’s <strong>Understanding</strong> (element damage), a
        soul weapon completion booster for one colour, an element spirit interaction that boosts
        spirits of that element by up to +100%, and several mode-specific effects.
      </p>

      <h3>Understanding: the long passive</h3>
      <p>
        Understanding goes to level 1,500 instead of 100, and it doesn’t grow in a straight line.
        The early levels give about +1% each. After that, the gain per level steps up with every
        ten levels, and past level 500 every level adds +50%. Some reference points:
      </p>
      <ul>
        <li>level 25: +45%</li>
        <li>level 100: +550%</li>
        <li>level 500: +12,750%</li>
        <li>level 1,500: +62,750%</li>
      </ul>
      <p>
        Because the gain per level keeps rising, Understanding gets more cost-effective the further
        you take it. After level 99, each level costs the same as level 99.
      </p>

      <h2>Levelling costs</h2>
      <p>
        Passives cost stones and emeralds, with the cost rising per level. Taking a passive to 100
        is a big commitment: Blessing of Forest needs 198,000 stones and 74,500 emeralds in total,
        while Blade Dance needs 891,000 stones and 223,500 emeralds. Maxing Wind’s Understanding
        takes nearly 11.8 million stones. The analyzer shows the next-level cost and the cost to
        max next to each passive, so you can compare gain per resource directly.
      </p>

      <h2>Companion level and Status</h2>
      <p>
        A companion’s level comes from its passive levels: the total ÷ 5 up to 300 total levels,
        then 60 + (total − 300) ÷ 10 after that. So 299 total passive levels is companion level 59,
        and 320 is level 62.
      </p>
      <p>
        <strong>Status</strong> turns that level into element damage. Each advancement sets how much
        element damage you gain per companion level, from 0.5% at advancement 0 to 47% at
        advancement 48. A companion at advancement 4 and level 10 gives +30%. One with every passive
        maxed (companion level 260) at advancement 48 gives +12,220% damage for its element. That’s
        why advancement is worth more than it first appears: it multiplies the value of every
        passive level you already have.
      </p>

      <h2>Promotion rolls</h2>
      <p>
        Companions also have seven promotion slots. Each slot rolls a stat, such as Extra ATK, crit
        damage or Accuracy, at a colour tier from White to Aqua. Its value is multiplied by the
        slot’s rank: ×1 for the first rank up to ×4 for the seventh. Advancement opens slots and
        raises their rank. At advancement 0 a companion has a single first-rank slot; at 48 all
        seven slots are seventh-rank. An Aqua Extra ATK roll of 20% in a seventh-rank slot is worth
        80%.
      </p>

      <h2>Beasts</h2>
      <p>
        There are 21 beasts in five families: Wolf, Boar, Bat, Golem and Draco. Each family has
        three or four common beasts and one unique beast (Shadow Wolf, General Boar, Golden Bat,
        Rift Golem and Light Draco).
      </p>
      <p>
        Beasts awaken from 0 to 6, and their affection cap is (awaken + 1) × 10: 10 at awaken 0 up
        to 70 at awaken 6. They contribute in two ways.
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
        While any beast is mounted, owned attack beasts add a mounted ATK bonus, again in its own
        group. The mounted beast also brings its skill. Wolves, for example, give an ATK buff for 10
        seconds after a set number of strike skills, and a Gray Wolf at awaken 2 gives +12%. Boars
        grant ATK after knockbacks, Bats and Dracos raise movement speed, and Golems work against
        Rift bosses. You can keep five beast presets, each with its own mount.
      </p>

      <h2>Where to invest first</h2>
      <p>
        Because beasts and Blade Dance each feed their own groups, they tend to give more per resource
        than another source in an already large Extra ATK group, and advancement raises the value of
        every passive level through Status. Collecting more beasts
        raises the owned bonus even before you awaken them. For the reasoning behind this, see{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>, then enter
        your companions in the <Link href="/slayer-legends-analyzer">analyzer</Link> to compare
        costs.
      </p>
    </GuideArticle>
  );
}
