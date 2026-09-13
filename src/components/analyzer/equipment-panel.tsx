"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GearGrid } from "./gear-grid";
import { RelicList } from "./relic-list";
import { SpiritGrid } from "./spirit-grid";
import { Sprite } from "./sprite";
import {
  ACCESSORIES,
  EQUIPMENT_SOURCE,
  formatValue,
  RELICS,
  SOUL_WEAPONS,
  SPIRITS,
  WEAPONS,
  type SoulWeapon,
} from "./equipment";

const CARD_GRID =
  "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]";
const PANEL = "min-h-0 flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-20";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function ItemCard({
  icon,
  name,
  subtitle,
  children,
}: {
  icon: string | null;
  name: string;
  subtitle: string | null;
  children: React.ReactNode;
}) {
  return (
    <article className="flex h-full flex-col gap-2 rounded-lg border border-ink/15 p-3 transition-colors hover:border-ink/40">
      <header className="flex items-start gap-2.5">
        {icon ? (
          <Sprite
            src={icon}
            native={128}
            size={64}
            className="rounded-md border border-ink/15"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm leading-tight font-medium">{name}</h3>
          {subtitle ? (
            <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
              {subtitle}
            </span>
          ) : null}
        </div>
      </header>
      <dl className="mt-auto grid gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        {children}
      </dl>
    </article>
  );
}

function SoulWeaponCard({ weapon }: { weapon: SoulWeapon }) {
  return (
    <ItemCard
      icon={weapon.icon}
      name={weapon.name}
      subtitle={
        [weapon.stageRequirement, weapon.soulColor]
          .filter(Boolean)
          .join(" · ") || null
      }
    >
      <Row label="ATK" value={formatValue(weapon.attack)} />
      <Row label="Souls" value={formatValue(weapon.requirements)} />
      <Row label="Salvage" value={formatValue(weapon.disassemblyReward)} />
      <Row label="Chaos" value={formatValue(weapon.chaosSoulGain)} />
    </ItemCard>
  );
}

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

        <a
          href={EQUIPMENT_SOURCE.url}
          target="_blank"
          rel="noreferrer noopener"
          className="hidden pb-2 font-mono text-[10px] tracking-[0.06em] text-dim uppercase underline-offset-4 hover:text-ink hover:underline lg:block"
        >
          Data: Slayer Legend Wiki
        </a>
      </div>

      <TabsContent value="weapons" className={PANEL}>
        <GearGrid items={WEAPONS} native={128} />
      </TabsContent>

      <TabsContent value="accessories" className={PANEL}>
        <GearGrid items={ACCESSORIES} native={64} />
      </TabsContent>

      <TabsContent value="relics" className={PANEL}>
        <RelicList />
      </TabsContent>

      <TabsContent value="spirits" className={PANEL}>
        <SpiritGrid />
      </TabsContent>

      <TabsContent value="soul-weapons" className={PANEL}>
        <div className={CARD_GRID}>
          {SOUL_WEAPONS.map((weapon) => (
            <SoulWeaponCard key={weapon.id} weapon={weapon} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
