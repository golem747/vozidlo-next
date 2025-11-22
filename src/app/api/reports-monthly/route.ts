// src/app/api/reports-monthly/route.ts
type Vehicle = { id: string; plate: string; name: string };
type OdoLog = { vehicleId: string; at: string; odometer: number };
type FuelLog = { vehicleId: string; at: string; liters: number; priceTotal: number };

const vehicles: Vehicle[] = [
  { id: "v1", plate: "MT123AB", name: "Octavia" },
  { id: "v2", plate: "ZA987XY", name: "Transit" },
];

const odoLogs: OdoLog[] = [
  { vehicleId: "v1", at: "2025-10-31", odometer: 100000 },
  { vehicleId: "v1", at: "2025-11-30", odometer: 101250 },
  { vehicleId: "v2", at: "2025-10-31", odometer: 220000 },
  { vehicleId: "v2", at: "2025-12-01", odometer: 220510 }, // fallback za mesiac
];

const fuelLogs: FuelLog[] = [
  { vehicleId: "v1", at: "2025-11-05", liters: 25.2, priceTotal: 42.8 },
  { vehicleId: "v1", at: "2025-11-20", liters: 30.0, priceTotal: 51.2 },
  { vehicleId: "v2", at: "2025-11-10", liters: 40.0, priceTotal: 68.4 },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!year || !month || month < 1 || month > 12) {
    return Response.json(
      { error: "Chýba alebo je zlé ?year=YYYY&month=MM" },
      { status: 400 }
    );
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // posledný deň v mesiaci

  const items = vehicles.map((v) => {
    const before = odoLogs
      .filter((o) => o.vehicleId === v.id && new Date(o.at) < monthStart)
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))[0];

    const end =
      odoLogs
        .filter((o) => o.vehicleId === v.id && new Date(o.at) <= monthEnd)
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))[0] || before;

    const km = before && end ? Math.max(0, end.odometer - before.odometer) : 0;

    const fl = fuelLogs.filter(
      (f) =>
        f.vehicleId === v.id &&
        new Date(f.at) >= monthStart &&
        new Date(f.at) <= monthEnd
    );

    const liters = fl.reduce((s, x) => s + x.liters, 0);
    const cost = fl.reduce((s, x) => s + x.priceTotal, 0);

    return {
      vehicleId: v.id,
      plate: v.plate,
      name: v.name,
      km,
      liters: +liters.toFixed(2),
      cost: +cost.toFixed(2),
      l_per_100: km > 0 ? +((liters / km) * 100).toFixed(2) : null,
      avg_price_per_liter: liters > 0 ? +((cost / liters)).toFixed(3) : null,
    };
  });

  const sum = items.reduce(
    (a, x) => ({
      km: a.km + x.km,
      liters: a.liters + x.liters,
      cost: a.cost + x.cost,
    }),
    { km: 0, liters: 0, cost: 0 }
  );

  return Response.json({
    year,
    month,
    items,
    summary: {
      km: sum.km,
      liters: +sum.liters.toFixed(2),
      cost: +sum.cost.toFixed(2),
      l_per_100:
        sum.km > 0 ? +((sum.liters / sum.km) * 100).toFixed(2) : null,
      avg_price_per_liter:
        sum.liters > 0 ? +((sum.cost / sum.liters)).toFixed(3) : null,
    },
  });
}
