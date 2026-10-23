import assert from 'node:assert/strict';
import {Prisma,PrismaClient} from '@prisma/client';
const client=new PrismaClient({log:[]});
try{
 assert.equal(typeof client.staffEnrollment?.findMany,'function','StaffEnrollment client is stale; rerun Prisma generation in a permitted environment');
 for(const [model,field] of [['Question','companyId'],['ExamVersion','metadata']])assert.ok(Prisma.dmmf.datamodel.models.find(item=>item.name===model)?.fields.some(item=>item.name===field),model+'.'+field+' is missing from generated client');
 console.log('Prisma Client artifacts verified. No database write performed.');
}finally{await client.$disconnect();}
