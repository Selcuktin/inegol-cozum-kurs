import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
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

export function useAppData(initialData = null) {
  const [data, setData] = useState(() => {
    if (initialData) return initialData;
    return emptyData();
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestVersion=useRef(0);
  const accountScope=useRef(dataScope());

  const reload = useCallback(async () => {
    const version=++requestVersion.current;
    setLoading(true);
    try {
      const baseUrl = typeof getBackendBaseUrl === "function" ? getBackendBaseUrl() : "";
      const apiUrl = `${baseUrl}/api`;
      const r=await axios.get(`${apiUrl}/dashboard`);
      if(version!==requestVersion.current)return;
      const rawStudents = r.data?.students || [];
      const cleanStudents = StudentService.filterActiveStudents(rawStudents);
      const nextData = {
        ...r.data,
        students: cleanStudents
      };
      StudentService.acceptSnapshot(cleanStudents);
      AccountingService.acceptDashboard(nextData);
      setData(nextData);
      window.dispatchEvent(new Event("cozum_snapshot_updated"));
      setError(null);
    } catch (err) {
      if(version!==requestVersion.current)return;
      console.warn("[useAppData] reload error:", err);
      setError(err);
    } finally {
      if(version===requestVersion.current)setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    let timer;
    const invalidate=()=>{requestVersion.current++;};
    const handleUpdate = (event) => {
      // Exam-only saves do not change the financial dashboard. Session changes still clear it.
      if(accountScope.current===dataScope() && /\/api\/lgs(?:\/|$)/.test(event?.detail?.path||''))return;
      if(accountScope.current!==dataScope()){accountScope.current=dataScope();setData(emptyData());}
      invalidate();clearTimeout(timer);timer=setTimeout(reload,50);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cozum_data_invalidated", handleUpdate);
      window.addEventListener("cozum_students_updated", handleUpdate);
      window.addEventListener("cozum_accounting_updated", handleUpdate);
      return () => {
        invalidate();clearTimeout(timer);
        window.removeEventListener("cozum_data_invalidated", handleUpdate);
        window.removeEventListener("cozum_students_updated", handleUpdate);
        window.removeEventListener("cozum_accounting_updated", handleUpdate);
      };
    }
  }, [reload]);

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
