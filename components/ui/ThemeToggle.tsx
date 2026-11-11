"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "components/theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-md p-2 text-tk-muted hover:bg-tk-subtle hover:text-tk-text focus:outline-hidden focus-visible:ring-2 focus-visible:ring-tk-accent/40 dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle dark:hover:text-tk-dark-text"
      aria-label="Toggle theme"
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
