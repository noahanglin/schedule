// App logic: rendering, check-offs and saving. The schedule itself lives in schedule.js.
(function () {
  "use strict";

  const S = window.SCHEDULE;
  const CAT = S.CATEGORIES;
  const SPAN = S.SPAN;
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const STORE_KEY = "dailyRundown.v1";

  // ---------- State ----------
  const state = {
    wake: S.DEFAULT_WAKE,
    days: {},           // "YYYY-MM-DD" -> { marks: {blockId: true}, note: "" }
    selected: null,     // date key being viewed
    sync: "loading"
  };

  // ---------- Saving (on this device) ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) applyData(JSON.parse(raw));
      state.sync = "ok";
    } catch (_) {
      state.sync = "blocked";
    }
  }
  function applyData(data) {
    if (!data || typeof data !== "object") throw new Error("not a backup");
    if (Number.isFinite(data.wake) && data.wake >= 0 && data.wake < 1440) state.wake = data.wake;
    const days = {};
    for (const [k, v] of Object.entries(data.days || {})) {
      if (!/^\d{4}-\d\d-\d\d$/.test(k) || !v || typeof v !== "object") continue;
      days[k] = { marks: (v.marks && typeof v.marks === "object") ? v.marks : {}, note: typeof v.note === "string" ? v.note : "" };
    }
    state.days = days;
  }
  function snapshot() { return { app: "daily-rundown", version: 1, wake: state.wake, days: state.days }; }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(snapshot()));
      if (state.sync !== "ok") { state.sync = "ok"; renderSync(); }
    } catch (_) {
      state.sync = "blocked"; renderSync();
      toast("Couldn't save on this device. Export a backup so nothing is lost.");
    }
  }

  // ---------- Time helpers ----------
  function pad(n) { return String(n).padStart(2, "0"); }
  function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dateOf(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
  function addDays(key, n) { const d = dateOf(key); d.setDate(d.getDate() + n); return keyOf(d); }
  function dowOf(key) { return (dateOf(key).getDay() + 6) % 7; }
  function weekStart(key) { return addDays(key, -dowOf(key)); }
  function fmt(mins) {
    const m = ((mins % 1440) + 1440) % 1440;
    let h = Math.floor(m / 60); const mm = m % 60;
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return h + ":" + pad(mm) + " " + ap;
  }
  function fmtS(mins) { return fmt(mins).replace(" AM", "a").replace(" PM", "p"); }
  function fmtDur(d) { return d >= 60 ? (Math.floor(d / 60) + "h" + (d % 60 ? pad(d % 60) : "")) : d + "m"; }
  // Until a few hours before wake time it still counts as the previous day (late streams, late nights).
  function nowInfo() {
    const n = new Date();
    let mins = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
    let key = keyOf(n);
    if (mins < Math.max(240, state.wake - 300)) { key = addDays(key, -1); mins += 1440; }
    return { key, mins };
  }
  function planFor(dow) { return S.planFor(dow, off => fmt(state.wake + off)); }

  // ---------- Scoring ----------
  function marksFor(key) { return (state.days[key] && state.days[key].marks) || {}; }
  function blockState(key, b, now) {
    if (marksFor(key)[b.id]) return "done";
    if (key < now.key) return "miss";
    if (key === now.key && now.mins >= state.wake + b.off + b.dur) return "miss";
    return "plan";
  }
  function dayScore(key) {
    const plan = planFor(dowOf(key)).filter(b => b.check);
    const marks = marksFor(key);
    return { done: plan.filter(b => marks[b.id]).length, total: plan.length };
  }
  function workoutStreak(now) {
    let key = now.key;
    if (!marksFor(key).workout) key = addDays(key, -1);
    let n = 0;
    while (marksFor(key).workout && n < 3650) { n++; key = addDays(key, -1); }
    return n;
  }

  // ---------- Rendering ----------
  const $ = id => document.getElementById(id);

  function checkBox(key, b, now) {
    const done = !!marksFor(key)[b.id];
    const dis = key > now.key ? " disabled" : "";
    return '<button type="button" class="check" role="checkbox" data-check data-key="' + key + '" data-id="' + b.id + '" aria-checked="' + done + '"' + dis + ' aria-label="' + b.name + ' done"><span class="box"></span></button>';
  }

  function renderStats(now) {
    const s = dayScore(now.key);
    const ws = weekStart(now.key);
    let wd = 0, wt = 0;
    for (let i = 0; i < 7; i++) {
      const k = addDays(ws, i);
      if (k > now.key) break;
      const d = dayScore(k); wd += d.done; wt += d.total;
    }
    $("stats").innerHTML =
      '<div class="stat"><b>' + s.done + '/' + s.total + '</b><span>blocks today</span></div>' +
      '<div class="stat"><b>' + workoutStreak(now) + '</b><span>day workout streak</span></div>' +
      '<div class="stat"><b>' + (wt ? Math.round(wd / wt * 100) : 0) + '%</b><span>this week so far</span></div>';
  }

  function renderDays(now) {
    const ws = weekStart(state.selected);
    let html = '<button type="button" class="nav" data-week="-1" aria-label="Previous week">‹</button>';
    for (let i = 0; i < 7; i++) {
      const k = addDays(ws, i);
      const s = dayScore(k);
      const tag = S.STREAM_DAYS.includes(i) ? '<span class="live-tag">LIVE</span>' : '<span class="pct">&nbsp;</span>';
      const pct = k <= now.key ? Math.round(s.done / s.total * 100) + "%" : "";
      html += '<button type="button" role="tab" class="day' + (k === now.key ? " is-today" : "") + '" data-day="' + k + '" aria-selected="' + (k === state.selected) + '">' +
        '<span class="d">' + DAY_NAMES[i] + '</span><span class="n">' + dateOf(k).getDate() + '</span>' + tag + '<span class="pct">' + (pct || "&nbsp;") + '</span></button>';
    }
    html += '<button type="button" class="nav" data-week="1" aria-label="Next week">›</button>';
    $("days").innerHTML = html;
  }

  function renderRundown(now) {
    const key = state.selected;
    const plan = planFor(dowOf(key));
    $("rundown-title").textContent = key === now.key ? "Today's rundown" : dateOf(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    const s = dayScore(key);
    $("rundown-meta").textContent = s.done + " of " + s.total + " checked";
    // Timeline axis: wake time to lights out, labelled every 3 hours.
    let html = '<li class="row axis" aria-hidden="true"><span></span><span></span><span></span><span></span><div class="ax">' +
      [0, 180, 360, 540, 720, 900].map(o => '<span style="left:' + (o / SPAN * 100) + '%">' + fmtS(state.wake + o).replace(":00", "") + '</span>').join("") + '</div></li>';
    const nowOff = now.mins - state.wake;
    const nowLine = key === now.key && nowOff >= 0 && nowOff <= SPAN ? '<span class="nowline" style="left:' + (nowOff / SPAN * 100).toFixed(2) + '%"></span>' : "";
    for (const b of plan) {
      const start = state.wake + b.off, end = start + b.dur;
      const isNow = key === now.key && now.mins >= start && now.mins < end;
      const isPast = key < now.key || (key === now.key && now.mins >= end);
      const st = b.check ? blockState(key, b, now) : null;
      const cls = "row" + (b.check ? "" : " free") + (isNow ? " now" : "") + (isPast ? " past" : "");
      const sub = b.check ? b.goal : b.sub;
      const tip = b.name + ' (' + CAT[b.cat].label + '): ' + sub + (st === "miss" ? ', not checked' : '');
      html += '<li class="' + cls + '" data-row="' + b.id + '" title="' + tip + '">' +
        (b.check ? checkBox(key, b, now) : '<span></span>') +
        '<span class="t">' + fmt(start) + '</span>' +
        '<span class="dur">' + fmtDur(b.dur) + '</span>' +
        '<div class="seg"><span class="sq' + (st === "miss" ? " miss" : "") + '" style="--cc:' + CAT[b.cat].color + '"></span>' +
        '<span class="name">' + b.name + '</span>' + (isNow ? '<span class="pill air">Now</span>' : '') +
        '<span class="sub">' + sub + '</span></div>' +
        '<div class="trk" aria-hidden="true"><i class="' + (b.off >= SPAN ? "sleep" : "") + '" style="--cc:' + CAT[b.cat].color + ';left:' + (b.off / SPAN * 100).toFixed(2) + '%;width:' + (b.dur / SPAN * 100).toFixed(2) + '%"></i>' + nowLine + '</div>' +
        '</li>';
    }
    $("rundown").innerHTML = html;
    const note = $("day-note");
    if (document.activeElement !== note) note.value = (state.days[key] && state.days[key].note) || "";
    note.disabled = key > now.key;
  }

  // The whole selected day as one strip. Shown on phones, where the rows have no room for their own bars.
  function renderTimeline(now) {
    const key = state.selected;
    const plan = planFor(dowOf(key));
    const marks = marksFor(key);
    const used = new Set();
    let html = "";
    for (const b of plan) {
      if (b.off >= SPAN) continue;
      used.add(b.cat);
      const cls = "tl-seg" + (b.check ? "" : " free") + (marks[b.id] ? " done" : "");
      html += '<button type="button" class="' + cls + '" data-goto="' + b.id + '" aria-label="' + b.name + ', ' + fmt(state.wake + b.off) + ', ' + fmtDur(b.dur) + '"' +
        ' style="--cc:' + CAT[b.cat].color + ';left:' + (b.off / SPAN * 100).toFixed(2) + '%;width:' + (b.dur / SPAN * 100).toFixed(2) + '%"></button>';
    }
    const nowOff = now.mins - state.wake;
    if (key === now.key && nowOff >= 0 && nowOff <= SPAN) html += '<span class="nowline" style="left:' + (nowOff / SPAN * 100).toFixed(2) + '%"></span>';
    $("tl-strip").innerHTML = html;
    $("tl-axis").innerHTML = [0, 180, 360, 540, 720, 900].map(o => '<span style="left:' + (o / SPAN * 100) + '%">' + fmtS(state.wake + o).replace(":00", "") + '</span>').join("");
    $("tl-legend").innerHTML = Object.keys(CAT).filter(c => used.has(c)).map(c => '<span><i style="--cc:' + CAT[c].color + '"></i>' + CAT[c].label + '</span>').join("");
    $("tl-meta").textContent = key === now.key ? "Today" : DAY_NAMES[dowOf(key)] + " " + dateOf(key).getDate();
  }

  function renderBoard(now) {
    const ws = weekStart(state.selected);
    const end = addDays(ws, 6);
    const short = k => dateOf(k).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    $("week-label").textContent = short(ws) + " – " + short(end);
    let html = "<thead><tr><th></th>";
    for (let i = 0; i < 7; i++) html += '<th' + (addDays(ws, i) === now.key ? ' class="today"' : '') + '>' + DAY_NAMES[i].slice(0, 2) + '</th>';
    html += "</tr></thead><tbody>";
    for (const r of S.BOARD_ROWS) {
      html += "<tr><td>" + r.label + "</td>";
      for (let i = 0; i < 7; i++) {
        const k = addDays(ws, i);
        const blocks = planFor(i).filter(b => b.kind === r.kind);
        if (!blocks.length) { html += '<td class="na">–</td>'; continue; }
        html += "<td>" + blocks.map(b => '<i class="dot ' + blockState(k, b, now) + '" title="' + b.name + '"></i>').join("") + "</td>";
      }
      html += "</tr>";
    }
    $("board").innerHTML = html + "</tbody>";
  }

  function renderHours() {
    const totals = {};
    for (let i = 0; i < 7; i++) for (const b of planFor(i)) {
      const lab = b.check && b.id !== "setup" ? S.HOURS[b.kind] : null;
      if (lab) totals[lab] = (totals[lab] || 0) + b.dur;
    }
    $("totals").innerHTML = Object.entries(totals).map(([k, v]) => "<tr><td>" + k + "</td><td>" + (v / 60).toFixed(1).replace(/\.0$/, "") + " h</td></tr>").join("");
  }

  function renderSync() {
    const map = {
      loading: ["", "Loading…"],
      ok: ["ok", "Saved on this device"],
      blocked: ["warn", "Not saving: this browser blocks storage"]
    };
    const [s, t] = map[state.sync] || map.loading;
    const el = $("sync");
    el.dataset.s = s; el.textContent = t;
  }

  function render() {
    const now = nowInfo();
    if (!state.selected) state.selected = now.key;
    $("dateline").textContent = dateOf(now.key).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
      (S.STREAM_DAYS.includes(dowOf(now.key)) ? " · stream night" : "");
    const w = $("wake-input");
    if (document.activeElement !== w) w.value = pad(Math.floor(state.wake / 60)) + ":" + pad(state.wake % 60);
    renderStats(now); renderTimeline(now); renderDays(now); renderRundown(now); renderBoard(now); renderHours(); renderSync();
  }

  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  // ---------- Events ----------
  function dayRecord(key) { return (state.days[key] = Object.assign({ marks: {}, note: "" }, state.days[key])); }

  document.addEventListener("click", e => {
    const m = e.target.closest("[data-check]");
    if (m && !m.disabled) {
      const key = m.dataset.key, id = m.dataset.id;
      const d = dayRecord(key);
      d.marks = Object.assign({}, d.marks);
      if (d.marks[id]) delete d.marks[id]; else d.marks[id] = true;
      save(); render();
      if (d.marks[id] && id === "workout") toast("Workout logged. The rest of the day gets easier from here.");
      return;
    }
    const go = e.target.closest("[data-goto]");
    if (go) {
      const row = document.querySelector('#rundown [data-row="' + go.dataset.goto + '"]');
      if (row) {
        row.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
      }
      return;
    }
    const day = e.target.closest("[data-day]");
    if (day) { state.selected = day.dataset.day; render(); return; }
    const wk = e.target.closest("[data-week]");
    if (wk) { state.selected = addDays(weekStart(state.selected), Number(wk.dataset.week) * 7 + dowOf(state.selected)); render(); }
  });

  let noteTimer;
  $("day-note").addEventListener("input", () => {
    const key = state.selected, val = $("day-note").value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      const d = dayRecord(key);
      if (d.note === val) return;
      d.note = val; save();
    }, 600);
  });

  $("wake-input").addEventListener("change", () => {
    const v = $("wake-input").value;
    if (!/^\d\d:\d\d$/.test(v)) return;
    const [h, m] = v.split(":").map(Number);
    const mins = h * 60 + m;
    if (mins === state.wake) return;
    state.wake = mins; save(); render();
  });

  $("export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "daily-rundown-backup-" + keyOf(new Date()) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Backup saved to your downloads.");
  });

  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== "daily-rundown") throw new Error("wrong file");
      if (!confirm("Replace the check-offs and notes on this device with the backup from " + file.name + "?")) return;
      applyData(data); save(); render();
      toast("Backup imported.");
    } catch (_) {
      toast("That file isn't a Daily Rundown backup. Pick a file you exported from this app.");
    }
  });

  // ---------- Startup ----------
  load();
  render();
  setInterval(render, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  // Ask the phone not to clear this app's storage when space runs low.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
