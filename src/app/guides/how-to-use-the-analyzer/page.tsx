import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("how-to-use-the-analyzer");

export default function Guide() {
  return (
    <GuideArticle slug="how-to-use-the-analyzer">
      <p>
        Slayer Legends has dozens of systems that feed the same handful of stats, and the game
        rarely shows you how they combine. The{" "}
        <Link href="/slayer-legends-analyzer">Slayer Legends Analyzer</Link> lets you enter your
        account once and see the result of every system added up, then test changes before you
        spend resources on them. This guide walks through it in the order most players use it.
      </p>

      <h2>Before you start: where your data lives</h2>
      <p>
        There’s no account and nothing to sign in to. Everything you enter is saved in your
        browser’s local storage the moment you change it, so closing the tab loses nothing. The
        flip side is that your profile lives on that one browser: a different device or a private
        window starts empty. The <strong>Reset profile</strong> button in the top-right panel wipes
        it and starts over.
      </p>
      <p>
        You don’t need to fill in everything. Every system starts at zero, so the numbers are
        correct for what you’ve entered and simply lower for what you haven’t. Start with the
        systems that matter most for your stage of the game and add the rest over time.
      </p>

      <h2>The overview: chart, summary and slayer level</h2>
      <p>The top half of the screen stays visible whichever tab you open below it.</p>
      <ul>
        <li>
          <strong>Slayer level and highest stage reached</strong> sit in the top-right corner.
          Slayer level matters more than it looks: it sets your Growth skill points, when Training
          Diary levels unlock, and how strong Latent Power becomes.
        </li>
        <li>
          <strong>Stats Summary</strong> lists Attack, HP, HP Recovery, crit and death strike
          chances and damage, Mana and Mana Recovery, Accuracy, Dodge, CC Resist, Extra Gold, Extra
          EXP and extra damage for each of the four elements. It also holds the preset pickers for
          skills, spirits, skill stones, beasts, familiars and the Slayer Promotion Ability, so you
          can switch loadouts and watch the totals change.
        </li>
        <li>
          <strong>The promotion chart</strong> estimates whether you can beat the boss of a
          promotion. Pick a target, press <strong>Render</strong>, and a 60-second fight plays out
          with your skills casting in real time. The{" "}
          <Link href="/guides/promotion-fights">promotion fights guide</Link> explains what it
          models.
        </li>
      </ul>

      <h2>Char tab</h2>
      <p>The Char tab covers the systems that belong to the slayer directly.</p>
      <ul>
        <li>
          <strong>Enhance</strong>: enter your level for each enhance stat, plus your Growing
          Knowledge and Superhuman grades, which set the Death Strike cap.
        </li>
        <li>
          <strong>Growth</strong>: spend skill points across STR, HP, VIT, CRI, LUK, ACC and
          DODGE. The Training Diary and Latent Power sub-tabs raise the caps and per-level values.
        </li>
        <li>
          <strong>Promotion</strong>: choose your current promotion, record which classes you own
          and their levels, and fill in the seven Slayer Promotion Ability rows. Memory Tree and
          Constellation of Light unlock here once your Blast class awakens far enough.
        </li>
        <li>
          <strong>Appearance</strong>: tick the clothing and guild outfits you own. Sweatsuits
          matter more than the rest because they multiply promotion ability rows.
        </li>
      </ul>
      <p>
        The numbers behind these systems are in{" "}
        <Link href="/guides/character-progression">Enhance, Growth, Promotion and Classes</Link>.
      </p>

      <h2>Skill tab</h2>
      <p>
        Click any skill tile to open its details: level, power at that level, mana cost, cooldown,
        and its Refinement lines. The <strong>Max skills</strong> toggle treats every skill as
        maxed, which is a quick way to see your ceiling. Below the grid you can build five skill
        presets of ten slots each and set up skill stones. The Familiars, Skill Proficiency and
        Skill Mastery sections live here as well. See the{" "}
        <Link href="/guides/skills">skills guide</Link>.
      </p>

      <h2>Equips tab</h2>
      <p>
        Weapons and accessories are laid out by tier and grade. For each you mark whether it’s
        owned, its level, and which one is equipped, and set awakening for the whole category. The
        detail card shows the equip and owned effect at that level. Relics, the Sealed Shrine,
        spirits (with presets and the Fountain of Circulation), soul weapons with their gems, and
        the Black Orb are also here. The{" "}
        <Link href="/guides/equipment">equipment guide</Link> covers how each one scales.
      </p>

      <h2>Companion tab</h2>
      <p>
        Set each companion’s advancement, level their nine passives, and record promotion rolls.
        Every passive shows its current effect and the cost of the next level and of maxing it,
        which makes it easy to compare where stones and emeralds do the most. Beasts sit alongside:
        mark owned beasts, their awaken level and affection, and which one is mounted. See{" "}
        <Link href="/guides/companions-and-beasts">companions and beasts</Link>.
      </p>

      <h2>A practical workflow</h2>
      <ol>
        <li>Enter slayer level, promotion, equipped weapon and accessory, and enhance levels first. They move ATK and HP the most.</li>
        <li>Add spirits, classes and companions. Your Stats Summary will now be close to the game’s.</li>
        <li>Build the skill preset you actually use and render the next promotion fight.</li>
        <li>If the verdict says you’re not ready, read the suggestions. They show how far each stat would need to rise on its own.</li>
        <li>Compare those suggestions with what each upgrade costs in the Equips and Companion tabs, and spend where the gain per resource is largest.</li>
      </ol>

      <h2>How accurate is it?</h2>
      <p>
        Formulas come from community-maintained game data, and several are checked against values
        seen in the game. Treat the results as close estimates, not guarantees: the game can change
        between updates, a few systems are shown without being counted, and promotion boss HP is
        estimated from the recommended stage. If something doesn’t match, the{" "}
        <Link href="/contact">contact page</Link> explains how to report it.
      </p>
    </GuideArticle>
  );
}
