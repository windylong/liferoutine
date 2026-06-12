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

  useEffect(() => {
    fetchRoutines();
  }, []);

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
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }
    fetchRoutines();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔔 생활 루틴</h1>
            <p className="text-sm text-gray-500">텔레그램으로 알람을 받아요</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/watchlist"
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              📈 관심 종목
            </Link>
            <button
              onClick={() => { setEditingRoutine(null); setShowModal(true); }}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              + 루틴 추가
            </button>
          </div>
        </div>

        {/* 루틴 목록 */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : routines.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>아직 루틴이 없어요. 추가해보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className={`bg-white rounded-xl p-4 shadow-sm border ${
                  routine.is_active ? "border-blue-100" : "border-gray-100 opacity-60"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-blue-600">
                        {routine.scheduled_time.slice(0, 5)}
                      </span>
                      <span className="text-gray-700 font-medium">{routine.name}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5,6,7].map((d) => (
                        <span
                          key={d}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            routine.days_of_week.includes(d)
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1">
                      {(routine.actions || [])
                        .filter((a) => a.is_active)
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((action) => (
                          <p key={action.id} className="text-xs text-gray-500">
                            {action.label || action.action_type}
                          </p>
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleActive(routine)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        routine.is_active ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        routine.is_active ? "left-5" : "left-1"
                      }`} />
                    </button>
                    <button
                      onClick={() => { setEditingRoutine(routine); setShowModal(true); }}
                      className="text-gray-400 hover:text-blue-500 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteRoutine(routine.id)}
                      className="text-gray-400 hover:text-red-500 text-sm"
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
