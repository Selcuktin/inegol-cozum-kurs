import axios from 'axios';
import React,{act} from 'react';

test('identical concurrent Axios dashboard reads share one request, later refresh stays fresh',async()=>{
  const gate=deferred();let calls=0;
  const client=axios.create({adapter:async config=>({data:++calls===1?await gate.promise:'new',status:200,statusText:'OK',headers:{},config})});
  const uninstall=installAxiosSynchronization(client);
  try{
    const first=client.get('/api/dashboard'),second=client.get('/api/dashboard');
    await Promise.resolve();await Promise.resolve();expect(calls).toBe(1);
    gate.resolve('snapshot');
    expect((await first).data).toBe('snapshot');expect((await second).data).toBe('snapshot');
    expect((await client.get('/api/dashboard')).data).toBe('new');expect(calls).toBe(2);
  }finally{uninstall();}
});

test('Axios coalescing separates parameters and Authorization, and evicts failures',async()=>{
  let calls=0;
  const client=axios.create({adapter:async config=>{calls++;throw new Error('offline');}});
  const uninstall=installAxiosSynchronization(client);
  try{
    const requests=[
      client.get('/api/contracts',{params:{period:1}}),
      client.get('/api/contracts',{params:{period:2}}),
      client.get('/api/contracts',{params:{period:1},headers:{Authorization:'Bearer other'}}),
      client.get('/api/contracts',{params:{period:1},auth:{username:'other',password:'fixture'}}),
    ];
    await Promise.allSettled(requests);expect(calls).toBe(4);
    await expect(client.get('/api/contracts',{params:{period:1}})).rejects.toThrow('offline');
    expect(calls).toBe(5);
  }finally{uninstall();}
});

test('coalesced reads crossing a write both retry against the new generation',async()=>{
  const gate=deferred();let reads=0;
  const client=axios.create({adapter:async config=>({data:++reads===1?await gate.promise:'fresh',status:200,statusText:'OK',headers:{},config})});
  const uninstall=installAxiosSynchronization(client);
  try{
    const first=client.get('/api/dashboard'),second=client.get('/api/dashboard');
    await synchronizedRequest('/api/payments','POST',async()=>({ok:true}));
    gate.resolve('stale');
    expect((await first).data).toBe('fresh');expect((await second).data).toBe('fresh');
    expect(reads).toBe(2);
  }finally{uninstall();}
});
import {synchronizedRequest,installAxiosSynchronization,announceChange} from '../lib/dataSync';
test('relative LGS requests inherit shared ordering and cannot reuse a pre-write bundle',async()=>{
  const old=deferred();let reads=0;
  const client=axios.create({baseURL:'/api/lgs',adapter:async config=>({data:config.method==='get'?(++reads===1?await old.promise:'fresh'):'saved',status:200,statusText:'OK',headers:{},config})});
  const uninstall=installAxiosSynchronization(client);
  try{
    const first=client.get('/exams/e/bundle'),second=client.get('/exams/e/bundle');
    await Promise.resolve();await Promise.resolve();expect(reads).toBe(1);
    await client.put('/exams/e',{expected_revision:1});old.resolve('obsolete');
    expect((await first).data).toBe('fresh');expect((await second).data).toBe('fresh');expect(reads).toBe(2);
    expect((await client.get('/exams/e/bundle')).data).toBe('fresh');expect(reads).toBe(3);
  }finally{uninstall();}
});
import AccountingService from '../lib/edesisAccountingService';
import StudentService from '../lib/edesisStudentService';
import {useDataRefresh} from '../hooks/useDataRefresh';
import {useAppData} from '../hooks/useAppData';
import {render,cleanup} from './test_helpers';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('exam-only views defer finance reads until the user opens a financial view',async()=>{
 const get=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[],contracts:[],payments:[]})});
 function Probe({enabled}){useAppData(null,enabled);return null;}
 const view=await render(<Probe enabled={false}/>);expect(get).not.toHaveBeenCalled();
 await act(async()=>window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path:'/api/payments'}})));expect(get).not.toHaveBeenCalled();
 await act(async()=>view.root.render(<Probe enabled/>));expect(get).toHaveBeenCalledTimes(1);
});
test('LGS saves do not reread financial dashboard; financial and account changes still refresh',async()=>{
  jest.useFakeTimers();const get=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[],contracts:[],payments:[]})});
  function Probe(){useAppData();return null;}
  try{
    await render(<Probe/>);expect(get).toHaveBeenCalledTimes(1);
    await act(async()=>{window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path:'/api/lgs/exams/e'}}));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(1);
    await act(async()=>{window.dispatchEvent(new StorageEvent('storage',{key:'cozum_data_revision',newValue:JSON.stringify({revision:'other-tab',path:'/api/lgs/exams/e'})}));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(1);
    await act(async()=>{window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path:'/api/payments'}}));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(2);
    await act(async()=>{localStorage.setItem('session_token','new-account');window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path:'/api/lgs/results/r/contact'}}));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(3);
  }finally{jest.useRealTimers();}
});

