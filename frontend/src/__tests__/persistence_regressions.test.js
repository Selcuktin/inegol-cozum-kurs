import React,{act} from 'react';
import axios from 'axios';
import {render,cleanup,fireEvent} from './test_helpers';
import {EdesisStudentModal} from '../components/EdesisStudentModal';
import EdesisOgrenciListesi from '../components/EdesisOgrenciListesi';
import EdesisSozlesmeler from '../components/EdesisSozlesmeler';
import AccountingService from '../lib/edesisAccountingService';
import StudentService from '../lib/edesisStudentService';
import {useAppData} from '../hooks/useAppData';
import {synchronizedRequest} from '../lib/dataSync';
jest.mock('../App',()=>({getBackendBaseUrl:()=>''}));

beforeEach(()=>{localStorage.clear();AccountingService.resetCustomData();StudentService.resetClientData();window.location.hash='';});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('student edit submits only touched fields and preserves the stored custom plan',async()=>{
  const student={id:'edit',student_name:'Örnek Öğrenci',school:'Eski okul',total_fee:1000,installment_count:2,extra_fees:'{}',sozlesme_no:'EDIT',due_date:'2026-10-31',paid_amount:200};
  jest.spyOn(AccountingService,'fetchInstallments').mockResolvedValue([{sozlesmeNo:'EDIT',taksitNo:1,taksitTutari:300,vadeTarihi:'2026-10-31'},{sozlesmeNo:'EDIT',taksitNo:2,taksitTutari:700,vadeTarihi:'2027-01-31'}]);
  jest.spyOn(AccountingService,'fetchContracts').mockResolvedValue([]);jest.spyOn(AccountingService,'fetchIncomes').mockResolvedValue([]);
  const patch=jest.spyOn(axios,'patch').mockResolvedValue({data:{...student,school:'Yeni okul'}});
  const view=await render(<EdesisStudentModal isOpen initialData={student} API='/api' onClose={()=>{}}/>);
  await fireEvent.change(view.container.querySelector('[name="school"]'),{target:{value:'Yeni okul'}});
  await fireEvent.click(view.getByRole('button',{name:'Kayıt & Taksit Planı'}));
  expect(view.container.textContent).toContain('300');expect(view.container.textContent).toContain('700');
  await fireEvent.submit(view.container.querySelector('form'));
  expect(patch).toHaveBeenCalledWith('/api/students/edit',{school:'Yeni okul',_expected:{school:'Eski okul'}});
  expect(StudentService.getAllStudents()[0].paid_amount).toBe(200);
});

test('editing a field survives refreshed props and new registration never inherits the previous form',async()=>{
  const student={id:'edit',student_name:'Örnek Öğrenci',school:'Eski okul',total_fee:1000,installment_count:2};
  const props={API:'/api',onClose:()=>{}};
  const view=await render(<EdesisStudentModal {...props} isOpen initialData={student}/>);
  await fireEvent.change(view.container.querySelector('[name="school"]'),{target:{value:'Taslak okul'}});
  await act(async()=>view.root.render(<EdesisStudentModal {...props} isOpen initialData={{...student}}/>));
  expect(view.container.querySelector('[name="school"]').value).toBe('Taslak okul');
  await act(async()=>view.root.render(<EdesisStudentModal {...props} isOpen={false}/>));
  await act(async()=>view.root.render(<EdesisStudentModal {...props} isOpen/>));
  expect(view.container.querySelector('[name="student_name"]').value).toBe('');
  expect(view.container.querySelector('[name="school"]').value).toBe('');
});

test('current period counts exclude cancellations and summer while preserving other-period history',async()=>{
  const students=['active','cancelled','summer','past','renewed'].map(id=>({id,student_name:id,program:id==='past'||id==='renewed'?'2025-2026':id==='summer'?'2026-2027-YAZ':'2026-2027',status:'Aktif'}));
  const contracts=[['active',113,1],['cancelled',113,3],['summer',142,1],['past',40,1],['renewed',40,1],['renewed',113,1]].map(([id,period,status])=>({id:id+period,studentId:id,sozlesmeNo:id+period,ogrenciAdi:id,donemId:period,durum:status,brutTutar:1000}));
  AccountingService.setInitialData({contracts});
  const view=await render(<EdesisOgrenciListesi students={students}/>);
  let names=[...view.container.querySelectorAll('tbody tr')].map(r=>r.textContent).join(' ');
  expect(names).toContain('active');expect(names).toContain('renewed');expect(names).not.toContain('cancelled');expect(names).not.toContain('summer');expect(names).not.toContain('past');
  const period=view.container.querySelector('select');await fireEvent.change(period,{target:{value:'142'}});
  names=[...view.container.querySelectorAll('tbody tr')].map(r=>r.textContent).join(' ');expect(names).toContain('summer');expect(names).not.toContain('active');
  const contractView=await render(<EdesisSozlesmeler contracts={contracts} students={students}/>);
  const option=[...contractView.container.querySelectorAll('option')].find(o=>o.value==='113');
  expect(option.textContent).toContain('2 aktif / 3 toplam');
  await fireEvent.change(option.parentElement,{target:{value:'113'}});
  expect(contractView.container.querySelector('.erp-summary-grid').textContent).toContain('Toplam 3 · İptal 1');
});

test('a slow old dashboard response cannot roll back a newer refresh',async()=>{
  const pending=[];jest.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise(resolve=>pending.push(resolve)));
  let app;function Probe(){app=useAppData();return <div>{app.data.students?.[0]?.student_name}</div>;}
  const view=await render(<Probe/>);
  await act(async()=>{await synchronizedRequest('/api/students/student','PATCH',async()=>({ok:true}));});
  await act(async()=>{pending[0]({ok:true,json:async()=>({students:[{id:'old',student_name:'Eski'}]})});});
  await act(async()=>{pending[1]({ok:true,json:async()=>({students:[{id:'new',student_name:'Yeni'}]})});});
  expect(view.container.textContent).toBe('Yeni');expect(localStorage.getItem('cozum_dashboard_data_v1')).toBeNull();
});
