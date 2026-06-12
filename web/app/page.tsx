"use client";

import { useEffect, useState } from "react";
import { supabase, Routine, DAY_LABELS } from "@/lib/supabase";
import RoutineModal from "./components/RoutineModal";
import Link from "next/link";

export default function Home() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  async function fetchRoutines() {
    const { data } = await supabase
      .from("routines")
      .select("*, actions(*)")
      .order("scheduled_time");
    setRoutines(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchRoutines(); }, []);

  async function toggleActive(routine: Routine) {
    await supabase
      .from("routines")
      .update({ is_active: !routine.is_active })
      .eq("id", routine.id);
    fetchRoutines();
  }

  async function deleteRoutine(id: string) {
    if (!confirm("루틴을 삭제할까요?")) return;
    const { error } = await supabase.from("routines").delete().eq("id", id);
    if (error) { alert("삭제 실패: " + error.message); return; }
    fetchRoutines();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-5 py-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">생활 루틴</h1>
            <p className="text-sm text-slate-400 mt-0.5">텔레그램으로 알람을 받아요</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/logs"
              className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <span className="text-xs">📋</span> 발송 이력
            </Link>
            <Link
              href="/watchlist"
              className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <span className="text-xs">📈</span> 관심 종목
            </Link>
            <button
              onClick={() => { setEditingRoutine(null); setShowModal(true); }}
              className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>+</span> 루틴 추가
            </button>
          </div>
        </div>

        {/* 루틴 목록 */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">불러오는 중...</div>
        ) : routines.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">아직 루틴이 없어요.</p>
            <button
              onClick={() => { setEditingRoutine(null); setShowModal(true); }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              첫 루틴 추가하기 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className={`bg-white rounded-xl border px-4 py-4 shadow-sm transition-opacity ${
                  routine.is_active ? "border-slate-100" : "border-slate-100 opacity-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 시간 + 이름 */}
                    <div className="flex items-baseline gap-2.5 mb-2">
                      <span className="text-lg font-bold text-blue-600 tabular-nums leading-none">
                        {routine.scheduled_time.slice(0, 5)}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {routine.name}
                      </span>
                    </div>
                    {/* 요일 칩 */}
                    <div className="flex gap-1 mb-2.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <span
                          key={d}
                          className={`text-xs w-6 h-6 rounded flex items-center justify-center font-medium ${
                            routine.days_of_week.includes(d)
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                    </div>
                    {/* 액션 목록 */}
                    <div className="space-y-0.5">
                      {(routine.actions || [])
                        .filter((a) => a.is_active)
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((action) => (
                          <p key={action.id} className="text-xs text-slate-400">
                            {action.label || action.action_type}
                          </p>
                        ))}
                    </div>
                  </div>

                  {/* 우측 컨트롤 */}
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {/* 토글 */}
                    <button
                      onClick={() => toggleActive(routine)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        routine.is_active ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                        routine.is_active ? "left-5" : "left-1"
                      }`} />
                    </button>
                    <button
                      onClick={() => { setEditingRoutine(routine); setShowModal(true); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteRoutine(routine.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <RoutineModal
          routine={editingRoutine}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchRoutines(); }}
        />
      )}
    </main>
  );
}