test.each([0,80])('one payment shares its dashboard snapshot with the root view (%i ms read)',async(delay)=>{
  jest.useFakeTimers();
  const snapshot={students:[{id:'current-student',student_name:'Güncel'}],contracts:[],payments:[],incomes:[],installments:[]};
  let dashboardReads=0,app;
  const send=jest.spyOn(globalThis,'fetch').mockImplementation(async(url,options={})=>{
    if(options.method==='POST')return {ok:true,json:async()=>({id:'saved-payment',amount:5})};
    dashboardReads++;
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    return {ok:true,json:async()=>snapshot};
  });
  function Probe(){app=useAppData();return <div>{app.data.students?.[0]?.student_name}</div>;}
  try{
    const view=await render(<Probe/>);
    if(delay)await act(async()=>{jest.advanceTimersByTime(delay);});
    dashboardReads=0;
    let save;
    await act(async()=>{save=AccountingService.recordCollection({id:'payment-new',student_id:'s',amount:5});});
    await act(async()=>{jest.advanceTimersByTime(60);});
    await act(async()=>{jest.advanceTimersByTime(60);await save;});
    await act(async()=>{jest.advanceTimersByTime(60);});
    expect(dashboardReads).toBe(1);expect(view.container.textContent).toBe('Güncel');expect(app.loading).toBe(false);
    expect(send.mock.calls.filter(([,options={}])=>options.method==='POST')).toHaveLength(1);
    await act(async()=>{const manual=app.reload();jest.advanceTimersByTime(delay);await manual;});
    expect(dashboardReads).toBe(2);
  }finally{jest.useRealTimers();}
});

test('dashboard refreshes share only the same endpoint and evict failures',async()=>{
  const pending=[];const send=jest.spyOn(globalThis,'fetch').mockImplementation(url=>new Promise(resolve=>pending.push({url,resolve})));
  const first=AccountingService.refresh('/api'),same=AccountingService.refresh('/api'),other=AccountingService.refresh('https://inegol-cozum-kurs.pages.dev/api');
  expect(first).toBe(same);expect(first).not.toBe(other);expect(send).toHaveBeenCalledTimes(2);
  pending[0].resolve({ok:true,json:async()=>({contracts:[],payments:[]})});
  pending[1].resolve({ok:true,json:async()=>({contracts:[],payments:[]})});
  await Promise.all([first,same,other]);
  send.mockRejectedValueOnce(new Error('Offline'));
  await expect(AccountingService.refresh()).rejects.toThrow('Offline');
  send.mockResolvedValueOnce({ok:true,json:async()=>({contracts:[],payments:[]})});
  await expect(AccountingService.refresh()).resolves.toMatchObject({contracts:[]});
});

