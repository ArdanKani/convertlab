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

function readInput() {
  const raw = fromValue.value.trim();
  if (raw === "") return NaN;
  return Number(raw);
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

function selectTab(cat, { focus = false } = {}) {
  if (!CATEGORIES[cat]) cat = "length";
  current = cat;
  for (const tab of tabs) {
    const active = tab.dataset.cat === cat;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) {
      panel.setAttribute("aria-labelledby", tab.id);
      if (focus) {
        tab.focus();
        tab.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }
  const [a, b] = CATEGORIES[cat].defaults;
  fillSelect(fromUnit, cat, a);
  fillSelect(toUnit, cat, b);
  try { localStorage.setItem(STORAGE_KEY, cat); } catch (_) { /* storage unavailable */ }
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
