const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let P = null;          // parámetros del circuito devueltos por el servidor
let data = null;       // secciones de resultados
let decimales = "all"; // "all" o "4"

const EJEMPLO = { kva: 25, v1: 2400, v2: 240, f: 60, icc: 10.4, vcc: 157, pcc: 360, i0: 5.41, v0: 240, p0: 186, fp: 0.8 };

$("#demo").addEventListener("click", () => {
  for (const k in EJEMPLO) $(`[name=${k}]`).value = EJEMPLO[k];
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
grupo(".barra button[data-d]", "d", v => { decimales = v; if (data) pintar(); });

$("#copiar").addEventListener("click", async () => {
  const txt = data.map(s => `${s.id}) ${s.t}\n` + s.r.map(x => `   ${x.k}: ${redondear(x.v)}`).join("\n")).join("\n\n");
  const b = $("#copiar");
  try { await navigator.clipboard.writeText(txt); b.textContent = "Copiado"; }
  catch { b.textContent = "No se pudo copiar"; }
  setTimeout(() => (b.textContent = "Copiar resultados"), 1600);
});

/* ---------- Diagramas como en el cuaderno ---------- */
// Valores al estilo del cuaderno: 4 decimales, o notación ×10⁻ⁿ si son muy chicos
const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
function cuaderno(v) {
  const x = Math.abs(v);
  if (x !== 0 && x < 0.1) {
    const e = Math.floor(Math.log10(x)), m = v / 10 ** e;
    return `${m.toFixed(4)}×10${String(e).split("").map(c => SUP[c]).join("")}`;
  }
  return v.toFixed(4);
}
const ohm = v => `${cuaderno(v)} Ω`;
const johm = v => `j${cuaderno(v)} Ω`;

// Piezas de dibujo
function resH(x0, x1, y) { const n = 6, w = (x1 - x0) / n, a = 7; let d = `M${x0} ${y}`; for (let i = 0; i < n; i++) d += `L${x0 + w * (i + .5)} ${y + (i % 2 ? a : -a)}`; return d + `L${x1} ${y}`; }
function resV(x, y0, y1) { const n = 6, h = (y1 - y0) / n, a = 7; let d = `M${x} ${y0}`; for (let i = 0; i < n; i++) d += `L${x + (i % 2 ? a : -a)} ${y0 + h * (i + .5)}`; return d + `L${x} ${y1}`; }
function bobH(x0, x1, y) { const n = 4, r = (x1 - x0) / n / 2; let d = `M${x0} ${y}`; for (let i = 0; i < n; i++) d += `a${r} ${r} 0 0 1 ${2 * r} 0`; return d; }
function bobV(x, y0, y1, der = true) { const n = 4, r = (y1 - y0) / n / 2; let d = `M${x} ${y0}`; for (let i = 0; i < n; i++) d += `a${r} ${r} 0 0 ${der ? 1 : 0} 0 ${2 * r}`; return d; }
const T = 70, B = 210;
const term = (x, y, t, abajo) => `<circle class="n" cx="${x}" cy="${y}" r="3.5"/>${t ? `<text class="sym" x="${x}" y="${abajo ? y + 22 : y - 12}" text-anchor="middle">${t}</text>` : ""}`;
// Elemento en serie con su nombre arriba y su valor abajo
const serie = (x0, x1, kind, sym, val) => ({
  d: kind === "R" ? resH(x0, x1, T) : bobH(x0, x1, T),
  t: `<text class="sym" x="${(x0 + x1) / 2}" y="${T - 16}" text-anchor="middle">${sym}</text>
      <text class="val" x="${(x0 + x1) / 2}" y="${T + 26}" text-anchor="middle">${val}</text>`
});
// Rama de excitación vertical: RCH arriba, XLMCH abajo
const rama = (x, sR, vR, sX, vX) => ({
  d: `M${x} ${T}V92${resV(x, 92, 134)}M${x} 134V146${bobV(x, 146, 190)}M${x} 190V${B}`,
  t: `<text class="val" x="${x - 14}" y="118" text-anchor="end">${vR}</text>
      <text class="sym" x="${x + 16}" y="118">${sR}</text>
      <text class="val" x="${x - 14}" y="174" text-anchor="end">${vX}</text>
      <text class="sym" x="${x + 16}" y="174">${sX}</text>`
});
const lamina = (titulo, ancho, d, t) =>
  `<figure class="circ"><figcaption>${titulo}</figcaption><div class="svg"><svg viewBox="0 0 ${ancho} 240" role="img" aria-label="${titulo}">
   <path class="w" d="${d}"/>${t}</svg></div></figure>`;

// Circuito en T: serie izquierda, rama de excitación, serie derecha
function circuitoT(titulo, izq, der, ex, tIzq, tDer) {
  const a = serie(70, 140, "R", ...izq[0]), b = serie(175, 245, "X", ...izq[1]);
  const r = rama(320, ...ex);
  const c = serie(390, 460, "R", ...der[0]), e = serie(495, 565, "X", ...der[1]);
  const d = `M30 ${T}H70${a.d}M140 ${T}H175${b.d}M245 ${T}H390${c.d}M460 ${T}H495${e.d}M565 ${T}H640M30 ${B}H640${r.d}`;
  return lamina(titulo, 680, d, a.t + b.t + c.t + e.t + r.t +
    `<circle class="n" cx="320" cy="${T}" r="3"/><circle class="n" cx="320" cy="${B}" r="3"/>` +
    term(30, T, tIzq[0]) + term(30, B, tIzq[1], true) + term(640, T, tDer[0]) + term(640, B, tDer[1], true));
}

function dibujar() {
  const a2 = P.a ** 2;

  // 1) Circuito equivalente con transformador ideal
  const a = serie(70, 140, "R", "RH", ohm(P.RH)), b = serie(175, 245, "X", "XLH", johm(P.XLH));
  const r = rama(270, "RCH", ohm(P.RCH), "XLMCH", johm(P.XLMCH));
  const c = serie(525, 595, "R", "RX", ohm(P.RX)), e = serie(630, 700, "X", "XLX", johm(P.XLX));
  const d1 = `M30 ${T}H70${a.d}M140 ${T}H175${b.d}M245 ${T}H385V96${bobV(385, 96, 184, true)}M385 184V${B}H30` +
    r.d +
    `${bobV(485, 96, 184, false)}M485 96V${T}H525${c.d}M595 ${T}H630${e.d}M700 ${T}H770M485 184V${B}H770`;
  const ideal = lamina("Circuito equivalente", 810, d1,
    a.t + b.t + e.t + c.t + r.t +
    `<circle class="n" cx="270" cy="${T}" r="3"/><circle class="n" cx="270" cy="${B}" r="3"/>` +
    `<text class="sym" x="404" y="145">N1</text><text class="sym" x="466" y="145" text-anchor="end">N2</text>` +
    term(30, T, "H1") + term(30, B, "H2", true) + term(770, T, "X1") + term(770, B, "X2", true));

  // 2) Referido al primario
  const prim = circuitoT("Circuito primario", [["RH", ohm(P.RH)], ["XLH", johm(P.XLH)]],
    [["R'X", ohm(a2 * P.RX)], ["X'LX", johm(a2 * P.XLX)]],
    ["RCH", ohm(P.RCH), "XLMCH", johm(P.XLMCH)], ["H1", "H2"], ["X1", "X2"]);

  // 3) Referido al secundario
  const sec = circuitoT("Circuito secundario", [["RX", ohm(P.RX)], ["XLX", johm(P.XLX)]],
    [["R'H", ohm(P.RH / a2)], ["X'LH", johm(P.XLH / a2)]],
    ["R'CH", ohm(P.Rcp), "X'LMCH", johm(P.Xmp)], ["", ""], ["X1", "X2"]);

  $("#diagramas").innerHTML = ideal + prim + sec;
}
