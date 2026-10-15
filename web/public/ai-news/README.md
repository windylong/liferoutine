# AI 뉴스 브리핑 데이터

매일 아침 Claude 예약 작업이 수집한 AI 뉴스 브리핑입니다. 이 폴더(`web/public/ai-news/`)는 Next.js가 정적 파일로 제공하므로
배포 후 `/ai-news/latest.json` 으로 바로 가져올 수 있습니다.

| 파일 | 내용 |
|---|---|
| `latest.json` | 가장 최근 브리핑 |
| `YYYY-MM-DD.json` | 날짜별 브리핑 |
| `index.json` | 보유 날짜 목록 `{updated_at, dates: [...]}` (최신순) |

## 브리핑 형식
- `date`, `generated_at`, `headline`(그날 흐름 1~2문장)
- `top[]` 핵심 5건: `id, title, summary[3줄], why, category, region, scores{impact,novelty,coverage,trust,relevance}, score(13점 만점), tier, links[{name,url}]`
- `others[]` 나머지(점수순): `id, title, one_line, category, region, score, tier, links[]`
- `region`: 한국 | 미국 | 중국 | 유럽 | 일본 | 글로벌
- `category`: LLM | 상용 LLM | 피지컬AI | 연구 논문 | 정책·규제 | 산업·투자 | 기타
- 논문 항목에는 `paper_year`가 붙습니다.

## 사용 예 (Next.js 서버 컴포넌트)
```ts
import fs from "node:fs/promises";
import path from "node:path";
const file = path.join(process.cwd(), "public/ai-news/latest.json");
const brief = JSON.parse(await fs.readFile(file, "utf8"));
```
