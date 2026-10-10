import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

// Active roots for cleanup
const activeRoots = new Set();

export async function render(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  activeRoots.add({ root, container });

  await act(async () => {
    root.render(ui);
  });

  const helpers = {
    container,
    root,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
      activeRoots.delete({ root, container });
    },
    // Query helpers
    getByText: (textOrRegex) => {
      const match = helpers.queryByText(textOrRegex);
      if (!match) throw new Error(`Unable to find element with text: ${textOrRegex}`);
      return match;
    },
    queryByText: (textOrRegex) => {
      const all = container.querySelectorAll("*");
      for (const el of all) {
        const text = el.textContent || "";
        if (typeof textOrRegex === "string") {
          if (text.includes(textOrRegex) && el.children.length === 0) return el;
        } else if (textOrRegex instanceof RegExp) {
          if (textOrRegex.test(text) && el.children.length === 0) return el;
        }
      }
      // If no leaf found, check elements with direct text
      for (const el of all) {
        const text = el.textContent || "";
        if (typeof textOrRegex === "string" && text.includes(textOrRegex)) return el;
        if (textOrRegex instanceof RegExp && textOrRegex.test(text)) return el;
      }
      return null;
    },
    getAllByText: (textOrRegex) => {
      const all = container.querySelectorAll("*");
      const matched = [];
      for (const el of all) {
        const text = el.textContent || "";
        if (typeof textOrRegex === "string") {
          if (text.includes(textOrRegex) && el.children.length === 0) matched.push(el);
        } else if (textOrRegex instanceof RegExp) {
          if (textOrRegex.test(text) && el.children.length === 0) matched.push(el);
        }
      }
      return matched;
    },
    getByRole: (role, { name } = {}) => {
      const selector = role === "button" ? "button" : role;
      const elements = container.querySelectorAll(selector);
      for (const el of elements) {
        if (!name) return el;
        const text = el.textContent || el.value || "";
        if (typeof name === "string" && text.includes(name)) return el;
        if (name instanceof RegExp && name.test(text)) return el;
      }
      throw new Error(`Unable to find element with role "${role}" and name "${name}"`);
    },
    querySelector: (selector) => container.querySelector(selector),
    querySelectorAll: (selector) => container.querySelectorAll(selector),
  };

  return helpers;
}

export async function cleanup() {
  for (const { root, container } of activeRoots) {
    try {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    } catch (e) {
      // ignore
    }
  }
  activeRoots.clear();
}

