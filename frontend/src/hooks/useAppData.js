import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import StudentService from "../lib/edesisStudentService";
import { getBackendBaseUrl } from "../App";

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
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("cozum_dashboard_data_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    return {
      summary: {},
      students: [],
      classes: [],
      payments: [],
      expenses: [],
      exams: [],
      attendanceToday: [],
      topRankings: [],
      todaySchedules: [],
      contracts: []
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = typeof getBackendBaseUrl === "function" ? getBackendBaseUrl() : "";
      const apiUrl = `${baseUrl}/api`;
      const r = await axios.get(`${apiUrl}/dashboard`);
      const rawStudents = r.data?.students || [];
      const cleanStudents = StudentService.filterActiveStudents(rawStudents);
      const nextData = {
        ...r.data,
        students: cleanStudents
      };
      setData(nextData);
      setError(null);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("cozum_dashboard_data_v1", JSON.stringify(nextData));
        }
      } catch (e) {}
    } catch (err) {
      console.warn("[useAppData] reload error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const handleUpdate = () => { reload(); };
    if (typeof window !== "undefined") {
      window.addEventListener("cozum_students_updated", handleUpdate);
      window.addEventListener("cozum_accounting_updated", handleUpdate);
      return () => {
        window.removeEventListener("cozum_students_updated", handleUpdate);
        window.removeEventListener("cozum_accounting_updated", handleUpdate);
      };
    }
  }, [reload]);

  const totalCollected = useMemo(() => {
    return data.summary?.collected || (data.students || []).reduce((a, s) => a + (s.paid_amount || 0), 0);
  }, [data.summary?.collected, data.students]);

  const totalExpected = useMemo(() => {
    return (data.students || []).reduce((a, s) => a + computeEffective(s).effective, 0);
  }, [data.students]);

  const totalExpenses = useMemo(() => {
    return data.summary?.expenses || (data.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);
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
