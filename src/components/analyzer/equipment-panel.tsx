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
import { GearGrid } from "./gear-grid";
import { RelicList } from "./relic-list";
import { SealedShrine } from "./sealed-shrine";
import { SoulWeaponPanel } from "./soul-weapon-panel";
import { SpiritGrid } from "./spirit-grid";

const PANEL = "min-h-0 flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-20";
const WIKI_URL = "https://slayerlegend.wiki/";

const EQUIPMENT_TABS = [
  { id: "weapons", label: "Weapons", count: WEAPONS.length },
  { id: "accessories", label: "Accessories", count: ACCESSORIES.length },
  { id: "relics", label: "Relics", count: RELICS.length },
  { id: "spirits", label: "Spirits", count: SPIRITS.length },
  { id: "soul-weapons", label: "Soul Weapons", count: SOUL_WEAPONS.length },
];

export function EquipmentPanel() {
  const [active, setActive] = useState("weapons");

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(String(value))}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex shrink-0 items-end justify-between gap-4 border-b border-ink/15 px-4 sm:px-6">
        <TabsList
          variant="line"
          className="h-auto! w-auto justify-start gap-4 overflow-visible rounded-none bg-transparent p-0 pb-2"
        >
          {EQUIPMENT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="h-auto flex-none gap-1.5 rounded-none px-0 pt-4 font-mono text-xs tracking-[0.08em] text-dim uppercase data-active:text-ink!"
            >
              {tab.label}
              <span className="text-[10px] opacity-60">{tab.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="hidden pb-2 font-mono text-[10px] tracking-[0.06em] text-dim uppercase lg:block">
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
          <div className="min-h-0 overflow-auto border-b border-ink/15 p-3 pb-6 sm:p-4 md:border-r md:border-b-0 md:pb-20">
            <RelicList />
          </div>
          <div className="min-h-0 overflow-auto p-3 pb-20 sm:p-4">
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
    </Tabs>
  );
}
