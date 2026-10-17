import {useEffect,useState} from 'react';

// Event bursts from one save coalesce; cleanup prevents a previous screen/filter accepting its reply.
export function useDataRefresh(load,dependencies){
  const [error,setError]=useState(null);
  useEffect(()=>{
    let timer;let request=0;
    const run=async()=>{const version=++request;try{await load(()=>version===request);if(version===request)setError(null);}catch(error){if(version===request)setError(error);}};
    const refresh=()=>{request++;clearTimeout(timer);timer=setTimeout(run,40);};
    run();window.addEventListener('cozum_data_invalidated',refresh);
    return()=>{request++;clearTimeout(timer);window.removeEventListener('cozum_data_invalidated',refresh);};
    // The caller owns the dependency list, just like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },dependencies);
  return error;
}
