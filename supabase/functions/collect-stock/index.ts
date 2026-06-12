import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("APP_SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("APP_SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 야후 파이낸스 주가 조회 ──────────────────────────────
async function fetchQuote(symbol: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes = result.indicators?.quote?.[0]?.close;
    const prev = closes?.[closes.length - 2];
    const curr = closes?.[closes.length - 1];
    if (!prev || !curr) return null;

    const change = curr - prev;
    const changePct = (change / prev) * 100;
    return { symbol, price: curr, change, changePct };
  } catch { return null; }
}

// ── Google News RSS 뉴스 수집 (안정적 접근 보장) ─────────
async function fetchGoogleNews(query: string, limit = 10): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
    });
    const xml = await res.text();
    const titles: string[] = [];
    // Google News RSS uses <title> tags (sometimes CDATA, sometimes plain)
    const regex = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g;
    let match;
    let count = 0;
    while ((match = regex.exec(xml)) !== null && count < limit) {
      const title = (match[1] || match[2] || "").trim();
      // 첫 번째 <title>은 채널 제목이므로 스킵
      if (title && !title.startsWith("Google") && title.length > 5) {
        titles.push(title);
        count++;
      }
    }
    return titles;
  } catch (e) {
    console.error("fetchGoogleNews error:", e);
    return [];
  }
}

// ── Claude API 분석 ─────────────────────────────────────
async function analyzeWithClaude(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── 오전 수집: 미국장 마감 + 뉴스 + 예측 ───────────────
async function collectMorning(watchlist: { code: string; name: string }[]) {
  // 1. 미국 시장 지수
  const [sp500, nasdaq, dow] = await Promise.all([
    fetchQuote("^GSPC"),
    fetchQuote("^IXIC"),
    fetchQuote("^DJI"),
  ]);

  // 2. 관심 종목 전날 마감가
  const watchlistData: any[] = [];
  for (const item of watchlist) {
    const q = await fetchQuote(`${item.code}.KS`) || await fetchQuote(`${item.code}.KQ`);
    if (q) watchlistData.push({ code: item.code, name: item.name, ...q });
  }

  // 3. Google News RSS로 뉴스 수집 (3개 쿼리 병렬)
  const [kospiNews, stockNews, usMarketNews] = await Promise.all([
    fetchGoogleNews("코스피 증시", 8),
    fetchGoogleNews("한국 주식 시장", 8),
    fetchGoogleNews("미국 증시 나스닥", 6),
  ]);
  const allNews = [...new Set([...kospiNews, ...stockNews, ...usMarketNews])]; // 중복 제거

  // 4. Claude 분석
  const usMarketSummary = [
    sp500 ? `S&P500: ${sp500.price.toFixed(0)} (${sp500.changePct > 0 ? "+" : ""}${sp500.changePct.toFixed(2)}%)` : "",
    nasdaq ? `나스닥: ${nasdaq.price.toFixed(0)} (${nasdaq.changePct > 0 ? "+" : ""}${nasdaq.changePct.toFixed(2)}%)` : "",
    dow ? `다우: ${dow.price.toFixed(0)} (${dow.changePct > 0 ? "+" : ""}${dow.changePct.toFixed(2)}%)` : "",
  ].filter(Boolean).join("\n");

  // 종목코드 + 이름 함께 표시
  const watchlistSummary = watchlistData
    .map(w => `${w.name}(${w.code}): ${w.price?.toFixed(0)}원 (${w.changePct > 0 ? "+" : ""}${w.changePct?.toFixed(2)}%)`)
    .join("\n");

  const newsText = allNews.slice(0, 20).join("\n");

  const prompt = `당신은 한국 주식시장 전문 애널리스트입니다. 아래 데이터를 분석해서 오늘 한국 증시를 예측해주세요.

## 미국 시장 전날 마감
${usMarketSummary}

## 관심 종목 전날 마감 (이름(코드): 가격)
${watchlistSummary || "없음"}

## 최근 뉴스 헤드라인
${newsText || "뉴스 없음"}

## 요청사항 (반드시 아래 JSON 형식으로만 답변, 종목은 코드 대신 이름으로):
{
  "kospi_prediction": "상승" | "하락" | "보합",
  "kospi_reason": "예측 근거 50자 이내",
  "kospi_news_summary": "코스피 관련 주요 뉴스 요약 50자 이내",
  "us_market_summary": "미국 시장 요약 30자 이내",
  "watchlist": [
    {
      "name": "종목명 (한글)",
      "prediction": "상승" | "하락" | "보합",
      "reason": "근거 30자 이내"
    }
  ]
}`;

  const analysisText = await analyzeWithClaude(prompt);

  let analysis: any = {};
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
  } catch { analysis = { raw: analysisText }; }

  // 5. DB 저장
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  await supabase.from("stock_analysis").upsert({
    analysis_type: "morning",
    analysis_date: today,
    raw_data: { us_market: { sp500, nasdaq, dow }, watchlist: watchlistData, news: allNews },
    analysis,
  }, { onConflict: "analysis_type,analysis_date" });

  return { analysis, raw_data: { sp500, nasdaq, dow } };
}

