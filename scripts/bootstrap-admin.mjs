import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
import {PrismaClient} from '@prisma/client';
import {randomBytes,scrypt as derive} from 'node:crypto';
import {promisify} from 'node:util';
// Explicit environment only. No defaults, logging of credentials, or automatic seed at startup.
const {DATABASE_URL,BOOTSTRAP_ADMIN_EMAIL,BOOTSTRAP_ADMIN_PASSWORD,BOOTSTRAP_ADMIN_NAME}=process.env;
if(!DATABASE_URL||!BOOTSTRAP_ADMIN_EMAIL||!/^\S+@\S+\.\S+$/.test(BOOTSTRAP_ADMIN_EMAIL)||!BOOTSTRAP_ADMIN_NAME||!BOOTSTRAP_ADMIN_PASSWORD||BOOTSTRAP_ADMIN_PASSWORD.length<12||BOOTSTRAP_ADMIN_PASSWORD.length>256)throw Error('Set database and explicit admin name/email/password (12-256 characters)');
const prisma=new PrismaClient({log:[]});
try{const salt=randomBytes(16),key=await promisify(derive)(BOOTSTRAP_ADMIN_PASSWORD,salt,32,{N:16384,r:8,p:5,maxmem:64*1024*1024});await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(73419282)::text`;if(await tx.user.count({where:{role:'admin',companyId:null}}))throw Error('An administrator already exists; bootstrap refused');await tx.user.create({data:{email:BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(),name:BOOTSTRAP_ADMIN_NAME.trim(),role:'admin',active:true,sellerExamIds:[],passwordHash:'scrypt:16384:8:5:'+salt.toString('hex')+':'+key.toString('hex')}});});console.log('Administrator created. No credentials printed.');}finally{await prisma.$disconnect();}
