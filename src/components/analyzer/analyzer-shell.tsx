"use client";

import { ChartLine, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ANALYZER_AD_SLOT } from "@/lib/adsense";
import { unknownEntries } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import Image from "next/image";
import navigationData from "@/data/optimizer/navigation.json";
import { AdSlot } from "./ad-slot";
import { CharacterPanel } from "./character-panel";
import { CompanionPanel } from "./companion-panel";
import { KNOWN_NAMES } from "./data";
import { EquipmentPanel } from "./equipment-panel";
import { SettingsPanel } from "./profile-controls";
import { ProgressChart } from "./progress-chart";
import { SkillPanel } from "./skill-panel";
import { StatsSummary } from "./stats-summary";
import { SummonPanel } from "./summon-panel";
import { ANALYZER_TABS, type TabId } from "./tabs";

const TAB_ICONS: Record<string, { icon: string; iconSize: number } | undefined> = navigationData.icons;

/** One line under each tab's title, naming what the tab holds. */
const TAB_BLURBS: Record<TabId, string> = {
  char: "Enhance, growth, promotion and appearance",
  skill: "Skills, proficiency, mastery and familiars",
  equips: "Weapons, accessories, relics, spirits, soul weapons and the black orb",
  companion: "Companions and beasts",
  analysis: "Fights, the stats summary and presets",
  summon: "Weapon and accessory summons",
};

const CARD = "rounded-xl border border-ink/10 bg-ground shadow-[0_1px_2px_rgb(0_0_0/0.04)]";

function TabIcon({ id, className }: { id: TabId; className: string }) {
  if (id === "analysis") return <ChartLine aria-hidden strokeWidth={1.75} className={className} />;
  if (id === "summon") return <Store aria-hidden strokeWidth={1.75} className={className} />;
  const art = TAB_ICONS[id];
  return art ? (
    <Image
      src={art.icon}
      alt=""
      width={art.iconSize}
      height={art.iconSize}
      draggable={false}
      className={`object-contain ${className}`}
    />
  ) : null;
}

/**
 * The page reads ?tab= on the server and passes it in, so the first HTML
 * already holds the right panel. Tab changes only rewrite the URL: Next.js
 * picks up history.replaceState without a server round trip.
 */
