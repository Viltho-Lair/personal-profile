import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("equipment");

export default function Guide() {
  return (
    <GuideArticle slug="equipment">
      <p>
        Gear in Slayer Legends looks simple: equip the best weapon and accessory you have. But
        every piece you own keeps working even when it isn’t equipped, and relics, spirits, soul
        weapons, the Sealed Shrine and the Black Orb each follow their own rules. This guide covers
        how each scales and where the big jumps are. All of them live in the analyzer’s Equips tab,
        under Weapons, Accessories, Relics (with the Sealed Shrine beside them), Spirits, Soul
        Weapons and Black Orb.
      </p>

      <h2>Tiers and grades</h2>
      <p>
        Weapons and accessories come in seven tiers, from weakest to strongest: Common, Great, Rare,
        Epic, Legendary, Mythic and Immortal. Every tier except Immortal has four grades, numbered
        from 4 (weakest) to 1 (strongest), so “Epic 1” beats “Epic 4”. Immortal is a single grade.
      </p>

      <h2>Equip effect and owned effect</h2>
      <p>Each weapon and accessory has two effects:</p>
      <ul>
        <li>
          <strong>Equip effect</strong> = the grade’s multiplier × a level factor (× the awakened
          multiplier for Immortal). Only the grade you have equipped gives this.
        </li>
        <li>
          <strong>Owned effect</strong> = 30% of the equip effect. Every grade you own gives this,
          equipped or not.
        </li>
      </ul>
      <p>
        Both go into the same group: weapons raise ATK, accessories raise HP and HP Recovery. So
        levelling grades you don’t use still adds power. That’s easy to overlook when the game only
        shows the equipped item. Tick a grade as owned in the analyzer, or its level counts for
        nothing.
      </p>

      <h3>Grade multipliers</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Weapon grades 4 / 3 / 2 / 1</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Common</td><td>7 / 10 / 15 / 20</td></tr>
            <tr><td>Great</td><td>35 / 50 / 80 / 120</td></tr>
            <tr><td>Rare</td><td>170 / 240 / 330 / 460</td></tr>
            <tr><td>Epic</td><td>800 / 1,500 / 2,500 / 4,000</td></tr>
            <tr><td>Legendary</td><td>10,000 / 15,000 / 24,000 / 30,000</td></tr>
            <tr><td>Mythic</td><td>100,000 / 300,000 / 850,000 / 3,000,000</td></tr>
            <tr><td>Immortal</td><td>10,000,000</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Accessories match weapons up to Legendary, then diverge. Mythic accessories are 100,000 /
        180,000 / 300,000 / 1,000,000 and the Immortal accessory is 3,000,000. The jumps inside
        Mythic are enormous: a Mythic 1 weapon is thirty times a Mythic 4, and a Mythic 1 accessory
        ten times.
      </p>

      <h3>Level factor and awakening</h3>
      <p>
        The level factor starts at 1 at level 0 and rises quickly at first, then steadily: about
        1.375 at level 1, 3.54 at 10, 8.99 at 100, 25.7 at 500, 50.5 at 1,000 and 82.96 at 1,700.
      </p>
      <p>
        Awakening is set once for all weapons (Orr) and once for all accessories (Orb), from 0 to
        30. It raises the max level of every grade: 200 at awakening 0, plus 50 per awakening, up
        to 1,700 at awakening 30.
      </p>
      <p>
        The Immortal grade also gains an awakened multiplier on top: ×1.18 at the first awakening,
        ×3.65 at 6, ×21.9 at 18 and ×153 at 30 for the weapon (the accessory is close, ×155.7 at
        30). That’s why an Immortal item keeps growing long after lower tiers have flattened out.
      </p>
      <p>Some worked numbers:</p>
      <ul>
        <li>A Common 4 accessory at level 297 gives about 109.9% equip and 33.0% owned.</li>
        <li>A Legendary 1 weapon at level 100 gives 30,000 × 8.986 ≈ 269,581% equip and about 80,874% owned.</li>
        <li>An Immortal weapon at awakening 6 and level 500 gives about 938 million percent equip.</li>
      </ul>

      <h3>Secondary stats</h3>
      <p>
        Every owned weapon from Rare upward also adds crit damage, and it grows with level: (level
        + 10) × the grade’s rate ÷ 10, so a Legendary 1 at level 100 adds 110 × 0.065 ÷ 10 = +71.5%.
        At level 0 it adds nothing. Mythic and Immortal weapons add gold as well, and the Immortal
        weapon’s crit and gold rates rise with awakening.
      </p>
      <p>
        Owned accessories add a flat amount of mana recovery from Rare upward (0.5% for Rare, 1%
        Epic, 2% Legendary, 3% Mythic), and the same amount of Max Mana from Legendary upward. These
        don’t grow with level. Mythic and Immortal accessories also add EXP, which does. The
        Immortal accessory’s mana and EXP rise with awakening.
      </p>

      <h2>Relics</h2>
      <p>
        A relic’s value is its level × a factor for the band that level falls in. Most relics step
        their factor up every ten levels, with a last jump at level 100: Strength Gloves go from
        99 × 0.18 = +1,782% at level 99 to 100 × 0.22 = +2,200% at level 100. Invisible Cloak steps
        less often, and Lucky Pendant and Bracelet of Speed use a single factor throughout. Level 0
        means not owned.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Relic</th>
              <th>Stat</th>
              <th>At max level</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Strength Gloves</td><td>Extra ATK</td><td>+2,200%</td></tr>
            <tr><td>Hunter’s Eye</td><td>Crit damage multiplier</td><td>+400%</td></tr>
            <tr><td>HP Ring</td><td>Extra HP</td><td>+1,400%</td></tr>
            <tr><td>Recovery Totem</td><td>Extra HP Recovery</td><td>+420%</td></tr>
            <tr><td>Lucky Pendant</td><td>Monster gold</td><td>+500%</td></tr>
            <tr><td>Focus Ring</td><td>Accuracy</td><td>+1,400</td></tr>
            <tr><td>Invisible Cloak</td><td>Dodge</td><td>+700</td></tr>
            <tr><td>Bracelet of Speed (max level 50)</td><td>Attack speed</td><td>+35%</td></tr>
            <tr><td>Silence Flame, Abyss’s Water Drop, Eye of Typoon, Emperor Ring</td><td>Fire, Water, Wind, Earth damage</td><td>+300% each</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Every relic except Bracelet of Speed maxes at level 100. For example, Strength Gloves at
        level 50 uses the 50–59 factor of 0.08: 50 × 0.08 = +400%. Hunter’s Eye deserves special
        attention because it has a crit damage group all to itself, so its +400% multiplies every
        other crit damage source.
      </p>
      <p>
        Relic levels are attempts that can fail. The analyzer’s upgrade plans price them as expected
        attempts: the success chance starts near 100% and falls to 10% from level 54, so the last
        levels cost far more than the first.
      </p>

      <h2>Spirits</h2>
      <p>
        There are twelve spirits, three per element: Bo, Mum and Sala (Fire); Ark, Luga and Todd
        (Water); Herh, Kart and Zappy (Wind); Loar, Noah and Radon (Earth). Each gives ATK, HP, gold
        and EXP from a personal ratio × a factor set by its awakening tier and level. The tiers are
        Common, Great, Rare and Epic, then Legendary, Mythic and Immortal with six awakening steps
        each (A0–A5, shown as stars), then Ancient A0, the highest.
      </p>
      <p>
        The factor climbs steeply with tier. At level 100 it’s about 48 for Common, 192 for
        Legendary A0, 1,200 for Mythic A0, 3,526 for Immortal A0 and 10,910 for Ancient A0. Below
        Immortal the factor stops rising at level 500; Immortal and Ancient spirits keep growing
        past it. Loar, with an ATK ratio of 1.1, gives about 211% ATK at Legendary A0 level 100,
        before amplifiers.
      </p>
      <p>Four rules shape spirit planning:</p>
      <ul>
        <li>
          Only the three spirits in your active spirit preset add stats, and you can keep five
          presets.
        </li>
        <li>
          The first slot of the preset is the <strong>partner</strong>. The partner levels to 1,000;
          every other spirit stops at 700. The partner’s spirit skill is also 10% stronger, and the
          analyzer highlights its slot.
        </li>
        <li>
          Mark six spirits as “Main 6”. Once all six are owned, every other spirit counts at the
          level of the lowest main spirit, so you don’t have to level all twelve.
        </li>
        <li>
          Spirit ATK and HP = base × (1 + the Fountain of Circulation companion effect for that
          stat’s slot) × (1 + the matching element’s Interaction passive). The passives are Ellie’s
          Wind Interaction, Zeke’s Earth Interaction, Miho’s Communion of Flames and Luna’s Sea
          Interaction, each +1% a level, so +100% at level 100. Gold and EXP get the same two
          amplifiers.
        </li>
      </ul>
      <p>
        Enter the four Awakened Fountain of Circulation companion effects in the Spirits tab, as the
        game shows them. Settings has your Forest of Circulation level, which shows the Fountain
        grade it gives: one grade every 30 Forest levels, with 240 being grade 9. Spirit levels cost
        cubes and Mana Crystals.
      </p>

      <h3>Spirit skills</h3>
      <p>
        Each spirit’s skill has five levels, set by its enhance (1–5), and works whenever the
        spirit is in the active preset. At enhance 5:
      </p>
      <ul>
        <li><strong>Bo, Wild Heart</strong>: +500% total HP, counted in the Stats Summary.</li>
        <li><strong>Sala, Breath of Fire</strong>: every 12 seconds, damage equal to 10% of the enemy’s remaining HP.</li>
        <li><strong>Noah, Last Fight</strong>: double damage in the last 5 seconds of the battle.</li>
        <li><strong>Loar, Wilderness Roar</strong>: +80% skill damage to bosses.</li>
        <li><strong>Mum, Reign</strong>: +80% skill damage to normal monsters.</li>
        <li><strong>Radon, Leveling</strong>: +80% damage while the enemy is above 70% HP.</li>
        <li><strong>Zappy, Judge’s Torpedo</strong>: kills normal monsters below 30% HP at once.</li>
        <li><strong>Kart, Thief Wind</strong>: the first hit on a normal monster takes 25% of its HP.</li>
        <li><strong>Herh, Wind Force</strong>: skill cooldowns recover 6% every 10 seconds.</li>
        <li><strong>Ark, Time Freeze</strong>: stops time for 10 seconds, 8 seconds into the battle. The partner bonus doesn’t lengthen it.</li>
        <li><strong>Todd and Luga</strong>: 80% chance of double gold (Todd) or EXP (Luga) when you gain it.</li>
      </ul>
      <p>
        Every skill except Bo’s, Todd’s and Luga’s acts in the fights on the Analysis tab. Todd and
        Luga change drops rather than stats, so the analyzer doesn’t count them.
      </p>

      <h2>Soul weapons</h2>
      <p>
        There are 97 soul weapons in three colours: green, blue and red. Only the equipped one
        counts. Its ATK adds alongside your base ATK and ranges from 6,300 for Innocence to about
        3.7 billion for the last one. That ATK is raised by the Soul Weapon ATK bonus: your soul
        gems’ engraving effects plus the Sealed Shrine’s Statue of Chaos.
      </p>
      <p>
        A completed engraving plate also gives a <strong>completion effect</strong>: a percentage
        bonus to ATK and to HP (which also raises HP Recovery), each in a group of its own. Tick
        “Completed” on the weapon in the analyzer. The effect is:
      </p>
      <p>
        weapon’s completion % × (1 + its colour’s companion passive) × (1 + chaos bonus)
      </p>
      <p>
        The passives are Ellie’s Spirit’s Touch for green, Miho’s Casting for red and Luna’s Rune
        Magic for blue, each +1% a level, so +100% at level 100. For example, Illusion (red) has a
        54.6% ATK completion, which becomes +109.2% with Casting at 100. Afterglow (green) goes from
        60% to +120% with Spirit’s Touch at 100. The chaos bonus comes from your chaos level; enter
        it as the game shows it.
      </p>
      <p>
        Plates are filled with tetromino-shaped soul gems, and you can enter eight. The shape
        decides the gem’s stat: L gives ATK, J gives HP, T gives HP Recovery, O gives crit damage,
        I gives gold, S gives Accuracy and Z gives Dodge. Enter each gem’s value and its engraving
        effect (Soul Weapon ATK) as the game shows them. Every gem you enter counts. Gem ATK raises
        the ATK from enhance, growth and Growing Knowledge, not the soul weapon’s own ATK.
      </p>

      <h2>Sealed Shrine</h2>
      <p>The Sealed Shrine has four statues. At max level:</p>
      <ul>
        <li><strong>Statue of Dragon</strong> (level 17): amplifies Latent Power growth, +80% STR and +60% HP, VIT, CRI and LUK.</li>
        <li><strong>Statue of Order</strong> (level 73): +18% amplification to each element’s damage.</li>
        <li><strong>Statue of Chaos</strong> (level 17): +35% Soul Weapon ATK and +45% character ATK.</li>
        <li><strong>Statue of Demon</strong> (level 37): +160% character HP and +166% skill damage amplification, used in the fights.</li>
      </ul>

      <h2>Black Orb</h2>
      <p>
        The Black Orb has four accessories, one per element. Each has an element damage stat and
        four option lines. A line amplifies its element’s damage, and counts double on the accessory
        of that same element; an “All” line amplifies every element. The orb’s own level adds boss
        and monster damage, and unlocks more at three points:
      </p>
      <ul>
        <li>
          <strong>Level 16, resonance</strong>: once the four accessories total 50 levels, adds ATK
          and HP, and from 72 total levels an amplification to every element.
        </li>
        <li>
          <strong>Level 20, awakening</strong>: each line’s “+” level adds to its value, and the
          total “+” levels raise the accessory’s element damage.
        </li>
        <li>
          <strong>Level 24, bonus effects</strong>: two lines of the accessory’s own element give
          +5% to it, three give +10%, and all four give +10% to every element.
        </li>
      </ul>
      <p>
        In the fights, boss damage multiplies every hit on a boss and monster damage every hit on a
        normal monster. Following the workbook, twice
        the boss damage is added to HP and twice the monster damage to HP Recovery. Element
        amplification from the Black Orb, the Statue of Order and the Constellation of Light
        multiplies your element damage.
      </p>

      <p>
        Enter your gear in the Equips tab of the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link> to see the equip and owned effects at
        your exact levels, and the Stats Summary on the Analysis tab for the totals. For why owned
        effects and separate groups matter so much, see{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>. The companion
        passives that amplify spirits and soul weapons are covered in{" "}
        <Link href="/guides/companions-and-beasts">companions and beasts</Link>, and the fights in{" "}
        <Link href="/guides/promotion-fights">promotion fights</Link>.
      </p>
    </GuideArticle>
  );
}
