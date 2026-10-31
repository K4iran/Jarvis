(function () {
  "use strict";

  const STYLE = [
    ".zf-overlay{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:clamp(12px,3vw,28px);background:radial-gradient(ellipse at 50% 35%,rgba(8,32,57,.985),rgba(2,7,16,.995) 74%);color:#e7f7ff;opacity:0;transition:opacity .3s ease;overflow:auto}",
    ".zf-overlay[hidden]{display:none!important}.zf-overlay.on{opacity:1}",
    ".zf-panel{width:min(100%,900px);max-height:calc(100dvh - 28px);overflow:auto;border:1px solid rgba(105,205,255,.23);background:linear-gradient(145deg,rgba(7,22,40,.88),rgba(2,9,20,.9));box-shadow:0 0 60px rgba(32,130,220,.11),inset 0 0 40px rgba(67,169,255,.035);backdrop-filter:blur(16px);padding:clamp(16px,3vw,28px);position:relative}",
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
  let chartIndex = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function open(mode) {
    activeMode = mode;
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add("on"); });
    document.getElementById("app")?.classList.add("zf-active");
  }
  function close() {
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
    return "Edinburgh";
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
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset",
      forecast_days: "2", timezone: "auto"
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
    const max = Math.max.apply(null, hours.map(function (h) { return h.temp; }));
    const min = Math.min.apply(null, hours.map(function (h) { return h.temp; }));
    const day = result.data.daily;
    const days = day.time.map(function (time, i) {
      const condition = weatherDescription(day.weather_code[i]);
      return '<div class="zf-hour"><small>' + new Date(time + "T12:00:00").toLocaleDateString("en-GB", { weekday:"short", day:"numeric", timeZone: result.data.timezone }) + '</small><b>' + condition[1] + " " + Math.round(day.temperature_2m_max[i]) + "°</b><small>↓ " + Math.round(day.temperature_2m_min[i]) + "° · rain " + (day.precipitation_probability_max[i] ?? 0) + '%</small></div>';
    }).join("");
    panel.innerHTML = head("LIVE WEATHER / " + escapeHtml(result.place.country || "LOCAL"), escapeHtml(result.place.name)) +
      '<div class="zf-weather-current"><div><div class="zf-temp">' + Math.round(current.temperature_2m) + '°</div><div class="zf-condition">' + info[0] + '</div><div class="zf-muted">Feels like ' + Math.round(current.apparent_temperature) + '°</div></div><div class="zf-weather-icon" aria-hidden="true">' + info[1] + '</div></div>' +
      '<div class="zf-metrics"><div class="zf-metric"><span>Humidity</span><strong>' + current.relative_humidity_2m + '%</strong></div><div class="zf-metric"><span>Wind</span><strong>' + Math.round(current.wind_speed_10m) + ' km/h</strong></div><div class="zf-metric"><span>Rain now</span><strong>' + Number(current.precipitation || 0).toFixed(1) + ' mm</strong></div><div class="zf-metric"><span>Today&#39;s high</span><strong>' + Math.round(day.temperature_2m_max[0]) + '°</strong></div><div class="zf-metric"><span>Today&#39;s low</span><strong>' + Math.round(day.temperature_2m_min[0]) + '°</strong></div><div class="zf-metric"><span>Rain chance</span><strong>' + (day.precipitation_probability_max[0] ?? 0) + '%</strong></div></div>' +
      '<div class="zf-section-label">HOURLY TEMPERATURE / NEXT 24 HOURS</div><div class="zf-chart-wrap"><svg id="zfWeatherChart" class="zf-chart" viewBox="0 0 700 210" role="img" aria-label="Interactive hourly temperature graph"></svg><div class="zf-chart-label"><span id="zfChartSelected">Select a point on the graph</span><span>' + Math.round(min) + '° — ' + Math.round(max) + '°C</span></div></div>' +
      '<div class="zf-section-label">UPCOMING DAYS</div><div class="zf-hour-strip">' + days + '</div>' +
      '<p class="zf-muted">Weather data: Open-Meteo · Local time: ' + escapeHtml(result.data.timezone || "") + '</p>';
    drawWeatherChart(hours);
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
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rss);
    const response = await fetch(url);
    if (!response.ok) throw new Error("The news feed could not be reached.");
    const feed = await response.json();
    if (!Array.isArray(feed.items)) throw new Error("The news feed returned no stories.");
    const positive = /\b(award|awarded|wins|won|success|breakthrough|discovery|record|reunited|rescued|rescue|saved|saving|protects|protected|restores|restored|reopens|opens|launches|launched|helps|helping|community|volunteer|donat|conserv|clean energy|renewable|cure|recovery|improves|improved|first ever|celebrat|inspiring|good news|hope|hopeful|kindness|progress|funding|plants trees|biodiversity|endangered species)\b/i;
    const negative = /\b(death|dead|killed|kill|war|attack|crisis|disaster|tragedy|injur|violence|shooting|bomb|terror|abuse|crash|flood|earthquake|hurricane|storm|fire|missing person|election|politic|scandal|court case|charged with|arrested|laid off|layoff|bankrupt|disease outbreak)\b/i;
    const seen = new Set();
    return feed.items.filter(function (item) {
      const title = cleanFeedText(item.title);
      const summary = cleanFeedText(item.description);
      const key = title.toLowerCase();
      if (!title || seen.has(key) || !positive.test(title) || negative.test(title + " " + summary)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4).map(function (item) {
      return { title: cleanFeedText(item.title), summary: cleanFeedText(item.description).slice(0, 220), source: cleanFeedText(item.author || item.title.split(" - ").pop()), url: item.link || "", date: item.pubDate || "" };
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
  panel.addEventListener("click", function (event) {
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

  async function handleCommand(text, respond) {
    const raw = String(text || "").trim();
    const q = raw.toLowerCase().replace(/^\s*(?:(?:hey[\s,]+)?zero)\b[\s,:-]*/i, "").replace(/[.!?]+$/,"").trim();

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
      open("weather");
      panel.innerHTML = head("LIVE WEATHER / FETCHING", "Weather") + '<div class="zf-status">Checking current conditions for ' + escapeHtml(city) + '…</div>';
      try {
        const result = await fetchWeather(city);
        renderWeather(city, result);
        const current = result.data.current, info = weatherDescription(current.weather_code);
        await respond("In " + result.place.name + ", it is " + Math.round(current.temperature_2m) + " degrees and " + info[0].toLowerCase() + ". It feels like " + Math.round(current.apparent_temperature) + " degrees. Today's high is " + Math.round(result.data.daily.temperature_2m_max[0]) + " and the low is " + Math.round(result.data.daily.temperature_2m_min[0]) + " degrees. The interactive hourly graph and forecast are on screen.");
      } catch (error) {
        panel.innerHTML = head("LIVE WEATHER", "Weather") + '<div class="zf-status">' + escapeHtml(error.message || "Weather is unavailable.") + '</div>';
        await respond("I could not load the weather. " + (error.message || "Please try again."));
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

  window.ZeroExtraFeatures = { handleCommand: handleCommand, openSudoku: openSudoku };
})();