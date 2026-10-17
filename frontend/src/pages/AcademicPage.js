import React, { useState } from "react";
import { Classes } from "../components/Classes";
import { TeachersPage } from "../components/TeachersPage";
import { SchedulesPage } from "../EdesisModules";
import { AuthGuard } from "./AuthGuard";
import { BookOpen, Users, UserCheck, Calendar } from "lucide-react";

export function AcademicPage({
  me,
  mode = "classes",
  classes = [],
  students = [],
  teachers = [],
  API = "",
  reload = () => {},
  guardedOpen = () => {},
  setSelected = () => {},
  onNavigate = () => {}
}) {
  const [currentTab, setCurrentTab] = useState(mode);

  // Sync if prop changed
  const activeTab = mode || currentTab;

  return (
    <div data-testid="academic-page-container">
      {/* Sub navigation bar for quick academic switching */}
      <div 
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid var(--line, #e2e8f0)",
          paddingBottom: "12px",
          overflowX: "auto"
        }}
      >
        <button
          className={`btn small ${activeTab === "classes" ? "" : "secondary"}`}
          onClick={() => { setCurrentTab("classes"); if (onNavigate) onNavigate("classes"); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
        >
          <BookOpen size={15} /> Sınıflar & Şubeler
        </button>
        <button
          className={`btn small ${activeTab === "teachers" ? "" : "secondary"}`}
          onClick={() => { setCurrentTab("teachers"); if (onNavigate) onNavigate("teachers"); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
        >
          <Users size={15} /> Öğretmen Kadrosu
        </button>
        <button
          className={`btn small ${activeTab === "schedules" ? "" : "secondary"}`}
          onClick={() => { setCurrentTab("schedules"); if (onNavigate) onNavigate("schedules"); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
        >
          <Calendar size={15} /> Haftalık Ders Programı
        </button>
      </div>

      {activeTab === "classes" && (
        <AuthGuard me={me} action="page_classes">
          <Classes
            me={me}
            classes={classes}
            students={students}
            onOpen={guardedOpen}
            onSelect={setSelected}
            onNavigate={onNavigate}
            reload={reload}
            API={API}
          />
        </AuthGuard>
      )}

      {activeTab === "teachers" && (
        <AuthGuard me={me} action="page_teachers">
          <TeachersPage
            me={me}
            API={API}
            teachers={teachers}
            onReload={reload}
            onNavigate={onNavigate}
          />
        </AuthGuard>
      )}

      {activeTab === "schedules" && (
        <AuthGuard me={me} action="page_schedules">
          <SchedulesPage
            me={me}
            API={API}
            classes={classes}
          />
        </AuthGuard>
      )}
    </div>
  );
}

export default AcademicPage;
