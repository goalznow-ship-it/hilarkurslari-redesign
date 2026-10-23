import {enableTestDatabase,loadTs} from './server-loader.mjs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {randomBytes,randomUUID} from 'node:crypto';
if(!enableTestDatabase())throw Error('Disposable database required');
const db=loadTs('lib/server/db/client.ts').prisma,id='ops-'+randomUUID();
try{
 const before={results:await db.examResult.count(),sales:await db.ticketSale.count(),attempts:await db.examAttempt.count(),versions:await db.examVersion.count()};
 await db.user.create({data:{id,email:id+'@test.invalid',name:'Synthetic cleanup',role:'teacher',passwordHash:'disabled',sellerExamIds:[]}});
 await db.session.createMany({data:[{userId:id,token:randomBytes(32).toString('hex'),expiresAt:new Date(0)},{userId:id,token:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+60000)}]});
 await db.rateLimitEntry.createMany({data:[{id:id+'old',key:id+'old',count:1,resetAt:new Date(0)},{id:id+'valid',key:id+'valid',count:1,resetAt:new Date(Date.now()+60000)}]});
 const result=spawnSync('bash',['scripts/cleanup.sh'],{encoding:'utf8',env:process.env});assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);assert.equal(await db.session.count({where:{userId:id}}),1);assert.equal(await db.rateLimitEntry.count({where:{key:{startsWith:id}}}),1);
 assert.deepEqual({results:await db.examResult.count(),sales:await db.ticketSale.count(),attempts:await db.examAttempt.count(),versions:await db.examVersion.count()},before);
 console.log('Cleanup verified: only expired sessions/counters removed; valid records and historical counts preserved.');
}finally{await db.rateLimitEntry.deleteMany({where:{key:{startsWith:id}}});await db.user.deleteMany({where:{id}});await db.$disconnect();}
