"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { POPULAR_STOCKS, SECTORS, Stock } from "@/lib/stocks";
import Link from "next/link";

type WatchlistItem = {
  id: string;
  code: string;
  name: string;
  market: string;
  sector: string;
  is_active: boolean;
};

export default function WatchlistPage() {
  const [tab, setTab] = useState<"list" | "add">("list");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);

  async function fetchWatchlist() {
    const { data } = await supabase.from("stock_watchlist").select("*").order("created_at");
    setWatchlist(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchWatchlist(); }, []);

  async function addStock(stock: Stock) {
    await supabase.from("stock_watchlist").upsert(
      { code: stock.code, name: stock.name, market: stock.market, sector: stock.sector, is_active: true },
      { onConflict: "code" }
    );
    fetchWatchlist();
  }

  async function removeStock(code: string) {
    if (!confirm("관심 종목에서 삭제할까요?")) return;
    await supabase.from("stock_watchlist").delete().eq("code", code);
    fetchWatchlist();
  }

  const watchlistCodes = new Set(watchlist.map((w) => w.code));
  const hasFilter = search || marketFilter.length > 0 || sectorFilter.length > 0;

  const displayStocks = POPULAR_STOCKS.filter((s) => {
    const matchSearch = !search || s.name.includes(search) || s.code.includes(search);
    const matchMarket = marketFilter.length === 0 || marketFilter.includes(s.market);
    const matchSector = sectorFilter.length === 0 || sectorFilter.includes(s.sector);
    return matchSearch && matchMarket && matchSector;
  });

  function toggleMarket(m: string) {
    setMarketFilter((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }
  function toggleSector(s: string) {
    setSectorFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function resetFilters() {
    setSearch(""); setMarketFilter([]); setSectorFilter([]);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-5 py-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">관심 종목</h1>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab("list")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "list"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            관심 종목 {watchlist.length > 0 && <span className="text-blue-600">({watchlist.length})</span>}
          </button>
          <button
            onClick={() => setTab("add")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "add"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            종목 추가
          </button>
        </div>

        {/* 관심 종목 목록 탭 */}
        {tab === "list" && (
          <div>
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-sm">불러오는 중...</div>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm">관심 종목이 없어요.</p>
                <button onClick={() => setTab("add")} className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  종목 추가하기 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {watchlist.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.code} · {item.market} · {item.sector}</p>
                    </div>
                    <button
                      onClick={() => removeStock(item.code)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 관심 종목 추가 탭 */}
        {tab === "add" && (
          <div>
            {/* 검색 */}
            <div className="relative mb-4">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="종목명 또는 코드 검색"
                className="w-full h-11 border border-slate-200 bg-white rounded-xl pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                  ✕
                </button>
              )}
            </div>

            {/* 시장 필터 */}
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-2">시장</p>
              <div className="flex gap-2">
                {["KOSPI", "KOSDAQ"].map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMarket(m)}
                    className={`h-8 px-3.5 rounded-lg text-sm font-medium border transition-colors ${
                      marketFilter.includes(m)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 섹터 필터 */}
            <div className="mb-5">
              <p className="text-xs font-medium text-slate-500 mb-2">섹터</p>
              <div className="flex flex-wrap gap-1.5">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSector(s)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                      sectorFilter.includes(s)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 결과 헤더 */}
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-slate-400">
                {search ? `검색 결과 ${displayStocks.length}개` :
                  hasFilter ? `필터 결과 ${displayStocks.length}개` :
                  `전체 종목 ${POPULAR_STOCKS.length}개`}
              </p>
              {hasFilter && (
                <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  초기화
                </button>
              )}
            </div>

            {/* 결과 목록 */}
            {displayStocks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">검색 결과가 없어요.</p>
                <button onClick={resetFilters} className="mt-3 text-xs text-blue-600 font-medium">필터 초기화</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {displayStocks.map((stock) => {
                  const isAdded = watchlistCodes.has(stock.code);
                  return (
                    <div
                      key={stock.code}
                      className={`bg-white rounded-xl border px-3 py-3 shadow-sm flex justify-between items-center transition-colors ${
                        isAdded ? "border-blue-200 bg-blue-50/50" : "border-slate-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{stock.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{stock.code} · {stock.market}</p>
                      </div>
                      <button
                        onClick={() => isAdded ? removeStock(stock.code) : addStock(stock)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ml-2 transition-colors ${
                          isAdded
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
                        }`}
                      >
                        {isAdded ? "✓" : "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
