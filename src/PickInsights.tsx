import { useMemo, useState } from 'react'
import { Activity, BarChart3, Shield, TrendingUp } from 'lucide-react'

export type NBAStatPlayer={id:string;name:string;teamId?:string;team:string;points:number|null;rebounds:number|null;assists:number|null;threes:number|null;steals:number|null;blocks:number|null;pra:number|null;pa:number|null;pr:number|null;ra:number|null}
export type NBAStatGame={id:string;date:string;teams:{id:string;abbreviation:string;name:string}[];players:NBAStatPlayer[]}
export type InsightFeed={schemaVersion:number;games:NBAStatGame[]}
export type PickForInsights={date:string;player:string;playerId?:string;teamId?:string;opponent:string;market:string;side:'More'|'Less';line:number;projection:number|null;rationale?:string;notes:string}
type View='l5'|'l10'|'h2h'|'season'
const keys:Record<string,keyof NBAStatPlayer>={'Points':'points','Rebounds':'rebounds','Assists':'assists','3PT Made':'threes','PRA':'pra','Points + Assists':'pa','Points + Rebounds':'pr','Rebounds + Assists':'ra','Steals':'steals','Blocks':'blocks','Steals + Blocks':'steals'}
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const teamAliases:Record<string,string>={gs:'gsw',gsw:'gsw',no:'nop',nop:'nop',ny:'nyk',nyk:'nyk',sa:'sas',sas:'sas',utah:'uta',ut:'uta',uta:'uta',wsh:'was',was:'was',phoe:'phx',pho:'phx',phx:'phx',brk:'bkn',bkn:'bkn',bknets:'bkn'}
const teamKey=(abbr:string)=>teamAliases[norm(abbr)]||norm(abbr)
function season(date:string){const y=Number(date.slice(0,4));return String(Number(date.slice(5,7))>=10?y:y-1)+'-10-01'}
function stat(m:string,p:NBAStatPlayer):number|null{if(m==='Steals + Blocks')return typeof p.steals==='number'&&typeof p.blocks==='number'?p.steals+p.blocks:null;const k=keys[m];if(!k)return null;const v=p[k];return typeof v==='number'&&Number.isFinite(v)?v:null}
type Sample={game:NBAStatGame;value:number;opp:string}
function histories(pick:PickForInsights,data:InsightFeed):Sample[]{
 const out:Sample[]=[]
 for(const game of data.games){
  if(game.date>=pick.date)continue
  const people=game.players.filter(p=>pick.playerId?p.id===pick.playerId:norm(p.name)===norm(pick.player))
  if(people.length!==1)continue
  const player=people[0]
  // Track the same athlete across trades: historical H2H follows player ID,
  // not the club they happen to play for on the prediction date.
  const other=game.teams.find(t=>t.id!==player.teamId&&teamKey(t.abbreviation)!==teamKey(player.team))
  const value=stat(pick.market,player)
  if(other&&value!==null)out.push({game,value,opp:other.abbreviation})
 }
 return out.sort((a,b)=>a.game.date.localeCompare(b.game.date))
}
export function historicalBaseline(pick:PickForInsights,data:InsightFeed|null):number|null{
 if(!data)return null
 const past=histories(pick,data)
 // A descriptive estimate, NOT a vetted game-day research-model forecast.
 // Require five independently recorded previous games before calculating it.
 if(past.length<5)return null
 const last5=past.slice(-5).reduce((a,r)=>a+r.value,0)/5
 const ten=past.slice(-10)
 const last10=ten.reduce((a,r)=>a+r.value,0)/ten.length
 return Math.round((0.6*last5+0.4*last10)*10)/10
}
type Defense={score:number;sample:number;allowed:number;label:string}
function defense(pick:PickForInsights,data:InsightFeed):Defense|null{
 if(!keys[pick.market])return null
 const grouped=new Map<string,{abbr:string;total:number;games:number}>()
 for(const game of data.games){
  if(game.date>=pick.date||game.date<season(pick.date)||game.teams.length!==2)continue
  for(const defender of game.teams){
   const offense=game.teams.find(t=>t.id!==defender.id)
   if(!offense)continue
   const active=game.players.filter(p=>p.teamId===offense.id||(!p.teamId&&p.team===offense.abbreviation))
   if(!active.length)continue
   const vals=active.map(p=>stat(pick.market,p))
   if(vals.some(v=>v===null))continue
   const rec=grouped.get(defender.id)||{abbr:defender.abbreviation,total:0,games:0}
   rec.total+=vals.reduce<number>((a,b)=>a+(b||0),0);rec.games++
   grouped.set(defender.id,rec)
  }
 }
 const eligible=[...grouped.entries()].filter(([,r])=>r.games>=5).map(([id,r])=>({...r,id,avg:r.total/r.games})).sort((a,b)=>a.avg-b.avg)
 if(eligible.length<10)return null
 const target=eligible.find(r=>teamKey(r.abbr)===teamKey(pick.opponent))
 if(!target)return null
 const percentile=100*eligible.findIndex(r=>r.id===target.id)/Math.max(1,eligible.length-1)
 const score=pick.side==='More'?percentile:100-percentile
 return {score,allowed:target.avg,sample:target.games,label:score>=67?'FAVORABLE':score>=34?'NEUTRAL':'DIFFICULT'}
}
export default function PickInsights({pick,data,state}:{pick:PickForInsights;data:InsightFeed|null;state:'loading'|'ready'|'unavailable'}){
 const [view,setView]=useState<View>('l5')
 const history=useMemo(()=>data?histories(pick,data):[],[pick,data])
 const rows=view==='l5'?history.slice(-5):view==='l10'?history.slice(-10):view==='h2h'?history.filter(r=>teamKey(r.opp)===teamKey(pick.opponent)).slice(-10):history.filter(r=>r.game.date>=season(pick.date))
 const rating=useMemo(()=>data?defense(pick,data):null,[pick,data])
 const baseline=useMemo(()=>historicalBaseline(pick,data),[pick,data])
 const hits=rows.filter(r=>pick.side==='More'?r.value>pick.line:r.value<pick.line).length
 const avg=rows.length?rows.reduce((a,r)=>a+r.value,0)/rows.length:0
 const max=Math.max(1,pick.line,...rows.map(r=>r.value))*1.17
 const nice=(v:number)=>Number.isInteger(v)?String(v):v.toFixed(1)
 const color=rating?'hsl('+(rating.score*1.2)+' 74% 54%)':'#8e9aa4'
 return <div className="insight-shell">
  <div className="insight-top"><span><BarChart3 size={15}/> PERFORMANCE HISTORY</span><span className="insight-data-source">ARCHIVED NBA BOX SCORES</span></div>
  <div className="insight-tabs" role="group" aria-label="Historical sample">
   {([['l5','LAST 5'],['l10','LAST 10'],['h2h','H2H · LAST 10'],['season','2026–27']] as [View,string][]).map(([key,label])=><button type="button" key={key} aria-pressed={view===key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}
  </div>
  {state!=='ready'||!data?<div className="insight-empty"><Activity size={16}/>{state==='loading'?'Loading historical results…':'Historical data is not published yet. Run the NBA archive workflow first.'}</div>:rows.length===0?<div className="insight-empty"><Activity size={16}/>{view==='h2h'?'No archived previous meetings vs '+pick.opponent+' found yet. Career H2H is limited to verified seasons already imported.': 'No prior '+(view==='season'?'season':'player')+' games found in the published archive before '+pick.date+'.'}</div>:<>
   <div className="insight-stats"><div><span>AVERAGE</span><strong>{avg.toFixed(1)}</strong></div><div><span>LINE COVERAGE</span><strong>{hits}/{rows.length} <small>{Math.round(100*hits/rows.length)}%</small></strong></div><div><span>SAMPLE</span><strong>{rows.length} <small>GAMES</small></strong></div><div><span>{pick.projection!==null?'SAVED MODEL PROJECTION':'AUTO HISTORICAL BASELINE'}</span><strong>{pick.projection!==null?nice(pick.projection):baseline===null?'—':nice(baseline)}</strong></div></div>
   <div className="insight-plot-scroller"><div className="insight-plot" style={{minWidth:Math.max(490,rows.length*48)+'px'}}>
    <div className="insight-rule" style={{bottom:100*pick.line/max+'%'}}><span>{nice(pick.line)} LINE</span></div>
    {rows.map((r,i)=>{
     const pass=pick.side==='More'?r.value>pick.line:r.value<pick.line
     return <div className="insight-bar-group" key={r.game.id+'-'+i} title={r.game.date+' vs '+r.opp+': '+r.value}><span className="insight-bar-number">{nice(r.value)}</span><div className={'insight-bar '+(pass?'positive':'negative')} style={{height:Math.max(1,100*r.value/max)+'%'}}/><span className="insight-bar-date">{r.game.date.slice(5)}</span></div>
    })}
   </div></div>
   <div className="insight-legend"><span><i className="legend-good"/> COVERS</span><span><i className="legend-bad"/> MISSES</span><span><i className="legend-target"/> PROP LINE</span></div>
  </>}
  <div className="insight-defense">
   <div className="insight-defense-title"><Shield size={17}/><div><strong>DEFENSIVE MATCHUP</strong><span>VS {pick.opponent} · TEAM-LEVEL ALLOWANCE</span></div></div>
   {!rating?<div className="insight-defense-no-data">Insufficient verified opponent-team samples for a defensive rating. No estimate displayed.</div>:<>
    <div className="insight-defense-score"><strong style={{color}}>{rating.label}</strong><span>{rating.allowed.toFixed(1)} team {pick.market.toLowerCase()} allowed per game · {rating.sample} games</span></div>
    <div className="insight-gradient"><div className="insight-indicator" style={{left:rating.score+'%'}}/></div>
    <div className="insight-scale"><span>DIFFICULT</span><span>NEUTRAL</span><span>FAVORABLE</span></div>
    <p>Based on team totals allowed, adjusted to the selected More/Less direction. Not a player-specific defensive matchup grade, positional allowance metric, or verified edge.</p>
   </>}
  </div>
  <div className="insight-reason"><span><TrendingUp size={14}/> PICK RESEARCH</span><p>{pick.rationale||pick.notes||'No written pick analysis has been saved.'}</p></div>
  <div className="insight-footnote">An AUTO HISTORICAL BASELINE uses 60% of the previous 5-game mean and 40% of the previous 10-game mean (requires at least 5 archived games). It is NOT a pregame model prediction, injury-adjusted forecast or betting recommendation. H2H displays up to the latest 10 verified career matchups against this opponent, regardless of season or former team. Historical data is limited to archived final games played before this pick. Incomplete archives produce smaller samples; past hit rates alone do not predict future outcomes.</div>
 </div>
}
