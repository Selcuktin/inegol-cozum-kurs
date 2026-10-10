import React from "react";
import EdesisVadeTakvimi from "../EdesisVadeTakvimi";

export function ScheduleCalendarTab({
  students = [],
  onSelectStudent = () => {},
  onOpenGelir = () => {},
  onNavigate = () => {}
}) {
  return (
    <div data-testid="schedule-calendar-tab-container">
      <EdesisVadeTakvimi
        students={students}
        onSelectStudent={onSelectStudent}
        onOpenGelir={onOpenGelir}
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default ScheduleCalendarTab;
