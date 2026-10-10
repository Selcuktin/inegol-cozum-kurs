// ==========================================================
// EDESIS MODULES BARREL FILE
// ==========================================================

export {
  CAN,
  can,
  openWhatsApp,
  formatDate,
  DEMO_EXAMS_SEED,
  SCORE_COEFFICIENTS,
  calculateSubjectNet,
  estimateScoreAndRank
} from "./modules/shared";

export { ExamsPage } from "./modules/exams/ExamsPage";
export { OfficialEdesisKarneModal } from "./modules/exams/OfficialEdesisKarneModal";
export { EdesisOptikSuiteModal, EdesisOptikModal } from "./modules/exams/EdesisOptikSuiteModal";
export {
  EdesisRaporModal,
  EdesisStudentReportsView,
  EdesisCevapKeyModal,
  EdesisSinifKarsilastirmaModal,
  EdesisExamCalendarView
} from "./modules/exams/ExamSubModals";

export { AttendancePage } from "./modules/academic/AttendancePage";
export { SchedulesPage } from "./modules/academic/SchedulesPage";
export {
  HomeworkPage,
  MentorshipPage,
  EdesisDashboardWidgets
} from "./modules/academic/HomeworkAndMentorship";