// ── 오후 수집: 마감가 + 예측 비교 ──────────────────────
async function collectAfternoon(watchlist: { code: string; name: string }[]) {
  // 1. 오늘 코스피/코스닥 마감
  const [kospi, kosdaq] = await Promise.all([
    fetchQuote("^KS11"),
    fetchQuote("^KQ11"),
  ]);

  // 2. 관심 종목 마감가
  const watchlistData: any[] = [];
  for (const item of watchlist) {
    const q = await fetchQuote(`${item.code}.KS`) || await fetchQuote(`${item.code}.KQ`);
    if (q) watchlistData.push({ code: item.code, name: item.name, ...q });
  }

  // 3. 오전 예측 조회
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const { data: morningData } = await supabase
    .from("stock_analysis")
    .select("analysis")
    .eq("analysis_type", "morning")
    .eq("analysis_date", today)
    .single();

  const morningAnalysis = morningData?.analysis;

  // 4. Claude 비교 분석
  const actualKospi = kospi
    ? `코스피: ${kospi.price.toFixed(0)} (${kospi.changePct > 0 ? "+" : ""}${kospi.changePct.toFixed(2)}%)`
    : "데이터 없음";

  const watchlistActual = watchlistData
    .map(w => `${w.name}(${w.code}): ${w.price?.toFixed(0)}원 (${w.changePct > 0 ? "+" : ""}${w.changePct?.toFixed(2)}%)`)
    .join("\n");

  const morningWatchlist = (morningAnalysis?.watchlist || [])
    .map((w: any) => `${w.name || w.code}: ${w.prediction}`)
    .join(", ");

  const prompt = `한국 주식시장 오전 예측과 실제 결과를 비교 분석해주세요.

## 오전 예측
코스피 예측: ${morningAnalysis?.kospi_prediction || "없음"}
예측 근거: ${morningAnalysis?.kospi_reason || "없음"}
관심 종목 예측: ${morningWatchlist || "없음"}

## 실제 마감 결과
${actualKospi}
관심 종목 실제 (이름(코드): 등락):
${watchlistActual || "없음"}

## 요청사항 (반드시 아래 JSON 형식으로만 답변, 종목은 이름으로):
{
  "accuracy": "적중" | "부분적중" | "빗나감",
  "accuracy_reason": "정확도 분석 50자 이내",
  "difference_reason": "예측과 차이난 이유 50자 이내",
  "watchlist_accuracy": [
    {
      "name": "종목명 (한글)",
      "actual": "상승" | "하락" | "보합",
      "accuracy": "적중" | "빗나감"
    }
  ]
}`;

  const analysisText = await analyzeWithClaude(prompt);

  let analysis: any = {};
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
  } catch { analysis = { raw: analysisText }; }

  // 5. DB 저장
  await supabase.from("stock_analysis").upsert({
    analysis_type: "afternoon",
    analysis_date: today,
    raw_data: { kospi, kosdaq, watchlist: watchlistData },
    analysis,
  }, { onConflict: "analysis_type,analysis_date" });

  return { analysis, kospi, kosdaq };
}

// ── 메인 ────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type || "morning"; // "morning" | "afternoon"

    // 관심 종목 조회 (코드 + 이름 함께)
    const { data: watchlistRows } = await supabase
      .from("stock_watchlist")
      .select("code, name")
      .eq("is_active", true);
    const watchlist = (watchlistRows || []) as { code: string; name: string }[];

    let result;
    if (type === "morning") {
      result = await collectMorning(watchlist);
    } else {
      result = await collectAfternoon(watchlist);
    }

    return new Response(JSON.stringify({ ok: true, type, result }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
