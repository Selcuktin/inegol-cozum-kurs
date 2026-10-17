import {useEffect,useState} from 'react';

// One print document, including nested modals. Mark only siblings of its ancestor path.
const targets=new Set();
let restore=()=>{};
function beforePrint(){
  restore();
  const target=[...document.querySelectorAll('[data-print-document]')].filter(el=>targets.has(el)).pop();
  if(!target)return;
  const marked=[];
  const mark=(el,name)=>{const previous=el.getAttribute(name);el.setAttribute(name,'');marked.push(()=>previous===null?el.removeAttribute(name):el.setAttribute(name,previous));};
  mark(target,'data-print-root');
  for(let current=target;current&&current!==document.body;current=current.parentElement){
    mark(current,'data-print-path');
    for(const sibling of current.parentElement?.children||[])if(sibling!==current)mark(sibling,'data-print-hidden');
  }
  restore=()=>{marked.reverse().forEach(fn=>fn());restore=()=>{};};
}
function afterPrint(){restore();}
export function usePrintTarget(enabled=true){
  const [target,setTarget]=useState(null);
  useEffect(()=>{
    if(!target||!enabled)return;
    if(!targets.size){window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);}
    targets.add(target);target.setAttribute('data-print-document','');
    return()=>{restore();targets.delete(target);target.removeAttribute('data-print-document');if(!targets.size){window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);}};
  },[enabled,target]);
  return setTarget;
}
