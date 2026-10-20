import React,{act} from 'react';
import axios from 'axios';
import {render,cleanup,fireEvent} from './test_helpers';
import {EdesisStudentModal} from '../components/EdesisStudentModal';
import {Modal} from '../components/QuickActionModal';
import {useAppData} from '../hooks/useAppData';
import {synchronizedRequest} from '../lib/dataSync';
import AccountingService from '../lib/edesisAccountingService';
import {MainApp} from '../App';
import StudentService from '../lib/edesisStudentService';

const student={id:'budget-student',student_name:'Sentetik öğrenci',school:'Eski okul',total_fee:1000,installment_count:2,paid_amount:200,extra_fees:'{}',sozlesme_no:'BUDGET'};
const plan=[{id:'budget-installment',contract_id:'budget-contract',sozlesme_no:'BUDGET',installment_no:1,amount:1000,paid_amount:200,due_date:'2026-11-15'}];
function RootSnapshot(){const app=useAppData();return <output data-testid="root-snapshot">{app.data.students?.map(s=>`${s.student_name}:${s.school}`).join('|')}</output>;}
beforeEach(()=>{localStorage.clear();AccountingService.resetCustomData();StudentService.resetClientData();});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test.each(['users','audit','reminders'])('%s page loads its own endpoint without a full financial dashboard',async(page)=>{
 const previousHash=window.location.hash;window.location.hash='#'+page;
 const snapshot={students:[],contracts:[],incomes:[],installments:[],payments:[],classes:[],teachers:[],expenses:[]};
 const fetch=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>snapshot});
 const get=jest.spyOn(axios,'get').mockResolvedValue({data:[]});
 try{
  await render(<MainApp me={{role:'admin',name:'Test'}} onLogout={()=>{}}/>);
  expect(get).toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  await act(async()=>{window.location.hash='#students';window.dispatchEvent(new Event('hashchange'));});
  expect(fetch.mock.calls.filter(([url])=>url==='/api/dashboard')).toHaveLength(1);
  await act(async()=>{window.location.hash='#'+page;window.dispatchEvent(new Event('hashchange'));});
  expect(fetch.mock.calls.filter(([url])=>url==='/api/dashboard')).toHaveLength(1);
  await act(async()=>{window.location.hash='#students';window.dispatchEvent(new Event('hashchange'));});
  expect(fetch.mock.calls.filter(([url])=>url==='/api/dashboard')).toHaveLength(2);
 }finally{await cleanup();window.location.hash=previousHash;}
});

test('global financial search on a deferred system page still loads a fresh snapshot',async()=>{
 const previousHash=window.location.hash;window.location.hash='#users';
 const fetch=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[],contracts:[],payments:[]})});
 jest.spyOn(axios,'get').mockResolvedValue({data:[]});
 try{
  await render(<MainApp me={{role:'admin',name:'Test'}} onLogout={()=>{}}/>);expect(fetch).not.toHaveBeenCalled();
  await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})));
  expect(fetch.mock.calls.filter(([url])=>url==='/api/dashboard')).toHaveLength(1);
 }finally{await cleanup();window.location.hash=previousHash;}
});

test('creating a backup or updating a user does not reread finance; restoring a backup still does',async()=>{
 jest.useFakeTimers();const fetch=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[],contracts:[],payments:[]})});
 try{
  await render(<RootSnapshot/>);expect(fetch).toHaveBeenCalledTimes(1);
  for(const path of ['/api/backup','https://inegol-cozum-kurs.pages.dev/api/backup?manual=1','/api/users/role']){
   await act(async()=>{window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path}}));jest.advanceTimersByTime(60);});
   expect(fetch).toHaveBeenCalledTimes(1);
  }
  await act(async()=>{window.dispatchEvent(new CustomEvent('cozum_data_invalidated',{detail:{path:'/api/backup/restore'}}));jest.advanceTimersByTime(60);});
  expect(fetch).toHaveBeenCalledTimes(2);
 }finally{jest.useRealTimers();}
});

