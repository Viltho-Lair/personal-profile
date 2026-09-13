"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
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
import { ResetProfileButton } from "./profile-controls";
import { ProgressChart } from "./progress-chart";
import { SkillPanel } from "./skill-panel";
import { StatsSummary } from "./stats-summary";
import { ANALYZER_TABS, DEFAULT_TAB, isTabId } from "./tabs";

const TAB_ICONS: Record<string, { icon: string; iconSize: number } | undefined> = navigationData.icons;

export function AnalyzerShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const active = isTabId(requested) ? requested : DEFAULT_TAB;
  const { profile, resetProfile } = useProfile();

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
      onValueChange={(value) =>
        router.replace(`?tab=${String(value)}`, { scroll: false })
      }
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      {/* Top half is a 3 x 2 grid: the progress chart and the Stats Summary
          fill the left two columns, the ad sits top right, reset below it. */}
      <section
        aria-label="Overview"
        className="flex shrink-0 flex-col border-b border-ink/15 md:grid md:h-1/2 md:grid-cols-3 md:grid-rows-2"
      >
        <div className="flex flex-col md:col-span-2 md:row-span-2 md:grid md:min-h-0 md:grid-cols-2 md:border-r md:border-ink/15">
          <div className="flex h-72 min-h-0 flex-col border-b border-ink/15 md:h-auto md:border-r md:border-b-0">
            <ProgressChart />
          </div>
          <StatsSummary />
        </div>
        <aside
          aria-label="Advertisement"
          className="flex min-h-24 items-center justify-center overflow-hidden border-y border-ink/15 p-2 md:col-start-3 md:row-start-1 md:min-h-0 md:border-t-0"
        >
          <AdSlot slot={ANALYZER_AD_SLOT} />
        </aside>
        <div className="flex items-end justify-end p-3 md:col-start-3 md:row-start-2">
          <ResetProfileButton onReset={resetProfile} />
        </div>
      </section>

      {ANALYZER_TABS.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="min-h-0 flex-1 overflow-auto pb-20"
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
            <div className="flex h-full items-center justify-center p-6">
              <p className="max-w-[40ch] text-center font-mono text-xs tracking-[0.08em] text-dim uppercase">
                {tab.empty}
              </p>
            </div>
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
              {TAB_ICONS[tab.id] ? (
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
