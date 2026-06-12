import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type ActionType =
  | "youtube_latest"
  | "news_article"
  | "wake_alarm"
  | "weather_briefing"
  | "custom_message"
  | "stock_summary"
  | "weekly_report";

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  youtube_latest: "▶️ 유튜브 최신 영상",
  news_article: "📰 오늘의 기사",
  wake_alarm: "⏰ 기상 알람",
  weather_briefing: "🌤️ 날씨 브리핑",
  custom_message: "💬 커스텀 메시지",
  stock_summary: "📈 증시 브리핑",
  weekly_report: "📊 주간 리포트",
};

export type Routine = {
  id: string;
  name: string;
  scheduled_time: string;
  days_of_week: number[];
  is_active: boolean;
  created_at: string;
  actions?: Action[];
};

export type Action = {
  id: string;
  routine_id: string;
  action_type: ActionType;
  label: string;
  config: Record<string, any>;
  order_index: number;
  is_active: boolean;
};

export const DAY_LABELS: Record<number, string> = {
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
  7: "일",
};