test('student editor replaces three list reads and the root refresh with one authoritative dashboard',async()=>{
 let committed=false;
 const saved={...student,school:'Yeni okul'};
 const fetch=jest.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,json:async()=>url.includes('/installments?')?plan:{students:committed?[saved,{id:'concurrent-student',student_name:'Diğer güncel kayıt'}]:[student],contracts:[],incomes:[],installments:plan,payments:[]}}));
 const patch=jest.spyOn(axios,'patch').mockImplementation((url)=>synchronizedRequest(url,'PATCH',async()=>{committed=true;return {data:saved};}));
 const close=jest.fn(),added=jest.fn();
 const view=await render(<><RootSnapshot/><EdesisStudentModal isOpen initialData={student} API="/api" onClose={close} onStudentAdded={added}/></>);
 fetch.mockClear();
 await fireEvent.change(view.container.querySelector('[name="school"]'),{target:{value:'Yeni okul'}});
 await fireEvent.submit(view.container.querySelector('form'));
 expect(patch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls.map(([url])=>url)).toEqual(['/api/dashboard']);
 expect(view.container.querySelector('[data-testid="root-snapshot"]').textContent).toContain('Yeni okul');
 expect(StudentService.getAllStudents().find(s=>s.id===student.id).paid_amount).toBe(200);
 expect(StudentService.getAllStudents().some(s=>s.id==='concurrent-student')).toBe(true);
 expect(close).toHaveBeenCalledTimes(1);expect(added).toHaveBeenCalledTimes(1);
});

test('quick student registration uses dashboard students without a second student read or reload',async()=>{
 let committed=false;
 const fetch=jest.spyOn(globalThis,'fetch').mockImplementation(async()=>({ok:true,json:async()=>({students:committed?[student]:[],contracts:[],payments:[]})}));
 const post=jest.spyOn(axios,'post').mockImplementation((url)=>synchronizedRequest(url,'POST',async()=>{committed=true;return {data:student};}));
 const studentRead=jest.spyOn(StudentService,'fetchStudents'),reload=jest.fn(),close=jest.fn();
 const view=await render(<><RootSnapshot/><Modal type="student" API="/api" close={close} reload={reload}/></>);
 fetch.mockClear();
 await fireEvent.change(view.container.querySelector('[name="student_name"]'),{target:{value:student.student_name}});
 await fireEvent.submit(view.container.querySelector('form'));
 expect(post).toHaveBeenCalledTimes(1);expect(fetch.mock.calls.map(([url])=>url)).toEqual(['/api/dashboard']);
 expect(studentRead).not.toHaveBeenCalled();expect(reload).not.toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1);
 expect(view.container.querySelector('[data-testid="root-snapshot"]').textContent).toContain(student.student_name);
 expect(StudentService.getAllStudents()[0].id).toBe(student.id);
});

test('quick payment shares its committed refresh and does not ask the root to reload again',async()=>{
 const fetch=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({students:[student],contracts:[],payments:[]})});
 const post=jest.spyOn(axios,'post').mockImplementation((url)=>synchronizedRequest(url,'POST',async()=>({data:{id:'budget-payment'}})));
 const reload=jest.fn(),close=jest.fn();
 const view=await render(<><RootSnapshot/><Modal type="payment" API="/api" data={{students:[student]}} close={close} reload={reload}/></>);
 fetch.mockClear();
 await fireEvent.change(view.container.querySelector('[name="student_id"]'),{target:{value:student.id}});
 await fireEvent.change(view.container.querySelector('[name="amount"]'),{target:{value:'5'}});
 await fireEvent.submit(view.container.querySelector('form'));
 expect(post).toHaveBeenCalledTimes(1);expect(fetch.mock.calls.map(([url])=>url)).toEqual(['/api/dashboard']);
 expect(reload).not.toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1);
});

test.each(['editor','quick'])('%s exposes a committed write with an unreadable snapshot and keeps the form open',async(kind)=>{
 const write=kind==='editor'?'patch':'post';
 const save=jest.spyOn(axios,write).mockResolvedValue({data:{...student,school:'Yeni okul'}});
 jest.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Read connection lost'));
 const close=jest.fn(),reload=jest.fn();
 const initial={...student,sozlesme_no:''};
 const view=await render(kind==='editor'?<EdesisStudentModal isOpen initialData={initial} API="/api" onClose={close}/>:<Modal type="student" API="/api" close={close} reload={reload}/>);
 if(kind==='quick')await fireEvent.change(view.container.querySelector('[name="student_name"]'),{target:{value:student.student_name}});
 else await fireEvent.change(view.container.querySelector('[name="school"]'),{target:{value:'Yeni okul'}});
 await fireEvent.submit(view.container.querySelector('form'));
 expect(save).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();expect(reload).not.toHaveBeenCalled();
 expect(view.container.textContent).toContain('İşlem sunucuda kaydedildi');expect(view.container.textContent).toContain('tekrar göndermeden');
 expect(view.container.querySelector('form')).not.toBeNull();
});
