(function(){
  function tripDistance(){
    var official=trips.reduce(function(s,t){return s+Number(t.distance||t.Distance||0)},0)/1000;
    var dist=official;
    if(!dist && logs.length>1){
      var km=0;
      for(var i=1;i<logs.length;i++){
        var a=logs[i-1],b=logs[i];
        var R=6371,dLat=(Number(b.latitude)-Number(a.latitude))*Math.PI/180,dLng=(Number(b.longitude)-Number(a.longitude))*Math.PI/180;
        var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(Number(a.latitude)*Math.PI/180)*Math.cos(Number(b.latitude)*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
        km+=R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
      }
      dist=km;
    }
    return {official:official,dist:dist};
  }
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function nearestLog(dt){if(!logs.length||!dt)return null;var t=new Date(dt).getTime();var best=null,diff=Infinity;logs.forEach(function(r){var d=Math.abs(new Date(r.dateTime).getTime()-t);if(d<diff){diff=d;best=r}});return diff<=300000?best:null;}
  function buildTripPdf(){
    var td=tripDistance();
    var drive=trips.reduce(function(s,t){return s+parseDurationMs(t.drivingDuration)},0);
    var stop=trips.reduce(function(s,t){return s+parseDurationMs(t.stopDuration)},0);
    var vehicle=selectedDevice?(esc(selectedDevice.name||selectedDevice.id)+(selectedDevice.licensePlate?' - '+esc(selectedDevice.licensePlate):'')):'-';
    var range=currentRange();
    var generatedAt=new Date().toLocaleString('pt-BR');
    var tripRows='';
    for(var i=0;i<trips.length;i++){
      var t=trips[i];
      tripRows+='<tr><td>'+(i+1)+'</td><td>'+fmtDate(t.start)+'</td><td>'+fmtDate(t.stop)+'</td><td>'+esc(driverName(t.driver&&t.driver.id))+'</td><td>'+(Number(t.distance||t.Distance||0)/1000).toFixed(1)+'</td><td>'+Math.round(t.averageSpeed||0)+'</td><td>'+Math.round(t.maximumSpeed||0)+'</td><td>'+(t.exceptionCount||0)+'</td></tr>';
    }
    var pointRows='';
    for(var i=0;i<trips.length;i++){
      var t=trips[i];
      var sl=nearestLog(t.start),el=nearestLog(t.stop);
      var sc=sl?Number(sl.latitude).toFixed(5)+', '+Number(sl.longitude).toFixed(5):'-';
      var ec=el?Number(el.latitude).toFixed(5)+', '+Number(el.longitude).toFixed(5):'-';
      pointRows+='<tr><td>'+(i+1)+'</td><td>'+sc+'</td><td>'+ec+'</td></tr>';
    }
    var eventRows='';
    for(var i=0;i<events.length;i++){
      var e=events[i];
      eventRows+='<tr><td>'+esc(ruleName(e.rule&&e.rule.id))+'</td><td>'+fmtDate(e.activeFrom)+'</td><td>'+Math.round(parseDurationMs(e.duration)/1000)+'s</td><td>'+(e.maximumSpeed?Math.round(e.maximumSpeed)+' km/h':'-')+'</td></tr>';
    }
    var pts=logs.map(function(r){return [Number(r.latitude),Number(r.longitude)]}).filter(function(p){return Number.isFinite(p[0])&&Number.isFinite(p[1])});
    var html='';
    html+='<div class="pdf-page pdf-cover-page"><div class="pdf-topbar"></div><div class="pdf-brand"><h1 class="pdf-title">Fleet Trip 360</h1><div class="pdf-subtitle">Relatorio de viagens</div></div>';
    html+='<div class="pdf-grid-4"><div class="pdf-kpi"><small>Veiculo</small><b style="font-size:14px">'+vehicle+'</b><span>'+trips.length+' viagens</span></div>';
    html+='<div class="pdf-kpi"><small>Periodo</small><b style="font-size:14px">'+fmtDate(range.from)+' - '+fmtDate(range.to)+'</b><span>consulta</span></div>';
    html+='<div class="pdf-kpi"><small>Distancia</small><b>'+td.dist.toFixed(1)+' km</b><span>'+(td.official?'oficial':'estimado GPS')+'</span></div>';
    html+='<div class="pdf-kpi"><small>Excecoes</small><b>'+events.length+'</b><span>periodo</span></div></div>';
    html+='<div style="margin-top:16px"><div id="pdfMap" style="height:260px;border-radius:8px;border:1px solid #dbe3ec"></div></div>';
    html+='<div class="pdf-card" style="margin-top:16px"><div class="pdf-section-title">Resumo</div>';
    html+='<div class="pdf-summary-box"><b>Tempo dirigindo:</b> '+Math.round(drive/60000)+' min</div>';
    html+='<div class="pdf-summary-box"><b>Tempo parado:</b> '+Math.round(stop/60000)+' min</div>';
    html+='<div class="pdf-summary-box"><b>Gerado em:</b> '+generatedAt+'</div></div>';
    html+='<div class="pdf-footer"><span>Fleet Trip 360 - Viagens</span><span>Pagina 1</span></div></div>';
    html+='<div class="pdf-page"><div class="pdf-topbar"></div><div class="pdf-brand"><h1 class="pdf-title">Viagens</h1><div class="pdf-subtitle">Historico detalhado</div></div>';
    html+='<table class="pdf-table"><thead><tr><th>#</th><th>Inicio</th><th>Termino</th><th>Condutor</th><th>km</th><th>Media</th><th>Max</th><th>Exc.</th></tr></thead><tbody>'+(tripRows||'<tr><td colspan="8">Sem viagens.</td></tr>')+'</tbody></table>';
    html+='<div class="pdf-footer"><span>Fleet Trip 360 - Viagens</span><span>Pagina 2</span></div></div>';
    html+='<div class="pdf-page"><div class="pdf-topbar"></div><div class="pdf-brand"><h1 class="pdf-title">Inicio e fim do trajeto</h1><div class="pdf-subtitle">Coordenadas dos pontos inicial e final</div></div>';
    html+='<table class="pdf-table"><thead><tr><th>#</th><th>Inicio (lat, lon)</th><th>Fim (lat, lon)</th></tr></thead><tbody>'+(pointRows||'<tr><td colspan="3">Sem dados.</td></tr>')+'</tbody></table>';
    html+='<div class="pdf-footer"><span>Fleet Trip 360 - Pontos</span><span>Pagina 3</span></div></div>';
    if(events.length){
      html+='<div class="pdf-page"><div class="pdf-topbar"></div><div class="pdf-brand"><h1 class="pdf-title">Excecoes</h1><div class="pdf-subtitle">Eventos agrupados</div></div>';
      html+='<table class="pdf-table"><thead><tr><th>Regra</th><th>Inicio</th><th>Duracao</th><th>Velocidade</th></tr></thead><tbody>'+eventRows+'</tbody></table>';
      html+='<div class="pdf-footer"><span>Fleet Trip 360 - Excecoes</span><span>Pagina 3</span></div></div>';
    }
    window._pdfPts=pts;
    return html;
  }
  async function exportPdf(){
    if(!trips.length){alertMsg('Carregue as viagens antes de gerar o PDF.',false,true);return;}
    var printOptions={includeLogo:false,logo:''};
    if(window.PrintOptions){
      try{printOptions=await window.PrintOptions.ask({title:'Imprimir Fleet Trip 360',subtitle:'Inclua um logo no cabecalho e rodapes do PDF.'});}catch(e){printOptions={includeLogo:false,logo:''};}
      if(printOptions===null) return;
    }
    var logo=printOptions&&printOptions.includeLogo?printOptions.logo:'';
    var tmp=document.createElement('div');
    tmp.innerHTML=buildTripPdf();
    if(window.PrintOptions) window.PrintOptions.decorate(tmp,logo);
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fleet Trip 360</title>';
    html+='<link rel="stylesheet" href="./reports/premium.css?v=0.1.3">';
    html+='<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>';
    html+='<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>';
    html+='<style>body{background:#fff;padding:0}.pdf-stage{display:block}</style></head>';
    html+='<body><div class="pdf-stage">'+tmp.innerHTML+'</div></body></html>';
    var w=window.open('','_blank');
    if(!w){alertMsg('Permita pop-ups para abrir o PDF.',false,true);return;}
    w.document.open();w.document.write(html);w.document.close();
    var s=w.document.createElement('script');
    s.textContent='var pts=window.opener._pdfPts||[];function init(){if(!window.L||!document.getElementById("pdfMap"))return;var m=L.map("pdfMap",{zoomControl:false,attributionControl:false});var tl=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"OpenStreetMap"}).addTo(m);if(pts.length){var poly=L.polyline(pts,{color:"#0ea5e9",weight:3}).addTo(m);m.fitBounds(poly.getBounds(),{padding:[20,20]})}tl.on("load",function(){setTimeout(function(){window.print()},500)});setTimeout(function(){window.print()},4000)}if(document.readyState==="complete")init();else window.addEventListener("load",init);';
    w.document.body.appendChild(s);
  }
  window.exportPdf=exportPdf;
})();
