'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Button,Input,Label,Card,CardContent} from '@/components/ui';
import {request} from '@/lib/backend-store';
export default function PasswordSetup(){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 async function save(event:React.FormEvent){event.preventDefault();setError('');setSuccess(false);if(password!==confirm){setError('Şifrələr uyğun gəlmir.');return;}setBusy(true);try{const token=new URLSearchParams(window.location.hash.slice(1)).get('token')??'';await request('/api/auth/enrollment','POST',{token,password});window.history.replaceState(null,'',window.location.pathname);setPassword('');setConfirm('');setSuccess(true);}catch(error){setError(error instanceof Error?error.message:'Saxlanılmadı.');}finally{setBusy(false);}}
 return <main className="student-portal min-h-screen flex items-center justify-center p-5"><Card className="w-full max-w-sm"><CardContent><h1 className="mb-4 text-xl font-semibold">Şifrəni təhlükəsiz qurun</h1>{success?<p role="status">Şifrə quruldu. <Link href="/admin/login">Daxil olun</Link></p>:<form onSubmit={save} className="space-y-4"><p className="text-sm text-neutral-500">Keçid bir dəfə və 24 saat ərzində istifadə olunur.</p><Label htmlFor="setup-password">Yeni şifrə (ən azı 12 simvol)</Label><Input id="setup-password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={event=>setPassword(event.target.value)}/><Label htmlFor="setup-confirm">Şifrəni təkrarlayın</Label><Input id="setup-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={event=>setConfirm(event.target.value)}/>{error&&<p role="alert">{error}</p>}<Button loading={busy} type="submit">Şifrəni qur</Button></form>}</CardContent></Card></main>;
}
