import React from 'react';
import axios from 'axios';
import {render,cleanup,fireEvent} from './test_helpers';
import AccountingService from '../lib/edesisAccountingService';
import EdesisVadeTakvimi from '../components/EdesisVadeTakvimi';
import {DashboardPage} from '../pages/DashboardPage';
import {Modal} from '../components/QuickActionModal';

afterEach(async()=>{await cleanup();jest.restoreAllMocks();jest.useRealTimers();});

test('calendar totals include partial collections, preserve period metadata and change with the selected month',async()=>{
  jest.useFakeTimers().setSystemTime(new Date('2026-10-17T09:00:00Z'));
  AccountingService.acceptDashboard({contracts:[],payments:[],incomes:[],installments:[
    {id:'one',contract_id:'c',period_id:113,period_name:'2026-2027',amount:1000,paid_amount:200,due_date:'2026-10-01'},
    {id:'two',contract_id:'c',period_id:113,period_name:'2026-2027',amount:400,paid_amount:50,due_date:'2026-09-01'},
    {id:'history',contract_id:'old',period_id:40,period_name:'2025-2026',amount:9999,paid_amount:9999,due_date:'2026-10-01'}
  ]});
  const records=AccountingService.getInstallments();expect(records[0]).toMatchObject({donemId:113,donemAdi:'2026-2027',vadesiGectiMi:true,gecikmeGunSayisi:16});
  const view=await render(<EdesisVadeTakvimi/>);
  expect(view.container.textContent).toContain('₺200,00 / ₺1.000,00');expect(view.container.textContent).toContain('(%20)');
  await fireEvent.click(view.container.querySelector('[aria-label="Önceki ay"]'));
  expect(view.container.textContent).toContain('₺50,00 / ₺400,00');expect(view.container.textContent).toContain('(%13)');
});

test('dashboard uses recorded remaining debt rather than subtracting historical cash collections',async()=>{
  AccountingService.acceptDashboard({contracts:[],payments:[],installments:[],incomes:[]});
  const view=await render(<DashboardPage data={{students:[],classes:[],contracts:[],payments:[],expenses:[],accounting:{totalRemaining:700}}} totalExpected={1000} totalCollected={4000}/>);
  expect(view.container.textContent).toContain('%30 Tahsil');expect(view.container.textContent).not.toContain('%400');
});

test('retrying the same payment form retains its idempotency identity',async()=>{
  const post=jest.spyOn(axios,'post').mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({data:{id:'saved'}});
  jest.spyOn(AccountingService,'recordCollection').mockResolvedValue({id:'saved'});
  const view=await render(<Modal type='payment' data={{students:[{id:'s',student_name:'Anonymous',sozlesme_no:'C'}]}} API='/api' close={()=>{}}/>);
  await fireEvent.change(view.container.querySelector('[name="student_id"]'),{target:{value:'s'}});
  await fireEvent.change(view.container.querySelector('[name="amount"]'),{target:{value:'100'}});
  await fireEvent.submit(view.container.querySelector('form'));await fireEvent.submit(view.container.querySelector('form'));
  expect(post).toHaveBeenCalledTimes(2);expect(post.mock.calls[0][1].id).toMatch(/^pay_/);expect(post.mock.calls[1][1].id).toBe(post.mock.calls[0][1].id);
});
