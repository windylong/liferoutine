import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=ko-KR&region=KR&newsCount=0&listsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();

    const results = (data.quotes || [])
      .filter((q: any) => q.symbol && (q.symbol.endsWith(".KS") || q.symbol.endsWith(".KQ")))
      .map((q: any) => ({
        code: q.symbol.replace(".KS", "").replace(".KQ", "").padStart(6, "0"),
        name: q.shortname || q.longname || q.symbol,
        market: q.symbol.endsWith(".KS") ? "KOSPI" : "KOSDAQ",
        sector: q.sector || q.industry || "",
      }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
