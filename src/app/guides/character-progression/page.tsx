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
        lines, some jump at thresholds, and one roughly doubles every step late on. Knowing the
        shape of each helps you spot the cheap jumps and avoid overpaying for small ones.
      </p>
      <p>
        In the analyzer, all of this lives in the Char tab, split into Enhance, Growth, Promotion
        and Appearance. Your slayer level is set in the Settings panel, because Growth and Latent
        Power both depend on it.
      </p>

      <h2>Enhance: watch the thresholds</h2>
      <p>
        Enhance ATK, HP and HP Recovery go up to level 2,200,000. Each gives its level multiplied
        by a tier factor, and the factor rises at powers of ten:
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
        HP is multiplied by a further 10. The factor applies to every level, not just the new ones,
        so each threshold is a big jump: Enhance ATK 99 gives 99, but level 100 gives 200. Level
        5,000 gives 15,000, and level 1,000,000 gives 6,000,000. When you’re just short of a
        threshold, finishing it is worth checking before anything else.
      </p>
      <p>
        The other enhance stats are linear. CRIT DMG adds 1% per level up to level 10,000. CRIT %
        adds 0.1% per level up to 1,000, which is 100% crit chance. The two death strike stats stay
        locked at level 1 until CRIT % reaches 1,000. After that, DEATH STRIKE % rises by 0.1% per
        level to 1,000, and DEATH STRIKE damage by 1% per level up to a cap set by your Growing
        Knowledge and Superhuman grades.
      </p>

      <h3>Enhance gold costs</h3>
      <p>
        Gold per level climbs steeply. For ATK, HP and HP Recovery a level costs about J × L⁴ ÷
        100,000,000 plus two smaller terms, where L is the level and J is 1 below level 70,000, then
        rises in 5,000-level steps to about 230 from level 200,000. CRIT DMG and Death Strike chance
        also grow with the fourth power of the level, and Death Strike damage with the fifth. The
        upgrade plans in the Analysis tab use these costs to price ATK, CRIT and Death Strike
        levels.
      </p>

      <h3>Growing Knowledge and Superhuman</h3>
      <p>
        Growing Knowledge has 90 grades. Each adds flat base ATK, the same amount of HP Recovery, and
        ten times that as HP. Grade 1 gives 15,000 ATK, Grade 10 about 491,000, Grade 50 about 22.6
        million and Grade 90 about 201 million. Because it sits next to Enhance and Growth in the
        base group, it’s multiplied by almost everything else you own.
      </p>
      <p>
        Growing Knowledge also sets the DEATH STRIKE cap: 4,000 without it, 4,050 at Grade 1 and
        208,750 at Grade 90. Superhuman adds more levels on top, from +30 at Grade 1 to +122,850 at
        Grade 90. At Growing Knowledge Grade 1 and Superhuman Grade 2 the cap is 4,050 + 90 =
        4,140.
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
        Past slayer level 250, Latent Power increases what each STR, HP, VIT, CRI and LUK level is
        worth. You enter five rolled slots per stat, and their sum scales with how far past level
        250 you are. For STR and VIT the per-level value becomes base + (levels past 250) × sum ÷
        200. A STR base of 5, at slayer level 450 with a latent sum of 20, becomes 5 + 200 × 20 ÷ 200
        = <strong>25 per level</strong>, five times the base.
      </p>
      <p>
        HP, CRI and LUK multiply their base instead: by 1 + (levels past 250) ÷ 1,000 × sum for HP,
        ÷ 10,000 for CRI and ÷ 20,000 for LUK, so CRI and LUK grow much more slowly. ACC and DODGE
        have no Latent Power.
      </p>
      <p>
        Awakened Latent Power multiplies the result again. It has grades 1 to 14 with 0 to 5 stars
        each: every star adds about 2% (0.8% for CRI), and each new grade adds a bigger step. At Grade
        14 with 5 stars the multiplier is about ×6.31, or ×2.12 for CRI. The Statue of Dragon in the
        Sealed Shrine, found in the Equips tab next to Relics, amplifies the latent sum itself.
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
        From Demon Metal onward, every promotion roughly doubles your ATK and HP. That’s why a
        promotion is usually worth more than any single upgrade you could buy instead. The{" "}
        <Link href="/guides/promotion-fights">promotion fight simulator</Link> in the Analysis tab
        shows whether you can win the next one.
      </p>

      <h3>Slayer Promotion Ability</h3>
      <p>
        Promotions also open seven ability rows: row 1 opens with your first promotion, row 2 with
        your second, and all seven are open from Orichalcum. Each row rolls one option: Extra ATK
        (3–40%), CRIT Dmg, Extra HP or Extra HP Recovery (6–70%), Extra Mana or Mana Recovery
        (3–30%), Monster Gold (3–40%), Extra EXP (1–15%), Accuracy or Dodge (3–30) or CC Resist
        (3–40).
      </p>
      <p>
        The page effect is one of Extra ATK, Extra HP, Extra EXP or Monster Gold. It grows with each
        promotion up to Orichalcum, where Extra ATK reaches +280%, Extra HP +490% and Extra EXP
        +105%. In the analyzer, picking a page effect also sets every row to that stat at its top
        roll, and you can change each row afterwards. You can keep several ability presets and
        switch between them.
      </p>
      <p>
        Sweatsuits from Appearance multiply a specific row by 2, 3 or 4, and the best one you own
        for each row counts. Rows 1 to 5 go up to ×4; rows 6 and 7 top out at ×3. A 40% ATK roll on
        a row with a ×4 suit is worth 160%, so owning the right suit can matter more than
        rerolling.
      </p>

      <h2>Classes</h2>
      <p>
        A class works like gear: its equip effect is its multiplier × a level factor, and every owned
        class also gives 30% of its effect as an owned bonus. Only the equipped class gives the full
        effect, and the class total is its own multiplier group. Multipliers run from 1 for Trainee
        through 10 for Warrior, 150 for Gladiator and 1,000 for Champion, up to 7,000 for the final
        class. The level factor is 1 at level 0, about 11 at level 200 and about 83 at level
        1,700.
      </p>
      <p>
        The final class awakens up to 18 times with Awakened Blast and is renamed as it does: Blast,
        then Tera from awakening 6, Seed from 12 and Nova at 18. Each awakening multiplies its effect
        (×3.357 at awakening 6, ×24.286 at 18).
      </p>
      <p>
        The level cap applies to every class: 200, plus 50 per Awakened Blast (1,100 at awakening
        18), plus the Constellation of Light’s class level bonus of up to 600, for 1,700 at most. In
        the upgrade plans, class levels are priced in cubes.
      </p>

      <h2>Memory Tree</h2>
      <p>
        The Memory Tree opens once you own the final class at Seed (awakening 12). It has 20 main
        nodes and 230 sub-node levels. A sub node opens at a set tree level, after its main node’s
        prerequisites are complete and the nodes it needs are maxed.
      </p>
      <p>
        Levels spent in sub nodes raise the tree level, up to 25 at 221 sub-node levels, and its
        breakthrough grade, up to 5. The tree level adds up to +3,300% Extra ATK, +780% Extra HP and
        +470% HP Recovery. The grade adds up to +300% to each of the ATK and HP multipliers, which
        sit in a separate group with the Constellation’s promotion bonus, so those lines are worth
        more than they look. The sub nodes themselves add gold, EXP, cube and other buffs for
        specific modes, and some give feathers.
      </p>

      <h2>Constellation of Light</h2>
      <p>
        The Constellation of Light opens once you own the final class at Nova (awakening 18). It
        has 12 signs and 148 star slots. Placing stars raises the constellation level, up to 12 at
        128 stars, and each level opens one more sign. At level 12 it gives +3,300% Extra ATK,
        +1,980% Extra HP, +1,320% Extra HP Recovery, 22% shorter crafting time and +600 class
        levels.
      </p>
      <p>
        A placed star gives its energy, five times as much if the star matches the slot’s element
        and size. Once every slot in a sign has a star, the sign gives Amplify element DMG equal to
        its energy ÷ 100 and a promotion ATK/HP bonus equal to energy ÷ 10, and raises its stars’
        own buffs by that same percentage. With every sign filled with matching stars, the promotion
        bonus reaches +1,227%.
      </p>

      <p>
        To see these numbers for your own account, enter them in the Char tab of the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link>, and see{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link> for how the
        groups combine. Next up: <Link href="/guides/skills">how skills scale</Link>.
      </p>
    </GuideArticle>
  );
}
