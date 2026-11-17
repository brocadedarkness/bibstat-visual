const state={data:null,code:'0180',codes:['0180'],metric:'Besok01',mode:'absolute',showNational:true,mapMetric:'BemanService01',from:'2014',to:'2025'};
const SERIES_COLORS=['#db5a42','#287a78','#7255a4','#d28b26','#3970a5','#5d8b4b','#b14966','#16745d','#8b5e3c'];
const NATIONAL_COLOR='#6b716d';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(v,d=0)=>v==null?'–':new Intl.NumberFormat('sv-SE',{maximumFractionDigits:d}).format(v);
const rawValue=(code,year,metric)=>{const r=state.data.municipalities[code]?.years[year];return r&&r[metric]!=null?r[metric]:null};
const population=(code,year)=>state.data.municipalities[code]?.years[year]?.Population01??null;
const displayValue=(code,year,metric,mode)=>{const v=rawValue(code,year,metric);if(v==null)return null;if(mode==='per1000'){const pop=population(code,year);return pop>0?v/pop*1000:null}return v};

function nationalValue(year,metric,mode){
 const rows=Object.keys(state.data.municipalities).map(code=>({v:rawValue(code,year,metric),pop:population(code,year)}));
 if(mode==='per1000'){
  const eligible=rows.filter(r=>r.v!=null&&r.pop>0);
  return eligible.length?eligible.reduce((s,r)=>s+r.v,0)/eligible.reduce((s,r)=>s+r.pop,0)*1000:null;
 }
 const reported=rows.filter(r=>r.v!=null);
 return reported.length?reported.reduce((s,r)=>s+r.v,0)/reported.length:null;
}
function indexSeries(raw,years){
 const baseIndex=raw.findIndex(v=>v!=null&&v!==0);
 if(baseIndex<0)return{plot:raw.map(()=>null),baseYear:null};
 const base=raw[baseIndex];
 return{plot:raw.map(v=>v==null?null:v/base*100),baseYear:years[baseIndex]};
}
function chartSeries(){
 const years=state.data.years;
 const series=state.codes.map((code,i)=>{
  const raw=years.map(y=>displayValue(code,y,state.metric,state.mode==='per1000'?'per1000':'absolute'));
  const indexed=state.mode==='index'?indexSeries(raw,years):{plot:raw,baseYear:null};
  return{code,name:state.data.municipalities[code].name,color:SERIES_COLORS[i%SERIES_COLORS.length],raw,plot:indexed.plot,baseYear:indexed.baseYear,national:false};
 });
 if(state.showNational){
  const raw=years.map(y=>nationalValue(y,state.metric,state.mode==='per1000'?'per1000':'absolute'));
  const indexed=state.mode==='index'?indexSeries(raw,years):{plot:raw,baseYear:null};
  series.push({code:'national',name:'Riksgenomsnitt',color:NATIONAL_COLOR,raw,plot:indexed.plot,baseYear:indexed.baseYear,national:true});
 }
 return series;
}

