"use strict";

/* ===== Unit data =====
   Linear categories: factor = how many base units in one of this unit.
   Temperature is affine, so each unit has toK / fromK functions. */
const CATEGORIES = {
  length: {
    defaults: ["m", "ft"],
    units: {
      "µm":  { name: "micrometre",    factor: 1e-6 },
      mm:    { name: "millimetre",    factor: 1e-3 },
      cm:    { name: "centimetre",    factor: 1e-2 },
      m:     { name: "metre",         factor: 1 },
      km:    { name: "kilometre",     factor: 1e3 },
      in:    { name: "inch",          factor: 0.0254 },
      ft:    { name: "foot",          factor: 0.3048 },
      yd:    { name: "yard",          factor: 0.9144 },
      mi:    { name: "mile",          factor: 1609.344 },
      nmi:   { name: "nautical mile", factor: 1852 },
    },
  },
  mass: {
    defaults: ["kg", "lb"],
    units: {
      mg:  { name: "milligram",      factor: 1e-6 },
      g:   { name: "gram",           factor: 1e-3 },
      kg:  { name: "kilogram",       factor: 1 },
      t:   { name: "tonne",          factor: 1000 },
      oz:  { name: "ounce",          factor: 0.028349523125 },
      lb:  { name: "pound",          factor: 0.45359237 },
      st:  { name: "stone",          factor: 6.35029318 },
      ton: { name: "short ton (US)", factor: 907.18474 },
    },
  },
  pressure: {
    defaults: ["bar", "psi"],
    units: {
      Pa:   { name: "pascal",               factor: 1 },
      kPa:  { name: "kilopascal",           factor: 1e3 },
      MPa:  { name: "megapascal",           factor: 1e6 },
      mbar: { name: "millibar",             factor: 100 },
      bar:  { name: "bar",                  factor: 1e5 },
      atm:  { name: "atmosphere",           factor: 101325 },
      psi:  { name: "pound / sq inch",      factor: 6894.757293168 },
      mmHg: { name: "millimetre Hg (torr)", factor: 133.322387415 },
      inHg: { name: "inch of mercury",      factor: 3386.389 },
    },
  },
  energy: {
    defaults: ["kJ", "kWh"],
    units: {
      eV:      { name: "electronvolt",    factor: 1.602176634e-19 },
      J:       { name: "joule",           factor: 1 },
      kJ:      { name: "kilojoule",       factor: 1e3 },
      MJ:      { name: "megajoule",       factor: 1e6 },
      Wh:      { name: "watt-hour",       factor: 3600 },
      kWh:     { name: "kilowatt-hour",   factor: 3.6e6 },
      cal:     { name: "calorie",         factor: 4.184 },
      kcal:    { name: "kilocalorie",     factor: 4184 },
      BTU:     { name: "British thermal unit", factor: 1055.05585262 },
      "ft·lbf": { name: "foot-pound force", factor: 1.3558179483 },
    },
  },
  speed: {
    defaults: ["m/s", "km/h"],
    units: {
      "m/s": { name: "metre per second",   factor: 1 },
      "km/h": { name: "kilometre per hour", factor: 1 / 3.6 },
      mph:   { name: "mile per hour",      factor: 0.44704 },
      kn:    { name: "knot",               factor: 1852 / 3600 },
    },
  },
  temperature: {
    defaults: ["°C", "°F"],
    units: {
      "°C": { name: "Celsius",    toK: (v) => v + 273.15,               fromK: (k) => k - 273.15 },
      "°F": { name: "Fahrenheit", toK: (v) => (v - 32) * 5 / 9 + 273.15, fromK: (k) => (k - 273.15) * 9 / 5 + 32 },
      K:    { name: "Kelvin",     toK: (v) => v,                        fromK: (k) => k },
      "°R": { name: "Rankine",    toK: (v) => v * 5 / 9,                fromK: (k) => k * 9 / 5 },
    },
  },
};

