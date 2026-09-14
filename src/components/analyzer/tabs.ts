// Adventure and Shop are left out until they have panels: an empty
// "coming soon" tab reads as an unfinished site.
export const ANALYZER_TABS = [
  { id: "char", label: "Char", name: "Character" },
  { id: "skill", label: "Skill", name: "Skills" },
  { id: "equips", label: "Equips", name: "Equipment" },
  { id: "companion", label: "Companion", name: "Companion" },
  { id: "analysis", label: "Analysis", name: "Analysis" },
] as const;

export type TabId = (typeof ANALYZER_TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "char";

export function isTabId(value: string | null): value is TabId {
  return ANALYZER_TABS.some((tab) => tab.id === value);
}
