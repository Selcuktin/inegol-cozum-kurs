import React from "react";
import EdesisOgrenciListesi from "../components/EdesisOgrenciListesi";
import { AuthGuard } from "./AuthGuard";

export function StudentsPage({
  me,
  API,
  search = "",
  setSearch = () => {},
  students = [],
  guardedOpen = () => {},
  setSelected = () => {},
  setPage = () => {},
  setShowGlobalKarne = () => {}
}) {
  const handleSelectOrOpenContract = (st, contract) => {
    const targetNo = contract?.sozlesmeNo || contract?.id || st?.sozlesme_no || st?.id || st?.student_name;
    if (targetNo) {
      try {
        sessionStorage.setItem("cozum_open_contract_no", String(targetNo));
        sessionStorage.setItem("cozum_contract_prev_page", "students");
        if (st?.student_name || contract?.ogrenciAdi) {
          sessionStorage.setItem("cozum_open_contract_student", st?.student_name || contract?.ogrenciAdi);
        }
        if (st?.id || contract?.studentId) {
          sessionStorage.setItem("cozum_open_contract_student_id", String(st?.id || contract?.studentId));
        }
      } catch (e) {
        console.warn("[StudentsPage] sessionStorage error:", e);
      }
    }
    setPage("documents");
  };

  return (
    <AuthGuard me={me} action="page_students">
      <div data-testid="students-page-container">
        <EdesisOgrenciListesi
          API={API}
          globalSearch={search}
          onSearchChange={setSearch}
          students={students}
          onNewStudent={() => guardedOpen("student")}
          onSelectStudent={(st) => handleSelectOrOpenContract(st)}
          onOpenGelir={(st) => handleSelectOrOpenContract(st)}
          onOpenContract={(contract, st) => handleSelectOrOpenContract(st, contract)}
          onOpenKarne={(st) =>
            setShowGlobalKarne({
              student_name: st.student_name,
              student_class: st.student_class,
              score: 450,
              total_net: 65,
              overall_rank: 1,
              class_rank: 1,
              booklet: "A",
              exam: { title: "Kurumsal Deneme" }
            })
          }
          onNavigate={setPage}
        />
      </div>
    </AuthGuard>
  );
}

export default StudentsPage;
