"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { applyTheme, isTheme, THEME_KEY, type Theme } from "@/lib/theme";

const OPTIONS = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const satisfies readonly { id: Theme; label: string; Icon: unknown }[];

const CHANGE = "theme-change";

function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return isTheme(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

// Other tabs report through "storage", this one through its own event.
function subscribe(onChange: () => void) {
  const onStorage = () => {
    applyTheme(readTheme());
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE, onChange);
  };
}

function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    if (theme === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, theme);
  } catch {}
  window.dispatchEvent(new Event(CHANGE));
}

/** Light, dark or follow the system; the choice is saved in this browser. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // The server can't know the saved choice, so it renders System.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-ink/10 bg-ink/[0.04] p-0.5 ${className}`}
    >
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          aria-label={label}
          title={`${label} theme`}
          onClick={() => saveTheme(id)}
          className={`grid size-7 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
            theme === id ? "bg-ground text-ink shadow-sm ring-1 ring-ink/10" : "text-dim hover:text-ink"
          }`}
        >
          <Icon aria-hidden strokeWidth={1.75} className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
