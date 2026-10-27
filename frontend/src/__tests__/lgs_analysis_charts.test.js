import React, { act } from 'react';
import { render, cleanup, fireEvent } from './test_helpers';
import { AnalysisPanel } from '../modules/lgs/components/exam/AnalysisPanel';
import { api, download } from '../modules/lgs/api';

jest.mock('../modules/lgs/api', () => ({api: {get: jest.fn()}, download: jest.fn(), errMsg: e => e.message, num: (v, d=2) => Number(v ?? 0).toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d}), subjectColor: () => '#1e40af'}));
// Only replace sizing, which jsdom cannot measure. The actual chart SVG/data pipeline is exercised.
jest.mock('recharts/lib/component/ResponsiveContainer', () => {
  const React = require('react');
  return {...jest.requireActual('recharts/lib/component/ResponsiveContainer'), ResponsiveContainer: ({children, height}) => React.cloneElement(children, {width: 700, height})};
});

const subjects=[
  {key:'turkce',name:'Türkçe',question_count:20,avg_d:12,avg_y:6,avg_b:2,avg_net:10,max_net:16,sd_net:2,success_pct:50},
  {key:'matematik',name:'Matematik',question_count:20,avg_d:1,avg_y:9,avg_b:10,avg_net:-2,max_net:1,sd_net:1,success_pct:-10},
];
const exam={id:'exam-chart',name:'Grafik Denemesi',date:'2026-10-27',exam_type:{subjects},ai_analysis:'Kayıtlı ayrıntılı yorum.'};
const analysis={count:4,subjects,avg_sd:350,avg_raw:320,avg_total_net:8,max_sd:430,max_raw:420,std_sd:24,
  histogram:[{range:'200-225',count:0},{range:'225-250',count:1},{range:'350-375',count:3}],
  branches:[{branch:'7 A',count:1,avg_net:5,avg_sd:300,avg_raw:280,nets:{turkce:8,matematik:-3}},{branch:'7 B',count:3,avg_net:9,avg_sd:366.67,avg_raw:333.33,nets:{turkce:11,matematik:-2}}],top:[]};
beforeEach(()=>jest.clearAllMocks());
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('four actual charts render stored values, including negative net percentages, without a request or mutation',async()=>{
  const original=JSON.stringify(analysis),view=await render(<AnalysisPanel exam={exam} analysis={analysis}/>);
  for(const id of ['subject-success-chart','subject-answer-chart','score-distribution-chart','branch-comparison-chart'])expect(view.container.querySelector(`[data-testid="${id}"] svg.recharts-surface`)).not.toBeNull();
  const success=view.container.querySelector('[data-testid="subject-success-chart"]');
  expect(success.textContent).toContain('%-10,0');expect(success.textContent).toContain('%50,0');
  expect(success.querySelectorAll('.recharts-bar-rectangle path').length).toBe(2);
  const answers=view.container.querySelector('[data-testid="subject-answer-chart"]');
  expect(answers.textContent).toContain('Doğru');expect(answers.textContent).toContain('Yanlış');expect(answers.textContent).toContain('Boş');
  expect(answers.querySelectorAll('.recharts-bar-rectangle path').length).toBe(6);
  expect(JSON.stringify(analysis)).toBe(original);expect(api.get).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();
});

test('branch metric toggles change the chart and matching institution average locally',async()=>{
  const view=await render(<AnalysisPanel exam={exam} analysis={analysis}/>),panel=view.container.querySelector('[data-testid="branch-comparison-chart"]');
  const choose=label=>[...panel.querySelectorAll('button')].find(b=>b.textContent===label);
  expect(panel.querySelector('[aria-live]').textContent).toContain('8,00');
  expect(panel.querySelector('.recharts-label-list').textContent).toContain('5,0');
  await fireEvent.click(choose('Puan (SS’li)'));
  expect(choose('Puan (SS’li)').getAttribute('aria-pressed')).toBe('true');expect(panel.querySelector('[aria-live]').textContent).toContain('350,00');
  expect(panel.querySelector('.recharts-label-list').textContent).toContain('300,0');
  await fireEvent.click(choose('Puan (SS’siz)'));expect(panel.querySelector('[aria-live]').textContent).toContain('320,00');
  expect(panel.querySelector('.recharts-label-list').textContent).toContain('280,0');expect(api.get).not.toHaveBeenCalled();
});

test('exact values and saved narrative remain available in disclosures; print targets only this analysis',async()=>{
  const print=jest.spyOn(window,'print').mockImplementation(()=>{}),view=await render(<AnalysisPanel exam={exam} analysis={analysis}/>);
  expect([...view.container.querySelectorAll('details')].every(d=>!d.open)).toBe(true);
  expect(view.container.querySelector('[data-testid="subject-stats-table"]').textContent).toContain('-2,00');
  expect(view.container.querySelector('[data-testid="branch-stats-table"]').textContent).toContain('366,67');
  expect(view.container.querySelector('[data-testid="ai-analysis-text"]').textContent).toContain('Kayıtlı ayrıntılı yorum.');
  await fireEvent.click(view.getByRole('button',{name:'Yazdır / PDF Kaydet'}));expect(print).toHaveBeenCalledTimes(1);
  await act(async()=>window.dispatchEvent(new Event('beforeprint')));
  expect(view.container.querySelector('[data-print-root]')).toBe(view.container.querySelector('[data-testid="analysis-panel"]'));
  await act(async()=>window.dispatchEvent(new Event('afterprint')));expect(view.container.querySelector('[data-print-root]')).toBeNull();
});

test('empty results do not fabricate a graph or register a print document',async()=>{
  const view=await render(<AnalysisPanel exam={exam} analysis={{count:0}}/>);
  expect(view.container.textContent).toContain('sonuç yok');expect(view.container.querySelector('svg')).toBeNull();expect(view.container.querySelector('[data-print-document]')).toBeNull();
});
