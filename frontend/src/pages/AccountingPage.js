import React from "react";
import { MuhasebeV2Dashboard } from "../components/MuhasebeV2Dashboard";
import { AuthGuard } from "./AuthGuard";

export function AccountingPage({
  me,
  data = {},
  onOpen = () => {},
  onSelectStudent = () => {},
  API = "",
  reload = () => {},
  activeTab = "dashboard",
  onTabChange = () => {},
  onNavigate = () => {}
}) {
  return (
    <AuthGuard me={me} action="page_payments">
      <div data-testid="accounting-page-container">
        <MuhasebeV2Dashboard
          me={me}
          data={data}
          onOpen={onOpen}
          onSelectStudent={onSelectStudent}
          API={API}
          reload={reload}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onNavigate={onNavigate}
        />
      </div>
    </AuthGuard>
  );
}

export default AccountingPage;
