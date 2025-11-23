import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const vehicleLabel: string = body.vehicleLabel ?? "vozidlo";
    const month: number = body.month ?? 0;
    const monthLabel: string = body.monthLabel ?? `Mesiac ${month}`;
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

    // hlavička CSV
    const header = [
      "Deň",
      "Tachometer začiatok",
      "Tachometer koniec",
      "Najazdené km",
      "Spotreba",
      "Zostatok nafty (L)",
      "Trasa",
      "Poznámka",
    ];

    const lines: string[] = [];
    lines.push(header.join(";"));

    for (const r of rows) {
      const hasData =
        r.startKm != null ||
        r.endKm != null ||
        r.diff != null ||
        r.consumption != null ||
        r.fuelRemaining != null ||
        (r.route && String(r.route).trim() !== "") ||
        (r.note && String(r.note).trim() !== "");

      if (!hasData) continue;

      const values = [
        `${r.day}. ${monthLabel}`,
        r.startKm ?? "",
        r.endKm ?? "",
        r.diff ?? "",
        r.consumption ?? "",
        r.fuelRemaining ?? "",
        r.route ?? "",
        r.note ?? "",
      ];

      const line = values
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
      lines.push(line);
    }

    const csvContent = lines.join("\r\n");

    const safeVehicle = vehicleLabel
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const filename = `evidencia-${safeVehicle || "vozidlo"}-${month}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("API export error:", err);
    return new NextResponse("Export error", { status: 500 });
  }
}
