const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let P = null;          // parámetros del circuito devueltos por el servidor
let data = null;       // secciones de resultados
let lado = "p";        // p = referido a N1, s = referido a N2
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
grupo(".lado button", "s", v => { lado = v; if (P) dibujar(); });
grupo(".barra button[data-d]", "d", v => { decimales = v; if (data) pintar(); });

$("#copiar").addEventListener("click", async () => {
  const txt = data.map(s => `${s.id}) ${s.t}\n` + s.r.map(x => `   ${x.k}: ${redondear(x.v)}`).join("\n")).join("\n\n");
  const b = $("#copiar");
  try { await navigator.clipboard.writeText(txt); b.textContent = "Copiado"; }
  catch { b.textContent = "No se pudo copiar"; }
  setTimeout(() => (b.textContent = "Copiar resultados"), 1600);
});

/* ---------- Diagrama del circuito equivalente (diseño original) ---------- */
function dibujar() {
  const a2 = P.a ** 2, p = lado === "p";
  const Rs = p ? 2 * P.RH : 2 * P.RH / a2, Xs = p ? 2 * P.XLH : 2 * P.XLH / a2, Rc = p ? P.RCH : P.Rcp, Xm = p ? P.XLMCH : P.Xmp;
  const g = v => String(v);
  $("#svg").innerHTML = `<svg viewBox="0 0 900 230" class="orig">
 <text x="10" y="20" font-weight="700">${p ? "Lado primario (N1)" : "Lado secundario (N2)"}</text>
 <path class="w" d="M30 70H100M290 70H330M520 70H640M640 70V150H30V70M420 70V95M420 150V135"/>
 <rect class="c" x="100" y="56" width="190" height="28"/><text x="106" y="75">Req=${g(Rs)}Ω</text>
 <rect class="c" x="330" y="56" width="190" height="28"/><text x="336" y="75">jX=${g(Xs)}Ω</text>
 <rect class="c" x="400" y="95" width="40" height="40"/><text x="448" y="112">RC=${g(Rc)}Ω</text><text x="448" y="130">jXM=${g(Xm)}Ω</text>
 <text x="660" y="115">Carga</text><text x="12" y="115">V</text>
 <text x="10" y="215" style="font-size:11px">Rama de excitación (RC + jXM) en paralelo con la carga · a = ${P.a}</text></svg>`;
}
