import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read=path=>readFileSync(path,'utf8');
const captured=[];
const win={
  print:()=>captured.push(stage.innerHTML)
};
runInNewContext(read('exceptions/audit.js'),{window:win,Date,Intl});
const stage={
  innerHTML:'',style:{setProperty(){}},
  querySelectorAll(selector){
    if(selector==='.pdf-page')return Array.from({length:(this.innerHTML.match(/class="pdf-page\b/g)||[]).length});
    return [];
  },
  querySelector(){return null}
};
const elements={
  pdfStage:stage,
  pdfBtn:{disabled:false,textContent:'Baixar PDF'},
  alertBox:{style:{},className:'',textContent:''},
  statusBox:{textContent:''}
};
const doc={getElementById:id=>elements[id]||null,fonts:{ready:Promise.resolve()}};
runInNewContext(read('exceptions/pdf.js'),{
  window:win,document:doc,Date,Intl,URL,setTimeout:cb=>cb()
});
const vehicle='teste-1';
const ev=(id,ruleId,ruleName,count,start,end,maxSpeed)=>({
  id,veiculoId:vehicle,deviceId:vehicle,
  veiculo:'Ativo de teste',placa:'TESTE',
  regraId:ruleId,regraNome:ruleName,exceptionCount:count,
  activeFrom:start,activeTo:end,state:'ExceptionEventStateAcknowledgedId',
  durationMs:new Date(end).getTime()-new Date(start).getTime(),
  excMaxSpeed:maxSpeed,excSpeedLoaded:maxSpeed!==undefined
});
const input=[
  ev('evt-a','rule-a','Harsh Braking',3,'2026-11-07T12:00:00Z','2026-11-07T12:03:00Z',82),
  ev('evt-b','rule-b','Regra especial',null,'2026-11-07T13:00:00Z','2026-11-07T13:01:00Z',null)
];
const ctx={filtered:input,vehicles:[{veiculoId:vehicle}],problemFilter:'',rulesLabel:id=>id};
const a=win.Exception360Audit;
assert.equal(a.ruleTranslation('Harsh Braking'),'Frenagem brusca');
assert.equal(a.ruleTranslation('Regra especial'),'Regra especial');
assert.equal(a.count(input[1]).exact,false);
assert.equal(a.rows(input)[0].id,'evt-b');
assert.equal(a.rows(input).find(e=>e.id==='evt-a').speed,'82 km/h');
assert.equal(a.rows(input).find(e=>e.id==='evt-b').speed,'—');
assert.ok(a.exportCsv(input).includes('Contagem exata'));
assert.ok(a.exportCsv(input).includes('Velocidade máxima (km/h)'));

await win.Exception360Pdf.download({...ctx,mode:'summary'});
await win.Exception360Pdf.download({...ctx,mode:'audit'});
assert.equal(captured.length,2);
const countPages=html=>(html.match(/class="pdf-page\b/g)||[]).length;
assert.equal(countPages(captured[0]),4,'Resumo preserva as quatro páginas originais.');
assert.ok(countPages(captured[1])>countPages(captured[0]),'Auditoria acrescenta páginas.');
assert.ok(!captured[0].includes('Auditoria — Eventos'),'Resumo não deve conter auditoria.');
for(const value of ['Frenagem brusca','Harsh Braking','Regra especial','Reconhecido','82 km/h']){
  assert.ok(captured[1].includes(value),'Dado auditável ausente: '+value);
}
assert.ok(captured[1].includes('<th>Vel. máx.</th>'),'Auditoria deve exibir a velocidade máxima por evento.');
assert.ok(captured[1].includes('LogRecord'),'Auditoria deve explicar a origem da velocidade máxima.');
assert.ok(!captured[0].includes('Cobertura'),'Resumo não deve exibir cobertura da frota.');
assert.ok(!captured[1].includes('IDs do evento'),'Auditoria não deve exibir IDs de evento/regra.');
assert.ok(!captured[1].includes('sem exceptionCount'),'Auditoria não deve exibir nota de instâncias.');
assert.ok(!captured[1].includes('<th>Inst.</th>'),'Auditoria não deve exibir coluna de instâncias.');
assert.ok(captured[0].includes('Média de eventos'),'Resumo deve exibir a média de eventos por veículo.');
const ui=read('exceptions/index.html');
assert.ok(ui.includes('Resumo — formato atual') && ui.includes('Auditoria detalhada'));
assert.ok(ui.includes('data-audit-id='));
assert.ok(ui.includes('PDF detalhado deste veículo'));
assert.ok(ui.includes('excMaxSpeed') && ui.includes('LogRecord') && ui.includes('Vel. máx.'));
assert.ok(ui.includes('velocidade_maxima'));
console.log('Auditoria e PDF: dois formatos, tradução segura, período personalizado e colunas essenciais.');
