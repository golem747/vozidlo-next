// src/lib/show.ts

// Helper na zobrazovanie hodnôt v tabuľke.
// 0 / null / undefined -> "" (prázdny text)
// ostatné hodnoty -> nechá tak
export function show(val: number | string | null | undefined) {
  if (val === null || val === undefined) return "";
  if (val === 0 || val === "0") return "";
  return val;
}
