/* =====================  DIBUJO DE CIRCUITOS  ===================== */
const RES = (x, y, rot = 0) =>
  `<path class="cmp" transform="translate(${x} ${y}) rotate(${rot})" d="M0 0h8l5-9 10 18 10-18 10 18 10-18 5 9h12"/>`;
const IND = (x, y, rot = 0, flip = 1) =>
  `<path class="cmp" transform="translate(${x} ${y}) rotate(${rot}) scale(1 ${flip})" d="M0 0h7a7 7 0 0 1 14 0a7 7 0 0 1 14 0a7 7 0 0 1 14 0a7 7 0 0 1 14 0h7"/>`;
const txt  = (x, y, t, a = "middle") => `<text x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;
const wire = d => `<path class="wire" d="${d}"/>`;
const dot  = (x, y) => `<circle class="term" cx="${x}" cy="${y}" r="3.5"/>`;
const nd   = (x, y) => `<circle class="nd" cx="${x}" cy="${y}" r="3"/>`;
const hR = (x, y, l) => RES(x, y) + txt(x + 35, y - 16, l);
const hL = (x, y, l) => IND(x, y) + txt(x + 35, y - 16, l);
const vR = (x, y, l) => RES(x, y, 90) + txt(x + 18, y + 39, l, "start");
const vL = (x, y, l) => IND(x, y, 90) + txt(x + 18, y + 39, l, "start");

// rama de excitación (RC + jXM en serie) entre la línea superior (y=40) y la inferior (y=230)
const shunt = (x, a, b) =>
  wire(`M${x} 40V60M${x} 130V140M${x} 210V230`) + vR(x, 60, a) + vL(x, 140, b) + nd(x, 40) + nd(x, 230);

const wrap = (w, body) => `<svg viewBox="0 0 ${w} 260" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;

// 1) Circuito equivalente general (con transformador ideal N1:N2)
function circuitoGeneral() {
  return wrap(680,
    wire("M30 40H70M140 40H160M230 40H340M340 40V90M340 160V230M30 230H340") +
    wire("M400 40H430M500 40H520M590 40H620M400 40V90M400 160V230M400 230H620") +
    hR(70, 40, "RH") + hL(160, 40, "XLH") + shunt(260, "RCH", "XLMCH") +
    IND(340, 90, 90, 1) + IND(400, 90, 90, -1) +
    `<path class="core" d="M363 85V165M377 85V165"/>` +
    txt(322, 130, "N1", "end") + txt(418, 130, "N2", "start") +
    hR(430, 40, "RX") + hL(520, 40, "XLX") +
    dot(30, 40) + dot(30, 230) + dot(620, 40) + dot(620, 230) +
    txt(30, 22, "H1") + txt(30, 252, "H2") + txt(620, 22, "X1") + txt(620, 252, "X2"));
}
// 2) Referido al primario
function circuitoPrimario() {
  return wrap(600,
    wire("M30 40H70M140 40H160M230 40H300M370 40H390M460 40H560M30 230H560") +
    hR(70, 40, "RH") + hL(160, 40, "XLH") + shunt(260, "RCH", "XLMCH") +
    hR(300, 40, "R′X") + hL(390, 40, "X′LX") +
    dot(30, 40) + dot(30, 230) + dot(560, 40) + dot(560, 230) +
    txt(30, 22, "H1") + txt(30, 252, "H2") + txt(560, 22, "X1") + txt(560, 252, "X2"));
}
// 3) Referido al secundario
function circuitoSecundario() {
  return wrap(600,
    wire("M30 40H70M140 40H160M230 40H300M370 40H390M460 40H560M30 230H560") +
    hR(70, 40, "RX") + hL(160, 40, "XLX") + shunt(260, "R′CH", "X′LMCH") +
    hR(300, 40, "R′H") + hL(390, 40, "X′LH") +
    dot(30, 40) + dot(30, 230) + dot(560, 40) + dot(560, 230) +
    txt(30, 22, "X1") + txt(30, 252, "X2"));
}

/* Cada slide: título, dibujo y los valores de las incógnitas que aparecen en él */
const SLIDES = [
  { t: "1 · Circuito equivalente general", svg: circuitoGeneral,
    v: p => [["RH", p.RH], ["XLH", p.XLH], ["RCH", p.RCH], ["XLMCH", p.XLMCH], ["RX", p.RX], ["XLX", p.XLX]] },
  { t: "2 · Circuito equivalente referido al primario", svg: circuitoPrimario,
    v: p => [["RH", p.RH], ["XLH", p.XLH], ["RCH", p.RCH], ["XLMCH", p.XLMCH], ["R′X = a²·RX", p.RXp], ["X′LX = a²·XLX", p.XLXp]] },
  { t: "3 · Circuito equivalente referido al secundario", svg: circuitoSecundario,
    v: p => [["RX", p.RX], ["XLX", p.XLX], ["R′CH", p.Rcp], ["X′LMCH", p.Xmp], ["R′H = RH/a²", p.RHp], ["X′LH = XLH/a²", p.XLHp]] },
];

function renderSlides(p) {
  $("#slides").innerHTML = SLIDES.map(s => `
    <div class="slide">
      <h3>${s.t}</h3>${s.svg()}
      <div class="vals">${s.v(p).map(([k, v]) => `<div class="val"><b>${k}</b><span>${v} Ω</span></div>`).join("")}</div>
    </div>`).join("");
  $("#dots").innerHTML = SLIDES.map((_, i) => `<button class="dot${i ? "" : " on"}" type="button" data-i="${i}" aria-label="Circuito ${i + 1}"></button>`).join("");
  $("#slides").scrollLeft = 0;
}

/* =====================  INTERFAZ  ===================== */
function $(s) { return document.querySelector(s); }

const sl = $("#slides");
const goTo = i => sl.scrollTo({ left: i * sl.clientWidth, behavior: "smooth" });
$(".prev").onclick = () => goTo(Math.max(0, Math.round(sl.scrollLeft / sl.clientWidth) - 1));
$(".next").onclick = () => goTo(Math.min(SLIDES.length - 1, Math.round(sl.scrollLeft / sl.clientWidth) + 1));
$("#dots").onclick = e => { if (e.target.dataset.i) goTo(+e.target.dataset.i); };
sl.onscroll = () => {
  const i = Math.round(sl.scrollLeft / sl.clientWidth);
  document.querySelectorAll(".dot").forEach((d, k) => d.classList.toggle("on", k === i));
};

$("#demo").onclick = () => {
  const e = { kva: 25, v1: 2400, v2: 240, f: 60, icc: 10.4, vcc: 157, pcc: 360, i0: 5.41, v0: 240, p0: 186, fp: 0.8 };
  for (const k in e) $(`[name=${k}]`).value = e[k];
};

$("#f").onsubmit = async ev => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(ev.target));
  for (const k in d) if (k !== "convencion") d[k] = parseFloat(d[k]);
  const er = $("#err");
  try {
    const r = await fetch("/api/calcular", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Error en el cálculo");
    er.style.display = "none";
    $("#out").style.display = "block";
    renderSlides(j.params);
    $("#res").innerHTML = j.sections.map(s =>
      `<div class="card"><h2>${s.t}</h2>${s.r.map(x => `<div class="row"><span>${x.k}</span><span>${x.v}</span></div>`).join("")}</div>`).join("");
    $("#out").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    er.textContent = "⚠ " + e.message;
    er.style.display = "block";
    $("#out").style.display = "none";
  }
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
