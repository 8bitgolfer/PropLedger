import { useEffect, useRef, useState } from 'react'
import CloudBackup from './CloudBackup'
import { NOV17_WATCHLIST } from './nov17Watchlist'
import { NOV17_FINAL_RESULTS } from './nov17Verified'
import { NOV18_WATCHLIST } from './nov18Watchlist'
import { NOV18_FINAL_RESULTS } from './nov18Verified'
import PickInsights, { historicalBaseline, type InsightFeed } from './PickInsights'
import { Activity, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, Download, FileUp, Plus, RefreshCw, Target, Trash2, X } from 'lucide-react'

type Status = 'watchlist' | 'pending' | 'win' | 'loss' | 'push' | 'void'
type Side = 'More' | 'Less'
type Pick = { id: string; promo?: 'taco' | null; date: string; gameTime?: string; tipoffISO?: string; gameId?: string; playerId?: string; teamId?: string; rationale?: string; lockedAt?: string; correctionNotes?: string; autoGraded?: boolean; resultSource?: string; player: string; opponent: string; market: string; side: Side; line: number; platform: string; odds: number | null; projection: number | null; probability: number | null; status: Status; actual: number | null; recommended: boolean; placed?: boolean; stake?: number; notes: string; createdAt: string }
const KEY = 'propledger-v1'
const NOV17_IMPORT_KEY = 'propledger-nov17-discussion-v1'
const NOV17_REPAIR_KEY = 'propledger-nov17-repair-v2'
const NOV18_IMPORT_KEY = 'propledger-nov18-discussion-v1'
type NBAPlayer = { id: string; name: string; team: string; teamId?: string; points: number; rebounds: number; assists: number; threes: number; steals: number | null; blocks: number | null; pra: number; pa: number; pr: number; ra: number }
type Team = { id: string; abbreviation: string; name: string }
type ScheduleGame = { id: string; date: string; tipoff: string; teams: Team[]; completed: boolean }
type ScheduleData = { date: string; games: ScheduleGame[] }
type RosterPlayer = { id: string; name: string; teamId: string }
type FinalGame = ScheduleGame & { players: NBAPlayer[] }
type ResultsData = { date: string; games: FinalGame[] }
const formatET=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso))
const validMarkets=['Points','Rebounds','Assists','3PT Made','PRA','Points + Assists','Points + Rebounds','Rebounds + Assists','Steals','Blocks','Steals + Blocks']
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')
const teamAliases:Record<string,string>={gs:'gsw',gsw:'gsw',no:'nop',nop:'nop',ny:'nyk',nyk:'nyk',sa:'sas',sas:'sas',wsh:'was',was:'was',ut:'uta',uta:'uta',pho:'phx',phx:'phx',brk:'bkn',bkn:'bkn'}
const teamKey=(s:string)=>teamAliases[normalize(s)]||normalize(s)

const resultFor=(market:string,p:NBAPlayer):number|null=>{
 const values:Record<string,number|null>={'Points':p.points,'Rebounds':p.rebounds,'Assists':p.assists,'3PT Made':p.threes,'PRA':p.pra,'Points + Assists':p.pa,'Points + Rebounds':p.pr,'Rebounds + Assists':p.ra,'Steals':p.steals,'Blocks':p.blocks,'Steals + Blocks':p.steals!==null&&p.blocks!==null?p.steals+p.blocks:null}
 return Number.isFinite(values[market])?values[market]:null
}
const localDate=(iso:string)=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso))
 const read=(type:string)=>parts.find(p=>p.type===type)?.value||''
 return read('year')+'-'+read('month')+'-'+read('day')
}
const defaultTime=''
const displayTime=(value?:string)=>{
 if(!value)return 'Time unverified'
 const [h,m]=value.split(':').map(Number)
 if(!Number.isFinite(h)||!Number.isFinite(m))return 'Time unverified'
 return (h%12||12)+':'+String(m).padStart(2,'0')+(h>=12?' PM':' AM')
}

