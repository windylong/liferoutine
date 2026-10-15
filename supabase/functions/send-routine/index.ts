import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWeatherMessage } from "../_shared/weather.ts";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;
const SUPABASE_URL = Deno.env.get("APP_SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("APP_SUPABASE_SERVICE_ROLE_KEY")!;
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 텔레그램 메시지 전송
async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
  });
}

// 액션 타입별 메시지 생성
async function buildMessage(action: any): Promise<string | null> {
  const { action_type, label, config } = action;

  switch (action_type) {
    case "youtube_latest": {
      try {
        // 채널 handle로 channel ID 조회
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${config.channel_id || ""}&order=date&maxResults=1&type=video&key=${YOUTUBE_API_KEY}`
        );

        // channel_id가 없으면 handle로 채널 검색
        if (!config.channel_id) {
          const handleRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${config.channel_handle}&key=${YOUTUBE_API_KEY}`
          );
          const handleData = await handleRes.json();
          const channelId = handleData.items?.[0]?.id;
          if (!channelId) return `▶️ <b>${label || config.channel_handle}</b>\n채널을 찾을 수 없습니다.`;

          const videoRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${YOUTUBE_API_KEY}`
          );
          const videoData = await videoRes.json();
          const video = videoData.items?.[0];
          if (!video) return `▶️ <b>${label || config.channel_handle}</b>\n최신 영상 없음`;

          const videoId = video.id.videoId;
          const title = video.snippet.title;
          return `▶️ <b>${label || video.snippet.channelTitle}</b>\n${title}\nhttps://www.youtube.com/watch?v=${videoId}`;
        }

        const data = await searchRes.json();
        const video = data.items?.[0];
        if (!video) return `▶️ <b>${label || "유튜브"}</b>\n최신 영상 없음`;

        const videoId = video.id.videoId;
        const title = video.snippet.title;
        return `▶️ <b>${label || video.snippet.channelTitle}</b>\n${title}\nhttps://www.youtube.com/watch?v=${videoId}`;
      } catch (e) {
        return `▶️ <b>${label || "유튜브"}</b>\n영상 조회 실패`;
      }
    }

    case "news_article": {
      return `📰 <b>${label || "오늘의 기사"}</b>\n${config.url}`;
    }

    case "wake_alarm": {
      return `⏰ <b>${label || "기상 알람"}</b>\n${config.message || "일어날 시간입니다!"}`;
    }

    case "weather_briefing": {
      try {
        const city = config.city || "Seoul";
        return await getWeatherMessage(city, label);
      } catch (e) {
        return `🌤️ <b>${label || "날씨"}</b>\n날씨 정보를 불러오지 못했습니다.`;
      }
    }

    case "custom_message": {
      return `💬 <b>${label || "알림"}</b>\n${config.text}`;
    }

    case "news_briefing": {
      try {
        const category = config.category || "전체"; // 예: "경제", "IT", "전체"
        const query = config.query || "오늘의 뉴스 한국";
        const count = config.count || 5;

        // Google News RSS에서 뉴스 수집
        const encoded = encodeURIComponent(query);
        const url = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
            "Accept": "application/rss+xml, application/xml, text/xml",
          },
        });
        const xml = await res.text();

        // <item> 블록에서 title + description 추출
        const items: { title: string; desc: string }[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(xml)) !== null && items.length < 20) {
          const block = itemMatch[1];
          const titleMatch = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/);
          const descMatch = block.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>|<description>([^<]+)<\/description>/);
          const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
          const desc = (descMatch?.[1] || descMatch?.[2] || "").replace(/<[^>]+>/g, "").trim();
          if (title && title.length > 5) items.push({ title, desc });
        }

        if (items.length === 0) return `📰 <b>${label || "오늘의 뉴스"}</b>\n뉴스를 불러오지 못했습니다.`;

        // Claude로 상위 5개 선정 + 한줄 요약
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
        const newsText = items.slice(0, 15).map((it, i) => `${i + 1}. 제목: ${it.title}\n설명: ${it.desc || "없음"}`).join("\n\n");

        const prompt = `아래 뉴스 목록에서 오늘 가장 중요한 ${count}개를 선정하고, 각각 한줄로 요약해주세요.
독자는 바쁜 직장인으로, 핵심만 간결하게 전달해주세요.

${newsText}

반드시 아래 JSON 형식으로만 답변해주세요:
[
  { "title": "뉴스 제목 (원문 그대로)", "summary": "한줄 요약 40자 이내" },
  ...
]`;

        const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
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
        const apiData = await apiRes.json();
        const analysisText = apiData.content?.[0]?.text || "";

        let picks: { title: string; summary: string }[] = [];
        try {
          const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
          if (jsonMatch) picks = JSON.parse(jsonMatch[0]);
        } catch { /* fallback below */ }

        if (picks.length === 0) {
          // 파싱 실패 시 원문 제목만 표시
          picks = items.slice(0, count).map(it => ({ title: it.title, summary: it.desc.slice(0, 40) || "" }));
        }

        const today = new Date().toLocaleDateString("ko-KR", {
          timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short",
        });

        const lines = picks.map((p, i) => `${i + 1}. <b>${p.title}</b>\n    ${p.summary}`).join("\n\n");

        return (
          `📰 <b>${today} ${label || "오늘의 뉴스"}</b>${category !== "전체" ? ` (${category})` : ""}\n\n` +
          lines
        );
      } catch (e) {
        return `📰 <b>${label || "오늘의 뉴스"}</b>\n뉴스를 불러오지 못했습니다.`;
      }
    }

    case "stock_summary": {
      try {
        const summaryType = config.summary_type || "morning"; // "morning" | "afternoon"
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

        // 오늘 데이터 우선, 없으면 최근 3일 이내 데이터로 fallback
        let { data } = await supabase
          .from("stock_analysis")
          .select("analysis, raw_data, analysis_date")
          .eq("analysis_type", summaryType)
          .eq("analysis_date", today)
          .single();

        if (!data) {
          const { data: recent } = await supabase
            .from("stock_analysis")
            .select("analysis, raw_data, analysis_date")
            .eq("analysis_type", summaryType)
            .order("analysis_date", { ascending: false })
            .limit(1)
            .single();
          data = recent;
        }

        if (!data) return `📈 <b>${label || "증시 분석"}</b>\n아직 분석 데이터가 없습니다.`;

        const a = data.analysis;
        const raw = data.raw_data;

        const dateLabel = new Date((data as any).analysis_date || today).toLocaleDateString("ko-KR", {
          timeZone: "UTC",
          month: "long",
          day: "numeric",
          weekday: "short",
        });

        if (summaryType === "morning") {
          // 미국 시장
          const us = raw?.us_market;
          const usLines = [
            us?.sp500 ? `S&P500 ${us.sp500.changePct > 0 ? "▲" : "▼"} ${Math.abs(us.sp500.changePct).toFixed(2)}%` : "",
            us?.nasdaq ? `나스닥 ${us.nasdaq.changePct > 0 ? "▲" : "▼"} ${Math.abs(us.nasdaq.changePct).toFixed(2)}%` : "",
            us?.dow ? `다우 ${us.dow.changePct > 0 ? "▲" : "▼"} ${Math.abs(us.dow.changePct).toFixed(2)}%` : "",
          ].filter(Boolean).join(" | ");

          // 관심 종목
          const watchlistLines = (a?.watchlist || [])
            .map((w: any) => `• ${w.name || w.code}: ${w.prediction} — ${w.reason}`)
            .join("\n");

          return (
            `📈 <b>${dateLabel} ${label || "증시 브리핑"}</b>\n\n` +
            `🇺🇸 <b>미국 시장 마감</b>\n${usLines || "데이터 없음"}\n${a?.us_market_summary || ""}\n\n` +
            `🇰🇷 <b>코스피 예측</b>\n${a?.kospi_prediction || "?"} — ${a?.kospi_reason || ""}\n\n` +
            `📰 <b>주요 뉴스</b>\n${a?.kospi_news_summary || ""}\n\n` +
            (watchlistLines ? `🔍 <b>관심 종목</b>\n${watchlistLines}` : "")
          );
        } else {
          // 오후 리포트: 예측 vs 실제 비교 + 증시 분석
          const kospiMatchIcon = a?.kospi_match === "적중" ? "✅" : "❌";
          const kospiLine = `예측: ${a?.kospi_predicted || "?"} → 실제: ${a?.kospi_change_text || "?"} ${kospiMatchIcon}`;

          const watchlistLines = (a?.watchlist_accuracy || [])
            .map((w: any) => {
              const icon = w.match === "적중" ? "✅" : "❌";
              return `• ${w.name}: ${w.predicted} 예측 → ${w.change_text || w.actual} ${icon}`;
            })
            .join("\n");

          const parts = [
            `📊 <b>${dateLabel} 오늘의 증시 결과</b>`,
            `🇰🇷 <b>코스피</b>\n${kospiLine}`,
          ];

          if (watchlistLines) {
            parts.push(`🔍 <b>관심 종목</b>\n${watchlistLines}`);
          }

          if (a?.overall_accuracy) {
            parts.push(`🎯 종합 적중률: <b>${a.overall_accuracy}</b>`);
          }

          if (a?.market_analysis) {
            parts.push(`📈 <b>증시 분석</b>\n${a.market_analysis}`);
          }

          return parts.join("\n\n");
        }
      } catch (e) {
        return `📈 <b>${label || "증시 분석"}</b>\n데이터를 불러오지 못했습니다.`;
      }
    }

    case "weekly_report": {
      try {
        // 지난 7일 날짜 범위
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const startDate = sevenDaysAgo.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
        const endDate = today.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

        // 지난 7일간 afternoon 분석 조회 (예측 정확도 포함)
        const { data: afternoonList } = await supabase
          .from("stock_analysis")
          .select("analysis_date, analysis, raw_data")
          .eq("analysis_type", "afternoon")
          .gte("analysis_date", startDate)
          .lte("analysis_date", endDate)
          .order("analysis_date", { ascending: false });

        // 지난 7일간 morning 분석 조회 (코스피 예측 포함)
        const { data: morningList } = await supabase
          .from("stock_analysis")
          .select("analysis_date, analysis, raw_data")
          .eq("analysis_type", "morning")
          .gte("analysis_date", startDate)
          .lte("analysis_date", endDate)
          .order("analysis_date", { ascending: false });

        if (!afternoonList || afternoonList.length === 0) {
          return `📊 <b>${label || "주간 리포트"}</b>\n아직 분석 데이터가 충분하지 않아요.`;
        }

        // 정확도 집계
        const accuracyCounts = { 적중: 0, 부분적중: 0, 빗나감: 0 };
        for (const row of afternoonList) {
          const acc = row.analysis?.accuracy as string;
          if (acc in accuracyCounts) accuracyCounts[acc as keyof typeof accuracyCounts]++;
        }
        const total = afternoonList.length;

        // 코스피 평균 변동폭
        const kospiChanges = afternoonList
          .map((r: any) => r.raw_data?.kospi?.changePct)
          .filter((v: any) => v != null) as number[];
        const avgChange = kospiChanges.length > 0
          ? kospiChanges.reduce((a, b) => a + b, 0) / kospiChanges.length
          : null;

        // 관심 종목 적중률 집계
        const stockHits: Record<string, { hit: number; total: number }> = {};
        for (const row of afternoonList) {
          for (const w of (row.analysis?.watchlist_accuracy || [])) {
            const name = w.name || w.code;
            if (!stockHits[name]) stockHits[name] = { hit: 0, total: 0 };
            stockHits[name].total++;
            if (w.match === "적중" || w.accuracy === "적중") stockHits[name].hit++;
          }
        }
        const stockLines = Object.entries(stockHits)
          .sort((a, b) => (b[1].hit / b[1].total) - (a[1].hit / a[1].total))
          .map(([name, s]) => `• ${name}: ${s.hit}/${s.total}일 적중 (${Math.round(s.hit / s.total * 100)}%)`)
          .join("\n");

        // 주간 코스피 방향 (주간 상승/하락 비율)
        const upDays = kospiChanges.filter((c) => c > 0).length;
        const downDays = kospiChanges.filter((c) => c < 0).length;

        const accuracyRate = total > 0
          ? Math.round((accuracyCounts["적중"] + accuracyCounts["부분적중"] * 0.5) / total * 100)
          : 0;

        return (
          `📊 <b>${label || "주간 증시 리포트"}</b>\n` +
          `<i>${startDate} ~ ${endDate}</i>\n\n` +
          `🎯 <b>코스피 예측 정확도</b>\n` +
          `${total}일 분석 중 적중 ${accuracyCounts["적중"]}일, 부분적중 ${accuracyCounts["부분적중"]}일, 빗나감 ${accuracyCounts["빗나감"]}일\n` +
          `→ 종합 정확도 <b>${accuracyRate}%</b>\n\n` +
          `📈 <b>주간 코스피 흐름</b>\n` +
          `상승 ${upDays}일 / 하락 ${downDays}일` +
          (avgChange != null ? ` | 평균 ${avgChange > 0 ? "+" : ""}${avgChange.toFixed(2)}%` : "") + "\n\n" +
          (stockLines ? `🔍 <b>관심 종목 적중률</b>\n${stockLines}` : "")
        );
      } catch (e) {
        return `📊 <b>${label || "주간 리포트"}</b>\n데이터를 불러오지 못했습니다.`;
      }
    }

    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    // ── 테스트 모드: body에 { "test": "stock_morning" | "stock_afternoon" } ──
    const body = await req.json().catch(() => ({}));
    if (body.test === "stock_morning" || body.test === "stock_afternoon") {
      const summaryType = body.test === "stock_morning" ? "morning" : "afternoon";
      const msg = await buildMessage({ action_type: "stock_summary", label: "테스트 브리핑", config: { summary_type: summaryType } });
      if (msg) await sendTelegram(msg);
      return new Response(JSON.stringify({ message: "test sent", type: summaryType }), { status: 200 });
    }
    if (body.test === "weekly_report") {
      const msg = await buildMessage({ action_type: "weekly_report", label: "주간 리포트 테스트", config: {} });
      if (msg) await sendTelegram(msg);
      return new Response(JSON.stringify({ message: "test sent", type: "weekly_report" }), { status: 200 });
    }
    if (body.test === "news_briefing") {
      const msg = await buildMessage({ action_type: "news_briefing", label: "오늘의 뉴스", config: { query: body.query || "오늘의 뉴스 한국", count: body.count || 5 } });
      if (msg) await sendTelegram(msg);
      return new Response(JSON.stringify({ message: "test sent", type: "news_briefing" }), { status: 200 });
    }

    const now = new Date();
    // KST = UTC+9: KST 날짜 기준으로 시각과 요일 계산
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const kstHours = kstNow.getUTCHours();
    const kstMinutes = kstNow.getUTCMinutes();
    const kstDayUtc = kstNow.getUTCDay(); // KST 날짜 기준 요일 (0=일)
    const kstDay = kstDayUtc === 0 ? 7 : kstDayUtc; // 1=월 ~ 7=일
    const currentTime = `${String(kstHours).padStart(2, "0")}:${String(kstMinutes).padStart(2, "0")}`;

    // 현재 시간 + 오늘 요일에 맞는 활성 루틴 조회
    const { data: routines, error } = await supabase
      .from("routines")
      .select("*, actions(*)")
      .eq("is_active", true)
      .contains("days_of_week", [kstDay])
      .gte("scheduled_time", `${currentTime}:00`)
      .lt("scheduled_time", `${currentTime}:59`);

    if (error) throw error;
    if (!routines || routines.length === 0) {
      return new Response(JSON.stringify({ message: "no routines at this time" }), { status: 200 });
    }

    for (const routine of routines) {
      const messages: string[] = [`🔔 <b>${routine.name}</b>`];

      const activeActions = (routine.actions || [])
        .filter((a: any) => a.is_active)
        .sort((a: any, b: any) => a.order_index - b.order_index);

      for (const action of activeActions) {
        const msg = await buildMessage(action);
        if (msg) messages.push(msg);
      }

      const fullMessage = messages.join("\n\n");
      await sendTelegram(fullMessage);

      const { error: logError } = await supabase.from("send_logs").insert({
        routine_id: routine.id,
        status: "success",
        message: `sent ${activeActions.length} actions`,
        full_message: fullMessage,
        sent_at: new Date().toISOString(),
      });
      if (logError) console.error("[send_logs insert error]", JSON.stringify(logError));
    }

    return new Response(JSON.stringify({ message: "done" }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
