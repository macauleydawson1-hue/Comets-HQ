const assert=require('node:assert/strict'),{highs,opponentKey,metrics}=require('../club-features.js');
assert.equal(opponentKey('  Coffs   Eels '),'coffs eels');assert.equal(metrics.hitups,'Hit-ups');assert.equal(metrics.errors,undefined);
const fixtures=[{id:'a',match_date:'2027-03-01'},{id:'b',match_date:'2027-03-08'},{id:'c',match_date:'2028-03-01'}];
const stats=[{player_id:'one',fixture_id:'a',tackles:22,tries:1,hitups:8},{player_id:'one',fixture_id:'b',tackles:15,tries:2,hitups:9},{player_id:'two',fixture_id:'b',tackles:22,tries:1,hitups:6},{player_id:'two',fixture_id:'c',tackles:40,tries:5,hitups:15}];
const r=highs(fixtures,stats,'2027');assert.equal(r.players.one.tackles.value,22);assert.equal(r.players.one.tries.value,2);assert.deepEqual(r.leaders.tackles.players,['one','two']);assert.equal(r.leaders.hitups.value,9);assert.equal(highs(fixtures,stats,2028).leaders.tackles.value,40);assert.deepEqual(highs(fixtures,stats,2026).leaders.tries.players,[]);
assert.equal(highs(fixtures,[{player_id:'one',fixture_id:'a',hitups:null}],2027).players.one.hitups,undefined);
console.log('PASS: season filtering, single-match records rather than totals, positive metrics and tied squad leaders.');
