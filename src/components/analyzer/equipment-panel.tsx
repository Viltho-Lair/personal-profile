"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACCESSORIES,
  RELICS,
  SOUL_WEAPONS,
  SPIRITS,
  WEAPONS,
} from "./data";
import { BlackOrbPanel } from "./black-orb-panel";
import { GearGrid } from "./gear-grid";
import { RelicList } from "./relic-list";
import { SealedShrine } from "./sealed-shrine";
import { SoulWeaponPanel } from "./soul-weapon-panel";
import { SpiritGrid } from "./spirit-grid";

const PANEL = "min-h-0 flex-1 overflow-auto p-4 pb-6 sm:p-6";
const WIKI_URL = "https://slayerlegend.wiki/";

const EQUIPMENT_TABS = [
  { id: "weapons", label: "Weapons", count: WEAPONS.length },
  { id: "accessories", label: "Accessories", count: ACCESSORIES.length },
  { id: "relics", label: "Relics", count: RELICS.length },
  { id: "spirits", label: "Spirits", count: SPIRITS.length },
  { id: "soul-weapons", label: "Soul Weapons", count: SOUL_WEAPONS.length },
  { id: "black-orb", label: "Black Orb", count: 4 },
];

export function EquipmentPanel() {
  const [active, setActive] = useState("weapons");

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(String(value))}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex shrink-0 items-end justify-between gap-4 border-b border-ink/10 px-3 sm:px-4">
        <TabsList
          variant="line"
          className="h-auto! w-auto min-w-0 justify-start gap-5 xl:shrink-0 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none]"
        >
          {EQUIPMENT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="-mb-px h-auto flex-none gap-1.5 rounded-t-sm rounded-b-none border-0 border-b-2 border-transparent px-0 py-2.5 font-mono text-[10px] tracking-[0.08em] text-dim uppercase after:hidden hover:text-ink data-active:border-brand-orange! data-active:text-ink! sm:text-[11px]"
            >
              {tab.label}
              <span className="text-[10px] opacity-60">{tab.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="hidden min-w-0 pb-2.5 text-right font-mono text-[10px] leading-snug tracking-[0.06em] text-dim uppercase xl:block">
          Data: Master Optimizer · spirit skills from{" "}
          <a
            href={WIKI_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-4 hover:text-ink hover:underline"
          >
            Slayer Legend Wiki
          </a>
        </p>
      </div>

      <TabsContent value="weapons" className={PANEL}>
        <GearGrid kind="weapons" items={WEAPONS} />
      </TabsContent>

      <TabsContent value="accessories" className={PANEL}>
        <GearGrid kind="accessories" items={ACCESSORIES} />
      </TabsContent>

      <TabsContent value="relics" className="relative min-h-0 flex-1">
        <div className="flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
          <div className="min-h-0 overflow-auto border-b border-ink/15 p-3 pb-6 sm:p-4 md:border-r md:border-b-0">
            <RelicList />
          </div>
          <div className="min-h-0 overflow-auto p-3 pb-6 sm:p-4">
            <SealedShrine />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="spirits" className={PANEL}>
        <SpiritGrid />
      </TabsContent>

      <TabsContent value="soul-weapons" className="relative min-h-0 flex-1">
        <SoulWeaponPanel />
      </TabsContent>

      <TabsContent value="black-orb" className="relative min-h-0 flex-1">
        <BlackOrbPanel />
      </TabsContent>
    </Tabs>
  );
}
