import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
const data = new Map();
let writes = [], failWrite = false;
const window = { localStorage: {
  getItem: key => data.get(key) ?? null,
  setItem(key, value) {
    if (failWrite) throw new Error('QuotaExceededError');
    writes.push(key); data.set(key, String(value));
  }, removeItem: key => data.delete(key),
}};
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : (() => { throw new Error('Unexpected import: ' + name); })(), window, console, crypto: webcrypto });
  return cache[file] = exports;
}
const store = load(path.resolve('lib/store.ts'));
const bankKey = 'kitabca.questionBank';
const original = { id: 'original', text: 'Original', options: ['A', 'B'], correct: 0, type: 'single', points: 2, createdAt: '2025-01-01', verification: 'verified', tags: ['keep'], explanation: 'Keep metadata' };
const question = (type, extra = {}) => ({ ...original, id: 'new', text: 'New ' + type, type, options: type === 'true_false' ? ['Doğru', 'Yanlış'] : ['A', 'B', 'C'], correct: type === 'multiple' ? [0, 2] : 1, ...extra });
const plain = value => JSON.parse(JSON.stringify(value));
const csv = questions => store.exportQuestionsToCsv(questions);
beforeEach(() => { data.clear(); data.set(bankKey, JSON.stringify([original])); for (const key of ['kitabca.exams','kitabca.results','kitabca.users','kitabca.classes']) data.set(key, '[]'); data.set('kitabca.users', JSON.stringify([{id:'u-admin',name:'Admin',email:'admin@test.az',role:'admin',active:true}])); data.set('kitabca.questionBank.initAt', '2025-01-01'); data.set('kitabca.admin.session', '{"user":"admin"}'); writes = []; failWrite = false; });
test('create/reload all question types and exact correct answers', () => {
  for (const type of ['single','true_false','multiple']) assert.equal(store.addQuestionValidated(question(type)).success, true);
  const bank = store.getQuestionBank();
  for (const type of ['single','true_false','multiple']) assert.deepEqual(plain(bank.find(q => q.text === 'New ' + type).correct), question(type).correct);
  assert.deepEqual(plain(bank.find(q => q.type === 'true_false').options), ['Doğru','Yanlış']);
});
test('reject empty multiple answers, malformed indexes/types/points without writes', () => {
  for (const extra of [{correct:[]},{correct:[NaN]},{correct:[0.5]},{correct:[3]},{correct:[0,0]},{correct:0},{points:0},{points:NaN},{points:Infinity},{type:'unknown'}]) {
    assert.equal(store.addQuestionValidated(question('multiple', extra)).success, false, JSON.stringify(extra));
  }
  for (const correct of [NaN,0.5,-1,3]) assert.equal(store.validateQuestion(question('single',{correct})).valid,false);
  assert.equal(store.validateQuestion(question('true_false',{options:['Yes','No']})).valid,false);
  assert.equal(writes.length,0);
});
test('draft type changes normalize without persistence', () => {
  const q=question('multiple',{correct:[2,0]});
  assert.equal(store.normalizeQuestionType(q,'single').correct,2);
  const tf=store.normalizeQuestionType(q,'true_false');
  assert.deepEqual(plain(tf.options),['Doğru','Yanlış']); assert.equal(tf.correct,0);
  assert.deepEqual(plain(store.normalizeQuestionType(question('single'),'multiple').correct),[1]);
  assert.equal(writes.length,0);
});
test('edit by ID preserves unrelated questions and metadata; missing/duplicate edit rejected', () => {
  assert.equal(store.addQuestionValidated(question('multiple')).success,true);
  const q=store.getQuestionBank().find(q=>q.type==='multiple'); writes=[];
  assert.equal(store.updateQuestionValidated({...q,text:'Edited',correct:[1,2]}).success,true);
  assert.deepEqual(plain(store.getQuestionBank().find(q=>q.id==='original')),original);
  const before=data.get(bankKey); writes=[];
  assert.equal(store.updateQuestionValidated({...q,id:'missing'}).success,false);
  assert.equal(store.updateQuestionValidated({...original,id:q.id}).success,false);
  assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
});
test('valid three-type CSV commits once, preserves existing metadata', () => {
  const result=store.importQuestionsFromCsv(csv(['single','true_false','multiple'].map(t=>question(t))));
  assert.equal(result.success,true); assert.equal(result.added,3); assert.deepEqual(writes,[bankKey]);
  assert.equal(JSON.parse(data.get(bankKey)).length,4);
  assert.deepEqual(JSON.parse(data.get(bankKey)).find(q=>q.id==='original'),original);
});
test('any invalid CSV row prevents ALL writes, with row number', () => {
  const before=data.get(bankKey), result=store.importQuestionsFromCsv(csv([question('single'),question('multiple',{correct:[]})]));
  assert.equal(result.success,false); assert.ok(result.errors.some(e=>e.row===3)); assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
});
test('CSV file/bank duplicates reject whole batch without mutating correct arrays', () => {
  const q=question('multiple',{correct:[2,0]});
  for(const rows of [[q,{...q,correct:[0,2]}],[question('single'),original]]) {
    const before=data.get(bankKey),result=store.importQuestionsFromCsv(csv(rows));
    assert.equal(result.success,false); assert.ok(result.errors.some(e=>e.row===3)); assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
  }
  assert.deepEqual(q.correct,[2,0]);
});
test('CSV strict numeric parsing and quoted multiline roundtrip', () => {
  const q=question('single',{text:'Quoted "question",\nsecond line'});
  assert.equal(store.parseQuestionsFromCsv(csv([q])).success[0].text,q.text);
  for(const value of ['0x','0.5','Infinity']) {
    const source='text,type,option1,option2,correct,points\nQ,single,A,B,'+value+',1';
    assert.equal(store.importQuestionsFromCsv(source).success,false);
  }
  assert.equal(writes.length,0);
});
test('storage failure rejects import, keeps full original bank', () => {
  const before=data.get(bankKey); failWrite=true;
  const result=store.importQuestionsFromCsv(csv([question('single'),question('multiple')]));
  assert.equal(result.success,false); assert.ok(result.errors.length); assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
});
test('import revalidates current bank after preview, and never overwrites corrupt storage', () => {
  const source=csv([question('single')]);
  assert.equal(store.previewQuestionsFromCsv(source).errors.length,0);
  store.addQuestionValidated(question('single')); writes=[];
  assert.equal(store.importQuestionsFromCsv(source).success,false); assert.equal(writes.length,0);
  for (const raw of ['broken JSON','{}']) {
    data.set(bankKey,raw);
    assert.equal(store.importQuestionsFromCsv(source).success,false);
    assert.equal(data.get(bankKey),raw); assert.equal(writes.length,0);
  }
});
test('legacy multiple-answer migration preserves answers', () => {
  const legacy=question('multiple',{createdAt:undefined});
  data.set(bankKey,JSON.stringify([legacy]));
  assert.deepEqual(plain(store.getQuestionBank()[0].correct),[0,2]);
});
// Execute the actual React handler bodies; setters are spies, not a rendered browser.
function handler(name, context) {
  const filename='app/account/(dashboard)/questions/page.tsx';
  const source=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source)===name) declaration=node; ts.forEachChild(node,visit); }
  visit(source); assert.ok(declaration,name);
  const code=ts.transpileModule('globalThis.run = '+declaration.initializer.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,context);
  return context.run;
}
test('CSV UI handler shows no success after storage exception and restores loading', async () => {
  const source=csv([question('single')]), state={}; failWrite=true;
  const context={csvPreview:store.parseQuestionsFromCsv(source),csvText:source,importQuestionsFromCsv:store.importQuestionsFromCsv,reload:()=>assert.fail('must not reload after failure')};
  for(const name of ['setCsvError','setCsvSuccess','setCsvImporting','setCsvPreview','setCsvFile','setCsvText']) context[name]=value=>{state[name]=value;};
  await handler('handleCsvImport',context)();
  assert.equal(state.setCsvSuccess,''); assert.ok(state.setCsvError); assert.equal(state.setCsvImporting,false); assert.equal(writes.length,0);
});
test('question UI handler persists selected multiple answers and rejects invalid drafts', async () => {
  const state={}; const context={form:question('multiple'),editing:null,addQuestionValidated:store.addQuestionValidated,updateQuestionValidated:store.updateQuestionValidated,reload:()=>{state.reloaded=true},setFormError:value=>state.error=value,setDialogOpen:value=>state.open=value};
  await handler('handleSave',context)(); assert.equal(state.open,false); assert.equal(state.reloaded,true); assert.deepEqual(plain(store.getQuestionBank()[0].correct),[0,2]);
  writes=[];state.open=true;state.reloaded=false;context.form=question('multiple',{correct:[]});
  await handler('handleSave',context)(); assert.ok(state.error); assert.equal(state.open,true); assert.equal(state.reloaded,false); assert.equal(writes.length,0);
});
test('successful CSV handler uses committed bank directly without migration writes', async () => {
  const legacy={...original}; delete legacy.createdAt; data.set(bankKey,JSON.stringify([legacy]));
  const source=csv([question('true_false')]), state={};
  const context={csvPreview:store.parseQuestionsFromCsv(source),csvText:source,importQuestionsFromCsv:store.importQuestionsFromCsv,reload:()=>assert.fail('must not reload/migrate existing bank')};
  for(const name of ['setCsvError','setCsvSuccess','setCsvImporting','setCsvPreview','setCsvFile','setCsvText','setQuestions']) context[name]=value=>{state[name]=value;};
  await handler('handleCsvImport',context)();
  assert.ok(state.setCsvSuccess); assert.deepEqual(writes,[bankKey]);
  assert.deepEqual(plain(state.setQuestions.find(q=>q.id==='original')),legacy);
  assert.deepEqual(JSON.parse(data.get(bankKey)).find(q=>q.id==='original'),legacy);
});
test('CSV rejects unknown type, invalid true/false, empty options and non-finite points without writes', () => {
  for(const q of [question('single',{type:'unknown'}),question('true_false',{options:['Yes','No']}),question('single',{options:['A','','C']}),question('single',{points:Infinity}),question('single',{points:0})]) {
    const before=data.get(bankKey),result=store.importQuestionsFromCsv(csv([question('multiple'),q]));
    assert.equal(result.success,false); assert.ok(result.errors.some(e=>e.row===3));
    assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
  }
});
test('duplicate detection normalizes text/options and does not mutate multiple-answer arrays', () => {
  const q=question('multiple',{correct:[2,0]});
  assert.equal(store.addQuestionValidated(q).success,true);
  const before=data.get(bankKey); writes=[];
  assert.equal(store.addQuestionValidated({...q,text:'  NEW   MULTIPLE  ',options:[' a ',' B','c '],correct:[0,2]}).success,false);
  assert.deepEqual(q.correct,[2,0]); assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
});
test('comma-only data row is invalid, not silently skipped', () => {
  const source='text,type,option1,option2,correct\nQ,single,A,B,0\n,,,,';
  const before=data.get(bankKey),result=store.importQuestionsFromCsv(source);
  assert.equal(result.success,false); assert.ok(result.errors.some(e=>e.row===3));
  assert.equal(data.get(bankKey),before); assert.equal(writes.length,0);
});
