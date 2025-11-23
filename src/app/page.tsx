"use client";

import { useEffect, useState } from "react";
import { show } from "./lib/show";

type DayRow = {
  day: number;
  startKm: number | null;
  endKm: number | null;
  diff: number | null;
  consumption: number | null;
  fuelRemaining: number | null;
  refuel: number | null; // NOVÉ
  route: string;
  note: string;
};

type Vehicle = {
  id: string;
  label: string;
};

const DAYS_IN_MONTH = 31;
const STORAGE_PREFIX = "vozidlo-next-";
const VEHICLES_STORAGE_KEY = `${STORAGE_PREFIX}vehicles`;

// heslo z .env.local
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

const MONTHS = [
  { id: 1, label: "Január" },
  { id: 2, label: "Február" },
  { id: 3, label: "Marec" },
  { id: 4, label: "Apríl" },
  { id: 5, label: "Máj" },
  { id: 6, label: "Jún" },
  { id: 7, label: "Júl" },
  { id: 8, label: "August" },
  { id: 9, label: "September" },
  { id: 10, label: "Október" },
  { id: 11, label: "November" },
  { id: 12, label: "December" },
];

function createEmptyRows(): DayRow[] {
  return Array.from({ length: DAYS_IN_MONTH }, (_, i) => ({
    day: i + 1,
    startKm: null,
    endKm: null,
    diff: null,
    consumption: null,
    fuelRemaining: null,
    refuel: null, // NOVÉ
    route: "",
    note: "",
  }));
}

