import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import {createLocalDb} from './local-db.mjs';
const DB=createLocalDb();
async function api(path,body){return worker.fetch(new Request('https://garden.test/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{DB});}
const state={name:'Tamu A',character:'men',x:768,y:919,dir:'south',walking:false};
const a=await (await api('join',state)).json();const b=await (await api('join',{...state,name:'Tamu B',character:'pair',companion:state})).json();
assert.equal((await api('join',{...state,name:' '})).status,400);
assert.equal((await api('sync',{...state,...a,token:'wrong'})).status,401);
await api('sync',{...state,...a,x:800,dir:'north-east',walking:true,message:'1234567890123456789'});
let result=await (await api('sync',{...state,...b})).json();assert.equal(result.players.length,1);assert.equal(result.players[0].x,800);assert.equal(result.players[0].message,'123456789012345');assert.ok(result.players[0].messageRemaining<=5000);
await DB.prepare('UPDATE garden_players SET message_at=? WHERE id=?').bind(Date.now()-6000,a.id).run();result=await (await api('sync',{...state,...b})).json();assert.equal(result.players[0].message,'');
await api('leave',{...a,token:'wrong'});result=await (await api('sync',{...state,...b})).json();assert.equal(result.players.length,1);
await api('leave',a);result=await (await api('sync',{...state,...b})).json();assert.equal(result.players.length,0);
const c=await (await api('join',state)).json();await DB.prepare('UPDATE garden_players SET seen=? WHERE id=?').bind(Date.now()-16000,c.id).run();result=await (await api('sync',{...state,...b})).json();assert.equal(result.players.length,0);
DB.close();console.log('PASS: shared players, movement, chat limit/expiry, session ownership, leave and stale presence');
