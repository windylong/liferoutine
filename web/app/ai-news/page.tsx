import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  "LLM": "bg-violet-50 text-violet-700 border-violet-200",
  "상용 LLM": "bg-blue-50 text-blue-700 border-blue-200",
  "피지컬AI": "bg-orange-50 text-orange-700 border-orange-200",
  "연구 논문": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "정책·규제": "bg-red-50 text-red-700 border-red-200",
  "산업·투자": "bg-amber-50 text-amber-700 border-amber-200",
  "기타": "bg-slate-50 text-slate-600 border-slate-200",
};

const REGION_FLAGS: Record<string, string> = {
  "한국": "🇰🇷",
  "미국": "🇺🇸",
  "중국": "🇨🇳",
  "유럽": "🇪🇺",
  "일본": "🇯🇵",
  "글로벌": "🌐",
};

type TopItem = {
  id: string;
  title: string;
  summary: string[];
  why: string;
  category: string;
  region: string;
  score: number;
  tier: string;
  links: { name: string; url: string }[];
};

type OtherItem = {
  id: string;
  title: string;
  one_line: string;
  category: string;
  region: string;
  score: number;
  tier: string;
  paper_year?: number;
  links: { name: string; url: string }[];
};

type Brief = {
  date: string;
  generated_at: string;
  headline: string;
  top: TopItem[];
  others: OtherItem[];
};

async function getBrief(): Promise<Brief | null> {
  try {
    const file = path.join(process.cwd(), "public/ai-news/latest.json");
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] || CATEGORY_COLORS["기타"];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {category}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const max = 13;
  const pct = Math.round((score / max) * 100);
  const color = score >= 11 ? "bg-red-500" : score >= 8 ? "bg-amber-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-6 text-right">{score}</span>
    </div>
  );
}

export default async function AiNewsPage() {
  const brief = await getBrief();

  const dateLabel = brief
    ? new Date(brief.date).toLocaleDateString("ko-KR", {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "";

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
            <h1 className="text-xl font-bold text-slate-900">AI 뉴스</h1>
            <p className="text-sm text-slate-400 mt-0.5">{dateLabel || "오늘의 AI 뉴스 브리핑"}</p>
          </div>
        </div>

        {!brief ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">아직 브리핑 데이터가 없어요.</p>
          </div>
        ) : (
          <>
            {/* 헤드라인 요약 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 mb-5">
              <p className="text-xs font-medium text-slate-400 mb-2">오늘의 흐름</p>
              <p className="text-sm text-slate-700 leading-relaxed">{brief.headline}</p>
            </div>

            {/* 핵심 5건 */}
            <h2 className="text-sm font-semibold text-slate-500 mb-3 px-0.5">🔥 핵심 뉴스</h2>
            <div className="space-y-3 mb-6">
              {brief.top.map((item, i) => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
                  {/* 번호 + 카테고리 + 지역 */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                    <CategoryBadge category={item.category} />
                    <span className="text-xs text-slate-400">
                      {REGION_FLAGS[item.region] || ""} {item.region}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-2.5">
                    {item.title}
                  </h3>

                  {/* 요약 3줄 */}
                  <ul className="space-y-1 mb-3">
                    {item.summary.map((s, si) => (
                      <li key={si} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                        <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 왜 중요한가 */}
                  <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <span className="font-medium">왜 중요한가</span> — {item.why}
                    </p>
                  </div>

                  {/* 점수 바 + 링크 */}
                  <div className="space-y-2">
                    <ScoreBar score={item.score} />
                    <div className="flex flex-wrap gap-1.5">
                      {item.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                        >
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 주목·참고 뉴스 */}
            {brief.others.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-slate-500 mb-3 px-0.5">📌 그 외 뉴스</h2>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50 mb-6">
                  {brief.others.map((item) => (
                    <div key={item.id} className="px-5 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CategoryBadge category={item.category} />
                            <span className="text-xs text-slate-400">
                              {REGION_FLAGS[item.region] || ""} {item.region}
                            </span>
                            {item.paper_year && (
                              <span className="text-xs text-slate-400">{item.paper_year}</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-700 leading-snug mb-1">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.one_line}</p>
                          {item.links.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.links.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                                >
                                  {link.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-300 shrink-0 mt-0.5">{item.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 생성 시각 */}
            <p className="text-center text-xs text-slate-300">
              {new Date(brief.generated_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })} 생성
            </p>
          </>
        )}
      </div>
    </main>
  );
}
