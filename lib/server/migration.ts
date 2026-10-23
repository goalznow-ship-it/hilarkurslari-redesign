import { Prisma } from "@prisma/client";
import {hashPassword} from "./auth";
import {createHash} from "node:crypto";
import { randomBytes } from "node:crypto";
import { prisma } from "./db/client";
import { migrationSchema, migrationSections, type MigrationData, type MigrationPreview, type MigrationSection } from "../migration-format";
export type { MigrationData, MigrationPreview } from "../migration-format";
type Tx = Prisma.TransactionClient;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
function normalized(value: unknown): unknown {
 if(value instanceof Date)return value.toISOString();
 if(Array.isArray(value))return value.map(normalized);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==null).map(([k,v])=>[k,normalized(v)]));
 return value;
}
function comparable(value: unknown): string {
 if(Array.isArray(value))return '['+value.map(comparable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+comparable(v)).join(',')+'}';
 return JSON.stringify(value);
}
function emptyPreview(errors:string[]=[]):MigrationPreview{
 const section=()=>({create:0,update:0,skip:0,conflicts:[] as string[]});
 return {companies:section(),academicYears:section(),users:section(),exams:section(),questions:section(),classes:section(),ticketSales:section(),results:section(),errors,manualReenrollment:[]};
}
type EnrollmentCredential={token:string;passwordHash:string};
async function plan(data: MigrationData, tx: Tx,reenrollStaff=false,credentials=new Map<string,EnrollmentCredential>()) {
 const enrollments:Array<{userId:string;token:string}>=[];
 const preview = emptyPreview();
 if(reenrollStaff&&data.users.length>100)preview.errors.push("Bir idxalda ən çox 100 əməkdaş yenidən qeydiyyatdan keçirilə bilər.");
 const existing = {companies:await tx.company.findMany(),academicYears:await tx.academicYear.findMany(),users:await tx.user.findMany(),exams:await tx.exam.findMany(),questions:await tx.question.findMany(),classes:await tx.schoolClass.findMany(),ticketSales:await tx.ticketSale.findMany(),results:await tx.examResult.findMany()};
 const actions: Array<()=>Promise<unknown>>=[];
 const refs = (key:MigrationSection,id:string|undefined) => !id || existing[key].some(row=>row.id===id) || ((key!=="users"||reenrollStaff)&&data[key].some(row=>row.id===id));
 for(const key of migrationSections){
  const seen=new Set<string>();
  data[key].forEach((row,index)=>{if(seen.has(row.id))preview.errors.push(`${key}[${index}]: təkrar ID.`);seen.add(row.id);
   if('companyId' in row&&!refs('companies',row.companyId))preview.errors.push(`${key}[${index}]: şirkət əlaqəsi yoxdur.`);
   if('examId' in row&&!refs('exams',row.examId))preview.errors.push(`${key}[${index}]: imtahan əlaqəsi yoxdur.`);
   if('sellerId' in row&&!refs('users',row.sellerId))preview.errors.push(`${key}[${index}]: satıcı yenidən qeydiyyatdan keçməlidir.`);
   if('academicYear' in row&&row.academicYear&&!existing.academicYears.some(year=>year.label===row.academicYear)&&!data.academicYears.some(year=>year.label===row.academicYear))preview.errors.push(`${key}[${index}]: tədris ili əlaqəsi yoxdur.`);
  });
 }
 data.users.forEach((row,index)=>{if(row.sellerExamIds.some(id=>!refs('exams',id)))preview.errors.push(`users[${index}]: imtahan təyinatı yoxdur.`);});
 function section<T extends {id:string}>(key:MigrationSection,rows:T[],keys:(row:{id:string;code?:string|null;label?:string;email?:string;examId?:string;ticketCode?:string;studentFIN?:string;fin?:string})=>string[],create:(row:T)=>Promise<unknown>){
  const used=new Set<string>();
  rows.forEach((row,index)=>{
   const identifiers=keys(row);
   if(identifiers.some(k=>used.has(k)))preview.errors.push(`${key}[${index}]: təkrar identifikator.`);
   identifiers.forEach(k=>used.add(k));
   const prior=existing[key].find(value=>value.id===row.id);
   if(key==='users'&&!reenrollStaff){
    preview.users.skip++;
    if(!prior)preview.manualReenrollment.push(`users[${index}]: təhlükəsiz yenidən qeydiyyat tələb olunur; hesab yaradılmayacaq.`);
    else if('email' in prior&&'email' in row&&prior.email!==row.email)preview.users.conflicts.push(`users[${index}]: ID/e-poçt ziddiyyəti.`);
    return;
   }
   const other=existing[key].some(value=>value.id!==row.id&&keys(value).some(k=>identifiers.includes(k)));
   if(other){preview[key].conflicts.push(`${key}[${index}]: mövcud identifikatorla ziddiyyət.`);return;}
   if(prior){
    const clean=normalized(prior) as Record<string,unknown>;
    if(key==='questions'){clean.image=clean.imageUrl?{url:clean.imageUrl,alt:clean.imageAlt}:undefined;}
    if(key==='results'){clean.questions=clean.questionsSnapshot;clean.questionsSnapshot=clean.questionsSnapshot;}
    const same=Object.entries(row).every(([field,value])=>comparable(value)===comparable(clean[field]));
    if(same)preview[key].skip++;else preview[key].conflicts.push(`${key}[${index}]: ID mövcuddur, fərqli məlumat üzərinə yazılmır.`);
   }else{preview[key].create++;actions.push(()=>create(row));}
  });
 }
 section('companies',data.companies,r=>[r.code?.toUpperCase()??""],r=>tx.company.create({data:r}));
 section('academicYears',data.academicYears,r=>[r.label??""],r=>tx.academicYear.create({data:r}));
 section('users',data.users,r=>[r.email?.toLowerCase()??""],async r=>{
  const credential=credentials.get(r.id);if(!credential)throw Error('Missing enrollment credential');
  const user=await tx.user.create({data:{...r,passwordHash:credential.passwordHash}});
  await tx.staffEnrollment.create({data:{userId:user.id,tokenHash:createHash('sha256').update(credential.token).digest('hex'),expiresAt:new Date(Date.now()+86400000)}});
  enrollments.push({userId:user.id,token:credential.token});return user;
 });
 section('exams',data.exams,r=>r.code?[r.code.trim().toUpperCase()]:[],r=>tx.exam.create({data:{...r,questions:json(r.questions)}}));
 section('questions',data.questions,()=>[],r=>{const {image,optionImages,reviewHistory,correct,...rest}=r;return tx.question.create({data:{...rest,correct:json(correct),imageUrl:image?.url,imageAlt:image?.alt,...(optionImages?{optionImages:json(optionImages)}:{}),...(reviewHistory?{reviewHistory:json(reviewHistory)}:{})}});});
 section('classes',data.classes,()=>[],r=>tx.schoolClass.create({data:r}));
 section('ticketSales',data.ticketSales,r=>[`${r.examId}:ticket:${r.ticketCode?.toUpperCase()}`,`${r.examId}:fin:${r.studentFIN?.toUpperCase()}`],r=>tx.ticketSale.create({data:r}));
 section('results',data.results,r=>[`${r.examId}:fin:${r.fin?.toUpperCase()}`,`${r.examId}:ticket:${r.ticketCode?.toUpperCase()}`],r=>{const {questions,questionsSnapshot,answers,...rest}=r;return tx.examResult.create({data:{...rest,answers:json(answers),questionsSnapshot:json(questionsSnapshot??questions),accessToken:randomBytes(32).toString('hex')}});});
 return {preview,actions,enrollments};
}
export function parseMigration(input:unknown){return migrationSchema.safeParse(input);}
function invalidPreview(input:unknown):MigrationPreview|undefined{
 const parsed=parseMigration(input);if(parsed.success)return;
 return emptyPreview(parsed.error.issues.map(issue=>`${issue.path.join('.')}: format yanlışdır.`));
}
export async function previewMigration(input:unknown,reenrollStaff=false):Promise<MigrationPreview>{const invalid=invalidPreview(input);if(invalid)return invalid;return (await plan(migrationSchema.parse(input),prisma,reenrollStaff)).preview;}
export async function importMigrationData(input:unknown,reenrollStaff=false){
 const invalid=invalidPreview(input);if(invalid)return {success:false,errors:invalid.errors,counts:{},preview:invalid};
 const data=migrationSchema.parse(input);
 if(reenrollStaff&&data.users.length>100){const preview=emptyPreview(['Bir idxalda ən çox 100 əməkdaş yenidən qeydiyyatdan keçirilə bilər.']);return {success:false,errors:preview.errors,counts:{},preview};}
 const credentials=new Map<string,EnrollmentCredential>();
 if(reenrollStaff)for(const user of data.users)credentials.set(user.id,{token:randomBytes(32).toString('hex'),passwordHash:await hashPassword(randomBytes(32).toString('hex'))});
 return prisma.$transaction(async tx=>{
  const {preview,actions,enrollments}=await plan(data,tx,reenrollStaff,credentials);
  const errors=[...preview.errors,...migrationSections.flatMap(key=>preview[key].conflicts)];
  if(errors.length)return {success:false,errors,counts:{},preview};
  for(const action of actions)await action();
  return {success:true,errors:[],enrollments,counts:Object.fromEntries(migrationSections.map(key=>[key,preview[key].create])),preview};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000});
}
