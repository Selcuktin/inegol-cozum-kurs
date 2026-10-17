import React,{act} from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { GelirDetayModal } from "../components/GelirDetayModal";
import edesisData from "../data/edesisAccountingData.json";
import AccountingService from "../lib/edesisAccountingService";
import EdesisGelirListesi from '../components/EdesisGelirListesi';

describe("GelirDetayModal - Edesis Gelir & Taksit Detay Paritesi", () => {
  beforeEach(() => {
    AccountingService.setInitialData({
      incomes: edesisData.gelirler,
      contracts: edesisData.sozlesmeler,
      installments: edesisData.taksitler,
      collections: edesisData.tahsilatlar
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  test('shows persisted income notes after reopening',async()=>{
    AccountingService.setInitialData({incomes:edesisData.gelirler.map(g=>({...g,notes:'Kalıcı gelir notu'})),contracts:edesisData.sozlesmeler,installments:edesisData.taksitler,collections:edesisData.tahsilatlar});
    const props={isOpen:true,onClose:()=>{},gelirKodu:'GLR202600150'};
    const first=await render(<GelirDetayModal {...props}/>);
    expect(first.container.textContent).toContain('Kalıcı gelir notu');
    await cleanup();
    const second=await render(<GelirDetayModal {...props}/>);
    expect(second.container.textContent).toContain('Kalıcı gelir notu');
  });

  test('cancelled income is labelled separately and excluded from paid and unpaid filters',async()=>{
    AccountingService.setInitialData({contracts:[],installments:[],collections:[],incomes:[
      {id:'income-cancelled',gelirKodu:'GLR-CANCELLED',ogrenciAdiSoyadi:'Örnek iptal',donemId:113,brutTutar:1000,toplamTahsilat:100,kalanAlacak:0,durum:4},
      {id:'income-paid',gelirKodu:'GLR-PAID',ogrenciAdiSoyadi:'Örnek ödeme',donemId:113,brutTutar:100,toplamTahsilat:100,kalanAlacak:0,durum:3}
    ]});
    const {container,getByRole}=await render(<EdesisGelirListesi students={[]}/>);
    const row=[...container.querySelectorAll('tr')].find(r=>r.textContent.includes('GLR-CANCELLED'));
    expect(row.textContent).toContain('İptal Edildi');expect(row.textContent).not.toContain('Tam Ödendi');
    await fireEvent.click(getByRole('button',{name:/Tam Tahsil Edildi/}));
    expect(container.textContent).toContain('GLR-PAID');expect(container.textContent).not.toContain('GLR-CANCELLED');
    await fireEvent.click(getByRole('button',{name:/Açık \/ Kısmi/}));
    expect(container.textContent).not.toContain('GLR-CANCELLED');
  });

  test("renders GelirDetayModal for GLR202600150 (ÖRNEK ÖĞRENCİ) with 100% parity", async () => {
    let closed = false;
    const handleClose = () => { closed = true; };

    const { getByText, getByRole, container } = await render(
      <GelirDetayModal
        isOpen={true}
        onClose={handleClose}
        gelirKodu="GLR202600150"
      />
    );

    // 1. Başlık ve Kod
    expect(getByText("GLR202600150")).toBeTruthy();
    expect(container.textContent).toContain("ÖRNEK ÖĞRENCİ");
    expect(container.textContent).toContain("SZL202600146");

    // 2. Finansal Tutarlar
    expect(container.textContent).toContain("50.000,00");
    expect(container.textContent).toContain("55.000,00");
    expect(container.textContent).toContain("49.500,00");

    // 3. Taksit Planı (10 Taksit)
    expect(getByText("1. Taksit")).toBeTruthy();
    expect(getByText("10. Taksit")).toBeTruthy();
    expect(container.textContent).toContain("Ödendi");
    expect(container.textContent).not.toContain("29 gün erken");

    // 4. Müşteri & İletişim Bilgileri
    expect(getByText("05550000000")).toBeTruthy();
    expect(getByText("veli@example.invalid")).toBeTruthy();
    expect(container.textContent).toContain("4-A");

    // 5. İlerleme Çubuğu ve Sonraki Taksit
    expect(container.textContent).toContain("%10");
    expect(container.textContent).toContain("Sonraki: 30.11.2026");

    // 6. Geri Düğmesi Testi
    const geriBtn = getByRole("button", { name: "Geri" });
    await fireEvent.click(geriBtn);
    expect(closed).toBe(true);
  });

  test("does not invent a contract or a plan from stale student properties", async () => {
    const mockStudent = {
      id: "stu-test-99",
      student_name: "YUSUF EMRE DOĞAN",
      student_class: "8-A",
      total_fee: 60000,
      paid_amount: 12000,
      installment_count: 6,
      student_phone: "05321112233",
      parent_email: "yusuf@test.com"
    };

    const { container } = await render(
      <GelirDetayModal
        isOpen={true}
        onClose={() => {}}
        student={mockStudent}
      />
    );

    expect(container.textContent).toContain("Gelir kaydı bulunamadı");
    expect(container.textContent).not.toContain("60.000,00");
    expect(container.querySelector("table")).toBeNull();
  });

  test('raw dashboard incomes retain aliases and update detail from recorded data only',async()=>{
    const income={id:'g',gelir_kodu:'GLR-AUDIT',contract_id:'c',sozlesme_no:'SZL-AUDIT',student_id:'s',student_name:'Anonymous',brut_tutar:1000,net_tutar:1000,kdv_tutari:0,toplam_tahsilat:200,kalan_alacak:800,period_id:113};
    AccountingService.acceptDashboard({incomes:[income],contracts:[{id:'c',sozlesme_no:'SZL-AUDIT'}],installments:[],payments:[]});
    const view=await render(<GelirDetayModal isOpen onClose={()=>{}} gelirKodu='GLR-AUDIT'/>);
    expect(view.container.textContent).toContain('Anonymous');expect(view.container.textContent).toContain('800,00');
    expect(view.container.textContent).toContain('Tahsilat Geçmişi (0)');
    expect(view.container.textContent).not.toContain('30.11.2026');
    await act(async()=>{AccountingService.acceptDashboard({incomes:[{...income,toplam_tahsilat:300,kalan_alacak:700}],contracts:[{id:'c',sozlesme_no:'SZL-AUDIT'}],installments:[],payments:[{id:'real',contract_id:'c',amount:300}]});window.dispatchEvent(new Event('cozum_snapshot_updated'));});
    expect(view.container.textContent).toContain('700,00');expect(view.container.textContent).toContain('300,00');expect(view.container.textContent).toContain('Tahsilat Geçmişi (1)');
  });

  test('explicit unknown income never falls back to another same-name student or the first record',async()=>{
    const view=await render(<GelirDetayModal isOpen onClose={()=>{}} gelirKodu='MISSING' student={{id:'other',student_name:edesisData.gelirler[0].ogrenciAdiSoyadi}}/>);
    expect(view.container.textContent).toContain('Gelir kaydı bulunamadı');expect(view.container.querySelector('table')).toBeNull();
  });

  test("verifies total accounting summary in edesisAccountingData bundle", () => {
    expect(edesisData.gelirler).toHaveLength(1);
    expect(edesisData.sozlesmeler).toHaveLength(1);
    expect(edesisData.taksitler).toHaveLength(10);
    expect(edesisData.gelirler[0].brutTutar).toBe(edesisData.taksitler.reduce((s,i)=>s+i.taksitTutari,0));
    expect(edesisData.gelirler[0].toplamTahsilat).toBe(edesisData.tahsilatlar.reduce((s,p)=>s+p.tahsilatTutari,0));

  });
});
