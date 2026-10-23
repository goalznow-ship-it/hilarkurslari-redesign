import {enableTestDatabase,loadTs} from './server-loader.mjs';import assert from 'node:assert/strict';
if(!enableTestDatabase()||new URL(process.env.DATABASE_URL).pathname!=='/hilal_test')throw Error('Use disposable hilal_test');
const db=loadTs('lib/server/db/client.ts').prisma,examId='ops-legacy-year-exam',classId='ops-legacy-year-class',year='1900-1901';
try{
 if(process.argv[2]==='seed'){
  await db.exam.create({data:{id:examId,title:'Synthetic legacy year',subject:'Math',startsAt:new Date(),endsAt:new Date(Date.now()+60000),durationMin:1,questions:[{id:'q',text:'Q',options:['A','B'],correct:0,type:'single'}],ticketCodes:[],academicYear:year}});
  await db.schoolClass.create({data:{id:classId,name:'Synthetic legacy class',grade:'IX',teacher:'Synthetic',academicYear:year}});
  console.log('Legacy unregistered-year fixture seeded before constraint migration.');
 }else{
  assert.equal((await db.exam.update({where:{id:examId},data:{title:'Edited legacy',academicYear:year}})).academicYear,year);
  assert.equal((await db.schoolClass.update({where:{id:classId},data:{name:'Edited legacy',academicYear:year}})).academicYear,year);
  await assert.rejects(db.schoolClass.create({data:{id:'ops-new-invalid-year-class',name:'Invalid new assignment',grade:'IX',teacher:'Synthetic',academicYear:year}}));
  console.log('Legacy years preserved/readable/editable; new unregistered assignments rejected by database.');
 }
}finally{if(process.argv[2]!=='seed')await db.schoolClass.deleteMany({where:{id:'ops-new-invalid-year-class'}});if(process.argv[2]==='check'){await db.schoolClass.deleteMany({where:{id:classId}});await db.exam.deleteMany({where:{id:examId}});}await db.$disconnect();}
