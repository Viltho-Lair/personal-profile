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
        account once, see every system added up, play your promotion fights before you try them,
        and get a plan for what to upgrade next. This guide walks through it in the order most
        players use it.
      </p>

      <h2>Before you start: where your data lives</h2>
      <p>
        There’s no account and nothing to sign in to. Everything you enter is saved in your
        browser’s local storage the moment you change it, so closing the tab loses nothing. The
        flip side is that your profile lives in that one browser: a different device or a private
        window starts empty. To move it, use <strong>Export JSON</strong> in the Settings panel and{" "}
        <strong>Import JSON</strong> on the other browser. <strong>Reset profile</strong> wipes it
        and starts over.
      </p>
      <p>
        You don’t need to fill in everything. Every system starts at zero, so the numbers are
        correct for what you’ve entered and simply lower for what you haven’t. Start with the
        systems that matter most at your stage of the game and add the rest over time.
      </p>

      <h2>The layout</h2>
      <p>
        Six tabs sit along the bottom of the screen: <strong>Char</strong>, <strong>Skill</strong>,{" "}
        <strong>Equips</strong>, <strong>Companion</strong>, <strong>Analysis</strong> (the chart
        icon) and <strong>Summon</strong> (the market icon). The <strong>Settings</strong> panel
        stays on the side whichever tab is open:
      </p>
      <ul>
        <li>
          <strong>Slayer level</strong> sets your Growth skill points, when Training Diary levels
          unlock, and how strong Latent Power becomes.
        </li>
        <li>
          <strong>Highest stage reached</strong> is what the stages analysis compares your fight
          with.
        </li>
        <li>
          <strong>Forest of Circulation level</strong> shows your Fountain of Circulation grade:
          one grade for every 30 levels, so level 240 is grade 9.
        </li>
        <li>
          <strong>Abbreviate numbers</strong> writes every number the game’s way, a letter for each
          thousand: 1,000 is 1.00A and 1,000,000 is 1.00B.
        </li>
        <li>
          <strong>Event buffs</strong>: Gold Acquisition, Exp Acquisition, Character Attack,
          Character Health, Normal Monster Damage and Boss Monster Damage, in percent as the event
          shows them. Each multiplies the stat it names on its own, so the Stats Summary and every
          fight take them in; leave them at 0 when no event is on.
        </li>
      </ul>

      <h2>Char tab</h2>
      <p>The Char tab covers the systems that belong to the slayer directly.</p>
      <ul>
        <li>
          <strong>Enhance</strong>: your level for each enhance stat, plus your Growing Knowledge
          and Superhuman grades, which set the Death Strike cap.
        </li>
        <li>
          <strong>Growth</strong>: skill points across STR, HP, VIT, CRI, LUK, ACC and DODGE, with
          Training Diary and Latent Power raising the caps and the value of each level.
        </li>
        <li>
          <strong>Promotion</strong>: your current promotion, the classes you own and their levels,
          the seven Slayer Promotion Ability rows, the Memory Tree and the Constellation of Light.
        </li>
        <li>
          <strong>Appearance</strong>: the clothing and guild outfits you own. Sweatsuits matter
          more than the rest because they multiply promotion ability rows.
        </li>
      </ul>
      <p>
        The numbers behind these systems are in{" "}
        <Link href="/guides/character-progression">Enhance, Growth, Promotion and Classes</Link>.
      </p>

      <h2>Skill tab</h2>
      <p>
        Click any skill to open its details: level, power at that level, mana cost, cooldown and
        its Refinement lines. <strong>Max skills</strong> treats every skill as maxed, which is a
        quick way to see your ceiling. The tab also holds your five skill presets, Skill Stones,
        Familiars, Skill Proficiency, Skill Mastery, the Immortal skills and the Seasonal skills.
        See the <Link href="/guides/skills">skills guide</Link>.
      </p>

      <h2>Equips tab</h2>
      <p>
        Weapons and accessories are laid out by tier and grade: mark each one owned, its level and
        which is equipped, and set awakening for the whole category. Relics and the Sealed Shrine,
        spirits with their presets and the Fountain of Circulation effects, soul weapons with their
        engraving gems, and the Black Orb each have their own section. In a spirit preset the first
        slot is the <strong>partner</strong>, highlighted in amber, because its skill effect is 10%
        stronger. The <Link href="/guides/equipment">equipment guide</Link> covers how each one
        scales.
      </p>

      <h2>Companion tab</h2>
      <p>
        Set each companion’s advancement, level their passives and record their promotion rolls.
        Every passive shows its current effect and what the next level and maxing it cost. Beasts
        have their own section: owned beasts, their awaken level and affection. See{" "}
        <Link href="/guides/companions-and-beasts">companions and beasts</Link>.
      </p>

      <h2>Analysis tab</h2>
      <p>
        Analysis puts the fight next to the <strong>Stats Summary</strong> (Attack, HP, crit,
        death strike, mana, accuracy, dodge, gold, EXP, boss and normal monster damage, and extra
        damage for each element) and your{" "}
        <strong>Presets</strong>.
      </p>
      <ul>
        <li>
          <strong>Presets</strong> has five loadouts. Each saves which skill, spirit, skill stone,
          beast, familiar and promotion ability preset is on, so one tap switches your whole setup.{" "}
          <strong>Include Skills</strong> adds the skill preset’s buffs to the Stats Summary.
        </li>
        <li>
          <strong>Pick the enemy</strong> with the checkboxes. <strong>Boss monster</strong> fights
          the chosen promotion’s boss for 75 seconds. <strong>Normal monster</strong> fights one
          monster of that promotion’s stage and ends when it falls. With neither ticked, the fight
          runs through the <strong>stages</strong>, telling you how far your presets reach.{" "}
          <strong>Stage farming</strong> walks through a stage’s waves until the box breaks.{" "}
          <strong>Element restricted</strong> sets the enemy’s element.
        </li>
        <li>
          <strong>Render</strong> plays the fight in real time. <strong>Analysis</strong> shows it as
          damage over time against the enemy’s HP, with an optional log scale. The{" "}
          <strong>Render</strong> view shows the battle itself. Both show the same fight, and it
          resets only when you render again or reload.
        </li>
        <li>
          <strong>Better Weapon, Better Accessories and Better Class</strong> cards show on the
          right of the render when you own something stronger than what&apos;s equipped. Tapping
          Equip equips it and the cards below move up. Equipping or unequipping anything while the
          fight plays changes it from that moment on. The life you have stays where it is and only
          the pool moves, so a bigger pool leaves that much more life missing, which is what Rage
          reads: dropping your HP gear early for Rage and putting it back plays out as in the game.
          Right of the familiar, <strong>Lowest weapon</strong> and <strong>Lowest class</strong>{" "}
          drop you to the weakest you own in one tap, and the cards put the best back.
        </li>
        <li>
          <strong>Summon</strong>, the market tab at the end of the bar, draws weapons or
          accessories the way the game does. Set your summon level, how many you have summoned at
          that level and your light shards, then summon 11 or 33 at a time, or press{" "}
          <strong>Auto</strong> to keep summoning and <strong>Pause</strong> or <strong>Stop</strong>{" "}
          when you have seen enough. Each summon rolls a rarity by that level&apos;s chances and a
          grade inside it (Grade 4 40%, Grade 3 30%, Grade 2 20%, Grade 1 10%). Summons count toward
          the level, and passing a milestone hands over Ellie&apos;s Summon Gift Box: Mythic Grade 1
          at levels 5 and 6, two at 7, three half way through 7 and four at 8. A level you start at
          counts as already collected. Summoning costs no light shards, and the panel keeps a running
          count of the diamonds it has spent: 500 for 11, 1,500 for 33. Your summon level, progress
          and shards are saved with your profile.
        </li>
        <li>
          <strong>Awakening from the panel</strong>: <strong>Awaken +1★</strong> spends the Mythic
          Grade 1 in your pile, and the shards where a star needs them, to take the weapon or
          accessory one star; <strong>Awaken to N★</strong> goes as far as what you have summoned
          allows. This is the estimate&apos;s own gear — your profile&apos;s awakening and equipment
          are left alone — so you can summon, merge, break and awaken to see what a star really
          costs. <strong>Clear</strong> puts it all back.
        </li>
        <li>
          <strong>Merging</strong> runs all the way up: five of a grade make one of the next, from
          Common Grade 4 to Mythic Grade 1. Nothing merges on its own — press{" "}
          <strong>Merge 5 → 1</strong> and your pile merges as far as it goes, laid out like the
          Equipment tab, four grades to a row from Common Grade 4. The diamond estimate assumes you
          will merge, so a summon counts for what it becomes rather than only the Mythic Grade 1 it
          draws. <strong>Break 1</strong> breaks a single Mythic Grade 1 for light shards, as the
          game has you do them one at a time, and says what that break gave alongside your average
          and the expected 1,670.
        </li>
        <li>
          <strong>Awakening</strong> is what the Mythic Grade 1 gear is for. Each star of your
          Immortal weapon or accessory takes one, except the three that change its look (6★, 12★ and
          18★), which take four. The last stars take light shards, which come from breaking Mythic
          Grade 1 gear: 10,000 for 24★, one Mythic Grade 1 and 1,000 shards for each of 25★ to 29★,
          and 10,000 for 30★. All the way from 0★ to 30★ is 37 Mythic Grade 1 and 25,000 shards.
          The Summon view shows how far what you have summoned takes your awakening.
        </li>
        <li>
          <strong>Diamonds to reach a star</strong>: pick the awakening you want and the Summon view
          works out roughly what it costs. Breaking a Mythic Grade 1 gives 1,280 shards a quarter of
          the time, 1,600 half, 2,080 a fifth, 2,560 4% and 3,200 1% — 1,670 on average — so the
          shards a star needs become Mythic Grade 1 gear to break. Summoning costs 500 diamonds for
          11 and 1,500 for 33, the same 45.45 a summon, and the Mythic Grade 1 chance is the
          level&apos;s Mythic chance times 10% for Grade 1 (at summon level 10 that is one in 6,667
          summons). The estimate follows your summon level as it rises and counts the gift boxes on
          the way.
        </li>
        <li>
          <strong>Skills below the fight</strong> switch between auto and manual when you tap them
          before rendering. Manual skills light up when ready and wait for you to tap them, so you
          can play your real rotation, such as pressing Rave as Wrath of Gods starts. Which skills
          are on auto is saved with the skill preset.
        </li>
      </ul>
      <p>
        The <Link href="/guides/promotion-fights">promotion fights guide</Link> explains what the
        fight models and how to read its result.
      </p>

      <h2>Upgrade plans</h2>
      <p>When a fight ends short, a plan appears under the result:</p>
      <ul>
        <li>
          <strong>The gap</strong>: how many times your own damage has to grow to win. Your own
          damage leaves out spirit skills like Breath of Fire, which take a share of the enemy’s HP
          whatever your stats are.
        </li>
        <li>
          <strong>Checks</strong> for data that looks missing, like fewer than six familiars, no
          refinement lines on your attack skills, or no beast picked.
        </li>
        <li>
          <strong>The plan</strong>: the upgrades that get you there, each with its picture, levels
          and cost, then what the fight deals with all of them.
        </li>
      </ul>

      <h2>A practical workflow</h2>
      <ol>
        <li>Enter slayer level, promotion, equipped weapon and accessory, and enhance levels first. They move ATK and HP the most.</li>
        <li>Add spirits, classes, companions, familiars and your soul weapon. Your Stats Summary should now be close to the game’s.</li>
        <li>Build the skill preset you actually use, set the skills you press by hand to manual, and render your next promotion.</li>
        <li>Enter any event buffs that are on under Settings, then follow the upgrade plan, steepest first.</li>
        <li>Render again after upgrading in the game to see how close you are.</li>
      </ol>

      <h2>How accurate is it?</h2>
      <p>
        Formulas come from the community’s Master Optimizer workbook, and several are checked against
        values seen in the game. Treat the results as close estimates, not guarantees: the game can
        change between updates, and promotion boss HP is estimated from the recommended stage. If
        something doesn’t match, the <Link href="/contact">contact page</Link> explains how to report
        it.
      </p>
    </GuideArticle>
  );
}