export const fireEvent = {
  click: async (element) => {
    if (!element) throw new Error("fireEvent.click called on null element");
    await act(async () => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  },
  change: async (input, { target: { value } }) => {
    if (!input) throw new Error("fireEvent.change called on null input");
    await act(async () => {
      let proto = window.HTMLInputElement.prototype;
      if (input instanceof window.HTMLSelectElement || input.tagName === "SELECT") {
        proto = window.HTMLSelectElement.prototype;
      } else if (input instanceof window.HTMLTextAreaElement || input.tagName === "TEXTAREA") {
        proto = window.HTMLTextAreaElement.prototype;
      }

      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

      if (nativeSetter) {
        nativeSetter.call(input, value);
      } else {
        input.value = value;
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  },
  submit: async (form) => {
    if (!form) throw new Error("fireEvent.submit called on null form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }
};

export async function waitFor(callback, { timeout = 1500, interval = 25 } = {}) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeout) {
    try {
      await act(async () => {});
      const result = callback();
      return result;
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, interval));
    }
  }

  throw lastError || new Error(`waitFor timed out after ${timeout}ms`);
}

// Standard mock data
export const mockClasses = [
  { id: "cls-1", name: "12-SAY-A", grade: "12", branch: "SAY-A" },
  { id: "cls-2", name: "11-EA-B", grade: "11", branch: "EA-B" },
  { id: "cls-3", name: "LGS-8A", grade: "8", branch: "A" }
];

export const mockStudents = [
  {
    id: "stu-1",
    student_name: "Ahmet Yılmaz",
    sozlesme_no: "SZL202600135",
    student_no: "101",
    student_class: "12-SAY-A",
    parent_name: "Mehmet Yılmaz",
    parent_phone: "05321112233",
    parent_tc: "12345678901",
    parent_address: "Kemalpaşa Mah. No:10 İnegöl",
    total_fee: 60000,
    paid_amount: 20000,
    installment_count: 6,
    due_date: "2026-09-15"
  },
  {
    id: "stu-2",
    student_name: "Zeynep Kaya",
    student_no: "102",
    student_class: "11-EA-B",
    parent_name: "Ayşe Kaya",
    parent_phone: "05432223344",
    parent_tc: "98765432109",
    parent_address: "Süleymaniye Mah. No:5 İnegöl",
    total_fee: 45000,
    paid_amount: 45000, // Fully paid
    installment_count: 5,
    due_date: "2026-10-01"
  },
  {
    id: "stu-3",
    student_name: "Can Demir",
    student_no: "103",
    student_class: "LGS-8A",
    parent_name: "Fatma Demir",
    parent_phone: "05553334455",
    parent_tc: "45678901234",
    parent_address: "Yeniceköy Mah. No:8 İnegöl",
    total_fee: 50000,
    paid_amount: 10000,
    installment_count: 5,
    due_date: "2026-08-15"
  }
];

export const mockPayments = [
  {
    id: "pmt-1",
    student_id: "stu-1",
    student_name: "Ahmet Yılmaz",
    amount: 10000,
    method: "Vakıfbank Havale / EFT",
    bank: "T.C. VAKIFLAR BANKASI İNEGÖL ŞB.",
    payment_date: "2026-09-15",
    note: "1. Taksit Vakıfbank havalesi"
  },
  {
    id: "pmt-2",
    student_id: "stu-1",
    student_name: "Ahmet Yılmaz",
    amount: 10000,
    method: "Banka Havale / EFT",
    bank: "T.C. HALKBANK İNEGÖL ŞB.",
    payment_date: "2026-10-01",
    note: "2. Taksit Halkbank eft"
  },
  {
    id: "pmt-3",
    student_id: "stu-2",
    student_name: "Zeynep Kaya",
    amount: 25000,
    method: "Nakit",
    bank: "",
    payment_date: "2026-09-20",
    note: "Nakit elden tahsilat"
  },
  {
    id: "pmt-4",
    student_id: "stu-2",
    student_name: "Zeynep Kaya",
    amount: 20000,
    method: "POS / Kredi Kartı",
    bank: "",
    payment_date: "2026-10-02",
    note: "POS tek çekim"
  },
  {
    id: "pmt-5",
    student_id: "stu-3",
    student_name: "Can Demir",
    amount: 10000,
    method: "Senet",
    bank: "",
    payment_date: "2026-09-10",
    note: "Senet tahsilatı"
  }
];

export const mockExpenses = [
  {
    id: "exp-1",
    title: "Eylül Ayı Derslik Kirası",
    amount: 15000,
    category: "Kira",
    expense_date: "2026-09-01"
  },
  {
    id: "exp-2",
    title: "Matematik Deneme Kitapçıkları",
    amount: 5000,
    category: "Kırtasiye / Yayın",
    expense_date: "2026-09-10"
  }
];

export const mockSchedules = [
  {
    id: "sch-1",
    day_of_week: 1, // Pazartesi
    time_slot: "09:00 - 09:45",
    class_id: "cls-1",
    class_name: "12-SAY-A",
    subject: "Matematik",
    teacher_name: "Ahmet Hoca",
    room: "Derslik 1"
  },
  {
    id: "sch-2",
    day_of_week: 1, // Pazartesi
    time_slot: "10:00 - 10:45",
    class_id: "cls-1",
    class_name: "12-SAY-A",
    subject: "Fizik",
    teacher_name: "Mehmet Hoca",
    room: "Derslik 2"
  },
  {
    id: "sch-3",
    day_of_week: 2, // Salı
    time_slot: "09:00 - 09:45",
    class_id: "cls-2",
    class_name: "11-EA-B",
    subject: "Edebiyat",
    teacher_name: "Ayşe Hoca",
    room: "Derslik 1"
  },
  {
    id: "sch-4",
    day_of_week: 7, // Pazar
    time_slot: "18:05 - 18:50",
    class_id: "cls-3",
    class_name: "LGS-8A",
    subject: "Rehberlik",
    teacher_name: "Zeynep Hoca",
    room: "VIP 1"
  }
];

describe("Test Harness Infrastructure", () => {
  test("test helpers and fixtures initialized correctly", () => {
    expect(render).toBeDefined();
    expect(fireEvent).toBeDefined();
    expect(mockStudents.length).toBeGreaterThan(0);
  });
});
