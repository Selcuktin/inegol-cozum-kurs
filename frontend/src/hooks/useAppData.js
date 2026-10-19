import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import StudentService from "../lib/edesisStudentService";
import { getBackendBaseUrl } from "../components/layout/AuthAndNav";
import AccountingService from "../lib/edesisAccountingService";
import {dataScope} from '../lib/dataSync';

const emptyData=()=>({summary:{},students:[],classes:[],payments:[],expenses:[],exams:[],attendanceToday:[],topRankings:[],todaySchedules:[],contracts:[]});

export const computeEffective = (s) => {
  const total = Number(s?.total_fee || 0);
  let extraSum = 0;
  try {
    const extras = typeof s?.extra_fees === "string" ? JSON.parse(s.extra_fees || "{}") : (s?.extra_fees || {});
    extraSum = Object.values(extras).reduce((a, b) => a + (Number(b) || 0), 0);
  } catch {}
  const discount = Number(s?.discount_amount || 0);
  return { total, extraSum, discount, effective: Math.max(0, total + extraSum - discount) };
};

export function useAppData(initialData = null, enabled = true) {
  const [data, setData] = useState(() => {
    if (initialData) return initialData;
    return emptyData();
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestVersion=useRef(0);
  const accountScope=useRef(dataScope());

  const acceptSnapshot=useCallback(snapshot=>{
    const cleanStudents=StudentService.filterActiveStudents(snapshot.students || []);
    StudentService.acceptSnapshot(cleanStudents);
    setData({...snapshot,students:cleanStudents});
    window.dispatchEvent(new Event("cozum_snapshot_updated"));
    setError(null);
  },[]);

  const reload = useCallback(async () => {
    const version=++requestVersion.current;
    setLoading(true);
    try {
      const baseUrl = typeof getBackendBaseUrl === "function" ? getBackendBaseUrl() : "";
      const apiUrl = `${baseUrl}/api`;
      const snapshot=await AccountingService.refresh(apiUrl);
      if(version!==requestVersion.current)return;
      acceptSnapshot(snapshot);
    } catch (err) {
      if(version!==requestVersion.current)return;
      console.warn("[useAppData] reload error:", err);
      setError(err);
    } finally {
      if(version===requestVersion.current)setLoading(false);
    }
  }, [acceptSnapshot]);

  useEffect(() => {
    if(enabled)reload();else{requestVersion.current++;setLoading(false);setError(null);}
    let timer;
    const invalidate=()=>{requestVersion.current++;};
    const handleSnapshot=event=>{
      const baseUrl=typeof getBackendBaseUrl==="function"?getBackendBaseUrl():"";
      if(event.detail?.scope!==dataScope() || event.detail?.url!==`${baseUrl}/api/dashboard`)return;
      invalidate();clearTimeout(timer);
      acceptSnapshot(event.detail.data);setLoading(false);
    };
    const handleUpdate = (event) => {
      // Exam-only saves do not change the financial dashboard. Session changes still clear it.
      if(accountScope.current===dataScope() && /\/api\/lgs(?:\/|$)/.test(event?.detail?.path||''))return;
      if(accountScope.current!==dataScope()){accountScope.current=dataScope();setData(emptyData());}
      if(!enabled)return;
      invalidate();clearTimeout(timer);timer=setTimeout(reload,50);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cozum_data_invalidated", handleUpdate);
      // Legacy student/accounting events update view caches; API writes already invalidate once.
      window.addEventListener("cozum_dashboard_loaded", handleSnapshot);
      return () => {
        invalidate();clearTimeout(timer);
        window.removeEventListener("cozum_data_invalidated", handleUpdate);
        window.removeEventListener("cozum_dashboard_loaded", handleSnapshot);
      };
    }
  }, [reload,acceptSnapshot,enabled]);

  const totalCollected = useMemo(() => {
    return data.summary?.collected ?? (data.students || []).reduce((a, s) => a + (s.paid_amount || 0), 0);
  }, [data.summary?.collected, data.students]);

  const totalExpected = useMemo(() => {
    return data.accounting?.totalRevenue ?? data.summary?.totalRevenue ?? (data.students || []).reduce((a, s) => a + computeEffective(s).effective, 0);
  }, [data.students,data.accounting?.totalRevenue,data.summary?.totalRevenue]);

  const totalExpenses = useMemo(() => {
    return data.summary?.expenses ?? (data.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);
  }, [data.summary?.expenses, data.expenses]);

  return {
    data,
    setData,
    loading,
    error,
    reload,
    totalCollected,
    totalExpected,
    totalExpenses
  };
}

export default useAppData;
