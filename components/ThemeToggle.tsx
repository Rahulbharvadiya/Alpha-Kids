"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    setDark(next);
    try {
      localStorage.setItem("alphakids:theme", next ? "dark" : "light");
    } catch {}
    window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-text
                 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer transition-colors"
    >
      <Sun
        className={`absolute h-5 w-5 transition-all duration-300 ${
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-5 w-5 transition-all duration-300 ${
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
