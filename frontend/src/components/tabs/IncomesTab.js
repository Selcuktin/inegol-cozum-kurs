import React from "react";
import EdesisGelirListesi from "../EdesisGelirListesi";

export function IncomesTab({
  students = [],
  onSelectStudent = () => {},
  onOpenGelir = () => {},
  onNavigate = () => {}
}) {
  return (
    <div data-testid="incomes-tab-container">
      <EdesisGelirListesi
        students={students}
        onSelectStudent={onSelectStudent}
        onOpenGelir={onOpenGelir}
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default IncomesTab;
