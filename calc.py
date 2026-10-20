"""Motor de cálculo: transformador monofásico (circuito equivalente, carga, pérdidas, eficiencia)."""
import cmath
import math


def pol(z):
    return abs(z), math.degrees(cmath.phase(z))


def num(x, unit="", d=None):
    """Valor con TODOS sus decimales (repr de float), sin redondear."""
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
    fp_user = d["fp"]
    fp = abs(fp_user)
    lag = True                # los ángulos de las corrientes SIEMPRE son negativos
    literal = d.get("convencion", "suma") == "suma"   # convención de ángulos del profesor
    tarifa, iva = d.get("tarifa", 2.6), d.get("iva", 1.16)
    co2f, horas = d.get("co2", 0.482), d.get("horas", 720)

    for k, v in (("V1", V1), ("V2", V2), ("Icc", Icc), ("I0", I0), ("kVA", S)):
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
        raise ValueError("Datos de corto circuito inconsistentes: (Vcc/Icc)² < (Pcc/Icc²)².")
    XLH = 0.5 * math.sqrt(arg)
    RX, XLX = RH / a**2, XLH / a**2
    Rcp = P0 / I0**2 - RX                        # R'CH
    arg0 = (V0 / I0) ** 2 - (RX + Rcp) ** 2
    if arg0 < 0:
        raise ValueError("Datos de vacío inconsistentes: (V0/I0)² < (P0/I0²)².")
    Xmp = math.sqrt(arg0) - XLX                  # X'LMCH
    RCH, XLMCH = a**2 * Rcp, a**2 * Xmp

    params = dict(a=a, RH=RH, XLH=XLH, RX=RX, XLX=XLX, Rcp=Rcp, Xmp=Xmp, RCH=RCH, XLMCH=XLMCH,
                  RXp=a**2 * RX, XLXp=a**2 * XLX, RHp=RH / a**2, XLHp=XLH / a**2)

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
    alfa = 90 - (aE + aI if literal else aE - aI)
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
    Bfp = aS + aI1 if literal else aS - aI1
    fp2 = math.cos(math.radians(Bfp))
    b = (Bfp + 180) % 360 - 180
    cuadrante = ("I" if 0 <= b < 90 else "II" if 90 <= b <= 180 else "IV" if -90 <= b < 0 else "III")

    # ---------- t-u) Eficiencia y regulación ----------
    eta = (V2 * abs(IL) * fp) / (abs(Sig1) * abs(I1) * abs(fp2)) * 100
    reg = ((abs(Sig1) / a) - V2) / V2 * 100

    def C(t, k, v):
        """Un resultado = un cuadro."""
        return {"t": t, "r": [{"k": k, "v": v}]}

    sections = [
        {"t": "a) Circuito equivalente — parámetros", "r": [
            {"k": "Relación de transformación a", "v": num(a)},
            {"k": "RH = R'X", "v": num(RH, "Ω")}, {"k": "XLH", "v": num(XLH, "Ω")},
            {"k": "RX", "v": num(RX, "Ω")}, {"k": "XLX", "v": num(XLX, "Ω")},
            {"k": "R'CH", "v": num(Rcp, "Ω")}, {"k": "X'LMCH", "v": num(Xmp, "Ω")},
            {"k": "RCH", "v": num(RCH, "Ω")}, {"k": "XLMCH", "v": num(XLMCH, "Ω")},
        ]},
        C("b) Ángulo de la carga", "θ = cos⁻¹(|f.p.|)", num(theta, "°")),
        C("b) Corriente de la carga", "IL", fmt(IL, "A")),
        C("c) Potencia activa de la carga", "P", num(P_kw, "kW")),
        C("c) Energía de la carga (mes)", "Energía", num(kwh, "kWh")),
        C("d) Importe del mes", "Costo (con IVA)", f"$ {costo!r}"),
        C("e) Emisiones de CO₂", "kCO₂", num(kco2, "kg")),
        C("f) Impedancia de la carga", "ZL", fmt(ZL, "Ω")),
        C("g) Voltaje inducido secundario", "E2", fmt(E2, "V")),
        C("g) Voltaje inducido primario", "E1 = a·E2", fmt(E1, "V")),
        C("h) Impedancia de la rama de excitación", "Zexc", fmt(Zexc, "Ω")),
        C("i) Admitancia de la rama de excitación", "y = 1/Zexc", fmt(Yexc, "S")),
        C("j) Corriente de la rama de excitación", "Iexc", fmt(Iexc, "A")),
        C("k) Ángulo α", "α", num(alfa, "°")),
        C("k) Corriente de magnetización", "Im", num(Im, "A")),
        C("l) Corriente de pérdida del núcleo", "Ic", num(Ic, "A")),
        C("m) Pérdida en el núcleo", "Pc", num(Pc, "W")),
        C("n) Energía disipada por el núcleo (mes)", "Energía", num(Pc_kwh, "kWh")),
        C("o) Corriente de la carga referida al primario", "I'L = IL/a", fmt(ILp, "A")),
        C("o) Corriente a la entrada", "I1", fmt(I1, "A")),
        C("p) Pérdida total del cobre", "PTCU", num(PTCU / 1000, "kW")),
        C("p) Pérdida total del cobre", "PTCU", num(PTCU, "W")),
        C("q) Energía disipada por las bobinas (mes)", "Energía", num(PTCU_kwh, "kWh")),
        C("r) Voltaje a la entrada", "Σ1", fmt(Sig1, "V")),
        C("s) Ángulo del f.p. de entrada", "Bf.p.", num(Bfp, "°")),
        C("s) Factor de potencia de entrada", "f.p.2", num(math.copysign(abs(fp2), fp_user))),
        C("t) Eficiencia", "%η", num(eta, "%")),
        C("u) Regulación de voltaje", "%Reg", num(reg, "%")),
    ]
    return {"params": params, "sections": sections}
