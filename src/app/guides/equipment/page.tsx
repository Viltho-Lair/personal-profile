import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("equipment");

export default function Guide() {
  return (
    <GuideArticle slug="equipment">
      <p>
        Gear in Slayer Legends looks simple: equip the best weapon and accessory you have. But
        every piece you own keeps working even when it isn’t equipped, and relics, spirits and soul
        weapons each follow their own rules. This guide covers how each scales and where the big
        jumps are.
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
          <strong>Equip effect</strong> = the grade’s multiplier × a level factor. Only the item you
          have equipped gives this.
        </li>
        <li>
          <strong>Owned effect</strong> = 30% of the equip effect. Every item you own gives this,
          equipped or not.
        </li>
      </ul>
      <p>
        Both go into the same group (weapons for ATK, accessories for HP), so levelling items you
        don’t use still adds power. That’s easy to overlook when the game only shows the equipped
        item.
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
        Mythic are enormous: Mythic 1 is thirty times Mythic 4.
      </p>

      <h3>Level factor and awakening</h3>
      <p>
        The level factor starts at 1 at level 0 and rises quickly at first, then steadily: about
        1.375 at level 1, 3.54 at 10, 8.99 at 100, 25.7 at 500, 50.5 at 1,000 and 82.96 at 1,700.
        Max level begins at 200 and gains 50 per awakening, reaching 1,700 at awakening 30.
      </p>
      <p>
        Immortal gear also gains an awakened multiplier on top: ×1.18 at the first awakening, ×3.65
        at 6, ×21.9 at 18 and ×153 at 30 for the weapon. That’s why an Immortal item keeps growing
        long after lower tiers have flattened out.
      </p>
      <p>Some worked numbers:</p>
      <ul>
        <li>A Common 4 bracelet at level 297 gives about 109.9% equip and 33.0% owned.</li>
        <li>A Legendary 1 weapon at level 100 gives 30,000 × 8.986 ≈ 269,581% equip and about 80,874% owned.</li>
        <li>An Immortal weapon at awakening 6 and level 500 gives about 938 million percent.</li>
      </ul>

      <h3>Secondary stats</h3>
      <p>
        From Rare upward, owned weapons also add crit damage that grows with level. Mythic and
        Immortal weapons add gold. Owned accessories add mana recovery from Rare upward, and Max
        Mana from Legendary upward. Mythic and Immortal accessories also add EXP.
      </p>

      <h2>Relics</h2>
      <p>
        Relics level to 100 (Bracelet of Speed to 50). Their value is the level × a factor that
        steps up every ten levels, so each tenth level is a small jump.
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
            <tr><td>Bracelet of Speed</td><td>Attack speed</td><td>+35%</td></tr>
            <tr><td>Silence Flame, Abyss’s Water Drop, Eye of Typoon, Emperor Ring</td><td>Fire, Water, Wind, Earth damage</td><td>+300% each</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        For example, Strength Gloves at level 50 uses the 50–59 factor of 0.08: 50 × 0.08 = +400%.
        Hunter’s Eye deserves special attention because it has a crit damage group all to itself,
        so its +400% multiplies every other crit damage source.
      </p>

      <h2>Spirits</h2>
      <p>
        There are twelve spirits: Ark, Bo, Herh, Kart, Loar, Luga, Mum, Noah, Radon, Sala, Todd and
        Zappy. Each gives stats from a personal ratio × a factor set by its awakening tier and level.
        The tiers are Common, Great, Rare and Epic, then Legendary, Mythic and Immortal with six
        awakening steps each (A0–A5), then Ancient.
      </p>
      <p>
        The factor climbs steeply with tier. At level 100 it’s about 48 for Common, 192 for
        Legendary A0, 1,200 for Mythic A0, 3,526 for Immortal A0 and 10,910 for Ancient A0. Below
        Immortal the factor stops rising at level 500; Immortal and Ancient spirits keep growing to
        level 1,000. Loar, with an ATK ratio of 1.1, gives about 211% ATK at Legendary A0 level 100.
      </p>
      <p>Three rules shape spirit planning:</p>
      <ul>
        <li>Only the three spirits in your active preset add stats, and you can keep five presets.</li>
        <li>
          Once six “main” spirits are all owned, every other spirit counts at the level of the
          weakest main spirit, so you don’t have to level all twelve.
        </li>
        <li>
          Spirit stats are multiplied by the Fountain of Circulation and by the matching companion’s
          element interaction passive, worth up to +100%.
        </li>
      </ul>

      <h2>Soul weapons</h2>
      <p>
        There are 97 soul weapons in three colours: green, blue and red. Their ATK adds to your
        base ATK and ranges from 6,300 for Innocence to billions for the latest ones. Completing a
        weapon’s plate also unlocks a completion effect: a percentage bonus to ATK and HP in its
        own group. Each colour’s completion effect is boosted by one companion passive: Ellie’s
        Spirit’s Touch for green, Luna’s Rune Magic for blue and Miho’s Casting for red.
      </p>
      <p>
        Plates are filled with tetromino-shaped soul gems. The shape decides the stat (the
        L gem gives ATK, J gives HP, T gives HP Recovery, O gives crit damage, I gives gold, S gives
        Accuracy, Z gives Dodge), and each gem’s engraving effect boosts soul weapon ATK. Gem ATK
        amplifies your enhance-based base ATK rather than the soul weapon’s own ATK.
      </p>

      <h2>Black Orb and Sealed Shrine</h2>
      <p>
        The Black Orb has four element accessories whose lines amplify element damage, with extra
        effects unlocking at orb levels 16, 20 and 24. Resonance across the accessories adds HP, ATK
        and all-element damage. The Sealed Shrine has four statues: Dragon amplifies Latent Power,
        Order adds +18% amplification to every element at max, Chaos adds up to +45% character ATK
        and +35% soul weapon ATK, and Demon adds up to +160% HP and +166% skill damage.
      </p>

      <p>
        Enter your gear in the Equips tab of the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link> to see the equip and owned effects at
        your exact levels. For why owned effects and separate groups matter so much, see{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>.
      </p>
    </GuideArticle>
  );
}
