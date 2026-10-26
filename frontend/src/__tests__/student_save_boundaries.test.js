import React,{act} from 'react';
import axios from 'axios';
import {render,cleanup,fireEvent} from './test_helpers';
import {EdesisStudentModal} from '../components/EdesisStudentModal';
import {Modal} from '../components/QuickActionModal';
import AccountingService from '../lib/edesisAccountingService';
import StudentService from '../lib/edesisStudentService';

const student={id:'boundary-student',student_name:'Sentetik öğrenci',school:'İlk okul',total_fee:1000,installment_count:2,extra_fees:'{"ozel_ders":50}',paid_amount:0};
beforeEach(()=>{localStorage.clear();AccountingService.resetCustomData();StudentService.resetClientData();});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('same-student refreshed props cannot silently advance an open draft concurrency baseline',async()=>{
 const patch=jest.spyOn(axios,'patch').mockRejectedValue({response:{status:409,data:{detail:'Kayıt başka bir işlemde değişti.'}}});
 const props={isOpen:true,API:'/api',onClose:jest.fn()};
 const view=await render(<EdesisStudentModal {...props} initialData={student}/>);
 await fireEvent.change(view.container.querySelector('[name="school"]'),{target:{value:'Benim taslağım'}});
 await act(async()=>view.root.render(<EdesisStudentModal {...props} initialData={{...student,school:'Diğer kullanıcının okulu'}}/>));
 await fireEvent.submit(view.container.querySelector('form'));
 expect(patch.mock.calls[0][1]).toEqual({school:'Benim taslağım',_expected:{school:'İlk okul'}});
 expect(view.container.querySelector('[name="school"]').value).toBe('Benim taslağım');
 expect(view.container.textContent).toContain('başka bir işlemde değişti');expect(props.onClose).not.toHaveBeenCalled();
});

test('a newer authoritative snapshot wins over the older student write response and save event',async()=>{
 jest.spyOn(axios,'patch').mockResolvedValue({data:{...student,school:'Benim kaydım'}});
 const latest={...student,school:'Daha yeni kayıt',paid_amount:125};
 jest.spyOn(AccountingService,'refreshAfterWrite').mockResolvedValue({students:[latest]});
 const upsert=jest.spyOn(StudentService,'saveStudent'),events=[];const listener=e=>events.push(e.detail);
 window.addEventListener('cozum_students_updated',listener);
 try{
  const view=await render(<EdesisStudentModal isOpen API='/api' onClose={()=>{}} initialData={student}/>);
  await fireEvent.change(view.container.querySelector('[name="school"]'),{target:{value:'Benim kaydım'}});
  await fireEvent.submit(view.container.querySelector('form'));
  expect(StudentService.getAllStudents()[0]).toMatchObject(latest);expect(upsert).not.toHaveBeenCalled();
  expect(events.at(-1).student).toEqual(latest);
 }finally{window.removeEventListener('cozum_students_updated',listener);}
});

test.each(['total_fee','extra_kaynak'])('editing %s guards the complete original financial inputs and uses canonical extra fees',async(field)=>{
 const original={...student,discount_amount:0,due_date:'2026-10-31'};
 const patch=jest.spyOn(axios,'patch').mockRejectedValue({response:{status:409,data:{detail:'Kayıt başka bir işlemde değişti.'}}});
 const props={isOpen:true,API:'/api',onClose:()=>{}},view=await render(<EdesisStudentModal {...props} initialData={original}/>);
 await fireEvent.click(view.getByRole('button',{name:'Kayıt & Taksit Planı'}));
 await fireEvent.change(view.container.querySelector(`[name="${field}"]`),{target:{value:'1200'}});
 await act(async()=>view.root.render(<EdesisStudentModal {...props} initialData={{...original,installment_count:3,due_date:'2027-01-31',extra_fees:'{"ozel_ders":900}'}}/>));
 await fireEvent.submit(view.container.querySelector('form'));
 const sent=patch.mock.calls[0][1];
 expect(sent._expected).toEqual({total_fee:1000,extra_fees:'{"ozel_ders":50}',discount_amount:0,installment_count:2,due_date:'2026-10-31'});
 expect(sent).not.toHaveProperty('extra_kaynak');
 if(field==='extra_kaynak')expect(sent.extra_fees).toMatchObject({kaynak:1200,ozel_ders:50});
 else expect(sent.total_fee).toBe(1200);
});

