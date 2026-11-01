"""Función serverless de Vercel: POST /api/calcular
Motor de cálculo del transformador monofásico (circuito equivalente, carga, pérdidas, eficiencia)."""
import cmath
import json
import math
from http.server import BaseHTTPRequestHandler


def pol(z):
    return abs(z), math.degrees(cmath.phase(z))


def num(x, unit=""):
    """Valor con todos sus decimales (repr de float), sin redondear."""
    return f"{float(x)!r} {unit}".strip()


def fmt(z, unit=""):
    m, a = pol(z)
    return f"{m!r} ∠ {a!r}° {unit}".strip()


def solve(d):
    # ---------- Datos ----------
    S = d["kva"] * 1000          # VA
    V1, V2, f = d["v1"], d["v2"], d["f"]
    Icc, Vcc, Pcc = d["icc"], d["vcc"], d["pcc"]
    I0, V0, P0 = d["i0"], d["v0"], d["p0"]
    fp = abs(d["fp"])
    lag = True                                   # carga siempre inductiva (en atraso)
    tarifa, iva = d.get("tarifa", 2.6), d.get("iva", 1.16)
    co2f, horas = d.get("co2", 0.482), d.get("horas", 720)

    for k, v in (("V1", V1), ("V2", V2), ("Icc", Icc), ("I0", I0), ("kVA", S), ("f", f)):
        if v <= 0:
            raise ValueError(f"{k} debe ser mayor que cero.")
    if not 0 < fp <= 1:
        raise ValueError("El factor de potencia debe estar entre 0 y 1.")

    # ---------- a) Circuito equivalente ----------
    a = V1 / V2
    RH = 0.5 * Pcc / Icc**2
    R_X_p = RH                                   # R'X = RH
    arg = (Vcc / Icc) ** 2 - (RH + R_X_p) ** 2
    if arg < 0:
        raise ValueError("Los datos de corto circuito no cuadran: (Vcc/Icc)² es menor que (Pcc/Icc²)². Revisa Vcc, Icc y Pcc.")
    XLH = 0.5 * math.sqrt(arg)
    RX, XLX = RH / a**2, XLH / a**2
    Rcp = P0 / I0**2 - RX                        # R'CH
    arg0 = (V0 / I0) ** 2 - (RX + Rcp) ** 2
    if arg0 < 0:
        raise ValueError("Los datos de vacío no cuadran: (V0/I0)² es menor que (P0/I0²)². Revisa V0, I0 y P0.")
    Xmp = math.sqrt(arg0) - XLX                  # X'LMCH
    RCH, XLMCH = a**2 * Rcp, a**2 * Xmp
    L = lambda X: X / (2 * math.pi * f) * 1000   # mH

    params = dict(a=a, RH=RH, XLH=XLH, RX=RX, XLX=XLX, Rcp=Rcp, Xmp=Xmp, RCH=RCH, XLMCH=XLMCH)

    # ---------- b) Corriente de carga ----------
    theta = math.degrees(math.acos(fp))
    IL = cmath.rect(S / V2, math.radians(-theta if lag else theta))
    VL = complex(V2, 0)

    # ---------- c-e) Energía, costo, CO2 ----------
    P_kw = S / 1000 * math.cos(math.radians(theta))
    kwh = P_kw * horas
    costo = kwh * tarifa * iva
    kco2 = kwh * co2f

    # ---------- f-g) ZL, E2, E1 ----------
    ZL = VL / IL
    E2 = VL + IL * complex(RX, XLX)
    E1 = a * E2

    # ---------- h-l) Rama de excitación ----------
    Zexc = complex(RCH, XLMCH)
    Yexc = 1 / Zexc
    Iexc = E1 / Zexc
    aE, aI = pol(E1)[1], pol(Iexc)[1]
    alfa = 90 - (aE - aI)
    Im = math.cos(math.radians(alfa)) * abs(Iexc)
    Ic = math.sin(math.radians(alfa)) * abs(Iexc)

    # ---------- m-n) Pérdida en el núcleo ----------
    Pc = Ic**2 * RCH
    Pc_kwh = Pc / 1000 * horas

    # ---------- o-q) I1 y pérdidas en el cobre ----------
    ILp = IL / a
    I1 = Iexc + ILp
    PTCU = abs(I1) ** 2 * RH + abs(IL) ** 2 * RX
    PTCU_kwh = PTCU / 1000 * horas

    # ---------- r-s) Entrada ----------
    Sig1 = E1 + I1 * complex(RH, XLH)
    aS, aI1 = pol(Sig1)[1], pol(I1)[1]
    # Bf.p. siempre positivo; f.p.2 siempre negativo (cuadrante IV).
    desfase = (aS - aI1 + 180) % 360 - 180      # ángulo entre Σ1 e I1, en (-180°, 180°]
    Bfp = abs(desfase)
    fp2 = -abs(math.cos(math.radians(Bfp)))
    cuadrante = "IV"

    # ---------- t-u) Eficiencia y regulación ----------
    eta = (V2 * abs(IL) * fp) / (abs(Sig1) * abs(I1) * abs(fp2)) * 100
    reg = ((abs(Sig1) / a) - V2) / V2 * 100

    R = lambda label, val: {"k": label, "v": val}
    sections = [
        {"id": "a", "t": "Parámetros del circuito equivalente", "r": [
            R("Relación de transformación a", num(a)),
            R("RH = R'X", num(RH, "Ω")), R("XLH", num(XLH, "Ω")),
            R("RX", num(RX, "Ω")), R("XLX", num(XLX, "Ω")),
            R("R'CH", num(Rcp, "Ω")), R("X'LMCH", num(Xmp, "Ω")),
            R("RCH", num(RCH, "Ω")), R("XLMCH", num(XLMCH, "Ω")),
            R("LH", num(L(XLH), "mH")), R("LX", num(L(XLX), "mH")), R("LM", num(L(XLMCH), "mH")),
            R("Req referido al primario", num(RH + a**2 * RX, "Ω")),
            R("Xeq referido al primario", num(XLH + a**2 * XLX, "Ω")),
            R("Req referido al secundario", num(RH / a**2 + RX, "Ω")),
            R("Xeq referido al secundario", num(XLH / a**2 + XLX, "Ω")),
        ]},
        {"id": "b", "t": "Corriente de la carga", "r": [
            R("θ = cos⁻¹(f.p.)", num(theta, "°")), R("IL", fmt(IL, "A"))]},
        {"id": "c", "t": "Energía de la carga en el mes", "r": [
            R("P", num(P_kw, "kW")), R("Energía", num(kwh, "kWh"))]},
        {"id": "d", "t": "Importe del mes", "r": [R("Costo con IVA", f"$ {costo!r}")]},
        {"id": "e", "t": "Emisiones de CO₂", "r": [R("kCO₂", num(kco2, "kg"))]},
        {"id": "f", "t": "Impedancia de la carga", "r": [R("ZL", fmt(ZL, "Ω"))]},
        {"id": "g", "t": "Voltajes inducidos", "r": [R("E2", fmt(E2, "V")), R("E1 = a·E2", fmt(E1, "V"))]},
        {"id": "h–i", "t": "Rama de excitación", "r": [
            R("Zexc", fmt(Zexc, "Ω")), R("y = 1/Zexc", fmt(Yexc, "S"))]},
        {"id": "j–l", "t": "Corrientes de excitación", "r": [
            R("Iexc", fmt(Iexc, "A")), R("α", num(alfa, "°")),
            R("Im, magnetización", num(Im, "A")), R("Ic, pérdida en núcleo", num(Ic, "A"))]},
        {"id": "m–n", "t": "Pérdida en el núcleo", "r": [
            R("Pc", num(Pc, "W")), R("Energía en el mes", num(Pc_kwh, "kWh"))]},
        {"id": "o", "t": "Corriente de entrada", "r": [R("I'L = IL/a", fmt(ILp, "A")), R("I1", fmt(I1, "A"))]},
        {"id": "p–q", "t": "Pérdidas en el cobre", "r": [
            R("PTCU", num(PTCU / 1000, "kW")), R("PTCU", num(PTCU, "W")),
            R("Energía en el mes", num(PTCU_kwh, "kWh"))]},
        {"id": "r", "t": "Voltaje de entrada", "r": [R("Σ1", fmt(Sig1, "V"))]},
        {"id": "s", "t": "Factor de potencia de entrada", "r": [
            R("Bf.p.", num(Bfp, "°")), R("f.p.2", num(fp2)), R("Cuadrante", cuadrante)]},
        {"id": "t–u", "t": "Eficiencia y regulación", "r": [
            R("Eficiencia", num(eta, "%")), R("Regulación de voltaje", num(reg, "%"))]},
    ]
    return {"params": params, "sections": sections}


TEXT_FIELDS = set()


def parse(raw):
    d = {}
    for k, v in raw.items():
        if k in TEXT_FIELDS:
            d[k] = v
        elif v in ("", None):
            continue
        else:
            try:
                d[k] = float(v)
            except (TypeError, ValueError):
                raise ValueError(f"El campo «{k}» no es un número válido.")
    for k in ("kva", "v1", "v2", "f", "icc", "vcc", "pcc", "i0", "v0", "p0", "fp"):
        if k not in d:
            raise ValueError(f"Falta el dato «{k}».")
    return d


class handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            raw = json.loads(self.rfile.read(n) or b"{}")
            self._send(200, solve(parse(raw)))
        except (ValueError, ZeroDivisionError) as e:
            msg = str(e) if isinstance(e, ValueError) and str(e) else "Algún dato produce una división entre cero. Revisa los valores."
            self._send(400, {"error": msg})
        except Exception:
            self._send(500, {"error": "Error interno al calcular."})

    def do_GET(self):
        self._send(405, {"error": "Usa POST con los datos en JSON."})
