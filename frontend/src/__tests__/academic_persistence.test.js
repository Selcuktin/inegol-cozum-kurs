import React,{act} from 'react';
import axios from 'axios';
import {render,cleanup,fireEvent} from './test_helpers';
import {AttendancePage} from '../modules/academic/AttendancePage';
import {SchedulesPage} from '../modules/academic/SchedulesPage';
import {HomeworkPage} from '../modules/academic/HomeworkAndMentorship';

const classes=[{id:'c',name:'8-A'}];
const conflict=()=>Object.assign(new Error('Conflict'),{response:{status:409,data:{detail:'Başka kullanıcı değiştirdi'}}});
afterEach(async()=>{await cleanup();jest.restoreAllMocks();});

test('a rejected schedule update keeps its original record and never deletes or recreates it',async()=>{
  const slot={id:'slot',class_id:'c',day_of_week:1,time_slot:'09:00 - 09:45',subject:'Audit Math',teacher_name:'Teacher',room:'Room'};
  jest.spyOn(axios,'get').mockResolvedValue({data:[slot]});const put=jest.spyOn(axios,'put').mockRejectedValue(conflict());
  const remove=jest.spyOn(axios,'delete');const create=jest.spyOn(axios,'post');const alert=jest.spyOn(window,'alert').mockImplementation(()=>{});
  const view=await render(<SchedulesPage API='/api' classes={classes}/>);
  await fireEvent.click(view.container.querySelector('.schedule-item-card'));
  await fireEvent.submit(view.container.querySelector('form'));
  expect(put).toHaveBeenCalledWith('/api/schedules/slot',expect.objectContaining({_expected:{class_id:'c',day_of_week:1,time_slot:'09:00 - 09:45',subject:'Audit Math',teacher_name:'Teacher',room:'Room'}}));
  expect(remove).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();expect(alert).toHaveBeenCalledWith(expect.stringContaining('Başka kullanıcı değiştirdi'));
  expect(view.container.querySelector('form')).not.toBeNull();
});

test('background refresh preserves an unsaved attendance draft and save sends its baseline',async()=>{
  jest.useFakeTimers();
  try{
    const record={student_id:'s',student_name:'Anonymous',student_class:'8-A',status:'geldi',note:'',notified_parent:0};
    const get=jest.spyOn(axios,'get').mockResolvedValue({data:[record]});const post=jest.spyOn(axios,'post').mockRejectedValue(conflict());
    const alert=jest.spyOn(window,'alert').mockImplementation(()=>{});
    const view=await render(<AttendancePage API='/api' classes={classes}/>);
    await fireEvent.click(view.getByRole('button',{name:/^Gelmedi$/}));
    await act(async()=>{window.dispatchEvent(new Event('cozum_data_invalidated'));jest.advanceTimersByTime(50);});
    expect(get).toHaveBeenCalledTimes(1);expect(view.container.querySelector('.gelmedi.active')).not.toBeNull();
    await fireEvent.click(view.getByRole('button',{name:'Yoklamayı Kaydet'}));
    expect(post.mock.calls[0][1].records[0]).toMatchObject({status:'gelmedi',_expected:{status:'geldi',note:'',notified_parent:0}});
    expect(alert).toHaveBeenCalled();expect(view.container.textContent).toContain('Kaydedilmemiş');expect(view.container.textContent).not.toContain('✓ Kaydedildi');
  }finally{jest.useRealTimers();}
});

test('homework switches discard the previous detail response and failed saves keep the draft',async()=>{
  const homework=[{id:'one',title:'First task'},{id:'two',title:'Second task'}];let resolveFirst;
  jest.spyOn(axios,'get').mockImplementation(async url=>{
    if(url==='/api/homework')return {data:homework};
    if(url.includes('/one/'))return new Promise(resolve=>{resolveFirst=resolve;});
    return {data:{students:[{student_id:'second',student_name:'Second student',status:'yapilmadi',note:''}]}};
  });
  jest.spyOn(axios,'post').mockRejectedValue(conflict());const alert=jest.spyOn(window,'alert').mockImplementation(()=>{});
  const view=await render(<HomeworkPage API='/api' classes={classes} students={[]}/>);
  await fireEvent.click(view.getByText('First task'));await fireEvent.click(view.getByText('Second task'));
  await act(async()=>resolveFirst({data:{students:[{student_id:'first',student_name:'Obsolete student',status:'yapildi'}]}}));
  expect(view.container.textContent).toContain('Second student');expect(view.container.textContent).not.toContain('Obsolete student');
  await fireEvent.click(view.getByRole('button',{name:/^Yapıldı$/}));await fireEvent.click(view.getByRole('button',{name:'Teslimleri Kaydet'}));
  expect(axios.post.mock.calls[0][1][0]).toMatchObject({student_id:'second',status:'yapildi',_expected:{status:'yapilmadi',note:''}});
  expect(alert).toHaveBeenCalledWith(expect.stringContaining('Kaydedilemedi'));expect(view.container.querySelector('.geldi.active')).not.toBeNull();
});
