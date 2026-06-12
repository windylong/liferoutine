"use client";

import { useState } from "react";
import { supabase, Routine, Action, ActionType, ACTION_TYPE_LABELS, DAY_LABELS } from "@/lib/supabase";
import ActionForm from "./ActionForm";

type Props = {
  routine: Routine | null;
  onClose: () => void;
  onSave: () => void;
};

const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function RoutineModal({ routine, onClose, onSave }: Props) {
  const isEdit = !!routine;
  const [name, setName] = useState(routine?.name || "");
  const [time, setTime] = useState(routine?.scheduled_time?.slice(0, 5) || "07:00");
  const [days, setDays] = useState<number[]>(routine?.days_of_week || DEFAULT_DAYS);
  const [actions, setActions] = useState<Partial<Action>[]>(
    routine?.actions || []
  );
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function addAction() {
    setActions((prev) => [
      ...prev,
      { action_type: "custom_message", label: "", config: {}, order_index: prev.length, is_active: true },
    ]);
  }

  function updateAction(index: number, updated: Partial<Action>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...updated } : a)));
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name || !time || days.length === 0) {
      alert("이름, 시간, 요일을 모두 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      let routineId = routine?.id;

      if (isEdit) {
        await supabase.from("routines").update({ name, scheduled_time: time, days_of_week: days }).eq("id", routineId!);
        // 기존 액션 전체 삭제 후 재삽입
        await supabase.from("actions").delete().eq("routine_id", routineId!);
      } else {
        const { data } = await supabase
          .from("routines")
          .insert({ name, scheduled_time: time, days_of_week: days, is_active: true })
          .select()
          .single();
        routineId = data.id;
      }

      if (actions.length > 0) {
        await supabase.from("actions").insert(
          actions.map((a, i) => ({
            routine_id: routineId,
            action_type: a.action_type,
            label: a.label || "",
            config: a.config || {},
            order_index: i,
            is_active: true,
          }))
        );
      }

      onSave();
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{isEdit ? "루틴 수정" : "루틴 추가"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          {/* 루틴 이름 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">루틴 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 아침 루틴"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 시간 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">알람 시간</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 요일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">반복 요일</label>
            <div className="flex gap-1">
              {[1,2,3,4,5,6,7].map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    days.includes(d)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* 액션 목록 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">액션</label>
              <button
                onClick={addAction}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                + 액션 추가
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <ActionForm
                  key={index}
                  action={action}
                  onChange={(updated) => updateAction(index, updated)}
                  onRemove={() => removeAction(index)}
                />
              ))}
              {actions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-lg">
                  액션을 추가해주세요
                </p>
              )}
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
