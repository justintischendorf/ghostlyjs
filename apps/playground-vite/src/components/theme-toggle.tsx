import { Moon, Sun } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const query = "(prefers-color-scheme: dark)";

// Lets React read the system setting and re-render when it changes.
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// Switches between light and dark mode by setting `data-theme` on <html>
// (see globals.css). Before the first click it follows the system setting.
export default function ThemeToggle() {
  const systemIsDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
  );
  const [chosen, setChosen] = useState<boolean>();
  const isDark = chosen ?? systemIsDark;

  function toggle() {
    const dark = !isDark;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    setChosen(dark);
  }

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-full border border-border p-2 hover:bg-card"
    >
      <Icon className="size-4" />
    </button>
  );
}