export default function HomePage() {
  // ====== HESLO ======
  const [isAuthed, setIsAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // ak nie je APP_PASSWORD nastavené, appka je voľne prístupná
  useEffect(() => {
    if (!APP_PASSWORD) {
      setIsAuthed(true);
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!APP_PASSWORD || passwordInput === APP_PASSWORD) {
      setIsAuthed(true);
      setPasswordInput("");
    } else {
      alert("Nesprávne heslo.");
    }
  }

  // ====== pôvodná logika ======
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentVehicleId, setCurrentVehicleId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [rows, setRows] = useState<DayRow[]>(createEmptyRows);
  const [loadedRows, setLoadedRows] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");

  // načítanie vozidiel
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VEHICLES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Vehicle[];
        if (parsed.length > 0) {
          setVehicles(parsed);
          setCurrentVehicleId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore
    }

    const defaultVehicle: Vehicle = { id: "vozidlo-1", label: "Moje vozidlo" };
    setVehicles([defaultVehicle]);
    setCurrentVehicleId(defaultVehicle.id);
  }, []);

  // ukladanie vozidiel
  useEffect(() => {
    if (!vehicles.length) return;
    try {
      window.localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
    } catch {
      // ignore
    }
  }, [vehicles]);

  const storageKey =
    currentVehicleId && currentMonth
      ? `${STORAGE_PREFIX}${currentVehicleId}-${currentMonth}`
      : "";

  // načítanie jázd
  useEffect(() => {
    if (!storageKey) return;
    setLoadedRows(false);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DayRow[];
        setRows(parsed);
      } else {
        setRows(createEmptyRows());
      }
    } catch {
      setRows(createEmptyRows());
    } finally {
      setLoadedRows(true);
    }
  }, [storageKey]);

  // uloženie jázd
  useEffect(() => {
    if (!loadedRows || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      // ignore
    }
  }, [rows, storageKey, loadedRows]);

  // update jednej bunky
  function updateRow(index: number, field: keyof DayRow, value: string) {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (field === "startKm" || field === "endKm") {
        const num = value === "" ? null : Number(value.replace(",", "."));
        (row as any)[field] = Number.isNaN(num) ? null : num;

        // prepočet diff
        if (row.startKm != null && row.endKm != null) {
          row.diff = row.endKm - row.startKm;
          if (row.diff === 0) row.diff = null;
        } else {
          row.diff = null;
        }

        // autofill ďalšieho dňa
        if (field === "endKm") {
          const nextIndex = index + 1;
          if (copy[nextIndex]) {
            copy[nextIndex].startKm = row.endKm;
          }
        }
      }

      if (
        field === "diff" ||
        field === "consumption" ||
        field === "fuelRemaining" ||
        field === "refuel" // NOVÉ
      ) {
        const num = value === "" ? null : Number(value.replace(",", "."));
        (row as any)[field] = Number.isNaN(num) ? null : num;
      }

      if (field === "route" || field === "note") {
        (row as any)[field] = value;
      }

      copy[index] = row;
      return copy;
    });
  }

  const totalKm = rows.reduce((sum, r) => sum + (r.diff ?? 0), 0);

  const currentVehicle = vehicles.find((v) => v.id === currentVehicleId) ?? null;

  const currentVehicleLabel = currentVehicle?.label ?? "Vozidlo";

  const currentMonthLabel =
    MONTHS.find((m) => m.id === currentMonth)?.label ?? `Mesiac ${currentMonth}`;

  const filledRowsCount = rows.filter((r) => {
    return (
      r.startKm != null ||
      r.endKm != null ||
      r.diff != null ||
      r.consumption != null ||
      r.fuelRemaining != null ||
      r.refuel != null || // NOVÉ
      (r.route && r.route.trim() !== "") ||
      (r.note && r.note.trim() !== "")
    );
  }).length;

  function handleAddVehicle() {
    const name = newVehicleName.trim();
    if (!name) return;

    const id =
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") +
      "-" +
      Date.now();

    const newVeh: Vehicle = { id, label: name };
    setVehicles((prev) => [...prev, newVeh]);
    setCurrentVehicleId(id);
    setNewVehicleName("");
  }

  function handleDeleteCurrentVehicle() {
    if (!currentVehicleId) return;

    if (
      !window.confirm(
        `Naozaj zmazať vozidlo "${currentVehicleLabel}" vrátane všetkých jázd?`
      )
    ) {
      return;
    }

    try {
      for (let m = 1; m <= 12; m++) {
        const key = `${STORAGE_PREFIX}${currentVehicleId}-${m}`;
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }

    setVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== currentVehicleId);
      if (remaining.length === 0) {
        const def: Vehicle = { id: "vozidlo-1", label: "Moje vozidlo" };
        setCurrentVehicleId(def.id);
        return [def];
      }
      setCurrentVehicleId(remaining[0].id);
      return remaining;
    });
  }

  // API EXPORT
  async function exportCurrentToCSV() {
    if (!rows.length) return;

    const payload = {
      vehicleLabel: currentVehicleLabel,
      month: currentMonth,
      monthLabel: currentMonthLabel,
      rows,
    };

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Export error", await res.text());
        alert("Nepodarilo sa vytvoriť export (API chyba).");
        return;
      }

      const blob = await res.blob();

      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="(.+?)"/i);
      const fallbackName = "evidencia-export.csv";
      const filename = match?.[1] ?? fallbackName;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Chyba pri exporte (sieť alebo server).");
    }
  }

  // TLAČ / PDF – aktuálne vozidlo + mesiac
  function printCurrent() {
    const filledRows = rows.filter((r) => {
      return (
        r.startKm != null ||
        r.endKm != null ||
        r.diff != null ||
        r.consumption != null ||
        r.fuelRemaining != null ||
        r.refuel != null || // NOVÉ
        (r.route && r.route.trim() !== "") ||
        (r.note && r.note.trim() !== "")
      );
    });

    if (filledRows.length === 0) {
      alert("Nie je čo tlačiť – žiadne vyplnené riadky.");
      return;
    }

    const title = `Evidencia jázd – ${currentVehicleLabel} – ${currentMonthLabel}`;

    const tableRowsHtml = filledRows
      .map((r) => {
        return `
          <tr>
            <td>${r.day}.</td>
            <td>${r.startKm ?? ""}</td>
            <td>${r.endKm ?? ""}</td>
            <td>${r.diff ?? ""}</td>
            <td>${r.consumption ?? ""}</td>
            <td>${r.fuelRemaining ?? ""}</td>
            <td>${r.refuel ?? ""}</td>
            <td>${(r.route ?? "").replace(/</g, "&lt;")}</td>
            <td>${(r.note ?? "").replace(/</g, "&lt;")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      margin: 20px;
      color: #111827;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 4px;
    }
    .meta {
      font-size: 12px;
      margin-bottom: 12px;
      color: #4b5563;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 4px 6px;
      text-align: left;
    }
    th {
      background: #e5e7eb;
      font-size: 11px;
      text-transform: uppercase;
    }
    tfoot td {
      font-weight: 600;
      background: #f3f4f6;
    }
    .text-right {
      text-align: right;
    }
    @media print {
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    Vytvorené: ${new Date().toLocaleString("sk-SK")}
  </div>

  <table>
    <thead>
      <tr>
        <th>Deň</th>
        <th>Tachometer začiatok</th>
        <th>Tachometer koniec</th>
        <th>Najazdené km</th>
        <th>Spotreba</th>
        <th>Zostatok nafty (L)</th>
        <th>Tankovanie (L)</th>
        <th>Trasa</th>
        <th>Poznámka</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">Spolu km za mesiac</td>
        <td class="text-right">${totalKm}</td>
        <td colspan="5"></td>
      </tr>
    </tfoot>
  </table>

  <button onclick="window.print()">Tlačiť / Uložiť ako PDF</button>
</body>
</html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Prehliadač zablokoval okno na tlač. Povolené vyskakovacie okná?");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }

  // ====== LOGIN OBRAZOVKA ======
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-xs rounded-xl bg-white p-6 shadow-lg border border-zinc-200"
        >
          <h1 className="mb-4 text-lg font-semibold text-center">
            Evidencia jázd
          </h1>
          <p className="mb-4 text-xs text-zinc-500 text-center">
            Zadaj heslo pre prístup k aplikácii.
          </p>
          <input
            type="password"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 mb-3"
            placeholder="Heslo"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full rounded-full bg-zinc-900 text-white py-2 text-sm font-semibold hover:bg-zinc-800"
          >
            Prihlásiť sa
          </button>
        </form>
      </div>
    );
  }

// ====== HLAVNÁ APPKA ======
      return (
  <div className="min-h-screen bg-zinc-50 text-zinc-900">
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
        {/* HLAVIČKA */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Evidencia jázd – {currentVehicleLabel}
            </h1>
            <div className="text-sm text-zinc-600">{currentMonthLabel}</div>
          </div>

          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            {/* výber vozidla */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm">Vozidlo:</span>
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs sm:text-sm text-zinc-900"
                value={currentVehicleId}
                onChange={(e) => setCurrentVehicleId(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* výber mesiaca */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm">Mesiac:</span>
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs sm:text-sm text-zinc-900"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* INFO */}
          <div className="mb-4 text-xs text-zinc-600 sm:text-sm">
            Dáta sa ukladajú pre každé vozidlo a mesiac zvlášť (v tomto
            prehliadači).
          </div>

        {/* SPRÁVA VOZIDIEL */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
          {/* aktuálne vozidlo */}
          <div className="w-full sm:w-1/2">
            <div className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm">
              {currentVehicleLabel}
            </div>
          </div>

          {/* pridať nové vozidlo */}
          <div className="w-full sm:w-1/2">
            <div className="mb-1 text-[11px] font-semibold uppercase text-zinc-500">
              Pridať nové vozidlo
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                value={newVehicleName}
                placeholder="Napr. Škoda Octavia KE123AB"
                onChange={(e) => setNewVehicleName(e.target.value)}
              />
              <button
                className="rounded border border-zinc-300 px-3 py-2 text-xs sm:text-sm hover:bg-zinc-100"
                onClick={handleAddVehicle}
              >
                Pridať
              </button>
            </div>
          </div>
        </div>

        {/* AKCIE */}
        <div className="mb-4 flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap">
          <button
            className="w-full sm:w-auto rounded-full border border-zinc-300 px-4 py-2 font-semibold hover:bg-zinc-100"
            onClick={exportCurrentToCSV}
          >
            Exportovať (CSV)
          </button>
          <button
            className="w-full sm:w-auto rounded-full border border-zinc-300 px-4 py-2 font-semibold hover:bg-zinc-100"
            onClick={printCurrent}
          >
            Tlačiť / PDF
          </button>
          <button
            className="w-full sm:w-auto rounded-full border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50"
            onClick={handleDeleteCurrentVehicle}
          >
            Zmazať aktuálne vozidlo
          </button>
        </div>

        {/* SUMÁR MESIACA */}
        <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-zinc-600">Spolu km za mesiac</span>
            <span className="font-semibold">{show(totalKm)} km</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-zinc-600">Počet vyplnených dní</span>
            <span className="font-semibold">{filledRowsCount}</span>
          </div>
        </div>

        {/* MOBILNÝ LAYOUT – KARTIČKY */}
        <div className="space-y-3 pb-4 md:hidden">
          {rows.map((r, i) => (
            <div
              key={r.day}
              className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Deň {r.day}.</span>
                {r.diff != null && (
                  <span className="text-xs text-zinc-500">
                    Najazdené:{" "}
                    <span className="font-semibold">{r.diff} km</span>
                  </span>
                )}
              </div>

              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] text-zinc-500">
                    Tachometer začiatok
                  </div>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                    value={r.startKm ?? ""}
                    onChange={(e) => updateRow(i, "startKm", e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">
                    Tachometer koniec
                  </div>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                    value={r.endKm ?? ""}
                    onChange={(e) => updateRow(i, "endKm", e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">Najazdené km</div>
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-right text-sm text-zinc-900"
                  value={r.diff ?? ""}
                  onChange={(e) => updateRow(i, "diff", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">Spotreba</div>
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-right text-sm text-zinc-900"
                  value={r.consumption ?? ""}
                  onChange={(e) => updateRow(i, "consumption", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">
                  Zostatok nafty (L)
                </div>
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-right text-sm text-zinc-900"
                  value={r.fuelRemaining ?? ""}
                  onChange={(e) =>
                    updateRow(i, "fuelRemaining", e.target.value)
                  }
                  inputMode="numeric"
                />
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">Tankovanie (L)</div>
                <input
                  type="number"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-right text-sm text-zinc-900"
                  value={r.refuel ?? ""}
                  onChange={(e) => updateRow(i, "refuel", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">Poznámka</div>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                  value={r.note}
                  onChange={(e) => updateRow(i, "note", e.target.value)}
                />
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">Trasa</div>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                  value={r.route}
                  onChange={(e) => updateRow(i, "route", e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold">
            Spolu km za mesiac:{" "}
            <span className="font-bold">{show(totalKm)} km</span>
          </div>
        </div>

        {/* DESKTOP TABUĽKA */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-full border border-blue-200 rounded-xl overflow-hidden text-sm">
              <thead
                className="
                  bg-gradient-to-r
                  from-rose-500
                  via-purple-600
                  to-blue-600
                  text-white text-xs uppercase font-semibold shadow
                "
              >
                <tr>
                  <th className="border border-blue-200 px-2 py-2 w-[50px] rounded-tl-xl">
                    Deň
                  </th>
                  <th className="border border-blue-200 px-2 py-2 w-[110px]">
                    Tachometer začiatok
                  </th>
                  <th className="border border-blue-200 px-2 py-2 w-[110px]">
                    Tachometer koniec
                  </th>
                  <th className="border border-blue-200 px-2 py-2 w-[110px]">
                    Najazdené km
                  </th>
                  <th className="border border-blue-200 px-2 py-2 w-[110px]">
                    Spotreba
                  </th>
                  <th className="border border-blue-200 px-2 py-2 w-[130px]">
                    Zostatok nafty (L)
                  </th>
                  <th className="border border-blue-200 px-2 py-2 w-[130px]">
                    Tankovanie (L)
                  </th>
                  <th className="border border-blue-200 px-2 py-2">
                    Trasa
                  </th>
                  <th className="border border-blue-200 px-2 py-2 rounded-tr-xl">
                    Poznámka
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {rows.map((r, i) => (
                  <tr
                    key={r.day}
                    className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}
                  >
                    <td className="border border-blue-200 px-2 py-1 w-[50px]">
                      {r.day}.
                    </td>

                    <td className="border border-blue-200 px-2 py-1 w-[110px]">
                      <input
                        type="number"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-zinc-900"
                        value={r.startKm ?? ""}
                        onChange={(e) =>
                          updateRow(i, "startKm", e.target.value)
                        }
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1 w-[110px]">
                      <input
                        type="number"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-zinc-900"
                        value={r.endKm ?? ""}
                        onChange={(e) =>
                          updateRow(i, "endKm", e.target.value)
                        }
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1 w-[110px]">
                      <input
                        type="number"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-right text-zinc-900"
                        value={r.diff ?? ""}
                        onChange={(e) => updateRow(i, "diff", e.target.value)}
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1 w-[110px]">
                      <input
                        type="number"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-right text-zinc-900"
                        value={r.consumption ?? ""}
                        onChange={(e) =>
                          updateRow(i, "consumption", e.target.value)
                        }
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1 w-[130px]">
                      <input
                        type="number"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-right text-zinc-900"
                        value={r.fuelRemaining ?? ""}
                        onChange={(e) =>
                          updateRow(i, "fuelRemaining", e.target.value)
                        }
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1 w-[130px]">
                      <input
                        type="number"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-right text-zinc-900"
                        value={r.refuel ?? ""}
                        onChange={(e) =>
                          updateRow(i, "refuel", e.target.value)
                        }
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-zinc-900"
                        value={r.route}
                        onChange={(e) =>
                          updateRow(i, "route", e.target.value)
                        }
                      />
                    </td>

                    <td className="border border-blue-200 px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded-md border border-blue-200 px-1 py-0.5 text-zinc-900"
                        value={r.note}
                        onChange={(e) =>
                          updateRow(i, "note", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-zinc-100 font-semibold">
                  <td
                    className="border border-blue-200 px-2 py-2 rounded-bl-xl"
                    colSpan={3}
                  >
                    Spolu km za mesiac
                  </td>
                  <td className="border border-blue-200 px-2 py-2 text-right">
                    {show(totalKm)}
                  </td>
                  <td
                    className="border border-blue-200 px-2 py-2 rounded-br-xl"
                    colSpan={3}
                  ></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
