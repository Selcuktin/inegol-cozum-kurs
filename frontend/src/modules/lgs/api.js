import axios from "axios";
import { API as MAIN_API } from "../../components/layout/AuthAndNav";
import { installAxiosSynchronization } from "../../lib/dataSync";
export const API = `${MAIN_API}/lgs`;
export const api = axios.create({baseURL:API, withCredentials:true});
installAxiosSynchronization(api);
api.interceptors.request.use(config=>{const token=localStorage.getItem('session_token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
export const loadError=e=>window.dispatchEvent(new CustomEvent('lgs:load-error',{detail:errMsg(e)}));
export const errMsg = e => e?.response?.data?.detail || e?.message || 'İşlem tamamlanamadı.';
export async function download(path, filename){
 const r=await api.get(path,{responseType:'blob'}), url=URL.createObjectURL(r.data), a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export const num = (v, d = 2) =>
  Number(v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const PENALTIES = [
  { value: 3, label: "3 yanlış 1 doğruyu götürür" },
  { value: 4, label: "4 yanlış 1 doğruyu götürür" },
  { value: 0, label: "Yanlış doğruyu götürmez" },
];

export const SUBJECT_COLORS = {
  turkce: "#D9231D", matematik: "#1E40AF", fen: "#059669",
  inkilap: "#D97706", din: "#7C3AED", ingilizce: "#0284C7",
};
const FALLBACK = ["#D9231D", "#1E40AF", "#059669", "#D97706", "#7C3AED", "#0284C7", "#DB2777", "#0F766E"];
export const subjectColor = (key, i = 0) => SUBJECT_COLORS[key] || FALLBACK[i % FALLBACK.length];
