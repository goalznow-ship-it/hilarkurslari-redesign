import {createHash} from 'node:crypto';
export function recordVersion(value:unknown):string{
 const canonical=(item:unknown):unknown=>item instanceof Date?item.toISOString():Array.isArray(item)?item.map(canonical):item&&typeof item==='object'?Object.fromEntries(Object.entries(item).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])):item;
 return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
