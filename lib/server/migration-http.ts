import {readJson} from './request';
export const readMigrationRequest=(req:Request)=>readJson(req,10*1024*1024);
