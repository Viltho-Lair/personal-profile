import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("promotion-fights");

export default function Guide() {
  return (
    <GuideArticle slug="promotion-fights">
      <p>
        A promotion is the single largest power jump in Slayer Legends, and failing the fight costs
        time. The <Link href="/slayer-legends-analyzer">analyzer</Link> can play a promotion fight
        with your build before you try it. This guide explains what that simulation models, what
        it doesn’t, and how to read its verdict.
      </p>

      <h2>Estimating the boss</h2>
      <p>
        The game doesn’t publish promotion boss stats, so the analyzer uses each promotion’s
        recommended stage. The boss’s HP is taken as the stage boss HP at that stage, with a range
        of stages around it, because the recommendation is a guide rather than an exact match:
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
            <tr><td>Aurorite</td><td>1,790</td><td>±10</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Boss HP climbs astronomically: about 10,780 at stage 10, 444 million at stage 50 and 6.7
        trillion at stage 100. Every fight lasts 60 seconds, and the question is simply whether your
        total damage in that time reaches the boss’s HP.
      </p>

      <h2>How a hit is calculated</h2>
      <p>
        Instead of rolling random crits, the simulator uses the <strong>expected</strong> damage of
        a hit, which gives the same result every run. With crit chance <em>c</em> and death strike
        chance <em>d</em>, a hit averages four cases: no crit or death strike, crit only, death strike
        only, and both. For example, 50% crit chance with ×3 crit damage makes an average hit worth
        twice your ATK. With 100% crit at ×3 and 100% death strike at ×2, every hit is worth six
        times your ATK.
      </p>
      <p>
        A skill cast multiplies that expected hit by the skill’s power, by one plus its bonuses
        (element damage, Refinement DMG Increase, Heart of Fire, Ignition, the Statue of Demon and
        Luna’s Wisdom of War), by element amplification and by the number of hits. Black Orb boss
        damage multiplies every hit, basic attacks included.
      </p>

      <h2>The timeline</h2>
      <p>The fight advances in steps of 0.02 seconds, following these rules:</p>
      <ul>
        <li>
          <strong>Basic attacks</strong> happen once per second, faster with Bracelet of Speed and
          attack-speed buffs.
        </li>
        <li>
          <strong>Cooldown skills</strong> start the fight ready. <strong>Strike skills</strong>{" "}
          count your basic attacks and fire when the count is reached.
        </li>
        <li>
          <strong>Every ready skill casts at once.</strong> Each cast delays your next basic attack
          by its 0.3-second animation.
        </li>
        <li>
          <strong>Mana is spent in the order skills became ready.</strong> If a skill can’t afford
          its cost, the skills queued behind it wait too, so cheap skills can’t keep an expensive
          one from ever casting.
        </li>
        <li>
          <strong>HP and mana recover each second</strong> by your HP Recovery and Mana Recovery.
        </li>
        <li>
          <strong>Buffs</strong> last their duration from when they take effect. Recasting refreshes
          the timer rather than stacking.
        </li>
      </ul>

      <h2>Skills with special rules</h2>
      <p>Several skills behave differently, and the simulator follows each one:</p>
      <ul>
        <li>
          <strong>Wrath of Gods</strong> starts on cooldown: it first casts 20 seconds in, then every
          30 seconds. Meditation and Cooldown Stones only shorten the later cooldowns, not the first.
        </li>
        <li>
          <strong>Warrior Burn</strong> spends half your current HP for an ATK boost lasting 5
          seconds. <strong>Lightning Body</strong> also costs half your current HP, for attack speed.
        </li>
        <li>
          <strong>Breath of Waves</strong> heals half your current HP, capped at your maximum, and
          speeds up cooldowns for 5 seconds. Starting from 1,000 HP, Warrior Burn takes you to 500
          and Breath of Waves back up to 750.
        </li>
        <li>
          <strong>Rage</strong> adds ATK for every 1% of HP you’re missing, but stops HP recovery
          while it lasts. That pairs naturally with skills that spend HP.
        </li>
        <li>
          <strong>Rave</strong> stores the damage you deal over 5 seconds and releases a share of it
          when used again. <strong>Demon Hunt</strong> plays its hits in stopped time, so cooldowns
          and buffs pause while it runs.
        </li>
        <li>
          <strong>Meditation</strong> instantly charges every other skill’s cooldown and strike
          count.
        </li>
        <li>
          <strong>Sea Judgment</strong> triggers after every three Water casts and gains a hit each
          time, up to seven. <strong>Blast Wind</strong> adds Wind skill damage for every five Wind
          casts, stacking.
        </li>
      </ul>
      <p>
        Mantra isn’t cast in the fight because its bonus is already part of your ATK and HP. A
        mounted wolf’s ATK buff is modelled. Skills whose effects can’t be expressed as damage or a
        simple buff are skipped, and the analyzer lists which ones after each render.
      </p>

      <h2>Manual skills</h2>
      <p>
        Before rendering, you can switch any skill tile between auto and manual. Auto skills cast
        as soon as they’re ready; manual skills wait for you to tap them during the fight. That lets
        you test the timing you actually play with, such as saving Breath of Waves until after
        Warrior Burn.
      </p>

      <h2>Reading the verdict</h2>
      <p>After 60 seconds, the simulator compares your total damage with the boss HP range:</p>
      <ul>
        <li><strong>High chance of success</strong>: you beat the HP of the highest stage in the range.</li>
        <li><strong>Good chance</strong>: you beat the recommended stage’s boss.</li>
        <li><strong>Some chance</strong>: you beat the lowest stage in the range.</li>
        <li><strong>Not yet</strong>: you’d need about N times more damage.</li>
      </ul>

      <h2>Suggestions when you fall short</h2>
      <p>
        If you’re not ready, the analyzer works out how far each lever would need to move on its own
        to close the gap. For levers that scale damage in proportion (Enhance ATK, weapons, classes,
        Extra ATK, spirits and Breakthrough) that’s the damage ratio directly, and Enhance ATK is
        converted to an approximate enhance level. For crit damage, crit chance and death strike,
        which don’t scale in proportion, it re-runs the fight to find the value needed. It shows the
        four smallest changes.
      </p>
      <p>
        It also shows a <strong>spread</strong> figure: the fifth root of the ratio. That’s how much
        five separate ATK groups would each need to grow to close the gap together. A 2× gap needs
        each of five groups to rise by only about 15%. That’s the practical lesson of{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>: spreading
        upgrades across groups beats piling them into one.
      </p>

      <h2>Limits worth knowing</h2>
      <p>
        The boss HP is an estimate from stage data, not a published promotion table, so treat “Some
        chance” as a real risk. Some systems, such as spirit skills and most familiar special
        effects, are shown in the analyzer but not counted in the fight. If you can clear the fight
        comfortably at “Good chance” or better, your odds in the game are strong.
      </p>
    </GuideArticle>
  );
}
