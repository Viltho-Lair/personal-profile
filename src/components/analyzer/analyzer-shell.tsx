"use client";

import { ChartLine } from "lucide-react";
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
import { ANALYZER_TABS, type TabId } from "./tabs";

const TAB_ICONS: Record<string, { icon: string; iconSize: number } | undefined> = navigationData.icons;

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

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        setActive(value as TabId);
        window.history.replaceState(null, "", `?tab=${String(value)}`);
      }}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      {/* Every tab fills the page above the bottom bar. */}
      {ANALYZER_TABS.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className={tab.id === "analysis" ? "flex min-h-0 flex-1 flex-col pb-14" : "min-h-0 flex-1 overflow-auto pb-20"}
        >
          {tab.id === "char" ? (
            <CharacterPanel />
          ) : tab.id === "skill" ? (
            <SkillPanel />
          ) : tab.id === "equips" ? (
            <EquipmentPanel />
          ) : tab.id === "companion" ? (
            <CompanionPanel />
          ) : (
            <AnalysisPanel />
          )}
        </TabsContent>
      ))}

      {/* Fixed above the panels: the bar never scrolls and nothing scrolls under the tabs.
          The tabs sit astride the rule and hide it behind them. */}
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="h-12 border-t border-ink/25 bg-ground" />
        <TabsList
          variant="line"
          /* `!` overrides: shadcn scopes some defaults to the list variant,
             which outranks a plain utility class. */
          className="absolute inset-x-0 top-0 h-auto! w-full -translate-y-1/2 justify-center gap-1.5 rounded-none bg-transparent p-0 px-3 sm:gap-2 sm:px-4"
        >
          {ANALYZER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              aria-label={tab.name}
              title={tab.name}
              className="h-12 w-12 flex-none rounded-lg border border-ink/25 bg-ground! px-1 text-[10px] leading-tight font-medium whitespace-normal [overflow-wrap:anywhere] text-dim data-active:border-ink! data-active:bg-ink! data-active:text-ground! sm:h-14 sm:w-14 sm:text-[11px]"
            >
              {tab.id === "analysis" ? (
                <ChartLine aria-hidden strokeWidth={1.75} className="size-7 sm:size-8" />
              ) : TAB_ICONS[tab.id] ? (
                <Image
                  src={TAB_ICONS[tab.id]!.icon}
                  alt=""
                  width={TAB_ICONS[tab.id]!.iconSize}
                  height={TAB_ICONS[tab.id]!.iconSize}
                  draggable={false}
                  className="size-9 object-contain sm:size-11"
                />
              ) : (
                tab.label
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}

/**
 * Analysis, the whole page: the fight chart, the Stats Summary with the presets, and the ad above
 * Settings, as three columns on wide screens and stacked on narrow ones.
 */
function AnalysisPanel() {
  return (
    <section
      aria-label="Analysis"
      className="flex flex-col md:grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]"
    >
      <div className="flex min-h-[32rem] flex-col border-b border-ink/15 md:min-h-0 md:border-r md:border-b-0">
        <ProgressChart />
      </div>
      <div className="flex min-h-0 flex-col border-b border-ink/15 md:border-r md:border-b-0">
        <StatsSummary />
      </div>
      <div className="flex min-h-0 flex-col">
        <aside
          aria-label="Advertisement"
          className="flex min-h-24 items-center justify-center overflow-hidden border-b border-ink/15 p-2 md:min-h-0 md:flex-1"
        >
          <AdSlot slot={ANALYZER_AD_SLOT} />
        </aside>
        <div className="flex flex-col p-3 md:flex-1">
          <SettingsPanel />
        </div>
      </div>
    </section>
  );
}
