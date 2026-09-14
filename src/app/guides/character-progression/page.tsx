import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("character-progression");

const PROMOTIONS: [string, string][] = [
  ["Stone", "1"],
  ["Bronze", "2"],
  ["Iron", "5"],
  ["Silver", "18"],
  ["Gold", "25"],
  ["Mithril", "100"],
  ["Orichalcum", "300"],
  ["Arcanite", "550"],
  ["Adamant", "1,000"],
  ["Ether", "2,000"],
  ["Black Mythril", "5,000"],
  ["Demon Metal", "10,000"],
  ["Dragonos", "20,000"],
  ["Ragnablood", "40,000"],
  ["Warfrost", "80,000"],
  ["Dark Nox", "160,000"],
  ["Blue Abyssal", "320,000"],
  ["Infinaut", "640,000"],
  ["Cyclos", "1,300,000"],
  ["Ancient Canine", "2,600,000"],
  ["Gigarock", "5,200,000"],
  ["Eisenhart", "10,400,000"],
  ["Diadust", "21,000,000"],
  ["Eldenwood", "42,000,000"],
  ["Blitz Gold", "84,000,000"],
  ["Aurorite", "168,000,000"],
];

export default function Guide() {
  return (
    <GuideArticle slug="character-progression">
      <p>
        Enhance, Growth, Promotion and Classes are the systems you touch from the first minute of
        Slayer Legends to the last. They also scale in very different ways: some grow in straight
        lines, some jump at thresholds, and one doubles roughly every step. Knowing the shape of
        each helps you spot the cheap jumps and avoid overpaying for small ones.
      </p>

      <h2>Enhance: watch the thresholds</h2>
      <p>
        Enhance ATK, HP and HP Recovery give their level multiplied by a tier factor. The factor
        rises at powers of ten:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>From level</th>
              <th>Factor</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>0</td><td>×1</td></tr>
            <tr><td>100</td><td>×2</td></tr>
            <tr><td>1,000</td><td>×3</td></tr>
            <tr><td>10,000</td><td>×4</td></tr>
            <tr><td>100,000</td><td>×5</td></tr>
            <tr><td>1,000,000</td><td>×6</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        HP is multiplied by a further 10. The consequence is a big jump at each threshold: Enhance
        ATK 99 gives 99, but level 100 gives 200. Level 5,000 gives 15,000, and level 1,000,000
        gives 6,000,000. When you’re just short of a threshold, finishing it is almost always the
        best enhance spend available.
      </p>
      <p>
        The other enhance stats are linear. CRIT DMG adds 1% per level up to level 10,000. CRIT %
        adds 0.1% per level up to 1,000, which is 100% crit chance. The two death strike stats stay
        locked at level 1 until CRIT % is maxed. After that, DEATH STRIKE % rises by 0.1% per level
        to 1,000, and DEATH STRIKE damage by 1% per level up to a cap set by your Growing Knowledge
        and Superhuman grades. At Grade 1 and Superhuman Grade 2 the cap is 4,050 + 90 = 4,140.
      </p>

      <h3>Growing Knowledge</h3>
      <p>
        Growing Knowledge has 90 grades. Each adds flat base ATK, the same amount of HP Recovery, and
        ten times that as HP. Grade 1 gives 15,000 ATK, Grade 10 about 491,000, Grade 50 about 22.6
        million and Grade 90 about 201 million. It also raises the death strike damage cap. Because
        it lives in the base group, it’s multiplied by almost everything else you own.
      </p>

      <h2>Growth: skill points, the Training Diary and Latent Power</h2>
      <p>
        Growth spends skill points on seven stats. Per level, STR adds 5 ATK, HP adds 30, VIT adds 5
        HP Recovery, CRI adds 3% crit damage, LUK adds 0.5% gold, ACC adds 3 Accuracy and DODGE adds
        1 Dodge.
      </p>
      <p>
        You start with 100 skill points, gain 3 for every slayer level after the first, and gain 100
        more for every Training Diary level. The diary unlocks its first level at slayer level 500
        and one more every 100 levels. A slayer at level 2,800 with diary level 24 has 8,397 + 100 +
        2,400 = <strong>10,897</strong> points.
      </p>
      <p>
        Max levels also grow with the diary: STR, HP, VIT and LUK start at 1,000 and gain 50 per
        diary level; CRI, ACC and DODGE start at 200 and gain 10. Each diary level also grants 20
        Over Points. On the large stats, 5 Over Points buy +25 max level; on the small ones, 1 point
        buys +5. Each stat takes up to 48 of these upgrades. STR at diary 22 with all 48 bought caps
        at 1,000 + 1,100 + 1,200 = 3,300.
      </p>

      <h3>Latent Power</h3>
      <p>
        Past slayer level 250, Latent Power increases what each Growth level is worth. You roll five
        slots per stat, and their sum scales with how far past level 250 you are. For STR and VIT the
        per-level value becomes base + (levels past 250) × sum ÷ 200. A STR base of 5, at slayer level
        450 with a latent sum of 20, becomes 5 + 200 × 20 ÷ 200 = <strong>25 per level</strong>, five
        times the base. HP, CRI and LUK use their own versions of the formula, with CRI and LUK
        growing much more slowly. Awakened Latent Power multiplies the
        result again, by about 2% per step. The Statue of Dragon in the Sealed Shrine amplifies the
        latent sum itself.
      </p>

      <h2>Promotion: the biggest multiplier in the game</h2>
      <p>
        Each promotion carries an ATK and HP multiplier that sits in its own group, so it multiplies
        everything else:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Promotion</th>
              <th>ATK/HP ×</th>
            </tr>
          </thead>
          <tbody>
            {PROMOTIONS.map(([name, multiplier], index) => (
              <tr key={name}>
                <td>{index + 1}</td>
                <td>{name}</td>
                <td>{multiplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        From Dragonos onward, every promotion roughly doubles your ATK and HP. That’s why a
        promotion is usually worth more than any single upgrade you could buy instead, and why the{" "}
        <Link href="/guides/promotion-fights">promotion fight simulator</Link> is the analyzer’s
        centrepiece.
      </p>

      <h3>Slayer Promotion Ability</h3>
      <p>
        Promotions also open ability rows: row 1 needs your second promotion, and all seven are open
        from the eighth. Each row rolls one option, such as Extra ATK (3–40%), CRIT Dmg (6–70%), Extra
        HP (6–70%), Accuracy, Dodge or CC Resist. The page effect picks one of Extra ATK, Extra HP or
        Extra EXP and grows with promotion: Extra ATK reaches +280%, Extra HP +490% and Extra EXP
        +105% from Orichalcum on.
      </p>
      <p>
        Sweatsuits from Appearance multiply a specific row by 2, 3 or 4, and the best one you own
        for each row counts. A 40% ATK roll on a row with a ×4 suit is worth 160%, so owning the right
        suit can matter more than rerolling.
      </p>

      <h2>Classes</h2>
      <p>
        A class works like gear: its equip effect is its multiplier × a level factor, and every owned
        class also gives 30% of its effect as an owned bonus. Only the equipped class gives the full
        effect. Multipliers run from 1 for Trainee through 10 for Warrior, 150 for Gladiator and 1,000
        for Champion, up to 7,000 for the final class.
      </p>
      <p>
        That final class awakens up to 18 times and is renamed as it does: Blast, then Tera from
        awakening 6, Seed from 12 and Nova at 18. Each awakening raises its level cap by 50, from 200
        to 1,100, and multiplies its effect (×3.357 at awakening 6, ×24.286 at 18). Seed unlocks the
        Memory Tree and Nova unlocks the Constellation of Light, which adds up to 600 more class
        levels.
      </p>

      <h2>Memory Tree and Constellation in brief</h2>
      <p>
        The Memory Tree has 20 main nodes and 230 sub-node levels. Fully completed, it adds +3,300%
        Extra ATK and +780% Extra HP, plus +300% in each of the Breakthrough multipliers for ATK and
        HP. Because Breakthrough is a separate group, those +300% lines are worth more than they
        look.
      </p>
      <p>
        The Constellation of Light has 12 signs and 148 star slots. Placing a star gives its energy,
        five times as much if the star matches the slot’s element and size. A completed sign turns
        its energy into element damage amplification and a Breakthrough promotion bonus. With every
        sign filled with matching stars, the promotion bonus reaches about +1,227%.
      </p>

      <p>
        To see these numbers for your own account, enter them in the Char tab of the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link>. Next up:{" "}
        <Link href="/guides/skills">how skills scale</Link>.
      </p>
    </GuideArticle>
  );
}
