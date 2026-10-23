import Module,{createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(name,parent,...rest){if(name.startsWith('@/'))name=path.resolve(name.slice(2))+'.ts';return resolve.call(this,name,parent,...rest);};
Module._extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);};
export const loadTs=file=>require(path.resolve(file));
export function enableTestDatabase(){const raw=process.env.TEST_DATABASE_URL;if(!raw)return false;const url=new URL(raw);if(!['127.0.0.1','localhost'].includes(url.hostname)||!['/hilal_recovery','/hilal_test'].includes(url.pathname))throw Error('Disposable local test database required');process.env.DATABASE_URL=raw;process.env.AUTH_SECRET='synthetic-recovery-test-secret-at-least-32-characters';return true;}
