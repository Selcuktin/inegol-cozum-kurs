import Axios from 'axios';
// One ordering boundary for Axios and fetch. Reads started before a write never become current.
let generation=0;
const writes=new Set();
const listeners=new Set();
const scope=()=>typeof localStorage==='undefined'?'':`${localStorage.getItem('session_token')||''}|${localStorage.getItem('custom_api_url')||''}`;
export const dataScope=scope;
let lastScope=scope();
const channel='cozum_data_revision';
const isApi=url=>/\/api(?:\/|$)/.test(String(url));
const isWrite=method=>!['GET','HEAD','OPTIONS'].includes(String(method||'GET').toUpperCase());
const stale=()=>Object.assign(new Error('Veri bu sırada değişti. Güncel kayıt yeniden yükleniyor.'),{code:'STALE_RESPONSE'});

export function dataGeneration(){
  if(lastScope!==scope()){lastScope=scope();generation++;}
  return generation;
}
export function announceChange(path='',publish=true){
  generation++;
  for(const listener of listeners)listener(path);
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path}}));
  if(publish&&typeof localStorage!=='undefined'){try{localStorage.setItem(channel,String(Date.now())+Math.random());}catch{}}
}
export function subscribeDataChanges(listener){listeners.add(listener);return()=>listeners.delete(listener);}

export async function synchronizedRequest(url,method,send){
  if(!isApi(url))return send();
  if(isWrite(method)){
    const session=scope();
    generation++;
    let release;const pending=new Promise(resolve=>{release=resolve;});writes.add(pending);
    try{const result=await send();if(session!==scope())throw stale();return result;}
    finally{writes.delete(pending);release();announceChange(String(url));}
  }
  const session=scope();
  // ponytail: at most 3 retries under continuous writes; fail visibly instead of an unbounded retry loop.
  for(let attempt=0;attempt<3;attempt++){
    if(writes.size)await Promise.all([...writes]);
    if(session!==scope())throw stale();
    const version=dataGeneration();
    const result=await send();
    if(session!==scope())throw stale();
    if(version===dataGeneration())return result;
  }
  throw stale();
}

export function installAxiosSynchronization(axios){
  const adapter=axios.defaults.adapter;
  if(adapter?.cozumSynchronized)return()=>{};
  // Wrap the adapter once: every caller, including existing components, crosses the same boundary.
  const synchronized=config=>synchronizedRequest(config.url,config.method,()=>Axios.getAdapter(adapter)(config));
  synchronized.cozumSynchronized=true;
  axios.defaults.adapter=synchronized;
  return()=>{axios.defaults.adapter=adapter;};
}

if(typeof window!=='undefined'){
  window.addEventListener('storage',e=>{if([channel,'session_token','custom_api_url'].includes(e.key))announceChange('',false);});
  window.addEventListener('focus',()=>announceChange('',false));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')announceChange('',false);});
}
