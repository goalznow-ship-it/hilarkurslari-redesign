import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {loadTs,enableTestDatabase} from './server-loader.mjs';
if(!enableTestDatabase()||new URL(process.env.DATABASE_URL).pathname!=='/hilal_test')throw Error('Use disposable hilal_test');
const db=loadTs('lib/server/db/client.ts').prisma;
const password=randomBytes(24).toString('hex'),email='bootstrap-synthetic@test.invalid';
const env={...process.env,BOOTSTRAP_ADMIN_EMAIL:email,BOOTSTRAP_ADMIN_PASSWORD:password,BOOTSTRAP_ADMIN_NAME:'Synthetic bootstrap'};
try{
 const first=spawnSync(process.execPath,['scripts/bootstrap-admin.mjs'],{env,encoding:'utf8'});assert.equal(first.error,undefined);assert.equal(first.status,0,first.stderr);assert.ok(!first.stdout.includes(password));
 const second=spawnSync(process.execPath,['scripts/bootstrap-admin.mjs'],{env,encoding:'utf8'});assert.notEqual(second.status,0);assert.equal(await db.user.count({where:{role:'admin'}}),1);
 const user=await db.user.findUnique({where:{email}});assert.ok(await loadTs('lib/server/auth.ts').verifyPassword(password,user.passwordHash));
 console.log('Bootstrap verified: first creation, duplicate refusal, real password verification; no secret printed.');
}finally{await db.user.deleteMany({where:{email}});await db.$disconnect();}
