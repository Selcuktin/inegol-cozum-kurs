import React,{act} from 'react';
import {render,cleanup,fireEvent} from './test_helpers';
import {TextEncoder,TextDecoder} from 'util';
global.TextEncoder=TextEncoder;global.TextDecoder=TextDecoder;
jest.mock('react-router-dom',()=>jest.requireActual('react-router'));
jest.mock('../modules/lgs/api',()=>({api:{get:jest.fn(),post:jest.fn()},loadError:jest.fn(),errMsg:e=>e.message,PENALTIES:[{value:3,label:'3 yanlış'}]}));
// Native controls isolate the file workflow from Radix's pointer handling in jsdom.
jest.mock('../components/ui/select',()=>({Select:({value,onValueChange,children})=><select value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectTrigger:()=>null,SelectValue:()=>null,SelectContent:({children})=><>{children}</>,SelectItem:({value,children})=><option value={value}>{children}</option>}));
const {MemoryRouter}=require('react-router-dom'),{api}=require('../modules/lgs/api'),NewExam=require('../modules/lgs/pages/NewExam').default;
const type={id:'type',name:'Test',subjects:[{key:'x',name:'Ders',question_count:2}],default_penalty:3},template={id:'template',name:'Şablon'};
const payload=name=>({file_name:name,text:'AA',total:1,students:[],key_rows:[],booklets:['A'],mapping:{x:{field_index:0,start:1}},answer_fields:[{index:0,length:2,name:'Ders'}]});
const choose=async(input,file)=>{Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));};
beforeEach(()=>{jest.clearAllMocks();api.get.mockImplementation(url=>Promise.resolve({data:url==='/exam-types'?[type]:[template]}));});
afterEach(cleanup);
async function open(){const view=await render(<MemoryRouter><NewExam/></MemoryRouter>);await fireEvent.change(view.container.querySelector('[data-testid="exam-name-input"]'),{target:{value:'Deneme'}});await fireEvent.change(view.container.querySelectorAll('select')[1],{target:{value:'template'}});await fireEvent.click(view.container.querySelector('[data-testid="wizard-next-button"]'));return view;}
test('the last selected optical file wins even if the first parse finishes last',async()=>{
 const pending=[];api.post.mockImplementation(()=>new Promise(resolve=>pending.push(resolve)));
 const view=await open(),input=view.container.querySelector('[data-testid="data-file-input"]');
 await choose(input,new File(['AA'],'old.txt'));await choose(input,new File(['AA'],'new.txt'));
 await act(async()=>pending[1]({data:payload('new.txt')}));expect(view.container.textContent).toContain('new.txt');
 await act(async()=>pending[0]({data:payload('old.txt')}));expect(view.container.textContent).toContain('new.txt');expect(view.container.textContent).not.toContain('old.txt');
});
test('a failed replacement parse cannot leave the previous file eligible for saving',async()=>{
 api.post.mockResolvedValueOnce({data:payload('old.txt')}).mockRejectedValueOnce(new Error('Invalid file'));
 const view=await open(),input=view.container.querySelector('[data-testid="data-file-input"]');
 await choose(input,new File(['AA'],'old.txt'));expect(view.container.querySelector('[data-testid="wizard-next-button"]').disabled).toBe(false);
 await choose(input,new File(['X'],'bad.txt'));expect(view.container.textContent).not.toContain('old.txt');expect(view.container.querySelector('[data-testid="wizard-next-button"]').disabled).toBe(true);
});
