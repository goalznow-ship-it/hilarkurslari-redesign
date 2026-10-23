'use client';
import type { AdminState } from './admin-state';
import type { AcademicYear, Company, Exam, Question, SchoolClass, User, TicketSale, SalesReportFilters } from './types';
import { normalizeFin, normalizeTicket } from './helpers';
import { parseQuestionsFromCsv, sameQuestion } from './store';
export { canAccessPage, changeQuestionType, validateQuestion, normalizeQuestionType, newId, exportQuestionsToCsv, downloadCsvTemplate } from './store';
let state:AdminState|undefined;
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await response.json();if(!response.ok)throw new ApiError(data.error??'Əməliyyat tamamlanmadı.',response.status);return data;
}
export async function refreshAdminState(){state=await request<AdminState>('/api/admin/state');return state;}
export function getCurrentUser(){return state?.user;}
export function getSession(){return state?{user:state.user.id,at:''}:null;}
export async function clearSession(){await request('/api/auth/logout','POST');state=undefined;}
export function initStore(){/* Server snapshot is loaded by DashboardShell before children mount. */}
export const getExams=()=>structuredClone(state?.exams??[]);
export const getExam=(id:string)=>getExams().find(exam=>exam.id===id);
export const getQuestionBank=()=>structuredClone(state?.questions??[]);
export const getResults=()=>structuredClone(state?.results??[]);
export const getUsers=()=>structuredClone(state?.users??[]);
export const getClasses=()=>structuredClone(state?.classes??[]);
export const getCompanies=()=>structuredClone(state?.companies??[]);
export const getAcademicYears=()=>structuredClone(state?.years??[]);
export const getTicketSales=()=>structuredClone(state?.sales??[]);
async function mutate<T>(url:string,method:string,body?:unknown){const result=await request<T>(url,method,body);try{await refreshAdminState();}catch(error){if(error instanceof ApiError&&error.status===401){state=undefined;window.dispatchEvent(new Event('kitabca:session-expired'));}throw Error('Dəyişiklik serverdə saxlanıldı, siyahı yenilənmədi. Səhifəni yeniləyib yoxlayın; əməliyyatı təkrarlamayın.');}return result;}
type Outcome={success:boolean;error?:string};
async function outcome<T extends Outcome>(operation:()=>Promise<T>):Promise<T|{success:false;error:string}>{try{return await operation();}catch(error){return {success:false,error:error instanceof Error?error.message:'Əməliyyat saxlanılmadı.'};}}
export async function saveExam(exam:Exam,isEdit:boolean){const {id,revision,createdAt:_created,...data}=exam;void _created;return outcome(()=>mutate<Outcome>(isEdit?`/api/exams/${encodeURIComponent(id)}`:'/api/exams',isEdit?'PUT':'POST',{...data,...(!isEdit?{id}:{expectedVersion:revision,companyId:exam.companyId??null,code:exam.code??null})}));}
export const deleteExam=(id:string)=>mutate(`/api/exams/${encodeURIComponent(id)}`,'DELETE');
export async function copyExam(id:string){return mutate('/api/exams/'+encodeURIComponent(id)+'/copy','POST');}
export async function addTickets(id:string,codes:string[]){return outcome(()=>mutate<Outcome>(`/api/exams/${encodeURIComponent(id)}/tickets`,'POST',{codes}));}
function questionFields(q:Question){const {companyId:_company,id:_id,createdAt:_created,updatedAt:_updated,reviewHistory:_history,verification:_review,...data}=q;void [_company,_id,_created,_updated,_history,_review];return data;}
export async function addQuestionValidated(q:Question){return outcome(()=>mutate<Outcome>('/api/questions','POST',questionFields(q)));}
export async function updateQuestionValidated(q:Question){return outcome(()=>mutate<Outcome>(`/api/questions/${encodeURIComponent(q.id)}`,'PUT',{...questionFields(q),expectedUpdatedAt:q.updatedAt}));}
export const deleteQuestionFromBank=(id:string)=>mutate(`/api/questions/${encodeURIComponent(id)}`,'DELETE');
export async function reviewQuestion(id:string,verification:'verified'|'rejected',reason=''){const result=await outcome(()=>mutate<Outcome>(`/api/questions/${encodeURIComponent(id)}`,'PUT',{verification,reason,expectedUpdatedAt:getQuestionBank().find(q=>q.id===id)?.updatedAt}));return {...result,questions:getQuestionBank()};}
export function previewQuestionsFromCsv(csv:string){const preview=parseQuestionsFromCsv(csv);preview.success.forEach((q,index)=>{if(getQuestionBank().some(existing=>sameQuestion(existing,q))||preview.success.slice(0,index).some(existing=>sameQuestion(existing,q)))preview.errors.push({row:preview.rows[index],error:'Təkrar sual.'});});return preview;}
export async function importQuestionsFromCsv(csv:string){const result=await request<{success:boolean;added:number;errors:Array<{row:number;error:string}>}>('/api/questions/import','POST',{csv});if(result.success)await refreshAdminState();return {...result,questions:getQuestionBank()};}
export const createUser=(data:Omit<User,'id'>&{password:string})=>outcome(()=>mutate<Outcome&{enrollmentToken?:string}>('/api/users','POST',data));
export const updateUser=(user:User,password?:string)=>{const {id,passwordHash:_hash,...data}=user;void _hash;return outcome(()=>mutate<Outcome>(`/api/users/${encodeURIComponent(id)}`,'PUT',{...data,companyId:user.companyId??null,...(password?{password}:{})}));};
export const deleteUser=(id:string)=>outcome(()=>mutate<Outcome>(`/api/users/${encodeURIComponent(id)}`,'DELETE'));
export async function saveClass(row:SchoolClass){const {id,createdAt:_at,...data}=row;void _at;return mutate(getClasses().some(r=>r.id===id)?`/api/classes/${encodeURIComponent(id)}`:'/api/classes',getClasses().some(r=>r.id===id)?'PUT':'POST',{...data,id});}
export const deleteClass=(id:string)=>mutate(`/api/classes/${encodeURIComponent(id)}`,'DELETE');
export async function saveCompany(row:Company,edit:boolean){const {id,createdAt:_at,...data}=row;void _at;try{const result=await mutate<{company:Company}>(edit?`/api/companies/${encodeURIComponent(id)}`:'/api/companies',edit?'PUT':'POST',data);return {success:true,record:result.company};}catch(error){return {success:false,error:error instanceof Error?error.message:'Saxlanılmadı.'};}}
export async function saveAcademicYear(row:AcademicYear,edit:boolean){const {id,createdAt:_at,...data}=row;void _at;try{const result=await mutate<{year:AcademicYear}>(edit?`/api/years/${encodeURIComponent(id)}`:'/api/years',edit?'PUT':'POST',data);return {success:true,record:result.year};}catch(error){return {success:false,error:error instanceof Error?error.message:'Saxlanılmadı.'};}}
export async function sellTicket(examId:string,ticketCode:string,_sellerId:string,studentFIN:string,studentName:string,price:number){return outcome(()=>mutate<Outcome&{sale?:import('./types').TicketSale}>('/api/tickets','POST',{examId,ticketCode:normalizeTicket(ticketCode),studentFIN:normalizeFin(studentFIN),studentName,price}));}
export const getSalesBySeller=(id:string)=>getTicketSales().filter(sale=>sale.sellerId===id);
export const getAvailableTickets=(id:string)=>structuredClone(state?.availableTickets?.[id]??[]);