/* ===== Conversion ===== */
function convert(value, cat, from, to) {
  const units = CATEGORIES[cat].units;
  const f = units[from];
  const t = units[to];
  if (f.toK) return t.fromK(f.toK(value));
  return (value * f.factor) / t.factor;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9 || abs < 1e-6) {
    // 6 significant digits in scientific notation, trailing zeros trimmed
    return n.toExponential(5).replace(/\.?0+e/, "e").replace("e+", "e");
  }
  const rounded = Number(n.toPrecision(6));
  // Avoid "-0" after rounding tiny negatives
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

/* ===== UI ===== */
const $ = (id) => document.getElementById(id);
const tabs = Array.from(document.querySelectorAll(".tab"));
const panel = $("panel");
const fromValue = $("from-value");
const fromUnit = $("from-unit");
const toUnit = $("to-unit");
const toValue = $("to-value");
const formula = $("formula");
const allUnits = $("all-units");

const STORAGE_KEY = "convertlab:tab";
let current = "length";

function fillSelect(select, cat, selected) {
  select.innerHTML = "";
  for (const [sym, u] of Object.entries(CATEGORIES[cat].units)) {
    const opt = document.createElement("option");
    opt.value = sym;
    opt.textContent = sym;
    opt.title = u.name;
    if (sym === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

function readNum(el) {
  const raw = el.value.trim();
  if (raw === "") return NaN;
  return Number(raw);
}

function readInput() {
  return readNum(fromValue);
}

function update() {
  const value = readInput();
  const from = fromUnit.value;
  const to = toUnit.value;
  const units = CATEGORIES[current].units;

  if (!Number.isFinite(value)) {
    toValue.textContent = "—";
    formula.textContent = "Enter a value to convert.";
  } else {
    const result = convert(value, current, from, to);
    toValue.textContent = formatNumber(result);
    toValue.title = String(result);
    const unitRate = convert(1, current, from, to);
    formula.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = `${formatNumber(value)} ${from} = ${formatNumber(result)} ${to}`;
    formula.append(strong, `  ·  1 ${units[from].name} = ${formatNumber(unitRate)} ${to}`);
  }

  // "All units" readout
  allUnits.innerHTML = "";
  for (const sym of Object.keys(units)) {
    const li = document.createElement("li");
    if (sym === to) li.classList.add("is-active");
    li.title = units[sym].name;
    const v = document.createElement("span");
    v.className = "v";
    v.textContent = Number.isFinite(value) ? formatNumber(convert(value, current, from, sym)) : "—";
    const u = document.createElement("span");
    u.className = "u";
    u.textContent = sym;
    li.append(v, u);
    allUnits.appendChild(li);
  }
}

/* ===== Wind power ===== */
const BETZ_LIMIT = 0.593; // 16/27 ≈ 0.5926
const powerPanel = $("panel-power");
const pInputs = {
  rho: { el: $("p-rho"), name: "Air density ρ",        valid: (x) => x > 0,  msg: "Enter an air density ρ greater than 0." },
  d:   { el: $("p-d"),   name: "Rotor diameter D",     valid: (x) => x > 0,  msg: "Enter a rotor diameter D greater than 0." },
  v:   { el: $("p-v"),   name: "Wind speed v",         valid: (x) => x >= 0, msg: "Enter a wind speed v of 0 or more." },
  cp:  { el: $("p-cp"),  name: "Power coefficient Cp", valid: (x) => x >= 0, msg: "Enter a power coefficient Cp of 0 or more." },
};
const pFormula = $("p-formula");
const P_FORMULA_HTML = pFormula.innerHTML;
const betzWarn = $("betz-warn");

function setPower(prefix, watts) {
  $(`${prefix}-w`).textContent = formatNumber(watts);
  $(`${prefix}-kw`).textContent = formatNumber(watts / 1e3);
  $(`${prefix}-mw`).textContent = formatNumber(watts / 1e6);
}

function updatePower() {
  const vals = {};
  let firstError = null;
  for (const [key, f] of Object.entries(pInputs)) {
    const x = readNum(f.el);
    const ok = Number.isFinite(x) && f.valid(x);
    f.el.setAttribute("aria-invalid", String(!ok));
    if (!ok && !firstError) firstError = f.msg;
    vals[key] = ok ? x : NaN;
  }

  // Betz warning depends only on a valid Cp
  if (Number.isFinite(vals.cp) && vals.cp > BETZ_LIMIT) {
    betzWarn.textContent = `⚠ Cp ${formatNumber(vals.cp)} exceeds the Betz limit (0.593). No turbine can extract more than ~59.3% of the wind's power.`;
    betzWarn.hidden = false;
  } else {
    betzWarn.hidden = true;
  }

  if (firstError) {
    showPowerError(firstError);
    return;
  }

  const area = Math.PI * (vals.d / 2) ** 2;
  const pWind = 0.5 * vals.rho * area * vals.v ** 3;
  const pTurbine = pWind * vals.cp;

  // Inputs so large the result overflows a number: blame the input that contributes
  // the most orders of magnitude (P ∝ ρ·D²·v³·Cp).
  if (!Number.isFinite(pTurbine)) {
    const share = {
      rho: Math.log10(vals.rho),
      d: 2 * Math.log10(vals.d),
      v: 3 * Math.log10(vals.v),
      cp: Math.log10(vals.cp),
    };
    const key = Object.keys(share).reduce((a, b) => (share[b] > share[a] ? b : a));
    pInputs[key].el.setAttribute("aria-invalid", "true");
    showPowerError(`${pInputs[key].name} is too large to calculate. Enter a smaller value.`);
    return;
  }

  $("p-area").textContent = formatNumber(area);
  setPower("pw", pWind);
  setPower("pt", pTurbine);
  pFormula.innerHTML = P_FORMULA_HTML;
}

function showPowerError(message) {
  $("p-area").textContent = "—";
  setPower("pw", NaN);
  setPower("pt", NaN);
  pFormula.textContent = message;
}

for (const f of Object.values(pInputs)) f.el.addEventListener("input", updatePower);

function selectTab(cat, { focus = false } = {}) {
  const isPower = cat === "windpower";
  if (!isPower && !CATEGORIES[cat]) cat = "length";
  for (const tab of tabs) {
    const active = tab.dataset.cat === cat;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) {
      if (!isPower) panel.setAttribute("aria-labelledby", tab.id);
      if (focus) {
        tab.focus();
        tab.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }
  panel.hidden = isPower;
  powerPanel.hidden = !isPower;
  try { localStorage.setItem(STORAGE_KEY, cat); } catch (_) { /* storage unavailable */ }

  if (isPower) {
    updatePower();
    return;
  }
  current = cat;
  const [a, b] = CATEGORIES[cat].defaults;
  fillSelect(fromUnit, cat, a);
  fillSelect(toUnit, cat, b);
  update();
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab.dataset.cat));
  tab.addEventListener("keydown", (e) => {
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next !== null) {
      e.preventDefault();
      selectTab(tabs[next].dataset.cat, { focus: true });
    }
  });
});

