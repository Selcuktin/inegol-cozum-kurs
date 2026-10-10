// ==========================================================
// EDESIS MODULES - SHARED HELPERS & CONSTANTS
// ==========================================================

export const CAN = {
  createExam: ["kurucu", "mudur", "ogretmen", "sekreter"],
  deleteExam: ["kurucu", "mudur"],
  enterResult: ["kurucu", "mudur", "ogretmen", "sekreter"],
  manageAttendance: ["kurucu", "mudur", "ogretmen", "sekreter"],
  manageSchedules: ["kurucu", "mudur", "ogretmen", "sekreter"],
  manageHomework: ["kurucu", "mudur", "ogretmen"],
  manageMentorship: ["kurucu", "mudur", "ogretmen", "rehberlik"]
};

export function can(role, action) {
  return (CAN[action] || []).includes(role || "kurucu");
}

export const DEMO_EXAMS_SEED = [];

export const SCORE_COEFFICIENTS = {
  TYT: 3.3,
  AYT: 3.0,
  LGS: 4.4,
  YDT: 3.0
};

export function calculateSubjectNet(correct, incorrect, examType = "TYT") {
  const divisor = examType === "LGS" ? 3 : 4;
  return Math.max(0, Math.round(((Number(correct) || 0) - (Number(incorrect) || 0) / divisor) * 100) / 100);
}

export function estimateScoreAndRank(totalNet, examType = "TYT", participantCount = 1) {
  const coeff = SCORE_COEFFICIENTS[examType] || 3.3;
  return {
    score: Math.round((100 + (Number(totalNet) || 0) * coeff) * 100) / 100,
    rank: 1,
    total: participantCount
  };
}

export function openWhatsApp(phone, message) {
  if (!phone) {
    alert("Kayıtlı telefon numarası bulunamadı.");
    return;
  }
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.slice(1);
  if (!clean.startsWith("90")) clean = "90" + clean;
  const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function formatDate(d) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
  } catch {
    return d;
  }
}
