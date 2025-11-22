export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  return Response.json({
    report: "monthly",
    year,
    month,
  });
}
