"use client";

import { useEffect, useState } from "react";
import { show } from "./lib/show";

type DayRow = {
  day: number;
  startKm: number | null;
  endKm: number | null;
  diff: number | null;
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
    route: "",
    note: "",
  }));
}

export default function HomePage() {
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
    } catch {}

    const defaultVehicle: Vehicle = { id: "vozidlo-1", label: "Vozidlo 1" };
    setVehicles([defaultVehicle]);
    setCurrentVehicleId(defaultVehicle.id);
  }, []);

  // ukladanie vozidiel
  useEffect(() => {
    if (!vehicles.length) return;
    try {
      window.localStorage.setItem(
        VEHICLES_STORAGE_KEY,
        JSON.stringify(vehicles)
      );
    } catch {}
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
    } catch {}
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

      // ručný zápis najazdených km
      if (field === "diff") {
        const num = value === "" ? null : Number(value.replace(",", "."));
        row.diff = Number.isNaN(num) ? null : num;
      }

      // textové polia
      if (field === "route" || field === "note") {
        (row as any)[field] = value;
      }

      copy[index] = row;
      return copy;
    });
  }

  const totalKm = rows.reduce((sum, r) => sum + (r.diff ?? 0), 0);

  const currentVehicle =
    vehicles.find((v) => v.id === currentVehicleId) ?? null;

  const currentVehicleLabel = currentVehicle?.label ?? "Vozidlo";

  const currentMonthLabel =
    MONTHS.find((m) => m.id === currentMonth)?.label ?? `Mesiac ${currentMonth}`;

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

  // EXPORT CSV – aktuálne vozidlo + mesiac
  function exportCurrentToCSV() {
    if (!rows.length) return;

    const vehLabelSafe = currentVehicleLabel
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const filename = `evidencia-${vehLabelSafe || "vozidlo"}-${currentMonth}.csv`;

    const header = [
      "Deň",
      "Tachometer začiatok",
      "Tachometer koniec",
      "Najazdené km",
      "Trasa / účel",
      "Poznámka",
    ];

    const lines: string[] = [];
    lines.push(header.join(";"));

    rows.forEach((r) => {
      const hasData =
        r.startKm != null ||
        r.endKm != null ||
        r.diff != null ||
        (r.route && r.route.trim() !== "") ||
        (r.note && r.note.trim() !== "");

      if (!hasData) return;

      const values = [
        `${r.day}. ${currentMonthLabel}`,
        r.startKm ?? "",
        r.endKm ?? "",
        r.diff ?? "",
        r.route ?? "",
        r.note ?? "",
      ];

      const line = values
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
      lines.push(line);
    });

    if (lines.length <= 1) {
      alert("Nie je čo exportovať – žiadne vyplnené riadky.");
      return;
    }

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // TLAČ / PDF – aktuálne vozidlo + mesiac
  function printCurrent() {
    const filledRows = rows.filter((r) => {
      return (
        r.startKm != null ||
        r.endKm != null ||
        r.diff != null ||
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
      button {
        display: none;
      }
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
        <th>Trasa / účel</th>
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
        <td colspan="2"></td>
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
    } catch {}

    setVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== currentVehicleId);
      if (remaining.length === 0) {
        const def: Vehicle = { id: "vozidlo-1", label: "Vozidlo 1" };
        setCurrentVehicleId(def.id);
        return [def];
      }
      setCurrentVehicleId(remaining[0].id);
      return remaining;
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
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
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs sm:text-sm"
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
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs sm:text-sm"
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
        <div className="mb-4 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
          Dáta sa ukladajú pre každé vozidlo a mesiac zvlášť (v tomto prehliadači).
        </div>

        {/* SPRÁVA VOZIDIEL */}
        <div className="mb-4 grid gap-3 sm:mb-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-zinc-500">
              Aktuálne vozidlo
            </div>
            <div className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm">
              {currentVehicleLabel}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-zinc-500">
              Pridať nové vozidlo
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                value={newVehicleName}
                placeholder="Napr. Škoda Octavia KE123AB"
                onChange={(e) => setNewVehicleName(e.target.value)}
              />
              <button
                className="rounded border border-zinc-300 px-3 py-1 text-xs sm:text-sm hover:bg-zinc-100"
                onClick={handleAddVehicle}
              >
                Pridať
              </button>
            </div>
          </div>
        </div>

        {/* AKCIE */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <button
            className="rounded-full border border-zinc-300 px-4 py-1 font-semibold hover:bg-zinc-100"
            onClick={exportCurrentToCSV}
          >
            Exportovať (CSV)
          </button>
          <button
            className="rounded-full border border-zinc-300 px-4 py-1 font-semibold hover:bg-zinc-100"
            onClick={printCurrent}
          >
            Tlačiť / PDF
          </button>
          <button
            className="rounded-full border border-red-300 px-4 py-1 font-semibold text-red-700 hover:bg-red-50"
            onClick={handleDeleteCurrentVehicle}
          >
            Zmazať aktuálne vozidlo
          </button>
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
                    Najazdené: <span className="font-semibold">{r.diff} km</span>
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
                    className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
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
                    className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
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
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-right text-sm"
                  value={r.diff ?? ""}
                  onChange={(e) => updateRow(i, "diff", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="mb-2">
                <div className="text-[11px] text-zinc-500">Trasa / účel</div>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                  value={r.route}
                  onChange={(e) => updateRow(i, "route", e.target.value)}
                />
              </div>

              <div>
                <div className="text-[11px] text-zinc-500">Poznámka</div>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                  value={r.note}
                  onChange={(e) => updateRow(i, "note", e.target.value)}
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
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs uppercase">
                <tr>
                  <th className="border-b px-2 py-2">Deň</th>
                  <th className="border-b px-2 py-2">Tachometer začiatok</th>
                  <th className="border-b px-2 py-2">Tachometer koniec</th>
                  <th className="border-b px-2 py-2">Najazdené km</th>
                  <th className="border-b px-2 py-2">Trasa / účel</th>
                  <th className="border-b px-2 py-2">Poznámka</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.day}>
                    <td className="border-b px-2 py-1">{r.day}.</td>

                    <td className="border-b px-2 py-1">
                      <input
                        type="number"
                        className="w-full rounded border px-1 py-0.5"
                        value={r.startKm ?? ""}
                        onChange={(e) =>
                          updateRow(i, "startKm", e.target.value)
                        }
                      />
                    </td>

                    <td className="border-b px-2 py-1">
                      <input
                        type="number"
                        className="w-full rounded border px-1 py-0.5"
                        value={r.endKm ?? ""}
                        onChange={(e) =>
                          updateRow(i, "endKm", e.target.value)
                        }
                      />
                    </td>

                    <td className="border-b px-2 py-1">
                      <input
                        type="number"
                        className="w-full rounded border px-1 py-0.5 text-right"
                        value={r.diff ?? ""}
                        onChange={(e) => updateRow(i, "diff", e.target.value)}
                      />
                    </td>

                    <td className="border-b px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded border px-1 py-0.5"
                        value={r.route}
                        onChange={(e) =>
                          updateRow(i, "route", e.target.value)
                        }
                      />
                    </td>

                    <td className="border-b px-2 py-1">
                      <input
                        type="text"
                        className="w-full rounded border px-1 py-0.5"
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
                  <td className="px-2 py-2" colSpan={3}>
                    Spolu km za mesiac
                  </td>
                  <td className="px-2 py-2 text-right">{show(totalKm)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
