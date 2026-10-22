import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { webcrypto, createHash } from 'node:crypto';
const data = new Map(), session = new Map();
let writes = [], failWrite = false, failKey = null;
const storage = map => ({getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem(k,v){if(failWrite || k === failKey)throw Error('QuotaExceededError');writes.push(k);map.set(k,String(v));}});
const window={localStorage:storage(data),sessionStorage:storage(session)};
const cache={};
function load(file){if(cache[file])return cache[file];const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>load(path.resolve(path.dirname(file),n+'.ts')),window,crypto:webcrypto,TextEncoder,URL,console});return cache[file]=exports;}
const store=load(path.resolve('lib/store.ts')), helpers=load(path.resolve('lib/helpers.ts'));
const plain=x=>JSON.parse(JSON.stringify(x));
const key=n=>'kitabca.'+n;
const put=(n,v)=>data.set(key(n),JSON.stringify(v));
const hash=p=>createHash('sha256').update(p).digest('hex');
const admin={id:'a',name:'Admin',email:'admin@test.az',role:'admin',active:true,passwordHash:hash('secret')};
const seller={id:'s',name:'Seller',email:'seller@test.az',role:'seller',active:true,passwordHash:hash('secret'),sellerExamIds:['e']};
const question={id:'q',text:'Q',type:'single',options:['A','B'],correct:0,points:2};
const exam={id:'e',code:'EXAM',title:'Exam',subject:'Math',startsAt:'2020-01-01',endsAt:'2099-01-01',createdAt:'2025-01-01',durationMin:30,status:'done',onlineEnabled:true,questions:[question],ticketCodes:['AAAA-BBBB','CCCC-DDDD','EEEE-FFFF']};
const login=id=>put('admin.session',{user:id,at:new Date().toISOString()});
beforeEach(()=>{data.clear();session.clear();put('exams',[exam]);put('results',[]);put('questionBank',[question]);put('questionBank.initAt','2025-01-01');put('users',[admin,seller]);put('classes',[]);put('ticketSales',[]);login('a');writes=[];failWrite=false;failKey=null;});
test('exam create/edit matrix preserves unrelated records; rejected operations write nothing',()=>{
 const other={...exam,id:'other',code:'OTHER',title:'Other'};assert.equal(store.saveExam(other,false).success,true);
 const baseline=data.get(key('exams'));writes=[];
 for(const [candidate,edit] of [[{...exam,title:'Overwrite'},false],[{...exam,id:'new',code:' exam '},false],[{...exam,id:'missing',code:'unique'},true],[{...exam,code:'other'},true]])assert.equal(store.saveExam(candidate,edit).success,false);
 assert.equal(data.get(key('exams')),baseline);assert.equal(writes.length,0);
 assert.equal(store.saveExam({...exam,title:'Edited'},true).success,true);assert.deepEqual(plain(store.getExam('other')),other);
});
test('ticket updates twice preserve count/config/questions/results and cannot recreate deleted exam',()=>{
 const result={id:'r',examId:'e',fin:'ABC1234',score:75};put('results',[result]);session.set('sentinel','preserved');
 for(const ticket of ['GGGG-HHHH','IIII-JJJJ'])assert.equal(store.saveExam({...store.getExam('e'),ticketCodes:[...store.getExam('e').ticketCodes,ticket]},true).success,true);
 assert.equal(store.getExams().length,1);assert.deepEqual(plain(store.getExam('e').questions),exam.questions);assert.equal(store.getExam('e').durationMin,30);assert.deepEqual(plain(store.getResults()),[result]);assert.equal(session.get('sentinel'),'preserved');
 const stale=store.getExam('e');put('exams',[]);writes=[];assert.equal(store.saveExam(stale,true).success,false);assert.equal(writes.length,0);
});
test('exam storage exception and corrupt JSON never silently replace data',()=>{const before=data.get(key('exams'));failWrite=true;assert.throws(()=>store.saveExam({...exam,title:'Changed'},true));assert.equal(data.get(key('exams')),before);failWrite=false;data.set(key('exams'),'{broken');assert.throws(()=>store.saveExam(exam,false));assert.equal(data.get(key('exams')),'{broken');});
test('password verification, canonical and legacy email sessions, inactive accounts',async()=>{
 assert.equal((await store.authenticateUser(' ADMIN@test.az ','secret')).success,true);assert.equal((await store.authenticateUser(admin.email,'wrong')).success,false);
 store.setSession(seller.email);assert.equal(store.getSession().user,'s');assert.equal(store.getCurrentUser().id,'s');login(seller.email);assert.equal(store.getCurrentUser().id,'s');put('users',[admin,{...seller,active:false}]);assert.equal(store.getCurrentUser(),undefined);assert.equal((await store.authenticateUser(seller.email,'secret')).success,false);
});
test('user editing preserves hash, changes password, rejects last-admin loss and duplicate email',async()=>{
 assert.equal((await store.updateUser({...seller,passwordHash:undefined,name:'Renamed'})).success,true);assert.equal(store.getUserById('s').passwordHash,seller.passwordHash);
 assert.equal((await store.updateUser({...seller,passwordHash:undefined},'new-secret')).success,true);assert.equal((await store.authenticateUser(seller.email,'new-secret')).success,true);
 const before=data.get(key('users'));writes=[];
 assert.equal((await store.updateUser({...admin,active:false})).success,false);assert.equal((await store.updateUser({...admin,role:'teacher'})).success,false);assert.equal(store.deleteUser('a').success,false);assert.equal((await store.updateUser({...seller,email:admin.email.toUpperCase()})).success,false);assert.equal(data.get(key('users')),before);assert.equal(writes.length,0);
});
test('non-admin user mutations denied; route permissions and seller read scope',async()=>{
 login('s');await assert.rejects(store.updateUser(admin));await assert.rejects(store.createUser({...seller,password:'x'}));assert.throws(()=>store.deleteUser('a'));
 assert.equal(store.canAccessPage(seller,'/account/users'),false);assert.equal(store.canAccessPage(seller,'/account/seller-sales'),true);assert.equal(store.canAccessPage({...admin,role:'teacher'},'/account/reports'),false);assert.equal(store.canAccessPage({...admin,role:'coordinator'},'/account/questions'),true);
 put('ticketSales',[{sellerId:'s'},{sellerId:'other'}]);assert.equal(store.getTicketSales().length,1);
});
test('user storage failure preserves previous users',async()=>{const before=data.get(key('users'));failWrite=true;await assert.rejects(store.updateUser({...seller,name:'Changed'}));assert.equal(data.get(key('users')),before);});
const sell=(ticket='AAAA-BBBB',fin='ABC1234',price=10,id='s')=>store.sellTicket('e',ticket,id,fin,'Student',price);
test('assigned seller sale commits once; repeated ticket or FIN rejected and count refreshed',()=>{
 login('s');assert.equal(sell('aaaa-bbbb').success,true);assert.deepEqual(writes,[key('ticketSales')]);assert.equal(store.getAvailableTickets('e').length,2);const before=data.get(key('ticketSales'));writes=[];
 assert.equal(sell().success,false);assert.equal(sell('CCCC-DDDD').success,false);assert.equal(data.get(key('ticketSales')),before);assert.equal(writes.length,0);
});
test('unauthorized, unassigned, inactive and invalid sales write nothing',()=>{
 login('s');for(const args of [['','ABC1234',10],['AAAA-BBBB','bad',10],['AAAA-BBBB','ABC1234',-1],['AAAA-BBBB','ABC1234',NaN],['AAAA-BBBB','ABC1234',Infinity],['XXXX-YYYY','ABC1234',10],['AAAA-BBBB','ABC1234',10,'a']])assert.equal(sell(...args).success,false);
 put('users',[admin,{...seller,sellerExamIds:[]}]);assert.equal(sell().success,false);put('users',[admin,{...seller,role:'teacher'}]);assert.equal(sell().success,false);put('users',[admin,{...seller,active:false}]);assert.equal(sell().success,false);assert.equal(writes.length,0);
});
test('sale storage exception returns failure, keeps history and availability',()=>{login('s');const before=data.get(key('ticketSales'));failWrite=true;assert.equal(sell().success,false);assert.equal(data.get(key('ticketSales')),before);assert.equal(store.getAvailableTickets('e').length,3);});
test('reports include whole end date and share filters with export; CSV formulas escaped',()=>{
 put('ticketSales',[{sellerId:'s',examId:'e',soldAt:'2026-10-22T23:59:59',price:10},{sellerId:'s',examId:'e',soldAt:'2026-10-23T00:00:00',price:20}]);
 assert.equal(store.getFilteredTicketSales({startDate:'2026-10-22',endDate:'2026-10-22'}).length,1);assert.equal(store.generateSalesReport({startDate:'2026-10-22',endDate:'2026-10-22'}).totalRevenue,10);
 for(const text of ['=1+1','  @SUM(A1)','\t+1','\r-2'])assert.ok(helpers.escapeCsvCell(text).replace(/^"/,'').startsWith("'"));assert.equal(helpers.escapeCsvCell('normal'),'normal');
});
test('session progress survives reload but never leaks to next participant; offline entry rejected',()=>{
 store.startExamSession('e','abc1234','aaaa-bbbb');const entry=store.getEntry();store.saveExamProgress({...entry,answers:[0],current:0});assert.deepEqual(plain(store.getExamProgress().answers),[0]);
 store.startExamSession('e','DEF5678','CCCC-DDDD');assert.equal(store.getExamProgress(),null);assert.equal(store.getEntry().fin,'DEF5678');store.clearEntry();assert.equal(store.getEntry(),null);
 put('exams',[{...exam,onlineEnabled:false}]);assert.throws(()=>store.startExamSession('e','ABC1234','AAAA-BBBB'));
});
test('weighted exact-set scoring; empty/duplicate/partial multiple answers and extra single answers rejected',()=>{
 const multiple={...question,type:'multiple',options:['A','B','C'],correct:[0,2],points:5};assert.equal(store.scoreAnswer(multiple,[2,0]).earnedPoints,5);
 for(const answer of [[],[0],[0,2,2],[0,1,2]])assert.equal(store.scoreAnswer(multiple,answer).earnedPoints,0);
 assert.equal(store.scoreAnswer({...multiple,correct:[]},[]).isCorrect,false);assert.equal(store.scoreAnswer(question,[0,1]).isCorrect,false);assert.equal(store.scoreAnswer({...question,type:'true_false',options:['Doğru','Yanlış']},0).earnedPoints,2);
 assert.equal(Math.round((store.scoreAnswer(question,0).earnedPoints+store.scoreAnswer(multiple,[0]).earnedPoints)/7*100),29);
});
test('result snapshots persist; duplicate participant submissions and failed writes preserve results',()=>{
 const result={id:'r',examId:'e',fin:'ABC1234',questions:[question],answers:[0],score:100};store.saveResult(result);put('exams',[{...exam,questions:[{...question,text:'Changed'}]}]);assert.equal(store.getResult('r').questions[0].text,'Q');
 const before=data.get(key('results'));assert.throws(()=>store.saveResult({...result,id:'r2',fin:'abc1234'}));assert.equal(data.get(key('results')),before);failWrite=true;assert.throws(()=>store.saveResult({...result,id:'r3',fin:'DEF5678'}));assert.equal(data.get(key('results')),before);
});
test('sold ticket is bound to its FIN; completed ticket cannot be reused by another FIN',()=>{
 login('s');assert.equal(sell().success,true);assert.throws(()=>store.startExamSession('e','DEF5678','AAAA-BBBB'));store.startExamSession('e','ABC1234','AAAA-BBBB');
 store.clearEntry();put('results',[{id:'r',examId:'e',fin:'ABC1234',ticketCode:'CCCC-DDDD'}]);assert.throws(()=>store.startExamSession('e','DEF5678','CCCC-DDDD'));assert.equal(store.getEntry(),null);
});

test('exam deletion rolls back exam list if results write fails; success removes only related records',()=>{
 const other={...exam,id:'other',code:'OTHER'};put('exams',[exam,other]);put('results',[{id:'r',examId:'e'},{id:'other-result',examId:'other'}]);
 const beforeExams=data.get(key('exams')),beforeResults=data.get(key('results'));failKey=key('results');assert.throws(()=>store.deleteExam('e'));assert.equal(data.get(key('exams')),beforeExams);assert.equal(data.get(key('results')),beforeResults);
 failKey=null;store.deleteExam('e');assert.deepEqual(plain(store.getExams()),[other]);assert.deepEqual(plain(store.getResults()),[{id:'other-result',examId:'other'}]);
});

test('same ticket cannot produce a second result even if two sessions started before completion',()=>{
 const result={id:'r1',examId:'e',fin:'ABC1234',ticketCode:'AAAA-BBBB',answers:[0],score:100};store.saveResult(result);const before=data.get(key('results'));writes=[];
 assert.throws(()=>store.saveResult({...result,id:'r2',fin:'DEF5678',ticketCode:'aaaa-bbbb'}));assert.equal(data.get(key('results')),before);assert.equal(writes.length,0);
});

const questionTools=load(path.resolve('lib/questions.ts'));
const mediaQuestion={...question,text:'Ədədi tapın: √x² ≤ π',options:['α','β','θ','∞','±','∫','x₁'],correct:6,topic:'Cəbr',grade:'X sinif',difficulty:'Çətin',tags:['ə;ş','İ'],explanation:'x² + y² = z²',createdAt:'2025-01-01',verification:'pending',image:{url:'https://example.com/diagram.png',alt:'Üçbucaq diaqramı'},optionImages:[{url:'/hilal-original.png',alt:'A şəkli'},null],customMetadata:{source:'Word cədvəli'}};
test('media validation rejects base64, unsafe/oversized URLs and missing alt without writing',()=>{
 for(const image of [{url:'data:image/png;base64,'+'A'.repeat(5000),alt:'x'},{url:'javascript:alert(1)',alt:'x'},{url:'http://example.com/a',alt:'x'},{url:'//example.com/a',alt:'x'},{url:'https://example.com/'+ 'a'.repeat(2048),alt:'x'},{url:'/image.png',alt:''}])assert.equal(store.addQuestionValidated({...mediaQuestion,image}).success,false);
 assert.equal(writes.length,0);assert.equal(store.validateQuestion(mediaQuestion).valid,true);
 assert.equal(store.validateQuestion({...question,optionImages:[null,null,{url:'/a.png',alt:'x'}]}).valid,false);
});
test('media and Unicode save/reload, copy isolation and scoring retain correct indexes',()=>{
 assert.equal(store.addQuestionValidated(mediaQuestion).success,true);const saved=store.getQuestionBank().find(q=>q.text===mediaQuestion.text);assert.deepEqual(plain(saved.image),mediaQuestion.image);assert.equal(saved.text,mediaQuestion.text);
 const copy=questionTools.cloneQuestion(saved,'copy');copy.optionImages[0].alt='Edited';copy.options[0]='Changed';copy.tags.push('new');assert.equal(saved.optionImages[0].alt,'A şəkli');assert.equal(saved.options[0],'α');assert.equal(saved.tags.length,2);assert.equal(store.scoreAnswer(saved,6).earnedPoints,2);
 const tf=store.normalizeQuestionType(saved,'true_false');assert.equal(tf.optionImages,undefined);assert.deepEqual(plain(tf.options),['Doğru','Yanlış']);assert.equal(tf.correct,0);
});
test('CSV and TSV roundtrip preserve Azerbaijani, >6 options, media and all metadata',()=>{
 for(const delimiter of [',','\t']){
  const exported=store.exportQuestionsToCsv([mediaQuestion],delimiter);const preview=store.parseQuestionsFromCsv('\uFEFF'+exported);assert.equal(preview.errors.length,0,JSON.stringify(preview.errors));const imported=plain(preview.success[0]);
  for(const field of ['text','options','correct','points','topic','grade','difficulty','tags','explanation','createdAt','verification','image','optionImages','customMetadata'])assert.deepEqual(imported[field],mediaQuestion[field],field);
 }
});
test('valid mixed-media TSV imports once; bad metadata or image rejects complete batch',()=>{
 const first={...mediaQuestion,text:'Imported şəkil'},second={...question,text:'Other import',type:'multiple',correct:[0,1]};const source=store.exportQuestionsToCsv([first,second],'\t');assert.equal(store.importQuestionsFromCsv(source).success,true);assert.deepEqual(writes,[key('questionBank')]);
 const before=data.get(key('questionBank'));writes=[];const invalid=store.exportQuestionsToCsv([{...first,text:'New text',image:{url:'data:image/png;base64,AAAA',alt:'no'}}]);assert.equal(store.importQuestionsFromCsv(invalid).success,false);assert.equal(data.get(key('questionBank')),before);assert.equal(writes.length,0);
 const bad='text,type,option1,option2,correct,metadata\nQ,single,A,B,0,not-json';assert.equal(store.importQuestionsFromCsv(bad).success,false);assert.equal(data.get(key('questionBank')),before);
});
test('URL-only metadata remains small; oversized bank/import and quota failure preserve original bank',()=>{
 assert.ok(JSON.stringify(mediaQuestion).length<4096);const before=data.get(key('questionBank'));
 assert.throws(()=>store.saveQuestionBank([{...mediaQuestion,text:'x'.repeat(2*1024*1024)}]));assert.equal(data.get(key('questionBank')),before);
 assert.equal(store.parseQuestionsFromCsv('x'.repeat(2*1024*1024+1)).errors.length,1);failWrite=true;assert.equal(store.importQuestionsFromCsv(store.exportQuestionsToCsv([mediaQuestion])).success,false);assert.equal(data.get(key('questionBank')),before);
});
test('Azerbaijani search and all bank/builder filters match metadata consistently',()=>{
 for(const filters of [{search:'ƏDƏDİ'},{search:'cəbr'},{search:'İ'},{subject:'Math',grade:'X sinif',topic:'Cəbr',difficulty:'Çətin',type:'single'}])assert.equal(questionTools.matchesQuestion({...mediaQuestion,subject:'Math'},filters),true);
 for(const filters of [{type:'multiple'},{topic:'Həndəsə'},{grade:'IX sinif'}])assert.equal(questionTools.matchesQuestion(mediaQuestion,filters),false);
});
test('verification checks role and missing ID; write failure reports no success and preserves data',()=>{
 put('questionBank',[{...question,verification:'pending'}]);login('s');assert.equal(store.verifyQuestion('q').success,false);login('a');assert.equal(store.verifyQuestion('missing').success,false);const before=data.get(key('questionBank'));failWrite=true;assert.equal(store.verifyQuestion('q').success,false);assert.equal(data.get(key('questionBank')),before);failWrite=false;assert.equal(store.verifyQuestion('q').success,true);assert.equal(store.getQuestionBank()[0].verification,'verified');
});

test('image URL/alt spreadsheet columns validate option images; malformed row remains atomic',()=>{
 const csv='text,type,option1,option2,correct,image_url,image_alt,option1_image_url,option1_image_alt\nŞəkilli,single,A,B,0,/diagram.png,Diaqram,/a.png,A şəkli';
 const parsed=store.parseQuestionsFromCsv(csv);assert.equal(parsed.errors.length,0);assert.equal(parsed.success[0].optionImages[0].alt,'A şəkli');
 const before=data.get(key('questionBank'));assert.equal(store.importQuestionsFromCsv(csv.replace('A şəkli','')).success,false);assert.equal(data.get(key('questionBank')),before);
});
test('editing a verified question requires renewed verification and preserves unrelated records',()=>{
 put('questionBank',[{...question,verification:'verified'},{...question,id:'other',text:'Other',verification:'verified'}]);const other=plain(store.getQuestionBank()[1]);assert.equal(store.updateQuestionValidated({...question,text:'Changed'}).success,true);assert.equal(store.getQuestionBank()[0].verification,'pending');assert.deepEqual(plain(store.getQuestionBank()[1]),other);
});

test('exam copying retains all media, correct answers and metadata; historical results without snapshots remain readable',()=>{
 put('exams',[{...exam,questions:[mediaQuestion,{...question,id:'q2',type:'multiple',correct:[0,1]}]}]);const copied=store.copyExam('e');const reloaded=store.getExam(copied.id);assert.equal(reloaded.questions[0].text,mediaQuestion.text);assert.deepEqual(plain(reloaded.questions[0].image),mediaQuestion.image);assert.deepEqual(plain(reloaded.questions[1].correct),[0,1]);assert.deepEqual(plain(reloaded.questions[0].customMetadata),mediaQuestion.customMetadata);
 const legacy={id:'old',examId:'e',fin:'ABC1234',score:42,answers:[0]};put('results',[legacy]);assert.deepEqual(plain(store.getResult('old')),legacy);
});

test('leading empty lines remain CSV-compatible; verified metadata import cannot bypass role checks',()=>{
 const source='\n\ntext,type,option1,option2,correct\nLeading,single,A,B,0';assert.equal(store.parseQuestionsFromCsv(source).errors.length,0);
 const verified=store.exportQuestionsToCsv([{...mediaQuestion,verification:'verified'}]);login('s');const before=data.get(key('questionBank'));assert.equal(store.importQuestionsFromCsv(verified).success,false);assert.equal(data.get(key('questionBank')),before);login('a');assert.equal(store.importQuestionsFromCsv(verified).success,true);assert.equal(store.getQuestionBank()[0].verification,'verified');
});

test('malformed optional metadata types are rejected rather than persisted or crashing rendering',()=>{
 for(const extra of [{tags:0},{optionImages:0},{image:null},{subject:{}},{explanation:[]},{createdAt:2025},{difficulty:0},{verification:0}]){
  const source='text,type,option1,option2,correct,metadata\nQ,single,A,B,0,"'+JSON.stringify(extra).replaceAll('"','""')+'"';const before=data.get(key('questionBank'));assert.equal(store.importQuestionsFromCsv(source).success,false);assert.equal(data.get(key('questionBank')),before);
 }
 assert.equal(store.validateQuestion({...question,text:42}).valid,false);assert.equal(store.validateQuestion({...question,options:'AB'}).valid,false);
});

const companyRecord={id:'company-a',name:'Hilal Bakı',code:'BAKI',active:true,createdAt:'2020-01-01'};
test('company create/edit/deactivate validate duplicates and preserve all referenced data',()=>{
 assert.equal(store.saveCompany(companyRecord,false).success,true);const records=plain(store.getCompanies());writes=[];
 for(const [record,edit] of [[companyRecord,false],[{...companyRecord,id:'b',code:' baki '},false],[{...companyRecord,id:'missing'},true],[{...companyRecord,code:''},true],[{...companyRecord,name:' '},true]])assert.equal(store.saveCompany(record,edit).success,false);
 assert.deepEqual(plain(store.getCompanies()),records);assert.equal(writes.length,0);
 put('exams',[{...exam,companyId:'company-a',academicYear:'2026-2027'}]);put('users',[admin,{...seller,companyId:'company-a'}]);put('results',[{id:'r',examId:'e',companyId:'company-a',academicYear:'2026-2027',score:90}]);put('ticketSales',[{id:'sale',examId:'e',companyId:'company-a'}]);
 const snapshot=['exams','users','results','ticketSales'].map(name=>data.get(key(name)));
 assert.equal(store.saveCompany({...store.getCompanies()[0],name:'Yeni ad',active:false},true).success,true);assert.equal(store.getCompanies()[0].id,'company-a');assert.deepEqual(['exams','users','results','ticketSales'].map(name=>data.get(key(name))),snapshot);
 assert.equal(store.saveExam({...store.getExam('e'),title:'Updated'},true).success,true);assert.equal(store.saveExam({...exam,id:'new',code:'NEW',companyId:'company-a'},false).success,false);
});
test('company/user assignments validate active companies; failure/retry and non-admin write protection',async()=>{
 assert.equal((await store.createUser({name:'New',email:'new@test.az',role:'teacher',active:true,password:'secret',companyId:'missing'})).success,false);
 assert.equal(store.saveCompany(companyRecord,false).success,true);const created=await store.createUser({name:'New',email:'new@test.az',role:'teacher',active:true,password:'secret',companyId:'company-a'});assert.equal(created.success,true);assert.equal(created.user.companyId,'company-a');
 const before=data.get(key('companies'));failWrite=true;assert.equal(store.saveCompany({...companyRecord,name:'Changed'},true).success,false);assert.equal(data.get(key('companies')),before);failWrite=false;assert.equal(store.saveCompany({...companyRecord,name:'Changed'},true).success,true);login('s');assert.equal(store.saveCompany({...companyRecord,active:false},true).success,false);
});
test('academic year legacy values normalize without writes; creation/duplicate/format/edit rules',()=>{
 put('exams',[{...exam,academicYear:'2024-2025'}]);put('classes',[{id:'old',academicYear:'Köhnə dövr'}]);const before=data.get(key('exams'));const years=store.getAcademicYears();assert.equal(writes.length,0);assert.equal(data.get(key('exams')),before);assert.ok(years.some(year=>year.label==='Köhnə dövr'));
 const year={id:'year-a',label:'2030-2031',active:true,createdAt:''};assert.equal(store.saveAcademicYear(year,false).success,true);
 for(const candidate of [{...year,id:'other'}, {...year,id:'bad',label:'2030-2032'}, {...year,id:'bad',label:'2030/2031'}])assert.equal(store.saveAcademicYear(candidate,false).success,false);
 assert.equal(store.saveAcademicYear({...year,label:'2031-2032'},true).success,true);assert.equal(store.saveAcademicYear({...year,id:'missing'},true).success,false);
 const legacy=store.getAcademicYears().find(year=>year.label==='2024-2025');assert.equal(store.saveAcademicYear({...legacy,label:'2025-2026'},true).success,false);assert.equal(store.saveAcademicYear({...legacy,active:false},true).success,true);assert.equal(data.get(key('exams')),before);
});
test('archived year preserves existing exams/results; rejects new assignments; storage failure retries safely',()=>{
 const year={id:'year-a',label:'2030-2031',active:true,createdAt:''};store.saveAcademicYear(year,false);put('exams',[{...exam,academicYear:year.label}]);put('results',[{id:'historical',examId:'e',academicYear:year.label,score:77}]);const originalResults=data.get(key('results'));
 const before=data.get(key('academicYears'));failWrite=true;assert.equal(store.saveAcademicYear({...year,active:false},true).success,false);assert.equal(data.get(key('academicYears')),before);failWrite=false;assert.equal(store.saveAcademicYear({...year,active:false},true).success,true);
 assert.equal(store.saveExam({...store.getExam('e'),title:'Edited safely'},true).success,true);assert.equal(store.saveExam({...exam,id:'new',code:'NEW',academicYear:year.label},false).success,false);assert.equal(data.get(key('results')),originalResults);login('s');assert.equal(store.saveAcademicYear({...year,active:true},true).success,false);
});
test('review rejects without reason; records reviewer/time and history; edit requires another review without touching exam snapshots',()=>{
 put('questionBank',[{...mediaQuestion,verification:'pending'}]);put('exams',[{...exam,questions:[mediaQuestion]}]);const beforeExam=data.get(key('exams'));const before=data.get(key('questionBank'));assert.equal(store.reviewQuestion('q','rejected',' ').success,false);assert.equal(data.get(key('questionBank')),before);
 assert.equal(store.reviewQuestion('q','rejected','Diaqram aydın deyil').success,true);let q=store.getQuestionBank()[0];assert.equal(q.verification,'rejected');assert.equal(q.reviewHistory[0].reviewerId,'a');assert.equal(q.reviewHistory[0].reviewerName,'Admin');assert.ok(Number.isFinite(Date.parse(q.reviewHistory[0].reviewedAt)));assert.equal(q.reviewHistory[0].reason,'Diaqram aydın deyil');assert.equal(store.verifyQuestion('q').success,false);
 assert.equal(store.updateQuestionValidated({...q,text:'Corrected',reviewHistory:[]}).success,true);q=store.getQuestionBank()[0];assert.equal(q.verification,'pending');assert.equal(q.reviewHistory.length,1);assert.equal(store.verifyQuestion('q').success,true);q=store.getQuestionBank()[0];assert.equal(q.reviewHistory.length,2);assert.equal(q.reviewHistory[1].status,'verified');assert.deepEqual(plain(q.correct),mediaQuestion.correct);assert.equal(data.get(key('exams')),beforeExam);
});
test('review storage failure has no history/success; coordinator allowed and teacher/seller denied',()=>{
 put('questionBank',[{...question,verification:'pending'}]);const before=data.get(key('questionBank'));failWrite=true;assert.equal(store.reviewQuestion('q','rejected','Səhv').success,false);assert.equal(data.get(key('questionBank')),before);failWrite=false;
 for(const role of ['teacher','seller']){put('users',[admin,{...seller,role}]);login('s');assert.equal(store.reviewQuestion('q','rejected','Səhv').success,false);assert.equal(store.verifyQuestion('q').success,false);}
 put('users',[admin,{...seller,role:'coordinator'}]);assert.equal(store.reviewQuestion('q','rejected','Düzəliş lazımdır').success,true);assert.equal(store.getQuestionBank()[0].reviewHistory[0].reviewerId,'s');
});
test('rejected review history survives CSV roundtrip and invalid review metadata cannot write',()=>{
 const history=[{status:'rejected',reviewerId:'a',reviewerName:'Admin',reviewedAt:'2026-10-22T10:00:00.000Z',reason:'Aydın deyil'}];
 const q={...mediaQuestion,verification:'rejected',reviewHistory:history};const csv=store.exportQuestionsToCsv([q]);assert.deepEqual(plain(store.parseQuestionsFromCsv(csv).success[0].reviewHistory),history);assert.equal(store.importQuestionsFromCsv(csv).success,true);assert.deepEqual(plain(store.getQuestionBank()[0].reviewHistory),history);
 const before=data.get(key('questionBank'));assert.equal(store.importQuestionsFromCsv(store.exportQuestionsToCsv([{...q,text:'Invalid review',reviewHistory:[{...history[0],reason:''}]}])).success,false);assert.equal(data.get(key('questionBank')),before);
});

test('legacy year whitespace is preserved during archiving and unrelated exam updates',()=>{
 put('exams',[{...exam,academicYear:'2024-2025 '}]);const before=data.get(key('exams'));const legacy=store.getAcademicYears().find(year=>year.label==='2024-2025 ');assert.equal(store.saveAcademicYear({...legacy,active:false},true).success,true);assert.equal(data.get(key('exams')),before);assert.equal(store.saveExam({...store.getExam('e'),title:'Title only'},true).success,true);assert.equal(store.getExam('e').academicYear,'2024-2025 ');
});

test('class year selection uses active registry while archived historical values remain editable',()=>{
 const year={id:'year-a',label:'2030-2031',active:true,createdAt:''};store.saveAcademicYear(year,false);const row={id:'class-a',name:'9A',grade:'IX sinif',teacher:'Teacher',studentCount:12,academicYear:year.label,createdAt:'2026-01-01'};store.saveClass(row);store.saveAcademicYear({...year,active:false},true);store.saveClass({...row,studentCount:13});assert.equal(store.getClasses()[0].academicYear,year.label);const before=data.get(key('classes'));assert.throws(()=>store.saveClass({...row,id:'new'}));assert.throws(()=>store.saveClass({...row,academicYear:'bad'}));assert.equal(data.get(key('classes')),before);
});

test('derived year identity cannot be renamed into a duplicate ID, including after archiving',()=>{
 const current=store.getAcademicYears().find(year=>year.id.startsWith('legacy-year:'));assert.equal(store.saveAcademicYear({...current,label:'2080-2081'},true).success,false);assert.equal(store.saveAcademicYear({...current,active:false},true).success,true);const persisted=store.getAcademicYears().find(year=>year.id===current.id);assert.equal(store.saveAcademicYear({...persisted,label:'2080-2081'},true).success,false);const ids=store.getAcademicYears().map(year=>year.id);assert.equal(new Set(ids).size,ids.length);assert.equal(store.saveAcademicYear({id:'legacy-year:reserved',label:'2080-2081',active:true,createdAt:''},false).success,false);
});
