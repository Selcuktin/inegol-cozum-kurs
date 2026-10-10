import React from "react";
import EdesisTahsilatListesi from "../EdesisTahsilatListesi";

export function CollectionsTab({
  students = [],
  payments = [],
  API = "",
  onSelectStudent = () => {},
  onOpenGelir = () => {},
  onNavigate = () => {}
}) {
  return (
    <div data-testid="collections-tab-container">
      <EdesisTahsilatListesi
        students={students}
        payments={payments}
        API={API}
        onSelectStudent={onSelectStudent}
        onOpenGelir={onOpenGelir}
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default CollectionsTab;
