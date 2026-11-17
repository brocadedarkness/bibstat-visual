const state={data:null,code:'0180',metrics:['Besok01','Utlan399'],mode:'absolute',mapMetric:'BemanService01',from:'2014',to:'2025'};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(v,d=0)=>v==null?'–':new Intl.NumberFormat('sv-SE',{maximumFractionDigits:d}).format(v);
const value=(code,year,metric,mode=state.mode)=>{const r=state.data.municipalities[code]?.years[year];if(!r||r[metric]==null)return null;if(mode==='per1000'){return r.Population01?r[metric]/r.Population01*1000:null}return r[metric]};

async function start(){state.data=await fetch('data.json').then(r=>r.json());setup();renderAll()}
function setup(){
 const municipalities=Object.entries(state.data.municipalities).sort((a,b)=>a[1].name.localeCompare(b[1].name,'sv'));
 $('#municipality').innerHTML=municipalities.map(([c,m])=>`<option value="${c}">${m.name}</option>`).join('');$('#municipality').value=state.code;
 $('#municipality').addEventListener('change',e=>{state.code=e.target.value;renderAll()});
 $$('.segmented button').forEach(b=>b.onclick=()=>{$$('.segmented button').forEach(x=>x.classList.toggle('active',x===b));state.mode=b.dataset.mode;renderChart()});
 $('#metric-picker').innerHTML=Object.entries(state.data.metrics).map(([c,m])=>`<button data-metric="${c}"><i style="background:${m.color}"></i>${m.label}</button>`).join('');
 $('#metric-picker').onclick=e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.metric;if(state.metrics.includes(m)){if(state.metrics.length>1)state.metrics=state.metrics.filter(x=>x!==m)}else if(state.metrics.length<4)state.metrics.push(m);renderChart()};
 $('#map-metric').innerHTML=Object.entries(state.data.metrics).map(([c,m])=>`<option value="${c}">${m.label}</option>`).join('');$('#map-metric').value=state.mapMetric;
 for(const id of ['from-year','to-year'])$("#"+id).innerHTML=state.data.years.map(y=>`<option>${y}</option>`).join('');$('#from-year').value=state.from;$('#to-year').value=state.to;
 $('#map-metric').onchange=e=>{state.mapMetric=e.target.value;renderMap()};$('#from-year').onchange=e=>{state.from=e.target.value;renderMap()};$('#to-year').onchange=e=>{state.to=e.target.value;renderMap()};
 $('#show-in-chart').onclick=()=>{location.hash='utveckling';renderChart()};
}
function renderAll(){const name=state.data.municipalities[state.code].name;$('#selected-name').textContent=name;$('#map-name').textContent=name;$('#municipality').value=state.code;renderChart();renderMap()}
function renderChart(){
 $$('#metric-picker button').forEach(b=>b.classList.toggle('active',state.metrics.includes(b.dataset.metric)));
 const svg=$('#chart'),years=state.data.years,W=1000,H=430,p={l:70,r:35,t:35,b:48};let html='';
 for(let i=0;i<5;i++){const y=p.t+i*(H-p.t-p.b)/4;html+=`<line class="chart-grid" x1="${p.l}" x2="${W-p.r}" y1="${y}" y2="${y}"/>`}
 years.forEach((yr,i)=>{const x=p.l+i*(W-p.l-p.r)/(years.length-1);html+=`<text class="chart-axis" x="${x}" y="${H-16}" text-anchor="middle">${yr}</text>`});
 const series=state.metrics.map(metric=>{const raw=years.map(y=>value(state.code,y,metric));const first=raw.find(v=>v!=null&&v!==0);return{metric,raw,plot:state.metrics.length>1?raw.map(v=>v==null||!first?null:v/first*100):raw}});
 const vals=series.flatMap(s=>s.plot.filter(v=>v!=null));let min=Math.min(...vals),max=Math.max(...vals);if(!isFinite(min)){min=0;max=1}if(min===max){min=0;max*=1.2||1}const pad=(max-min)*.1;min=Math.max(0,min-pad);max+=pad;
 for(let i=0;i<5;i++){const v=max-i*(max-min)/4;html+=`<text class="chart-axis" x="${p.l-12}" y="${p.t+i*(H-p.t-p.b)/4+4}" text-anchor="end">${fmt(v,1)}</text>`}
 series.forEach(s=>{const meta=state.data.metrics[s.metric];let d='',open=false;s.plot.forEach((v,i)=>{if(v==null){open=false;return}const x=p.l+i*(W-p.l-p.r)/(years.length-1),y=p.t+(max-v)/(max-min)*(H-p.t-p.b);d+=(open?'L':'M')+`${x},${y}`;open=true});html+=`<path class="chart-line" d="${d}" stroke="${meta.color}"/>`;s.plot.forEach((v,i)=>{if(v==null)return;const x=p.l+i*(W-p.l-p.r)/(years.length-1),y=p.t+(max-v)/(max-min)*(H-p.t-p.b);html+=`<circle class="chart-point" data-metric="${s.metric}" data-year="${years[i]}" cx="${x}" cy="${y}" r="5" fill="${meta.color}"/>`})});
 svg.innerHTML=`<title id="chart-title">Tidsserie för valda mått</title>${html}`;
 svg.onmousemove=e=>{const c=e.target.closest('.chart-point'),tip=$('#tooltip');if(!c){tip.hidden=true;return}const m=state.data.metrics[c.dataset.metric],v=value(state.code,c.dataset.year,c.dataset.metric);tip.innerHTML=`<b>${m.label}</b><br>${c.dataset.year}: ${fmt(v,v<100?1:0)} ${state.mode==='per1000'?m.unit+' per 1 000 inv.':m.unit}`;tip.hidden=false;const r=svg.parentElement.getBoundingClientRect();tip.style.left=(e.clientX-r.left+12)+'px';tip.style.top=(e.clientY-r.top-55)+'px'};
 const latest=series[0]?.raw.map((v,i)=>[v,years[i]]).filter(x=>x[0]!=null).at(-1);$('#chart-summary').textContent=latest?`${state.data.metrics[series[0].metric].label} ${latest[1]}: ${fmt(latest[0],latest[0]<100?1:0)} ${state.mode==='per1000'?'per 1 000 invånare':''}`:'Värden saknas för vald serie.';
}
function change(code){const a=value(code,state.from,state.mapMetric,'absolute'),b=value(code,state.to,state.mapMetric,'absolute');return a==null||b==null||a===0?null:(b-a)/a*100}
function color(v){if(v==null)return'#c8c3b7';const t=Math.min(1,Math.abs(v)/50);const target=v<0?[177,73,102]:[22,116,93],base=[231,224,207];return`rgb(${base.map((x,i)=>Math.round(x+(target[i]-x)*t)).join(',')})`}
function renderMap(){
 const svg=$('#map');svg.innerHTML=Object.entries(state.data.mapPaths).map(([code,d])=>`<path class="municipality ${code===state.code?'selected':''}" data-code="${code}" d="${d}" fill="${color(change(code))}"><title>${state.data.municipalities[code].name}: ${change(code)==null?'värde saknas':fmt(change(code),1)+' %'}</title></path>`).join('');
 svg.onclick=e=>{const p=e.target.closest('.municipality');if(!p)return;state.code=p.dataset.code;renderAll()};
 const c=change(state.code),a=value(state.code,state.from,state.mapMetric,'absolute'),b=value(state.code,state.to,state.mapMetric,'absolute'),meta=state.data.metrics[state.mapMetric];$('#map-name').textContent=state.data.municipalities[state.code].name;$('#map-change').textContent=c==null?'–':`${c>=0?'+':''}${fmt(c,1)} %`;$('#map-change').style.color=color(c);$('#map-values').textContent=`${meta.label}: ${state.from} ${fmt(a)} ${meta.unit} → ${state.to} ${fmt(b)} ${meta.unit}.`;
}
start().catch(err=>{document.body.innerHTML=`<main style="padding:4rem"><h1>Kunde inte läsa data</h1><p>Starta appen via en lokal webbserver enligt README.</p><pre>${err}</pre></main>`});
