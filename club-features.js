/* Shared pure calculations for season records and opponent identity. */
(()=>{'use strict';
const metrics={tries:'Tries',tackles:'Tackles',metres:'Running metres',hitups:'Hit-ups'};
const opponentKey=name=>String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-AU');
function highs(fixtures,stats,season){
 const ids=new Set(fixtures.filter(f=>String(f.match_date).slice(0,4)===String(season)).map(f=>f.id)),players={};
 for(const row of stats){if(!ids.has(row.fixture_id))continue;const p=players[row.player_id]??={};for(const key of Object.keys(metrics)){if(row[key]===null||row[key]===undefined||row[key]==='')continue;const value=Number(row[key])||0;if(!p[key]||value>p[key].value)p[key]={value,fixture_id:row.fixture_id}}}
 const leaders={};for(const key of Object.keys(metrics)){const best=Math.max(0,...Object.values(players).map(p=>p[key]?.value||0));leaders[key]={value:best,players:best>0?Object.entries(players).filter(([,p])=>p[key]?.value===best).map(([id])=>id):[]}}
 return {players,leaders};
}
const api={metrics,opponentKey,highs};globalThis.CometsClub=api;if(typeof module!=='undefined')module.exports=api;
})();