export function AnalyzerShell({ initialTab }: { initialTab: TabId }) {
  const [active, setActive] = useState<TabId>(initialTab);
  const { profile } = useProfile();

  // Rule 6: entries for items a data update renamed or removed are kept but
  // not shown. Say so during development so they can be remapped - but only
  // once per distinct list, so editing an unrelated field doesn't re-warn.
  const lastWarnedRef = useRef<string | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const unknown = unknownEntries(profile, KNOWN_NAMES);
    const joined = unknown.join(", ");
    if (unknown.length > 0 && joined !== lastWarnedRef.current) {
      lastWarnedRef.current = joined;
      console.warn(`Saved profile entries not in the current data (kept, not shown): ${joined}`);
    }
  }, [profile]);

  const current = ANALYZER_TABS.find((tab) => tab.id === active) ?? ANALYZER_TABS[0];

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        setActive(value as TabId);
        window.history.replaceState(null, "", `?tab=${String(value)}`);
      }}
      className="flex min-h-0 flex-1 flex-col gap-0 md:flex-row! md:gap-3 md:px-3 md:pb-3"
    >
      {/* A rail beside the panels from tablet width up; a bar fixed to the bottom on phones.
          `!` overrides: shadcn scopes some defaults to the list variant,
          which outranks a plain utility class. */}
      <TabsList
        variant="line"
        className="fixed inset-x-0 bottom-0 z-50 h-14! w-full items-stretch justify-around gap-0.5 rounded-none border-t border-ink/10 bg-ground/95 px-1 py-1 backdrop-blur-md md:static md:z-auto md:h-auto! md:w-[4.75rem] md:shrink-0 md:flex-col md:justify-start md:gap-1 md:rounded-xl md:border md:bg-ground md:p-1.5 lg:w-48"
      >
        <span className="hidden px-2.5 pt-2 pb-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase lg:block">
          Planner
        </span>
        {ANALYZER_TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            aria-label={tab.name}
            title={tab.name}
            className="group/nav h-full min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-0.5 py-0.5 text-[9px] leading-tight font-medium text-dim transition-colors after:hidden hover:bg-ink/[0.04] hover:text-ink data-active:bg-ink/[0.07]! data-active:text-ink! md:h-auto md:w-full md:flex-none md:py-2 md:text-[10px] lg:flex-row lg:justify-start lg:gap-3 lg:px-2.5 lg:py-1.5 lg:text-sm"
          >
            <span
              aria-hidden
              className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-brand-orange opacity-0 transition-opacity group-data-active/nav:opacity-100 md:top-1/2 md:left-0 md:h-5 md:w-0.5 md:-translate-x-0 md:-translate-y-1/2"
            />
            <span className="grid size-7 shrink-0 place-items-center md:size-9 lg:size-8">
              <TabIcon id={tab.id} className="size-6 md:size-7 lg:size-6" />
            </span>
            <span className="max-w-full truncate">{tab.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Every tab fills the page beside the ad and Settings, which stay on screen for all of them. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-2 pb-20 md:px-0 md:pb-0 lg:flex-row">
        <main className={`${CARD} relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
          <div className="flex shrink-0 items-center gap-3 border-b border-ink/10 px-3 py-2 sm:px-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink/[0.05]">
              <TabIcon id={current.id} className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col">
              <h2 className="text-sm leading-tight font-semibold">{current.name}</h2>
              <p className="truncate text-[11px] text-dim">{TAB_BLURBS[current.id]}</p>
            </div>
          </div>
          {ANALYZER_TABS.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className={tab.id === "analysis" ? "min-h-0 flex-1 overflow-auto xl:flex xl:flex-col xl:overflow-hidden" : "min-h-0 flex-1 overflow-auto"}
            >
              {tab.id === "char" ? (
                <CharacterPanel />
              ) : tab.id === "skill" ? (
                <SkillPanel />
              ) : tab.id === "equips" ? (
                <EquipmentPanel />
              ) : tab.id === "companion" ? (
                <CompanionPanel />
              ) : tab.id === "summon" ? (
                <section aria-label="Summon" className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                  <SummonPanel />
                </section>
              ) : (
                <AnalysisPanel />
              )}
            </TabsContent>
          ))}
        </main>

        <aside
          aria-label="Advertisement and settings"
          className="flex shrink-0 flex-col gap-3 md:flex-row lg:w-72 lg:min-h-0 lg:flex-col lg:overflow-auto xl:w-80"
        >
          <div className={`${CARD} flex flex-col p-4 md:flex-1 lg:flex-none`}>
            <SettingsPanel />
          </div>
          <div className="flex flex-col gap-3 md:flex-1 lg:min-h-0">
            <div
              aria-label="Advertisement"
              className="flex min-h-24 flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink/15 p-2"
            >
              <AdSlot slot={ANALYZER_AD_SLOT} />
            </div>
            <p className="px-1 text-[10px] leading-snug text-dim">
              All data, information and artwork belong to Slayer Legends. This is an analysis tool only, using the Master Optimizer document.
            </p>
          </div>
        </aside>
      </div>
    </Tabs>
  );
}

/** Analysis: the fight chart and the Stats Summary with the presets, side by side on wide screens and stacked below that. */
function AnalysisPanel() {
  return (
    <section aria-label="Analysis" className="flex flex-col xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-[32rem] flex-col border-b border-ink/10 xl:min-h-0 xl:border-r xl:border-b-0">
        <ProgressChart />
      </div>
      <div className="flex min-h-0 flex-col border-b border-ink/10 xl:border-b-0">
        <StatsSummary />
      </div>
    </section>
  );
}
