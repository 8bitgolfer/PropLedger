import { Fragment } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Check, ChevronDown, ClipboardList, Download, FileUp, Filter, LayoutDashboard, Plus, Search, Target, Trash2, X } from 'lucide-react'

type Status = 'watchlist' | 'pending' | 'win' | 'loss' | 'push' | 'void'
type Side = 'More' | 'Less'
type Pick = { id: string; date: string; gameTime?: string; tipoffISO?: string; gameId?: string; playerId?: string; teamId?: string; rationale?: string; lockedAt?: string; correctionNotes?: string; autoGraded?: boolean; resultSource?: string; player: string; opponent: string; market: string; side: Side; line: number; platform: string; odds: number | null; projection: number | null; probability: number | null; status: Status; actual: number | null; recommended: boolean; placed?: boolean; stake?: number; notes: string; createdAt: string }
const KEY = 'propledger-v1'
type NBAPlayer = { id: string; name: string; team: string; teamId?: string; points: number; rebounds: number; assists: number; threes: number; steals: number | null; blocks: number | null; pra: number; pa: number; pr: number; ra: number }
type Team = { id: string; abbreviation: string; name: string }
type ScheduleGame = { id: string; date: string; tipoff: string; teams: Team[]; completed: boolean }
type ScheduleData = { date: string; games: ScheduleGame[] }
type FinalGame = ScheduleGame & { players: NBAPlayer[] }
type ResultsData = { date: string; games: FinalGame[] }
const formatET=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso))
const validMarkets=['Points','Rebounds','Assists','3PT Made','PRA','Points + Assists','Points + Rebounds','Rebounds + Assists','Steals','Blocks']
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')
const resultFor=(market:string,p:NBAPlayer):number|null=>{
 const values:Record<string,number>={'Points':p.points,'Rebounds':p.rebounds,'Assists':p.assists,'3PT Made':p.threes,'PRA':p.pra,'Points + Assists':p.pa,'Points + Rebounds':p.pr,'Rebounds + Assists':p.ra,'Steals':p.steals,'Blocks':p.blocks}
 return Number.isFinite(values[market])?values[market]:null
}
const localDate=(iso:string)=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso))
 const read=(type:string)=>parts.find(p=>p.type===type)?.value||''
 return read('year')+'-'+read('month')+'-'+read('day')
}
const defaultTime=''

