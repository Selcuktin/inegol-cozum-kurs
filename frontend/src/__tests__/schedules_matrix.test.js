import React from "react";
import axios from "axios";
import { SchedulesPage } from "../EdesisModules";
import {
  render,
  cleanup,
  fireEvent,
  waitFor,
  mockClasses,
  mockSchedules
} from "./test_helpers";

jest.mock("axios");

describe("R3: Haftalık Ders Programı Matrisi (schedules_matrix.test.js)", () => {
  const API = "/api";
  let originalConfirm;
  let originalAlert;
  let originalPrint;

  beforeEach(() => {
    jest.clearAllMocks();
    originalConfirm = window.confirm;
    originalAlert = window.alert;
    originalPrint = window.print;
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    window.print = jest.fn();

    axios.get.mockResolvedValue({ data: [...mockSchedules] });
    axios.post.mockResolvedValue({ data: { id: "sch-new-1" } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(async () => {
    window.confirm = originalConfirm;
    window.alert = originalAlert;
    window.print = originalPrint;
    await cleanup();
  });

  /* =====================================================================
   * TIER 1: UNIT & CORE RENDERING (F1, F2, F3, F4)
   * ===================================================================== */
  describe("Tier 1: Core 7-Column Layout & Time Slot Grid", () => {
    test("T1.1: renders 7 day column headers (Pazartesi to Pazar) by default", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".timetable-grid")).not.toBeNull();
      });

      const dayHeaders = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
      dayHeaders.forEach(day => {
        expect(container.textContent).toContain(day);
      });
    });

    test("T1.2: renders header cell for time column (Saat / Gün) with sticky class", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".timetable-header-cell.time-col")).not.toBeNull();
      });

      const timeHeader = container.querySelector(".timetable-header-cell.time-col");
      expect(timeHeader.textContent).toBe("Saat / Gün");
    });

    test("T1.3: renders all 10 standard time slot rows from 09:00 to 18:50", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelectorAll(".timetable-time-cell").length).toBe(10);
      });

      const expectedSlots = [
        "09:00 - 09:45",
        "10:00 - 10:45",
        "11:00 - 11:45",
        "12:00 - 12:45",
        "13:30 - 14:15",
        "14:25 - 15:10",
        "15:20 - 16:05",
        "16:15 - 17:00",
        "17:10 - 17:55",
        "18:05 - 18:50"
      ];

      const renderedTimeCells = Array.from(container.querySelectorAll(".timetable-time-cell"))
        .map(el => el.textContent.trim());

      expectedSlots.forEach(slot => {
        expect(renderedTimeCells.some(t => t.includes(slot))).toBe(true);
      });
    });

    test("T1.4: displays existing scheduled lessons inside correct grid cells", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("Matematik");
        expect(container.textContent).toContain("Ahmet Hoca");
      });

      const cards = container.querySelectorAll(".schedule-item-card");
      expect(cards.length).toBeGreaterThanOrEqual(4);
      expect(container.textContent).toContain("Fizik");
      expect(container.textContent).toContain("Edebiyat");
      expect(container.textContent).toContain("Rehberlik");
    });

    test("T1.5: renders timetable container with horizontal scroll layout", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const timetableContainer = container.querySelector(".timetable-container");
      expect(timetableContainer).not.toBeNull();
      expect(timetableContainer.classList.contains("panel")).toBe(true);
      expect(container.querySelector(".timetable-grid")).not.toBeNull();
    });

    test("T1.6: clicking empty cell opens Add Lesson modal with pre-selected day and slot", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelectorAll(".timetable-slot-cell.clickable-cell").length).toBe(70);
      });

      // Find an empty cell cue
      const emptyCue = container.querySelector(".slot-empty-cue");
      const emptyCell = emptyCue.closest(".timetable-slot-cell");

      await fireEvent.click(emptyCell);

      expect(container.textContent).toContain("Programa Ders Ekle");
      expect(container.textContent).toContain("HIZLI DERS PLANLAMA");
      expect(container.querySelector("form")).not.toBeNull();
    });

    test("T1.7: clicking existing lesson card opens Edit Lesson modal with lesson details", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".schedule-item-card")).not.toBeNull();
      });

      const card = container.querySelector(".schedule-item-card");
      await fireEvent.click(card);

      expect(container.textContent).toContain("Ders Saati Düzenle");
      expect(container.textContent).toContain("DERS GÜNCELLEME");
    });

    test("T1.8: clicking card delete button triggers deletion confirmation", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".schedule-del-btn")).not.toBeNull();
      });

      const delBtn = container.querySelector(".schedule-del-btn");
      await fireEvent.click(delBtn);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("Bu ders saatini programdan silmek istediğinize emin misiniz?")
      );
      expect(axios.delete).toHaveBeenCalledWith(`${API}/schedules/sch-1`);
    });
  });

  /* =====================================================================
   * TIER 2: EDGE CASES, BOUNDARIES & VALIDATIONS
   * ===================================================================== */
  describe("Tier 2: Edge Cases, Filtering & Conflict Warnings", () => {
    test("T2.1: handles empty schedule response gracefully without crash", async () => {
      axios.get.mockResolvedValueOnce({ data: [] });

      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("0 Ders Saati");
      });

      const emptyCues = container.querySelectorAll(".slot-empty-cue");
      expect(emptyCues.length).toBe(70); // 7 days * 10 slots
    });

    test("T2.2: switches view from 7-day matrix to daily vertical flow", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".timetable-grid")).not.toBeNull();
      });

      const dailyBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Günlük Akış"));
      expect(dailyBtn).toBeDefined();

      await fireEvent.click(dailyBtn);

      expect(container.querySelector(".schedule-daily-view")).not.toBeNull();
      expect(container.querySelector(".schedule-day-tabs")).not.toBeNull();
      expect(container.querySelector(".timetable-grid")).toBeNull();
    });

    test("T2.3: can switch back from daily flow to 7-day matrix view", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const dailyBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Günlük Akış"));
      await fireEvent.click(dailyBtn);
      expect(container.querySelector(".schedule-daily-view")).not.toBeNull();

      const matrixBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("7 Günlük Haftalık Matris"));
      await fireEvent.click(matrixBtn);

      expect(container.querySelector(".timetable-grid")).not.toBeNull();
      expect(container.querySelector(".schedule-daily-view")).toBeNull();
    });

    test("T2.4: teacher conflict detection blocks save when user declines confirmation", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".timetable-grid")).not.toBeNull();
      });

      // Click Add button
      const addBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Hızlı Ders Ekle"));
      await fireEvent.click(addBtn);

      // Select Day 1 (Pazartesi), slot "09:00 - 09:45", teacher "Ahmet Hoca"
      const selects = container.querySelectorAll("select");
      const daySelect = selects[2]; // In modal
      const slotSelect = selects[3];
      const teacherInput = container.querySelector("input[placeholder*='Osman']");

      await fireEvent.change(daySelect, { target: { value: "1" } });
      await fireEvent.change(slotSelect, { target: { value: "09:00 - 09:45" } });
      await fireEvent.change(teacherInput, { target: { value: "Ahmet Hoca" } });

      // Decline confirmation
      window.confirm.mockReturnValueOnce(false);

      const submitBtn = container.querySelector("form button[type='submit']");
      await fireEvent.click(submitBtn);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("ÖĞRETMEN ÇAKIŞMA UYARISI")
      );
      expect(axios.post).not.toHaveBeenCalled();
    });

    test("T2.5: room conflict detection warns user if same room is double booked", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const addBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Hızlı Ders Ekle"));
      await fireEvent.click(addBtn);

      // sch-1 is at Day 1, 09:00 - 09:45, in "Derslik 1", for cls-1
      // Try adding for cls-2 at same day, slot and room
      const selects = container.querySelectorAll("select");
      const daySelect = selects[2];
      const slotSelect = selects[3];
      const classSelect = selects[4];
      const roomInput = container.querySelector("input[placeholder*='Derslik 1, VIP']");
      const teacherInput = container.querySelector("input[placeholder*='Osman']");

      await fireEvent.change(daySelect, { target: { value: "1" } });
      await fireEvent.change(slotSelect, { target: { value: "09:00 - 09:45" } });
      await fireEvent.change(classSelect, { target: { value: "cls-2" } });
      await fireEvent.change(roomInput, { target: { value: "Derslik 1" } });
      await fireEvent.change(teacherInput, { target: { value: "Farklı Hoca" } });

      window.confirm.mockReturnValueOnce(false);

      const submitBtn = container.querySelector("form button[type='submit']");
      await fireEvent.click(submitBtn);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("DERSLİK ÇAKIŞMA UYARISI")
      );
      expect(axios.post).not.toHaveBeenCalled();
    });

    test("T2.6: filter by teacher hides cards of other teachers", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain("Ahmet Hoca");
        expect(container.textContent).toContain("Mehmet Hoca");
      });

      const teacherSelect = container.querySelectorAll("select")[1]; // Teacher filter
      await fireEvent.change(teacherSelect, { target: { value: "Ahmet Hoca" } });

      const renderedCards = Array.from(container.querySelectorAll(".schedule-item-card"));
      expect(renderedCards.some(c => c.textContent.includes("Ahmet Hoca"))).toBe(true);
      expect(renderedCards.some(c => c.textContent.includes("Mehmet Hoca"))).toBe(false);
    });
  });

  /* =====================================================================
   * TIER 3: PAIRWISE INTERACTIONS & STATE TRANSITIONS
   * ===================================================================== */
  describe("Tier 3: Pairwise Interactions & State Flow", () => {
    test("T3.1: quick subject chip click populates subject field in Add modal", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const addBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Hızlı Ders Ekle"));
      await fireEvent.click(addBtn);

      const geoChip = Array.from(container.querySelectorAll(".chip-btn"))
        .find(c => c.textContent.trim() === "Geometri");
      expect(geoChip).toBeDefined();

      await fireEvent.click(geoChip);

      const subjectInput = container.querySelector("input[placeholder*='Matematik, Fizik']");
      expect(subjectInput.value).toBe("Geometri");
    });

    test("T3.2: quick room chip click populates room input field in Add modal", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const addBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Hızlı Ders Ekle"));
      await fireEvent.click(addBtn);

      const vipChip = Array.from(container.querySelectorAll(".chip-btn"))
        .find(c => c.textContent.trim() === "VIP 2");
      expect(vipChip).toBeDefined();

      await fireEvent.click(vipChip);

      const roomInput = container.querySelector("input[placeholder*='Derslik 1, VIP']");
      expect(roomInput.value).toBe("VIP 2");
    });

    test("T3.3: print button triggers window.print", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const printBtn = Array.from(container.querySelectorAll("button"))
        .find(b => b.textContent.includes("Programı Yazdır"));
      await fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalledTimes(1);
    });

    test("T3.4: class filter dropdown triggers API reload with class_id query", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      const classFilterSelect = container.querySelectorAll("select")[0];
      await fireEvent.change(classFilterSelect, { target: { value: "cls-1" } });

      expect(axios.get).toHaveBeenCalledWith(`${API}/schedules?class_id=cls-1`);
    });
  });

  /* =====================================================================
   * TIER 4: REAL-WORLD APPLICATION SCENARIO (Scenario 3)
   * ===================================================================== */
  describe("Tier 4: Realistic Scenario - Timetable Conflict Management & Workflow", () => {
    test("T4: Full workflow - Add slot, detect & resolve conflict, update slot, delete slot", async () => {
      const { container } = await render(
        <SchedulesPage me={{ role: "admin" }} API={API} classes={mockClasses} />
      );

      await waitFor(() => {
        expect(container.querySelector(".timetable-grid")).not.toBeNull();
      });

      // Step 1: Open modal from Sunday row 10 (18:05 - 18:50) empty cell
      const emptyCues = container.querySelectorAll(".slot-empty-cue");
      await fireEvent.click(emptyCues[emptyCues.length - 1]);

      expect(container.textContent).toContain("Programa Ders Ekle");

      // Step 2: Fill form with new unique subject and teacher
      const teacherInput = container.querySelector("input[placeholder*='Osman']");
      await fireEvent.change(teacherInput, { target: { value: "Hakan Hoca" } });

      const form = container.querySelector("form");
      await fireEvent.submit(form);

      expect(axios.post).toHaveBeenCalledWith(`${API}/schedules`, expect.objectContaining({
        teacher_name: "Hakan Hoca"
      }));

      // Step 3: Edit existing lesson card (sch-1)
      const firstCard = container.querySelector(".schedule-item-card");
      await fireEvent.click(firstCard);

      expect(container.textContent).toContain("Ders Saati Düzenle");
      const editSubjectInput = container.querySelector("input[placeholder*='Matematik, Fizik']");
      await fireEvent.change(editSubjectInput, { target: { value: "İleri Matematik" } });

      const editForm = container.querySelector("form");
      await fireEvent.submit(editForm);

      expect(axios.put).toHaveBeenCalledWith(
        `${API}/schedules/sch-1`,
        expect.objectContaining({ subject: "İleri Matematik" })
      );

      // Step 4: Delete lesson with confirmation
      const delBtn = container.querySelector(".schedule-del-btn");
      await fireEvent.click(delBtn);

      expect(window.confirm).toHaveBeenCalled();
      expect(axios.delete).toHaveBeenCalledWith(`${API}/schedules/sch-1`);
    });
  });
});