export function getFilteredTicketSales(filters: SalesReportFilters = {}): TicketSale[] {
  const parseDate = (value: string, end: boolean) => {
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T00:00:00Z" : value);
    if (!Number.isFinite(date.getTime())) throw new Error("Tarix yanlışdır.");
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCDate(date.getUTCDate() + 1);
    return date.getTime();
  };
  const start = filters.startDate ? parseDate(filters.startDate, false) : -Infinity;
  const end = filters.endDate ? parseDate(filters.endDate, true) : Infinity;
  if (start > end) throw new Error("Tarix aralığı yanlışdır.");
  const dateOnlyEnd = /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate ?? "");
  return getTicketSales().filter((sale) => {
    const date = Date.parse(sale.soldAt);
    return date >= start && (dateOnlyEnd ? date < end : date <= end) &&
      (!filters.sellerId || sale.sellerId === filters.sellerId) && (!filters.examId || sale.examId === filters.examId);
  });
}

export function generateSalesReport(filters: {
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  examId?: string;
} = {}): {
  totalTickets: number;
  totalRevenue: number;
  bySeller: { sellerId: string; sellerName: string; tickets: number; revenue: number }[];
  byExam: { examId: string; examTitle: string; tickets: number; revenue: number }[];
  byDate: { date: string; tickets: number; revenue: number }[];
} {
  const sales = getFilteredTicketSales(filters);

  // Calculate totals
  const totalTickets = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.price, 0);

  // By seller
  const sellerMap = new Map<string, { sellerId: string; sellerName: string; tickets: number; revenue: number }>();
  for (const s of sales) {
    const existing = sellerMap.get(s.sellerId) || { sellerId: s.sellerId, sellerName: s.sellerName, tickets: 0, revenue: 0 };
    existing.tickets++;
    existing.revenue += s.price;
    sellerMap.set(s.sellerId, existing);
  }
  const bySeller = Array.from(sellerMap.values()).sort((a, b) => b.revenue - a.revenue);

  // By exam
  const examMap = new Map<string, { examId: string; examTitle: string; tickets: number; revenue: number }>();
  for (const s of sales) {
    const existing = examMap.get(s.examId) || { examId: s.examId, examTitle: s.examTitle, tickets: 0, revenue: 0 };
    existing.tickets++;
    existing.revenue += s.price;
    examMap.set(s.examId, existing);
  }
  const byExam = Array.from(examMap.values()).sort((a, b) => b.revenue - a.revenue);

  // By date
  const dateMap = new Map<string, { date: string; tickets: number; revenue: number }>();
  for (const s of sales) {
    const date = s.soldAt.split("T")[0];
    const existing = dateMap.get(date) || { date, tickets: 0, revenue: 0 };
    existing.tickets++;
    existing.revenue += s.price;
    dateMap.set(date, existing);
  }
  const byDate = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalTickets,
    totalRevenue,
    bySeller,
    byExam,
    byDate,
  };
}

