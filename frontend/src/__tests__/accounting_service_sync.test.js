import AccountingService from '../lib/edesisAccountingService';

beforeEach(()=>{AccountingService.resetCustomData();localStorage.clear();});
afterEach(()=>jest.restoreAllMocks());

test('contract deletion sends no JSON content type or body and refreshes only after success',async()=>{
  const send=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({ok:true})});
  const refresh=jest.spyOn(AccountingService,'refreshAfterWrite').mockResolvedValue({});
  await AccountingService.deleteContract({id:'contract-to-delete'});
  expect(send).toHaveBeenCalledWith('/api/contracts/contract-to-delete',expect.objectContaining({method:'DELETE'}));
  const options=send.mock.calls[0][1];expect(options.headers['Content-Type']).toBeUndefined();expect(options.body).toBeUndefined();
  expect(refresh).toHaveBeenCalledTimes(1);
});

test('getters cannot overwrite an authoritative snapshot from old props or mutate it by reference',()=>{
  AccountingService.acceptDashboard({contracts:[{id:'current',brut_tutar:1200,durum:1}],payments:[{id:'saved',amount:200}],installments:[],incomes:[]});
  expect(AccountingService.getContracts([],[{id:'old'}])[0].id).toBe('current');
  expect(AccountingService.getCollections([{id:'old-payment'}])[0].id).toBe('saved');
  const copy=AccountingService.getContracts();copy[0].brutTutar=1;expect(AccountingService.getContracts()[0].brutTutar).toBe(1200);
  AccountingService.acceptDashboard({contracts:[],payments:[],installments:[],incomes:[]});
  expect(AccountingService.getContracts([],[{id:'resurrected'}])).toEqual([]);
  expect(AccountingService.getCollections([{id:'resurrected'}])).toEqual([]);
});

test.each(['addNewIncome','deleteContract','updateContract','saveInstallments','recordCollection','cancelCollection'])('%s always uses the real API and reports server failure',async method=>{
  const fetch=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:false,status:409,json:async()=>({detail:'Conflict'})});
  AccountingService.setInitialData({contracts:[{id:'kept',brutTutar:1000}],collections:[{id:'kept-payment',amount:200}]});
  await expect(AccountingService[method](method==='addNewIncome'?{student_id:'s',brutTutar:1000}:method==='recordCollection'||method==='cancelCollection'?{id:'x',student_id:'s',amount:100}:'kept',[])).rejects.toThrow('Conflict');
  expect(fetch).toHaveBeenCalled();expect(AccountingService.getContracts()[0].id).toBe('kept');expect(AccountingService.getCollections()[0].id).toBe('kept-payment');
});

test('failed refresh rejects instead of presenting cached financial data as a successful read',async()=>{
  AccountingService.setInitialData({contracts:[{id:'cached'}]});jest.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Offline'));
  await expect(AccountingService.refresh()).rejects.toThrow('Offline');expect(AccountingService.getContracts()[0].id).toBe('cached');
});

test('core snapshots do not persist business records in localStorage',()=>{
  AccountingService.acceptDashboard({contracts:[{id:'private'}],payments:[{id:'private-payment'}]});
  for(const key of ['cozum_ssot_contracts_v2','cozum_ssot_collections_v2','cozum_dashboard_data_v1'])expect(localStorage.getItem(key)).toBeNull();
});
