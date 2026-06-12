"use client";

import { Action, ActionType, ACTION_TYPE_LABELS } from "@/lib/supabase";

type Props = {
  action: Partial<Action>;
  onChange: (updated: Partial<Action>) => void;
  onRemove: () => void;
};

export default function ActionForm({ action, onChange, onRemove }: Props) {
  const type = action.action_type || "custom_message";

  function handleTypeChange(newType: ActionType) {
    onChange({ ...action, action_type: newType, config: {} });
  }

  function setConfig(key: string, value: string) {
    onChange({ ...action, config: { ...(action.config || {}), [key]: value } });
  }

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as ActionType)}
          className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
        >
          {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-sm">🗑️</button>
      </div>

      {/* 라벨 */}
      <input
        type="text"
        placeholder="표시 이름 (선택)"
        value={action.label || ""}
        onChange={(e) => onChange({ ...action, label: e.target.value })}
        className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
      />

      {/* 타입별 설정 */}
      {type === "youtube_latest" && (
        <input
          type="text"
          placeholder="채널 handle (예: @채널명)"
          value={action.config?.channel_handle || ""}
          onChange={(e) => setConfig("channel_handle", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      )}

      {type === "news_article" && (
        <input
          type="url"
          placeholder="사이트 URL (예: https://news.naver.com)"
          value={action.config?.url || ""}
          onChange={(e) => setConfig("url", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      )}

      {type === "wake_alarm" && (
        <input
          type="text"
          placeholder="메시지 (예: 일어날 시간이에요!)"
          value={action.config?.message || ""}
          onChange={(e) => setConfig("message", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      )}

      {type === "weather_briefing" && (
        <input
          type="text"
          placeholder="도시 (예: Seoul)"
          value={action.config?.city || ""}
          onChange={(e) => setConfig("city", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      )}

      {type === "custom_message" && (
        <textarea
          placeholder="전송할 메시지"
          value={action.config?.text || ""}
          onChange={(e) => setConfig("text", e.target.value)}
          rows={2}
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
        />
      )}
    </div>
  );
}
