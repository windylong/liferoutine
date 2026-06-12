export async function getWeatherMessage(city: string, label?: string): Promise<string> {
  // 1. 도시명 → 위도/경도
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ko`
  );
  const geoData = await geoRes.json();
  const loc = geoData.results?.[0];
  if (!loc) return `🌤️ <b>${label || "날씨"}</b>\n도시를 찾을 수 없어요: ${city}`;

  const { latitude, longitude, name } = loc;

  // 2. 날씨 데이터 조회
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,windspeed_10m_max,uv_index_max` +
    `&current=temperature_2m,weathercode,windspeed_10m` +
    `&timezone=Asia%2FSeoul&past_days=1`
  );
  const w = await weatherRes.json();
  const daily = w.daily;
  const current = w.current;

  const todayMax = daily.temperature_2m_max[1];
  const todayMin = daily.temperature_2m_min[1];
  const yesterdayMax = daily.temperature_2m_max[0];
  const precipitation = daily.precipitation_sum[1];
  const precipProb = daily.precipitation_probability_max[1]; // 강수확률 (%)
  const windspeed = daily.windspeed_10m_max[1];
  const uvIndex = daily.uv_index_max[1];
  const weatherCode = daily.weathercode[1];
  const currentTemp = current.temperature_2m;

  function weatherDesc(code: number): string {
    if (code === 0) return "맑음 ☀️";
    if (code <= 3) return "구름 조금 🌤️";
    if (code <= 48) return "안개 🌫️";
    if (code <= 57) return "이슬비 🌦️";
    if (code <= 67) return "비 🌧️";
    if (code <= 77) return "눈 ❄️";
    if (code <= 82) return "소나기 🌧️";
    if (code <= 99) return "천둥번개 ⛈️";
    return "알 수 없음";
  }

  const maxDiff = Math.round((todayMax - yesterdayMax) * 10) / 10;
  const diffText = maxDiff > 0
    ? `어제보다 최고기온 ${maxDiff}°C 높아요 🔺`
    : maxDiff < 0
    ? `어제보다 최고기온 ${Math.abs(maxDiff)}°C 낮아요 🔻`
    : `어제와 비슷한 기온이에요 〰️`;

  function getOutfitTip(): string {
    const tips: string[] = [];
    if (todayMax >= 28) tips.push("더운 날씨에요. 반팔과 반바지가 좋아요.");
    else if (todayMax >= 23) tips.push("따뜻해요. 가벼운 옷차림이 좋아요.");
    else if (todayMax >= 17) tips.push("선선해요. 긴팔이나 가디건을 챙기세요.");
    else if (todayMax >= 10) tips.push("쌀쌀해요. 재킷이나 코트를 입으세요.");
    else tips.push("추운 날씨예요. 두꺼운 외투 필수입니다.");

    if (precipitation > 5) tips.push("비가 꽤 올 예정이에요. 우산을 꼭 챙기세요 ☂️");
    else if (precipitation > 1) tips.push("가벼운 비가 예상돼요. 우산을 챙기면 좋아요.");

    if (windspeed > 30) tips.push("바람이 강해요. 바람막이를 준비하세요.");
    else if (windspeed > 15) tips.push("바람이 좀 있어요. 얇은 겉옷 하나 챙기세요.");

    if (uvIndex >= 8) tips.push("자외선이 매우 강해요. 선크림과 모자를 챙기세요 🧢");
    else if (uvIndex >= 5) tips.push("자외선이 강해요. 선크림을 챙기세요.");

    const minMaxDiff = todayMax - todayMin;
    if (minMaxDiff >= 10) tips.push(`일교차가 ${Math.round(minMaxDiff)}°C로 커요. 겉옷을 꼭 챙기세요.`);
    return tips.join(" ");
  }

  const precipLine = `🌂 강수확률 ${precipProb}% | 강수량 ${precipitation}mm`;

  return (
    `🌤️ <b>${label || name + " 날씨"}</b>\n\n` +
    `🌡️ 현재 ${currentTemp}°C | 최고 ${todayMax}°C / 최저 ${todayMin}°C\n` +
    `${weatherDesc(weatherCode)}\n` +
    `${precipLine}\n\n` +
    `📊 ${diffText}\n\n` +
    `👗 <b>의상 추천</b>\n${getOutfitTip()}`
  );
}

export function extractCity(text: string, defaultCity = "Seoul"): string | null {
  const normalized = text.trim().replace(/\s+/g, " ");
  const afterWeather = normalized.match(/(?:^|\s)날씨\s+(.+)/);
  if (afterWeather) return afterWeather[1].trim();
  const beforeWeather = normalized.match(/^(.+?)\s*날씨/);
  if (beforeWeather) {
    const city = beforeWeather[1].replace(/^\//, "").trim();
    if (city) return city;
  }
  if (normalized.includes("날씨")) return defaultCity;
  return null;
}
