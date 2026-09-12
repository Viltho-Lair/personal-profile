"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentPanel } from "./equipment-panel";
import { SkillGrid } from "./skill-grid";
import { ANALYZER_TABS, DEFAULT_TAB, isTabId } from "./tabs";

export function AnalyzerShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const active = isTabId(requested) ? requested : DEFAULT_TAB;

  return (
    <Tabs
      value={active}
      onValueChange={(value) =>
        router.replace(`?tab=${String(value)}`, { scroll: false })
      }
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      {/* Top half is reserved for the scatter chart; the tabs own the bottom half. */}
      <section
        aria-label="Scatter chart"
        className="flex h-1/2 shrink-0 items-center justify-center border-b border-ink/15"
      >
        <p className="font-mono text-xs tracking-[0.08em] text-dim uppercase">
          Scatter chart
        </p>
      </section>

      {ANALYZER_TABS.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="min-h-0 flex-1 overflow-auto pb-20"
        >
          {tab.id === "skill" ? (
            <SkillGrid />
          ) : tab.id === "equips" ? (
            <EquipmentPanel />
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
              className="h-12 w-12 flex-none rounded-lg border border-ink/25 bg-ground! px-1 text-[10px] leading-tight font-medium whitespace-normal [overflow-wrap:anywhere] text-dim data-active:border-ink! data-active:bg-ink! data-active:text-ground! sm:h-14 sm:w-14 sm:text-[11px]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
