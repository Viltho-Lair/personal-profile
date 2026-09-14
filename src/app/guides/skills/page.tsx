import Link from "next/link";
import { GuideArticle, guideMetadata } from "@/components/guide-article";

export const metadata = guideMetadata("skills");

export default function Guide() {
  return (
    <GuideArticle slug="skills">
      <p>
        Skills do most of the damage in a Slayer Legends fight, and several systems make them
        stronger. Some raise a skill’s power directly, some multiply its damage, some make it cast
        more often. This guide goes through each in turn and shows how they stack. In the analyzer
        they all live in the Skill tab, split into Core, Familiars, Skill Proficiency, Skill
        Mastery, Immortals and Seasonal.
      </p>

      <h2>Skill power and level</h2>
      <p>
        Every skill has a base value and a per-level upgrade value. Its power at a given level is:
      </p>
      <p>
        <code>power = base + upgrade × (level − 1)</code>
      </p>
      <p>
        So Ice Stone, with base 110 and upgrade 11, has 495% power at level 36. Growth is linear:
        each level adds the same amount, so the percentage gain per level shrinks as the skill
        climbs.
      </p>
      <p>
        The game’s skill screen shows that power with your Skill Mastery multiplier already on it,
        and so does the analyzer’s skill window. Flame Slash at level 115 shows 25,110%: that’s
        (1,350 + 135 × 114)% × 1.5 from the Mastery node that also makes it hit twice. A value
        Mastery has changed shows in aqua, along with the hit count and any change to its MP or
        cooldown.
      </p>
      <p>
        Maximum levels differ a lot between skills. Most damage skills go to level 250 (Fire Slash
        reaches 10,360%, Demon Hunt 25,900%). Most buff and passive skills stop at 20: Wrath of Gods
        reaches 975%, Warrior Burn 383% and Lightning Body 364%. Rage at level 18 gives +3.7% ATK
        for every 1% of HP missing. Meditation and Phantom cap at 10, and Mantra and Rave at 5.
      </p>
      <p>
        Ticking <strong>Max skills</strong> counts every skill at its max level. Your typed levels
        come back when you untick it.
      </p>
      <p>
        Skills are either <strong>attack</strong>, <strong>buff</strong> or{" "}
        <strong>passive</strong>. Most go on a cooldown (Hot Blast every 12 seconds, for example) or
        after a number of basic attacks (Fire Slash every 12 strikes). That difference decides which
        Refinement options and Skill Stones help them, as covered below. Some passives are always
        on, some stack up over time or strikes, and some count uses of other skills.
      </p>
      <p className="note">
        Mantra is a special case: it multiplies your ATK, HP and HP Recovery in the character stats
        whether or not it’s in your active preset, so fights don’t play it as a skill.
      </p>

      <h2>Presets</h2>
      <p>
        You can keep five skill presets of ten slots each. Press Edit, then click skills to fill the
        next empty slot; click a slot to empty it. Each preset also remembers which of its skills
        are on auto and which you cast by hand.
      </p>
      <p>
        Only the active preset’s skills fight, and some effects depend on its make-up. Heart of
        Fire needs at least four Fire attack skills in the preset. It adds its power to every Fire
        attack skill’s damage, once more for each Fire attack skill beyond four.
      </p>

      <h2>Skill Mastery</h2>
      <p>
        Skill Mastery is a ten-page tree. Page 1 is open from the start, and each later page opens
        once every node on the page before it is filled. It has two kinds of node:
      </p>
      <ul>
        <li>
          <strong>Level nodes</strong> add character stats per level: ATK, HP, HP REGEN, monster
          gold and EXP, plus the separate HP AMP and HP REGEN AMP amplifiers from page 6 on. With
          every node maxed, Mastery adds +21,000% ATK and +6,340% HP.
        </li>
        <li>
          <strong>Check nodes</strong> are one-time unlocks. Some give rewards such as Mythic gear,
          diamonds, emeralds, feathers or summon tickets. The important ones multiply a line of
          skills: triple damage, or 1.5× damage with twice the hits. The skill nodes on pages 1 to 5
          need a Mythic weapon or accessory of a set grade before you can take them.
        </li>
      </ul>
      <p>
        Mastery ATK and HP add into a group shared with several other sources (see{" "}
        <Link href="/guides/how-stats-are-calculated">how stats are calculated</Link>), so the skill
        multipliers on check nodes are often the stronger part of the tree.
      </p>
      <p>
        From page 6, each skill node pairs its triple damage with a second effect. The fight plays
        these: Water Slash gets a faster animation, Hot Blast and Fire Blast play out in stopped
        time, Fulgurous costs 5 less mana, the Fire Slash line needs one strike fewer, Pillar of
        Fire’s cooldown drops by two seconds, and the Stone Strike line gets +20% boss damage. Range,
        stun, monster damage, Fire enemy and damage resistance effects don’t change a single boss
        fight, so they’re left out.
      </p>

      <h2>Skill Refinement</h2>
      <p>
        Twenty-five attack skills can be refined. Three lines are open from the start, the fourth
        opens at skill level 40 and the fifth at level 100. Each line rolls an option and a value,
        and the value’s range gives its colour tier. The tiers, weakest to strongest, are White,
        Green, Orange, Purple, Red and Aqua. The options are:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>White</th>
              <th>Aqua</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>DMG Increase</td><td>1–3%</td><td>13–20%</td></tr>
            <tr><td>Cooldown Reduction</td><td>0.1–0.2%</td><td>1.3–2%</td></tr>
            <tr><td>Reduction in Required Strikes</td><td>0.1–0.3%</td><td>1.9–3%</td></tr>
            <tr><td>Mana Consumption Reduction</td><td>0.1–0.3%</td><td>1.6–3%</td></tr>
            <tr><td>DMG dealt to attribute enemies</td><td>1–4%</td><td>19–25%</td></tr>
            <tr><td>DMG Resist while equipped</td><td>0.1–0.2%</td><td>1.1–1.5%</td></tr>
            <tr><td>Accuracy for this skill while equipped</td><td>5–15</td><td>65–100</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Each skill can roll six of the seven. Cooldown skills can’t roll Reduction in Required
        Strikes, and strike-triggered skills can’t roll Cooldown Reduction. The attribute option
        targets the element the skill is strong against: Water beats Fire, Fire beats Earth, Earth
        beats Wind, and Wind beats Water.
      </p>
      <p>
        Only Aqua lines count. In a fight, Aqua DMG Increase multiplies the skill’s damage, Aqua
        Cooldown Reduction or Reduction in Required Strikes shortens its cycle, and Aqua Mana
        Consumption Reduction lowers its MP cost. The attribute, DMG Resist and Accuracy options
        aren’t used in the fight.
      </p>
      <p>
        Refinement also has an <strong>owned effect</strong> that applies to your character
        whether or not the skill is equipped. It starts once a skill has three Aqua lines among its
        open lines and grows at four and five. Fire Slash with three Aqua lines gives +2% character
        HP; Demon Hunt with five gives +30% character ATK; Pillar of Fire gives up to +600% crit
        damage.
      </p>

      <h2>Skill Proficiency</h2>
      <p>
        Skill Proficiency runs from level 0 to 328 and adds All Attribute damage, which counts for
        every element. It accelerates hard: +5% at level 1, +58% at 10, +1,935% at 100, +14,975% at
        200 and +133,287% at 328. Because element damage feeds skills directly, Proficiency becomes
        one of the largest skill damage sources in the late game. It also raises your familiars’
        damage by 0.7% a level.
      </p>

      <h2>Skill Stones</h2>
      <p>
        Each stone preset holds three stones: a Cooldown Stone (shorter cooldowns), a Time Stone
        (longer buff durations) and a Heat Stone (fewer required attacks). Every stone has an element
        and only affects skills of that element. Type A stones give 4% and Type B stones 7%.
      </p>
      <p>
        For example, a Water buff with a 20-second cooldown and 10-second duration, with a Type B
        Water Cooldown Stone and a Type A Water Time Stone, becomes an 18.6-second cooldown with
        10.4 seconds of duration. A Fire skill in the same preset is unaffected. Heat Stones round
        strike counts and never reduce them below one.
      </p>

      <h2>Familiars</h2>
      <p>
        Twelve familiars come in three groups of four: Weapon (Na, Rion, Ru, Mus), Attribute (Hi,
        A, Je, Ti, one per element) and Battle (Ku, Pe, Sha, Po). You equip one from each group,
        saved per familiar preset. Familiars have 0 to 11 stars, and their rarity rises with stars:
        Common at 0–1, up to Mythic at 10 and Immortal at 11. Each familiar’s window also shows its
        special effect, which unlocks at 11 stars.
      </p>
      <p>
        Familiar proficiency is a separate track per group. Every level of any group adds +1% ATK
        and +10% HP. On top of that, Attribute levels add All Attribute damage, Weapon levels add
        Slayer damage and Battle levels add familiar damage.
      </p>
      <p>
        The <strong>Mana Altar</strong> counts the stars of your six highest-starred familiars. It
        has 37 levels, from 30 total stars to 66, and adds skill damage (+4,769% at the top) and
        Soul Marble.
      </p>
      <p>
        In a fight, your three equipped familiars combine into one attack, for example Hi + Ku + Na.
        The weapon familiar gives its range and damage, the attribute familiar multiplies that
        damage and sets the element, and the battle familiar sets how many times it hits. With Pe as
        the battle familiar, the attack repeats that many times, one a second. It goes once per
        battle, and you can put it on auto or use it by hand like a skill. A familiar at 11 stars
        adds its special:
      </p>
      <ul>
        <li><strong>Ku</strong> adds 10% damage and allows two uses, 20 seconds apart.</li>
        <li><strong>Pe</strong> makes its repeats 10% faster.</li>
        <li><strong>Na</strong> adds 10% damage while the enemy is at 60% HP or less.</li>
        <li>
          <strong>Rion</strong> (+200% ATK SPD for 10s), <strong>Ru</strong> (+150% ATK for 5s),{" "}
          <strong>A</strong> (charges 15% of skill cooldowns) and <strong>Je</strong> (+25% MSPD for
          10s) trigger with each use.
        </li>
        <li><strong>Po</strong> adds 15 extra attacks 2 seconds before the battle ends.</li>
      </ul>
      <p>
        Below 11 stars a familiar has no special. Other specials at 11 stars are listed as not
        modelled.
      </p>

      <h2>How skills play in a fight</h2>
      <p>
        Attacks and buffs start the fight ready, so their first use comes before their
        first cooldown or strike count. Skills on auto cast as soon as they’re ready and there’s
        mana; skills you set to manual wait for you to press them. A few skills have rules of their
        own:
      </p>
      <ul>
        <li>
          <strong>Meditation</strong> charges the cooldowns and strike counts of your other skills,
          stacking buffs such as Burning Sword, Curved Blade, Earth’s Will and Speed Sword included
          until they’re complete. The Wind Force spirit skill charges the same skills.
        </li>
        <li>
          <strong>Rave</strong> stores the damage dealt over 5 seconds, including Breath of Fire,
          while the fight runs normally. Pressing it again releases a pillar over 2 seconds, during
          which everything else stops. Its cooldown starts on release.
        </li>
        <li>
          <strong>Wrath of Gods</strong> first goes off 20 seconds into battle, then every 30
          seconds.
        </li>
        <li>
          <strong>Rage</strong> stops HP recovery and drains 0.5% of max HP a second while it lasts,
          ending early rather than taking HP to zero.
        </li>
      </ul>
      <p>
        The <Link href="/guides/promotion-fights">promotion fights guide</Link> covers the rest of
        the special rules and the skills the fight leaves out.
      </p>

      <h2>Putting it together</h2>
      <p>
        A skill’s hit multiplies its power (with Mastery) by your ATK and buffs, by crit and death
        strike, and by its element damage and amplifiers. On top, three skill damage multipliers
        each apply on their own: the Mana Altar with Statue of Demon’s skill damage, Luna’s Wisdom
        of War (see <Link href="/guides/companions-and-beasts">companions and beasts</Link>), and
        Aqua DMG Increase lines. Its cooldown, strike count and mana cost decide how often that
        happens.
      </p>
      <p>
        You can build presets in the Skill tab of the{" "}
        <Link href="/slayer-legends-analyzer">analyzer</Link> and watch them play out in the
        Analysis tab.
      </p>
    </GuideArticle>
  );
}
