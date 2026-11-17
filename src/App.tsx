import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Check, ChevronDown, ClipboardList, Download, FileUp, Filter, LayoutDashboard, Plus, Search, Target, Trash2, X } from 'lucide-react'

type Status = 'watchlist' | 'pending' | 'win' | 'loss' | 'push' | 'void'
type Side = 'More' | 'Less'
type Pick = { id: string; date: string; gameTime?: string; rationale?: string; autoGraded?: boolean; resultSource?: string; player: string; opponent: string; market: string; side: Side; line: number; platform: string; odds: number | null; projection: number | null; probability: number | null; status: Status; actual: number | null; recommended: boolean; placed?: boolean; stake?: number; notes: string; createdAt: string }
const KEY = 'propledger-v1'
type NBAPlayer = { id: string; name: string; team: string; points: number; rebounds: number; assists: number; threes: number; pra: number; pa: number; pr: number; ra: number }
type NBAGame = { id: string; date: string; teams: string[]; status: string; players: NBAPlayer[] }
type NBAFeed = {updatedAt: string | null; games: NBAGame[]}
const emptyFeed: NBAFeed = {updatedAt:null,games:[]}
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')
const resultFor=(market:string,p:NBAPlayer):number|null=>{
 const values:Record<string,number>={'Points':p.points,'Rebounds':p.rebounds,'Assists':p.assists,'3PT Made':p.threes,'PRA':p.pra,'Points + Assists':p.pa,'Points + Rebounds':p.pr,'Rebounds + Assists':p.ra}
 return Number.isFinite(values[market])?values[market]:null
}
const localDate=(iso:string)=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso))
 const read=(type:string)=>parts.find(p=>p.type===type)?.value||''
 return read('year')+'-'+read('month')+'-'+read('day')
}
const defaultTime='20:00'

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
function initialForm():Pick{return {id:'',date:nowDate(),gameTime:defaultTime,rationale:'',player:'',opponent:'',market:'Points',side:'More',line:0,platform:'PrizePicks',odds:null,projection:null,probability:null,status:'pending',actual:null,recommended:true,placed:false,stake:0,notes:'',createdAt:new Date().toISOString()}}
function Symbol({result}:{result:Status}){return <span className={'state '+result}>{result.toUpperCase()}</span>}
function App(){
 const [picks,setPicks]=useState<Pick[]>(load)
 const [screen,setScreen]=useState<'overview'|'journal'|'analytics'>('overview')
 const [query,setQuery]=useState('')
 const [filter,setFilter]=useState('all')
 const [editing,setEditing]=useState<Pick|null>(null)
 const [draft,setDraft]=useState<Pick>(initialForm())
 const [notice,setNotice]=useState('')
 const [feed,setFeed]=useState<NBAFeed>(emptyFeed)
 const [feedState,setFeedState]=useState<'loading'|'ready'|'offline'>('loading')
 const fileRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(picks))},[picks])
 useEffect(()=>{
  let alive=true
  const refresh=async()=>{
   try{
    const response=await fetch(import.meta.env.BASE_URL+'nba-results.json?ts='+Date.now(),{cache:'no-store'})
    if(!response.ok)throw new Error('Results unavailable')
    const body=await response.json() as NBAFeed
    if(!Array.isArray(body.games))throw new Error('Unexpected response')
    if(alive){setFeed(body);setFeedState('ready')}
   }catch{if(alive)setFeedState('offline')}
  }
  void refresh()
  const timer=window.setInterval(()=>void refresh(),15*60*1000)
  return()=>{alive=false;window.clearInterval(timer)}
 },[])
 useEffect(()=>{
  if(feed.games.length===0)return
  setPicks(old=>old.map(p=>{
   if(p.autoGraded||p.actual!==null||p.status==='void'||p.status==='push'||(p.status==='win'||p.status==='loss'))return p
   const matches=feed.games.filter(game=>{
    const gameDate=game.date
    return game.status==='final'&&gameDate===p.date&&game.teams.some(t=>normalize(t)===normalize(p.opponent||''))
   })
   const found=matches.flatMap(game=>game.players.filter(player=>normalize(player.name)===normalize(p.player)&&normalize(player.team)!==normalize(p.opponent||'')).map(player=>({player,game})))
   if(found.length!==1)return p
   const actual=resultFor(p.market,found[0].player)
   if(actual===null)return p
   const status:Status=actual===p.line?'push':p.side==='More'?(actual>p.line?'win':'loss'):(actual<p.line?'win':'loss')
   return {...p,actual,status,autoGraded:true,resultSource:'ESPN game '+found[0].game.id}
  }))
 },[feed])
 const graded=picks.filter(p=>p.recommended&&(p.status==='win'||p.status==='loss'))
 const wins=graded.filter(p=>p.status==='win').length
 const pctAccuracy=graded.length?wins/graded.length*100:NaN
 const meanError=(()=>{const relevant=picks.filter(p=>p.projection!==null&&p.actual!==null&&validResult(p.status));return relevant.length?relevant.reduce((s,p)=>s+Math.abs(p.actual!-p.projection!),0)/relevant.length:null})()
 const filtered=useMemo(()=>picks.filter(p=>{const q=(p.player+' '+p.market+' '+p.opponent).toLowerCase().includes(query.toLowerCase());return q&&(filter==='all'||p.status===filter)}).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[picks,query,filter])
 const byMarket=markets.map(m=>{const rows=graded.filter(p=>p.market===m);return {market:m,count:rows.length,wins:rows.filter(p=>p.status==='win').length,rate:rows.length?rows.filter(p=>p.status==='win').length/rows.length*100:0}}).filter(r=>r.count>0)
 const exportData=()=>{const blob=new Blob([JSON.stringify({app:'PropLedger',version:1,exportedAt:new Date().toISOString(),picks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='propledger-backup-'+nowDate()+'.json';a.click();URL.revokeObjectURL(url)}
 const importData=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text());const arr=Array.isArray(parsed)?parsed:parsed.picks;if(!Array.isArray(arr)||!arr.every((p:unknown)=>typeof p==='object'&&p!==null&&'id'in p&&'player'in p&&'status'in p))throw new Error('Invalid backup');if(!window.confirm('Replace the entire current journal with this backup? Export your existing data first.'))return;setPicks(arr as Pick[]);setNotice('Backup restored successfully')}catch{setNotice('Could not import: invalid PropLedger backup')}finally{if(fileRef.current)fileRef.current.value=''}}
 const save=()=>{if(!draft.player.trim()||!draft.market.trim()||!draft.date||!Number.isFinite(draft.line)||draft.line<0){setNotice('Add a player, date and valid line.');return}const record={...draft,autoGraded:false,id:editing?.id||crypto.randomUUID(),createdAt:editing?.createdAt||new Date().toISOString()};setPicks(old=>editing?old.map(p=>p.id===record.id?record:p):[record,...old]);setEditing(null);setNotice('Entry saved')}
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
   <header className="topbar"><div className="breadcrumbs">WORKSPACE <span>/</span> {screen.toUpperCase()}</div><div className="top-actions"><span className="live-mark"><span/> {feedState==='loading'?'LOADING SCORES':feedState==='offline'?'SCORE FEED OFFLINE':feed.updatedAt?'AUTO BOX SCORES':'AWAITING SCORE CACHE'}</span><button className="iconbtn" title="Export JSON" onClick={exportData}><Download size={17}/></button><button className="iconbtn" title="Import JSON" onClick={()=>fileRef.current?.click()}><FileUp size={17}/></button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>importData(e.target.files?.[0])}/></div></header>
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
      <div className="feed-notice">NBA SCORE FEED: {feedState==='offline'?'UNAVAILABLE — existing results preserved':feed.updatedAt?'UPDATED '+new Date(feed.updatedAt).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'WAITING FOR FIRST SCHEDULED REFRESH'} · Unmatched picks stay pending.</div>
      <div className="section-title"><div><span className="section-index">01</span><h2>Current journal</h2></div><button className="ghost" onClick={()=>setScreen('journal')}>View all entries <ArrowUpRight size={15}/></button></div>
      <Journal rows={filtered.slice(0,8)} onEdit={start}/>
      <div className="split-panels">
       <div className="info-panel"><div className="panel-title"><BarChart3 size={16}/> PERFORMANCE RULES</div><h3>Review the reasoning.</h3><p>Each pick has a collapsible rationale explaining the analysis behind it. Original predictions stay separate from watchlist ideas. Completed NBA games are checked automatically when the score feed refreshes.</p><div className="rule"><Check size={15}/> Final recommendations and watchlists tracked separately</div><div className="rule"><Check size={15}/> Automatic box-score results and data backups</div></div>
       <div className="info-panel dark-panel"><div className="panel-title"><Filter size={16}/> RESULTS COVERAGE</div><div className="coverage"><strong>{picks.filter(p=>p.status==='watchlist').length}</strong><span>Unverified watchlist targets</span></div><div className="coverage"><strong>{picks.filter(p=>p.status==='pending').length}</strong><span>Waiting for completed game</span></div><div className="coverage"><strong>{picks.filter(p=>validResult(p.status)).length}</strong><span>Final results</span></div></div>
      </div>
    </>}
    {screen==='journal'&&<>
      <div className="toolbar"><label className="search"><Search size={16}/><input placeholder="Search player, opponent or market" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="select-wrap"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{(['watchlist','pending','win','loss','push','void'] as Status[]).map(s=><option value={s} key={s}>{s}</option>)}</select><ChevronDown size={14}/></div><span className="rowcount">{filtered.length} ENTRIES</span></div>
      <Journal rows={filtered} onEdit={start}/>
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
  {editing&&<div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Edit prop"><div className="modal-head"><div><div className="eyebrow">JOURNAL ENTRY</div><h2>{editing.id?'Edit prop':'New prop'}</h2></div><button className="iconbtn" onClick={()=>setEditing(null)}><X size={20}/></button></div><div className="form-grid">
   <label>Player<input value={draft.player} onChange={e=>update('player',e.target.value)} placeholder="Player name"/></label>
   <label>Game date (ET)<input type="date" value={draft.date} onChange={e=>update('date',e.target.value)}/></label>
   <label>Tipoff time (ET)<input type="time" value={draft.gameTime||''} onChange={e=>update('gameTime',e.target.value)}/></label>
   <label>Opponent<input value={draft.opponent} onChange={e=>update('opponent',e.target.value)} placeholder="e.g. BOS"/></label>
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
  </div><div className="modal-foot">{editing.id&&<button className="delete" onClick={()=>{if(window.confirm('Delete this entry permanently?')){setPicks(old=>old.filter(p=>p.id!==editing.id));setEditing(null)}}}><Trash2 size={15}/> Delete</button>}<div className="grow"/><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={save}><Check size={16}/> Save entry</button></div></div></div>}
 </div>
}
function Journal({rows,onEdit}:{rows:Pick[];onEdit:(p:Pick)=>void}){
 return <div className="table-frame"><div className="table-scroll"><table><thead><tr><th>DATE / TIME / PLAYER</th><th>MARKET</th><th>SELECTION</th><th>SOURCE</th><th>PROJECTION</th><th>ACTUAL</th><th>RESULT</th><th>TYPE</th><th></th></tr></thead><tbody>{rows.length===0?<tr><td colSpan={9} className="empty">No entries match. Use Add prop to start tracking.</td></tr>:rows.map(p=><tr key={p.id}><td><div className="player">{p.player}</div><div className="muted small">{p.date} · {p.gameTime||'Time unverified'} ET · vs {p.opponent||'—'}</div></td><td>{p.market}</td><td><span className={'pick-side '+(p.side==='More'?'over':'under')}>{p.side==='More'?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {p.side} {p.line}</span></td><td className="muted">{p.platform}</td><td className="mono">{p.projection??'—'}</td><td className="mono">{p.actual??'—'}</td><td><Symbol result={p.status}/>{p.autoGraded&&<div className="auto-caption">AUTO · ESPN</div>}</td><td><div className="flags">{p.recommended?<span>MODEL</span>:<span className="mutedflag">WATCH</span>}</div></td><td><button className="edit-btn" onClick={()=>onEdit(p)}>EDIT</button></td></tr>).flatMap(p=>p)}</tbody></table></div><div className="rationale-list">{rows.map(p=><details key={'why-'+p.id} className="rationale-row"><summary><span>{p.player} · {p.side} {p.line} {p.market}</span><span>WHY THIS PICK <ChevronDown size={13}/></span></summary><div>{p.rationale||p.notes||'No detailed reasoning recorded. Add verified analysis under Edit → Why I like this pick.'}</div></details>)}</div></div>
}
export default App
