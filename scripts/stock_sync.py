#!/usr/bin/env python3
"""증시 분석 데이터와 Supabase 사이를 잇는 보조 스크립트 (표준 라이브러리만 사용).

사용법
  python3 scripts/stock_sync.py export-watchlist data/stock/watchlist.json
  python3 scripts/stock_sync.py ingest web/public/stock/morning/2026-10-16.json [...]
  python3 scripts/stock_sync.py validate <파일...>     # DB 접속 없이 형식만 검사

환경 변수
  SUPABASE_URL           예: https://xxxx.supabase.co   (없으면 SUPABASE_FUNCTION_URL 에서 추출)
  SUPABASE_FUNCTION_URL  예: https://xxxx.supabase.co/functions/v1/send-routine
  SUPABASE_KEY           service role 키 권장 (적재는 쓰기 권한 필요)
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DIRECTIONS = {"상승", "하락", "보합"}
MATCHES = {"적중", "빗나감"}
ACCURACY = {"적중", "부분적중", "빗나감"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def fail(msg: str) -> None:
    """GitHub Actions 실행 요약(annotations)에도 보이도록 ::error:: 로 함께 출력하고 종료."""
    if os.environ.get("GITHUB_ACTIONS"):
        print("::error::" + msg.replace("\n", " "))
    sys.exit(msg)


# ── Supabase REST ──────────────────────────────────────────
def base_url() -> str:
    url = os.environ.get("SUPABASE_URL", "").strip()
    if not url:
        fn = os.environ.get("SUPABASE_FUNCTION_URL", "").strip()
        m = re.match(r"^(https://[^/]+)", fn)
        url = m.group(1) if m else ""
    if not url:
        fail("SUPABASE_URL 또는 SUPABASE_FUNCTION_URL 이 필요합니다.")
    return url.rstrip("/")


def request(method: str, path: str, body=None, prefer: str | None = None):
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not key:
        fail("SUPABASE_KEY 가 필요합니다.")
    key = key.strip().strip('"').strip("'")
    headers = {"apikey": key, "Content-Type": "application/json"}
    # 예전 JWT 키(eyJ...)는 Authorization 에도 넣고, 새 형식 키(sb_secret_/sb_publishable_)는 apikey 헤더만 쓴다
    if not key.startswith("sb_"):
        headers["Authorization"] = f"Bearer {key}"
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(f"{base_url()}/rest/v1/{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            text = res.read().decode("utf-8")
            return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        fail(f"Supabase {method} {path} 실패 (주소 {base_url()}, 키 앞부분 {key[:8]}…, 길이 {len(key)}): HTTP {e.code} {e.read().decode('utf-8', 'replace')[:300]}")
    except urllib.error.URLError as e:
        fail(f"Supabase 접속 실패 (주소 {base_url()}): {e.reason}")


# ── 관심 종목 내보내기 ─────────────────────────────────────
def export_watchlist(out: str) -> None:
    rows = request(
        "GET",
        "stock_watchlist?select=code,name,market,sector&is_active=eq.true&order=created_at.asc",
    ) or []
    items = [
        {"code": r["code"], "name": r["name"], "market": r.get("market") or "", "sector": r.get("sector") or ""}
        for r in rows
    ]
    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    # 시각 정보를 넣지 않아 내용이 같으면 파일도 같다 (불필요한 커밋 방지)
    path.write_text(json.dumps({"items": items}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"관심 종목 {len(items)}개 → {out}")


# ── 형식 검사 ──────────────────────────────────────────────
def validate(doc: dict, file: str) -> list[str]:
    errs: list[str] = []
    t = doc.get("type")
    if t not in ("morning", "afternoon"):
        errs.append("type 은 morning 또는 afternoon")
    date = doc.get("date", "")
    if not DATE_RE.match(str(date)):
        errs.append("date 형식은 YYYY-MM-DD")
    stem = Path(file).stem
    if DATE_RE.match(stem) and stem != date:
        errs.append(f"파일명 날짜({stem})와 date({date})가 다름")
    a = doc.get("analysis")
    if not isinstance(a, dict):
        return errs + ["analysis 객체가 없음"]
    if not isinstance(doc.get("raw_data", {}), dict):
        errs.append("raw_data 는 객체")

    if a.get("market_closed"):
        return errs  # 휴장일 기록은 사유만 있으면 된다

    if t == "morning":
        if a.get("kospi_prediction") not in DIRECTIONS:
            errs.append("kospi_prediction 은 상승/하락/보합")
        if not a.get("kospi_reason"):
            errs.append("kospi_reason 이 비어 있음")
        news = a.get("kospi_news")
        if not isinstance(news, list) or not news:
            errs.append("kospi_news 배열이 비어 있음")
        else:
            for i, n in enumerate(news):
                if not n.get("summary") or not n.get("url"):
                    errs.append(f"kospi_news[{i}] 에 summary·url 필요")
        for i, w in enumerate(a.get("watchlist", [])):
            if not w.get("name") or w.get("prediction") not in DIRECTIONS:
                errs.append(f"watchlist[{i}] 에 name 과 prediction(상승/하락/보합) 필요")
            for j, f in enumerate(w.get("factors", [])):
                if not f.get("summary"):
                    errs.append(f"watchlist[{i}].factors[{j}] summary 필요")
    elif a.get("no_morning"):
        if a.get("kospi_actual") not in DIRECTIONS:
            errs.append("kospi_actual 은 상승/하락/보합")
    else:
        for k in ("kospi_predicted", "kospi_actual"):
            if a.get(k) not in DIRECTIONS:
                errs.append(f"{k} 은 상승/하락/보합")
        if a.get("kospi_match") not in MATCHES:
            errs.append("kospi_match 은 적중/빗나감")
        if a.get("accuracy") not in ACCURACY:
            errs.append("accuracy 은 적중/부분적중/빗나감")
        for i, w in enumerate(a.get("watchlist_accuracy", [])):
            if w.get("match") not in MATCHES:
                errs.append(f"watchlist_accuracy[{i}].match 은 적중/빗나감")
    return errs


def load(file: str) -> dict:
    return json.loads(Path(file).read_text(encoding="utf-8"))


def analysis_files(files: list[str]) -> list[str]:
    pat = re.compile(r"(^|/)web/public/stock/(morning|afternoon)/\d{4}-\d{2}-\d{2}\.json$")
    return [f for f in files if pat.search(f.replace("\\", "/")) and Path(f).exists()]


def cmd_validate(files: list[str]) -> list[tuple[str, dict]]:
    ok, bad = [], 0
    for f in files:
        try:
            doc = load(f)
        except Exception as e:  # noqa: BLE001
            print(f"✗ {f}: JSON 읽기 실패 {e}")
            bad += 1
            continue
        errs = validate(doc, f)
        if errs:
            bad += 1
            print(f"✗ {f}")
            for e in errs:
                print(f"   - {e}")
        else:
            print(f"✓ {f}")
            ok.append((f, doc))
    if bad:
        sys.exit(f"형식 오류 {bad}건")
    return ok


def ingest(files: list[str]) -> None:
    targets = analysis_files(files)
    if not targets:
        print("적재할 분석 파일이 없습니다.")
        return
    for f, doc in cmd_validate(targets):
        row = {
            "analysis_type": doc["type"],
            "analysis_date": doc["date"],
            "analysis": doc["analysis"],
            "raw_data": doc.get("raw_data", {}),
        }
        request(
            "POST",
            "stock_analysis?on_conflict=analysis_type,analysis_date",
            body=row,
            prefer="resolution=merge-duplicates,return=minimal",
        )
        print(f"↑ {doc['type']} {doc['date']} 적재 완료")


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "export-watchlist":
        export_watchlist(args[0])
    elif cmd == "ingest":
        ingest(args)
    elif cmd == "validate":
        cmd_validate(args)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
