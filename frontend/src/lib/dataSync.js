import Axios from 'axios';
// One ordering boundary for Axios and fetch. Reads started before a write never become current.
let generation=0;
const writes=new Set();
const listeners=new Set();
const activeReads=new Map();
const scope=()=>typeof localStorage==='undefined'?'':`${localStorage.getItem('session_token')||''}|${localStorage.getItem('custom_api_url')||''}`;
export const dataScope=scope;
let lastScope=scope();
const channel='cozum_data_revision';
const isApi=url=>/\/api(?:\/|$)/.test(String(url));
const isWrite=method=>!['GET','HEAD','OPTIONS'].includes(String(method||'GET').toUpperCase());
const stale=()=>Object.assign(new Error('Veri bu sırada değişti. Güncel kayıt yeniden yükleniyor.'),{code:'STALE_RESPONSE'});

export function dataGeneration(){
  if(lastScope!==scope()){lastScope=scope();generation++;activeReads.clear();}
  return generation;
}
export function announceChange(path='',publish=true){
  generation++;activeReads.clear();
  for(const listener of listeners)listener(path);
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path}}));
  if(publish&&typeof localStorage!=='undefined'){try{localStorage.setItem(channel,JSON.stringify({revision:String(Date.now())+Math.random(),path}));}catch{}}
}
export function subscribeDataChanges(listener){listeners.add(listener);return()=>listeners.delete(listener);}

export async function synchronizedRequest(url,method,send,readIdentity=null){
  if(!isApi(url))return send();
  if(isWrite(method)){
    const session=scope();
    generation++;activeReads.clear();
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
    const key=readIdentity===null?null:JSON.stringify([session,version,readIdentity]);
    let pending=key===null?null:activeReads.get(key);
    if(!pending){
      pending=Promise.resolve(send());
      if(key!==null)activeReads.set(key,pending);
    }
    let result;
    try{result=await pending;}
    finally{if(key!==null&&activeReads.get(key)===pending)activeReads.delete(key);}
    if(session!==scope())throw stale();
    if(version===dataGeneration())return result;
  }
  throw stale();
}

export function installAxiosSynchronization(axios){
  const adapter=axios.defaults.adapter;
  if(adapter?.cozumSynchronized)return()=>{};
  // Wrap the adapter once: every caller, including existing components, crosses the same boundary.
  const synchronized=config=>{
    // Share only identical in-flight reads; cancellation and subsequent refreshes stay independent.
    const identity=String(config.method||'get').toUpperCase()==='GET'&&!config.signal&&!config.cancelToken
      &&config.data==null&&config.validateStatus===Axios.defaults.validateStatus&&typeof config.withXSRFToken!=='function'
      ? JSON.stringify([Axios.getUri(config),config.headers?.toJSON?.()||config.headers,config.auth,config.responseType,config.responseEncoding,config.timeout,config.withCredentials,config.xsrfCookieName,config.xsrfHeaderName,config.withXSRFToken])
      : null;
    return synchronizedRequest(Axios.getUri(config),config.method,()=>Axios.getAdapter(adapter)(config),identity);
  };
  synchronized.cozumSynchronized=true;
  axios.defaults.adapter=synchronized;
  return()=>{axios.defaults.adapter=adapter;};
}

if(typeof window!=='undefined'){
  window.addEventListener('storage',e=>{if([channel,'session_token','custom_api_url'].includes(e.key)){let path='';if(e.key===channel){try{const change=JSON.parse(e.newValue);if(typeof change?.path==='string')path=change.path;}catch{}}announceChange(path,false);}});
  // A return usually emits both visible and focus. Refresh once, without delaying real changes.
  let resumePending=document.visibilityState==='hidden';
  const resume=()=>{if(resumePending&&document.visibilityState==='visible'){resumePending=false;announceChange('',false);}};
  window.addEventListener('blur',()=>{resumePending=true;});
  window.addEventListener('focus',resume);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')resumePending=true;else resume();});
}