const markets = ['Points','Rebounds','Assists','3PT Made','PRA','Points + Assists','Points + Rebounds','Rebounds + Assists','Steals','Blocks','Other']
const seed: Pick[] = [
 {id:'seed-zion',date:'2026-11-16',gameTime:'20:00',rationale:"Pelicans' missing offensive contributors could increase Zion's scoring opportunities. His rim pressure and free throws offer several paths to points. Risks: extra help defense, foul trouble and a lower free-throw rate. This is an unverified watchlist line, not a confirmed value bet.",player:'Zion Williamson',opponent:'GSW',market:'Points',side:'More',line:20.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Reported public research target. Line and availability not verified on PrizePicks or Hard Rock.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-fears',date:'2026-11-16',gameTime:'20:00',rationale:"With a key ball-handler unavailable, Fears may have additional creation responsibility. Assists depend heavily on potential assists and teammate conversion. Risks: shared playmaking, defensive pressure and missed teammate shots. No independent probability was established.",player:'Jeremiah Fears',opponent:'GSW',market:'Assists',side:'More',line:5.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Reported public target, not a confirmed executable bet.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-kennard',date:'2026-11-16',gameTime:'21:00',rationale:"Potential spot-up opportunities and perimeter shooting make his points market worth reviewing. His minutes and shot volume remain critical, and cold three-point shooting is a major failure mode. This was never a verified final sportsbook selection.",player:'Luke Kennard',opponent:'DEN',market:'Points',side:'More',line:7.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Unverified watchlist target. Confirm team and line before upgrading.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-draymond',date:'2026-11-16',gameTime:'20:00',rationale:"This under is worth investigating if his offensive involvement and scoring attempts remain limited. His role can change with major Warriors absences, so a low line is not automatically good value. An independent distribution was not calculated.",player:'Draymond Green',opponent:'NOP',market:'Points',side:'Less',line:6.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Morning third-party market snapshot. Not a verified final recommendation.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-podz',date:'2026-11-16',gameTime:'20:00',rationale:"PRA combines scoring, rebounding and assists; shifting Golden State rotations can change all three. The under requires careful projected-minute and usage analysis, particularly with missing teammates. This was only a public-market watchlist threshold.",player:'Brandin Podziemski',opponent:'NOP',market:'PRA',side:'Less',line:28.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Unverified research target; check availability and lineup.',createdAt:'2026-11-16T19:40:00-05:00'}
]
function load(): Pick[] { try { const raw=localStorage.getItem(KEY); if(!raw)return seed; const data:unknown=JSON.parse(raw); return Array.isArray(data)?data as Pick[]:seed } catch { return seed } }
const nowDate=()=>localDate(new Date().toISOString())
function validResult(status:Status){return status==='win'||status==='loss'||status==='push'||status==='void'}
const pct=(n:number)=>Number.isFinite(n)?n.toFixed(1)+'%':'—'
function initialForm():Pick{return {id:'',date:nowDate(),gameTime:defaultTime,tipoffISO:'',gameId:'',playerId:'',teamId:'',rationale:'',correctionNotes:'',player:'',opponent:'',market:'Points',side:'More',line:0,platform:'PrizePicks',odds:null,projection:null,probability:null,status:'pending',actual:null,recommended:true,placed:false,stake:0,notes:'',createdAt:new Date().toISOString()}}
function Symbol({result}:{result:Status}){return <span className={'state '+result}>{result.toUpperCase()}</span>}
function App(){
 const [picks,setPicks]=useState<Pick[]>(load)
 const [screen,setScreen]=useState<'overview'|'journal'|'analytics'>('overview')
 const [query,setQuery]=useState('')
 const [filter,setFilter]=useState('all')
 const [editing,setEditing]=useState<Pick|null>(null)
 const [draft,setDraft]=useState<Pick>(initialForm())
 const [notice,setNotice]=useState('')
 const [schedule,setSchedule]=useState<ScheduleData|null>(null)
 const [scheduleState,setScheduleState]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [feedState,setFeedState]=useState<'loading'|'ready'|'offline'>('loading')
 const [lastResultsUpdate,setLastResultsUpdate]=useState<string|null>(null)
 const fileRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(picks))},[picks])
 useEffect(()=>{
  let alive=true
  const fetchArchive=async()=>{
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
    let matches:FinalGame[]=p.gameId?games.filter(g=>g.id===p.gameId):games.filter(g=>g.date===p.date&&g.teams.some(t=>normalize(t.abbreviation)===normalize(p.opponent||'')))
    if(matches.length!==1||matches[0].date!==p.date)return p
    const game=matches[0]
    let players=p.playerId?game.players.filter(a=>a.id===p.playerId):game.players.filter(a=>normalize(a.name)===normalize(p.player))
    players=players.filter(a=>!p.teamId||a.teamId===p.teamId)
    if(players.length!==1)return p
    const person=players[0]
    const actual=resultFor(p.market,person)
    if(actual===null)return p
    const status:Status=actual===p.line?'push':p.side==='More'?(actual>p.line?'win':'loss'):(actual<p.line?'win':'loss')
    return {...p,actual,status,autoGraded:true,resultSource:'ESPN game '+game.id,gameId:game.id,playerId:person.id,teamId:person.teamId||p.teamId}
   }))
  }
  void fetchArchive()
  const interval=window.setInterval(()=>void fetchArchive(),15*60*1000)
  return()=>{alive=false;window.clearInterval(interval)}
 },[picks.map(p=>p.date+':'+p.status).join('|')])
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
 const graded=picks.filter(p=>p.recommended&&(p.status==='win'||p.status==='loss'))
 const wins=graded.filter(p=>p.status==='win').length
 const pctAccuracy=graded.length?wins/graded.length*100:NaN
 const meanError=(()=>{const relevant=picks.filter(p=>p.projection!==null&&p.actual!==null&&validResult(p.status));return relevant.length?relevant.reduce((s,p)=>s+Math.abs(p.actual!-p.projection!),0)/relevant.length:null})()
 const filtered=useMemo(()=>picks.filter(p=>{const q=(p.player+' '+p.market+' '+p.opponent).toLowerCase().includes(query.toLowerCase());return q&&(filter==='all'||p.status===filter)}).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[picks,query,filter])
 const byMarket=markets.map(m=>{const rows=graded.filter(p=>p.market===m);return {market:m,count:rows.length,wins:rows.filter(p=>p.status==='win').length,rate:rows.length?rows.filter(p=>p.status==='win').length/rows.length*100:0}}).filter(r=>r.count>0)
 const exportData=()=>{const blob=new Blob([JSON.stringify({app:'PropLedger',version:1,exportedAt:new Date().toISOString(),picks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='propledger-backup-'+nowDate()+'.json';a.click();URL.revokeObjectURL(url)}
 const importData=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text());const arr=Array.isArray(parsed)?parsed:parsed.picks;if(!Array.isArray(arr)||!arr.every((p:unknown)=>typeof p==='object'&&p!==null&&'id'in p&&'player'in p&&'status'in p))throw new Error('Invalid backup');if(!window.confirm('Replace the entire current journal with this backup? Export your existing data first.'))return;setPicks(arr as Pick[]);setNotice('Backup restored successfully')}catch{setNotice('Could not import: invalid PropLedger backup')}finally{if(fileRef.current)fileRef.current.value=''}}
 const save=()=>{
  if(!draft.player.trim()||!draft.market.trim()||!draft.date||!Number.isFinite(draft.line)||draft.line<0){setNotice('Add a player, date and valid line.');return}
  if(editing?.lockedAt){
   setPicks(old=>old.map(p=>p.id===editing.id?{...p,correctionNotes:draft.correctionNotes||''}:p))
   setEditing(null);setNotice('Correction notes saved. Original prediction is unchanged.');return
  }
  const record={...draft,autoGraded:false,id:editing?.id||crypto.randomUUID(),createdAt:editing?.createdAt||new Date().toISOString()}
  setPicks(old=>editing?.id?old.map(p=>p.id===record.id?record:p):[record,...old]);setEditing(null);setNotice('Draft entry saved')
 }
 const lock=(p:Pick)=>{
  if(!p.player||!p.gameId||!p.gameTime||!p.opponent||!validMarkets.includes(p.market)){setNotice('Select a scheduled game, opponent, player and supported market before finalizing.');return}
  const kickoff=p.tipoffISO?new Date(p.tipoffISO):null
  if(!kickoff||!Number.isFinite(kickoff.getTime())||Date.now()>=kickoff.getTime()){setNotice('Cannot finalize: an official future tipoff is required.');return}
  setPicks(old=>old.map(row=>row.id===p.id?{...row,recommended:true,status:'pending',lockedAt:new Date().toISOString()}:row))
  setNotice('Finalized and locked. Original prediction fields can no longer be edited.')
 }
 const start=(p?:Pick)=>{setEditing(p||initialForm());setDraft(p?{...p}:initialForm())}
 const update=(key:keyof Pick,value:unknown)=>setDraft(p=>({...p,[key]:value}))
 const closeNotice=()=>setNotice('')
 return <div className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-symbol">P<span>.</span></div><div><strong>PROPLEDGER</strong><small>NBA PROP RESEARCH</small></div></div>
   <div className="nav-caption">WORKSPACE</div>
   <nav><button className={screen==='overview'?'selected':''} onClick={()=>setScreen('overview')}><LayoutDashboard size={17}/> Overview</button><button className={screen==='journal'?'selected':''} onClick={()=>setScreen('journal')}><ClipboardList size={17}/> Prop Journal <span className="nav-count">{picks.length}</span></button><button className={screen==='analytics'?'selected':''} onClick={()=>setScreen('analytics')}><BarChart3 size={17}/> Analytics</button></nav>
   <div className="side-bottom"><div className="statusdot"/> LOCAL DATA <span>v1.0</span><p>Data stays in this browser. Export backups regularly; no automatic sportsbook or score sync.</p></div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="breadcrumbs">WORKSPACE <span>/</span> {screen.toUpperCase()}</div><div className="top-actions"><span className="live-mark"><span/> {feedState==='loading'?'LOADING RESULTS':feedState==='offline'?'RESULTS NOT ARCHIVED':'AUTO RESULT ARCHIVE'}</span><button className="iconbtn" title="Export JSON" onClick={exportData}><Download size={17}/></button><button className="iconbtn" title="Import JSON" onClick={()=>fileRef.current?.click()}><FileUp size={17}/></button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>importData(e.target.files?.[0])}/></div></header>
   <div className="page">
    <div className="heading"><div><div className="eyebrow">NBA / QUANTITATIVE TRACKING</div><h1>{screen==='overview'?'Performance overview':screen==='journal'?'Prop journal':'Model analytics'}<span className="h1-dot">.</span></h1><p>{screen==='overview'?'Every NBA prop, why it was picked, and how it performed.':screen==='journal'?'All entries, including unverified watchlist targets.':'Which kinds of forecasts have actually performed best?'}</p></div><button className="primary" onClick={()=>start()}><Plus size={16}/> Add prop</button></div>
    {notice&&<div className="notice"><span>{notice}</span><button onClick={closeNotice}><X size={14}/></button></div>}
    {screen==='overview'&&<>
      <div className="metrics">
       <div className="metric"><div className="metric-label">MODEL HIT RATE <Target size={15}/></div><strong>{pct(pctAccuracy)}</strong><span>{wins} wins · {graded.length-wins} losses · {graded.length} graded recommendations</span></div>
       <div className="metric"><div className="metric-label">PICKS GRADED <Check size={15}/></div><strong>{picks.filter(p=>validResult(p.status)).length}</strong><span>Includes watchlist targets and finalized picks</span></div>
       <div className="metric"><div className="metric-label">AUTO-GRADED <Activity size={15}/></div><strong>{picks.filter(p=>p.autoGraded).length}</strong><span>{feedState==='offline'?'Score feed currently unavailable':'Completed games sourced from NBA box scores'}</span></div>
       <div className="metric"><div className="metric-label">MEAN ABSOLUTE ERROR <BarChart3 size={15}/></div><strong>{meanError===null?'—':meanError.toFixed(2)}</strong><span>Based on saved projections and final results</span></div>
      </div>
      <div className="feed-notice">NBA SCORE FEED: {feedState==='offline'?'UNAVAILABLE — existing results preserved':lastResultsUpdate?'CHECKED '+new Date(lastResultsUpdate).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'WAITING FOR FIRST ARCHIVE REFRESH'} · Unmatched picks stay pending.</div>
      <div className="section-title"><div><span className="section-index">01</span><h2>Current journal</h2></div><button className="ghost" onClick={()=>setScreen('journal')}>View all entries <ArrowUpRight size={15}/></button></div>
      <Journal rows={filtered.slice(0,8)} onEdit={start} onLock={lock}/>
      <div className="split-panels">
       <div className="info-panel"><div className="panel-title"><BarChart3 size={16}/> PERFORMANCE RULES</div><h3>Review the reasoning.</h3><p>Each pick has a collapsible rationale explaining the analysis behind it. Original predictions stay separate from watchlist ideas. Completed NBA games are checked automatically when the score feed refreshes.</p><div className="rule"><Check size={15}/> Final recommendations and watchlists tracked separately</div><div className="rule"><Check size={15}/> Automatic box-score results and data backups</div></div>
       <div className="info-panel dark-panel"><div className="panel-title"><Filter size={16}/> RESULTS COVERAGE</div><div className="coverage"><strong>{picks.filter(p=>p.status==='watchlist').length}</strong><span>Unverified watchlist targets</span></div><div className="coverage"><strong>{picks.filter(p=>p.status==='pending').length}</strong><span>Waiting for completed game</span></div><div className="coverage"><strong>{picks.filter(p=>validResult(p.status)).length}</strong><span>Final results</span></div></div>
      </div>
    </>}
    {screen==='journal'&&<>
      <div className="toolbar"><label className="search"><Search size={16}/><input placeholder="Search player, opponent or market" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="select-wrap"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{(['watchlist','pending','win','loss','push','void'] as Status[]).map(s=><option value={s} key={s}>{s}</option>)}</select><ChevronDown size={14}/></div><span className="rowcount">{filtered.length} ENTRIES</span></div>
      <Journal rows={filtered} onEdit={start} onLock={lock}/>
      <p className="footnote">Final NBA box scores are matched automatically by game date, player and opponent. If a game or player cannot be matched safely, the entry remains pending. You can still correct exceptions manually.</p>
    </>}
    {screen==='analytics'&&<>
      <div className="analytics-grid"><div className="info-panel"><div className="panel-title">BY STAT CATEGORY</div>{byMarket.length===0?<div className="empty">No graded model recommendations yet. Grade some picks to see category accuracy.</div>:byMarket.map(r=><div className="bar-row" key={r.market}><div><span>{r.market}</span><small>{r.wins}/{r.count} wins</small></div><div className="bar-track"><div style={{width:r.rate+'%'}}/></div><b>{pct(r.rate)}</b></div>)}</div><div className="info-panel"><div className="panel-title">EVALUATION CHECKLIST</div><h3>What to measure next</h3><p>Accuracy measures how often recommendations beat their original lines. To improve the model, record the original probability estimate and compare it against actual outcomes over a meaningful sample.</p><div className="rule"><Check size={15}/> Track recommendations before tipoff</div><div className="rule"><Check size={15}/> Separate watchlists from real picks</div><div className="rule"><Check size={15}/> Track projected outcomes against verified NBA results</div><div className="rule"><Check size={15}/> Evaluate accuracy over larger samples</div></div></div>
      <div className="section-title"><div><span className="section-index">02</span><h2>Audit snapshot</h2></div></div>
      <div className="audit-grid"><div>PROJECTED STAT ENTRIES <b>{picks.filter(p=>p.projection!==null).length}</b></div><div>PROBABILITY ESTIMATES <b>{picks.filter(p=>p.probability!==null).length}</b></div><div>AUTO-GRADED RESULTS <b>{picks.filter(p=>p.autoGraded).length}</b></div><div>RECOMMENDATIONS GRADED <b>{graded.length}</b></div></div>
    </>}
    <footer>PROPLEDGER <span>© 2026 · RESEARCH JOURNAL · NOT LIVE BETTING DATA</span></footer>
   </div>
  </main>
  {editing&&<div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Edit prop"><div className="modal-head"><div><div className="eyebrow">JOURNAL ENTRY</div><h2>{editing.id?'Edit prop':'New prop'}</h2></div><button className="iconbtn" onClick={()=>setEditing(null)}><X size={20}/></button></div><div className="form-grid">{draft.lockedAt&&<div className="locked-alert">This prediction is locked. Only postgame correction notes can be updated. Original values below are read-only.</div>}<fieldset className="locked-fields" disabled={!!draft.lockedAt}>
   <label>Player (exact NBA name)<input value={draft.player} onChange={e=>update('player',e.target.value)} placeholder="Player full name"/><small>Player ID is resolved from the matching final game unless a player ID is provided.</small></label>
   <label>Player ESPN ID (optional)<input value={draft.playerId||''} onChange={e=>update('playerId',e.target.value)} placeholder="Avoid name-matching ambiguity"/></label>
   <label>Game date (ET)<input type="date" value={draft.date} onChange={e=>update('date',e.target.value)}/></label>
   <label>Game from NBA schedule ({draft.date})<select value={draft.gameId||''} disabled={!!draft.lockedAt} onChange={e=>{
    const game=schedule?.games.find(g=>g.id===e.target.value)
    setDraft(old=>({...old,gameId:game?.id||'',playerId:'',teamId:'',gameTime:game?formatET(game.tipoff):'',tipoffISO:game?.tipoff||'',opponent:''}))
   }}><option value="">{scheduleState==='loading'?'Loading schedule…':scheduleState==='unavailable'?'Schedule unavailable — check feed':'Select scheduled NBA game'}</option>{schedule?.games.map(g=><option key={g.id} value={g.id}>{g.teams.map(t=>t.abbreviation).join(' vs ')} · {formatET(g.tipoff)} ET</option>)}</select></label>
   <label>Tipoff time (ET; from schedule)<input type="time" value={draft.gameTime||''} readOnly placeholder="Select a game"/></label>
   <label>Opponent<select value={draft.opponent} disabled={!!draft.lockedAt||!draft.gameId} onChange={e=>update('opponent',e.target.value)}><option value="">Select opponent</option>{schedule?.games.find(g=>g.id===draft.gameId)?.teams.map(t=><option key={t.id} value={t.abbreviation}>{t.abbreviation}</option>)}</select></label>
   <label>Market<select value={draft.market} onChange={e=>update('market',e.target.value)}>{markets.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Selection<select value={draft.side} onChange={e=>update('side',e.target.value)}><option>More</option><option>Less</option></select></label>
   <label>Line<input type="number" step="0.5" value={draft.line} onChange={e=>update('line',Number(e.target.value))}/></label>
   <label>Sportsbook / source<input value={draft.platform} onChange={e=>update('platform',e.target.value)}/></label>
   <label>Model projection<input type="number" step="0.1" placeholder="Optional" value={draft.projection??''} onChange={e=>update('projection',e.target.value===''?null:Number(e.target.value))}/></label>
   <label>Model hit probability (%)<input type="number" min="0" max="100" placeholder="Optional" value={draft.probability??''} onChange={e=>update('probability',e.target.value===''?null:Math.min(100,Math.max(0,Number(e.target.value))))}/></label>
   <label>Status<select value={draft.status} onChange={e=>update('status',e.target.value)}>{(['watchlist','pending','win','loss','push','void'] as Status[]).map(s=><option value={s} key={s}>{s}</option>)}</select></label>
   <label>Actual result<input type="number" step="0.1" placeholder="Not yet known" value={draft.actual??''} onChange={e=>update('actual',e.target.value===''?null:Number(e.target.value))}/></label>
   <label className="toggle-row"><input type="checkbox" checked={draft.recommended} onChange={e=>update('recommended',e.target.checked)}/> Final model recommendation (not watchlist)</label>
   <label className="full">Why I like this pick<textarea rows={4} value={draft.rationale||''} onChange={e=>update('rationale',e.target.value)} placeholder="Role, injuries, minutes, matchup, line value, and key risks..."/></label>
   <label className="full">Research notes<textarea rows={3} value={draft.notes} onChange={e=>update('notes',e.target.value)} placeholder="Reasoning, injury impact, risk factors..."/></label>
   </fieldset><label className="full">Postgame correction notes (separate from locked prediction)<textarea rows={3} value={draft.correctionNotes||''} onChange={e=>update('correctionNotes',e.target.value)} placeholder="Audit corrections; original forecast remains unchanged"/></label>
  </div><div className="modal-foot">{editing.id&&!editing.lockedAt&&<button className="delete" onClick={()=>{if(window.confirm('Delete this entry permanently?')){setPicks(old=>old.filter(p=>p.id!==editing.id));setEditing(null)}}}><Trash2 size={15}/> Delete</button>}<div className="grow"/><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={save}><Check size={16}/> {draft.lockedAt?'Save notes':'Save entry'}</button></div></div></div>}
 </div>
}
function Journal({rows,onEdit,onLock}:{rows:Pick[];onEdit:(p:Pick)=>void;onLock:(p:Pick)=>void}){
 return <div className="table-frame"><div className="table-scroll"><table><thead><tr><th>DATE / TIME / PLAYER</th><th>MARKET</th><th>SELECTION</th><th>SOURCE</th><th>PROJECTION</th><th>ACTUAL</th><th>RESULT</th><th>TYPE</th><th></th></tr></thead><tbody>{rows.length===0?<tr><td colSpan={9} className="empty">No entries match. Use Add prop to start tracking.</td></tr>:rows.map(p=><Fragment key={p.id}><tr><td><div className="player">{p.player}</div><div className="muted small">{p.date} · {p.gameTime||'Time unverified'} ET · vs {p.opponent||'—'}</div></td><td>{p.market}</td><td><span className={'pick-side '+(p.side==='More'?'over':'under')}>{p.side==='More'?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {p.side} {p.line}</span></td><td className="muted">{p.platform}</td><td className="mono">{p.projection??'—'}</td><td className="mono">{p.actual??'—'}</td><td><Symbol result={p.status}/>{p.autoGraded&&<div className="auto-caption">AUTO · ESPN</div>}</td><td><div className="flags">{p.recommended?<span>MODEL</span>:<span className="mutedflag">WATCH</span>}</div></td><td><div className="journal-actions">{!p.lockedAt&&p.status!=='win'&&p.status!=='loss'&&<button className="edit-btn lock-btn" onClick={()=>onLock(p)}>LOCK</button>}<button className="edit-btn" onClick={()=>onEdit(p)}>{p.lockedAt?'NOTES':'EDIT'}</button></div></td></tr><tr className="why-row"><td colSpan={9}><details className="rationale-row"><summary><span>+ WHY THIS PICK · {p.player}</span><span>RESEARCH BREAKDOWN <ChevronDown size={13}/></span></summary><div>{p.rationale||p.notes||'No detailed reasoning recorded. Add verified research under Edit → Why I like this pick.'}{p.lockedAt&&<p className="lock-label">Original prediction locked: {new Date(p.lockedAt).toLocaleString('en-US',{timeZone:'America/New_York'})} ET</p>}{p.correctionNotes&&<p className="correction-note">Postgame correction notes: {p.correctionNotes}</p>}</div></details></td></tr></Fragment>)}</tbody></table></div></div>
}
export default App
