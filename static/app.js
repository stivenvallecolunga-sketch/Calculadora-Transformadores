const $=s=>document.querySelector(s);let P=null,side="p";
$("#demo").onclick=()=>{const e={kva:25,v1:2400,v2:240,f:60,icc:10.4,vcc:157,pcc:360,i0:5.41,v0:240,p0:186,fp:0.8};for(const k in e)$(`[name=${k}]`).value=e[k]};
$("#f").onsubmit=async ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(ev.target));
 for(const k in d)if(k!="tipo"&&k!="convencion")d[k]=parseFloat(d[k]);
 const r=await fetch("/api/calcular",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});
 const j=await r.json(),er=$("#err");
 if(!r.ok){er.textContent="⚠ "+j.error;er.style.display="block";$("#out").style.display="none";return}
 er.style.display="none";P=j.params;$("#out").style.display="block";draw();
 $("#res").innerHTML=j.sections.map(s=>`<div class="card"><h2>${s.t}</h2>${s.r.map(x=>`<div class="row"><span>${x.k}</span><span>${x.v}</span></div>`).join("")}</div>`).join("");
 $("#out").scrollIntoView({behavior:"smooth"})};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));t.classList.add("on");side=t.dataset.s;if(P)draw()});
function draw(){const a2=P.a**2,p=side=="p";
 const Rs=p?2*P.RH:2*P.RH/a2, Xs=p?2*P.XLH:2*P.XLH/a2, Rc=p?P.RCH:P.Rcp, Xm=p?P.XLMCH:P.Xmp;
 const g=v=>String(v);
 $("#svg").innerHTML=`<svg viewBox="0 0 900 230">
 <text x="10" y="20" font-weight="700">${p?"Lado primario (N1)":"Lado secundario (N2)"}</text>
 <path class="w" d="M30 70H100M290 70H330M520 70H640M640 70V150H30V70M420 70V95M420 150V135"/>
 <rect class="c" x="100" y="56" width="190" height="28"/><text x="106" y="75">Req=${g(Rs)}Ω</text>
 <rect class="c" x="330" y="56" width="190" height="28" /><text x="336" y="75">jX=${g(Xs)}Ω</text>
 <rect class="c" x="400" y="95" width="40" height="40" /><text x="448" y="112">RC=${g(Rc)}Ω</text><text x="448" y="130">jXM=${g(Xm)}Ω</text>
 <text x="660" y="115">Carga</text><text x="12" y="115">V</text>
 <text x="10" y="215" fill="currentColor" style="font-size:11px">Rama de excitación (RC + jXM) en paralelo con la carga · a = ${P.a}</text></svg>`}
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js");