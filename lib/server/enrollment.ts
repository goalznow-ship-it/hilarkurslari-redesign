import {createHash,randomBytes} from 'node:crypto';
import {prisma} from './db/client';
import {hashPassword} from './auth';
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function issueEnrollment(userId:string){
 const token=randomBytes(32).toString('hex');
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  const user=await tx.user.findUnique({where:{id:userId}});if(!user)throw Error('NOT_FOUND');
  await tx.staffEnrollment.deleteMany({where:{userId,usedAt:null}});
  await tx.staffEnrollment.create({data:{userId,tokenHash:digest(token),expiresAt:new Date(Date.now()+86400000)}});
 });return token;
}
export async function completeEnrollment(token:string,password:string){
 if(!/^[a-f0-9]{64}$/.test(token)||password.length<12||password.length>256)throw Error('INVALID');
 const passwordHash=await hashPassword(password);
 await prisma.$transaction(async tx=>{
  const enrollment=await tx.staffEnrollment.findUnique({where:{tokenHash:digest(token)}});if(!enrollment)throw Error('INVALID');
  const claimed=await tx.staffEnrollment.updateMany({where:{id:enrollment.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(claimed.count!==1)throw Error('INVALID');
  const user=await tx.user.findUnique({where:{id:enrollment.userId}});if(!user?.active)throw Error('INVALID');
  await tx.user.update({where:{id:user.id},data:{passwordHash}});
  await tx.session.deleteMany({where:{userId:user.id}});
 });
}
