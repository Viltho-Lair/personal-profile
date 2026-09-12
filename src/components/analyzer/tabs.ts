export const ANALYZER_TABS = [
  {
    id: "char",
    label: "Char",
    name: "Character",
    empty: "Character stats will live here.",
  },
  {
    id: "skill",
    label: "Skill",
    name: "Skills",
    empty: "Skill planning will live here.",
  },
  {
    id: "equips",
    label: "Equips",
    name: "Equipment",
    empty: "Equipment comparison will live here.",
  },
  {
    id: "companion",
    label: "Companion",
    name: "Companion",
    empty: "Companion setup will live here.",
  },
  {
    id: "adv",
    label: "Adv.",
    name: "Adventure",
    empty: "Adventure progress will live here.",
  },
  {
    id: "shop",
    label: "Shop",
    name: "Shop",
    empty: "Shop planning will live here.",
  },
] as const;

export type TabId = (typeof ANALYZER_TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "char";

export function isTabId(value: string | null): value is TabId {
  return ANALYZER_TABS.some((tab) => tab.id === value);
}