test('a failed saved-plan read is visible and cannot leak a previous student plan',async()=>{
 jest.spyOn(AccountingService,'fetchInstallments').mockResolvedValueOnce([{sozlesmeNo:'FIRST',taksitNo:1,taksitTutari:777,vadeTarihi:'2026-10-26'}]).mockRejectedValueOnce(new Error('offline'));
 const props={isOpen:true,API:'/api',onClose:()=>{}},view=await render(<EdesisStudentModal {...props} initialData={{...student,sozlesme_no:'FIRST'}}/>);
 await fireEvent.click(view.getByRole('button',{name:'Kayıt & Taksit Planı'}));expect(view.container.textContent).toContain('777');
 await act(async()=>view.root.render(<EdesisStudentModal {...props} initialData={{...student,id:'other',sozlesme_no:'SECOND'}}/>));
 await fireEvent.click(view.getByRole('button',{name:'Kayıt & Taksit Planı'}));
 expect(view.container.textContent).toContain('Kayıtlı ödeme planı yüklenemedi');expect(view.container.textContent).not.toContain('777');
});

test.each(['edesis','quick'])('%s creation retry reuses its ID; reopening starts a new operation',async(kind)=>{
 const post=jest.spyOn(axios,'post').mockImplementation(async(url,payload)=>({data:{...payload}}));
 jest.spyOn(AccountingService,'refreshAfterWrite').mockRejectedValue(Object.assign(new Error('İşlem sunucuda kaydedildi; tekrar göndermeden yenileyin.'),{code:'WRITE_COMMITTED'}));
 const close=jest.fn();
 const ui=open=>kind==='edesis'?<EdesisStudentModal isOpen={open} API='/api' onClose={close}/>:<Modal type={open?'student':null} API='/api' close={close}/>;
 const view=await render(ui(true));
 await fireEvent.change(view.container.querySelector('[name="student_name"]'),{target:{value:'Sentetik'}});
 await fireEvent.submit(view.container.querySelector('form'));await fireEvent.submit(view.container.querySelector('form'));
 expect(post).toHaveBeenCalledTimes(2);const id=post.mock.calls[0][1].id;
 expect(id).toMatch(/^student-/);expect(post.mock.calls[1][1].id).toBe(id);expect(close).not.toHaveBeenCalled();
 await act(async()=>view.root.render(ui(false)));await act(async()=>view.root.render(ui(true)));
 await fireEvent.change(view.container.querySelector('[name="student_name"]'),{target:{value:'Başka öğrenci'}});
 await fireEvent.submit(view.container.querySelector('form'));
 expect(post.mock.calls[2][1].id).not.toBe(id);
});

test.each(['edesis','quick'])('%s missing post-save record stays absent and reports committed write',async(kind)=>{
 jest.spyOn(axios,'post').mockResolvedValue({data:{...student}});
 jest.spyOn(AccountingService,'refreshAfterWrite').mockResolvedValue({students:[]});
 const close=jest.fn(),view=await render(kind==='edesis'?<EdesisStudentModal isOpen API='/api' onClose={close}/>:<Modal type='student' API='/api' close={close}/>);
 await fireEvent.change(view.container.querySelector('[name="student_name"]'),{target:{value:'Sentetik'}});
 await fireEvent.submit(view.container.querySelector('form'));
 expect(StudentService.getAllStudents()).toEqual([]);expect(close).not.toHaveBeenCalled();
 expect(view.container.textContent).toContain('öğrenci güncel listede bulunamadı');
});
