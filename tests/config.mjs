import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base={...process.env,NODE_ENV:'production',DATABASE_URL:'postgresql://synthetic@127.0.0.1:55439/hilal_test',AUTH_SECRET:'synthetic-test-secret-at-least-32-characters',NEXT_PUBLIC_APP_URL:'https://localhost:3443'};
for(const [name,changes,valid] of [['valid',{},true],['HTTP',{NEXT_PUBLIC_APP_URL:'http://localhost:3443'},false],['weak secret',{AUTH_SECRET:'short'},false],['wrong database',{DATABASE_URL:'https://localhost'},false]]){
 const result=spawnSync(process.execPath,['scripts/check-env.mjs'],{env:{...base,...changes},encoding:'utf8'});
 assert.equal(result.error,undefined);assert.equal(result.status===0,valid,name);assert.ok(!result.stdout.includes(base.AUTH_SECRET));
}
console.log('Configuration startup verified: valid production config accepted; HTTP, weak secret and wrong database rejected.');
