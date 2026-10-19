import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { MemoryRouter, NavLink, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Exams from './pages/Exams';
import NewExam from './pages/NewExam';
import ExamDetail from './pages/ExamDetail';
import StudentKarne from './pages/StudentKarne';
import Templates from './pages/Templates';
import ExamTypes from './pages/ExamTypes';
import VeliKarne from './pages/VeliKarne';
import './lgs.css';

function Workspace(){
  const navigate=useNavigate(),location=useLocation(),[error,setError]=useState('');
  useEffect(()=>{const go=e=>navigate(e.detail);const fail=e=>setError(e.detail);window.addEventListener('lgs:navigate',go);window.addEventListener('lgs:load-error',fail);return()=>{window.removeEventListener('lgs:navigate',go);window.removeEventListener('lgs:load-error',fail);};},[navigate]);
  useEffect(()=>{sessionStorage.setItem('lgs_route',location.pathname);setError('');},[location.pathname]);
  return <div className="lgs-workspace" data-testid="exam-optical-page-container">
    <Toaster richColors position="top-right"/><nav className="lgs-tabs" aria-label="Deneme analizi">
      {[['/','Genel Bakış'],['/sinavlar','Sınavlar ve Karneler'],['/sinav/yeni','Yeni Sınav Oku'],['/sablonlar','FMT Şablonları'],['/sinav-turleri','Puanlama Ayarları']].map(([to,label])=><NavLink key={to} to={to} end>{label}</NavLink>)}
    </nav>
    {error?<div role="alert" className="lgs-error">{error}<button onClick={()=>window.location.reload()}>Yeniden yükle</button></div>:<Routes>
      <Route path="/" element={<Dashboard/>}/><Route path="/sinavlar" element={<Exams/>}/><Route path="/sinav/yeni" element={<NewExam/>}/>
      <Route path="/sinav/:eid" element={<ExamDetail/>}/><Route path="/sinav/:eid/ogrenci/:rid" element={<StudentKarne/>}/>
      <Route path="/sablonlar" element={<Templates/>}/><Route path="/sinav-turleri" element={<ExamTypes/>}/>
      <Route path="*" element={<Exams/>}/>
    </Routes>}
  </div>;
}
export function PublicKarne({token}){return <MemoryRouter initialEntries={[`/veli/${token}`]}><Routes><Route path="/veli/:token" element={<VeliKarne/>}/></Routes></MemoryRouter>;}
export default function LgsModule(){return <MemoryRouter initialEntries={[sessionStorage.getItem('lgs_route')||'/']}><Workspace/></MemoryRouter>;}
