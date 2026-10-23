import type { AcademicYear, Company, Exam, ExamResult, Question, SchoolClass, TicketSale, User } from './types';
export type AdminState = { availableTickets:Record<string,string[]>; user: User; exams: Exam[]; questions: Question[]; results: ExamResult[]; users: User[]; classes: SchoolClass[]; companies: Company[]; years: AcademicYear[]; sales: TicketSale[] };
