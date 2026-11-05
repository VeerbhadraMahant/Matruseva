import { describe, it, expect, vi } from "vitest";
import {
  buildAutomatedReminderMessage,
  detectLanguage,
} from "./whatsappBot";
import {
  FOGSI_MOHFW_SCHEDULE_ITEMS,
  CLINICAL_RISK_THRESHOLDS,
  CLINICAL_SIGN_OFF_METADATA,
} from "./clinicalProtocols";

describe("whatsappBot - Automated Reminder Formatting", () => {
  it("formats English reminder message with 1/2/3 numbered prompts", () => {
    const text = buildAutomatedReminderMessage({
      patientId: "patient-1",
      patientName: "Sunita Mahant",
      careEventName: "Anomaly scan (TIFFA)",
      reason: "due_soon",
      lang: "en",
      clinicName: "MatruSetu Clinic",
    });

    expect(text).toContain("Sunita Mahant");
    expect(text).toContain("Anomaly scan (TIFFA)");
    expect(text).toContain("1️⃣ - I will visit this week");
    expect(text).toContain("2️⃣ - Request a callback to reschedule");
    expect(text).toContain("3️⃣ - Get scan instructions & preparation");
  });

  it("formats Hindi reminder message with Devanagari numerals and honorific", () => {
    const text = buildAutomatedReminderMessage({
      patientId: "patient-2",
      patientName: "सुनीता",
      careEventName: "सोनोग्राफी",
      reason: "overdue",
      lang: "hi",
      clinicName: "मातृसेतु क्लिनिक",
    });

    expect(text).toContain("सुनीता");
    expect(text).toContain("नमस्ते");
    expect(text).toContain("1️⃣ - मैं इस सप्ताह क्लिनिक आऊंगी");
    expect(text).toContain("2️⃣ - मुझे नई तारीख चाहिए");
    expect(text).toContain("3️⃣ - जांच की तैयारी व जानकारी चाहिए");
  });

  it("formats Marathi reminder message with culturally respectful Tai honorific", () => {
    const text = buildAutomatedReminderMessage({
      patientId: "patient-3",
      patientName: "अनिता",
      careEventName: "अनामली स्कॅन",
      reason: "due_soon",
      lang: "mr",
      clinicName: "मातृसेतु दवाखाना",
    });

    expect(text).toContain("अनिता");
    expect(text).toContain("नमस्कार");
    expect(text).toContain("ताई");
    expect(text).toContain("1️⃣ - मी या आठवड्यात क्लिनिकला भेट देईन");
    expect(text).toContain("2️⃣ - मला नवीन तारीख हवी आहे");
    expect(text).toContain("3️⃣ - तपासणीची पूर्वतयारी व माहिती हवी आहे");
  });
});

describe("whatsappBot - Language Detection", () => {
  it("detects Marathi from Marathi-specific vocabulary", () => {
    expect(detectLanguage("होय मी नक्की येणार आहे")).toBe("mr");
    expect(detectLanguage("ताई मला मदत हवी आहे")).toBe("mr");
    expect(detectLanguage("तपासणीसाठी वेळ हवी")).toBe("mr");
  });

  it("detects Hindi from Hindi Devanagari text", () => {
    expect(detectLanguage("नमस्ते जी मैं कल आऊंगी")).toBe("hi");
    expect(detectLanguage("मुझे नई तारीख चाहिए")).toBe("hi");
  });

  it("falls back to English for Roman script", () => {
    expect(detectLanguage("1 - yes I will come")).toBe("en");
    expect(detectLanguage("Please call me back")).toBe("en");
  });
});

describe("clinicalProtocols - FOGSI & MoHFW Accreditation", () => {
  it("contains all 12 certified standard milestones", () => {
    expect(FOGSI_MOHFW_SCHEDULE_ITEMS).toHaveLength(12);
  });

  it("enforces strict FOGSI CRL / NT scan window (11 to 13.85 weeks)", () => {
    const ntScan = FOGSI_MOHFW_SCHEDULE_ITEMS.find((it) => it.code === "nt_scan");
    expect(ntScan).toBeDefined();
    expect(ntScan?.windowStartWeek).toBe(11);
    expect(ntScan?.windowEndWeek).toBeCloseTo(13.85, 2);
    expect(ntScan?.isCritical).toBe(true);
    expect(ntScan?.clinicalRationale).toContain("45-84 mm");
  });

  it("enforces DIPSI single-step OGTT screening window (24 to 28 weeks)", () => {
    const ogtt = FOGSI_MOHFW_SCHEDULE_ITEMS.find((it) => it.code === "ogtt");
    expect(ogtt).toBeDefined();
    expect(ogtt?.windowStartWeek).toBe(24);
    expect(ogtt?.windowEndWeek).toBe(28);
    expect(ogtt?.isCritical).toBe(true);
  });

  it("specifies certified clinical risk thresholds: 7d at-risk, 21d lost", () => {
    expect(CLINICAL_RISK_THRESHOLDS.atRiskDays).toBe(7);
    expect(CLINICAL_RISK_THRESHOLDS.lostDays).toBe(21);
    expect(CLINICAL_SIGN_OFF_METADATA.signedOff).toBe(false);
  });
});

describe("handleIncomingWhatsAppMessage - phone matching", () => {
  const mockAdmin = (rows: unknown[]) => {
    const q = { select: () => q, eq: () => q, ilike: vi.fn(() => q), limit: vi.fn(async () => ({ data: rows, error: null })) };
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => q }) }));
    return q;
  };

  it("does not act when the phone matches more than one patient", async () => {
    vi.resetModules();
    const q = mockAdmin([
      { id: "a", name: "A", clinic_id: "c1", phone: "9876543210", status: "active" },
      { id: "b", name: "B", clinic_id: "c2", phone: "+919876543210", status: "active" },
    ]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { handleIncomingWhatsAppMessage: handle } = await import("./whatsappBot");
    const res = await handle({ phone: "+91 98765 43210", messageText: "1" });
    expect(res.success).toBe(false);
    expect(res.patientId).toBe("");
    expect(q.ilike).toHaveBeenCalledWith("phone", "%9876543210");
    expect(q.limit).toHaveBeenCalledWith(2);
    expect(warn.mock.calls.flat().join(" ")).not.toContain("9876543210");
    warn.mockRestore();
  });
});
