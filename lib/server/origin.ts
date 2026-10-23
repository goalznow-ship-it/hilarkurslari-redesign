// Production must set the canonical public URL and reject untrusted Host headers at ingress.
export function isSameOrigin(req:Request):boolean{
 const origin=req.headers.get('origin');if(!origin)return true;
 try{const configured=process.env.NEXT_PUBLIC_APP_URL;const url=new URL(req.url);const expected=configured?new URL(configured).origin:`${url.protocol}//${req.headers.get('host')??url.host}`;return new URL(origin).origin===expected;}catch{return false;}
}
