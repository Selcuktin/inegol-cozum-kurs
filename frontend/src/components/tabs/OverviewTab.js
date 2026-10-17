import React from "react";
import { EdesisMuhasebeDashboard } from "../EdesisMuhasebeDashboard";

export function OverviewTab({
  onOpen = () => {},
  onSelectStudent = () => {},
  onNavigateTab = () => {},
  onRefresh = () => {},
  monthlyTrends = [],
  agingSummary = {},
  incomeCategoryData = [],
  paymentMethodData = [],
  totalExpenses = 0, payments = [], expenses = [], netLiquidBalance = 0, installmentPlans = [],
  totalCollected = 0,
  totalContractRevenue = 0,
  totalRemaining = 0,
  collectionRate = 0,
  totalOverdueDebt = 0,
  overdueStudents = [],
  handleBulkWhatsAppReminder = () => {},
  fmtMoney = (n) => String(n || 0)
}) {
  return (
    <div data-testid="overview-tab-container">
      <EdesisMuhasebeDashboard
        onOpen={onOpen}
        onSelectStudent={onSelectStudent}
        onNavigateTab={onNavigateTab}
        onRefresh={onRefresh}
        monthlyTrends={monthlyTrends}
        agingSummary={agingSummary}
        incomeCategoryData={incomeCategoryData}
        paymentMethodData={paymentMethodData}
        totalExpenses={totalExpenses} payments={payments} expenses={expenses} netLiquidBalance={netLiquidBalance} installmentPlans={installmentPlans}
        totalCollected={totalCollected}
        totalContractRevenue={totalContractRevenue}
        totalRemaining={totalRemaining}
        collectionRate={collectionRate}
        totalOverdueDebt={totalOverdueDebt}
        overdueStudents={overdueStudents}
        handleBulkWhatsAppReminder={handleBulkWhatsAppReminder}
        fmtMoney={fmtMoney}
      />
    </div>
  );
}

export default OverviewTab;
