import { getWeatherMessage, extractCity } from "../_shared/weather.ts";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const DEFAULT_CITY = "Seoul";

async function sendTelegram(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = message.chat?.id;
    const text: string = message.text || "";
    if (!text || !chatId) return new Response("ok", { status: 200 });

    // 날씨 요청 감지
    const city = extractCity(text, DEFAULT_CITY);
    if (city) {
      const weatherMsg = await getWeatherMessage(city);
      await sendTelegram(chatId, weatherMsg);
      return new Response("ok", { status: 200 });
    }

    // 도움말
    if (text === "/start" || text === "/help" || text.includes("도움말")) {
      await sendTelegram(chatId,
        `안녕하세요! 루틴봇입니다 🔔\n\n` +
        `<b>날씨 조회 방법:</b>\n` +
        `• <code>날씨</code> — 서울 날씨\n` +
        `• <code>부산 날씨</code> — 부산 날씨\n` +
        `• <code>날씨 도쿄</code> — 도쿄 날씨\n\n` +
        `루틴 알람은 설정된 시간에 자동으로 전송됩니다.`
      );
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("ok", { status: 200 });
  }
});
