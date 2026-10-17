export function normalizeDate(value) {
  const text = String(value || "").trim();
  const iso = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text) ? text.slice(0, 10) : text.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, "$3-$2-$1");
  const date = new Date(iso + "T12:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : "";
}

// Installment computation, rounding and uniqueness validation
// Single Source of Truth for contract installments

export function roundKurus(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export function generateContractInstallments(contract, options = {}) {
  const contractId = contract.id || contract.contract_id || "";
  const studentId = contract.student_id || contract.studentId || contract.ogrenciId || "";
  const incomeId = contract.income_id || contract.gelir_id || "";
  const gross = roundKurus(contract.brut_tutar ?? contract.total_fee ?? contract.net_tutar ?? 0);
  const count = Math.max(1, parseInt(contract.taksit_sayisi || contract.installment_count) || 1);
  const startDateStr = options.startDate || contract.sozlesme_tarihi || contract.created_at || new Date().toISOString();
  const baseDate = new Date(normalizeDate(startDateStr) + "T12:00:00Z");
  if (!Number.isFinite(baseDate.getTime())) throw new Error("Geçersiz taksit başlangıç tarihi");

  const baseAmt = Math.floor((gross / count) * 100) / 100;
  const remainder = roundKurus(gross - (baseAmt * count));

  const installments = [];
  const seenNos = new Set();

  for (let i = 1; i <= count; i++) {
    if (seenNos.has(i)) {
      throw new Error(`Duplicate installment_no ${i} detected for contract ${contractId}`);
    }
    seenNos.add(i);

    const isLast = (i === count);
    // Add rounding remainder cents to the last installment so sum === gross to the exact cent
    const amt = isLast ? roundKurus(baseAmt + remainder) : baseAmt;

    const dueDateObj = new Date(baseDate);
    dueDateObj.setUTCDate(1);
    dueDateObj.setUTCMonth(dueDateObj.getUTCMonth() + i - 1);
    dueDateObj.setUTCDate(Math.min(Number(options.dueDay) || 15,new Date(Date.UTC(dueDateObj.getUTCFullYear(),dueDateObj.getUTCMonth()+1,0)).getUTCDate()));
    const dueDate = `${dueDateObj.getUTCFullYear()}-${String(dueDateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(dueDateObj.getUTCDate()).padStart(2, "0")}`;

    const instId = `inst_${contractId || "temp"}_${i}`;

    installments.push({
      id: instId,
      contract_id: contractId,
      income_id: incomeId,
      student_id: String(studentId),
      installment_no: i,
      total_installments: count,
      due_date: dueDate,
      amount: amt,
      paid_amount: 0,
      status: "Bekliyor",
      payment_date: "",
      receipt_no: "",
      created_at: new Date().toISOString(),
    });
  }

  // Final invariant check: sum must exactly equal gross
  const sumAmt = roundKurus(installments.reduce((acc, inst) => acc + inst.amount, 0));
  if (Math.abs(sumAmt - gross) > 0.001) {
    throw new Error(`Installment sum mismatch: expected ${gross}, got ${sumAmt}`);
  }

  return installments;
}

export function validateInstallmentUniqueness(installments) {
  if (!Array.isArray(installments)) return false;
  const set = new Set();
  for (const inst of installments) {
    const key = `${inst.contract_id || ""}_${inst.installment_no}`;
    if (set.has(key)) {
      return false; // Collision detected!
    }
    set.add(key);
  }
  return true;
}