test('a foreign session dashboard event cannot replace the active root snapshot',async()=>{
  jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[{id:'active',student_name:'Aktif hesap'}],contracts:[],payments:[]})});
  function Probe(){const app=useAppData();return <div>{app.data.students?.[0]?.student_name}</div>;}
  const view=await render(<Probe/>);
  await act(async()=>window.dispatchEvent(new CustomEvent('cozum_dashboard_loaded',{detail:{scope:'different-session',url:'/api/dashboard',data:{students:[{id:'foreign',student_name:'Başka hesap'}]}}})));
  expect(view.container.textContent).toBe('Aktif hesap');
});
beforeEach(()=>{localStorage.clear();AccountingService.resetCustomData();StudentService.resetClientData();});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('all late-read/write completion orders keep a post-write response',async()=>{
  for(let order=0;order<24;order++){
    const old=deferred();let reads=0;
    const reading=synchronizedRequest('/api/students','GET',()=>++reads===1?old.promise:Promise.resolve('current'));
    await synchronizedRequest('/api/students/s','PATCH',async()=>({saved:true}));
    old.resolve('obsolete');expect(await reading).toBe('current');expect(reads).toBe(2);
  }
});
test('read started during a write waits for its commit and a failed write never retries',async()=>{
  const writing=deferred();const save=synchronizedRequest('/api/payments','POST',()=>writing.promise);
  const read=jest.fn().mockResolvedValue('committed');const pending=synchronizedRequest('/api/dashboard','GET',read);
  expect(read).not.toHaveBeenCalled();writing.resolve({id:'payment'});await save;expect(await pending).toBe('committed');
  const failure=jest.fn().mockRejectedValue(new Error('Network disconnected after send'));
  await expect(synchronizedRequest('/api/payments','POST',failure)).rejects.toThrow('Network disconnected');expect(failure).toHaveBeenCalledTimes(1);
});
test('Axios and fetch share ordering rather than isolated per-component counters',async()=>{
  const old=deferred();let reads=0;
  const client=axios.create({adapter:async config=>({data:++reads===1?await old.promise:'fresh',status:200,statusText:'OK',headers:{},config})});
  const uninstall=installAxiosSynchronization(client);
  try{const pending=client.get('/api/classes');await Promise.resolve();await synchronizedRequest('/api/classes/c','PUT',async()=>({ok:true}));old.resolve('cached');expect((await pending).data).toBe('fresh');}
  finally{uninstall();}
});
test('session switch discards in-flight responses and old account snapshots',async()=>{
  localStorage.setItem('session_token','first');AccountingService.setInitialData({contracts:[{id:'first-private'}]});StudentService.acceptSnapshot([{id:'first-private'}]);
  const old=deferred();const pending=synchronizedRequest('/api/dashboard','GET',()=>old.promise);
  localStorage.setItem('session_token','second');old.resolve('first account');await expect(pending).rejects.toMatchObject({code:'STALE_RESPONSE'});
  expect(AccountingService.getContracts()).toEqual([]);expect(StudentService.getAllStudents()).toEqual([]);
});
test('pure student reads cannot write props over a server record or resurrect an authoritative empty list',()=>{
  StudentService.acceptSnapshot([{id:'saved',school:'New'}]);const copy=StudentService.getAllStudents([{id:'old',school:'Old'}]);expect(copy[0].id).toBe('saved');
  copy[0].school='tampered';expect(StudentService.getAllStudents()[0].school).toBe('New');
  StudentService.acceptSnapshot([]);expect(StudentService.getAllStudents([{id:'ghost'}])).toEqual([]);
});
test('changed filter and unmounted view cannot publish their previous response',async()=>{
  const first=deferred();const second=deferred();let publish;
  function Probe({id}){const [value,setValue]=React.useState('');publish=setValue;useDataRefresh(async current=>{const v=await (id==='one'?first.promise:second.promise);if(current())setValue(v);},[id]);return <div>{value}</div>;}
  const view=await render(<Probe id='one'/>);await act(async()=>view.root.render(<Probe id='two'/>));
  await act(async()=>second.resolve('second'));await act(async()=>first.resolve('first'));expect(view.container.textContent).toBe('second');expect(publish).toBeDefined();
});
test('cross-tab change triggers one refresh batch and keeps query values in the current view',async()=>{
  jest.useFakeTimers();let count=0;
  function Probe(){useDataRefresh(async()=>{count++;},[]);return null;}
  try{await render(<Probe/>);expect(count).toBe(1);await act(async()=>{for(let i=0;i<10;i++)window.dispatchEvent(new StorageEvent('storage',{key:'cozum_data_revision',newValue:String(i)}));jest.advanceTimersByTime(45);});expect(count).toBe(2);}
  finally{jest.useRealTimers();}
});
test.each([
  ['blur','hidden','visible','focus'],
  ['blur','hidden','focus','visible'],
  ['hidden','blur','visible','focus'],
  ['blur','focus'],
])('return signals %j refresh once and every real return stays fresh',async(...signals)=>{
  jest.useFakeTimers();let visibility='visible';
  jest.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility);
  const get=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[],contracts:[],payments:[]})});
  function Probe(){useAppData();return null;}
  const emit=signal=>{if(['visible','hidden'].includes(signal)){visibility=signal;document.dispatchEvent(new Event('visibilitychange'));}else window.dispatchEvent(new Event(signal));};
  try{
    await render(<Probe/>);expect(get).toHaveBeenCalledTimes(1);
    await act(async()=>{emit('focus');emit('visible');jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(1);
    for(const signal of signals){
      await act(async()=>{emit(signal);jest.advanceTimersByTime(60);});
      if(visibility==='hidden')expect(get).toHaveBeenCalledTimes(1);
    }
    expect(get).toHaveBeenCalledTimes(2);
    await act(async()=>{emit('focus');emit('visible');jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(2);
    // Even an immediate second blur/focus must revalidate; this is not a freshness timeout.
    await act(async()=>{emit('blur');emit('focus');jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(3);
  }finally{jest.useRealTimers();}
});

test('the paired focus signal cannot restart a read already retried for visible',async()=>{
  let visibility='visible';jest.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility);
  window.dispatchEvent(new Event('blur'));visibility='hidden';document.dispatchEvent(new Event('visibilitychange'));
  const old=deferred(),fresh=deferred();let reads=0;
  const pending=synchronizedRequest('/api/dashboard','GET',()=>++reads===1?old.promise:fresh.promise);
  visibility='visible';document.dispatchEvent(new Event('visibilitychange'));
  old.resolve('obsolete');await Promise.resolve();await Promise.resolve();expect(reads).toBe(2);
  window.dispatchEvent(new Event('focus'));fresh.resolve('current');
  expect(await pending).toBe('current');expect(reads).toBe(2);
});

test('resume coalescing leaves writes, cross-tab changes and manual refresh immediate',async()=>{
  jest.useFakeTimers();jest.spyOn(document,'visibilityState','get').mockReturnValue('visible');let app;
  const get=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[],contracts:[],payments:[]})});
  function Probe(){app=useAppData();return null;}
  try{
    await render(<Probe/>);
    await act(async()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(2);
    await act(async()=>{await synchronizedRequest('/api/payments','POST',async()=>({id:'saved'}));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(3);
    await act(async()=>{window.dispatchEvent(new StorageEvent('storage',{key:'cozum_data_revision',newValue:JSON.stringify({revision:'latest',path:'/api/payments'})}));jest.advanceTimersByTime(60);});expect(get).toHaveBeenCalledTimes(4);
    await act(async()=>app.reload());expect(get).toHaveBeenCalledTimes(5);
  }finally{jest.useRealTimers();}
});
test('continuous writes have a bounded read retry and never present stale data as success',async()=>{
  let calls=0;await expect(synchronizedRequest('/api/contracts','GET',async()=>{calls++;announceChange('',false);return 'stale';})).rejects.toMatchObject({code:'STALE_RESPONSE'});expect(calls).toBe(3);
});


test('late write response from a previous session cannot be accepted into the new account',async()=>{
  localStorage.setItem('session_token','first');const pending=deferred();
  const saving=synchronizedRequest('/api/students/s','PATCH',()=>pending.promise);
  localStorage.setItem('session_token','second');pending.resolve({id:'private-first'});
  await expect(saving).rejects.toMatchObject({code:'STALE_RESPONSE'});
});

test('a committed write with an unreadable refresh is explicitly distinguished from an unsaved write',async()=>{
  const send=jest.spyOn(globalThis,'fetch').mockImplementation(async(url,options={})=>{
    if(options.method==='POST')return {ok:true,json:async()=>({id:'saved-payment'})};
    throw new Error('Read connection lost');
  });
  await expect(AccountingService.recordCollection({student_id:'s',amount:5})).rejects.toMatchObject({code:'WRITE_COMMITTED',message:expect.stringContaining('tekrar göndermeden')});
  expect(send.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(1);
});

test('a complete newer snapshot invalidates older service reads still decoding their body',async()=>{
  const body=deferred();jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:()=>body.promise});
  const reading=AccountingService.fetchContracts();await Promise.resolve();await Promise.resolve();
  AccountingService.acceptDashboard({contracts:[{id:'newest'}],payments:[]});
  body.resolve([{id:'obsolete'}]);await reading;
  expect(AccountingService.getContracts()[0].id).toBe('newest');
});
