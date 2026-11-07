(function () {
  "use strict";

  const STYLE = [
    ".zf-overlay{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:clamp(12px,3vw,28px);background:radial-gradient(ellipse at 50% 35%,rgba(8,32,57,.78),rgba(2,7,16,.86) 74%);color:#e7f7ff;opacity:0;transition:opacity .3s ease;overflow:auto;backdrop-filter:blur(2px)}",
    ".zf-overlay[hidden]{display:none!important}.zf-overlay.on{opacity:1}",
    ".zf-city-change{appearance:none;border:0;border-bottom:1px dashed rgba(117,210,255,.55);background:transparent;color:#e7f8ff;font:inherit;letter-spacing:inherit;padding:0 0 2px;cursor:pointer}.zf-city-change span{font-size:.72em;color:#70cfff;margin-left:5px}.zf-city-change:focus-visible{outline:2px solid #70cfff;outline-offset:5px}",
    ".zf-panel{width:min(100%,900px);max-height:calc(100dvh - 28px);overflow:auto;border:1px solid rgba(105,205,255,.23);background:linear-gradient(145deg,rgba(7,22,40,.88),rgba(2,9,20,.9));box-shadow:0 0 60px rgba(32,130,220,.11),inset 0 0 40px rgba(67,169,255,.035);backdrop-filter:blur(16px);padding:clamp(16px,3vw,28px);position:relative}",
    ".zf-overlay.zf-weather-presentation{z-index:32;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}",
    ".zf-overlay.zf-weather-presentation .zf-panel{background:linear-gradient(145deg,rgba(5,19,34,.24),rgba(2,8,18,.32));backdrop-filter:blur(5px) saturate(120%);-webkit-backdrop-filter:blur(5px) saturate(120%);border-color:rgba(126,211,255,.34);box-shadow:0 22px 80px rgba(0,0,0,.18),inset 0 0 40px rgba(67,169,255,.04)}",
    ".zf-overlay.zf-weather-presentation .zf-weather-current,.zf-overlay.zf-weather-presentation .zf-metric,.zf-overlay.zf-weather-presentation .zf-chart-wrap,.zf-overlay.zf-weather-presentation .zf-hour{position:relative;background:rgba(5,22,38,.16);backdrop-filter:blur(7px) saturate(125%);-webkit-backdrop-filter:blur(7px) saturate(125%);transition:border-color .35s ease,background .35s ease,box-shadow .35s ease,transform .45s cubic-bezier(.2,.75,.2,1)}",
    ".zf-overlay.zf-weather-presentation .zf-tour-focus{border-color:rgba(116,220,255,.72)!important;outline:1px solid rgba(116,220,255,.28);background:rgba(19,67,96,.34)!important;box-shadow:0 0 0 1px rgba(112,210,255,.16),0 0 34px rgba(62,178,255,.16),inset 0 0 22px rgba(90,196,255,.08);transform:translateZ(0) scale(1.012)}",
    ".zf-weather-overview{display:block;animation:zfWeatherIn .35s ease both}.zf-weather-overview[hidden]{display:none!important}.zf-weather-selectable{cursor:pointer;position:relative;transition:transform .25s ease,border-color .25s ease,background .25s ease}.zf-weather-selectable:active{transform:scale(.985)}.zf-weather-selectable:focus-visible{outline:2px solid #70cfff;outline-offset:3px}.zf-hour[data-weather-detail]{border-radius:2px;color:inherit;font:inherit}.zf-weather-detail-view{min-height:clamp(300px,48vh,560px);padding:clamp(14px,3vw,28px);border:1px solid rgba(112,205,255,.28);background:linear-gradient(145deg,rgba(7,31,52,.34),rgba(2,10,23,.42));box-shadow:inset 0 0 36px rgba(72,178,255,.045);animation:zfWeatherIn .38s cubic-bezier(.2,.75,.2,1) both}.zf-weather-detail-view[hidden]{display:none!important}.zf-detail-back{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(112,205,255,.3);background:rgba(8,35,57,.38);color:#c9f1ff;padding:9px 13px;margin-bottom:20px;font:10px ui-monospace,monospace;letter-spacing:.08em;cursor:pointer}.zf-detail-hero{display:grid;grid-template-columns:1fr auto;align-items:center;gap:14px;padding:18px 0 22px;border-bottom:1px solid rgba(112,205,255,.17)}.zf-detail-kicker{font:10px ui-monospace,monospace;letter-spacing:.2em;color:#73c8ef;text-transform:uppercase}.zf-detail-heading{font-size:clamp(18px,3.8vw,25px);font-weight:300;letter-spacing:.05em;color:#eaf8ff;margin:5px 0 0}.zf-detail-value{font-size:clamp(48px,11vw,76px);font-weight:200;line-height:1.08;color:#f0fbff;margin-top:8px}.zf-detail-summary{font-size:14px;color:#bcecff;margin-top:6px}.zf-detail-icon{font-size:clamp(44px,10vw,68px);filter:drop-shadow(0 0 16px rgba(87,198,255,.24))}.zf-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:18px 0}.zf-detail-stat{padding:13px;border:1px solid rgba(103,194,244,.16);background:rgba(5,25,43,.24)}.zf-detail-stat span{display:block;color:#83a9c1;font:9px ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase}.zf-detail-stat strong{display:block;color:#e2f7ff;font-size:19px;font-weight:400;margin-top:6px}.zf-detail-note{color:#a9c7d8;font-size:12px;line-height:1.7;margin:12px 0}.zf-detail-hours{display:flex;gap:7px;overflow-x:auto;padding:10px 0 4px}.zf-detail-hours button{flex:0 0 auto;min-width:64px;border:1px solid rgba(103,194,244,.18);background:rgba(5,25,43,.26);color:#ccefff;padding:9px 7px;cursor:pointer}.zf-detail-hours button[aria-current=true]{border-color:#75d8ff;background:rgba(48,137,184,.3)}@keyframes zfWeatherIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}",
    ".zf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.zf-kicker{font:10px ui-monospace,monospace;letter-spacing:.24em;color:#69caff;text-transform:uppercase}.zf-title{font-size:clamp(23px,5vw,34px);font-weight:300;letter-spacing:.12em;margin:5px 0 0;color:#e7f8ff}.zf-close{width:36px;height:36px;flex:none;border:1px solid rgba(117,198,239,.3);background:rgba(19,54,79,.35);color:#bfeeff;font-size:22px;cursor:pointer}",
    ".zf-muted{color:#88a9bf;font:12px/1.6 ui-monospace,monospace}.zf-weather-current{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;padding:16px;border:1px solid rgba(103,194,244,.16);background:rgba(21,61,91,.18)}.zf-temp{font-size:clamp(44px,10vw,68px);font-weight:200;line-height:1;color:#f0fbff}.zf-condition{font-size:17px;color:#bcecff;margin-top:5px}.zf-weather-icon{font-size:54px;filter:drop-shadow(0 0 16px rgba(87,198,255,.28))}.zf-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0 18px}.zf-metric{padding:11px;border:1px solid rgba(103,194,244,.13);background:rgba(9,31,51,.4)}.zf-metric span{display:block;color:#7fa5bd;font:9px ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase}.zf-metric strong{display:block;color:#d9f4ff;font-size:17px;font-weight:400;margin-top:5px}.zf-section-label{font:10px ui-monospace,monospace;letter-spacing:.2em;color:#73c8ef;text-transform:uppercase;margin:18px 0 10px}.zf-chart-wrap{border:1px solid rgba(103,194,244,.14);background:rgba(3,15,28,.48);padding:12px}.zf-chart{display:block;width:100%;height:auto;touch-action:pan-y;cursor:crosshair}.zf-chart-label{display:flex;justify-content:space-between;gap:10px;color:#86a9bf;font:11px ui-monospace,monospace;margin-top:5px}.zf-hour-strip{display:grid;grid-auto-columns:minmax(65px,1fr);grid-auto-flow:column;gap:7px;overflow-x:auto;padding:10px 0 3px}.zf-hour{border:1px solid rgba(103,194,244,.13);background:rgba(15,44,68,.34);padding:9px 7px;text-align:center;min-width:0}.zf-hour b{display:block;font-size:16px;font-weight:400;color:#dff7ff}.zf-hour small{display:block;color:#81a8c0;font:10px ui-monospace,monospace;margin-top:4px}.zf-news-list{display:grid;gap:10px}.zf-news-item{border:1px solid rgba(103,194,244,.15);background:rgba(13,42,64,.32);padding:14px}.zf-news-item a{color:#dff6ff;text-decoration:none;font-size:15px}.zf-news-item a:focus,.zf-news-item a:hover{color:#80d9ff}.zf-news-meta{color:#78a3bb;font:10px ui-monospace,monospace;margin-top:7px;letter-spacing:.08em}.zf-news-intro{color:#a9c7d8;font-size:13px;margin:0 0 14px}.zf-status{color:#8eb6cc;font:12px ui-monospace,monospace;padding:16px;text-align:center}",
    ".zf-sudoku-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.zf-difficulties{display:flex;gap:6px;flex-wrap:wrap}.zf-diff,.zf-number{border:1px solid rgba(105,195,240,.25);background:rgba(17,48,73,.48);color:#bfeeff;padding:8px 12px;font:10px ui-monospace,monospace;letter-spacing:.08em;cursor:pointer}.zf-diff.active{border-color:#65cfff;background:rgba(52,153,218,.22);color:#effbff;box-shadow:0 0 14px rgba(79,190,255,.12)}.zf-board-wrap{display:grid;place-items:center}.zf-board{width:min(100%,min(76vw,520px));aspect-ratio:1;display:grid;grid-template-columns:repeat(9,1fr);grid-template-rows:repeat(9,1fr);border:2px solid rgba(125,209,255,.72);box-shadow:0 0 25px rgba(55,158,226,.08)}.zf-cell{min-width:0;min-height:0;padding:0;border:0;border-right:1px solid rgba(110,176,210,.2);border-bottom:1px solid rgba(110,176,210,.2);background:rgba(5,20,35,.65);color:#cdefff;font:clamp(13px,3.8vw,23px) ui-monospace,monospace;cursor:pointer}.zf-cell:nth-child(3n){border-right:2px solid rgba(125,209,255,.62)}.zf-cell:nth-child(9n){border-right:0}.zf-cell:nth-child(n+19):nth-child(-n+27),.zf-cell:nth-child(n+46):nth-child(-n+54){border-bottom:2px solid rgba(125,209,255,.62)}.zf-cell.rowlight,.zf-cell.collight{background:rgba(51,142,207,.12)}.zf-cell.boxlight{background:rgba(51,142,207,.09)}.zf-cell.selected{background:rgba(70,176,255,.3)!important;box-shadow:inset 0 0 0 2px rgba(109,216,255,.85);color:#fff}.zf-cell.given{color:#f1fbff;font-weight:600}.zf-cell.error{color:#ff9eae;background:rgba(160,44,74,.22)}.zf-cell.same{background:rgba(74,179,220,.2)}.zf-sudoku-controls{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:15px auto 7px;max-width:520px}.zf-number{min-width:38px;min-height:42px;font-size:15px;padding:7px}.zf-number.erase{font-size:10px;min-width:62px}.zf-game-foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;color:#84a9bf;font:10px ui-monospace,monospace}.zf-game-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}.zf-action{border:1px solid rgba(105,195,240,.3);background:rgba(19,61,92,.35);color:#c8efff;padding:9px 14px;font:10px ui-monospace,monospace;cursor:pointer}",
    "@media(max-width:520px){.zf-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.zf-board{width:min(100%,90vw)}.zf-cell{font-size:clamp(12px,4.1vw,20px)}.zf-panel{padding:14px}.zf-weather-current{padding:12px}}"
  ].join("");
  const style = document.createElement("style");
  style.id = "zero-extra-features-style";
  style.textContent = STYLE;
  document.head.appendChild(style);

  const overlay = document.createElement("section");
  overlay.id = "zeroFeatureOverlay";
  overlay.className = "zf-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = '<div class="zf-panel" id="zfPanel"></div>';
  document.body.appendChild(overlay);
  const panel = document.getElementById("zfPanel");
  let activeMode = "";
  let sudoku = null;
  let weatherData = null;
  let weatherHours = [];
  let weatherCity = "Edinburgh";
  try { weatherCity = localStorage.getItem("zero.weather.city.v1") || "Edinburgh"; } catch (error) {}
  let chartIndex = 0;
  let weatherTourTimers = [];
  let weatherTourToken = 0;
  let weatherTourRunning = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function open(mode) {
    activeMode = mode;
    overlay.classList.toggle("zf-weather-presentation", mode === "weather");
    window.__zeroOrbSetPresentation?.(true, "data");
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add("on"); });
    document.getElementById("app")?.classList.add("zf-active");
  }
  function close() {
    stopWeatherTour();
    overlay.classList.remove("zf-weather-presentation");
    window.__zeroOrbSetPresentation?.(false, "data");
    overlay.classList.remove("on");
    document.getElementById("app")?.classList.remove("zf-active");
    setTimeout(function () {
      if (!activeMode) overlay.hidden = true;
    }, 320);
    activeMode = "";
    if (sudoku) sudoku.active = false;
    if (typeof window.__zeroReturnToSkillTree === "function") window.__zeroReturnToSkillTree();
  }
  function head(kicker, title) {
    return '<div class="zf-head"><div><div class="zf-kicker">' + kicker + '</div><h2 class="zf-title">' + title + '</h2></div><button class="zf-close" id="zfClose" type="button" aria-label="Close">×</button></div>';
  }
  overlay.addEventListener("click", function (event) {
    if (event.target.id === "zfClose") close();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && activeMode) close();
  });

  function weatherDescription(code) {
    if (code === 0) return ["Clear sky", "☀️"];
    if ([1,2].includes(code)) return ["Partly cloudy", "🌤️"];
    if (code === 3) return ["Overcast", "☁️"];
    if ([45,48].includes(code)) return ["Foggy", "🌫️"];
    if ([51,53,55,56,57].includes(code)) return ["Drizzle", "🌦️"];
    if ([61,63,65,66,67,80,81,82].includes(code)) return ["Rain", "🌧️"];
    if ([71,73,75,77,85,86].includes(code)) return ["Snow", "❄️"];
    if ([95,96,99].includes(code)) return ["Thunderstorms", "⛈️"];
    return ["Conditions unavailable", "🌡️"];
  }
  function getWeatherCity(text) {
    const cleaned = String(text || "").replace(/^\s*(?:(?:hey[\s,]+)?zero)\b[\s,:-]*/i, "").trim();
    const match = cleaned.match(/\b(?:weather|forecast|temperature|conditions|rain|raining|sunny|cloudy|windy)\b.*?\b(?:in|for|at)\s+(.+?)\s*$/i) ||
      cleaned.match(/\b(?:in|for|at)\s+(.+?)\s+(?:weather|forecast)\b/i);
    if (match && match[1]) return match[1].replace(/[?.!]+$/g, "").trim();
    return weatherCity || "Edinburgh";
  }
  async function fetchWeather(city) {
    const geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json";
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("The location service is unavailable.");
    const geo = await geoResponse.json();
    const place = geo.results && geo.results[0];
    if (!place) throw new Error("I could not find " + city + ". Try another city name.");
    const params = new URLSearchParams({
      latitude: place.latitude, longitude: place.longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
      hourly: "temperature_2m,apparent_temperature,precipitation_probability,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset,wind_speed_10m_max,uv_index_max",
      forecast_days: "7", timezone: "auto"
    });
    const response = await fetch("https://api.open-meteo.com/v1/forecast?" + params.toString());
    if (!response.ok) throw new Error("The weather service is unavailable.");
    return { place: place, data: await response.json() };
  }
  function renderWeather(city, result) {
    weatherData = result;
    const current = result.data.current;
    const info = weatherDescription(current.weather_code);
    const hourly = result.data.hourly;
    // Open-Meteo returns wall-clock timestamps in the requested city's timezone.
    let start = hourly.time.findIndex(function (time) { return time >= current.time; });
    if (start < 0) start = 0;
    const hours = hourly.time.slice(start, start + 24).map(function (time, i) {
      const index = start + i;
      return { time: time, temp: hourly.temperature_2m[index], feels: hourly.apparent_temperature[index], rain: hourly.precipitation_probability[index], code: hourly.weather_code[index] };
    });
    weatherHours = hours;
    const max = Math.max.apply(null, hours.map(function (h) { return h.temp; }));
    const min = Math.min.apply(null, hours.map(function (h) { return h.temp; }));
    const day = result.data.daily;
    const days = day.time.map(function (time, i) {
      const condition = weatherDescription(day.weather_code[i]);
      return '<button type="button" class="zf-hour zf-weather-selectable" data-weather-detail="day" data-day-index="' + i + '" aria-label="Open forecast for ' + escapeHtml(time) + '"><small>' + new Date(time + "T12:00:00").toLocaleDateString("en-GB", { weekday:"short", day:"numeric", timeZone: result.data.timezone }) + '</small><b>' + condition[1] + " " + Math.round(day.temperature_2m_max[i]) + "°</b><small>↓ " + Math.round(day.temperature_2m_min[i]) + "° · rain " + (day.precipitation_probability_max[i] ?? 0) + '%</small></button>';
    }).join("");
    panel.innerHTML = head("LIVE WEATHER / " + escapeHtml(result.place.country || "LOCAL"), '<button type="button" class="zf-city-change" data-weather-change aria-label="Change weather city">' + escapeHtml(result.place.name) + '<span aria-hidden="true">⌄</span></button>') +
      '<div class="zf-weather-overview">' +
      '<div class="zf-weather-current zf-weather-selectable" data-weather-focus="conditions" data-weather-detail="conditions" role="button" tabindex="0" aria-label="Open current conditions"><div><div class="zf-temp">' + Math.round(current.temperature_2m) + '°</div><div class="zf-condition">' + info[0] + '</div></div><div class="zf-weather-icon" aria-hidden="true">' + info[1] + '</div></div>' +
      '<div class="zf-metrics"><button type="button" class="zf-metric zf-weather-selectable" data-weather-focus="feels" data-weather-detail="feels"><span>Feels like</span><strong>' + Math.round(current.apparent_temperature) + '°</strong></button><button type="button" class="zf-metric zf-weather-selectable" data-weather-detail="humidity"><span>Humidity</span><strong>' + current.relative_humidity_2m + '%</strong></button><button type="button" class="zf-metric zf-weather-selectable" data-weather-focus="wind" data-weather-detail="wind"><span>Wind</span><strong>' + Math.round(current.wind_speed_10m) + ' km/h</strong></button><button type="button" class="zf-metric zf-weather-selectable" data-weather-detail="rain"><span>Rain now</span><strong>' + Number(current.precipitation || 0).toFixed(1) + ' mm</strong></button><button type="button" class="zf-metric zf-weather-selectable" data-weather-detail="high"><span>Today&#39;s high</span><strong>' + Math.round(day.temperature_2m_max[0]) + '°</strong></button><button type="button" class="zf-metric zf-weather-selectable" data-weather-detail="low"><span>Today&#39;s low</span><strong>' + Math.round(day.temperature_2m_min[0]) + '°</strong></button><button type="button" class="zf-metric zf-weather-selectable" data-weather-detail="rainChance"><span>Rain chance</span><strong>' + (day.precipitation_probability_max[0] ?? 0) + '%</strong></button></div>' +
      '<div class="zf-section-label">HOURLY TEMPERATURE / NEXT 24 HOURS</div><div class="zf-chart-wrap" data-weather-focus="graph"><svg id="zfWeatherChart" class="zf-chart" viewBox="0 0 700 210" role="img" aria-label="Interactive hourly temperature graph"></svg><div class="zf-chart-label"><span id="zfChartSelected">Tap a point for its full forecast</span><span>' + Math.round(min) + '° — ' + Math.round(max) + '°C</span></div></div><button type="button" class="zf-action" data-weather-detail="graph">EXPAND HOURLY FORECAST</button>' +
      '<div class="zf-section-label">UPCOMING DAYS · TAP TO EXPAND</div><div class="zf-hour-strip" data-weather-focus="days">' + days + '</div>' +
      '<p class="zf-muted">Weather data: Open-Meteo · Local time: ' + escapeHtml(result.data.timezone || "") + '</p></div>' +
      '<div class="zf-weather-detail-view" id="zfWeatherDetail" hidden></div>';
    drawWeatherChart(hours);
  }

  function showWeatherDetail(type, index) {
    if (!weatherData) return;
    stopWeatherTour();
    const result = weatherData;
    const current = result.data.current;
    const daily = result.data.daily;
    const safeIndex = Math.max(0, Math.min(weatherHours.length - 1, Number(index) || 0));
    let title = "Weather details", kicker = weatherCity, value = "", summary = "", icon = "🌡️";
    const stats = [];
    let note = "";
    const add = function (label, amount) { stats.push('<div class="zf-detail-stat"><span>' + label + '</span><strong>' + amount + '</strong></div>'); };
    const condition = weatherDescription(current.weather_code);

    if (type === "conditions") {
      title = "Current conditions"; value = Math.round(current.temperature_2m) + "°"; summary = condition[0]; icon = condition[1];
      add("Feels like", Math.round(current.apparent_temperature) + "°");
      add("Humidity", current.relative_humidity_2m + "%");
      add("Wind", Math.round(current.wind_speed_10m) + " km/h");
      add("Precipitation", Number(current.precipitation || 0).toFixed(1) + " mm");
      note = "This is the latest observed weather for " + escapeHtml(result.place.name) + ". The feels-like value accounts for how temperature and conditions affect perceived warmth.";
    } else if (type === "feels") {
      title = "Feels like"; value = Math.round(current.apparent_temperature) + "°"; summary = "Perceived temperature"; icon = "🌡️";
      add("Actual temperature", Math.round(current.temperature_2m) + "°");
      add("Difference", (current.apparent_temperature - current.temperature_2m > 0 ? "+" : "") + (current.apparent_temperature - current.temperature_2m).toFixed(1) + "°");
      add("Humidity", current.relative_humidity_2m + "%");
      add("Wind", Math.round(current.wind_speed_10m) + " km/h");
      note = "Feels-like temperature is an estimate of how warm or cool it feels outdoors, rather than the air temperature measured by the thermometer.";
    } else if (type === "humidity") {
      title = "Humidity"; value = current.relative_humidity_2m + "%"; summary = "Relative humidity"; icon = "💧";
      add("Temperature", Math.round(current.temperature_2m) + "°");
      add("Feels like", Math.round(current.apparent_temperature) + "°");
      add("Wind", Math.round(current.wind_speed_10m) + " km/h");
      note = "Relative humidity compares the amount of moisture in the air with the maximum it could hold at the current temperature.";
    } else if (type === "wind") {
      title = "Wind"; value = Math.round(current.wind_speed_10m) + " km/h"; summary = "Current wind speed"; icon = "💨";
      add("Temperature", Math.round(current.temperature_2m) + "°");
      add("Feels like", Math.round(current.apparent_temperature) + "°");
      add("Humidity", current.relative_humidity_2m + "%");
      note = "Wind speed is measured at the standard weather-station height. Local conditions can vary around buildings and open spaces.";
    } else if (type === "rain") {
      title = "Precipitation"; value = Number(current.precipitation || 0).toFixed(1) + " mm"; summary = "Rain measured now"; icon = "🌧️";
      add("Today's rain chance", (daily.precipitation_probability_max[0] ?? 0) + "%");
      add("Today's high", Math.round(daily.temperature_2m_max[0]) + "°");
      add("Today's low", Math.round(daily.temperature_2m_min[0]) + "°");
      note = "The amount shown is the current precipitation rate reported by the forecast service; the daily rain chance is a separate forecast probability.";
    } else if (type === "high" || type === "low") {
      const isHigh = type === "high";
      title = isHigh ? "Today's high" : "Today's low";
      value = Math.round(isHigh ? daily.temperature_2m_max[0] : daily.temperature_2m_min[0]) + "°";
      summary = isHigh ? "Forecast maximum" : "Forecast minimum"; icon = isHigh ? "☀️" : "🌙";
      add("Other end of range", Math.round(isHigh ? daily.temperature_2m_min[0] : daily.temperature_2m_max[0]) + "°");
      add("Rain chance", (daily.precipitation_probability_max[0] ?? 0) + "%");
      add("Current temperature", Math.round(current.temperature_2m) + "°");
      note = "This is the forecast temperature range for today in " + escapeHtml(result.place.name) + ".";
    } else if (type === "rainChance") {
      title = "Rain probability"; value = (daily.precipitation_probability_max[0] ?? 0) + "%"; summary = "Chance of precipitation today"; icon = "☔";
      add("Rain measured now", Number(current.precipitation || 0).toFixed(1) + " mm");
      add("Today's high", Math.round(daily.temperature_2m_max[0]) + "°");
      add("Today's low", Math.round(daily.temperature_2m_min[0]) + "°");
      note = "This percentage is the forecast probability of precipitation at some point today, not a guarantee that it will rain.";
    } else if (type === "day") {
      const dayIndex = Math.max(0, Math.min(daily.time.length - 1, Number(index) || 0));
      const dayCondition = weatherDescription(daily.weather_code[dayIndex]);
      const date = new Date(daily.time[dayIndex] + "T12:00:00").toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", timeZone:result.data.timezone });
      title = date; kicker = "DAILY FORECAST"; value = Math.round(daily.temperature_2m_max[dayIndex]) + "°"; summary = dayCondition[0]; icon = dayCondition[1];
      add("Low", Math.round(daily.temperature_2m_min[dayIndex]) + "°");
      add("High", Math.round(daily.temperature_2m_max[dayIndex]) + "°");
      add("Rain chance", (daily.precipitation_probability_max[dayIndex] ?? 0) + "%");
      if (daily.sunrise && daily.sunset) {
        add("Sunrise", daily.sunrise[dayIndex].slice(11,16));
        add("Sunset", daily.sunset[dayIndex].slice(11,16));
      }
      if (daily.wind_speed_10m_max) add("Max wind", Math.round(daily.wind_speed_10m_max[dayIndex]) + " km/h");
      if (daily.uv_index_max) add("UV index", Number(daily.uv_index_max[dayIndex]).toFixed(1));
      note = "Forecast summary for " + escapeHtml(result.place.name) + ". Temperature values are the expected daily minimum and maximum.";
    } else {
      const hour = weatherHours[safeIndex] || weatherHours[0];
      if (!hour) return;
      const hourCondition = weatherDescription(hour.code);
      title = "Hourly forecast"; kicker = "NEXT 24 HOURS"; value = Math.round(hour.temp) + "°"; summary = hour.time.slice(0,10) + " · " + hour.time.slice(11,16) + " · " + hourCondition[0]; icon = hourCondition[1];
      add("Feels like", Math.round(hour.feels) + "°");
      add("Rain chance", (hour.rain ?? 0) + "%");
      add("Forecast time", hour.time.slice(11,16));
      add("Weather", hourCondition[0]);
      note = "Select another hour below to inspect how temperature, perceived temperature and rain probability change through the day.";
    }

    const hourButtons = (type === "hour" || type === "graph")
      ? '<div class="zf-section-label">SELECT ANOTHER HOUR</div><div class="zf-detail-hours">' + weatherHours.map(function (h, i) {
          return '<button type="button" data-weather-detail="hour" data-hour-index="' + i + '"' + (i === safeIndex ? ' aria-current="true"' : '') + '><small>' + h.time.slice(11,16) + '</small><br><strong>' + Math.round(h.temp) + '°</strong></button>';
        }).join("") + '</div>'
      : "";
    const detail = document.getElementById("zfWeatherDetail");
    const overview = panel.querySelector(".zf-weather-overview");
    if (!detail || !overview) return;
    detail.innerHTML = '<button type="button" class="zf-detail-back" data-weather-back>← FULL FORECAST</button><div class="zf-detail-kicker">' + escapeHtml(kicker) + '</div><div class="zf-detail-heading">' + escapeHtml(title) + '</div><div class="zf-detail-hero"><div><div class="zf-detail-value">' + value + '</div><div class="zf-detail-summary">' + escapeHtml(summary) + '</div></div><div class="zf-detail-icon" aria-hidden="true">' + icon + '</div></div><div class="zf-detail-grid">' + stats.join("") + '</div><p class="zf-detail-note">' + note + '</p>' + hourButtons;
    overview.hidden = true;
    detail.hidden = false;
    panel.scrollTo({ top:0, behavior:"smooth" });
  }

  function stopWeatherTour() {
    weatherTourToken++;
    weatherTourRunning = false;
    weatherTourTimers.forEach(function (timer) { clearTimeout(timer); });
    weatherTourTimers = [];
    panel.querySelectorAll(".zf-tour-focus").forEach(function (node) { node.classList.remove("zf-tour-focus"); });
  }

  function startWeatherTour() {
    stopWeatherTour();
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const token = weatherTourToken;
    const steps = [
      { selector:'[data-weather-focus="conditions"]', scale:0.52, opacity:0.90, duration:1900, dx:-0.10, dy:0.02 },
      { selector:'[data-weather-focus="feels"]', scale:0.42, opacity:0.86, duration:1750, dx:0.18, dy:-0.02 },
      { selector:'[data-weather-focus="wind"]', scale:0.40, opacity:0.86, duration:1750, dx:-0.20, dy:0.03 },
      { selector:'[data-weather-focus="graph"]', scale:0.56, opacity:0.92, duration:2350, dx:0.16, dy:0.02, scroll:true },
      { selector:'[data-weather-focus="days"]', scale:0.46, opacity:0.88, duration:2000, dx:-0.16, dy:-0.02, scroll:true }
    ];
    weatherTourRunning = true;

    function runStep(index) {
      if (token !== weatherTourToken || activeMode !== "weather") return;
      if (index >= steps.length) {
        weatherTourRunning = false;
        return;
      }
      const step = steps[index];
      const target = panel.querySelector(step.selector);
      if (!target) { runStep(index + 1); return; }

      panel.querySelectorAll(".zf-tour-focus").forEach(function (node) { node.classList.remove("zf-tour-focus"); });
      target.classList.add("zf-tour-focus");

      if (step.scroll) {
        const panelRect = panel.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const nextTop = panel.scrollTop + targetRect.top - panelRect.top - panel.clientHeight * 0.42;
        panel.scrollTo({ top: Math.max(0, nextTop), behavior:"smooth" });
      }

      const placeOrb = function () {
        if (token !== weatherTourToken || activeMode !== "weather") return;
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.5;
        const centerY = rect.top + rect.height * 0.5;
        const x = Math.max(-1, Math.min(1, ((centerX / window.innerWidth - 0.5) * 2 / 0.78) + step.dx));
        const y = Math.max(-1, Math.min(1, ((0.5 - centerY / window.innerHeight) * 2 / 0.78) + step.dy));
        window.__zeroOrbSetPresentationPose?.({
          x:x, y:y, scale:step.scale, opacity:step.opacity,
          rotation:index % 2 ? 0.12 : -0.12
        });
      };
      if (step.scroll) weatherTourTimers.push(setTimeout(placeOrb, 520));
      else requestAnimationFrame(placeOrb);

      weatherTourTimers.push(setTimeout(function () { runStep(index + 1); }, step.duration));
    }

    runStep(0);
  }

  function drawWeatherChart(hours) {
    const svg = document.getElementById("zfWeatherChart");
    if (!svg) return;
    const width = 700, left = 38, right = 16, top = 16, bottom = 34;
    const values = hours.map(function (h) { return h.temp; });
    let low = Math.floor(Math.min.apply(null, values) - 2), high = Math.ceil(Math.max.apply(null, values) + 2);
    if (high - low < 5) { high += 2; low -= 2; }
    const x = function (i) { return left + i * (width - left - right) / Math.max(1, hours.length - 1); };
    const y = function (v) { return top + (high - v) * (bottom + 150 - top) / (high - low); };
    let markup = "";
    for (let i = 0; i <= 4; i++) {
      const val = low + (high - low) * i / 4, yy = y(val);
      markup += '<line x1="' + left + '" y1="' + yy + '" x2="' + (width-right) + '" y2="' + yy + '" stroke="rgba(123,183,214,.15)" stroke-dasharray="3 6"/><text x="4" y="' + (yy+4) + '" fill="#7ea5bd" font-size="11">' + Math.round(val) + '°</text>';
    }
    const points = hours.map(function (h, i) { return x(i) + "," + y(h.temp); });
    const line = "M" + points.join(" L");
    const area = line + " L" + x(hours.length-1) + ",176 L" + x(0) + ",176 Z";
    markup += '<defs><linearGradient id="zfWeatherFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#55c9ff" stop-opacity=".25"/><stop offset="1" stop-color="#55c9ff" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#zfWeatherFill)"/><path d="' + line + '" fill="none" stroke="#75d8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    hours.forEach(function (h, i) {
      if (i % 3 === 0 || i === hours.length - 1) markup += '<text x="' + x(i) + '" y="199" fill="#7fa7bd" font-size="11" text-anchor="middle">' + h.time.slice(11, 13) + ":00" + '</text>';
      markup += '<circle data-hour="' + i + '" cx="' + x(i) + '" cy="' + y(h.temp) + '" r="4" fill="#dff8ff" stroke="#52bfff" stroke-width="2"/>';
    });
    svg.innerHTML = markup;
    const selectHour = function (index) {
      chartIndex = Math.max(0, Math.min(hours.length - 1, index));
      svg.querySelectorAll("circle[data-hour]").forEach(function (circle) {
        const active = Number(circle.dataset.hour) === chartIndex;
        circle.setAttribute("r", active ? "7" : "4");
        circle.setAttribute("fill", active ? "#ffffff" : "#dff8ff");
      });
      const h = hours[chartIndex];
      const label = document.getElementById("zfChartSelected");
      if (label) label.textContent = h.time.slice(0, 10) + " " + h.time.slice(11, 16) + " · " + Math.round(h.temp) + "°C · feels " + Math.round(h.feels) + "° · rain " + (h.rain ?? 0) + "%";
    };
    svg.addEventListener("pointerdown", function (event) {
      const rect = svg.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width * width;
      const ratio = (px - left) / (width - left - right);
      selectHour(Math.round(ratio * (hours.length - 1)));
      showWeatherDetail("hour", chartIndex);
    });
    selectHour(0);
  }

  function cleanFeedText(value) {
    const node = document.createElement("div");
    node.innerHTML = String(value || "");
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }
  async function fetchHappyNews() {
    const query = '("good news" OR "positive news" OR inspiring OR "good things") when:7d';
    const rss = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-GB&gl=GB&ceid=GB:en";
    const encodedRss = encodeURIComponent(rss);
    const endpoints = [
      { url: "https://api.rss2json.com/v1/api.json?rss_url=" + encodedRss, type: "json" },
      { url: "https://api.allorigins.win/raw?url=" + encodedRss, type: "xml" },
      { url: "https://corsproxy.io/?url=" + encodedRss, type: "xml" }
    ];
    let feedItems = [];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeout = controller ? setTimeout(function () { controller.abort(); }, 10000) : null;
        let response;
        try {
          response = await fetch(endpoint.url, controller ? { signal: controller.signal, cache: "no-store" } : { cache: "no-store" });
        } finally {
          if (timeout) clearTimeout(timeout);
        }
        if (!response.ok) throw new Error("News provider returned HTTP " + response.status);
        if (endpoint.type === "json") {
          const data = await response.json();
          if (data.status && data.status !== "ok") throw new Error(data.message || "RSS conversion failed");
          if (!Array.isArray(data.items)) throw new Error("RSS converter returned no items");
          feedItems = data.items;
        } else {
          const xmlText = await response.text();
          const xml = new DOMParser().parseFromString(xmlText, "application/xml");
          if (xml.querySelector("parsererror")) throw new Error("News RSS could not be parsed");
          feedItems = Array.from(xml.querySelectorAll("item")).map(function (item) {
            return {
              title: item.querySelector("title")?.textContent || "",
              description: item.querySelector("description")?.textContent || "",
              link: item.querySelector("link")?.textContent || "",
              pubDate: item.querySelector("pubDate")?.textContent || "",
              author: item.querySelector("source")?.textContent || ""
            };
          });
          if (!feedItems.length) throw new Error("News RSS returned no stories");
        }
        if (feedItems.length) break;
      } catch (error) {
        lastError = error;
        feedItems = [];
      }
    }

    if (!feedItems.length) {
      throw new Error("All happy-news sources were unavailable. " + (lastError && lastError.message ? lastError.message : ""));
    }

    const positive = /\b(award|awarded|wins|won|success|breakthrough|discovery|record|reunited|rescued|rescue|saved|saving|protects|protected|restores|restored|reopens|opens|launches|launched|helps|helping|community|volunteer|donat|conserv|clean energy|renewable|cure|recovery|improves|improved|first ever|celebrat|inspiring|good news|hope|hopeful|kindness|progress|funding|plants trees|biodiversity|endangered species)\b/i;
    const negative = /\b(death|dead|killed|kill|war|attack|crisis|disaster|tragedy|injur|violence|shooting|bomb|terror|abuse|crash|flood|earthquake|hurricane|storm|fire|missing person|election|politic|scandal|court case|charged with|arrested|laid off|layoff|bankrupt|disease outbreak)\b/i;
    const seen = new Set();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return feedItems.filter(function (item) {
      const title = cleanFeedText(item.title);
      const summary = cleanFeedText(item.description);
      const key = title.toLowerCase();
      const published = item.pubDate ? new Date(item.pubDate).getTime() : NaN;
      if (!title || seen.has(key) || !positive.test(title) || negative.test(title + " " + summary)) return false;
      if (Number.isFinite(published) && published < cutoff) return false;
      seen.add(key);
      return true;
    }).slice(0, 4).map(function (item) {
      return {
        title: cleanFeedText(item.title),
        summary: cleanFeedText(item.description).slice(0, 220),
        source: cleanFeedText(item.author || item.title.split(" - ").pop()),
        url: item.link || "",
        date: item.pubDate || ""
      };
    });
  }
  async function showHappyNews(respond) {
    open("news");
    panel.innerHTML = head("POSITIVE BRIEFING / LAST 7 DAYS", "Happy news") + '<div class="zf-status">Finding recent positive stories…</div>';
    try {
      const stories = await fetchHappyNews();
      if (!stories.length) {
        panel.innerHTML = head("POSITIVE BRIEFING", "Happy news") + '<div class="zf-status">I could not find enough clearly positive recent stories. I have skipped anything uncertain rather than risk reading negative news.</div>';
        await respond("I could not find enough clearly positive recent stories right now. I skipped anything uncertain.");
        return;
      }
      panel.innerHTML = head("POSITIVE BRIEFING / LAST 7 DAYS", "Happy news") +
        '<p class="zf-news-intro">A short selection of recent uplifting stories. Only headlines that pass the positive-content filter are included.</p><div class="zf-news-list">' +
        stories.map(function (story) {
          return '<article class="zf-news-item"><a href="' + escapeHtml(story.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(story.title) + '</a>' + (story.summary ? '<p class="zf-news-intro" style="margin:8px 0 0">' + escapeHtml(story.summary) + '</p>' : '') + '<div class="zf-news-meta">' + escapeHtml(story.source) + (story.date ? " · " + escapeHtml(new Date(story.date).toLocaleDateString("en-GB", { day:"numeric", month:"short" })) : "") + '</div></article>';
        }).join("") + '</div><p class="zf-muted">Stories are filtered conservatively. If a headline is ambiguous or negative, ZERO leaves it out.</p>';
      await respond("Here are " + stories.length + " recent positive stories. " + stories.map(function (story, i) { return "Story " + (i+1) + ": " + story.title + (story.summary ? ". " + story.summary : ""); }).join(". "));
    } catch (error) {
      panel.innerHTML = head("POSITIVE BRIEFING", "Happy news") + '<div class="zf-status">' + escapeHtml(error.message || "The news feed is unavailable.") + '</div>';
      await respond("I could not retrieve the happy news feed just now. Please try again in a moment.");
    }
  }

  function shuffled(values) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sudokuCandidates(board, row, col) {
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      used.add(board[row][i]);
      used.add(board[i][col]);
      used.add(board[Math.floor(row/3)*3 + Math.floor(i/3)][Math.floor(col/3)*3 + i%3]);
    }
    return shuffled([1,2,3,4,5,6,7,8,9].filter(function (n) { return !used.has(n); }));
  }
  function fillSolution(board, index) {
    if (index >= 81) return true;
    const row = Math.floor(index / 9), col = index % 9;
    if (board[row][col]) return fillSolution(board, index + 1);
    const options = sudokuCandidates(board, row, col);
    for (const n of options) {
      board[row][col] = n;
      if (fillSolution(board, index + 1)) return true;
    }
    board[row][col] = 0;
    return false;
  }
  function countSolutions(board, limit) {
    let best = null, bestOptions = null;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (board[r][c]) continue;
      const options = sudokuCandidates(board, r, c);
      if (!bestOptions || options.length < bestOptions.length) {
        best = [r,c]; bestOptions = options;
        if (options.length <= 1) break;
      }
    }
    if (!best) return 1;
    if (!bestOptions.length) return 0;
    let count = 0;
    for (const n of bestOptions) {
      board[best[0]][best[1]] = n;
      count += countSolutions(board, limit - count);
      board[best[0]][best[1]] = 0;
      if (count >= limit) return count;
    }
    return count;
  }
  function makePuzzle(difficulty) {
    const solution = Array.from({ length:9 }, function () { return Array(9).fill(0); });
    fillSolution(solution, 0);
    const puzzle = solution.map(function (row) { return row.slice(); });
    const targets = { easy:36, medium:46, hard:52 };
    let removed = 0;
    for (const index of shuffled(Array.from({length:81}, function (_, i) { return i; }))) {
      if (removed >= targets[difficulty]) break;
      const r = Math.floor(index / 9), c = index % 9, value = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions(puzzle.map(function (row) { return row.slice(); }), 2) === 1) removed++;
      else puzzle[r][c] = value;
    }
    return { puzzle:puzzle, solution:solution };
  }
  function newSudoku(difficulty) {
    const generated = makePuzzle(difficulty);
    sudoku = { active:true, difficulty:difficulty, puzzle:generated.puzzle, solution:generated.solution,
      board:generated.puzzle.map(function (row) { return row.slice(); }), selected:null, mistakes:0 };
    renderSudoku();
  }
  function renderSudoku() {
    if (!sudoku) return;
    const selected = sudoku.selected;
    const selectedValue = selected ? sudoku.board[selected[0]][selected[1]] : 0;
    let cells = "";
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const value = sudoku.board[r][c], given = sudoku.puzzle[r][c] !== 0;
      const same = selectedValue && value === selectedValue;
      const cls = ["zf-cell"];
      if (selected && selected[0] === r) cls.push("rowlight");
      if (selected && selected[1] === c) cls.push("collight");
      if (selected && Math.floor(selected[0]/3) === Math.floor(r/3) && Math.floor(selected[1]/3) === Math.floor(c/3)) cls.push("boxlight");
      if (selected && selected[0] === r && selected[1] === c) cls.push("selected");
      if (given) cls.push("given");
      if (same) cls.push("same");
      if (value && !isValidSudokuPlacement(sudoku.board, r, c, value)) cls.push("error");
      cells += '<button type="button" class="' + cls.join(" ") + '" data-cell="' + r + '-' + c + '" aria-label="Row ' + (r+1) + ', column ' + (c+1) + ', ' + (value || "empty") + '">' + (value || "") + '</button>';
    }
    panel.innerHTML = head("GAMES / NUMBER LOGIC", "Sudoku") +
      '<div class="zf-sudoku-top"><div class="zf-difficulties">' +
      ["easy","medium","hard"].map(function (d) { return '<button type="button" class="zf-diff ' + (sudoku.difficulty === d ? "active" : "") + '" data-difficulty="' + d + '">' + d.toUpperCase() + '</button>'; }).join("") +
      '</div><span class="zf-muted">SELECT A CELL · CHOOSE A NUMBER</span></div>' +
      '<div class="zf-board-wrap"><div class="zf-board" role="grid" aria-label="Sudoku board">' + cells + '</div></div>' +
      '<div class="zf-sudoku-controls">' + [1,2,3,4,5,6,7,8,9].map(function (n) { return '<button type="button" class="zf-number" data-number="' + n + '">' + n + '</button>'; }).join("") +
      '<button type="button" class="zf-number erase" data-number="0">ERASE</button></div>' +
      '<div class="zf-game-foot"><span id="zfSudokuStatus">' + (selected ? "Selected row " + (selected[0]+1) + ", column " + (selected[1]+1) : "Choose any empty cell") + '</span><span>ERRORS: ' + sudoku.mistakes + '</span></div>' +
      '<div class="zf-game-actions"><button type="button" class="zf-action" data-sudoku="new">NEW PUZZLE</button><button type="button" class="zf-action" data-sudoku="exit">EXIT GAME</button></div>';
  }
  function isValidSudokuPlacement(board, row, col, value) {
    for (let i = 0; i < 9; i++) {
      if (i !== col && board[row][i] === value) return false;
      if (i !== row && board[i][col] === value) return false;
      const rr = Math.floor(row/3)*3 + Math.floor(i/3), cc = Math.floor(col/3)*3 + i%3;
      if ((rr !== row || cc !== col) && board[rr][cc] === value) return false;
    }
    return true;
  }
  function placeSudokuNumber(number) {
    if (!sudoku || !sudoku.active || !sudoku.selected) return false;
    const row = sudoku.selected[0], col = sudoku.selected[1];
    if (sudoku.puzzle[row][col]) return false;
    if (number && !isValidSudokuPlacement(sudoku.board, row, col, number)) {
      sudoku.mistakes++;
      renderSudoku();
      const status = document.getElementById("zfSudokuStatus");
      if (status) status.textContent = "That number conflicts with this row, column or box.";
      return false;
    }
    sudoku.board[row][col] = number;
    renderSudoku();
    if (sudoku.board.every(function (r, ri) { return r.every(function (v, ci) { return v === sudoku.solution[ri][ci]; }); })) {
      const status = document.getElementById("zfSudokuStatus");
      if (status) status.textContent = "Puzzle complete — excellent work.";
    }
    return true;
  }
  panel.addEventListener("pointerdown", function () {
    if (activeMode === "weather" && weatherTourRunning) stopWeatherTour();
  }, { passive:true });
  panel.addEventListener("keydown", function (event) {
    if (activeMode !== "weather" || (event.key !== "Enter" && event.key !== " ")) return;
    const item = event.target.closest("[data-weather-detail][role=button]");
    if (!item) return;
    event.preventDefault();
    showWeatherDetail(item.dataset.weatherDetail, 0);
  });
  panel.addEventListener("click", function (event) {
    const changeCity = event.target.closest("[data-weather-change]");
    if (changeCity && activeMode === "weather") {
      const nextCity = window.prompt("Change weather city:", weatherCity);
      if (nextCity && nextCity.trim()) openWeather(nextCity.trim());
      return;
    }
    const weatherBack = event.target.closest("[data-weather-back]");
    if (weatherBack && activeMode === "weather") {
      const detail = document.getElementById("zfWeatherDetail");
      const overview = panel.querySelector(".zf-weather-overview");
      if (detail) detail.hidden = true;
      if (overview) overview.hidden = false;
      panel.scrollTo({ top:0, behavior:"smooth" });
      return;
    }
    const weatherItem = event.target.closest("[data-weather-detail]");
    if (weatherItem && activeMode === "weather") {
      showWeatherDetail(weatherItem.dataset.weatherDetail, weatherItem.dataset.hourIndex || weatherItem.dataset.dayIndex || 0);
      return;
    }
    const cell = event.target.closest("[data-cell]");
    if (cell && sudoku && sudoku.active) {
      const parts = cell.dataset.cell.split("-").map(Number);
      sudoku.selected = parts;
      renderSudoku();
      return;
    }
    const number = event.target.closest("[data-number]");
    if (number) {
      if (!sudoku || !sudoku.selected) {
        const status = document.getElementById("zfSudokuStatus");
        if (status) status.textContent = "Select an empty cell first.";
      } else placeSudokuNumber(Number(number.dataset.number));
      return;
    }
    const difficulty = event.target.closest("[data-difficulty]");
    if (difficulty) { newSudoku(difficulty.dataset.difficulty); return; }
    const action = event.target.closest("[data-sudoku]");
    if (action) {
      if (action.dataset.sudoku === "new") newSudoku(sudoku.difficulty);
      else close();
    }
  });
  function openSudoku(difficulty) {
    open("sudoku");
    newSudoku(difficulty || "easy");
  }

  async function openWeather(city) {
    stopWeatherTour();
    const requestedCity=String(city || weatherCity || "Edinburgh").trim() || "Edinburgh";
    weatherCity = requestedCity;
    open("weather");
    panel.innerHTML = head("LIVE WEATHER / FETCHING", "Weather") + '<div class="zf-status">Checking current conditions for ' + escapeHtml(requestedCity) + '…</div>';
    try {
      const result=await fetchWeather(requestedCity);
      weatherCity = result.place.name || requestedCity;
      try { localStorage.setItem("zero.weather.city.v1", weatherCity); } catch (error) {}
      renderWeather(requestedCity,result);
      requestAnimationFrame(function () { weatherTourTimers.push(setTimeout(startWeatherTour, 420)); });
      return { ok:true, result:result };
    } catch (error) {
      panel.innerHTML = head("LIVE WEATHER", "Weather") + '<div class="zf-status">' + escapeHtml(error.message || "Weather is unavailable.") + '</div>';
      return { ok:false, error:error };
    }
  }

  async function handleCommand(text, respond) {
    const raw = String(text || "").trim();
    const q = raw.toLowerCase().replace(/^\s*(?:(?:hey[\s,]+)?zero)\b[\s,:-]*/i, "").replace(/[.!?]+$/,"").trim();

    const outfitIntent = /\b(?:outfit generator|outfit lab|outfit studio)\b/.test(q) ||
      /\b(?:generate|create|design|build)\b.*\boutfit\b/.test(q);
    if (outfitIntent) {
      const promptMatch = q.match(/\b(?:generate|create|design|build)\s+(?:me\s+)?(?:an?\s+)?outfit(?:\s+for)?\s+(.+)/);
      const options = promptMatch
        ? { prompt:promptMatch[1].trim(), generate:true }
        : (/\b(?:generate|create|design|build)\b.*\boutfit\b/.test(q) ? { generate:true } : {});
      if (window.ZeroOutfitGenerator && typeof window.ZeroOutfitGenerator.open === 'function') {
        window.ZeroOutfitGenerator.open(options);
        await respond(options.generate ? "Opening the Outfit Lab and composing a look." : "Opening the Outfit Lab.");
      } else {
        await respond("The Outfit Lab is not available right now. Please refresh ZERO and try again.");
      }
      return true;
    }

    if (sudoku && sudoku.active) {
      if (/^(?:exit|quit|close|stop|end)(?: sudoku| game)?$/.test(q)) {
        close();
        await respond("Sudoku closed. Returning to the main interface.");
        return true;
      }
      const diff = q.match(/^(easy|medium|hard)(?:\s+(?:difficulty|puzzle))?$/);
      if (diff || /\b(?:new puzzle|new game|restart)\b/.test(q)) {
        newSudoku(diff ? diff[1] : sudoku.difficulty);
        await respond("A new " + sudoku.difficulty + " Sudoku puzzle is ready.");
        return true;
      }
      const spokenNumber = q.match(/^(?:put|place|enter|number|select)\s+([1-9])$/) || q.match(/^([1-9])$/);
      if (spokenNumber) {
        const done = placeSudokuNumber(Number(spokenNumber[1]));
        await respond(done ? "Number entered." : "Select an empty cell first, or choose a number that fits.");
        return true;
      }
      if (/^(?:erase|clear cell|remove number)$/.test(q)) {
        placeSudokuNumber(0);
        await respond("Cell cleared.");
        return true;
      }
      if (/\b(?:sudoku|number puzzle)\b/.test(q)) {
        await respond("Your Sudoku puzzle is on screen. Select a cell, then choose a number.");
        return true;
      }
    }

    if (/\b(?:happy news|good news|positive news|uplifting news|read me some happy news|give me some happy news)\b/.test(q)) {
      await showHappyNews(respond);
      return true;
    }
    if (/\b(?:weather|forecast|temperature|conditions|rain|raining|sunny|cloudy|windy)\b/.test(q)) {
      const city = getWeatherCity(raw);
      const weatherResult=await openWeather(city);
      if(weatherResult.ok) {
        const result=weatherResult.result;
        const current = result.data.current, info = weatherDescription(current.weather_code);
        await respond("In " + result.place.name + ", it is " + Math.round(current.temperature_2m) + " degrees and " + info[0].toLowerCase() + ". It feels like " + Math.round(current.apparent_temperature) + " degrees. Today's high is " + Math.round(result.data.daily.temperature_2m_max[0]) + " and the low is " + Math.round(result.data.daily.temperature_2m_min[0]) + " degrees. The interactive hourly graph and forecast are on screen.");
      } else {
        const error=weatherResult.error;
        await respond("I could not load the weather. " + (error && error.message || "Please try again."));
      }
      return true;
    }
    if (/\b(?:play|start|open|launch)\b/.test(q) && /\b(?:sudoku|number puzzle)\b/.test(q)) {
      const difficulty = /\bhard\b/.test(q) ? "hard" : /\bmedium\b/.test(q) ? "medium" : "easy";
      openSudoku(difficulty);
      await respond("Sudoku is ready. Choose a difficulty at the top, then select a cell and a number.");
      return true;
    }
    return false;
  }

  window.ZeroExtraFeatures = { handleCommand: handleCommand, openSudoku: openSudoku, openWeather: openWeather, openHappyNews: function () { return showHappyNews(async function () {}); } };
})();