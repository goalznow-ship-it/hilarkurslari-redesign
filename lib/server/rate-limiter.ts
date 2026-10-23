import { createHash, randomUUID } from "node:crypto";
import { prisma } from "./db/client";
interface RateLimitConfig {windowMs:number;maxRequests:number;keyPrefix:string}
const configs:Record<string,RateLimitConfig>={login:{windowMs:900000,maxRequests:8,keyPrefix:"rl:login"},"student-entry":{windowMs:300000,maxRequests:10,keyPrefix:"rl:entry"},"api-default":{windowMs:60000,maxRequests:1000,keyPrefix:"rl:network"},"exam-submit":{windowMs:60000,maxRequests:10,keyPrefix:"rl:submit"},"exam-answer":{windowMs:10000,maxRequests:30,keyPrefix:"rl:answer"}};
export async function checkRateLimit(identifier:string,endpoint:string,customConfig?:Partial<RateLimitConfig>){
 const config={...configs[endpoint],...customConfig};
 if(!Number.isSafeInteger(config.windowMs)||config.windowMs<=0||!Number.isSafeInteger(config.maxRequests)||config.maxRequests<1||!config.keyPrefix)throw new Error('Invalid rate limit config');
 const key=config.keyPrefix+':'+createHash('sha256').update(identifier).digest('hex');
 // PostgreSQL serializes conflicting upserts; no read/check/write race across instances.
 const [entry]=await prisma.$queryRaw<Array<{count:number;resetAt:Date}>>`
 INSERT INTO "RateLimitEntry" ("id","key","count","resetAt","createdAt")
 VALUES (${randomUUID()},${key},1,clock_timestamp()+(${config.windowMs} * interval '1 millisecond'),clock_timestamp())
 ON CONFLICT ("key") DO UPDATE SET
 "count"=CASE WHEN "RateLimitEntry"."resetAt"<=clock_timestamp() THEN 1 ELSE LEAST("RateLimitEntry"."count"+1,${config.maxRequests+1}) END,
 "resetAt"=CASE WHEN "RateLimitEntry"."resetAt"<=clock_timestamp() THEN clock_timestamp()+(${config.windowMs} * interval '1 millisecond') ELSE "RateLimitEntry"."resetAt" END
 RETURNING "count","resetAt"`;
 return {allowed:entry.count<=config.maxRequests,remaining:Math.max(0,config.maxRequests-entry.count),resetAt:entry.resetAt,total:entry.count};
}
export function getClientIdentifier(req:Request):string{
 // shortcut: enable only behind an ingress that overwrites this header; otherwise use a shared coarse bucket.
 const header=process.env.TRUSTED_CLIENT_IP_HEADER;
 const value=header?req.headers.get(header):null;
 return value&&/^[a-fA-F0-9:.]{1,64}$/.test(value)?value:'unavailable';
}
export async function resetRateLimit(identifier:string,endpoint:string){const config=configs[endpoint];if(config)await prisma.rateLimitEntry.deleteMany({where:{key:config.keyPrefix+':'+createHash('sha256').update(identifier).digest('hex')}});}
export async function runRateLimitCleanup(){return (await prisma.rateLimitEntry.deleteMany({where:{resetAt:{lt:new Date()}}})).count;}
