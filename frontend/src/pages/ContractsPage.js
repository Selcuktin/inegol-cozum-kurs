import React from "react";
import EdesisSozlesmeler from "../components/EdesisSozlesmeler";
import { AuthGuard } from "./AuthGuard";

export function ContractsPage({
  me,
  contracts = [],
  students = [],
  payments = [],
  onNavigate = () => {},
  setPage
}) {
  const navigate = onNavigate || setPage;

  return (
    <AuthGuard me={me} action="page_documents">
      <div data-testid="contracts-page-container">
        <EdesisSozlesmeler
          contracts={contracts}
          students={students}
          payments={payments}
          onNavigate={navigate}
        />
      </div>
    </AuthGuard>
  );
}

export default ContractsPage;
