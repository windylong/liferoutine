# 증시 분석 브리핑 — 수집·분석·출력 기준 (v1, 2026-10-15)

Claude 앱 예약 작업이 하루 2회 분석해 저장소에 JSON을 push 하고, GitHub Actions가 Supabase `stock_analysis` 테이블에 적재한다.
텔레그램 발송 시각은 생활루틴 웹의 루틴(📈 증시 브리핑 액션)에서 정한다.

## 흐름
```
웹 관심 종목(stock_watchlist) ──Sync Watchlist(매시)──▶ data/stock/watchlist.json
                                                          │
Claude 예약 작업(평일 06:20 / 16:00 KST) ◀────────────────┘
   └─ web/public/stock/{morning|afternoon}/<날짜>.json + latest.json + index.json  → git push(main)
        └─ Ingest Stock Analysis(push 시) ──▶ Supabase stock_analysis
              └─ send-routine(루틴 시각) ──▶ 텔레그램
```

## 1회차 — 오전 분석 (평일 06:20 KST 실행, type=morning)
- 뉴스 범위: 실행일 07:00 KST 이전 24시간 (월요일·연휴 다음날은 직전 거래일 장 마감 15:30 이후 전부)
- 시장: 한국이 메인. 미국은 한국 증시에 영향이 있는 것만 (지수, 반도체·빅테크, 금리·환율, 연준, 관세·정책)
- 확인할 숫자 (모두 출처 URL 기록)
  - 미국 전일 마감: S&P500, 나스닥, 다우, 필라델피아 반도체(SOX) 종가·등락률
  - 원/달러 환율, (가능하면) 야간 코스피200 선물 또는 EWY 등락
  - 코스피 전일 종가·등락률, 관심 종목 전일 종가·등락률
- 산출
  1. 오늘 코스피 상승/하락/보합 예측 + 예상 범위(예: "+0.3~0.8%") + 확신도(높음/보통/낮음) + 근거(60자 이내)
  2. 관심 종목별 상승/하락/보합 예측 + 근거(40자 이내)
  3. 코스피 관련 주요 뉴스 3~5건, 각 **30자 내외** 한국어 요약 + 출처
  4. 관심 종목별 주가에 영향 있는 요소 1~3건, 각 **30자 내외** 요약 + 호재/악재/중립 + 출처
- 기준: 상승·하락은 등락률 ±0.3% 초과, 그 사이는 보합 (오후 채점도 같은 기준)

## 2회차 — 오후 분석 (평일 16:00 KST 실행, type=afternoon)
- 오늘 오전 분석(`web/public/stock/morning/<오늘>.json`)을 읽어 예측과 실제 마감을 비교
- 확인할 숫자: 코스피·코스닥 종가·등락률, 관심 종목 종가·등락률 (출처 URL 기록)
- 산출
  - 코스피: 예측, 실제(±0.3% 기준 방향), 등락 텍스트(예: "▲1.23%"), 적중/빗나감, 차이 원인 또는 적중 근거(80자 이내)
  - 관심 종목별: 예측·실제·등락 텍스트·적중/빗나감·차이 원인(40자 이내)
  - overall_accuracy: "맞힌 수/전체" (코스피 포함)
  - accuracy: 코스피 적중 AND 종목 적중률 50% 이상 → "적중", 둘 중 하나만 → "부분적중", 둘 다 아님 → "빗나감"
  - market_analysis: 오늘 장 흐름·주도 섹터·수급(외국인·기관) 100자 이내
  - lessons: 오전 예측에서 놓친 요인 등 다음 예측에 반영할 점 60자 이내
- 오전 분석이 없으면 예측 항목은 "보합"·빗나감 대신 `no_morning: true` 를 넣고 실제 결과와 market_analysis 만 채운다

## 휴장일
KRX 휴장일(주말 제외 공휴일·연말 휴장 등)이면 분석 대신 아래만 저장한다.
`{"type", "date", "generated_at", "analysis": {"market_closed": true, "closed_reason": "개천절"}, "raw_data": {}}`

