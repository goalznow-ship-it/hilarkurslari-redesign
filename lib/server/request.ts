export class RequestBodyError extends SyntaxError {constructor(public status:400|413){super('Invalid request body');}}
export async function readJson(req:Request,maxBytes=4*1024*1024):Promise<unknown>{
 const reader=req.body?.getReader();if(!reader)throw new RequestBodyError(400);
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxBytes){await reader.cancel();throw new RequestBodyError(413);}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RequestBodyError(400);}
}
