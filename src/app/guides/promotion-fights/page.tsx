import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("promotion-fights");

export default function Guide() {
  return (
    <GuideArticle slug="promotion-fights">
      <p>
        A promotion is the single largest power jump in Slayer Legends, and failing the fight costs
        time. The <Link href="/slayer-legends-analyzer">analyzer</Link> plays the fight with your
        build before you try it, and when you fall short it plans the upgrades that close the gap.
        This guide explains what the fight models, how to read its result, and how the plan is
        built.
      </p>

      <h2>Choosing the enemy</h2>
      <p>On the Analysis tab, the checkboxes above the chart pick what you fight:</p>
      <ul>
        <li>
          <strong>Boss monster</strong>: the chosen promotion’s boss, for 75 seconds, about as long
          as the game gives you.
        </li>
        <li>
          <strong>Normal monster</strong>: one monster from that promotion’s stage, for 60 seconds.
          The fight ends as soon as it falls.
        </li>
        <li>
          <strong>Neither ticked</strong>: the stages analysis, a 60-second fight against stage
          bosses. It shows the highest stage your presets clear and compares it with the highest
          stage you entered in Settings.
        </li>
        <li>
          <strong>Stage farming</strong>: a stage’s ten waves and its box, walked through until the
          box breaks, with clears an hour.
        </li>
        <li>
          <strong>Element restricted</strong>: the enemy takes ×2 from the element that beats it and
          ×0.7 from the one it beats.
        </li>
      </ul>

      <h2>Estimating the boss</h2>
      <p>
        The game doesn’t publish promotion boss stats, so the analyzer uses each promotion’s
        recommended stage. The boss’s HP is the stage boss HP at that stage, with a range of stages
        around it, because the recommendation is a guide rather than an exact match:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Promotion</th>
              <th>Recommended stage</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Bronze</td><td>10</td><td>±1</td></tr>
            <tr><td>Iron</td><td>50</td><td>±5</td></tr>
            <tr><td>Gold</td><td>100</td><td>±5</td></tr>
            <tr><td>Mithril</td><td>145</td><td>±10</td></tr>
            <tr><td>Eisenhart</td><td>1,400</td><td>±10</td></tr>
            <tr><td>Diadust</td><td>1,490</td><td>±10</td></tr>
            <tr><td>Aurorite</td><td>1,790</td><td>±10</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Boss HP climbs astronomically: about 10,780 at stage 10, 444 million at stage 50 and 6.7
        trillion at stage 100. Near the later promotions it grows about 6% a stage, so Diadust has
        roughly 52 times the HP of the stage 1,425 boss.
      </p>

      <h2>How a hit is calculated</h2>
      <p>
        Instead of rolling random crits, the fight uses the <strong>expected</strong> damage of a
        hit, so it plays out the same way every time. With crit chance <em>c</em> and death strike
        chance <em>d</em>, a hit averages four cases: neither, crit only, death strike only, and
        both. For example, 50% crit chance with ×3 crit damage makes an average hit worth twice your
        ATK. With 100% crit at ×3 and 100% death strike at ×2, every hit is worth six times your ATK.
      </p>
      <p>
        A skill hit multiplies that by the skill’s power (with its Skill Mastery multiplier), and
        then by each of these on its own:
      </p>
      <ul>
        <li>Refinement DMG Increase</li>
        <li>the Mana Altar with the Statue of Demon</li>
        <li>Luna’s Wisdom of War</li>
        <li>element damage, with Heart of Fire’s bonus for Fire skills</li>
        <li>element amplification</li>
        <li>Loar’s Wilderness Roar against bosses (or Mum’s Reign against normal monsters)</li>
        <li>Black Orb boss or monster damage, which also multiplies basic attacks</li>
      </ul>
      <p>
        The <Link href="/guides/skills">skills guide</Link> explains skill power and Mastery.
      </p>

      <h2>The timeline</h2>
      <p>The fight advances in steps of 0.02 seconds, following these rules:</p>
      <ul>
        <li>
          <strong>Basic attacks</strong> land once a second, faster with the Bracelet of Speed and
          attack-speed buffs.
        </li>
        <li>
          <strong>Every skill you can cast starts ready.</strong> After that, cooldown skills wait
          their cooldown and strike skills count your basic attacks.
        </li>
        <li>
          <strong>Ready skills cast without waiting for each other.</strong> Each cast pauses your
          basic attacks for its 0.3-second animation.
        </li>
        <li>
          <strong>Mana is spent in the order skills became ready.</strong> If a skill can’t afford
          its cost, the skills queued behind it wait too, so cheap skills can’t keep an expensive one
          from ever casting.
        </li>
        <li>
          <strong>HP and mana recover each second</strong> by your HP Recovery and Mana Recovery.
        </li>
        <li>
          <strong>Buffs</strong> last their duration from when they take effect. Casting one again
          refreshes the timer rather than stacking.
        </li>
      </ul>

      <h2>Skills with special rules</h2>
      <ul>
        <li>
          <strong>Wrath of Gods</strong> first goes off 20 seconds in, then every 30 seconds.
          Meditation and cooldown stones only shorten the later cooldowns, not the first 20
          seconds.
        </li>
        <li>
          <strong>Rave</strong> stores all the damage dealt over 5 seconds while the fight carries
          on: skills, basic attacks and spirit skills like Breath of Fire. Press it again and a pillar
          deals its share of that damage (110% at level 5) over 2 seconds, during which everything
          else stops: the battle timer, cooldowns, buffs and attacks. Its cooldown starts with the
          release.
        </li>
        <li>
          <strong>Meditation</strong> charges every skill that goes on a cooldown or a strike count,
          stacking buffs like Burning Sword, Curved Blade, Earth’s Will and Speed Sword included
          until their stacks are complete. Skills that go on a condition aren’t charged. The spirit
          skill <strong>Wind Force</strong> charges the same skills.
        </li>
        <li>
          <strong>Demon Hunt</strong> plays its hits in stopped time, so cooldowns, buffs and
          recovery pause while it runs.
        </li>
        <li>
          <strong>Rage</strong> adds ATK for every 1% of HP you’re missing, stops HP recovery and
          drains 0.5% of your max HP a second while it lasts. It ends early rather than taking your
          HP to zero.
        </li>
        <li>
          <strong>Warrior Burn</strong> spends half your current HP for ATK.{" "}
          <strong>Lightning Body</strong> also costs half your current HP, for attack speed.{" "}
          <strong>Breath of Waves</strong> heals half your current HP and speeds up cooldowns.
          Starting from 1,000 HP, Warrior Burn takes you to 500 and Breath of Waves back up to 750.
        </li>
        <li>
          <strong>Sea Judgment</strong> triggers after every three Water casts and gains a hit each
          time, up to seven. <strong>Blast Wind</strong> adds Wind skill damage for every five Wind
          casts, stacking.
        </li>
      </ul>
      <p>
        Mantra isn’t cast because its bonus is already part of your ATK and HP. Skills whose
        effects can’t be expressed as damage or a buff are listed under the result as not modelled.
      </p>

      <h2>Familiars, beasts and spirits</h2>
      <ul>
        <li>
          <strong>The familiar</strong> combines your attribute, battle and weapon familiars into one
          skill, shown as a tile next to your skills. It goes once a battle and hits its number of
          times for its share of your ATK as the attribute familiar’s element; Pe repeats the attack
          instead, a second apart. Each familiar’s special only works at 11 stars: Ku allows a second
          use 20 seconds later, Pe repeats 10% faster, and so on. You can leave it on auto or press it
          yourself.
        </li>
        <li>
          <strong>The equipped beast’s skill</strong> runs on its own, once a battle. Wolves go after
          strike skills, boars after knockbacks (a 50% chance every 10 seconds), and dracos once a
          stacking skill maxes out. Draco of Light waits for all of them, then raises boss damage
          for 60 seconds.
        </li>
        <li>
          <strong>Spirit skills</strong> of your spirit preset count in the fight. Breath of Fire
          takes a share of the enemy’s remaining HP every 12 seconds (10% at enhance 5), and Last
          Fight multiplies your damage in the last 5 seconds. Wilderness Roar raises skill damage to
          bosses. Judge’s Torpedo and Thief Wind only work on normal monsters. The partner, in the
          preset’s first slot, has its skill effect 10% stronger.
        </li>
      </ul>

      <h2>Pressing skills yourself</h2>
      <p>
        Before rendering, tap a skill to switch it between auto and manual. Auto skills cast as soon
        as they’re ready; manual skills light up when ready and wait for your tap. That lets you
        test the rotation you actually play. For example, you might press Rave as Wrath of Gods
        starts and release it after 5 seconds, or keep the familiar for the end of the fight. Which
        skills are manual is saved with the skill preset.
      </p>

      <h2>Reading the result</h2>
      <p>After a boss fight, your total damage is compared with the boss HP range:</p>
      <ul>
        <li><strong>High chance of success</strong>: you’d clear even the highest stage in the range.</li>
        <li><strong>Good chance of success</strong>: you beat the recommended stage’s boss.</li>
        <li><strong>Some chance</strong>: enough for the lowest stage in the range, short of the recommended one.</li>
        <li><strong>Not yet</strong>: you’d need about N times more damage.</li>
      </ul>
      <p>
        A normal monster fight tells you how fast it went down and how many that is a minute. The
        stages analysis tells you the stage you’d reach and how far that is from your highest.{" "}
        <strong>Damage by source</strong> breaks the total down by skill, spirit skill and basic
        attacks.
      </p>

      <h2>How the upgrade plan is built</h2>
      <p>
        When a fight falls short, the analyzer plans how to win it. First it finds the gap: how
        many times <strong>your own damage</strong> has to grow. Your own damage leaves out spirit
        skills and Rave’s copy of them, because Breath of Fire takes a share of the enemy’s HP
        whatever your stats are. Planned fights press Rave at whichever timing deals the most, and
        the plan shows those times.
      </p>
      <p>
        Then it builds the plan. Every piece of content that isn’t maxed is a curve from where it
        starts to its max: a spirit’s levels, an awakening’s tiers, a familiar’s stars, a statue’s
        levels, a skill’s levels, an enhance. Step by step, the plan moves the curve whose next
        stretch (5% of it) lifts your damage the most, until the enemy falls. That’s the steepest
        slope from where you are, not the biggest number at the end.
      </p>
      <p>
        Upgrades that cost resources are held to their price. A stretch counts as big as its price
        measured against what you own when that’s more, or against what you’ve already spent on
        these upgrades if you haven’t entered what you own. The plan spends at most three times
        that. A spirit whose next levels cost more crystals than you’ve ever earned loses to cheaper
        upgrades that add less. Each card shows its levels and cost, and the plan ends with what the
        fight deals after all of it.
      </p>
      <p>
        That’s the practical lesson of{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>: stats multiply
        across groups, so several medium upgrades in different places beat one enormous one.
      </p>

      <h2>Limits worth knowing</h2>
      <p>
        Boss HP is an estimate from stage data, not a published promotion table, so treat “Some
        chance” as a real risk. Upgrades the workbook doesn’t price, like familiar stars, statues
        and skill levels, have no price in the plan. The model is checked against real players’
        stats screens, but the game can change between updates.
      </p>
    </GuideArticle>
  );
}
