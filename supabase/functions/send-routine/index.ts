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

    default:
      return null;
  }
}

Deno.serve(async (_req) => {
  try {
    const now = new Date();
    // KST = UTC+9
    const kstHours = (now.getUTCHours() + 9) % 24;
    const kstMinutes = now.getUTCMinutes();
    // 요일: 1=월 ~ 7=일
    const utcDay = now.getUTCDay(); // 0=일
    const kstDay = utcDay === 0 ? 7 : utcDay;
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

      await sendTelegram(messages.join("\n\n"));

      await supabase.from("send_logs").insert({
        routine_id: routine.id,
        status: "success",
        message: `sent ${activeActions.length} actions`,
      });
    }

    return new Response(JSON.stringify({ message: "done" }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
