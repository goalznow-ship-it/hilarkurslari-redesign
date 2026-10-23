import {loadTs,enableTestDatabase} from './server-loader.mjs';
import {randomBytes} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
if(!enableTestDatabase())throw Error('Disposable DB required');
const db=loadTs('lib/server/db/client.ts').prisma,auth=loadTs('lib/server/auth.ts');
mkdirSync('/tmp/hilal-overnight',{recursive:true,mode:0o700});
const file='/tmp/hilal-overnight/browser-login.json',id='overnight-browser-root',examId='overnight-browser-exam';
try{
 if(process.argv[2]==='cleanup'){await db.question.deleteMany({where:{text:{startsWith:'Synthetic browser authored'}}});await db.exam.deleteMany({where:{OR:[{id:examId},{title:{startsWith:'Synthetic browser authored exam'}}]}});await db.user.deleteMany({where:{OR:[{id},{email:'overnight-browser-enroll@test.invalid'}]}});}
 else{
  const password=randomBytes(24).toString('hex'),email='overnight-browser@test.invalid';
  await db.user.create({data:{id,email,name:'Synthetic browser admin',role:'admin',passwordHash:await auth.hashPassword(password),sellerExamIds:[]}});
  const questions=[{id:'q1',text:'Synthetic single question',type:'single',options:['A','B'],correct:0,points:2},{id:'q2',text:'Synthetic multiple question',type:'multiple',options:['A','B','C'],correct:[0,2],points:3},{id:'q3',text:'Synthetic true false question',type:'true_false',options:['Doğru','Yanlış'],correct:1,points:1}];
  await db.exam.create({data:{id:examId,title:'Synthetic browser exam',subject:'Math',startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+3600000),durationMin:30,questions,ticketCodes:['AAAA-BBBB','CCCC-DDDD'],onlineEnabled:true}});
  writeFileSync(file,JSON.stringify({email,password,examId}),{mode:0o600});
 }
}finally{await db.$disconnect();}