const markets = ['Points','Rebounds','Assists','3PT Made','PRA','Points + Assists','Points + Rebounds','Rebounds + Assists','Steals','Blocks','Steals + Blocks','Other']
const seed: Pick[] = [
 {id:'seed-zion',date:'2026-11-16',gameTime:'20:00',rationale:"Pelicans' missing offensive contributors could increase Zion's scoring opportunities. His rim pressure and free throws offer several paths to points. Risks: extra help defense, foul trouble and a lower free-throw rate. This is an unverified watchlist line, not a confirmed value bet.",player:'Zion Williamson',opponent:'GSW',market:'Points',side:'More',line:20.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Reported public research target. Line and availability not verified on PrizePicks or Hard Rock.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-fears',date:'2026-11-16',gameTime:'20:00',rationale:"With a key ball-handler unavailable, Fears may have additional creation responsibility. Assists depend heavily on potential assists and teammate conversion. Risks: shared playmaking, defensive pressure and missed teammate shots. No independent probability was established.",player:'Jeremiah Fears',opponent:'GSW',market:'Assists',side:'More',line:5.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Reported public target, not a confirmed executable bet.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-kennard',date:'2026-11-16',gameTime:'21:00',rationale:"Potential spot-up opportunities and perimeter shooting make his points market worth reviewing. His minutes and shot volume remain critical, and cold three-point shooting is a major failure mode. This was never a verified final sportsbook selection.",player:'Luke Kennard',opponent:'DEN',market:'Points',side:'More',line:7.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Unverified watchlist target. Confirm team and line before upgrading.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-draymond',date:'2026-11-16',gameTime:'20:00',rationale:"This under is worth investigating if his offensive involvement and scoring attempts remain limited. His role can change with major Warriors absences, so a low line is not automatically good value. An independent distribution was not calculated.",player:'Draymond Green',opponent:'NOP',market:'Points',side:'Less',line:6.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Morning third-party market snapshot. Not a verified final recommendation.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-podz',date:'2026-11-16',gameTime:'20:00',rationale:"PRA combines scoring, rebounding and assists; shifting Golden State rotations can change all three. The under requires careful projected-minute and usage analysis, particularly with missing teammates. This was only a public-market watchlist threshold.",player:'Brandin Podziemski',opponent:'NOP',market:'PRA',side:'Less',line:28.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Unverified research target; check availability and lineup.',createdAt:'2026-11-16T19:40:00-05:00'}
]
function reconcileKnownResults(rows:Pick[]):Pick[]{
 let changed=false
 const graded=rows.map(p=>{
  // Preserve manual grades and historical finals. Never turn void into loss.
  if(p.actual!==null||p.status==='win'||p.status==='loss'||p.status==='push'||p.status==='void')return p
  const verified=[...NOV17_FINAL_RESULTS,...NOV18_FINAL_RESULTS].find(r=>
   p.date===r.date&&normalize(p.player)===normalize(r.player)&&
   p.market===r.market&&p.side===r.side&&p.line===r.line
  )
  if(!verified)return p
  const status:Status=('status' in verified&&verified.status==='void')?'void':
   verified.actual===null?'void':verified.actual===p.line?'push':
   p.side==='More'?(verified.actual>p.line?'win':'loss'):(verified.actual<p.line?'win':'loss')
  changed=true
  return {...p,status,actual:verified.actual,autoGraded:true,resultSource:verified.source}
 })
 return changed?graded:rows
}
function mergeNov17Watchlist(rows:Pick[]):Pick[]{
 const ids=new Set(rows.map(p=>p.id))
 const lines=new Set(rows.map(p=>[p.date,normalize(p.player),p.market,p.side,p.line].join('|')))
 const additions=NOV17_WATCHLIST.filter(p=>
  !ids.has(p.id)&&!lines.has([p.date,normalize(p.player),p.market,p.side,p.line].join('|'))
 ).map(p=>({...p} as Pick))
 return additions.length?[...additions,...rows]:rows
}
function mergeNov18Watchlist(rows:Pick[]):Pick[]{
 const ids=new Set(rows.map(p=>p.id))
 const lines=new Set(rows.map(p=>[p.date,normalize(p.player),p.market,p.side,p.line].join('|')))
 const additions=NOV18_WATCHLIST.filter(p=>
  !ids.has(p.id)&&!lines.has([p.date,normalize(p.player),p.market,p.side,p.line].join('|'))
 ).map(p=>({...p} as Pick))
 return additions.length?[...additions,...rows]:rows
}
function load():Pick[]{
 try{
  const raw=localStorage.getItem(KEY)
  const data:unknown=raw?JSON.parse(raw):seed
  const current=Array.isArray(data)?data as Pick[]:seed
  let merged=current
  // Recover incomplete early imports once, but respect all future deletions.
  // This is a versioned, non-destructive one-time Nov 17 migration.
  if(localStorage.getItem(NOV17_REPAIR_KEY)!=='done'){
   merged=mergeNov17Watchlist(current)
   localStorage.setItem(NOV17_IMPORT_KEY,'done')
   localStorage.setItem(NOV17_REPAIR_KEY,'done')
  }
  // New-day watchlist import is one-time so deleted picks stay deleted.
  if(localStorage.getItem(NOV18_IMPORT_KEY)!=='done'){
   merged=mergeNov18Watchlist(merged)
   localStorage.setItem(NOV18_IMPORT_KEY,'done')
  }
  const graded=reconcileKnownResults(merged)
  if(graded!==current)localStorage.setItem(KEY,JSON.stringify(graded))
  return graded
 }catch{return seed}
}
// PrizePicks promotional lines remain recognizable in old browser journals,
// even when those records predate the explicit promo field.
const isTacoPick=(p:Pick):boolean=>p.promo==='taco'||(
 p.date==='2026-11-17'&&p.side==='More'&&(
  (normalize(p.player)==='scottiebarnes'&&p.market==='Points'&&p.line===15.5)||
  (normalize(p.player)==='lukadoncic'&&p.market==='PRA'&&p.line===43.5)
 ))
function TacoBadge(){
 return <span className="pl-taco-badge" title="PrizePicks Taco discounted line · November 17 Taco pair" aria-label="Taco pair promotional line">🌮 <span>TACO PAIR</span></span>
}
const nowDate=()=>localDate(new Date().toISOString())
function initialForm():Pick{return {id:'',date:nowDate(),gameTime:defaultTime,tipoffISO:'',gameId:'',playerId:'',teamId:'',rationale:'',correctionNotes:'',player:'',opponent:'',market:'Points',side:'More',line:0,platform:'PrizePicks',odds:null,projection:null,probability:null,status:'pending',actual:null,recommended:false,placed:false,stake:0,notes:'',createdAt:new Date().toISOString()}}
function App(){
 const [picks,setPicks]=useState<Pick[]>(load)
 const [screen,setScreen]=useState<'results'|'picks'|'analytics'>('results')
 const [selectedDay,setSelectedDay]=useState(()=>{const dates=load().filter(p=>p.date>='2026-11-16').map(p=>p.date).sort();return dates[dates.length-1]||'2026-11-16'})
 const [selectedPick,setSelectedPick]=useState<string|null>(null)
 const [editing,setEditing]=useState<Pick|null>(null)
 const [draft,setDraft]=useState<Pick>(initialForm())
 const [notice,setNotice]=useState('')
 const [insightFeed,setInsightFeed]=useState<InsightFeed|null>(null)
 const [insightState,setInsightState]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [schedule,setSchedule]=useState<ScheduleData|null>(null)
 const [roster,setRoster]=useState<RosterPlayer[]>([])
 const [scheduleState,setScheduleState]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [feedState,setFeedState]=useState<'loading'|'ready'|'offline'>('loading')
 const [lastResultsUpdate,setLastResultsUpdate]=useState<string|null>(null)
 const [refreshRequest,setRefreshRequest]=useState(0)
 const fileRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(picks))},[picks])
 useEffect(()=>{
  let active=true
  const load=async()=>{
   try{
    const res=await fetch(import.meta.env.BASE_URL+'insights.json?t='+Date.now(),{cache:'no-store'})
    if(!res.ok)throw Error('Archive unavailable')
    const body=await res.json() as InsightFeed
    if(body.schemaVersion!==1||!Array.isArray(body.games)||body.games.length===0)throw Error('Archive empty')
    if(active){setInsightFeed(body);setInsightState('ready')}
   }catch{if(active)setInsightState('unavailable')}
  }
  void load()
  const refresh=window.setInterval(()=>void load(),30*60*1000)
  return()=>{active=false;window.clearInterval(refresh)}
 },[])
 useEffect(()=>{
  let alive=true
  const fetchArchive=async()=>{
   // Always repair known missing final grades, even if the remote archive is
   // temporarily stale or a Safari tab was suspended during deployment.
   setPicks(old=>reconcileKnownResults(old))
   const dates=[...new Set(picks.filter(p=>p.status==='pending'||p.status==='watchlist').map(p=>p.date))]
   if(!dates.length){if(alive)setFeedState('ready');return}
   let hadResponse=false
   const archives=await Promise.all(dates.map(async date=>{
    try{
     const response=await fetch(import.meta.env.BASE_URL+'results/'+date+'.json?ts='+Date.now(),{cache:'no-store'})
     if(!response.ok)return null
     const body=await response.json() as ResultsData
     if(body.date!==date||!Array.isArray(body.games))return null
     hadResponse=true
     return body
    }catch{return null}
   }))
   if(!alive)return
   setLastResultsUpdate(new Date().toISOString())
   setFeedState(hadResponse?'ready':'offline')
   const games=archives.filter((a):a is ResultsData=>a!==null).flatMap(a=>a.games)
   if(!games.length)return
   setPicks(old=>old.map(p=>{
    // Never overwrite a manual grade, a void, or an already recorded final.
    if(p.actual!==null||p.status==='void'||p.status==='push'||p.status==='win'||p.status==='loss')return p
    let matches:FinalGame[]=p.gameId?games.filter(g=>g.id===p.gameId):games.filter(g=>g.date===p.date&&g.teams.some(t=>teamKey(t.abbreviation)===teamKey(p.opponent||'')))
    if(matches.length!==1||matches[0].date!==p.date)return p
    const game=matches[0]
    let players=p.playerId?game.players.filter(a=>a.id===p.playerId):game.players.filter(a=>normalize(a.name)===normalize(p.player))
    players=players.filter(a=>(!p.teamId||a.teamId===p.teamId)&&teamKey(a.team)!==teamKey(p.opponent||''))
    if(players.length!==1)return p
    const person=players[0]
    const actual=resultFor(p.market,person)
    if(actual===null)return p
    const status:Status=actual===p.line?'push':p.side==='More'?(actual>p.line?'win':'loss'):(actual<p.line?'win':'loss')
    return {...p,actual,status,autoGraded:true,resultSource:'ESPN game '+game.id,gameId:game.id,playerId:person.id,teamId:person.teamId||p.teamId}
   }))
  }
  void fetchArchive()
  const interval=window.setInterval(()=>void fetchArchive(),5*60*1000)
  const onFocus=()=>void fetchArchive()
  const onVisibility=()=>{if(document.visibilityState==='visible')void fetchArchive()}
  window.addEventListener('focus',onFocus)
  document.addEventListener('visibilitychange',onVisibility)
  return()=>{alive=false;window.clearInterval(interval);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility)}
 },[picks.map(p=>p.date+':'+p.status).join('|'),refreshRequest])
 useEffect(()=>{
  let alive=true
  const load=async()=>{
   try {
    const response=await fetch(import.meta.env.BASE_URL+'nba-players.json?ts='+Date.now(),{cache:'no-store'})
    if(!response.ok)return
    const data=await response.json() as {players:RosterPlayer[]}
    if(alive&&Array.isArray(data.players))setRoster(data.players)
   }catch{/* leave optional manual ID fallback */}
  }
  void load()
  return()=>{alive=false}
 },[])
 useEffect(()=>{
  if(!editing){setSchedule(null);return}
  let alive=true
  const load=async()=>{
   setSchedule(null);setScheduleState('loading')
   try{
    const response=await fetch(import.meta.env.BASE_URL+'schedule/'+draft.date+'.json?ts='+Date.now(),{cache:'no-store'})
    if(!response.ok)throw Error('Schedule not archived yet')
    const data=await response.json() as ScheduleData
    if(!Array.isArray(data.games))throw Error('Invalid schedule')
    if(alive){setSchedule(data);setScheduleState('ready')}
   }catch{if(alive)setScheduleState('unavailable')}
  }
  void load()
  return()=>{alive=false}
 },[editing?.id,draft.date])
 const exportData=()=>{const blob=new Blob([JSON.stringify({app:'PropLedger',version:1,exportedAt:new Date().toISOString(),picks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='propledger-backup-'+nowDate()+'.json';a.click();URL.revokeObjectURL(url)}
 const importData=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text());const arr=Array.isArray(parsed)?parsed:parsed.picks;if(!Array.isArray(arr)||!arr.every((p:unknown)=>typeof p==='object'&&p!==null&&'id'in p&&'player'in p&&'status'in p))throw new Error('Invalid backup');if(!window.confirm('Replace the entire current journal with this backup? Export your existing data first.'))return;setPicks(arr as Pick[]);setNotice('Backup restored successfully')}catch{setNotice('Could not import: invalid PropLedger backup')}finally{if(fileRef.current)fileRef.current.value=''}}
 const save=()=>{
  if(!draft.player.trim()||!draft.market.trim()||!draft.date||!Number.isFinite(draft.line)||draft.line<0){setNotice('Add a player, date and valid line.');return}
  if(editing?.lockedAt){
   setPicks(old=>old.map(p=>p.id===editing.id?{...p,correctionNotes:draft.correctionNotes||''}:p))
   setEditing(null);setNotice('Correction notes saved. Original prediction is unchanged.');return
  }
  const record={...draft,recommended:false,autoGraded:false,id:editing?.id||crypto.randomUUID(),createdAt:editing?.createdAt||new Date().toISOString()}
  setPicks(old=>editing?.id?old.map(p=>p.id===record.id?record:p):[record,...old]);setEditing(null);setSelectedDay(record.date>='2026-11-16'?record.date:'2026-11-16');setSelectedPick(record.id);setNotice('Draft entry saved')
 }
 const lock=(p:Pick)=>{
  if(!p.player||!p.gameId||!p.gameTime||!p.opponent||!validMarkets.includes(p.market)){setNotice('Select a scheduled game, opponent, player and supported market before finalizing.');return}
  if(!p.rationale||p.rationale.trim().length<30){setNotice('Every final pick needs a detailed WHY THIS PICK explanation before it can be locked.');return}
  const kickoff=p.tipoffISO?new Date(p.tipoffISO):null
  if(!kickoff||!Number.isFinite(kickoff.getTime())||Date.now()>=kickoff.getTime()){setNotice('Cannot finalize: an official future tipoff is required.');return}
  setPicks(old=>old.map(row=>row.id===p.id?{...row,recommended:true,status:'pending',lockedAt:new Date().toISOString()}:row))
  setNotice('Finalized and locked. Original prediction fields can no longer be edited.')
 }
 const start=(p?:Pick)=>{setEditing(p||initialForm());setDraft(p?{...p}:initialForm())}
 const update=(key:keyof Pick,value:unknown)=>setDraft(p=>({...p,[key]:value}))
 const closeNotice=()=>setNotice('')
 const validPicks=picks.filter(p=>p.date>='2026-11-16')
 const completePicks=validPicks.filter(p=>p.status==='win'||p.status==='loss')
 const lockedCompletePicks=completePicks.filter(p=>Boolean(p.lockedAt))
 const resultsByDay=(date:string)=>validPicks.filter(p=>p.date===date)
 const gradeByDay=(date:string)=>validPicks.filter(p=>p.date===date&&(p.status==='win'||p.status==='loss'))
 const daily=resultsByDay(selectedDay)
 const dayGraded=gradeByDay(selectedDay)
 const dayVoids=daily.filter(p=>p.status==='void')
 const dayResults=[...dayGraded,...dayVoids]
 const dayWins=dayGraded.filter(p=>p.status==='win').length
 const dayLosses=dayGraded.filter(p=>p.status==='loss').length
 const selectedMonth=selectedDay.slice(0,7)
 const monthPicks=validPicks.filter(p=>p.date.startsWith(selectedMonth))
 const monthGraded=validPicks.filter(p=>p.date.startsWith(selectedMonth)&&(p.status==='win'||p.status==='loss'))
 const monthWins=monthGraded.filter(p=>p.status==='win').length
 const monthVoids=monthPicks.filter(p=>p.status==='void').length
 const lastDays=[...new Set(completePicks.map(p=>p.date))].sort().reverse().slice(0,10)
 const visiblePick=validPicks.find(p=>p.id===selectedPick&&p.date===selectedDay)||validPicks.find(p=>p.date===selectedDay)||null
 const dayLabel=(day:string)=>new Date(day+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
 const monthLabel=new Date(selectedMonth+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})
 const monthChange=(difference:number)=>{
  const [year,month]=selectedMonth.split('-').map(Number)
  const next=new Date(year,month-1+difference,16)
  const date=String(next.getFullYear())+'-'+String(next.getMonth()+1).padStart(2,'0')+'-16'
  if(date>='2026-11-16')setSelectedDay(date)
 }
 const startBoundary=new Date(2026,10,16)
 const [calYear,calMonth]=selectedMonth.split('-').map(Number)
 const calendarLead=new Date(calYear,calMonth-1,1).getDay()
 const calendarLength=new Date(calYear,calMonth,0).getDate()
 const calendarCells=Array.from({length:Math.ceil((calendarLead+calendarLength)/7)*7},(_,i)=>{
  const day=i-calendarLead+1
  return day>=1&&day<=calendarLength?String(calYear)+'-'+String(calMonth).padStart(2,'0')+'-'+String(day).padStart(2,'0'):null
 })
 const marketBreakdown=markets.map(m=>{const rows=completePicks.filter(p=>p.market===m);return {market:m,picks:rows.length,wins:rows.filter(p=>p.status==='win').length,losses:rows.filter(p=>p.status==='loss').length}}).filter(m=>m.picks)
 const hit=(wins:number,count:number)=>count?Math.round(100*wins/count)+'%':'—'
 const resultTone=(wins:number,count:number)=>count===0?'muted':wins/count>=.6?'good':wins/count>=.4?'mid':'bad'
 // Projection color reflects the pick direction, not the final game outcome.
 // Favorable Overs are green, favorable Unders are red, and projections
 // that do not support the selected side remain neutral.
 const projectionTone=(p:Pick,value:number|null):string=>
  value===null?'pl-neutral':p.side==='More'?(value>p.line?'pl-green':'pl-neutral'):(value<p.line?'pl-under-projection':'pl-neutral')
 const datePicks=validPicks.filter(p=>p.date===selectedDay)
 const displayList=screen==='picks'?datePicks:daily
 const activeMonthDays=[...new Set(completePicks.map(p=>p.date))].sort()
 const historyPts=activeMonthDays.slice(-12).map((date,i)=>{const upto=completePicks.filter(p=>p.date<=date);return {date,rate:upto.length?100*upto.filter(p=>p.status==='win').length/upto.length:0,index:i}})
 const chartPoints=historyPts.map((p,i)=>String(35+i*(historyPts.length>1?550/(historyPts.length-1):0))+','+String(205-p.rate*1.75)).join(' ')
 return <div className="pl-shell">
  <header className="pl-top">
   <div className="pl-logo"><span className="pl-logo-bars"><i/><i/><i/></span><span>Prop<span>Ledger</span></span></div>
   <div className="pl-divider"/>
   <div className="pl-section-name">{screen==='results'?'Daily Results Calendar':screen==='picks'?'Picks':'Analytics'}</div>
   <nav className="pl-nav" aria-label="Main navigation">
    <button className={screen==='results'?'active':''} onClick={()=>setScreen('results')}><CalendarDays size={18}/> Results</button>
    <button className={screen==='picks'?'active':''} onClick={()=>setScreen('picks')}><Target size={18}/> Picks</button>
    <button className={screen==='analytics'?'active':''} onClick={()=>setScreen('analytics')}><BarChart3 size={18}/> Analytics</button>
   </nav>
  </header>
  <main className="pl-main">
   <div className="pl-subtitle"><span className="pl-ball">◎</span> NBA Prop Tracking <b>•</b> {screen==='results'?'Completed Picks & Daily Hit Rates':screen==='picks'?'Saved Picks, Locked Picks & Research':'Performance, Trends & Market Analytics'}</div>
   {notice&&<div className="pl-notice" role="status">{notice}<button onClick={closeNotice} aria-label="Dismiss notice"><X size={16}/></button></div>}
   {screen==='results'&&<div className="pl-results-layout">
    <section className="pl-panel">
     <div className="pl-results-sync"><button type="button" className="pl-add-btn" onClick={()=>{setPicks(old=>reconcileKnownResults(old));setRefreshRequest(n=>n+1);setNotice('Results refresh requested. Saved picks are preserved.')}}><RefreshCw size={15}/> Refresh Results</button><span>Verified finals sync to this calendar</span></div>
     <div className="pl-month-head">
      <button className="pl-square" disabled={selectedMonth==='2026-11'} onClick={()=>monthChange(-1)} aria-label="Previous month"><ChevronLeft size={22}/></button>
      <h2>{monthLabel}</h2>
      <button className="pl-square" onClick={()=>monthChange(1)} aria-label="Next month"><ChevronRight size={22}/></button>
     </div>
     <div className="pl-calendar" role="grid" aria-label={monthLabel+' pick results'}>
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><div className="pl-weekday" key={x}>{x}</div>)}
      {calendarCells.map((date,i)=>{
       if(!date||new Date(date+'T12:00:00')<startBoundary)return <div className="pl-day is-empty" key={'empty-'+i}>{date?<span>{Number(date.slice(-2))}</span>:null}</div>
       const rows=gradeByDay(date)
       const wins=rows.filter(p=>p.status==='win').length
       const pending=resultsByDay(date).filter(p=>p.status==='pending'||p.status==='watchlist').length
       const tone=resultTone(wins,rows.length)
       return <button key={date} className={'pl-day '+(date===selectedDay?'is-selected ':'')+tone} onClick={()=>setSelectedDay(date)} aria-label={date+' '+wins+' of '+rows.length+' graded picks won'}>
        <span className="pl-day-number">{Number(date.slice(-2))}</span>
        {rows.length>0?<span className="pl-day-record">{wins}/{rows.length}<small>({hit(wins,rows.length)})</small></span>:pending>0?<span className="pl-day-pending">{pending} ungraded</span>:<span className="pl-day-dash">—</span>}
       </button>
      })}
     </div>
     <p className="pl-panel-note">Tracking begins November 16, 2026. This calendar includes verified watchlist outcomes; official model performance in Analytics counts only pregame-locked predictions.</p>
    </section>
    <div className="pl-stack">
     <section className="pl-panel">
      <h2 className="pl-panel-heading">Completed Picks — {dayLabel(selectedDay)}</h2>
      <div className="pl-feature-strip pl-feature-three"><div><span>Tracked Results</span><strong>{dayGraded.length}</strong></div><div><span>Hit Rate</span><strong className="pl-green">{hit(dayWins,dayGraded.length)}</strong></div><div><span>Record</span><strong>{dayGraded.length?dayWins+' – '+dayLosses:'—'}</strong></div></div>
      <div className="pl-table-wrap"><table className="pl-table"><thead><tr><th>Player</th><th>Market</th><th>Pick</th><th>Actual</th><th>Result</th></tr></thead><tbody>
       {dayResults.length===0?<tr><td colSpan={5} className="pl-empty-row">No tracked picks have a verified result for this date.</td></tr>:dayResults.map(p=><tr key={p.id}><td className="pl-player-cell"><div className="pl-player-with-promo"><strong>{p.player}</strong>{isTacoPick(p)&&<TacoBadge/>}</div><small>vs {p.opponent}{!p.lockedAt?" · Watchlist":""}</small></td><td>{p.market}</td><td>{p.side==='More'?'O':'U'} {p.line}</td><td>{p.status==='void'?'DNP':p.actual??'—'}</td><td><span className={'pl-result-pill '+(p.status==='win'?'pl-win':p.status==='void'?'pl-void':'pl-loss')}>{p.status==='win'?'HIT / WIN':p.status==='void'?'VOID':'MISS / LOSS'}</span></td></tr>)}
      </tbody></table></div>
      {daily.some(p=>!p.lockedAt)&&<div className="pl-watchlist-caption">Unverified watchlist picks are included in these daily tracked results but excluded from official locked-model accuracy.</div>}
     </section>
     <section className="pl-panel">
      <h2 className="pl-panel-heading">Monthly Summary — {monthLabel}</h2>
      <div className="pl-summary-four"><div><span>Tracked Results</span><strong>{monthGraded.length}</strong></div><div><span>Wins</span><strong className="pl-green">{monthWins}</strong></div><div><span>Losses</span><strong className="pl-red">{monthGraded.length-monthWins}</strong></div><div className="pl-highlight"><span>Hit Rate</span><strong className="pl-green">{hit(monthWins,monthGraded.length)}</strong></div></div>
      <div className="pl-month-foot">{monthVoids} voided · {monthPicks.length-monthGraded.length-monthVoids} pending or pushed. Voids excluded from hit rate.</div>
     </section>
    </div>
   </div>}
   {screen==='picks'&&<div className="pl-picks-layout">
    <section className="pl-panel">
     <div className="pl-panel-title-row"><h2 className="pl-panel-heading">My Picks — {dayLabel(selectedDay)}</h2><button className="pl-add-btn" onClick={()=>start()}><Plus size={16}/> Add Pick</button></div>
     <div className="pl-date-controls"><button className="pl-square" onClick={()=>{const d=new Date(selectedDay+'T12:00:00');d.setDate(d.getDate()-1);const v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(v>='2026-11-16')setSelectedDay(v)}} disabled={selectedDay==='2026-11-16'} aria-label="Previous day"><ChevronLeft size={18}/></button><input aria-label="Pick date" type="date" min="2026-11-16" value={selectedDay} onChange={e=>setSelectedDay(e.target.value)}/><button className="pl-square" onClick={()=>{const d=new Date(selectedDay+'T12:00:00');d.setDate(d.getDate()+1);setSelectedDay(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))}} aria-label="Next day"><ChevronRight size={18}/></button></div>
     <div className="pl-table-wrap"><table className="pl-table pl-pick-table"><thead><tr><th>Player</th><th>Matchup</th><th>Market</th><th>Pick</th><th>Projection</th></tr></thead><tbody>
      {displayList.length===0?<tr><td colSpan={5} className="pl-empty-row">No picks on this date. Add a pick to start tracking.</td></tr>:displayList.map(p=>{
       const projection=p.projection??historicalBaseline(p,insightFeed)
       return <tr className={'pl-pick-row '+(visiblePick?.id===p.id?'is-current':'')} key={p.id} onClick={()=>setSelectedPick(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedPick(p.id)}}} tabIndex={0} aria-selected={visiblePick?.id===p.id}><td className="pl-player-cell"><div className="pl-player-with-promo"><strong>{p.player}</strong>{isTacoPick(p)&&<TacoBadge/>}</div></td><td>vs {p.opponent}<small>{displayTime(p.gameTime)} ET</small></td><td>{p.market}</td><td>{p.side==='More'?'O':'U'} {p.line}</td><td className={projectionTone(p,projection)+" pl-projection-cell"}>{projection===null?'—':projection.toFixed(1)}{p.projection===null&&projection!==null?<small>AUTO BASELINE</small>:null}</td></tr>
      })}
     </tbody></table></div>
     <p className="pl-panel-note">Select a row to inspect the saved prediction and its research. Watchlist entries are not counted as locked model picks.</p>
    </section>
    <section className="pl-panel pl-pick-details">
     <h2 className="pl-panel-heading">Pick Details</h2>
     {!visiblePick?<div className="pl-empty-details"><Target size={45}/>Select a pick to view research, trends and matchup statistics.</div>:<>
      <div className="pl-details-head"><div><h3 className="pl-details-player-name">{visiblePick.player}{isTacoPick(visiblePick)&&<TacoBadge/>}</h3><p>{visiblePick.market} · vs {visiblePick.opponent} · {dayLabel(visiblePick.date)}</p></div><div className="pl-details-actions">{!visiblePick.lockedAt&&visiblePick.status!=='win'&&visiblePick.status!=='loss'&&<button className="pl-add-btn" onClick={()=>lock(visiblePick)}>Lock Pick</button>}<button className="pl-square pl-edit" onClick={()=>start(visiblePick)}>{visiblePick.lockedAt?'Notes':'Edit'}</button></div></div>
      <div className="pl-feature-strip pl-feature-four"><div><span>Line</span><strong>{visiblePick.line}</strong></div><div><span>Projection</span><strong className={projectionTone(visiblePick,visiblePick.projection??historicalBaseline(visiblePick,insightFeed))}>{(visiblePick.projection??historicalBaseline(visiblePick,insightFeed))?.toFixed(1)??'—'}</strong></div><div><span>Edge</span><strong className="pl-green">{visiblePick.projection!==null?(visiblePick.side==='More'?visiblePick.projection-visiblePick.line:visiblePick.line-visiblePick.projection).toFixed(1):'—'}</strong></div><div><span>Result</span><strong className={visiblePick.status==='win'?'pl-green':visiblePick.status==='loss'?'pl-red':''}>{visiblePick.status==='win'?'WIN':visiblePick.status==='loss'?'LOSS':visiblePick.status==='void'?'VOID':visiblePick.lockedAt?'LOCKED':'DRAFT'}</strong></div></div>
      <PickInsights key={visiblePick.id} pick={visiblePick} data={insightFeed} state={insightState}/>
      {visiblePick.correctionNotes&&<div className="pl-correction">Postgame notes: {visiblePick.correctionNotes}</div>}
     </>}
    </section>
   </div>}
   {screen==='analytics'&&<div className="pl-analytics-layout">
    <div className="pl-analytics-left">
     <section className="pl-panel"><h2 className="pl-panel-heading">Overall Tracked Performance</h2><div className="pl-summary-four"><div><span>Graded Picks</span><strong>{completePicks.length}</strong></div><div><span>Wins</span><strong className="pl-green">{completePicks.filter(p=>p.status==='win').length}</strong></div><div><span>Losses</span><strong className="pl-red">{completePicks.filter(p=>p.status==='loss').length}</strong></div><div className="pl-highlight"><span>Hit Rate</span><strong className="pl-green">{hit(completePicks.filter(p=>p.status==='win').length,completePicks.length)}</strong></div></div></section>
     <section className="pl-panel"><h2 className="pl-panel-heading">Performance Trend</h2>{historyPts.length>0?<div className="pl-chart-scroll"><svg viewBox="0 0 620 230" aria-label="Cumulative model hit rate by date" role="img"><g stroke="#314149" strokeWidth="1">{[0,25,50,75,100].map(n=><g key={n}><line x1="35" x2="600" y1={205-n*1.75} y2={205-n*1.75}/><text x="4" y={209-n*1.75} fill="#91a1a7" fontSize="10">{n}%</text></g>)}</g><polyline points={chartPoints} fill="none" stroke="#a9f33e" strokeWidth="3"/>{historyPts.map((p,i)=><circle key={p.date} cx={35+i*(historyPts.length>1?550/(historyPts.length-1):0)} cy={205-p.rate*1.75} r="4" fill="#b6ff44"><title>{p.date}: {p.rate.toFixed(1)}%</title></circle>)}</svg><div className="pl-chart-labels"><span>{historyPts[0]?.date}</span><span>{historyPts[historyPts.length-1]?.date}</span></div></div>:<div className="pl-empty-row">Performance trends appear when finalized model picks have verified results.</div>}</section>
    </div>
    <section className="pl-panel pl-market-panel"><h2 className="pl-panel-heading">Market Performance</h2><div className="pl-table-wrap"><table className="pl-table"><thead><tr><th>Market</th><th>Picks</th><th>Wins</th><th>Losses</th><th>Hit Rate</th></tr></thead><tbody>{marketBreakdown.length===0?<tr><td colSpan={5} className="pl-empty-row">No finalized model picks graded yet.</td></tr>:marketBreakdown.map(m=><tr key={m.market}><td>{m.market}</td><td>{m.picks}</td><td>{m.wins}</td><td>{m.losses}</td><td className="pl-green">{hit(m.wins,m.picks)}</td></tr>)}</tbody></table></div></section>
    <section className="pl-panel"><h2 className="pl-panel-heading">Recent Results</h2><div className="pl-table-wrap"><table className="pl-table"><thead><tr><th>Date</th><th>Picks</th><th>Wins</th><th>Losses</th><th>Hit Rate</th></tr></thead><tbody>{lastDays.length===0?<tr><td colSpan={5} className="pl-empty-row">No graded results from November 16 onward.</td></tr>:lastDays.map(d=>{const all=gradeByDay(d),w=all.filter(p=>p.status==='win').length;return <tr key={d}><td>{dayLabel(d)}</td><td>{all.length}</td><td>{w}</td><td>{all.length-w}</td><td className="pl-green">{hit(w,all.length)}</td></tr>})}</tbody></table></div></section>
    <section className="pl-panel"><h2 className="pl-panel-heading">Key Takeaways</h2><div className="pl-takeaways">{completePicks.length>0?<><p><Check size={16}/> {hit(completePicks.filter(p=>p.status==='win').length,completePicks.length)} hit rate across {completePicks.length} graded tracked picks, including watchlists.</p><p><Check size={16}/> {marketBreakdown.length?marketBreakdown.slice().sort((a,b)=>b.wins/b.picks-a.wins/a.picks)[0]?.market+' has the highest recorded hit rate among your tracked markets.':'Market insights will appear with graded data.'}</p><p><Check size={16}/> {validPicks.filter(p=>p.autoGraded).length} tracked picks were automatically graded from archived box scores.</p></>:<p><Activity size={18}/> Your analytics will populate after finalized predictions receive verified game results.</p>}</div><div className="pl-locked-audit">Official locked-model results: {lockedCompletePicks.filter(p=>p.status==='win').length}/{lockedCompletePicks.length} ({hit(lockedCompletePicks.filter(p=>p.status==='win').length,lockedCompletePicks.length)}). Unlocked watchlist outcomes remain research-only.</div><div className="pl-data-tools"><button className="pl-square" onClick={exportData}><Download size={15}/> Export JSON</button><button className="pl-square" onClick={()=>fileRef.current?.click()}><FileUp size={15}/> Import JSON</button></div><CloudBackup picks={picks} onRestore={records=>{setPicks(records);setNotice('Cloud journal restored.')}}/></section>
   </div>}
   <footer className="pl-footer"><span className="pl-feed-dot"/> {feedState==='offline'?'NBA archive unavailable':feedState==='loading'?'Checking NBA results…':'NBA automatic grading enabled'} · {lastResultsUpdate?'Last checked '+new Date(lastResultsUpdate).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Waiting for first result check'} · Real pick records only</footer>
  </main>
  <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>importData(e.target.files?.[0])}/>
  {editing&&<div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Edit prop"><div className="modal-head"><div><div className="eyebrow">JOURNAL ENTRY</div><h2>{editing.id?'Edit prop':'New prop'}</h2></div><button className="iconbtn" onClick={()=>setEditing(null)}><X size={20}/></button></div><div className="form-grid">{draft.lockedAt&&<div className="locked-alert">This prediction is locked. Only postgame correction notes can be updated. Original values below are read-only.</div>}<fieldset className="locked-fields" disabled={!!draft.lockedAt}>
   <label>Player from team roster<select disabled={!!draft.lockedAt||!draft.opponent||!draft.gameId} value={draft.playerId||''} onChange={e=>{
    const player=roster.find(p=>p.id===e.target.value)
    if(player)setDraft(old=>({...old,playerId:player.id,player:player.name,teamId:player.teamId}))
    else setDraft(old=>({...old,playerId:'',teamId:''}))
   }}><option value="">Select player from roster (recommended)</option>{roster.filter(p=>{const game=schedule?.games.find(g=>g.id===draft.gameId);const team=game?.teams.find(t=>t.abbreviation!==draft.opponent);return Boolean(team&&p.teamId===team.id)}).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
   <label>Player full name<input value={draft.player} onChange={e=>setDraft(old=>({...old,player:e.target.value,playerId:'',teamId:''}))} placeholder="Fallback if roster unavailable"/></label>
   <label>Player ESPN ID<input value={draft.playerId||''} onChange={e=>update('playerId',e.target.value)} placeholder="Optional when typed manually"/></label>
   <label>Game date (ET)<input type="date" value={draft.date} onChange={e=>update('date',e.target.value)}/></label>
   <label>Game from NBA schedule ({draft.date})<select value={draft.gameId||''} disabled={!!draft.lockedAt} onChange={e=>{
    const game=schedule?.games.find(g=>g.id===e.target.value)
    setDraft(old=>({...old,gameId:game?.id||'',gameTime:game?formatET(game.tipoff):'',tipoffISO:game?.tipoff||'',opponent:'',playerId:'',teamId:''}))
   }}><option value="">{scheduleState==='loading'?'Loading schedule…':scheduleState==='unavailable'?'Schedule unavailable — check feed':'Select scheduled NBA game'}</option>{schedule?.games.map(g=><option key={g.id} value={g.id}>{g.teams.map(t=>t.abbreviation).join(' vs ')} · {formatET(g.tipoff)} ET</option>)}</select></label>
   <label>Tipoff time (ET; from schedule)<input type="time" value={draft.gameTime||''} readOnly placeholder="Select a game"/></label>
   <label>Opponent<select value={draft.opponent} disabled={!!draft.lockedAt||!draft.gameId} onChange={e=>setDraft(old=>({...old,opponent:e.target.value,playerId:'',teamId:''}))}><option value="">Select opponent</option>{schedule?.games.find(g=>g.id===draft.gameId)?.teams.map(t=><option key={t.id} value={t.abbreviation}>{t.abbreviation}</option>)}</select></label>
   <label>Market<select value={draft.market} onChange={e=>update('market',e.target.value)}>{markets.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Selection<select value={draft.side} onChange={e=>update('side',e.target.value)}><option>More</option><option>Less</option></select></label>
   <label>Line<input type="number" step="0.5" value={draft.line} onChange={e=>update('line',Number(e.target.value))}/></label>
   <label>Sportsbook / source<input value={draft.platform} onChange={e=>update('platform',e.target.value)}/></label>
   <label>Model projection<input type="number" step="0.1" placeholder="Optional" value={draft.projection??''} onChange={e=>update('projection',e.target.value===''?null:Number(e.target.value))}/></label>
   <label>Model hit probability (%)<input type="number" min="0" max="100" placeholder="Optional" value={draft.probability??''} onChange={e=>update('probability',e.target.value===''?null:Math.min(100,Math.max(0,Number(e.target.value))))}/></label>
   <label>Status<select value={draft.status} onChange={e=>update('status',e.target.value)}>{(['watchlist','pending','win','loss','push','void'] as Status[]).map(s=><option value={s} key={s}>{s}</option>)}</select></label>
   <label>Actual result<input type="number" step="0.1" placeholder="Not yet known" value={draft.actual??''} onChange={e=>update('actual',e.target.value===''?null:Number(e.target.value))}/></label>
   <div className="locked-hint">Save this draft, then click LOCK in the journal before tipoff to finalize it for model scoring.</div>
   <label className="full">Why I like this pick<textarea rows={4} value={draft.rationale||''} onChange={e=>update('rationale',e.target.value)} placeholder="Role, injuries, minutes, matchup, line value, and key risks..."/></label>
   <label className="full">Research notes<textarea rows={3} value={draft.notes} onChange={e=>update('notes',e.target.value)} placeholder="Reasoning, injury impact, risk factors..."/></label>
   </fieldset><label className="full">Postgame correction notes (separate from locked prediction)<textarea rows={3} value={draft.correctionNotes||''} onChange={e=>update('correctionNotes',e.target.value)} placeholder="Audit corrections; original forecast remains unchanged"/></label>
  </div><div className="modal-foot">{editing.id&&!editing.lockedAt&&<button className="delete" onClick={()=>{if(window.confirm('Delete this entry permanently?')){setPicks(old=>old.filter(p=>p.id!==editing.id));setEditing(null)}}}><Trash2 size={15}/> Delete</button>}<div className="grow"/><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={save}><Check size={16}/> {draft.lockedAt?'Save notes':'Save entry'}</button></div></div></div>}
 </div>
}
export default App
