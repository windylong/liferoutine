"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type LogEntry = {
  id: string;
  routine_id: string;
  status: string;
  message: string;
  full_message?: string;
  created_at: string;
  routines?: { name: string; scheduled_time: string } | null;
};

const DUMMY_LOGS: LogEntry[] = [
  {
    id: "dummy-1",
    routine_id: "r1",
    status: "success",
    message: "sent 2 actions",
    full_message: `🔔 오전 루틴\n\n📈 오늘의 증시 브리핑\n\n🇺🇸 미국 시장 마감\nS&P500 ▲ 1.75% | 나스닥 ▲ 2.54% | 다우 ▲ 1.86%\nS&P500 +1.75%, 나스닥 +2.54%, 종전 기대감으로 강세\n\n🇰🇷 코스피 예측\n상승 — 미국 증시 강세(나스닥 +2.54%), 종전 기대감, 외국인 매수 재개로 긍정적\n\n📰 주요 뉴스\n트럼프 종전 발언에 코스피 8300선 탈환, 외국인 25일만에 순매수 전환\n\n🔍 관심 종목\n• 삼성전자: 상승 — 반도체 슈퍼사이클 시작, 전날 +7.36% 강세 지속 기대\n• SK하이닉스: 상승 — 나스닥 반도체주 급등(+3.29%), 동반 상승 가능성\n• 삼성바이오로직스: 보합 — 전날 -0.23% 약세, 시장 주도주 아님\n• LG전자: 보합 — 전날 -1.33% 약세, 반도체 강세 수혜 제한적\n\n🌤️ 오늘의 날씨\n서울 현재 18°C (어제보다 2°C 높음)\n오늘 최저 14°C / 최고 23°C\n강수확률 10% | 강수량 0mm\n자외선 지수 5 (보통)\n👕 가디건이나 얇은 재킷을 챙겨요`,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    routines: { name: "오전 루틴", scheduled_time: "08:00" },
  },
  {
    id: "dummy-2",
    routine_id: "r2",
    status: "success",
    message: "sent 1 actions",
    full_message: `🔔 오후 리포트\n\n📊 장 마감 리포트\n\n🇰🇷 오늘 코스피\n코스피 ▲ 4.49% (8112)\n\n🎯 예측 정확도\n부분적중 — 코스피 상승 예측은 적중했으나, 예상보다 강한 상승률(+4.49%)을 기록했습니다.\n\n🔎 차이 분석\n미국 증시 강세와 외국인 매수가 예상보다 강력했으며, 반도체주 강세가 시장을 주도했습니다.\n\n📋 관심 종목 결과\n• 삼성전자: 상승 (적중)\n• SK하이닉스: 상승 (적중)\n• 삼성바이오로직스: 보합 (적중)\n• LG전자: 하락 (빗나감)`,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    routines: { name: "오후 리포트", scheduled_time: "16:30" },
  },
  {
    id: "dummy-3",
    routine_id: "r3",
    status: "success",
    message: "sent 1 actions",
    full_message: `🔔 기상 알람\n\n⏰ 기상 알람\n좋은 아침이에요! 오늘도 활기차게 시작해봐요 🌅`,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    routines: { name: "기상 알람", scheduled_time: "07:00" },
  },
  {
    id: "dummy-4",
    routine_id: "r1",
    status: "error",
    message: "Error: YouTube API quota exceeded",
    full_message: `[오류] 유튜브 API 할당량 초과로 영상 조회에 실패했습니다.\nError: YouTube API quota exceeded (403)`,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
    routines: { name: "오전 루틴", scheduled_time: "08:00" },
  },
  {
    id: "dummy-5",
    routine_id: "r2",
    status: "success",
    message: "sent 1 actions",
    full_message: `🔔 오후 리포트\n\n📊 장 마감 리포트\n\n🇰🇷 오늘 코스피\n코스피 ▼ 0.82% (7731)\n\n🎯 예측 정확도\n빗나감 — 상승 예측과 달리 코스피가 소폭 하락 마감했습니다.\n\n🔎 차이 분석\n장 중반 외국인 매도 전환 및 원/달러 환율 급등이 예상 외 하락 요인으로 작용했습니다.\n\n📋 관심 종목 결과\n• 삼성전자: 하락 (빗나감)\n• SK하이닉스: 하락 (빗나감)\n• 삼성바이오로직스: 상승 (빗나감)\n• LG전자: 하락 (적중)`,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    routines: { name: "오후 리포트", scheduled_time: "16:30" },
  },
];

function formatKST(utcString: string) {
  const d = new Date(utcString);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [useDummy, setUseDummy] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    const { data } = await supabase
      .from("send_logs")
      .select("*, routines(name, scheduled_time)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data || data.length === 0) {
      setLogs(DUMMY_LOGS);
      setUseDummy(true);
      setSelected(DUMMY_LOGS[0]);
    } else {
      setLogs(data);
      setUseDummy(false);
      setSelected(data[0] ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, []);

  const filtered = filter === "all"
    ? logs
    : logs.filter((l) => l.status === filter || (filter === "error" && l.status === "fail"));

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status !== "success").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-5 py-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
          >
            ←
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">발송 이력</h1>
              {useDummy && (
                <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                  미리보기
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">최근 100건의 알림 발송 기록</p>
          </div>
          <button
            onClick={fetchLogs}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            새로고침
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "전체", value: logs.length, color: "text-slate-800" },
            { label: "성공", value: successCount, color: "text-emerald-600" },
            { label: "실패", value: errorCount, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit">
          {(["all", "success", "error"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-4 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f === "all" ? "전체" : f === "success" ? "성공" : "실패"}
            </button>
          ))}
        </div>

        {/* 분할 레이아웃 */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">불러오는 중...</div>
        ) : (
          <div className="flex gap-4 items-start">

            {/* 왼쪽: 목록 */}
            <div className="w-72 shrink-0 space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-sm">발송 기록이 없어요</p>
                </div>
              ) : (
                filtered.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`w-full text-left bg-white rounded-xl border px-4 py-3 shadow-sm transition-all ${
                      selected?.id === log.id
                        ? "border-blue-500 ring-1 ring-blue-500/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {log.routines?.name || "알 수 없는 루틴"}
                        {log.routines?.scheduled_time && (
                          <span className="text-xs text-slate-400 font-normal ml-1.5">
                            {log.routines.scheduled_time.slice(0, 5)}
                          </span>
                        )}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        log.status === "success"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      }`}>
                        {log.status === "success" ? "성공" : "실패"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{formatKST(log.created_at)}</p>
                  </button>
                ))
              )}
            </div>

            {/* 오른쪽: 전문 */}
            <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm sticky top-6 min-h-[400px]">
              {selected ? (
                <div className="p-5">
                  {/* 전문 헤더 */}
                  <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {selected.routines?.name || "루틴"}
                        {selected.routines?.scheduled_time && (
                          <span className="text-slate-400 font-normal ml-1.5">
                            {selected.routines.scheduled_time.slice(0, 5)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatKST(selected.created_at)} 발송</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      selected.status === "success"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-500"
                    }`}>
                      {selected.status === "success" ? "✓ 발송 성공" : "✕ 발송 실패"}
                    </span>
                  </div>

                  {/* 메시지 전문 */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-400 mb-3">텔레그램 발송 내용</p>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {selected.full_message || selected.message || "내용 없음"}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px] text-slate-300">
                  <div className="text-center">
                    <p className="text-5xl mb-3">👈</p>
                    <p className="text-sm">왼쪽에서 항목을 선택하세요</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