## 소스
- 숫자: 네이버 증권(finance.naver.com, m.stock.naver.com), Investing.com, Yahoo Finance, KRX 정보데이터시스템, 한국거래소 공시. 두 곳 이상에서 값이 다르면 네이버 증권 우선
- 한국 뉴스: 연합뉴스·연합인포맥스, 한국경제, 매일경제, 머니투데이, 이데일리, 서울경제, 조선비즈
- 미국 뉴스: Reuters, Bloomberg(헤드라인), CNBC, WSJ(헤드라인), MarketWatch
- 종목 뉴스는 종목명으로 따로 검색 (공시·실적·수주·증권사 리포트·업황)

## 규칙
- 숫자와 뉴스는 실제로 열어 본(또는 검색 결과로 확인한) 출처가 있어야 함. 확인 못 한 숫자는 넣지 않고 빈칸 처리
- 원문 문장을 복사하지 않고 직접 쓴 한국어 요약만 사용
- 투자 권유 표현(매수·매도 추천, 목표가 제시)은 쓰지 않는다. 방향 예측과 근거만
- 관심 종목은 `data/stock/watchlist.json` 의 items 전부 (비어 있으면 watchlist 는 빈 배열)

## 저장 위치 (저장소 windylong/liferoutine, main)
| 파일 | 내용 |
|---|---|
| `web/public/stock/morning/<YYYY-MM-DD>.json` | 오전 분석 |
| `web/public/stock/afternoon/<YYYY-MM-DD>.json` | 오후 분석 |
| `web/public/stock/latest.json` | `{"morning": 가장 최근 오전 문서, "afternoon": 가장 최근 오후 문서}` |
| `web/public/stock/index.json` | `{"updated_at", "morning": [날짜 최신순], "afternoon": [날짜 최신순]}` |

push 전 형식 검사: `python3 scripts/stock_sync.py validate <파일>`

## JSON 형식 — 오전
```json
{
  "type": "morning",
  "date": "YYYY-MM-DD",
  "generated_at": "ISO8601 +09:00",
  "analysis": {
    "kospi_prediction": "상승|하락|보합",
    "kospi_change_range": "+0.3~0.8%",
    "kospi_confidence": "높음|보통|낮음",
    "kospi_reason": "60자 이내",
    "us_market_summary": "40자 이내",
    "kospi_news_summary": "주요 뉴스 한 줄 (구버전 호환)",
    "kospi_news": [{"summary": "30자 내외", "source": "매체", "url": "https://..."}],
    "watchlist": [{
      "code": "005930", "name": "삼성전자",
      "prediction": "상승|하락|보합", "reason": "40자 이내",
      "factors": [{"summary": "30자 내외", "impact": "호재|악재|중립", "url": "https://..."}]
    }]
  },
  "raw_data": {
    "news_window": {"from": "ISO8601", "to": "ISO8601"},
    "us_market": {
      "sp500": {"price": 0, "changePct": 0}, "nasdaq": {...}, "dow": {...}, "sox": {...},
      "usdkrw": {"price": 0, "changePct": 0}
    },
    "kospi_prev": {"price": 0, "changePct": 0},
    "watchlist": [{"code": "005930", "name": "삼성전자", "price": 0, "changePct": 0}],
    "sources": [{"name": "네이버 증권", "url": "https://..."}]
  }
}
```

## JSON 형식 — 오후
```json
{
  "type": "afternoon",
  "date": "YYYY-MM-DD",
  "generated_at": "ISO8601 +09:00",
  "analysis": {
    "kospi_predicted": "상승|하락|보합",
    "kospi_actual": "상승|하락|보합",
    "kospi_change_text": "▲1.23%",
    "kospi_match": "적중|빗나감",
    "kospi_miss_reason": "80자 이내",
    "watchlist_accuracy": [{
      "code": "005930", "name": "삼성전자",
      "predicted": "상승", "actual": "하락", "change_text": "▼0.8%",
      "match": "적중|빗나감", "reason": "40자 이내"
    }],
    "overall_accuracy": "3/5",
    "accuracy": "적중|부분적중|빗나감",
    "market_analysis": "100자 이내",
    "lessons": "60자 이내"
  },
  "raw_data": {
    "kospi": {"price": 0, "changePct": 0},
    "kosdaq": {"price": 0, "changePct": 0},
    "watchlist": [{"code": "005930", "name": "삼성전자", "price": 0, "changePct": 0}],
    "sources": [{"name": "네이버 증권", "url": "https://..."}]
  }
}
```
