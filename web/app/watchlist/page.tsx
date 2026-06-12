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
    await supabase.from("stock_watchlist").upsert({
      code: stock.code, name: stock.name, market: stock.market, sector: stock.sector, is_active: true,
    }, { onConflict: "code" });
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
    setSearch("");
    setMarketFilter([]);
    setSectorFilter([]);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 대시보드로</Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">관심 종목</h1>

        {/* 탭 */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setTab("list")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "list" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
            }`}
          >
            관심 종목 ({watchlist.length})
          </button>
          <button
            onClick={() => setTab("add")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "add" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
            }`}
          >
            관심 종목 추가
          </button>
        </div>

        {/* 관심 종목 목록 탭 */}
        {tab === "list" && (
          <div>
            {loading ? (
              <p className="text-center text-gray-400 py-12">불러오는 중...</p>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">📭</p>
                <p>관심 종목이 없어요.</p>
                <button onClick={() => setTab("add")} className="mt-3 text-blue-500 text-sm">
                  종목 추가하기 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {watchlist.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.code} · {item.market} · {item.sector}</p>
                    </div>
                    <button onClick={() => removeStock(item.code)} className="text-gray-300 hover:text-red-400 text-lg">✕</button>
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="종목명 또는 코드 검색 (예: 삼성, 005930)"
                className="w-full border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>

            {/* 시장 필터 */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">시장</p>
              <div className="flex gap-2">
                {["KOSPI", "KOSDAQ"].map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMarket(m)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      marketFilter.includes(m)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-gray-300 text-gray-600 bg-white hover:border-blue-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 섹터 필터 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">섹터</p>
              <div className="flex flex-wrap gap-1.5">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSector(s)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      sectorFilter.includes(s)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-gray-300 text-gray-600 bg-white hover:border-blue-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 결과 헤더 */}
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-gray-500">
                {search ? `검색 결과 (${displayStocks.length}개)` :
                  hasFilter ? `필터 결과 (${displayStocks.length}개)` :
                  `전체 종목 (${POPULAR_STOCKS.length}개)`}
              </p>
              {hasFilter && (
                <button onClick={resetFilters} className="text-xs text-blue-500 hover:text-blue-600">
                  필터 초기화
                </button>
              )}
            </div>

            {/* 결과 목록 */}
            {displayStocks.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">검색 결과가 없어요.</p>
                <button onClick={resetFilters} className="mt-2 text-xs text-blue-500">필터 초기화</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {displayStocks.map((stock) => {
                  const isAdded = watchlistCodes.has(stock.code);
                  return (
                    <div
                      key={stock.code}
                      className={`bg-white rounded-xl p-3 shadow-sm border flex justify-between items-center transition-colors ${
                        isAdded ? "border-blue-100 bg-blue-50" : "border-gray-100"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{stock.name}</p>
                        <p className="text-xs text-gray-400">{stock.code} · {stock.market} · {stock.sector}</p>
                      </div>
                      <button
                        onClick={() => isAdded ? removeStock(stock.code) : addStock(stock)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          isAdded
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-500"
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
