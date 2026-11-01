const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let P = null;          // parámetros del circuito devueltos por el servidor
let data = null;       // secciones de resultados
let lado = "p";        // p = referido a N1, s = referido a N2
let decimales = "all"; // "all" o "4"

const EJEMPLO = { kva: 25, v1: 2400, v2: 240, f: 60, icc: 10.4, vcc: 157, pcc: 360, i0: 5.41, v0: 240, p0: 186, fp: 0.8 };

$("#demo").addEventListener("click", () => {
  for (const k in EJEMPLO) $(`[name=${k}]`).value = EJEMPLO[k];
  $("#t1").checked = true;
  $("#f").requestSubmit();
});

$("#f").addEventListener("submit", async ev => {
  ev.preventDefault();
  const err = $("#err"), btn = $(".calc");
  const d = Object.fromEntries(new FormData(ev.target));
  btn.setAttribute("aria-busy", "true");
  btn.textContent = "Calculando…";
  try {
    const r = await fetch("/api/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d)
    });
    let j;
    try { j = await r.json(); } catch { throw new Error("El servidor no respondió. Si estás en local, ejecuta python dev.py o vercel dev."); }
    if (!r.ok) throw new Error(j.error || "No se pudo calcular.");
    err.hidden = true;
    P = j.params; data = j.sections;
    $("#vacio").hidden = true;
    $("#res").hidden = false;
    dibujar();
    pintar();
    if (window.matchMedia("(max-width:900px)").matches) $("#out").scrollIntoView();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    btn.removeAttribute("aria-busy");
    btn.textContent = "Calcular";
  }
});

/* ---------- Formato de números ---------- */
const sig4 = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4, useGrouping: false });
const NUM = /-?\d+\.\d+(?:e[+-]?\d+)?|-?\d+e[+-]?\d+/g;
function redondear(txt) {
  if (decimales === "all") return txt;
  return txt.replace(NUM, m => {
    const v = Number(m);
    if (v !== 0 && Math.abs(v) < 1e-3) return v.toPrecision(4);
    return v.toFixed(4);
  });
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function pintar() {
  $("#pasos").innerHTML = data.map(s => `
    <li class="paso">
      <span class="letra">${esc(s.id)})</span>
      <div class="cuerpo">
        <h2>${esc(s.t)}</h2>
        <dl>${s.r.map(x => `<div class="fila"><dt>${esc(x.k)}</dt><dd>${esc(redondear(x.v))}</dd></div>`).join("")}</dl>
      </div>
    </li>`).join("");
}

/* ---------- Botones de lado y decimales ---------- */
function grupo(sel, attr, fn) {
  $$(sel).forEach(b => b.addEventListener("click", () => {
    $$(sel).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    fn(b.dataset[attr]);
  }));
}
grupo(".lado button", "s", v => { lado = v; if (P) dibujar(); });
grupo(".barra button[data-d]", "d", v => { decimales = v; if (data) pintar(); });

$("#copiar").addEventListener("click", async () => {
  const txt = data.map(s => `${s.id}) ${s.t}\n` + s.r.map(x => `   ${x.k}: ${redondear(x.v)}`).join("\n")).join("\n\n");
  const b = $("#copiar");
  try { await navigator.clipboard.writeText(txt); b.textContent = "Copiado"; }
  catch { b.textContent = "No se pudo copiar"; }
  setTimeout(() => (b.textContent = "Copiar resultados"), 1600);
});

/* ---------- Diagrama del circuito equivalente (modelo T) ---------- */
// Resistencia en zigzag, horizontal o vertical
function resH(x0, x1, y) {
  const n = 6, w = (x1 - x0) / n, a = 7;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i++) d += `L${x0 + w * (i + .5)} ${y + (i % 2 ? a : -a)}`;
  return d + `L${x1} ${y}`;
}
function resV(x, y0, y1) {
  const n = 6, h = (y1 - y0) / n, a = 7;
  let d = `M${x} ${y0}`;
  for (let i = 0; i < n; i++) d += `L${x + (i % 2 ? a : -a)} ${y0 + h * (i + .5)}`;
  return d + `L${x} ${y1}`;
}
// Bobina: semicírculos
function bobH(x0, x1, y) {
  const n = 4, r = (x1 - x0) / n / 2;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i++) d += `a${r} ${r} 0 0 1 ${2 * r} 0`;
  return d;
}
function bobV(x, y0, y1) {
  const n = 4, r = (y1 - y0) / n / 2;
  let d = `M${x} ${y0}`;
  for (let i = 0; i < n; i++) d += `a${r} ${r} 0 0 1 0 ${2 * r}`;
  return d;
}

function dibujar() {
  const a2 = P.a ** 2, p = lado === "p";
  const v = {
    r1: p ? P.RH : P.RH / a2,       x1: p ? P.XLH : P.XLH / a2,
    r2: p ? a2 * P.RX : P.RX,       x2: p ? a2 * P.XLX : P.XLX,
    rc: p ? P.RCH : P.Rcp,          xm: p ? P.XLMCH : P.Xmp
  };
  const n = x => sig4.format(x) + " Ω";
  const pr = p ? "" : "′";   // en N2 los elementos del primario quedan con prima
  const sc = p ? "′" : "";
  const T = 60, B = 200, NX = 360;

  const lbl = (x, sym, val) =>
    `<text class="sym" x="${x}" y="${T - 20}" text-anchor="middle">${sym}</text>
     <text class="val" x="${x}" y="${T + 28}" text-anchor="middle">${val}</text>`;

  $("#svg").innerHTML = `<svg viewBox="0 0 860 236" role="img" aria-label="Circuito equivalente T referido a ${p ? "N1" : "N2"}">
    <path class="w" d="M34 ${T}H80${resH(80, 150, T)}M150 ${T}H196${bobH(196, 266, T)}M266 ${T}H454${resH(454, 524, T)}M524 ${T}H570${bobH(570, 640, T)}M640 ${T}H760V${B}H34M${NX} ${T}V86${resV(NX, 86, 126)}M${NX} 126V136${bobV(NX, 136, 184)}M${NX} 184V${B}"/>
    <circle class="n" cx="${NX}" cy="${T}" r="3.2"/><circle class="n" cx="${NX}" cy="${B}" r="3.2"/>
    <circle cx="34" cy="${T}" r="4" fill="var(--claro)" stroke="var(--texto)" stroke-width="1.6"/>
    <circle cx="34" cy="${B}" r="4" fill="var(--claro)" stroke="var(--texto)" stroke-width="1.6"/>
    <rect x="736" y="102" width="48" height="56" fill="var(--claro)" stroke="var(--texto)" stroke-width="1.6"/>
    <text class="sym" x="760" y="135" text-anchor="middle">ZL</text>

    ${lbl(115, `R${pr}H`, n(v.r1))}
    ${lbl(231, `jX${pr}LH`, n(v.x1))}
    ${lbl(489, `R${sc}X`, n(v.r2))}
    ${lbl(605, `jX${sc}LX`, n(v.x2))}

    <text class="sym" x="${NX + 18}" y="104">R${pr}CH</text>
    <text class="val" x="${NX + 18}" y="120">${n(v.rc)}</text>
    <text class="sym" x="${NX + 18}" y="156">jX${pr}LMCH</text>
    <text class="val" x="${NX + 18}" y="172">${n(v.xm)}</text>

    <text class="sym" x="14" y="${(T + B) / 2 + 5}" text-anchor="middle">V${p ? "1" : "′1"}</text>
    <text class="val" x="34" y="${B + 26}">a = ${sig4.format(P.a)}; valores con 4 cifras significativas</text>
  </svg>`;
}
