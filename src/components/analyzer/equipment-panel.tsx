"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equippedKey, soulWeaponOwned } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import {
  ACCESSORIES,
  formatValue,
  RELICS,
  SOUL_WEAPONS,
  SPIRITS,
  WEAPONS,
  type SoulWeapon,
} from "./data";
import { GearGrid } from "./gear-grid";
import { EquipButton, EquippedBadge, OwnedToggle } from "./profile-controls";
import { RelicList } from "./relic-list";
import { SpiritGrid } from "./spirit-grid";
import { Sprite } from "./sprite";

const CARD_GRID = "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]";
const PANEL = "min-h-0 flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-20";
const WIKI_URL = "https://slayerlegend.wiki/";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function SoulWeaponCard({
  weapon,
  owned,
  equipped,
  onOwnedChange,
  onEquipToggle,
}: {
  weapon: SoulWeapon;
  owned: boolean;
  equipped: boolean;
  onOwnedChange: (owned: boolean) => void;
  onEquipToggle: () => void;
}) {
  const stage = weapon.stage.name ?? (weapon.stage.number ? `Stage ${weapon.stage.number}` : null);

  return (
    <article
      className={`relative flex h-full flex-col gap-2 rounded-lg border border-ink/15 p-3 transition-opacity hover:border-ink/40 ${owned ? "" : "opacity-55"}`}
    >
      {equipped ? <EquippedBadge /> : null}
      <header className="flex items-start gap-2.5">
        {weapon.icon && weapon.iconSize ? (
          <Sprite
            src={weapon.icon}
            native={weapon.iconSize}
            size={64}
            className="rounded-md border border-ink/15"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm leading-tight font-medium">{weapon.name}</h3>
          <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            {[stage, weapon.soulColor].filter(Boolean).join(" · ")}
          </span>
        </div>
      </header>

      <dl className="grid gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Row label="ATK" value={formatValue(weapon.attack)} />
        <Row label="Souls" value={formatValue(weapon.cost)} />
        <Row
          label="Needs"
          value={
            weapon.requirement.item
              ? [weapon.requirement.item, weapon.requirement.grade].filter(Boolean).join(" ")
              : "—"
          }
        />
        <Row label="Salvage" value={formatValue(weapon.disassemblyReward)} />
        <Row
          label="Engraving ATK / HP"
          value={`${formatValue(weapon.engraving.atk)} / ${formatValue(weapon.engraving.hp)}`}
        />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
        <OwnedToggle owned={owned} name={weapon.name} onChange={onOwnedChange} />
        <EquipButton equipped={equipped} name={weapon.name} onToggle={onEquipToggle} />
      </div>
    </article>
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
  const { profile, setOwned, equip } = useProfile();
  const equippedSoulWeapon = equippedKey(profile, "soulWeapons");

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

      <TabsContent value="relics" className={PANEL}>
        <RelicList />
      </TabsContent>

      <TabsContent value="spirits" className={PANEL}>
        <SpiritGrid />
      </TabsContent>

      <TabsContent value="soul-weapons" className={PANEL}>
        <div className={CARD_GRID}>
          {SOUL_WEAPONS.map((weapon) => (
            <SoulWeaponCard
              key={weapon.id}
              weapon={weapon}
              owned={soulWeaponOwned(profile, weapon.name)}
              equipped={equippedSoulWeapon === weapon.name}
              onOwnedChange={(owned) => setOwned("soulWeapons", weapon.name, owned)}
              onEquipToggle={() =>
                equip("soulWeapons", equippedSoulWeapon === weapon.name ? null : weapon.name)
              }
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