fromValue.addEventListener("input", update);
fromUnit.addEventListener("change", update);
toUnit.addEventListener("change", update);

$("swap").addEventListener("click", () => {
  const value = readInput();
  const from = fromUnit.value;
  const to = toUnit.value;
  if (Number.isFinite(value)) {
    const result = convert(value, current, from, to);
    fromValue.value = String(Number(result.toPrecision(12)));
  }
  fromUnit.value = to;
  toUnit.value = from;
  update();
});

$("year").textContent = new Date().getFullYear();

let saved = "length";
try { saved = localStorage.getItem(STORAGE_KEY) || "length"; } catch (_) { /* storage unavailable */ }
selectTab(saved);

/* ===== Wind background =====
   Slow wind-flow streaks plus faint turbines on a fixed canvas behind the page.
   ~30 fps, paused while the tab is hidden, a single static frame when the
   visitor prefers reduced motion. Colours come from CSS tokens (--flow, --turbine). */
const windBg = (() => {
  const canvas = $("bg");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FRAME_MS = 1000 / 30;
  const TRAIL = 90;      // points kept per streak (~3 s of travel)
  const SEGMENTS = 6;    // trail drawn in 6 chunks of rising opacity
  let w = 0, h = 0, dpr = 1;
  let t = 0, raf = 0, last = 0;
  let streaks = [];
  let colors = { flow: "0, 229, 255", flowA: 0.14, turbine: "0, 229, 255", turbineA: 0.08 };

  // Turbine layouts as fractions of the viewport; size scales the tower height.
  const TURBINES_WIDE = [
    { x: 0.1, size: 1, rps: 0.14, phase: 0.3 },
    { x: 0.8, size: 0.78, rps: 0.18, phase: 1.7 },
    { x: 0.92, size: 0.55, rps: 0.2, phase: 4.1 },
  ];
  const TURBINES_NARROW = [
    { x: 0.16, size: 0.8, rps: 0.15, phase: 0.3 },
    { x: 0.86, size: 0.6, rps: 0.19, phase: 2.2 },
  ];

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const num = (name, fallback) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    colors = {
      flow: cs.getPropertyValue("--flow").trim() || colors.flow,
      flowA: num("--flow-alpha", colors.flowA),
      turbine: cs.getPropertyValue("--turbine").trim() || colors.turbine,
      turbineA: num("--turbine-alpha", colors.turbineA),
    };
  }

  // Smooth, slowly changing flow field; angles stay near 0 so wind drifts left to right.
  function angleAt(x, y) {
    return Math.sin(x * 0.0021 + t * 0.15) * 0.35 + Math.cos(y * 0.0034 - t * 0.1) * 0.25;
  }

  function newStreak(anywhere) {
    return {
      x: anywhere ? Math.random() * w * 1.1 - w * 0.1 : -20 - Math.random() * 60,
      y: Math.random() * h,
      speed: 30 + Math.random() * 30, // px per second
      width: 0.8 + Math.random() * 0.8,
      alpha: 0.5 + Math.random() * 0.5,
      pts: [],
    };
  }

  function targetCount() {
    return Math.max(12, Math.min(45, Math.round((w * h) / 28000)));
  }

  function step(dt) {
    t += dt;
    for (let i = 0; i < streaks.length; i++) {
      const s = streaks[i];
      const a = angleAt(s.x, s.y);
      s.x += Math.cos(a) * s.speed * dt;
      s.y += Math.sin(a) * s.speed * dt;
      s.pts.push(s.x, s.y);
      if (s.pts.length > TRAIL * 2) s.pts.splice(0, 2);
      if (s.x > w + 80 || s.y < -80 || s.y > h + 80) streaks[i] = newStreak(false);
    }
  }

  function drawStreaks() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of streaks) {
      const n = s.pts.length / 2;
      if (n < 2) continue;
      ctx.lineWidth = s.width;
      for (let c = 0; c < SEGMENTS; c++) {
        const from = Math.floor((c * (n - 1)) / SEGMENTS);
        const to = Math.floor(((c + 1) * (n - 1)) / SEGMENTS);
        if (to <= from) continue;
        ctx.strokeStyle = `rgba(${colors.flow}, ${colors.flowA * s.alpha * ((c + 1) / SEGMENTS)})`;
        ctx.beginPath();
        ctx.moveTo(s.pts[from * 2], s.pts[from * 2 + 1]);
        for (let p = from + 1; p <= to; p++) ctx.lineTo(s.pts[p * 2], s.pts[p * 2 + 1]);
        ctx.stroke();
      }
    }
  }

  // One path per turbine, filled once with the nonzero rule. Every part (tower, nacelle,
  // blades, hub) is traced clockwise, so overlaps add up instead of cancelling: they are
  // filled exactly once, with no doubled opacity and no holes.
  function drawTurbine(cfg) {
    const H = Math.min(h * 0.34, 280) * cfg.size; // tower height
    const x = cfg.x * w;
    const baseY = h + 2;
    const hubY = baseY - H;
    const L = H * 0.55; // blade length
    const rot = cfg.phase + t * cfg.rps * Math.PI * 2;

    ctx.beginPath();
    // tapered tower
    const bw = Math.max(2, H * 0.035);
    const tw = Math.max(1, H * 0.016);
    ctx.moveTo(x - bw / 2, baseY);
    ctx.lineTo(x - tw / 2, hubY);
    ctx.lineTo(x + tw / 2, hubY);
    ctx.lineTo(x + bw / 2, baseY);
    ctx.closePath();
    // nacelle
    const nw = H * 0.07;
    const nh = H * 0.03;
    ctx.rect(x - nw * 0.35, hubY - nh / 2, nw, nh);
    // three slender blades
    const root = Math.max(1.5, L * 0.045);
    for (let b = 0; b < 3; b++) {
      const a = rot + (b * Math.PI * 2) / 3;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const px = -sin; // perpendicular
      const py = cos;
      // clockwise on screen: out along the -p edge to the tip, back along the +p edge
      ctx.moveTo(x - px * root, hubY - py * root);
      ctx.quadraticCurveTo(
        x + cos * L * 0.35 - px * root * 0.4, hubY + sin * L * 0.35 - py * root * 0.4,
        x + cos * L, hubY + sin * L
      );
      ctx.quadraticCurveTo(
        x + cos * L * 0.35 + px * root * 1.4, hubY + sin * L * 0.35 + py * root * 1.4,
        x + px * root, hubY + py * root
      );
      ctx.closePath();
    }
    // hub
    ctx.moveTo(x + root * 1.6, hubY);
    ctx.arc(x, hubY, root * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colors.turbine}, ${colors.turbineA})`;
    ctx.fill("nonzero");
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    drawStreaks();
    for (const cfg of w >= 720 ? TURBINES_WIDE : TURBINES_NARROW) drawTurbine(cfg);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Keep existing streaks (phones resize when the address bar hides); only adjust the count.
    const n = targetCount();
    while (streaks.length < n) streaks.push(newStreak(true));
    if (streaks.length > n) streaks.length = n;
    draw();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) { last = now; return; }
    const elapsed = now - last;
    if (elapsed < FRAME_MS - 2) return; // throttle to ~30 fps
    last = now;
    step(Math.min(elapsed, 100) / 1000); // clamp big gaps
    draw();
  }

  function start() {
    if (raf || reduceMotion.matches || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // init: size and colours, then pre-run the simulation so trails exist on first paint
  readColors();
  resize();
  for (let i = 0; i < TRAIL; i++) step(1 / 30);
  draw();
  start();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  const onMotionChange = () => {
    if (reduceMotion.matches) { stop(); draw(); } else start();
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  return {
    refreshColors() { readColors(); draw(); },
    get running() { return raf !== 0; },
  };
})();

/* ===== Theme ===== */
const THEME_KEY = "convertlab:theme";
const themeToggle = $("theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const systemLight = window.matchMedia("(prefers-color-scheme: light)");

function effectiveTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "light" || t === "dark") return t;
  return systemLight.matches ? "light" : "dark";
}

function syncTheme() {
  const theme = effectiveTheme();
  const next = theme === "dark" ? "light" : "dark";
  themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
  themeToggle.title = `Switch to ${next} theme`;
  if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#07090c" : "#f4f8fc");
  windBg.refreshColors();
}

themeToggle.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* storage unavailable */ }
  syncTheme();
});

// Follow the system setting live, as long as the visitor has not picked a theme.
const onSystemTheme = () => {
  if (!document.documentElement.hasAttribute("data-theme")) syncTheme();
};
if (systemLight.addEventListener) systemLight.addEventListener("change", onSystemTheme);
else if (systemLight.addListener) systemLight.addListener(onSystemTheme);

syncTheme();
