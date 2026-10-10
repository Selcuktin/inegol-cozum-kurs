import React, { useState } from "react";
import { ExamsPage, EdesisOptikModal, OfficialEdesisKarneModal } from "../EdesisModules";
import { AuthGuard } from "./AuthGuard";

export function ExamOpticalPage({
  me,
  API = "",
  students = [],
  classes = [],
  showOptikModal = false,
  onCloseOptikModal = () => {},
  showKarneModal = null,
  onCloseKarneModal = () => {}
}) {
  const [localOptikOpen, setLocalOptikOpen] = useState(false);
  const [localKarneStudent, setLocalKarneStudent] = useState(null);

  const isOptikOpen = showOptikModal || localOptikOpen;
  const karneData = showKarneModal || localKarneStudent;

  return (
    <AuthGuard me={me} action="page_exams">
      <div data-testid="exam-optical-page-container">
        <ExamsPage
          me={me}
          API={API}
          students={students}
          classes={classes}
          onOpenOptik={() => setLocalOptikOpen(true)}
          onOpenKarne={(st) => setLocalKarneStudent(st)}
        />

        {isOptikOpen && (
          <EdesisOptikModal
            isOpen={true}
            onClose={() => {
              setLocalOptikOpen(false);
              onCloseOptikModal();
            }}
            API={API}
            classes={classes}
          />
        )}

        {karneData && (
          <OfficialEdesisKarneModal
            isOpen={true}
            onClose={() => {
              setLocalKarneStudent(null);
              onCloseKarneModal();
            }}
            studentData={karneData}
          />
        )}
      </div>
    </AuthGuard>
  );
}

export default ExamOpticalPage;
