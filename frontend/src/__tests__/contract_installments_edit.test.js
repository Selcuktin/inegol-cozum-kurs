import AccountingService from '../lib/edesisAccountingService';

describe('Contract and Installment Dynamic Edits', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('increasing installment amount automatically updates contract total (brutTutar)', () => {
    // 1. Synthesize student and contract
    const student = {
      id: 991,
      student_name: 'TEST OGRENCI TAKSIT',
      total_fee: 60000,
      installment_count: 6,
      sozlesme_no: 'SZL202699100'
    };
    const contracts = AccountingService.getContracts([student]);
    const target = contracts.find((c) => c.sozlesmeNo === 'SZL202699100');
    expect(target).toBeDefined();
    expect(target.brutTutar).toBe(60000);

    // 2. Fetch installments
    const insts = AccountingService.getInstallments([student]).filter((t) => t.sozlesmeNo === 'SZL202699100');
    expect(insts.length).toBe(6);
    expect(insts[0].taksitTutari).toBe(10000);

    // 3. User increases first installment from 10,000 to 15,000 (+5,000)
    const modifiedInsts = insts.map((t, idx) => (idx === 0 ? { ...t, taksitTutari: 15000 } : t));
    const saveResult = AccountingService.saveInstallments(target, modifiedInsts);

    expect(saveResult.newBrut).toBe(65000);
    expect(saveResult.count).toBe(6);

    // 4. Verify updated contract has new total
    const updatedContracts = AccountingService.getContracts([student]);
    const updatedTarget = updatedContracts.find((c) => c.sozlesmeNo === 'SZL202699100');
    expect(updatedTarget.brutTutar).toBe(65000);

    // 5. Verify getInstallments reflects the updated installment amount
    const updatedInsts = AccountingService.getInstallments([student]).filter((t) => t.sozlesmeNo === 'SZL202699100');
    expect(updatedInsts[0].taksitTutari).toBe(15000);
    expect(updatedInsts[1].taksitTutari).toBe(10000);
  });

  test('rebalanceInstallments evenly distributes new amount across installments', () => {
    const student = {
      id: 992,
      student_name: 'TEST REBALANCE OGRENCI',
      total_fee: 40000,
      installment_count: 4,
      sozlesme_no: 'SZL202699200'
    };

    AccountingService.getContracts([student]);

    // Rebalance to 50,000 TL in 5 installments
    const result = AccountingService.rebalanceInstallments('SZL202699200', 50000, 5, '2026-10-01');
    expect(result.newBrut).toBe(50000);
    expect(result.count).toBe(5);

    const insts = AccountingService.getInstallments([student]).filter((t) => t.sozlesmeNo === 'SZL202699200');
    expect(insts.length).toBe(5);
    expect(insts[0].taksitTutari).toBe(10000);
    expect(insts[4].taksitTutari).toBe(10000);
  });

  test('updateContract directly updates contract metadata and total', () => {
    const student = {
      id: 993,
      student_name: 'TEST UPDATE CONTRACT',
      total_fee: 50000,
      installment_count: 5,
      sozlesme_no: 'SZL202699300'
    };

    AccountingService.getContracts([student]);

    AccountingService.updateContract('SZL202699300', {
      brutTutar: 72000,
      netTutar: 65454.55,
      taksitSayisi: 8
    });

    const contracts = AccountingService.getContracts([student]);
    const c = contracts.find((x) => x.sozlesmeNo === 'SZL202699300');
    expect(c.brutTutar).toBe(72000);
    expect(c.taksitSayisi).toBe(8);
  });
});
