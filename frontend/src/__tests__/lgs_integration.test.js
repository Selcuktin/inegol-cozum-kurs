import React, {act} from 'react';
import {render,cleanup,fireEvent} from './test_helpers';
import {TextEncoder,TextDecoder} from 'util';
global.TextEncoder=TextEncoder;global.TextDecoder=TextDecoder;
// CRA's Jest 27 resolver predates package subpath exports; exercise the real router core.
jest.mock('react-router-dom',()=>jest.requireActual('react-router'));
jest.mock('../modules/lgs/api',()=>({api:{get:jest.fn(),put:jest.fn(),post:jest.fn(),delete:jest.fn()},loadError:jest.fn(),errMsg:e=>e.message,num:n=>String(n??0),subjectColor:()=> '#123',PENALTIES:[{value:3,label:'3 yanlış'},{value:4,label:'4 yanlış'}]}));
const {MemoryRouter,Routes,Route}=require('react-router-dom');
const {api,loadError}=require('../modules/lgs/api');
const {ExamSettings}=require('../modules/lgs/components/exam/ExamSettings');
const {ResultsTable}=require('../modules/lgs/components/exam/ResultsTable');
const ExamDetail=require('../modules/lgs/pages/ExamDetail').default;
const StudentKarne=require('../modules/lgs/pages/StudentKarne').default;
const Exams=require('../modules/lgs/pages/Exams').default;
const {SharePanel}=require('../modules/lgs/components/exam/SharePanel');
const subject={key:'turkce',name:'Türkçe',question_count:2,coefficient:1,mean:0,sd:1};
const exam={id:'exam',revision:7,name:'Test Denemesi',date:'2026-10-18',penalty:3,exam_type_id:'lgs',template_id:'fmt',exam_type:{name:'LGS',subjects:[subject]},template_fields:[{name:'Cevap',role:'cevap',length:2}],answer_keys:{A:{turkce:'AB'}},mapping:{turkce:{field_index:0,start:1}},booklet_maps:{},student_count:1};
const r={id:'result',student_no:'1',name:'Anonim Öğrenci',branch:'8 A',booklet:'A',rank:1,branch_rank:1,total_net:2,score_sd:500,score_raw:500,subjects:{turkce:{d:2,y:0,b:0,net:2,answers:'AB',key:'AB'}}};
const analysis={count:1,avg_sd:500,avg_raw:500,avg_total_net:2,booklets:['A'],subjects:[{key:'turkce',avg_net:2,success_pct:100}],branches:[],histogram:[],top:[]};
beforeEach(()=>{jest.clearAllMocks();api.get.mockResolvedValue({data:[]});api.put.mockResolvedValue({data:{}});});
afterEach(cleanup);
const wrap=children=><MemoryRouter>{children}</MemoryRouter>;
test('exam opens through one coherent bundle rather than three requests',async()=>{
 api.get.mockResolvedValue({data:{exam,results:[r],analysis}});
 const view=await render(<MemoryRouter initialEntries={['/sinav/exam']}><Routes><Route path="/sinav/:eid" element={<ExamDetail/>}/></Routes></MemoryRouter>);
 expect(api.get).toHaveBeenCalledTimes(1);expect(api.get).toHaveBeenCalledWith('/exams/exam/bundle');expect(view.container.querySelector('[data-testid="analysis-panel"]')).not.toBeNull();
 await act(async()=>view.container.querySelector('[data-testid="tab-results"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,ctrlKey:false})));expect(view.container.textContent).toContain('Anonim Öğrenci');expect(api.get).toHaveBeenCalledTimes(1);
});
test('settings submit displayed revision and user edits; successful save reloads authoritative data',async()=>{
 api.get.mockResolvedValue({data:[{id:'lgs',subjects:[subject]}]});const saved=jest.fn();
 const view=await render(wrap(<ExamSettings exam={exam} booklets={['A']} onSaved={saved}/>));
 await fireEvent.change(view.container.querySelector('[data-testid="answer-key-A-turkce"]'),{target:{value:'BA'}});
 await fireEvent.click(view.container.querySelector('[data-testid="exam-recalculate-button"]'));
 expect(api.put).toHaveBeenCalledWith('/exams/exam',expect.objectContaining({expected_revision:7,answer_keys:{A:{turkce:'BA'}}}));expect(saved).toHaveBeenCalledTimes(1);
});
test('conflicting save never reports completion or replaces displayed authoritative state',async()=>{
 api.get.mockResolvedValue({data:[]});api.put.mockRejectedValue(new Error('Kayıt değişti'));const saved=jest.fn();const view=await render(wrap(<ExamSettings exam={exam} booklets={['A']} onSaved={saved}/>));
 await fireEvent.click(view.container.querySelector('[data-testid="exam-recalculate-button"]'));expect(saved).not.toHaveBeenCalled();expect(view.container.querySelector('[data-testid="exam-recalculate-button"]').disabled).toBe(false);
});
test('large result lists paginate without extra database reads; filtering resets the page',async()=>{
 const rs=Array.from({length:121},(_,i)=>({...r,id:String(i),name:`Anonim ${i}`}));const view=await render(wrap(<ResultsTable exam={exam} results={rs}/>));
 const count=()=>view.container.querySelectorAll('[data-testid^="result-row-"]').length;expect(count()).toBe(50);
 await fireEvent.click([...view.container.querySelectorAll('button')].find(b=>b.textContent==='Sonraki'));expect(view.container.textContent).toContain('Anonim 50');
 await fireEvent.change(view.container.querySelector('[data-testid="results-search-input"]'),{target:{value:'Anonim 120'}});expect(count()).toBe(1);expect(view.container.textContent).toContain('Anonim 120');expect(api.get).not.toHaveBeenCalled();
});
test('student report rejects a result from a different exam',async()=>{
 api.get.mockResolvedValue({data:{exam:{...exam,id:'other'},r,analysis}});
 await render(<MemoryRouter initialEntries={['/sinav/exam/ogrenci/result']}><Routes><Route path="/sinav/:eid/ogrenci/:rid" element={<StudentKarne/>}/></Routes></MemoryRouter>);expect(loadError).toHaveBeenCalledWith(expect.objectContaining({message:'Karne bu sınava ait değil.'}));
});
test('archive appends the next server page and preserves earlier rows',async()=>{
 api.get.mockResolvedValueOnce({data:{items:[exam],next:'cursor'}}).mockResolvedValueOnce({data:{items:[{...exam,id:'second',name:'İkinci Deneme'}],next:null}});
 const view=await render(wrap(<Exams/>));await fireEvent.click([...view.container.querySelectorAll('button')].find(b=>b.textContent==='Daha fazla sınav'));expect(view.container.textContent).toContain('Test Denemesi');expect(view.container.textContent).toContain('İkinci Deneme');expect(api.get).toHaveBeenLastCalledWith('/exams?before=cursor');
});
test('contact save sends its expected revision and uses returned revision on the next edit',async()=>{
 api.get.mockResolvedValue({data:{veli_tel:'05550000000',veli_email:'qa@example.invalid',revision:3,url:''}});api.put.mockResolvedValue({data:{veli_tel:'05550000000',veli_email:'qa@example.invalid',revision:4}});
 const view=await render(wrap(<SharePanel rid="result" result={r} exam={exam}/>));await fireEvent.click(view.container.querySelector('[data-testid="veli-save-button"]'));expect(api.put).toHaveBeenLastCalledWith('/results/result/contact',expect.objectContaining({expected_revision:3}));await fireEvent.click(view.container.querySelector('[data-testid="veli-save-button"]'));expect(api.put).toHaveBeenLastCalledWith('/results/result/contact',expect.objectContaining({expected_revision:4}));
});

test('a report share can be revoked without changing its contact or exam',async()=>{
 api.get.mockResolvedValue({data:{veli_tel:'05550000000',veli_email:'qa@example.invalid',revision:3,url:'https://example.invalid/#veli/old'}});api.delete.mockResolvedValue({data:{ok:true,url:''}});
 const view=await render(wrap(<SharePanel rid="result" result={r} exam={exam}/>));await fireEvent.click(view.container.querySelector('[data-testid="share-revoke-button"]'));
 expect(api.delete).toHaveBeenCalledWith('/results/result/share');expect(view.container.querySelector('[data-testid="share-url"]')).toBeNull();expect(view.container.querySelector('[data-testid="veli-email-input"]').value).toBe('qa@example.invalid');
});
