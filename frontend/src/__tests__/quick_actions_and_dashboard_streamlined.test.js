import React,{act} from "react";
import { render, cleanup, fireEvent } from "./test_helpers";
import { DashboardPage } from "../pages/DashboardPage";
import { MainApp } from "../App";

afterEach(cleanup);

describe("Sadeleştirilmiş Hızlı İşlemler & Genel Bakış Test Paketi", () => {
  const adminUser = { id: 1, username: "admin", role: "admin", name: "Yönetici" };

  test('mobile drawer locks the background, supports Escape and closes after selecting a module',async()=>{
    const previousMatch=window.matchMedia;
    window.matchMedia=jest.fn(query=>({matches:query.includes('max-width'),addEventListener:jest.fn(),removeEventListener:jest.fn()}));
    const originalOverflow=document.body.style.overflow;
    try{
      const {container}=await render(<MainApp me={adminUser} onLogout={jest.fn()}/>);
      const menu=container.querySelector('[data-testid="mobile-menu"]');
      await fireEvent.click(menu);
      expect(menu.getAttribute('aria-expanded')).toBe('true');
      expect(document.body.style.overflow).toBe('hidden');
      expect(container.querySelector('.main').hasAttribute('inert')).toBe(true);
      expect(container.querySelector('.mobile-bottom-nav').hasAttribute('inert')).toBe(true);
      await act(async()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});
      expect(menu.getAttribute('aria-expanded')).toBe('false');
      expect(document.body.style.overflow).toBe(originalOverflow);
      expect(document.activeElement).toBe(menu);
      await fireEvent.click(menu);
      const parent=container.querySelector('[data-testid="nav-tree-payments"]');
      await fireEvent.click(parent);
      expect(menu.getAttribute('aria-expanded')).toBe('true');
      await fireEvent.click(parent);
      const contract=[...container.querySelectorAll('.nav-nested-item')].find(b=>b.textContent==='Sözleşmeler');
      await fireEvent.click(contract);
      expect(menu.getAttribute('aria-expanded')).toBe('false');
      expect(container.querySelector('.main').hasAttribute('inert')).toBe(false);
      expect(document.body.style.overflow).toBe(originalOverflow);
    }finally{await cleanup();window.matchMedia=previousMatch;}
  });

  test("DashboardPage sade ve öz metrikleri, yaklaşan tahsilatları ve sınıf kontenjanlarını render eder", async () => {
    const mockData = {
      students: [
        {
          id: 101,
          student_name: "Ayşe Melek",
          student_class: "8-A",
          parent_name: "Fatma Melek",
          parent_phone: "05321112233",
          sozlesme_no: "SZL202600101",
          total_fee: 60000,
          paid_amount: 15000,
          installment_count: 6,
          due_date: "2026-10-25"
        }
      ],
      classes: [{ id: 1, name: "8-A", capacity: 20 }],
      payments: [
        {
          id: 201,
          student_id: 101,
          amount: 15000,
          receipt_no: "THS20260001",
          payment_date: "2026-10-01",
          method: "Banka Havalesi"
        }
      ],
      contracts: [
        {
          id: "szl_101",
          sozlesmeNo: "SZL202600101",
          ogrenciAdi: "Ayşe Melek",
          brutTutar: 60000
        }
      ]
    };

    const { container } = await render(
      <DashboardPage
        me={adminUser}
        data={mockData}
        totalCollected={15000}
        totalExpected={60000}
        totalExpenses={0}
        onOpen={jest.fn()}
        onNavigate={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    // 1. Genel Bakış ve KPI'lar
    expect(container.textContent).toContain("Genel Bakış");
    expect(container.textContent).toContain("Bu ay tahsilat");
    expect(container.textContent).toContain("Bekleyen alacak");
    expect(container.textContent).toContain("Sözleşme & Öğrenci");
    expect(container.textContent).toContain("Tahsilat Oranı");

    // 2. Tahsilat Gerçekleşme Durumu
    expect(container.textContent).toContain("Tahsilat Gerçekleşme Durumu");

    // 3. Yaklaşan & Vadesi Gelen Tahsilatlar
    expect(container.textContent).toContain("Yaklaşan & Vadesi Gelen Tahsilatlar");
    expect(container.textContent).toContain("Ayşe Melek");
    expect(container.textContent).toContain("Fatma Melek");
    expect(container.textContent).toContain("05321112233");

    // 4. Sınıf Kontenjanları
    expect(container.textContent).toContain("Sınıf Kontenjanları");
    expect(container.textContent).toContain("8-A");

    // 5. Son Tahsilatlar
    expect(container.textContent).toContain("Son Tahsilatlar");
  });

  test("Hızlı İşlemler dropdown: Sadece Öğrenci Kaydı (Sözleşmeyle Birlikte) kalmıştır, diğerleri kaldırılmıştır", async () => {
    const { container } = await render(<MainApp me={adminUser} onLogout={jest.fn()} />);

    // Hızlı İşlemler butonunu bul ve tıkla
    const quickBtn = container.querySelector(".edesis-quick-actions-btn");
    expect(quickBtn).not.toBeNull();
    await fireEvent.click(quickBtn);

    // Dropdown açıldı mı?
    const dropdown = container.querySelector(".edesis-quick-dropdown");
    expect(dropdown).not.toBeNull();

    // Kontroller:
    // 1. "Hızlı Gider" ve "SINAV & ANALİZ" kaldırılmış olmalı
    expect(dropdown.textContent).not.toContain("Hızlı Gider");
    expect(dropdown.textContent).not.toContain("SINAV & ANALİZ");
    expect(dropdown.textContent).not.toContain("Yeni Sınav");

    // 2. Sadece "Öğrenci Kaydı (Sözleşmeyle Birlikte)" olmalı, ayrı "Yeni Sözleşme" ve "Tahsilat Al" kaldırılmış olmalı
    expect(dropdown.textContent).toContain("Öğrenci Kaydı (Sözleşmeyle Birlikte)");
    expect(dropdown.textContent).not.toContain("Yeni Sözleşme");
    expect(dropdown.textContent).not.toContain("Tahsilat Al");

    // 3. "Ders Programı" kaldırılmış olmalı
    expect(dropdown.textContent).not.toContain("Ders Programı");
  });
});
