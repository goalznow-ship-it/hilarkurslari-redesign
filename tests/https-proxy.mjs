// Local integration-test TLS only. No credentials, URLs, or request payloads are logged.
import https from 'node:https';import http from 'node:http';import {readFileSync} from 'node:fs';
if(!process.env.TEST_TLS_CERT||!process.env.TEST_TLS_KEY)throw Error('Synthetic TLS certificate/key required');
https.createServer({cert:readFileSync(process.env.TEST_TLS_CERT),key:readFileSync(process.env.TEST_TLS_KEY)},(req,res)=>{
 const upstream=http.request({hostname:'127.0.0.1',port:3187,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode??502,response.headers);response.pipe(res);});upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Local test upstream unavailable');});req.pipe(upstream);
}).listen(3443,'127.0.0.1');