async function start(){state.data=await fetch('data.json').then(r=>r.json());setup();renderAll()}
function setup(){
 const municipalities=Object.entries(state.data.municipalities).sort((a,b)=>a[1].name.localeCompare(b[1].name,'sv'));
 $('#municipality').innerHTML='<option value="">Välj kommun att jämföra…</option>'+municipalities.map(([c,m])=>`<option value="${c}">${m.name}</option>`).join('');
 $('#municipality').addEventListener('change',e=>{const code=e.target.value;if(code&&!state.codes.includes(code))state.codes.push(code);e.target.value='';renderComparisons();renderChart()});
 $$('.segmented button').forEach(b=>b.onclick=()=>{$$('.segmented button').forEach(x=>x.classList.toggle('active',x===b));state.mode=b.dataset.mode;renderChart()});
 $('#metric-picker').innerHTML=Object.entries(state.data.metrics).map(([c,m])=>`<button data-metric="${c}"><i style="background:${m.color}"></i>${m.label}</button>`).join('');
 $('#metric-picker').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.metric=b.dataset.metric;renderChart()};
 $('#comparison-list').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b||state.codes.length===1)return;state.codes=state.codes.filter(code=>code!==b.dataset.remove);renderComparisons();renderChart()};
 $('#show-national').onchange=e=>{state.showNational=e.target.checked;renderChart()};
 $('#map-metric').innerHTML=Object.entries(state.data.metrics).map(([c,m])=>`<option value="${c}">${m.label}</option>`).join('');$('#map-metric').value=state.mapMetric;
 for(const id of ['from-year','to-year'])$("#"+id).innerHTML=state.data.years.map(y=>`<option>${y}</option>`).join('');$('#from-year').value=state.from;$('#to-year').value=state.to;
 $('#map-metric').onchange=e=>{state.mapMetric=e.target.value;renderMap()};$('#from-year').onchange=e=>{state.from=e.target.value;renderMap()};$('#to-year').onchange=e=>{state.to=e.target.value;renderMap()};
 $('#show-in-chart').onclick=()=>{if(!state.codes.includes(state.code))state.codes.push(state.code);renderComparisons();renderChart();location.hash='utveckling'};
}
function renderAll(){renderComparisons();renderChart();renderMap()}
function renderComparisons(){
 $('#comparison-list').innerHTML=state.codes.map((code,i)=>`<span class="comparison-chip"><i style="background:${SERIES_COLORS[i%SERIES_COLORS.length]}"></i>${state.data.municipalities[code].name}<button data-remove="${code}" aria-label="Ta bort ${state.data.municipalities[code].name}" ${state.codes.length===1?'disabled':''}>×</button></span>`).join('');
}
function renderChart(){
 $$('#metric-picker button').forEach(b=>b.classList.toggle('active',b.dataset.metric===state.metric));
 const svg=$('#chart'),years=state.data.years,meta=state.data.metrics[state.metric],series=chartSeries(),W=1000,H=430,p={l:82,r:35,t:38,b:48};let html='';
 const vals=series.flatMap(s=>s.plot.filter(v=>v!=null));if(state.mode==='index')vals.push(100);
 let min=Math.min(...vals),max=Math.max(...vals);if(!isFinite(min)){min=0;max=1}if(min===max){min=Math.max(0,min-1);max+=1}const pad=(max-min)*.1;min=Math.max(0,min-pad);max+=pad;
 for(let i=0;i<5;i++){const y=p.t+i*(H-p.t-p.b)/4,v=max-i*(max-min)/4;html+=`<line class="chart-grid" x1="${p.l}" x2="${W-p.r}" y1="${y}" y2="${y}"/><text class="chart-axis" x="${p.l-12}" y="${y+4}" text-anchor="end">${fmt(v,state.mode==='per1000'?1:0)}</text>`}
 if(state.mode==='index'&&min<=100&&max>=100){const y=p.t+(max-100)/(max-min)*(H-p.t-p.b);html+=`<line class="index-reference" x1="${p.l}" x2="${W-p.r}" y1="${y}" y2="${y}"/><text class="index-label" x="${W-p.r}" y="${y-7}" text-anchor="end">Index 100</text>`}
 years.forEach((yr,i)=>{const x=p.l+i*(W-p.l-p.r)/(years.length-1);html+=`<text class="chart-axis" x="${x}" y="${H-16}" text-anchor="middle">${yr}</text>`});
 const unit=state.mode==='index'?'Index':state.mode==='per1000'?`${meta.unit} per 1 000 inv.`:meta.unit;
 html+=`<text class="axis-unit" x="${p.l}" y="18">${unit}</text>`;
 series.forEach(s=>{let d='',open=false;s.plot.forEach((v,i)=>{if(v==null){open=false;return}const x=p.l+i*(W-p.l-p.r)/(years.length-1),y=p.t+(max-v)/(max-min)*(H-p.t-p.b);d+=(open?'L':'M')+`${x},${y}`;open=true});html+=`<path class="chart-line ${s.national?'national-line':''}" d="${d}" stroke="${s.color}"/>`;s.plot.forEach((v,i)=>{if(v==null)return;const x=p.l+i*(W-p.l-p.r)/(years.length-1),y=p.t+(max-v)/(max-min)*(H-p.t-p.b);html+=`<circle class="chart-point ${s.national?'national-point':''}" data-series="${s.code}" data-name="${s.name}" data-year="${years[i]}" data-value="${v}" cx="${x}" cy="${y}" r="4.5" fill="${s.color}"/>`})});
 svg.innerHTML=`<title id="chart-title">${meta.label}: kommunjämförelse</title>${html}`;
 $('#series-legend').innerHTML=series.map(s=>`<span class="series-key"><i class="${s.national?'dashed':''}" style="--series-color:${s.color}"></i><span>${s.name}${state.mode==='index'&&s.baseYear?` <small>basår ${s.baseYear}</small>`:''}</span></span>`).join('');
 svg.onmousemove=e=>{const c=e.target.closest('.chart-point'),tip=$('#tooltip');if(!c){tip.hidden=true;return}const v=Number(c.dataset.value);tip.innerHTML=`<b>${c.dataset.name}</b><br>${c.dataset.year}: ${fmt(v,state.mode==='absolute'&&Math.abs(v)>=100?0:1)} ${unit}`;tip.hidden=false;const r=svg.parentElement.getBoundingClientRect();tip.style.left=Math.min(e.clientX-r.left+12,r.width-190)+'px';tip.style.top=(e.clientY-r.top-55)+'px'};
 $('#chart-summary').textContent=`${meta.label} · ${state.codes.length} ${state.codes.length===1?'kommun':'kommuner'}${state.showNational?' + riksgenomsnitt':''}`;
}
function change(code){const a=displayValue(code,state.from,state.mapMetric,'absolute'),b=displayValue(code,state.to,state.mapMetric,'absolute');return a==null||b==null||a===0?null:(b-a)/a*100}
function color(v){if(v==null)return'#c8c3b7';const t=Math.min(1,Math.abs(v)/50);const target=v<0?[177,73,102]:[22,116,93],base=[231,224,207];return`rgb(${base.map((x,i)=>Math.round(x+(target[i]-x)*t)).join(',')})`}
function renderMap(){
 const svg=$('#map');svg.innerHTML=Object.entries(state.data.mapPaths).map(([code,d])=>`<path class="municipality ${code===state.code?'selected':''}" data-code="${code}" d="${d}" fill="${color(change(code))}"><title>${state.data.municipalities[code].name}: ${change(code)==null?'värde saknas':fmt(change(code),1)+' %'}</title></path>`).join('');
 svg.onclick=e=>{const p=e.target.closest('.municipality');if(!p)return;state.code=p.dataset.code;renderMap()};
 const c=change(state.code),a=displayValue(state.code,state.from,state.mapMetric,'absolute'),b=displayValue(state.code,state.to,state.mapMetric,'absolute'),meta=state.data.metrics[state.mapMetric];$('#map-name').textContent=state.data.municipalities[state.code].name;$('#map-change').textContent=c==null?'–':`${c>=0?'+':''}${fmt(c,1)} %`;$('#map-change').style.color=color(c);$('#map-values').textContent=`${meta.label}: ${state.from} ${fmt(a)} ${meta.unit} → ${state.to} ${fmt(b)} ${meta.unit}.`;
}
start().catch(err=>{document.body.innerHTML=`<main style="padding:4rem"><h1>Kunde inte läsa data</h1><p>Starta appen via en lokal webbserver enligt README.</p><pre>${err}</pre></main>`});
