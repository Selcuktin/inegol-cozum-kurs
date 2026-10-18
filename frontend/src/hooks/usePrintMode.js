import {useEffect,useState} from 'react';
import {flushSync} from 'react-dom';

export function usePrintMode() {
  const [printing,setPrinting]=useState(false);
  useEffect(()=>{
    // The browser captures the DOM immediately after beforeprint returns.
    const before=()=>flushSync(()=>setPrinting(true));
    const after=()=>setPrinting(false);
    window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);
    return()=>{window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);};
  },[]);
  return printing;
}
