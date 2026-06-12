"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type LogEntry = {
  id: string;
  routine_id: string;
  status: string;
  message: string;
  created_at: string;
  routines?: { name: string; scheduled_time: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  error:   "bg-red-100 text-red-600",
  fail:    "bg-red-100 text-red-600",
};

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

  async function fetchLogs() {
    setLoading(true);
    const { data } = await supabase
      .from("send_logs")
      .select("*, routines(name, scheduled_time)")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, []);

  const filtered = filter === "all"
    ? logs
    : logs.filter((l) => l.status === filter || (filter === "error" && l.status === "fail"));

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status !== "success").length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📋 발송 이력</h1>
            <p className="text-sm text-gray-500">최근 100건의 알림 발송 기록</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              ← 루틴
            </Link>
            <button
              onClick={fetchLogs}
              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100"
            >
              🔄 새로고침
            </button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
            <p className="text-xs text-gray-500 mt-1">전체</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 text-center">
            <p className="text-2xl font-bold text-green-600">{successCount}</p>
            <p className="text-xs text-gray-500 mt-1">성공</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100 text-center">
            <p className="text-2xl font-bold text-red-500">{errorCount}</p>
            <p className="text-xs text-gray-500 mt-1">실패</p>
          </div>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 mb-4">
          {(["all", "success", "error"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f === "all" ? "전체" : f === "success" ? "✅ 성공" : "❌ 실패"}
            </button>
          ))}
        </div>

        {/* 로그 목록 */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>발송 기록이 없어요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-3"
              >
                {/* 상태 뱃지 */}
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 mt-0.5 ${
                    STATUS_STYLE[log.status] || "bg-gray-100 text-gray-500"
                  }`}
                >
                  {log.status === "success" ? "✅ 성공" : "❌ 실패"}
                </span>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {log.routines?.name || "알 수 없는 루틴"}
                      {log.routines?.scheduled_time && (
                        <span className="text-xs text-gray-400 ml-1.5">
                          ({log.routines.scheduled_time.slice(0, 5)})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatKST(log.created_at)}
                    </span>
                  </div>
                  {log.message && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{log.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
