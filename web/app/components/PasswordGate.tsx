"use client";

import { useState } from "react";

type Props = {
  children: React.ReactNode;
};

export default function PasswordGate({ children }: Props) {
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("authed") === "true";
    }
    return false;
  });
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      sessionStorage.setItem("authed", "true");
      setAuthed(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">🔒</p>
          <h1 className="text-xl font-bold text-gray-800">생활 루틴</h1>
          <p className="text-sm text-gray-500">비밀번호를 입력해주세요</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="비밀번호"
            className={`w-full border rounded-lg px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
              error ? "border-red-400" : ""
            }`}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mb-3">비밀번호가 틀렸습니다.</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600"
          >
            입력
          </button>
        </form>
      </div>
    </div>
  );
}
