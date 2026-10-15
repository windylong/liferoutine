# 증시 분석 데이터

평일 오전(06:20)·장 마감 후(16:00) Claude 앱 예약 작업이 저장하는 분석 결과입니다.
기준과 JSON 형식은 [`docs/stock-briefing-spec.md`](../../../docs/stock-briefing-spec.md)를 따릅니다.

| 파일 | 내용 |
|---|---|
| `morning/YYYY-MM-DD.json` | 오전 분석 (코스피·관심 종목 예측, 뉴스 30자 요약, 종목 영향 요소) |
| `afternoon/YYYY-MM-DD.json` | 오후 분석 (예측 vs 마감, 정확도, 차이 원인) |
| `latest.json` | `{morning, afternoon}` 가장 최근 문서 — 관심 종목 화면이 읽음 |
| `index.json` | 날짜 목록 |

`morning/`·`afternoon/` 파일이 push 되면 GitHub Actions(Ingest Stock Analysis)가 Supabase `stock_analysis`에 적재하고,
텔레그램 알림은 루틴에 설정한 시각에 그 데이터를 보냅니다.
