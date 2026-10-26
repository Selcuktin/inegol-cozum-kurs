import React,{act} from 'react';
import {render,cleanup,fireEvent} from './test_helpers';
import {NewContractWizardModal} from '../components/contracts/ContractModals';
import AccountingService from '../lib/edesisAccountingService';
import StudentService from '../lib/edesisStudentService';
import EdesisSozlesmeDetay from '../components/EdesisSozlesmeDetay';

const noop=()=>{};
const props={open:true,onClose:jest.fn(),allRegisteredStudents:[{id:'same-name',student_name:'Sentetik öğrenci',parent_name:'Mevcut veli'}],students:[],selectedStudentForContract:null,setSelectedStudentForContract:noop,contractStudentName:'Sentetik öğrenci',setContractStudentName:noop,contractStudentClass:'8-A',setContractStudentClass:noop,contractParentName:'Yeni sözleşmenin velisi',setContractParentName:noop,contractParentPhone:'05300000000',setContractParentPhone:noop,contractAmount:1000,setContractAmount:noop,contractInstallments:2,setContractInstallments:noop,contractDueDate:'2026-11-15',setContractDueDate:noop,setContractsList:noop,showToast:jest.fn()};
beforeEach(()=>{localStorage.clear();AccountingService.resetCustomData();StudentService.resetClientData();props.onClose.mockClear();props.showToast.mockClear();jest.spyOn(window,'alert').mockImplementation(noop);});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('contract wizard locks duplicate submissions and preserves the same operation on a lost response',async()=>{
 let reject;const pending=new Promise((_,fail)=>{reject=fail;});
 const save=jest.spyOn(AccountingService,'addNewIncome').mockReturnValueOnce(pending).mockResolvedValue({contract:{id:'c',sozlesmeNo:'N'}});
 const studentPatch=jest.spyOn(StudentService,'saveStudent');
 const view=await render(<NewContractWizardModal {...props}/>);
 await fireEvent.submit(view.container.querySelector('form'));await fireEvent.submit(view.container.querySelector('form'));
 expect(save).toHaveBeenCalledTimes(1);expect(view.container.querySelector('fieldset').disabled).toBe(true);
 expect([...view.container.querySelectorAll('button')].find(b=>b.textContent==='Vazgeç').closest('fieldset').disabled).toBe(true);
 await act(async()=>reject(new Error('Yanıt kayboldu')));expect(props.onClose).not.toHaveBeenCalled();
 await fireEvent.submit(view.container.querySelector('form'));expect(save).toHaveBeenCalledTimes(2);
 expect(save.mock.calls[1][0].request_id).toBe(save.mock.calls[0][0].request_id);
 expect(save.mock.calls[0][0]).toMatchObject({veliTelefon:'05300000000',ogrenciAdi:'Sentetik öğrenci'});
 expect(studentPatch).not.toHaveBeenCalled();expect(props.onClose).toHaveBeenCalledTimes(1);
 const first=save.mock.calls[0][0].request_id;
 await act(async()=>view.root.render(<NewContractWizardModal {...props} open={false}/>));
 await act(async()=>view.root.render(<NewContractWizardModal {...props}/>));
 await fireEvent.submit(view.container.querySelector('form'));expect(save.mock.calls.at(-1)[0].request_id).not.toBe(first);
});

test('contract service forwards retry identity and actual contract parent information',async()=>{
 const send=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({id:'c',sozlesmeNo:'N'})});
 jest.spyOn(AccountingService,'refreshAfterWrite').mockResolvedValue({});
 await AccountingService.addNewIncome({request_id:'operation',ogrenciAdi:'Sentetik',veliAdi:'Veli',veliTelefon:'05300000000',ogrenciNo:'24',brutTutar:1000,taksitSayisi:2,vadeTarihi:'2026-11-15'});
 expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({request_id:'operation',parent_name:'Veli',parent_phone:'05300000000',student_no:'24'});
});

test('a later student snapshot cannot be replaced by a delayed student write response',async()=>{
 let resolve;const pending=new Promise(done=>{resolve=done;});jest.spyOn(globalThis,'fetch').mockReturnValue(pending);
 const saving=StudentService.saveStudent({id:'s',school:'Benim kaydım'});
 StudentService.acceptSnapshot([{id:'s',student_name:'Sentetik',school:'Daha yeni kayıt'}]);
 resolve({ok:true,json:async()=>({id:'s',school:'Benim kaydım'})});await saving;
 expect(StudentService.getAllStudents()[0].school).toBe('Daha yeni kayıt');
});

test('successful contract collection uses its authoritative snapshot without a fallible second plan request',async()=>{
 const contract={id:'c',sozlesmeNo:'N',student_id:'s',ogrenciAdi:'Sentetik',brutTutar:1000,durum:1};
 AccountingService.setInitialData({contracts:[contract],installments:[{id:'i',contractId:'c',sozlesmeNo:'N',taksitNo:1,taksitTutari:1000,tahsilEdilen:0,kalanTutar:1000,vadeTarihi:'2026-11-15'}]});
 jest.spyOn(AccountingService,'recordCollection').mockResolvedValue({id:'p'});
 const plan=jest.spyOn(AccountingService,'fetchInstallments').mockRejectedValue(new Error('Redundant read failed'));
 const view=await render(<EdesisSozlesmeDetay contract={contract}/>);
 await fireEvent.click(view.container.querySelector('button[title="Taksiti Tahsil Et (Onay Popupı Açılır)"]'));
 await fireEvent.click(view.getByRole('button',{name:'Tahsilatı Onayla'}));
 expect(plan).not.toHaveBeenCalled();expect(window.alert).not.toHaveBeenCalled();expect(view.container.textContent).toContain('tahsil edildi ve kaydedildi');
});
