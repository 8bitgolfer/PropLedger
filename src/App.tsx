import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Check, ChevronDown, CircleDollarSign, ClipboardList, Download, FileUp, Filter, LayoutDashboard, Plus, Search, Target, Trash2, TrendingUp, X } from 'lucide-react'

type Status = 'watchlist' | 'pending' | 'win' | 'loss' | 'push' | 'void'
type Side = 'More' | 'Less'
type Pick = { id: string; date: string; player: string; opponent: string; market: string; side: Side; line: number; platform: string; odds: number | null; projection: number | null; probability: number | null; status: Status; actual: number | null; recommended: boolean; placed: boolean; stake: number; notes: string; createdAt: string }
const KEY = 'propledger-v1'
const markets = ['Points','Rebounds','Assists','3PT Made','PRA','Points + Assists','Points + Rebounds','Rebounds + Assists','Steals','Blocks','Other']
const seed: Pick[] = [
 {id:'seed-zion',date:'2026-11-16',player:'Zion Williamson',opponent:'GSW',market:'Points',side:'More',line:20.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Reported public research target. Line and availability not verified on PrizePicks or Hard Rock.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-fears',date:'2026-11-16',player:'Jeremiah Fears',opponent:'GSW',market:'Assists',side:'More',line:5.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Reported public target, not a confirmed executable bet.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-kennard',date:'2026-11-16',player:'Luke Kennard',opponent:'DEN',market:'Points',side:'More',line:7.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Unverified watchlist target. Confirm team and line before upgrading.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-draymond',date:'2026-11-16',player:'Draymond Green',opponent:'NOP',market:'Points',side:'Less',line:6.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Morning third-party market snapshot. Not a verified final recommendation.',createdAt:'2026-11-16T19:40:00-05:00'},
 {id:'seed-podz',date:'2026-11-16',player:'Brandin Podziemski',opponent:'NOP',market:'PRA',side:'Less',line:28.5,platform:'Research watchlist',odds:null,projection:null,probability:null,status:'watchlist',actual:null,recommended:false,placed:false,stake:0,notes:'Unverified research target; check availability and lineup.',createdAt:'2026-11-16T19:40:00-05:00'}
]
function load(): Pick[] { try { const raw=localStorage.getItem(KEY); if(!raw)return seed; const data:unknown=JSON.parse(raw); return Array.isArray(data)?data as Pick[]:seed } catch { return seed } }
const nowDate=()=>new Date().toLocaleDateString('en-CA')
function amount(p:Pick){ if(!p.placed||!p.stake||!Number.isFinite(p.stake))return 0; if(p.status==='win'){ if(p.odds===null)return 0; return p.stake*(p.odds>0?p.odds/100:100/Math.abs(p.odds)) } if(p.status==='loss')return -p.stake; return 0 }
function validResult(status:Status){return status==='win'||status==='loss'||status==='push'||status==='void'}
const cash=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n)
const pct=(n:number)=>Number.isFinite(n)?n.toFixed(1)+'%':'—'
function initialForm():Pick{return {id:'',date:nowDate(),player:'',opponent:'',market:'Points',side:'More',line:0,platform:'PrizePicks',odds:null,projection:null,probability:null,status:'pending',actual:null,recommended:true,placed:false,stake:0,notes:'',createdAt:new Date().toISOString()}}
function Symbol({result}:{result:Status}){return <span className={'state '+result}>{result.toUpperCase()}</span>}
function App(){
 const [picks,setPicks]=useState<Pick[]>(load)
 const [screen,setScreen]=useState<'overview'|'journal'|'analytics'>('overview')
 const [query,setQuery]=useState('')
 const [filter,setFilter]=useState('all')
 const [editing,setEditing]=useState<Pick|null>(null)
 const [draft,setDraft]=useState<Pick>(initialForm())
 const [notice,setNotice]=useState('')
 const fileRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(picks))},[picks])
 const graded=picks.filter(p=>p.recommended&&(p.status==='win'||p.status==='loss'))
 const wins=graded.filter(p=>p.status==='win').length
 const wagers=picks.filter(p=>p.placed&&validResult(p.status)&&p.stake>0)
 const settledWagers=wagers.filter(p=>p.status==='win'||p.status==='loss')
 const risk=settledWagers.reduce((s,p)=>s+p.stake,0)
 const profit=wagers.reduce((s,p)=>s+amount(p),0)
 const pctAccuracy=graded.length?wins/graded.length*100:NaN
 const meanError=(()=>{const relevant=picks.filter(p=>p.projection!==null&&p.actual!==null&&validResult(p.status));return relevant.length?relevant.reduce((s,p)=>s+Math.abs(p.actual!-p.projection!),0)/relevant.length:null})()
 const filtered=useMemo(()=>picks.filter(p=>{const q=(p.player+' '+p.market+' '+p.opponent).toLowerCase().includes(query.toLowerCase());return q&&(filter==='all'||p.status===filter)}).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[picks,query,filter])
 const byMarket=markets.map(m=>{const rows=graded.filter(p=>p.market===m);return {market:m,count:rows.length,wins:rows.filter(p=>p.status==='win').length,rate:rows.length?rows.filter(p=>p.status==='win').length/rows.length*100:0}}).filter(r=>r.count>0)
 const exportData=()=>{const blob=new Blob([JSON.stringify({app:'PropLedger',version:1,exportedAt:new Date().toISOString(),picks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='propledger-backup-'+nowDate()+'.json';a.click();URL.revokeObjectURL(url)}
 const importData=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text());const arr=Array.isArray(parsed)?parsed:parsed.picks;if(!Array.isArray(arr)||!arr.every((p:unknown)=>typeof p==='object'&&p!==null&&'id'in p&&'player'in p&&'status'in p))throw new Error('Invalid backup');if(!window.confirm('Replace the entire current journal with this backup? Export your existing data first.'))return;setPicks(arr as Pick[]);setNotice('Backup restored successfully')}catch{setNotice('Could not import: invalid PropLedger backup')}finally{if(fileRef.current)fileRef.current.value=''}}
 const save=()=>{if(!draft.player.trim()||!draft.market.trim()||!draft.date||!Number.isFinite(draft.line)||draft.line<0){setNotice('Add a player, date and valid line.');return}if(draft.placed&&(!Number.isFinite(draft.stake)||draft.stake<=0||draft.odds===null)){setNotice('A placed bet needs a positive stake and American odds.');return}const record={...draft,id:editing?.id||crypto.randomUUID(),createdAt:editing?.createdAt||new Date().toISOString()};setPicks(old=>editing?old.map(p=>p.id===record.id?record:p):[record,...old]);setEditing(null);setNotice('Entry saved')}
 const start=(p?:Pick)=>{setEditing(p||initialForm());setDraft(p?{...p}:initialForm())}
 const update=(key:keyof Pick,value:unknown)=>setDraft(p=>({...p,[key]:value}))
 const setActual=(p:Pick,value:string)=>{const actual=value===''?null:Number(value);const status:Status=actual===null?'pending':actual===p.line?'push':p.side==='More'?(actual>p.line?'win':'loss'):(actual<p.line?'win':'loss');setPicks(old=>old.map(row=>row.id===p.id?{...row,actual,status}:row))}
 const closeNotice=()=>setNotice('')
 return <div className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-symbol">P<span>.</span></div><div><strong>PROPLEDGER</strong><small>RESEARCH TERMINAL</small></div></div>
   <div className="nav-caption">WORKSPACE</div>
   <nav><button className={screen==='overview'?'selected':''} onClick={()=>setScreen('overview')}><LayoutDashboard size={17}/> Overview</button><button className={screen==='journal'?'selected':''} onClick={()=>setScreen('journal')}><ClipboardList size={17}/> Prop Journal <span className="nav-count">{picks.length}</span></button><button className={screen==='analytics'?'selected':''} onClick={()=>setScreen('analytics')}><BarChart3 size={17}/> Analytics</button></nav>
   <div className="side-bottom"><div className="statusdot"/> LOCAL DATA <span>v1.0</span><p>Data stays in this browser. Export backups regularly; no automatic sportsbook or score sync.</p></div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="breadcrumbs">WORKSPACE <span>/</span> {screen.toUpperCase()}</div><div className="top-actions"><span className="live-mark"><span/> MANUAL TRACKING</span><button className="iconbtn" title="Export JSON" onClick={exportData}><Download size={17}/></button><button className="iconbtn" title="Import JSON" onClick={()=>fileRef.current?.click()}><FileUp size={17}/></button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>importData(e.target.files?.[0])}/></div></header>
   <div className="page">
    <div className="heading"><div><div className="eyebrow">NBA / QUANTITATIVE TRACKING</div><h1>{screen==='overview'?'Performance overview':screen==='journal'?'Prop journal':'Model analytics'}<span className="h1-dot">.</span></h1><p>{screen==='overview'?'A clearer record of predictions, decisions, and outcomes.':screen==='journal'?'All entries, including unverified watchlist targets.':'Which kinds of forecasts have actually performed best?'}</p></div><button className="primary" onClick={()=>start()}><Plus size={16}/> Add prop</button></div>
    {notice&&<div className="notice"><span>{notice}</span><button onClick={closeNotice}><X size={14}/></button></div>}
    {screen==='overview'&&<>
      <div className="metrics">
       <div className="metric"><div className="metric-label">MODEL HIT RATE <Target size={15}/></div><strong>{pct(pctAccuracy)}</strong><span>{wins} wins · {graded.length-wins} losses · {graded.length} graded recommendations</span></div>
       <div className="metric"><div className="metric-label">PERSONAL NET P/L <CircleDollarSign size={15}/></div><strong className={profit>0?'positive':profit<0?'negative':''}>{cash(profit)}</strong><span>{settledWagers.length} settled bets with stakes & odds</span></div>
       <div className="metric"><div className="metric-label">BETTING ROI <TrendingUp size={15}/></div><strong>{risk?pct(profit/risk*100):'—'}</strong><span>Based on settled stake: {cash(risk)}</span></div>
       <div className="metric"><div className="metric-label">MEAN ABSOLUTE ERROR <Activity size={15}/></div><strong>{meanError===null?'—':meanError.toFixed(2)}</strong><span>Only entries with projections & results</span></div>
      </div>
      <div className="section-title"><div><span className="section-index">01</span><h2>Current journal</h2></div><button className="ghost" onClick={()=>setScreen('journal')}>View all entries <ArrowUpRight size={15}/></button></div>
      <Journal rows={filtered.slice(0,8)} onEdit={start} onActual={setActual}/>
      <div className="split-panels">
       <div className="info-panel"><div className="panel-title"><BarChart3 size={16}/> PERFORMANCE RULES</div><h3>No hindsight edits.</h3><p>Record the original line, price, timestamp, and projected probability before the game. Grade later against that original number. Watchlist targets never count as model wins.</p><div className="rule"><Check size={15}/> Predictions and actual bets tracked separately</div><div className="rule"><Check size={15}/> Manual settlement and data backups</div></div>
       <div className="info-panel dark-panel"><div className="panel-title"><Filter size={16}/> CURRENT DATA COVERAGE</div><div className="coverage"><strong>{picks.filter(p=>p.status==='watchlist').length}</strong><span>Unverified watchlist targets</span></div><div className="coverage"><strong>{picks.filter(p=>p.status==='pending').length}</strong><span>Pending / awaiting outcome</span></div><div className="coverage"><strong>{picks.filter(p=>validResult(p.status)).length}</strong><span>Settled or graded entries</span></div></div>
      </div>
    </>}
    {screen==='journal'&&<>
      <div className="toolbar"><label className="search"><Search size={16}/><input placeholder="Search player, opponent or market" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="select-wrap"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{(['watchlist','pending','win','loss','push','void'] as Status[]).map(s=><option value={s} key={s}>{s}</option>)}</select><ChevronDown size={14}/></div><span className="rowcount">{filtered.length} ENTRIES</span></div>
      <Journal rows={filtered} onEdit={start} onActual={setActual}/>
      <p className="footnote">Quick grade: enter the actual stat in a row. Enter a prop's original projection, recommendation flag, odds, and stake in Edit. Use Edit to manually mark voids or correct settlement rules.</p>
    </>}
    {screen==='analytics'&&<>
      <div className="analytics-grid"><div className="info-panel"><div className="panel-title">BY STAT CATEGORY</div>{byMarket.length===0?<div className="empty">No graded model recommendations yet. Grade some picks to see category accuracy.</div>:byMarket.map(r=><div className="bar-row" key={r.market}><div><span>{r.market}</span><small>{r.wins}/{r.count} wins</small></div><div className="bar-track"><div style={{width:r.rate+'%'}}/></div><b>{pct(r.rate)}</b></div>)}</div><div className="info-panel"><div className="panel-title">EVALUATION CHECKLIST</div><h3>What to measure next</h3><p>Hit rate does not equal positive expected value. To improve the research model, add verified prices, model probabilities, projections, and eventually closing lines.</p><div className="rule"><Check size={15}/> Track recommendations before tipoff</div><div className="rule"><Check size={15}/> Separate watchlists from real picks</div><div className="rule"><Check size={15}/> Track ROI only on placed bets</div><div className="rule"><Check size={15}/> Evaluate accuracy over larger samples</div></div></div>
      <div className="section-title"><div><span className="section-index">02</span><h2>Audit snapshot</h2></div></div>
      <div className="audit-grid"><div>PROJECTED STAT ENTRIES <b>{picks.filter(p=>p.projection!==null).length}</b></div><div>PROBABILITY ESTIMATES <b>{picks.filter(p=>p.probability!==null).length}</b></div><div>ACTUAL BETS TRACKED <b>{picks.filter(p=>p.placed).length}</b></div><div>RECOMMENDATIONS GRADED <b>{graded.length}</b></div></div>
    </>}
    <footer>PROPLEDGER <span>© 2026 · RESEARCH JOURNAL · NOT LIVE BETTING DATA</span></footer>
   </div>
  </main>
  {editing&&<div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Edit prop"><div className="modal-head"><div><div className="eyebrow">JOURNAL ENTRY</div><h2>{editing.id?'Edit prop':'New prop'}</h2></div><button className="iconbtn" onClick={()=>setEditing(null)}><X size={20}/></button></div><div className="form-grid">
   <label>Player<input value={draft.player} onChange={e=>update('player',e.target.value)} placeholder="Player name"/></label>
   <label>Game date<input type="date" value={draft.date} onChange={e=>update('date',e.target.value)}/></label>
   <label>Opponent<input value={draft.opponent} onChange={e=>update('opponent',e.target.value)} placeholder="e.g. BOS"/></label>
   <label>Market<select value={draft.market} onChange={e=>update('market',e.target.value)}>{markets.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Selection<select value={draft.side} onChange={e=>update('side',e.target.value)}><option>More</option><option>Less</option></select></label>
   <label>Line<input type="number" step="0.5" value={draft.line} onChange={e=>update('line',Number(e.target.value))}/></label>
   <label>Sportsbook / source<input value={draft.platform} onChange={e=>update('platform',e.target.value)}/></label>
   <label>American odds<input type="number" placeholder="e.g. -110" value={draft.odds??''} onChange={e=>update('odds',e.target.value===''?null:Number(e.target.value))}/></label>
   <label>Model projection<input type="number" step="0.1" placeholder="Optional" value={draft.projection??''} onChange={e=>update('projection',e.target.value===''?null:Number(e.target.value))}/></label>
   <label>Model hit probability (%)<input type="number" min="0" max="100" placeholder="Optional" value={draft.probability??''} onChange={e=>update('probability',e.target.value===''?null:Math.min(100,Math.max(0,Number(e.target.value))))}/></label>
   <label>Status<select value={draft.status} onChange={e=>update('status',e.target.value)}>{(['watchlist','pending','win','loss','push','void'] as Status[]).map(s=><option value={s} key={s}>{s}</option>)}</select></label>
   <label>Actual result<input type="number" step="0.1" placeholder="Not yet known" value={draft.actual??''} onChange={e=>update('actual',e.target.value===''?null:Number(e.target.value))}/></label>
   <label className="toggle-row"><input type="checkbox" checked={draft.recommended} onChange={e=>update('recommended',e.target.checked)}/> Final model recommendation (not watchlist)</label>
   <label className="toggle-row"><input type="checkbox" checked={draft.placed} onChange={e=>update('placed',e.target.checked)}/> I actually placed this bet</label>
   {draft.placed&&<label>Stake ($)<input type="number" min="0" step="0.01" value={draft.stake} onChange={e=>update('stake',Number(e.target.value))}/></label>}
   <label className="full">Research notes<textarea rows={3} value={draft.notes} onChange={e=>update('notes',e.target.value)} placeholder="Reasoning, injury impact, risk factors..."/></label>
  </div><div className="modal-foot">{editing.id&&<button className="delete" onClick={()=>{if(window.confirm('Delete this entry permanently?')){setPicks(old=>old.filter(p=>p.id!==editing.id));setEditing(null)}}}><Trash2 size={15}/> Delete</button>}<div className="grow"/><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={save}><Check size={16}/> Save entry</button></div></div></div>}
 </div>
}
function Journal({rows,onEdit,onActual}:{rows:Pick[];onEdit:(p:Pick)=>void;onActual:(p:Pick,s:string)=>void}){return <div className="table-frame"><div className="table-scroll"><table><thead><tr><th>DATE / PLAYER</th><th>MARKET</th><th>SELECTION</th><th>SOURCE</th><th>PROJECTION</th><th>ACTUAL</th><th>RESULT</th><th>MODEL / BET</th><th></th></tr></thead><tbody>{rows.length===0?<tr><td colSpan={9} className="empty">No entries match. Use Add prop to start tracking.</td></tr>:rows.map(p=><tr key={p.id}><td><div className="player">{p.player}</div><div className="muted small">{p.date} · vs {p.opponent||'—'}</div></td><td>{p.market}</td><td><span className={'pick-side '+(p.side==='More'?'over':'under')}>{p.side==='More'?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {p.side} {p.line}</span></td><td className="muted">{p.platform}</td><td className="mono">{p.projection??'—'}</td><td><input className="actual-input" type="number" step="0.1" placeholder="—" value={p.actual??''} onChange={e=>onActual(p,e.target.value)}/></td><td><Symbol result={p.status}/></td><td><div className="flags">{p.recommended&&<span title="Final recommendation">MODEL</span>}{p.placed&&<span title="Bet actually placed">BET</span>}{!p.placed&&!p.recommended&&<span className="mutedflag">WATCH</span>}</div></td><td><button className="edit-btn" onClick={()=>onEdit(p)}>EDIT</button></td></tr>)}</tbody></table></div></div>}
export default App
