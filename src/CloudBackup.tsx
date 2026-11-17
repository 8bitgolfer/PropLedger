import { useEffect, useMemo, useState } from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import { Cloud, DownloadCloud, UploadCloud, LogOut, Mail } from 'lucide-react'

const url=import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const client=url&&anon?createClient(url,anon,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}):null

type Props<T>={picks:T[]; onRestore:(picks:T[])=>void}
export default function CloudBackup<T extends {id:string;player:string;status:string}>({picks,onRestore}:Props<T>){
 const [user,setUser]=useState<User|null>(null)
 const [email,setEmail]=useState('')
 const [status,setStatus]=useState('')
 const [busy,setBusy]=useState(false)
 const connected=useMemo(()=>Boolean(client),[])
 useEffect(()=>{
  if(!client)return
  void client.auth.getUser().then(({data})=>setUser(data.user||null))
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null))
  return()=>subscription.unsubscribe()
 },[])
 const sendLink=async()=>{
  if(!client||!email.trim())return
  setBusy(true)
  const {error}=await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+import.meta.env.BASE_URL}})
  setStatus(error?error.message:'Check your email for your secure sign-in link.')
  setBusy(false)
 }
 const save=async()=>{
  if(!client||!user)return
  setBusy(true)
  const {error}=await client.from('user_backups').upsert({user_id:user.id,payload:{version:2,picks,exportedAt:new Date().toISOString()}},{onConflict:'user_id'})
  setStatus(error?error.message:'Cloud backup saved privately. You can restore it on another device.')
  setBusy(false)
 }
 const restore=async()=>{
  if(!client||!user)return
  setBusy(true)
  const {data,error}=await client.from('user_backups').select('payload').eq('user_id',user.id).maybeSingle()
  if(error)setStatus(error.message)
  else if(!data?.payload?.picks||!Array.isArray(data.payload.picks))setStatus('No saved cloud journal found for this account.')
  else if(window.confirm('Replace this browser\'s journal with your private cloud backup? Export a local JSON backup first.')){
   const records=data.payload.picks as T[]
   if(records.every(p=>p&&typeof p.id==='string'&&typeof p.player==='string'&&typeof p.status==='string')){onRestore(records);setStatus('Cloud backup restored.')}
   else setStatus('Cloud backup contains unexpected data.')
  }
  setBusy(false)
 }
 return <div className="cloud-panel">
  <div className="panel-title"><Cloud size={17}/> PRIVATE CLOUD BACKUP</div>
  {!connected?<><h3>Cloud backup requires configuration</h3><p>This site still works offline in your browser. To enable private cross-device backup, connect a Supabase project and apply the row-level security SQL in <code>supabase/schema.sql</code>. No data is uploaded until configured.</p></>:
  !user?<><p>Sign in with a one-time email link to privately save and restore your pick journal across devices.</p><div className="cloud-row"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email"/><button className="secondary" disabled={busy||!email.trim()} onClick={sendLink}><Mail size={15}/> Email sign-in link</button></div></>:
  <><p>Signed in as <strong>{user.email}</strong>. This cloud backup includes only your prediction journal—not any sportsbook credentials or gambling payments.</p><div className="cloud-row"><button className="primary" disabled={busy} onClick={save}><UploadCloud size={15}/> Back up to cloud</button><button className="secondary" disabled={busy} onClick={restore}><DownloadCloud size={15}/> Restore from cloud</button><button className="secondary" onClick={()=>void client?.auth.signOut()}><LogOut size={15}/> Sign out</button></div></>}
  {status&&<p className="cloud-status" role="status">{status}</p>}
 </div>
}
